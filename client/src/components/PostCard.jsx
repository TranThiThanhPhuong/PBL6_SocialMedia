import React, { useState } from "react";
import { BadgeCheck, Heart, MessageCircle, Share2Icon, Share2 } from "lucide-react";
import { formatPostTime } from "../app/formatDate";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import CommentModal from "./CommentModal";
import SharePostModal from "./SharePostModal";

const PostCard = ({ post }) => {
  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();

  const postWithHashtags = post.content.replace(
    /(#\w+)/g,
    '<span class="text-indigo-600">$1</span>'
  );
  const [likes, setLikes] = useState(post.likes_count);
  const [cmts, setCmts] = useState(post.comments_count || 0);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleLike = async () => {
    try {
      const { data } = await api.post(
        "/api/post/like",
        { postId: post._id },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      if (data.success) {
        toast.success(data.message);
        setLikes((prev) => {
          if (prev.includes(currentUser._id)) {
            return prev.filter((id) => id !== currentUser._id);
          } else {
            return [...prev, currentUser._id];
          }
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4 w-full max-w-2xl">
      {/* User Info */}
      <div
        onClick={() => navigate("/profile/" + post.user._id)}
        className="inline-flex items-center gap-3 cursor-pointer"
      >
        <img
          src={post.user.profile_picture}
          className="w-10 h-10 rounded-full shadow"
        />
        <div>
          <div className="flex items-center space-x-1">
            <span>{post.user.full_name}</span>
            <BadgeCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-gray-500 text-sm">
            @{post.user.username} • {formatPostTime(post.createdAt)}
          </div>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div
          className="text-gray-800 text-sm whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: postWithHashtags }}
        />
      )}

      {/* Images */}
      <div className="grid grid-cols-2 gap-2">
        {post.image_urls.map((img, index) => (
          <img
            src={img}
            key={index}
            className={`w-full h-48 object-cover rounded-lg ${
              post.image_urls.length === 1 && "col-span-2 h-auto"
            }`}
          />
        ))}
      </div>

      {/* Stats Section (New) */}
      <div className="flex justify-between items-center text-gray-600 text-sm mb-2">
      <div className="flex items-center gap-1">
        {/* Nút thích đã được thay thế bằng biểu tượng trái tim */}
        <span className="font-semibold">{post.likes_count?.length || 0} lượt thích</span>
      </div>
      <div className="flex gap-4">
        <span>{post.comments_count || 0} bình luận</span>
        <span>{post.shares_count || 0} lượt chia sẻ</span>
      </div>
    </div>

    <hr className="border-t border-gray-200" />

      {/* Actions */}
      <div className="flex justify-around items-center pt-3 text-gray-600 font-medium">
        <button
          onClick={handleLike}
          className={`flex items-center justify-center gap-2 w-1/3 py-2 rounded-lg hover:bg-gray-100 transition ${
            likes.includes(currentUser._id) ? "text-black-500" : ""
          }`}
        >
          <Heart
            className="w-5 h-5"
            fill={likes.includes(currentUser._id) ? "#f63b3bff" : "none"}
            stroke={likes.includes(currentUser._id) ? "#f63b3bff" : "currentColor"}
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

      {/* Comment Modal */}
      {showCommentModal && (
        <CommentModal
          post={post}
          onClose={() => setShowCommentModal(false)}
          onCommentAdded={() => setCmts((prev) => prev + 1)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <SharePostModal
          post={post}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default PostCard;