import fs from "fs";
import Post from "../models/Post.js";
import imagekit from "../configs/imageKit.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { analyzeContent } from "../utils/analyzeContent.js";
import { getIO, getOnlineUsers } from "../utils/socket.js";

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

    const posts = await Post.find({
      user: { $in: userIds },
      deleted: { $ne: true },
    })
      .populate("user")
      .populate({
        path: "shared_from",
        populate: {
          path: "user",
          select: "full_name username profile_picture",
        },
        match: { deleted: { $ne: true } },
        populate: { path: "user" },
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 });

    const validPosts = posts.filter(
      (p) => !(p.post_type === "shared" && !p.shared_from)
    );
    res.json({ success: true, posts: validPosts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.params;
    const { content, keptImageUrls: keptImageUrlsRaw } = req.body;
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

    let keptImageUrls = [];
    if (keptImageUrlsRaw) {
      try {
        keptImageUrls = JSON.parse(keptImageUrlsRaw);
      } catch (e) {
        keptImageUrls = Array.isArray(keptImageUrlsRaw)
          ? keptImageUrlsRaw
          : [keptImageUrlsRaw];
      }
      keptImageUrls = keptImageUrls.filter(
        (url) => url && typeof url === "string"
      );
    }

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

    let newImageUrls = [];
    if (newImages?.length) {
      newImageUrls = await Promise.all(
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
    const finalImageUrls = [...keptImageUrls, ...newImageUrls];
    post.content = content || post.content;
    post.image_urls = finalImageUrls;
    post.post_type =
      finalImageUrls.length > 0 && post.content
        ? "text_with_image"
        : finalImageUrls.length > 0
        ? "image"
        : "text";
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

export const deletePost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bài viết." });

    if (post.user.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bài viết này.",
      });

    if (post.image_urls?.length) {
      console.log("🧹 Xóa ảnh cũ (ImageKit):", post.image_urls);
    }

    if (post.post_type === "shared" && post.shared_from) {
      const original = await Post.findById(post.shared_from);
      if (original && !original.deleted && original.shares_count > 0) {
        original.shares_count -= 1;
        await original.save();
      }
    }

    if (post.post_type === "original") {
      await Post.updateMany(
        { shared_from: post._id },
        { $set: { deleted: true } }
      );
    }

    // await Post.findByIdAndDelete(postId);
    post.deleted = true;
    await post.save();

    const posts = await Post.find({ user: userId, deleted: { $ne: true } })
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
        const sender = await User.findById(userId).select(
          "full_name username profile_picture"
        );

        const newNoti = await Notification.create({
          receiver: post.user,
          sender: userId,
          type: "like",
          post: postId,
          content: `${sender.full_name} đã thích bài viết của bạn.`,
        });

        // 🔥 SOCKET REALTIME
        const io = getIO();
        const onlineUsers = getOnlineUsers();
        const receiverSocketId = onlineUsers.get(post.user.toString());

        if (receiverSocketId) {
          const populatedNoti = {
            ...newNoti.toObject(),
            sender: sender, // Gửi kèm info người like để hiện avatar
          };
          io.to(receiverSocketId).emit("new_notification", populatedNoti);
        }
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
    const { userId } = req.auth();
    const { postId } = req.params;

    const originalPost = await Post.findById(postId);
    if (!originalPost || originalPost.deleted)
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết để chia sẻ.",
      });

    if (originalPost.post_type === "shared")
      return res.status(400).json({
        success: false,
        message: "Không thể chia sẻ bài viết đã chia sẻ.",
      });

    const originalUser = await User.findById(
      originalPost.user,
      "username full_name profile_picture"
    );

    const newPost = await Post.create({
      user: userId,
      post_type: "shared",
      shared_from: originalPost._id,
    });

    originalPost.shares_count = (originalPost.shares_count || 0) + 1;
    await originalPost.save();

    if (originalPost.user.toString() !== userId) {
      const sender = await User.findById(userId).select(
        "full_name username profile_picture"
      );

      const newNoti = await Notification.create({
        receiver: originalPost.user,
        sender: userId,
        type: "share",
        post: postId,
        content: `${sender.full_name} đã chia sẻ bài viết của bạn.`,
      });

      // 🔥 SOCKET REALTIME
      const io = getIO();
      const onlineUsers = getOnlineUsers();
      const receiverSocketId = onlineUsers.get(originalPost.user.toString());

      if (receiverSocketId) {
        const populatedNoti = {
          ...newNoti.toObject(),
          sender: sender,
        };
        io.to(receiverSocketId).emit("new_notification", populatedNoti);
      }
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
    res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};


// 🟢 [ADMIN] Lấy tất cả bài viết
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({ deleted: { $ne: true } })
      .populate("user", "full_name username profile_picture")
      .sort({ createdAt: -1 });

    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔴 [ADMIN] Xóa bài viết (Bỏ qua kiểm tra chính chủ)
export const adminDeletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết." });

    // Soft delete
    post.deleted = true;
    await post.save();

    res.json({ success: true, message: "Đã xóa bài viết (Admin)." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
