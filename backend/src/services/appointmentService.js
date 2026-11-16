
const db = require('../config/db');

// Các trạng thái hợp lệ của lịch khám
const VALID_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
];

// Lấy danh sách lịch khám
const getAppointments = async ({
    search = '',
    status = '',
    date = '',
    page = 1,
    limit = 10
}) => {
    const conditions = [];
    const params = [];

    // Tìm theo mã lịch, tên bệnh nhân hoặc tên bác sĩ
    if (search.trim()) {
        conditions.push(`
            (
                CAST(a.id AS CHAR) LIKE ?
                OR patient.full_name LIKE ?
                OR doctor.full_name LIKE ?
            )
        `);

        const keyword = `%${search.trim()}%`;
        params.push(keyword, keyword, keyword);
    }

    // Lọc theo trạng thái
    if (status && VALID_STATUSES.includes(status)) {
        conditions.push('a.status = ?');
        params.push(status);
    }

    // Lọc theo ngày khám
    if (date) {
        conditions.push('DATE(a.appointment_date) = ?');
        params.push(date);
    }

    const whereClause = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    // Đếm tổng số lịch khám
    const [countRows] = await db.execute(
        `
        SELECT COUNT(*) AS total
        FROM appointments a
        INNER JOIN users patient ON a.patient_id = patient.id
        INNER JOIN users doctor ON a.doctor_id = doctor.id
        ${whereClause}
        `,
        params
    );

    const total = Number(countRows[0].total);
    const offset = (page - 1) * limit;

    // Lấy danh sách lịch khám
    const [appointments] = await db.execute(
        `
        SELECT
            a.id,
            a.patient_id,
            patient.full_name AS patient_name,
            a.doctor_id,
            doctor.full_name AS doctor_name,
            a.slot_id,
            a.appointment_date,
            ds.start_time AS slot_start_time,
            ds.end_time AS slot_end_time,
            a.reason,
            a.status,
            a.created_at,
            a.updated_at
        FROM appointments a
        INNER JOIN users patient ON a.patient_id = patient.id
        INNER JOIN users doctor ON a.doctor_id = doctor.id
        INNER JOIN doctor_slots ds ON a.slot_id = ds.id
        ${whereClause}
        ORDER BY a.appointment_date ASC, a.id ASC
        LIMIT ? OFFSET ?
        `,
        [...params, limit, offset]
    );

    return {
        items: appointments,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// Lấy chi tiết một lịch khám
const getAppointmentById = async (id) => {
    const [rows] = await db.execute(
        `
        SELECT
            a.id,
            a.patient_id,
            patient.full_name AS patient_name,
            patient.email AS patient_email,
            patient.phone AS patient_phone,

            a.doctor_id,
            doctor.full_name AS doctor_name,
            doctor.email AS doctor_email,
            doctor.phone AS doctor_phone,
            doctor.degree AS doctor_degree,
            doctor.specialty_id,

            a.slot_id,
            ds.start_time AS slot_start_time,
            ds.end_time AS slot_end_time,
            ds.status AS slot_status,

            a.appointment_date,
            a.reason,
            a.status,
            a.status_history,
            a.created_at,
            a.updated_at
        FROM appointments a
        INNER JOIN users patient ON a.patient_id = patient.id
        INNER JOIN users doctor ON a.doctor_id = doctor.id
        INNER JOIN doctor_slots ds ON a.slot_id = ds.id
        WHERE a.id = ?
        `,
        [id]
    );

    return rows[0] || null;
};

// Cập nhật trạng thái lịch khám và ghi lịch sử
const updateAppointmentStatus = async (id, newStatus) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `
            SELECT id, status
            FROM appointments
            WHERE id = ?
            FOR UPDATE
            `,
            [id]
        );

        if (!rows.length) {
            await connection.rollback();
            return null;
        }

        const oldStatus = rows[0].status;

        // Không cần cập nhật nếu trạng thái không thay đổi
        if (oldStatus === newStatus) {
            await connection.commit();

            return {
                id,
                oldStatus,
                newStatus,
                changed: false
            };
        }

        await connection.execute(
            `
            UPDATE appointments
            SET
                status = ?,
                status_history = JSON_ARRAY_APPEND(
                    COALESCE(status_history, JSON_ARRAY()),
                    '$',
                    JSON_OBJECT(
                        'old_status', ?,
                        'new_status', ?,
                        'changed_at',
                        DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')
                    )
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [newStatus, oldStatus, newStatus, id]
        );

        await connection.commit();

        return {
            id,
            oldStatus,
            newStatus,
            changed: true
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    VALID_STATUSES,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus
};
