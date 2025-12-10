import fs from "fs";
import imagekit from "../configs/imageKit.js";
import { inngest } from "../inngest/index.js";
import { analyzeContent } from "../utils/analyzeContent.js";
import User from "../models/User.js";
import Story from "../models/Story.js";
import Notification from "../models/Notification.js";
import {
  getIO,
  getOnlineUsers
} from "../utils/socket.js";

export const addUserStory = async (req, res) => {
  try {
    const { userId } = req.auth();
    const {  content = "", post_type, background_color } = req.body;
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
            folder: "storys",
          });
          fs.unlinkSync(image.path);
          return response.url;
        })
      );
    }

    const story = await Story.create({
      user: userId,
      content,
      image_urls,
      post_type,
      background_color,
    });

    await inngest.send({
      name: "app/story.delete",
      data: { storyId: story._id },
    });

    res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getStories = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);

    const userIds = [userId, ...user.connections, ...user.following]; // lay ra danh sach userId cua chinh minh + nguoi minh ket ban + nguoi minh theo doi
    const stories = await Story.find({
      user: { $in: userIds },
    })
      .populate("user", "full_name username profile_picture")
      .populate("views_count", "full_name username profile_picture") // 🔥 QUAN TRỌNG: Lấy info người xem
      .populate("likes_count", "full_name username profile_picture") // Lấy info người like
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const deleteStoryManual = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { storyId } = req.params; // ✅ đúng tên param

    const story = await Story.findOneAndDelete({ _id: storyId, user: userId });
    if (!story)
      return res.status(404).json({ success: false, message: "Không tìm thấy story." });

    res.json({ success: true, message: "Đã xóa story." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const viewStory = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { storyId } = req.params;

    const story = await Story.findByIdAndUpdate(
      storyId,
      { $addToSet: { views_count: userId } },
      { new: true }
    ).populate("views_count", "full_name username profile_picture"); // Trả về list người xem mới nhất

    if (!story) {
      return res.status(404).json({ success: false, message: "Story không tồn tại" });
    }

    const io = getIO();
    const onlineUsers = getOnlineUsers();
    const ownerSocketId = onlineUsers.get(story.user.toString());

    if (ownerSocketId) {
      io.to(ownerSocketId).emit("story_stats_update", {
        storyId: story._id,
        views: story.views_count,
        likes: story.likes_count,
      });
    }

    res.json({ success: true, views: story.views_count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likeStory = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: "Story không tồn tại" });

    const isLiked = story.likes_count.some(id => id.toString() === userId);

    if (isLiked) {
      await Story.findByIdAndUpdate(storyId, { $pull: { likes_count: userId } });
      res.json({ success: true, message: "Unliked", liked: false });
    } else {
      await Story.findByIdAndUpdate(storyId, { $addToSet: { likes_count: userId } });
      
      if (story.user.toString() !== userId) {
          const senderInfo = await User.findById(userId).select("full_name username profile_picture");
          
          const newNoti = await Notification.create({
              receiver: story.user,
              sender: userId,
              type: "like", 
              content: `đã thích tin của bạn.`,
          });

          const io = getIO();
          const onlineUsers = getOnlineUsers();
          const receiverSocketId = onlineUsers.get(story.user.toString());
          
          if (receiverSocketId) {
              const populatedNoti = { ...newNoti.toObject(), sender: senderInfo };
              io.to(receiverSocketId).emit("new_notification", populatedNoti);
          }
      }
      res.json({ success: true, message: "Liked", liked: true });
    }

    if (updatedStory) {
      const io = getIO();
      const onlineUsers = getOnlineUsers();
      const ownerSocketId = onlineUsers.get(story.user.toString());

      if (ownerSocketId) {
        io.to(ownerSocketId).emit("story_stats_update", {
          storyId: updatedStory._id,
          views: updatedStory.views_count, // Gửi lại cả views để đảm bảo đồng bộ
          likes: updatedStory.likes_count, // Gửi list likes mới
        });
      }
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};