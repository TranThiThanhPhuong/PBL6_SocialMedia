import React, { useState, useEffect } from "react";
import {
  X,
  Link,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  ArrowRight,
  UserPlus,
  Globe,
  Zap,
  BookUser,
  ArrowUpRight,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { assets } from "../assets/assets";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";

const SharePostModal = ({ post, onClose }) => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const currentUser = useSelector((state) => state.user.value);
  const [shareText, setShareText] = useState("");
  const postUrl = `${window.location.origin}/post/${post._id}`;

  const handleShareToTimeline = async () => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        `/api/post/share/${post._id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (data.success) {
        toast.success("Đã chia sẻ bài viết!");
        onClose();
      } else toast.error(data.message);
    } catch (error) {
      toast.error("Lỗi khi chia sẻ bài viết!");
    }
  };

  const handleShareToExternal = (platform) => {
    const text = shareText
      ? shareText
      : `Hãy xem bài viết này: ${post.content.slice(0, 100)}...`;
    let url = "";

    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          postUrl
        )}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          postUrl
        )}&text=${encodeURIComponent(text)}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          postUrl
        )}`;
        break;
      case "zalo":
        // Zalo thường dùng API riêng, đây là ví dụ của một URL share
        url = `https://zalo.me/share?url=${encodeURIComponent(
          postUrl
        )}&text=${encodeURIComponent(text)}`;
        break;
      default:
        break;
    }

    if (url) {
      window.open(url, "_blank");
      onClose();
    } else {
      toast.error("Nền tảng chia sẻ không được hỗ trợ.");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(postUrl);
    toast.success("Đã sao chép liên kết!");
    onClose();
  };

  const [recentRecipients, setRecentRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchRecent = async () => {
      setRecipientsLoading(true);
      try {
        const token = await getToken();
        const { data } = await api.get("/api/user/recent-messages", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success && Array.isArray(data.messages)) {
          // group by sender id and pick latest message per sender
          const grouped = data.messages.reduce((acc, msg) => {
            const sender = msg.from_user_id;
            const id = sender._id;
            if (!acc[id] || new Date(msg.createdAt) > new Date(acc[id].createdAt)) {
              acc[id] = msg;
            }
            return acc;
          }, {});

          const sorted = Object.values(grouped)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((m) => m.from_user_id)
            .slice(0, 6);

          if (mounted) setRecentRecipients(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch recent recipients", err);
      } finally {
        if (mounted) setRecipientsLoading(false);
      }
    };

    fetchRecent();
    return () => {
      mounted = false;
    };
  }, [getToken]);

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 overflow-y-auto py-8">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-lg flex flex-col">
        {/* HEADER - Chia sẻ (đã căn giữa) */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 relative">
          <h2 className="text-lg font-semibold flex-grow text-center">
            Chia sẻ
          </h2>
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* PHẦN CHIA SẺ LÊN BẢNG TIN */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <img
              src={currentUser.profile_picture}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900">
                {currentUser.full_name}
              </span>
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-600 border border-gray-300 rounded-full px-2 py-1 w-fit">
                <Globe size={17} />
                Bảng feed
              </div>
            </div>
          </div>
          <div className="mt-4">
            <textarea
              className="w-full p-2 border-none resize-none focus:outline-none placeholder-gray-500"
              placeholder="Hãy nói gì đó về nội dung này..."
              rows="2"
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleShareToTimeline}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              Chia sẻ ngay
            </button>
          </div>
        </div>

        {/* PHẦN GỬI QUA TIN NHẮN */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-lg mb-4">Gửi qua tin nhắn</h3>
          <div className="flex overflow-x-auto gap-4 no-scrollbar items-center">
            {recipientsLoading ? (
              <div className="text-sm text-gray-500">Đang tải...</div>
            ) : recentRecipients.length > 0 ? (
              recentRecipients.map((friend) => (
                <div
                  key={friend._id}
                  className={`flex-shrink-0 w-20 text-center cursor-pointer transition-all ${selectedRecipient === friend._id ? 'scale-105' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedRecipient(selectedRecipient === friend._id ? null : friend._id)}
                    className="relative mx-auto w-16 h-16 rounded-full overflow-hidden focus:outline-none"
                  >
                    <img
                      src={friend.profile_picture}
                      className={`w-16 h-16 rounded-full object-cover transition-shadow ${selectedRecipient === friend._id ? 'ring-4 ring-indigo-500 ring-offset-2 shadow-lg' : ''}`}
                    />
                    {selectedRecipient === friend._id && (
                      <span className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-0.5">
                        <Check size={14} className="text-white" />
                      </span>
                    )}
                  </button>
                  <p className="text-sm mt-1 truncate">{friend.full_name}</p>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">Chưa có người nhắn tin gần đây</div>
            )}

            <div className="flex-shrink-0 w-20 flex items-center justify-center">
              <button
                onClick={async () => {
                  if (!selectedRecipient) return toast.error('Vui lòng chọn người nhận');
                  try {
                    const token = await getToken();
                    const text = shareText
                      ? shareText
                      : `Đã chia sẻ bài viết cho bạn\n\n${(post.content || '').slice(0, 120)}`;

                    const body = { to_user_id: selectedRecipient, text, reply_to_post: post._id };
                    // include first image as media preview if available
                    if (post.image_urls && post.image_urls.length > 0) body.media_url = post.image_urls[0];

                    const { data } = await api.post('/api/message/send', body, { headers: { Authorization: `Bearer ${token}` } });
                    if (data.success) {
                      toast.success('Đã gửi tin nhắn riêng');
                      onClose();
                    } else {
                      toast.error(data.message || 'Không thể gửi tin nhắn');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Lỗi khi gửi tin nhắn');
                  }
                }}
                className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300 transition"
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* PHẦN CHIA SẺ LÊN NỀN TẢNG KHÁC */}
        <div className="p-4">
          <h3 className="font-bold text-lg mb-4">Chia sẻ lên</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
            <button
              onClick={() => toast.success("Đã chia sẻ lên Story")}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center text-white">
                <Zap size={24} />
              </div>
              <p className="text-xs text-gray-700">Story của bạn</p>
            </button>
            <button
              onClick={() => handleShareToExternal("facebook")}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Facebook size={24} />
              </div>
              <p className="text-xs text-gray-700">Facebook</p>
            </button>
            <button
              onClick={() => handleShareToExternal("twitter")}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-sky-400 flex items-center justify-center text-white">
                <Twitter size={24} />
              </div>
              <p className="text-xs text-gray-700">X</p>
            </button>
            <button
              onClick={() => handleShareToExternal("linkedin")}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white">
                <Linkedin size={24} />
              </div>
              <p className="text-xs text-gray-700">LinkedIn</p>
            </button>
            <button
              onClick={copyToClipboard}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <Link size={24} className="-rotate-45" />
              </div>
              <p className="text-xs text-gray-700">Sao chép liên kết</p>
            </button>
            <button
              onClick={() => handleShareToExternal("zalo")}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center text-white">
                <svg
                  viewBox="0 0 100 100"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                >
                  <path d="M50 0C22.38 0 0 22.38 0 50s22.38 50 50 50 50-22.38 50-50S77.62 0 50 0zM30.73 37.04c-.4.4-1.04.4-1.44 0L19.5 27.25c-.4-.4-.4-1.04 0-1.44s1.04-.4 1.44 0L30.73 35.6c.4.4.4 1.04 0 1.44zM72.27 37.04c.4.4 1.04.4 1.44 0l9.8-9.8c.4-.4.4-1.04 0-1.44s-1.04-.4-1.44 0L72.27 35.6c-.4.4-.4 1.04 0 1.44zM50 38.32c-6.8 0-12.33 5.53-12.33 12.33s5.53 12.33 12.33 12.33 12.33-5.53 12.33-12.33-5.53-12.33-12.33-12.33zm-1.85 10.3c.6.6 1.57.6 2.17 0l11.4-11.4c.6-.6.6-1.57 0-2.17s-1.57-.6-2.17 0L50 46.46 38.56 35.02c-.6-.6-1.57-.6-2.17 0s-.6 1.57 0 2.17l11.4 11.4zM50 63.8c-2.73 0-4.95-2.22-4.95-4.95s2.22-4.95 4.95-4.95 4.95 2.22 4.95 4.95-2.22 4.95-4.95 4.95zM22.25 74.5c.4-.4.4-1.04 0-1.44s-1.04-.4-1.44 0L10 83.25c-.4.4-.4 1.04 0 1.44s1.04.4 1.44 0L22.25 74.5zM77.75 74.5c-.4-.4-1.04-.4-1.44 0L65.5 83.25c-.4.4-.4 1.04 0 1.44s1.04.4 1.44 0L77.75 74.5zM50 81.65c-4.95 0-8.98-4.03-8.98-8.98s4.03-8.98 8.98-8.98 8.98 4.03 8.98 8.98-4.03 8.98-8.98 8.98z" />
                </svg>
              </div>
              <p className="text-xs text-gray-700">Zalo</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePostModal;