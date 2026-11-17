
jest.mock('../src/config/db');

const db = require('../src/config/db');
const patientService = require('../src/services/patientService');

describe('Patient Service - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // 1. Lấy danh sách chuyên khoa
    test('getSpecialties - lấy danh sách chuyên khoa thành công', async () => {
        const specialties = [
            { id: 1, name: 'Tim mạch', description: 'Chuyên khoa tim' }
        ];

        db.execute.mockResolvedValueOnce([specialties]);

        const result = await patientService.getSpecialties();

        expect(result).toEqual(specialties);
        expect(db.execute).toHaveBeenCalledTimes(1);
    });

    // 2. Tìm kiếm bác sĩ
    test('getDoctors - tìm kiếm bác sĩ thành công', async () => {
        const doctors = [
            { id: 2, full_name: 'Nguyen Van B', specialty_name: 'Tim mạch' }
        ];

        db.execute
            .mockResolvedValueOnce([[{ total: 1 }]])
            .mockResolvedValueOnce([doctors]);

        const result = await patientService.getDoctors({
            search: 'Nguyen',
            specialtyId: '',
            page: 1,
            limit: 10
        });

        expect(result.items).toEqual(doctors);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
        });
        expect(db.execute).toHaveBeenCalledTimes(2);
    });

    // 3. Chuẩn hóa phân trang
    test('getDoctors - chuẩn hóa page và limit không hợp lệ', async () => {
        db.execute
            .mockResolvedValueOnce([[{ total: 0 }]])
            .mockResolvedValueOnce([[]]);

        const result = await patientService.getDoctors({
            page: -1,
            limit: 200
        });

        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(100);
    });

    // 4. Lấy khung giờ còn trống
    test('getDoctorSlots - chỉ trả về khung giờ còn chỗ', async () => {
        const slots = [
            {
                id: 1,
                max_patients: 5,
                booked_patients: 2
            },
            {
                id: 2,
                max_patients: 3,
                booked_patients: 3
            }
        ];

        db.execute.mockResolvedValueOnce([slots]);

        const result = await patientService.getDoctorSlots(2);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
        expect(result[0].remaining_patients).toBe(3);
    });

    // Tạo connection giả lập cho transaction
    const createConnection = (executeResults = []) => {
        const connection = {
            beginTransaction: jest.fn().mockResolvedValue(),
            execute: jest.fn(),
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
            release: jest.fn()
        };

        executeResults.forEach(result => {
            connection.execute.mockResolvedValueOnce(result);
        });

        db.getConnection.mockResolvedValue(connection);

        return connection;
    };

    // 5. Đặt lịch thành công
    test('createAppointment - đặt lịch khám thành công', async () => {
        const futureDate = new Date(Date.now() + 86400000);

        const connection = createConnection([
            [[{ id: 1 }]],
            [[{ id: 2 }]],
            [[{
                id: 3,
                doctor_id: 2,
                start_time: futureDate,
                max_patients: 5,
                status: 'AVAILABLE'
            }]],
            [[{ total: 1 }]],
            [{ insertId: 10 }],
            [{ affectedRows: 1 }]
        ]);

        const result = await patientService.createAppointment({
            patientId: 1,
            doctorId: 2,
            slotId: 3,
            reason: 'Khám tổng quát'
        });

        expect(result.id).toBe(10);
        expect(result.status).toBe('PENDING');
        expect(result.patient_id).toBe(1);
        expect(result.doctor_id).toBe(2);
        expect(connection.beginTransaction).toHaveBeenCalled();
        expect(connection.commit).toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalled();
    });

    // 6. Tài khoản bệnh nhân không hợp lệ
    test('createAppointment - từ chối khi bệnh nhân không hợp lệ', async () => {
        const connection = createConnection([
            [[]]
        ]);

        const result = await patientService.createAppointment({
            patientId: 99,
            doctorId: 2,
            slotId: 3
        });

        expect(result).toEqual({ accountInvalid: true });
        expect(connection.rollback).toHaveBeenCalled();
        expect(connection.commit).not.toHaveBeenCalled();
    });

    // 7. Bác sĩ không khả dụng
    test('createAppointment - từ chối khi bác sĩ không khả dụng', async () => {
        const connection = createConnection([
            [[{ id: 1 }]],
            [[]]
        ]);

        const result = await patientService.createAppointment({
            patientId: 1,
            doctorId: 99,
            slotId: 3
        });

        expect(result).toEqual({ doctorUnavailable: true });
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 8. Không tìm thấy khung giờ
    test('createAppointment - từ chối khi không tìm thấy khung giờ', async () => {
        const connection = createConnection([
            [[{ id: 1 }]],
            [[{ id: 2 }]],
            [[]]
        ]);

        const result = await patientService.createAppointment({
            patientId: 1,
            doctorId: 2,
            slotId: 99
        });

        expect(result).toEqual({ slotNotFound: true });
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 9. Khung giờ đã bị hủy
    test('createAppointment - từ chối khung giờ đã hủy', async () => {
        const connection = createConnection([
            [[{ id: 1 }]],
            [[{ id: 2 }]],
            [[{
                id: 3,
                status: 'CANCELLED'
            }]]
        ]);

        const result = await patientService.createAppointment({
            patientId: 1,
            doctorId: 2,
            slotId: 3
        });

        expect(result).toEqual({ slotUnavailable: true });
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 10. Khung giờ đã hết hạn
    test('createAppointment - từ chối khung giờ đã qua', async () => {
        const connection = createConnection([
            [[{ id: 1 }]],
            [[{ id: 2 }]],
            [[{
                id: 3,
                start_time: new Date(Date.now() - 86400000),
                status: 'AVAILABLE'
            }]]
        ]);

        const result = await patientService.createAppointment({
            patientId: 1,
            doctorId: 2,
            slotId: 3
        });

        expect(result).toEqual({ slotExpired: true });
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 11. Khung giờ đã đủ số lượng bệnh nhân
    test('createAppointment - từ chối khi khung giờ đã đầy', async () => {
        const connection = createConnection([
            [[{ id: 1 }]],
            [[{ id: 2 }]],
            [[{
                id: 3,
                start_time: new Date(Date.now() + 86400000),
                max_patients: 2,
                status: 'AVAILABLE'
            }]],
            [[{ total: 2 }]],
            [{ affectedRows: 1 }]
        ]);

        const result = await patientService.createAppointment({
            patientId: 1,
            doctorId: 2,
            slotId: 3
        });

        expect(result).toEqual({ slotFull: true });
        expect(connection.commit).toHaveBeenCalled();
    });

    // 12. Lấy danh sách lịch khám
    test('getAppointments - lấy danh sách lịch khám của bệnh nhân', async () => {
        const appointments = [
            { id: 10, status: 'PENDING' }
        ];

        db.execute
            .mockResolvedValueOnce([[{ total: 1 }]])
            .mockResolvedValueOnce([appointments]);

        const result = await patientService.getAppointments({
            patientId: 1,
            status: 'PENDING',
            page: 1,
            limit: 10
        });

        expect(result.items).toEqual(appointments);
        expect(result.pagination.total).toBe(1);
    });

    // 13. Lấy chi tiết lịch khám
    test('getAppointmentById - tìm thấy lịch khám', async () => {
        const appointment = { id: 10, patient_id: 1 };

        db.execute.mockResolvedValueOnce([[appointment]]);

        const result = await patientService.getAppointmentById(10, 1);

        expect(result).toEqual(appointment);
    });

    // 14. Không tìm thấy lịch khám
    test('getAppointmentById - trả về null nếu không tìm thấy', async () => {
        db.execute.mockResolvedValueOnce([[]]);

        const result = await patientService.getAppointmentById(99, 1);

        expect(result).toBeNull();
    });

    // 15. Hủy lịch khám thành công
    test('cancelAppointment - hủy lịch khám thành công', async () => {
        const connection = createConnection([
            [[{
                id: 10,
                slot_id: 3,
                status: 'PENDING'
            }]],
            [{ affectedRows: 1 }],
            [[{
                id: 3,
                max_patients: 5,
                status: 'FULL'
            }]],
            [[{ total: 2 }]],
            [{ affectedRows: 1 }]
        ]);

        const result = await patientService.cancelAppointment(10, 1);

        expect(result).toEqual({
            id: 10,
            oldStatus: 'PENDING',
            newStatus: 'CANCELLED'
        });
        expect(connection.commit).toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalled();
    });

    // 16. Không tìm thấy lịch để hủy
    test('cancelAppointment - trả về null nếu lịch không tồn tại', async () => {
        const connection = createConnection([
            [[]]
        ]);

        const result = await patientService.cancelAppointment(99, 1);

        expect(result).toBeNull();
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 17. Không cho hủy lịch đã xác nhận
    test('cancelAppointment - từ chối khi trạng thái không phải PENDING', async () => {
        const connection = createConnection([
            [[{
                id: 10,
                slot_id: 3,
                status: 'CONFIRMED'
            }]]
        ]);

        const result = await patientService.cancelAppointment(10, 1);

        expect(result).toEqual({
            invalidTransition: true,
            currentStatus: 'CONFIRMED'
        });
        expect(connection.rollback).toHaveBeenCalled();
    });

    // 18. Lấy thông tin cá nhân
    test('getProfile - lấy thông tin bệnh nhân thành công', async () => {
        const profile = {
            id: 1,
            full_name: 'Nguyen Van A',
            role: 'PATIENT'
        };

        db.execute.mockResolvedValueOnce([[profile]]);

        const result = await patientService.getProfile(1);

        expect(result).toEqual(profile);
    });

    // 19. Không tìm thấy thông tin cá nhân
    test('getProfile - trả về null nếu không tìm thấy', async () => {
        db.execute.mockResolvedValueOnce([[]]);

        const result = await patientService.getProfile(99);

        expect(result).toBeNull();
    });
});
