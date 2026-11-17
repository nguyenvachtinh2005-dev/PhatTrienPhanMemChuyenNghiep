
const express = require('express');
const router = express.Router();

const doctorController = require('../controllers/doctorController');

const {
    authenticateToken,
    authorizeRoles
} = require('../middlewares/authMiddleware');

// Tất cả API bên dưới chỉ dành cho DOCTOR
router.use(authenticateToken);
router.use(authorizeRoles('DOCTOR'));

// =====================================
// DASHBOARD BÁC SĨ
// =====================================

router.get(
    '/dashboard',
    doctorController.getDashboard
);

// =====================================
// QUẢN LÝ LỊCH KHÁM CỦA BÁC SĨ
// =====================================

// Lấy danh sách lịch khám của bác sĩ đang đăng nhập
router.get(
    '/appointments',
    doctorController.getAppointments
);

// Xem chi tiết lịch khám của bác sĩ đang đăng nhập
router.get(
    '/appointments/:id',
    doctorController.getAppointmentById
);

// Cập nhật trạng thái lịch khám của bác sĩ đang đăng nhập
router.patch(
    '/appointments/:id/status',
    doctorController.changeAppointmentStatus
);

module.exports = router;
