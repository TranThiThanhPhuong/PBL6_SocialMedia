import express from "express";
import { protect } from "../middlewares/auth.js"
import { upload } from "../configs/multer.js"
import { getChatMessages, sendMessage, sseController } from "../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.get('/:userId', sseController); // userId la id cua nguoi nhan tin
messageRouter.post('/send', upload.single('image'), protect, sendMessage); // chi upload 1 file voi key la image
messageRouter.post('/get', protect, getChatMessages); // lay toan bo tin nhan trong cuoc tro chuyen
messageRouter.post('/seen', protect, markSeen);

export default messageRouter;