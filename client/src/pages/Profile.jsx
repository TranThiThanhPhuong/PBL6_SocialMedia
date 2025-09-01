import React, { useState, useEffect, use } from "react";
import { useParams } from "react-router-dom";
import { dummyUserData, dummyPostData } from "../assets/assets";
import Loading from "../components/Loading";
import { useAuth } from "@clerk/clerk-react";
import moment from "moment";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

const Profile = () => {
  // 10:11p
  const currentUser = useSelector((state) => state.user.value);

  const { getToken } = useAuth();
  const { profileId } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [showEdit, setShowEdit] = useState(false);

  const fetchUser = async (profileId) => {
    const token = await getToken()
    try {
      const { data } = await api('/api/user/profiles', {profileId}, {
        headers: {Authorization: 'Bearer ${token}'}
      })
      if (data.success){
        setUser(data.profile)
        setPosts(data.posts)
      }
      else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }

    useEffect(()=>{
      if(profileId){
        fetchUser(profileId)
      }
      else {
        fetchUser(currentUser._id)
      }
    }, [profileId, currentUser])
    // setUser(dummyUserData);
    // setPosts(dummyPostData);
  };

  useEffect(() => {
    fetchUser();
  }, [profileId]);

  return user ? (
    <div className="relative h-full overflow-y-scroll bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {/* Cover Photo */}
          <div className="h-40 md:h-56 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">
            {user.cover_photo && (
              <img
                src={user.cover_photo}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
          {/* User Info */}
          <div className="p-4 md:p-6 relative">
            <h1 className="text-xl font-bold">{user.full_name}</h1>
            <p className="text-gray-600">@{user.username}</p>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default Profile;
