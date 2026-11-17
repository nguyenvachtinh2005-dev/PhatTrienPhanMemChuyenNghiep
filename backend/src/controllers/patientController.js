
const patientService = require('../services/patientService');

const VALID_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
];

// =====================================
// DANH SÁCH CHUYÊN KHOA
// =====================================

const getSpecialties = async (req, res) => {
    try {
        const data = await patientService.getSpecialties();

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách chuyên khoa thành công',
            data
        });
    } catch (error) {
        console.error('Lỗi lấy chuyên khoa:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách chuyên khoa'
        });
    }
};

// =====================================
// TÌM KIẾM BÁC SĨ
// =====================================

const getDoctors = async (req, res) => {
    try {
        const search = String(req.query.search || '');
        const specialtyId = String(req.query.specialtyId || '');

        const page = Math.max(
            1,
            Number.parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
        );

        if (
            specialtyId &&
            (!Number.isInteger(Number(specialtyId)) ||
                Number(specialtyId) <= 0)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Mã chuyên khoa không hợp lệ'
            });
        }

        const result = await patientService.getDoctors({
            search,
            specialtyId,
            page,
            limit
        });

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách bác sĩ thành công',
            data: result.items,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Lỗi tìm kiếm bác sĩ:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách bác sĩ'
        });
    }
};

// =====================================
// KHUNG GIỜ BÁC SĨ
// =====================================

const getDoctorSlots = async (req, res) => {
    try {
        const doctorId = Number(req.params.id);
        const date = String(req.query.date || '');

        if (!Number.isInteger(doctorId) || doctorId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã bác sĩ không hợp lệ'
            });
        }

        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Ngày khám không hợp lệ'
            });
        }

        const data = await patientService.getDoctorSlots(
            doctorId,
            date
        );

        return res.status(200).json({
            success: true,
            message: 'Lấy khung giờ khám thành công',
            data
        });
    } catch (error) {
        console.error('Lỗi lấy khung giờ bác sĩ:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy khung giờ khám'
        });
    }
};

// =====================================
// ĐẶT LỊCH KHÁM
// =====================================

const createAppointment = async (req, res) => {
    try {
        const doctorId = Number(req.body.doctor_id);
        const slotId = Number(req.body.slot_id);
        const reason = String(req.body.reason || '');

        if (
            !Number.isInteger(doctorId) ||
            doctorId <= 0 ||
            !Number.isInteger(slotId) ||
            slotId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Thông tin bác sĩ hoặc khung giờ không hợp lệ'
            });
        }

        if (reason.length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Lý do khám không được vượt quá 5000 ký tự'
            });
        }

        const result = await patientService.createAppointment({
            patientId: req.user.id,
            doctorId,
            slotId,
            reason
        });

        if (result.accountInvalid) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản bệnh nhân không hoạt động'
            });
        }

        if (result.doctorUnavailable) {
            return res.status(404).json({
                success: false,
                message: 'Bác sĩ không tồn tại hoặc chưa được xác minh'
            });
        }

        if (result.slotNotFound || result.slotUnavailable) {
            return res.status(404).json({
                success: false,
                message: 'Khung giờ khám không tồn tại hoặc đã bị hủy'
            });
        }

        if (result.slotExpired) {
            return res.status(400).json({
                success: false,
                message: 'Không thể đặt lịch trong thời gian đã qua'
            });
        }

        if (result.slotFull) {
            return res.status(409).json({
                success: false,
                message: 'Khung giờ này đã đủ số lượng bệnh nhân'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Đặt lịch khám thành công. Vui lòng chờ bác sĩ xác nhận.',
            data: result
        });
    } catch (error) {
        console.error('Lỗi đặt lịch khám:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể đặt lịch khám'
        });
    }
};

// =====================================
// DANH SÁCH LỊCH KHÁM CỦA BỆNH NHÂN
// =====================================

const getAppointments = async (req, res) => {
    try {
        const search = String(req.query.search || '');
        const status = String(req.query.status || '');
        const date = String(req.query.date || '');

        const page = Math.max(
            1,
            Number.parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
        );

        if (
            status &&
            !patientService.VALID_STATUSES?.includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái lịch khám không hợp lệ'
            });
        }

        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Ngày lọc không hợp lệ'
            });
        }

        const result = await patientService.getAppointments({
            patientId: req.user.id,
            search,
            status,
            date,
            page,
            limit
        });

        return res.status(200).json({
            success: true,
            message: 'Lấy lịch khám thành công',
            data: result.items,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Lỗi lấy lịch khám bệnh nhân:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách lịch khám'
        });
    }
};

// =====================================
// CHI TIẾT LỊCH KHÁM
// =====================================

const getAppointmentById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã lịch khám không hợp lệ'
            });
        }

        const appointment = await patientService.getAppointmentById(
            id,
            req.user.id
        );

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch khám'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết lịch khám thành công',
            data: appointment
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết lịch khám:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy chi tiết lịch khám'
        });
    }
};

// =====================================
// HỦY LỊCH KHÁM
// =====================================

const cancelAppointment = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã lịch khám không hợp lệ'
            });
        }

        const result = await patientService.cancelAppointment(
            id,
            req.user.id
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch khám'
            });
        }

        if (result.invalidTransition) {
            return res.status(409).json({
                success: false,
                message: 'Chỉ có thể hủy lịch khám đang chờ xác nhận'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Hủy lịch khám thành công',
            data: result
        });
    } catch (error) {
        console.error('Lỗi hủy lịch khám:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể hủy lịch khám'
        });
    }
};

// =====================================
// THÔNG TIN CÁ NHÂN
// =====================================

const getProfile = async (req, res) => {
    try {
        const profile = await patientService.getProfile(req.user.id);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin bệnh nhân'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy thông tin cá nhân thành công',
            data: profile
        });
    } catch (error) {
        console.error('Lỗi lấy thông tin cá nhân:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy thông tin cá nhân'
        });
    }
};

module.exports = {
    getSpecialties,
    getDoctors,
    getDoctorSlots,
    createAppointment,
    getAppointments,
    getAppointmentById,
    cancelAppointment,
    getProfile
};
