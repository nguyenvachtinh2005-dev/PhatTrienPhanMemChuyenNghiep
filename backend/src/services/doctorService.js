const db = require('../config/db');
const appointmentService = require('./appointmentService');

// Các trạng thái lịch khám hợp lệ
const VALID_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
];

// =====================================
// DASHBOARD BÁC SĨ
// =====================================

const getDashboard = async (doctorId) => {

    // Chạy hai truy vấn song song.
    // Truy vấn thống kê và truy vấn lịch sắp tới không phụ thuộc nhau.
    const [countResult, upcomingResult] = await Promise.all([

        // Thống kê lịch khám của bác sĩ.
        db.execute(
            `
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(status = 'PENDING'), 0) AS pending,
                COALESCE(SUM(status = 'CONFIRMED'), 0) AS confirmed,
                COALESCE(SUM(status = 'COMPLETED'), 0) AS completed,
                COALESCE(SUM(status = 'REJECTED'), 0) AS rejected
            FROM appointments
            WHERE doctor_id = ?
            `,
            [doctorId]
        ),

        // Lấy tối đa 5 lịch khám sắp tới.
        db.execute(
            `
            SELECT
                a.id,
                patient.full_name AS patient_name,
                a.appointment_date,
                a.status,
                ds.start_time AS slot_start_time,
                ds.end_time AS slot_end_time
            FROM appointments a

            INNER JOIN users patient
                ON a.patient_id = patient.id

            INNER JOIN doctor_slots ds
                ON a.slot_id = ds.id

            WHERE a.doctor_id = ?
              AND a.status IN ('PENDING', 'CONFIRMED')
              AND a.appointment_date >= CURDATE()

            ORDER BY
                a.appointment_date ASC,
                ds.start_time ASC,
                a.id ASC

            LIMIT 5
            `,
            [doctorId]
        )
    ]);

    const countRows = countResult[0];
    const upcomingAppointments = upcomingResult[0];

    const stats = countRows[0] || {};

    return {
        statistics: {
            total: Number(stats.total || 0),
            pending: Number(stats.pending || 0),
            confirmed: Number(stats.confirmed || 0),
            completed: Number(stats.completed || 0),
            rejected: Number(stats.rejected || 0)
        },

        upcomingAppointments
    };
};

// =====================================
// DANH SÁCH LỊCH KHÁM CỦA BÁC SĨ
// =====================================

const getAppointments = async ({
    doctorId,
    search = '',
    status = '',
    date = '',
    page = 1,
    limit = 10
}) => {

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const conditions = ['a.doctor_id = ?'];
    const params = [doctorId];

    if (search && search.trim()) {

        conditions.push(`
            (
                CAST(a.id AS CHAR) LIKE ?
                OR patient.full_name LIKE ?
            )
        `);

        const keyword = `%${search.trim()}%`;

        params.push(keyword, keyword);
    }

    if (status && VALID_STATUSES.includes(status)) {
        conditions.push('a.status = ?');
        params.push(status);
    }

    if (date) {
        conditions.push('DATE(a.appointment_date) = ?');
        params.push(date);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Đếm tổng số lịch khám.
    const [countRows] = await db.execute(
        `
        SELECT COUNT(*) AS total

        FROM appointments a

        INNER JOIN users patient
            ON a.patient_id = patient.id

        ${whereClause}
        `,
        params
    );

    const total = Number(countRows[0]?.total || 0);
    const offset = (page - 1) * limit;

    // Lấy danh sách lịch khám theo phân trang.
    const [items] = await db.execute(
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

        INNER JOIN users patient
            ON a.patient_id = patient.id

        INNER JOIN users doctor
            ON a.doctor_id = doctor.id

        INNER JOIN doctor_slots ds
            ON a.slot_id = ds.id

        ${whereClause}

        ORDER BY
            a.appointment_date ASC,
            a.id ASC

        LIMIT ? OFFSET ?
        `,
        [...params, limit, offset]
    );

    return {
        items,

        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// =====================================
// CHI TIẾT LỊCH KHÁM
// =====================================

const getAppointmentById = async (id, doctorId) => {

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

        INNER JOIN users patient
            ON a.patient_id = patient.id

        INNER JOIN users doctor
            ON a.doctor_id = doctor.id

        INNER JOIN doctor_slots ds
            ON a.slot_id = ds.id

        WHERE a.id = ?
          AND a.doctor_id = ?

        LIMIT 1
        `,
        [id, doctorId]
    );

    return rows[0] || null;
};

// =====================================
// CẬP NHẬT TRẠNG THÁI LỊCH KHÁM
// =====================================

const updateAppointmentStatus = async (
    id,
    doctorId,
    newStatus
) => {

    if (!VALID_STATUSES.includes(newStatus)) {
        throw new Error('Trạng thái lịch khám không hợp lệ.');
    }

    return appointmentService.updateAppointmentStatus(
        id,
        newStatus,
        {
            doctorId,
            isDoctor: true
        }
    );
};

// =====================================
// EXPORT
// =====================================

module.exports = {
    getDashboard,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus
};