import React, { useState, useRef } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Trash2,
  Edit3,
  Flag,
  X,
  Image,
} from "lucide-react";
import { formatPostTime } from "../app/formatDate";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { slugifyUser } from "../app/slugifyUser";
import UserAvatar from "../components/dropdownmenu/UserAvatar";
import CommentModal from "./CommentModal";
import SharePostModal from "./SharePostModal";

const violationMessages = {
  spam: "Spam hoặc nội dung gây phiền nhiễu",
  harassment: "Ngôn từ xúc phạm hoặc quấy rối",
  sensitive: "Nội dung nhạy cảm hoặc phản cảm",
  copyright: "Vi phạm bản quyền",
};

const violationIcons = {
  spam: "⚠️",
  harassment: "🚫",
  sensitive: "🔞",
  copyright: "©️",
};

const MAX_IMAGES = 4;

const PostCard = ({
  post,
  onPostDeleted,
  onPostUpdated,
  isProfileView = false,
}) => {
  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const imageInputRef = useRef(null);
  const postWithHashtags = post.content?.replace(
    /(#\w+)/g,
    '<span class="text-indigo-600">$1</span>'
  );

  const [likes, setLikes] = useState(post.likes_count);
  const [cmts, setCmts] = useState(post.comments_count || 0);
  const [shares, setShares] = useState(post.shares_count || 0);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");

  const [keptImageUrls, setKeptImageUrls] = useState(post.image_urls || []); // Ảnh cũ muốn giữ
  const [newImageFiles, setNewImageFiles] = useState([]); // Ảnh mới muốn thêm
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);

  const startEditMode = () => {
    setEditContent(post.content || "");
    setKeptImageUrls(post.image_urls || []);
    setNewImageFiles([]);
    setShowOptions(false);
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setKeptImageUrls(post.image_urls || []);
    setNewImageFiles([]);
  };

  const handleLike = async () => {
    try {
      const { data } = await api.post(
        "/api/post/like",
        { postId: post._id },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      if (data.success) {
        setLikes((prev) =>
          prev.includes(currentUser._id)
            ? prev.filter((id) => id !== currentUser._id)
            : [...prev, currentUser._id]
        );
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này không?")) return;
    try {
      const { data } = await api.delete(`/api/post/delete/${post._id}`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        toast.success("Đã xóa bài viết");
        onPostDeleted?.(post._id);
      } else toast.error(data.message);
    } catch (error) {
      toast.error("Lỗi khi xóa bài viết");
    }
  };

  const handleUpdate = async () => {
    if (
      !editContent?.trim() &&
      keptImageUrls.length === 0 &&
      newImageFiles.length === 0
    ) {
      return toast.error("Vui lòng nhập nội dung hoặc thêm ảnh.");
    }
    if (keptImageUrls.length + newImageFiles.length > MAX_IMAGES) {
      return toast.error(`Tổng số ảnh không được vượt quá ${MAX_IMAGES} ảnh.`);
    }
    try {
      const formData = new FormData();
      formData.append("content", editContent);
      formData.append("keptImageUrls", JSON.stringify(keptImageUrls));
      newImageFiles.forEach((file) => {
        formData.append("images", file);
      });
      const { data } = await api.put(`/api/post/update/${post._id}`, formData, {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });
      if (data.success) {
        toast.success("Đã cập nhật bài viết");
        setEditMode(false);
        onPostUpdated?.(data.post);
      } else toast.error(data.message);
    } catch (error) {
      if (error.response?.status === 400) {
        const serverData = error.response.data;
        const ai = serverData.aiResult;
        const textViolations =
          ai.text_result?.filter(
            (r) => r.label !== "an_toan" && r.confidence >= 0.65
          ) || [];
        const imageViolations = (
          Array.isArray(ai.image_result) ? ai.image_result : [ai.image_result]
        ).filter((r) => r.label !== "an_toan" && r.confidence >= 0.65);
        let errorMsg = serverData.message || "Bài viết chứa nội dung vi phạm.";

        toast.error(errorMsg);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Đã xảy ra lỗi không xác định.");
      }
    }
  };

  const handleNewImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const totalImages =
      keptImageUrls.length + newImageFiles.length + files.length;
    if (totalImages > MAX_IMAGES) {
      toast.error(`Tổng cộng chỉ được tối đa ${MAX_IMAGES} ảnh!`);
      return;
    }
    setNewImageFiles((prev) => [...prev, ...files]);
    e.target.value = null;
  };

  const handleReportSubmit = async () => {
    if (!selectedReason) {
      toast.error("Vui lòng chọn lý do báo cáo!");
      return;
    }
    try {
      const { data } = await api.post(
        "/api/report/post",
        {
          postId: post._id,
          reportedUser: post.user._id,
          reason: selectedReason,
        },
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
      toast.error("Bạn đã báo cáo bài viết này trước đó.");
    }
  };

  const handleUserClick = (user) => {
    if (!user) return;
    if (user._id === currentUser._id) {
      navigate("/profile");
    } else {
      navigate(`/profile-user/${slugifyUser(user)}`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-2xl relative">
      {/* User Info */}
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          {/* --- PHẦN 1: AVATAR + TÊN (Được bọc UserAvatar) --- */}
          {isProfileView ? (
            // Nếu là trang Profile: Chỉ hiện ảnh và tên bình thường (không bọc UserAvatar)
            <div className="flex items-center gap-3 cursor-pointer group"
              onClick={() => handleUserClick(post.user)}>
              <img
                src={post.user.profile_picture}
                className="w-10 h-10 rounded-full shadow object-cover"
                alt="avatar"
              />
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gray-900">
                  {post.user.full_name}
                </span>
                <BadgeCheck className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          ) : (
            // Nếu là Feed: Bọc cả Ảnh và Tên trong UserAvatar
            <UserAvatar user={post.user}>
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => handleUserClick(post.user)}
              >
                <img
                  src={post.user.profile_picture}
                  className="w-10 h-10 rounded-full shadow object-cover"
                  alt="avatar"
                />
                <div className="flex items-center gap-1">
                  {/* Thêm group-hover để khi rê vào ảnh, tên cũng đổi màu (tùy chọn) */}
                  <span className="font-semibold text-gray-900 group-hover:underline">
                    {post.user.full_name}
                  </span>
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                </div>
              </div>
            </UserAvatar>
          )}

          {/* --- PHẦN 2: NGÀY ĐĂNG (Nằm ngoài UserAvatar) --- */}
          <span className="text-gray-500 text-sm ml-2 flex items-center">
            <span className="mr-2">•</span>
            {formatPostTime(post.createdAt)}
          </span>
        </div>

        {/* Menu tùy chọn */}
        <div className="relative">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-600" />
          </button>

          {showOptions && (
            <div className="absolute right-0 mt-2 bg-white shadow rounded-lg border text-sm z-50 min-w-max">
              {post.user._id === currentUser._id ? (
                <>
                  <button
                    onClick={startEditMode}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full whitespace-nowrap"
                  >
                    <Edit3 className="w-4 h-4" /> Sửa
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowReportModal(true);
                    setShowOptions(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full whitespace-nowrap"
                >
                  <Flag className="w-4 h-4" /> Báo cáo bài viết
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {editMode ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm focus:ring-indigo-300 focus:border-indigo-300"
            rows="3"
            placeholder="Bạn đang nghĩ gì?"
          />
          {/* Giao diện chỉnh sửa/thêm ảnh */}
          {post.post_type !== "shared" && (
            <div className="flex flex-wrap gap-3">
              {keptImageUrls.map((url, index) => (
                <div
                  key={`kept-${index}`}
                  className="relative w-24 h-24 rounded-lg overflow-hidden shadow"
                >
                  <img
                    src={url}
                    alt="kept"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() =>
                      setKeptImageUrls((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 rounded-full p-0.5"
                  >
                    <X className="size-3 text-white" />
                  </button>
                  <span className="absolute bottom-0 left-0 bg-black/50 text-white text-[8px] px-1 rounded-tr-md">
                    Cũ
                  </span>
                </div>
              ))}
              {newImageFiles.map((file, index) => (
                <div
                  key={`new-${index}`}
                  className="relative w-24 h-24 rounded-lg overflow-hidden shadow"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt="new"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() =>
                      setNewImageFiles((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 rounded-full p-0.5"
                  >
                    <X className="size-3 text-white" />
                  </button>
                  <span className="absolute bottom-0 left-0 bg-indigo-500 text-white text-[8px] px-1 rounded-tr-md">
                    Mới
                  </span>
                </div>
              ))}

              {keptImageUrls.length + newImageFiles.length < MAX_IMAGES && (
                <button
                  onClick={() => imageInputRef.current.click()}
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition"
                >
                  <Image className="size-6" />
                  <span className="text-xs mt-1">Thêm ảnh</span>
                </button>
              )}
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                multiple
                hidden
                onChange={handleNewImageSelect}
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelEditMode}
              className="px-3 py-1 text-gray-500 hover:underline"
            >
              Hủy
            </button>
            <button
              onClick={handleUpdate}
              disabled={
                post.post_type !== "shared"
                  ? keptImageUrls.length + newImageFiles.length === 0 &&
                  !editContent?.trim()
                  : !editContent?.trim()
              }
              className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Lưu
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <div
            className="text-gray-800 text-sm whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: postWithHashtags }}
          />
        )
      )}
      {/* Images */}
      {!editMode && post.image_urls && post.image_urls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {post.image_urls.map((img, index) => (
            <img
              src={img}
              key={index}
              className={`w-full h-48 object-cover rounded-lg ${post.image_urls.length === 1 && "col-span-2 h-auto"
                }`}
            />
          ))}
        </div>
      )}
      {/* Shared Post */}
      {post.post_type === "shared" && post.shared_from && (
        <div className="border rounded-xl p-3 bg-gray-50 mt-3">
          <div className="flex items-center gap-2 mb-2">
            {isProfileView ? (
              // Nếu là trang Profile: Chỉ hiện ảnh và tên bình thường (không bọc UserAvatar)
              <div className="flex items-center gap-3 cursor-pointer group "
                onClick={() => handleUserClick(post.shared_from.user)}>
                <img
                  src={post.shared_from.user?.profile_picture}
                  className="w-10 h-10 rounded-full shadow object-cover"
                  alt="avatar"
                />
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900">
                    {post.shared_from.user?.full_name}
                  </span>
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                </div>
              </div>
            ) : (
              <UserAvatar user={post.shared_from.user}>
                <div
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => handleUserClick(post.shared_from.user)}
                >
                  <img
                    src={post.shared_from.user?.profile_picture}
                    className="w-10 h-10 rounded-full shadow object-cover"
                    alt="avatar"
                  />
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900 group-hover:underline">
                      {post.shared_from.user?.full_name}
                    </span>
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
              </UserAvatar>
            )}
            <span className="text-gray-500 text-sm ml-2 flex items-center">
              <span className="mr-2">•</span>
              {formatPostTime(post.shared_from.createdAt)}
            </span>
          </div>
          {post.shared_from.content && (
            <p
              className="text-gray-700 text-sm whitespace-pre-line"
              dangerouslySetInnerHTML={{
                __html: post.shared_from.content.replace(
                  /(#\w+)/g,
                  '<span class="text-indigo-600">$1</span>'
                ),
              }}
            />
          )}

          {post.shared_from.image_urls?.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {post.shared_from.image_urls.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt=""
                  className={`w-full h-40 object-cover rounded-lg ${post.shared_from.image_urls.length === 1 &&
                    "col-span-2 h-auto"
                    }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex justify-between items-center text-gray-600 text-sm mb-2">
        <span className="font-semibold">{likes.length || 0} lượt thích</span>
        <div className="flex gap-4">
          <span>{cmts || 0} bình luận</span>
          {post.post_type !== "shared" && <span>{shares || 0} chia sẻ</span>}
        </div>
      </div>
      <hr className="border-t border-gray-200" />

      {/* Actions */}
      <div className="flex justify-around items-center pt-3 text-gray-600 font-medium">
        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex items-center justify-center gap-2 w-1/3 py-2 rounded-lg hover:bg-gray-100 transition ${likes.includes(currentUser._id) ? "text-red-500" : ""
            }`}
        >
          <Heart
            className="w-5 h-5"
            fill={likes.includes(currentUser._id) ? "#f63b3bff" : "none"}
            stroke={
              likes.includes(currentUser._id) ? "#f63b3bff" : "currentColor"
            }
          />
          <span>Thích</span>
        </button>

        {/* Comment */}
        <button
          onClick={() => setShowCommentModal(true)}
          className="flex items-center justify-center gap-2 w-1/3 py-2 rounded-lg hover:bg-gray-100 transition"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Bình luận</span>
        </button>

        {/* Share */}
        {post.post_type !== "shared" && (
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center justify-center gap-2 w-1/3 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Share2 className="w-5 h-5" />
            <span>Chia sẻ</span>
          </button>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-[90%] max-w-2xl p-6 relative">
            <h3 className="text-lg font-bold mb-3 text-gray-800 text-center">
              Báo cáo bài viết
            </h3>
            <p className="text-sm text-gray-500 mb-3 text-center">
              Vui lòng chọn lý do báo cáo vi phạm:
            </p>

            <div className="space-y-2 mb-4">
              {Object.entries(violationMessages).map(([key, text]) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 border p-2 rounded-lg cursor-pointer ${selectedReason === key
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  <input
                    type="radio"
                    name="violation"
                    value={key}
                    checked={selectedReason === key}
                    onChange={() => setSelectedReason(key)}
                  />
                  <span className="text-sm whitespace-nowrap">
                    {violationIcons[key]} {text}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1 text-gray-500 hover:underline"
              >
                Hủy
              </button>
              <button
                onClick={() =>
                  handleReportSubmit(
                    post._id,
                    post.user._id,
                    selectedReason,
                    getToken,
                    setShowReportModal,
                    setSelectedReason
                  )
                }
                className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCommentModal && (
        <CommentModal
          post={post}
          onClose={() => setShowCommentModal(false)}
          onCommentAdded={() => setCmts((prev) => prev + 1)}
        />
      )}

      {showShareModal && (
        <SharePostModal
          post={post}
          onClose={() => setShowShareModal(false)}
          onShared={(newPost) => {
            setShares((prev) => prev + 1);
            onPostUpdated?.(newPost);
            toast.success("Đã chia sẻ bài viết!");
          }}
        />
      )}
    </div>
  );
};

export default PostCard;
