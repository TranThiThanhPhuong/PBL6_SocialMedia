import React from "react";
import { useNavigate, Link } from "react-router-dom";
import MenuItems from "./MenuItems";
import { CirclePlus, LogOut } from "lucide-react";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { useSelector } from "react-redux";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.value);
  const { signOut } = useClerk();

  return (
    <div
      className={`
        w-60 xl:w-72 
        sticky top-0 
        h-screen
        bg-white 
        border-r border-gray-200 
        flex flex-col 
        justify-between 
        items-center 
        overflow-y-auto
        max-sm:fixed
        max-sm:left-0
        max-sm:top-0
        max-sm:bottom-0
        z-20 
        ${sidebarOpen ? "translate-x-0" : "max-sm:-translate-x-full"} 
        transition-all duration-300 ease-in-out
      `}
    >
      {/* Top Section - Scrollable */}
      <div className="w-full flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 pb-2">
          <h1
            onClick={() => navigate("/")}
            className="logo-text logo-sidebar w-5 ml-7 my-2 cursor-pointer"
          >
            Social Media
          </h1>
          <hr className="border-gray-300" />
        </div>

        <div className="mt-6">
          <MenuItems setSidebarOpen={setSidebarOpen} />

          <Link
            to="/create-post"
            className="flex items-center justify-center gap-2 py-3 mt-6 mx-6 rounded-lg bg-blue-500 hover:bg-blue-600 active:scale-95 transition text-white cursor-pointer shadow-lg"
          >
            <CirclePlus className="w-5 h-5" />
            Tạo bài viết
          </Link>
        </div>
      </div>

      {/* Bottom Section - Always Visible */}
      <div className="w-full border-t border-gray-200 p-4 px-7 flex items-center justify-between bg-white flex-shrink-0">
        <div className="flex gap-2 items-center cursor-pointer">
          <UserButton />
          <div>
            <h1 className="text-sm font-medium">{user.full_name}</h1>
            <p className="text-xs text-gray-500">{user.username}</p>
          </div>
        </div>

        <LogOut
          onClick={signOut}
          className="lucide lucide-log-out w-4.5 text-gray-400 hover:text-gray-700 transition cursor-pointer"
        />
      </div>
    </div>
  );
};

export default Sidebar;