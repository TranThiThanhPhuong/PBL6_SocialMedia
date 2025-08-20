import React from "react";
import { assets } from "../assets/assets";
import { Star } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";


const Login = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* bg */}
      <img src={assets.bgImage} alt="" className="absolute top-0 left-0 -z-1 w-full h-full object-cover" />

      {/* banding */}
      <div className="flex-1 flex flex-col items-start justify-between p-6 md:p-10 lg:pl-40">
        <h1 className="logo-text">Safe Post</h1>
        {/* <img src={assets.logo} alt="logo" className="h-12 object-contain" /> */}
        <div>
          <div className="flex items-center gap-3 mb-4 max-md:mt-10">
            <img src={assets.group_users} alt="login" className="h-8 md:h-10" />
            <div>
              <div className="flex">
                {Array(5).fill(0).map((_, i)=>(<Star key={i} className='size-4 md:size-4.5 text-transparent fill-amber-500'/>))}
              </div>
              <p> Hơn 12k người dùng đang sử dụng</p>
              
            </div>
          </div>
          <h1 class="text-3xl md:text-6xl md:pb-2 font-bold bg-gradient-to-r from-indigo-950 to-indigo-800 bg-clip-text text-transparent">Hơn cả những người bạn thực sự kết nối</h1>
          <p class="text-xl md:text-3xl text-indigo-900 max-w-72 md:max-w-md">kết nối với cộng đồng toàn cầu trên Safe Post.</p>
        </div>
        <span class="md:h-10"></span>
       </div>

       {/* Right Login */}

      <div class="flex-1 flex items-center justify-center p-6 sm:p-10">

        {/* Sử dụng SignIn từ Clerk để hiển thị form đăng nhập */}
        {/* SignIn sẽ tự động quản lý trạng thái đăng nhập và đăng ký người dùng */}
        <SignIn />
      </div>
    </div>
  );
};

export default Login;
