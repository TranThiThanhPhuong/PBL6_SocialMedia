import React, { useState } from "react";
import {
  BadgeCheck,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Trash2,
  Edit3,
  Flag,
} from "lucide-react";
import { formatPostTime } from "../app/formatDate";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";
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

const PostCard = ({ post, onPostDeleted, onPostUpdated }) => {
  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();
  const navigate = useNavigate();

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
  const [editContent, setEditContent] = useState(post.content);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);

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
    try {
      const formData = new FormData();
      formData.append("content", editContent);
      const { data } = await api.put(`/api/post/update/${post._id}`, formData, {
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

  // 🚨 Gửi báo cáo bài viết
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
      toast.error("Lỗi khi gửi báo cáo!");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-2xl relative">
      {/* User Info */}
      <div className="flex justify-between items-start">
        <div className="inline-flex items-center gap-3">
          <img
            src={post.user.profile_picture}
            onClick={() => {
              if (post.user._id === currentUser._id) {
                navigate("/profile");
              } else {
                const slug = post.user.username
                  ? post.user.username
                  : post.user.full_name.toLowerCase().replace(/\s+/g, "-");
                navigate(`/profile-user/${slug}`);
              }
            }}
            className="w-10 h-10 rounded-full shadow cursor-pointer"
          />
          <div>
            <div className="flex items-center space-x-1">
              <span
                className="cursor-pointer font-semibold"
                onClick={() => {
                  if (post.user._id === currentUser._id) {
                    navigate("/profile");
                  } else {
                    const slug = post.user.username
                      ? post.user.username
                      : post.user.full_name.toLowerCase().replace(/\s+/g, "-");
                    navigate(`/profile-user/${slug}`);
                  }
                }}
              >
                {post.user.full_name}
              </span>
              <BadgeCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-gray-500 text-sm">
              @{post.user.username} • {formatPostTime(post.createdAt)}
            </div>
          </div>
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
            <div className="absolute right-0 mt-2 bg-white shadow rounded-lg border text-sm z-50">
              {post.user._id === currentUser._id ? (
                <>
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setShowOptions(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full"
                  >
                    <Edit3 className="w-4 h-4" /> Sửa
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full"
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
                  className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full"
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
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
            rows="3"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditMode(false)}
              className="px-3 py-1 text-gray-500 hover:underline"
            >
              Hủy
            </button>
            <button
              onClick={handleUpdate}
              className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
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
      {post.image_urls && post.image_urls.length > 0 && (
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

      {/* Stats */}
      <div className="flex justify-between items-center text-gray-600 text-sm mb-2">
        <span className="font-semibold">{likes.length || 0} lượt thích</span>
        <div className="flex gap-4">
          <span>{cmts || 0} bình luận</span>
          <span>{shares || 0} chia sẻ</span>
        </div>
      </div>

      <hr className="border-t border-gray-200" />

      {/* Actions */}
      <div className="flex justify-around items-center pt-3 text-gray-600 font-medium">
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

        <button
          onClick={() => setShowCommentModal(true)}
          className="flex items-center justify-center gap-2 w-1/3 py-2 rounded-lg hover:bg-gray-100 transition"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Bình luận</span>
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center justify-center gap-2 w-1/3 py-2 rounded-lg hover:bg-gray-100 transition"
        >
          <Share2 className="w-5 h-5" />
          <span>Chia sẻ</span>
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-[90%] max-w-md p-6 relative">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 text-center">
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
                  <span className="text-sm">
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
        <SharePostModal post={post} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
};

export default PostCard;
