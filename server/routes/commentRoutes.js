import express from "express";
import { protect } from "../middlewares/auth.js";
import { upload } from "../configs/multer.js";
import { addComment, getComments, likeComment, editComment, deleteComment } from "../controllers/commentController.js";

const commentRouter = express.Router();

commentRouter.post("/add", protect, upload.single('image'), addComment);
commentRouter.post("/get", protect, getComments);
commentRouter.post("/like", protect, likeComment);
commentRouter.put("/:id", protect, editComment);
commentRouter.delete("/:id", protect, deleteComment);

export default commentRouter;