import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { slugifyUser } from "../app/slugifyUser";

const MiniProfile = ({ user, onClose }) => {
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.user.value);

  if (!user) return null;

  const handleUserClick = () => {
    if (onClose) onClose();
    if (user._id === currentUser._id) {
      navigate("/profile");
    } else {
      navigate(`/profile-user/${slugifyUser(user)}`);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-3 w-56 text-center">
      <img
        src={user.profile_picture}
        alt={user.full_name}
        className="w-16 h-16 rounded-full mx-auto mb-2 border"
      />
      <p className="font-semibold text-gray-800">{user.full_name}</p>
      <p className="text-gray-500 text-sm">@{user.username}</p>

      <div className="mt-2 text-xs text-gray-600 space-y-1">
        <div>
          <span className="font-medium">{user.followers?.length || 0}</span>{" "}
          người theo dõi
        </div>
        <div>
          <span className="font-medium">{user.following?.length || 0}</span>{" "}
          đang theo dõi
        </div>
        <div>
          <span className="font-medium">
            {user.connections?.length || 0}
          </span>{" "}
          kết nối
        </div>
      </div>

      <button
        onClick={handleUserClick}
        className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-sm transition"
      >
        Xem trang cá nhân
      </button>
    </div>
  );
};

export default MiniProfile;