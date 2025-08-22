import { Inngest } from "inngest";
import User from "../models/User.js";

// tao 1 client để gửi và nhận sự kiện
export const inngest = new Inngest({ id: "safepost-app" });

// syncUserCreation sẽ được sử dụng để đồng bộ hóa việc tạo người dùng
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" }, // định nghĩa hàm với id là 'sync-user-from-clerk'
  { event: "clerk/user.created" }, // sự kiện sẽ được lắng nghe là 'clerk/user.created'

  // mô tả hàm này sẽ được gọi khi có sự kiện 'clerk/user.created'
  async ({ event }) => {
    const { id, first_name, last_name, email_address, image_url } = event.data; // destructuring dữ liệu từ sự kiện
    let username = email_address[0].email_address.split("@")[0]; // lấy username từ email

    const user = await User.findOne({ username }); // tìm người dùng trong cơ sở dữ liệu theo username

    if (user) {
      // nếu tìm thấy người dùng
      username = username + Math.floor(Math.random() * 10000 ); // thêm một số ngẫu nhiên vào username
    }

    // tạo một đối tượng người dùng mới với các thông tin từ sự kiện va luu vào cơ sở dữ liệu
    const userData = {
      id, // lấy id từ dữ liệu sự kiện
      email: email_address[0].email_address, // lấy email từ dữ liệu sự kiện
      full_name: first_name + " " + last_name, // kết hợp first_name và last_name thành full_name
      profile_picture: image_url, // lấy ảnh từ dữ liệu sự kiện
      username, // sử dụng username đã được xử lý
    };

    await User.create(userData); // tạo người dùng mới trong cơ sở dữ liệu
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" }, 
  { event: "clerk/user.update" }, 

  async ({ event }) => {
    const { id, first_name, last_name, email_address, image_url } = event.data;

    const updatedUserData = {
      email: email_address[0].email_address, 
      full_name: first_name + " " + last_name, 
      profile_picture: image_url,
    };

    await User.findByIdAndUpdate( id, updatedUserData);
    
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" }, 
  { event: "clerk/user.delete" }, 

  async ({ event }) => {
    const { id } = event.data;
    
    await User.findByIdAndDelete(id); // xóa người dùng khỏi cơ sở dữ liệu theo id
    
  }
);

// tao 1 mảng rỗng để xuất các hàm Inngest 
export const functions = [
    syncUserCreation, 
    syncUserUpdation,
    syncUserDeletion
];
