import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  receiver: { type: String, ref: "User", required: true }, // người nhận thông báo
  sender: { type: String, ref: "User" }, // người tạo thông báo
  type: {
    type: String,
    enum: [
      "friend_request",
      "friend_accept",
      "follow",
      "message",
      "report",
      "like",
      "comment",
      "reply",
      "like_comment",
      "share",
      "report_post",
      "admin_delete_post",
    ],
    required: true,
  },
  post: { type: String, ref: "Post" }, // dùng cho like/comment/reply/report
  comment: { type: String, ref: "Comment" }, // nếu là reply
  content: { type: String }, // ví dụ: "Phương đã thích bài viết của bạn"
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Notification", notificationSchema);