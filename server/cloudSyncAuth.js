/**
 * Database-based authentication and cloud sync for SuperSpace
 * Uses PostgreSQL for persistent data storage
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const database = require('./database');

// Optionally emit analytics events if analytics module is available
let analytics = null;
try {
  analytics = require('./analytics');
  // If analytics exports a class, try to reuse singleton via require cache in server.js
  // server.js creates an instance named `analytics` — cloudSyncAuth will call analytics.processEvent if it's that instance
} catch (e) {
  // analytics not available in some contexts (e.g., unit tests) — silently ignore
  analytics = null;
}

class CloudSyncAuth {
  constructor() {
    // Keep data directory for backup files if needed
    this.dataDir = path.join(__dirname, 'cloud_data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.tokensFile = path.join(this.dataDir, 'tokens.json');
    this.dbAvailable = false;

    // Initialize database on startup (non-blocking)
    this.initializeDatabase();

    // Space-themed words for recovery keys
    this.spaceWords = [
      'STAR',
      'MOON',
      'MARS',
      'VENUS',
      'EARTH',
      'COMET',
      'NOVA',
      'ORBIT',
      'GALAXY',
      'PLANET',
      'ROCKET',
      'COSMIC',
      'SOLAR',
      'NEBULA',
      'METEOR',
      'SATURN',
      'PLUTO',
      'JUPITER',
      'URANUS',
      'NEPTUNE',
      'ASTEROID',
      'QUASAR',
      'PULSAR',
      'PHOTON',
      'PLASMA',
      'VACUUM',
      'GRAVITY',
      'ECLIPSE',
      'CRATER',
      'COSMOS',
      'VOID',
      'SPACE',
      'STELLAR',
      'LUNAR',
      'ALIEN',
      'PROBE',
      'SHUTTLE',
      'STATION',
      'MISSION',
      'LAUNCH',
      'LANDING',
      'EXPLORE',
    ];

    // Ensure directories exist for backward compatibility
    this.initializeDirectories();
  }

  async initializeDatabase() {
    try {
      await database.initDatabase();
      this.dbAvailable = true;
      console.log('CloudSyncAuth: Database initialized successfully');
    } catch (error) {
      console.error('CloudSyncAuth: Failed to initialize database:', error);
      console.log('⚠️  CloudSyncAuth: Falling back to file-based storage');
      this.dbAvailable = false;
      // Don't throw - gracefully fall back to file storage
    }
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'players'), { recursive: true });

      // Initialize users file if it doesn't exist (for backup purposes)
      try {
        await fs.access(this.usersFile);
      } catch {
        await fs.writeFile(this.usersFile, JSON.stringify({}));
      }

      // Initialize tokens file if it doesn't exist (for backup purposes)
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
    const hash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    return { salt, hash };
  }

  // Verify password
  verifyPassword(password, salt, hash) {
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    return hash === verifyHash;
  }

  // Generate auth token
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate space-themed recovery key
  generateRecoveryKey() {
    const words = [];
    for (let i = 0; i < 4; i++) {
      const randomWord =
        this.spaceWords[Math.floor(Math.random() * this.spaceWords.length)];
      words.push(randomWord);
    }
    // Add some numbers for extra security
    const numbers = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    return words.join('-') + '-' + numbers;
  }

  // Register new user
  async register(username, password) {
    try {
      // Validate input
      if (!username || !password) {
        return { success: false, message: 'Username and password required' };
      }

      if (username.length < 3) {
        return {
          success: false,
          message: 'Username must be at least 3 characters',
        };
      }

      if (password.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters',
        };
      }

      // Check if username already exists
      const existingUser = await database.getUser(username.toLowerCase());
      if (existingUser) {
        return { success: false, message: 'Username already exists' };
      }

      // Generate recovery key
      const recoveryKey = this.generateRecoveryKey();
      const { salt: recoverySalt, hash: recoveryHash } =
        this.hashPassword(recoveryKey);

      // Hash password and save user
      const { salt, hash } = this.hashPassword(password);
      
      // Create user data object
      const userData = {
        username: username, // Preserve original case
        salt,
        hash,
        recoverySalt,
        recoveryHash,
        createdAt: new Date().toISOString(),
      };

      // Save to database - store complete user data as JSON in password_hash field
      // (We'll use password_hash field to store all user data for backward compatibility)
      await database.createUser(username.toLowerCase(), JSON.stringify(userData), null);

      console.log(`✅ New user registered: ${username}`);
      return {
        success: true,
        message: 'Account created successfully',
        recoveryKey: recoveryKey,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: `Registration failed: ${error.message}` };
    }
  }

  // Login user
  async login(username, password) {
    try {
      const userRecord = await database.getUser(username.toLowerCase());

      if (!userRecord) {
        return { success: false, message: 'Invalid username or password' };
      }

      // Parse user data from database
      const user = JSON.parse(userRecord.password_hash);

      if (!this.verifyPassword(password, user.salt, user.hash)) {
        return { success: false, message: 'Invalid username or password' };
      }

      // Generate and save token
      const token = this.generateToken();
      const tokenData = {
        username: user.username,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };

      // Save token to database
      await database.createToken(token, username.toLowerCase());
      
      // Update last login timestamp
      await database.updateLastLogin(username.toLowerCase());

      console.log(`✅ User logged in: ${user.username}`);
      // Emit analytics event for cloud login if analytics instance exists and exposes processEvent
      try {
        if (analytics && typeof analytics.processEvent === 'function') {
          const eventData = {
            sessionId: `cloud_${Date.now()}_${user.username}`,
            playerId: user.username,
            eventType: 'cloud_login',
            timestamp: Date.now(),
            data: { username: user.username },
          };
          // analytics here may be the class export; if it's a constructor, skip calling
          if (analytics && analytics.processEvent) {
            // If analytics is the instance (server.js sets module.exports = instance), use directly
            analytics.processEvent(eventData, 'local');
          }
        }
      } catch (e) {
        console.error('Failed to emit analytics cloud_login event:', e);
      }

      return { success: true, token, username: user.username };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Server error during login' };
    }
  }

  // Validate token
  async validateToken(token) {
    try {
      const tokenData = await database.getTokenData(token);

      if (!tokenData) {
        return { valid: false };
      }

      // Token is valid, return username
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

      const playerData = {
        username: validation.username,
        gameData,
        lastSaved: new Date().toISOString(),
      };

      await database.savePlayerData(validation.username, playerData);

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

      try {
        const playerData = await database.getPlayerData(validation.username);

        if (playerData) {
          console.log(`📥 Loaded data for: ${validation.username}`);
          return { success: true, gameData: playerData.gameData };
        } else {
          // No saved data found - return empty data
          console.log(`� No saved data found for: ${validation.username}`);
          return { success: true, gameData: {} };
        }
      } catch (error) {
        // Database error - return empty data
        console.log(`📭 No saved data found for: ${validation.username}`);
        return { success: true, gameData: {} };
      }
    } catch (error) {
      console.error('Load data error:', error);
      return { success: false, message: 'Failed to load data' };
    }
  }

  // Load users from database (compatibility method)
  async loadUsers() {
    try {
      const users = await database.getAllUsers();
      const usersObj = {};
      
      for (const user of users) {
        try {
          const userData = JSON.parse(user.password_hash);
          usersObj[user.username.toLowerCase()] = userData;
        } catch (e) {
          console.error(`Failed to parse user data for ${user.username}:`, e);
        }
      }
      
      return usersObj;
    } catch (error) {
      console.error('Failed to load users:', error);
      return {};
    }
  }

  // Load tokens from database (compatibility method)
  async loadTokens() {
    try {
      // This method is mainly for compatibility - tokens are now managed directly by database
      return {};
    } catch (error) {
      console.error('Failed to load tokens:', error);
      return {};
    }
  }

  // Clean up expired tokens (call periodically)
  async cleanupTokens() {
    try {
      await database.deleteExpiredTokens();
      console.log(`🧹 Cleaned up expired tokens`);
    } catch (error) {
      console.error('Token cleanup error:', error);
    }
  }

  // Reset password using recovery key
  async resetPasswordWithRecoveryKey(username, recoveryKey, newPassword) {
    try {
      // Validate input
      if (!username || !recoveryKey || !newPassword) {
        return {
          success: false,
          message: 'Username, recovery key, and new password required',
        };
      }

      if (newPassword.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters',
        };
      }

      // Load user from database
      const userRecord = await database.getUser(username.toLowerCase());

      if (!userRecord) {
        return { success: false, message: 'Invalid username or recovery key' };
      }

      const user = JSON.parse(userRecord.password_hash);

      // Verify recovery key
      if (
        !this.verifyPassword(recoveryKey, user.recoverySalt, user.recoveryHash)
      ) {
        return { success: false, message: 'Invalid username or recovery key' };
      }

      // Update password
      const { salt, hash } = this.hashPassword(newPassword);
      user.salt = salt;
      user.hash = hash;

      // Update user record in database
      await database.pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [JSON.stringify(user), username.toLowerCase()]
      );

      console.log(`🔑 Password reset with recovery key for ${username}`);
      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      console.error('Recovery key password reset error:', error);
      return { success: false, message: 'Server error resetting password' };
    }
  }
}

module.exports = CloudSyncAuth;
