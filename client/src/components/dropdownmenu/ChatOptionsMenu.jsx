import React, { useState } from "react";
import { Trash2, Flag, UserX, UserCheck, Inbox } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { fetchConnections } from "../../features/connections/connectionsSlice";

const postWithToken = async (url, body, getToken) => {
  const token = await getToken();
  const { data } = await api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { data, token };
};

const ChatOptionsMenu = ({ userId, onClose, getToken, dispatch }) => {
  const [loading, setLoading] = useState(false);

  const handleDeleteChat = async () => {
    try {
      if (!window.confirm("Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện này?"))
        return;

      setLoading(true);
      const token = await getToken();
      const { data } = await api.post(
        "/api/message/delete-chat",
        { id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) toast.success("Đã xóa cuộc trò chuyện.");
      else toast.error(data.message);

      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportUser = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const { data } = await api.post(
        "/api/user/report-user",
        { id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) toast.success("Đã gửi báo cáo đến admin.");
      else toast.error(data.message);

      onClose();
    } catch (error) {
      toast.error("Lỗi khi gửi báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    try {
      if (!window.confirm("Bạn có chắc muốn chặn người này không? Họ sẽ không thể nhắn tin hoặc xem bạn."))
        return;

      setLoading(true);

      const { data, token } = await postWithToken(
        "/api/user/block",
        { id: userId },
        getToken
      );

      if (data.success) {
        toast.success(data.message || "Đã chặn người dùng.");
        dispatch(fetchConnections(token));
      } else toast.error(data.message || "Không thể chặn người dùng.");

      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    try {
      if (!window.confirm("Bạn có chắc muốn bỏ chặn người này không?"))
        return;

      setLoading(true);

      const { data, token } = await postWithToken(
        "/api/user/unblock",
        { id: userId },
        getToken
      );

      if (data.success) {
        toast.success(data.message || "Đã bỏ chặn người dùng.");
        dispatch(fetchConnections(token));
      } else toast.error(data.message || "Không thể bỏ chặn người dùng.");

      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToPending = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const { data } = await api.post(
        "/api/message/move-to-pending",
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) toast.success("Đã chuyển tin nhắn sang chờ.");
      else toast.error(data.message);

      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-17 right-2 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      <button onClick={handleDeleteChat} disabled={loading} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left">
        <Trash2 size={16} /> Xóa chat
      </button>
      <button onClick={handleReportUser} disabled={loading} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left">
        <Flag size={16} /> Báo cáo
      </button>
      <button onClick={handleBlockUser} disabled={loading} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left">
        <UserX size={16} /> Chặn người này
      </button>
      <button onClick={handleUnblockUser} disabled={loading} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left">
        <UserCheck size={16} /> Bỏ chặn
      </button>
      <button onClick={handleMoveToPending} disabled={loading} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left">
        <Inbox size={16} /> Chuyển tin nhắn chờ
      </button>
    </div>
  );
};

export default ChatOptionsMenu;