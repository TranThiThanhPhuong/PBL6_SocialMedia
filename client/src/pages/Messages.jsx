import React, { useState, useEffect } from "react";
import { Search, MessageSquare, MoreHorizontal } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { formatPostTime } from "../app/formatDate";
import { slugifyUser } from "../app/slugifyUser";
import api from "../api/axios";
import ChatBox from "./ChatBox";
import socket from "../sockethandler/socket";

const DEFAULT_AVATAR = "https://via.placeholder.com/150?text=User";

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const processConversations = (rawMessages, currentUserId) => {
    const grouped = rawMessages.reduce((acc, m) => {
      const senderId = m.from_user_id?._id || m.from_user_id;
      const receiverId = m.to_user_id?._id || m.to_user_id;

      let otherUser;
      let otherUserId;

      if (senderId === currentUserId) {
        otherUser = m.to_user_id; // Mình là người gửi -> Người kia là nhận
        otherUserId = receiverId;
      } else {
        otherUser = m.from_user_id; // Mình là người nhận -> Người kia là gửi
        otherUserId = senderId;
      }

      // Bỏ qua nếu dữ liệu lỗi
      if (!otherUserId || !otherUser) return acc;

      // Logic: Luôn giữ tin nhắn mới nhất cho mỗi User ID
      if (
        !acc[otherUserId] ||
        new Date(m.createdAt) > new Date(acc[otherUserId].createdAt)
      ) {
        acc[otherUserId] = { ...m, otherUser };
      }
      return acc;
    }, {});

    return Object.values(grouped).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  };

  const fetchRecentMessages = async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const { data } = await api.get("/api/message/recent-messages2", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const sorted = processConversations(data.messages, user.id);
        setConversations(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentMessages();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handleReceiveMessage = (newMessage) => {
      setConversations((prev) => {
        const updatedList = [newMessage, ...prev];
        return processConversations(updatedList, user.id);
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    return () => socket.off("receive_message", handleReceiveMessage);
  }, [user]);

useEffect(() => {
    if (!user) return;
    const handleReceiveMessage = (newMessage) => {
      setConversations((prev) => {
        const updatedList = [newMessage, ...prev];
        return processConversations(updatedList, user.id);
      });
    };
    socket.on("receive_message", handleReceiveMessage);
    return () => socket.off("receive_message", handleReceiveMessage);
  }, [user]);

  const filtered = conversations.filter((msg) => {
    const u = msg.otherUser;
    const name = u?.locked ? "Người dùng" : (u?.full_name || "");
    const username = u?.locked ? "" : (u?.username || "");
    
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex w-full h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-96 flex flex-col bg-white border-r border-gray-200 shadow-sm h-full">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Tin nhắn</h1>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <MoreHorizontal size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="p-4 shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full py-2.5 pl-11 pr-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-gray-400">
              <MessageSquare size={40} className="mb-2" />
              <p>Không có tin nhắn</p>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {filtered.map((msg) => {
                const u = msg.otherUser;
                const senderId = msg.from_user_id?._id || msg.from_user_id;
                const isMe = senderId === user.id;
                const isUnread = !isMe && !msg.seen;

                const isLocked = u?.locked || u?.status === 'locked';

                // 2. Tên hiển thị
                // Nếu Locked -> "Người dùng"
                // Nếu Block (dù ai block ai) -> Vẫn hiện tên thật (u.full_name) do code không can thiệp
                const displayName = isLocked ? "Người dùng" : (u?.full_name || "Người dùng");

                // 3. Avatar hiển thị
                // Nếu Locked -> Default Avatar
                // Nếu Block -> Vẫn hiện Avatar thật
                const displayAvatar = isLocked ? DEFAULT_AVATAR : (u?.profile_picture || DEFAULT_AVATAR);

                // Highlight item đang chọn
                const isActive = location.pathname.includes(u?._id) || location.pathname.includes(slugifyUser(u));

                return (
                  <div
                    key={msg._id}
                    onClick={() => {
                        if(u?._id) {
                            const slug = isLocked ? 'locked-user' : slugifyUser(u);
                            navigate(`/messages/${slug}`, { state: { userId: u._id } });
                        }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${
                      isActive ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img 
                        src={displayAvatar} 
                        alt={displayName} 
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className={`truncate text-gray-900 ${isUnread ? "font-bold" : "font-semibold"}`}>
                          {displayName}
                        </p>
                        <p className={`text-xs ${isUnread ? "text-indigo-600 font-bold" : "text-gray-500"}`}>
                          {formatPostTime(msg.createdAt)}
                        </p>
                      </div>
                      
                      <p className={`text-sm truncate pr-2 ${isUnread ? "text-gray-900 font-bold" : "text-gray-600"}`}>
                        {isMe && "Bạn: "}
                        {msg.message_type === "image" ? "📷 Đã gửi một hình ảnh" : msg.text}
                      </p>
                    </div>
                    {isUnread && <span className="w-3 h-3 bg-indigo-600 rounded-full flex-shrink-0"></span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white flex items-center justify-center overflow-hidden h-full">
        <ChatBox />
      </div>
    </div>
  );
};

export default Messages;