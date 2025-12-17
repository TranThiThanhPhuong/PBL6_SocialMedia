// userSchema định nghĩa cấu trúc của tài liệu người dùng trong MongoDB
// Nó bao gồm các trường như _id, email, full_name, username, bio, profile_picture, cover_photo, location, followers, following và connections
// Mỗi trường có kiểu dữ liệu và một số trường có ràng buộc như required hoặc unique
// Tạo mô hình User từ userSchema
// Mô hình này sẽ được sử dụng để tương tác với bộ sưu tập người dùng trong MongoDB

import mongoose from "mongoose";
import bcrypt from "bcrypt";

// Định nghĩa schema User
const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Clerk userId sẽ được dùng làm _id trong MongoDB
    email: { type: String, required: true },
    password: { type: String, required: true },// them pass de tu xac thuc nguoi dung 
    full_name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true }, // thêm sparse để tránh lỗi unique khi null
    bio: { type: String, default: "I will succeed" },
    profile_picture: { type: String, default: "" },
    cover_photo: { type: String, default: "" },
    location: { type: String, default: "" },
    followers: [{ type: String, ref: "User" }],
    following: [{ type: String, ref: "User" }],
    connections: [{ type: String, ref: "User" }],
    blockedUsers: [{ type: String, ref: "User" }],
    pendingConversations: [{ type: String, ref: "User" }],
    isAdmin: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'locked'], default: 'active' },
  },
  { timestamps: true, minimize: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual('locked').get(function () {
  return this.status === 'locked';
});

// Middleware Mongoose: Hashing mật khẩu trước khi lưu (Pre-save hook)
userSchema.pre("save", async function (next) {
  // Chỉ hash nếu trường 'password' bị thay đổi
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Phương thức so sánh mật khẩu
userSchema.methods.matchPassword = async function (enteredPassword) {
  // So sánh mật khẩu đầu vào với mật khẩu đã hash trong DB
  return await bcrypt.compare(enteredPassword, this.password);
};

// Tạo text index cho tìm kiếm toàn văn
userSchema.index({
  username: "text",
  full_name: "text",
  email: "text",
  location: "text",
});
// Tạo model User
const User = mongoose.model("User", userSchema);

export default User;