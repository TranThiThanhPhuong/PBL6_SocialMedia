import mongoose from "mongoose";

// ket noi den mongodb
const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => console.log('Database connected'));

    // Sử dụng biến môi trường MONGO_URI để kết nối đến MongoDB
    await mongoose.connect(`${process.env.MONGO_URI}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;