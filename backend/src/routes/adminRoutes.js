
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const appointmentRoutes = require('./appointmentRoutes');

const {
    authenticateToken,
    authorizeRoles
} = require('../middlewares/authMiddleware');

// Tất cả API bên dưới chỉ dành cho ADMIN
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

// =====================================
// QUẢN LÝ TÀI KHOẢN
// =====================================

// Lấy danh sách tài khoản
router.get('/accounts', adminController.getAccounts);

// Xem chi tiết tài khoản
router.get('/accounts/:id', adminController.getAccountById);

// Khóa hoặc mở khóa tài khoản
router.patch('/accounts/:id/status', adminController.changeAccountStatus);

// Xóa tài khoản
router.delete('/accounts/:id', adminController.deleteAccount);

// =====================================
// QUẢN LÝ LỊCH KHÁM
// =====================================

router.use('/appointments', appointmentRoutes);

module.exports = router;
