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
        this.globalPeak = 0; // all-time peak concurrent players
        this.metaFile = path.join(this.dataDir, 'meta.json');
        this.reaperIntervalMs = 60000; // check every 60s
        this.sessionTimeoutMs = 180000; // 3 minutes inactivity => consider session ended
        
        this.initializeStorage();
        // load persisted meta (globalPeak)
        this.loadMeta();
        // start session reaper
        this.startSessionReaper();
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
                // Restore Set fields that were serialized as arrays
                if (stats.uniqueSessions && Array.isArray(stats.uniqueSessions)) {
                    stats.uniqueSessions = new Set(stats.uniqueSessions);
                } else {
                    stats.uniqueSessions = new Set();
                }
                if (stats.uniqueIPs && Array.isArray(stats.uniqueIPs)) {
                    stats.uniqueIPs = new Set(stats.uniqueIPs);
                } else {
                    stats.uniqueIPs = new Set();
                }
                // Ensure arrays exist for durations
                stats.gameDurations = stats.gameDurations || [];
                stats.sessionDurations = stats.sessionDurations || [];
                stats.lifeDurations = stats.lifeDurations || [];
                // Ensure concurrent counters exist
                stats.currentConcurrent = stats.currentConcurrent || 0;
                stats.peakConcurrent = stats.peakConcurrent || 0;

                this.dailyStats.set(today, stats);
                console.log(`Loaded existing stats for ${today}`);
            } catch (e) {
                // File doesn't exist, create new daily stats
                this.dailyStats.set(today, this.createEmptyDayStats());
            }
            // attempt to load meta (globalPeak) if present
            try {
                const metaPath = path.join(this.dataDir, 'meta.json');
                const metaRaw = await fs.readFile(metaPath, 'utf8');
                const meta = JSON.parse(metaRaw);
                if (meta && typeof meta.globalPeak === 'number') {
                    this.globalPeak = meta.globalPeak;
                }
            } catch (e) {
                // ignore if missing
            }
            
        } catch (error) {
            console.error('Error loading existing data:', error);
        }
    }
    
    processEvent(eventData, clientIp) {
        try {
            // Add server-side data (all date/hour in EST)
            const now = Date.now();
            const enrichedEvent = {
                ...eventData,
                serverTimestamp: now,
                clientIp: clientIp,
                day: this.getDateString(now),
                hour: this.getESTHour(now)
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
        const now = event.timestamp || Date.now();
        
        console.log(`Analytics: Processing session update for player ${playerId}, session ${sessionId}, active sessions: ${this.sessions.size}`);
        
        // Use playerId as the main key for presence and stats
        let isNewPlayer = false;
        let isNewSessionForToday = false;
        
        // Check if this is a truly new player or just a page refresh
        if (!this.sessions.has(playerId)) {
            isNewPlayer = true;
            console.log(`Analytics: New player ${playerId} starting first session`);
            this.sessions.set(playerId, {
                playerId,
                sessionIds: new Set([sessionId]),
                startTime: now,
                lastActivity: now,
                events: [],
                ip: event.clientIp,
                totalConnectedTime: 0,
                lastSessionStart: now,
                gameStats: {
                    gamesPlayed: 0,
                    totalGameTime: 0,
                    kills: 0,
                    deaths: 0,
                    shotsFired: 0,
                    coinsEarned: 0,
                    totalTimeAlive: 0,
                    lifeDurations: [],
                    lastLifeStart: null,
                    shipsUsed: new Set(),
                    weaponsUsed: new Set(),
                    achievementsUnlocked: new Set(),
                    challengesCompleted: new Set()
                }
            });
        } else {
            // Existing player - check if this is a quick reconnect/refresh
            const session = this.sessions.get(playerId);
            const timeSinceLastActivity = now - (session.lastActivity || session.startTime || 0);
            
            console.log(`Analytics: Existing player ${playerId}, time since last activity: ${timeSinceLastActivity}ms`);
            
            // If less than 30 seconds since last activity, treat as continuation
            if (timeSinceLastActivity < 30000) {
                // Just update the session ID set but don't count as new session
                console.log(`Analytics: Treating as session continuation for player ${playerId}`);
                session.sessionIds.add(sessionId);
                session.lastActivity = now;
            } else {
                // Longer gap - treat as new session
                console.log(`Analytics: Treating as new session for existing player ${playerId}`);
                session.sessionIds.add(sessionId);
                session.lastActivity = now;
                session.lastSessionStart = now;
                isNewSessionForToday = true;
            }
        }
        
        const session = this.sessions.get(playerId);
        session.lastActivity = now;
        session.events.push(event);
        
        // Keep only last 100 events per session to manage memory
        if (session.events.length > 100) {
            session.events = session.events.slice(-100);
        }
        
        // Update daily stats
        const today = this.getDateString();
        if (!this.dailyStats.has(today)) this.dailyStats.set(today, this.createEmptyDayStats());
        const stats = this.dailyStats.get(today);
        
        // Initialize required fields
        if (!stats.uniquePlayers) stats.uniquePlayers = new Set();
        if (!stats.playerSessionMap) stats.playerSessionMap = {};
        if (!stats.playerLastSeen) stats.playerLastSeen = {};
        
            // Only count as new session if it's a new player or significant time gap
            if (isNewPlayer) {
                stats.uniquePlayers.add(playerId);
                stats.uniqueSessions.add(sessionId);
                if (!stats.playerSessionMap[playerId]) stats.playerSessionMap[playerId] = new Set();
                stats.playerSessionMap[playerId].add(sessionId);
                stats.playerLastSeen[playerId] = now;
                console.log(`Analytics: New player ${playerId} (session: ${sessionId})`);
            } else if (isNewSessionForToday) {
                // Only count as new session if significant time gap
                stats.uniqueSessions.add(sessionId);
                if (!stats.playerSessionMap[playerId]) stats.playerSessionMap[playerId] = new Set();
                stats.playerSessionMap[playerId].add(sessionId);
                stats.playerLastSeen[playerId] = now;
                console.log(`Analytics: New session for existing player ${playerId} (session: ${sessionId})`);
            } else {
                // Just update last seen time for existing recent session
                stats.playerLastSeen[playerId] = now;
                console.log(`Analytics: Updated activity for recent session ${playerId} (session: ${sessionId})`);
            }        // Always update current/peak concurrent (based on unique active players)
        const concurrent = this.sessions.size;
        stats.currentConcurrent = concurrent;
        stats.peakConcurrent = Math.max(stats.peakConcurrent || 0, concurrent);
        
        // update globalPeak and persist if increased
        const newGlobal = Math.max(this.globalPeak || 0, stats.peakConcurrent || 0);
        if (newGlobal > this.globalPeak) {
            this.globalPeak = newGlobal;
            this.saveMeta();
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
    // Update hourly peak concurrent
    const concurrent = this.sessions.size;
    if (!stats.hourlyPeakConcurrent) stats.hourlyPeakConcurrent = Array(24).fill(0);
    stats.hourlyPeakConcurrent[hour] = Math.max(stats.hourlyPeakConcurrent[hour], concurrent);

        // Track unique players (by playerId) and unique sessions (by playerId+sessionId)
        if (!stats.uniquePlayers) stats.uniquePlayers = new Set();
        if (!stats.playerSessionMap) stats.playerSessionMap = {};
        if (event.playerId) {
            stats.uniquePlayers.add(event.playerId);
            if (!stats.playerSessionMap[event.playerId]) {
                stats.playerSessionMap[event.playerId] = new Set();
            }
            if (!stats.playerSessionMap[event.playerId].has(event.sessionId)) {
                stats.playerSessionMap[event.playerId].add(event.sessionId);
                stats.uniqueSessions.add(event.sessionId);
            }
        } else {
            // fallback: just add sessionId
            stats.uniqueSessions.add(event.sessionId);
        }
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
            case 'session_end':
                // Record session duration but don't manually decrement concurrent
                // (we use sessions.size directly now)
                if (event.data && event.data.sessionDuration) {
                    stats.totalSessionTime = (stats.totalSessionTime || 0) + event.data.sessionDuration;
                    stats.sessionDurations.push(event.data.sessionDuration);
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
            case 'player_death':
                // record end of life for life-duration calculation
                this.handlePlayerDeath(event);
                break;
            case 'game_start':
            case 'respawn':
                // mark life start
                this.handleLifeStart(event);
                break;
        }
    }
    
    handleSessionEnd(event) {
        const playerId = event.playerId || event.sessionId;
        const session = this.sessions.get(playerId);
        console.log(`Analytics: Handling session end for player ${playerId}, session exists: ${!!session}`);
        
        if (session && event.data && event.data.sessionDuration) {
            // Update player profile with session data
            const profile = this.playerProfiles.get(playerId);
            if (profile) {
                profile.totalPlayTime += event.data.sessionDuration;
                profile.longestSession = Math.max(profile.longestSession, event.data.sessionDuration);
            }

            // Save session data to file
            this.saveSessionData(session);

            // Clean up session from memory immediately
            this.sessions.delete(playerId);
            console.log(`Analytics: Session ended for player ${playerId}, ${this.sessions.size} active sessions remaining`);
            
            // refresh today's concurrent counter
            const day = this.getDateString();
            if (this.dailyStats.has(day)) {
                const stats = this.dailyStats.get(day);
                stats.currentConcurrent = this.sessions.size;
            }
        } else {
            console.log(`Analytics: Warning - session end called for player ${playerId} but no session found or no duration data`);
        }
    }

    handlePlayerDeath(event) {
        const playerId = event.playerId || event.sessionId;
        const session = this.sessions.get(playerId);
        if (!session) return;

        const gs = session.gameStats;
        gs.deaths += 1;

        // If we have a recorded life start, compute life duration
        if (gs.lastLifeStart) {
            const lifeDuration = event.timestamp - gs.lastLifeStart;
            gs.lifeDurations.push(lifeDuration);
            gs.totalTimeAlive = (gs.totalTimeAlive || 0) + lifeDuration;
            gs.lastLifeStart = null;
            // Also update daily stats
            const day = event.day;
            if (this.dailyStats.has(day)) {
                const stats = this.dailyStats.get(day);
                stats.lifeDurations = stats.lifeDurations || [];
                stats.lifeDurations.push(lifeDuration);
                stats.totalLifeTime = (stats.totalLifeTime || 0) + lifeDuration;
            }
        }
    }

    handleLifeStart(event) {
        const playerId = event.playerId || event.sessionId;
        const session = this.sessions.get(playerId);
        if (!session) return;
        session.gameStats.lastLifeStart = event.timestamp;
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
            sessionDurations: [],
            totalSessionTime: 0,
            lifeDurations: [],
            totalLifeTime: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalShots: 0,
            totalPurchases: 0,
            totalSpent: 0,
            totalAchievements: 0,
            hourlyActivity: Array(24).fill(0),
            hourlyPeakConcurrent: Array(24).fill(0),
            shipUsage: {},
            weaponUsage: {},
            weaponKills: {},
            eventCounts: {}
        };
    }
    
    // Returns YYYY-MM-DD string in EST (America/New_York)
    getDateString(date = null) {
        const d = date ? new Date(date) : new Date();
        // Convert to EST (handles DST)
        const est = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        return est.getFullYear() + '-' + String(est.getMonth() + 1).padStart(2, '0') + '-' + String(est.getDate()).padStart(2, '0');
    }

    // Returns hour (0-23) in EST
    getESTHour(date = null) {
        const d = date ? new Date(date) : new Date();
        const est = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        return est.getHours();
    }
    
    async saveSessionData(session) {
        try {
            const sid = session.playerId || 'unknown';
            const start = session.startTime || Date.now();
            const filename = `session_${sid}_${start}.json`;
            const filepath = path.join(this.dataDir, 'sessions', filename);
            
            // Convert sets to arrays for JSON serialization
            const sessionData = {
                ...session,
                sessionIds: Array.from(session.sessionIds || []),
                gameStats: {
                    ...session.gameStats,
                    shipsUsed: Array.from(session.gameStats.shipsUsed || []),
                    weaponsUsed: Array.from(session.gameStats.weaponsUsed || []),
                    achievementsUnlocked: Array.from(session.gameStats.achievementsUnlocked || []),
                    challengesCompleted: Array.from(session.gameStats.challengesCompleted || []),
                },
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

        // Save at EST midnight
        const now = new Date();
        // Get EST time
        const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const estMidnight = new Date(estNow);
        estMidnight.setHours(24, 0, 0, 0); // next EST midnight
        const msUntilMidnight = estMidnight - estNow;
        setTimeout(() => {
            this.saveDailyStats();
            // Then set up daily saves every 24h from EST midnight
            setInterval(() => {
                this.saveDailyStats();
            }, 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
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
                    uniqueIPs: Array.from(stats.uniqueIPs),
                };
                
                await fs.writeFile(filepath, JSON.stringify(statsData, null, 2));
            }
            // persist meta as well
            await this.saveMeta();
        } catch (error) {
            console.error('Error saving daily stats:', error);
        }
    }

    async saveMeta() {
        try {
            const meta = { globalPeak: this.globalPeak || 0 };
            await fs.writeFile(this.metaFile, JSON.stringify(meta, null, 2));
        } catch (e) {
            console.error('Error saving analytics meta:', e);
        }
    }

    async loadMeta() {
        try {
            const raw = await fs.readFile(this.metaFile, 'utf8');
            const meta = JSON.parse(raw);
            if (meta && typeof meta.globalPeak === 'number') this.globalPeak = meta.globalPeak;
        } catch (e) {
            // ignore missing meta
        }
    }

    startSessionReaper() {
        setInterval(() => {
            try {
                const now = Date.now();
                for (const [playerId, session] of Array.from(this.sessions.entries())) {
                    const last = session.lastActivity || session.startTime || 0;
                    if (now - last > this.sessionTimeoutMs) {
                        // Synthesize session_end and immediately finalize
                        const duration = now - (session.startTime || last || now);
                        const fakeEvent = {
                            sessionId: Array.from(session.sessionIds || [])[0] || `session_${now}_${playerId}`,
                            playerId,
                            eventType: 'session_end',
                            timestamp: now,
                            data: { sessionDuration: duration },
                        };
                        // call handler to finalize and remove
                        this.handleSessionEndImmediate(playerId, session, fakeEvent);
                    }
                }
            } catch (e) {
                console.error('Error in session reaper:', e);
            }
        }, this.reaperIntervalMs);
    }

    handleSessionEndImmediate(playerId, session, event) {
        try {
            if (!session) return;
            // Update player profile
            const profile = this.playerProfiles.get(playerId);
            if (profile && event.data && event.data.sessionDuration) {
                profile.totalPlayTime += event.data.sessionDuration;
                profile.longestSession = Math.max(profile.longestSession, event.data.sessionDuration);
            }

            // Save session now
            this.saveSessionData(session);

            // Update daily stats counters
            const day = this.getDateString(event.timestamp);
            if (this.dailyStats.has(day)) {
                const stats = this.dailyStats.get(day);
                stats.sessionDurations = stats.sessionDurations || [];
                stats.sessionDurations.push(event.data && event.data.sessionDuration ? event.data.sessionDuration : 0);
                stats.totalSessionTime = (stats.totalSessionTime || 0) + (event.data && event.data.sessionDuration ? event.data.sessionDuration : 0);
            }

            // Remove session and refresh today's concurrent counter
            this.sessions.delete(playerId);
            console.log(`Analytics: Session ended for player ${playerId}, ${this.sessions.size} active sessions remaining`);
            if (this.dailyStats.has(day)) {
                const stats = this.dailyStats.get(day);
                stats.currentConcurrent = this.sessions.size;
            }
        } catch (e) {
            console.error('Error handling immediate session end:', e);
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
                    achievements: Array.from(profile.achievements),
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
        
        // Count active sessions (unique players currently connected)
        const activeSessions = this.sessions.size;
        
        // Update peak if current exceeds today's peak
        if (activeSessions > (todayStats.peakConcurrent || 0)) {
            todayStats.peakConcurrent = activeSessions;
        }
        
        // Update global peak
        if (activeSessions > this.globalPeak) {
            this.globalPeak = activeSessions;
            this.saveMeta(); // Persist the new global peak
        }
        
        return {
            today: {
                ...todayStats,
                uniquePlayers: todayStats.uniquePlayers.size,
                uniqueSessions: todayStats.uniqueSessions.size,
                uniqueIPs: todayStats.uniqueIPs.size,
                averageGameDuration: todayStats.gameDurations.length > 0 
                    ? todayStats.gameDurations.reduce((a, b) => a + b, 0) / todayStats.gameDurations.length 
                    : 0,
                completionRate: todayStats.gamesStarted > 0 
                    ? todayStats.gamesCompleted / todayStats.gamesStarted 
                    : 0,
                averageSessionDuration: todayStats.sessionDurations.length > 0
                    ? todayStats.sessionDurations.reduce((a, b) => a + b, 0) / todayStats.sessionDurations.length
                    : 0,
                averageLifeDuration: todayStats.lifeDurations.length > 0
                    ? todayStats.lifeDurations.reduce((a, b) => a + b, 0) / todayStats.lifeDurations.length
                    : 0,
                peakConcurrentToday: todayStats.peakConcurrent || 0,
                globalPeakConcurrent: this.globalPeak || 0,
                currentConcurrent: activeSessions
            },
            activeSessions,
            recentEvents: this.events.slice(-50), // Last 50 events
            totalPlayers: todayStats.uniquePlayers.size
        };
    }
    
    // Returns the max concurrent players seen in each hour over the last N days
    getHourlyPeakConcurrent(days = 7) {
        const hourlyData = Array(24).fill(0);
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = this.getDateString(date);
            const dayStats = this.dailyStats.get(dateString);
            if (dayStats && dayStats.hourlyPeakConcurrent) {
                dayStats.hourlyPeakConcurrent.forEach((peak, hour) => {
                    hourlyData[hour] = Math.max(hourlyData[hour], peak);
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
        let inactive = 0;
        let total = 0;
        for (const profile of this.playerProfiles.values()) {
            total++;
            const daysSinceLastSeen = (now - profile.lastSeen) / oneDay;
            if (daysSinceLastSeen <= 1) {
                activeToday++;
            } else if (daysSinceLastSeen <= 7) {
                activeWeek++;
            } else {
                inactive++;
            }
            if (profile.totalSessions > 1) {
                returningPlayers++;
            }
        }
        return {
            activeToday,
            activeWeek,
            inactive,
            returningPlayers,
            totalPlayers: total,
            retentionRate: total > 0 ? returningPlayers / total : 0
        };
    }
    
    generateReport(days = 7) {
        const report = {
            overview: this.getCurrentStats(),
            hourlyActivity: this.getHourlyPeakConcurrent(days),
            topShips: this.getTopShips(),
            topWeapons: this.getTopWeapons(),
            playerRetention: this.getPlayerRetention(),
            generatedAt: new Date().toISOString()
        };
        return report;
    }
}

module.exports = ServerAnalytics;
