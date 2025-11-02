import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss";
import morgan from "morgan";
import http from "http";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { Server } from "socket.io";
import { clerkMiddleware } from "@clerk/express";

import { initSocket } from "./utils/socket.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import userRouter from "./routes/userRoutes.js";
import postRouter from "./routes/postRoutes.js";
import storyRouter from "./routes/storyRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import commentRouter from "./routes/commentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRouter from "./routes/reportRoutes.js";

const app = express();
const server = http.createServer(app);

initSocket(server);

// Logging
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// ===== Security Middlewares =====
app.disable("x-powered-by"); // ẩn thông tin Express
app.use(helmet()); // thêm HTTP security headers
app.use(hpp()); // chống HTTP parameter pollution
app.use(express.json({ limit: "10kb" })); // giới hạn body tránh DoS

app.use((req, res, next) => {
  const clean = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) clean(obj[key]);
      else if (typeof obj[key] === "string") obj[key] = xss(obj[key]);
      if (key.startsWith("$")) delete obj[key]; // chống NoSQL injection
    }
  };
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
});

// CORS
app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);
// ===== End Security Middlewares =====

// Database connection
await connectDB();

// Clerk middleware
app.use(clerkMiddleware());

// API routes
app.get("/", (_, res) => res.send("Server OK ✅"));
app.use("/api/user", userRouter);
app.use("/api/post", postRouter);
app.use("/api/story", storyRouter);
app.use("/api/message", messageRouter);
app.use("/api/comment", commentRouter);
app.use("/api/notifications", notificationRoutes);
app.use("/api/report", reportRouter);

// Error handler (đặt cuối)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));

// Đây là entry point của backend.
// Nó kết nối DB, cấu hình middleware, mount router, và start server.
// Mọi request từ client → đi vào đây trước tiên → rồi được phân nhánh tới router thích hợp.
// file server.js sẽ lắng nghe các yêu cầu từ client

// install: clerk, express, mongoose, cors, dotenv, multer, imagekit, inngest, nodemailer
// brevo, vercel, 