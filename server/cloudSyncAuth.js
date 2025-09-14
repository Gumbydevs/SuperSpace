/**
 * Simple file-based authentication and cloud sync for SuperSpace
 * No database required - uses JSON files for storage
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CloudSyncAuth {
    constructor() {
        this.dataDir = path.join(__dirname, 'cloud_data');
        this.usersFile = path.join(this.dataDir, 'users.json');
        this.tokensFile = path.join(this.dataDir, 'tokens.json');
        
        // Ensure directories exist
        this.initializeDirectories();
    }
    
    async initializeDirectories() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir(path.join(this.dataDir, 'players'), { recursive: true });
            
            // Initialize users file if it doesn't exist
            try {
                await fs.access(this.usersFile);
            } catch {
                await fs.writeFile(this.usersFile, JSON.stringify({}));
            }
            
            // Initialize tokens file if it doesn't exist
            try {
                await fs.access(this.tokensFile);
            } catch {
                await fs.writeFile(this.tokensFile, JSON.stringify({}));
            }
            
            console.log('☁️ Cloud sync directories initialized');
        } catch (error) {
            console.error('Failed to initialize cloud sync directories:', error);
        }
    }
    
    // Hash password with salt
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return { salt, hash };
    }
    
    // Verify password
    verifyPassword(password, salt, hash) {
        const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }
    
    // Generate auth token
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    // Register new user
    async register(username, password) {
        try {
            // Validate input
            if (!username || !password) {
                return { success: false, message: 'Username and password required' };
            }
            
            if (username.length < 3) {
                return { success: false, message: 'Username must be at least 3 characters' };
            }
            
            if (password.length < 6) {
                return { success: false, message: 'Password must be at least 6 characters' };
            }
            
            // Check if username already exists
            const users = await this.loadUsers();
            if (users[username.toLowerCase()]) {
                return { success: false, message: 'Username already exists' };
            }
            
            // Hash password and save user
            const { salt, hash } = this.hashPassword(password);
            users[username.toLowerCase()] = {
                username: username, // Preserve original case
                salt,
                hash,
                createdAt: new Date().toISOString()
            };
            
            await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
            
            console.log(`✅ New user registered: ${username}`);
            return { success: true, message: 'Account created successfully' };
            
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Server error during registration' };
        }
    }
    
    // Login user
    async login(username, password) {
        try {
            const users = await this.loadUsers();
            const user = users[username.toLowerCase()];
            
            if (!user) {
                return { success: false, message: 'Invalid username or password' };
            }
            
            if (!this.verifyPassword(password, user.salt, user.hash)) {
                return { success: false, message: 'Invalid username or password' };
            }
            
            // Generate and save token
            const token = this.generateToken();
            const tokens = await this.loadTokens();
            tokens[token] = {
                username: user.username,
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };
            
            await fs.writeFile(this.tokensFile, JSON.stringify(tokens, null, 2));
            
            console.log(`✅ User logged in: ${user.username}`);
            return { success: true, token, username: user.username };
            
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Server error during login' };
        }
    }
    
    // Validate token
    async validateToken(token) {
        try {
            const tokens = await this.loadTokens();
            const tokenData = tokens[token];
            
            if (!tokenData) {
                return { valid: false };
            }
            
            // Update last used time
            tokenData.lastUsed = new Date().toISOString();
            await fs.writeFile(this.tokensFile, JSON.stringify(tokens, null, 2));
            
            return { valid: true, username: tokenData.username };
            
        } catch (error) {
            console.error('Token validation error:', error);
            return { valid: false };
        }
    }
    
    // Save player data
    async savePlayerData(token, gameData) {
        try {
            const validation = await this.validateToken(token);
            if (!validation.valid) {
                return { success: false, message: 'Invalid token' };
            }
            
            const filename = `${validation.username.toLowerCase()}.json`;
            const filepath = path.join(this.dataDir, 'players', filename);
            
            const playerData = {
                username: validation.username,
                gameData,
                lastSaved: new Date().toISOString()
            };
            
            await fs.writeFile(filepath, JSON.stringify(playerData, null, 2));
            
            console.log(`💾 Saved data for: ${validation.username}`);
            return { success: true };
            
        } catch (error) {
            console.error('Save data error:', error);
            return { success: false, message: 'Failed to save data' };
        }
    }
    
    // Load player data
    async loadPlayerData(token) {
        try {
            const validation = await this.validateToken(token);
            if (!validation.valid) {
                return { success: false, message: 'Invalid token' };
            }
            
            const filename = `${validation.username.toLowerCase()}.json`;
            const filepath = path.join(this.dataDir, 'players', filename);
            
            try {
                const data = await fs.readFile(filepath, 'utf8');
                const playerData = JSON.parse(data);
                
                console.log(`📥 Loaded data for: ${validation.username}`);
                return { success: true, gameData: playerData.gameData };
                
            } catch (error) {
                // File doesn't exist or is corrupted - return empty data
                console.log(`📭 No saved data found for: ${validation.username}`);
                return { success: true, gameData: {} };
            }
            
        } catch (error) {
            console.error('Load data error:', error);
            return { success: false, message: 'Failed to load data' };
        }
    }
    
    // Load users from file
    async loadUsers() {
        try {
            const data = await fs.readFile(this.usersFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load users:', error);
            return {};
        }
    }
    
    // Load tokens from file
    async loadTokens() {
        try {
            const data = await fs.readFile(this.tokensFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load tokens:', error);
            return {};
        }
    }
    
    // Clean up expired tokens (call periodically)
    async cleanupTokens() {
        try {
            const tokens = await this.loadTokens();
            const now = Date.now();
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            
            let cleaned = 0;
            for (const [token, data] of Object.entries(tokens)) {
                const tokenAge = now - new Date(data.lastUsed).getTime();
                if (tokenAge > maxAge) {
                    delete tokens[token];
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                await fs.writeFile(this.tokensFile, JSON.stringify(tokens, null, 2));
                console.log(`🧹 Cleaned up ${cleaned} expired tokens`);
            }
            
        } catch (error) {
            console.error('Token cleanup error:', error);
        }
    }
}

module.exports = CloudSyncAuth;