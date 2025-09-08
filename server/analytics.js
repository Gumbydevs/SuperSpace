/**
 * SuperSpace Server-Side Analytics
 * Collects, stores and processes player analytics data
 */

const fs = require('fs').promises;
const path = require('path');

class ServerAnalytics {
    constructor() {
        this.dataDir = path.join(__dirname, 'analytics_data');
        this.sessions = new Map(); // Active sessions
        this.dailyStats = new Map(); // Daily aggregated stats
        this.playerProfiles = new Map(); // Player behavior profiles
        this.events = []; // Recent events buffer
        this.maxEventsBuffer = 10000; // Keep last 10k events in memory
        
        this.initializeStorage();
        this.startPeriodicSave();
        
        console.log('Server Analytics initialized');
    }
    
    async initializeStorage() {
        try {
            // Create analytics data directory
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir(path.join(this.dataDir, 'daily'), { recursive: true });
            await fs.mkdir(path.join(this.dataDir, 'sessions'), { recursive: true });
            await fs.mkdir(path.join(this.dataDir, 'players'), { recursive: true });
            
            // Load existing data
            await this.loadExistingData();
            
        } catch (error) {
            console.error('Error initializing analytics storage:', error);
        }
    }
    
    async loadExistingData() {
        try {
            // Load today's stats if they exist
            const today = this.getDateString();
            const todayFile = path.join(this.dataDir, 'daily', `${today}.json`);
            
            try {
                const todayData = await fs.readFile(todayFile, 'utf8');
                const stats = JSON.parse(todayData);
                this.dailyStats.set(today, stats);
                console.log(`Loaded existing stats for ${today}`);
            } catch (e) {
                // File doesn't exist, create new daily stats
                this.dailyStats.set(today, this.createEmptyDayStats());
            }
            
        } catch (error) {
            console.error('Error loading existing data:', error);
        }
    }
    
    processEvent(eventData, clientIp) {
        try {
            // Add server-side data
            const enrichedEvent = {
                ...eventData,
                serverTimestamp: Date.now(),
                clientIp: clientIp,
                day: this.getDateString(),
                hour: new Date().getHours()
            };
            
            // Add to events buffer
            this.events.push(enrichedEvent);
            if (this.events.length > this.maxEventsBuffer) {
                this.events = this.events.slice(-this.maxEventsBuffer);
            }
            
            // Update session tracking
            this.updateSession(enrichedEvent);
            
            // Update daily statistics
            this.updateDailyStats(enrichedEvent);
            
            // Update player profile
            this.updatePlayerProfile(enrichedEvent);
            
            // Handle specific event types
            this.handleSpecificEvent(enrichedEvent);
            
        } catch (error) {
            console.error('Error processing analytics event:', error);
        }
    }
    
    updateSession(event) {
        const { sessionId, playerId } = event;
        // Use playerId as the main key for presence and stats
        if (!this.sessions.has(playerId)) {
            this.sessions.set(playerId, {
                playerId,
                sessionIds: new Set([sessionId]),
                startTime: event.timestamp,
                lastActivity: event.timestamp,
                events: [],
                ip: event.clientIp,
                totalConnectedTime: 0,
                gameStats: {
                    gamesPlayed: 0,
                    totalGameTime: 0,
                    kills: 0,
                    deaths: 0,
                    shotsFired: 0,
                    coinsEarned: 0,
                    shipsUsed: new Set(),
                    weaponsUsed: new Set(),
                    achievementsUnlocked: new Set(),
                    challengesCompleted: new Set()
                }
            });
        } else {
            this.sessions.get(playerId).sessionIds.add(sessionId);
        }
        const session = this.sessions.get(playerId);
        session.lastActivity = event.timestamp;
        session.events.push(event);
        // Keep only last 100 events per session to manage memory
        if (session.events.length > 100) {
            session.events = session.events.slice(-100);
        }
    }
    
    updateDailyStats(event) {
        const day = event.day;
        const hour = event.hour;
        
        if (!this.dailyStats.has(day)) {
            this.dailyStats.set(day, this.createEmptyDayStats());
        }
        
        const stats = this.dailyStats.get(day);
        
        // Update hourly activity
        stats.hourlyActivity[hour]++;
        
        // Track unique sessions and IPs
        stats.uniqueSessions.add(event.sessionId);
        stats.uniqueIPs.add(event.clientIp);
        
        // Event type counters
        if (!stats.eventCounts[event.eventType]) {
            stats.eventCounts[event.eventType] = 0;
        }
        stats.eventCounts[event.eventType]++;
        
        // Handle specific events for daily stats
        switch (event.eventType) {
            case 'session_start':
                stats.totalSessions++;
                break;
                
            case 'game_start':
                stats.gamesStarted++;
                break;
                
            case 'game_end':
                stats.gamesCompleted++;
                if (event.data.duration) {
                    stats.totalGameTime += event.data.duration;
                    stats.gameDurations.push(event.data.duration);
                }
                if (event.data.shipType) {
                    if (!stats.shipUsage[event.data.shipType]) {
                        stats.shipUsage[event.data.shipType] = 0;
                    }
                    stats.shipUsage[event.data.shipType]++;
                }
                break;
                
            case 'player_kill':
                stats.totalKills++;
                if (event.data.weapon) {
                    if (!stats.weaponKills[event.data.weapon]) {
                        stats.weaponKills[event.data.weapon] = 0;
                    }
                    stats.weaponKills[event.data.weapon]++;
                }
                break;
                
            case 'player_death':
                stats.totalDeaths++;
                break;
                
            case 'weapon_fire':
                stats.totalShots++;
                if (event.data.weapon) {
                    if (!stats.weaponUsage[event.data.weapon]) {
                        stats.weaponUsage[event.data.weapon] = 0;
                    }
                    stats.weaponUsage[event.data.weapon]++;
                }
                break;
                
            case 'shop_purchase':
                stats.totalPurchases++;
                if (event.data.cost) {
                    stats.totalSpent += event.data.cost;
                }
                break;
                
            case 'achievement_unlocked':
                stats.totalAchievements++;
                break;
        }
    }
    
    updatePlayerProfile(event) {
        const playerId = event.playerId || event.sessionId; // Use sessionId if no playerId
        
        if (!this.playerProfiles.has(playerId)) {
            this.playerProfiles.set(playerId, {
                playerId,
                firstSeen: event.timestamp,
                lastSeen: event.timestamp,
                totalSessions: 0,
                totalPlayTime: 0,
                favoriteShips: {},
                favoriteWeapons: {},
                peakHours: Array(24).fill(0),
                achievements: new Set(),
                averageGameDuration: 0,
                longestSession: 0,
                stats: {
                    kills: 0,
                    deaths: 0,
                    gamesPlayed: 0,
                    totalShots: 0,
                    coinsEarned: 0,
                    purchases: 0
                }
            });
        }
        
        const profile = this.playerProfiles.get(playerId);
        profile.lastSeen = event.timestamp;
        profile.peakHours[event.hour]++;
        
        // Update based on event type
        if (event.eventType === 'session_start') {
            profile.totalSessions++;
        }
    }
    
    handleSpecificEvent(event) {
        // Additional processing for specific events
        switch (event.eventType) {
            case 'session_end':
                this.handleSessionEnd(event);
                break;
                
            case 'game_end':
                this.handleGameEnd(event);
                break;
        }
    }
    
    handleSessionEnd(event) {
        const session = this.sessions.get(event.sessionId);
        if (session && event.data.sessionDuration) {
            // Update player profile with session data
            const playerId = session.playerId || event.sessionId;
            const profile = this.playerProfiles.get(playerId);
            if (profile) {
                profile.totalPlayTime += event.data.sessionDuration;
                profile.longestSession = Math.max(profile.longestSession, event.data.sessionDuration);
            }
            
            // Save session data to file
            this.saveSessionData(session);
            
            // Clean up session from memory after some time
            setTimeout(() => {
                this.sessions.delete(event.sessionId);
            }, 300000); // 5 minutes
        }
    }
    
    handleGameEnd(event) {
        if (event.data) {
            const playerId = event.playerId || event.sessionId;
            const profile = this.playerProfiles.get(playerId);
            if (profile) {
                profile.stats.gamesPlayed++;
                profile.stats.kills += event.data.kills || 0;
                profile.stats.deaths += event.data.deaths || 0;
                profile.stats.totalShots += event.data.shotsFired || 0;
                profile.stats.coinsEarned += event.data.coinsEarned || 0;
                
                // Update favorite ships
                if (event.data.shipType) {
                    if (!profile.favoriteShips[event.data.shipType]) {
                        profile.favoriteShips[event.data.shipType] = 0;
                    }
                    profile.favoriteShips[event.data.shipType]++;
                }
                
                // Update favorite weapons
                if (event.data.weaponsUsed) {
                    event.data.weaponsUsed.forEach(weapon => {
                        if (!profile.favoriteWeapons[weapon]) {
                            profile.favoriteWeapons[weapon] = 0;
                        }
                        profile.favoriteWeapons[weapon]++;
                    });
                }
                
                // Calculate average game duration
                const totalGames = profile.stats.gamesPlayed;
                if (totalGames > 0 && event.data.duration) {
                    profile.averageGameDuration = 
                        ((profile.averageGameDuration * (totalGames - 1)) + event.data.duration) / totalGames;
                }
            }
        }
    }
    
    createEmptyDayStats() {
        return {
            date: this.getDateString(),
            totalSessions: 0,
            uniqueSessions: new Set(),
            uniqueIPs: new Set(),
            gamesStarted: 0,
            gamesCompleted: 0,
            totalGameTime: 0,
            gameDurations: [],
            totalKills: 0,
            totalDeaths: 0,
            totalShots: 0,
            totalPurchases: 0,
            totalSpent: 0,
            totalAchievements: 0,
            hourlyActivity: Array(24).fill(0),
            shipUsage: {},
            weaponUsage: {},
            weaponKills: {},
            eventCounts: {}
        };
    }
    
    getDateString(date = null) {
        const d = date ? new Date(date) : new Date();
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    
    async saveSessionData(session) {
        try {
            const filename = `session_${session.sessionId}.json`;
            const filepath = path.join(this.dataDir, 'sessions', filename);
            
            // Convert sets to arrays for JSON serialization
            const sessionData = {
                ...session,
                gameStats: {
                    ...session.gameStats,
                    shipsUsed: Array.from(session.gameStats.shipsUsed),
                    weaponsUsed: Array.from(session.gameStats.weaponsUsed),
                    achievementsUnlocked: Array.from(session.gameStats.achievementsUnlocked),
                    challengesCompleted: Array.from(session.gameStats.challengesCompleted)
                }
            };
            
            await fs.writeFile(filepath, JSON.stringify(sessionData, null, 2));
        } catch (error) {
            console.error('Error saving session data:', error);
        }
    }
    
    startPeriodicSave() {
        // Save data every 5 minutes
        setInterval(() => {
            this.saveDailyStats();
            this.savePlayerProfiles();
        }, 300000);
        
        // Save at the end of each day
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        setTimeout(() => {
            this.saveDailyStats();
            // Then set up daily saves
            setInterval(() => {
                this.saveDailyStats();
            }, 24 * 60 * 60 * 1000); // Every 24 hours
        }, timeUntilMidnight);
    }
    
    async saveDailyStats() {
        try {
            for (const [date, stats] of this.dailyStats.entries()) {
                const filename = `${date}.json`;
                const filepath = path.join(this.dataDir, 'daily', filename);
                
                // Convert sets to arrays for JSON serialization
                const statsData = {
                    ...stats,
                    uniqueSessions: Array.from(stats.uniqueSessions),
                    uniqueIPs: Array.from(stats.uniqueIPs)
                };
                
                await fs.writeFile(filepath, JSON.stringify(statsData, null, 2));
            }
        } catch (error) {
            console.error('Error saving daily stats:', error);
        }
    }
    
    async savePlayerProfiles() {
        try {
            for (const [playerId, profile] of this.playerProfiles.entries()) {
                const filename = `player_${playerId}.json`;
                const filepath = path.join(this.dataDir, 'players', filename);
                
                // Convert sets to arrays for JSON serialization
                const profileData = {
                    ...profile,
                    achievements: Array.from(profile.achievements)
                };
                
                await fs.writeFile(filepath, JSON.stringify(profileData, null, 2));
            }
        } catch (error) {
            console.error('Error saving player profiles:', error);
        }
    }
    
    // Analytics query methods for dashboard
    
    getCurrentStats() {
        const today = this.getDateString();
        const todayStats = this.dailyStats.get(today) || this.createEmptyDayStats();
        // Only count unique playerIds for active sessions
        const activePlayerIds = Array.from(this.sessions.keys());
        return {
            today: {
                ...todayStats,
                uniqueSessions: todayStats.uniqueSessions.size,
                uniqueIPs: todayStats.uniqueIPs.size,
                averageGameDuration: todayStats.gameDurations.length > 0 
                    ? todayStats.gameDurations.reduce((a, b) => a + b, 0) / todayStats.gameDurations.length 
                    : 0,
                completionRate: todayStats.gamesStarted > 0 
                    ? todayStats.gamesCompleted / todayStats.gamesStarted 
                    : 0
            },
            activeSessions: activePlayerIds.length,
            recentEvents: this.events.slice(-50), // Last 50 events
            totalPlayers: this.playerProfiles.size
        };
    }
    
    getHourlyActivity(days = 7) {
        const hourlyData = Array(24).fill(0);
        const today = new Date();
        
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = this.getDateString(date);
            
            const dayStats = this.dailyStats.get(dateString);
            if (dayStats) {
                dayStats.hourlyActivity.forEach((count, hour) => {
                    hourlyData[hour] += count;
                });
            }
        }
        
        return hourlyData;
    }
    
    getTopShips(limit = 10) {
        const shipCounts = {};
        
        for (const stats of this.dailyStats.values()) {
            Object.entries(stats.shipUsage).forEach(([ship, count]) => {
                shipCounts[ship] = (shipCounts[ship] || 0) + count;
            });
        }
        
        return Object.entries(shipCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([ship, count]) => ({ ship, count }));
    }
    
    getTopWeapons(limit = 10) {
        const weaponCounts = {};
        
        for (const stats of this.dailyStats.values()) {
            Object.entries(stats.weaponUsage).forEach(([weapon, count]) => {
                weaponCounts[weapon] = (weaponCounts[weapon] || 0) + count;
            });
        }
        
        return Object.entries(weaponCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([weapon, count]) => ({ weapon, count }));
    }
    
    getPlayerRetention() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        
        let activeToday = 0;
        let activeWeek = 0;
        let returningPlayers = 0;
        
        for (const profile of this.playerProfiles.values()) {
            const daysSinceLastSeen = (now - profile.lastSeen) / oneDay;
            
            if (daysSinceLastSeen <= 1) {
                activeToday++;
            }
            
            if (daysSinceLastSeen <= 7) {
                activeWeek++;
            }
            
            if (profile.totalSessions > 1) {
                returningPlayers++;
            }
        }
        
        return {
            activeToday,
            activeWeek,
            returningPlayers,
            totalPlayers: this.playerProfiles.size,
            retentionRate: this.playerProfiles.size > 0 
                ? returningPlayers / this.playerProfiles.size 
                : 0
        };
    }
    
    generateReport(days = 7) {
        const report = {
            overview: this.getCurrentStats(),
            hourlyActivity: this.getHourlyActivity(days),
            topShips: this.getTopShips(),
            topWeapons: this.getTopWeapons(),
            playerRetention: this.getPlayerRetention(),
            generatedAt: new Date().toISOString()
        };
        
        return report;
    }
}

module.exports = ServerAnalytics;
