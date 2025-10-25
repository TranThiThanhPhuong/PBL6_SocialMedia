import React, { useEffect } from "react";
import { MessageCircle, MapPin, Plus, UserPlus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
  handleConnectionRequest,
  handleFollow,
  handleUnfollow,
  handleAcceptConnection,
} from "../service/connectionService";
import { fetchConnections } from "../features/connections/connectionsSlice";

const UserCard = ({ user }) => {
  const currentUser = useSelector((state) => state.user.value);
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    getToken().then((token) => dispatch(fetchConnections(token)));
  }, [dispatch, getToken]);

  const isFollowing = currentUser?.following?.includes(user._id);
  const isFollower = currentUser?.followers?.includes(user._id);
  const isFriend = currentUser?.connections?.includes(user._id);
  const isPending = currentUser?.pendingConnections?.includes(user._id);
  const hasRequested = user?.pendingConnections?.includes(currentUser._id);

  const handleFollowAction = async () => {
    if (isFollowing) {
      await handleUnfollow(user._id, getToken, dispatch);
    } else {
      await handleFollow(user._id, getToken, dispatch);
    }
    getToken().then((token) => dispatch(fetchConnections(token)));
  };

  const handleConnectionAction = async () => {
    if (isFriend) {
      navigate(`/messages/${user._id}`);
    } else if (isPending) {
      await handleAcceptConnection(user._id, getToken, dispatch);
    } else if (!hasRequested) {
      await handleConnectionRequest(
        user._id,
        getToken,
        dispatch,
        currentUser,
        navigate
      );
    }
    getToken().then((token) => dispatch(fetchConnections(token)));
  };

  const followButtonLabel = isFollowing
    ? "Bỏ theo dõi"
    : isFollower
    ? "Theo dõi lại"
    : "Theo dõi";

  const followButtonClass = isFollowing
    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
    : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white";

  return (
    <div
      key={user._id}
      className="p-4 pt-6 flex flex-col justify-between w-72 shadow-md border border-gray-200 rounded-md"
    >
      <div
        className="text-center cursor-pointer"
        onClick={() => {
          if (user._id === currentUser._id) {
            navigate("/profile");
          } else {
            const slug = user.username
              ? user.username
              : user.full_name.toLowerCase().replace(/\s+/g, "-");
            navigate(`/profile-user/${slug}`);
          }
        }}
      >
        <img
          src={user.profile_picture || "/default-avatar.png"}
          alt={user.full_name}
          className="rounded-full w-16 shadow-md mx-auto"
        />
        <p className="mt-4 font-semibold">{user.full_name}</p>
        {user.username && (
          <p className="text-gray-500 font-light">@{user.username}</p>
        )}
        {user.bio && (
          <p className="text-gray-600 mt-2 text-center text-sm px-4">
            {user.bio}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-600">
        <div className="flex items-center gap-1 border border-gray-300 rounded-full px-3 py-1">
          <MapPin className="w-4 h-4" /> {user.location || "Chưa có"}
        </div>
        <div className="flex items-center gap-1 border border-gray-300 rounded-full px-3 py-1">
          <span>{user.followers?.length || 0}</span> Người theo dõi
        </div>
      </div>

      <div className="flex mt-4 gap-2">
        {/* Follow Button */}
        <button
          onClick={handleFollowAction}
          className={`w-full py-2 rounded-md flex justify-center items-center gap-2 font-medium transition active:scale-95 ${followButtonClass}`}
        >
          <UserPlus className="w-4 h-4" />
          {followButtonLabel}
        </button>

        {/* Connection / Message Button */}
        <button
          onClick={handleConnectionAction}
          className="flex items-center justify-center w-16 border text-slate-500 group rounded-md cursor-pointer active:scale-95 transition"
        >
          {isFriend ? (
            <MessageCircle className="w-5 h-5 group-hover:scale-105 transition text-indigo-600" />
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