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
import { addMessage } from "./features/messages/messagesSlice";
import socket from "./app/socket";

const App = () => {
  const { user } = useUser(); // Sử dụng useUser để lấy thông tin người dùng hiện tại
  const { getToken } = useAuth(); // Sử dụng useAuth để lấy hàm getToken để lấy token JWT xác thực của người dùng hiện tại
  const { pathname } = useLocation(); // Nó cho bạn biết URL hiện tại của app (ví dụ: /messages/123, /profile, …), pathname là chuỗi chứa đường dẫn đó.
  const pathnameRef = useRef(pathname); // useRef tạo ra một “hộp” lưu giá trị mà không làm component re-render khi thay đổi.
  const dispatch = useDispatch(); // Sử dụng useDispatch để lấy hàm dispatch từ Redux store

  useEffect(() => {
    // Hàm để thiết lập token vào header của tất cả các yêu cầu fetch
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

  // useEffect(()=>{
  //   if(user){
  //     const eventSource = new EventSource(import.meta.env.VITE_BASEURL + '/api/message/' + user.id);

  //     eventSource.onmessage = (event)=> {
  //       const message = JSON.parse(event.data);

  //       if(pathnameRef.current === ('/message/' + message.from_user_id._id)){
  //         dispatch(addMessage(message));
  //       // Nếu bạn đang ở đúng chat box của người gửi tin nhắn (/message/:id) → thì thêm tin nhắn vào Redux (hiện ngay trong UI).
  //       }
  //       else {
  //         toast.custom((t)=>(
  //           <Notifications t={t} message={message}/>
  //         ), {position: "bottom-right"});
  //       // Nếu bạn đang ở chỗ khác → thì show thông báo (toast).
  //       }
  //     }
  //     return ()=> {
  //       eventSource.close();
  //     }
  //   }
  // }, [user, dispatch]);

  // Kết nối socket.io
  // useEffect(() => {
  //   if (!user) return;

  //   socket.on("register_user", (userId, callback) => {
  //     onlineUsers.set(userId, socket.id);
  //     console.log("✅ Registered:", userId);
  //     if (callback) callback({ success: true });
  //   });

  //   const handleMessage = (message) => {
  //     const currentPath = pathnameRef.current;
  //     if (currentPath === `/messages/${message.from_user_id}`) {
  //       dispatch(addMessage(message));
  //     } else {
  //       toast.custom(
  //         () => (
  //           <div className="bg-white shadow-md rounded-lg p-3 flex gap-3 items-center">
  //             <img
  //               src={message.from_user_id?.profile_picture}
  //               alt=""
  //               className="w-10 h-10 rounded-full"
  //             />
  //             <div>
  //               <p className="font-semibold text-gray-800">
  //                 {message.from_user_id?.full_name}
  //               </p>
  //               <p className="text-gray-600 text-sm">vừa nhắn tin cho bạn 💬</p>
  //             </div>
  //           </div>
  //         ),
  //         { position: "bottom-right" }
  //       );
  //     }
  //   };

  //   socket.on("receive_message", handleMessage);

  //   return () => {
  //     socket.off("receive_message", handleMessage);
  //     socket.disconnect();
  //   };
  // }, [user]);

//   useEffect(() => {
//   const sse = new EventSource(`${SERVER_URL}/api/message/${currentUser._id}`);
//   sse.onmessage = (e) => {
//     const msg = JSON.parse(e.data);
//     dispatch(addMessage(msg));
//   };
//   return () => sse.close();
// }, [currentUser]);


  return (
    <>
      {/* Route: dieu huong trang web  */}
      {/* xd url hien thi component nao, Nó giúp ứng dụng chuyển trang mà không cần reload lại toàn bộ website. */}
      <Toaster /> {/* Toaster: hien thi cac thong bao */}
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="messages/*" element={<Messages />} />
          {/* <Route path="messages" element={<Messages />} /> */}
          {/* <Route path="messages/:userId" element={<ChatBox />} /> */}
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:profileId" element={<Profile />} />
          <Route path="profile-user/:slug" element={<Profile />} />{" "}
          {/* Hồ sơ người khác */}
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
