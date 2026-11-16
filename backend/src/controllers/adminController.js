
const adminService = require('../services/adminService');

// GET /api/admin/accounts
// Lấy danh sách tài khoản
const getAccounts = async (req, res) => {
    try {
        const accounts = await adminService.getAccounts();

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách tài khoản thành công',
            data: accounts
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách tài khoản:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách tài khoản'
        });
    }
};

// GET /api/admin/accounts/:id
// Xem chi tiết tài khoản
const getAccountById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã tài khoản không hợp lệ'
            });
        }

        const account = await adminService.getAccountById(id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tài khoản'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy thông tin tài khoản thành công',
            data: account
        });

    } catch (error) {
        console.error('Lỗi lấy chi tiết tài khoản:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể lấy thông tin tài khoản'
        });
    }
};

// PATCH /api/admin/accounts/:id/status
// Khóa hoặc mở khóa tài khoản
const changeAccountStatus = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { account_status } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã tài khoản không hợp lệ'
            });
        }

        if (!['ACTIVE', 'LOCKED'].includes(account_status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái tài khoản không hợp lệ'
            });
        }

        // Không cho phép khóa tài khoản Admin
        const account = await adminService.getAccountById(id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tài khoản'
            });
        }

        if (account.role === 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Không thể khóa hoặc thay đổi trạng thái tài khoản Admin'
            });
        }

        if (account.account_status === account_status) {
            return res.status(200).json({
                success: true,
                message: 'Trạng thái tài khoản không thay đổi',
                data: account
            });
        }

        await adminService.updateAccountStatus(id, account_status);

        const updatedAccount = await adminService.getAccountById(id);

        return res.status(200).json({
            success: true,
            message: account_status === 'LOCKED'
                ? 'Khóa tài khoản thành công!'
                : 'Mở khóa tài khoản thành công!',
            data: updatedAccount
        });

    } catch (error) {
        console.error('Lỗi cập nhật trạng thái tài khoản:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật trạng thái tài khoản'
        });
    }
};
// Xóa tài khoản
const deleteAccount = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID tài khoản không hợp lệ.'
            });
        }

        // Không cho admin tự xóa tài khoản ADMIN
        const deleted = await adminService.deleteAccount(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tài khoản hoặc không thể xóa tài khoản ADMIN.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Xóa tài khoản thành công!'
        });
    } catch (error) {
        console.error('Lỗi xóa tài khoản:', error);

        // Có thể xảy ra khi tài khoản đang được tham chiếu bởi dữ liệu khác
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                success: false,
                message: 'Không thể xóa tài khoản vì đang có dữ liệu liên quan trong hệ thống.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ khi xóa tài khoản.'
        });
    }
};

module.exports = {
    getAccounts,
    getAccountById,
    changeAccountStatus,
    deleteAccount
};
