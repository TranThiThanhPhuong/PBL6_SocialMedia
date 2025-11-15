import React, { useRef, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useDispatch } from "react-redux";
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
  const { user } = useUser(); // Sử dụng useUser để lấy thông tin người dùng hiện tại
  const { getToken } = useAuth(); // Sử dụng useAuth để lấy hàm getToken để lấy token JWT xác thực của người dùng hiện tại
  const { pathname } = useLocation(); // Nó cho bạn biết URL hiện tại của app (ví dụ: /messages/123, /profile, …), pathname là chuỗi chứa đường dẫn đó.
  const pathnameRef = useRef(pathname); // useRef tạo ra một “hộp” lưu giá trị mà không làm component re-render khi thay đổi.
  const dispatch = useDispatch(); // Sử dụng useDispatch để lấy hàm dispatch từ Redux store

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const token = await getToken(); // Lấy token JWT của người dùng hiện tại
        dispatch(fetchUser(token)); // Gọi action fetchUser với token để lấy dữ liệu người dùng từ server
        dispatch(fetchConnections(token)); //
      }
    };
    fetchData(); // Gọi hàm fetchData để thực hiện việc lấy dữ liệu người dùng khi component được render hoặc khi user thay đổi
  }, [user, getToken, dispatch]); // Chạy useEffect mỗi khi user hoặc getToken thay đổi

  useEffect(() => {
    pathnameRef.current = pathname; // Mỗi lần URL đổi (/messages, /profile, /discover...), thì pathnameRef.current được cập nhật theo.
  }, [pathname]);

  const currentUserId = user?._id;
  useEffect(() => {
    if (!currentUserId) return;

    socket.emit("register_user", currentUserId);

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  return (
    <>
      {/* Route: dieu huong trang web  */}
      {/* xd url hien thi component nao, Nó giúp ứng dụng chuyển trang mà không cần reload lại toàn bộ website. */}
      <Toaster /> {/* Toaster: hien thi cac thong bao */}
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="messages/*" element={<Messages />} />
          {/* <Route path="messages-user/:slug" element={<Messages />} />{" "} */}
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:profileId" element={<Profile />} />
          <Route path="profile-user/:slug" element={<Profile />} />{" "}
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
