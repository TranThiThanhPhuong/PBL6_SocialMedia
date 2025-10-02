import React, { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { formatPostTime } from "../app/formatDate";

const CommentModal = ({ post, setShowCommentModal }) => {
  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const fetchComments = async () => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        `/api/comment/get`,
        { postId: post._id },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (data.success) {
        setComments(data.comments);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      return;
    }
    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/comment/add",
        {
          postId: post._id,
          text: newComment,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (data.success) {
        setComments([data.comment, ...comments]);
        setNewComment("");
        toast.success("Bình luận đã được thêm");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Bình luận</h2>
          <button onClick={() => setShowCommentModal(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 h-96 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment._id} className="flex items-start gap-3 mb-4">
              <img
                src={comment.user.profile_picture}
                className="w-10 h-10 rounded-full shadow"
              />
              <div>
                <div className="flex items-center space-x-1">
                  <span className="font-semibold">{comment.user.full_name}</span>
                  <span className="text-gray-500 text-sm">
                    • {formatPostTime(comment.createdAt)}
                  </span>
                </div>
                <p>{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex items-center gap-3">
          <img
            src={currentUser.profile_picture}
            className="w-10 h-10 rounded-full shadow"
          />
          <input
            type="text"
            className="flex-1 outline-none text-slate-700 border rounded-full px-4 py-2"
            placeholder="Viết bình luận..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            onClick={handleAddComment}
            className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-800 active:scale-95 cursor-pointer text-white p-2 rounded-full"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;