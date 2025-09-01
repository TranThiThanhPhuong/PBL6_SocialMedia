import express from "express";
import { protect } from "../middlewares/auth.js"
import { upload } from "../configs/multer.js"
import { addPost, getFeedPosts, likePosts,  } from "../controllers/postController.js";

const postRouter = express.Router();

postRouter.post('/add', upload.array('images', 4), protect, addPost); // upload toi da 4 anh cho moi bai viet
postRouter.get('/feed', protect, getFeedPosts); 
postRouter.post('/like', protect, likePosts);

export default postRouter;