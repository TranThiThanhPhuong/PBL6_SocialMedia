import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { formatPostTime } from "../app/formatDate";
import { useAuth, useUser } from "@clerk/clerk-react";
import socket from "../sockethandler/socket";

const RecentMessages = ({ onUserSelect }) => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Lưu ID các user đang online
  const { user } = useUser();
  const { getToken } = useAuth();

  // Hàm kiểm tra status ban đầu cho danh sách tin nhắn
  const checkInitialOnlineStatus = async (msgs) => {
     const uniqueUserIds = [...new Set(msgs.map(m => m.from_user_id._id))];
     // Vì backend bạn là check từng người, ta sẽ loop (số lượng ít nên không sao)
     // Hoặc nếu backend có api check bulk (check nhiều user 1 lúc) thì tốt hơn.
     // Ở đây mình giả lập check từng user cho đồng bộ với ChatBox
     try {
        const token = await getToken();
        const onlineSet = new Set(onlineUsers);
        
        await Promise.all(uniqueUserIds.map(async (id) => {
            try {
                const res = await api.get(`/api/message/last-seen/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.online) onlineSet.add(id);
            } catch (e) { /* ignore error */ }
        }));
        setOnlineUsers(onlineSet);
     } catch (err) {
         console.error(err);
     }
  };

  const fetchRecentMessages = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/api/user/recent-messages", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const groupedMessages = data.messages.reduce((acc, message) => {
          const senderId = message.from_user_id._id;
          if (
            !acc[senderId] ||
            new Date(message.createdAt) > new Date(acc[senderId].createdAt)
          ) {
            acc[senderId] = message;
          }
          return acc;
        }, {});

        const sortedMessages = Object.values(groupedMessages)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);

        setMessages(sortedMessages);
        
        // Sau khi lấy tin nhắn xong, check online status ngay
        checkInitialOnlineStatus(sortedMessages);
      }
    } catch (error) {
      console.error("Lỗi lấy tin nhắn gần đây", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecentMessages();
      // Polling tin nhắn mới mỗi 15s (để cập nhật last message)
      const interval = setInterval(fetchRecentMessages, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Lắng nghe Socket để cập nhật chấm xanh Realtime
  useEffect(() => {
      const handleUserOnline = (id) => {
          setOnlineUsers(prev => new Set(prev).add(id));
      };
      
      const handleUserOffline = (data) => {
          setOnlineUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userId);
              return newSet;
          });
      };

      socket.on("user_online", handleUserOnline);
      socket.on("user_offline", handleUserOffline);

      return () => {
          socket.off("user_online", handleUserOnline);
          socket.off("user_offline", handleUserOffline);
      };
  }, []);

  const truncateText = (text, length = 25) => {
    if (!text) return "";
    return text.length > length ? text.slice(0, length) + "..." : text;
  };

  return (
    <div className="bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md shadow text-xs text-slate-800">
      <h3 className="font-semibold text-slate-800 mb-4">Tin nhắn gần đây</h3>
      <div className="flex flex-col max-h-56 overflow-y-scroll no-scrollbar">
        {messages.length > 0 ? (
          messages.map((message, index) => {
            const senderId = message.from_user_id._id;
            const isOnline = onlineUsers.has(senderId);

            return (
              <div
                key={index}
                onClick={() => onUserSelect(message.from_user_id)}
                className="flex items-start gap-2 py-2 px-1 hover:bg-slate-100 rounded-lg transition cursor-pointer relative group"
              >
                {/* Avatar Wrapper */}
                <div className="relative flex-shrink-0">
                    <img
                    src={message.from_user_id.profile_picture}
                    alt={message.from_user_id.full_name}
                    className="w-9 h-9 rounded-full object-cover"
                    />
                    {/* 👇 CHẤM XANH ONLINE */}
                    {isOnline && (
                        <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                    )}
                </div>

                <div className="w-full min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium truncate text-sm">
                      {message.from_user_id.full_name}
                    </p>
                    <p className="text-[10px] text-slate-400 flex-shrink-0">
                      {formatPostTime(message.createdAt)}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-gray-500 truncate text-[12px] max-w-[130px]">
                      {truncateText(message.text || "📷 Đã gửi một hình ảnh", 22)}
                    </p>
                    {!message.seen && (
                      <p className="bg-indigo-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[10px]">
                        1
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-center text-xs py-2">
            Chưa có tin nhắn nào
          </p>
        )}
      </div>
    </div>
  );
};

export default RecentMessages;