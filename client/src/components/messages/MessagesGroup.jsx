const MessagesGroup = ({ children }) => {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">Tin nhắn nhóm</h1>
      {children}
    </>
  );
};

export default MessagesGroup;