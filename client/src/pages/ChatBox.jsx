import React, { useState, useEffect, useRef } from "react";
import { ImageIcon, SendHorizontal } from "lucide-react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import { addMessage, fetchMessages, resetMessages } from "../features/messages/messagesSlice";
import toast from "react-hot-toast";
import socket from "../app/socket";

const ChatBox = () => {
  const { userId } = useParams();
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const { messages } = useSelector((state) => state.messages);
  const connections = useSelector((state) => state.connections.connections);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchUserMsgs = async () => {
      try {
        const token = await getToken();
        dispatch(fetchMessages({ token, userId }));
      } catch (error) {
        toast.error(error.message);
      }
    };
    fetchUserMsgs();
    return () => dispatch(resetMessages());
  }, [userId]);

  useEffect(() => {
    if (connections.length > 0) {
      const u = connections.find((c) => c._id === userId);
      setUser(u);
    }
  }, [connections, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    try {
      if (!text && !image) return;
      const token = await getToken();
      const formData = new FormData();
      formData.append("to_user_id", userId);
      if (text) formData.append("text", text);
      if (image) formData.append("image", image);

      const { data } = await api.post("/api/message/send", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        dispatch(addMessage(data.message));
        setText("");
        setImage(null);
        socket.emit("send_message", {
          from_user_id: data.message.from_user_id,
          to_user_id: data.message.to_user_id,
          text: data.message.text,
          media_url: data.message.media_url,
          message_type: data.message.message_type,
        });
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (!user)
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Chọn một người để nhắn tin
      </div>
    );

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
        <img src={user.profile_picture} alt="" className="w-8 h-8 rounded-full" />
        <div>
          <p className="font-medium">{user.full_name}</p>
          <p className="text-sm text-gray-500">@{user.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages
            .toSorted((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.to_user_id !== user._id ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`p-2 rounded-lg max-w-xs shadow ${
                    msg.to_user_id !== user._id
                      ? "bg-white text-gray-800 rounded-bl-none"
                      : "bg-indigo-500 text-white rounded-br-none"
                  }`}
                >
                  {msg.message_type === "image" && (
                    <img src={msg.media_url} className="w-52 rounded mb-1" />
                  )}
                  {msg.text && <p>{msg.text}</p>}
                </div>
              </div>
            ))}
          <div ref={messagesEndRef}></div>
        </div>
      </div>

      {/* Input */}
      <div className="p-4">
        <div className="flex items-center gap-3 bg-white border rounded-full shadow px-4 py-2">
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            className="flex-1 outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <label htmlFor="image">
            {image ? (
              <img src={URL.createObjectURL(image)} alt="" className="h-8 rounded" />
            ) : (
              <ImageIcon className="text-gray-400 cursor-pointer" />
            )}
            <input
              type="file"
              id="image"
              hidden
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
            />
          </label>
          <button
            onClick={sendMessage}
            className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-full"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;