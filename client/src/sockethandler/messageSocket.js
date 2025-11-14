import { io } from "socket.io-client";

let socket;

export const connectMessageSocket = (userId) => {
  socket = io(import.meta.env.VITE_BASEURL || "http://localhost:5000");

  socket.on("connect", () => {
    console.log("Message socket connected", socket.id);
    socket.emit("register_user", userId);
  });

  socket.on("user_online", (onlineUserId) => {
    if (onlineUserId === userId) setIsOnline(true);
  });

  socket.on("user_offline", ({ userId: offlineId, lastSeen }) => {
    if (offlineId === userId) {
      setIsOnline(false);
      setLastSeen(lastSeen);
    }
  });

  return socket;
};

export const getMessageSocket = () => socket;