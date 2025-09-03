import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema({
    from_user_id: { type: String, ref: 'User', required: true }, // id nguoi gui
    to_user_id: { type: String, ref: 'User', required: true }, // id nguoi nhan
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' } // trang thai ket ban

}, { timestamps: true }) // tự động thêm trường createdAt và updatedAt

const Connection = mongoose.model('Connection', connectionSchema); // tạo model Connection từ schema connectionSchema

export default Connection; // xuất model Connection để sử dụng ở các file khác