import React, { useState, useEffect } from "react";
import { Search, MessageSquare, MoreHorizontal } from "lucide-react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import api from "../api/axios";
import ChatBox from "./ChatBox";

import MessageMenu from "../components/messages/MessageMenu";
import RecentMessages from "../components/messages/RecentMessages";
import PendingMessages from "../components/messages/PendingMessages";
import GroupMessages from "../components/messages/GroupMessages";
import SavedMessages from "../components/messages/SavedMessages";
import { slugifyUser } from "../app/slugifyUser";

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { getToken } = useAuth();

  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [showMenu, setShowMenu] = useState(false);
  const [viewMode, setViewMode] = useState("recent");

  // 👉 user đang được mở bên ChatBox (sẽ cập nhật từ ChatBox)
  const [currentChatUser, setCurrentChatUser] = useState(null);

  const fetchRecentMessages = async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const { data } = await api.get("/api/user/recent-messages", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const grouped = data.messages.reduce((acc, m) => {
          const senderId = m.from_user_id._id;
          const otherUser =
            senderId === user.id ? m.to_user_id : m.from_user_id;

          if (
            !acc[otherUser._id] ||
            new Date(m.createdAt) > new Date(acc[otherUser._id].createdAt)
          ) {
            acc[otherUser._id] = { ...m, otherUser };
          }
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
    const from = msg.otherUser;
    return (
      from.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      from.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // 👉 Xử lý chọn item trong menu
  const handleMenuSelect = (mode) => {
    // Tin nhắn hiện tại
    if (mode === "current") {
      if (currentChatUser) {
        navigate(`/messages/${slugifyUser(currentChatUser)}`, {
          state: { userId: currentChatUser._id },
        });
      }
      setShowMenu(false);
      return;
    }

    // Các chế độ view khác
    setViewMode(mode);
    setShowMenu(false);
  };

  return (
    <div className="flex w-full h-screen bg-gray-100">
      {/* LEFT COLUMN */}
      <div className="w-full md:w-96 flex flex-col bg-white border-r border-gray-200 shadow-sm relative">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 relative">
          <h1 className="text-2xl font-bold text-gray-900">Tin nhắn</h1>

          <div className="relative">
            <button
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setShowMenu((prev) => !prev)}
            >
              <MoreHorizontal size={20} className="text-gray-600" />
            </button>

            {showMenu && (
              <MessageMenu
                onSelect={handleMenuSelect}
                currentChatUser={currentChatUser}
              />
            )}
          </div>
        </div>

        {/* SEARCH */}
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              className="w-full py-2.5 pl-11 pr-4 rounded-xl border border-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>
        </div>

        {/* DYNAMIC CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === "recent" && (
            <RecentMessages
              loading={loading}
              filtered={filtered}
              navigate={navigate}
              searchTerm={searchTerm}
            />
          )}

          {viewMode === "pending" && <PendingMessages />}
          {viewMode === "groups" && <GroupMessages />}
          {viewMode === "saved" && <SavedMessages />}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex-1 bg-white flex items-center justify-center overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={
              <div className="text-center text-gray-400 p-8">
                <MessageSquare
                  size={80}
                  className="mx-auto text-indigo-300 mb-4"
                />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Chào mừng đến với Tin nhắn
                </h2>
                <p>Chọn 1 cuộc trò chuyện để bắt đầu</p>
              </div>
            }
          />
          <Route
            path=":userId"
            element={
              <ChatBox setCurrentChatUser={setCurrentChatUser} />
            }
          />
        </Routes>
      </div>
    </div>
  );
};

export default Messages;