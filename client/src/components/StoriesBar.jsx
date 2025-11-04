import React, { useState, useEffect } from "react";
import { Plus, MoreHorizontal, AlertTriangle, MessageCircle, EyeOff, Copyright } from "lucide-react";
import StoryModal from "./StoryModal";
import StoryViewer from "./StoryViewer";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { formatPostTime } from "../app/formatDate";

const StoriesBar = () => {
  const { getToken, userId } = useAuth();

  const [stories, setStories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewStory, setViewStory] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedReason, setSelectedReason] = useState("");

  const violationMessages = {
    spam: "Spam hoặc nội dung gây phiền nhiễu",
    harassment: "Ngôn từ xúc phạm hoặc quấy rối",
    sensitive: "Nội dung nhạy cảm hoặc phản cảm",
    copyright: "Vi phạm bản quyền",
  };

  const violationIcons = {
    spam: <AlertTriangle className="w-4 h-4 text-red-500 inline" />,
    harassment: <MessageCircle className="w-4 h-4 text-orange-500 inline" />,
    sensitive: <EyeOff className="w-4 h-4 text-blue-500 inline" />,
    copyright: <Copyright className="w-4 h-4 text-purple-500 inline" />,
  };

  const fetchStories = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/api/story/get", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setStories(data.stories);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteStory = async (storyId) => {
    try {
      const token = await getToken();
      const { data } = await api.delete(`/api/story/delete/${storyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        toast.success("Đã xóa tin thành công!");
        setStories((prev) => prev.filter((s) => s._id !== storyId));
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReportSubmit = async () => {
    if (!selectedReason) return toast.error("Vui lòng chọn lý do báo cáo!");
    try {
      const token = await getToken();
      const { data } = await api.post(
        `/api/report/story`,
        { storyId: selectedStory._id, reason: selectedReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Đã gửi báo cáo thành công!");
        setShowReportModal(false);
        setSelectedStory(null);
        setSelectedReason("");
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  return (
    <div className="w-screen sm:w-[calc(100vw-240px)] lg:max-w-2xl no-scrollbar overflow-x-auto px-4">
      <div className="flex gap-4 pb-5">
        {/* Add Story Card */}
        <div
          onClick={() => setShowModal({ mode: "add" })}
          className="rounded-lg shadow-sm min-w-30 max-w-30 max-h-40 aspect-[3/4] cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-dashed border-indigo-300 bg-gradient-to-b from-indigo-50 to-white"
        >
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="size-10 bg-indigo-500 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-700 text-center">
              Tạo tin
            </p>
          </div>
        </div>

        {/* Story Cards */}
        {stories.map((story) => (
          <div
            key={story._id}
            className="relative rounded-xl shadow-lg hover:shadow-2xl min-w-30 max-w-30 max-h-40 cursor-pointer transform hover:scale-105 transition-all duration-300"
            style={{
              background:
                story.post_type === "text"
                  ? `linear-gradient(135deg, ${story.background_color}, ${story.background_color}99)`
                  : "linear-gradient(to bottom, #6366f1, #9333ea)",
              boxShadow: `0 0 15px ${story.background_color}66`,
            }}
          >
            {/* Avatar */}
            <img
              src={story.user.profile_picture}
              className="absolute size-8 top-3 left-3 z-10 rounded-full ring ring-gray-100 shadow"
              alt="avatar"
            />

            {/* 3 Dots Menu */}
            <div
              className="absolute top-2 right-2 z-20 bg-white/30 rounded-full p-1 hover:bg-white/60"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(menuOpen === story._id ? null : story._id);
              }}
            >
              <MoreHorizontal className="w-5 h-5 text-white" />
            </div>

            {/* Dropdown Menu */}
            {menuOpen === story._id && (
              <div className="absolute right-3 top-8 bg-white shadow-md rounded-md z-30 text-sm text-slate-700 w-36">
                {story.user._id === userId ? (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(null);
                        handleDeleteStory(story._id);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50"
                    >
                      ❌ Xóa tin
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      setSelectedStory(story);
                      setShowReportModal(true);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-yellow-50"
                  >
                    🚩 Báo cáo
                  </button>
                )}
              </div>
            )}

            {/* Story preview */}
            <div
              onClick={() => setViewStory(story)}
              className="absolute inset-0 rounded-xl overflow-hidden"
            >
              {story.post_type !== "text" && (
                <img
                  src={story.image_urls}
                  className="h-full w-full object-cover hover:scale-110 transition duration-500 opacity-70 hover:opacity-80"
                />
              )}
              <p className="absolute top-16 left-3 text-white/80 text-sm truncate max-w-24">
                {story.content}
              </p>
              <p className="text-white absolute bottom-1 right-2 z-10 text-xs">
                {formatPostTime(story.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <StoryModal
          setShowModal={setShowModal}
          fetchStories={fetchStories}
          story={showModal.story}
          mode={showModal.mode}
        />
      )}

      {/* View Story */}
      {viewStory && (
        <StoryViewer viewStory={viewStory} setViewStory={setViewStory} />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-[90%] max-w-md p-6 relative">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 text-center">
              Báo cáo tin
            </h3>
            <p className="text-sm text-gray-500 mb-3 text-center">
              Chọn lý do bạn muốn báo cáo tin này:
            </p>

            <div className="space-y-2 mb-4">
              {Object.entries(violationMessages).map(([key, text]) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 border p-2 rounded-lg cursor-pointer ${
                    selectedReason === key
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
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedReason("");
                  setSelectedStory(null);
                }}
                className="px-3 py-1 text-gray-500 hover:underline"
              >
                Hủy
              </button>
              <button
                onClick={handleReportSubmit}
                className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesBar;