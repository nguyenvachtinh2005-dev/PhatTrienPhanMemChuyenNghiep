
jest.mock('../src/config/db');

const db = require('../src/config/db');
const appointmentService = require('../src/services/appointmentService');

describe('Appointment Service - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // 1. Lấy danh sách lịch khám
    test('getAppointments - lấy danh sách lịch khám thành công', async () => {
        const appointments = [{ id: 1, status: 'PENDING' }];

        db.execute
            .mockResolvedValueOnce([[{ total: 1 }]])
            .mockResolvedValueOnce([appointments]);

        const result = await appointmentService.getAppointments({
            search: 'Nguyen',
            status: 'PENDING',
            date: '2026-11-20',
            page: 1,
            limit: 10
        });

        expect(result.items).toEqual(appointments);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
        });
        expect(db.execute).toHaveBeenCalledTimes(2);
    });

    // 2. Lấy chi tiết lịch khám
    test('getAppointmentById - tìm thấy lịch khám', async () => {
        const appointment = { id: 1, patient_id: 2 };

        db.execute.mockResolvedValueOnce([[appointment]]);

        const result = await appointmentService.getAppointmentById(1);

        expect(result).toEqual(appointment);
    });

    // 3. Không tìm thấy lịch khám
    test('getAppointmentById - trả về null nếu không tồn tại', async () => {
        db.execute.mockResolvedValueOnce([[]]);

        const result = await appointmentService.getAppointmentById(99);

        expect(result).toBeNull();
    });

    const createConnection = (results = []) => {
        const connection = {
            beginTransaction: jest.fn().mockResolvedValue(),
            execute: jest.fn(),
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
            release: jest.fn()
        };

        results.forEach(result => {
            connection.execute.mockResolvedValueOnce(result);
        });

        db.getConnection.mockResolvedValue(connection);

        return connection;
    };

    // 4. Cập nhật trạng thái thành công
    test('updateAppointmentStatus - chuyển PENDING sang CONFIRMED', async () => {
        const connection = createConnection([
            [[{
                id: 1,
                doctor_id: 2,
                status: 'PENDING'
            }]],
            [{ affectedRows: 1 }]
        ]);

        const result = await appointmentService.updateAppointmentStatus(
            1,
            'CONFIRMED'
        );

        expect(result).toEqual({
            id: 1,
            oldStatus: 'PENDING',
            newStatus: 'CONFIRMED',
            changed: true
        });
        expect(connection.commit).toHaveBeenCalled();
    });

    // 5. Trạng thái không hợp lệ
    test('updateAppointmentStatus - từ chối trạng thái không hợp lệ', async () => {
        const connection = createConnection([]);

        const result = await appointmentService.updateAppointmentStatus(
            1,
            'INVALID'
        );

        expect(result).toEqual({ invalidStatus: true });
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 6. Không tìm thấy lịch khám
    test('updateAppointmentStatus - trả về null nếu lịch không tồn tại', async () => {
        const connection = createConnection([
            [[]]
        ]);

        const result = await appointmentService.updateAppointmentStatus(
            99,
            'CONFIRMED'
        );

        expect(result).toBeNull();
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 7. Bác sĩ không được cập nhật lịch của người khác
    test('updateAppointmentStatus - từ chối bác sĩ cập nhật lịch không thuộc mình', async () => {
        const connection = createConnection([
            [[{
                id: 1,
                doctor_id: 5,
                status: 'PENDING'
            }]]
        ]);

        const result = await appointmentService.updateAppointmentStatus(
            1,
            'CONFIRMED',
            {
                doctorId: 2,
                isDoctor: true
            }
        );

        expect(result).toBeNull();
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 8. Trạng thái không thay đổi
    test('updateAppointmentStatus - không cập nhật nếu trạng thái giống nhau', async () => {
        const connection = createConnection([
            [[{
                id: 1,
                doctor_id: 2,
                status: 'PENDING'
            }]]
        ]);

        const result = await appointmentService.updateAppointmentStatus(
            1,
            'PENDING'
        );

        expect(result).toEqual({
            id: 1,
            oldStatus: 'PENDING',
            newStatus: 'PENDING',
            changed: false
        });
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 9. Chuyển trạng thái không được phép
    test('updateAppointmentStatus - từ chối chuyển COMPLETED sang CANCELLED', async () => {
        const connection = createConnection([
            [[{
                id: 1,
                doctor_id: 2,
                status: 'COMPLETED'
            }]]
        ]);

        const result = await appointmentService.updateAppointmentStatus(
            1,
            'CANCELLED'
        );

        expect(result).toEqual({
            id: 1,
            oldStatus: 'COMPLETED',
            newStatus: 'CANCELLED',
            changed: false,
            invalidTransition: true
        });
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 10. Chuyển CONFIRMED sang COMPLETED
    test('updateAppointmentStatus - chuyển CONFIRMED sang COMPLETED', async () => {
        const connection = createConnection([
            [[{
                id: 1,
                doctor_id: 2,
                status: 'CONFIRMED'
            }]],
            [{ affectedRows: 1 }]
        ]);

        const result = await appointmentService.updateAppointmentStatus(
            1,
            'COMPLETED'
        );

        expect(result.changed).toBe(true);
        expect(result.oldStatus).toBe('CONFIRMED');
        expect(result.newStatus).toBe('COMPLETED');
        expect(connection.commit).toHaveBeenCalled();
    });
});
