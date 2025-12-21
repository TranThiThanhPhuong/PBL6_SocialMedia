import express from "express";
import { protect } from "../middlewares/auth.js"
import { upload } from "../configs/multer.js"
import { addPost, getFeedPosts, likePosts, updatePost, deletePost, sharePost, getAllPosts, adminDeletePost} from "../controllers/postController.js";
import { adminAuth } from "../middlewares/adminAuth.js";

const postRouter = express.Router();

postRouter.post('/add', protect, upload.array('images', 4), addPost); // upload toi da 4 anh cho moi bai viet
postRouter.get('/feed', protect, getFeedPosts); 
postRouter.get('/all', adminAuth, getAllPosts);// quan li post cua admin
postRouter.post('/like', protect, likePosts);
postRouter.put('/update/:postId', protect, upload.array('images', 4), updatePost);
postRouter.delete('/delete/:postId', protect, deletePost);
postRouter.delete('/admin/:postId', adminAuth, adminDeletePost);
postRouter.post('/share/:postId', protect, sharePost);

export default postRouter;