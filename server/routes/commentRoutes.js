import express from "express";
import { protect } from "../middlewares/auth.js";
import { upload } from "../configs/multer.js";
import { addComment, getComments, likeComment, deleteComment } from "../controllers/commentController.js";

const commentRouter = express.Router();

commentRouter.post("/add", protect, upload.array('images'), addComment);
commentRouter.get("/:postId", protect, getComments);
commentRouter.post("/like", protect, likeComment);
commentRouter.delete("/:id", protect, deleteComment);

export default commentRouter;