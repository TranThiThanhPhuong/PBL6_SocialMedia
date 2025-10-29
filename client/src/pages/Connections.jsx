import React, { useEffect, useState } from "react";
import { User, UserPlus, UserCheck, UserRoundPen, MessageSquare, UserX, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import ConnectionTabs from "../components/connections/ConnectionTabs";
import ConnectionCard from "../components/connections/ConnectionCard";
import {
  handleAcceptConnection,
  handleRejectConnection,
  handleRemoveConnection,
  handleFollow,
  handleUnfollow,
  handleBlock,
  handleUnblock,
  handleConnectionRequest,
} from "../service/connectionService";
import { fetchConnections } from "../features/connections/connectionsSlice";

const Connections = () => {
  const [currentTab, setCurrentTab] = useState("Người theo dõi");
  const currentUser = useSelector((state) => state.user.value);
  const { connections, pendingConnections, followers, following, blockedUsers, loading } = useSelector((s) => s.connections);
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;
    getToken().then((token) => {
      if (mounted) dispatch(fetchConnections(token));
    });
    return () => { mounted = false; };
  }, [dispatch, getToken]);

  const dataArray = [
    { label: "Người theo dõi", value: followers, icon: User },
    { label: "Đang theo dõi", value: following, icon: UserCheck },
    { label: "Chờ phản hồi", value: pendingConnections, icon: UserRoundPen },
    { label: "Bạn bè", value: connections, icon: UserPlus },
    { label: "Đã chặn", value: blockedUsers, icon: UserX },
  ];

  const handlers = {
    follow: (id) => handleFollow(id, getToken, dispatch),
    unfollow: (id) => handleUnfollow(id, getToken, dispatch),
    block: (id) => handleBlock(id, getToken, dispatch),
    unblock: (id) => handleUnblock(id, getToken, dispatch),
    accept: (id) => handleAcceptConnection(id, getToken, dispatch),
    reject: (id) => handleRejectConnection(id, getToken, dispatch),
    remove: (id) => handleRemoveConnection(id, getToken, dispatch),
    connect: (id) => handleConnectionRequest(id, getToken, dispatch, currentUser, navigate),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">Kết nối</h1>
          <p className="text-gray-600">Khám phá, trò chuyện và mở rộng mạng lưới bạn bè.</p>
        </div>

        <div className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {dataArray.map((item, i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-2 border border-gray-200 bg-white hover:shadow-lg transition-shadow rounded-xl py-4">
              <item.icon className="w-6 h-6 text-indigo-600" />
              <b className="text-lg">{item.value?.length || 0}</b>
              <p className="text-sm text-gray-600">{item.label}</p>
            </div>
          ))}
        </div>

        <ConnectionTabs dataArray={dataArray} currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {loading ? (
            <div>Đang tải...</div>
          ) : (
            (dataArray.find((d) => d.label === currentTab)?.value || []).map((user) => (
              <ConnectionCard key={user._id} user={user} currentUser={currentUser} handlers={handlers} currentTab={currentTab} navigate={navigate} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Connections;