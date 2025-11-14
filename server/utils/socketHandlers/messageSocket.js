//import { getIO, getOnlineUsers } from "../socket.js";

const userLastSeen = new Map(); // userId -> timestamp

export const messageSocket = () => {
  const io = getIO();

  io.on("connection", (socket) => {
    console.log("🔗 Message socket connected:", socket.id);

    // Khi user đăng ký socket (đang hoạt động)
    socket.on("register_user", (userId) => {
      socket.userId = userId;

      // Lưu online
      getOnlineUsers().set(userId, socket.id);

      // Xóa last_seen (vì đang online)
      userLastSeen.delete(userId);

      // Gửi event online
      io.emit("user_online", userId);

      console.log(`🟢 User online: ${userId}`);
    });

    // Khi user disconnect
    socket.on("disconnect", () => {
      const userId = socket.userId;
      if (!userId) return;

      // Xóa trạng thái online
      getOnlineUsers().delete(userId);

      // Lưu thời gian offline
      userLastSeen.set(userId, Date.now());

      io.emit("user_offline", {
        userId,
        lastSeen: userLastSeen.get(userId),
      });

      console.log(`🔴 User offline: ${userId}`);
    });
  });
};

export const getLastSeen = (userId) => {
  return userLastSeen.get(userId) || null;
};