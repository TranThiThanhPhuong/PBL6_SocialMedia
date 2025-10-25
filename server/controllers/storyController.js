import fs from "fs";
import imagekit from "../configs/imageKit.js";
import { inngest } from "../inngest/index.js";
import { analyzeContent } from "../utils/analyzeContent.js";
import User from "../models/User.js";
import Story from "../models/Story.js";
import Notification from "../models/Notification.js";

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

    // await inngest.send({
    //   name: "app/story.delete",
    //   data: { storyId: story._id },
    // });

    // res.json({ success: true });

    // ✅ Gửi sự kiện xóa story sau 24h
    const inngestResult = await inngest.send({
      name: "app/story.delete",
      data: { storyId: story._id },
    });

    console.log("📨 Đã gửi event tới Inngest:", inngestResult);
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
      .populate("user")
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};