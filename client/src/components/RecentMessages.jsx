import React, { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { formatPostTime } from "../app/formatDate";
import { useAuth, useUser } from "@clerk/clerk-react";
import { slugifyUser } from "../app/slugifyUser";

const RecentMessages = () => {
  const [messages, setMessages] = useState([]);
  const { user } = useUser();
  const { getToken } = useAuth();

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
          .slice(0, 2);

        setMessages(sortedMessages);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecentMessages();
      const interval = setInterval(fetchRecentMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const truncateText = (text, length = 25) => {
    if (!text) return "";
    return text.length > length ? text.slice(0, length) + "..." : text;
  };

  return (
    <div className="bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md shadow text-xs text-slate-800">
      <h3 className="font-semibold text-slate-800 mb-4">Tin nhắn gần đây</h3>
      <div className="flex flex-col max-h-56 overflow-y-scroll no-scrollbar">
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <Link
              to={`/messages/${slugifyUser(message.from_user_id)}`}
              state={{ userId: message.from_user_id._id }}
              key={index}
              className="flex items-start gap-2 py-2 px-1 hover:bg-slate-100 rounded-lg transition"
            >
              <img
                src={message.from_user_id.profile_picture}
                alt={message.from_user_id.full_name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="w-full min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-medium truncate">
                    {message.from_user_id.full_name}
                  </p>
                  <p className="text-[10px] text-slate-400 flex-shrink-0">
                    {formatPostTime(message.createdAt)}
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-gray-500 truncate text-[13px] max-w-[130px]">
                    {truncateText(message.text || "📷 Đã gửi một hình ảnh", 25)}
                  </p>
                  {!message.seen && (
                    <p className="bg-indigo-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[10px]">
                      1
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))
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