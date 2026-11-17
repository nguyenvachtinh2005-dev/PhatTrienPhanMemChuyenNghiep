
const express = require('express');
const router = express.Router();

const patientController = require('../controllers/patientController');

const {
    authenticateToken,
    authorizeRoles
} = require('../middlewares/authMiddleware');

// Tất cả API bên dưới chỉ dành cho PATIENT
router.use(authenticateToken);
router.use(authorizeRoles('PATIENT'));

// Thông tin cá nhân
router.get('/profile', patientController.getProfile);

// Chuyên khoa
router.get('/specialties', patientController.getSpecialties);

// Tìm kiếm bác sĩ
router.get('/doctors', patientController.getDoctors);

// Khung giờ của bác sĩ
router.get('/doctors/:id/slots', patientController.getDoctorSlots);

// Đặt lịch khám
router.post('/appointments', patientController.createAppointment);

// Lịch khám của bệnh nhân
router.get('/appointments', patientController.getAppointments);

// Chi tiết lịch khám
router.get('/appointments/:id', patientController.getAppointmentById);

// Hủy lịch khám
router.patch(
    '/appointments/:id/cancel',
    patientController.cancelAppointment
);

module.exports = router;
