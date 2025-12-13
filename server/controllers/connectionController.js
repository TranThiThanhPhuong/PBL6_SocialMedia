import User from "../models/User.js";
import Connection from "../models/Connection.js";
import Notification from "../models/Notification.js";
import { getIO, getOnlineUsers } from "../utils/socket.js";

const getIdFromReq = (req) => {
  // Hỗ trợ cả :id (params) và { id } (body)
  return req.params?.id || req.body?.id || null;
};

// -------------------- LẤY DANH SÁCH KẾT NỐI CỦA NGƯỜI DÙNG --------------------
export const getUserConnections = async (req, res) => {
  try {
    const { userId } = req.auth();

    const user = await User.findById(userId)
      .populate("connections", "full_name username profile_picture")
      .populate("followers", "full_name username profile_picture")
      .populate("following", "full_name username profile_picture")
      .populate("blockedUsers", "full_name username profile_picture")
      .select("connections followers following blockedUsers");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Người dùng không tồn tại" });
    }

    const pendingConnectionsDocs = await Connection.find({
      to_user_id: userId,
      status: "pending",
    })
      .populate("from_user_id", "full_name username profile_picture")
      .lean();

    const pendingConnections = pendingConnectionsDocs.map(
      (c) => c.from_user_id
    );

    res.json({
      success: true,
      connections: user.connections || [],
      followers: user.followers || [],
      following: user.following || [],
      pendingConnections,
      blockedUsers: user.blockedUsers || [],
    });
  } catch (error) {
    console.error("❌ getUserConnections error:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};

export const getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);
    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId },
      ],
    });

    if (!connection) {
      return res.json({ success: true, status: "none" });
    }

    if (connection.status === "accepted") {
      return res.json({ success: true, status: "friend" });
    }

    if (connection.status === "pending") {
      const status =
        connection.from_user_id.toString() === userId ? "sent" : "received";
      return res.json({ success: true, status });
    }

    return res.json({ success: true, status: "none" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- FOLLOW USER --------------------
export const followUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID mục tiêu." });

    if (userId === id)
      return res.json({
        success: false,
        message: "Không thể tự theo dõi chính mình.",
      });

    const [user, target] = await Promise.all([
      User.findById(userId).select(
        "full_name username profile_picture following blockedUsers"
      ),
      User.findById(id),
    ]);

    if (!user || !target)
      return res.json({ success: false, message: "Người dùng không tồn tại." });

    if (
      target.blockedUsers?.some((uid) => uid.toString() === userId) ||
      user.blockedUsers?.some((uid) => uid.toString() === id)
    ) {
      return res.json({
        success: false,
        message: "Bạn không thể theo dõi người dùng này.",
      });
    }

    if (user.following.some((uid) => uid.toString() === id)) {
      return res.json({
        success: false,
        message: "Bạn đã theo dõi người này rồi.",
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, { $addToSet: { following: id } }),
      User.findByIdAndUpdate(id, { $addToSet: { followers: userId } }),
    ]);

    let noti = await Notification.findOne({
      sender: userId,
      receiver: id,
      type: { $in: ["follow", "follow_hidden"] },
    });

    const THRESHOLD = 7000;
    const now = Date.now();

    if (noti) {
      if (now - new Date(noti.createdAt).getTime() < THRESHOLD) {
        if (noti.type === "follow_hidden") {
          noti.type = "follow";
          noti.isRead = false;
          await noti.save();
        }
        return res.json({
          success: true,
          message: "Đã theo dõi (No spam socket).",
        });
      }

      // Nếu đã quá 7s: Cập nhật lại thời gian và bắn socket như mới
      noti.type = "follow"; // Đảm bảo type đúng
      noti.createdAt = now;
      noti.isRead = false;
      await noti.save();
    } else {
      // Tạo mới hoàn toàn
      noti = await Notification.create({
        sender: userId,
        receiver: id,
        type: "follow",
        content: `${user.full_name} đã theo dõi bạn.`,
      });
    }

    // --- BẮN SOCKET (Chỉ chạy khi tạo mới hoặc > 7s) ---
    const io = getIO();
    const onlineUsers = getOnlineUsers();
    const receiverSocketId = onlineUsers.get(id);

    if (receiverSocketId) {
      const populatedNoti = {
        ...noti.toObject(),
        sender: {
          _id: user._id,
          full_name: user.full_name,
          username: user.username,
          profile_picture: user.profile_picture,
        },
      };
      io.to(receiverSocketId).emit("new_notification", populatedNoti);
    }

    res.json({ success: true, message: "Đã theo dõi người dùng." });
  } catch (error) {
    console.error("followUser error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- UNFOLLOW USER --------------------
export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID mục tiêu." });

    const [user, target] = await Promise.all([
      User.findById(userId),
      User.findById(id),
    ]);

    if (!user || !target)
      return res.json({ success: false, message: "Người dùng không tồn tại." });

    if (!user.following.some((uid) => uid.toString() === id)) {
      return res.json({
        success: false,
        message: "Bạn chưa theo dõi người này.",
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, { $pull: { following: id } }),
      User.findByIdAndUpdate(id, { $pull: { followers: userId } }),
    ]);

    const noti = await Notification.findOne({
      sender: userId,
      receiver: id,
      type: "follow",
    });

    if (noti) {
      const THRESHOLD = 7000;
      if (Date.now() - new Date(noti.createdAt).getTime() < THRESHOLD) {
        noti.type = "follow_hidden";
        await noti.save();
      } else {
        await Notification.deleteOne({ _id: noti._id });
      }
    }

    res.json({ success: true, message: "Đã bỏ theo dõi." });
  } catch (error) {
    console.error("unfollowUser error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- GỬI LỜI MỜI KẾT NỐI --------------------
export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID mục tiêu." });
    if (userId === id)
      return res.json({
        success: false,
        message: "Không thể gửi kết nối cho chính mình.",
      });

    const [user, target] = await Promise.all([
      User.findById(userId),
      User.findById(id),
    ]);

    if (!user || !target)
      return res.json({ success: false, message: "Người dùng không tồn tại." });

    const isBlocked = 
        user.blockedUsers?.includes(id) || 
        target.blockedUsers?.includes(userId);

    if (isBlocked) {
      return res.json({
        success: false,
        message: "Bạn không thể thực hiện hành động này (đã bị chặn hoặc chặn).", 
      });
    }

    // Kiểm tra kết nối hiện có (2 chiều)
    const existing = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId },
      ],
    });

    if (existing) {
      if (existing.status === "pending") {
        if (existing.from_user_id === userId && existing.to_user_id === id) {
          return res.status(400).json({
            success: false,
            message: "Bạn đã gửi lời mời, đang chờ phản hồi.",
          });
        }

        if (existing.from_user_id === id && existing.to_user_id === userId) {
          existing.status = "accepted";
          await existing.save();
          await Promise.all([
            User.updateOne({ _id: userId }, { $addToSet: { connections: id } }),
            User.updateOne({ _id: id }, { $addToSet: { connections: userId } }),
          ]);

          const newNoti = await Notification.create({
            sender: userId,
            receiver: id,
            type: "friend_accept", 
            content: `${user.full_name} đã chấp nhận lời mời kết nối của bạn.`,
          });

          const io = getIO();
          const onlineUsers = getOnlineUsers();
          const receiverSocketId = onlineUsers.get(id);

          if (receiverSocketId) {
            const populatedNoti = {
              ...newNoti.toObject(),
              sender: user,
            };
            io.to(receiverSocketId).emit("new_notification", populatedNoti);
          }

          return res.json({
            success: true,
            message: "Hai bạn đã trở thành bạn bè.",
            connection: existing,
          });
        }
      }

      if (existing.status === "accepted") {
        return res
          .status(400)
          .json({ success: false, message: "Hai bạn đã là bạn bè." });
      }

      if (existing.status === "rejected" || existing.status === "removed") {
        await Connection.deleteOne({ _id: existing._id });
      } else {
        return res.status(400).json({
          success: false,
          message: "Không thể xử lý yêu cầu hiện tại.",
        });
      }
    }

    const newConnection = await Connection.create({
      from_user_id: userId,
      to_user_id: id,
      status: "pending",
    });

    let newNoti = await Notification.findOne({
      sender: userId,
      receiver: id,
      type: { $in: ["friend_request", "friend_request_hidden"] },
    });

    const THRESHOLD = 7000;
    const now = Date.now();
    let shouldEmitSocket = true;

    if (newNoti) {
      if (now - new Date(newNoti.createdAt).getTime() < THRESHOLD) {
        shouldEmitSocket = false;
      }

      newNoti.type = "friend_request";
      newNoti.createdAt = now;
      newNoti.isRead = false;
      await newNoti.save();
    } else {
      newNoti = await Notification.create({
        sender: userId,
        receiver: id,
        type: "friend_request",
        content: `${user.full_name} đã gửi lời mời kết nối.`,
      });
    }

    if (shouldEmitSocket) {
      const io = getIO();
      const onlineUsers = getOnlineUsers();
      const receiverSocketId = onlineUsers.get(id);
      if (receiverSocketId) {
        const populatedNoti = { ...newNoti.toObject(), sender: user };
        io.to(receiverSocketId).emit("new_notification", populatedNoti);
      }
    }

    res.json({
      success: true,
      message: "Đã gửi lời mời kết nối.",
      connection: newConnection,
    });
  } catch (error) {
    console.error("sendConnectionRequest error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- HỦY LỜI MỜI KẾT BẠN ----------------
export const cancelConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID mục tiêu." });

    if (userId === id)
      return res.status(400).json({ success: false, message: "Không hợp lệ." });

    const connection = await Connection.findOne({
      from_user_id: userId,
      to_user_id: id,
      status: "pending",
    });

    if (!connection) {
      return res.json({
        success: false,
        message: "Không tìm thấy lời mời đang chờ để hủy.",
      });
    }

    await Connection.deleteOne({ _id: connection._id });

    const noti = await Notification.findOne({
      sender: userId,
      receiver: id,
      type: "friend_request",
    });
    if (noti) {
      const THRESHOLD = 7000;
      if (Date.now() - new Date(noti.createdAt).getTime() < THRESHOLD) {
        noti.type = "friend_request_hidden";
        await noti.save();
      } else {
        await Notification.deleteOne({ _id: noti._id });
      }
    }

    return res.json({
      success: true,
      message: "Đã hủy lời mời kết nối.",
    });
  } catch (error) {
    console.error("cancelConnectionRequest error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- CHẤP NHẬN KẾT NỐI --------------------
export const acceptConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID mục tiêu." });
    if (userId === id)
      return res.status(400).json({ success: false, message: "Không hợp lệ." });

    // Kiểm tra người dùng
    const [user, target] = await Promise.all([
      User.findById(userId),
      User.findById(id),
    ]);

    if (!user || !target)
      return res
        .status(404)
        .json({ success: false, message: "Người dùng không tồn tại." });

    // Kiểm tra block
    if (
      user.blockedUsers?.includes(id) ||
      target.blockedUsers?.includes(userId)
    ) {
      return res.json({
        success: false,
        message:
          "Không thể chấp nhận kết nối vì một trong hai bên đã chặn nhau.",
      });
    }

    // Kiểm tra connection hiện tại
    const connection = await Connection.findOne({
      from_user_id: id,
      to_user_id: userId,
    });

    if (!connection)
      return res.json({
        success: false,
        message: "Không tìm thấy yêu cầu kết nối.",
      });

    if (connection.status === "accepted")
      return res.json({ success: false, message: "Hai bạn đã là bạn bè." });

    if (connection.status !== "pending")
      return res.json({
        success: false,
        message: "Không thể chấp nhận kết nối trong trạng thái hiện tại.",
      });

    // Cập nhật sang accepted
    connection.status = "accepted";
    await connection.save();

    // Cập nhật danh sách bạn bè
    await Promise.all([
      User.findByIdAndUpdate(userId, { $addToSet: { connections: id } }),
      User.findByIdAndUpdate(id, { $addToSet: { connections: userId } }),
    ]);

    // Gửi thông báo
    const newNoti = await Notification.create({
      sender: userId,
      receiver: id,
      type: "friend_accept",
      content: `${user.full_name} đã chấp nhận lời mời kết nối của bạn.`,
    });

    // 🔥 Socket Realtime
    const io = getIO();
    const onlineUsers = getOnlineUsers();
    const receiverSocketId = onlineUsers.get(id); // Gửi cho người kia

    if (receiverSocketId) {
      const populatedNoti = {
        ...newNoti.toObject(),
        sender: user,
      };
      io.to(receiverSocketId).emit("new_notification", populatedNoti);
    }

    res.json({ success: true, message: "Đã chấp nhận kết nối." });
  } catch (error) {
    console.error("acceptConnectionRequest error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- TỪ CHỐI KẾT NỐI --------------------
export const rejectConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    const connection = await Connection.findOneAndUpdate(
      { from_user_id: id, to_user_id: userId, status: "pending" },
      { status: "rejected" }
    );

    if (!connection)
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lời mời kết nối để từ chối.",
      });

    res.json({ success: true, message: "Đã từ chối lời mời kết bạn." });
  } catch (error) {
    console.error("rejectConnectionRequest error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- HỦY KẾT BẠN --------------------
export const removeConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID người dùng." });

    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id, status: "accepted" },
        { from_user_id: id, to_user_id: userId, status: "accepted" },
      ],
    });

    if (!connection)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy kết nối để hủy." });

    await Connection.findByIdAndUpdate(connection._id, { status: "removed" });

    await Promise.all([
      User.findByIdAndUpdate(userId, { $pull: { connections: id } }),
      User.findByIdAndUpdate(id, { $pull: { connections: userId } }),
    ]);

    res.json({ success: true, message: "Đã hủy kết bạn thành công." });
  } catch (error) {
    console.error("removeConnectionRequest error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- CHẶN NGƯỜI DÙNG --------------------
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID người dùng cần chặn." });
    if (userId === id)
      return res.json({
        success: false,
        message: "Không thể tự chặn chính mình.",
      });

    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $pull: { following: id, followers: id, connections: id },
        $addToSet: { blockedUsers: id },
      }),
      User.findByIdAndUpdate(id, {
        $pull: { following: userId, followers: userId, connections: userId },
      }),
      Connection.updateMany(
        {
          $or: [
            { from_user_id: userId, to_user_id: id },
            { from_user_id: id, to_user_id: userId },
          ],
        },
        { status: "removed" }
      ),
    ]);

    res.json({ success: true, message: "Đã chặn người dùng." });
  } catch (error) {
    console.error("blockUser error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- BỎ CHẶN NGƯỜI DÙNG --------------------
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID người dùng cần bỏ chặn." });

    const user = await User.findById(userId);
    if (!user)
      return res.json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });

    if (!user.blockedUsers.includes(id))
      return res.json({ success: false, message: "Người này chưa bị chặn." });

    await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: id } });
    res.json({ success: true, message: "Đã bỏ chặn người dùng." });
  } catch (error) {
    console.error("unblockUser error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Người dùng không tồn tại",
        locked: true
      });
    }

    if (user.status === 'locked') {
      return res.status(404).json({ 
        success: false, 
        message: "Tài khoản đã bị khóa",
        locked: true 
      });
    }
    res.status(200).json({
      success: true,
      user: user, 
    });

  } catch (error) {
    console.error("Lỗi lấy thông tin user:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi máy chủ",
      locked: error.name === 'CastError' 
    });
  }
};