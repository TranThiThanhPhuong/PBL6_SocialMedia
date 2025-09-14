import React, { useState } from "react"; // useState để quản lý trạng thái của sidebar
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Loading from "../components/Loading";
import { useSelector } from "react-redux";

const Layout = () => {
  const user = useSelector((state) => state.user.value); // Lấy thông tin người dùng từ Redux store

  // sidebarOpen là biến trạng thái, setSidebarOpen là hàm để cập nhật trạng thái
  // ban đầu sidebarOpen là false, nghĩa là sidebar đóng
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Kiểm tra xem người dùng đã đăng nhập hay chưa
  // Nếu có người dùng (user không phải null hoặc undefined), hiển thị giao diện
  return user ? (
    <div className="w-full flex h-screen">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 bg-slate-50">
        <Outlet />
      </div>

      {sidebarOpen ? (
        <X
          className="absolute top-3 right-3 p-2 z-100 bg-white rounded-md shadow w-10 h-10 text-gray-600 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : (
        <Menu
          className="absolute top-3 right-3 p-2 z-100 bg-white rounded-md shadow w-10 h-10 text-gray-600 sm:hidden"
          onClick={() => setSidebarOpen(true)}
        />
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default Layout;

// Layout.jsx : de quản lý bố cục của ứng dụng, bao gồm sidebar và các trang con
// Đây là nơi chứa các thành phần chung của ứng dụng như sidebar, header, footer, v.v.
// Nó sử dụng Outlet từ react-router-dom để hiển thị các trang con bên trong Layout này
// Nếu người dùng chưa đăng nhập, nó sẽ hiển thị một trang "Loading" hoặc có thể là trang Login