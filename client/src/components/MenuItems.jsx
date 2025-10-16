import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { NavLink, useLocation } from "react-router-dom";
import { menuItemsData } from "../assets/assets";
import api from "../api/axios";
import { useAuth } from "@clerk/clerk-react";
import socket from "../app/socket";

const MenuItems = ({ setSidebarOpen }) => {
  const currentUser = useSelector((state) => state.user.value);
  const userId = currentUser?._id;
  const { getToken } = useAuth();
  const location = useLocation();

  const [hasUnread, setHasUnread] = useState(false);

  // 🔌 Kết nối socket khi user đăng nhập
  useEffect(() => {
    if (!userId) return;

    socket.connect();
    socket.emit("register_user", userId);

    socket.on("new_notification", (data) => {
      if (data.receiver === userId) setHasUnread(true);
    });

    return () => socket.off("new_notification");
  }, [userId]);

  // 🔔 Kiểm tra xem có thông báo chưa đọc không
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = await getToken();
        const { data } = await api.get("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) {
          const unread = data.notifications.some((n) => !n.isRead);
          setHasUnread(unread);
        }
      } catch (err) {
        console.error("Lỗi lấy thông báo:", err);
      }
    };
    fetchUnread();
  }, [getToken]);

  // 🔕 Vào trang /notifications thì đánh dấu đã đọc
  useEffect(() => {
    const markAllAsRead = async () => {
      if (location.pathname === "/notifications") {
        try {
          const token = await getToken();
          await api.patch(
            "/api/notifications/read-all",
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setHasUnread(false);
        } catch (err) {
          console.error("Lỗi khi mark all as read:", err);
        }
      }
    };
    markAllAsRead();
  }, [location.pathname, getToken]);

  return (
    <div className="px-6 text-gray-600 space-y-1 font-medium relative">
      {menuItemsData.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `relative px-3.5 py-3 flex items-center gap-3 rounded-xl transition-all duration-200 ${
              isActive
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "hover:bg-gray-50"
            }`
          }
        >
          <Icon className="w-5 h-5" />
          {label}
          {to === "/notifications" && hasUnread && (
            <span className="absolute top-2 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </NavLink>
      ))}
    </div>
  );
};

export default MenuItems;