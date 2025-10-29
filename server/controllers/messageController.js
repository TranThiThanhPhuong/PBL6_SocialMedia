import fs from "fs";
import imagekit from "../configs/imageKit.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

const connections = {}; // SSE connections (server → client)

// -------------------- SSE KẾT NỐI REALTIME --------------------
export const sseController = (req, res) => {
  const { userId } = req.params;
  console.log("📡 New SSE client connected:", userId);

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  connections[userId] = res;
  res.write("event: connected\ndata: Connected to SSE stream\n\n");

  req.on("close", () => {
    delete connections[userId];
    console.log("❌ SSE client disconnected:", userId);
  });
};

// -------------------- GỬI TIN NHẮN --------------------
export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id, text } = req.body;
    const image = req.file;

    if (!to_user_id)
      return res.json({ success: false, message: "Thiếu ID người nhận." });

    const [sender, receiver] = await Promise.all([
      User.findById(userId).select("connections following blockedUsers"),
      User.findById(to_user_id).select("connections followers blockedUsers"),
    ]);

    if (!sender || !receiver)
      return res.json({ success: false, message: "Người dùng không tồn tại." });

    // Kiểm tra block
    if (
      sender.blockedUsers?.includes(to_user_id) ||
      receiver.blockedUsers?.includes(userId)
    ) {
      return res.json({
        success: false,
        message: "Không thể nhắn tin vì một trong hai đã chặn nhau.",
      });
    }

    // Kiểm tra quan hệ bạn bè hoặc follow
    const isFriend =
      sender.connections.includes(to_user_id) &&
      receiver.connections.includes(userId);

    const isFollowing =
      sender.following.includes(to_user_id) ||
      receiver.followers.includes(userId);

    if (!isFriend && !isFollowing) {
      return res.json({
        success: false,
        message: "Chỉ có thể nhắn tin khi đã kết bạn hoặc follow nhau.",
      });
    }

    // Upload ảnh nếu có
    let message_type = image ? "image" : "text";
    let media_url = "";

    if (image) {
      const buffer = fs.readFileSync(image.path);
      const uploaded = await imagekit.upload({
        file: buffer,
        fileName: image.originalname,
      });
      media_url = imagekit.url({
        path: uploaded.filePath,
        transformation: [
          { quality: "auto" },
          { format: "webp" },
          { width: "1280" },
        ],
      });
    }

    // Lưu tin nhắn
    const message = await Message.create({
      from_user_id: userId,
      to_user_id,
      text,
      message_type,
      media_url,
    });

    // Phản hồi cho người gửi
    res.json({ success: true, message });

    // Gửi realtime qua SSE
    const populatedMsg = await Message.findById(message._id).populate(
      "from_user_id",
      "full_name username profile_picture"
    );

    if (connections[to_user_id]) {
      connections[to_user_id].write(
        `data: ${JSON.stringify(populatedMsg)}\n\n`
      );
    }
  } catch (error) {
    console.error("sendMessage error:", error);
    res.json({ success: false, message: error.message });
  }
};

// -------------------- LẤY TIN NHẮN GIỮA 2 NGƯỜI --------------------
export const getChatMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id } = req.body;

    if (!to_user_id)
      return res.json({ success: false, message: "Thiếu ID người nhận." });

    const messages = await Message.find({
      $or: [
        { from_user_id: userId, to_user_id },
        { from_user_id: to_user_id, to_user_id: userId },
      ],
    }).sort({ createdAt: -1 });

    // Đánh dấu tin nhắn đã đọc
    await Message.updateMany(
      { from_user_id: to_user_id, to_user_id: userId, seen: false },
      { seen: true }
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.error("getChatMessages error:", error);
    res.json({ success: false, message: error.message });
  }
};

// -------------------- LẤY CUỘC TRÒ CHUYỆN GẦN NHẤT --------------------
export const getUserRecentMessages = async (req, res) => {
  try {
    const { userId } = req.auth();

    const messages = await Message.find({
      $or: [{ from_user_id: userId }, { to_user_id: userId }],
    })
      .populate("from_user_id to_user_id", "full_name username profile_picture")
      .sort({ createdAt: -1 });

    const lastMessages = {};
    messages.forEach((msg) => {
      const partnerId =
        msg.from_user_id._id.toString() === userId
          ? msg.to_user_id._id.toString()
          : msg.from_user_id._id.toString();

      if (!lastMessages[partnerId]) lastMessages[partnerId] = msg;
    });

    res.json({ success: true, messages: Object.values(lastMessages) });
  } catch (error) {
    console.error("getUserRecentMessages error:", error);
    res.json({ success: false, message: error.message });
  }
};