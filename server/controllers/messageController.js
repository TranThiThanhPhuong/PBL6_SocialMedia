import fs from "fs";
import imagekit from "../configs/imageKit.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { getIO, getOnlineUsers, isOnline , getLastSeen } from "../utils/socket.js";

// const connections = {}; // SSE connections (server → client)

// // -------------------- SSE KẾT NỐI REALTIME --------------------
// export const sseController = (req, res) => {
//   const { userId } = req.params;
//   console.log("📡 New SSE client connected:", userId);

//   res.set({
//     "Content-Type": "text/event-stream",
//     "Cache-Control": "no-cache",
//     Connection: "keep-alive",
//     "Access-Control-Allow-Origin": "*",
//   });

//   connections[userId] = res;
//   res.write("event: connected\ndata: Connected to SSE stream\n\n");

//   req.on("close", () => {
//     delete connections[userId];
//     console.log("❌ SSE client disconnected:", userId);
//   });
// };

// -------------------- GỬI TIN NHẮN --------------------
export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id, text } = req.body;
    const image = req.file;

    if (!to_user_id)
      return res.json({ success: false, message: "Thiếu ID người nhận." });

    const [sender, receiver] = await Promise.all([
      User.findById(userId).select("connections following followers blockedUsers pendingMessages"),
      User.findById(to_user_id).select("connections following followers blockedUsers pendingMessages"),
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

    const senderFollowsReceiver = Array.isArray(sender.following) && sender.following.includes(to_user_id);
    const priorMsgExists = await Message.exists({ from_user_id: userId, to_user_id }); // trước khi tạo -> kiểm tra có lịch sử gửi từ sender->receiver
    if (senderFollowsReceiver && !priorMsgExists) {
      await User.findByIdAndUpdate(to_user_id, { $addToSet: { pendingMessages: userId } });
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

    await User.findByIdAndUpdate(userId, { $pull: { pendingMessages: to_user_id } });

    const populatedMsg = await Message.findById(message._id).populate(
      "from_user_id",
      "full_name username profile_picture"
    );

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
    const { to_user_id, id } = req.body; // ủng hộ cả 2 key
    const otherId = to_user_id || id;

    if (!otherId)
      return res.json({ success: false, message: "Thiếu ID người nhận." });

    const messages = await Message.find({
      $and: [
        { deletedBy: { $ne: userId } }, // loại bỏ message đã bị chính user này xóa
        {
          $or: [
            { from_user_id: userId, to_user_id: otherId },
            { from_user_id: otherId, to_user_id: userId },
          ],
        },
      ],
    }).sort({ createdAt: 1 });

    // Đánh dấu tin nhắn đã đọc (vẫn thực hiện bình thường)
    await Message.updateMany(
      { from_user_id: otherId, to_user_id: userId, seen: false },
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
        const messages = await Message.find({ to_user_id: userId, deletedBy: { $ne: userId } }).populate('from_user_id to_user_id').sort({ createdAt: -1 }); // lay tat ca tin nhan gui den minh va sap xep theo thoi gian giam dan

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
    // hỗ trợ nhiều cách truyền id: body.to_user_id, body.id, params.id
    const otherId = req.body?.to_user_id || req.body?.id || req.params?.id;
    if (!otherId) return res.status(400).json({ success: false, message: "Thiếu ID người cần xóa" });

    await Message.updateMany(
      {
        $or: [
          { from_user_id: userId, to_user_id: otherId },
          { from_user_id: otherId, to_user_id: userId }
        ]
      },
      { $addToSet: { deletedBy: userId } }
    );

    // TÙY CHỌN (không bắt buộc): nếu bạn muốn xóa document khi cả hai đã xóa
    // await Message.deleteMany({ deletedBy: { $all: [userId, otherId] } });

    res.json({ success: true, message: "Đã xóa chat bên bạn." });
  } catch (error) {
    console.error("deleteChat error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const moveToPending = async (req, res) => {
  try {
    const { userId } = req.auth(); // người thao tác
    const { userId: targetId } = req.body; // người bị đưa vào pending

    const user = await User.findById(userId);

    // Kiểm tra xem target đã nhắn tin chưa
    const hasMessage = await Message.exists({
      $or: [
        { from_user_id: userId, to_user_id: targetId },
        { from_user_id: targetId, to_user_id: userId },
      ],
    });

    // Chỉ cho phép move nếu đang nhắn tin và là follower/following/connections
    if (!hasMessage)
      return res.json({
        success: false,
        message: "Chưa có cuộc trò chuyện với người này.",
      });

    if (
      !user.followers.includes(targetId) &&
      !user.following.includes(targetId) &&
      !user.connections.includes(targetId)
    )
      return res.json({
        success: false,
        message: "Người này không thuộc followers/following/connections.",
      });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { pendingMessages: targetId },
    });

    res.json({ success: true, message: "Đã đưa vào tin nhắn chờ." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPendingMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId).select("pendingMessages");
    if (!user) return res.json({ success: false, message: "Người dùng không tồn tại" });

    // lấy user info
    const pendingUsers = await User.find({ _id: { $in: user.pendingMessages } })
      .select("_id full_name username profile_picture");

    // lấy last message for each pending user (sender->me or me->sender)
    const pendingWithLast = await Promise.all(
      pendingUsers.map(async (u) => {
        const last = await Message.findOne({
          $or: [
            { from_user_id: u._id, to_user_id: userId },
            { from_user_id: userId, to_user_id: u._id },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(1)
          .lean();
        return { user: u, lastMessage: last || null };
      })
    );

    res.json({ success: true, pending: pendingWithLast });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
