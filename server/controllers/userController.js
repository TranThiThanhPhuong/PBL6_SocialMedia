// controllers/userController.js
import User from "../models/User.js";
import Post from "../models/Post.js";
import fs from "fs";
import imagekit from "../configs/imageKit.js";
import { inngest } from "../inngest/index.js";
import jwt from "jsonwebtoken";

const getIdFromReq = (req) => {
  // Hỗ trợ cả :id (params) và { id } (body)
  return req.params?.id || req.body?.id || null;
};

export const getUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    console.log("getUserData request by:", userId);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ Lỗi khi tìm người dùng:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    console.log("updateUserData by:", userId);

    let { username, bio, location, full_name } = req.body;

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    if (!username) username = currentUser.username;

    if (currentUser.username !== username) {
      const existing = await User.findOne({ username });
      if (existing) {
        username = currentUser.username;
      }
    }

    const updatedData = { username, bio, location, full_name };

    const profile = req.files?.profile?.[0];
    const cover = req.files?.cover?.[0];

    const uploadToImageKit = async (file, width) => {
      const buffer = fs.readFileSync(file.path);
      try {
        const response = await imagekit.upload({
          file: buffer,
          fileName: file.originalname,
        });
        fs.unlinkSync(file.path);
        return imagekit.url({
          path: response.filePath,
          transformation: [{ quality: "auto", format: "webp", width }],
        });
      } catch (err) {
        console.error("❌ Upload lỗi:", err);
        try { fs.unlinkSync(file.path); } catch(e){/* ignore */ }
        return null;
      }
    };

    if (profile) {
      const url = await uploadToImageKit(profile, 512);
      if (url) updatedData.profile_picture = url;
    }

    if (cover) {
      const url = await uploadToImageKit(cover, 1280);
      if (url) updatedData.cover_photo = url;
    }

    const user = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
    }).select("-blockedUsers");

    res.json({
      success: true,
      user,
      message: "Cập nhật thông tin người dùng thành công",
    });
  } catch (error) {
    console.error("❌ Lỗi cập nhật người dùng:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};

export const getUserProfiles = async (req, res) => {
  try {
    const { profileId, slug } = req.body;
    let profile;

    if (profileId) {
      profile = await User.findById(profileId).select("-blockedUsers");
    } else if (slug) {
      profile = await User.findOne({
        $or: [
          { username: slug },
          { full_name: new RegExp("^" + slug.replace(/-/g, " ") + "$", "i") },
        ],
      }).select("-blockedUsers");
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ",
      });
    }

    const posts = await Post.find({ user: profile._id })
      .populate("user", "full_name username profile_picture")
      .sort({ createdAt: -1 });

    res.json({ success: true, profile, posts });
  } catch (error) {
    console.error("❌ Lỗi khi lấy hồ sơ người dùng:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};

export const discoverUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { input = "" } = req.body;

    if (!input.trim()) {
      const suggestions = await User.find({})
        .select("full_name username profile_picture location")
        .limit(20)
        .lean();
      return res.json({ success: true, users: suggestions });
    }

    // Nếu bạn đã tạo text index, dùng $text; nếu chưa, fallback sang regex safe
    let users;
    try {
      // dùng text search nếu index đã tạo
      users = await User.find(
        { $text: { $search: input } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .select("full_name username profile_picture location email")
        .limit(30)
        .lean();
    } catch (e) {
      // fallback: regex (escape)
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escapeRegex(String(input).slice(0, 60)), "i");
      users = await User.find({
        $or: [{ username: re }, { full_name: re }, { email: re }, { location: re }],
      })
        .select("full_name username profile_picture location email")
        .limit(30)
        .lean();
    }

    const filtered = users.filter((u) => u._id.toString() !== userId);
    res.json({ success: true, users: filtered });
  } catch (error) {
    console.error("❌ discoverUser error:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};

// hàm lấy hết users
export const getAllUsers = async (req, res) => {
  try {
    // Có thể thêm middleware để chỉ admin mới gọi được API này
    const users = await User.find({}).select('-password'); // Lấy tất cả user, bỏ trường password
    res.json({ success: true, users });
  } catch (error) {
    console.error("Lỗi khi lấy tất cả người dùng:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ: " + error.message });
  }
};  

// Hàm khóa người dùng
export const lockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'locked' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy người dùng' 
      });
    }

    res.json({
      success: true,
      message: `Đã khóa tài khoản ${user.full_name} thành công`,
      user: user
    });
  } catch (error) {
    console.error("Lỗi khi khóa người dùng:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi máy chủ: " + error.message 
    });
  }
};

// Hàm mở khóa người dùng
export const unlockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'active' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy người dùng' 
      });
    }

    res.json({
      success: true,
      message: `Đã mở khóa tài khoản ${user.full_name} thành công`,
      user: user
    });
  } catch (error) {
    console.error("Lỗi khi mở khóa người dùng:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi máy chủ: " + error.message 
    });
  } 
};

// -------------------- BLOCK USER --------------------
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    console.log("blockUser:", { by: userId, target: id });

    if (!id) return res.status(400).json({ success: false, message: "Thiếu ID người dùng cần chặn." });
    if (userId === id) return res.json({ success: false, message: "Không thể tự chặn chính mình." });

    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $pull: { following: id, followers: id, connections: id },
        $addToSet: { blockedUsers: id },
      }),
      User.findByIdAndUpdate(id, {
        $pull: { following: userId, followers: userId, connections: userId },
      }),
      Connection.deleteMany({
        $or: [
          { from_user_id: userId, to_user_id: id },
          { from_user_id: id, to_user_id: userId },
        ],
      }),
    ]);

    res.json({ success: true, message: "Đã chặn người dùng." });
  } catch (error) {
    console.error("blockUser error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------- UNBLOCK USER --------------------
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const id = getIdFromReq(req);

    console.log("unblockUser:", { by: userId, target: id });

    if (!id) return res.status(400).json({ success: false, message: "Thiếu ID người dùng cần bỏ chặn." });

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "Không tìm thấy người dùng." });

    if (!user.blockedUsers.some((uid) => uid.toString() === id)) {
      return res.json({ success: false, message: "Người này chưa bị chặn." });
    }

    await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: id } });

    res.json({ success: true, message: "Đã bỏ chặn người dùng." });
  } catch (error) {
    console.error("unblockUser error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

  
//--------------- CÁC HÀM CHO ADMIN --------------------
// Hàm tạo JWT token
const generateToken = (id, isAdmin) => {
  // Lấy JWT_SECRET từ biến môi trường đã thiết lập
  return jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, { 
    expiresIn: "7d", // Token hết hạn sau 7 ngày
  });
};

// Hàm Đăng nhập Admin
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm người dùng bằng Email
    const user = await User.findOne({ email });

    // 2. Kiểm tra người dùng tồn tại và mật khẩu khớp
    if (user && (await user.matchPassword(password))) {
      // 3. Kiểm tra vai trò Admin (BẮT BUỘC)
      if (!user.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: "Truy cập bị từ chối. Bạn không có quyền Admin." 
        });
      }

      // 4. Tạo Token và gửi đi
      res.json({
        success: true,
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        isAdmin: user.isAdmin,
        token: generateToken(user._id, user.isAdmin), 
      });
    } else {
      // 5. Trả về lỗi nếu sai thông tin
      res.status(401).json({ success: false, message: "Email hoặc mật khẩu không đúng." });
    }
  } catch (error) {
    console.error("❌ Lỗi đăng nhập Admin:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};
  