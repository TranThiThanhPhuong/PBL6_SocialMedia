import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios.js";
import {
  UserPlus,
  UserX,
  MessageSquare,
  ChevronDown,
  PenBox,
  MapPin,
  Calendar,
  Verified,
  UserCheck,
  X,
  Check,
  MoreVertical,
  Flag,
  Ban,
  Unlock,
  Loader2,
} from "lucide-react";
import {
  handleConnectionRequest,
  handleAcceptConnection,
  handleRejectConnection,
  handleRemoveConnection,
  handleCancelConnection,
  handleBlock,
  handleUnblock,
  handleReport,
  createConnectionHandlers,
} from "../service/connectionService";
import MiniChatBox from "../components/MiniChatBox";
import { fetchConnections } from "../features/connections/connectionsSlice";
import { slugifyUser } from "../app/slugifyUser";
import { formatPostTime } from "../app/formatDate";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";

const UserProfileInfo = ({ user, posts, setShowEdit }) => {
  const currentUser = useSelector((state) => state.user.value);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [showOptions, setShowOptions] = useState(false);
  const [showSentOptions, setShowSentOptions] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const sentOptionsRef = useRef(null);
  const optionsRef = useRef(null);

  const [showListModal, setShowListModal] = useState(false);
  const [listType, setListType] = useState(""); // 'followers', 'following', 'connections'
  const [listData, setListData] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("loading"); // 'none', 'friend', 'sent', 'received', 'loading'

  // === KIỂM TRA TRẠNG THÁI LIÊN HỆ ===
  const isFollowing = currentUser.following?.includes(user._id);
  const isFollower = currentUser.followers?.includes(user._id);
  const isBlocked = currentUser.blockedUsers?.includes(user._id);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user || !currentUser || user._id === currentUser._id) return;
      try {
        const token = await getToken();
        const { data } = await api.get(
          `/api/user/connection-status/${user._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (data.success) {
          setConnectionStatus(data.status);
        }
      } catch (error) {
        console.error("Lỗi lấy trạng thái kết nối:", error);
      }
    };
    fetchStatus();
  }, [user?._id, currentUser?._id, getToken]);

  if (!currentUser || !user) return null;

  useEffect(() => {
    getToken().then((token) => dispatch(fetchConnections(token)));
  }, [dispatch, getToken]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
      if (
        sentOptionsRef.current &&
        !sentOptionsRef.current.contains(event.target)
      ) {
        setShowSentOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [optionsRef, sentOptionsRef]);

  if (!currentUser || !user) return null;

  const handlers = createConnectionHandlers(
    getToken,
    dispatch,
    navigate,
    currentUser
  );

  const handleFollowClick = async () => {
    setLoadingFollow(true);
    try {
      if (isFollowing) {
        await handlers.unfollow(user._id);
      } else {
        await handlers.follow(user._id);
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setLoadingFollow(false);
    }
  };

  const followLabel = loadingFollow ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : isFollowing ? (
    "Bỏ theo dõi"
  ) : isFollower ? (
    "Theo dõi lại"
  ) : (
    "Theo dõi"
  );

  const handleOpenList = async (type) => {
    setListType(type);
    setShowListModal(true);
    setLoadingList(true);
    try {
      const token = await getToken();
      const { data } = await api.get(`/api/user/${user._id}/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setListData(data.users);
    } catch (error) {
      // Fallback data có sẵn nếu API chưa implement
      if (type === "followers" && user.followers[0]?._id)
        setListData(user.followers);
      else if (type === "following" && user.following[0]?._id)
        setListData(user.following);
      else if (type === "connections" && user.connections[0]?._id)
        setListData(user.connections);
    } finally {
      setLoadingList(false);
    }
  };

  const onConnect = async () => {
    const success = await handleConnectionRequest(
      user._id, 
      getToken, 
      dispatch, 
      currentUser, 
      navigate
    );
    if (success) {
      setConnectionStatus("sent");
    } else {
      setConnectionStatus("none");
    }
  };

  const onAccept = async () => {
    await handleAcceptConnection(user._id, getToken, dispatch);
    setConnectionStatus("friend");
  };

  const onReject = async () => {
    await handleRejectConnection(user._id, getToken, dispatch);
    setConnectionStatus("none");
  };

  const onRemove = async () => {
    const success = await handleRemoveConnection(user._id, getToken, dispatch);
    if (success) {
        setConnectionStatus("none");
    }
  };

  const onCancel = async () => {
    const success = await handleCancelConnection(user._id, getToken, dispatch);
    if (success) {
      setConnectionStatus("none");
    }
  };

  const onBlockUser = async () => {
    setLoadingAction(true);
    const success = await handleBlock(user._id, getToken, dispatch);
    setLoadingAction(false);

    if (success) {
      setShowOptions(false);
      window.location.reload();
    }
  };

  const onUnblockUser = async () => {
    setLoadingAction(true);
    const success = await handleUnblock(user._id, getToken, dispatch);
    setLoadingAction(false);

    if (success) {
      setShowOptions(false);
      window.location.reload();
    }
  };

  const onReportUser = async () => {
    setLoadingAction(true);
    const success = await handleReport(
      user._id,
      "Spam hoặc quấy rối",
      getToken
    );
    setLoadingAction(false);
    if (success) setShowOptions(false);
  };
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

            {user._id === currentUser._id ? (
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors mt-4 md:mt-0 cursor-pointer"
              >
                <PenBox className="w-4 h-4" />
                Chỉnh sửa
              </button>
            ) : (
              // --- Action Buttons ---
              <div className="flex flex-wrap items-center gap-3 mt-6 relative">
                {/* 1. Nút Theo dõi */}
                <button
                  onClick={handleFollowClick}
                  disabled={loadingFollow}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center min-w-[100px] ${followBtnClass}`}
                >
                  {followLabel}
                </button>

                {/* 2. Logic Nút Kết bạn */}
                {connectionStatus === "friend" && (
                  <button
                    onClick={onRemove}
                    className="px-5 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium transition flex items-center gap-1"
                  >
                    <UserX className="w-4 h-4" /> Hủy kết bạn
                  </button>
                )}

                {connectionStatus === "sent" && (
                  <div className="relative" ref={sentOptionsRef}>
                    <button
                      onClick={() => setShowSentOptions(!showSentOptions)}
                      className="px-5 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Đã gửi lời mời</span>
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </button>

                    {/* Menu Hủy lời mời */}
                    {showSentOptions && (
                      <div className="absolute left-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button
                          onClick={onCancel}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" /> Hủy lời mời
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {connectionStatus === "received" && (
                  <div className="flex gap-2">
                    <button
                      onClick={onAccept}
                      className="px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-sm font-medium flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Chấp nhận
                    </button>
                    <button
                      onClick={onReject}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Từ chối
                    </button>
                  </div>
                )}

                {(connectionStatus === "none" ||
                  connectionStatus === "loading") && (
                  <button
                    onClick={onConnect}
                    disabled={connectionStatus === "loading"}
                    className="px-5 py-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 text-sm font-medium transition flex items-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" /> Kết bạn
                  </button>
                )}

                {/* 3. Nút Nhắn tin */}
                {(connectionStatus === "friend" || isFollowing) && (
                  <button
                    onClick={() => setShowChat(true)} // Mở ChatBox
                    className="px-5 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-medium flex items-center justify-center gap-2 transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Nhắn tin
                  </button>
                )}
                {showChat && (
                  <MiniChatBox
                    targetUser={user}
                    onClose={() => setShowChat(false)}
                  />
                )}

                {/* MENU 3 CHẤM (Đã thêm Ref để click outside) */}
                <div className="relative" ref={optionsRef}>
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="p-2 rounded-full hover:bg-gray-100 transition"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                  {showOptions && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      {/* Header menu để đóng */}
                      <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 bg-gray-50">
                        <span className="text-xs font-semibold text-gray-500">
                          Tùy chọn
                        </span>
                        <button
                          onClick={() => setShowOptions(false)}
                          className="p-1 hover:bg-gray-200 rounded-full"
                        >
                          <X size={14} className="text-gray-500" />
                        </button>
                      </div>

                      {isBlocked ? (
                        <button
                          onClick={onUnblockUser}
                          disabled={loadingAction}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Unlock className="w-4 h-4" /> Bỏ chặn
                        </button>
                      ) : (
                        <button
                          onClick={onBlockUser}
                          disabled={loadingAction}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Ban className="w-4 h-4" /> Chặn người dùng
                        </button>
                      )}
                      <button
                        onClick={onReportUser}
                        disabled={loadingAction}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <Flag className="w-4 h-4" /> Báo cáo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bio */}
          <p className="text-gray-700 text-sm max-w-md mt-4">{user.bio}</p>

          {/* Location & Join Date */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 mt-4">
            {(user.location || user._id === currentUser._id) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {user.location ? user.location : "Thêm vị trí"}
              </span>
            )}

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
            <div
              onClick={() => handleOpenList("followers")}
              className="cursor-pointer hover:opacity-70 transition"
            >
              <span className="sm:text-xl font-bold text-gray-900">
                {user.followers.length}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">
                Người theo dõi
              </span>
            </div>

            <div
              onClick={() => handleOpenList("following")}
              className="cursor-pointer hover:opacity-70 transition"
            >
              <span className="sm:text-xl font-bold text-gray-900">
                {user.following.length}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">
                Đang theo dõi
              </span>
            </div>

            <div
              onClick={() => handleOpenList("connections")}
              className="cursor-pointer hover:opacity-70 transition"
            >
              <span className="sm:text-xl font-bold text-gray-900">
                {user.connections.length}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">
                Bạn bè
              </span>
            </div>
          </div>
        </div>
      </div>

      {showListModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800 capitalize">
                {listType === "followers"
                  ? "Người theo dõi"
                  : listType === "following"
                  ? "Đang theo dõi"
                  : "Bạn bè"}
              </h3>
              <button
                onClick={() => setShowListModal(false)}
                className="p-1 hover:bg-gray-200 rounded-full transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingList ? (
                <div className="flex justify-center p-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : listData.length === 0 ? (
                <p className="text-center text-gray-500 p-10">
                  Danh sách trống.
                </p>
              ) : (
                <div className="space-y-1">
                  {listData.map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer"
                      
                    >
                      <div className="flex items-center gap-3"
                      onClick={() => {
                        setShowListModal(false);
                        navigate(`/profile-user/${slugifyUser(u)}`);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        setConnectionStatus("loading");
                      }}>
                        <img
                          src={u.profile_picture}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {u.full_name}
                          </p>
                          <p className="text-xs text-gray-500">@{u.username}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserProfileInfo;
