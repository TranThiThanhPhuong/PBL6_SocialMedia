import express from "express";
import { protect } from "../middlewares/auth.js"
import { upload } from "../configs/multer.js"
import { getChatMessages, sendMessage, getSocket, markSeen, deleteChat, getInboxMessages, getPendingMessages , toggleConversationStatus } from "../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.post('/send', upload.single('image'), protect, sendMessage); // chi upload 1 file voi key la image
messageRouter.post('/get', protect, getChatMessages); // lay toan bo tin nhan trong cuoc tro chuyen
messageRouter.get('/inbox', protect, getInboxMessages)
messageRouter.post('/seen', protect, markSeen);
messageRouter.get('/last-seen/:userId', protect , getSocket);
messageRouter.post("/delete-chat", protect, deleteChat);
messageRouter.get('/pending', protect, getPendingMessages); // API lấy tin nhắn chờ
messageRouter.post('/toggle-status', protect, toggleConversationStatus); // API chuyển đổi

export default messageRouter;