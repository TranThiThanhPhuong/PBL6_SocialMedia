import { io } from "socket.io-client";

// Lấy URL gốc, loại bỏ "/api" nếu lỡ tay điền vào env
let rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
let SOCKET_URL = rawUrl.replace("/api", "").replace(/\/$/, ""); 

console.log("🌍 Socket connecting to:", SOCKET_URL);

const socket = io(SOCKET_URL, {
  autoConnect: false, 
  transports: ["websocket"], // ✅ Rất tốt: Ép dùng websocket để đỡ lag trên Render
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 3000,
  withCredentials: true, // ✅ Cần thiết nếu bạn dùng cookie/session
  path: "/socket.io/",   // Mặc định là cái này, nhưng khai báo rõ cho chắc
});

export default socket;