import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ Missing MONGO_URI in environment variables");
    }

    mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
    mongoose.connection.on("error", (err) => console.error("❌ MongoDB error:", err.message));
    mongoose.connection.on("disconnected", () => console.warn("⚠️ MongoDB disconnected"));

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "pbl6_db",
      serverSelectionTimeoutMS: 5000, // 5s timeout
      socketTimeoutMS: 45000,
      family: 4, // IPv4 (tránh lỗi DNS IPv6)
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1); // Dừng server nếu không kết nối được
  }
};

export default connectDB;