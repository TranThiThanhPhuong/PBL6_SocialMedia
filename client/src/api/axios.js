import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_BASEURL,
});

export default api;

// file api.js giống như cầu nối chính thức giữa client React và server Express.
// Mọi tương tác (login, lấy user, gửi post, upload, nhắn tin…) đều đi qua đây.
// Su dung api de thuc hien cac yeu cau HTTP den server voi baseURL da duoc cau hinh