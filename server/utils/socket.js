import { Server } from "socket.io";
import Message from "../models/Message.js";

const onlineUsers = new Map(); // userId -> socket.id

export default function socketConnection(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // Đăng ký user
    socket.on("register_user", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log("✅ Registered:", userId);
    });

    // Gửi tin nhắn
    socket.on("send_message", async (data) => {
      const { from_user_id, to_user_id, text, media_url, message_type } = data;
      const message = await Message.create({ from_user_id, to_user_id, text, media_url, message_type });

      io.to(onlineUsers.get(to_user_id)).emit("receive_message", message);
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      console.log("🔴 User disconnected:", socket.id);
    });
  });
}