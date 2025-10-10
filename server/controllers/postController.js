import fs from "fs";
import Post from "../models/Post.js";
import imagekit from "../configs/imageKit.js";
import User from "../models/User.js";
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
      aiResult.text_result.forEach(r =>
        console.log(`📝 Text: ${r.sentence} | Label: ${r.label} | Confidence: ${r.confidence}`)
      );
    }
    if (aiResult.image_result) {
      (Array.isArray(aiResult.image_result)
        ? aiResult.image_result
        : [aiResult.image_result]
      ).forEach(r =>
        console.log(`🖼️ Image Label: ${r.label} | Confidence: ${r.confidence}`)
      );
    }

    // 🚫 Kiểm tra vi phạm
    const hasViolation =
      (aiResult.text_result?.some(r => r.label !== "an_toan" && r.confidence >= 0.65)) ||
      (Array.isArray(aiResult.image_result)
        ? aiResult.image_result.some(r => r.label !== "an_toan" && r.confidence >= 0.65)
        : aiResult.image_result?.label !== "an_toan" && aiResult.image_result?.confidence >= 0.65);

    if (hasViolation) {
      images.forEach((img) => fs.unlinkSync(img.path));
      return res.status(400).json({
        success: false,
        message: "Bài viết chứa nội dung vi phạm, không thể đăng.",
        aiResult,
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
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};

export const getFeedPosts = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId); // tim nguoi dung theo userId

    const userIds = [userId, ...user.connections, ...user.following]; // mang chua id cua nguoi dung, nguoi dung ket ban va nguoi dung dang theo doi

    const posts = await Post.find({ user: { $in: userIds } })
      .populate("user") // populate de lay thong tin nguoi dung cho moi bai viet
      .sort({ createdAt: -1 }); // sap xep theo thoi gian tao bai viet, moi nhat o tren cung

    res.json({ success: true, posts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
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
      res.json({ success: true, message: "Đã thích bài viết" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
