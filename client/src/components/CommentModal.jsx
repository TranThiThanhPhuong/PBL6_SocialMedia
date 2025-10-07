import React, { useState, useEffect } from "react";
import { X, Send, Heart } from "lucide-react";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { formatPostTime } from "../app/formatDate";

const CommentModal = ({ post, onClose, onCommentAdded }) => {
  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();

  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get(`/api/comment/${post._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setComments(data.comments);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const isLikedBy = (c) =>
    !!c.likes_count?.some((id) => id.toString() === currentUser._id);

  const handleAddComment = async () => {
    if (!images.length && !content.trim()) {
      return toast.error("Hãy thêm nội dung hoặc hình ảnh để đăng.");
    }

    const postType =
      images.length && content.trim()
        ? "text_with_image"
        : images.length
        ? "image"
        : "text";

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("postId", post._id);
      fd.append("content", content);
      fd.append("post_type", postType);
      images.forEach((img) => fd.append("images", img));

      const token = await getToken();
      const { data } = await api.post("/api/comment/add", fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        // ensure replies field exists for top-level
        const newComment = { ...data.comment, replies: [] };
        setComments((prev) => [newComment, ...prev]);
        setContent("");
        setImages([]);
        onCommentAdded && onCommentAdded(); // <-- thông báo parent tăng 1
        toast.success("Bình luận thành công!");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (parentCommentId) => {
    if (!replyText.trim()) return toast.error("Hãy nhập nội dung trả lời!");
    setReplyLoading(true);
    try {
      const fd = new FormData();
      fd.append("postId", post._id);
      fd.append("content", replyText);
      fd.append("post_type", "text");
      fd.append("parentComment", parentCommentId);

      const token = await getToken();
      const { data } = await api.post("/api/comment/add", fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        // cập nhật local state: thêm reply vào parent
        setComments((prev) =>
          prev.map((c) => {
            if (c._id === parentCommentId) {
              const newReplies = [...(c.replies || []), data.comment];
              return {
                ...c,
                replies: newReplies,
                reply_count: (c.reply_count || 0) + 1,
              };
            }
            return c;
          })
        );
        setReplyText("");
        setReplyingTo(null);
        onCommentAdded && onCommentAdded(); // reply cũng tăng tổng comment của post
        toast.success("Trả lời thành công!");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleLike = async (commentId) => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/comment/like",
        { commentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        const updated = data.comment; // populated comment object
        setComments((prev) =>
          prev.map((c) => {
            if (c._id === updated._id) {
              return { ...c, likes_count: updated.likes_count };
            }
            // check in replies
            if (c.replies?.some((r) => r._id === updated._id)) {
              const newReplies = c.replies.map((r) =>
                r._id === updated._id ? updated : r
              );
              return { ...c, replies: newReplies };
            }
            return c;
          })
        );
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-lg h-[80vh] rounded-2xl shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b">
          <h2 className="text-lg font-semibold">Bình luận</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Comment List */}
        <div className="px-5 py-4 flex-1 overflow-y-auto space-y-4">
          {comments.length === 0 && (
            <p className="text-gray-500 text-center">Chưa có bình luận nào.</p>
          )}
          {comments.map((cmt) => (
            <div key={cmt._id} className="flex items-start gap-3">
              <img
                src={cmt.user.profile_picture}
                alt="avatar"
                className="w-10 h-10 rounded-full shadow"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{cmt.user.full_name}</span>
                  <span className="text-gray-500 text-sm">
                    {formatPostTime(cmt.createdAt)}
                  </span>
                </div>

                <p className="text-sm text-gray-700">{cmt.content}</p>

                {cmt.image_urls?.length > 0 && (
                  <img
                    src={cmt.image_urls[0]}
                    alt="media"
                    className="mt-2 rounded-lg max-h-48 border"
                  />
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 mt-1">
                  <button
                    onClick={() => handleLike(cmt._id)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500"
                  >
                    <Heart
                      size={16}
                      fill={isLikedBy(cmt) ? "red" : "none"}
                      className={isLikedBy(cmt) ? "text-red-500" : ""}
                    />
                    <span>{cmt.likes_count?.length || 0}</span>
                  </button>

                  <button
                    className="text-sm text-blue-500 hover:underline"
                    onClick={() =>
                      setReplyingTo(replyingTo === cmt._id ? null : cmt._id)
                    }
                  >
                    {replyingTo === cmt._id ? "Hủy" : "Trả lời"}
                  </button>
                </div>

                {/* Reply Form */}
                {replyingTo === cmt._id && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={currentUser.profile_picture}
                      alt="me"
                      className="w-8 h-8 rounded-full"
                    />
                    <input
                      type="text"
                      className="flex-1 border rounded-full px-3 py-1 text-sm outline-none"
                      placeholder="Viết phản hồi..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button
                      disabled={replyLoading}
                      onClick={() => handleAddReply(cmt._id)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-full text-sm"
                    >
                      Gửi
                    </button>
                  </div>
                )}

                {/* Replies */}
                {cmt.replies?.length > 0 && (
                  <div className="ml-10 mt-2 space-y-2">
                    {cmt.replies.map((reply) => (
                      <div key={reply._id} className="flex items-start gap-2">
                        <img
                          src={reply.user.profile_picture}
                          alt="avatar"
                          className="w-8 h-8 rounded-full shadow"
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-sm">
                              {reply.user.full_name}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {formatPostTime(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input - add top-level comment */}
        <div className="p-4 border-t flex items-center gap-3">
          <img
            src={currentUser.profile_picture}
            alt="me"
            className="w-10 h-10 rounded-full shadow"
          />
          <input
            type="text"
            className="flex-1 outline-none border rounded-full px-4 py-2 text-sm"
            placeholder="Viết bình luận..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="commentImage"
            onChange={(e) => {
              if (e.target.files[0]) {
                setImages([e.target.files[0]]); // chỉ giữ 1 ảnh duy nhất
              }
            }}
          />
          <label
            htmlFor="commentImage"
            className="cursor-pointer text-sm text-blue-500"
          >
            {images.length > 0 ? (
              <img
                src={URL.createObjectURL(images[0])}
                alt="preview"
                className="w-10 h-10 object-cover rounded-md border cursor-pointer"
                onClick={(e) => {
                  e.preventDefault(); // ngăn label trigger lại input
                  setImages([]); // click ảnh sẽ xoá ảnh đã chọn
                }}
              />
            ) : (
              <span className="text-sm text-blue-500">Ảnh</span>
            )}
          </label>
          <button
            disabled={loading}
            onClick={handleAddComment}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-full text-sm cursor-pointer transition"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
