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
    // Logic confirm nên để ở Component thì linh hoạt hơn, nhưng để đây cũng được nếu muốn tái sử dụng nhanh
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
      dispatch(fetchConnections(token)); // Cập nhật lại list friend
      return true; // Trả về true để component biết mà xử lý tiếp (ví dụ: reload)
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

// === BÁO CÁO ===
export const handleReport = async (userId, reason, getToken) => {
  try {
    // Lưu ý: Endpoint phải khớp với Router BE (/api/user/report-user)
    const { data } = await postWithToken(
      "/api/user/report-user",
      { reportedUserId: userId, reason: reason || "Spam" }, // Body khớp với Controller
      getToken
    );

    if (data.success) {
      toast.success("Đã gửi báo cáo đến quản trị viên.");
      return true;
    } else {
      toast.error(data.message);
      return false;
    }
  } catch (error) {
    toast.error("Lỗi khi gửi báo cáo.");
    return false;
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
