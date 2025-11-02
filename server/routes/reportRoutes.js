import express from "express";
import { protect } from "../middlewares/auth.js";
import { reportPost, getAllReports } from "../controllers/reportController.js";

const reportRouter = express.Router();

reportRouter.post("/", protect, reportPost);
reportRouter.get("/", protect, getAllReports);

export default reportRouter;