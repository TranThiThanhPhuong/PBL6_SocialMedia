import React, { useState } from "react";
import { useRef } from "react";
// 1. Bỏ TextIcon, thêm X
import { ArrowLeft, Upload, Sparkle, X } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";

const StoryModal = ({ setShowModal, fetchStories }) => {
  const bgColors = ["#4f46e5", "#7c3aed", "#db2777", "#e11d48", "#ca8a04", "#0d9488"];
  const [mode, setMode] = useState("text");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [background, setBackground] = useState(bgColors[0]);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();

  const violationMessages = {
    khieu_dam_doi_truy: "Bản tin chứa nội dung khiêu dâm / đồi trụy!",
    ngon_tu_thu_ghet: "Bản tin chứa ngôn từ thù ghét / kích động!",
    nhay_cam_chinh_tri: "Bản tin chứa nội dung nhạy cảm chính trị!",
    bao_luc: "Bản tin chứa nội dung bạo lực / tàn ác!",
  };

  const fileInputRef = useRef(null);

  const handleCreateStory = async () => {
    if (!images.length && !content.trim()) {
      return toast.error("Hãy thêm văn bản hoặc hình ảnh để đăng bài.");
    }

    setLoading(true);
    const token = await getToken();

    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("post_type", images.length ? "image" : "text");
      formData.append("background_color", background);

      if (images.length) {
        images.forEach((img) => formData.append("images", img));
      }

      const { data } = await api.post("/api/story/create", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success("Đăng tin thành công!");
        setShowModal(false);
        fetchStories();
      } else {
        toast.error(data.message || "Đăng tin thất bại!");
      }
    } catch (error) {
      console.error("❌ Lỗi khi đăng:", error);
      if (error.response?.status === 400) {
        const { labels, message } = error.response.data;
        let errorMsg = "Bản tin chứa nội dung vi phạm!";
        if (labels?.length > 0) {
          errorMsg = labels
            .map((l) => violationMessages[l] || `Nội dung vi phạm: ${l}`)
            .join("\n");
        } else if (message) {
          errorMsg = message;
        }
        toast.error(errorMsg);
      } else {
        toast.error("Đã xảy ra lỗi khi đăng tin.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 3. Hủy URL cũ (nếu có) để tránh memory leak
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const newPreviewUrl = URL.createObjectURL(file);
      setImages([file]);
      setPreviewUrl(newPreviewUrl);
      setMode("image");
      setContent("");

      e.target.value = "";
    }
  };

  // 4. Hàm mới để xóa ảnh và quay lại chế độ text
  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImages([]);
    setPreviewUrl(null);
    setMode("text");
  };

  return (
    <div className="fixed inset-0 z-110 min-h-screen bg-black/80 backdrop-blur text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-xl p-4">
        {/* Header */}
        <div className="text-center mb-4 flex items-center justify-between">
          <button onClick={() => setShowModal(false)} className="text-white p-2 cursor-pointer">
            <ArrowLeft />
          </button>
          <h2 className="text-lg font-semibold">Tạo tin</h2>
          <span className="w-10"></span>
        </div>

        {/* Khung chính */}
        <div
          className="rounded-lg h-96 flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: background }}
        >
          {mode === "text" && (
            <textarea
              className="bg-transparent text-white w-full h-full p-6 text-2xl font-semibold text-center resize-none focus:outline-none placeholder:text-gray-300"
              placeholder="Bạn đang nghĩ gì?"
              onChange={(e) => setContent(e.target.value)}
              value={content}
            />
          )}
          {/* 5. Thêm nút X vào khu vực preview ảnh */}
          {mode === "image" && previewUrl && (
            <>
              <img src={previewUrl} alt="Preview" className="object-contain max-h-full w-full" />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white hover:bg-black/80 transition"
                aria-label="Bỏ ảnh"
              >
                <X size={18} />
              </button>
            </>
          )}
        </div>

        {/* Chọn màu nền (chỉ áp dụng cho text mode) */}
        {mode === "text" && (
          <div className="flex mt-6 gap-3 justify-center"> {/* Tăng gap và margin-top */}
            {bgColors.map((color) => (
              <button
                key={color}
                className={`w-7 h-7 rounded-full cursor-pointer transition-all ${background === color
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' // Style khi được chọn
                  : 'ring-1 ring-gray-700' // Style khi không được chọn
                  }`}
                style={{ backgroundColor: color }}
                onClick={() => setBackground(color)}
              />
            ))}
          </div>
        )}

        {/* 6. Xóa nút "Văn bản" */}
        <div className="flex gap-2 mt-4">
          <label
            className="flex-1 flex items-center justify-center gap-2 p-2 rounded cursor-pointer bg-zinc-800"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />
            <Upload size={18} /> Ảnh
          </label>
        </div>

        {/* Nút đăng */}
        <button
          onClick={handleCreateStory}
          disabled={loading}
          className="flex items-center justify-center gap-2 text-white py-3 mt-4 w-full rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition cursor-pointer disabled:opacity-60"
        >
          <Sparkle size={18} />
          {loading ? "Đang đăng..." : "Tạo tin"}
        </button>
      </div>
    </div>
  );
};

export default StoryModal;