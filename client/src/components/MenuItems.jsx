import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { NavLink, useLocation } from "react-router-dom";
import { menuItemsData } from "../assets/assets";
import api from "../api/axios";
import { useAuth } from "@clerk/clerk-react";
import socket from "../sockethandler/socket";

const MenuItems = ({ setSidebarOpen }) => {
  const currentUser = useSelector((state) => state.user.value);
  const userId = currentUser?._id;
  const { getToken } = useAuth();
  const location = useLocation();

  const [hasUnreadNoti, setHasUnreadNoti] = useState(false);
  const [hasUnreadMsg, setHasUnreadMsg] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("register_user", userId);
    const handleNewNotification = (data) => {
      console.log("🔔 MenuItems received:", data);
      if (location.pathname !== "/notifications") {
        setHasUnreadNoti(true);
      }
    };

    const handleNewMessage = (data) => {
      const senderId = data.from_user_id?._id || data.from_user_id;
      if (senderId === userId) return;
      if (!location.pathname.startsWith("/messages")) {
        console.log("💬 MenuItems received Msg");
        setHasUnreadMsg(true);
      }
    };

    socket.on("new_notification", handleNewNotification);
    socket.on("receive_message", handleNewMessage);
    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("receive_message", handleNewMessage);
    };
  }, [userId, location.pathname]);

  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        // Fetch Notifications
        const notiRes = await api.get("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (notiRes.data.success) {
          const unread = notiRes.data.notifications.some((n) => !n.isRead);
          setHasUnreadNoti(unread);
        }

        // --- MỚI: Fetch Messages để xem có tin chưa đọc không ---
        // Ta dùng API lấy tin nhắn gần đây để check
        const msgRes = await api.get("/api/user/recent-messages", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (msgRes.data.success) {
          // Kiểm tra xem có bất kỳ tin nhắn nào mà mình (userId) chưa xem (seen = false) và người gửi khác mình
          const hasUnread = msgRes.data.messages.some((m) => {
            const senderId = m.from_user_id._id || m.from_user_id;
            return !m.seen && senderId !== userId;
          });
          setHasUnreadMsg(hasUnread);
        }
      } catch (err) {
        console.error("Lỗi lấy trạng thái unread:", err);
      }
    };

    if (userId) {
      fetchInitialStatus();
    }
  }, [getToken, userId]);

  useEffect(() => {
    const handlePageVisit = async () => {
      const token = await getToken();
      if (!token) return;

      if (location.pathname === "/notifications") {
        try {
          await api.patch(
            "/api/notifications/read-all",
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setHasUnreadNoti(false);
        } catch (err) {
          console.error("Lỗi mark notifications read:", err);
        }
      }

      if (location.pathname.startsWith("/messages")) {
        setHasUnreadMsg(false);
      }
    };

    handlePageVisit();
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
            {to === "/notifications" && hasUnreadNoti && (
              <span className="absolute top-0 right-0 block w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4"></span>
            )}
            {to === "/messages" && hasUnreadMsg && (
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
