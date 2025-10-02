import fs from "fs";
import imagekit from "../configs/imageKit.js";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";

// Thêm comment vào post
export const addComment = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId, text, parent_comment } = req.body;
    const images = req.files || [];

    let image_urls = [];

    if (images.length) {
      image_urls = await Promise.all(
        images.map(async (image) => {
          const buffer = fs.readFileSync(image.path);
          const response = await imagekit.upload({
            file: buffer,
            fileName: image.originalname,
            folder: "comments",
          });

          return imagekit.url({
            path: response.filePath,
            transformation: [{ quality: "auto", format: "webp", width: "800" }],
          });
        })
      );
    }

    const comment = await Comment.create({
      post: postId,
      user: userId,
      text,
      image_urls,
      parent_comment: parent_comment || null,
    });

    res.json({ success: true, comment });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Lấy tất cả comment của một post
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // Lấy comment cha
    const comments = await Comment.find({ post: postId, parent_comment: null })
      .populate("user", "full_name profile_picture")
      .sort({ createdAt: -1 });

    // Map thêm replies cho từng comment
    const result = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parent_comment: comment._id })
          .populate("user", "full_name profile_picture")
          .sort({ createdAt: 1 });

        return {
          ...comment.toObject(),
          replies,
        };
      })
    );

    res.json({ success: true, comments: result });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Like / Unlike comment
export const likeComment = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { commentId } = req.body;

    const comment = await Comment.findById(commentId);

    if (!comment)
      return res.json({ success: false, message: "Không tìm thấy comment" });

    if (comment.likes.includes(userId)) {
      comment.likes = comment.likes.filter((id) => id !== userId);
      await comment.save();
      return res.json({ success: true, message: "Đã bỏ thích bình luận" });
    } else {
      comment.likes.push(userId);
      await comment.save();
      return res.json({ success: true, message: "Đã thích bình luận" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Xóa comment
export const deleteComment = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { commentId } = req.body;

    const comment = await Comment.findById(commentId);

    if (!comment)
      return res.json({ success: false, message: "Không tìm thấy comment" });
    if (comment.user !== userId)
      return res.json({
        success: false,
        message: "Bạn không có quyền xóa comment này",
      });

    await Comment.deleteOne({ _id: commentId });

    res.json({ success: true, message: "Xóa bình luận thành công" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};