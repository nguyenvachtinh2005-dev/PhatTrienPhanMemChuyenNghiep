
const db = require('../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('../src/services/authService');

jest.mock('../src/config/db', () => ({
    query: jest.fn()
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
    compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn()
}));

describe('Unit Test - Auth Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        process.env.JWT_SECRET = 'test_secret';
        process.env.JWT_EXPIRES_IN = '1d';

        jwt.sign.mockReturnValue('test_token');
        bcrypt.hash.mockResolvedValue('hashed_password');
    });

    // TEST 1: Đăng ký tài khoản thành công
    test('UT01 - register tạo tài khoản bệnh nhân thành công', async () => {
        db.query
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 10 }]);

        const result = await authService.register({
            full_name: ' Nguyen Van A ',
            email: ' A@GMAIL.COM ',
            phone: '',
            password: '12345678'
        });

        expect(result).toEqual({
            id: 10,
            full_name: 'Nguyen Van A',
            email: 'a@gmail.com',
            phone: null,
            role: 'PATIENT',
            account_status: 'ACTIVE'
        });

        expect(bcrypt.hash).toHaveBeenCalledWith('12345678', 10);
        expect(db.query).toHaveBeenCalledTimes(2);
    });

    // TEST 2: Email đã tồn tại
    test('UT02 - register báo lỗi khi email đã tồn tại', async () => {
        db.query.mockResolvedValueOnce([
            [{ id: 1 }]
        ]);

        await expect(
            authService.register({
                full_name: 'Nguyen Van A',
                email: 'a@gmail.com',
                phone: '',
                password: '12345678'
            })
        ).rejects.toMatchObject({
            statusCode: 409,
            message: 'Email đã được sử dụng'
        });

        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    // TEST 3: Số điện thoại đã tồn tại
    test('UT03 - register báo lỗi khi số điện thoại đã tồn tại', async () => {
        db.query
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([[{ id: 2 }]]);

        await expect(
            authService.register({
                full_name: 'Nguyen Van B',
                email: 'b@gmail.com',
                phone: '0901234567',
                password: '12345678'
            })
        ).rejects.toMatchObject({
            statusCode: 409,
            message: 'Số điện thoại đã được sử dụng'
        });

        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    // TEST 4: Đăng nhập thành công
    test('UT04 - login thành công với tài khoản hợp lệ', async () => {
        const mockUser = {
            id: 1,
            full_name: 'Nguyen Van A',
            email: 'a@gmail.com',
            phone: '0901234567',
            password: 'hashed_password',
            role: 'PATIENT',
            account_status: 'ACTIVE'
        };

        db.query.mockResolvedValueOnce([[mockUser]]);
        bcrypt.compare.mockResolvedValueOnce(true);

        const result = await authService.login(
            ' A@GMAIL.COM ',
            '12345678'
        );

        expect(result.token).toBe('test_token');
        expect(result.user).toEqual({
            id: 1,
            full_name: 'Nguyen Van A',
            email: 'a@gmail.com',
            phone: '0901234567',
            role: 'PATIENT'
        });

        expect(result.user.password).toBeUndefined();

        expect(jwt.sign).toHaveBeenCalledWith(
            { id: 1, role: 'PATIENT' },
            'test_secret',
            { expiresIn: '1d' }
        );
    });

    // TEST 5: Email không tồn tại
    test('UT05 - login báo lỗi khi email không tồn tại', async () => {
        db.query.mockResolvedValueOnce([[]]);

        await expect(
            authService.login('unknown@gmail.com', '12345678')
        ).rejects.toMatchObject({
            statusCode: 401,
            message: 'Email hoặc mật khẩu không chính xác'
        });

        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    // TEST 6: Mật khẩu không chính xác
    test('UT06 - login báo lỗi khi mật khẩu sai', async () => {
        db.query.mockResolvedValueOnce([[
            {
                id: 1,
                email: 'a@gmail.com',
                password: 'hashed_password',
                role: 'PATIENT',
                account_status: 'ACTIVE'
            }
        ]]);

        bcrypt.compare.mockResolvedValueOnce(false);

        await expect(
            authService.login('a@gmail.com', 'wrongpassword')
        ).rejects.toMatchObject({
            statusCode: 401,
            message: 'Email hoặc mật khẩu không chính xác'
        });

        expect(jwt.sign).not.toHaveBeenCalled();
    });

    // TEST 7: Tài khoản bị khóa
    test('UT07 - login từ chối tài khoản bị khóa', async () => {
        db.query.mockResolvedValueOnce([[
            {
                id: 2,
                email: 'b@gmail.com',
                password: 'hashed_password',
                role: 'PATIENT',
                account_status: 'LOCKED'
            }
        ]]);

        bcrypt.compare.mockResolvedValueOnce(true);

        await expect(
            authService.login('b@gmail.com', '12345678')
        ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Tài khoản hiện không hoạt động hoặc đã bị khóa'
        });

        expect(jwt.sign).not.toHaveBeenCalled();
    });

    // TEST 8: Vai trò không hợp lệ
    test('UT08 - login từ chối tài khoản có role không hợp lệ', async () => {
        db.query.mockResolvedValueOnce([[
            {
                id: 3,
                email: 'test@gmail.com',
                password: 'hashed_password',
                role: 'GUEST',
                account_status: 'ACTIVE'
            }
        ]]);

        bcrypt.compare.mockResolvedValueOnce(true);

        await expect(
            authService.login('test@gmail.com', '12345678')
        ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Vai trò tài khoản không hợp lệ'
        });

        expect(jwt.sign).not.toHaveBeenCalled();
    });

});
