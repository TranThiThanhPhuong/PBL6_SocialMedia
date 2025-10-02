
import React from "react";
import { X, Link } from "lucide-react";
import toast from "react-hot-toast";

const SharePostModal = ({ post, setShowShareModal }) => {
  const postUrl = `${window.location.origin}/post/${post._id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(postUrl);
    toast.success("Đã sao chép liên kết!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Chia sẻ bài viết</h2>
          <button onClick={() => setShowShareModal(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            Sao chép liên kết để chia sẻ bài viết này.
          </p>
          <div className="flex items-center gap-3">
            <Link className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              readOnly
              value={postUrl}
              className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition cursor-pointer"
            >
              Sao chép
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePostModal;