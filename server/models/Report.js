import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    post: { type: String, ref: "Post", required: true },
    reporter: { type: String, ref: "User", required: true },
    reason: { type: String, required: true },
    status: { type: String,enum: ["pending", "reviewed", "dismissed"], default: "pending" },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);

export default Report;