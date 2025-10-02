import User from "../models/User.js";
import Post from "../models/Post.js";
import Connection from "../models/Connection.js";
import fs from "fs";
import imagekit from "../configs/imageKit.js";
import { inngest } from "../inngest/index.js";

// Lấy dữ liệu người dùng dựa trên userId từ token xác thực
export const getUserData = async (req, res) => {
  try {
    const { userId } = req.auth(); // Clerk userId

    // Tìm user theo _id (vì bạn đã set _id = Clerk userId trong schema)
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "Không tìm thấy người dùng" });
    } // neu khong tim thay user thi tra ve loi

    res.json({ success: true, user }); // tra ve du lieu nguoi dung
  } catch (error) {
    console.error("Lỗi khi tìm người dùng:", error);
    res.json({ success: false, message: error.message });
  }
};

export const updateUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    let { username, bio, location, full_name } = req.body; // lay du lieu tu body, su dung let de co the gan lai gia tri(vi thay doi)
    const tempUser = await User.findById(userId); // lay thong tin nguoi dung hien tai

    !username && (username = tempUser.username);

    if (tempUser.username !== username) {
      const user = await User.findOne(username );
      if (user) {
        username = tempUser.username;
      }
    }

    const updatedData = {
      username,
      bio,
      location,
      full_name,
    };
    const profile = req.files.profile && req.files.profile[0]; // req.files.profile là mảng các file, lấy phần tử đầu tiên
    const cover = req.files.cover && req.files.cover[0]; // req.files.cover là mảng các file, lấy phần tử đầu tiên

    if (profile) {
      const buffer = fs.readFileSync(profile.path);
      const response = await imagekit.upload({
        file: buffer, // dung de upload file
        fileName: profile.originalname, // ten file
      });
      // Đọc file → upload lên ImageKit.
      // Sau khi upload thành công → xóa file local.
      // fs.unlinkSync(profile.path);

      const url = imagekit.url({
        path: response.filePath,
        transformation: [
          {
            quality: "auto",
            format: "webp",
            width: "512",
          },
        ],
      });
      updatedData.profile_picture = url;
    } // neu upload thanh cong se tra ve mot object chua thong tin ve file vua upload

    if (cover) {
      const buffer = fs.readFileSync(cover.path);
      const response = await imagekit.upload({
        file: buffer, // dung de upload file
        fileName: cover.originalname, // ten file
      }); // neu upload thanh cong se tra ve mot object chua thong tin ve file vua upload
      // Đọc file → upload lên ImageKit.
      // Sau khi upload thành công → xóa file local.
      // fs.unlinkSync(profile.path);

      const url = imagekit.url({
        path: response.filePath,
        transformation: [
          {
            quality: "auto",
            format: "webp",
            width: "1280",
          },
        ],
      }); // tao url voi kich thuoc va dinh dang mong muon
      updatedData.cover_photo = url; // luu url vao updatedData de cap nhat vao csdl
    }

    const user = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
    }); // Tìm và cập nhật dữ liệu người dùng, trả về dữ liệu đã được cập nhật

    res.json({
      success: true,
      user,
      message: "Cập nhật thông tin người dùng thành công",
    }); // Trả về dữ liệu người dùng đã được cập nhật
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Tìm kiếm người dùng dựa trên input (username, email, full_name, location)
export const discoverUser = async (req, res) => {
  try {
    const { userId } = req.auth(); // id nguoi dung hien tai
    const { input } = req.body; // input để tìm kiếm

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, "i") },
        { email: new RegExp(input, "i") },
        { full_name: new RegExp(input, "i") },
        { location: new RegExp(input, "i") },
      ],
    });

    // Loại bỏ người dùng hiện tại khỏi kết quả tìm kiếm
    const filteredUsers = allUsers.filter((user) => user._id !== userId);

    // Trả về kết quả tìm kiếm
    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// theo doi nguoi dung
export const followUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body; // id nguoi dung can theo doi

    // kiem tra nguoi dung can theo doi co ton tai khong
    const user = await User.findById(userId);
    if (user.following.includes(id)) {
      return res.json({
        success: false,
        message: "Bạn đã theo dõi người dùng này rồi",
      });
    }

    // them userId vao followers cua nguoi duoc theo doi
    user.following.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers.push(userId);
    await toUser.save();

    res.json({ success: true, message: "Theo dõi người dùng thành công" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body; // id nguoi dung can theo doi

    const user = await User.findById(userId);

    user.following = user.following.filter((user) => user !== id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers = toUser.followers.filter((user) => user !== userId);
    await toUser.save();

    res.json({ success: true, message: "Đã bỏ theo dõi người dùng" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body; // id nguoi dung can ket noi

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h truoc ngay hien tai
    const connectionRequests = await Connection.find({
      from_user_id: userId,
      created_at: { $gt: last24Hours },
    }); // tim tat ca cac yeu cau ket ban trong 24h qua

    if (connectionRequests.length >= 20) {
      return res.json({
        success: false,
        message:
          "Bạn đã đạt giới hạn 20 lời mời kết nối trong 24 giờ qua. Vui lòng thử lại sau",
      });
    } // neu da gui 20 yeu cau trong 24h thi khong cho gui nua, dieu nay de ngan chan spam

    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id }, // nguoi gui la userId, nguoi nhan la id
        { from_user_id: id, to_user_id: userId }, // nguoi gui la id, nguoi nhan la userId
      ],
    }); // kiem tra xem da gui yeu cau ket ban chua

    if (!connection) {
      const newConnection = await Connection.create({
        from_user_id: userId,
        to_user_id: id,
      }); // tao moi yeu cau ket ban

      await inngest.send({
        name: "app/connection-request",
        data: { connectionId: newConnection._id },
      }); // gui su kien connection-request den inngest de gui email

      return res.json({
        success: true,
        message: "Đã gửi lời mời kết nối",
      });
    } // neu chua gui yeu cau thi tao moi yeu cau ket ban
    else if (connection && connection.status === "accepted") {
      return res.json({
        success: false,
        message: "Bạn đã kết nối với người dùng này rồi",
      });
    } // neu da ket ban roi thi khong cho gui yeu cau nua

    return res.json({ success: false, message: "Bạn đã gửi lời mời kết nối trước đó" });
    // neu da gui yeu cau ket ban roi thi thong bao da gui yeu cau roi
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getUserConnections = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId).populate(
      "connections followers following"
    ); // lay thong tin nguoi dung hien tai

    const connections = user.connections; // lay danh sach ket noi
    const followers = user.followers; // lay danh sach nguoi theo doi
    const following = user.following; // lay danh sach nguoi dang theo doi

    const pendingConnections = (
      await Connection.find({ to_user_id: userId, status: "pending" }).populate(
        "from_user_id"
      )
    ).map((connection) => connection.from_user_id); // lay danh sach ket noi dang cho duyet

    res.json({
      success: true,
      connections,
      followers,
      following,
      pendingConnections,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body; // id nguoi dung can chap nhan ket noi

    const connection = await Connection.findOne({
      from_user_id: id,
      to_user_id: userId,
    }); // tim yeu cau ket noi tu id den userId

    if (!connection) {
      return res.json({
        success: false,
        message: "Không tìm thấy lời mời kết nối",
      });
    } // neu khong tim thay yeu cau ket noi thi thong bao loi

    const user = await User.findById(userId);
    user.connections.push(id); // them id vao danh sach ket noi cua nguoi dung hien tai
    await user.save(); // luu thay doi

    const toUser = await User.findById(id);
    toUser.connections.push(userId); // them userId vao danh sach ket noi cua nguoi gui yeu cau ket noi
    await toUser.save(); // luu thay doi

    connection.status = "accepted"; // cap nhat trang thai yeu cau ket noi thanh da chap nhan
    await connection.save(); // luu thay doi

    res.json({ success: true, message: "Chấp nhận kết nối thành công" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getUserProfiles = async (req, res) => {
  try {
    const { profileId } = req.body; // id nguoi dung can lay thong tin
    const profile = await User.findById(profileId); // tim nguoi dung theo id
    if (!profile) {
      return res.json({ success: false, message: "Không tìm thấy hồ sơ" });
    }
    const posts = await Post.find({ user: profileId }).populate("user"); // populate de lay thong tin nguoi dung cho moi bai viet

    res.json({ success: true, profile, posts });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};