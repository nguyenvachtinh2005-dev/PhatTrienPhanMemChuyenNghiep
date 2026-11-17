
const doctorService = require('../services/doctorService');
const appointmentService = require('../services/appointmentService');

// GET /api/doctor/dashboard
const getDashboard = async (req, res) => {
    try {
        const result = await doctorService.getDashboard(req.user.id);

        return res.status(200).json({
            success: true,
            message: 'Lấy dữ liệu tổng quan thành công',
            data: result
        });
    } catch (error) {
        console.error('Lỗi lấy dashboard bác sĩ:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy dữ liệu tổng quan'
        });
    }
};

// GET /api/doctor/appointments
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
            !appointmentService.VALID_STATUSES.includes(status)
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

        const result = await doctorService.getAppointments({
            doctorId: req.user.id,
            search,
            status,
            date,
            page,
            limit
        });

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách lịch khám thành công',
            data: result.items,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Lỗi lấy lịch khám bác sĩ:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách lịch khám'
        });
    }
};

// GET /api/doctor/appointments/:id
const getAppointmentById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã lịch khám không hợp lệ'
            });
        }

        const appointment = await doctorService.getAppointmentById(
            id,
            req.user.id
        );

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch khám hoặc bạn không có quyền xem'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết lịch khám thành công',
            data: appointment
        });
    } catch (error) {
        console.error('Lỗi xem chi tiết lịch khám:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy chi tiết lịch khám'
        });
    }
};

// PATCH /api/doctor/appointments/:id/status
const changeAppointmentStatus = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã lịch khám không hợp lệ'
            });
        }

        const doctorAllowedStatuses = [
            'CONFIRMED',
            'COMPLETED'
        ];

        if (!doctorAllowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái bác sĩ yêu cầu không hợp lệ'
            });
        }

        const result = await doctorService.updateAppointmentStatus(
            id,
            req.user.id,
            status
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch khám hoặc bạn không có quyền thao tác'
            });
        }

        if (result.locked) {
            return res.status(409).json({
                success: false,
                message: 'Lịch khám đã hoàn thành, không thể thay đổi trạng thái'
            });
        }

        if (result.invalidTransition) {
            return res.status(409).json({
                success: false,
                message: 'Không thể chuyển trạng thái lịch khám theo yêu cầu'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái lịch khám thành công',
            data: result
        });
    } catch (error) {
        console.error('Lỗi cập nhật lịch khám bác sĩ:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật trạng thái lịch khám'
        });
    }
};

module.exports = {
    getDashboard,
    getAppointments,
    getAppointmentById,
    changeAppointmentStatus
};
