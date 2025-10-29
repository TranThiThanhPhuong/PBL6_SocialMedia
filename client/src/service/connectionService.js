import api from "../api/axios";
import toast from "react-hot-toast";
import { fetchConnections } from "../features/connections/connectionsSlice";
import { fetchUser } from "../features/user/userSlice";

let isProcessing = false;

// === FOLLOW / UNFOLLOW ===
const postWithToken = async (url, body, getToken) => {
  const token = await getToken();
  const { data } = await api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { data, token };
};

export const handleFollow = async (userId, getToken, dispatch) => {
  try {
    const { data, token } = await postWithToken("/api/user/follow", { id: userId }, getToken);

    if (data.success) {
      toast.success(data.message || "Đã theo dõi");
      dispatch(fetchConnections(token));
      dispatch(fetchUser(token));
    } else toast.error(data.message);
  } catch (err) {
    toast.error(err.message);
  }
};

export const handleUnfollow = async (userId, getToken, dispatch) => {
  try {
    const { data, token } = await postWithToken("/api/user/unfollow", { id: userId }, getToken);

    if (data.success) {
      toast.success(data.message || "Đã bỏ theo dõi");
      dispatch(fetchConnections(token));
      dispatch(fetchUser(token));
    } else toast.error(data.message);
  } catch (err) {
    toast.error(err.message);
  }
};

// === KẾT BẠN ===
export const handleConnectionRequest = async (userId, getToken, dispatch, currentUser, navigate) => {
  try {
    if (isProcessing) return;
    isProcessing = true;

    if (currentUser?.connections?.includes(userId)) return navigate(`/messages/${userId}`);

    const { data, token } = await postWithToken("/api/user/connect", { id: userId }, getToken);
    if (data.success) {
      toast.success("Đã gửi lời mời kết bạn 💌");
      dispatch(fetchConnections(token));
    } else toast.error(data.message || "Không thể gửi lời mời.");
  } catch (err) {
    toast.error(err.response?.data?.message || err.message);
  } finally {
    isProcessing = false;
  }
};

// === CHẤP NHẬN / TỪ CHỐI / HỦY KẾT BẠN ===
export const handleAcceptConnection = async (userId, getToken, dispatch) => {
  try {
    const { data, token } = await postWithToken("/api/user/accept", { id: userId }, getToken);
    if (data.success) {
      toast.success(data.message || "Đã chấp nhận kết bạn");
      dispatch(fetchConnections(token));
      dispatch(fetchUser(token));
    } else toast.error(data.message);
  } catch (err) {
    toast.error(err.message);
  }
};

export const handleRejectConnection = async (userId, getToken, dispatch) => {
  try {
    const { data, token } = await postWithToken("/api/user/reject", { id: userId }, getToken);
    if (data.success) {
      toast.success(data.message || "Đã từ chối lời mời");
      dispatch(fetchConnections(token));
    } else toast.error(data.message);
  } catch (err) {
    toast.error(err.message);
  }
};

export const handleRemoveConnection = async (userId, getToken, dispatch) => {
  try {
    if (!window.confirm("Bạn có chắc muốn hủy kết bạn với người này không?")) return;
    const { data, token } = await postWithToken("/api/user/remove-friend", { id: userId }, getToken);
    if (data.success) {
      toast.success(data.message || "Đã hủy kết bạn");
      dispatch(fetchConnections(token));
      dispatch(fetchUser(token));
    } else toast.error(data.message);
  } catch (err) {
    toast.error(err.message);
  }
};

// === CHẶN / BỎ CHẶN ===
export const handleBlock = async (userId, getToken, dispatch) => {
  try {
    if (!window.confirm("Bạn có chắc muốn chặn người này không? Họ sẽ không thể nhắn tin hoặc xem bạn.")) return;
    const { data, token } = await postWithToken("/api/user/block", { id: userId }, getToken);
    if (data.success) {
      toast.success(data.message || "Đã chặn người dùng.");
      dispatch(fetchConnections(token));
    } else toast.error(data.message || "Không thể chặn người dùng.");
  } catch (err) {
    toast.error(err.response?.data?.message || err.message);
  }
};

export const handleUnblock = async (userId, getToken, dispatch) => {
  try {
    if (!window.confirm("Bạn có chắc muốn bỏ chặn người này không?")) return;
    const { data, token } = await postWithToken("/api/user/unblock", { id: userId }, getToken);
    if (data.success) {
      toast.success(data.message || "Đã bỏ chặn người dùng.");
      dispatch(fetchConnections(token));
    } else toast.error(data.message || "Không thể bỏ chặn người dùng.");
  } catch (err) {
    toast.error(err.response?.data?.message || err.message);
  }
};

export const createConnectionHandlers = (getToken, dispatch, navigate, currentUser) => ({
  follow: (userId) => handleFollow(userId, getToken, dispatch),
  unfollow: (userId) => handleUnfollow(userId, getToken, dispatch),
  connect: (userId) =>
    handleConnectionRequest(userId, getToken, dispatch, currentUser, navigate),
  accept: (userId) => handleAcceptConnection(userId, getToken, dispatch),
});

export const handleReport = async (userId, getToken, dispatch) => {
  const token = await getToken();
  try {
    const { data } = await api.post(
      "/api/report/user",
      { userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.success) toast.success("Đã gửi báo cáo đến admin.");
    else toast.error(data.message);
  } catch (error) {
    toast.error("Lỗi khi gửi báo cáo.");
  }
};