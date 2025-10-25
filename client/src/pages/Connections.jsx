import React, { useEffect, useState } from "react";
import {
  User,
  UserPlus,
  UserCheck,
  UserRoundPen,
  MessageSquare,
  UserX,
  BadgeCheck,
} from "lucide-react";
import {
  handleAcceptConnection,
  handleRejectConnection,
  handleRemoveConnection,
  handleFollow,
  handleUnfollow,
  handleBlock,
  handleUnblock,
} from "../service/connectionService";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { fetchConnections } from "../features/connections/connectionsSlice";

const Connections = () => {
  const [currentTab, setCurrentTab] = useState("Người theo dõi");
  const currentUser = useSelector((state) => state.user.value);

  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const {
    connections,
    pendingConnections,
    followers,
    following,
    blockedUsers,
  } = useSelector((state) => state.connections);

  const dataArray = [
    { label: "Người theo dõi", value: followers, icon: User },
    { label: "Đang theo dõi", value: following, icon: UserCheck },
    { label: "Chờ phản hồi", value: pendingConnections, icon: UserRoundPen },
    { label: "Bạn bè", value: connections, icon: UserPlus },
    { label: "Đã chặn", value: blockedUsers, icon: UserX },
  ];
  const renderActions = (tab, user) => {
    // trạng thái quan hệ hiện tại (lấy từ currentUser trong closure)
    const isFollowing = currentUser?.following?.includes(user._id);
    const isFollower = currentUser?.followers?.includes(user._id);
    const isFriend = currentUser?.connections?.includes(user._id);
    const isPending = currentUser?.pendingConnections?.includes(user._id);
    const hasRequested = user?.pendingConnections?.includes(currentUser._id);

    switch (tab) {
      case "Người theo dõi":
        return (
          <>
            {/* Nếu đang follow -> Bỏ theo dõi. Nếu không đang follow -> Theo dõi lại */}
            {isFollowing ? (
              <button
                onClick={() => handleUnfollow(user._id, getToken, dispatch)}
                className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium transition"
              >
                Bỏ theo dõi
              </button>
            ) : (
              <button
                onClick={() => handleFollow(user._id, getToken, dispatch)}
                className="w-full py-2 rounded-lg bg-indigo-500 text-white hover:opacity-90 text-sm font-medium transition"
              >
                {isFollower ? "Theo dõi lại" : "Theo dõi lại"}
              </button>
            )}

            <button
              onClick={() => handleBlock(user._id, getToken, dispatch)}
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
              onClick={() => handleUnfollow(user._id, getToken, dispatch)}
              className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
            >
              Bỏ theo dõi
            </button>

            <button
              onClick={() => navigate(`/messages/${user._id}`)}
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
              onClick={() =>
                handleAcceptConnection(user._id, getToken, dispatch)
              }
              className="w-full py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-sm font-medium"
            >
              Chấp nhận
            </button>

            <button
              onClick={() =>
                handleRejectConnection(user._id, getToken, dispatch)
              }
              className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
            >
              Từ chối
            </button>

            <button
              onClick={() => handleBlock(user._id, getToken, dispatch)}
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
              onClick={() => navigate(`/messages/${user._id}`)}
              className="w-full py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-medium flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Nhắn tin
            </button>

            <button
              onClick={() =>
                handleRemoveConnection(user._id, getToken, dispatch)
              }
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
              onClick={() => handleUnblock(user._id, getToken, dispatch)}
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

  useEffect(() => {
    getToken().then((token) => dispatch(fetchConnections(token)));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            Kết nối
          </h1>
          <p className="text-gray-600">
            Khám phá, trò chuyện và mở rộng mạng lưới bạn bè.
          </p>
        </div>

        {/* Counts */}
        <div className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {dataArray.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-2 border border-gray-200 bg-white hover:shadow-lg transition-shadow rounded-xl py-4"
            >
              <item.icon className="w-6 h-6 text-indigo-600" />
              <b className="text-lg">{item.value.length}</b>
              <p className="text-sm text-gray-600">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
          {dataArray.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setCurrentTab(tab.label)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                currentTab === tab.label
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Connections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {dataArray
            .find((item) => item.label === currentTab)
            .value.map((user) => (
              <div
                key={user._id}
                className="flex flex-col bg-white border border-gray-100 shadow-sm rounded-xl p-5 hover:shadow-md transition-all duration-200"
              >
                {/* User Info */}
                <div
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
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={user.profile_picture}
                    alt=""
                    className="rounded-full w-14 h-14 object-cover border-2 border-indigo-100 group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold text-slate-900">
                        {user.full_name}
                      </span>
                      <BadgeCheck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-gray-500 text-sm">
                      @{user.username}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex flex-col gap-2">
                  {renderActions(currentTab, user)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Connections;
