import React from "react";
import { MessageSquare, UserX } from "lucide-react";
import { slugifyUser } from "../../app/slugifyUser";

const ConnectionActions = ({ tab, user, handlers, currentUser, navigate }) => {
  const isFollowing = currentUser?.following?.includes(user._id);
  const isFollower = currentUser?.followers?.includes(user._id);
  const isFriend = currentUser?.connections?.includes(user._id);

  switch (tab) {
    case "Người theo dõi":
      return (
        <>
          {isFollowing ? (
            <button
              onClick={() =>
              window.confirm("Bạn chắc chắn muốn bỏ theo dõi người này?")
                ? handlers.unfollow(user._id)
                : null
            }
              className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium transition"
            >
              Bỏ theo dõi
            </button>
          ) : (
            <button
              onClick={() => handlers.follow(user._id)}
              className="w-full py-2 rounded-lg bg-indigo-500 text-white hover:opacity-90 text-sm font-medium transition"
            >
              {isFollower ? "Theo dõi lại" : "Theo dõi"}
            </button>
          )}
          <button
            onClick={() => handlers.block(user._id)}
            className="w-full py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-sm font-medium transition"
          >
            Chặn
          </button>
        </>
      );

    case "Đang theo dõi":
      return (
        <>
          <button
            onClick={() =>
              window.confirm("Bạn chắc chắn muốn bỏ theo dõi người này?")
                ? handlers.unfollow(user._id)
                : null
            }
            className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            Bỏ theo dõi
          </button>
          <button
            onClick={() => navigate(`/messages/${slugifyUser(user)}`, { state: { userId: user._id } })}
            className="w-full py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-medium flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> Nhắn tin
          </button>
        </>
      );

    case "Chờ phản hồi":
      return (
        <>
          <button
            onClick={() => handlers.accept(user._id)}
            className="w-full py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-sm font-medium"
          >
            Chấp nhận
          </button>
          <button
            onClick={() => handlers.reject(user._id)}
            className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            Từ chối
          </button>
          <button
            onClick={() => handlers.block(user._id)}
            className="w-full py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-sm font-medium transition"
          >
            Chặn
          </button>
        </>
      );

    case "Bạn bè":
      return (
        <>
          <button
            onClick={() => navigate(`/messages/${slugifyUser(user)}`, { state: { userId: user._id } })}
            className="w-full py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-medium flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> Nhắn tin
          </button>
          <button
            onClick={() => handlers.remove(user._id)}
            className="w-full py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium flex items-center justify-center gap-2"
          >
            <UserX className="w-4 h-4" /> Hủy kết bạn
          </button>
        </>
      );

    case "Đã chặn":
      return (
        <>
          <button
            onClick={() => handlers.unblock(user._id)}
            className="w-full py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-sm font-medium transition"
          >
            Bỏ chặn
          </button>
        </>
      );

    default:
      return null;
  }
};

export default ConnectionActions;