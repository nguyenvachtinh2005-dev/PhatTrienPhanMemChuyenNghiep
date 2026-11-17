
const db = require('../src/config/db');
const adminService = require('../src/services/adminService');

// Giả lập database, không truy cập MySQL thật
jest.mock('../src/config/db', () => ({
    execute: jest.fn()
}));

describe('Unit Test - Admin Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // TEST 1: Lấy danh sách tài khoản thành công
    test('UT01 - getAccounts trả về danh sách tài khoản', async () => {
        const mockAccounts = [
            {
                id: 1,
                full_name: 'Nguyen Van A',
                email: 'a@gmail.com',
                role: 'PATIENT',
                account_status: 'ACTIVE'
            },
            {
                id: 2,
                full_name: 'Nguyen Van B',
                email: 'b@gmail.com',
                role: 'DOCTOR',
                account_status: 'ACTIVE'
            }
        ];

        db.execute.mockResolvedValue([mockAccounts]);

        const result = await adminService.getAccounts();

        expect(result).toEqual(mockAccounts);
        expect(db.execute).toHaveBeenCalledTimes(1);
    });

    // TEST 2: Lấy tài khoản theo ID thành công
    test('UT02 - getAccountById tìm thấy tài khoản', async () => {
        const mockAccount = {
            id: 1,
            full_name: 'Nguyen Van A',
            email: 'a@gmail.com',
            role: 'PATIENT'
        };

        db.execute.mockResolvedValue([[mockAccount]]);

        const result = await adminService.getAccountById(1);

        expect(result).toEqual(mockAccount);
        expect(db.execute).toHaveBeenCalledWith(
            expect.stringContaining('WHERE id = ?'),
            [1]
        );
    });

    // TEST 3: Không tìm thấy tài khoản theo ID
    test('UT03 - getAccountById trả về null khi không tìm thấy', async () => {
        db.execute.mockResolvedValue([[]]);

        const result = await adminService.getAccountById(999);

        expect(result).toBeNull();
    });

    // TEST 4: Cập nhật trạng thái tài khoản thành công
    test('UT04 - updateAccountStatus cập nhật thành công', async () => {
        db.execute.mockResolvedValue([
            { affectedRows: 1 }
        ]);

        const result = await adminService.updateAccountStatus(
            2,
            'LOCKED'
        );

        expect(result).toBe(1);
        expect(db.execute).toHaveBeenCalledWith(
            expect.stringContaining('role != \'ADMIN\''),
            ['LOCKED', 2]
        );
    });

    // TEST 5: Không cập nhật được tài khoản ADMIN
    test('UT05 - updateAccountStatus không cập nhật tài khoản ADMIN', async () => {
        db.execute.mockResolvedValue([
            { affectedRows: 0 }
        ]);

        const result = await adminService.updateAccountStatus(
            1,
            'LOCKED'
        );

        expect(result).toBe(0);
    });

    // TEST 6: Xóa tài khoản thành công
    test('UT06 - deleteAccount xóa tài khoản thành công', async () => {
        db.execute.mockResolvedValue([
            { affectedRows: 1 }
        ]);

        const result = await adminService.deleteAccount(2);

        expect(result).toBe(true);
        expect(db.execute).toHaveBeenCalledWith(
            expect.stringContaining('role != \'ADMIN\''),
            [2]
        );
    });

    // TEST 7: Không xóa được tài khoản ADMIN
    test('UT07 - deleteAccount không xóa tài khoản ADMIN', async () => {
        db.execute.mockResolvedValue([
            { affectedRows: 0 }
        ]);

        const result = await adminService.deleteAccount(1);

        expect(result).toBe(false);
    });

});
