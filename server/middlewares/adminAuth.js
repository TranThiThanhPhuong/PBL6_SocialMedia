// server/middlewares/adminAuth.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const adminAuth = async (req, res, next) => {
  let token;

  // Kiểm tra header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Lấy token từ header (Bearer <token>)
      token = req.headers.authorization.split(" ")[1];
      
      // 1. Giải mã token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 2. Kiểm tra quyền Admin trong payload của token
      if (!decoded.isAdmin) {
          return res.status(403).json({ success: false, message: "Truy cập bị từ chối. Chỉ Admin mới được phép." });
      }

      // 3. Tìm user trong DB để xác nhận tài khoản còn hoạt động
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ success: false, message: "Tài khoản Admin không tồn tại hoặc đã bị vô hiệu hóa." });
      }

      // 4. Nếu hợp lệ, cho phép request đi tiếp
      next();
      
    } catch (error) {
      console.error("❌ Lỗi xác thực JWT/Admin:", error);
      return res.status(401).json({ success: false, message: "Token không hợp lệ hoặc hết hạn." });
    }
  } 
  
  // Nếu không có token
  if (!token) {
    return res.status(401).json({ success: false, message: "Không có token xác thực. Vui lòng đăng nhập Admin." });
  }
};