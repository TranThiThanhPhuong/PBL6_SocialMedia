import express from 'express'
import cors from 'cors' 
import 'dotenv/config' ;  
import connectDB from './configs/db.js' // import hàm connectDB từ file db.js trong thư mục config
import { inngest, functions} from './inngest/index.js' // import các hàm Inngest từ file index.js trong thư mục inngest
import { serve } from 'inngest/express' // import hàm serve từ thư viện inngest để xử lý các yêu cầu liên quan đến Inngest

// express dùng để tạo server
const app = express()

await connectDB() // gọi hàm connectDB để kết nối đến MongoDB

// cors dùng để xử lý các vấn đề liên quan đến cross-origin resource sharing
app.use(cors())

// express.json() dùng để parse dữ liệu JSON từ client
app.use(express.json())

// get là phương thức HTTP để lấy dữ liệu từ server
// khi client gửi yêu cầu GET đến đường dẫn '/', server sẽ trả về 'Hello World!'
// app.get() dùng để định nghĩa một route cho phương thức GET
app.get('/', (req, res) => res.send('Hello World!'))

// serve là middleware của inngest để xử lý các yêu cầu liên quan đến Inngest
app.use("/api/inngest", serve({
  client: inngest,
  functions,
}));


// PORT là biến môi trường để xác định cổng mà server sẽ lắng nghe
// nếu không có biến môi trường PORT thì sẽ sử dụng cổng 4000
const PORT = process.env.PORT || 4000

// app.listen() dùng để lắng nghe các yêu cầu từ client trên cổng PORT
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))        

// file server.js sẽ lắng nghe các yêu cầu từ client 
