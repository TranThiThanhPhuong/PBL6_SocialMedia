import fs from "fs";
import Post from "../models/Post.js";
import imagekit from "../configs/imageKit.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { analyzeContent } from "../utils/analyzeContent.js";

export const addPost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { content, post_type } = req.body;
    const images = req.files;

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

    // 🚫 Kiểm tra chi tiết vi phạm
    const textViolations =
      aiResult.text_result?.filter(
        (r) => r.label !== "an_toan" && r.confidence >= 0.65
      ) || [];

    const imageViolations = (
      Array.isArray(aiResult.image_result)
        ? aiResult.image_result
        : [aiResult.image_result]
    ).filter((r) => r.label !== "an_toan" && r.confidence >= 0.65);

    if (textViolations.length > 0 || imageViolations.length > 0) {
      images.forEach((img) => fs.unlinkSync(img.path));
      return res.status(400).json({
        success: false,
        message: "Bài viết chứa nội dung vi phạm, không thể đăng.",
        aiResult,
        detail: {
          textViolations,
          imageViolations,
        },
      });
    }

    // ✅ Nếu an toàn → upload ảnh + lưu DB
    let image_urls = [];
    if (images?.length) {
      image_urls = await Promise.all(
        images.map(async (image) => {
          const fileBuffer = fs.readFileSync(image.path);
          const response = await imagekit.upload({
            file: fileBuffer,
            fileName: image.originalname,
            folder: "posts",
          });
          fs.unlinkSync(image.path);
          return response.url;
        })
      );
    }

    await Post.create({
      user: userId,
      content,
      image_urls,
      post_type,
    });

    res.json({ success: true, message: "Tạo bài viết thành công", aiResult });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};

export const getFeedPosts = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId); // tim nguoi dung theo userId

    const userIds = [userId, ...user.connections, ...user.following]; // mang chua id cua nguoi dung, nguoi dung ket ban va nguoi dung dang theo doi

    const posts = await Post.find({ user: { $in: userIds } })
      .populate("user") // populate de lay thong tin nguoi dung cho moi bai viet
      .populate({
        path: "shared_from", // bài gốc
        populate: { path: "user" }, // thông tin user bài gốc
      })
      .sort({ createdAt: -1 }); // sap xep theo thoi gian tao bai viet, moi nhat o tren cung

    res.json({ success: true, posts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// 📝 Cập nhật bài viết
export const updatePost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.params;
    const { content } = req.body;
    const newImages = req.files;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bài viết." });

    // ❌ Kiểm tra quyền sửa
    if (post.user.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa bài viết này.",
      });

    // 🧠 Gọi AI kiểm duyệt lại nội dung
    const aiResult = await analyzeContent(content, newImages);
    const textViolations =
      aiResult.text_result?.filter(
        (r) => r.label !== "an_toan" && r.confidence >= 0.65
      ) || [];
    const imageViolations = (
      Array.isArray(aiResult.image_result)
        ? aiResult.image_result
        : [aiResult.image_result]
    ).filter((r) => r.label !== "an_toan" && r.confidence >= 0.65);

    if (textViolations.length > 0 || imageViolations.length > 0) {
      newImages.forEach((img) => fs.unlinkSync(img.path));
      return res.status(400).json({
        success: false,
        message: "Bài viết chứa nội dung vi phạm, không thể cập nhật.",
        aiResult,
      });
    }

    // 🖼️ Nếu có ảnh mới → upload lên ImageKit
    let image_urls = post.image_urls; // giữ ảnh cũ
    if (newImages?.length) {
      // xóa ảnh cũ nếu có (tùy bạn muốn giữ hay xóa)
      image_urls = await Promise.all(
        newImages.map(async (image) => {
          const buffer = fs.readFileSync(image.path);
          const uploaded = await imagekit.upload({
            file: buffer,
            fileName: image.originalname,
            folder: "posts",
          });
          fs.unlinkSync(image.path);
          return uploaded.url;
        })
      );
    }

    // ✅ Cập nhật DB
    post.content = content || post.content;
    post.image_urls = image_urls;
    await post.save();

    const updatedPost = await Post.findById(post._id).populate("user");
    res.json({
      success: true,
      message: "Cập nhật bài viết thành công",
      post: updatedPost,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🗑️ Xóa bài viết
export const deletePost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bài viết." });

    // ❌ Chỉ chủ bài viết mới có thể xóa
    if (post.user.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bài viết này.",
      });

    // 🧹 Xóa ảnh trong thư mục tạm nếu có
    if (post.image_urls?.length) {
      console.log("🧹 Xóa ảnh cũ (ImageKit):", post.image_urls);
      // 👉 Nếu bạn lưu cả fileId từ ImageKit thì có thể gọi imagekit.deleteFile(fileId)
      // Còn hiện tại chỉ log URL, không xóa được file thực tế.
    }

    await Post.findByIdAndDelete(postId);
    const posts = await Post.find({ user: userId })
      .populate("user")
      .sort({ createdAt: -1 });

    res.json({ success: true, message: "Đã xóa bài viết thành công.", posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likePosts = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.body;

    const post = await Post.findById(postId); // tim bai viet theo postId

    if (post.likes_count.includes(userId)) {
      // neu da like thi bo like
      post.likes_count = post.likes_count.filter((user) => user !== userId); // loc bo userId khoi mang likes_count
      await post.save(); // luu lai thay doi
      res.json({ success: true, message: "Đã bỏ thích bài viết" });
    } else {
      // neu chua like thi like
      post.likes_count.push(userId); // them userId vao mang likes_count
      await post.save(); // luu lai thay doi

      // ✅ Gửi thông báo nếu không phải chính chủ bài viết
      if (post.user.toString() !== userId) {
        const sender = await User.findById(userId);

        await Notification.create({
          receiver: post.user,
          sender: userId,
          type: "like",
          post: postId,
          content: `${sender.full_name} đã thích bài viết của bạn.`,
        });
      }

      res.json({ success: true, message: "Đã thích bài viết" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const sharePost = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { postId } = req.params;

    // Tìm bài viết gốc
    const originalPost = await Post.findById(postId);
    if (!originalPost)
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết để chia sẻ.",
      });

    // Không cho chia sẻ bài đã là post shared
    if (originalPost.post_type === "shared")
      return res.status(400).json({
        success: false,
        message: "Không thể chia sẻ bài viết đã chia sẻ.",
      });

    if (originalPost.user.toString() === userId)
      return res.status(400).json({
        success: false,
        message: "Bạn không thể chia sẻ bài viết của chính mình.",
      });

    // Lấy thông tin user của bài viết gốc
    const originalUser = await User.findById(originalPost.user, "username full_name profile_picture");

    // Tạo post mới kiểu "shared"
    const newPost = await Post.create({
      user: userId,
      post_type: "shared",
      shared_from: originalPost._id,
    });

    // Cập nhật số lượt chia sẻ
    originalPost.shares_count += 1;
    await originalPost.save();

    // Tạo thông báo
    if (originalPost.user.toString() !== userId) {
      const sender = await User.findById(userId);
      await Notification.create({
        receiver: originalPost.user,
        sender: userId,
        type: "share",
        post: postId,
        content: `${sender.full_name} đã chia sẻ bài viết của bạn.`,
      });
    }

    res.json({
      success: true,
      message: "Chia sẻ bài viết thành công.",
      post: {
        ...newPost.toObject(),
        shared_from: {
          ...originalPost.toObject(),
          user: originalUser,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};