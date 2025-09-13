/**
 * Enhanced Server-Side Analytics for SuperSpace
 * Simple analytics tracking for concurrent users and peak times
 * Works with Vercel Edge Functions
 */

export default function handler(req, res) {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const now = new Date();
    const hour = now.getHours();
    
    // Simple analytics data
    const analytics = {
        timestamp: now.toISOString(),
        hour: hour,
        isPeakHour: (hour >= 19 && hour <= 23) || (hour >= 12 && hour <= 14),
        timezone: 'UTC',
        date: now.toISOString().split('T')[0]
    };
    
    if (req.method === 'POST') {
        const { event, data } = req.body;
        
        // Log server-side events for monitoring
        console.log(`Analytics Event: ${event}`, {
            ...data,
            ...analytics
        });
        
        return res.status(200).json({ 
            success: true, 
            serverTime: analytics.timestamp 
        });
    }
    
    // GET request returns current server status
    return res.status(200).json({
        status: 'active',
        ...analytics
    });
}