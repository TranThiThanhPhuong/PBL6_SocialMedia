import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";

const notificationRouter = express.Router();

notificationRouter.get("/", protect, getNotifications);
notificationRouter.patch("/:id/read", protect, markAsRead);
notificationRouter.delete("/:id", protect, deleteNotification);

export default notificationRouter;