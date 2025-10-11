// import React, { useState, useEffect } from "react";
// import { Search, MessageSquare } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import { useSelector } from "react-redux";
// import { formatPostTime } from "../app/formatDate"; // Giả sử bạn có hàm này
// import api from "../api/axios"; // Giả sử bạn có file axios
// import { useAuth, useUser } from "@clerk/clerk-react";
// import toast from "react-hot-toast";

// const Messages = () => {
//   const navigate = useNavigate();
//   const { user } = useUser();
//   const { getToken } = useAuth();
  
//   const [messages, setMessages] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [loading, setLoading] = useState(true);

//   // Lấy tin nhắn gần đây từ API
//   const fetchRecentMessages = async () => {
//     if (!user) return;
//     try {
//       const token = await getToken();
//       const { data } = await api.get('/api/user/recent-messages', { headers: { Authorization: `Bearer ${token}` }});
//       if (data.success) {
//         const groupedMessages = data.messages.reduce((acc, message) => {
//           const senderId = message.from_user_id._id;
//           if (!acc[senderId] || new Date(message.createdAt) > new Date(acc[senderId].createdAt)) {
//             acc[senderId] = message;
//           }
//           return acc;
//         }, {});
//         const sortedMessages = Object.values(groupedMessages).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//         setMessages(sortedMessages);
//       } else {
//         toast.error(data.message);
//       }
//     } catch (error) {
//       toast.error(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchRecentMessages();
//   }, [user, getToken]);

//   const filteredMessages = messages.filter((msg) => {
//     const fromUser = msg.from_user_id;
//     return (
//       fromUser.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       fromUser.username.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//   });

//   return (
//     <div className="flex w-full min-h-screen bg-slate-50">
//       {/* Cột trái: Danh sách cuộc trò chuyện */}
//       <div className="w-full md:w-1/3 flex flex-col p-4 bg-white border-r border-gray-200">
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-2xl font-bold text-slate-900">Tin nhắn</h1>
//           <button className="p-2 rounded-full hover:bg-gray-100 transition">
//             <MessageSquare size={20} className="text-gray-600" />
//           </button>
//         </div>

//         {/* Thanh tìm kiếm */}
//         <div className="relative mb-4">
//           <input
//             type="text"
//             placeholder="Tìm kiếm tin nhắn..."
//             className="w-full py-2 pl-10 pr-4 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//         </div>

//         {/* Danh sách cuộc trò chuyện */}
//         <div className="flex-1 overflow-y-auto no-scrollbar">
//           {loading ? (
//             <p className="text-center text-gray-500 mt-8">Đang tải tin nhắn...</p>
//           ) : filteredMessages.length === 0 ? (
//             <p className="text-center text-gray-500 mt-8">Không có cuộc trò chuyện nào.</p>
//           ) : (
//             filteredMessages.map((msg) => (
//               <div
//                 key={msg._id}
//                 onClick={() => navigate(`/messages/${msg.from_user_id._id}`)}
//                 className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer ${
//                   !msg.seen ? "bg-blue-50" : ""
//                 }`}
//               >
//                 <img
//                   src={msg.from_user_id.profile_picture}
//                   alt={msg.from_user_id.full_name}
//                   className="size-14 rounded-full object-cover"
//                 />
//                 <div className="flex-1">
//                   <div className="flex justify-between items-center">
//                     <p className={`font-semibold ${!msg.seen ? "text-blue-600" : "text-gray-800"}`}>
//                       {msg.from_user_id.full_name}
//                     </p>
//                     <p className="text-xs text-gray-500">
//                       {formatPostTime(msg.createdAt)}
//                     </p>
//                   </div>
//                   <p className={`text-sm mt-1 truncate ${!msg.seen ? "font-bold text-gray-800" : "text-gray-600"}`}>
//                     {msg.text ? msg.text : "Đã gửi một hình ảnh"}
//                   </p>
//                 </div>
//                 {!msg.seen && (
//                   <div className="size-2 bg-blue-500 rounded-full"></div>
//                 )}
//               </div>
//             ))
//           )}
//         </div>
//       </div>

//       {/* Cột phải: Khu vực chatbox (mặc định) */}
//       <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 p-4">
//         <div className="text-center">
//           <MessageSquare size={80} className="mx-auto mb-4" />
//           <h2 className="text-xl font-semibold">Chọn một cuộc trò chuyện</h2>
//           <p className="text-sm mt-2">Để bắt đầu trò chuyện, hãy chọn một người từ danh sách bên trái.</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Messages;



import React, { useState, useEffect } from "react";
import { Search, MessageSquare, MoreHorizontal } from "lucide-react";
import { useNavigate, Routes, Route, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatPostTime } from "../app/formatDate";
import api from "../api/axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";

// Giả sử bạn có component ChatBox.jsx
import ChatBox from "./ChatBox";

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Lấy tin nhắn gần đây từ API
  const fetchRecentMessages = async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const { data } = await api.get('/api/user/recent-messages', { headers: { Authorization: `Bearer ${token}` }});
      if (data.success) {
        const groupedMessages = data.messages.reduce((acc, message) => {
          const senderId = message.from_user_id._id;
          if (!acc[senderId] || new Date(message.createdAt) > new Date(acc[senderId].createdAt)) {
            acc[senderId] = message;
          }
          return acc;
        }, {});
        const sortedMessages = Object.values(groupedMessages).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setMessages(sortedMessages);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentMessages();
  }, [user, getToken]);

  const filteredMessages = messages.filter((msg) => {
    const fromUser = msg.from_user_id;
    return (
      fromUser.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fromUser.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex w-full min-h-screen bg-slate-50">
      {/* Cột trái: Danh sách cuộc trò chuyện */}
      <div className="w-full md:w-1/3 flex flex-col p-4 bg-white border-r border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Tin nhắn</h1>
          <button className="p-2 rounded-full hover:bg-gray-100 transition">
            <MoreHorizontal size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="w-full py-2 pl-10 pr-4 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>

        {/* Danh sách cuộc trò chuyện */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <p className="text-center text-gray-500 mt-8">Đang tải tin nhắn...</p>
          ) : filteredMessages.length === 0 ? (
            <p className="text-center text-gray-500 mt-8">Không có cuộc trò chuyện nào.</p>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg._id}
                onClick={() => navigate(`/messages/${msg.from_user_id._id}`)}
                className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer ${
                  !msg.seen ? "bg-blue-50" : ""
                }`}
              >
                <img
                  src={msg.from_user_id.profile_picture}
                  alt={msg.from_user_id.full_name}
                  className="size-14 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className={`font-semibold ${!msg.seen ? "text-blue-600" : "text-gray-800"}`}>
                      {msg.from_user_id.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPostTime(msg.createdAt)}
                    </p>
                  </div>
                  <p className={`text-sm mt-1 truncate ${!msg.seen ? "font-bold text-gray-800" : "text-gray-600"}`}>
                    {msg.text ? msg.text : "Đã gửi một hình ảnh"}
                  </p>
                </div>
                {!msg.seen && (
                  <div className="size-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cột phải: Khu vực chatbox */}
      <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 p-4">
        {/* Render ChatBox.jsx ở đây khi có user ID trên URL */}
        <Routes>
          <Route path="/:userId" element={<ChatBox />} />
          <Route path="/" element={
            <div className="text-center">
              <MessageSquare size={80} className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold">Chọn một cuộc trò chuyện</h2>
              <p className="text-sm mt-2">Để bắt đầu trò chuyện, hãy chọn một người từ danh sách bên trái.</p>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
};

export default Messages;