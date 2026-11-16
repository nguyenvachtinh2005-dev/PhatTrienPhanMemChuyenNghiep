
const appointmentService = require('../services/appointmentService');

// GET /api/admin/appointments
// Lấy danh sách lịch khám
const getAppointments = async (req, res) => {
    try {
        const search = String(req.query.search || '');
        const status = String(req.query.status || '');
        const date = String(req.query.date || '');

        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limitInput = Number.parseInt(req.query.limit, 10) || 10;
        const limit = Math.min(100, Math.max(1, limitInput));

        if (
            status &&
            !appointmentService.VALID_STATUSES.includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái lịch khám không hợp lệ'
            });
        }

        // Kiểm tra định dạng ngày YYYY-MM-DD
        if (
            date &&
            !/^\d{4}-\d{2}-\d{2}$/.test(date)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Ngày lọc không hợp lệ'
            });
        }

        const result = await appointmentService.getAppointments({
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
        console.error('Lỗi lấy danh sách lịch khám:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách lịch khám'
        });
    }
};

// GET /api/admin/appointments/:id
// Xem chi tiết lịch khám
const getAppointmentById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã lịch khám không hợp lệ'
            });
        }

        const appointment =
            await appointmentService.getAppointmentById(id);

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

// PATCH /api/admin/appointments/:id/status
// Cập nhật trạng thái lịch khám
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

        if (!appointmentService.VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái lịch khám không hợp lệ'
            });
        }

        const result =
            await appointmentService.updateAppointmentStatus(id, status);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch khám'
            });
        }

        return res.status(200).json({
            success: true,
            message: result.changed
                ? 'Cập nhật trạng thái lịch khám thành công'
                : 'Trạng thái lịch khám không thay đổi',
            data: result
        });

    } catch (error) {
        console.error('Lỗi cập nhật trạng thái lịch khám:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật trạng thái lịch khám'
        });
    }
};

module.exports = {
    getAppointments,
    getAppointmentById,
    changeAppointmentStatus
};
