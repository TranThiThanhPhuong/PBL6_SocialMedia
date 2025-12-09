import { io } from "socket.io-client";

let SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
if (SOCKET_URL.endsWith("/")) {
  SOCKET_URL = SOCKET_URL.slice(0, -1);
}

console.log("🌍 Socket connecting to:", SOCKET_URL);

const socket = io(SOCKET_URL, {
  autoConnect: false, 
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 3000,
  withCredentials: true,
});

export default socket;