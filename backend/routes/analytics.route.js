import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
  getAnalyticsData,
  getDailySalesData,
} from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/", protectRoute, adminRoute, getAnalyticsData);
router.get("/daily-sales", protectRoute, adminRoute, getDailySalesData);

export default router;
