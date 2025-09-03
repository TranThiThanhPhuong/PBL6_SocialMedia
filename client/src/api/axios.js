import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_BASEURL,
});

export default api;

// Su dung api de thuc hien cac yeu cau HTTP den server voi baseURL da duoc cau hinh