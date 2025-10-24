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
  const [status, setStatus] = useState({ type: "", message: "" });

  const violationMessages = {
    khieu_dam_doi_truy: "Bình luận chứa nội dung khiêu dâm / đồi trụy!",
    ngon_tu_thu_ghet: "Bình luận chứa ngôn từ thù ghét / kích động!",
    nhay_cam_chinh_tri: "Bình luận chứa nội dung nhạy cảm chính trị!",
    bao_luc: "Bình luận chứa nội dung bạo lực / tàn ác!",
  };

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyImages, setReplyImages] = useState([]);
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

  const isLikedBy = (commentOrReply) => {
    return Array.isArray(commentOrReply.likes_count)
      ? commentOrReply.likes_count.some(
          (id) => id.toString() === currentUser._id
        )
      : false;
  };

  const handleAddComment = async () => {
    if (!images.length && !content.trim()) {
      return toast.error("Hãy thêm nội dung hoặc hình ảnh để bình luận.");
    }

    setLoading(true);
    setStatus({ type: "checking", message: "Đang kiểm duyệt nội dung..." });

    const postType =
      images.length && content.trim()
        ? "text_with_image"
        : images.length
        ? "image"
        : "text";

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
        const newComment = { ...data.comment, replies: [] };
        setComments((prev) => [newComment, ...prev]);
        setContent("");
        setImages([]);
        setStatus({ type: "success", message: "Trả lời thành công!" });
        toast.success("Bình luận thành công!");

        // ✅ Gọi callback cập nhật tổng số comment ở PostCard
        if (typeof onCommentAdded === "function") {
          onCommentAdded();
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("❌ Lỗi khi đăng:", error);
      if (error.response?.status === 400) {
        const { labels, message } = error.response.data;
        let errorMsg = "Phản hồi chứa nội dung vi phạm!";

        if (labels?.length > 0) {
          const mapped = labels
            .map((l) => violationMessages[l] || `Nội dung vi phạm: ${l}`)
            .join("<br/>");
          errorMsg = mapped;
        } else if (message) {
          errorMsg = message;
        }
        setStatus({ type: "violated", message: errorMsg });
        toast.custom((t) => (
          <div
            className="bg-red-50 border border-red-300 text-red-700 rounded-md px-4 py-3 text-lag"
            dangerouslySetInnerHTML={{ __html: errorMsg }}
          ></div>
        ));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (parentCommentId) => {
    if (!replyImages.length && !replyText.trim()) {
      return toast.error(
        "Hãy thêm nội dung hoặc hình ảnh để trả lời bình luận."
      );
    }
    setReplyLoading(true);
    setStatus({ type: "checking", message: "Đang kiểm duyệt nội dung..." });

    const postType =
      replyImages.length && replyText.trim()
        ? "text_with_image"
        : replyImages.length
        ? "image"
        : "text";

    try {
      const fd = new FormData();
      fd.append("postId", post._id);
      fd.append("content", replyText);
      fd.append("post_type", postType);
      fd.append("parentComment", parentCommentId);
      replyImages.forEach((img) => fd.append("images", img));

      const token = await getToken();
      const { data } = await api.post("/api/comment/add", fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
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
        setReplyImages([]);
        setReplyingTo(null);
        setStatus({ type: "success", message: "Trả lời thành công!" });
        toast.success("Trả lời thành công!");

        // ✅ Gọi callback cập nhật tổng số comment ở PostCard
        if (typeof onCommentAdded === "function") {
          onCommentAdded();
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("❌ Lỗi khi đăng:", error);
      if (error.response?.status === 400) {
        const { labels, message } = error.response.data;
        let errorMsg = "Phản hồi chứa nội dung vi phạm!";

        if (labels?.length > 0) {
          const mapped = labels
            .map((l) => violationMessages[l] || `Nội dung vi phạm: ${l}`)
            .join("<br/>");
          errorMsg = mapped;
        } else if (message) {
          errorMsg = message;
        }

        toast.error("🚫 " + errorMsg.replace(/<br\/>/g, " "));
        setStatus({ type: "violated", message: errorMsg });
      }
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
        const updated = data.comment;
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
        {/* Header - Căn giữa tiêu đề và làm mờ đường phân cách */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 relative">
          <h2 className="text-lg font-semibold flex-grow text-center">
            Bình luận
          </h2>
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition"
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
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="replyImage"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setReplyImages([e.target.files[0]]); // chỉ giữ 1 ảnh duy nhất
                        }
                      }}
                    />
                    <label
                      htmlFor="replyImage"
                      className="cursor-pointer text-sm text-blue-500"
                    >
                      {replyImages.length > 0 ? (
                        <img
                          src={URL.createObjectURL(replyImages[0])}
                          alt="preview"
                          className="w-10 h-10 object-cover rounded-md border cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault(); // ngăn label trigger lại input
                            setReplyImages([]);
                            []; // click ảnh sẽ xoá ảnh đã chọn
                          }}
                        />
                      ) : (
                        <span className="text-sm text-blue-500">Ảnh</span>
                      )}
                    </label>
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

                          {/* Ảnh trong reply */}
                          {reply.image_urls?.length > 0 && (
                            <img
                              src={reply.image_urls[0]}
                              alt="reply media"
                              className="mt-1 rounded-md max-h-32 border"
                            />
                          )}

                          {/* Like button */}
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => handleLike(reply._id)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition"
                            >
                              <Heart
                                size={14}
                                fill={isLikedBy(reply) ? "red" : "none"}
                                className={
                                  isLikedBy(reply) ? "text-red-500" : ""
                                }
                              />
                              <span>{reply.likes_count?.length || 0}</span>
                            </button>
                          </div>
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
        <div className="p-4 border-t border-gray-100 flex items-center gap-3">
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
