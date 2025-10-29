import nodemailer from "nodemailer";
import validator from "validator";

if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SENDER_EMAIL) {
  console.warn("⚠️ Missing SMTP configuration in .env");
}

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// Gửi email an toàn
const sendEmail = async (to, subject, body) => {
  if (!validator.isEmail(to)) throw new Error("❌ Invalid email address");

  try {
    const response = await transporter.sendMail({
      from: `"Mạng xã hội: " <${process.env.SENDER_EMAIL}>`,
      to,
      subject,
      html: body,
    });
    console.log("📩 Email sent:", response.messageId);
    return response;
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
    throw error;
  }
};

export default sendEmail;

// file nodeMailer.js dung de gui email, su dung thu vien nodemailer trung gian để gửi (nếu bạn dùng Brevo SMTP).
// nodemailer là một thư viện Node.js cho phép gửi email từ ứng dụng Node.js
// brevo là một dịch vụ email marketing và SMTP relay