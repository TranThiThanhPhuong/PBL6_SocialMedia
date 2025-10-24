import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000"; // hoặc URL server thật

// Khởi tạo một kết nối duy nhất
const socket = io(SOCKET_URL, {
  autoConnect: false, // chỉ connect khi cần
  transports: ["websocket"], // tối ưu
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;