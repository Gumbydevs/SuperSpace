// (Moved) analytics activity route will be registered after app initialization
// ...existing code...
// TEMPORARY: Analytics reset endpoint (secure with secret key)
const fs = require('fs').promises;
const analyticsDataDir = require('path').join(__dirname, 'analytics_data');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');
const ServerAnalytics = require('./analytics');
const DatabaseAnalytics = require('./databaseAnalytics');
const CloudSyncAuth = require('./cloudSyncAuth');
const database = require('./database');
const logger = require('./logger');

// Create the Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Ensure we capture and log unexpected crashes so the platform shows deploy logs
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// Initialize database first
async function initializeDatabase() {
  try {
    if (process.env.DATABASE_URL) {
      await database.initDatabase();
  logger.info('✅ Database initialized successfully');
      return true;
    } else {
  logger.warn('⚠️  No DATABASE_URL found - using file-based storage (data will be lost on redeploys!)');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  logger.warn('⚠️  Falling back to file-based storage (data will be lost on redeploys!)');
    return false;
  }
}

// Initialize analytics
const analytics = new ServerAnalytics();
// dbAnalytics will be created after DB initialization if DATABASE_URL is present
let dbAnalytics = null;

// Periodic database analytics updates (disabled to reduce bandwidth and DB load)
/*
setInterval(async () => {
  if (dbAnalytics.initialized) {
    try {
      // Update global peak with current player count
      const currentPlayers = Object.keys(gameState.players).length;
      await dbAnalytics.updateGlobalPeak(currentPlayers);
      
      // Save daily stats periodically
      const today = new Date().toISOString().split('T')[0];
      const stats = await dbAnalytics.getStats();
      if (stats.today) {
        await dbAnalytics.saveDailyStats(today, stats.today);
      }
    } catch (error) {
      console.error('Periodic database analytics update error:', error);
    }
  }
}, 60000); // Update every minute
*/

// Initialize cloud sync auth (after database)
let cloudAuth;

// Log buffer for debugging (keep last 100 log entries)
const logBuffer = [];
const maxLogBuffer = 100;

// Override console.log and console.error to capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
    .join(' ');
  logBuffer.push({ timestamp, level: 'info', message });
  if (logBuffer.length > maxLogBuffer) {
    logBuffer.shift();
  }
  originalConsoleLog(...args);
};

console.error = (...args) => {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
    .join(' ');
  logBuffer.push({ timestamp, level: 'error', message });
  if (logBuffer.length > maxLogBuffer) {
    logBuffer.shift();
  }
  originalConsoleError(...args);
};

// In-memory ring buffer for recent powerup events (adds/removes) - opt-in via env
const powerupEventBuffer = [];
const maxPowerupEvents = 200;

function pushPowerupEvent(evt) {
  try {
    evt.timestamp = Date.now();
    powerupEventBuffer.push(evt);
    if (powerupEventBuffer.length > maxPowerupEvents) powerupEventBuffer.shift();
  } catch (e) {
    // don't let debug tracing crash the server
    originalConsoleError('Error pushing powerup event', e);
  }
}

// Configure CORS to allow requests from specific domains
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cache-Control',
      'Pragma',
    ],
    credentials: false,
  }),
);

// Allow JSON bodies (used by admin endpoints)
app.use(express.json());

// Force CORS headers and optional debug logging as a safeguard. Some
// hosting proxies may strip or alter headers from app-level middleware;
// this middleware ensures the expected CORS headers are present on all
// responses and handles preflight OPTIONS early.
app.use((req, res, next) => {
  const origin = req.get('origin') || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cache-Control, Pragma',
  );
  // Optional CORS debug logging when DEBUG_CORS=1
  if (process.env.DEBUG_CORS === '1') {
    console.debug(`[CORS DEBUG] ${req.method} ${req.url} origin=${origin}`);
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

// Maintenance mode: if MAINTENANCE=1 then short-circuit requests with a tiny 503
// response to stop serving large assets and reduce outgoing bandwidth while
// you fix billing or migrate the service. This middleware must come before
// the static middleware below.
// Maintenance mode short-circuit disabled while live — always serve static files.
// If you need maintenance mode again, restore the block below.
/*
if (process.env.MAINTENANCE === '1') {
  app.use((req, res) => {
    // Prevent caching so clients don't keep retrying heavy downloads
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Content-Type', 'text/plain; charset=utf-8');
    // Small fixed payload to minimize bandwidth
    res.status(503).send('Service temporarily unavailable - maintenance');
  });
} else {
  // Serve static files from the parent directory
  app.use(express.static(path.join(__dirname, '..')));
}
*/

// Always serve static files (maintenance disabled)
app.use(express.static(path.join(__dirname, '..')));

// Add a home route that shows server status
app.get('/status', (req, res) => {
  logger.debug('Status endpoint hit from origin:', req.get('origin'));
  const now = Date.now();
  res.json({
    status: 'running',
    players: Object.keys(gameState.players).length,
    activePlayers: Object.keys(playerLastActivity).filter(
      (playerId) => now - (playerLastActivity[playerId] || 0) < 30000,
    ).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    npcs: gameState.npcs.length,
    dreadnaughtActive: gameState.npcs.some((npc) => npc.type === 'dreadnaught'),
    nextDreadnaughtSpawn: nextDreadnaughtSpawn,
    timeUntilNextDreadnaught: Math.max(0, nextDreadnaughtSpawn - now),
  });
});

// Add a simple test endpoint for CORS testing
app.get('/test', (req, res) => {
  logger.debug('Test endpoint hit from origin:', req.get('origin'));
  res.json({ message: 'CORS test successful', origin: req.get('origin') });
});

// Analytics endpoints
app.get('/analytics', async (req, res) => {
  try {
    const logger = require('./logger');
    logger.debug('📊 Analytics endpoint called');
    // Diagnostics object to help debug DB connectivity and initialization
    const diagnostics = {
      databaseEnvPresent: !!process.env.DATABASE_URL,
      dbAnalyticsInitialized: !!(dbAnalytics && dbAnalytics.initialized),
      dbPoolReachable: false,
      dbAnalyticsError: null,
    };
    
    // Get data from database analytics (persistent) if available, fallback to file analytics
    let stats;
    let dataSource = 'file';
    
    try {
      if (dbAnalytics && dbAnalytics.initialized) {
        logger.info('🗄️ Using database analytics');
        // Use persistent database analytics
        stats = await dbAnalytics.getStats();
        dataSource = 'database';
        diagnostics.dbAnalyticsInitialized = true;
      } else {
        logger.info('📁 Using file analytics');
        // Fallback to file analytics
        stats = analytics.getCurrentStats();
        dataSource = 'file';
      }
      logger.debug('✅ Stats loaded successfully, source:', dataSource);
    } catch (statsError) {
      console.error('❌ Error loading stats:', statsError);
      diagnostics.dbAnalyticsError = (statsError && statsError.message) ? statsError.message : String(statsError);
      // Fallback to file analytics if database fails
      stats = analytics.getCurrentStats();
      dataSource = 'file-fallback';
      logger.warn('⚠️ Fell back to file analytics due to error');
    }
    
    // --- Challenge completions aggregation ---
    // Helper to get date string for N days ago
    function getDateStringNDaysAgo(n) {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return analytics.getDateString(d);
    }

    // Aggregate completions by challenge ID for today, this week, all time
    const challengeStats = { today: {}, week: {}, allTime: {} };
    const playerChallengeMap = { today: {}, week: {}, allTime: {} };
    const todayStr = analytics.getDateString();
    const weekDays = Array.from({length: 7}, (_, i) => getDateStringNDaysAgo(i));

    // Helper to add completion
    function addCompletion(map, cid, player) {
      if (!map[cid]) map[cid] = new Set();
      map[cid].add(player);
    }

    // Scan dailyStats for all completions
    for (const [date, stats] of analytics.dailyStats.entries()) {
      // For each player in playerSessionMap, check challengesCompleted
      if (stats.playerSessionMap) {
        for (const [player, sessionSet] of Object.entries(stats.playerSessionMap)) {
          // For each session, try to load session file and get challengesCompleted
          for (const sessionId of sessionSet) {
            try {
              const sessionFile = require('path').join(__dirname, 'analytics_data', 'sessions', `session_${player}_${sessionId}.json`);
              const fs = require('fs');
              if (fs.existsSync(sessionFile)) {
                const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
                const completed = sessionData.gameStats && sessionData.gameStats.challengesCompleted ? sessionData.gameStats.challengesCompleted : [];
                for (const cid of completed) {
                  if (date === todayStr) addCompletion(playerChallengeMap.today, cid, player);
                  if (weekDays.includes(date)) addCompletion(playerChallengeMap.week, cid, player);
                  addCompletion(playerChallengeMap.allTime, cid, player);
                }
              }
            } catch (e) { /* ignore */ }
          }
        }
      }
    }
    // Convert sets to counts and player lists
    for (const period of ['today', 'week', 'allTime']) {
      for (const [cid, players] of Object.entries(playerChallengeMap[period])) {
        challengeStats[period][cid] = { count: players.size, players: Array.from(players) };
      }
    }

    // Cleanup stale players: if a player entry exists but the socket is gone,
    // remove it to avoid showing ghost connected players in the dashboard.
    for (const socketId of Object.keys(gameState.players)) {
      try {
        const sock = (io.sockets && io.sockets.sockets && io.sockets.sockets.get(socketId)) || null;
        if (!sock) {
          // Log at debug level to avoid excessive logs in normal ops
          logger.debug(`Analytics cleanup: removing stale player entry ${gameState.players[socketId]?.name || '<unknown>'} (${socketId})`);
          delete gameState.players[socketId];
          delete playerLastActivity[socketId];
        }
      } catch (e) {
        // defensive - ignore any errors during cleanup
      }
    }

    // Count connected non-admin sockets so dashboard reflects actual socket connections
    const socketsMap = (io.sockets && io.sockets.sockets) ? io.sockets.sockets : new Map();
    let connectedSocketCount = 0;
    for (const s of socketsMap.values()) {
      try {
        if (s && s.isAdminSocket) continue; // ignore admin/analytics sockets
        connectedSocketCount++;
      } catch (e) {}
    }

    // Use the larger of gameState players or connected sockets (non-admin) as the active players count
    const actualActivePlayers = Math.max(Object.keys(gameState.players).length, connectedSocketCount);

    // Build connected players list including entries from gameState and any connected sockets not yet added to gameState
    const now = Date.now();
    const connectedPlayers = [];

    // Add full player records from gameState
    for (const [socketId, player] of Object.entries(gameState.players)) {
      try {
        const socketObj = socketsMap.get(socketId) || null;
        let sessionStart = socketObj && socketObj.analytics && socketObj.analytics.startTime ? socketObj.analytics.startTime : (playerLastActivity[socketId] || null);
        if (!sessionStart) sessionStart = now - 10000; // fallback: pretend a 10s session
        const duration = Math.floor((now - sessionStart) / 1000);
        connectedPlayers.push({ name: player.name, duration, socketId });
      } catch (e) {
        // ignore malformed entries
      }
    }

    // Add minimal entries for connected sockets that are not present in gameState.players
    for (const [socketId, socketObj] of socketsMap.entries()) {
      try {
        if (!socketObj) continue;
        if (socketObj.isAdminSocket) continue;
        if (gameState.players[socketId]) continue; // already included
        const name = (socketObj.analytics && socketObj.analytics.playerId) || (socketObj.handshake && socketObj.handshake.auth && socketObj.handshake.auth.name) || `Guest-${String(socketId).substring(0,4)}`;
        const sessionStart = (socketObj.analytics && socketObj.analytics.startTime) || (playerLastActivity[socketId] || now);
        const duration = Math.floor((now - sessionStart) / 1000);
        connectedPlayers.push({ name, duration, socketId });
      } catch (e) {
        // ignore
      }
    }

    // Build leaderboard: sort by score descending
    const leaderboard = Object.values(gameState.players)
      .map(p => ({
        name: p.name,
        score: p.score || 0,
        wins: p.wins || 0,
        losses: p.losses || 0
      }))
      .sort((a, b) => b.score - a.score);

    // Transform data to match dashboard expectations. Use the actual connected
    // player count when it is higher than analytics-derived concurrent counts
    // (this can happen when clients connect but haven't emitted session_start
    // yet which is what the analytics subsystem uses to track sessions).
    const reportedPeak = stats.today?.peakConcurrent || 0;
    const adjustedPeak = Math.max(reportedPeak, actualActivePlayers);

  const todayPayload = Object.assign({}, stats.today || {});
  // Ensure eventCounts are present for frontend (file-based analytics may not have been
  // normalized into stats.today.eventCounts previously). This lets the dashboard read
  // tutorial_* counters and other event metrics reliably.
  todayPayload.eventCounts = (stats && stats.today && stats.today.eventCounts) ? stats.today.eventCounts : (stats && stats.eventCounts ? stats.eventCounts : {});
    // Ensure the frontend finds these fields under today
    todayPayload.peakConcurrent = adjustedPeak;
    todayPayload.currentConcurrent = actualActivePlayers;

    // Persist adjusted global peak so the "all-time" number reflects
    // actual connected players when it exceeds the stored peak.
    try {
      if (dataSource === 'database' && dbAnalytics && dbAnalytics.initialized) {
        // Update DB global peak (fire-and-forget)
        dbAnalytics.updateGlobalPeak(adjustedPeak).catch(() => {});
      } else {
        // File-based analytics: update in-memory meta and persist to disk
        try {
          if (analytics && (typeof analytics.globalPeak === 'number') && analytics.globalPeak < adjustedPeak) {
            analytics.globalPeak = adjustedPeak;
            analytics.saveMeta && analytics.saveMeta().catch(() => {});
          }
        } catch (e) {
          // ignore persistence errors
        }
      }
    } catch (e) {
      // defensive - do not fail the endpoint due to persistence issues
    }

    function formatSecondsToHMS(sec) {
      if (typeof sec !== 'number' || !isFinite(sec) || sec <= 0) return '0s';
      const s = Math.floor(sec);
      const hours = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = s % 60;
      if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
      if (mins > 0) return `${mins}m ${secs}s`;
      return `${secs}s`;
    }

    const dashboardData = {
      // Challenge completions and achievers
      challengeStats,
      // Basic metrics that dashboard expects - use real player count
      activePlayers: actualActivePlayers,
      peakPlayers: adjustedPeak,
      totalSessions: stats.today?.totalSessions || 0,
  // averageSessionDuration is already expressed in seconds by analytics
  // Add both numeric seconds (for compatibility) and a human-friendly format.
  avgSessionTime: Math.floor(stats.today?.averageSessionDuration || 0),
  avgSessionTimeHuman: formatSecondsToHMS(Math.floor(stats.today?.averageSessionDuration || 0)),
  // Compute median and 90th percentile for today's session durations if available
  avgSessionMedian: 0,
  avgSessionP90: 0,
  avgSessionMedianHuman: '0s',
  avgSessionP90Human: '0s',
      connectedPlayers, // <-- new field: array of {name, duration, socketId}
      // Expose today and allTime stats for frontend (with adjusted peak/current)
      today: todayPayload,
      allTime: stats.allTime || {},

      // Game statistics - map to actual field names
      killsToday: stats.today?.totalKills || 0,
      deathsToday: stats.today?.totalDeaths || 0,
      shotsFired: stats.today?.totalShots || 0,
      powerupsCollected: stats.today?.powerupsCollected || 0,

      // Premium statistics
      premiumPlayers: stats.today?.premiumPlayers || 0,
      storeVisits: stats.today?.storeVisits || 0,
      purchases: stats.today?.totalPurchases || 0,
      revenue: stats.today?.totalSpent || 0, // Real money revenue
      gemsSpent: stats.today?.gemsSpent || 0, // Gems spent on items

      // Chart-related placeholder: playerActivity will be computed below asynchronously
      gameEvents: {
        kills: stats.today?.totalKills || 0,
        deaths: stats.today?.totalDeaths || 0,
        shots: stats.today?.totalShots || 0,
        powerups: stats.today?.powerupsCollected || 0,
        purchases: stats.today?.totalPurchases || 0,
      },

      // Leaderboard for dashboard
      leaderboard,
    };

      // Compute median and 90th percentile from today's session durations (seconds)
      try {
        const todaySessions = stats.today && stats.today.sessionDurations ? stats.today.sessionDurations.slice().filter(d => typeof d === 'number' && isFinite(d)) : [];
        if (todaySessions.length > 0) {
          const sorted = todaySessions.slice().sort((a, b) => a - b);
          const median = sorted.length % 2 === 1 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2;
          const idx90 = Math.ceil(0.9 * sorted.length) - 1;
          const p90 = sorted[Math.max(0, Math.min(idx90, sorted.length - 1))];
          dashboardData.avgSessionMedian = Math.round(median);
          dashboardData.avgSessionP90 = Math.round(p90);
          dashboardData.avgSessionMedianHuman = formatSecondsToHMS(Math.round(median));
          dashboardData.avgSessionP90Human = formatSecondsToHMS(Math.round(p90));
        }
      } catch (e) {
        // ignore
      }

    // Determine requested range and compute player activity series
    const range = req.query.range || '24h';
    let playerActivity = [];
    try {
      playerActivity = await generatePlayerActivityData(stats, range);
    } catch (paErr) {
      console.error('Error generating player activity series:', paErr);
      // Fallback: build a simple last-24-hour hourly series from today's stats or active sessions
      const now = new Date();
      const hourly = (stats && stats.today && (stats.today.hourlyUniquePlayers || stats.today.hourlyActivity))
        ? (stats.today.hourlyUniquePlayers || stats.today.hourlyActivity)
        : null;
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = time.getHours();
        const count = hourly ? (hourly[hour] || 0) : (i === 0 ? (stats.activeSessions || 0) : 0);
        playerActivity.push({ timestamp: time.toISOString(), count });
      }
    }

    // Ensure tutorialStats is exposed at top-level for the frontend.
    // Prefer DB-provided tutorial aggregates when available (stats.tutorialStats or stats.today.tutorial),
    // otherwise fall back to simple counts from eventCounts.
    let tutorialStatsOut = null;
    try {
      if (stats && stats.tutorialStats) {
        tutorialStatsOut = stats.tutorialStats;
      } else if (stats && stats.today && stats.today.tutorial) {
        const tToday = stats.today.tutorial;
        const tAll = stats.allTime && stats.allTime.tutorial ? stats.allTime.tutorial : { started: 0, completed: 0, completionDurations: [], quitCounts: {}, quitDurations: [], stepDurations: {} };
        const avg = (arr) => (Array.isArray(arr) && arr.length > 0) ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        tutorialStatsOut = {
          today: {
            started: tToday.started || 0,
            completed: tToday.completed || 0,
            avgCompletionSeconds: avg(tToday.completionDurations || []),
            avgQuitSeconds: avg(tToday.quitDurations || []),
            quitCounts: tToday.quitCounts || {},
            stepDurations: tToday.stepDurations || {},
          },
          allTime: {
            started: tAll.started || 0,
            completed: tAll.completed || 0,
            avgCompletionSeconds: avg(tAll.completionDurations || []),
            avgQuitSeconds: avg(tAll.quitDurations || []),
            quitCounts: tAll.quitCounts || {},
            stepDurations: tAll.stepDurations || {},
          },
        };
      } else {
        // Fallback to eventCounts if tutorial object not present
        const todayEv = (stats && stats.today && stats.today.eventCounts) ? stats.today.eventCounts : {};
        const allEv = (stats && stats.allTime && stats.allTime.eventCounts) ? stats.allTime.eventCounts : {};
        tutorialStatsOut = {
          today: {
            started: todayEv['tutorial_started'] || 0,
            completed: todayEv['tutorial_completed'] || 0,
            avgCompletionSeconds: 0,
            avgQuitSeconds: 0,
            quitCounts: {},
            stepDurations: {},
          },
          allTime: {
            started: allEv['tutorial_started'] || 0,
            completed: allEv['tutorial_completed'] || 0,
            avgCompletionSeconds: 0,
            avgQuitSeconds: 0,
            quitCounts: {},
            stepDurations: {},
          },
        };
      }
    } catch (e) {
      tutorialStatsOut = { today: { started: 0, completed: 0, avgCompletionSeconds: 0, avgQuitSeconds: 0, quitCounts: {}, stepDurations: {} }, allTime: { started: 0, completed: 0, avgCompletionSeconds: 0, avgQuitSeconds: 0, quitCounts: {}, stepDurations: {} } };
    }

    // Respond with dashboard payload plus computed series
    res.json({
      ok: true,
      dataSource,
      // persistentAnalytics should reflect whether DB-backed analytics are initialized
      persistentAnalytics: (dataSource === 'database') && !!(dbAnalytics && dbAnalytics.initialized),
      stats,
      diagnostics,
      playerActivity,
      range,
      tutorialStats: tutorialStatsOut,
      ...dashboardData,
    });
  } catch (error) {
    console.error('Error in /analytics', error);
    res.status(500).json({ ok: false, error: 'server error' });
  }
});

// Diagnostics endpoint for session duration distribution (admin use)
app.get('/analytics/diagnostics', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, 'analytics_data', 'daily');
    const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter(f => f.endsWith('.json')) : [];
    const summary = { total: 0, lt60: 0, lt300: 0, lt600: 0, gte600: 0 };
    for (const f of files) {
      try {
        const p = path.join(dataDir, f);
        const raw = fs.readFileSync(p, 'utf8');
        const obj = JSON.parse(raw);
        if (Array.isArray(obj.sessionDurations)) {
          for (let d of obj.sessionDurations) {
            if (typeof d !== 'number' || !isFinite(d)) continue;
            if (d > 10000) d = Math.round(d / 1000); // defensive
            summary.total++;
            if (d < 60) summary.lt60++;
            else if (d < 300) summary.lt300++;
            else if (d < 600) summary.lt600++;
            else summary.gte600++;
          }
        }
      } catch (e) { /* ignore file parse errors */ }
    }
    res.json({ ok: true, summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Debug endpoint: return recent powerup add/remove events (useful to fetch after reproducing locally)
app.get('/debug/powerup-events', (req, res) => {
  // Optional filter via query: ?limit=50
  const limit = Math.min(parseInt(req.query.limit || '200', 10) || 200, maxPowerupEvents);
  const out = powerupEventBuffer.slice(-limit);
  res.json({ count: out.length, events: out });
});

// Clear the debug buffer
app.post('/debug/powerup-events/clear', (req, res) => {
  powerupEventBuffer.length = 0;
  res.json({ ok: true });
});

// Debug endpoint: list recent tutorial-related analytics events from the DB (read-only)
app.get('/analytics/debug/tutorial-events', async (req, res) => {
  try {
    // Require database to be configured
    if (!process.env.DATABASE_URL || !database || !database.pool) {
      return res.status(400).json({ ok: false, error: 'database not configured on this server' });
    }

    // Respect a ?limit= query param, with safe bounds
    const limit = Math.min(Math.max(parseInt(req.query.limit || '200', 10) || 200, 1), 2000);

    // Optional since param (ISO date) to filter events newer than provided date
    const since = req.query.since ? new Date(req.query.since) : null;

    let sql = 'SELECT event_type, player_id, session_id, data, timestamp FROM analytics_events WHERE event_type ILIKE $1';
    const params = ['tutorial%'];
    if (since && !isNaN(since.getTime())) {
      sql += ' AND timestamp >= $2';
      params.push(since.toISOString());
    }
    sql += ' ORDER BY timestamp DESC LIMIT ' + limit;

    const result = await database.pool.query(sql, params);
    res.json({ ok: true, count: result.rows.length, events: result.rows });
  } catch (error) {
    console.error('Error in /analytics/debug/tutorial-events', error && error.stack ? error.stack : error);
    res.status(500).json({ ok: false, error: 'server error', details: error && error.message });
  }
});

// Expose cloud user registry (uses database when available, falls back to files)
async function getCloudUsersPayload() {
  try {
    // Try database first if available
    if (process.env.DATABASE_URL) {
      try {
        const playerStats = await database.getPlayerStats();
        
        const list = playerStats.map(player => {
          return {
            username: player.username,
            createdAt: player.createdAt,
            lastLogin: player.lastLogin,
            playtime: {
              hours: player.playTime.hours,
              minutes: player.playTime.minutes,
              seconds: player.playTime.seconds,
              totalMs: player.playTime.total
            }
          };
        });

        return {
          count: list.length,
          users: list,
          source: 'database'
        };
      } catch (dbError) {
        console.log('Database not available, falling back to files:', dbError.message);
      }
    }

    // Fallback to file-based system
    const fsPromises = require('fs').promises;
    const cloudDir = require('path').join(__dirname, 'cloud_data');
    const usersPath = require('path').join(cloudDir, 'users.json');
    const tokensPath = require('path').join(cloudDir, 'tokens.json');

    // Read users and tokens
    let usersRaw = '{}';
    try {
      usersRaw = await fsPromises.readFile(usersPath, 'utf8');
    } catch (e) {
      // ignore and use empty
    }
    let tokensRaw = '{}';
    try {
      tokensRaw = await fsPromises.readFile(tokensPath, 'utf8');
    } catch (e) {
      // ignore and use empty
    }

    const users = JSON.parse(usersRaw || '{}');
    const tokens = JSON.parse(tokensRaw || '{}');

    // Map username -> latest token lastUsed
    const userLastLogin = {};
    for (const [token, tdata] of Object.entries(tokens)) {
      if (tdata && tdata.username) {
        const uname = tdata.username.toLowerCase();
        const ts = tdata.lastUsed ? new Date(tdata.lastUsed).getTime() : 0;
        if (!userLastLogin[uname] || ts > userLastLogin[uname]) {
          userLastLogin[uname] = ts;
        }
      }
    }

    // Read player files for playtime info
    const playersDir = require('path').join(cloudDir, 'players');
    const list = [];
    for (const [key, u] of Object.entries(users)) {
      try {
        const username = (u.username || key).toString();
        const userKey = username.toLowerCase();
        let lastLogin = userLastLogin[userKey] ? new Date(userLastLogin[userKey]).toISOString() : null;

        // Try to load player file
        let playTimeSeconds = 0;
        try {
          const pf = require('path').join(playersDir, `player_${username}.json`);
          const content = await fsPromises.readFile(pf, 'utf8').catch(() => null);
          if (content) {
            const pdata = JSON.parse(content);
            // Try several common places for accumulated playtime
            if (pdata.gameData && typeof pdata.gameData.totalPlayTime === 'number') {
              playTimeSeconds = Math.floor(pdata.gameData.totalPlayTime);
            } else if (pdata.gameData && typeof pdata.gameData.playTimeSeconds === 'number') {
              playTimeSeconds = Math.floor(pdata.gameData.playTimeSeconds);
            } else if (pdata.gameStats && typeof pdata.gameStats.totalPlayTime === 'number') {
              playTimeSeconds = Math.floor(pdata.gameStats.totalPlayTime);
            } else if (pdata.lastSaved) {
              // If no explicit playtime, try to infer from createdAt -> lastSaved (not ideal)
              const created = u.createdAt ? new Date(u.createdAt).getTime() : null;
              const lastSaved = pdata.lastSaved ? new Date(pdata.lastSaved).getTime() : null;
              if (created && lastSaved && lastSaved > created) {
                playTimeSeconds = Math.floor((lastSaved - created) / 1000);
              }
            }
          }
        } catch (e) {
          // ignore
        }

        list.push({
          username,
          createdAt: u.createdAt || null,
          lastLogin,
          playTimeSeconds,
        });
      } catch (e) {
        // ignore malformed user
      }
    }

    // Sort by lastLogin desc then username
    list.sort((a, b) => {
      const ta = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
      const tb = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
      if (ta !== tb) return tb - ta;
      return a.username.localeCompare(b.username);
    });

    return { 
      count: list.length, 
      users: list,
      source: 'files'
    };
  } catch (error) {
    console.error('Error getting cloud users:', error);
    return {
      count: 0,
      users: [],
      error: error.message,
      source: 'error'
    };
  }
}

const cloudUsersHandler = async (req, res) => {
  try {
    const payload = await getCloudUsersPayload();
    // Add debug info to help diagnose empty results
    const fsPromises = require('fs').promises;
    const cloudDir = require('path').join(__dirname, 'cloud_data');
    let debugInfo = {};
    try {
      const stats = await fsPromises.stat(cloudDir);
      debugInfo.cloudDirExists = stats.isDirectory();
      const files = await fsPromises.readdir(cloudDir);
      debugInfo.cloudDirFiles = files;
      
      const usersPath = require('path').join(cloudDir, 'users.json');
      const tokensPath = require('path').join(cloudDir, 'tokens.json');
      try {
        const usersContent = await fsPromises.readFile(usersPath, 'utf8');
        debugInfo.usersFileSize = usersContent.length;
        debugInfo.usersFileContent = usersContent.substring(0, 200);
      } catch (e) {
        debugInfo.usersFileError = e.message;
      }
      try {
        const tokensContent = await fsPromises.readFile(tokensPath, 'utf8');
        debugInfo.tokensFileSize = tokensContent.length;
        debugInfo.tokensFileContent = tokensContent.substring(0, 200);
      } catch (e) {
        debugInfo.tokensFileError = e.message;
      }
    } catch (e) {
      debugInfo.dirError = e.message;
    }
    
    res.json({ ...payload, debug: debugInfo });
  } catch (error) {
    console.error('Failed to read cloud users:', error);
    res.status(500).json({ error: 'Failed to read cloud users' });
  }
};

app.get('/cloud/users', cloudUsersHandler);
app.get('/api/cloud/users', cloudUsersHandler);
app.get('/api/v1/cloud/users', cloudUsersHandler);

// Alternative endpoint that uses CloudSyncAuth directly
app.get('/cloud/users/auth', async (req, res) => {
  try {
    const users = await cloudAuth.loadUsers();
    const tokens = await cloudAuth.loadTokens();
    
    // Map username -> latest token lastUsed
    const userLastLogin = {};
    for (const [token, tdata] of Object.entries(tokens)) {
      if (tdata && tdata.username) {
        const uname = tdata.username.toLowerCase();
        const ts = tdata.lastUsed ? new Date(tdata.lastUsed).getTime() : 0;
        if (!userLastLogin[uname] || ts > userLastLogin[uname]) {
          userLastLogin[uname] = ts;
        }
      }
    }
    
    const list = [];
    for (const [key, u] of Object.entries(users)) {
      const username = u.username || key;
      const userKey = username.toLowerCase();
      const lastLogin = userLastLogin[userKey] ? new Date(userLastLogin[userKey]).toISOString() : null;
      
      list.push({
        username,
        createdAt: u.createdAt || null,
        lastLogin,
        playTimeSeconds: 0 // Will be 0 since we're not reading player files here
      });
    }
    
    // Sort by lastLogin desc then username
    list.sort((a, b) => {
      const ta = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
      const tb = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
      if (ta !== tb) return tb - ta;
      return a.username.localeCompare(b.username);
    });
    
    res.json({ count: list.length, users: list, method: 'auth' });
  } catch (error) {
    console.error('Failed to read cloud users via auth:', error);
    res.status(500).json({ error: 'Failed to read cloud users via auth', details: error.message });
  }
});

// Helper function to generate player activity data for charts
// Async helper to build activity series for different ranges.
// range: '24h' (hourly last 24), '7d' (daily last 7 days), '30d' (daily last 30 days), 'all' (daily for all available days)
async function generatePlayerActivityData(stats, range = '24h') {
  const activityData = [];
  const now = new Date();

  if (range === '24h') {
    // Hourly series for last 24 hours
    if (stats.today && (stats.today.hourlyUniquePlayers || stats.today.hourlyActivity)) {
      const hourlyActivity = stats.today.hourlyUniquePlayers || stats.today.hourlyActivity;
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = time.getHours();
        const count = hourlyActivity[hour] || 0;
        activityData.push({ timestamp: time.toISOString(), count });
      }
    } else {
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const count = i === 0 ? stats.activeSessions || 0 : 0;
        activityData.push({ timestamp: time.toISOString(), count });
      }
    }
    return activityData;
  }

  // For multi-day ranges we want hour-of-day aggregation (peak players by hour)
  // Produce 24 buckets (0..23) where each bucket is the peak unique players seen
  // in that hour across the selected days. This shows peak playing times-of-day.
  let days = 0;
  if (range === '7d') days = 7;
  else if (range === '30d') days = 30;

  // Build list of date keys for the requested window
  let dateKeys = [];
  if (range === 'all') {
    // For 'all' we will consider all available days
    if (dbAnalytics && dbAnalytics.initialized) {
      // we'll fetch sessions for all time (DB helper handles bounds)
      // leave dateKeys empty to signal full-scan
      dateKeys = null;
    } else {
      dateKeys = Array.from(analytics.dailyStats.keys()).sort();
    }
  } else {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const est = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const key = est.toISOString().split('T')[0];
      dateKeys.push(key);
    }
  }

  // Helper: initialize per-day per-hour sets and compute peak per hour
  const hourPeak = Array.from({ length: 24 }, () => 0);

  if (dbAnalytics && dbAnalytics.initialized) {
    // For DB-backed analytics, fetch sessions in the date window
    const start = dateKeys && dateKeys.length ? dateKeys[0] : '1970-01-01';
    const end = dateKeys && dateKeys.length ? dateKeys[dateKeys.length - 1] : new Date().toISOString().split('T')[0];
    const rows = await dbAnalytics.getSessionData(start, end);
    // Map day -> hour -> Set(playerId)
    const perDayHour = {};
    rows.forEach(r => {
      const d = new Date(r.start_time || r.start_time);
      const est = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = est.toISOString().split('T')[0];
      const hr = est.getHours();
      perDayHour[day] = perDayHour[day] || {};
      perDayHour[day][hr] = perDayHour[day][hr] || new Set();
      if (r.player_id) perDayHour[day][hr].add(r.player_id);
    });

    // If dateKeys is null (all), use all days from perDayHour keys
    const keysToConsider = dateKeys === null ? Object.keys(perDayHour).sort() : dateKeys;
    for (const day of keysToConsider) {
      const hours = perDayHour[day] || {};
      for (let hr = 0; hr < 24; hr++) {
        const cnt = hours[hr] ? hours[hr].size : 0;
        if (cnt > hourPeak[hr]) hourPeak[hr] = cnt;
      }
    }
  } else {
    // File-based analytics: inspect analytics.dailyStats entries
    const keys = dateKeys || Array.from(analytics.dailyStats.keys()).sort();
    for (const day of keys) {
      const s = analytics.dailyStats.get(day) || {};
      // Prefer hourlyUniquePlayers, fall back to hourlyActivity
      const arr = (s.hourlyUniquePlayers && Array.isArray(s.hourlyUniquePlayers))
        ? s.hourlyUniquePlayers
        : (s.hourlyActivity && Array.isArray(s.hourlyActivity)) ? s.hourlyActivity : null;
      if (!arr) continue;
      for (let hr = 0; hr < 24; hr++) {
        const cnt = arr[hr] || 0;
        if (cnt > hourPeak[hr]) hourPeak[hr] = cnt;
      }
    }
  }

  // Build activityData as 24 hourly points (use today's date for timestamps so labels show times)
  const todayIso = new Date().toISOString().split('T')[0];
  for (let hr = 0; hr < 24; hr++) {
    // create ISO timestamp at that hour (UTC) using today's date and hour
    const time = new Date();
    time.setUTCHours(hr, 0, 0, 0);
    activityData.push({ timestamp: time.toISOString(), count: hourPeak[hr] });
  }

  return activityData;
}

// Database analytics endpoint (new persistent analytics)
app.get('/analytics/database', async (req, res) => {
  try {
    const stats = await dbAnalytics.getStats();
    const recentEvents = await dbAnalytics.getRecentEvents(50);
    
    res.json({
      ...stats,
      recentEvents: recentEvents.slice(0, 10), // Show last 10 events
      message: 'Database analytics (persistent across redeploys)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database analytics endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get database analytics', 
      details: error.message 
    });
  }
});

app.get('/analytics/report', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const report = analytics.generateReport(days);
    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Temporary admin endpoint to force-save analytics to disk (for debugging)
// Call with POST /analytics/save to flush in-memory analytics to files
app.post('/analytics/save', async (req, res) => {
  try {
  logger.info('Admin: forcing analytics save to disk');
    await analytics.saveDailyStats();
    await analytics.savePlayerProfiles();
    await analytics.saveMeta();
    return res.json({ success: true, message: 'Analytics saved to disk' });
  } catch (e) {
    console.error('Error forcing analytics save:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Admin endpoint to delete test users
app.post('/admin/delete-users', async (req, res) => {
  try {
    const { users, confirmKey } = req.body;
    
    // Simple security check
    if (confirmKey !== 'delete-test-users-2025') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, message: 'Users array required' });
    }
    
  logger.info('🗑️ Admin: Deleting test users:', users);
    
    const results = [];
    
    for (const username of users) {
      try {
        const lowerUsername = username.toLowerCase();
        
        // Delete from auth_tokens first (foreign key constraint)
        const tokenResult = await database.pool.query(
          'DELETE FROM auth_tokens WHERE username = $1',
          [lowerUsername]
        );
        
        // Delete from player_data
        const playerDataResult = await database.pool.query(
          'DELETE FROM player_data WHERE username = $1',
          [lowerUsername]
        );
        
        // Delete from users table
        const userResult = await database.pool.query(
          'DELETE FROM users WHERE username = $1 RETURNING username',
          [lowerUsername]
        );
        
        if (userResult.rows.length > 0) {
          results.push({
            username,
            success: true,
            tokensDeleted: tokenResult.rowCount,
            playerDataDeleted: playerDataResult.rowCount
          });
            logger.info(`✅ Deleted user: ${username}`);
        } else {
          results.push({
            username,
            success: false,
            message: 'User not found'
          });
          logger.warn(`⚠️ User not found: ${username}`);
        }
      } catch (error) {
        results.push({
          username,
          success: false,
          message: error.message
        });
        console.error(`❌ Error deleting ${username}:`, error.message);
      }
    }
    
    // Get remaining user count
    const remainingResult = await database.pool.query('SELECT COUNT(*) as count FROM users');
    const remainingCount = parseInt(remainingResult.rows[0].count);
    
    res.json({
      success: true,
      message: 'Deletion process completed',
      results,
      remainingUsers: remainingCount
    });
    
  } catch (error) {
    console.error('Admin delete users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/analytics/hourly', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const hourlyPeak = analytics.getHourlyPeakConcurrent(days);
    res.json({ hourlyPeakConcurrent: hourlyPeak, days });
  } catch (error) {
    console.error('Error getting hourly data:', error);
    res.status(500).json({ error: 'Failed to get hourly data' });
  }
});

app.get('/analytics/retention', (req, res) => {
  try {
    const retention = analytics.getPlayerRetention();
    res.json(retention);
  } catch (error) {
    console.error('Error getting retention data:', error);
    res.status(500).json({ error: 'Failed to get retention data' });
  }
});

// Returns average player count for each hour of the day across all days
app.get('/analytics/activity/average24h', (req, res) => {
  try {
    // Use the in-memory analytics instance
    const serverAnalytics = analytics;
    // Calculate average player count for each hour (0-23) across all days
    const hourSums = Array(24).fill(0);
    const hourCounts = Array(24).fill(0);
    for (const stats of serverAnalytics.dailyStats.values()) {
      if (Array.isArray(stats.hourlyActivity)) {
        for (let h = 0; h < 24; h++) {
          hourSums[h] += stats.hourlyActivity[h] || 0;
          hourCounts[h] += 1;
        }
      }
    }
    const avg = hourSums.map((sum, h) => ({ hour: h, avgCount: hourCounts[h] > 0 ? sum / hourCounts[h] : 0 }));
    res.json(avg);
  } catch (e) {
    res.status(500).json({ error: 'Failed to compute average 24h activity' });
  }
});

// Analytics tracking endpoint - receives events from the client
// Ensure preflight (OPTIONS) requests for this endpoint always succeed with the
// expected CORS headers. The app-level cors() middleware should handle this
// already, but some hosting layers or proxies may strip headers — add a route
// level handler as a safety net.
app.options('/analytics/track', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cache-Control, Pragma',
  );
  // 204 No Content is appropriate for successful preflight
  return res.sendStatus(204);
});

app.post('/analytics/track', (req, res) => {
  // Reinforce CORS headers on the actual response as an additional safeguard
  // in case upstream proxies remove app-level headers.
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cache-Control, Pragma',
  );
  try {
  const logger = require('./logger');
  logger.debug('📊 Analytics track request received:', req.body);

    const { event, data, timestamp, url } = req.body;

    // Track the event in our analytics system using the correct method and format
    if (event && data && data.playerId) {
      const eventData = {
        sessionId: data.sessionId || `session_${Date.now()}_${data.playerId}`,
        playerId: data.playerId,
        eventType: event,
        timestamp: timestamp || Date.now(),
        data: data,
      };

  logger.debug('📊 Processing event data:', eventData);
      analytics.processEvent(eventData, req.ip);
  logger.debug(`📊 Analytics event tracked: ${event} from ${data.playerId}`);
    } else {
  logger.warn(`📊 Analytics event missing required fields:`, {
        event,
        hasData: !!data,
        hasPlayerId: data?.playerId,
        fullBody: req.body,
      });
    }

    res.json({ success: true, event, timestamp });
  } catch (error) {
    console.error('❌ Error tracking analytics event:', error);
    console.error('❌ Request body was:', req.body);
    res
      .status(500)
      .json({ error: 'Failed to track event', details: error.message });
  }
});

// ===== CLOUD SYNC AUTHENTICATION ROUTES =====

// CORS preflight handlers for auth endpoints
app.options('/auth/register', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

app.options('/auth/login', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

app.options('/auth/reset-password-recovery', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

// Register new account
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await cloudAuth.register(username, password);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Registration endpoint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await cloudAuth.login(username, password);

    if (result.success) {
      // Emit cloud_login analytics event for successful cloud auth
      try {
        analytics.processEvent(
          {
            sessionId: `cloud_${Date.now()}_${result.username}`,
            playerId: result.username,
            eventType: 'cloud_login',
            timestamp: Date.now(),
            data: { username: result.username },
          },
          req.ip || req.connection?.remoteAddress || 'unknown',
        );
      } catch (e) {
        console.error('Failed to process cloud_login analytics event:', e);
      }

      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login endpoint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Validate token
app.get('/auth/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ valid: false, message: 'No token provided' });
    }

    const result = await cloudAuth.validateToken(token);

    if (result.valid) {
      res.json({ valid: true, username: result.username });
    } else {
      res.status(401).json({ valid: false, message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token validation endpoint error:', error);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
});

// Password reset request
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res
        .status(400)
        .json({ success: false, message: 'Username required' });
    }

    const result = await cloudAuth.generatePasswordResetCode(username);

    if (result.success) {
      // In production, send email here instead of returning the code
      console.log(
        `📧 Password reset code for ${username}: ${result.resetCode} (sent to ${result.email})`,
      );
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Forgot password endpoint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Password reset confirmation
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { username, resetCode, newPassword } = req.body;

    if (!username || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username, reset code, and new password required',
      });
    }

    const result = await cloudAuth.resetPassword(
      username,
      resetCode,
      newPassword,
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Reset password endpoint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Password reset with recovery key
app.post('/auth/reset-password-recovery', async (req, res) => {
  try {
    const { username, recoveryKey, newPassword } = req.body;

    if (!username || !recoveryKey || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username, recovery key, and new password required',
      });
    }

    const result = await cloudAuth.resetPasswordWithRecoveryKey(
      username,
      recoveryKey,
      newPassword,
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Recovery key reset password endpoint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload game data
app.post('/sync/upload', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'No token provided' });
    }

    const { gameData } = req.body;
    const result = await cloudAuth.savePlayerData(token, gameData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Download game data
app.get('/sync/download', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'No token provided' });
    }

    const result = await cloudAuth.loadPlayerData(token);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Download endpoint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== END CLOUD SYNC ROUTES =====

// Debug endpoint - shows current sessions and today's dailyStats for troubleshooting
app.get('/analytics/debug', (req, res) => {
  try {
    const sessions = [];
    for (const [playerId, s] of analytics.sessions.entries()) {
      sessions.push({
        playerId,
        sessionIds: Array.from(s.sessionIds || []),
        startTime: s.startTime,
        lastActivity: s.lastActivity,
        events: s.events ? s.events.length : 0,
        ip: s.ip,
      });
    }

    const today = analytics.getDateString();
    const todayStats =
      analytics.dailyStats.get(today) || analytics.createEmptyDayStats();

    res.json({
      sessions,
      currentActive: analytics.currentActive || 0,
      globalPeak: analytics.globalPeak || 0,
      today: {
        date: today,
        totalSessions: todayStats.totalSessions || 0,
        uniqueSessions:
          todayStats.uniqueSessions &&
          typeof todayStats.uniqueSessions.size === 'number'
            ? todayStats.uniqueSessions.size
            : Array.isArray(todayStats.uniqueSessions)
              ? todayStats.uniqueSessions.length
              : 0,
        currentConcurrent: todayStats.currentConcurrent || 0,
        peakConcurrent: todayStats.peakConcurrent || 0,
        sessionDurations: todayStats.sessionDurations
          ? todayStats.sessionDurations.slice(-20)
          : [],
      },
    });
  } catch (e) {
    console.error('Error in analytics debug endpoint:', e);
    res.status(500).json({ error: 'debug failed' });
  }
});

// Create Socket.IO server with CORS configuration and enable per-message deflate compression
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
  },
  // Enable websocket compression to reduce payload sizes for repetitive JSON
  perMessageDeflate: {
    threshold: 1024, // only compress messages >1KB
  },
});

// Helper to avoid broadcasting large payloads when no clients are connected
function safeEmit(event, payload) {
  try {
    const connected = io.of('/').sockets.size || 0;
    if (connected === 0) {
      // No connected clients — skip emitting to save bandwidth
  const logger = require('./logger');
  logger.debug(`SafeEmit: skipping '${event}' (no connected clients)`);
      return;
    }

    // Log large payloads for debugging (warn if >50KB)
    try {
      const size = Buffer.byteLength(JSON.stringify(payload || {}), 'utf8');
      // store a rolling metric on the io object for quick debugging
      io._lastEmitSize = size;
      io._emitSizeSamples = (io._emitSizeSamples || []);
      io._emitSizeSamples.push(size);
      if (io._emitSizeSamples.length > 20) io._emitSizeSamples.shift();
      const avg = Math.round(io._emitSizeSamples.reduce((a,b)=>a+b,0) / io._emitSizeSamples.length);
      if (size > 50 * 1024) {
        console.warn(`SafeEmit: payload for '${event}' is large: ${Math.round(size/1024)}KB (avg ${Math.round(avg/1024)}KB)`);
      }
    } catch (e) {
      // ignore JSON errors
    }

    io.emit(event, payload);
  } catch (e) {
    console.error('SafeEmit error for', event, e);
  }
}

// Add Socket.IO error handling
io.engine.on('connection_error', (err) => {
  logger.error('Socket.IO connection error:', err && err.req ? err.req : err);
  logger.error('Socket.IO error code:', err && err.code ? err.code : 'n/a');
  logger.error('Socket.IO error message:', err && err.message ? err.message : 'n/a');
  logger.debug('Socket.IO error context:', err && err.context ? err.context : null);
});

// Constants for inactivity timeout
const INACTIVITY_TIMEOUT = 120000; // 2 minutes in milliseconds
const INACTIVITY_CHECK_INTERVAL = 30000; // 30 seconds in milliseconds

// Game state
const gameState = {
  players: {},
  asteroids: [],
  powerups: [],
  npcs: [], // Add NPC tracking
};

// Simple counter for assigning unique powerup IDs
let powerupIdCounter = 1;

// Feature flag: enable server-authoritative powerups when env var SERVER_POWERUPS=1
const SERVER_POWERUPS_ENABLED = String(process.env.SERVER_POWERUPS || '0') === '1';

// Track last activity time for each player
const playerLastActivity = {};

// Asteroid generation settings
const WORLD_SIZE = 5000; // World size in units
const ASTEROID_COUNT = 100; // Number of asteroids in the world
const ASTEROID_MIN_SIZE = 20;
const ASTEROID_MAX_SIZE = 100;
const ASTEROID_REGENERATION_TIME = 10000; // Time in ms to regenerate asteroids

// Generate initial asteroids
generateAsteroids();

// Function to generate asteroid field
function generateAsteroids() {
  logger.info('Generating new asteroid field...');
  gameState.asteroids = [];

  // Generate asteroids with unique IDs
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    const radius =
      ASTEROID_MIN_SIZE +
      Math.random() * (ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE);
    const asteroid = {
      id: `asteroid-${Date.now()}-${i}`,
      x: (Math.random() - 0.5) * WORLD_SIZE,
      y: (Math.random() - 0.5) * WORLD_SIZE,
      radius: radius,
      health: radius * 2, // Health based on size
      type: Math.random() > 0.7 ? 'ice' : 'rock', // Different asteroid types
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    };

    gameState.asteroids.push(asteroid);
  }

  // Send the new asteroid field to all connected clients
  safeEmit('asteroidFieldUpdate', {
    asteroids: gameState.asteroids,
  });

  logger.info(`Generated ${gameState.asteroids.length} asteroids`);
}

// Periodic asteroid regeneration to maintain battlefield density
setInterval(() => {
  // Only regenerate if we have connected players and are below minimum asteroid count
  if (
    Object.keys(gameState.players).length > 0 &&
    gameState.asteroids.length < ASTEROID_COUNT * 0.7
  ) {
    logger.info(
      `Regenerating asteroids. Current: ${gameState.asteroids.length}, Target: ${ASTEROID_COUNT}`,
    );

    // Generate new asteroids to reach target count
    const asteroidsToGenerate = ASTEROID_COUNT - gameState.asteroids.length;
    const newAsteroids = [];

    for (let i = 0; i < asteroidsToGenerate; i++) {
      const radius =
        ASTEROID_MIN_SIZE +
        Math.random() * (ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE);
      const newAsteroid = {
        id: `asteroid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: (Math.random() - 0.5) * WORLD_SIZE,
        y: (Math.random() - 0.5) * WORLD_SIZE,
        radius: radius,
        health: radius * 2,
        type: Math.random() > 0.7 ? 'ice' : 'rock',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      };

      gameState.asteroids.push(newAsteroid);
      newAsteroids.push(newAsteroid);
    }

    // Broadcast new asteroids to all clients
    if (newAsteroids.length > 0) {
      safeEmit('newAsteroids', { asteroids: newAsteroids });
      logger.info(
        `Generated ${newAsteroids.length} new asteroids. Total: ${gameState.asteroids.length}`,
      );
    }
  }
}, ASTEROID_REGENERATION_TIME);

// Natural Dreadnaught spawning system
const DREADNAUGHT_MIN_PLAYERS = Number(process.env.DREADNAUGHT_MIN_PLAYERS) || 2; // Minimum players needed for dreadnaught events
const DREADNAUGHT_MIN_INTERVAL = Number(process.env.DREADNAUGHT_MIN_INTERVAL_MS) || 5 * 60 * 1000; // 5 minutes minimum between dreadnaughts
const DREADNAUGHT_MAX_INTERVAL = Number(process.env.DREADNAUGHT_MAX_INTERVAL_MS) || 15 * 60 * 1000; // 15 minutes maximum between dreadnaughts
const DREADNAUGHT_ACTIVITY_THRESHOLD = Number(process.env.DREADNAUGHT_ACTIVITY_THRESHOLD_MS) || 30000; // Player must be active within 30 seconds
const DREADNAUGHT_CHECK_INTERVAL = Number(process.env.DREADNAUGHT_CHECK_INTERVAL_MS) || 30000; // How often to run the check

let lastDreadnaughtSpawn = Date.now();
let nextDreadnaughtSpawn = Date.now() + DREADNAUGHT_MIN_INTERVAL + Math.random() * (DREADNAUGHT_MAX_INTERVAL - DREADNAUGHT_MIN_INTERVAL);

// Check for natural dreadnaught spawning periodically. Optimized to avoid allocating arrays on every check.
setInterval(() => {
  const logger = require('./logger');
  const now = Date.now();

  // Fast pass: count active players without creating arrays
  let activeCount = 0;
  for (const sid of Object.keys(playerLastActivity)) {
    if (!gameState.players[sid]) continue; // skip stale entries
    const last = playerLastActivity[sid] || 0;
    if (now - last < DREADNAUGHT_ACTIVITY_THRESHOLD) activeCount++;
  }

  logger.debug(`🔍 Dreadnaught spawn check: ${activeCount} active players, next spawn in ${Math.max(0, nextDreadnaughtSpawn - now)}ms`);

  const timeOk = now > nextDreadnaughtSpawn && now - lastDreadnaughtSpawn > DREADNAUGHT_MIN_INTERVAL;
  const noDreadnaughtPresent = !gameState.npcs.some((npc) => npc.type === 'dreadnaught');

  if (activeCount >= DREADNAUGHT_MIN_PLAYERS && timeOk && noDreadnaughtPresent) {
    logger.info(`🛸 NATURAL DREADNAUGHT SPAWN: ${activeCount} active players detected`);

    // Build a list of active player socket IDs only when we need to choose a target
    const activeIds = [];
    for (const sid of Object.keys(playerLastActivity)) {
      if (!gameState.players[sid]) continue;
      const last = playerLastActivity[sid] || 0;
      if (now - last < DREADNAUGHT_ACTIVITY_THRESHOLD) activeIds.push(sid);
    }

    if (activeIds.length === 0) {
      logger.warn('Dreadnaught spawn aborted: no active socket found after candidate selection');
      return;
    }

    const randomPlayerId = activeIds[Math.floor(Math.random() * activeIds.length)];
    const randomSocket = io.sockets.sockets.get(randomPlayerId);

    logger.debug(`🎯 Selected player ${randomPlayerId} for dreadnaught spawn (socket ${randomSocket ? 'found' : 'missing'})`);

    if (randomSocket) {
      randomSocket.emit('naturalDreadnaughtSpawn', {
        message: 'You have been chosen to face the Dreadnaught!',
        spawn: true,
      });

      io.emit('serverAnnouncement', {
        message: '⚠️ DREADNAUGHT THREAT DETECTED - PREPARE FOR BATTLE! ⚠️',
        color: '#ff4444',
        duration: 5000,
        priority: true,
      });

      logger.info('📢 Server announcement sent to all players about dreadnaught');
    } else {
      logger.warn(`❌ Failed to find socket for player ${randomPlayerId}`);
    }

    lastDreadnaughtSpawn = now;
    nextDreadnaughtSpawn = now + DREADNAUGHT_MIN_INTERVAL + Math.random() * (DREADNAUGHT_MAX_INTERVAL - DREADNAUGHT_MIN_INTERVAL);
    logger.debug(`📅 Next dreadnaught spawn scheduled for: ${new Date(nextDreadnaughtSpawn).toLocaleTimeString()}`);
  }
}, DREADNAUGHT_CHECK_INTERVAL);

// Connection handling
io.on('connection', (socket) => {
  // mark admin/analytics sockets from handshake auth if present
  try {
    if (socket.handshake && socket.handshake.auth && socket.handshake.auth.role === 'admin') {
      socket.isAdminSocket = true;
    }
  } catch (e) {}

  // also allow explicit identify from client as a fallback
  socket.on('identifyAdmin', () => { socket.isAdminSocket = true; });
  // Analytics event handler
  socket.on('analytics_event', (eventData) => {
    try {
      const clientIp =
        socket.request.connection.remoteAddress ||
        socket.request.headers['x-forwarded-for'] ||
        'unknown';
      // Basic per-socket rate limiting (simple sliding window)
      socket.analytics = socket.analytics || {};
      const now = Date.now();
      const windowMs = 60000; // 60s window
      const maxPerWindow = 600; // 600 events / minute (10/s) - adjust if needed
      if (
        !socket.analytics.windowStart ||
        now - socket.analytics.windowStart > windowMs
      ) {
        socket.analytics.windowStart = now;
        socket.analytics.windowCount = 0;
      }
      socket.analytics.windowCount = (socket.analytics.windowCount || 0) + 1;
      if (socket.analytics.windowCount > maxPerWindow) {
        // drop noisy client events
        console.warn(`Analytics rate limit exceeded for socket ${socket.id}`);
        return;
      }

      // Basic validation to avoid malformed/spoofed data
      const validEvent =
        eventData &&
        typeof eventData === 'object' &&
        typeof eventData.eventType === 'string' &&
        (typeof eventData.timestamp === 'number' || !eventData.timestamp);
      if (!validEvent) {
        console.warn(
          `Invalid analytics_event from ${socket.id}:`,
          eventData && eventData.eventType,
        );
        return;
      }

      // Forward to analytics
      analytics.processEvent(eventData, clientIp);

      // Also track in database analytics (persistent)
      if (dbAnalytics.initialized) {
        dbAnalytics.trackEvent(
          eventData.eventType,
          eventData.playerId,
          eventData.sessionId,
          {
            ...eventData,
            clientIp: clientIp,
            socketId: socket.id
          }
        ).catch(err => {
          // Don't let database errors break the game
          console.error('Database analytics error:', err);
        });
      }

      // Track mapping from socket -> playerId/sessionId so server can synthesize events on disconnect
      try {
        socket.analytics = socket.analytics || {};
        if (eventData.playerId) socket.analytics.playerId = eventData.playerId;
        if (eventData.sessionId)
          socket.analytics.sessionId = eventData.sessionId;
        socket.analytics.lastEventAt = Date.now();
      } catch (e) {
        // ignore mapping errors
      }
    } catch (error) {
      console.error('Error processing analytics event:', error);
    }
  });

  // Admin: Kick a player by socket ID
  socket.on('adminKickPlayer', (data) => {
    if (!data || !data.targetId) return;
    const targetSocket = io.sockets.sockets.get(data.targetId);
    if (targetSocket) {
      // Broadcast to all players that this player was kicked
      const kickedPlayer = gameState.players[data.targetId];
      const kickedName = kickedPlayer ? kickedPlayer.name : 'A player';
      io.emit('adminPlayerKicked', { id: data.targetId, name: kickedName });
      targetSocket.emit('kickedByAdmin');
      targetSocket.disconnect(true);
  logger.info(`Admin kicked player: ${data.targetId}`);
    }
  });
  const logger = require('./logger');
  logger.info(`Player connected: ${socket.id}`);
  logger.debug(`Connection origin: ${socket.request.headers.origin}`);
  logger.debug(`Connection referer: ${socket.request.headers.referer}`);
  logger.debug(`Connection host: ${socket.request.headers.host}`);

  // Set initial activity timestamp
  playerLastActivity[socket.id] = Date.now();

  // Handle requests for player count (without joining the game)
  socket.on('getPlayerCount', () => {
    // Get the current count of players
    const playerCount = Object.keys(gameState.players).length;

  // Send current player count to the requesting client
  socket.emit('playerCountUpdate', playerCount);

    console.log(
      `Player count requested by: ${socket.id}, current count: ${playerCount}`,
    );
  });

  // Player joined
  socket.on('playerJoin', (playerData) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    // Track player join in analytics
    const playerId = playerData.name || `Player-${socket.id.substring(0, 4)}`;
    analytics.processEvent(
      {
        sessionId: `session_${Date.now()}_${socket.id}`,
        playerId: playerId,
        eventType: 'session_start',
        timestamp: Date.now(),
        data: {
          socketId: socket.id,
          playerName: playerId,
        },
      },
      socket.request.connection.remoteAddress || 'unknown',
    );

    // Store analytics info on socket for disconnect handling
    socket.analytics = {
      playerId: playerId,
      sessionId: `session_${Date.now()}_${socket.id}`,
      startTime: Date.now(),
    };

    // Track session in database analytics (only if dbAnalytics exists and is initialized)
    if (dbAnalytics && dbAnalytics.initialized) {
      dbAnalytics.trackSession(
        socket.analytics.sessionId,
        playerId,
        new Date(socket.analytics.startTime),
        {
          socketId: socket.id,
          userAgent: socket.request.headers['user-agent'],
          origin: socket.request.headers.origin
        }
      ).catch(err => console.error('Database session tracking error:', err));
    }

    logger.info(
      `📊 Player joined analytics: ${playerId} (Active players: ${analytics.sessions.size})`,
    );

    // Add the player to the game state
    gameState.players[socket.id] = {
      id: socket.id,
      x: playerData.x || 0,
      y: playerData.y || 0,
      rotation: playerData.rotation || 0,
      health: playerData.health || 100,
      shield: playerData.shield || 0,
      maxShield: playerData.maxShield || 0,
      ship: playerData.ship || 'scout',
      name: playerData.name || `Player-${socket.id.substring(0, 4)}`,
      score: playerData.score || 0,
      wins: playerData.wins || 0,
      losses: playerData.losses || 0,
      credits: 0,
      color: playerData.color || getRandomColor(),
      shipColor: playerData.shipColor || '#7d7d7d',
      engineColor: playerData.engineColor || '#f66',
      shipSkin: playerData.shipSkin || 'none',
      avatar: playerData.avatar || 'han',
      skinEffectsEnabled:
        playerData.skinEffectsEnabled === undefined
          ? true
          : !!playerData.skinEffectsEnabled,
      // Visual engine state for client rendering
      thrustLevel:
        playerData.thrustLevel !== undefined ? playerData.thrustLevel : 0,
      afterburnerActive:
        playerData.afterburnerActive !== undefined
          ? !!playerData.afterburnerActive
          : false,
      projectiles: [],
      miningBeam: {
        active: false,
        targetX: 0,
        targetY: 0,
        intensity: 0,
      },
    };

    // Send the current asteroid field and powerups to the joining client so they sync immediately
    try {
      socket.emit('asteroidFieldUpdate', { asteroids: gameState.asteroids });
      socket.emit('worldUpdate', { asteroids: gameState.asteroids, powerups: gameState.powerups });
    } catch (e) {
      console.warn('Error sending asteroid field to joining client', e);
    }

    // Send the current game state to the new player
    socket.emit('gameState', gameState);

  // Send server runtime configuration (clients can enable/disable features accordingly)
  socket.emit('serverConfig', { serverPowerups: SERVER_POWERUPS_ENABLED });

    // Notify all clients about the new player
    socket.broadcast.emit('playerJoined', gameState.players[socket.id]);

    // Broadcast updated player count to all clients
    safeEmit('playerCountUpdate', Object.keys(gameState.players).length);
  
  // Ensure the world loop is running when at least one client connects
  startWorldLoop();

  logger.info(`Player ${gameState.players[socket.id].name} joined the game`);
  });

  // Player movement update
  socket.on('playerUpdate', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    const player = gameState.players[socket.id];
    if (player) {
      // Update player state (but NOT health - server manages health)
      player.x = data.x;
      player.y = data.y;
      player.rotation = data.rotation;
      player.velocity = data.velocity;
      // player.health = data.health; // REMOVED - server manages health, not clients
      player.shield = data.shield || 0;
      player.maxShield = data.maxShield || 0;
      player.ship = data.ship;
      player.color = data.color || player.color;
      player.shipColor = data.shipColor || player.shipColor;
      player.engineColor = data.engineColor || player.engineColor;
      player.shipSkin = data.shipSkin || player.shipSkin;
      player.avatar = data.avatar || player.avatar; // Update avatar data
      if (data.skinEffectsEnabled !== undefined) {
        player.skinEffectsEnabled = !!data.skinEffectsEnabled;
      }

      // Update stats from client (since client calculates scores immediately)
      if (data.score !== undefined) {
        const oldScore = player.score;
        player.score = data.score;
        if (oldScore !== player.score) {
          logger.debug(
            `SCORE UPDATE: Player ${player.name} score changed from ${oldScore} to ${player.score}`,
          );
        }
      }
      if (data.wins !== undefined) {
        const oldWins = player.wins;
        player.wins = data.wins;
        if (oldWins !== player.wins) {
          logger.debug(
            `WINS UPDATE: Player ${player.name} wins changed from ${oldWins} to ${player.wins}`,
          );
        }
      }
      if (data.losses !== undefined) {
        const oldLosses = player.losses;
        player.losses = data.losses;
        if (oldLosses !== player.losses) {
          logger.debug(
            `LOSSES UPDATE: Player ${player.name} losses changed from ${oldLosses} to ${player.losses}`,
          );
        }
      }

      // Update mining beam state
      if (data.miningBeam) {
        player.miningBeam = {
          active: data.miningBeam.active,
          targetX: data.miningBeam.targetX,
          targetY: data.miningBeam.targetY,
          intensity: data.miningBeam.intensity,
        };
      }

      // Update visual engine state if provided
      if (data.thrustLevel !== undefined) {
        player.thrustLevel = data.thrustLevel;
      }
      if (data.afterburnerActive !== undefined) {
        player.afterburnerActive = !!data.afterburnerActive;
      }

      // Broadcast the updated position to all other players
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        name: player.name,
        x: player.x,
        y: player.y,
        rotation: player.rotation,
        velocity: player.velocity,
        health: player.health,
        shield: player.shield,
        maxShield: player.maxShield,
        ship: player.ship,
        color: player.color,
        shipColor: player.shipColor,
        engineColor: player.engineColor,
        thrustLevel: player.thrustLevel || 0,
        afterburnerActive: !!player.afterburnerActive,
        shipSkin: player.shipSkin,
        avatar: player.avatar, // Include avatar data
        skinEffectsEnabled: player.skinEffectsEnabled,
        score: player.score,
        wins: player.wins,
        losses: player.losses,
        miningBeam: player.miningBeam,
      });
    }
  });

  // Low-latency thrust change relay
  socket.on('thrustChanged', (data) => {
    playerLastActivity[socket.id] = Date.now();
    const player = gameState.players[socket.id];
    if (player) {
      // Update server copy if provided
      if (data.thrustLevel !== undefined) player.thrustLevel = data.thrustLevel;
      if (data.afterburnerActive !== undefined)
        player.afterburnerActive = !!data.afterburnerActive;

      // Relay to other clients immediately
      socket.broadcast.emit('thrustChanged', {
        playerId: socket.id,
        thrustLevel: player.thrustLevel || 0,
        afterburnerActive: !!player.afterburnerActive,
      });
    }
  });

  // Ship skin immediate update event
  socket.on('shipSkinUpdate', (data) => {
    playerLastActivity[socket.id] = Date.now();
    const player = gameState.players[socket.id];
    if (!player) return;
    const newSkin =
      data && typeof data.skinId === 'string' ? data.skinId : 'none';
    player.shipSkin = newSkin;
    socket.broadcast.emit('shipSkinUpdate', {
      playerId: socket.id,
      skinId: newSkin,
    });
  });

  // Optional: skin effects toggle immediate broadcast (client can implement listener if desired)
  socket.on('skinEffectsToggle', (data) => {
    playerLastActivity[socket.id] = Date.now();
    const player = gameState.players[socket.id];
    if (!player) return;
    if (data && data.enabled !== undefined) {
      player.skinEffectsEnabled = !!data.enabled;
      socket.broadcast.emit('skinEffectsToggle', {
        playerId: socket.id,
        enabled: player.skinEffectsEnabled,
      });
    }
  });

  // Player fired a projectile
  socket.on('playerFire', (projectile) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    const player = gameState.players[socket.id];
    if (player) {
      // Add player ID to the projectile
      projectile.playerId = socket.id;

      // Add the projectile to the player's projectiles
      if (!player.projectiles) {
        player.projectiles = [];
      }
      player.projectiles.push(projectile);

      // Broadcast the fired projectile to all other players
      socket.broadcast.emit('projectileFired', {
        playerId: socket.id,
        projectile: projectile,
      });
    }
  });

  // Handle projectile explosions
  socket.on('projectileExplosion', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    // Broadcast the explosion to all other players
    socket.broadcast.emit('projectileExplosion', {
      x: data.x,
      y: data.y,
      radius: data.radius,
      type: data.type || 'rocket',
    });
  });

  // Handle direct projectile hits on players
  socket.on('projectileHit', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    logger.debug(
      `Projectile hit from ${socket.id} on target ${data.targetId} for ${data.damage} damage`,
    );

    // Validate the target exists
    if (!gameState.players[data.targetId]) {
  logger.warn(`Invalid target ${data.targetId} for projectile hit`);
      return;
    }

    const targetPlayer = gameState.players[data.targetId];
    const attackerPlayer = gameState.players[socket.id];

    // Apply damage logic (same as the hit handler but for players)
    const oldHealth = targetPlayer.health;
    const oldShield = targetPlayer.shield;
    let remainingDamage = data.damage;

    // Apply damage to shields first
    if (targetPlayer.shield > 0) {
      if (remainingDamage <= targetPlayer.shield) {
        targetPlayer.shield -= remainingDamage;
        remainingDamage = 0;
      } else {
        remainingDamage -= targetPlayer.shield;
        targetPlayer.shield = 0;
      }
    }

    // Apply remaining damage to health
    if (remainingDamage > 0) {
      targetPlayer.health -= remainingDamage;
      if (targetPlayer.health < 0) {
        targetPlayer.health = 0;
      }
    }

    logger.debug(
      `Player ${targetPlayer.name} hit by ${attackerPlayer?.name || 'unknown'} for ${data.damage} damage. Shield: ${oldShield} -> ${targetPlayer.shield}, Health: ${oldHealth} -> ${targetPlayer.health}`,
    );

    // Broadcast health update to all clients immediately
    io.emit('playerHealthUpdate', {
      id: data.targetId,
      health: targetPlayer.health,
      shield: targetPlayer.shield,
    });

    // Broadcast the hit effect to all clients including the target
    // Prefer an explicit attackerId (could be an NPC id) if provided by the client
    const resolvedAttackerId = data.attackerId || socket.id;
    io.emit('projectileHit', {
      targetId: data.targetId,
      position: data.position,
      damage: data.damage,
      attackerId: resolvedAttackerId,
    });

    // Check if player was destroyed
    if (targetPlayer.health <= 0) {
      targetPlayer.losses += 1;
        logger.info(
          `Player ${targetPlayer.name} was destroyed by ${attackerPlayer?.name || 'unknown'}!`,
        );

      // Award points to attacker
      if (attackerPlayer) {
        attackerPlayer.score += 500;
        attackerPlayer.credits += 250;

        // Broadcast attacker stats update
        io.emit('playerUpdate', {
          id: socket.id,
          score: attackerPlayer.score,
          credits: attackerPlayer.credits,
        });
      }

      // Broadcast player destroyed event
          // Resolve killer info (handles both player and NPC attackers)
          let killerInfo = {
            killerAvatar: attackerPlayer?.avatar || 'han',
            killerName: attackerPlayer?.name || `Player-${socket.id.substring(0, 4)}`,
            npcType: null,
          };

          // If attackerId refers to an NPC id, prefer NPC info
          if (typeof data.attackerId === 'string' && !gameState.players[data.attackerId]) {
            const npc = gameState.npcs.find((n) => n.id === data.attackerId);
            if (npc) {
              killerInfo.npcType = npc.type || null;
              // Human-friendly killer name for clients
              if (npc.type && /alien/i.test(npc.type)) killerInfo.killerName = 'Alien';
              else if (npc.type && /dreadnaught/i.test(npc.type)) killerInfo.killerName = 'Dreadnaught';
              else killerInfo.killerName = data.killerName || npc.type || 'An enemy';
              // NPCs don't have avatars - leave killerAvatar as provided or null
              killerInfo.killerAvatar = data.killerAvatar || null;
            }
          }

      // NOTE: Emitted payload fields for `playerDestroyed`:
      // {
      //   playerId: <id of victim>,
      //   attackerId: <id of attacker (socket id for players or npc id for NPCs)>,
      //   killerAvatar: <avatar key or null>,
      //   killerName: <friendly name - player name or NPC friendly name>,
      //   npcType: <raw npc type string or null>
      // }
      // DEBUG: Log before emitting playerDestroyed so we can trace events
          // Use provided attackerId when present (this allows NPC ids to be used)
          const emitAttackerId = data.attackerId || socket.id;
    logger.debug('DEBUG: Emitting playerDestroyed', {
            playerId: data.targetId,
            attackerId: emitAttackerId,
            killerAvatar: killerInfo.killerAvatar,
            killerName: killerInfo.killerName,
            npcType: killerInfo.npcType,
          });

          io.emit('playerDestroyed', {
            playerId: data.targetId,
            attackerId: emitAttackerId,
            killerAvatar: killerInfo.killerAvatar,
            killerName: killerInfo.killerName,
            npcType: killerInfo.npcType,
          });
    }
  });

  // Player hit something (asteroid, enemy, etc.)
  socket.on('hit', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    if (data.type === 'asteroid') {
      // Handle asteroid hit - server-side asteroid health management
      const asteroid = gameState.asteroids.find((a) => a.id === data.id);
      if (asteroid) {
        // Reduce asteroid health
        asteroid.health -= data.damage;

        logger.debug(
          `Asteroid ${data.id} hit for ${data.damage} damage. Health: ${asteroid.health}/${asteroid.health + data.damage}`,
        );

        // Check if asteroid is destroyed
        if (asteroid.health <= 0) {
          // Handle asteroid splitting before removal
          const fragments = [];
          if (asteroid.radius > 30) {
            // Only split larger asteroids
            if (Math.random() < 0.7) {
              // 70% chance to split
              const fragmentCount = 2 + Math.floor(Math.random() * 3); // 2-4 fragments
              logger.debug(
                `Creating ${fragmentCount} fragments for asteroid ${data.id} with radius ${asteroid.radius}`,
              );

              for (let i = 0; i < fragmentCount; i++) {
                // Generate a random seed for this fragment
                const seed = Math.floor(Math.random() * 1e9);
                function seededRandom(seed) {
                  var x = Math.sin(seed++) * 10000;
                  return x - Math.floor(x);
                }
                const angle =
                  ((Math.PI * 2) / fragmentCount) * i +
                  seededRandom(seed) * 0.5;
                const distance = 20 + seededRandom(seed + 1) * 30;
                const fragmentRadius =
                  asteroid.radius * 0.3 +
                  seededRandom(seed + 2) * asteroid.radius * 0.2;

                // Calculate fragment velocity for movement
                const velocityMagnitude = 30 + seededRandom(seed + 5) * 40; // Random speed between 30-70
                const velocityAngle =
                  angle + (seededRandom(seed + 6) - 0.5) * Math.PI * 0.5; // Slight random direction

                const fragment = {
                  id: `fragment-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                  x: asteroid.x + Math.cos(angle) * distance,
                  y: asteroid.y + Math.sin(angle) * distance,
                  radius: fragmentRadius,
                  health: fragmentRadius * 1.5, // Fragments are a bit weaker
                  type: asteroid.type,
                  rotation: seededRandom(seed + 3) * Math.PI * 2,
                  rotationSpeed: (seededRandom(seed + 4) - 0.5) * 0.3,
                  velocityX: Math.cos(velocityAngle) * velocityMagnitude,
                  velocityY: Math.sin(velocityAngle) * velocityMagnitude,
                  seed: seed,
                };
                fragments.push(fragment);
                gameState.asteroids.push(fragment);
                logger.debug(
                  `Created fragment ${fragment.id} at (${fragment.x}, ${fragment.y}) with radius ${fragment.radius}, seed ${seed}`,
                );
              }
            } else {
              logger.debug(
                `Asteroid ${data.id} destroyed without splitting (30% chance)`,
              );
            }
          } else {
            logger.debug(
              `Asteroid ${data.id} too small to split (radius: ${asteroid.radius})`,
            );
          }

          // Remove original asteroid from server state
          const asteroidIndex = gameState.asteroids.findIndex(
            (a) => a.id === data.id,
          );
          if (asteroidIndex >= 0) {
            gameState.asteroids.splice(asteroidIndex, 1);
          }

          // Broadcast asteroid destruction and any fragments to all clients
          io.emit('asteroidDestroyed', {
            asteroidId: data.id,
            destroyedBy: socket.id,
            position: { x: asteroid.x, y: asteroid.y },
            fragments: fragments, // Include fragment data
          });

          logger.info(
            `Asteroid ${data.id} destroyed by player ${socket.id}. Created ${fragments.length} fragments. Broadcasting to all clients. ${gameState.asteroids.length} asteroids remaining.`,
          );
        } else {
          // Broadcast asteroid hit (damage) to all clients
          io.emit('asteroidHit', {
            asteroidId: data.id,
            damage: data.damage,
            playerId: socket.id,
            remainingHealth: asteroid.health,
          });
        }
      }

      // Award points and credits to the player
      if (gameState.players[socket.id]) {
        const oldScore = gameState.players[socket.id].score;
        gameState.players[socket.id].score += data.points || 0;
        gameState.players[socket.id].credits += data.credits || 0;
        logger.debug(
          `Player ${gameState.players[socket.id].name} scored ${data.points || 0} points. Score: ${oldScore} -> ${gameState.players[socket.id].score}`,
        );
        // Broadcast updated stats to all clients
        logger.debug(
          `Broadcasting score update for asteroid kill: ${socket.id}`,
        );
        io.emit('playerStatsUpdate', {
          id: socket.id,
          score: gameState.players[socket.id].score,
          wins: gameState.players[socket.id].wins,
          losses: gameState.players[socket.id].losses,
        });
      }

      // Check if asteroid is destroyed
      if (data.destroyed) {
        socket.broadcast.emit('asteroidDestroyed', {
          asteroidId: data.id,
          playerId: socket.id,
        });
      }
    } else if (data.type === 'player') {
      // Handle player hit
      socket.broadcast.emit('playerHit', {
        targetId: data.targetId,
        damage: data.damage,
        attackerId: socket.id,
      });

      // Update target player health and shields (same logic as client takeDamage)
      if (gameState.players[data.targetId]) {
        const player = gameState.players[data.targetId];
        const oldHealth = player.health;
        const oldShield = player.shield;
        let remainingDamage = data.damage;

        // Apply damage to shields first (same as client logic)
        if (player.shield > 0) {
          if (remainingDamage <= player.shield) {
            // Shield absorbs all damage
            player.shield -= remainingDamage;
            remainingDamage = 0;
          } else {
            // Shield depleted, remaining damage goes to health
            remainingDamage -= player.shield;
            player.shield = 0;
          }
        }

        // Apply remaining damage to health
        if (remainingDamage > 0) {
          player.health -= remainingDamage;
        }

        console.log(
          `Player ${player.name} took ${data.damage} damage. Shield: ${oldShield} -> ${player.shield}, Health: ${oldHealth} -> ${player.health}`,
        );

        // Broadcast updated health and shield to all clients
        console.log(
          `Broadcasting health/shield update for player ${data.targetId}: health = ${player.health}, shield = ${player.shield}`,
        );
        io.emit('playerHealthUpdate', {
          id: data.targetId,
          health: player.health,
          shield: player.shield,
        });

        // Check if player is destroyed
        if (player.health <= 0) {
          // Increment losses for the player who died
          player.losses += 1;
          console.log(
            `Player ${player.name} was destroyed by player ${gameState.players[socket.id]?.name}! Losses: ${player.losses}`,
          );

          // Resolve killer info (handles both player and NPC attackers)
          let killerInfo = {
            killerAvatar: gameState.players[socket.id]?.avatar || 'han',
            killerName:
              gameState.players[socket.id]?.name ||
              `Player-${socket.id.substring(0, 4)}`,
            npcType: null,
          };

          if (typeof data.attackerId === 'string' && !gameState.players[data.attackerId]) {
            const npc = gameState.npcs.find((n) => n.id === data.attackerId);
            if (npc) {
              killerInfo.npcType = npc.type || null;
              if (npc.type && /alien/i.test(npc.type)) killerInfo.killerName = 'Alien';
              else if (npc.type && /dreadnaught/i.test(npc.type)) killerInfo.killerName = 'Dreadnaught';
              else killerInfo.killerName = data.killerName || npc.type || 'An enemy';
              killerInfo.killerAvatar = data.killerAvatar || null;
            }
          }

          io.emit('playerDestroyed', {
            playerId: data.targetId,
            attackerId: socket.id,
            killerAvatar: killerInfo.killerAvatar,
            killerName: killerInfo.killerName,
            npcType: killerInfo.npcType,
          });

          // Award points to the attacker
          if (gameState.players[socket.id]) {
            gameState.players[socket.id].score += 500; // Points for defeating a player
            gameState.players[socket.id].credits += 250; // Credits for defeating a player

            console.log(
              `Player ${socket.id} destroyed player ${data.targetId}. Awarded 500 points and 250 credits.`,
            );

            // Broadcast updated attacker stats
            io.emit('playerUpdate', {
              id: socket.id,
              score: gameState.players[socket.id].score,
              credits: gameState.players[socket.id].credits,
            });
          }
        }
      }
    }
  });

  // Player collision with another player or asteroid
  socket.on('playerCollision', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    // Authoritative collision resolution server-side
    try {
      const srcId = data.sourceId;
      const tgtId = data.targetId;
      const src = gameState.players[srcId];
      const tgt = gameState.players[tgtId];

      if (!src || !tgt) {
        // One of the players is missing - fallback to broadcasting for visuals
        socket.broadcast.emit('playerCollision', {
          sourceId: data.sourceId,
          targetId: data.targetId,
          position: data.position,
          velocity: data.velocity,
        });
        return;
      }

      // Basic symmetric elastic impulse along collision normal (equal masses)
      const dx = src.x - tgt.x;
      const dy = src.y - tgt.y;
      let distance = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const nx = dx / distance;
      const ny = dy / distance;

      // Velocities (safe defaults)
      const v1x =
        src.velocity && typeof src.velocity.x === 'number' ? src.velocity.x : 0;
      const v1y =
        src.velocity && typeof src.velocity.y === 'number' ? src.velocity.y : 0;
      const v2x =
        tgt.velocity && typeof tgt.velocity.x === 'number' ? tgt.velocity.x : 0;
      const v2y =
        tgt.velocity && typeof tgt.velocity.y === 'number' ? tgt.velocity.y : 0;

      // Relative velocity along normal
      const relVel = (v1x - v2x) * nx + (v1y - v2y) * ny;

      // Restitution (bounciness)
      const restitution = 0.6; // tweakable

      // Minimum impulse magnitude to ensure soft touches still produce pushback
      const MIN_IMPULSE = 70; // px/sec equivalent, tune this to taste

      // Only apply impulse if closing (relVel < 0)
      if (relVel < 0) {
        // Equal mass impulse magnitude j = -(1+e) * relVel / (1/m1 + 1/m2) with m1=m2=1 -> divide by 2
        let j = (-(1 + restitution) * relVel) / 2;

        // Enforce a minimum impulse so very soft closing velocities still cause a perceptible push
        if (Math.abs(j) < MIN_IMPULSE) {
          j = Math.sign(j || -1) * MIN_IMPULSE;
        }

        // Apply impulse
        const newV1x = v1x + j * nx;
        const newV1y = v1y + j * ny;
        const newV2x = v2x - j * nx;
        const newV2y = v2y - j * ny;

        src.velocity = { x: newV1x, y: newV1y };
        tgt.velocity = { x: newV2x, y: newV2y };
      } else {
        // Not closing (could be grazing or already separating) — if there is penetration
        // (overlap) apply a modest separation impulse so soft touches still feel like a push.
        const radius = 15;
        const penetration = radius + radius - distance; // both radii
        if (penetration > 0) {
          const sepImpulse = MIN_IMPULSE * 0.5; // smaller than full min impulse
          const newV1x = v1x + sepImpulse * nx;
          const newV1y = v1y + sepImpulse * ny;
          const newV2x = v2x - sepImpulse * nx;
          const newV2y = v2y - sepImpulse * ny;
          src.velocity = { x: newV1x, y: newV1y };
          tgt.velocity = { x: newV2x, y: newV2y };
        }
      }

      // Simple separation to prevent overlap (assume collision radius ~15 each)
      const radius = 15;
      const penetration = radius + radius - distance; // both radii
      if (penetration > 0) {
        const sep = penetration / 2 + 0.1; // small extra buffer
        src.x += nx * sep;
        src.y += ny * sep;
        tgt.x -= nx * sep;
        tgt.y -= ny * sep;
      }

      // Broadcast updated positions/velocities for both players so clients reconcile immediately
      io.emit('playerMoved', {
        id: srcId,
        x: src.x,
        y: src.y,
        rotation: src.rotation,
        velocity: src.velocity,
      });
      io.emit('playerMoved', {
        id: tgtId,
        x: tgt.x,
        y: tgt.y,
        rotation: tgt.rotation,
        velocity: tgt.velocity,
      });

      // Also emit a collision visual/sound event to all clients
      io.emit('playerCollision', {
        sourceId: srcId,
        targetId: tgtId,
        position: { x: (src.x + tgt.x) / 2, y: (src.y + tgt.y) / 2 },
        // Provide both players' resolved velocities so clients can apply
        // accurate immediate visual impulses without waiting for separate
        // playerMoved events to reconcile.
        sourceVelocity: src.velocity,
        targetVelocity: tgt.velocity,
      });

      console.log(`Resolved collision server-side: ${srcId} <-> ${tgtId}`);
    } catch (err) {
      console.error('Error resolving playerCollision:', err);
      // fallback: broadcast the original collision for visuals
      socket.broadcast.emit('playerCollision', {
        sourceId: data.sourceId,
        targetId: data.targetId,
        position: data.position,
        velocity: data.velocity,
      });
    }
  });

  // Player death by asteroid
  socket.on('playerDestroyedByAsteroid', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    if (gameState.players[socket.id]) {
      // Increment losses for the player who died
      gameState.players[socket.id].losses += 1;
      console.log(
        `Player ${gameState.players[socket.id].name} was destroyed by an asteroid! Losses: ${gameState.players[socket.id].losses}`,
      );

      // Broadcast the asteroid death to all clients with position data for explosion effects
      io.emit('playerDestroyedByAsteroid', {
        playerId: socket.id,
        playerName: gameState.players[socket.id].name,
        x: gameState.players[socket.id].x || 0,
        y: gameState.players[socket.id].y || 0,
        rotation: gameState.players[socket.id].rotation || 0,
      });

      // Broadcast updated stats to all clients
      io.emit('playerStatsUpdate', {
        id: socket.id,
        score: gameState.players[socket.id].score,
        wins: gameState.players[socket.id].wins,
        losses: gameState.players[socket.id].losses,
      });
    }
  });

  // Player respawn
  socket.on('respawn', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    if (gameState.players[socket.id]) {
      gameState.players[socket.id].health = 100;
      gameState.players[socket.id].x = data.x || 0;
      gameState.players[socket.id].y = data.y || 0;

      // DEBUG: Log before broadcasting playerRespawned
    logger.debug('DEBUG: Broadcasting playerRespawned', {
        id: socket.id,
        x: gameState.players[socket.id].x,
        y: gameState.players[socket.id].y,
      });

      socket.broadcast.emit('playerRespawned', {
        id: socket.id,
        x: gameState.players[socket.id].x,
        y: gameState.players[socket.id].y,
      });

      // Emit analytics respawn event so server records life start
      try {
        // Only create analytics event if we have proper analytics data
        if (
          socket.analytics &&
          socket.analytics.playerId &&
          socket.analytics.sessionId
        ) {
          const clientIp =
            socket.request.connection.remoteAddress ||
            socket.request.headers['x-forwarded-for'] ||
            'unknown';
          const respawnEvent = {
            sessionId: socket.analytics.sessionId,
            playerId: socket.analytics.playerId,
            eventType: 'respawn',
            timestamp: Date.now(),
            data: {
              x: gameState.players[socket.id].x,
              y: gameState.players[socket.id].y,
            },
          };
          analytics.processEvent(respawnEvent, clientIp);
        }
      } catch (e) {
        // ignore analytics errors
      }
    }
  });

  // Player purchased or upgraded
  socket.on('playerPurchase', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    if (gameState.players[socket.id]) {
      // Update player stats based on purchase
      if (data.type === 'ship') {
        gameState.players[socket.id].ship = data.id;
      } else if (data.type === 'weapon') {
        gameState.players[socket.id].currentWeapon = data.id;
      }

      // Update player credits
      gameState.players[socket.id].credits = data.credits;

      // Broadcast the upgrade to other players if relevant
      if (data.type === 'ship') {
        // Keep both legacy 'ship' and new 'currentShip' in server state
        gameState.players[socket.id].currentShip = data.id;
        socket.broadcast.emit('playerShipChanged', {
          id: socket.id,
          ship: data.id,
          currentShip: data.id,
          shipSkin: 'none',
        });
      }
    }
    // Also emit server-side analytics for purchases (in case client didn't)
    try {
      const clientIp =
        socket.request.connection.remoteAddress ||
        socket.request.headers['x-forwarded-for'] ||
        'unknown';
      const purchaseEvent = {
        sessionId:
          socket.analytics && socket.analytics.sessionId
            ? socket.analytics.sessionId
            : `session_${Date.now()}_${socket.id}`,
        playerId:
          socket.analytics && socket.analytics.playerId
            ? socket.analytics.playerId
            : socket.id,
        eventType: 'shop_purchase',
        timestamp: Date.now(),
        data: {
          type: data.type,
          item: data.id,
          cost: data.cost || 0,
          credits: data.credits || null,
        },
      };
      analytics.processEvent(purchaseEvent, clientIp);
    } catch (e) {
      // ignore analytics errors
    }
  });

  // Handle ship color updates
  socket.on('shipColorUpdate', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    if (gameState.players[socket.id]) {
      // Update player's ship color
      gameState.players[socket.id].shipColor = data.color;

      // Broadcast the ship color change to all other players
      socket.broadcast.emit('shipColorUpdate', {
        playerId: socket.id,
        color: data.color,
      });

        logger.debug(
          `Player ${gameState.players[socket.id].name} changed ship color to ${data.color}`,
        );
    }
  });

  // Handle explicit ship change events from client (e.g., selecting new ship in shop)
  socket.on('playerShipChanged', (data) => {
    playerLastActivity[socket.id] = Date.now();
    if (!gameState.players[socket.id]) return;
    const newShip = data.currentShip || data.ship;
    if (newShip) {
      gameState.players[socket.id].ship = newShip;
      gameState.players[socket.id].currentShip = newShip;
    }
    if (data.shipSkin !== undefined) {
      gameState.players[socket.id].shipSkin = data.shipSkin;
    }

    // Broadcast to others the updated ship and skin
    socket.broadcast.emit('playerShipChanged', {
      id: socket.id,
      ship: gameState.players[socket.id].ship,
      currentShip: gameState.players[socket.id].currentShip,
      shipSkin: gameState.players[socket.id].shipSkin || 'none',
    });
  });

  // Handle engine color updates
  socket.on('engineColorUpdate', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    if (gameState.players[socket.id]) {
      // Update player's engine color
      gameState.players[socket.id].engineColor = data.color;

      // Broadcast the engine color change to all other players
      socket.broadcast.emit('engineColorUpdate', {
        playerId: socket.id,
        color: data.color,
      });

      logger.debug(
        `Player ${gameState.players[socket.id].name} changed engine color to ${data.color}`,
      );
    }
  });

  // Handle ship skin updates
  socket.on('shipSkinUpdate', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    if (gameState.players[socket.id]) {
      // Update player's ship skin
      gameState.players[socket.id].shipSkin = data.skinId;

      // Broadcast the ship skin change to all other players
      socket.broadcast.emit('shipSkinUpdate', {
        playerId: socket.id,
        skinId: data.skinId,
      });

      logger.debug(
        `Player ${gameState.players[socket.id].name} changed ship skin to ${data.skinId}`,
      );
    }
  });

  // Player requested data for another player (typically for respawn)
  socket.on('requestPlayerData', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    // Check if requested player exists and send their data
    if (data.playerId && gameState.players[data.playerId]) {
      socket.emit('playerData', {
        id: data.playerId,
        name: gameState.players[data.playerId].name,
        ship: gameState.players[data.playerId].ship,
        color: gameState.players[data.playerId].color,
      });

      console.log(
        `Player ${socket.id} requested data for player ${data.playerId}`,
      );
    }
  });

  // Player name change
  socket.on('playerNameChange', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    if (gameState.players[socket.id]) {
      // Store the old name for the message
      const oldName = gameState.players[socket.id].name;

      // Update the player's name
      gameState.players[socket.id].name = data.name;

      console.log(
        `Player ${socket.id} changed name from ${oldName} to ${data.name}`,
      );

      // Notify all clients about the name change
      io.emit('playerNameChanged', {
        id: socket.id,
        oldName: oldName,
        newName: data.name,
      });
    }
  });

  // Handle shield disruption events
  socket.on('shieldDisruption', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    // Relay the shield disruption event to all clients
    // The clients will determine if they are the target
    io.emit('shieldDisruption', {
      targetId: data.targetId,
      duration: data.duration,
      attackerId: socket.id,
    });

    console.log(
      `Shield disruption: ${socket.id} -> ${data.targetId} for ${data.duration}s`,
    );
  });

  // Handle Impact Deflector activation events
  socket.on('impactDeflectorActivated', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    // Relay the deflector activation to all other clients
    socket.broadcast.emit('impactDeflectorActivated', {
      playerId: socket.id,
      x: data.x,
      y: data.y,
      duration: data.duration,
    });

    console.log(
      `Impact Deflector activated by player ${socket.id} at (${data.x}, ${data.y})`,
    );
  });

  // Handle Impact Deflector deactivation events
  socket.on('impactDeflectorDeactivated', (data) => {
    // Update activity timestamp  
    playerLastActivity[socket.id] = Date.now();

    // Relay the deflector deactivation to all other clients
    socket.broadcast.emit('impactDeflectorDeactivated', {
      playerId: socket.id,
    });

    console.log(`Impact Deflector deactivated by player ${socket.id}`);
  });

  // Handle Impact Deflector collision events
  socket.on('impactDeflectorImpact', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();

    // Relay the deflector impact effect to all other clients
    socket.broadcast.emit('impactDeflectorImpact', {
      playerId: socket.id,
      x: data.x,
      y: data.y,
      asteroidX: data.asteroidX,
      asteroidY: data.asteroidY,
    });

    console.log(
      `Impact Deflector collision by player ${socket.id} at (${data.x}, ${data.y})`,
    );
  });

  // Handle NPC spawn events
  socket.on('npcSpawn', (npcData) => {
    playerLastActivity[socket.id] = Date.now();

    // Add NPC to server game state
    gameState.npcs.push({
      ...npcData,
      spawnerId: socket.id,
      spawnTime: Date.now(),
    });

    // Broadcast NPC spawn to all other players
    socket.broadcast.emit('npcSpawn', npcData);

    console.log(
      `NPC spawned: ${npcData.type} (${npcData.id}) by player ${socket.id}`,
    );
  });

  // Handle NPC destruction events
  socket.on('npcDestroyed', (data) => {
    playerLastActivity[socket.id] = Date.now();

    // Remove NPC from server game state
    gameState.npcs = gameState.npcs.filter((npc) => npc.id !== data.npcId);

    // Broadcast NPC destruction to all other players
    socket.broadcast.emit('npcDestroyed', data);

    console.log(`NPC destroyed: ${data.npcId} by player ${socket.id}`);
  });

  // Handle NPC leaving events
  socket.on('npcLeaving', (data) => {
    playerLastActivity[socket.id] = Date.now();

    // Remove NPC from server game state
    gameState.npcs = gameState.npcs.filter((npc) => npc.id !== data.npcId);

    // Broadcast NPC leaving to all other players
    socket.broadcast.emit('npcLeaving', data);

    console.log(`NPC leaving: ${data.npcId}`);
  });

  // Handle Dreadnaught reward distribution to ALL players
  socket.on('dreadnaughtReward', (data) => {
    playerLastActivity[socket.id] = Date.now();

    console.log(`Dreadnaught destroyed! Distributing rewards to all players: ${data.credits} credits, ${data.gems} gems`);

    // Send reward to ALL connected players (including the one who sent it)
    io.emit('dreadnaughtReward', {
      credits: data.credits,
      gems: data.gems,
      npcId: data.npcId
    });
  });

  // Handle admin NPC clear events
  socket.on('npcClearAll', (data) => {
    playerLastActivity[socket.id] = Date.now();

    // Clear all NPCs from server game state
    gameState.npcs = [];

    // Broadcast NPC clear to all other players
    socket.broadcast.emit('npcClearAll', data);

    console.log(`All NPCs cleared by admin ${socket.id}`);
  });

  // Handle admin request for dreadnaught schedule info
  socket.on('getDreadnaughtSchedule', () => {
    const now = Date.now();
    const timeUntilNext = Math.max(0, nextDreadnaughtSpawn - now);
    const activePlayers = Object.keys(gameState.players).filter((playerId) => {
      const lastActivity = playerLastActivity[playerId] || 0;
      return now - lastActivity < DREADNAUGHT_ACTIVITY_THRESHOLD;
    }).length;

    socket.emit('dreadnaughtScheduleInfo', {
      nextSpawnTime: nextDreadnaughtSpawn,
      timeUntilNext: timeUntilNext,
      lastSpawnTime: lastDreadnaughtSpawn,
      activePlayers: activePlayers,
      minPlayersNeeded: DREADNAUGHT_MIN_PLAYERS,
      dreadnaughtActive: gameState.npcs.some(
        (npc) => npc.type === 'dreadnaught',
      ),
    });
  });

  // Handle admin force next dreadnaught spawn
  socket.on('forceNextDreadnaught', () => {
    playerLastActivity[socket.id] = Date.now();

    // Set next spawn to now (will trigger on next check)
    nextDreadnaughtSpawn = Date.now();

    console.log(`Admin ${socket.id} forced next dreadnaught spawn`);
    socket.emit(
      'adminMessage',
      'Next dreadnaught spawn triggered! It will spawn within 30 seconds if conditions are met.',
    );
  });

  // Handle NPC state updates (position, rotation, etc.)
  socket.on('npcUpdate', (updateData) => {
    playerLastActivity[socket.id] = Date.now();

    // Update NPC in server game state
    const npc = gameState.npcs.find(
      (npc) => npc.id === updateData.id && npc.spawnerId === socket.id,
    );
    if (npc) {
      npc.x = updateData.x;
      npc.y = updateData.y;
      npc.rotation = updateData.rotation;
      npc.state = updateData.state;
      npc.health = updateData.health;
      npc.lastUpdate = Date.now();
    }

    // Broadcast NPC update to all other players
    socket.broadcast.emit('npcUpdate', updateData);
  });

  // Handle NPC projectiles
  socket.on('npcProjectile', (projectileData) => {
    playerLastActivity[socket.id] = Date.now();

    // Broadcast NPC projectile to all other players
    socket.broadcast.emit('npcProjectile', projectileData);
  });

  // Handle NPC projectile hitting remote players
  socket.on('npcProjectileHit', (hitData) => {
    playerLastActivity[socket.id] = Date.now();

    // Forward the damage to the specific player
    const targetSocket = io.sockets.sockets.get(hitData.playerId);
    if (targetSocket) {
      // Include attackerId if provided (the NPC id) so server can attribute kills
      targetSocket.emit('npcProjectileHit', {
        damage: hitData.damage,
        projectileType: hitData.projectileType,
        attackerId: hitData.attackerId || null,
      });
      console.log(
        `NPC projectile hit forwarded to player ${hitData.playerId} for ${hitData.damage} damage`,
      );
    }

    // Authoritative server-side damage application for NPC projectiles
    // This ensures kills caused by NPC projectiles are recorded and broadcast
    // with the NPC as the attacker.
    try {
      if (gameState.players[hitData.playerId]) {
        const targetPlayer = gameState.players[hitData.playerId];
        const oldHealth = targetPlayer.health;
        const oldShield = targetPlayer.shield;
        let remainingDamage = hitData.damage || 0;

        // Apply to shield first
        if (targetPlayer.shield > 0) {
          if (remainingDamage <= targetPlayer.shield) {
            targetPlayer.shield -= remainingDamage;
            remainingDamage = 0;
          } else {
            remainingDamage -= targetPlayer.shield;
            targetPlayer.shield = 0;
          }
        }

        // Apply remaining to health
        if (remainingDamage > 0) {
          targetPlayer.health -= remainingDamage;
          if (targetPlayer.health < 0) targetPlayer.health = 0;
        }

        // Broadcast updated health/shield to everyone
        io.emit('playerHealthUpdate', {
          id: hitData.playerId,
          health: targetPlayer.health,
          shield: targetPlayer.shield,
        });

        // Broadcast projectile hit visual/effect to all clients
        const resolvedAttackerId = hitData.attackerId || socket.id;
        io.emit('projectileHit', {
          targetId: hitData.playerId,
          position: hitData.position || null,
          damage: hitData.damage,
          attackerId: resolvedAttackerId,
        });

        // If the player was killed by this hit, resolve killer info and emit playerDestroyed
        if (targetPlayer.health <= 0) {
          targetPlayer.losses = (targetPlayer.losses || 0) + 1;

          // Resolve killer info (favor NPC info if attackerId refers to an NPC)
          let killerInfo = {
            killerAvatar: null,
            killerName: null,
            npcType: null,
          };

          const attackerId = hitData.attackerId || socket.id;
          if (typeof attackerId === 'string' && !gameState.players[attackerId]) {
            const npc = gameState.npcs.find((n) => n.id === attackerId);
            if (npc) {
              killerInfo.npcType = npc.type || null;
              if (npc.type && /alien/i.test(npc.type)) killerInfo.killerName = 'Alien';
              else if (npc.type && /dreadnaught/i.test(npc.type)) killerInfo.killerName = 'Dreadnaught';
              else killerInfo.killerName = npc.type || 'An enemy';
              killerInfo.killerAvatar = null;
            }
          } else if (gameState.players[attackerId]) {
            killerInfo.killerAvatar = gameState.players[attackerId].avatar || 'han';
            killerInfo.killerName = gameState.players[attackerId].name || `Player-${attackerId.substring(0,4)}`;
          } else {
            // fallback
            killerInfo.killerName = 'An enemy';
          }

          console.log(`Player ${targetPlayer.name} was destroyed by ${killerInfo.killerName || attackerId}`);

          // Emit playerDestroyed with the resolved attacker id
          io.emit('playerDestroyed', {
            playerId: hitData.playerId,
            attackerId: attackerId,
            killerAvatar: killerInfo.killerAvatar,
            killerName: killerInfo.killerName,
            npcType: killerInfo.npcType,
          });

          // Broadcast updated stats
          io.emit('playerStatsUpdate', {
            id: hitData.playerId,
            score: targetPlayer.score,
            wins: targetPlayer.wins,
            losses: targetPlayer.losses,
          });
        }
      }
    } catch (err) {
      console.error('Error applying npcProjectileHit on server:', err);
    }
  });

  // Ping/heartbeat from client (to keep connection alive and reset inactivity timer)
  socket.on('ping', () => {
    playerLastActivity[socket.id] = Date.now();
  });

  // Handle asteroid destruction from players (for syncing fragments and powerups)
  socket.on('asteroidDestroyed', (data) => {
    playerLastActivity[socket.id] = Date.now();

    console.log(
      `🌟 SERVER: Player ${socket.id} destroyed asteroid ${data.asteroidId}`,
    );
    console.log(
      `🌟 SERVER: Fragments: ${data.fragments ? data.fragments.length : 0}, Powerups: ${data.powerups ? data.powerups.length : 0}`,
    );

    // Persist the asteroid removal in the authoritative server state so
    // late-joining clients will not see an already-destroyed asteroid.
    try {
      const idx = gameState.asteroids.findIndex((a) => a.id === data.asteroidId);
      if (idx !== -1) {
        gameState.asteroids.splice(idx, 1);
        console.log(`🌟 SERVER: Removed asteroid ${data.asteroidId} from gameState`);
      } else {
        console.log(`🌟 SERVER: Asteroid ${data.asteroidId} not found in gameState`);
      }
    } catch (e) {
      console.warn('Error removing asteroid from gameState', e);
    }

    // Optionally persist powerups server-side and assign ids when enabled
    let persistedPowerups = data.powerups;
    if (SERVER_POWERUPS_ENABLED && Array.isArray(data.powerups) && data.powerups.length > 0) {
      persistedPowerups = [];
      data.powerups.forEach((p) => {
        const pu = {
          id: powerupIdCounter++,
          x: p.x,
          y: p.y,
          type: p.type || p.t || 'health',
          radius: p.radius || 15,
        };
        gameState.powerups.push(pu);
        persistedPowerups.push(pu);
        // record debug event if available
        try { pushPowerupEvent({ action: 'add', source: 'asteroidDestroyed', createdBy: socket.id, powerup: pu }); } catch (e) {}
      });
    }

    // Broadcast the destruction to all other players (lighter-weight behavior)
    console.log(`🌟 SERVER: Broadcasting asteroid destruction to other players`);
    // If client included an NPC spawn, persist it server-side and broadcast it to others
    let npcToBroadcast = null;
    try {
      if (data.npcSpawned && data.npcSpawned.id) {
        // Avoid duplicate NPC ids on server
        const exists = gameState.npcs.find((n) => n.id === data.npcSpawned.id);
        if (!exists) {
          const npcObj = { ...data.npcSpawned, spawnerId: socket.id, spawnTime: Date.now() };
          gameState.npcs.push(npcObj);
          npcToBroadcast = data.npcSpawned;
          console.log(`🌟 SERVER: Persisted NPC ${data.npcSpawned.id} from player ${socket.id}`);
        } else {
          console.log(`🌟 SERVER: NPC ${data.npcSpawned.id} already exists on server, skipping persist`);
          npcToBroadcast = data.npcSpawned; // still broadcast so others can create remote instance
        }
      }
    } catch (e) {
      console.warn('Error persisting npcSpawned from client', e);
    }

    socket.broadcast.emit('playerAsteroidDestroyed', {
      playerId: socket.id,
      asteroidId: data.asteroidId,
      position: data.position,
      fragments: data.fragments,
      powerups: persistedPowerups,
      explosion: data.explosion,
      npcSpawned: npcToBroadcast,
    });
  });

  // If server-authoritative powerups are enabled, register handlers for spawn/collect
  if (SERVER_POWERUPS_ENABLED) {
    // Client requests server to spawn a powerup at coords (or random)
    socket.on('requestSpawnPowerup', (data) => {
      try {
        const x = typeof data.x === 'number' ? data.x : (Math.random() - 0.5) * WORLD_SIZE;
        const y = typeof data.y === 'number' ? data.y : (Math.random() - 0.5) * WORLD_SIZE;
        const pu = { id: powerupIdCounter++, x, y, type: data.type || 'health', radius: 15 };
        gameState.powerups.push(pu);
        pushPowerupEvent({ action: 'add', source: 'requestSpawnPowerup', createdBy: socket.id, powerup: pu });
        io.emit('powerupAdded', pu);
      } catch (e) { console.error('Error handling requestSpawnPowerup', e); }
    });

    // Client notifies it collected a server-owned powerup
    socket.on('powerupCollected', (data) => {
      try {
        if (!data || typeof data.id === 'undefined') return;
        const id = data.id;
        const idx = gameState.powerups.findIndex((p) => p.id === id);
        if (idx === -1) return;
        const [removed] = gameState.powerups.splice(idx, 1);
        pushPowerupEvent({ action: 'remove', source: 'powerupCollected', removedBy: socket.id, powerup: removed });
        io.emit('powerupRemoved', { id: removed.id, playerId: socket.id });
      } catch (e) { console.error('Error handling powerupCollected', e); }
    });

    // Positional fallback for pickups (if client doesn't have id)
    socket.on('powerupCollectedAt', (data) => {
      try {
        if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;
        const maxDist = 60;
        let foundIdx = -1;
        let foundDist2 = Infinity;
        for (let i = 0; i < gameState.powerups.length; i++) {
          const p = gameState.powerups[i];
          if (data.type && p.type !== data.type) continue;
          const dx = p.x - data.x;
          const dy = p.y - data.y;
          const d2 = dx*dx + dy*dy;
          if (d2 < foundDist2 && d2 <= maxDist*maxDist) { foundDist2 = d2; foundIdx = i; }
        }
        if (foundIdx === -1) return;
        const [removed] = gameState.powerups.splice(foundIdx, 1);
        pushPowerupEvent({ action: 'remove', source: 'powerupCollectedAt', removedBy: socket.id, powerup: removed });
        io.emit('powerupRemoved', { id: removed.id, playerId: socket.id });
      } catch (e) { console.error('Error handling powerupCollectedAt', e); }
    });
  }

  // NOTE: powerup collection/spawn authoritative handlers removed to restore previous client-driven behavior.
  // If you want to re-enable server-authoritative powerups later, reintroduce the handlers above behind a flag.

  // Handle projectile impacts from players (for visual sync)
  socket.on('projectileImpact', (data) => {
    playerLastActivity[socket.id] = Date.now();

    // Broadcast the impact to all other players
    socket.broadcast.emit('playerProjectileImpact', {
      playerId: socket.id,
      x: data.x,
      y: data.y,
      radius: data.radius,
      asteroidId: data.asteroidId,
    });
  });

  // Handle chat messages
  socket.on('chatMessage', (data) => {
    const player = gameState.players[socket.id];
    if (player && data.message) {
      const message = data.message.substring(0, 100); // Limit message length
  logger.info(`[CHAT] ${player.name}: ${message}`);
      io.emit('chatMessage', {
        name: player.name,
        message: message,
        isSystem: false,
      });
    }
  });

  // Admin chat messages from analytics dashboard or admin clients
  socket.on('adminChatMessage', (data) => {
    try {
      if (!data || !data.message) return;
      const message = data.message.substring(0, 500);
      // Prefix message with Admin: for broadcasting to game clients
      const adminPayload = {
        name: data.adminName || 'Admin',
        message: message,
        isSystem: true,
      };
  logger.info(`[ADMIN CHAT] ${adminPayload.name}: ${adminPayload.message}`);
      // Broadcast to all game clients
      io.emit('chatMessage', adminPayload);

      // Log analytics event for admin chat (for auditing)
      try {
        analytics.processEvent(
          {
            sessionId: `admin_${Date.now()}`,
            playerId: adminPayload.name,
            eventType: 'admin_chat',
            timestamp: Date.now(),
            data: { message: adminPayload.message },
          },
          socket.request.connection.remoteAddress || 'admin',
        );
      } catch (e) {
        console.error('Failed to log admin_chat analytics event:', e);
      }
    } catch (e) {
      console.error('Error handling adminChatMessage:', e);
    }
  });

  // Player disconnect
  socket.on('disconnect', () => {
    // Synthesize session_end for analytics when possible
    try {
      const clientIp =
        (socket.request &&
          socket.request.connection &&
          (socket.request.connection.remoteAddress ||
            socket.request.headers['x-forwarded-for'])) ||
        'unknown';
      if (socket.analytics && socket.analytics.playerId) {
        const pid = socket.analytics.playerId;
        const sessionObj = analytics.sessions.get(pid);
        if (sessionObj) {
          // compute approximate session duration
          const start =
            socket.analytics.startTime || sessionObj.startTime || Date.now();
          const duration = Math.max(0, Date.now() - start);
          const endEvent = {
            sessionId:
              socket.analytics.sessionId || `session_${Date.now()}_${pid}`,
            playerId: pid,
            eventType: 'session_end',
            timestamp: Date.now(),
            data: { sessionDuration: duration },
          };
          analytics.processEvent(endEvent, clientIp);

          // End session in database analytics
          if (dbAnalytics.initialized && socket.analytics.sessionId) {
            dbAnalytics.endSession(
              socket.analytics.sessionId,
              new Date(),
              endEvent.data.sessionDuration || 0
            ).catch(err => console.error('Database session end error:', err));
          }

          console.log(
            `📊 Player left analytics: ${pid} (Session duration: ${Math.floor(duration / 1000)}s, Active players: ${analytics.sessions.size})`,
          );
        } else {
          // Defensive fallback: if analytics has no live session object for this player
          // still record the sessionDuration into today's dailyStats so averages are
          // not lost when disconnects happen before analytics created the session.
          try {
            const day = analytics.getDateString(Date.now());
            if (!analytics.dailyStats.has(day)) analytics.dailyStats.set(day, analytics.createEmptyDayStats());
            const stats = analytics.dailyStats.get(day);
            const secs = Math.round((Date.now() - (socket.analytics && socket.analytics.startTime ? socket.analytics.startTime : Date.now())) / 1000);
            stats.totalSessionTime = (stats.totalSessionTime || 0) + secs;
            stats.sessionDurations = stats.sessionDurations || [];
            stats.sessionDurations.push(secs);
            // update unique session map if possible
            try {
              if (socket.analytics && socket.analytics.playerId) {
                if (!stats.playerSessionMap) stats.playerSessionMap = {};
                if (!stats.playerSessionMap[socket.analytics.playerId]) stats.playerSessionMap[socket.analytics.playerId] = new Set();
                if (socket.analytics.sessionId) stats.playerSessionMap[socket.analytics.playerId].add(socket.analytics.sessionId);
                if (!stats.uniqueSessions) stats.uniqueSessions = new Set();
                if (socket.analytics.sessionId) stats.uniqueSessions.add(socket.analytics.sessionId);
              }
            } catch (e) {}
            // Persist immediately (best-effort)
            analytics.saveDailyStats && analytics.saveDailyStats().catch(() => {});
          } catch (e) {
            console.error('Error applying disconnect fallback for session duration:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error synthesizing session_end on disconnect:', e);
    }

    if (gameState.players[socket.id]) {
  logger.info(`Player ${gameState.players[socket.id].name} disconnected`);

      // Clean up NPCs spawned by this player
      const playerNPCs = gameState.npcs.filter(
        (npc) => npc.spawnerId === socket.id,
      );
      if (playerNPCs.length > 0) {
        logger.info(
          `Cleaning up ${playerNPCs.length} NPCs spawned by disconnected player`,
        );

        // Remove NPCs from game state
        gameState.npcs = gameState.npcs.filter(
          (npc) => npc.spawnerId !== socket.id,
        );

        // Notify all clients to remove these NPCs
        playerNPCs.forEach((npc) => {
          socket.broadcast.emit('npcDestroyed', { npcId: npc.id });
        });
      }

      // Send player left message to all other clients
      socket.broadcast.emit('playerLeft', socket.id);

      // Remove the player from the game state
      delete gameState.players[socket.id];

      // Remove player activity tracking
      delete playerLastActivity[socket.id];

  // Broadcast updated player count to all clients
      safeEmit('playerCountUpdate', Object.keys(gameState.players).length);

      // If no players remain, stop the world loop
      const connectedNow = io.of('/').sockets.size || 0;
      if (connectedNow === 0) {
        stopWorldLoop();
      }
    } else {
      // Provide more context when a socket disconnects before joining the game.
      const info = {
        socketId: socket.id,
        analytics: socket.analytics || null,
        headers: socket.request ? socket.request.headers : null,
      };
  logger.debug(`Unknown player disconnected: ${socket.id}`, info);
    }
  });
});

// Check for inactive players periodically
setInterval(() => {
  const now = Date.now();
  const inactiveSockets = [];

  // Find inactive players
  Object.keys(playerLastActivity).forEach((socketId) => {
    const lastActivity = playerLastActivity[socketId];
    if (now - lastActivity > INACTIVITY_TIMEOUT) {
      inactiveSockets.push(socketId);
    }
  });

  // Disconnect inactive players
  inactiveSockets.forEach((socketId) => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket && gameState.players[socketId]) {
      const playerName = gameState.players[socketId].name;
  logger.info(`Disconnecting inactive player: ${playerName} (${socketId})`);

      // Notify all clients about the timeout
      io.emit('playerTimedOut', {
        id: socketId,
        name: playerName,
      });

      // Remove player from game state
      delete gameState.players[socketId];
      delete playerLastActivity[socketId];

      // Disconnect the socket
      socket.disconnect(true);

      // Broadcast updated player count to all clients
      io.emit('playerCountUpdate', Object.keys(gameState.players).length);
    }
  });
}, INACTIVITY_CHECK_INTERVAL);

// Start world simulation
function updateWorld() {
  // Update asteroids and powerups if needed
  // This is a simplified version - in a real game, you'd have more complex logic here

  // Send world updates to all clients
  safeEmit('worldUpdate', {
    asteroids: gameState.asteroids,
    powerups: gameState.powerups,
  });
}

// World update loop control: only run when there are connected clients to avoid
// unnecessary CPU and bandwidth usage on idle servers.
let worldIntervalId = null;
// Reduce tick rate from 10Hz to ~3Hz to lower baseline bandwidth while keeping gameplay responsive
const WORLD_TICK_MS = 333; // ~3 updates per second

function startWorldLoop() {
  try {
    const connected = io.of('/').sockets.size || 0;
    if (connected === 0) {
      // nothing to do
      return;
    }
    if (!worldIntervalId) {
      worldIntervalId = setInterval(updateWorld, WORLD_TICK_MS);
  logger.info(`Started world loop (${WORLD_TICK_MS}ms tick) - connected clients: ${connected}`);
    }
  } catch (e) {
    console.error('Error starting world loop:', e);
  }
}

function stopWorldLoop() {
  try {
    if (worldIntervalId) {
      clearInterval(worldIntervalId);
      worldIntervalId = null;
  logger.info('Stopped world loop (no connected clients)');
    }
  } catch (e) {
    console.error('Error stopping world loop:', e);
  }
}

// Generate a random color for players
function getRandomColor() {
  const colors = [
    '#f44',
    '#4f4',
    '#44f',
    '#ff4',
    '#4ff',
    '#f4f',
    '#fa4',
    '#a4f',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Clean up expired auth tokens daily
setInterval(
  () => {
    cloudAuth.cleanupTokens();
  },
  24 * 60 * 60 * 1000,
); // Every 24 hours

// Start the server with graceful EADDRINUSE handling
const PORT = parseInt(process.env.PORT, 10) || 3000;

async function startServer(port) {
  // Initialize database (optional)
  const databaseAvailable = await initializeDatabase();
  
  // Initialize cloud auth
  cloudAuth = new CloudSyncAuth();
  
  if (databaseAvailable) {
  logger.info('🚀 Starting with DATABASE persistence - user data will survive redeploys!');
    // Initialize DB-backed analytics helper
    try {
      dbAnalytics = new DatabaseAnalytics();
    } catch (e) {
      console.error('Failed to initialize DatabaseAnalytics:', e);
      dbAnalytics = null;
    }

    // Ensure player_data has unique index on username and dedupe if necessary
    (async () => {
      try {
        const pool = database.pool;
        // Check for duplicates
        const dupRes = await pool.query(`SELECT username, COUNT(*) AS cnt FROM player_data GROUP BY username HAVING COUNT(*) > 1`);
        if (dupRes.rows.length > 0) {
          console.log('Deduplicating player_data table before creating unique index...');
          await pool.query(`WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY username ORDER BY updated_at DESC NULLS LAST, id DESC) AS rn
            FROM player_data
          ) DELETE FROM player_data WHERE id IN (SELECT id FROM ranked WHERE rn > 1);`);
        }
        // Create unique index if missing
        try {
          await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_player_data_username ON player_data(username)`);
          console.log('Ensured unique index ux_player_data_username exists');
        } catch (idxErr) {
          console.error('Failed to create unique index on player_data.username:', idxErr);
        }
      } catch (e) {
        console.error('Error during DB player_data dedupe/index creation:', e);
      }
    })();

    // Optionally auto-import analytics files into DB if environment requests it
    if (process.env.AUTO_IMPORT_ANALYTICS === '1') {
      (async () => {
        try {
          console.log('AUTO_IMPORT_ANALYTICS=1 detected - importing analytics exports into DB');
          const importer = require('./import_exports_to_pg');
          await importer.importExports(process.env.DATABASE_URL);
          console.log('AUTO import complete');
        } catch (importErr) {
          console.error('AUTO import failed:', importErr);
        }
      })();
    }
  } else {
    console.log('⚠️  Starting with FILE persistence - user data WILL BE LOST on redeploys!');
    console.log('🔧 To fix: Set DATABASE_URL environment variable with PostgreSQL connection string');
  }
  
  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use.`);
      // Attempt to suggest a fix but do not forcibly kill other processes
      console.error(
        `If this is unexpected, find and stop the process using port ${port} or set PORT to a different value and restart.`,
      );
      // Attempt a fallback port if explicitly allowed via env variable
      const tryFallback = process.env.FALLBACK_PORTS === '1';
      if (tryFallback) {
        const newPort = port + 1;
        console.log(`Attempting fallback to port ${newPort}...`);
        // Remove this error listener and try again on the new port
        server.removeAllListeners('error');
        startServer(newPort);
        return;
      }

      // Exit with a helpful message so process supervisors know why it quit
      process.exit(1);
    } else {
      // Unknown server error - rethrow to let Node print stack
      throw err;
    }
  });

  server.listen(port, () => {
    console.log(`SuperSpace multiplayer server running on port ${port}`);
  });
}

// Start the server with database initialization
(async () => {
  try {
    await startServer(PORT);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Secure reset endpoint for analytics data (POST only, requires header)
app.post('/analytics/reset', async (req, res) => {
  try {
    const secretHeader = req.get('x-analytics-secret');
    const envSecret =
      process.env.ANALYTICS_RESET_SECRET || 'superspaceRESET_8f7c2b1e4d9a';
    if (!secretHeader || secretHeader !== envSecret) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Remove analytics data directory contents safely
    const dir = path.join(__dirname, 'analytics_data');
    console.log('Admin requested analytics reset');
    try {
      // delete files but keep directory
      const items = await fs.readdir(dir);
      for (const item of items) {
        const p = path.join(dir, item);
        // remove files or directories recursively
        await fs.rm(p, { recursive: true, force: true });
      }
    } catch (e) {
      // ignore errors reading dir
      console.error('Error clearing analytics dir:', e);
    }

    // Recreate directories and re-init analytics state
    try {
      await fs.mkdir(path.join(dir, 'daily'), { recursive: true });
      await fs.mkdir(path.join(dir, 'sessions'), { recursive: true });
      await fs.mkdir(path.join(dir, 'players'), { recursive: true });
    } catch (e) {
      console.error('Error recreating analytics dirs:', e);
    }

    // Reset in-memory analytics instance and forcibly clear all sessions
    try {
      analytics.dailyStats = new Map();
      analytics.playerProfiles = new Map();
      analytics.events = [];
      // Explicitly clear all sessions (in case of lingering references)
      if (
        analytics.sessions &&
        typeof analytics.sessions.clear === 'function'
      ) {
        analytics.sessions.clear();
      }
      analytics.sessions = new Map();
      analytics.currentActive = 0;
      analytics.globalPeak = 0;
      await analytics.saveMeta();
      // create today's empty stats
      analytics.dailyStats.set(
        analytics.getDateString(),
        analytics.createEmptyDayStats(),
      );
      // Log session count for verification
      console.log(
        '[Analytics Reset] Active sessions after reset:',
        analytics.sessions.size,
      );
    } catch (e) {
      console.error('Error resetting analytics in memory:', e);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error in analytics reset:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Debug endpoint to get recent server logs (same secret as reset)
app.get('/debug/logs', (req, res) => {
  try {
    const secretHeader = req.get('x-analytics-secret');
    const envSecret =
      process.env.ANALYTICS_RESET_SECRET || 'superspaceRESET_8f7c2b1e4d9a';
    if (!secretHeader || secretHeader !== envSecret) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({
      logs: logBuffer.slice(-50), // Last 50 log entries
      serverTime: new Date().toISOString(),
      activeSessions: analytics.sessions.size,
      activeGamePlayers: Object.keys(gameState.players).length,
    });
  } catch (error) {
    console.error('Error in debug logs endpoint:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// One-time admin import endpoint - runs the import script using the server's DATABASE_URL
// Protect with IMPORT_SECRET header; after a successful run the endpoint removes itself.
let importEndpointEnabled = true;
app.post('/admin/import-data', async (req, res) => {
  try {
    if (!importEndpointEnabled) return res.status(404).json({ error: 'Not found' });

    const secretHeader = req.get('x-admin-import-secret');
    const expected = process.env.IMPORT_SECRET || 'superspace_IMPORT_SECRET';
    if (!secretHeader || secretHeader !== expected) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    console.log('Admin import-data endpoint triggered');
    const importer = require('./import_exports_to_pg');
    try {
      const result = await importer.importExports(process.env.DATABASE_URL);
      // Disable endpoint after successful import
      importEndpointEnabled = false;
      console.log('Admin import completed:', result);
      return res.json({ ok: true, result });
    } catch (importErr) {
      console.error('Admin import failed:', importErr);
      return res.status(500).json({ ok: false, error: importErr.message });
    }
  } catch (error) {
    console.error('Error in /admin/import-data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
