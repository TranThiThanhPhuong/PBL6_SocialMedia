import React from "react";

const MessagesPrivate = ({ children }) => {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">Tin nhắn hiện tại</h1>
      {children}
    </>
  );
};

export default MessagesPrivate;