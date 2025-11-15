// server/routes/analyticsRoutes.js
import express from "express";
import { adminAuth } from "../middlewares/adminAuth.js"; // Import middleware admin
import {
  getStatsCards,
  getUserRegistrationChart,
} from "../controllers/analyticsController.js";

const router = express.Router();

// Tất cả API thống kê đều phải là Admin
router.use(adminAuth);

// API cho các thẻ thống kê
router.get("/stats-cards", getStatsCards);
// API cho biểu đồ đăng ký user
router.get("/user-chart", getUserRegistrationChart);
// (Thêm các route cho biểu đồ khác ở đây)

export default router;