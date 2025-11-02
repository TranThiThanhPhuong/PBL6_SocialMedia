import express from "express";
import { protect } from "../middlewares/auth.js"
import { upload } from "../configs/multer.js"
import { addPost, getFeedPosts, likePosts, updatePost, deletePost } from "../controllers/postController.js";

const postRouter = express.Router();

postRouter.post('/add', protect, upload.array('images', 4), addPost); // upload toi da 4 anh cho moi bai viet
postRouter.get('/feed', protect, getFeedPosts); 
postRouter.post('/like', protect, likePosts);
postRouter.put('/update/:postId', protect, upload.array('images', 4), updatePost);
postRouter.delete('/delete/:postId', protect, deletePost);

export default postRouter;