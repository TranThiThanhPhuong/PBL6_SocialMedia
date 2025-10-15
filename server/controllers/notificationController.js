import Notification from "../models/Notification.js";

// 📨 Lấy tất cả thông báo của người dùng hiện tại
export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.auth();

    const notifications = await Notification.find({ receiver: userId })
      .populate("sender", "full_name profile_picture")
      .sort({ createdAt: -1 });

    if (!notifications.length) {
      return res.json({ success: true, notifications: [] });
    }

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Đánh dấu đã đọc
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy thông báo." });
    }

    res.json({ success: true, notification });
  } catch (error) {
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