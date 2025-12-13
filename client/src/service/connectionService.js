import api from "../api/axios";
import toast from "react-hot-toast";
import { fetchConnections } from "../features/connections/connectionsSlice";
import { fetchUser } from "../features/user/userSlice";

let isProcessing = false;

const postWithToken = async (url, body, getToken) => {
  const token = await getToken();
  const { data } = await api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { data, token };
};

const handleError = (error, defaultMessage) => {
  const msg = error.response?.data?.message || error.message || defaultMessage;
  toast.error(msg);
  return false;
};

export const handleFollow = async (userId, getToken, dispatch) => {
  try {
    const { data, token } = await postWithToken(
      "/api/user/follow",
      { id: userId },
      getToken
    );

    if (data.success) {
      toast.success(data.message || "Đã theo dõi");
      dispatch(fetchConnections(token));
      dispatch(fetchUser(token));
      return true;
    } else {
      toast.error(data.message);
      return false;
    }
  } catch (err) {
    toast.error(err.message);
  }
};

export const handleUnfollow = async (userId, getToken, dispatch) => {
  try {
    const { data, token } = await postWithToken(
      "/api/user/unfollow",
      { id: userId },
      getToken
    );

    if (data.success) {
      toast.success(data.message || "Đã bỏ theo dõi");
      dispatch(fetchConnections(token));
      dispatch(fetchUser(token));
      return true;
    } else {
      toast.error(data.message);
      return false;
    }
  } catch (err) {
    toast.error(err.message);
  }
};

export const handleConnectionRequest = async (
  userId,
  getToken,
  dispatch,
  currentUser,
  navigate
) => {
  try {
    if (isProcessing) return false;
    isProcessing = true;

    if (currentUser?.connections?.includes(userId)) {
      navigate(`/messages/${userId}`);
      return true;
    }

    const { data, token } = await postWithToken(
      "/api/user/connect",
      { id: userId },
      getToken
    );
    if (data.success) {
      toast.success("Đã gửi lời mời kết bạn 💌");
      dispatch(fetchConnections(token));
      return true;
    } else {
      toast.error(data.message || "Không thể gửi lời mời.");
      return false;
    }
  } catch (err) {
    toast.error(err.response?.data?.message || err.message);
  } finally {
    isProcessing = false;
  }
};

export const handleAcceptConnection = async (userId, getToken, dispatch) => {
  try {
    const { data, token } = await postWithToken(
      "/api/user/accept",
      { id: userId },
      getToken
    );
    if (data.success) {
      toast.success(data.message || "Đã chấp nhận kết bạn");
      dispatch(fetchConnections(token));
      dispatch(fetchUser(token));
      return true;
    } else {
      toast.error(data.message);
      return false;
    }
  } catch (err) {
    toast.error(err.message);
  }
};

export const handleRejectConnection = async (userId, getToken, dispatch) => {
  try {
    const { data, token } = await postWithToken(
      "/api/user/reject",
      { id: userId },
      getToken
    );
    if (data.success) {
      toast.success(data.message || "Đã từ chối lời mời");
      dispatch(fetchConnections(token));
      return true;
    } else {
      toast.error(data.message);
      return false;
    }
  } catch (err) {
    toast.error(err.message);
  }
};

export const handleRemoveConnection = async (userId, getToken, dispatch) => {
  try {
    if (!window.confirm("Bạn có chắc muốn hủy kết bạn với người này không?"))
      return false;
    const { data, token } = await postWithToken(
      "/api/user/remove-friend",
      { id: userId },
      getToken
    );
    if (data.success) {
      toast.success(data.message || "Đã hủy kết bạn");
      dispatch(fetchConnections(token));
      dispatch(fetchUser(token));
      return true;
    } else toast.error(data.message);
  } catch (err) {
    toast.error(err.message);
  }
};

export const handleCancelConnection = async (userId, getToken, dispatch) => {
  try {
    const { data, token } = await postWithToken(
      "/api/user/cancel-request",
      { id: userId },
      getToken
    );
    if (data.success) {
      toast.success(data.message || "Đã hủy lời mời kết bạn");
      dispatch(fetchConnections(token));
      return true;
    } else {
      toast.error(data.message);
      return false;
    }
  } catch (err) {
    toast.error(err.message);
    return false;
  }
};

export const handleBlock = async (userId, getToken, dispatch) => {
  try {
    if (
      !window.confirm(
        "Bạn có chắc muốn chặn người này? Họ sẽ không thể tìm thấy hoặc liên hệ với bạn."
      )
    ) {
      return false;
    }

    const { data, token } = await postWithToken(
      "/api/user/block",
      { id: userId },
      getToken
    );

    if (data.success) {
      toast.success(data.message || "Đã chặn người dùng.");
      if (dispatch) await dispatch(fetchConnections(token));
      return true;
    } else {
      toast.error(data.message || "Lỗi khi chặn.");
      return false;
    }
  } catch (err) {
    toast.error(err.response?.data?.message || err.message);
    return false;
  }
};

// === BỎ CHẶN ===
export const handleUnblock = async (userId, getToken, dispatch) => {
  try {
    if (!window.confirm("Bạn muốn bỏ chặn người dùng này?")) return false;

    const { data, token } = await postWithToken(
      "/api/user/unblock",
      { id: userId },
      getToken
    );

    if (data.success) {
      toast.success(data.message || "Đã bỏ chặn.");
      if (dispatch) await dispatch(fetchConnections(token));
      return true;
    } else {
      toast.error(data.message);
      return false;
    }
  } catch (err) {
    toast.error(err.message);
    return false;
  }
};

export const handleReport = async (userId, getToken) => {
  if (!window.confirm("Bạn muốn báo cáo người dùng này vì hành vi vi phạm?"))
    return false;

  try {
    const { data } = await postWithToken(
      "/api/user/report-user",
      { id: userId },
      getToken
    );

    if (data.success) {
      toast.success("Đã gửi báo cáo đến quản trị viên.");
      return true;
    }
    return handleError({ message: data.message }, "Lỗi khi gửi báo cáo.");
  } catch (err) {
    return handleError(err, "Không thể gửi báo cáo.");
  }
};

// === 5. CHUYỂN VÀO TIN NHẮN CHỜ ===
export const handleMoveToPending = async (userId, getToken) => {
  try {
    const { data } = await postWithToken(
      "/api/message/move-to-pending",
      { userId },
      getToken
    );

    if (data.success) {
      toast.success("Đã chuyển cuộc trò chuyện sang tin nhắn chờ.");
      return true;
    }
    return handleError({ message: data.message }, "Lỗi khi chuyển tin nhắn.");
  } catch (err) {
    return handleError(err, "Không thể chuyển sang tin nhắn chờ.");
  }
};

export const handleDeleteChat = async (userId, getToken) => {
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

export const createConnectionHandlers = (
  getToken,
  dispatch,
  navigate,
  currentUser
) => ({
  follow: (userId) => handleFollow(userId, getToken, dispatch),
  unfollow: (userId) => handleUnfollow(userId, getToken, dispatch),
  connect: (userId) =>
    handleConnectionRequest(userId, getToken, dispatch, currentUser, navigate),
  accept: (userId) => handleAcceptConnection(userId, getToken, dispatch),
});
