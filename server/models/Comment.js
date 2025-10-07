import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  post: { type: String, ref: "Post", required: true },
  user: { type: String, ref: "User", required: true },
  image_urls: [{ type: String }],
  content: { type: String, default: "" }, 
  post_type: { type: String, enum: ['text', 'image', 'text_with_image'], required: true},
  likes_count: [{ type: String, ref: 'User' }],
  parentComment: { type: String, ref: "Comment", default: null },
  reply_count: { type: Number, default: 0 },
}, { timestamps: true });

commentSchema.index({ post: 1, parentComment: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;