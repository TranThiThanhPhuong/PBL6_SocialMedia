import express from "express";
import { protect } from "../middlewares/auth.js"
import { upload } from "../configs/multer.js"
import { addUserStory, getStories } from "../controllers/storyController.js";

const storyRouter = express.Router();

storyRouter.post('/create', upload.single('media', protect, addUserStory)); // chi upload 1 file media cho moi story
storyRouter.get('/get', protect, getStories); 

export default storyRouter;