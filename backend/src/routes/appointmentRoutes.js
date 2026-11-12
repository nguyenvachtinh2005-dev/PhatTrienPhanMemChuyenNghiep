
const express = require('express');
const router = express.Router();

const appointmentController =
    require('../controllers/appointmentController');

// Lấy danh sách lịch khám
router.get('/', appointmentController.getAppointments);

// Xem chi tiết lịch khám
router.get('/:id', appointmentController.getAppointmentById);

// Cập nhật trạng thái lịch khám
router.patch('/:id/status', appointmentController.changeAppointmentStatus);

module.exports = router;
