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
    const { status } = req.body; // 'reviewed' (Xử lí) hoặc 'dismissed' (Bỏ qua)
    
    // Lấy admin user từ middleware 'adminAuth'
    const adminUser = req.user; 

    if (!["reviewed", "dismissed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo." });
    }

    // --- LOGIC XỬ LÍ (SẠCH SẼ HƠN) ---
    if (status === 'reviewed') {
      
      // 1. XÓA BÀI VIẾT (NẾU LÀ BÁO CÁO POST)
      if (report.type === 'post' && report.post) {
        try {
          const reportedPost = await Post.findById(report.post);
          
          if (reportedPost) {
            const violatorId = reportedPost.user; // ID người vi phạm
            
            // --- GỌI TRỰC TIẾP HÀM SERVICE (SẠCH SẼ) ---
            await deletePostService(report.post, adminUser); // Truyền postId và adminUser

            // 2. GỬI THÔNG BÁO
            await createNotification({
              user: report.reporter,
              type: "report_approved",
              content: `Báo cáo của bạn về một bài viết đã được xử lý. Cảm ơn bạn đã đóng góp.`,
              link: `/profile` 
            });
            await createNotification({
              user: violatorId,
              type: "post_deleted",
              content: "Một bài viết của bạn đã bị gỡ bỏ do vi phạm chính sách cộng đồng (bị báo cáo).",
            });
          }
        } catch (deleteError) {
          console.error("Lỗi khi gọi deletePostService hoặc createNotification:", deleteError.message);
        }
      } 
      // (Bạn có thể thêm logic xóa 'story' tương tự ở đây)
    }

    // 3. CẬP NHẬT TRẠNG THÁI BÁO CÁO
    report.status = status;
    await report.save();

    res.json({ 
      success: true, 
      message: `Đã ${status === 'reviewed' ? 'xử lý' : 'bỏ qua'} báo cáo.`, 
      report 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};