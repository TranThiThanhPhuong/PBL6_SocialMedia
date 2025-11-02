import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  getNotifications,
  deleteNotification,
  markAllAsRead,
} from "../controllers/notificationController.js";

const notificationRoutes = express.Router();

notificationRoutes.get("/", protect, getNotifications);
notificationRoutes.delete("/:id", protect, deleteNotification);
notificationRoutes.patch("/read-all", protect, markAllAsRead);

export default notificationRoutes;