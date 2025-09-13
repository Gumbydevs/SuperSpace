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
        
        // Filter recent events
        const recentEvents = analyticsData.events.filter(e => e.timestamp > last24h);
        const hourlyEvents = analyticsData.events.filter(e => e.timestamp > lastHour);
        
        // Calculate metrics
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
        
        // Top events
        const topEvents = Array.from(analyticsData.summary.popularEvents.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([event, count]) => ({ event, count }));
        
        return res.status(200).json({
            status: 'active',
            timestamp: new Date().toISOString(),
            summary: {
                totalEvents: analyticsData.summary.totalEvents,
                uniquePlayers: analyticsData.summary.uniquePlayers.size,
                totalSessions: analyticsData.summary.totalSessions,
                uptimeMs: now - analyticsData.summary.startTime
            },
            recent: {
                last24h: recentEvents.length,
                lastHour: hourlyEvents.length,
                activePlayers: Object.keys(playerActivity).length
            },
            topEvents,
            playerActivity: Object.values(playerActivity).slice(0, 20),
            eventsByHour,
            recentEvents: analyticsData.events.slice(-50).reverse() // Last 50 events
        });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}