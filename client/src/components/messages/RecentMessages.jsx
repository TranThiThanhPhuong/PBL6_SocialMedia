import React from "react";
import { MessageSquare } from "lucide-react";
import { formatPostTime } from "../../app/formatDate";
import { slugifyUser } from "../../app/slugifyUser";

const RecentMessages = ({ loading, filtered, navigate, searchTerm }) => {
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        <p className="text-gray-500 mt-3">Đang tải...</p>
      </div>
    );

  if (filtered.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <MessageSquare size={60} className="text-gray-300 mb-3" />
        <p className="text-gray-500 text-center">
          {searchTerm ? "Không tìm thấy cuộc trò chuyện" : "Chưa có tin nhắn nào"}
        </p>
      </div>
    );

  return (
    <div className="px-2">
      {filtered.map((msg) => {
        const u = msg.otherUser;
        const isActive = window.location.pathname.includes(u._id);

        return (
          <div
            key={msg._id}
            onClick={() =>
              navigate(`/messages/${slugifyUser(u)}`, {
                state: { userId: u._id },
              })
            }
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${
              isActive
                ? "bg-indigo-50 border border-indigo-200"
                : !msg.seen
                ? "bg-blue-50 hover:bg-blue-100"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={u.profile_picture}
                alt={u.full_name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <p className="truncate font-semibold text-gray-900">
                  {u.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatPostTime(msg.createdAt)}
                </p>
              </div>
              <p className="text-sm text-gray-600 truncate">
                {msg.text || "📷 Đã gửi một hình ảnh"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecentMessages;