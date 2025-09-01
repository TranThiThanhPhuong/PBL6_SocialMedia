import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../features/user/userSlice.js';
import connectionsReducer from '../features/connections/connectionsSlice.js';
import messagesReducer from '../features/messages/messagesSlide.js';

export const store = configureStore({
  reducer: {
    user: userReducer,
    connections: connectionsReducer,
    messages: messagesReducer,
  },
});

// file store.js gom toàn bộ slice lại để quản lý state tập trung.
// giúp bạn xử lý state phức tạp (như social app, chat app).