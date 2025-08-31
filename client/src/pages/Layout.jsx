import React, {useState} from "react"; // useState để quản lý trạng thái của sidebar
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react"; // them vào lucide-react để sử dụng biểu tượng
import { dummyUserData } from "../assets/assets"; // dummyUserData là một đối tượng chứa thông tin người dùng giả lập, có thể được sử dụng để kiểm tra giao diện
import Loading from "../components/Loading"; // Import component Loading để hiển thị khi dữ liệu đang được tải
import { useSelector } from 'react-redux'; 

const Layout = () => {

  const user = useSelector((state) => state.user.value); // Lấy thông tin người dùng từ Redux store

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
      {/* Phần này sẽ hiển thị các trang con bên trong Layout */}
      {/* Outlet sẽ hiển thị các component con được định nghĩa trong Routes */}
        <Outlet />
      </div>

      {
        sidebarOpen ?
        // Nếu sidebarOpen là true, hiển thị biểu tượng đóng (X) và khi nhấn vào biểu tượng này, gọi hàm setSidebarOpen để đóng
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
  // Nếu không có người dùng (user là null hoặc undefined), hiển thị "Loading"
}

// export Layout để có thể sử dụng trong các file khác
export default Layout;

// Layout.jsx : de quản lý bố cục của ứng dụng, bao gồm sidebar và các trang con
// Đây là nơi chứa các thành phần chung của ứng dụng như sidebar, header, footer, v.v.
// Nó sử dụng Outlet từ react-router-dom để hiển thị các trang con bên trong Layout này
// Khi người dùng đăng nhập, Layout sẽ hiển thị sidebar và các trang con tương ứng
// Nếu người dùng chưa đăng nhập, nó sẽ hiển thị một trang "Loading" hoặc có thể là trang Login
// Layout cũng quản lý trạng thái mở/đóng của sidebar thông qua useState
// Sidebar sẽ được hiển thị hoặc ẩn đi dựa trên trạng thái này