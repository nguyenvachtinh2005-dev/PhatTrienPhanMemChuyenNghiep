const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:4200'
}));

app.use(express.json());

// API kiểm tra Backend
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'HealBooking Backend đang hoạt động!'
    });
});

// API xác thực
app.use('/api/auth', authRoutes);

module.exports = app;