
const { sql, poolPromise } = require('../config/db');

// Lấy danh sách tài khoản
const getAccounts = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
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

    return result.recordset;
};

// Lấy thông tin một tài khoản theo ID
const getAccountById = async (id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`SELECT
            id,
            full_name,
            email,
            phone,
            role,
            account_status,
            created_at
         FROM users
         WHERE id = @id`);

    return result.recordset[0] || null;
};

// Cập nhật trạng thái tài khoản
const updateAccountStatus = async (id, accountStatus) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('accountStatus', sql.VarChar(20), accountStatus)
        .input('id', sql.Int, id)
        .query(`UPDATE users
         SET account_status = @accountStatus, updated_at = CURRENT_TIMESTAMP
         WHERE id = @id AND role != 'ADMIN'`);

    return result.rowsAffected[0];
};
// Xóa tài khoản theo ID
const deleteAccount = async (id) => {
    // Không cho phép xóa tài khoản ADMIN
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`DELETE FROM users
         WHERE id = @id AND role != 'ADMIN'`);

    return result.rowsAffected[0] > 0;
};

module.exports = {
    getAccounts,
    getAccountById,
    updateAccountStatus,
    deleteAccount,
};
