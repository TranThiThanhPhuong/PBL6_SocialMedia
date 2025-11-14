import mongoose from "mongoose";

const reportUserSchema = new mongoose.Schema({
  reporter: { type: String, ref: "User", required: true },
  reported: { type: String, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
}, {timestamps: true, minimize: false});

const ReportUser = mongoose.model("ReportUser", reportUserSchema);

export default ReportUser;