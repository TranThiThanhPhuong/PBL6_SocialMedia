import React from "react";
import { BadgeCheck } from "lucide-react";
import { slugifyUser } from "../../app/slugifyUser";
import ConnectionActions from "./ConnectionActions";

const ConnectionCard = ({
  user,
  currentUser,
  handlers,
  currentTab,
  navigate,
}) => {
  return (
    <div className="flex flex-col bg-white border border-gray-100 shadow-sm rounded-xl p-5 hover:shadow-md transition-all duration-200">
      <div
        onClick={() => {
          if (user._id === currentUser._id) navigate("/profile");
          else navigate(`/profile-user/${slugifyUser(user)}`);
        }}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <img
          src={user.profile_picture}
          alt=""
          className="rounded-full w-14 h-14 object-cover border-2 border-indigo-100 group-hover:scale-105 transition-transform"
        />
        <div>
          <div className="flex items-center space-x-1">
            <span className="font-semibold text-slate-900">
              {user.full_name}
            </span>
            <BadgeCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-gray-500 text-sm">@{user.username}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <ConnectionActions
          tab={currentTab}
          user={user}
          handlers={handlers}
          currentUser={currentUser}
          navigate={navigate}
        />
      </div>
    </div>
  );
};

export default ConnectionCard;
