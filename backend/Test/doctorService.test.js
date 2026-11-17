
jest.mock('../src/config/db');

jest.mock('../src/services/appointmentService', () => ({
    updateAppointmentStatus: jest.fn()
}));

const db = require('../src/config/db');
const appointmentService = require('../src/services/appointmentService');
const doctorService = require('../src/services/doctorService');

describe('Doctor Service - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // 1. Lấy dashboard bác sĩ
    test('getDashboard - lấy thống kê và lịch khám sắp tới', async () => {
        db.execute
            .mockResolvedValueOnce([[
                {
                    total: 10,
                    pending: 3,
                    confirmed: 4,
                    completed: 2,
                    rejected: 1
                }
            ]])
            .mockResolvedValueOnce([[
                {
                    id: 1,
                    patient_name: 'Nguyen Van A',
                    status: 'PENDING'
                }
            ]]);

        const result = await doctorService.getDashboard(2);

        expect(result.statistics).toEqual({
            total: 10,
            pending: 3,
            confirmed: 4,
            completed: 2,
            rejected: 1
        });

        expect(result.upcomingAppointments).toHaveLength(1);
        expect(db.execute).toHaveBeenCalledTimes(2);
    });

    // 2. Dashboard không có lịch khám
    test('getDashboard - trả về số liệu 0 khi chưa có lịch khám', async () => {
        db.execute
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([[]]);

        const result = await doctorService.getDashboard(2);

        expect(result.statistics).toEqual({
            total: 0,
            pending: 0,
            confirmed: 0,
            completed: 0,
            rejected: 0
        });

        expect(result.upcomingAppointments).toEqual([]);
    });

    // 3. Lấy danh sách lịch khám
    test('getAppointments - lấy danh sách lịch khám của bác sĩ', async () => {
        const appointments = [
            { id: 1, patient_name: 'Nguyen Van A' }
        ];

        db.execute
            .mockResolvedValueOnce([[{ total: 1 }]])
            .mockResolvedValueOnce([appointments]);

        const result = await doctorService.getAppointments({
            doctorId: 2,
            search: 'Nguyen',
            status: 'PENDING',
            page: 1,
            limit: 10
        });

        expect(result.items).toEqual(appointments);
        expect(result.pagination.total).toBe(1);
        expect(db.execute).toHaveBeenCalledTimes(2);
    });

    // 4. Lấy chi tiết lịch khám
    test('getAppointmentById - tìm thấy lịch khám', async () => {
        const appointment = {
            id: 1,
            doctor_id: 2,
            patient_name: 'Nguyen Van A'
        };

        db.execute.mockResolvedValueOnce([[appointment]]);

        const result = await doctorService.getAppointmentById(1, 2);

        expect(result).toEqual(appointment);
    });

    // 5. Không tìm thấy lịch khám
    test('getAppointmentById - trả về null nếu không tìm thấy', async () => {
        db.execute.mockResolvedValueOnce([[]]);

        const result = await doctorService.getAppointmentById(99, 2);

        expect(result).toBeNull();
    });

    // 6. Cập nhật trạng thái lịch khám thành công
    test('updateAppointmentStatus - gọi Appointment Service thành công', async () => {
        appointmentService.updateAppointmentStatus.mockResolvedValue({
            id: 1,
            oldStatus: 'PENDING',
            newStatus: 'CONFIRMED',
            changed: true
        });

        const result = await doctorService.updateAppointmentStatus(
            1,
            2,
            'CONFIRMED'
        );

        expect(result.changed).toBe(true);

        expect(appointmentService.updateAppointmentStatus)
            .toHaveBeenCalledWith(
                1,
                'CONFIRMED',
                {
                    doctorId: 2,
                    isDoctor: true
                }
            );
    });

    // 7. Trạng thái không hợp lệ
    test('updateAppointmentStatus - báo lỗi khi trạng thái không hợp lệ', async () => {
        await expect(
            doctorService.updateAppointmentStatus(1, 2, 'INVALID')
        ).rejects.toThrow('Trạng thái lịch khám không hợp lệ.');

        expect(appointmentService.updateAppointmentStatus)
            .not.toHaveBeenCalled();
    });

    // 8. Lỗi khi gọi Appointment Service
    test('updateAppointmentStatus - xử lý lỗi từ Appointment Service', async () => {
        appointmentService.updateAppointmentStatus.mockRejectedValue(
            new Error('Database error')
        );

        await expect(
            doctorService.updateAppointmentStatus(1, 2, 'CONFIRMED')
        ).rejects.toThrow('Database error');
    });
});
