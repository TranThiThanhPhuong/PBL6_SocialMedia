import api from "./axios";
import toast from "react-hot-toast";

export const likePost = async (postId, getToken, currentUserId, setLikes) => {
  try {
    const { data } = await api.post(
      "/api/post/like",
      { postId },
      { headers: { Authorization: `Bearer ${await getToken()}` } }
    );
    if (data.success) {
      setLikes((prev) =>
        prev.includes(currentUserId)
          ? prev.filter((id) => id !== currentUserId)
          : [...prev, currentUserId]
      );
    } else toast.error(data.message);
  } catch (error) {
    toast.error(error.message);
  }
};

export const deletePost = async (postId, getToken, onPostDeleted) => {
  if (!window.confirm("Bạn có chắc muốn xóa bài viết này không?")) return;
  try {
    const { data } = await api.delete(`/api/post/delete/${postId}`, {
      headers: { Authorization: `Bearer ${await getToken()}` },
    });
    if (data.success) {
      toast.success("Đã xóa bài viết");
      onPostDeleted?.(postId);
    } else toast.error(data.message);
  } catch (error) {
    toast.error("Lỗi khi xóa bài viết");
  }
};

export const updatePost = async (postId, content, getToken, setEditMode, onPostUpdated) => {
  try {
    const formData = new FormData();
    formData.append("content", content);
    const { data } = await api.put(`/api/post/update/${postId}`, formData, {
      headers: { Authorization: `Bearer ${await getToken()}` },
    });
    if (data.success) {
      toast.success("Đã cập nhật bài viết");
      setEditMode(false);
      onPostUpdated?.(data.post);
    } else toast.error(data.message);
  } catch (error) {
    toast.error(error.message);
  }
};

export const reportPost = async (postId, reportedUserId, reason, getToken, setShowReportModal, setSelectedReason) => {
  if (!reason) return toast.error("Vui lòng chọn lý do báo cáo!");
  try {
    const { data } = await api.post(
      "/api/report/post",
      { postId, reportedUser: reportedUserId, reason },
      { headers: { Authorization: `Bearer ${await getToken()}` } }
    );
    if (data.success) {
      toast.success("Đã gửi báo cáo đến quản trị viên!");
      setShowReportModal(false);
      setSelectedReason(null);
    } else toast.error(data.message);
  } catch (error) {
    toast.error("Lỗi khi gửi báo cáo!");
  }
};