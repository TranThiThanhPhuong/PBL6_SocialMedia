import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Image,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Globe,
  Users,
  Lock,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const CreatePost = () => {
  const user = useSelector((state) => state.user.value);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [privacy, setPrivacy] = useState("public");
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const MAX_CHARS = 5000;
  const MAX_IMAGES = 4;

  const violationMessages = {
    khieu_dam_doi_truy: "Bài viết chứa nội dung khiêu dâm / đồi trụy!",
    ngon_tu_thu_ghet: "Bài viết chứa ngôn từ thù ghét / kích động!",
    nhay_cam_chinh_tri: "Bài viết chứa nội dung nhạy cảm chính trị!",
    bao_luc: "Bài viết chứa nội dung bạo lực / tàn ác!",
  };

  const violationIcons = {
    khieu_dam_doi_truy: "🔞",
    ngon_tu_thu_ghet: "⚠️",
    nhay_cam_chinh_tri: "🚫",
    bao_luc: "⛔",
  };

  // Load draft từ localStorage khi component mount
  useEffect(() => {
    const draft = localStorage.getItem('draft_post');
    if (draft) {
      try {
        const { content: savedContent, privacy: savedPrivacy } = JSON.parse(draft);
        if (savedContent) {
          setContent(savedContent);
          setPrivacy(savedPrivacy || "public");
          toast.success("📝 Đã khôi phục bản nháp");
        }
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.trim() || images.length > 0) {
        localStorage.setItem('draft_post', JSON.stringify({
          content,
          privacy,
          timestamp: new Date().toISOString()
        }));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, privacy, images]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/")
    );

    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Tối đa ${MAX_IMAGES} ảnh!`);
      return;
    }

    setImages((prev) => [...prev, ...files]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearForm = () => {
    setContent("");
    setImages([]);
    setStatus({ type: "", message: "" });
    setPrivacy("public");
    localStorage.removeItem('draft_post');
    toast.success("Đã xóa nội dung");
  };

  const isValidPost = () => {
    if (!content.trim() && images.length === 0) return false;
    if (content.length > MAX_CHARS) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isValidPost()) {
      return toast.error("Hãy thêm văn bản hoặc hình ảnh để đăng bài.");
    }

    setLoading(true);
    setStatus({ type: "checking", message: "Đang kiểm duyệt nội dung..." });

    const postType =
      images.length && content
        ? "text_with_image"
        : images.length
          ? "image"
          : "text";

    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("post_type", postType);
      formData.append("privacy", privacy);
      images.forEach((img) => formData.append("images", img));

      const { data } = await api.post("/api/post/add", formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setStatus({ type: "success", message: "Đăng bài thành công!" });
        setShowSuccessModal(true);
        localStorage.removeItem('draft_post');

        setTimeout(() => {
          toast.success("✅ Đăng bài thành công!");
          navigate("/");
        }, 2000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("❌ Lỗi khi đăng:", error);

      if (error.response?.status === 400) {
        const ai = error.response.data;
        const textViolations = ai?.detail?.textViolations || [];
        const imageViolations = ai?.detail?.imageViolations || [];

        let detailMsg = "";

        if (content.trim() !== "") {
          if (textViolations.length > 0) {
            detailMsg += "📝 <b>Văn bản:</b><br/>";
            textViolations.forEach((v) => {
              const icon = violationIcons[v.label] || "⚠️";
              detailMsg += `• ${icon} "${v.sentence}" → ${violationMessages[v.label] || v.label
                }<br/>`;
            });
          } else {
            detailMsg += "📝 <b>Văn bản:</b> An toàn ✅<br/>";
          }
        }

        if (images.length > 0) {
          if (imageViolations.length > 0) {
            detailMsg += "🖼️ <b>Ảnh:</b><br/>";
            imageViolations.forEach((v) => {
              const icon = violationIcons[v.label] || "⚠️";
              detailMsg += `• ${icon} ${v.image_name ? v.image_name : "Ảnh"}: ${violationMessages[v.label] || v.label
                }<br/>`;
            });
          } else {
            detailMsg += "🖼️ <b>Ảnh:</b> An toàn ✅<br/>";
          }
        }

        toast.error("Bài viết chứa nội dung vi phạm.");
        setStatus({
          type: "violated",
          message: detailMsg || "Bài viết vi phạm nội dung.",
        });
      } else {
        toast.error("⚠️ Lỗi khi đăng bài.");
        setStatus({ type: "error", message: "Lỗi khi đăng bài." });
      }
    }

    setLoading(false);
  };

  const privacyOptions = [
    { value: "public", label: "Công khai", icon: Globe },
    { value: "friends", label: "Bạn bè", icon: Users },
    { value: "private", label: "Chỉ mình tôi", icon: Lock },
  ];

  const PrivacyIcon = privacyOptions.find((p) => p.value === privacy)?.icon || Globe;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 overflow-hidden">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Tạo bài viết
          </h1>
          <p className="text-slate-600">Chia sẻ bài viết với mọi người</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 overflow-hidden">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-6">
            <img
              src={user.profile_picture}
              alt=""
              className="w-12 h-12 rounded-full shadow-md ring-2 ring-indigo-100"
            />
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">{user.full_name}</h2>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>

            {/* Privacy Selector */}
            <div className="relative">
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="appearance-none text-sm pl-3 pr-8 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-transparent cursor-pointer bg-white"
              >
                {privacyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <PrivacyIcon className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Textarea */}
          <textarea
            className="w-full resize-none h-40 text-base outline-none placeholder-gray-400 border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
            placeholder="Bạn đang nghĩ gì?"
            onChange={(e) => setContent(e.target.value)}
            value={content}
            maxLength={MAX_CHARS}
          />

          {/* Character Counter */}
          <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
            <span className={content.length > MAX_CHARS * 0.9 ? "text-orange-500 font-medium" : ""}>
              {content.length} / {MAX_CHARS} ký tự
            </span>
            {content.trim() && (
              <span className="text-green-600">✓ Có nội dung</span>
            )}
          </div>

          {/* Image Preview Grid */}
          {/* NEW CODE - Paste đoạn này */}
          {images.length > 0 && (
            <div className="mt-4 w-full max-w-2xl">
              <div
                className={`grid gap-3 ${images.length === 1
                  ? "grid-cols-1"
                  : images.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-3"
                  }`}
              >
                {images.map((image, i) => (
                  <div
                    key={i}
                    className="relative group w-full overflow-hidden rounded-xl"
                    style={{
                      aspectRatio: images.length === 1 ? '16/9' : '1/1',
                      maxHeight: images.length === 1 ? '400px' : '200px'
                    }}
                  >
                    <img
                      src={URL.createObjectURL(image)}
                      className="absolute inset-0 w-full h-full object-cover shadow-md"
                      alt=""
                    />
                    <button
                      onClick={() =>
                        setImages(images.filter((_, index) => index !== i))
                      }
                      className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110 z-10"
                    >
                      <X className="text-white size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drag & Drop Zone */}
          {images.length < MAX_IMAGES && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-all ${isDragging
                ? "border-indigo-500 bg-indigo-50 scale-[1.02]"
                : "border-gray-300 hover:border-indigo-300 hover:bg-slate-50"
                }`}
            >
              <Upload className={`mx-auto size-10 mb-2 ${isDragging ? "text-indigo-500" : "text-gray-400"}`} />
              <p className="text-sm text-gray-600">
                Kéo thả ảnh vào đây hoặc{" "}
                <label htmlFor="images" className="text-indigo-600 font-medium cursor-pointer hover:text-indigo-700">
                  chọn file
                </label>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Tối đa {MAX_IMAGES} ảnh • JPG, PNG, GIF
              </p>
            </div>
          )}

          <input
            type="file"
            id="images"
            accept="image/*"
            hidden
            multiple
            onChange={(e) => {
              const newFiles = Array.from(e.target.files);
              const total = images.length + newFiles.length;
              if (total > MAX_IMAGES) {
                toast.error(`Tổng cộng chỉ được tối đa ${MAX_IMAGES} ảnh!`);
                return;
              }
              setImages((prev) => [...prev, ...newFiles]);
            }}
          />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-gray-200 mt-6">
            <label
              htmlFor="images"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition cursor-pointer py-2 px-4 rounded-lg hover:bg-indigo-50"
            >
              <Image className="size-5" /> Thêm ảnh ({images.length}/{MAX_IMAGES})
            </label>

            <div className="flex gap-2">
              <button
                onClick={clearForm}
                disabled={loading}
                className="flex-1 sm:flex-none text-sm px-6 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>

              <button
                disabled={loading || !isValidPost()}
                onClick={handleSubmit}
                className={`flex-1 sm:flex-none text-sm px-8 py-2.5 rounded-lg text-white font-medium transition-all ${loading || !isValidPost()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 shadow-md hover:shadow-lg"
                  }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin size-4" />
                    Đang xử lý...
                  </span>
                ) : (
                  "Đăng bài viết"
                )}
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {status.type && (
            <div
              className={`mt-4 text-sm font-medium px-4 py-3 rounded-xl border-2 ${status.type === "checking"
                ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                : status.type === "violated"
                  ? "bg-red-50 text-red-800 border-red-200"
                  : status.type === "success"
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-gray-50 text-gray-700 border-gray-200"
                }`}
              dangerouslySetInnerHTML={{ __html: status.message }}
            ></div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl transform animate-[scale-in_0.3s_ease-out]">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="size-12 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-slate-900">
              Đăng bài thành công! 🎉
            </h3>
            <p className="text-gray-600">
              Bài viết của bạn đã được chia sẻ với mọi người
            </p>
            <div className="mt-6">
              <Loader2 className="animate-spin size-6 text-indigo-500 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Đang chuyển hướng...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
