
const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    driver: 'msnodesqlv8',
    options: {
        trustedConnection: true,
        trustServerCertificate: true
    }
};

const poolPromise = sql.connect(config)
    .then(pool => {
        console.log('Ket noi SQL Server thanh cong!');
        return pool;
    })
    .catch(err => {
        console.error('Loi ket noi SQL Server:', err);
        throw err;
    });

module.exports = { sql, poolPromise };
