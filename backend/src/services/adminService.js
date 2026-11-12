
const db = require('../config/db');

// Lấy danh sách tài khoản
const getAccounts = async () => {
    const [accounts] = await db.execute(`
        SELECT
            id,
            full_name,
            email,
            phone,
            role,
            account_status,
            created_at
        FROM users
        ORDER BY created_at ASC, id ASC
    `);

    return accounts;
};

// Lấy thông tin một tài khoản theo ID
const getAccountById = async (id) => {
    const [accounts] = await db.execute(
        `SELECT
            id,
            full_name,
            email,
            phone,
            role,
            account_status,
            created_at
         FROM users
         WHERE id = ?`,
        [id]
    );

    return accounts[0] || null;
};

// Cập nhật trạng thái tài khoản
const updateAccountStatus = async (id, accountStatus) => {
    const [result] = await db.execute(
        `UPDATE users
         SET account_status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND role != 'ADMIN'`,
        [accountStatus, id]
    );

    return result.affectedRows;
};
// Xóa tài khoản theo ID
const deleteAccount = async (id) => {
    // Không cho phép xóa tài khoản ADMIN
    const [result] = await db.execute(
        `DELETE FROM users
         WHERE id = ? AND role != 'ADMIN'`,
        [id]
    );

    return result.affectedRows > 0;
};

module.exports = {
    getAccounts,
    getAccountById,
    updateAccountStatus,
    deleteAccount,
};
