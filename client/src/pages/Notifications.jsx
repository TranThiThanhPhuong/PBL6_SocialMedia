import React, { useState, useEffect } from "react";
import { assets, menuItemsData, dummyUserData, dummyPostsData } from "../assets/assets";
import { Link } from "react-router-dom";
import { formatPostTime } from "../app/formatDate";
import { Heart, MessageCircle, UserPlus } from "lucide-react";

// Dữ liệu thông báo giả định
const dummyNotifications = [
  {
    _id: "noti1",
    type: "like",
    user: assets.dummyUser2Data,
    post: dummyPostsData[0],
    message: "đã thích bài viết của bạn.",
    createdAt: new Date(Date.now() - 3600000), // 1 giờ trước
    read: false,
  },
  {
    _id: "noti2",
    type: "comment",
    user: assets.dummyUser3Data,
    post: dummyPostsData[1],
    message: "đã bình luận về bài viết của bạn.",
    createdAt: new Date(Date.now() - 7200000), // 2 giờ trước
    read: true,
  },
  {
    _id: "noti3",
    type: "follow",
    user: assets.dummyUser2Data,
    post: null,
    message: "đã bắt đầu theo dõi bạn.",
    createdAt: new Date(Date.now() - 10800000), // 3 giờ trước
    read: false,
  },
];

const Notifications = () => {
  const [notifications, setNotifications] = useState(dummyNotifications);

  const getIconForNotification = (type) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Thông báo</h1>
      <div className="bg-white rounded-xl shadow-lg p-4 space-y-4 max-w-2xl mx-auto">
        {notifications.length === 0 && (
          <p className="text-gray-500 text-center">Bạn không có thông báo nào.</p>
        )}
        {notifications.map((noti) => (
          <div key={noti._id} className={`flex items-start gap-4 p-3 rounded-lg ${!noti.read ? "bg-blue-50" : "hover:bg-gray-50"} transition-colors cursor-pointer`}>
            {/* User Avatar */}
            <img
              src={noti.user.profile_picture}
              alt="avatar"
              className="w-10 h-10 rounded-full"
            />
            {/* Notification Content */}
            <div className="flex-1">
              <p className="text-sm font-medium">
                <span className="font-bold">{noti.user.full_name}</span>{" "}
                {noti.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatPostTime(noti.createdAt)}
              </p>
            </div>
            {/* Icon */}
            <div className="flex-shrink-0">
              {getIconForNotification(noti.type)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;