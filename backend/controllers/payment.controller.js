import pool from "../lib/db.js";
import { stripe } from "../lib/stripe.js";
import sendEmail from "../lib/nodemailer.js";
import { query } from "express";

// Create a new checkout session
export const createCheckoutSession = async (req, res) => {
  try {
    const { userId, products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid or empty products array" });
    }
    for (const product of products) {
      if (
        !product.product_id ||
        !product.product_name ||
        !product.price ||
        typeof product.quantity !== "number" ||
        product.quantity <= 0
      ) {
        return res.status(400).json({ error: "Invalid product structure" });
      }
    }

    let totalAmount = 0;
    const lineItems = products.map((product) => {
      const amount = Math.round(parseFloat(product.price) * 100); // Convert to cents
      const quantity = parseInt(product.quantity, 10) || 1; // Ensure quantity is an integer
      totalAmount += amount * quantity;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.product_name,
            images: product.image_url,
          },
          unit_amount: amount,
        },
        quantity: quantity,
      };
    });

    // Coupon validation
    let discountPercentage = 0;
    if (couponCode) {
      const [couponRows] = await pool.query(
        "SELECT * FROM Coupons WHERE coupon_code = ? AND user_id = ? AND expiration_date > NOW()",
        [couponCode, userId]
      );

      if (couponRows.length > 0) {
        discountPercentage = couponRows[0].discount_percentage;
        totalAmount -= Math.round((totalAmount * discountPercentage) / 100);
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      discounts: discountPercentage
        ? [{ coupon: await createStripeCoupon(discountPercentage) }]
        : [],
      metadata: {
        userId: req.user.user_id,
        couponCode: couponCode || "",
        products: JSON.stringify(
          products.map((product) => ({
            id: product.product_id,
            quantity: product.quantity,
            price: product.price,
          }))
        ),
      },
    });

    if (totalAmount >= 20000) {
      await createNewCoupon(req.user.user_id);
    }

    res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
  } catch (error) {
    console.error("Error in createCheckoutSession:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
};

// After successful checkout, create order and payment records
export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // console.log("session data", session);

    if (session.status === "complete") {
      const { userId, couponCode, products } = session.metadata;
      //console.log("Logged", userId, couponCode, products);

      // Deactivate the coupon if used
      if (couponCode) {
        await pool.query(
          "UPDATE Coupons SET is_active = false WHERE coupon_code = ? AND user_id = ?",
          [couponCode, userId]
        );
      }

      // Define order status (you might want to use a constant or predefined status)
      const orderStatus = "delivered"; // Adjust this based on your business logic

      await pool.query(
        "INSERT INTO Orders (user_id, total_amount,order_status, stripe_session_id) VALUES (?, ?, ?,?)",
        [userId, session.amount_total / 100, orderStatus, sessionId]
      );

      const [orderResult] = await pool.query(
        "SELECT order_id FROM Orders WHERE user_id = ? AND stripe_session_id = ?",
        [userId, sessionId]
      );

      const orderId = orderResult.length ? orderResult[0].order_id : null; // Retrieve the order ID if available

      console.log("Created Order ID:", orderId);

      // Insert order items
      const productList = JSON.parse(products);
      for (const product of productList) {
        await pool.query(
          "INSERT INTO OrderItems (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, product.id, product.quantity, product.price]
        );
      }
      const payment_status = "completed";

      // Record payment details in Payments table
      await pool.query(
        "INSERT INTO Payments (order_id, payment_method, payment_status, amount) VALUES (?, ?, ?, ?)",
        [
          orderId,
          session.payment_method_types[0],
          payment_status,
          session.amount_total / 100,
        ]
      );

      // Fetch the user's email from the database
      const [userRows] = await pool.query(
        "SELECT email, user_name FROM Users WHERE user_id = ?",
        [userId]
      );

      if (userRows.length === 0) {
        return res.status(400).json({ error: "User not found" });
      }

      const { email, user_name } = userRows[0];
      // Send email notification
      let emailStatus = "pending";
      try {
        const emailSent = await sendEmail({
          to: email, // Assuming this field contains the user's email
          subject: "Your Order Confirmation",
          text: `Thank you for your order. Your order ID is ${orderId}.`,
          html: ` 
            <p>Hi ${user_name},</p>
            <p>Your payment was successful! Thank you for your order. Your order ID is <strong>${orderId}</strong>.</p>
            `,
        });

        if (emailSent) {
          emailStatus = "sent";
        } else {
          emailStatus = "failed";
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        emailStatus = "failed";
      }

      // Insert email notification record in EmailNotifications table
      await pool.query(
        "INSERT INTO EmailNotifications (order_id, customer_id, email_status) VALUES (?, ?, ?)",
        [orderId, userId, emailStatus]
      );

      res.status(200).json({
        success: true,
        message:
          "Payment successful, order created, email notification sent, and coupon deactivated if used.",
        orderId: orderId,
      });
    } else {
      res.status(400).json({ error: "Payment not successful" });
    }
  } catch (error) {
    console.error("Error in checkoutSuccess:", error.message);
    res.status(500).json({
      message: "Error processing successful checkout",
      error: error.message,
    });
  }
};

// Create Stripe coupon
async function createStripeCoupon(discountPercentage) {
  const coupon = await stripe.coupons.create({
    percent_off: discountPercentage,
    duration: "once",
  });
  return coupon.id;
}

// Generate a new coupon for users with high order amounts
async function createNewCoupon(userId) {
  const couponCode =
    "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30); // 30 days from now

  await pool.query(
    "INSERT INTO Coupons (coupon_code, discount_percentage, expiration_date, user_id,usage_limit) VALUES (?, ?, ?, ?,?)",
    [couponCode, 10, expirationDate, userId, 1]
  );

  return couponCode;
}
