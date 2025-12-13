import express from "express"
import { protect } from "../middlewares/auth.js" // middleware de kiem tra user da dang nhap chua
import { upload } from "../configs/multer.js" // middleware de xu ly upload file
import { getUserRecentMessages } from "../controllers/messageController.js"
import { followUser, unfollowUser, sendConnectionRequest, removeConnectionRequest, cancelConnectionRequest, acceptConnectionRequest, rejectConnectionRequest, blockUser, unblockUser, getUserConnections, getConnectionStatus, getUserById } from "../controllers/connectionController.js"
import { discoverUser, getUserData, updateUserData, getUserProfiles, getUserList , reportUser, getAllUsers, lockUser, unlockUser, loginAdmin} from "../controllers/userController.js"
import { adminAuth, checkUserStatus } from '../middlewares/adminAuth.js';


const userRouter = express.Router()

userRouter.post("/admin/login", loginAdmin);
userRouter.get('/data', protect,  getUserData)
userRouter.post('/profiles', getUserProfiles)
userRouter.get('/recent-messages', protect, getUserRecentMessages)
userRouter.get('/connections', protect, getUserConnections)
userRouter.get("/connection-status/:id", protect, getConnectionStatus);
userRouter.post('/update', upload.fields([{name: 'profile', maxCount: 1}, {name: 'cover', maxCount: 1}]), protect, updateUserData)
userRouter.post('/discover', protect, discoverUser)
userRouter.post('/follow', protect, checkUserStatus, followUser)
userRouter.post('/unfollow', protect, unfollowUser)
userRouter.post('/connect', protect, checkUserStatus, sendConnectionRequest)
userRouter.post('/accept', protect, acceptConnectionRequest)
userRouter.post('/cancel-request', protect, cancelConnectionRequest);
userRouter.post('/remove-friend', protect, removeConnectionRequest);
userRouter.post('/reject', protect, rejectConnectionRequest);
userRouter.post("/report-user", protect, reportUser);
userRouter.get('/all',adminAuth, getAllUsers);// dùng middleware của admin để get all users
userRouter.patch('/:userId/lock',adminAuth, lockUser);     
userRouter.patch('/:userId/unlock', adminAuth, unlockUser);
userRouter.post("/block", protect, blockUser);
userRouter.post("/unblock", protect, unblockUser);
userRouter.get('/:userId', protect, getUserById);
userRouter.get("/:id/:type", protect, getUserList);

export default userRouter 

// Trình tự chuẩn phải là: auth trước → upload → controller.