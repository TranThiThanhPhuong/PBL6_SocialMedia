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

// tao 1 mảng rỗng để xuất các hàm Inngest 
export const functions = [
    syncUserCreation, 
    syncUserUpdation,
    syncUserDeletion
];