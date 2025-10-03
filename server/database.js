const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migrate password_hash column to TEXT to support JSON storage
        await pool.query(`
            ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS auth_tokens (
                id SERIAL PRIMARY KEY,
                token VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_data (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                data JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
            )
        `);

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// User management functions
async function createUser(username, passwordHash, email = null) {
    const result = await pool.query(
        'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING *',
        [username, passwordHash, email]
    );
    return result.rows[0];
}

async function getUser(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
}

async function getAllUsers() {
    const result = await pool.query('SELECT username, created_at, last_login FROM users ORDER BY created_at DESC');
    return result.rows;
}

async function updateLastLogin(username) {
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = $1', [username]);
}

// Token management functions
async function createToken(token, username, expiresAt = null) {
    const result = await pool.query(
        'INSERT INTO auth_tokens (token, username, expires_at) VALUES ($1, $2, $3) RETURNING *',
        [token, username, expiresAt]
    );
    return result.rows[0];
}

async function getTokenData(token) {
    const result = await pool.query(
        'SELECT * FROM auth_tokens WHERE token = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)',
        [token]
    );
    return result.rows[0];
}

async function deleteToken(token) {
    await pool.query('DELETE FROM auth_tokens WHERE token = $1', [token]);
}

async function deleteExpiredTokens() {
    await pool.query('DELETE FROM auth_tokens WHERE expires_at < CURRENT_TIMESTAMP');
}

// Player data management functions
async function savePlayerData(username, data) {
    const result = await pool.query(`
        INSERT INTO player_data (username, data) 
        VALUES ($1, $2) 
        ON CONFLICT (username) 
        DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP 
        RETURNING *
    `, [username, JSON.stringify(data)]);
    return result.rows[0];
}

async function getPlayerData(username) {
    const result = await pool.query('SELECT data FROM player_data WHERE username = $1', [username]);
    if (result.rows.length > 0) {
        return result.rows[0].data;
    }
    return null;
}

async function getAllPlayerData() {
    const result = await pool.query('SELECT username, data, updated_at FROM player_data ORDER BY updated_at DESC');
    return result.rows.map(row => ({
        username: row.username,
        data: row.data,
        updated_at: row.updated_at
    }));
}

// Analytics helper functions
async function getUserStats() {
    const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const recentUsersResult = await pool.query(
        'SELECT username, last_login FROM users ORDER BY last_login DESC LIMIT 10'
    );
    
    return {
        totalUsers: parseInt(userCountResult.rows[0].count),
        recentUsers: recentUsersResult.rows
    };
}

async function getPlayerStats() {
    const result = await pool.query(`
        SELECT 
            u.username,
            u.created_at,
            u.last_login,
            pd.data,
            pd.updated_at
        FROM users u
        LEFT JOIN player_data pd ON u.username = pd.username
        ORDER BY u.last_login DESC
    `);
    
    return result.rows.map(row => {
        const playerData = row.data || {};
        const playTimeMs = playerData.gameTime || 0;
        
        // Convert milliseconds to hours, minutes, seconds
        const hours = Math.floor(playTimeMs / (1000 * 60 * 60));
        const minutes = Math.floor((playTimeMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((playTimeMs % (1000 * 60)) / 1000);
        
        return {
            username: row.username,
            createdAt: row.created_at,
            lastLogin: row.last_login,
            playTime: {
                hours,
                minutes,
                seconds,
                total: playTimeMs
            },
            dataUpdated: row.updated_at
        };
    });
}

module.exports = {
    pool,
    initDatabase,
    createUser,
    getUser,
    getAllUsers,
    updateLastLogin,
    createToken,
    getTokenData,
    deleteToken,
    deleteExpiredTokens,
    savePlayerData,
    getPlayerData,
    getAllPlayerData,
    getUserStats,
    getPlayerStats
};