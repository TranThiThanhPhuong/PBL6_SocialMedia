import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { Server } from "socket.io";
import { clerkMiddleware } from "@clerk/express";
import userRouter from "./routes/userRoutes.js";
import postRouter from "./routes/postRoutes.js";
import storyRouter from "./routes/storyRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import commentRouter from "./routes/commentRoutes.js";
import notificationRouter from "./routes/notificationRouter.js";
import http from "http";
import socketConnection from "./utils/socket.js";

const app = express();
const server = http.createServer(app);
socketConnection(server);

// 🔌 Socket.IO setup
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
const onlineUsers = new Map();

// Lắng nghe sự kiện kết nối socket
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("register_user", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`🟢 ${userId} online`);
  });

  socket.on("disconnect", () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        console.log(`🔴 ${uid} offline`);
        break;
      }
    }
  });
});

export { io, onlineUsers };

await connectDB();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// setInterval(async () => {
//   try {
//     await axios.get(`${process.env.API_HUGGING_FACE_SPACE}`);
//     console.log("🔄 Ping Hugging Face Space để giữ cho nó luôn hoạt động");
//   } catch (err) {
//     console.error("⚠️ Lỗi ping Space:", err.message);
//   }
// }, 1000 * 60 * 5); // 5 phút ping 1 lần

app.get("/", (_, res) => res.send("Server OK ✅"));
app.use("/api/user", userRouter);
app.use("/api/post", postRouter);
app.use("/api/story", storyRouter);
app.use("/api/message", messageRouter);
app.use("/api/comment", commentRouter);
app.use("/api/notifications", notificationRouter);

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))      

// Đây là entry point của backend.
// Nó kết nối DB, cấu hình middleware, mount router, và start server.
// Mọi request từ client → đi vào đây trước tiên → rồi được phân nhánh tới router thích hợp.
// file server.js sẽ lắng nghe các yêu cầu từ client

// install: clerk, express, mongoose, cors, dotenv, multer, imagekit, inngest, nodemailer
// brevo, vercel, 