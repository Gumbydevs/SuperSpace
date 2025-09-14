/**
 * SuperSpace Cloud Sync System
 * Syncs localStorage data to cloud without changing existing game logic
 */

class CloudSyncService {
    constructor() {
        this.isLoggedIn = false;
        this.username = null;
        this.authToken = null;
        this.syncInProgress = false;
        this.lastSyncTime = 0;
        this.syncInterval = 30000; // Sync every 30 seconds
        this.serverUrl = 'https://superspace-server.onrender.com'; // Your existing server
        
        // Check if user is already logged in
        this.checkExistingLogin();
        
        // Setup automatic syncing
        this.setupAutoSync();
    }
    
    // Check if user has existing login session
    checkExistingLogin() {
        const savedToken = localStorage.getItem('ss_auth_token');
        const savedUsername = localStorage.getItem('ss_username');
        
        if (savedToken && savedUsername) {
            this.authToken = savedToken;
            this.username = savedUsername;
            this.isLoggedIn = true;
            console.log('🔐 Found existing login session for:', savedUsername);
            
            // Validate token and sync data
            this.validateTokenAndSync();
        }
    }
    
    // Create new account
    async createAccount(username, password, email) {
        try {
            const response = await fetch(`${this.serverUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email })
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, message: 'Account created successfully!' };
            } else {
                const error = await response.json();
                return { success: false, message: error.message || 'Failed to create account' };
            }
        } catch (error) {
            console.error('Account creation error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    // Login to existing account
    async login(username, password) {
        try {
            const response = await fetch(`${this.serverUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.authToken = data.token;
                this.username = username;
                this.isLoggedIn = true;
                
                // Save login session
                localStorage.setItem('ss_auth_token', this.authToken);
                localStorage.setItem('ss_username', username);
                
                console.log('🔐 Logged in successfully as:', username);
                
                // Download cloud data and merge with local
                await this.downloadAndMergeCloudData();
                
                return { success: true, message: `Welcome back, ${username}!` };
            } else {
                const error = await response.json();
                return { success: false, message: error.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    // Logout and clear session
    logout() {
        // Upload final sync before logout
        if (this.isLoggedIn) {
            this.uploadLocalStorageToCloud();
        }
        
        this.isLoggedIn = false;
        this.username = null;
        this.authToken = null;
        
        // Clear saved session
        localStorage.removeItem('ss_auth_token');
        localStorage.removeItem('ss_username');
        
        console.log('🔐 Logged out successfully');
    }
    
    // Upload current localStorage to cloud
    async uploadLocalStorageToCloud() {
        if (!this.isLoggedIn || this.syncInProgress) return;
        
        this.syncInProgress = true;
        
        try {
            // Collect all SuperSpace related localStorage data
            const gameData = this.collectGameData();
            
            const response = await fetch(`${this.serverUrl}/sync/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    gameData,
                    timestamp: Date.now()
                })
            });
            
            if (response.ok) {
                this.lastSyncTime = Date.now();
                console.log('☁️ Data synced to cloud successfully');
            } else {
                console.error('Failed to sync to cloud:', response.status);
            }
        } catch (error) {
            console.error('Cloud sync error:', error);
        } finally {
            this.syncInProgress = false;
        }
    }
    
    // Download cloud data and merge with local data
    async downloadAndMergeCloudData() {
        if (!this.isLoggedIn) return;
        
        try {
            const response = await fetch(`${this.serverUrl}/sync/download`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const cloudData = await response.json();
                
                if (cloudData.gameData) {
                    // Merge cloud data with local data (cloud takes precedence for most things)
                    this.mergeGameData(cloudData.gameData);
                    console.log('☁️ Cloud data downloaded and merged');
                }
            }
        } catch (error) {
            console.error('Cloud download error:', error);
        }
    }
    
    // Collect all game-related localStorage data
    collectGameData() {
        const gameData = {};
        
        // Collect all SuperSpace related localStorage keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Only sync SuperSpace related data (customize these prefixes)
            if (key.startsWith('superspace_') || 
                key.startsWith('player_') || 
                key.startsWith('ss_') ||
                key === 'credits' ||
                key === 'highScore' ||
                key === 'settings' ||
                key === 'achievements' ||
                key === 'playerName' ||
                key === 'selectedAvatar' ||
                key === 'selectedShip') {
                
                gameData[key] = localStorage.getItem(key);
            }
        }
        
        return gameData;
    }
    
    // Merge cloud data with local data
    mergeGameData(cloudData) {
        for (const [key, value] of Object.entries(cloudData)) {
            // Skip auth tokens
            if (key.includes('auth_token') || key.includes('username')) {
                continue;
            }
            
            // For some keys, we might want to merge rather than overwrite
            if (key === 'credits') {
                // Take the higher value
                const localCredits = parseInt(localStorage.getItem('credits') || '0');
                const cloudCredits = parseInt(value || '0');
                localStorage.setItem('credits', Math.max(localCredits, cloudCredits).toString());
            } else if (key === 'highScore') {
                // Take the higher score
                const localScore = parseInt(localStorage.getItem('highScore') || '0');
                const cloudScore = parseInt(value || '0');
                localStorage.setItem('highScore', Math.max(localScore, cloudScore).toString());
            } else {
                // For most other data, cloud takes precedence
                localStorage.setItem(key, value);
            }
        }
    }
    
    // Validate token and sync
    async validateTokenAndSync() {
        try {
            const response = await fetch(`${this.serverUrl}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                // Token is valid, perform initial sync
                await this.downloadAndMergeCloudData();
            } else {
                // Token is invalid, clear session
                this.logout();
            }
        } catch (error) {
            console.error('Token validation error:', error);
        }
    }
    
    // Setup automatic syncing
    setupAutoSync() {
        // Sync every 30 seconds if logged in
        setInterval(() => {
            if (this.isLoggedIn && !this.syncInProgress) {
                this.uploadLocalStorageToCloud();
            }
        }, this.syncInterval);
        
        // Sync when page is about to unload
        window.addEventListener('beforeunload', () => {
            if (this.isLoggedIn) {
                // Use sendBeacon for reliable sync on page unload
                const gameData = this.collectGameData();
                navigator.sendBeacon(`${this.serverUrl}/sync/upload`, JSON.stringify({
                    token: this.authToken,
                    gameData,
                    timestamp: Date.now()
                }));
            }
        });
    }
    
    // Get sync status for UI
    getSyncStatus() {
        return {
            isLoggedIn: this.isLoggedIn,
            username: this.username,
            syncInProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime
        };
    }
}

// Export for use in game
window.CloudSyncService = CloudSyncService;