import fs from "fs";
import imagekit from "../configs/imageKit.js";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { analyzeContent } from "../utils/analyzeContent.js";

export const addComment = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId, post_type, content, parentComment } = req.body;
    const images = req.files || [];
    // 🧠 Gọi AI kiểm duyệt
    const aiResult = await analyzeContent(content, images);
    console.log("🔍 Kết quả AI:", JSON.stringify(aiResult, null, 2));

    // ✅ Log label + confidence
    if (aiResult.text_result) {
      aiResult.text_result.forEach((r) =>
        console.log(
          `📝 Text: ${r.sentence} | Label: ${r.label} | Confidence: ${r.confidence}`
        )
      );
    }
    if (aiResult.image_result) {
      (Array.isArray(aiResult.image_result)
        ? aiResult.image_result
        : [aiResult.image_result]
      ).forEach((r) =>
        console.log(`🖼️ Image Label: ${r.label} | Confidence: ${r.confidence}`)
      );
    }

    // 🚫 Kiểm tra vi phạm
    const hasViolation =
      aiResult.text_result?.some(
        (r) => r.label !== "an_toan" && r.confidence >= 0.65
      ) ||
      (Array.isArray(aiResult.image_result)
        ? aiResult.image_result.some(
            (r) => r.label !== "an_toan" && r.confidence >= 0.65
          )
        : aiResult.image_result?.label !== "an_toan" &&
          aiResult.image_result?.confidence >= 0.65);

    if (hasViolation) {
      // 🔍 Lấy tất cả nhãn vi phạm (text + image)
      const textLabels =
        aiResult.text_result
          ?.filter((r) => r.label !== "an_toan" && r.confidence >= 0.65)
          .map((r) => r.label) || [];

      const imageLabels = Array.isArray(aiResult.image_result)
        ? aiResult.image_result
            .filter((r) => r.label !== "an_toan" && r.confidence >= 0.65)
            .map((r) => r.label)
        : aiResult.image_result?.label !== "an_toan" &&
          aiResult.image_result?.confidence >= 0.65
        ? [aiResult.image_result.label]
        : [];

      const allLabels = [...textLabels, ...imageLabels];

      // 🔁 Loại bỏ trùng lặp
      const uniqueLabels = [...new Set(allLabels)];

      // 🧾 Tạo message theo số lượng nhãn
      let message = "";
      if (uniqueLabels.length === 1) {
        message = `Phát hiện nội dung vi phạm: ${uniqueLabels[0]}`;
      } else {
        message = `Phát hiện ${
          uniqueLabels.length
        } loại vi phạm: ${uniqueLabels.join(", ")}`;
      }

      // 🔥 Xóa ảnh tạm
      images.forEach((img) => fs.unlinkSync(img.path));

      // 🔁 Gửi về FE
      return res.status(400).json({
        success: false,
        message,
        labels: uniqueLabels,
        aiResult,
      });
    }

    // ✅ Nếu an toàn → upload ảnh + lưu DB
    let image_urls = [];

    if (images.length) {
      image_urls = await Promise.all(
        images.map(async (image) => {
          const fileBuffer = fs.readFileSync(image.path);
          const response = await imagekit.upload({
            file: fileBuffer,
            fileName: image.originalname,
            folder: "comments",
          });

          return imagekit.url({
            path: response.filePath,
            transformation: [
              { quality: "auto", format: "webp", width: "1280" },
            ],
          });
        })
      );
    }

    const comment = await Comment.create({
      post: postId,
      user: userId,
      content, // <== thêm content
      image_urls,
      post_type,
      parentComment: parentComment || null,
    });

    // 🔔 Thông báo cho chủ bài viết khi có người bình luận
    const post = await Post.findById(postId).populate("user", "full_name");

    if (!parentComment && post.user._id.toString() !== userId) {
      const sender = await User.findById(userId);

      await Notification.create({
        receiver: post.user._id,
        sender: userId,
        type: "comment",
        post: postId,
        content: `${sender.full_name} đã bình luận bài viết của bạn.`,
      });
    }

    // tăng tổng số comment của bài (bao gồm reply)
    await Post.findByIdAndUpdate(postId, { $inc: { comments_count: 1 } });

    // nếu là reply thì tăng reply_count của parent
    if (parentComment) {
      const parent = await Comment.findById(parentComment).populate(
        "user",
        "full_name"
      );

      if (parent.user._id.toString() !== userId) {
        const sender = await User.findById(userId);

        await Notification.create({
          receiver: parent.user._id,
          sender: userId,
          type: "reply",
          post: postId,
          comment: parentComment,
          content: `${sender.full_name} đã trả lời bình luận của bạn.`,
        });
      }
      await Comment.findByIdAndUpdate(parentComment, {
        $inc: { reply_count: 1 },
      });
    }

    const newComment = await Comment.findById(comment._id).populate(
      "user",
      "full_name profile_picture"
    );
    return res.json({ success: true, comment: newComment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const parents = await Comment.find({ post: postId, parentComment: null })
      .populate("user", "full_name profile_picture connections followers following")
      .sort({ createdAt: -1 })
      .lean();

    const result = await Promise.all(
      parents.map(async (p) => {
        const replies = await Comment.find({ parentComment: p._id })
          .populate("user", "full_name profile_picture connections followers following")
          .sort({ createdAt: 1 })
          .lean();

        return { ...p, replies };
      })
    );

    return res.json({ success: true, comments: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { commentId } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment)
      return res.json({ success: false, message: "Không tìm thấy comment" });

    const uid = userId.toString();
    const hasLiked = comment.likes_count?.some((id) => id.toString() === uid);

    let updated;
    if (hasLiked) {
      updated = await Comment.findByIdAndUpdate(
        commentId,
        { $pull: { likes_count: userId } },
        { new: true }
      ).populate("user", "full_name profile_picture");

// 🔔 Thông báo cho chủ comment
  if (comment.user.toString() !== userId.toString()) {
    const sender = await User.findById(userId);
    await Notification.create({
      receiver: comment.user,
      sender: userId,
      type: "like_comment",
      comment: commentId,
      content: `${sender.full_name} đã thích bình luận của bạn.`,
    });
  }

      return res.json({
        success: true,
        message: "Đã bỏ thích bình luận",
        comment: updated,
      });
    } else {
      updated = await Comment.findByIdAndUpdate(
        commentId,
        { $push: { likes_count: userId } },
        { new: true }
      ).populate("user", "full_name profile_picture");
      return res.json({
        success: true,
        message: "Đã thích bình luận",
        comment: updated,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params; // note: route param
    const comment = await Comment.findById(id);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy comment" });

    if (comment.user.toString() !== userId.toString())
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa comment này",
      });

    if (!comment.parentComment) {
      // parent comment: delete parent + replies
      const replies = await Comment.find({ parentComment: id })
        .select("_id")
        .lean();
      const totalDeleted = 1 + (replies.length || 0);
      await Comment.deleteMany({ $or: [{ _id: id }, { parentComment: id }] });
      await Post.findByIdAndUpdate(comment.post, {
        $inc: { comments_count: -totalDeleted },
      });
    } else {
      // reply: delete only it, decrement post and parent's reply_count
      await Comment.deleteOne({ _id: id });
      await Post.findByIdAndUpdate(comment.post, {
        $inc: { comments_count: -1 },
      });
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $inc: { reply_count: -1 },
      });
    }

    return res.json({ success: true, message: "Xóa bình luận thành công" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};