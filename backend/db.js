// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: process.env.TIDB_ENABLE_SSL === 'true' ? {
    // Windows uses the built-in CA store, no need for ca file path
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  } : null,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Test connection function
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to TiDB Cloud!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to TiDB Cloud:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };