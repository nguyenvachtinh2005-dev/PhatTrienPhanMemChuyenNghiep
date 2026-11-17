const jwt = require('jsonwebtoken');
const db = require('../config/db');

// =====================================
// XÁC THỰC JWT
// =====================================
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập để tiếp tục'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!process.env.JWT_SECRET) {
            throw new Error('Chưa cấu hình JWT_SECRET');
        }

        // Xác thực token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Lấy lại thông tin tài khoản từ database
        // Không chỉ tin role được lưu trong token
        const [users] = await db.query(
            `SELECT id, full_name, email, role, account_status
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản không tồn tại'
            });
        }

        const user = users[0];

        if (user.account_status !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị khóa hoặc ngừng hoạt động'
            });
        }

        // Lưu thông tin người dùng vào request
        req.user = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
        };

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Phiên đăng nhập đã hết hạn'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ'
            });
        }

        console.error('Authentication error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Lỗi xác thực người dùng'
        });
    }
};


// =====================================
// PHÂN QUYỀN THEO ROLE
// =====================================
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Bạn chưa được xác thực'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện chức năng này'
            });
        }

        next();
    };
};


module.exports = {
    authenticateToken,
    authorizeRoles
};