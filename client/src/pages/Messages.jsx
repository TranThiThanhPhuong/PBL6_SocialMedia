import React, { useState, useEffect } from "react";
import {
  Search,
  MessageSquare,
  MoreHorizontal,
  Inbox,
  UserPlus,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { formatPostTime } from "../app/formatDate";
import { slugifyUser } from "../app/slugifyUser";
import { removeVietnameseTones } from "../app/formatTViet";
import api from "../api/axios";
import ChatBox from "./ChatBox";
import socket from "../sockethandler/socket";

const DEFAULT_AVATAR = "https://via.placeholder.com/150?text=User";

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { getToken } = useAuth();

  const [activeTab, setActiveTab] = useState("inbox");
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
        otherUser = m.to_user_id;
        otherUserId = receiverId;
      } else {
        otherUser = m.from_user_id;
        otherUserId = senderId;
      }

      if (!otherUserId || !otherUser) return acc;

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

  useEffect(() => {
    if (location.state?.forceTab) {
      setActiveTab(location.state.forceTab);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getToken();
      const endpoint =
        activeTab === "inbox" ? "/api/message/inbox" : "/api/message/pending";

      const { data } = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const sorted = processConversations(data.messages, user.id);
        setConversations(sorted);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error(err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user, activeTab]);

  useEffect(() => {
    if (!user) return;

    const handleReceiveMessage = (newMessage) => {
      const senderId = newMessage.from_user_id?._id || newMessage.from_user_id;
      const isMe = senderId === user.id;
      const isMsgPending = newMessage.isPending === true;

      setConversations((prev) => {
        if (isMe) {
          if (activeTab === "pending") {
            const targetId =
              newMessage.to_user_id?._id || newMessage.to_user_id;
            return prev.filter((c) => {
              const otherId = c.otherUser?._id || c.otherUser;
              return otherId !== targetId;
            });
          }

          if (activeTab === "inbox") {
            const updatedList = [newMessage, ...prev];
            return processConversations(updatedList, user.id);
          }
        } else {
          if (
            (activeTab === "inbox" && !isMsgPending) ||
            (activeTab === "pending" && isMsgPending)
          ) {
            const updatedList = [newMessage, ...prev];
            return processConversations(updatedList, user.id);
          }
        }

        return prev;
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    return () => socket.off("receive_message", handleReceiveMessage);
  }, [user, activeTab]);

  useEffect(() => {
    if (location.state?.deletedUserId) {
      const deletedId = location.state.deletedUserId;

      setConversations((prev) => {
        return prev.filter((conv) => {
          const otherId = conv.otherUser?._id || conv.otherUser;
          return otherId !== deletedId;
        });
      });
    }
    if (location.state?.forceTab) {
      setActiveTab(location.state.forceTab);
    }
  }, [location.state]);

  const filtered = conversations.filter((msg) => {
    const u = msg.otherUser;
    const name = u?.locked ? "Người dùng" : u?.full_name || "";
    const username = u?.locked ? "" : u?.username || "";
    const cleanSearchTerm = removeVietnameseTones(searchTerm);
    const cleanName = removeVietnameseTones(name);
    const cleanUsername = removeVietnameseTones(username);
    return (
      cleanName.includes(cleanSearchTerm) ||
      cleanUsername.includes(cleanSearchTerm)
    );
  });

  const selectedUserId = location.state?.userId;

  const NoChatSelected = () => {
    if (activeTab === "pending") {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck size={48} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Tin nhắn đang chờ
          </h2>
          <p className="text-gray-500 max-w-md">
            Đây là tin nhắn từ những người bạn chưa kết nối. <br />
            Họ sẽ không biết bạn đã xem tin nhắn cho đến khi bạn trả lời.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="relative mb-6">
          <img
            src={user?.imageUrl || DEFAULT_AVATAR}
            alt="Me"
            className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
          />
          <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-2 border-white"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Xin chào, {user?.firstName || "bạn"}! 👋
        </h2>
        <p className="text-gray-500 max-w-md mb-8">
          Chọn một cuộc hội thoại từ danh sách bên trái hoặc tìm kiếm bạn bè để
          bắt đầu trò chuyện.
        </p>

        <button
          onClick={() => document.querySelector('input[type="text"]')?.focus()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
        >
          <Send size={18} />
          Tìm người để nhắn tin
        </button>
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-96 flex flex-col bg-white border-r border-gray-200 shadow-sm h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === "inbox" ? "Đoạn chat" : "Tin nhắn chờ"}
          </h1>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <MoreHorizontal size={20} className="text-gray-600" />
          </button>
        </div>

        {/* --- TAB SWITCHER (MỚI) --- */}
        <div className="px-4 mt-2">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === "inbox"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Inbox size={16} /> Hộp thư
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === "pending"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserPlus size={16} /> Tin nhắn chờ
            </button>
          </div>

          {/* Note cho tin nhắn chờ */}
          {activeTab === "pending" && (
            <p className="text-xs text-gray-500 mt-2 px-1 text-center">
              Tin nhắn từ người lạ. Họ sẽ không biết bạn đã xem cho đến khi bạn
              trả lời.
            </p>
          )}
        </div>

        {/* Search Input */}
        <div className="p-4 shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full py-2.5 pl-11 pr-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-gray-400 text-center">
              <MessageSquare size={40} className="mb-2 opacity-50" />
              <p className="font-medium">
                {activeTab === "inbox"
                  ? "Chưa có tin nhắn nào"
                  : "Không có tin nhắn chờ"}
              </p>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {filtered.map((msg) => {
                const u = msg.otherUser;
                const senderId = msg.from_user_id?._id || msg.from_user_id;
                const isMe = senderId === user.id;
                // Nếu đang ở pending tab thì không cần hiện dot xanh (vì mặc định chưa đọc), nhưng logic cũ vẫn ok
                const isUnread = !isMe && !msg.seen;
                const isLocked = u?.locked || u?.status === "locked";

                const displayName = isLocked
                  ? "Người dùng"
                  : u?.full_name || "Người dùng";
                const displayAvatar = isLocked
                  ? DEFAULT_AVATAR
                  : u?.profile_picture || DEFAULT_AVATAR;

                const isActive =
                  location.pathname.includes(u?._id) ||
                  location.pathname.includes(slugifyUser(u));
                return (
                  <div
                    key={msg._id}
                    onClick={() => {
                      if (u?._id) {
                        const slug = isLocked ? "locked-user" : slugifyUser(u);
                        navigate(`/messages/${slug}`, {
                          state: {
                            userId: u._id,
                            isPending: activeTab === "pending",
                          },
                        });
                      }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${
                      isActive
                        ? "bg-indigo-50 border border-indigo-200"
                        : "hover:bg-gray-50"
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
                        <p
                          className={`truncate text-gray-900 ${
                            isUnread ? "font-bold" : "font-semibold"
                          }`}
                        >
                          {displayName}
                        </p>
                        <p
                          className={`text-xs ${
                            isUnread
                              ? "text-indigo-600 font-bold"
                              : "text-gray-500"
                          }`}
                        >
                          {formatPostTime(msg.createdAt)}
                        </p>
                      </div>

                      <p
                        className={`text-sm truncate pr-2 ${
                          isUnread ? "text-gray-900 font-bold" : "text-gray-600"
                        }`}
                      >
                        {isMe && "Bạn: "}
                        {msg.message_type === "image"
                          ? "📷 Đã gửi một hình ảnh"
                          : msg.text}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="w-3 h-3 bg-indigo-600 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white flex items-center justify-center overflow-hidden h-full relative">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234f46e5' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>

        {selectedUserId ? <ChatBox /> : <NoChatSelected />}
      </div>
    </div>
  );
};

export default Messages;
