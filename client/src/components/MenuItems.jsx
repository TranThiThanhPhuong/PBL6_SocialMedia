import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { NavLink, useLocation } from "react-router-dom";
import { menuItemsData } from "../assets/assets";
import api from "../api/axios";
import { useAuth } from "@clerk/clerk-react";
import socket from "../sockethandler/socket";

const MenuItems = ({ setSidebarOpen }) => {
  // Lấy currentUser từ Redux để có _id chính xác (giống ChatBox)
  const currentUser = useSelector((state) => state.user.value);
  const userId = currentUser?._id;
  
  const { getToken } = useAuth();
  const location = useLocation();
  const [hasUnread, setHasUnread] = useState(false);

  // 1. Logic Socket: Tự đảm bảo đăng ký user và lắng nghe (Mô hình giống ChatBox)
  useEffect(() => {
    if (!userId) return;

    // Đảm bảo socket kết nối nếu chưa
    if (!socket.connected) {
      socket.connect();
    }
    
    // Đăng ký user (Backup an toàn)
    socket.emit("register_user", userId);

    const handleNewNotification = (data) => {
      console.log("🔔 MenuItems received:", data);
      // Chỉ hiện chấm đỏ nếu KHÔNG ở trang notifications
      if (location.pathname !== "/notifications") {
        setHasUnread(true);
      }
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [userId, location.pathname]); // Re-run khi userId có hoặc đổi trang để cập nhật listener

  // 2. Fetch trạng thái ban đầu
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = await getToken();
        if (!token) return; 
        
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
    
    if (userId) {
        fetchUnread();
    }
  }, [getToken, userId]);

  // 3. Mark read khi vào trang
  useEffect(() => {
    const markAllAsRead = async () => {
      if (location.pathname === "/notifications") {
        try {
          const token = await getToken();
          if (!token) return;

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
          <div className="relative flex items-center justify-center">
            <Icon className="w-6 h-6" />
            {to === "/notifications" && hasUnread && (
              <span className="absolute top-0 right-0 block w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4"></span>
            )}
          </div>
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  );
};

export default MenuItems;