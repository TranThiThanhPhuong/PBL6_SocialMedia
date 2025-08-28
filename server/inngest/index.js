import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import sendEmail  from "../configs/nodeMailer.js";

// tao 1 client để gửi và nhận sự kiện
export const inngest = new Inngest({ id: "safepost-app" });

// syncUserCreation sẽ được sử dụng để đồng bộ hóa việc tạo người dùng
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" }, // định nghĩa hàm với id là 'sync-user-from-clerk'
  { event: "clerk/user.created" }, // sự kiện sẽ được lắng nghe là 'clerk/user.created'

  // mô tả hàm này sẽ được gọi khi có sự kiện 'clerk/user.created'
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data; // destructuring dữ liệu từ sự kiện
    // Clerk lưu email trong mảng email_addresses
    let username = email_addresses[0].email_address.split("@")[0]; // lấy phần trước dấu @ làm username

    const user = await User.findOne({ username }); // kiểm tra xem username đã tồn tại trong cơ sở dữ liệu chưa
    if (user) {
      username = username + Math.floor(Math.random() * 10000); // nếu đã tồn tại, thêm số ngẫu nhiên vào cuối username
    }

    const userData = {
      _id: id, // sử dụng Clerk userId làm _id trong MongoDB
      email: email_addresses[0].email_address, // lấy email đầu tiên
      full_name: first_name + " " + last_name, // ghép họ và tên
      profile_picture: image_url, // ảnh đại diện
      username
    }; 
    await User.create(userData); // tạo người dùng mới trong cơ sở dữ liệu
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" }, 
  { event: "clerk/user.updated" }, 

  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const updatedUserData = {
      email: email_addresses[0].email_address, 
      full_name: first_name + " " + last_name, 
      profile_picture: image_url,
    };

    await User.findByIdAndUpdate( id, updatedUserData);
    
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" }, 
  { event: "clerk/user.deleted" }, 

  async ({ event }) => {
    const { id } = event.data;
    
    await User.findByIdAndDelete(id); // xóa người dùng khỏi cơ sở dữ liệu theo id
    
  }
);

const sendNewConnectionRequestReminder = inngest.createFunction(
  { id: "send-new-connection-request-reminder" },
  { event: "app/connection-request" },
  async ({ event, step }) => { // step dùng để chia nhỏ các bước trong hàm
    const {connectionId} = event.data; 
    
    await step.run("send-connection-request-mail", async () => {
      const connection = await Connection.findById(connectionId).populate('from_user_id', 'to_user_id'); // populate để lấy thông tin người gửi và người nhận
      const subject = 'New Connection Request';
      const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; color: #333;">
        <h2>Hi ${connection.to_user_id.full_name}, </h2>
        <p>You have a new connection request from ${connection.from_user_id.full_name} - @${connection.from_user_id.username}</p>
        <p>Click <a href="${process.env.FRONTEND_URL}/connections" style="color: #10b981;">here</a> to accept or reject to the request.</p>
        <br/>
        <p>Thanks, <br/>PBL6 - LPT</p>
      </div>
      `;

      await sendEmail({
        to: connection.to_user_id.email,
        subject,
        body
      });
    });

    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000); 
    await step.sleepUntil("wait-24-hours", in24Hours); // ngủ đến 24 giờ sau
    await step.run("send-connection-request-reminder", async () => {
      const connection = await Connection.findById(connectionId).populate('from_user_id', 'to_user_id'); // lấy thông tin người gửi và người nhận
      if(connection.status === "accepted"){
        return {message: "Already accepted."};
      }

      const subject = 'New Connection Request';
      const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; color: #333;">
        <h2>Hi ${connection.to_user_id.full_name}, </h2>
        <p>You have a new connection request from ${connection.from_user_id.full_name} - @${connection.from_user_id.username}</p>
        <p>Click <a href="${process.env.FRONTEND_URL}/connections" style="color: #10b981;">here</a> to accept or reject to the request.</p>
        <br/>
        <p>Thanks, <br/>PBL6 - LPT</p>
      </div>
      `;

      await sendEmail({
        to: connection.to_user_id.email,
        subject,
        body
      });

      return ({message: "Reminder email sent."})
    })
  }
)

// tao 1 mảng rỗng để xuất các hàm Inngest 
export const functions = [
    syncUserCreation, 
    syncUserUpdation,
    syncUserDeletion,
    sendNewConnectionRequestReminder
];