// userSchema định nghĩa cấu trúc của tài liệu người dùng trong MongoDB
// Nó bao gồm các trường như _id, email, full_name, username, bio, profile_picture, cover_photo, location, followers, following và connections
// Mỗi trường có kiểu dữ liệu và một số trường có ràng buộc như required hoặc unique
// Tạo mô hình User từ userSchema
// Mô hình này sẽ được sử dụng để tương tác với bộ sưu tập người dùng trong MongoDB

import mongoose from 'mongoose';

// Định nghĩa schema User
const userSchema = new mongoose.Schema({
    _id: {  // Clerk userId sẽ được dùng làm _id trong MongoDB
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,    
    },
    full_name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        unique: true,
    },
    bio: {
        type: String,
        default: 'I will succeed',
    },
    profile_picture: {
        type: String,
        default: '',
    },
    cover_photo: {
        type: String,
        default: '',
    },
    location: {
        type: String,
        default: '',
    },
    followers: [{
        type: String,
        ref: 'User',
    }],
    following: [{
        type: String,
        ref: 'User',
    }], 
    connections: [{
        type: String,
        ref: 'User',
    }]
}, {timestamps: true, minimize: false});

// Tạo model User
const User = mongoose.model('User', userSchema);

export default User;

