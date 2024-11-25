import pool from "../lib/db.js";

export const getCoupon = async (req, res) => {
  try {
    const userId = req.user.user_id; // Assuming `req.user.user_id` contains the user ID
    const query = `
      SELECT * 
      FROM Coupons 
      WHERE user_id = ? AND is_active = TRUE 
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [userId]);

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.log("Error in getCoupon controller:", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.user_id; // Assuming `req.user.user_id` contains the user ID
    // Check if userId exists
    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    // Query to find the coupon
    const query = `
      SELECT * 
      FROM Coupons 
      WHERE coupon_code = ? 
        AND user_id = ? 
        AND is_active = TRUE 
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [code, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    const coupon = rows[0];

    // Check if the coupon is expired
    if (new Date(coupon.expiration_date) < new Date()) {
      // Update the coupon to inactive
      const updateQuery = `
        UPDATE Coupons 
        SET is_active = FALSE 
        WHERE coupon_id = ?
      `;
      await pool.query(updateQuery, [coupon.coupon_id]);

      return res.status(404).json({ message: "Coupon expired" });
    }

    res.json({
      message: "Coupon is valid",
      code: coupon.coupon_code,
      discountPercentage: coupon.discount_percentage,
    });
  } catch (error) {
    console.log("Error in validateCoupon controller:", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
