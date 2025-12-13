import User from "../models/User.js";
import Post from "../models/Post.js";
import Report from "../models/Report.js";

// Helper: Tính ngày bắt đầu dựa trên range (7d, 30d, 90d, 1y)
const getStartDate = (range) => {
  const date = new Date();
  switch (range) {
    case "7d":
      date.setDate(date.getDate() - 7);
      break;
    case "30d":
      date.setDate(date.getDate() - 30);
      break;
    case "90d":
      date.setDate(date.getDate() - 90);
      break;
    case "1y":
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      date.setDate(date.getDate() - 30); // Mặc định 30 ngày
  }
  return date;
};

// API lấy các thẻ chỉ số (Stats Cards)
export const getStatsCards = async (req, res) => {
  try {
    const { range } = req.query; // Lấy tham số range từ URL (ví dụ: ?range=7d)
    const startDate = getStartDate(range);

    // 1. Số liệu tổng (All time)
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: "pending" });

    // 2. Số liệu tăng trưởng trong khoảng thời gian đã chọn (New)
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const newPosts = await Post.countDocuments({ createdAt: { $gte: startDate } });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPosts,
        totalReports,
        pendingReports,
        newUsers, // Trả về số user mới đăng ký trong range
        newPosts, // Trả về số bài viết mới trong range
      },
    });
  } catch (error) {
    console.error("Error in getStatsCards:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API lấy dữ liệu biểu đồ User (User Chart)
export const getUserRegistrationChart = async (req, res) => {
  try {
    const { range } = req.query;
    const startDate = getStartDate(range);

    const data = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }, // Chỉ lấy user tạo từ ngày startDate trở đi
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Sắp xếp tăng dần theo ngày
    ]);

    // Format dữ liệu cho Recharts (Frontend)
    const formattedData = data.map((item) => ({
      name: item._id, // Ngày (YYYY-MM-DD)
      users: item.count, // Số lượng
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error in getUserRegistrationChart:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};