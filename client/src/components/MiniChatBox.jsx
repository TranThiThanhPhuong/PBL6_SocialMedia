import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import {
  ImageIcon,
  SendHorizontal,
  X,
  MoreVertical,
  Maximize2,
  Loader2,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { slugifyUser } from "../app/slugifyUser";
import {
  fetchMessages,
  resetMessages,
} from "../features/messages/messagesSlice";
import ChatOptionsMenu from "../components/dropdownmenu/ChatOptionsMenu";
import socket from "../sockethandler/socket";

const MiniChatBox = ({ targetUser, onClose }) => {
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userId = targetUser?._id;

  const currentUser = useSelector((state) => state.user.value);
  const currentUserId = currentUser?._id;

  const reduxMessages = useSelector((state) => state.messages.messages);
  const [messages, setMessages] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const fetchUserMsgs = async () => {
      try {
        const token = await getToken();
        dispatch(fetchMessages({ token, userId }));
      } catch (error) {
        console.error(error);
      }
    };
    fetchUserMsgs();
    return () => dispatch(resetMessages());
  }, [userId, dispatch, getToken]);

  useEffect(() => {
    setMessages(reduxMessages);
  }, [reduxMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      const senderId = msg.from_user_id?._id || msg.from_user_id;
      if (senderId === userId) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("receive_message", handleReceiveMessage);
    return () => socket.off("receive_message", handleReceiveMessage);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        const token = await getToken();
        const res = await api.get(`/api/message/last-seen/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsOnline(res.data.online);
        setLastSeen(res.data.lastSeen);
      } catch (err) {
        console.error("Lỗi check online:", err);
      }
    })();

    const handleUserOnline = (id) => {
      if (id === userId) {
        setIsOnline(true);
        setLastSeen(null);
      }
    };

    const handleUserOffline = (data) => {
      if (data.userId === userId) {
        setIsOnline(false);
        setLastSeen(data.lastSeen);
      }
    };

    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);

    return () => {
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
    };
  }, [userId, getToken]);

  const sendMessage = async () => {
    try {
      if ((!text && !image) || isSending) return;
      setIsSending(true);
      
      const token = await getToken();
      const formData = new FormData();
      formData.append("to_user_id", userId);
      if (text) formData.append("text", text);
      if (image) formData.append("image", image);

      const { data } = await api.post("/api/message/send", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setText("");
        setImage(null);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return "vài ngày trước";
  };

  const handleOpenFullChat = () => {
    navigate(`/messages/${slugifyUser(targetUser)}`, {
      state: { userId: targetUser._id }, 
    });
    onClose(); 
  };

  return (
    <div className="fixed bottom-0 right-16 bg-white shadow-2xl rounded-t-xl border border-gray-200 z-50 flex flex-col h-[450px] w-80 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-indigo-600 text-white rounded-t-xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative">
            <img
              src={targetUser.profile_picture}
              alt=""
              className="w-9 h-9 rounded-full border border-white"
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-indigo-600 rounded-full"></span>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm truncate max-w-[140px]">
              {targetUser.full_name}
            </p>
            <p className="text-[10px] text-indigo-100">
              {isOnline ? "Đang hoạt động" : `Hoạt động ${formatLastSeen(lastSeen)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
            <button
            onClick={handleOpenFullChat}
            className="p-1 hover:bg-indigo-500 rounded-full"
            title="Mở trong trang tin nhắn"
          >
            <Maximize2 size={18} />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-indigo-500 rounded-full"
            title="Tùy chọn"
          >
            <MoreVertical size={18} />
          </button>
          
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500 rounded-full ml-1"
            title="Đóng chat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {showMenu && (
        <div className="absolute top-12 right-2 z-50">
          <ChatOptionsMenu
            userId={userId}
            onClose={() => setShowMenu(false)}
            getToken={getToken}
            dispatch={dispatch}
          />
        </div>
      )}

      {/* Body Chat */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50 no-scrollbar">
        <div className="space-y-2">
          {messages.map((msg, i) => {
            const senderId = msg.from_user_id?._id || msg.from_user_id;
            const isMe = senderId === currentUserId;

            // --- 👇 START: LOGIC TÍNH TOÁN THỜI GIAN ---
            const currentTime = new Date(msg.createdAt);
            const prevTime = i > 0 ? new Date(messages[i - 1].createdAt) : null;
            
            // Hiện ngăn cách nếu là tin đầu tiên HOẶC cách nhau > 10 phút
            const showTimeSeparator =
              !prevTime || (currentTime - prevTime) / (1000 * 60) > 10;

            const formattedTime = currentTime.toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              // year: "numeric", // Bỏ year cho gọn trong mini chat, tùy bạn
            });
            // --- 👆 END: LOGIC TÍNH TOÁN THỜI GIAN ---

            return (
              <React.Fragment key={i}>
                {/* 👇 Hiển thị ngăn cách thời gian */}
                {showTimeSeparator && (
                  <div className="text-center my-3">
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shadow-sm">
                      {formattedTime}
                    </span>
                  </div>
                )}

                {/* Bong bóng tin nhắn */}
                <div
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-lg text-sm break-words ${
                      isMe
                        ? "bg-indigo-500 text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    {msg.message_type === "image" && (
                      <img
                        src={msg.media_url}
                        className="rounded-md mb-1 max-h-32 object-cover"
                        alt="sent"
                      />
                    )}
                    {msg.text && <p>{msg.text}</p>}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef}></div>
        </div>
      </div>

      {/* Image Preview */}
      {image && (
        <div className="px-3 py-1 bg-gray-100 border-t flex justify-between items-center">
          <span className="text-xs text-gray-500 truncate max-w-[150px]">
            {image.name}
          </span>
          <button onClick={() => setImage(null)}>
            <X size={14} className="text-red-500" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
          <label
            htmlFor="mini-chat-img"
            className="cursor-pointer text-gray-500 hover:text-indigo-600"
          >
            <ImageIcon size={18} />
            <input
              type="file"
              id="mini-chat-img"
              hidden
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              disabled={isSending}
            />
          </label>
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-800"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isSending && sendMessage()} 
            disabled={isSending}
          />
          <button
            onClick={sendMessage}
            disabled={(!text && !image) || isSending}
            className="text-indigo-600 hover:text-indigo-700 disabled:text-gray-400"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniChatBox;