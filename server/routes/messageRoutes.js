import express from "express";
import { protect } from "../middlewares/auth.js"
import { upload } from "../configs/multer.js"
import { getChatMessages, sendMessage, getSocket, markSeen, deleteChat, moveToPending, getPendingMessages} from "../controllers/messageController.js";

const messageRouter = express.Router();

// messageRouter.get('/:userId', sseController); // userId la id cua nguoi nhan tin
messageRouter.post('/send', upload.single('image'), protect, sendMessage); // chi upload 1 file voi key la image
messageRouter.post('/get', protect, getChatMessages); // lay toan bo tin nhan trong cuoc tro chuyen
messageRouter.post('/seen', protect, markSeen);
messageRouter.get('/last-seen/:userId', protect , getSocket);
messageRouter.post("/delete-chat", protect, deleteChat);
messageRouter.post("/move-to-pending", protect, moveToPending);
messageRouter.get("/pending", protect, getPendingMessages);

export default messageRouter;