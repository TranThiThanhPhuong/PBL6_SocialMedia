// src/service/connectionService.js
import api from "../api/axios";
import toast from "react-hot-toast";
import { fetchConnections } from "../features/connections/connectionsSlice";
import { fetchUser } from "../features/user/userSlice";

// === FOLLOW ===
export const handleFollow = async (userId, getToken, dispatch) => {
  try {
    const token = await getToken();
    const { data } = await api.post(
      "/api/user/follow",
      { id: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success) {
      toast.success(data.message || "Đã theo dõi");
      dispatch(fetchUser(token));
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error(error.message);
  }
};

export const handleUnfollow = async (userId, getToken, dispatch) => {
  try {
    const token = await getToken();
    const { data } = await api.post(
      "/api/user/unfollow",
      { id: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success) {
      toast.success(data.message || "Đã bỏ theo dõi");
      dispatch(fetchConnections(token));
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error(error.message);
  }
};

// === KẾT BẠN ===
export const handleConnectionRequest = async (
  userId,
  getToken,
  dispatch,
  currentUser,
  navigate
) => {
  try {
    if (currentUser?.connections?.includes(userId)) {
      return navigate(`/messages/${userId}`);
    }

    const token = await getToken();
    const { data } = await api.post(
      "/api/user/connect",
      { id: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success) {
      toast.success("Đã gửi lời mời kết bạn 💌");
      dispatch(fetchConnections(token));
    } else {
      toast.error(data.message || "Không thể gửi lời mời.");
    }
  } catch (error) {
    toast.error(error.response?.data?.message || error.message);
  }
};

// === CHẤP NHẬN / TỪ CHỐI / HỦY KẾT BẠN ===
export const handleAcceptConnection = async (userId, getToken, dispatch) => {
  try {
    const token = await getToken();
    const { data } = await api.post(
      "/api/user/accept",
      { id: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.success) {
      toast.success(data.message || "Đã chấp nhận kết bạn");
      dispatch(fetchConnections(token));
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error(error.message);
  }
};

export const handleRejectConnection = async (userId, getToken, dispatch) => {
  try {
    const token = await getToken();
    const { data } = await api.post(
      "/api/user/reject",
      { id: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.success) {
      toast.success(data.message || "Đã từ chối lời mời");
      dispatch(fetchConnections(token));
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error(error.message);
  }
};

export const handleRemoveConnection = async (userId, getToken, dispatch) => {
  try {
    const token = await getToken();
    const { data } = await api.post(
      "/api/user/remove-friend",
      { id: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.success) {
      toast.success(data.message || "Đã hủy kết bạn");
      dispatch(fetchConnections(token));
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error(error.message);
  }
};

// === CHẶN ===
export const handleBlock = async (userId, getToken, dispatch) => {
  try {
    const token = await getToken();
    const { data } = await api.post(
      "/api/user/block",
      { id: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.success) {
      toast.success(data.message || "Đã chặn người dùng.");
      dispatch(fetchConnections(token));
    } else {
      toast.error(data.message || "Không thể chặn người dùng.");
    }
  } catch (error) {
    toast.error(error.response?.data?.message || error.message);
  }
};

export const handleUnblock = async (userId, getToken, dispatch) => {
  try {
    const token = await getToken();
    const { data } = await api.post(
      "/api/user/unblock",
      { id: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success) {
      toast.success(data.message || "Đã bỏ chặn người dùng.");
      dispatch(fetchConnections(token)); // cập nhật lại danh sách
    } else {
      toast.error(data.message || "Không thể bỏ chặn người dùng.");
    }
  } catch (error) {
    toast.error(error.response?.data?.message || error.message);
  }
};