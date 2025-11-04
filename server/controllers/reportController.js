import Story from "../models/Story.js";
import Report from "../models/Report.js";
import Post from "../models/Post.js";

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