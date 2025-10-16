import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  getNotifications,
  deleteNotification,
  markAllAsRead,
} from "../controllers/notificationController.js";

const notificationRouter = express.Router();

notificationRouter.get("/", protect, getNotifications);
notificationRouter.delete("/:id", protect, deleteNotification);
notificationRouter.patch("/read-all", protect, markAllAsRead);

export default notificationRouter;