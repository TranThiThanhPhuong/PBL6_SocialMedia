// server/controllers/reportController.js
import Report from "../models/Report.js";
import Post from "../models/Post.js";

const allowedReasons = {
  khieu_dam_doi_truy: "Bài viết chứa nội dung khiêu dâm / đồi trụy!",
  ngon_tu_thu_ghet: "Bài viết chứa ngôn từ thù ghét / kích động!",
  nhay_cam_chinh_tri: "Bài viết chứa nội dung nhạy cảm chính trị!",
  bao_luc: "Bài viết chứa nội dung bạo lực / tàn ác!",
};

export const reportPost = async (req, res) => {
  try {
    // lấy userId theo chuẩn bạn dùng ở controller khác
    const { userId } = req.auth();
    const { postId, reason } = req.body;

    if (!postId || !reason)
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu báo cáo." });

    // validate reason key
    if (!Object.prototype.hasOwnProperty.call(allowedReasons, reason)) {
      return res.status(400).json({ success: false, message: "Lý do báo cáo không hợp lệ." });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết." });

    if (post.user.toString() === userId.toString())
      return res.status(400).json({ success: false, message: "Không thể báo cáo bài viết của chính bạn." });

    // tránh trùng báo cáo cùng reporter + post + reason
    const existing = await Report.findOne({ post: postId, reporter: userId, reason });
    if (existing)
      return res.status(400).json({ success: false, message: "Bạn đã báo cáo bài viết này rồi." });

    const report = await Report.create({
      post: postId,
      reporter: userId,
      reason,
      reason_label: allowedReasons[reason],
    });

    return res.status(201).json({ success: true, message: "Báo cáo đã được gửi đến quản trị viên.", report });
  } catch (error) {
    console.error("reportPost error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllReports = async (req, res) => {
  try {
    // Có thể thêm phân trang / filter / middleware requireAdmin sau
    const reports = await Report.find()
      .populate("reporter", "full_name username profile_picture")
      .populate({
        path: "post",
        select: "content image_urls user createdAt",
        populate: { path: "user", select: "full_name username profile_picture" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, reports });
  } catch (error) {
    console.error("getAllReports error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};