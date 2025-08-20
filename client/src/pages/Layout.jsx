import React, {useState} from "react"; // useState để quản lý trạng thái của sidebar
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom"; // Outlet cho phép hiển thị các component con trong Layout
import { Menu, X } from "lucide-react"; // them vào lucide-react để sử dụng biểu tượng
import { dummyUserData } from "../assets/assets";
import Loading from "../components/Loading"; // Import component Loading để hiển thị khi dữ liệu đang được tải

const Layout = () => {

  const user = dummyUserData; // Giả lập dữ liệu người dùng, có thể thay thế bằng dữ liệu thực từ API hoặc context
  // useState để quản lý trạng thái mở/đóng của sidebar
  // sidebarOpen là biến trạng thái, setSidebarOpen là hàm để cập nhật trạng thái
  // ban đầu sidebarOpen là false, nghĩa là sidebar đóng
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Kiểm tra xem người dùng đã đăng nhập hay chưa
  // Nếu có người dùng (user không phải null hoặc undefined), hiển thị giao diện
  return user ? (
    <div className="w-full flex h-screen">
      {/* Hiển thị Sidebar với các props sidebarOpen và setSidebarOpen */}
      {/* sidebarOpen để xác định trạng thái mở/đóng của sidebar */} 
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 bg-slate-50">
        <Outlet />
      </div>
      {
        sidebarOpen ?
        // Nếu sidebarOpen là true, hiển thị biểu tượng đóng (X)
        // và khi nhấn vào biểu tượng này, gọi hàm setSidebarOpen để đóng
        <X className='absolute top-3 right-3 p-2 z-100 bg-white rounded-md shadow w-10 h-10 text-gray-600 sm:hidden' onClick={() => setSidebarOpen(false)} />
        :
        // Nếu sidebarOpen là false, hiển thị biểu tượng menu (Menu)
        // và khi nhấn vào biểu tượng này, gọi hàm setSidebarOpen để mở
        <Menu className='absolute top-3 right-3 p-2 z-100 bg-white rounded-md shadow w-10 h-10 text-gray-600 sm:hidden' onClick={() => setSidebarOpen(true)}  />
      }
    </div>
  ) : (
    <Loading />
  );
  // Nếu không có người dùng (user là null hoặc undefined), hiển thị "Loading
}

export default Layout;