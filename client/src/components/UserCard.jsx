import React, { useEffect } from "react";
import { MessageCircle, MapPin, Plus, UserPlus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { createConnectionHandlers } from "../service/connectionService";
import { fetchConnections } from "../features/connections/connectionsSlice";
import { slugifyUser } from "../app/slugifyUser";
import defaultAvatar from "../assets/sample_profile.jpg";

const UserCard = ({ user }) => {
  const currentUser = useSelector((state) => state.user.value);
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    getToken().then((token) => dispatch(fetchConnections(token)));
  }, [dispatch, getToken]);

  if (!currentUser || !user) return null;

  // === KIỂM TRA TRẠNG THÁI LIÊN HỆ ===
  const isFollowing = currentUser.following?.includes(user._id);
  const isFollower = currentUser.followers?.includes(user._id);
  const isFriend = currentUser.connections?.includes(user._id);
  const hasRequested = user.pendingConnections?.includes(currentUser._id);
  const isPending = currentUser.pendingConnections?.includes(user._id);

  const handlers = createConnectionHandlers(getToken, dispatch, navigate, currentUser);

  // === FOLLOW BUTTON LOGIC ===
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

  // === CONNECTION BUTTON LOGIC ===
  const handleConnectionAction = () => {
    if (isFriend) return navigate(`/messages/${user._id}`);
    if (isPending) return handlers.accept(user._id);
    if (!hasRequested) return handlers.connect(user._id);
  };

  return (
    <div className="p-4 pt-6 flex flex-col justify-between w-72 shadow-md border border-gray-200 rounded-md">
      {/* Thông tin user */}
      <div
        className="text-center cursor-pointer"
        onClick={() => {
          if (user._id === currentUser._id) navigate("/profile");
          else {
            navigate(`/profile-user/${slugifyUser(user)}`);
          }
        }}
      >
        <img
          src={user.profile_picture || defaultAvatar}
          alt={user.full_name}
          className="rounded-full w-16 shadow-md mx-auto"
        />
        <p className="mt-4 font-semibold">{user.full_name}</p>
        {user.username && (
          <p className="text-gray-500 font-light">@{user.username}</p>
        )}
        {user.bio && (
          <p className="text-gray-600 mt-2 text-center text-sm px-4">{user.bio}</p>
        )}
      </div>

      {/* Follow + Connection Buttons */}
      <div className="flex mt-4 gap-2">
        <button
          onClick={followAction}
          className={`w-full py-2 rounded-md flex justify-center items-center gap-2 font-medium transition active:scale-95 ${followBtnClass}`}
        >
          <UserPlus className="w-4 h-4" />
          {followLabel}
        </button>

        <button
          onClick={handleConnectionAction}
          className="flex items-center justify-center w-16 border text-slate-500 group rounded-md cursor-pointer active:scale-95 transition"
        >
          {isFriend ? (
            <MessageCircle className="w-5 h-5 text-indigo-600 group-hover:scale-105 transition" />
          ) : isPending ? (
            <span className="text-sm text-green-600 font-medium">✓</span>
          ) : (
            <Plus className="w-5 h-5 group-hover:scale-105 transition" />
          )}
        </button>
      </div>
    </div>
  );
};

export default UserCard;