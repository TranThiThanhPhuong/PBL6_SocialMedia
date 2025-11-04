import express from "express";
import { protect } from "../middlewares/auth.js"
import { upload } from "../configs/multer.js"
import { addUserStory, getStories, deleteStoryManual } from "../controllers/storyController.js";

const storyRouter = express.Router();

storyRouter.post('/create', protect, upload.array('images'), addUserStory); // chi upload 1 file media cho moi story
storyRouter.get('/get', protect, getStories); 
storyRouter.delete("/delete/:storyId", protect, deleteStoryManual);

export default storyRouter;