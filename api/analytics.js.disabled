/**
 * SuperSpace Standalone Analytics API
 * Collects analytics data as backup to Vercel Analytics
 * Stores data in memory and provides dashboard endpoint
 */

// In-memory storage (resets on deployment, but good for real-time viewing)
let analyticsData = {
    events: [],
    sessions: new Map(),
    summary: {
        totalEvents: 0,
        uniquePlayers: new Set(),
        totalSessions: 0,
        popularEvents: new Map(),
        startTime: Date.now()
    }
};

export default function handler(req, res) {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'POST') {
        try {
            const { event, data, timestamp, url } = req.body;
            
            // Store the event
            const eventRecord = {
                event,
                data,
                timestamp: timestamp || Date.now(),
                url,
                id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            analyticsData.events.push(eventRecord);
            
            // Update summary
            analyticsData.summary.totalEvents++;
            analyticsData.summary.uniquePlayers.add(data.playerId);
            
            // Track popular events
            const eventCount = analyticsData.summary.popularEvents.get(event) || 0;
            analyticsData.summary.popularEvents.set(event, eventCount + 1);
            
            // Track sessions
            if (data.sessionId && !analyticsData.sessions.has(data.sessionId)) {
                analyticsData.sessions.set(data.sessionId, {
                    sessionId: data.sessionId,
                    playerId: data.playerId,
                    startTime: timestamp || Date.now(),
                    events: [],
                    isReturning: data.isReturning
                });
                analyticsData.summary.totalSessions++;
            }
            
            // Add event to session
            if (data.sessionId && analyticsData.sessions.has(data.sessionId)) {
                analyticsData.sessions.get(data.sessionId).events.push(eventRecord);
            }
            
            // Keep only last 1000 events to prevent memory issues
            if (analyticsData.events.length > 1000) {
                analyticsData.events = analyticsData.events.slice(-1000);
            }
            
            return res.status(200).json({ 
                success: true, 
                eventId: eventRecord.id,
                totalEvents: analyticsData.summary.totalEvents
            });
            
        } catch (error) {
            console.error('Analytics API error:', error);
            return res.status(500).json({ error: 'Failed to record event' });
        }
    }
    
    // GET request returns dashboard data
    if (req.method === 'GET') {
        const now = Date.now();
        const last24h = now - (24 * 60 * 60 * 1000);
        const lastHour = now - (60 * 60 * 1000);
        const last5min = now - (5 * 60 * 1000);
        
        // Filter recent events
        const recentEvents = analyticsData.events.filter(e => e.timestamp > last24h);
        const hourlyEvents = analyticsData.events.filter(e => e.timestamp > lastHour);
        const recentPlayers = analyticsData.events.filter(e => e.timestamp > last5min);
        
        // Calculate active players (players active in last 5 minutes)
        const activePlayers = new Set();
        recentPlayers.forEach(event => {
            if (event.data.playerId) {
                activePlayers.add(event.data.playerId);
            }
        });
        
        // Calculate player activity over time
        const playerActivity = {};
        const eventsByHour = {};
        
        recentEvents.forEach(event => {
            const playerId = event.data.playerId;
            if (!playerActivity[playerId]) {
                playerActivity[playerId] = {
                    playerId,
                    events: 0,
                    lastSeen: 0,
                    isReturning: event.data.isReturning
                };
            }
            playerActivity[playerId].events++;
            playerActivity[playerId].lastSeen = Math.max(playerActivity[playerId].lastSeen, event.timestamp);
            
            // Group by hour
            const hour = new Date(event.timestamp).getHours();
            eventsByHour[hour] = (eventsByHour[hour] || 0) + 1;
        });
        
        // Calculate game statistics
        const killEvents = analyticsData.events.filter(e => e.event === 'kill' && e.timestamp > last24h);
        const deathEvents = analyticsData.events.filter(e => e.event === 'death' && e.timestamp > last24h);
        const shotEvents = analyticsData.events.filter(e => e.event === 'weapon_fired' && e.timestamp > last24h);
        const powerupEvents = analyticsData.events.filter(e => e.event === 'powerup_collected' && e.timestamp > last24h);
        const purchaseEvents = analyticsData.events.filter(e => e.event === 'premium_purchase' && e.timestamp > last24h);
        const storeEvents = analyticsData.events.filter(e => e.event === 'store_visit' && e.timestamp > last24h);
        
        // Calculate session stats
        const totalSessionTime = Array.from(analyticsData.sessions.values())
            .reduce((total, session) => {
                const sessionDuration = (session.events.length > 0 ? 
                    Math.max(...session.events.map(e => e.timestamp)) - session.startTime : 
                    0) / 1000;
                return total + sessionDuration;
            }, 0);
        
        const avgSessionTime = analyticsData.summary.totalSessions > 0 ? 
            totalSessionTime / analyticsData.summary.totalSessions : 0;
        
        // Calculate peak players (max unique players in any hour)
        const hourlyPlayerCounts = {};
        analyticsData.events.forEach(event => {
            const hour = Math.floor(event.timestamp / (60 * 60 * 1000));
            if (!hourlyPlayerCounts[hour]) {
                hourlyPlayerCounts[hour] = new Set();
            }
            if (event.data.playerId) {
                hourlyPlayerCounts[hour].add(event.data.playerId);
            }
        });
        
        const peakPlayers = Object.values(hourlyPlayerCounts)
            .reduce((max, playerSet) => Math.max(max, playerSet.size), 0);
        
        // Format data for dashboard
        const dashboardData = {
            activePlayers: activePlayers.size,
            peakPlayers: peakPlayers,
            totalSessions: analyticsData.summary.totalSessions,
            avgSessionTime: Math.floor(avgSessionTime),
            
            // Game statistics
            killsToday: killEvents.length,
            deathsToday: deathEvents.length,
            shotsFired: shotEvents.length,
            powerupsCollected: powerupEvents.length,
            
            // Premium statistics
            premiumPlayers: new Set(purchaseEvents.map(e => e.data.playerId)).size,
            storeVisits: storeEvents.length,
            purchases: purchaseEvents.length,
            revenue: purchaseEvents.reduce((total, e) => total + (e.data.amount || 0), 0),
            
            // Charts data
            playerActivity: Object.entries(eventsByHour).map(([hour, count]) => ({
                timestamp: Date.now() - ((23 - parseInt(hour)) * 60 * 60 * 1000),
                count: count
            })).sort((a, b) => a.timestamp - b.timestamp),
            
            gameEvents: {
                kills: killEvents.length,
                deaths: deathEvents.length,
                shots: shotEvents.length,
                powerups: powerupEvents.length,
                purchases: purchaseEvents.length
            },
            
            // Recent events for live feed
            recentEvents: analyticsData.events
                .slice(-50)
                .reverse()
                .map(event => ({
                    type: event.event,
                    timestamp: event.timestamp,
                    data: event.data
                }))
        };
        
        return res.status(200).json(dashboardData);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}