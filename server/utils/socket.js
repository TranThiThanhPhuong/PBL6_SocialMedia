import { Server } from "socket.io";

let io;
const onlineUsers = new Map();      // userId -> socketId
const lastSeen = new Map();         // userId -> timestamp

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.on("connection", (socket) => {

    // user login + register socket
    socket.on("register_user", (userId) => {
      socket.userId = userId;

      onlineUsers.set(userId, socket.id);
      lastSeen.delete(userId);

      io.emit("user_online", userId);
    });

    // user disconnect
    socket.on("disconnect", () => {
      const userId = socket.userId;
      if (!userId) return;

      onlineUsers.delete(userId);
      lastSeen.set(userId, Date.now());

      io.emit("user_offline", {
        userId,
        lastSeen: lastSeen.get(userId),
      });
    });
  });

  return io;
};

export const getLastSeen = (userId) => lastSeen.get(userId) || null;
export const isOnline = (userId) => onlineUsers.has(userId);

export const getIO = () => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo!");
  return io;
};

export const getOnlineUsers = () => onlineUsers;