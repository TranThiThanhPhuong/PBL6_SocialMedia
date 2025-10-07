import mongoose from "mongoose";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import dotenv from "dotenv";

dotenv.config();

// 1. Kết nối MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/yourdbname";
await mongoose.connect(MONGO_URI);
console.log("✅ Đã kết nối MongoDB");

// 2. Lấy danh sách tất cả bài viết
const posts = await Post.find({});
console.log(`Tổng số bài viết: ${posts.length}`);

let updated = 0;

// 3. Với mỗi post → đếm tất cả comment + reply
for (const post of posts) {
  const totalComments = await Comment.countDocuments({ post: post._id });
  await Post.findByIdAndUpdate(post._id, { comments_count: totalComments });
  updated++;
  console.log(`Đã cập nhật post ${post._id}: ${totalComments} bình luận`);
}

console.log(`🎉 Hoàn tất cập nhật ${updated} bài viết`);
await mongoose.disconnect();