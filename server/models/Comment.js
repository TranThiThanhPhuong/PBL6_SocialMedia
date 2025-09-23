import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  user: { type: String, ref: "User", required: true }, 
  content: { type: String, required: true, trim: true },
  likes: [{ type: String, ref: "User" }],
  image_urls: [{ type: String }],
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // null => top-level
  reply_count: { type: Number, default: 0 },
}, { timestamps: true });

commentSchema.index({ post: 1, parentComment: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;