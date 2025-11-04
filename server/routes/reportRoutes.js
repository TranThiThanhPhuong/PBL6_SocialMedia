import express from "express";
import { protect } from "../middlewares/auth.js";
import { reportPost, getAllReports, reportStory } from "../controllers/reportController.js";

const reportRouter = express.Router();

reportRouter.post("/post", protect, reportPost);
reportRouter.post("/story", protect, reportStory);
reportRouter.get("/get", protect, getAllReports);

export default reportRouter;