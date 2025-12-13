import React, { useEffect, useState } from "react";
import { BadgeCheck, X, Eye, SendHorizontal, Heart } from "lucide-react";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { slugifyUser } from "../app/slugifyUser";
import api from "../api/axios";
import toast from "react-hot-toast";
import socket from "../sockethandler/socket";

const StoryViewer = ({ viewStory, setViewStory }) => {
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");

  const [showViewers, setShowViewers] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const [currentViewers, setCurrentViewers] = useState([]);
  const [currentLikes, setCurrentLikes] = useState([]);

  const currentUser = useSelector((state) => state.user.value);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const isMyStory = viewStory?.user?._id === currentUser?._id;

  // 1. Khởi tạo trạng thái ban đầu
  useEffect(() => {
    if (viewStory) {
      setCurrentViewers(viewStory.views_count || []);
      setCurrentLikes(viewStory.likes_count || []);

      const hasLiked = viewStory.likes_count?.some((liker) => {
        const likerId = liker._id || liker;
        return likerId === currentUser?._id;
      });
      setIsLiked(!!hasLiked);
    }
  }, [viewStory, currentUser]);

  useEffect(() => {
    if (!isMyStory || !viewStory) return; // Chỉ chủ story mới cần nghe event này

    const handleStoryUpdate = (data) => {
      // data = { storyId, views, likes } từ Backend gửi về
      if (data.storyId === viewStory._id) {
        // Cập nhật danh sách ngay lập tức
        setCurrentViewers(data.views);
        setCurrentLikes(data.likes);
      }
    };

    socket.on("story_stats_update", handleStoryUpdate);

    return () => {
      socket.off("story_stats_update", handleStoryUpdate);
    };
  }, [viewStory, isMyStory]);

  // 2. Logic Progress Bar (Giữ nguyên)
  useEffect(() => {
    let timer, progressInterval;

    if (
      viewStory &&
      viewStory.post_type !== "video" &&
      !isPaused &&
      !showViewers
    ) {
      const duration = 10000;
      const setTime = 100;

      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setViewStory(null);
            return 100;
          }
          return prev + (setTime / duration) * 100;
        });
      }, setTime);
    }

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [viewStory, setViewStory, isPaused, showViewers]);

  // 3. API View Story
  useEffect(() => {
    if (!viewStory || isMyStory) return;

    const recordView = async () => {
      try {
        const token = await getToken();
        const { data } = await api.put(
          `/api/story/view/${viewStory._id}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (data.success) {
          setCurrentViewers(data.views);
        }
      } catch (error) {
        console.error("Lỗi view story:", error);
      }
    };
    recordView();
  }, [viewStory?._id, isMyStory, getToken]);

  // 4. Handle Like
  const handleLike = async () => {
    // Optimistic UI: Đổi màu ngay lập tức
    setIsLiked((prev) => !prev);

    try {
      const token = await getToken();
      await api.put(
        `/api/story/like/${viewStory._id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error("Lỗi like story:", error);
      setIsLiked((prev) => !prev); // Revert nếu lỗi
      toast.error("Lỗi thả tim");
    }
  };

  // 5. Handle Reply
  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/message/send",
        {
          to_user_id: viewStory.user._id,
          text: replyText,
          storyId: viewStory._id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        toast.success("Đã gửi phản hồi!");
        setReplyText("");
        setIsPaused(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Lỗi gửi tin nhắn");
    }
  };

  const handleClose = () => {
    setProgress(0);
    setViewStory(null);
  };

  if (!viewStory) return null;

  const imageUrl = Array.isArray(viewStory.image_urls)
    ? viewStory.image_urls[0]
    : viewStory.image_urls;

  const renderContent = () => {
    if (viewStory.post_type === "image") {
      return (
        <img
          src={imageUrl}
          alt="story"
          className="max-w-full max-h-screen object-contain"
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-white text-2xl text-center font-medium">
        {viewStory.content}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 h-screen bg-black z-[100] flex items-center justify-center"
      style={{
        backgroundColor:
          viewStory.post_type === "text"
            ? viewStory.background_color
            : "#000000",
      }}
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-700 z-20">
        <div
          className="h-full bg-white transition-all duration-100 linear"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Header Info */}
      <div className="absolute cursor-pointer group top-4 left-4 flex items-center space-x-3 p-2 px-4 backdrop-blur-md rounded-full bg-black/20 z-20"
        onClick={() => navigate(`/profile-user/${slugifyUser(viewStory.user)}`)}>
        <img
          src={viewStory.user?.profile_picture}
          alt=""
          className="w-8 h-8 rounded-full object-cover border border-white"
        />
        <div className="text-white font-medium flex items-center gap-1.5">
          <span>{viewStory.user?.full_name}</span>
          <BadgeCheck size={16} className="text-blue-400" />
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 text-white z-20 p-2 hover:bg-white/10 rounded-full"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Content */}
      <div className="w-full h-full flex items-center justify-center relative">
        {renderContent()}
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black/80 to-transparent z-20">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {isMyStory ? (
            // VIEW CHỦ STORY
            <div
              onClick={() => {
                setShowViewers(true);
                setIsPaused(true);
              }}
              className="flex items-center gap-2 text-white cursor-pointer hover:bg-white/10 px-4 py-2 rounded-full transition mx-auto"
            >
              <Eye size={24} />
              <span className="font-semibold text-sm">
                {currentViewers.length} người xem
              </span>
            </div>
          ) : (
            // VIEW NGƯỜI XEM
            <>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => !replyText && setIsPaused(false)}
                  placeholder={`Gửi tin nhắn...`}
                  className="w-full bg-transparent border border-white/60 rounded-full px-5 py-3 text-white placeholder-gray-300 outline-none focus:border-white focus:bg-white/10 transition pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleReply()}
                />
                {replyText && (
                  <button
                    onClick={handleReply}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-indigo-400 p-1"
                  >
                    <SendHorizontal size={20} />
                  </button>
                )}
              </div>

              <button
                onClick={handleLike}
                className={`p-3 rounded-full transition transform active:scale-125 ${
                  isLiked
                    ? "bg-red-500/20 text-red-500"
                    : "hover:bg-white/10 text-white"
                }`}
              >
                <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal Danh sách người xem (Đã thêm tim bên cạnh) */}
      {showViewers && (
        <div className="absolute inset-0 bg-white z-30 flex flex-col animate-in slide-in-from-bottom duration-300 sm:max-w-md sm:mx-auto sm:h-[60vh] sm:mt-[20vh] sm:rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-lg text-gray-800">
              Người xem ({currentViewers.length})
            </h3>
            <button
              onClick={() => {
                setShowViewers(false);
                setIsPaused(false);
              }}
              className="p-1 hover:bg-gray-200 rounded-full"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {currentViewers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Eye size={48} className="mb-2 opacity-20" />
                <p>Chưa có ai xem tin này.</p>
              </div>
            ) : (
              currentViewers.map((viewer, index) => {
                // 👇 LOGIC CHECK LIKE TRONG DANH SÁCH VIEW
                // viewStory.likes_count là danh sách những người đã like (từ BE gửi về)
                // Ta check xem ID của viewer có nằm trong danh sách likes không
                const viewerLiked = viewStory.likes_count?.some((liker) => {
                  const likerId = liker._id || liker; // Handle populate or string ID
                  return likerId === viewer._id;
                });

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={viewer.profile_picture}
                        className="w-10 h-10 rounded-full object-cover border"
                        alt=""
                      />
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {viewer.full_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          @{viewer.username}
                        </p>
                      </div>
                    </div>
                    {/* ❤️ HIỆN TRÁI TIM NẾU ĐÃ LIKE */}
                    {viewerLiked && (
                      <Heart size={18} className="text-red-500 fill-red-500" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
