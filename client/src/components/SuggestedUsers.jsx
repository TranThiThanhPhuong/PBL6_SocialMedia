import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-hot-toast";
import { slugifyUser } from "../app/slugifyUser";

const SuggestedUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [followedIds, setFollowedIds] = useState([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const token = await getToken();
        const { data } = await api.get("/api/user/suggestions", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [getToken]);

  const handleFollow = async (targetId) => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/user/follow",
        { id: targetId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Đã theo dõi!");
        setFollowedIds((prev) => [...prev, targetId]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra");
    }
  };

  if (loading || users.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="text-gray-600 font-semibold mb-4 text-sm uppercase tracking-wide">
        Gợi ý cho bạn
      </h3>

      <div className="flex flex-col gap-4">
        {users.map((user) => {
          if (followedIds.includes(user._id)) return null;

          return (
            <div key={user._id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden cursor-pointer flex-shrink-0"
                  onClick={() => {
                    navigate(`/profile-user/${slugifyUser(user)}`);
                  }}
                >
                  <img
                    src={
                      user.profile_picture || "https://via.placeholder.com/150"
                    }
                    alt={user.full_name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                </div>

                <div className="flex flex-col min-w-0">
                  <div
                    onClick={() => {
                      navigate(`/profile-user/${slugifyUser(user)}`);
                    }}
                    className="text-sm font-semibold text-gray-800 hover:underline truncate"
                  >
                    {user.full_name}
                  </div>

                  <span className="text-xs text-gray-500 truncate block max-w-[140px]">
                    {user.suggestedBy
                      ? `Theo dõi bởi ${user.suggestedBy}`
                      : user.bio || "Gợi ý mới"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleFollow(user._id)}
                className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors border border-blue-100"
              >
                Theo dõi
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedUsers;
