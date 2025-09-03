import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import ChatBox from "./pages/ChatBox";
import Connections from "./pages/Connections";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import { useUser, useAuth } from "@clerk/clerk-react";
import Layout from "./pages/Layout";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchUser } from "./features/user/userSlice.js";

const App = () => {
  const { user } = useUser(); // Sử dụng useUser để lấy thông tin người dùng hiện tại
  const { getToken } = useAuth(); // Sử dụng useAuth để lấy hàm getToken để lấy token JWT xác thực của người dùng hiện tại

  const dispatch = useDispatch(); // Sử dụng useDispatch để lấy hàm dispatch từ Redux store

  useEffect(() => { // Hàm để thiết lập token vào header của tất cả các yêu cầu fetch
    const fetchData = async () => {
      if (user) {
        const token = await getToken();  // Lấy token JWT của người dùng hiện tại
        dispatch(fetchUser(token)); // Gọi action fetchUser với token để lấy dữ liệu người dùng từ server
      }
    };
    fetchData(); // Gọi hàm fetchData để thực hiện việc lấy dữ liệu người dùng khi component được render hoặc khi user thay đổi

  }, [user, getToken, dispatch]); // Chạy useEffect mỗi khi user hoặc getToken thay đổi

  return (
    <>
    {/* Route: dieu huong trang web  */}
    {/* xd url hien thi component nao, Nó giúp ứng dụng chuyển trang mà không cần reload lại toàn bộ website. */}
      <Toaster /> {/* Toaster: hien thi cac thong bao */}
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:userId" element={<ChatBox />} />
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:profileId" element={<Profile />} />
          <Route path="create-post" element={<CreatePost />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;

// App.jsx : là thành phần chính của ứng dụng, nơi định nghĩa các route và các trang con.
// Trong App.jsx, chúng ta định nghĩa các route cho các trang như Feed, Messages, ChatBox, Connections, Discover, Profile và CreatePost.
// App.jsx cũng sử dụng useUser từ Clerk để kiểm tra trạng thái đăng nhập của người dùng.
// Nó là nơi kết nối giữa các trang và các thành phần khác trong ứng dụng, giúp quản lý điều hướng và trạng thái người dùng.
