import api from "../api/axios";
import toast from "react-hot-toast";

export const handleLike = async (postId, currentUserId, getToken, setLikes) => {
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
    toast.error("Lỗi khi like bài viết");
  }
};

export const handleDelete = async (postId, getToken, onPostDeleted) => {
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

export const handleUpdate = async (
  postId,
  editContent,
  getToken,
  setEditMode,
  onPostUpdated
) => {
  try {
    const formData = new FormData();
    formData.append("content", editContent);
    const { data } = await api.put(`/api/post/update/${postId}`, formData, {
      headers: { Authorization: `Bearer ${await getToken()}` },
    });
    if (data.success) {
      toast.success("Đã cập nhật bài viết");
      setEditMode(false);
      onPostUpdated?.(data.post);
    } else toast.error(data.message);
  } catch (error) {
    toast.error("Lỗi khi cập nhật bài viết");
  }
};

export const handleReportSubmit = async (
  postId,
  reportedUser,
  selectedReason,
  getToken,
  setShowReportModal,
  setSelectedReason
) => {
  if (!selectedReason) {
    toast.error("Vui lòng chọn lý do báo cáo!");
    return;
  }
  try {
    const { data } = await api.post(
      "/api/report/post",
      { postId, reportedUser, reason: selectedReason },
      { headers: { Authorization: `Bearer ${await getToken()}` } }
    );
    if (data.success) {
      toast.success("Đã gửi báo cáo đến quản trị viên!");
      setShowReportModal(false);
      setSelectedReason(null);
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error("Lỗi khi gửi báo cáo!");
  }
};