import { body, validationResult } from "express-validator";
import pool from "../lib/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
import dotenv from "dotenv";
import sendEmail from "../lib/nodemailer.js";
import crypto from "crypto";

dotenv.config();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m", // Access token valid for 15 minutes
  });

  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d", // Refresh token valid for 7 days
  });

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  // Store the refresh token in Redis with a 7-day expiration (tied to userId)
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60 // 7 days expiration
  );
};

const setCookies = (res, accessToken, refreshToken) => {
  // Set HTTP-only and secure cookies for both access and refresh tokens
  res.cookie("access_token", accessToken, {
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === "production", // Secure only in production
    sameSite: "strict", // Prevent CSRF attacks
    maxAge: 15 * 60 * 1000, // 15 minutes for access token
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
  });
};

export const signup = [
  // Validate and sanitize fields
  body("user_name").notEmpty().withMessage("User name is required."),
  body("email")
    .isEmail()
    .withMessage("Valid email is required.")
    .normalizeEmail(),
  body("phone_number").notEmpty().withMessage("Phone number is required."),
  body("user_password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),

  // Handle the signup logic
  async (req, res) => {
    const { user_name, email, phone_number, user_password } = req.body;
    const user_role = req.body.user_role || "customer"; // Default to 'customer'
    const hashedPassword = await bcrypt.hash(user_password, 10); // Hash the password

    // Validate request fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors
          .array()
          .map((err) => err.msg)
          .join(", "),
      });
    }

    try {
      // Check if the email is already registered
      const [existingUser] = await pool.query(
        "SELECT * FROM Users WHERE email = ?",
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({
          message: "Email already exists. Please use a different email.",
        });
      }

      // Insert the new user into the database
      const [result] = await pool.query(
        "INSERT INTO Users (user_name, email, phone_number, user_password, user_role) VALUES (?, ?, ?, ?, ?)",
        [user_name, email, phone_number, hashedPassword, user_role]
      );

      // Fetch the user_id based on the unique email
      const [user] = await pool.query(
        "SELECT user_id FROM Users WHERE email = ?",
        [email]
      );

      const user_id = user[0].user_id;

      // Generate tokens using the newly created userId (result.insertId)
      const { accessToken, refreshToken } = generateTokens(user_id);

      // Store refresh token in Redis, tied to the userId
      await storeRefreshToken(user_id, refreshToken);

      // Set the tokens as cookies
      setCookies(res, accessToken, refreshToken);

      // Respond with success message and user details
      res.status(201).json({
        message: "User has been created successfully",
        user: {
          user_id,
          user_name,
          email,
          phone_number,
          user_role,
        },
      });
    } catch (error) {
      console.log("Error in signup controller", error.message);
      res
        .status(500)
        .json({ message: "An error occurred while creating the user." });
    }
  },
];

export const login = async (req, res) => {
  try {
    const { email, user_password } = req.body;

    // Fetch the user by email
    const [user] = await pool.query("SELECT * FROM Users WHERE email = ?", [
      email,
    ]);

    if (user.length === 0) {
      // No user found with this email
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const userData = user[0];

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(
      user_password,
      userData.user_password
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = generateTokens(userData.user_id);

    // Store refresh token in Redis
    await storeRefreshToken(userData.user_id, refreshToken);

    // Set cookies with tokens
    setCookies(res, accessToken, refreshToken);

    // Respond with user details
    res.status(200).json({
      user_id: userData.user_id,
      user_name: userData.user_name,
      email: userData.email,
      user_role: userData.user_role,
    });
  } catch (error) {
    //console.error("Error in login controller:", error.message);
    res.status(401).json({ message: "Invalid email or password" });
    //res.status(500).json({ message: "An error occurred during login." });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token; // Corrected cookie name
    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      await redis.del(`refresh_token:${decoded.userId}`); // Ensure `userId` is used consistently
    }

    // Clear cookies using the correct names
    res.clearCookie("refresh_token"); // Corrected cookie name
    res.clearCookie("access_token"); // Corrected cookie name

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while logging out." });
  }
};

// this will refresh the access token

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res
        .status(403)
        .json({ message: "Refresh token is invalid or expired" });
    }

    // Check if the refresh token exists in Redis
    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Refresh token is invalid" });
    }

    // Generate a new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId }, // Make sure to use the correct key here
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    // Set the new access token as a cookie
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.log("Error in refreshToken controller:", error.message);
    res.status(500).json({
      message: "An error occurred while refreshing token.",
      error: error.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.log("Error in getProfile controller:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Step 1: Generate a reset token and store it with an expiration time
const generateResetToken = async (userId) => {
  const resetToken = crypto.randomBytes(32).toString("hex"); // Generate a secure random token
  const expiresIn = Date.now() + 3600000; // 1 hour expiration time
  await redis.set(
    `password_reset:${resetToken}`,
    JSON.stringify({ userId, resetTokenExpires: expiresIn }),
    "EX",
    3600
  );
  return resetToken;
};

// Step 2: Send the reset email with the token
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`; // Create reset link
  const subject = "Password Reset Request";

  const htmlSent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Password Reset Request</h2>
      <p>Hi there,</p>
      <p>We received a request to reset your password. You can reset it using the link below:</p>
      <p>
        <a href="${resetLink}" style="color: #007BFF; text-decoration: none;">Reset your password</a>
      </p>
      <p><strong>Your reset token:</strong> <code style="background-color: #f8f9fa; padding: 4px; border-radius: 4px;">${resetToken}</code></p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Thank you!</p>
    </div>
  `;

  // Use your email sending function with HTML content
  await sendEmail({ to: email, subject: subject, html: htmlSent });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const [user] = await pool.query(
      "SELECT user_id FROM Users WHERE email = ?",
      [email]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: "Email not found" });
    }

    const userId = user[0].user_id;
    const resetToken = await generateResetToken(userId);

    await sendPasswordResetEmail(email, resetToken);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error in forgotPassword controller:", error.message);
    res.status(500).json({
      message: "An error occurred while sending the password reset email",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // Step 1: Validate the reset token
    const storedData = await redis.get(`password_reset:${resetToken}`);
    if (!storedData) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    const { userId, resetTokenExpires } = JSON.parse(storedData);

    // Check if the token is expired
    if (Date.now() > resetTokenExpires) {
      await redis.del(`password_reset:${resetToken}`); // Clean up expired token
      return res.status(400).json({ message: "Reset token has expired" });
    }

    // Step 2: Invalidate any stored JWT refresh tokens
    await redis.del(`refresh_token:${userId}`);

    // Step 3: Hash the new password and update the user record in the database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE Users SET user_password = ? WHERE user_id = ?", [
      hashedPassword,
      userId,
    ]);

    // Step 4: Generate new JWT tokens and store the refresh token
    const { accessToken, refreshToken } = generateTokens(userId);
    await storeRefreshToken(userId, refreshToken);

    // Step 5: Set the new JWT tokens in cookies
    setCookies(res, accessToken, refreshToken);

    // Clear the reset token
    await redis.del(`password_reset:${resetToken}`);

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error in resetPassword controller:", error.message);
    res
      .status(500)
      .json({ message: "An error occurred while resetting the password" });
  }
};

export const getUserProfile = async (req, res) => {
  const { userId } = req.body;

  try {
    // Fetch user information
    const userQuery =
      "SELECT user_name, phone_number, email FROM Users WHERE user_id = ?";
    const [user] = await pool.query(userQuery, [userId]);

    // Check if user exists
    if (!user || user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch orders for the user
    const [ordersResult] = await pool.query(
      "SELECT * FROM Orders WHERE user_id = ?",
      [userId]
    );

    // If no orders are found, return user data with empty orders
    if (ordersResult.length === 0) {
      return res.status(200).json({
        user,
        orders: [],
        message: "No orders found for this user.",
      });
    }

    // Map through each order to fetch related order items and product names
    const orders = await Promise.all(
      ordersResult.map(async (order) => {
        const [orderItemsResult] = await pool.query(
          `SELECT oi.order_item_id, oi.product_id, oi.quantity, oi.price, p.product_name 
           FROM OrderItems oi 
           JOIN Products p ON oi.product_id = p.product_id
           WHERE oi.order_id = ?`,
          [order.order_id]
        );

        return {
          orderId: order.order_id,
          totalAmount: order.total_amount,
          orderStatus: order.order_status,
          OrderedAt: order.created_at,
          items: orderItemsResult.map((item) => ({
            orderItemId: item.order_item_id,
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            price: item.price,
          })),
        };
      })
    );

    // Send back user data along with their orders
    res.status(200).json({
      user: user[0],
      orders,
    });
  } catch (error) {
    console.error("Failed to fetch user profile and orders:", error);
    res.status(500).json({
      message: "Server error while fetching user profile and orders.",
    });
  }
};

export const updateUserProfile = async (req, res) => {
  const { userId, user_name, email, phone_number } = req.body;

  try {
    // Step 1: Check if the new email already exists in the database for a different user
    const emailCheckQuery =
      "SELECT * FROM Users WHERE email = ? AND user_id != ?";
    const [emailCheckResult] = await pool.query(emailCheckQuery, [
      email,
      userId,
    ]);

    if (emailCheckResult.length > 0) {
      // If email already exists for a different user, send error response
      return res
        .status(400)
        .json({ message: "This email already exists. Try a new one." });
    }

    // Step 2: Update user details if email is unique
    const updateQuery =
      "UPDATE Users SET user_name = ?, email = ?, phone_number = ? WHERE user_id = ?";
    await pool.query(updateQuery, [user_name, email, phone_number, userId]);

    // Step 3: Send success response
    res.json({ message: "User profile updated successfully." });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};
