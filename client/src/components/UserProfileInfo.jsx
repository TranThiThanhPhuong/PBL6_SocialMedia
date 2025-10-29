import React, { useEffect } from "react";
import {
  UserPlus,
  UserX,
  MessageSquare,
  PenBox,
  MapPin,
  Calendar,
  Verified,
} from "lucide-react";
import {
  handleConnectionRequest,
  handleAcceptConnection,
  handleRejectConnection,
  handleRemoveConnection,
  createConnectionHandlers,
} from "../service/connectionService";
import { fetchConnections } from "../features/connections/connectionsSlice";
import { formatPostTime } from "../app/formatDate";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";

const UserProfileInfo = ({ user, posts, setShowEdit }) => {
  const currentUser = useSelector((state) => state.user.value);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  useEffect(() => {
    getToken().then((token) => dispatch(fetchConnections(token)));
  }, [dispatch, getToken]);

  if (!currentUser || !user) return null;

  // === KIỂM TRA TRẠNG THÁI LIÊN HỆ ===
  const isFollowing = currentUser.following?.includes(user._id);
  const isFollower = currentUser.followers?.includes(user._id);
  const isFriend = currentUser.connections?.includes(user._id);
  const isPending = currentUser.pendingConnections?.includes(user._id);
  const hasRequested = user.pendingConnections?.includes(currentUser._id);

  const handlers = createConnectionHandlers(getToken, dispatch, navigate, currentUser);

  // === FOLLOW BUTTON LOGIC (GIỐNG UserCard) ===
  const followLabel = isFollowing
    ? "Bỏ theo dõi"
    : isFollower
    ? "Theo dõi lại"
    : "Theo dõi";

  const followAction = isFollowing
    ? () => handlers.unfollow(user._id)
    : () => handlers.follow(user._id);

  const followBtnClass = isFollowing
    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
    : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white";

  return (
    <div className="relative py-4 px-6 md:px-8 bg-white">
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Avatar */}
        <div className="w-32 h-32 border-4 border-white shadow-lg absolute -top-16 rounded-full">
          <img
            src={user.profile_picture}
            alt=""
            className="absolute rounded-full z-2"
          />
        </div>

        {/* Info */}
        <div className="w-full pt-16 md:pt-0 md:pl-36">
          <div className="flex flex-col md:flex-row items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.full_name}
                </h1>
                <Verified className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-gray-600">
                {user.username ? `@${user.username}` : "Thêm tên người dùng"}
              </p>
            </div>

            {user._id === currentUser._id && (
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors mt-4 md:mt-0 cursor-pointer"
              >
                <PenBox className="w-4 h-4" />
                Chỉnh sửa
              </button>
            )}

            {/* --- Action Buttons --- */}
            {user._id !== currentUser._id && (
              <div className="flex flex-wrap gap-3 mt-6">
                {/* ===== 1️⃣ Nút Theo dõi ===== */}
                <button
                  onClick={followAction}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition ${followBtnClass}`}
                >
                  {followLabel}
                </button>

                {/* ===== 2️⃣ Nút Kết bạn ===== */}
                {isFriend ? (
                  <button
                    onClick={() =>
                      handleRemoveConnection(user._id, getToken, dispatch)
                    }
                    className="px-5 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium transition"
                  >
                    <UserX className="inline w-4 h-4 mr-1" />
                    Hủy kết bạn
                  </button>
                ) : hasRequested ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleAcceptConnection(user._id, getToken, dispatch)
                      }
                      className="px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-sm font-medium"
                    >
                      Chấp nhận
                    </button>
                    <button
                      onClick={() =>
                        handleRejectConnection(user._id, getToken, dispatch)
                      }
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                    >
                      Từ chối
                    </button>
                  </div>
                ) : isPending ? (
                  <button
                    disabled
                    className="px-5 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm font-medium cursor-not-allowed"
                  >
                    Đã gửi lời mời
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      handleConnectionRequest(user._id, getToken, dispatch)
                    }
                    className="px-5 py-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 text-sm font-medium transition"
                  >
                    <UserPlus className="inline w-4 h-4 mr-1" />
                    Kết bạn
                  </button>
                )}

                {/* ===== 3️⃣ Nút Nhắn tin ===== */}
                {(isFriend || isFollowing || isFollower) && (
                  <button
                    onClick={() => navigate(`/messages/${user._id}`)}
                    className="px-5 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-medium flex items-center justify-center gap-2 transition"
                  >
                    <MessageSquare className="w-4 h-4" /> Nhắn tin
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bio */}
          <p className="text-gray-700 text-sm max-w-md mt-4">{user.bio}</p>

          {/* Location & Join Date */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 mt-4">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {user.location ? user.location : "Thêm vị trí"}
            </span>

            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Tham gia{" "}
              <span className="font-medium">
                {formatPostTime(user.createdAt)}
              </span>
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-6 border-t border-gray-200 pt-4">
            <div>
              <span className="sm:text-xl font-bold text-gray-900">
                {posts.length}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">
                Bài viết
              </span>
            </div>

            <div>
              <span className="sm:text-xl font-bold text-gray-900">
                {user.followers.length}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">
                Người theo dõi
              </span>
            </div>

            <div>
              <span className="sm:text-xl font-bold text-gray-900">
                {user.following.length}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">
                Đang theo dõi
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default UserProfileInfo;