// page xu li ly tat ca cac yeu cau HTTP den server
// update them xu li khi user bi khoa tai khoan hoac token het han
import axios from "axios";
import { toast } from "react-hot-toast"; 
const API_URL = import.meta.env.VITE_BASEURL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  // (Success) Nếu thành công, trả về response
  (response) => response,
  
  // (Error) Nếu có lỗi
  async (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error.message;

    // --- LOGIC CHUYỂN HƯỚNG ---
    if (status === 403) {
      // 403 = Bị khóa (hoặc không có quyền)
      
      // Kiểm tra xem đã ở trang /locked chưa (để tránh lặp vô hạn)
      if (window.location.pathname !== '/locked') {
        // Hiển thị thông báo nhanh
        toast.error(message, { id: 'auth-lock-error' });
        
        // CHUYỂN HƯỚNG sang trang Bị khóa
        window.location.href = '/locked';
      }
    } else if (status === 401) {
       // 401 = Chưa đăng nhập / Token hết hạn
       toast.error(message, { id: 'auth-token-error' });
       // Clerk sẽ tự xử lý chuyển hướng về trang Login
    }

    // Trả về lỗi để component dừng lại
    return Promise.reject(error);
  }
);

export default api;

// file api.js giống như cầu nối chính thức giữa client React và server Express.
// Mọi tương tác (login, lấy user, gửi post, upload, nhắn tin…) đều đi qua đây.
// Su dung api de thuc hien cac yeu cau HTTP den server voi baseURL da duoc cau hinh