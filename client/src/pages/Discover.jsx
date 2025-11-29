import React, { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import UserCard from "../components/UserCard";
import Loading from "../components/Loading";
import api from "../api/axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { fetchUser } from "../features/user/userSlice";

const Discover = () => {
  const dispatch = useDispatch();
  const [input, setInput] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();

  // 1. Tách hàm gọi API ra riêng để tái sử dụng
  const performSearch = useCallback(async (searchTerm) => {
    try {
      setLoading(true);
      const token = await getToken();
      // Gửi input lên, nếu input rỗng backend sẽ tự trả về gợi ý (như logic bạn đã viết)
      const { data } = await api.post(
        "/api/user/discover",
        { input: searchTerm },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (data.success) {
        setUsers(data.users);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || "Lỗi tìm kiếm");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // 2. useEffect xử lý Debounce (Tự động tìm sau 500ms)
  useEffect(() => {
    // Tạo bộ đếm thời gian
    const delayDebounceFn = setTimeout(() => {
      performSearch(input);
    }, 500); // Chờ 500ms sau khi ngừng gõ mới tìm

    // Cleanup function: Xóa bộ đếm cũ nếu user gõ tiếp trước khi hết 500ms
    return () => clearTimeout(delayDebounceFn);
  }, [input, performSearch]);

  // 3. Xử lý khi nhấn Enter (Tìm ngay lập tức)
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      // Hủy bỏ debounce hiện tại (nếu có) để tránh gọi 2 lần (tùy chọn, nhưng performSearch gọi đè cũng không sao)
      performSearch(input);
    }
  };

  // 4. Load thông tin user hiện tại (Sửa lỗi thiếu dependency array)
  useEffect(() => {
    const loadCurrentUser = async () => {
        const token = await getToken();
        if(token) dispatch(fetchUser(token));
    }
    loadCurrentUser();
  }, [dispatch, getToken]); // Thêm dependency để tránh warning và infinite loop

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tìm kiếm</h1>
          <p className="text-slate-600">
            Tìm kiếm và kết nối với những người tuyệt vời.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8 shadow-md rounded-md border border-slate-200/60 bg-white/80">
          <div className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm mọi người theo tên, username..."
                className="pl-10 sm:pl-12 py-2 w-full border border-gray-300 rounded-md max-sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                onChange={(e) => setInput(e.target.value)}
                value={input}
                onKeyDown={handleKeyDown} // Đổi onKeyUp thành onKeyDown để mượt hơn
              />
            </div>
          </div>
        </div>

        {/* User Cards */}
        {/* Thêm logic hiển thị khi không có kết quả */}
        {!loading && users.length === 0 && input.trim() !== "" ? (
             <div className="text-center text-slate-500 mt-10">Không tìm thấy người dùng nào phù hợp.</div>
        ) : (
            <div className="flex flex-wrap gap-6">
            {users.map((user) => (
                <UserCard user={user} key={user._id} />
            ))}
            </div>
        )}

        {loading && <Loading height="40vh" />}
      </div>
    </div>
  );
};

export default Discover;