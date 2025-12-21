import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";

const CreatePost = ({ onPostCreated }) => {
    const currentUser = useSelector((state) => state.user.value);
    const { getToken } = useAuth();

    const [open, setOpen] = useState(false);
    const [content, setContent] = useState("");
    const [files, setFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const handleFiles = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);

        // Generate preview URLs
        const previews = selectedFiles.map((file) => {
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(previews).then(setFilePreviews);
    };

    const handleSubmit = async () => {
        if (!content.trim() && files.length === 0) return toast.error("Vui lòng nhập nội dung hoặc chọn ảnh");
        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append("content", content);
            formData.append("post_type", "text");
            files.forEach((f) => formData.append("images", f));

            const token = await getToken();
            const { data } = await api.post("/api/post/add", formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (data.success) {
                toast.success("Đã đăng bài");
                setContent("");
                setFiles([]);
                setFilePreviews([]);
                setOpen(false);
                onPostCreated?.(data.post);
            } else toast.error(data.message);
        } catch (error) {
            toast.error(error.message || "Lỗi khi tạo bài viết");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow p-5 w-full max-w-2xl">
            <div className="flex items-start gap-3">
                <img
                    src={currentUser.profile_picture}
                    alt="avatar"
                    className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                    {!open ? (
                        <button
                            onClick={() => setOpen(true)}
                            className="w-full text-left text-gray-600 bg-gray-50 px-4 py-2 rounded-full"
                        >
                            Bạn đang nghĩ gì?
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <textarea
                                rows={3}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Hãy chia sẻ điều gì đó..."
                                className="w-full resize-none p-3 border rounded-md focus:outline-none"
                            />

                            <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-600">
                                    <input type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
                                    <span className="cursor-pointer">Thêm ảnh</span>
                                </label>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setOpen(false); setContent(""); setFiles([]); setFilePreviews([]); }}
                                        className="px-4 py-2 rounded-md bg-gray-100 text-gray-700"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="px-4 py-2 rounded-md bg-blue-500 text-white disabled:opacity-60"
                                    >
                                        {submitting ? 'Đang đăng...' : 'Đăng'}
                                    </button>
                                </div>
                            </div>

                            {files.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto">
                                    {filePreviews.map((preview, i) => (
                                        <div key={i} className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                                            <img
                                                src={preview}
                                                alt={`preview ${i}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreatePost;
