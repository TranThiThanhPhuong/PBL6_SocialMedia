import React, { useState, useEffect } from "react";
import { Search, MessageSquare, MoreHorizontal } from "lucide-react";
import { useNavigate, Routes, Route, useParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { formatPostTime } from "../app/formatDate";
import api from "../api/axios";
import toast from "react-hot-toast";
import ChatBox from "./ChatBox";

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRecentMessages = async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const { data } = await api.get("/api/user/recent-messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const grouped = data.messages.reduce((acc, m) => {
          const sender = m.from_user_id._id;
          if (!acc[sender] || new Date(m.createdAt) > new Date(acc[sender].createdAt))
            acc[sender] = m;
          return acc;
        }, {});
        const sorted = Object.values(grouped).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setMessages(sorted);
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentMessages();
  }, [user]);

  const filtered = messages.filter((msg) => {
    const from = msg.from_user_id;
    return (
      from.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      from.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex w-full h-screen bg-gray-100">
      {/* Danh sách bên trái - Improved */}
      <div className="w-full md:w-96 flex flex-col bg-white border-r border-gray-200 shadow-sm">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Tin nhắn</h1>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <MoreHorizontal size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Tìm kiếm - Improved */}
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              className="w-full py-2.5 pl-11 pr-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {/* Danh sách cuộc trò chuyện - Improved */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
              <p className="text-gray-500 mt-3">Đang tải...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <MessageSquare size={60} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-center">
                {searchTerm ? "Không tìm thấy cuộc trò chuyện" : "Chưa có tin nhắn nào"}
              </p>
            </div>
          ) : (
            <div className="px-2">
              {filtered.map((msg) => {
                const isActive = window.location.pathname.includes(msg.from_user_id._id);
                return (
                  <div
                    key={msg._id}
                    onClick={() => navigate(`/messages/${msg.from_user_id._id}`)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${isActive
                        ? "bg-indigo-50 border border-indigo-200"
                        : !msg.seen
                          ? "bg-blue-50 hover:bg-blue-100"
                          : "hover:bg-gray-50"
                      }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={msg.from_user_id.profile_picture}
                        alt={msg.from_user_id.full_name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100"
                      />
                      {!msg.seen && (
                        <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-white text-xs font-bold leading-none">1</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className={`truncate ${!msg.seen ? "font-bold text-gray-900" : "font-semibold text-gray-900"
                          }`}>
                          {msg.from_user_id.full_name}
                        </p>
                        <p className={`text-xs ml-2 flex-shrink-0 ${!msg.seen ? "text-gray-700 font-semibold" : "text-gray-500"
                          }`}>
                          {formatPostTime(msg.createdAt)}
                        </p>
                      </div>

                      <p className={`text-sm truncate ${!msg.seen ? "font-bold text-gray-900" : "font-normal text-gray-600"
                        }`}
                        style={!msg.seen ? { fontWeight: '700' } : {}}>
                        {msg.text || "📷 Đã gửi một hình ảnh"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cột phải: ChatBox - Improved */}
      <div className="flex-1 bg-white flex items-center justify-center overflow-hidden">
        <Routes>
          <Route path="/" element={
            <div className="text-center text-gray-400 p-8">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full p-8 inline-block mb-6">
                <MessageSquare size={80} className="text-indigo-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Chào mừng đến với Tin nhắn</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin với bạn bè của bạn
              </p>
            </div>
          } />
          <Route path=":userId" element={<ChatBox />} />
        </Routes>
      </div>
    </div>
  );
};

export default Messages;