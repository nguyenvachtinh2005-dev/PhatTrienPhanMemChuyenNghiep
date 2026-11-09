require('dotenv').config();

const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        await db.query('SELECT 1');

        console.log('MySQL kết nối thành công!');

        app.listen(PORT, () => {
            console.log(
                `HealBooking Server: http://localhost:${PORT}`
            );
        });

    } catch (error) {
        console.error(
            'Không thể kết nối MySQL:',
            error.message
        );

        process.exit(1);
    }
}

startServer();