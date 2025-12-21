import { Server } from "socket.io";

let io;
const onlineUsers = new Map(); // userId -> socketId
const lastSeen = new Map(); // userId -> timestamp

export const initSocket = (server) => {
  io = new Server(server, {
    connectionStateRecovery: {
      // Tính năng mới của Socket.io v4.6+ giúp khôi phục kết nối khi rớt mạng
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
    cors: {
      // 👇 Hàm này cho phép kết nối từ Local, Prod và các link Preview của Vercel
      origin: (origin, callback) => {
        const allowedOrigins = [
          "http://localhost:5173", // Local Frontend
          process.env.FRONTEND_URL, // Prod Frontend (từ .env)
          process.env.ADMIN_URL, // Admin (nếu có)
        ];

        // Cho phép request không có origin (như Postman/Server-to-Server)
        // Hoặc origin nằm trong whitelist
        // Hoặc origin có đuôi .vercel.app (cho deploy preview)
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          origin.endsWith(".vercel.app")
        ) {
          callback(null, true);
        } else {
          console.log("🚫 Socket CORS Blocked:", origin);
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // 1. Đăng ký user
    socket.on("register_user", (userId) => {
      if (userId) {
        // Kiểm tra xem user này đã online trước đó chưa
        const isAlreadyOnline = onlineUsers.has(userId);

        // Cập nhật socket ID mới nhất (để nhắn tin riêng vẫn nhận được)
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);
        lastSeen.delete(userId);

        // CHỈ thông báo cho cả làng biết NẾU trước đó họ chưa online
        if (!isAlreadyOnline) {
          console.log(`✅ User Online: ${userId}`);
          io.emit("user_online", userId);
        } else {
          // User chỉ refresh trang hoặc đổi tab, không cần spam thông báo
          console.log(`ℹ️ User re-connected: ${userId}`);
        }
      }
    });

    // 2. Ngắt kết nối
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        lastSeen.set(socket.userId, Date.now());
        console.log(`❌ User Offline: ${socket.userId}`);
        io.emit("user_offline", {
          userId: socket.userId,
          lastSeen: lastSeen.get(socket.userId),
        });
      }
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
