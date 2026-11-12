
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// =====================================
// MIDDLEWARE
// =====================================
app.use(cors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// =====================================
// API KIỂM TRA BACKEND
// =====================================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'HealBooking Backend đang hoạt động!'
    });
});

// =====================================
// API XÁC THỰC
// =====================================
app.use('/api/auth', authRoutes);

// =====================================
// API QUẢN TRỊ VIÊN
// =====================================
app.use('/api/admin', adminRoutes);

// =====================================
// API KHÔNG TỒN TẠI
// =====================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Không tìm thấy API yêu cầu'
    });
});

// =====================================
// XỬ LÝ LỖI
// =====================================
app.use((error, req, res, next) => {
    console.error('Server error:', error);

    res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi máy chủ'
    });
});

module.exports = app;
