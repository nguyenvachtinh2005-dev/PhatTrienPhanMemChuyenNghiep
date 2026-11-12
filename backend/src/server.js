require('dotenv').config();

const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        // Kiểm tra cấu hình JWT
        if (!process.env.JWT_SECRET) {
            throw new Error('Chưa cấu hình JWT_SECRET trong file .env');
        }

        // Kiểm tra kết nối MySQL
        await db.query('SELECT 1');

        console.log('MySQL kết nối thành công!');

        // Khởi động Server
        app.listen(PORT, () => {
            console.log('================================');
            console.log('HealBooking Backend đang chạy');
            console.log(`URL: http://localhost:${PORT}`);
            console.log(`Health: http://localhost:${PORT}/api/health`);
            console.log('================================');
        });

    } catch (error) {
        console.error('Không thể khởi động Backend:', error.message);
        process.exit(1);
    }
}

startServer();