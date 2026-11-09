const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ===============================
// ĐĂNG KÝ TÀI KHOẢN
// ===============================
const register = async (userData) => {
    const { full_name, email, phone, password } = userData;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone ? phone.trim() : null;

    // Kiểm tra email đã tồn tại
    const [existingEmail] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [normalizedEmail]
    );

    if (existingEmail.length > 0) {
        const error = new Error('Email đã được sử dụng');
        error.statusCode = 409;
        throw error;
    }

    // Kiểm tra số điện thoại đã tồn tại
    if (normalizedPhone) {
        const [existingPhone] = await db.query(
            'SELECT id FROM users WHERE phone = ?',
            [normalizedPhone]
        );

        if (existingPhone.length > 0) {
            const error = new Error('Số điện thoại đã được sử dụng');
            error.statusCode = 409;
            throw error;
        }
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Lưu tài khoản với vai trò PATIENT
    const [result] = await db.query(
        `INSERT INTO users
        (full_name, email, phone, password, role)
        VALUES (?, ?, ?, ?, 'PATIENT')`,
        [
            full_name.trim(),
            normalizedEmail,
            normalizedPhone,
            hashedPassword
        ]
    );

    return {
        id: result.insertId,
        full_name: full_name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: 'PATIENT'
    };
};


// ===============================
// ĐĂNG NHẬP
// ===============================
const login = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Tìm tài khoản
    const [users] = await db.query(
        `SELECT id, full_name, email, phone,
                password, role, account_status
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [normalizedEmail]
    );

    if (users.length === 0) {
        const error = new Error('Email hoặc mật khẩu không chính xác');
        error.statusCode = 401;
        throw error;
    }

    const user = users[0];

    // Kiểm tra trạng thái tài khoản
    if (user.account_status !== 'ACTIVE') {
        const error = new Error('Tài khoản hiện không hoạt động');
        error.statusCode = 403;
        throw error;
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch) {
        const error = new Error('Email hoặc mật khẩu không chính xác');
        error.statusCode = 401;
        throw error;
    }

    // Kiểm tra JWT_SECRET
    if (!process.env.JWT_SECRET) {
        throw new Error('Chưa cấu hình JWT_SECRET');
    }

    // Tạo JWT Token
    const token = jwt.sign(
        {
            id: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1d'
        }
    );

    // Trả thông tin người dùng
    return {
        token,
        user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.role
        }
    };
};

module.exports = {
    register,
    login
};