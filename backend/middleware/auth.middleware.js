import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../lib/db.js";
dotenv.config();

export const protectRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No access token provided" });
    }
    try {
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      // Fetch the user from MySQL based on userId stored in the token
      const [user] = await pool.query(`SELECT * FROM Users WHERE user_id = ?`, [
        decoded.userId,
      ]);
      if (user.length === 0) {
        return res
          .status(401)
          .json({ message: "Unauthorized - User not found" });
      }
      // Exclude the password field from the response
      const userData = {
        user_id: user[0].user_id,
        user_name: user[0].user_name,
        email: user[0].email,
        user_role: user[0].user_role,
      };
      // Attach the user to the request object for use in the next middleware/controller
      req.user = userData;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Unauthorized - Access token has expired" });
      }
      throw error;
    }
  } catch (error) {
    console.log("Error in protectRoute middleware", error.message);
    return res
      .status(401)
      .json({ message: "Unauthorized - Invalid access token" });
  }
};

export const adminRoute = (req, res, next) => {
  if (req.user && req.user.user_role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied - Admin only" });
  }
};
