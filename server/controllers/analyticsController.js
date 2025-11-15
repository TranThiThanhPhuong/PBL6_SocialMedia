    import User from "../models/User.js";
import Post from "../models/Post.js";
import Report from "../models/Report.js";

// Hàm lấy các chỉ số thẻ (Total Users, Posts, Reports)
export const getStatsCards = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: "pending" });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPosts,
        totalReports,
        pendingReports,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Hàm lấy dữ liệu cho biểu đồ Đăng ký Người dùng
export const getUserRegistrationChart = async (req, res) => {
  try {
    const data = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Sắp xếp theo ngày
      { $limit: 30 }, // Giới hạn 30 ngày gần nhất
    ]);

    // Định dạng lại data cho biểu đồ (recharts)
    const formattedData = data.map(item => ({
      name: item._id, // Ngày
      users: item.count, // Số lượng
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};