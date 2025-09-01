import React from "react";
import { useSelector } from 'react-redux'; 


const CreatePost = () => {
  const user = useSelector((state) => state.user.value); // Lấy thông tin người dùng từ Redux store

  return (
    <div>
    </div>
  );
}

export default CreatePost;