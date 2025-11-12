import { clerkClient } from "@clerk/clerk-sdk-node";
import { config } from "dotenv";
import User from "../models/User.js";
config();

export const protect = async (req, res, next) => { 
  try {
    const authObject = req.auth();
    if (!authObject || !authObject.userId) {
      return res.status(401).json({ success: false, message: "Không được phép (Chưa đăng nhập)." });
    }
    
    const { userId } = authObject;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản người dùng trong DB." });
    }

    if (user.status === 'locked') {
      return res.status(403).json({ 
        success: false, 
        message: "Tài khoản của bạn đã bị quản trị viên khóa." 
      });
    }

    req.user = user;       
    req.userId = userId;   
    
    next(); 

  } catch (error) {
    console.error("Lỗi xác thực (protect):", error);
    return res.status(401).json({ success: false, message: "Yêu cầu không hợp lệ hoặc Token hết hạn." });
  }
};

// file auth.js sẽ kiểm tra xem người dùng đã đăng nhập hay chưa
// nếu chưa đăng nhập thì trả về lỗi 401 (Unauthorized)
// nếu đã đăng nhập thì gọi next() để tiếp tục xử lý yêu cầu