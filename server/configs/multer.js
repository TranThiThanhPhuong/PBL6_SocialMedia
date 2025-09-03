import multer from "multer";

const storage = multer.diskStorage({});

export const upload = multer({storage});

// File multer.js này dùng để cấu hình và xuất middleware Multer cho việc upload file trong Node.js/Express. 
// Nó thiết lập Multer sử dụng disk storage (lưu file upload lên ổ đĩa) và export biến upload để sử dụng trong các route xử lý upload file. 
// File này chỉ phục vụ cho việc upload file, không liên quan đến inngest hay các tác vụ nền khác.