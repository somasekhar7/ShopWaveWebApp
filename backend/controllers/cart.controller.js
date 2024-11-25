import pool from "../lib/db.js"; // Import MySQL connection

export const getCartProducts = async (req, res) => {
  try {
    const userId = req.user.user_id; // Assuming `req.user` contains the logged-in user's details

    // Fetch cart items, join with products to get product details, and join with ProductImages to get image details
    const [cartItems] = await pool.query(
      `
      SELECT 
        p.product_id, 
        p.product_name, 
        p.product_description, 
        p.price, 
        p.stock_quantity, 
        ci.quantity, 
        pi.image_url, 
        pi.image_alt_text
      FROM CartItems ci
      JOIN Products p ON ci.product_id = p.product_id
      LEFT JOIN ProductImages pi ON p.product_id = pi.product_id
      WHERE ci.user_id = ?
      `,
      [userId]
    );

    if (cartItems.length === 0) {
      return res.json({ message: "Your cart is empty" });
    }

    // Return the cart items with product details, quantity, and image URL
    res.json(cartItems);
  } catch (error) {
    console.log("Error in getCartProducts controller:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.user_id; // Assuming `req.user` contains the logged-in user's details

    // Check if the product already exists in the user's cart
    const [existingItem] = await pool.query(
      "SELECT * FROM CartItems WHERE user_id = ? AND product_id = ?",
      [userId, productId]
    );

    if (existingItem.length > 0) {
      // If the item already exists, increase its quantity by 1
      await pool.query(
        "UPDATE CartItems SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?",
        [userId, productId]
      );
    } else {
      // If the item doesn't exist, add it to the cart with a quantity of 1
      await pool.query(
        "INSERT INTO CartItems (user_id, product_id, quantity) VALUES (?, ?, 1)",
        [userId, productId]
      );
    }

    // Fetch the updated cart items along with product details
    const [updatedCart] = await pool.query(
      `
      SELECT 
        ci.product_id, ci.quantity, 
        p.product_name, p.price, p.stock_quantity,
        pi.image_url, pi.image_alt_text
      FROM CartItems ci
      JOIN Products p ON ci.product_id = p.product_id
      LEFT JOIN ProductImages pi ON p.product_id = pi.product_id
      WHERE ci.user_id = ?
      `,
      [userId]
    );

    res.json(updatedCart); // Respond with the updated cart items with product details
  } catch (error) {
    console.log("Error in addToCart controller", error.message);
    res
      .status(500)
      .json({ message: "Error adding item to cart", error: error.message });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.user_id;

    if (!productId) {
      // Remove all items from the user's cart
      await pool.query("DELETE FROM CartItems WHERE user_id = ?", [userId]);
    } else {
      // Remove a specific item from the user's cart
      await pool.query(
        "DELETE FROM CartItems WHERE user_id = ? AND product_id = ?",
        [userId, productId]
      );
    }

    // Fetch the updated cart items (which should be empty or updated)
    const [updatedCart] = await pool.query(
      "SELECT * FROM CartItems WHERE user_id = ?",
      [userId]
    );

    res.json(updatedCart); // Respond with the updated cart items
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.params; // Get productId from route params
    const { quantity } = req.body; // Get new quantity from request body
    const userId = req.user.user_id; // Assuming `req.user` contains the logged-in user's details

    // Check if the product exists in the user's cart
    const [existingItem] = await pool.query(
      "SELECT * FROM CartItems WHERE user_id = ? AND product_id = ?",
      [userId, productId]
    );

    if (existingItem.length > 0) {
      if (quantity === 0) {
        // If quantity is 0, remove the item from the cart
        await pool.query(
          "DELETE FROM CartItems WHERE user_id = ? AND product_id = ?",
          [userId, productId]
        );
      } else {
        // Otherwise, update the item's quantity
        await pool.query(
          "UPDATE CartItems SET quantity = ? WHERE user_id = ? AND product_id = ?",
          [quantity, userId, productId]
        );
      }

      // Fetch the updated cart items to return in the response
      const [updatedCart] = await pool.query(
        "SELECT * FROM CartItems WHERE user_id = ?",
        [userId]
      );
      return res.json(updatedCart); // Respond with the updated cart items
    } else {
      return res.status(404).json({ message: "Product not found in cart" });
    }
  } catch (error) {
    console.log("Error in updateQuantity controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
