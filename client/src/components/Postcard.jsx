import { useState } from 'react';
import { useSelector } from 'react-redux';

const Postcard = ({ setShowEdit }) => {
    const currentUser = useSelector((state) => state.user.value); // Lấy thông tin người dùng hiện tại từ Redux store
}