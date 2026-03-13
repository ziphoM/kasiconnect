// backend/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool using environment variables
const pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    port: parseInt(process.env.TIDB_PORT || '4000'),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,
    ssl: process.env.TIDB_ENABLE_SSL === 'true' ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    } : null,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully to TiDB Cloud');
        console.log(`📊 Database: ${process.env.TIDB_DATABASE}`);
        
        // Test query
        const [rows] = await connection.query('SELECT VERSION() as version');
        console.log(`🔄 TiDB Version: ${rows[0].version}`);
        
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('🔧 Check your .env file and TiDB Cloud credentials');
        return false;
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Closing database connections...');
    await pool.end();
    process.exit(0);
});

module.exports = { pool, testConnection };