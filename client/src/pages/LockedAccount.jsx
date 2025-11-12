// client/src/pages/LockedAccountPage.jsx

import React from 'react';
import { ShieldAlert } from 'lucide-react';

const LockedAccount = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Tài khoản của bạn đã bị khóa
        </h1>
        <p className="text-gray-600">
          Tài khoản này đã bị Quản trị viên vô hiệu hóa do vi phạm chính sách hoặc quy định của cộng đồng.
        </p>
        <p className="text-gray-600 mt-2">
          Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.
        </p>
      </div>
    </div>
  );
};

export default LockedAccount;