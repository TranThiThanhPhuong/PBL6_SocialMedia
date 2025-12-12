import Notification from "../models/Notification.js";
import { getIO, getOnlineUsers } from "../utils/socket.js";

export const createNotification = async (req, res) => {
  try {
    const { receiver, sender, type, content } = req.body;

    const noti = await Notification.create({ receiver, sender, type, content });

    const populatedNoti = await noti
      .populate("sender", "full_name username profile_picture")
      .lean();

    const io = getIO();
    const onlineUsers = getOnlineUsers();
    const receiverSocket = onlineUsers.get(receiver);

    if (receiverSocket) {
      io.to(receiverSocket).emit("new_notification", populatedNoti);
    }
    res.json({ success: true, noti: populatedNoti });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.auth();

    const notifications = await Notification.find({
      receiver: userId,
      type: { $nin: ["follow_hidden", "friend_request_hidden"] },
    })
      .populate(
        "sender",
        "full_name profile_picture connections followers following"
      )
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

export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.auth();

    await Notification.updateMany(
      { receiver: userId, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await Notification.findByIdAndDelete(id);

    res.json({ success: true, message: "Đã xóa thông báo." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
