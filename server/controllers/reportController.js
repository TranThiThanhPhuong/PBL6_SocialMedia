import Story from "../models/Story.js";
import Report from "../models/Report.js";
import Post from "../models/Post.js";
import { deletePost } from "./postController.js";
import Notification from "../models/Notification.js";
import { createNotification } from "./notificationController.js";

// Các lý do cho cả Post và Story
const allowedReasons = {
  spam: "Spam hoặc nội dung gây phiền nhiễu",
  harassment: "Ngôn từ xúc phạm hoặc quấy rối",
  sensitive: "Nội dung nhạy cảm hoặc phản cảm",
  copyright: "Vi phạm bản quyền",
};

// 🟠 Báo cáo bài viết
export const reportPost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId, reason } = req.body;

    if (!postId || !reason)
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu báo cáo." });

    if (!allowedReasons[reason])
      return res.status(400).json({ success: false, message: "Lý do báo cáo không hợp lệ." });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết." });

    if (post.user.toString() === userId)
      return res.status(400).json({ success: false, message: "Không thể báo cáo bài viết của chính bạn." });

    const existed = await Report.findOne({ post: postId, reporter: userId });
    if (existed)
      return res.status(400).json({ success: false, message: "Bạn đã báo cáo bài viết này rồi." });

    const report = await Report.create({
      post: postId,
      reporter: userId,
      reason,
      status: "pending",
    });

    res.status(201).json({ success: true, message: "Đã gửi báo cáo bài viết thành công!", report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟠 Báo cáo Story
export const reportStory = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { storyId, reason } = req.body;

    if (!storyId || !reason)
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu báo cáo." });

    if (!allowedReasons[reason])
      return res.status(400).json({ success: false, message: "Lý do báo cáo không hợp lệ." });

    const story = await Story.findById(storyId);
    if (!story)
      return res.status(404).json({ success: false, message: "Không tìm thấy story." });

    const existed = await Report.findOne({ post: storyId, reporter: userId });
    if (existed)
      return res.status(400).json({ success: false, message: "Bạn đã báo cáo story này rồi." });

    const report = await Report.create({
      post: storyId,
      reporter: userId,
      reason,
      status: "pending",
    });

    res.status(201).json({ success: true, message: "Đã gửi báo cáo story thành công!", report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟢 Admin xem danh sách báo cáo
export const getAllReports = async (req, res) => {
  try {
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟠 Admin xử lý báo cáo (review hoặc dismiss)
export const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'reviewed' (Xử lí/Xóa) hoặc 'dismissed' (Bỏ qua)

    if (!["reviewed", "dismissed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }

    // Tìm báo cáo
    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo." });
    }

    // --- LOGIC XỬ LÝ ---
    
    // TRƯỜNG HỢP 1: ADMIN CHẤP NHẬN BÁO CÁO (XÓA BÀI)
    if (status === 'reviewed') {
      // Xử lý nếu là báo cáo Bài viết (Post)
      if (report.post) { 
        const postToDelete = await Post.findById(report.post);

        if (postToDelete) {
          const violatorId = postToDelete.user; // ID người vi phạm

          // 1. Xóa bài viết khỏi Database
          await Post.findByIdAndDelete(report.post);

          // 2. Gửi thông báo cho Người báo cáo (Reporter)
          await Notification.create({
            receiver: report.reporter,
            type: "report", // Dùng type có sẵn trong enum
            content: "Cảm ơn bạn đã báo cáo. Chúng tôi đã xem xét và gỡ bỏ bài viết vi phạm tiêu chuẩn cộng đồng.",
            isRead: false
          });

          // 3. Gửi thông báo cho Người vi phạm (Violator)
          await Notification.create({
            receiver: violatorId,
            type: "admin_delete_post", // Dùng type có sẵn trong enum
            content: "Bài viết của bạn đã bị xóa do vi phạm Tiêu chuẩn cộng đồng.",
            isRead: false
          });
        } else {
          // Bài viết có thể đã bị xóa trước đó
          console.log("Bài viết không tồn tại hoặc đã bị xóa.");
        }
      }
      
    } 
    
    // TRƯỜNG HỢP 2: ADMIN BỎ QUA BÁO CÁO (GIỮ BÀI)
    else if (status === 'dismissed') {
      // Chỉ gửi thông báo cho Người báo cáo là báo cáo đã bị từ chối/không vi phạm
      await Notification.create({
        receiver: report.reporter,
        type: "report",
        content: "Chúng tôi đã xem xét báo cáo của bạn về bài viết và nhận thấy bài viết không vi phạm Tiêu chuẩn cộng đồng. Cảm ơn sự đóng góp của bạn.",
        post: report.post, // Đính kèm link bài viết (vì chưa bị xóa)
        isRead: false
      });
    }

    // 4. CẬP NHẬT TRẠNG THÁI BÁO CÁO
    report.status = status;
    await report.save();

    res.json({ 
      success: true, 
      message: `Đã ${status === 'reviewed' ? 'xử lý (xóa bài)' : 'bỏ qua'} báo cáo.`, 
      report 
    });

  } catch (error) {
    console.error("Lỗi updateReport:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};