import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Image, X, Loader2, CheckCircle, AlertTriangle, Ban } from "lucide-react";
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

  const violationMessages = {
    khieu_dam_doi_truy: "Bài viết chứa nội dung khiêu dâm / đồi trụy!",
    ngon_tu_thu_ghet: "Bài viết chứa ngôn từ thù ghét / kích động!",
    nhay_cam_chinh_tri: "Bài viết chứa nội dung nhạy cảm chính trị!",
    bao_luc: "Bài viết chứa nội dung bạo lực / tàn ác!",
  };

  const handleSubmit = async () => {
    if (!images.length && !content) {
      return toast.error("Hãy thêm nội dung hoặc hình ảnh để đăng bài.");
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
      images.forEach((img) => formData.append("images", img));

      const { data } = await api.post("/api/post/add", formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        toast.success("✅ Đăng bài thành công!");
        setStatus({ type: "success", message: "Đăng bài thành công!" });
        navigate("/");
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("❌ Lỗi khi đăng:", error);
      if (error.response?.status === 400) {
        const ai = error.response.data.aiResult;
        let label = ai?.text_result?.[0]?.label || ai?.image_result?.[0]?.label || "unknown";
        const message =
          violationMessages[label] || "Bài viết chứa nội dung vi phạm!";
        toast.error(message);
        setStatus({ type: "violated", message });
      } else {
        toast.error("⚠️ Lỗi khi đăng bài.");
        setStatus({ type: "error", message: "Lỗi khi đăng bài." });
      }
    }

    setLoading(false);
  };

  const handleImageChange = (e) => {
  const files = Array.from(e.target.files);
  if (files.length > 4) {
    alert("Bạn chỉ được chọn tối đa 4 ảnh!");
    e.target.value = ""; // reset input
    return;
  }
  setImages(files);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Tạo bài viết</h1>
        <p className="text-slate-600 mb-8">Chia sẻ bài viết với mọi người</p>

        <div className="flex items-center gap-3 mb-4">
          <img src={user.profile_picture} alt="" className="w-12 h-12 rounded-full shadow" />
          <div>
            <h2 className="font-semibold">{user.full_name}</h2>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>
        </div>

        <textarea
          className="w-full resize-none max-h-32 mt-2 text-sm outline-none placeholder-gray-400 border rounded-lg p-3 focus:ring-2 focus:ring-indigo-300"
          placeholder="Bạn đang nghĩ gì?"
          onChange={(e) => setContent(e.target.value)}
          value={content}
        />

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {images.map((image, i) => (
              <div key={i} className="relative group">
                <img src={URL.createObjectURL(image)} className="h-20 rounded-md" alt="" />
                <div
                  onClick={() => setImages(images.filter((_, index) => index !== i))}
                  className="absolute hidden group-hover:flex justify-center items-center top-0 right-0 bottom-0 left-0 bg-black/40 rounded-md cursor-pointer"
                >
                  <X className="text-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-300 mt-4">
          <label
            htmlFor="images"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer"
          >
            <Image className="size-6" /> Thêm ảnh
          </label>

          <input
            type="file"
            id="images"
            accept="image/*"
            hidden
            multiple
            // onChange={(e) => setImages([...images, ...Array.from(e.target.files)])}
            onChange={handleImageChange}
          />

          <button
            disabled={loading}
            onClick={handleSubmit}
            className={`text-sm px-8 py-2 rounded-md text-white font-medium transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95"
            }`}
          >
            {loading ? "Đang xử lý..." : "Đăng bài viết"}
          </button>
        </div>

        {status.type && (
          <div
            className={`flex items-center gap-2 mt-3 text-sm font-medium px-4 py-2 rounded-md w-fit ${
              status.type === "checking"
                ? "bg-yellow-50 text-yellow-700 border border-yellow-300"
                : status.type === "violated"
                ? "bg-red-50 text-red-700 border border-red-300"
                : status.type === "success"
                ? "bg-green-50 text-green-700 border border-green-300"
                : "bg-gray-50 text-gray-600 border border-gray-200"
            }`}
          >
            {status.type === "checking" && <Loader2 className="w-4 h-4 animate-spin" />}
            {status.type === "violated" && <Ban className="w-4 h-4" />}
            {status.type === "success" && <CheckCircle className="w-4 h-4" />}
            {status.type === "error" && <AlertTriangle className="w-4 h-4" />}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePost;