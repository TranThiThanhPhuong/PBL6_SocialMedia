import React from "react";

const MessageMenu = ({ onSelect }) => {
  return (
    <div className="absolute right-5 top-16 bg-white shadow-xl rounded-xl border w-48 z-50">
      <button
        onClick={() => onSelect("private")}
        className="w-full text-left px-4 py-3 hover:bg-gray-100"
      >
        ⭐ Tin nhắn hiện tại
      </button>
      <button
        onClick={() => onSelect("group")}
        className="w-full text-left px-4 py-3 hover:bg-gray-100"
      >
        👥 Tin nhắn nhóm
      </button>
      <button
        onClick={() => onSelect("pending")}
        className="w-full text-left px-4 py-3 hover:bg-gray-100"
      >
        ⏳ Tin nhắn chờ
      </button>
    </div>
  );
};

export default MessageMenu;