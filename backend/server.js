import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import contactRoutes from "./routes/contact.route.js";

import pool from "./lib/db.js";

dotenv.config();

const app = express();
const PORT = 9005 || process.env.PORT;

// Middleware to parse JSON bodies
app.use(express.json({ limit: "15mb" })); // allows you to parse the body of the request.
app.use(cookieParser());

// Configure CORS
app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend URL
    credentials: true, // Allow credentials (cookies)
  })
);

//To check whether the sql connection is established or not.
async function checkDatabaseConnection() {
  try {
    const result = await pool.query("SELECT 1");
    console.log("Database connection is established.");
  } catch (error) {
    console.log("Database connection failed:", error);
    process.exit(1);
  }
}

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/contact-us", contactRoutes);

app.listen(PORT, async () => {
  console.log("Server is running on http://localhost:" + PORT);
  // Check if the database connection is successful
  await checkDatabaseConnection();
});
