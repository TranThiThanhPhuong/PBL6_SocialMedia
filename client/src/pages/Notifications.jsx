import React, { useState, useEffect } from "react";
import api from "../api/axios";
import UserAvatar from "../components/dropdownmenu/UserAvatar";
import { formatPostTime } from "../app/formatDate";
import defaultAvatar from "../assets/sample_profile.jpg";
import {
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  Users,
  Share2,
  ShieldAlert,
  ThumbsUp,
  Trash2,
  Reply,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { slugifyUser } from "../app/slugifyUser";
import socket from "../sockethandler/socket";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = await getToken();
        const { data } = await api.get("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success) setNotifications(data.notifications);
      } catch (error) {
        console.error(error);
      }
    };

    fetchNotifications();
  }, [getToken]);

  useEffect(() => {
    const handleNewNotification = (newNoti) => {
      console.log("🔔 Nhận thông báo mới từ socket:", newNoti);
      setNotifications((prev) => [newNoti, ...prev]);
    };
    socket.on("new_notification", handleNewNotification);
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, []);

  const handleDeleteNotification = async (id) => {
    try {
      const token = await getToken();
      const { data } = await api.delete(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (error) {
      console.error("Lỗi khi xóa thông báo:", error);
    }
  };

  const getIconForNotification = (type) => {
    switch (type) {
      case "friend_request": return <Users className="w-5 h-5 text-indigo-500" />;
      case "friend_accept": return <UserCheck className="w-5 h-5 text-green-500" />;
      case "follow": return <UserPlus className="w-5 h-5 text-blue-500" />;
      case "like": return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case "comment": return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "reply": return <Reply className="w-5 h-5 text-orange-500" />;
      case "like_comment": return <ThumbsUp className="w-5 h-5 text-yellow-500" />;
      case "share": return <Share2 className="w-5 h-5 text-purple-500" />;
      case "report_post": return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      case "admin_delete_post": return <Trash2 className="w-5 h-5 text-gray-600" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Thông báo</h1>
      <div className="bg-white rounded-xl shadow-lg p-4 space-y-4 max-w-2xl mx-auto">
        {notifications.length === 0 && (
          <p className="text-gray-500 text-center">
            Bạn chưa có thông báo nào.
          </p>
        )}

        {notifications.map((noti) => (
          <div
            key={noti._id}
            className={`flex items-start justify-between gap-4 p-3 rounded-lg cursor-pointer transition-colors ${!noti.isRead ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
          >
            <div className="flex items-start gap-4">
              <UserAvatar user={noti.sender}>
                <img
                  onClick={(e) => {
                    e.stopPropagation();
                    if (noti.sender) navigate(`/profile-user/${slugifyUser(noti.sender)}`);
                  }}
                  src={noti.sender?.profile_picture || defaultAvatar}
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              </UserAvatar>
              <div>
                <p className="text-sm font-medium">
                  {(() => {
                    const senderName = noti.sender?.full_name || "";
                    const content = noti.content || "";
                    // Avoid duplicating sender name if backend already included it in content
                    if (senderName && content.startsWith(senderName)) {
                      return <span>{content}</span>;
                    }
                    return (
                      <>
                        <span className="font-bold">{senderName}</span>
                        {content ? ` ${content}` : null}
                      </>
                    );
                  })()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatPostTime(noti.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>{getIconForNotification(noti.type)}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNotification(noti._id);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Xóa thông báo"
              >
                ✖
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;