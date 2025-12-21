import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { formatPostTime } from "../app/formatDate";
import { useAuth, useUser } from "@clerk/clerk-react";
import socket from "../sockethandler/socket";

const RecentMessages = ({ onUserSelect }) => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const { user } = useUser();
  const { getToken } = useAuth();

  // 1. Hàm Check Online (Giữ nguyên)
  const checkInitialOnlineStatus = async (msgs) => {
    if (!msgs || msgs.length === 0) return;
    const uniqueUserIds = [...new Set(msgs.map((m) => m.from_user_id._id))];
    try {
      const token = await getToken();
      const onlineSet = new Set(onlineUsers);
      await Promise.all(
        uniqueUserIds.map(async (id) => {
          try {
            const res = await api.get(`/api/message/last-seen/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.online) onlineSet.add(id);
          } catch (e) {}
        })
      );
      setOnlineUsers(onlineSet);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Hàm gọi API lấy tin nhắn (Sử dụng useCallback để tránh tạo lại hàm không cần thiết)
  const fetchRecentMessages = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getToken();
      // API này của bạn đã sửa để chỉ trả về tin nhắn CHƯA ĐỌC
      const { data } = await api.get("/api/user/recent-messages", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        // Group tin nhắn để lấy tin mới nhất của mỗi người
        const groupedMessages = data.messages.reduce((acc, message) => {
          const senderId = message.from_user_id._id;
          if (!acc[senderId]) {
            acc[senderId] = message;
          }
          return acc;
        }, {});

        const sortedMessages = Object.values(groupedMessages)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);

        setMessages(sortedMessages);
        checkInitialOnlineStatus(sortedMessages);
      }
    } catch (error) {
      console.error("Lỗi lấy tin nhắn gần đây", error);
    }
  }, [user, getToken]); // Dependencies của hàm này

  // 3. EFFECT 1: Gọi API MỘT LẦN DUY NHẤT khi component load
  useEffect(() => {
    fetchRecentMessages();
    // Tuyệt đối KHÔNG dùng setInterval ở đây
  }, [fetchRecentMessages]);

  // 4. EFFECT 2: Lắng nghe Socket để gọi lại API khi CẦN THIẾT
  useEffect(() => {
    // Xử lý Online/Offline
    const handleUserOnline = (id) => setOnlineUsers((prev) => new Set(prev).add(id));
    const handleUserOffline = (data) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    // --- TRỌNG TÂM: CHỈ GỌI API KHI CÓ TIN NHẮN TỚI ---
    const handleReceiveMessage = (newMessage) => {
      // Kiểm tra: Tin nhắn này có gửi cho mình không?
      const toId = newMessage.to_user_id?._id || newMessage.to_user_id;
      
      // Nếu tin nhắn gửi đến User hiện tại (user.id)
      if (toId === user?.id) {
          console.log("🔔 Có tin nhắn mới, gọi API cập nhật list...");
          fetchRecentMessages(); // <--- GỌI LẠI API Ở ĐÂY
      }
    };

    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [fetchRecentMessages, user]); // Dependency bao gồm fetchRecentMessages

  // 5. Xử lý Click: Xóa ngay khỏi giao diện (Optimistic UI)
  const handleUserClick = (targetUser) => {
      onUserSelect(targetUser);
      // Xóa ngay người này khỏi list hiển thị vì coi như đã đọc
      setMessages(prev => prev.filter(m => m.from_user_id._id !== targetUser._id));
  }

  const truncateText = (text, length = 25) => {
    if (!text) return "";
    return text.length > length ? text.slice(0, length) + "..." : text;
  };

  // Nếu không có tin nhắn chưa đọc, ẩn component
  if (messages.length === 0) {
      return null; 
  }

  return (
    <div className="bg-white max-w-xs mt-4 p-4 rounded-md shadow text-xs text-slate-800 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-800">Tin nhắn mới</h3>
          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {messages.length}
          </span>
      </div>
      
      <div className="flex flex-col max-h-56 overflow-y-scroll no-scrollbar">
        {messages.map((message, index) => {
            const senderId = message.from_user_id._id;
            const isOnline = onlineUsers.has(senderId);

            return (
              <div
                key={index}
                onClick={() => handleUserClick(message.from_user_id)} 
                className="flex items-start gap-2 py-2 px-1 hover:bg-slate-100 rounded-lg transition cursor-pointer relative group"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={message.from_user_id.profile_picture}
                    alt={message.from_user_id.full_name}
                    className="w-9 h-9 rounded-full object-cover border border-gray-100"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>

                <div className="w-full min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-bold truncate text-sm text-slate-900">
                      {message.from_user_id.full_name}
                    </p>
                    <p className="text-[10px] text-indigo-500 font-medium flex-shrink-0">
                      {formatPostTime(message.createdAt)}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-slate-700 font-medium truncate text-[12px] max-w-[130px]">
                      {truncateText(message.text || "📷 Đã gửi một hình ảnh", 22)}
                    </p>
                    <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full flex-shrink-0 ml-1 shadow-sm"></span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default RecentMessages;