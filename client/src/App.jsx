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
import { useUser } from "@clerk/clerk-react"; 
import Layout from "./pages/Layout";

const App = () => {

  // Sử dụng useUser để lấy thông tin người dùng hiện tại
  const {user} = useUser();
  return (
    <>
    {/* Route: dieu huong trang web  */}
    {/* xd url hien thi component nao, Nó giúp ứng dụng chuyển trang mà không cần reload lại toàn bộ website. */}
      <Routes>
        <Route path='/' element={ !user ? <Login /> : <Layout />}> 
          <Route index element={<Feed />} />
          <Route path='messages' element={<Messages />} />
          <Route path='messages/:userId' element={<ChatBox />} />
          <Route path='connections' element={<Connections />} />
          <Route path='discover' element={<Discover />} />
          <Route path='profile' element={<Profile />} />
          <Route path='profile/:profileId' element={<Profile />} />
          <Route path='create-post' element={<CreatePost />} />
        </Route>
      </Routes>
      </>
  );
}

export default App;

// App.jsx : là thành phần chính của ứng dụng, nơi định nghĩa các route và các trang con.
// Trong App.jsx, chúng ta định nghĩa các route cho các trang như Feed, Messages, ChatBox, Connections, Discover, Profile và CreatePost.
// App.jsx cũng sử dụng useUser từ Clerk để kiểm tra trạng thái đăng nhập của người dùng.
// Nó là nơi kết nối giữa các trang và các thành phần khác trong ứng dụng, giúp quản lý điều hướng và trạng thái người dùng.