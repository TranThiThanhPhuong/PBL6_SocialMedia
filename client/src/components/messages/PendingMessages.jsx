import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const PendingMessages = () => {
  const { getToken } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const token = await getToken();
      console.log("Token:", token);
      const { data } = await api.get("/api/message/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) setPending(data.pending);
      else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  if (loading)
    return (
      <p className="p-4 text-center text-gray-500">Đang tải tin nhắn chờ...</p>
    );

  if (pending.length === 0)
    return (
      <p className="p-4 text-center text-gray-500">Không có tin nhắn chờ.</p>
    );

  return (
    <div className="px-3">
      {pending.map(({ user, lastMessage }) => (
  <div key={user._id} className="flex items-center gap-3 p-3 ...">
    <img src={user.profile_picture} className="w-12 h-12 rounded-full" />
    <div>
      <p className="font-medium">{user.full_name}</p>
      <p className="text-sm text-gray-500 truncate">
        {lastMessage ? (lastMessage.text || "📷 Hình ảnh") : "Chưa có tin nhắn"}
      </p>
    </div>
  </div>
))}
    </div>
  );
};

export default PendingMessages;
