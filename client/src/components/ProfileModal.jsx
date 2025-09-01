import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../features/user/userSlice';
import { useAuth } from '@clerk/clerk-react';
import { useState } from 'react';


const ProfileModal = ({ setShowEdit }) => {
    const dispatch = useDispatch();
    const { getToken } = useAuth();

    const user = useSelector((state) => state.user.value); // Lấy thông tin người dùng hiện tại từ Redux store

    const [editFrom, setEditForm] = useState({
        username: user.username,
        bio: user.bio,
        location: user.location,
        profile_picture: null,
        cover_photo: null,
        full_name: user.full_name,
    })

    const handleSaveProfile = async (e) => {
        e.prevenDefault();
        try {
            const userData = new FormData();
            const { full_name, username, bio, location,profile_picture, cover_photo} = editFrom

            userData.append('username', username);
            userData.append('bio', bio);
            userData.append('location', location);
            userData.append('full_name', full_name);
            profile_picture && userData.append('profile', profile_picture);
            cover_photo && 

            
            //const token = await getToken();
            dispatch(updateUser({useData, token}))
        } catch (error) {
            
        }
    }
}