
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');

const app = express();

// Cấu hình CORS
app.use(cors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Kiểm tra backend
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'HealBooking Backend đang hoạt động!'
    });
});

// Các API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);

// Middleware xử lý lỗi 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Không tìm thấy API yêu cầu'
    });
});

// Middleware xử lý lỗi máy chủ
app.use((error, req, res, next) => {
    console.error('Server error:', error);

    res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi máy chủ'
    });
});

module.exports = app;
