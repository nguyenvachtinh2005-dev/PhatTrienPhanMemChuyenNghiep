
const db = require('../config/db');

// Các trạng thái lịch khám
const VALID_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
];

// =====================================
// DANH SÁCH CHUYÊN KHOA
// =====================================

const getSpecialties = async () => {
    const [rows] = await db.execute(`
        SELECT id, name, description
        FROM specialties
        ORDER BY name ASC
    `);

    return rows;
};

// =====================================
// TÌM KIẾM BÁC SĨ
// =====================================

const getDoctors = async ({
    search = '',
    specialtyId = '',
    page = 1,
    limit = 10
}) => {
    page = Math.max(1, Number.parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

    const conditions = [
        "u.role = 'DOCTOR'",
        "u.account_status = 'ACTIVE'",
        "u.verification_status = 'APPROVED'"
    ];

    const params = [];

    if (search.trim()) {
        conditions.push('u.full_name LIKE ?');
        params.push(`%${search.trim()}%`);
    }

    if (specialtyId) {
        conditions.push('u.specialty_id = ?');
        params.push(Number(specialtyId));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await db.execute(
        `
        SELECT COUNT(*) AS total
        FROM users u
        LEFT JOIN specialties s ON u.specialty_id = s.id
        ${whereClause}
        `,
        params
    );

    const total = Number(countRows[0]?.total || 0);
    const offset = (page - 1) * limit;

    const [rows] = await db.execute(
        `
        SELECT
            u.id,
            u.full_name,
            u.email,
            u.phone,
            u.degree,
            u.experience_years,
            u.work_address,
            u.specialty_id,
            s.name AS specialty_name
        FROM users u
        LEFT JOIN specialties s ON u.specialty_id = s.id
        ${whereClause}
        ORDER BY u.full_name ASC
        LIMIT ? OFFSET ?
        `,
        [...params, limit, offset]
    );

    return {
        items: rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// =====================================
// KHUNG GIỜ CÒN TRỐNG CỦA BÁC SĨ
// =====================================

const getDoctorSlots = async (doctorId, date = '') => {
    const conditions = [
        'ds.doctor_id = ?',
        'ds.start_time > NOW()',
        "ds.status <> 'CANCELLED'",
        "u.role = 'DOCTOR'",
        "u.account_status = 'ACTIVE'",
        "u.verification_status = 'APPROVED'"
    ];

    const params = [doctorId];

    if (date) {
        conditions.push('DATE(ds.start_time) = ?');
        params.push(date);
    }

    const [rows] = await db.execute(
        `
        SELECT
            ds.id,
            ds.doctor_id,
            ds.start_time,
            ds.end_time,
            ds.max_patients,
            ds.status,
            (
                SELECT COUNT(*)
                FROM appointments a
                WHERE a.slot_id = ds.id
                  AND a.status NOT IN ('CANCELLED', 'REJECTED')
            ) AS booked_patients
        FROM doctor_slots ds
        INNER JOIN users u ON u.id = ds.doctor_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY ds.start_time ASC
        `,
        params
    );

    return rows
        .filter(slot =>
            Number(slot.booked_patients) < Number(slot.max_patients)
        )
        .map(slot => ({
            ...slot,
            remaining_patients:
                Number(slot.max_patients) - Number(slot.booked_patients)
        }));
};

// =====================================
// ĐẶT LỊCH KHÁM
// =====================================

const createAppointment = async ({
    patientId,
    doctorId,
    slotId,
    reason = ''
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Kiểm tra bệnh nhân
        const [patientRows] = await connection.execute(
            `
            SELECT id
            FROM users
            WHERE id = ?
              AND role = 'PATIENT'
              AND account_status = 'ACTIVE'
            FOR UPDATE
            `,
            [patientId]
        );

        if (!patientRows.length) {
            await connection.rollback();
            return { accountInvalid: true };
        }

        // Kiểm tra bác sĩ
        const [doctorRows] = await connection.execute(
            `
            SELECT id
            FROM users
            WHERE id = ?
              AND role = 'DOCTOR'
              AND account_status = 'ACTIVE'
              AND verification_status = 'APPROVED'
            `,
            [doctorId]
        );

        if (!doctorRows.length) {
            await connection.rollback();
            return { doctorUnavailable: true };
        }

        // Khóa khung giờ để tránh đặt vượt sức chứa
        const [slotRows] = await connection.execute(
            `
            SELECT
                id,
                doctor_id,
                start_time,
                end_time,
                max_patients,
                status
            FROM doctor_slots
            WHERE id = ?
              AND doctor_id = ?
            FOR UPDATE
            `,
            [slotId, doctorId]
        );

        if (!slotRows.length) {
            await connection.rollback();
            return { slotNotFound: true };
        }

        const slot = slotRows[0];

        if (slot.status === 'CANCELLED') {
            await connection.rollback();
            return { slotUnavailable: true };
        }

        if (new Date(slot.start_time).getTime() <= Date.now()) {
            await connection.rollback();
            return { slotExpired: true };
        }

        // Đếm các lịch chưa bị hủy hoặc từ chối
        const [countRows] = await connection.execute(
            `
            SELECT COUNT(*) AS total
            FROM appointments
            WHERE slot_id = ?
              AND status NOT IN ('CANCELLED', 'REJECTED')
            `,
            [slotId]
        );

        const booked = Number(countRows[0]?.total || 0);
        const maximum = Number(slot.max_patients);

        if (booked >= maximum) {
            await connection.execute(
                `UPDATE doctor_slots SET status = 'FULL' WHERE id = ?`,
                [slotId]
            );

            await connection.commit();
            return { slotFull: true };
        }

        // Tạo lịch khám
        const [result] = await connection.execute(
            `
            INSERT INTO appointments (
                patient_id,
                doctor_id,
                slot_id,
                appointment_date,
                reason,
                status,
                status_history
            )
            VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
            `,
            [
                patientId,
                doctorId,
                slotId,
                slot.start_time,
                reason.trim() || null,
                JSON.stringify([{
                    old_status: null,
                    new_status: 'PENDING',
                    changed_at: new Date().toISOString()
                }])
            ]
        );

        // Cập nhật trạng thái khung giờ
        const newBooked = booked + 1;
        const newSlotStatus = newBooked >= maximum
            ? 'FULL'
            : 'AVAILABLE';

        await connection.execute(
            `
            UPDATE doctor_slots
            SET status = ?
            WHERE id = ?
            `,
            [newSlotStatus, slotId]
        );

        await connection.commit();

        return {
            id: result.insertId,
            patient_id: patientId,
            doctor_id: doctorId,
            slot_id: slotId,
            appointment_date: slot.start_time,
            reason: reason.trim() || null,
            status: 'PENDING'
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// =====================================
// DANH SÁCH LỊCH KHÁM CỦA BỆNH NHÂN
// =====================================

const getAppointments = async ({
    patientId,
    search = '',
    status = '',
    date = '',
    page = 1,
    limit = 10
}) => {
    page = Math.max(1, Number.parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

    const conditions = ['a.patient_id = ?'];
    const params = [patientId];

    if (search.trim()) {
        conditions.push(`
            (
                CAST(a.id AS CHAR) LIKE ?
                OR doctor.full_name LIKE ?
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

    const [countRows] = await db.execute(
        `
        SELECT COUNT(*) AS total
        FROM appointments a
        INNER JOIN users doctor ON a.doctor_id = doctor.id
        ${whereClause}
        `,
        params
    );

    const total = Number(countRows[0]?.total || 0);
    const offset = (page - 1) * limit;

    const [rows] = await db.execute(
        `
        SELECT
            a.id,
            a.patient_id,
            a.doctor_id,
            doctor.full_name AS doctor_name,
            doctor.degree AS doctor_degree,
            doctor.phone AS doctor_phone,
            s.name AS specialty_name,
            a.slot_id,
            ds.start_time AS slot_start_time,
            ds.end_time AS slot_end_time,
            a.appointment_date,
            a.reason,
            a.status,
            a.status_history,
            a.created_at,
            a.updated_at
        FROM appointments a
        INNER JOIN users doctor ON a.doctor_id = doctor.id
        INNER JOIN doctor_slots ds ON a.slot_id = ds.id
        LEFT JOIN specialties s ON doctor.specialty_id = s.id
        ${whereClause}
        ORDER BY a.appointment_date DESC, a.id DESC
        LIMIT ? OFFSET ?
        `,
        [...params, limit, offset]
    );

    return {
        items: rows,
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

const getAppointmentById = async (id, patientId) => {
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
            doctor.degree AS doctor_degree,
            doctor.phone AS doctor_phone,
            doctor.work_address,
            s.name AS specialty_name,
            a.slot_id,
            ds.start_time AS slot_start_time,
            ds.end_time AS slot_end_time,
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
        LEFT JOIN specialties s ON doctor.specialty_id = s.id
        WHERE a.id = ?
          AND a.patient_id = ?
        LIMIT 1
        `,
        [id, patientId]
    );

    return rows[0] || null;
};

// =====================================
// HỦY LỊCH KHÁM
// =====================================

const cancelAppointment = async (id, patientId) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `
            SELECT id, slot_id, status
            FROM appointments
            WHERE id = ?
              AND patient_id = ?
            FOR UPDATE
            `,
            [id, patientId]
        );

        if (!rows.length) {
            await connection.rollback();
            return null;
        }

        const appointment = rows[0];

        if (appointment.status !== 'PENDING') {
            await connection.rollback();
            return {
                invalidTransition: true,
                currentStatus: appointment.status
            };
        }

        await connection.execute(
            `
            UPDATE appointments
            SET
                status = 'CANCELLED',
                status_history = JSON_ARRAY_APPEND(
                    COALESCE(status_history, JSON_ARRAY()),
                    '$',
                    JSON_OBJECT(
                        'old_status', 'PENDING',
                        'new_status', 'CANCELLED',
                        'changed_at',
                        DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')
                    )
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [id]
        );

        // Khóa khung giờ và tính lại sức chứa
        const [slotRows] = await connection.execute(
            `
            SELECT id, max_patients, status
            FROM doctor_slots
            WHERE id = ?
            FOR UPDATE
            `,
            [appointment.slot_id]
        );

        if (slotRows.length && slotRows[0].status !== 'CANCELLED') {
            const [countRows] = await connection.execute(
                `
                SELECT COUNT(*) AS total
                FROM appointments
                WHERE slot_id = ?
                  AND status NOT IN ('CANCELLED', 'REJECTED')
                `,
                [appointment.slot_id]
            );

            const booked = Number(countRows[0]?.total || 0);
            const maximum = Number(slotRows[0].max_patients);

            await connection.execute(
                `
                UPDATE doctor_slots
                SET status = ?
                WHERE id = ?
                `,
                [booked >= maximum ? 'FULL' : 'AVAILABLE', appointment.slot_id]
            );
        }

        await connection.commit();

        return {
            id,
            oldStatus: 'PENDING',
            newStatus: 'CANCELLED'
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// =====================================
// THÔNG TIN CÁ NHÂN
// =====================================

const getProfile = async (patientId) => {
    const [rows] = await db.execute(
        `
        SELECT
            id,
            full_name,
            email,
            phone,
            date_of_birth,
            gender,
            address,
            medical_history,
            role,
            account_status,
            created_at
        FROM users
        WHERE id = ?
          AND role = 'PATIENT'
        LIMIT 1
        `,
        [patientId]
    );

    return rows[0] || null;
};

module.exports = {
    VALID_STATUSES,
    getSpecialties,
    getDoctors,
    getDoctorSlots,
    createAppointment,
    getAppointments,
    getAppointmentById,
    cancelAppointment,
    getProfile
};
