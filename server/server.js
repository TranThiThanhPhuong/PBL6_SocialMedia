import express from 'express'
import cors from 'cors' // 
import 'dotenv/config' ;  
import connectDB from './configs/db.js'
import { inngest, functions} from './inngest/index.js'
import { serve } from 'inngest/express'
import { clerkMiddleware } from '@clerk/express'
import userRouter from './routes/userRoutes.js';
import postRouter from './routes/postRoutes.js';
import storyRouter from './routes/storyRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import notificationRouter from "./routes/notificationRouter.js";

const app = express() // tạo một ứng dụng server Express, 

await connectDB() // gọi hàm connectDB để kết nối đến MongoDB

app.use(cors()) // sử dụng middleware CORS để cho phép các yêu cầu từ các nguồn khác nhau
app.use(clerkMiddleware()) // sử dụng middleware của Clerk để xác thực người dùng
app.use(express.json()) // middleware để phân tích cú pháp JSON trong các yêu cầu đến

app.get('/', (req, res) => res.send('Hello World!'))
app.use("/api/inngest", serve({client: inngest, functions})); // sử dụng hàm serve để xử lý các yêu cầu đến đường dẫn /api/inngest liên quan đến Inngest
app.use('/api/user', userRouter) 
app.use('/api/post', postRouter)
app.use('/api/story', storyRouter) 
app.use('/api/message', messageRouter) 
app.use('/api/comment', commentRouter) 
app.use('/api/notifications', notificationRouter);

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))      

// Đây là entry point của backend.
// Nó kết nối DB, cấu hình middleware, mount router, và start server.
// Mọi request từ client → đi vào đây trước tiên → rồi được phân nhánh tới router thích hợp.
// file server.js sẽ lắng nghe các yêu cầu từ client

// install: clerk, express, mongoose, cors, dotenv, multer, imagekit, inngest, nodemailer
// brevo, vercel, 