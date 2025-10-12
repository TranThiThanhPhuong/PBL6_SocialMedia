import React, { useState, useEffect } from "react";
import { formatPostTime } from "../app/formatDate";
import {
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  AlertTriangle,
  Reply,
  Handshake,
} from "lucide-react";
import api from "../api/axios"; // 👈 đường dẫn axios instance của bạn

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🧠 Gọi API lấy danh sách thông báo
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications"); // 👈 endpoint backend của bạn
        if (res.data.success) {
          setNotifications(res.data.notifications);
        }
      } catch (error) {
        console.error("Lỗi khi tải thông báo:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // 🎨 Icon cho từng loại thông báo
  const getIconForNotification = (type) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "reply":
        return <Reply className="w-5 h-5 text-indigo-500" />;
      case "follow":
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case "friend_request":
        return <Handshake className="w-5 h-5 text-orange-500" />;
      case "report":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <UserPlus className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        Đang tải thông báo...
      </div>
    );

  return (
    <div className="flex-1 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Thông báo</h1>

      <div className="bg-white rounded-xl shadow-lg p-4 space-y-4 max-w-2xl mx-auto">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center">Bạn chưa có thông báo nào.</p>
        ) : (
          notifications.map((noti) => (
            <div
              key={noti._id}
              className={`flex items-start gap-4 p-3 rounded-lg transition-colors cursor-pointer ${
                !noti.read ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              {/* Avatar */}
              <img
                src={noti.user?.profile_picture || "/default-avatar.png"}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
              />

              {/* Nội dung */}
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold">
                    {noti.user?.full_name || "Người dùng"}
                  </span>{" "}
                  {noti.message}
                </p>

                {noti.post && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                    “{noti.post?.content}”
                  </p>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  {formatPostTime(noti.createdAt)}
                </p>
              </div>

              {/* Icon */}
              <div>{getIconForNotification(noti.type)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;