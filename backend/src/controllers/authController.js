const authService = require('../services/authService');

// ===============================
// API ĐĂNG KÝ
// ===============================
const register = async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone,
            password
        } = req.body;

        // Kiểm tra dữ liệu bắt buộc
        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập họ tên, email và mật khẩu'
            });
        }

        // Kiểm tra email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ'
            });
        }

        // Kiểm tra họ tên
        if (full_name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Họ tên phải có ít nhất 2 ký tự'
            });
        }

        // Kiểm tra mật khẩu
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải có ít nhất 8 ký tự'
            });
        }

        // Kiểm tra số điện thoại nếu có nhập
        if (phone && !/^[0-9+()\-\s]{9,15}$/.test(phone.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không hợp lệ'
            });
        }

        const user = await authService.register({
            full_name,
            email,
            phone,
            password
        });

        return res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công',
            data: user
        });

    } catch (error) {
        console.error('Register error:', error.message);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Lỗi máy chủ khi đăng ký tài khoản'
        });
    }
};


// ===============================
// API ĐĂNG NHẬP
// ===============================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập email và mật khẩu'
            });
        }

        const result = await authService.login(email, password);

        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            data: result
        });

    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Lỗi máy chủ khi đăng nhập'
        });
    }
};

module.exports = {
    register,
    login
};