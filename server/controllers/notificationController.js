import Notification from "../models/Notification.js";
import { getIO, getOnlineUsers } from "../utils/socket.js";

export const createNotification = async (req, res) => {
  try {
    const { receiver, sender, type, content } = req.body;

    const noti = await Notification.create({ receiver, sender, type, content });

    const io = getIO();
    const onlineUsers = getOnlineUsers();

    const receiverSocket = onlineUsers.get(receiver);
    if (receiverSocket) {
      io.to(receiverSocket).emit("new_notification", { receiver, type, content });
      console.log("📨 Sent real-time notification to:", receiver);
    }

    res.json({ success: true, noti });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📨 Lấy tất cả thông báo của người dùng hiện tại
export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.auth();

    const notifications = await Notification.find({ receiver: userId })
      .populate("sender", "full_name profile_picture connections followers following")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Đánh dấu tất cả thông báo đã đọc
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.auth();

    await Notification.updateMany({ receiver: userId, isRead: false }, { isRead: true });

    res.json({ success: true, message: "Đã đánh dấu tất cả thông báo là đã đọc." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ❌ Xóa thông báo
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await Notification.findByIdAndDelete(id);

    res.json({ success: true, message: "Đã xóa thông báo." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};