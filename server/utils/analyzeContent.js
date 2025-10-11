import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export const analyzeContent = async (content, images) => {
  try {
    const form = new FormData();
    if (content) form.append("content", content);

    if (images && images.length > 0) {
      // chỉ gửi 1 ảnh đại diện nếu quá nhiều ảnh, hoặc gửi tất cả tùy bạn chọn
      images.forEach((img) => {
        const fileBuffer = fs.readFileSync(img.path);
        form.append("image", fileBuffer, img.originalname);
      });
    }

    const response = await axios.post(`${process.env.API_HUGGING_FACE_SPACE}/analyze`, form, {
      headers: form.getHeaders(),
      timeout: 30000, // 30s phòng trường hợp AI xử lý chậm
    });

    return response.data; // JSON gồm text_result và image_result
  } catch (err) {
    console.error("❌ Lỗi kết nối đến Flask:", err.message);
    throw new Error("Không thể kết nối đến AI server để phân tích nội dung");
  }
};