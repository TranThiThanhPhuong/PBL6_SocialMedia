import { assets } from "../assets/assets";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import Loading from "../components/Loading";
import StoriesBar from "../components/StoriesBar";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import RecentMessages from "../components/RecentMessages";
import MiniChatBox from "../components/MiniChatBox";
import SuggestedUsers from "../components/SuggestedUsers";

const Feed = () => {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const [activeChatUser, setActiveChatUser] = useState(null);

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/post/feed", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setFeeds(data.posts);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const handlePostDeleted = (postId) => {
    setFeeds((prev) => prev.filter((p) => p._id !== postId));
  };

  const handlePostUpdated = (updatedPost) => {
    const postIndex = feeds.findIndex((p) => p._id === updatedPost._id);

    if (postIndex !== -1) {
      setFeeds((prev) =>
        prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
      );
    } else {
      setFeeds((prev) => [updatedPost, ...prev]);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="h-full overflow-y-scroll no-scrollbar py-10 xl:pr-5 flex items-start justify-center xl:gap-8">
      {/* Stories and post list */}
      <div>
        <StoriesBar />

        <div className="p-4 space-y-6">
          <CreatePost onPostCreated={(post) => setFeeds((prev) => [post, ...prev])} />

          {feeds.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPostDeleted={handlePostDeleted}
              onPostUpdated={handlePostUpdated}
            />
          ))}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="max-xl:hidden sticky w-80 space-y-6">
        {/* <div className="max-w-xs bg-white text-xs p-4 rounded-md inline-flex flex-col gap-2 shadow">
          <h3 className="text-slate-800 font-semibold">Được tài trợ</h3>
          <img
            src={assets.sponsored_img}
            className="w-75px h-50px rounded-md"
            alt=""
          />
          <p className="text-slate-600">Tiếp thị qua Email</p>
          <p className="text-slate-400">
            Tăng cường hiệu quả tiếp thị của bạn với một nền tảng mạnh mẽ, dễ sử
            dụng và được xây dựng để mang lại kết quả.
          </p>
        </div> */}
        <SuggestedUsers />

        <RecentMessages onUserSelect={(user) => setActiveChatUser(user)} />
      </div>
      {activeChatUser && (
        <MiniChatBox
          targetUser={activeChatUser}
          onClose={() => setActiveChatUser(null)}
        />
      )}
    </div>
  );
};

export default Feed;