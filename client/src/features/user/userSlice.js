import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios.js'
import { toast } from 'react-hot-toast'

const initialState = {
    value: null
} // trang thai ban dau

// ham bat dong bo de lay du lieu nguoi dung tu server
// export const fetchUser = createAsyncThunk('user/fetchUser', async (token) => {
//     const { data } = await api.get('/api/user/data', {
//         headers: { Authorization: `Bearer ${token}` }
//     }) 
//     return data.success ? data.user : null
// })

export const fetchUser = createAsyncThunk('user/fetchUser', async (token) => {
    const res = await api.get('/api/user/data', {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Fetch user response:", res.data);

    // Nếu backend trả về { success: true, data: { user info } }
    return res.data.success ? res.data.data : null;
});

// ham bat dong bo de cap nhat du lieu nguoi dung tren server
// userData chua du lieu nguoi dung can cap nhat
export const updateUser = createAsyncThunk('user/update', async ({userData, token}) => {
    const { data } = await api.post('/api/user/update', userData, {
        headers: { Authorization: `Bearer ${token}` }
    }) // gui du lieu nguoi dung can cap nhat va token de xac thuc
    if (data.success){
        toast.success(data.message)
        return data.user
    } // neu thanh cong, tra ve du lieu nguoi dung moi
    else {
        toast.error(data.message)
        return null
    }
}) 

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
        })
    } // xu ly cac hanh dong bat dong bo    
}) // tao slice

export default userSlice.reducer

// file này định nghĩa một slice của Redux store để quản lý trạng thái người dùng, bao gồm các hành động bất đồng bộ để lấy và cập nhật dữ liệu người dùng từ server.