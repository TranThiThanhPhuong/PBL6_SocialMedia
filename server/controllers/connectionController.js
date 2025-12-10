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
    const { id } = req.params; // ID của profile đang xem

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
        // Kiểm tra ai là người gửi để trả về status "sent" (đã gửi) hay "received" (được mời)
        const status = connection.from_user_id.toString() === userId ? "sent" : "received";
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

    console.log("followUser:", { by: userId, target: id });

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
      User.findById(userId),
      User.findById(id),
    ]);

    if (!user || !target)
      return res.json({ success: false, message: "Người dùng không tồn tại." });

    // Kiểm tra bị chặn
    if (
      target.blockedUsers?.some((uid) => uid.toString() === userId) ||
      user.blockedUsers?.some((uid) => uid.toString() === id)
    ) {
      return res.json({
        success: false,
        message: "Không thể thực hiện hành động này.",
      });
    }

    // Kiểm tra đã follow chưa
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

    // Gửi thông báo follow nếu chưa có
    const existingNoti = await Notification.findOne({
      sender: userId,
      receiver: id,
      type: "follow",
    });

    if (!existingNoti) {
      const newNoti = await Notification.create({
        sender: userId,
        receiver: id,
        type: "follow",
        content: `${user.full_name} đã theo dõi bạn.`,
      });

      // 🔥 Socket Realtime
      const io = getIO();
      const onlineUsers = getOnlineUsers();
      const receiverSocketId = onlineUsers.get(id);

      if (receiverSocketId) {
        const populatedNoti = {
          ...newNoti.toObject(),
          sender: user, // Gửi kèm thông tin user để hiện avatar ngay
        };
        io.to(receiverSocketId).emit("new_notification", populatedNoti);
      }
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

    console.log("unfollowUser:", { by: userId, target: id });

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

    // Kiểm tra có đang follow không
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

    console.log("sendConnectionRequest:", { from: userId, to: id });

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

    // Kiểm tra block
    if (
      (Array.isArray(user.blockedUsers) && user.blockedUsers.includes(id)) ||
      (Array.isArray(target.blockedUsers) &&
        target.blockedUsers.includes(userId))
    ) {
      return res.status(403).json({
        success: false,
        message: "Không thể gửi kết nối cho người này (bị chặn).",
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
      // Nếu đang chờ (pending)
      if (existing.status === "pending") {
        // Trường hợp người gửi đã gửi trước -> báo đã gửi rồi
        if (existing.from_user_id === userId && existing.to_user_id === id) {
          return res.status(400).json({
            success: false,
            message: "Bạn đã gửi lời mời, đang chờ phản hồi.",
          });
        }

        // Trường hợp bên kia đã gửi trước (ngược chiều pending)
        if (existing.from_user_id === id && existing.to_user_id === userId) {
          // Quyết định: tự động chấp nhận kết nối (nếu bạn muốn khác, đổi logic ở đây)
          existing.status = "accepted";
          await existing.save();

          // Cập nhật danh sách connections của cả hai (tránh trùng)
          await Promise.all([
            User.updateOne({ _id: userId }, { $addToSet: { connections: id } }),
            User.updateOne({ _id: id }, { $addToSet: { connections: userId } }),
          ]);

          const newNoti = await Notification.create({
            sender: userId,
            receiver: id,
            type: "friend_accept", // Sửa từ friend_request_accepted -> friend_accept
            content: `${user.full_name} đã chấp nhận lời mời kết nối của bạn.`,
          });

          // 🔥 Bắn socket báo cho người kia biết
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

      // Nếu đã accepted
      if (existing.status === "accepted") {
        return res
          .status(400)
          .json({ success: false, message: "Hai bạn đã là bạn bè." });
      }

      // Nếu đã bị từ chối hoặc removed => cho phép gửi lại: xóa bản cũ rồi tạo mới
      if (existing.status === "rejected" || existing.status === "removed") {
        await Connection.deleteOne({ _id: existing._id });
        // tiếp tục bên dưới tạo mới
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

    const newNoti = await Notification.create({
      sender: userId,
      receiver: id,
      type: "friend_request",
      content: `${user.full_name} đã gửi lời mời kết nối.`,
    });

    // 🔥 Socket Realtime
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
    const { userId } = req.auth(); // người đang hủy
    const id = getIdFromReq(req); // id mục tiêu

    console.log("cancelConnectionRequest:", { from: userId, to: id });

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

    // Tạo thông báo cho người bị hủy (không bắt buộc, có thể bỏ)
    await Notification.create({
      sender: userId,
      receiver: id,
      type: "friend_request_cancelled",
      content: `${userId} đã hủy lời mời kết nối.`,
    });

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
