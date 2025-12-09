import React, { useRef, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useDispatch, useSelector } from "react-redux"; // 👈 Import useSelector
import toast, { Toaster } from "react-hot-toast";

import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import Connections from "./pages/Connections";
import Discover from "./pages/Discover";
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import Layout from "./pages/Layout";
import Notifications from "./pages/Notifications";
import LockedAccount from "./pages/LockedAccount";

import { fetchUser } from "./features/user/userSlice";
import { fetchConnections } from "./features/connections/connectionsSlice";
import socket from "./sockethandler/socket";

const App = () => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);
  const dispatch = useDispatch();

  const dbUser = useSelector((state) => state.user.value);
  const currentUserId = dbUser?._id;

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const token = await getToken();
        dispatch(fetchUser(token));
        dispatch(fetchConnections(token));
      }
    };
    if (isLoaded && user) {
        fetchData();
    }
  }, [user, isLoaded, getToken, dispatch]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (currentUserId) {
      if (!socket.connected) {
        socket.connect();
        console.log("🔌 App: Socket connecting...");
      }

      socket.emit("register_user", currentUserId);

      const onConnect = () => {
        console.log("✅ App: Socket connected ID:", socket.id);
        socket.emit("register_user", currentUserId);
      };

      socket.on("connect", onConnect);

      return () => {
        socket.off("connect", onConnect);
      };
    } else {
        if(socket.connected) {
            socket.disconnect();
            console.log("🚫 App: Socket disconnected (No User)");
        }
    }
  }, [currentUserId]);

  if (!isLoaded) return null;

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="messages/*" element={<Messages />} />
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:profileId" element={<Profile />} />
          <Route path="profile-user/:slug" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="create-post" element={<CreatePost />} />
        </Route>
        <Route path="locked" element={<LockedAccount />} />
      </Routes>
    </>
  );
};

export default App;

// App.jsx cũng sử dụng useUser từ Clerk để kiểm tra trạng thái đăng nhập của người dùng.
// Nó là nơi kết nối giữa các trang và các thành phần khác trong ứng dụng, giúp quản lý điều hướng và trạng thái người dùng.