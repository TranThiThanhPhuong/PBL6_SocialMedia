import fs from "fs";
import imagekit from "../configs/imageKit.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { getIO, getOnlineUsers, isOnline , getLastSeen } from "../utils/socket.js";

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
      User.findById(userId).select("connections following followers blockedUsers"),
      User.findById(to_user_id).select("connections following followers blockedUsers"),
    ]);

    if (!sender || !receiver)
      return res.json({ success: false, message: "Người dùng không tồn tại." });

    const canMessage =
      sender.connections.includes(to_user_id) && receiver.connections.includes(userId) // là bạn bè
      || sender.following.includes(to_user_id) // bạn theo dõi người kia
      || receiver.following.includes(userId); // người kia theo dõi bạn

    if (!canMessage) {
      return res.json({
        success: false,
        message: "Chỉ có thể nhắn tin khi đã kết bạn hoặc theo dõi nhau.",
      });
    }

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

    const io = getIO();
    const receiverSocketId = getOnlineUsers().get(to_user_id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_message", populatedMsg);
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
      deletedBy: { $ne: userId },
    }).sort({ createdAt: 1 });

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
        const messages = await Message.find({ to_user_id: userId }).populate('from_user_id to_user_id').sort({ createdAt: -1 }); // lay tat ca tin nhan gui den minh va sap xep theo thoi gian giam dan

        res.json({ success: true, messages });
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

export const getSocket = async (req, res) => {
  const { userId } = req.params;

  return res.json({
    success: true,
    online: isOnline(userId),
    lastSeen: getLastSeen(userId),
  });
};

export const markSeen = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { from_user_id } = req.body;
    if (!from_user_id)
      return res.json({ success: false, message: "Thiếu ID người gửi." });  
    await Message.updateMany(
      { from_user_id, to_user_id: userId, seen: false },
      { seen: true }
    );
    res.json({ success: true, message: "Đã đánh dấu tin nhắn là đã xem." });
  } catch (error) {
    console.error("markSeen error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { userId: otherId } = req.body;

    await Message.updateMany(
      { $or: [
          { from_user_id: userId, to_user_id: otherId },
          { from_user_id: otherId, to_user_id: userId }
        ] },
      { $addToSet: { deletedBy: userId } } // thêm trường deletedBy nếu chưa có
    );

    res.json({ success: true, message: "Đã xóa chat bên bạn." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const moveToPending = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { userId: targetId } = req.body;

    await User.findByIdAndUpdate(userId, {
      $addToSet: { pendingMessages: targetId }
    });

    res.json({ success: true, message: "Đã đưa vào tin nhắn chờ." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};