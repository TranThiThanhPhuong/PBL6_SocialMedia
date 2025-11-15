import React from "react";
import { Inbox, Users, Bookmark, MessageSquare } from "lucide-react";

const MessageMenu = ({ onSelect, currentChatUser }) => {
  return (
    <div className="absolute top-12 right-0 w-56 bg-white shadow-xl rounded-lg border border-gray-200 z-50">
      {/* 🔹 Quay lại tin nhắn hiện tại */}
      <button
        onClick={() => onSelect("current")}
        disabled={!currentChatUser}
        className={`flex items-center gap-2 px-4 py-2 w-full text-left
          ${
            currentChatUser
              ? "hover:bg-gray-100 cursor-pointer"
              : "opacity-40 cursor-not-allowed"
          }
        `}
      >
        <MessageSquare size={18} /> Tin nhắn hiện tại
      </button>

      <button
        onClick={() => onSelect("pending")}
        className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100 text-left"
      >
        <Inbox size={18} /> Tin nhắn chờ
      </button>

      <button
        onClick={() => onSelect("groups")}
        className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100 text-left"
      >
        <Users size={18} /> Tin nhắn nhóm
      </button>

      <button
        onClick={() => onSelect("saved")}
        className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100 text-left"
      >
        <Bookmark size={18} /> Đã lưu
      </button>
    </div>
  );
};

export default MessageMenu;