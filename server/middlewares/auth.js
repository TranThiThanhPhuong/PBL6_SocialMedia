export const protect = async (req, res, next) => {
    try {
        const {userId} = await req.auth();
        if (!userId) {
            return res.status(401).json({ success: false, message: 'not authenticated' });
        }
        next();
    } catch (error) {
        res.json({ success: false, message: error.message });
        
        // khac 
        console.error('Authentication error:', error);
        return res.status(401).json({ success: false, message: 'not authenticated' });
    }
}

// file auth.js sẽ kiểm tra xem người dùng đã đăng nhập hay chưa
// nếu chưa đăng nhập thì trả về lỗi 401 (Unauthorized)
// nếu đã đăng nhập thì gọi next() để tiếp tục xử lý yêu cầu