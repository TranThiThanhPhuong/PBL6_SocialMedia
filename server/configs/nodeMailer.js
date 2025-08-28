import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com", // host la dia chi may chu smtp
  port: 587, // port la cong ket noi den may chu smtp
  auth: {
    user: process.env.SMTP_USER, // user la ten dang nhap vao may chu smtp
    pass: process.env.SMTP_PASS, // pass la mat khau dang nhap vao may chu smtp
  },  // auth la thong tin dang nhap vao may chu smtp
}); // tao doi tuong transporter de gui email

const sendEmail = async (to, subject, body) => {
    const response = await transporter.sendMail({ 
        from: process.env.SENDER_EMAIL, // from la dia chi email nguoi gui
        to, // to la dia chi email nguoi nhan
        subject, // subject la tieu de email
        html: body, // html la noi dung email
    }) // gui email bang phuong thuc sendMail cua doi tuong transporter
    return response
} 

export default sendEmail

// file nodeMailer.js dung de gui email, su dung thu vien nodemailer trung gian để gửi (nếu bạn dùng Brevo SMTP).
// nodemailer là một thư viện Node.js cho phép gửi email từ ứng dụng Node.js
// brevo là một dịch vụ email marketing và SMTP relay