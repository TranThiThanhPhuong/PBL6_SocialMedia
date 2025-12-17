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
      className="absolute top-17 right-2 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
    >
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left"
      >
        <X size={16} />
      </button>
      <button
        onClick={() => navigate(`/profile-user/${slugifyUser(user)}`)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left"
      >
        <UserCircle size={16} /> Trang cá nhân
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
        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left"
      >
        <Trash2 size={16} /> Xóa chat
      </button>
      <button
        onClick={() =>
          executeAction(handleReport, null, null, userId, getToken)
        }
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left"
      >
        <Flag size={16} /> Báo cáo
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
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 w-full text-left text-green-600 text-sm font-medium"
        >
          <UserCheck size={16} /> Bỏ chặn
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
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 w-full text-left text-red-600 text-sm font-medium"
        >
          <UserX size={16} /> Chặn người này
        </button>
      )}
      <div className="border-t border-gray-100 my-1"></div>
      {!isBlocked && (
        <button
          onClick={() => {
            // Xác định hành động dựa trên trạng thái hiện tại
            const action = isPending ? "move_to_inbox" : "move_to_pending";
            executeAction(
              handleToggleConversation,
              onToggleStatusSuccess,
              null,
              userId,
              action,
              getToken
            );
          }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-100 w-full text-left text-gray-700 text-sm"
        >
          {isPending ? (
            <>
              <Inbox size={16} /> Chuyển sang Hộp thư chính
            </>
          ) : (
            <>
              <UserPlus size={16} /> Chuyển sang Tin nhắn chờ
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ChatOptionsMenu;
