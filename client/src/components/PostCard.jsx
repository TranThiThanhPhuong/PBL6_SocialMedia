import { useSelector } from 'react-redux';

const PostCard = ({ post }) => {
    const currentUser = useSelector((state) => state.user.value); // Lấy thông tin người dùng hiện tại từ Redux store
}