import { Server } from "socket.io";

let io;
const onlineUsers = new Map();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🟢 Connected: ${socket.id}`);

    socket.on("register_user", (userId) => {
  onlineUsers.set(userId, { socketId: socket.id, lastSeen: new Date() });
  socket.userId = userId;
  io.emit("user_online", { userId }); // gửi object, dễ check
  io.emit("get_online_users", Array.from(onlineUsers.keys()));
});

socket.on("disconnect", () => {
  if (socket.userId) {
    const lastSeen = new Date();
    onlineUsers.set(socket.userId, { socketId: null, lastSeen });
    io.emit("user_offline", { userId: socket.userId, lastSeen });
  }
});
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo!");
  return io;
};

export const getOnlineUsers = () => onlineUsers;