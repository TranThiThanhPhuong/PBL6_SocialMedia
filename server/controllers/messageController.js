import fs from "fs";
import imagekit from "../configs/imageKit.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import {
  getIO,
  getOnlineUsers,
  isOnline,
  getLastSeen,
} from "../utils/socket.js";

export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id, text, storyId, reply_to_post } = req.body;
    const image = req.file;

    if (!to_user_id)
      return res.json({ success: false, message: "Thiếu ID người nhận." });

    const [sender, receiver] = await Promise.all([
      User.findById(userId).select(
        "connections following followers blockedUsers pendingConversations"
      ),
      User.findById(to_user_id).select(
        "connections following followers blockedUsers pendingConversations"
      ),
    ]);

    if (!receiver)
      return res.json({ success: false, message: "Người dùng không tồn tại." });

    const isBlockedByMe = sender.blockedUsers?.some(
      (id) => id.toString() === to_user_id.toString()
    );
    const isBlockedByTarget = receiver.blockedUsers?.some(
      (id) => id.toString() === userId.toString()
    );

    if (isBlockedByMe) {
      return res.json({
        success: false,
        message: "Bạn đã chặn người dùng này, hãy bỏ chặn để nhắn tin.",
      });
    }

    if (isBlockedByTarget) {
      return res.json({
        success: false,
        message: "Bạn không thể gửi tin nhắn. Người dùng này đã chặn bạn.",
      });
    }

    if (receiver.status === "locked") {
      return res.json({
        success: false,
        message: "Tài khoản người nhận đã bị khóa.",
      });
    }

    const isFriend = sender.connections.includes(to_user_id);
    const isSenderFollowing = sender.following.includes(to_user_id);
    const isReceiverFollowing = receiver.following.includes(userId);

    const canMessage = isFriend || isSenderFollowing || isReceiverFollowing;

    if (!canMessage) {
      return res.json({
        success: false,
        message: "Chỉ có thể nhắn tin khi đã kết bạn hoặc có theo dõi.",
      });
    }

    if (sender.pendingConversations.includes(to_user_id)) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pendingConversations: to_user_id },
      });
    }

    const shouldBePending =
      !isFriend && !isReceiverFollowing && isSenderFollowing;

    if (shouldBePending) {
      await User.findByIdAndUpdate(to_user_id, {
        $addToSet: { pendingConversations: userId },
      });
    }

    let message_type = image ? "image" : "text";
    let media_url = "";

    // Allow passing an existing media_url in body (e.g., share post image preview)
    const bodyMediaUrl = req.body?.media_url;

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
      fs.unlinkSync(image.path);
    } else if (bodyMediaUrl) {
      // use provided media URL as-is
      media_url = bodyMediaUrl;
      message_type = "image";
    }

    const message = await Message.create({
      from_user_id: userId,
      to_user_id,
      text,
      message_type,
      media_url,
      reply_to_story: storyId,
      reply_to_post,
    });

    const populatedMsg = await Message.findById(message._id)
      .populate("from_user_id", "full_name username profile_picture")
      .populate("to_user_id", "full_name username profile_picture")
      .populate("reply_to_story")
      .populate({
        path: "reply_to_post",
        populate: [
          { path: "user", select: "full_name username profile_picture" },
          { path: "shared_from", populate: { path: "user", select: "full_name username profile_picture" } },
        ],
      })
      .lean();

    const io = getIO();
    const onlineUsers = getOnlineUsers();

    const receiverSocketId = onlineUsers.get(to_user_id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_message", {
        ...populatedMsg,
        isPending:
          shouldBePending && !receiver.pendingConversations?.includes(userId), 
      });
    }

    const senderSocketId = onlineUsers.get(userId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("receive_message", populatedMsg);
    }

    return res.json({ success: true, message: populatedMsg });
  } catch (error) {
    console.error("sendMessage error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const getInboxMessages = async (req, res) => {
  try {
    const { userId } = req.auth();

    const currentUser = await User.findById(userId).select(
      "blockedUsers pendingConversations"
    );

    const ignoredIds = [
      ...(currentUser.blockedUsers || []),
      ...(currentUser.pendingConversations || []),
    ];

    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ from_user_id: userId }, { to_user_id: userId }],
          deletedBy: { $ne: userId },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$from_user_id", userId] },
              "$to_user_id",
              "$from_user_id",
            ],
          },
          lastMessage: { $first: "$$ROOT" },
        },
      },
      // Lọc bỏ những người bị chặn hoặc đang chờ
      {
        $match: {
          _id: { $nin: ignoredIds },
        },
      },
      { $replaceRoot: { newRoot: "$lastMessage" } }, // Quay lại format message object
      { $sort: { createdAt: -1 } },
    ]);

    // Populate thông tin user và thông tin bài viết nếu có
    await Message.populate(messages, [
      { path: "from_user_id to_user_id", select: "full_name username profile_picture" },
      {
        path: "reply_to_post",
        populate: [
          { path: "user", select: "full_name username profile_picture" },
          { path: "shared_from", populate: { path: "user", select: "full_name username profile_picture" } },
        ],
      },
    ]);

    res.json({ success: true, messages });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export const getPendingMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const currentUser = await User.findById(userId).select(
      "pendingConversations blockedUsers"
    );

    if (
      !currentUser.pendingConversations ||
      currentUser.pendingConversations.length === 0
    ) {
      return res.json({ success: true, messages: [] });
    }

    // Lọc bỏ blockedUsers nếu lỡ có
    const pendingIds = currentUser.pendingConversations.filter(
      (id) => !currentUser.blockedUsers.includes(id)
    );

    // Lấy tin nhắn cuối cùng của những người trong danh sách chờ
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { from_user_id: { $in: pendingIds }, to_user_id: userId },
            { from_user_id: userId, to_user_id: { $in: pendingIds } },
          ],
          deletedBy: { $ne: userId },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$from_user_id", userId] },
              "$to_user_id",
              "$from_user_id",
            ],
          },
          lastMessage: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$lastMessage" } },
      { $sort: { createdAt: -1 } },
    ]);

    await Message.populate(messages, [
      { path: "from_user_id to_user_id", select: "full_name username profile_picture" },
      {
        path: "reply_to_post",
        populate: [
          { path: "user", select: "full_name username profile_picture" },
          { path: "shared_from", populate: { path: "user", select: "full_name username profile_picture" } },
        ],
      },
    ]);

    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const toggleConversationStatus = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { target_user_id, action } = req.body;

    if (!target_user_id)
      return res.json({ success: false, message: "Thiếu ID." });

    if (action === "move_to_inbox") {
      await User.findByIdAndUpdate(userId, {
        $pull: { pendingConversations: target_user_id },
      });
      return res.json({
        success: true,
        message: "Đã chuyển sang hộp thư chính.",
      });
    }

    if (action === "move_to_pending") {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { pendingConversations: target_user_id },
      });
      return res.json({
        success: true,
        message: "Đã chuyển vào tin nhắn chờ.",
      });
    }

    return res.json({ success: false, message: "Hành động không hợp lệ." });
  } catch (error) {
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

    // Populate sender/receiver and referenced post user for reply previews
    await Message.populate(messages, [
      { path: 'from_user_id to_user_id', select: 'full_name username profile_picture' },
      { path: 'reply_to_post', populate: [ { path: 'user', select: 'full_name username profile_picture' }, { path: 'shared_from', populate: { path: 'user', select: 'full_name username profile_picture' } } ] },
    ]);

    // Đánh dấu tin nhắn đã đọc (vẫn thực hiện bình thường)
    await Message.updateMany(
      { from_user_id: otherId, to_user_id: userId, seen: false },
      { seen: true }
    );

    const io = getIO();
    const senderSocketId = getOnlineUsers().get(otherId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages_seen", {
        viewerId: userId, // ID người vừa xem (là mình)
      });
    }

    res.json({ success: true, messages });
  } catch (error) {
    console.error("getChatMessages error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const getUserRecentMessages2 = async (req, res) => {
  try {
    const { userId } = req.auth();
    const messages = await Message.find({
      $or: [{ from_user_id: userId }, { to_user_id: userId }],
      deletedBy: { $ne: userId },
    })
      .populate("from_user_id", "full_name username profile_picture")
      .populate("to_user_id", "full_name username profile_picture")
      .populate({ path: 'reply_to_post', populate: [ { path: 'user', select: 'full_name username profile_picture' }, { path: 'shared_from', populate: { path: 'user', select: 'full_name username profile_picture' } } ] })
      .sort({ createdAt: -1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// -------------------- LẤY CUỘC TRÒ CHUYỆN GẦN NHẤT --------------------
export const getUserRecentMessages = async (req, res) => {
  try {
    const { userId } = req.auth();

    const currentUser = await User.findById(userId).select(
      "blockedUsers connections following followers pendingConversations"
    );

    if (!currentUser) {
      return res.json({ success: false, message: "Không tìm thấy user." });
    }

    // 2. Tạo danh sách whitelist (Bạn bè + Đang theo dõi)
    let validSenders = [...currentUser.connections, ...currentUser.following, ...currentUser.followers];
    validSenders = Array.from(new Set(validSenders.map((id) => id.toString()))); // Loại bỏ trùng lặp

    let validSenderIds = new Set(validSenders.map((id) => id.toString()));

    if (currentUser.blockedUsers && currentUser.blockedUsers.length > 0) {
      currentUser.blockedUsers.forEach((blockedId) => {
        validSenderIds.delete(blockedId.toString());
      });
    }

    if (currentUser.pendingConversations && currentUser.pendingConversations.length > 0) {
      currentUser.pendingConversations.forEach((pendingId) => {
        validSenderIds.delete(pendingId.toString());
      });
    }

    const allowedSenderIdsArray = Array.from(validSenderIds);

    const messages = await Message.find({
      to_user_id: userId,
      deletedBy: { $ne: userId },
      from_user_id: { $in: allowedSenderIdsArray },
      seen: false,
    })
      .populate({
        path: "from_user_id",
        select: "full_name username profile_picture status",
      })
      .populate({
        path: 'reply_to_post',
        populate: [
          { path: 'user', select: 'full_name username profile_picture' },
          { path: 'shared_from', populate: { path: 'user', select: 'full_name username profile_picture' } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

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
    const io = getIO();
    const senderSocketId = getOnlineUsers().get(from_user_id);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages_seen", {
        viewerId: userId,
      });
    }
    res.json({ success: true, message: "Đã đánh dấu tin nhắn là đã xem." });
  } catch (error) {
    console.error("markSeen error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { userId } = req.auth();
    const otherId = req.body?.to_user_id || req.body?.id || req.params?.id;
    if (!otherId)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID người cần xóa" });

    await Message.updateMany(
      {
        $or: [
          { from_user_id: userId, to_user_id: otherId },
          { from_user_id: otherId, to_user_id: userId },
        ],
      },
      { $addToSet: { deletedBy: userId } }
    );

    res.json({ success: true, message: "Đã xóa chat bên bạn." });
  } catch (error) {
    console.error("deleteChat error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
