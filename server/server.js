import express from 'express'
import cors from 'cors' 
import 'dotenv/config' ;  
import connectDB from './configs/db.js' // import hàm connectDB từ file db.js trong thư mục config
import { inngest, functions} from './inngest/index.js' // import các hàm Inngest từ file index.js trong thư mục inngest
import { serve } from 'inngest/express' // import hàm serve từ thư viện inngest để xử lý các yêu cầu liên quan đến Inngest
import { clerkMiddleware } from '@clerk/express' // import middleware từ thư viện Clerk để xác thực người dùng
import userRouter from './routes/userRoutes.js';
import postRouter from './routes/postRoutes.js';
import storyRouter from './routes/storyRoutes.js';
import messageRouter from './routes/messageRoutes.js';

const app = express() // tạo một ứng dụng server Express, 

await connectDB() // gọi hàm connectDB để kết nối đến MongoDB

app.use(cors()) // sử dụng middleware CORS để cho phép các yêu cầu từ các nguồn khác nhau
app.use(clerkMiddleware()) // sử dụng middleware của Clerk để xác thực người dùng
app.use(express.json()) // middleware để phân tích cú pháp JSON trong các yêu cầu đến

app.get('/', (req, res) => res.send('Hello World!')) // định nghĩa một route cơ bản để kiểm tra server có hoạt động không
app.use("/api/inngest", serve({client: inngest, functions})); // sử dụng hàm serve để xử lý các yêu cầu đến đường dẫn /api/inngest liên quan đến Inngest
app.use('/api/user', userRouter) // su dung userRouter cho các route liên quan
app.use('/api/post', postRouter) // su dung postRouter cho các route liên quan
app.use('/api/story', storyRouter) // su dung postRouter cho các route liên quan
app.use('/api/message', messageRouter) // su dung messageRouter cho cac route lien quan

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`)) // khởi động server và lắng nghe các yêu cầu trên cổng được chỉ định       

// file server.js sẽ lắng nghe các yêu cầu từ client 

// install: clerk, express, mongoose, cors, dotenv, multer, imagekit, inngest, nodemailer
// brevo, vercel, 