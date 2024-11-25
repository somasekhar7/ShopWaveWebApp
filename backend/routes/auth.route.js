import express from "express";
import {
  signup,
  login,
  logout,
  refreshToken,
  getProfile,
  forgotPassword,
  resetPassword,
  updateUserProfile,
  getUserProfile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.get("/profile", protectRoute, getProfile);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password", resetPassword);
router.post("/user-profile", getUserProfile);
router.put("/update-user-profile", updateUserProfile);

export default router;
