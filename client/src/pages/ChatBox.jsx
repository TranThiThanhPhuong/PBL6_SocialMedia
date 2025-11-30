import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import {
  ImageIcon,
  SendHorizontal,
  X,
  Phone,
  Video,
  MoreVertical,
  Loader2, // Icon xoay khi đang gửi
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";
import {
  fetchMessages,
  resetMessages,
} from "../features/messages/messagesSlice";
import ChatOptionsMenu from "../components/dropdownmenu/ChatOptionsMenu";
import socket from "../sockethandler/socket";

const ChatBox = () => {
  const location = useLocation();
  const realUserId = location.state?.userId;
  // Giả sử bạn có logic lấy slug nếu refresh trang, tạm thời dùng realUserId
  const userId = realUserId; 
  
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const currentUser = useSelector((state) => state.user.value);
  const currentUserId = currentUser?._id;

  const reduxMessages = useSelector((state) => state.messages.messages);
  const [messages, setMessages] = useState([]);
  const [showMenu, setShowMenu] = useState(false);

  // Lấy danh sách bạn bè/kết nối để tìm user info (tránh gọi API thừa)
  const connections = useSelector((state) => state.connections.connections);
  const following = useSelector((state) => state.connections.following);
  const followers = useSelector((state) => state.connections.followers);

  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false); // State chặn spam nút gửi
  const messagesEndRef = useRef(null);

  // 1. Fetch tin nhắn từ Redux (Sử dụng đúng hàm fetchMessages bạn cung cấp)
  useEffect(() => {
    const fetchUserMsgs = async () => {
      if (!userId) return;
      try {
        const token = await getToken();
        // Redux fetchMessages nhận { token, userId }
        dispatch(fetchMessages({ token, userId }));
      } catch (error) {
        toast.error("Lỗi tải tin nhắn");
      }
    };
    fetchUserMsgs();
    return () => {
        dispatch(resetMessages());
    };
  }, [userId, dispatch, getToken]);

  // 2. Tìm thông tin User để hiển thị Header
  useEffect(() => {
    const u =
      connections.find((c) => c._id === userId) ||
      following.find((f) => f._id === userId) ||
      followers.find((f) => f._id === userId);
    setUser(u || null);
  }, [connections, following, followers, userId]);

  // 3. Auto Scroll xuống cuối
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Đồng bộ Redux state vào Local state
  useEffect(() => {
    if(reduxMessages) {
        setMessages(reduxMessages);
    }
  }, [reduxMessages]);

  // 5. Hàm gửi tin nhắn
  const sendMessage = async () => {
    try {
      if ((!text && !image) || isSending) return;
      setIsSending(true); // Bắt đầu gửi -> Disable nút

      const token = await getToken();
      const formData = new FormData();
      formData.append("to_user_id", userId);
      if (text) formData.append("text", text);
      if (image) formData.append("image", image);

      const { data } = await api.post("/api/message/send", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        // Thêm tin nhắn mới vào danh sách ngay lập tức
        setMessages((prev) => [...prev, data.message]);
        setText("");
        setImage(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSending(false); // Kết thúc gửi -> Enable nút
    }
  };

  // 6. Check Online Status & Socket Online
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
      } catch (err) { console.error(err); }
    })();

    const handleUserOnline = (id) => { if (id === userId) { setIsOnline(true); setLastSeen(null); } };
    const handleUserOffline = (data) => { if (data.userId === userId) { setIsOnline(false); setLastSeen(data.lastSeen); } };

    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    return () => { socket.off("user_online"); socket.off("user_offline"); };
  }, [userId, getToken]);

  // 7. Register Socket User (để server biết mình là ai)
  useEffect(() => {
    if (!currentUserId) return;
    socket.emit("register_user", currentUserId);
    // Không emit disconnect ở đây vì user có thể chuyển tab chat khác
  }, [currentUserId]);

  // 8. Nhận tin nhắn Socket
  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      // 👇 SỬA LỖI QUAN TRỌNG: Chỉ nhận tin nhắn TỪ NGƯỜI KIA gửi tới mình
      // Tin mình gửi đi (từ tab này) đã được hàm sendMessage xử lý rồi.
      // Cần check kỹ senderId (vì có thể là object hoặc string)
      const senderId = msg.from_user_id?._id || msg.from_user_id;
      
      if (senderId === userId) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("receive_message", handleReceiveMessage);
    return () => socket.off("receive_message", handleReceiveMessage);
  }, [userId]);

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

  if (!user)
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Chọn một người để nhắn tin
      </div>
    );

  return (
    <div className="flex flex-col h-full w-full bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={user.profile_picture} alt="" className="w-11 h-11 rounded-full ring-2 ring-indigo-100" />
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-gray-400"}`}></div>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.full_name}</p>
            {isOnline ? (
              <p className="text-sm text-green-500">Đang hoạt động</p>
            ) : (
              <p className="text-xs text-gray-500">Hoạt động {formatLastSeen(lastSeen)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-full hover:bg-indigo-50 text-indigo-600 transition-colors" title="Gọi thoại"><Phone size={20} /></button>
          <button className="p-2.5 rounded-full hover:bg-indigo-50 text-indigo-600 transition-colors" title="Gọi video"><Video size={20} /></button>
          <button className="p-2.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" onClick={() => setShowMenu((prev) => !prev)}><MoreVertical size={20} /></button>
          {showMenu && (
            <ChatOptionsMenu userId={user._id} onClose={() => setShowMenu(false)} getToken={getToken} dispatch={dispatch} />
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3 max-w-4xl mx-auto">
          {messages
            .toSorted((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((msg, i) => {
              // 👇 LOGIC QUAN TRỌNG: Xác định ai là người gửi (Để chỉnh màu xanh/trắng)
              // Cần lấy ID chuẩn (dù backend trả về object user hay string ID)
              const senderId = msg.from_user_id?._id || msg.from_user_id;
              const isMe = senderId === currentUserId; // So sánh string với string
              const isReceived = !isMe;

              // Các biến phụ trợ hiển thị
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const prevSenderId = prevMsg ? (prevMsg.from_user_id?._id || prevMsg.from_user_id) : null;
              const isDifferentSender = !prevMsg || prevSenderId !== senderId;
              const currentTime = new Date(msg.createdAt);
              const prevTime = i > 0 ? new Date(messages[i - 1].createdAt) : null;
              const showTimeSeparator = !prevTime || (currentTime - prevTime) / (1000 * 60) > 10;
              const showAvatar = (isDifferentSender || showTimeSeparator) && isReceived;

              const formattedTime = currentTime.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

              return (
                <React.Fragment key={i}>
                  {showTimeSeparator && (
                    <div className="text-center my-4">
                      <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full shadow-sm">{formattedTime}</span>
                    </div>
                  )}

                  <div className={`flex gap-2 ${isReceived ? "justify-start" : "justify-end"}`}>
                    {isReceived && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <img src={user.profile_picture} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8"></div>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isReceived ? "items-start" : "items-end"}`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl max-w-md transition-all hover:shadow-md ${
                          isReceived
                            ? "bg-white text-gray-800 shadow-sm border border-gray-200" // Tin nhận: Trắng
                            : "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md" // Tin gửi: Tím/Xanh
                        }`}
                      >
                        {msg.message_type === "image" && (
                          <img src={msg.media_url} className="max-w-xs rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity" alt="Shared" />
                        )}
                        {msg.text && (
                          <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
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
        <div className="px-6 pb-2">
          <div className="relative inline-block">
            <img src={URL.createObjectURL(image)} alt="Preview" className="h-20 rounded-lg border-2 border-indigo-200" />
            <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-3xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
            <label htmlFor="image" className="flex-shrink-0 cursor-pointer">
              <ImageIcon className="text-gray-500 hover:text-indigo-600 transition-colors" size={22} />
              <input type="file" id="image" hidden accept="image/*" onChange={(e) => setImage(e.target.files[0])} disabled={isSending} />
            </label>

            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isSending && sendMessage()}
              disabled={isSending}
            />

            <button
              onClick={sendMessage}
              disabled={(!text && !image) || isSending}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white p-2.5 rounded-full transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Nhấn Enter để gửi</p>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;