import express from "express";
import { protect } from "../middlewares/auth.js";
import { reportPost, getAllReports, reportStory, updateReport } from "../controllers/reportController.js";
import {adminAuth} from "../middlewares/adminAuth.js";

const reportRouter = express.Router();

reportRouter.post("/post", protect, reportPost);
reportRouter.post("/story", protect, reportStory);
reportRouter.get("/all", adminAuth, getAllReports);
reportRouter.put("/:id", adminAuth, updateReport);

export default reportRouter;