import React, { useState, useEffect, useRef } from "react";
import {
  Trash2,
  Flag,
  UserX,
  UserCheck,
  Inbox,
  X,
  UserCircle,
  UserPlus,
} from "lucide-react";
import {
  handleBlock,
  handleUnblock,
  handleReport,
  handleDeleteChat,
  handleToggleConversation,
} from "../../service/connectionService";
import { slugifyUser } from "../../app/slugifyUser";
import { useNavigate } from "react-router-dom";
import socket from "../../sockethandler/socket";

const ChatOptionsMenu = ({
  userId,
  user,
  onClose,
  getToken,
  dispatch,
  isBlocked,
  isPending,
  onBlockSuccess,
  onUnblockSuccess,
  onDeleteChatSuccess,
  onToggleStatusSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const executeAction = async (
    actionFn,
    callbackSuccess,
    socketEvent,
    ...args
  ) => {
    setLoading(true);
    const success = await actionFn(...args);
    setLoading(false);

    if (success) {
      if (socketEvent) {
        socket.emit(socketEvent, { userId });
      }

      if (callbackSuccess) callbackSuccess();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Chat options"
      className="absolute top-16 right-2 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <div className="flex items-center gap-3">
          <img
            src={user?.profile_picture || "https://via.placeholder.com/48?text=U"}
            alt="avatar"
            className="w-9 h-9 rounded-full object-cover"
          />
          <div className="text-sm">
            <div className="font-semibold text-gray-900">
              {user?.full_name || "Người dùng"}
            </div>
            <div className="text-xs text-gray-500">Tùy chọn trò chuyện</div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
        >
          <X size={16} />
        </button>
      </div>

      <div className="divide-y divide-gray-100 bg-white">
        <div className="flex flex-col">
          <button
            onClick={() => navigate(`/profile-user/${slugifyUser(user)}`)}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
            role="menuitem"
          >
            <div className="w-8 h-8 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UserCircle size={16} />
            </div>
            <div className="text-sm text-gray-800">Trang cá nhân</div>
          </button>

          <button
            onClick={() =>
              executeAction(
                handleDeleteChat,
                onDeleteChatSuccess,
                null,
                userId,
                getToken
              )
            }
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-left"
            role="menuitem"
          >
            <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center text-red-600">
              <Trash2 size={16} />
            </div>
            <div className="text-sm text-red-600 font-medium">Xóa chat</div>
          </button>

          <button
            onClick={() => executeAction(handleReport, null, null, userId, getToken)}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
            role="menuitem"
          >
            <div className="w-8 h-8 rounded-md bg-yellow-50 flex items-center justify-center text-yellow-600">
              <Flag size={16} />
            </div>
            <div className="text-sm text-gray-800">Báo cáo</div>
          </button>

          {isBlocked ? (
            <button
              onClick={() =>
                executeAction(
                  handleUnblock,
                  onUnblockSuccess,
                  "unblock_user",
                  userId,
                  getToken,
                  dispatch
                )
              }
              disabled={loading}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
              role="menuitem"
            >
              <div className="w-8 h-8 rounded-md bg-green-50 flex items-center justify-center text-green-600">
                <UserCheck size={16} />
              </div>
              <div className="text-sm text-green-600 font-medium">Bỏ chặn</div>
            </button>
          ) : (
            <button
              onClick={() =>
                executeAction(
                  handleBlock,
                  onBlockSuccess,
                  "block_user",
                  userId,
                  getToken,
                  dispatch
                )
              }
              disabled={loading}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
              role="menuitem"
            >
              <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center text-red-600">
                <UserX size={16} />
              </div>
              <div className="text-sm text-red-600 font-medium">Chặn người này</div>
            </button>
          )}
        </div>

        <div className="p-2 bg-gray-50">
          {!isBlocked && (
            <button
              onClick={() => {
                const action = isPending ? "move_to_inbox" : "move_to_pending";
                executeAction(handleToggleConversation, onToggleStatusSuccess, null, userId, action, getToken);
              }}
              disabled={loading}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-gray-700"
              role="menuitem"
            >
              <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-gray-600">
                {isPending ? <Inbox size={16} /> : <UserPlus size={16} />}
              </div>
              <div className="text-sm">
                {isPending ? "Chuyển sang Hộp thư chính" : "Chuyển sang Tin nhắn chờ"}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatOptionsMenu;
