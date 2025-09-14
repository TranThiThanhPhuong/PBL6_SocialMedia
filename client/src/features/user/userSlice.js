import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios.js'
import { toast } from 'react-hot-toast'

const initialState = {
    value: null
} // trang thai ban dau

// Dùng khi cần lấy thông tin người dùng từ server.
// Nếu thành công → trả về user, lưu vào Redux state.
export const fetchUser = createAsyncThunk('user/fetchUser', async (token) => {
    const { data } = await api.get('/api/user/data', {
        headers: { Authorization: `Bearer ${token}` }
    }) 
    return data.success ? data.user : null;
})

// Dùng khi cập nhật thông tin người dùng trên server (ví dụ đổi tên, đổi avatar).
// Nếu thành công → server trả về user mới, Redux state cũng cập nhật lại theo.
export const updateUser = createAsyncThunk('user/update', async ({userData, token}) => {
    const { data } = await api.post('/api/user/update', userData, {
        headers: { Authorization: `Bearer ${token}` }
    }) // gui du lieu nguoi dung can cap nhat va token de xac thuc
    if (data.success){
        toast.success(data.message);
        return data.user;
    } // neu thanh cong, tra ve du lieu nguoi dung moi
    else {
        toast.error(data.message);
        return null;
    }
}) 

// Khi fetchUser hoặc updateUser chạy thành công → state.value = dữ liệu user mới.
const userSlice = createSlice({
    name: 'user', // ten slice
    initialState, // trang thai ban dau
    reducers: {
    }, // 
    extraReducers: (builder) => {
        builder.addCase(fetchUser.fulfilled, (state, action) => {
            state.value = action.payload // cap nhat trang thai khi hanh dong fetchUser thanh cong
        }).addCase(updateUser.fulfilled, (state, action) => {
            state.value = action.payload // cap nhat trang thai khi hanh dong updateUser thanh cong
        });
    }   
});

export default userSlice.reducer;

// file này định nghĩa một slice của Redux store để quản lý trạng thái người dùng, bao gồm các hành động bất đồng bộ để lấy và cập nhật dữ liệu người dùng từ server.
// Quản lý user ở 1 chỗ duy nhất trong toàn app.
// Dùng useSelector((state) => state.user.value) để lấy dữ liệu user ở bất kỳ component nào mà không cần gọi API lại.
// Tránh tình trạng mỗi component tự fetch user riêng → thừa thãi & khó đồng bộ.
// Khi updateUser thành công, Redux state thay đổi → tất cả component đang dùng user.value sẽ tự động re-render để hiển thị thông tin mới.