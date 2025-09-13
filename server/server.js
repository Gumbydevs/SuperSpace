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

// Create the Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize analytics
const analytics = new ServerAnalytics();

// Log buffer for debugging (keep last 100 log entries)
const logBuffer = [];
const maxLogBuffer = 100;

// Override console.log and console.error to capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  logBuffer.push({ timestamp, level: 'info', message });
  if (logBuffer.length > maxLogBuffer) {
    logBuffer.shift();
  }
  originalConsoleLog(...args);
};

console.error = (...args) => {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  logBuffer.push({ timestamp, level: 'error', message });
  if (logBuffer.length > maxLogBuffer) {
    logBuffer.shift();
  }
  originalConsoleError(...args);
};

// Configure CORS to allow requests from specific domains
app.use(cors({
  origin: '*',
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"],
  credentials: false
}));

// Allow JSON bodies (used by admin endpoints)
app.use(express.json());

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Add a home route that shows server status
app.get('/status', (req, res) => {
  console.log('Status endpoint hit from origin:', req.get('origin'));
  const now = Date.now();
  res.json({
    status: 'running',
    players: Object.keys(gameState.players).length,
    activePlayers: Object.keys(playerLastActivity).filter(playerId => 
      now - (playerLastActivity[playerId] || 0) < 30000
    ).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    npcs: gameState.npcs.length,
    dreadnaughtActive: gameState.npcs.some(npc => npc.type === 'dreadnaught'),
    nextDreadnaughtSpawn: nextDreadnaughtSpawn,
    timeUntilNextDreadnaught: Math.max(0, nextDreadnaughtSpawn - now)
  });
});

// Add a simple test endpoint for CORS testing
app.get('/test', (req, res) => {
  console.log('Test endpoint hit from origin:', req.get('origin'));
  res.json({ message: 'CORS test successful', origin: req.get('origin') });
});

// Analytics endpoints
app.get('/analytics', (req, res) => {
  try {
    const stats = analytics.getCurrentStats();
    
    // Use actual connected players count from gameState
    const actualActivePlayers = Object.keys(gameState.players).length;
    
    // Transform data to match dashboard expectations
    const dashboardData = {
      // Basic metrics that dashboard expects - use real player count
      activePlayers: actualActivePlayers,
      peakPlayers: stats.today?.peakConcurrent || 0,
      totalSessions: stats.today?.totalSessions || 0,
      avgSessionTime: Math.floor((stats.today?.averageSessionDuration || 0) / 1000),
      
      // Game statistics - map to actual field names
      killsToday: stats.today?.totalKills || 0,
      deathsToday: stats.today?.totalDeaths || 0,
      shotsFired: stats.today?.totalShots || 0,
      powerupsCollected: stats.today?.powerupsCollected || 0,
      
      // Premium statistics  
      premiumPlayers: stats.today?.premiumPlayers || 0,
      storeVisits: stats.today?.storeVisits || 0,
      purchases: stats.today?.totalPurchases || 0,
      revenue: stats.today?.totalSpent || 0,        // Real money revenue
      gemsSpent: stats.today?.gemsSpent || 0,       // Gems spent on items
      
      // Chart data
      playerActivity: generatePlayerActivityData({ activeSessions: actualActivePlayers }),
      gameEvents: {
        kills: stats.today?.totalKills || 0,
        deaths: stats.today?.totalDeaths || 0,
        shots: stats.today?.totalShots || 0,
        powerups: stats.today?.powerupsCollected || 0,
        purchases: stats.today?.totalPurchases || 0
      },
      
      // Recent events for live log
      recentEvents: stats.recentEvents || [],
      
      // Debug info
      debug: {
        analyticsActiveSessions: stats.activeSessions || 0,
        gameStateActivePlayers: actualActivePlayers,
        playerNames: Object.values(gameState.players).map(p => p.name)
      }
    };
    
    console.log(`📊 Analytics request - Active players: ${actualActivePlayers}, Analytics sessions: ${stats.activeSessions || 0}`);
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Helper function to generate player activity data for charts
function generatePlayerActivityData(stats) {
  const activityData = [];
  const now = new Date();
  
  // Get today's hourly activity from analytics if available
  if (stats.today && stats.today.hourlyActivity) {
    const hourlyActivity = stats.today.hourlyActivity;
    
    // Generate last 24 hours of data points (every hour)
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const hour = time.getHours();
      const count = hourlyActivity[hour] || 0;
      
      activityData.push({
        timestamp: time.toISOString(),
        count: count
      });
    }
  } else {
    // Fallback: show current active players for recent hours
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const count = i === 0 ? (stats.activeSessions || 0) : 0;
      
      activityData.push({
        timestamp: time.toISOString(),
        count: count
      });
    }
  }
  
  return activityData;
}

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

// Analytics tracking endpoint - receives events from the client
app.post('/analytics/track', (req, res) => {
  try {
    console.log('📊 Analytics track request received:', req.body);
    
    const { event, data, timestamp, url } = req.body;
    
    // Track the event in our analytics system using the correct method and format
    if (event && data && data.playerId) {
      const eventData = {
        sessionId: data.sessionId || `session_${Date.now()}_${data.playerId}`,
        playerId: data.playerId,
        eventType: event,
        timestamp: timestamp || Date.now(),
        data: data
      };
      
      console.log('📊 Processing event data:', eventData);
      analytics.processEvent(eventData, req.ip);
      console.log(`📊 Analytics event tracked: ${event} from ${data.playerId}`);
    } else {
      console.log(`📊 Analytics event missing required fields:`, { 
        event, 
        hasData: !!data, 
        hasPlayerId: data?.playerId,
        fullBody: req.body 
      });
    }
    
    res.json({ success: true, event, timestamp });
  } catch (error) {
    console.error('❌ Error tracking analytics event:', error);
    console.error('❌ Request body was:', req.body);
    res.status(500).json({ error: 'Failed to track event', details: error.message });
  }
});

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
        ip: s.ip
      });
    }

    const today = analytics.getDateString();
    const todayStats = analytics.dailyStats.get(today) || analytics.createEmptyDayStats();

    res.json({
      sessions,
      currentActive: analytics.currentActive || 0,
      globalPeak: analytics.globalPeak || 0,
      today: {
        date: today,
        totalSessions: todayStats.totalSessions || 0,
        uniqueSessions: (todayStats.uniqueSessions && typeof todayStats.uniqueSessions.size === 'number') ? todayStats.uniqueSessions.size : (Array.isArray(todayStats.uniqueSessions) ? todayStats.uniqueSessions.length : 0),
        currentConcurrent: todayStats.currentConcurrent || 0,
        peakConcurrent: todayStats.peakConcurrent || 0,
        sessionDurations: todayStats.sessionDurations ? todayStats.sessionDurations.slice(-20) : []
      }
    });
  } catch (e) {
    console.error('Error in analytics debug endpoint:', e);
    res.status(500).json({ error: 'debug failed' });
  }
});

// Create Socket.IO server with CORS configuration
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false
  }
});

// Add Socket.IO error handling
io.engine.on("connection_error", (err) => {
  console.log('Socket.IO connection error:', err.req);      // the request object
  console.log('Error code:', err.code);     // the error code, for example 1
  console.log('Error message:', err.message);  // the error message, for example "Session ID unknown"
  console.log('Error context:', err.context);  // some additional error context
});

// Constants for inactivity timeout
const INACTIVITY_TIMEOUT = 120000; // 2 minutes in milliseconds
const INACTIVITY_CHECK_INTERVAL = 30000; // 30 seconds in milliseconds

// Game state
const gameState = {
  players: {},
  asteroids: [],
  powerups: [],
  npcs: [] // Add NPC tracking
};

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
  console.log("Generating new asteroid field...");
  gameState.asteroids = [];
  
  // Generate asteroids with unique IDs
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    const radius = ASTEROID_MIN_SIZE + Math.random() * (ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE);
    const asteroid = {
      id: `asteroid-${Date.now()}-${i}`,
      x: (Math.random() - 0.5) * WORLD_SIZE,
      y: (Math.random() - 0.5) * WORLD_SIZE,
      radius: radius,
      health: radius * 2, // Health based on size
      type: Math.random() > 0.7 ? 'ice' : 'rock', // Different asteroid types
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2
    };
    
    gameState.asteroids.push(asteroid);
  }
  
  // Send the new asteroid field to all connected clients
  io.emit('asteroidFieldUpdate', {
    asteroids: gameState.asteroids
  });
  
  console.log(`Generated ${gameState.asteroids.length} asteroids`);
}

// Periodic asteroid regeneration to maintain battlefield density
setInterval(() => {
  // Only regenerate if we have connected players and are below minimum asteroid count
  if (Object.keys(gameState.players).length > 0 && gameState.asteroids.length < ASTEROID_COUNT * 0.7) {
    console.log(`Regenerating asteroids. Current: ${gameState.asteroids.length}, Target: ${ASTEROID_COUNT}`);
    
    // Generate new asteroids to reach target count
    const asteroidsToGenerate = ASTEROID_COUNT - gameState.asteroids.length;
    const newAsteroids = [];
    
    for (let i = 0; i < asteroidsToGenerate; i++) {
      const radius = ASTEROID_MIN_SIZE + Math.random() * (ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE);
      const newAsteroid = {
        id: `asteroid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: (Math.random() - 0.5) * WORLD_SIZE,
        y: (Math.random() - 0.5) * WORLD_SIZE,
        radius: radius,
        health: radius * 2,
        type: Math.random() > 0.7 ? 'ice' : 'rock',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      };
      
      gameState.asteroids.push(newAsteroid);
      newAsteroids.push(newAsteroid);
    }
    
    // Broadcast new asteroids to all clients
    if (newAsteroids.length > 0) {
      io.emit('newAsteroids', { asteroids: newAsteroids });
      console.log(`Generated ${newAsteroids.length} new asteroids. Total: ${gameState.asteroids.length}`);
    }
  }
}, ASTEROID_REGENERATION_TIME);

// Natural Dreadnaught spawning system
const DREADNAUGHT_MIN_PLAYERS = 2; // Minimum players needed for dreadnaught events
const DREADNAUGHT_MIN_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between dreadnaughts
const DREADNAUGHT_MAX_INTERVAL = 15 * 60 * 1000; // 15 minutes maximum between dreadnaughts
const DREADNAUGHT_ACTIVITY_THRESHOLD = 30000; // Player must be active within 30 seconds

let lastDreadnaughtSpawn = Date.now();
let nextDreadnaughtSpawn = Date.now() + DREADNAUGHT_MIN_INTERVAL + Math.random() * (DREADNAUGHT_MAX_INTERVAL - DREADNAUGHT_MIN_INTERVAL);

// Check for natural dreadnaught spawning every 30 seconds
setInterval(() => {
  const now = Date.now();
  const activePlayers = Object.keys(gameState.players).filter(playerId => {
    const lastActivity = playerLastActivity[playerId] || 0;
    return now - lastActivity < DREADNAUGHT_ACTIVITY_THRESHOLD;
  });
  
  console.log(`🔍 Dreadnaught spawn check: ${activePlayers.length} active players, next spawn in ${Math.max(0, nextDreadnaughtSpawn - now)}ms`);
  
  // Check if conditions are met for dreadnaught spawning
  const shouldSpawn = (
    activePlayers.length >= DREADNAUGHT_MIN_PLAYERS && // Enough active players
    now > nextDreadnaughtSpawn && // Time interval has passed
    now - lastDreadnaughtSpawn > DREADNAUGHT_MIN_INTERVAL && // Minimum time since last
    !gameState.npcs.some(npc => npc.type === 'dreadnaught') // No existing dreadnaught
  );
  
  if (shouldSpawn) {
    console.log(`🛸 NATURAL DREADNAUGHT SPAWN: ${activePlayers.length} active players detected`);
    console.log(`🔍 Spawn conditions: activePlayers=${activePlayers.length}, minRequired=${DREADNAUGHT_MIN_PLAYERS}`);
    console.log(`⏰ Time check: now=${now}, nextSpawn=${nextDreadnaughtSpawn}, timeSinceLastSpawn=${now - lastDreadnaughtSpawn}`);
    
    // Trigger dreadnaught spawn for a random active player
    const randomPlayerId = activePlayers[Math.floor(Math.random() * activePlayers.length)];
    const randomSocket = io.sockets.sockets.get(randomPlayerId);
    
    console.log(`🎯 Selected player ${randomPlayerId} for dreadnaught spawn`);
    console.log(`📡 Socket found: ${randomSocket ? 'YES' : 'NO'}`);
    
    if (randomSocket) {
      console.log(`🚀 Sending naturalDreadnaughtSpawn event to ${randomPlayerId}`);
      
      // Send natural dreadnaught spawn command to the selected player
      randomSocket.emit('naturalDreadnaughtSpawn', {
        message: 'You have been chosen to face the Dreadnaught!',
        spawn: true
      });
      
      // Announce to all players
      io.emit('serverAnnouncement', {
        message: '⚠️ DREADNAUGHT THREAT DETECTED - PREPARE FOR BATTLE! ⚠️',
        color: '#ff4444',
        duration: 5000,
        priority: true
      });
      
      console.log(`📢 Server announcement sent to all players`);
    } else {
      console.log(`❌ Failed to find socket for player ${randomPlayerId}`);
    }
    
    lastDreadnaughtSpawn = now;
    // Schedule next spawn with some randomness
    nextDreadnaughtSpawn = now + DREADNAUGHT_MIN_INTERVAL + Math.random() * (DREADNAUGHT_MAX_INTERVAL - DREADNAUGHT_MIN_INTERVAL);
    
    console.log(`📅 Next dreadnaught spawn scheduled for: ${new Date(nextDreadnaughtSpawn).toLocaleTimeString()}`);
  }
}, 30000); // Check every 30 seconds

// Connection handling
io.on('connection', (socket) => {
  // Analytics event handler
  socket.on('analytics_event', (eventData) => {
    try {
      const clientIp = socket.request.connection.remoteAddress || 
                       socket.request.headers['x-forwarded-for'] || 
                       'unknown';
      // Basic per-socket rate limiting (simple sliding window)
      socket.analytics = socket.analytics || {};
      const now = Date.now();
      const windowMs = 60000; // 60s window
      const maxPerWindow = 600; // 600 events / minute (10/s) - adjust if needed
      if (!socket.analytics.windowStart || now - socket.analytics.windowStart > windowMs) {
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
      const validEvent = eventData && typeof eventData === 'object' && typeof eventData.eventType === 'string' && (typeof eventData.timestamp === 'number' || !eventData.timestamp);
      if (!validEvent) {
        console.warn(`Invalid analytics_event from ${socket.id}:`, eventData && eventData.eventType);
        return;
      }

      // Forward to analytics
      analytics.processEvent(eventData, clientIp);

      // Track mapping from socket -> playerId/sessionId so server can synthesize events on disconnect
      try {
        socket.analytics = socket.analytics || {};
        if (eventData.playerId) socket.analytics.playerId = eventData.playerId;
        if (eventData.sessionId) socket.analytics.sessionId = eventData.sessionId;
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
      console.log(`Admin kicked player: ${data.targetId}`);
    }
  });
  console.log(`Player connected: ${socket.id}`);
  console.log(`Connection origin: ${socket.request.headers.origin}`);
  console.log(`Connection referer: ${socket.request.headers.referer}`);
  console.log(`Connection host: ${socket.request.headers.host}`);
  
  // Set initial activity timestamp
  playerLastActivity[socket.id] = Date.now();
  
  // Handle requests for player count (without joining the game)
  socket.on('getPlayerCount', () => {
    // Get the current count of players
    const playerCount = Object.keys(gameState.players).length;
    
    // Send current player count to the requesting client
    socket.emit('playerCountUpdate', playerCount);
    
    console.log(`Player count requested by: ${socket.id}, current count: ${playerCount}`);
  });
  
  // Player joined
  socket.on('playerJoin', (playerData) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();
    
    // Track player join in analytics
    const playerId = playerData.name || `Player-${socket.id.substring(0, 4)}`;
    analytics.processEvent({
      sessionId: `session_${Date.now()}_${socket.id}`,
      playerId: playerId,
      eventType: 'session_start',
      timestamp: Date.now(),
      data: { 
        socketId: socket.id,
        playerName: playerId 
      }
    }, socket.request.connection.remoteAddress || 'unknown');
    
    // Store analytics info on socket for disconnect handling
    socket.analytics = {
      playerId: playerId,
      sessionId: `session_${Date.now()}_${socket.id}`,
      startTime: Date.now()
    };
    
    console.log(`📊 Player joined analytics: ${playerId} (Active players: ${analytics.sessions.size})`);
    
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
  skinEffectsEnabled: (playerData.skinEffectsEnabled === undefined ? true : !!playerData.skinEffectsEnabled),
  // Visual engine state for client rendering
  thrustLevel: playerData.thrustLevel !== undefined ? playerData.thrustLevel : 0,
  afterburnerActive: playerData.afterburnerActive !== undefined ? !!playerData.afterburnerActive : false,
      projectiles: [],
      miningBeam: {
        active: false,
        targetX: 0,
        targetY: 0,
        intensity: 0
      }
    };
    
    // Send the current game state to the new player
    socket.emit('gameState', gameState);
    
    // Notify all clients about the new player
    socket.broadcast.emit('playerJoined', gameState.players[socket.id]);
    
    // Broadcast updated player count to all clients
    io.emit('playerCountUpdate', Object.keys(gameState.players).length);
    
    console.log(`Player ${gameState.players[socket.id].name} joined the game`);
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
          console.log(`SCORE UPDATE: Player ${player.name} score changed from ${oldScore} to ${player.score}`);
        }
      }
      if (data.wins !== undefined) {
        const oldWins = player.wins;
        player.wins = data.wins;
        if (oldWins !== player.wins) {
          console.log(`WINS UPDATE: Player ${player.name} wins changed from ${oldWins} to ${player.wins}`);
        }
      }
      if (data.losses !== undefined) {
        const oldLosses = player.losses;
        player.losses = data.losses;
        if (oldLosses !== player.losses) {
          console.log(`LOSSES UPDATE: Player ${player.name} losses changed from ${oldLosses} to ${player.losses}`);
        }
      }
      
      // Update mining beam state
      if (data.miningBeam) {
        player.miningBeam = {
          active: data.miningBeam.active,
          targetX: data.miningBeam.targetX,
          targetY: data.miningBeam.targetY,
          intensity: data.miningBeam.intensity
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
        miningBeam: player.miningBeam
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
      if (data.afterburnerActive !== undefined) player.afterburnerActive = !!data.afterburnerActive;

      // Relay to other clients immediately
      socket.broadcast.emit('thrustChanged', {
        playerId: socket.id,
        thrustLevel: player.thrustLevel || 0,
        afterburnerActive: !!player.afterburnerActive
      });
    }
  });

  // Ship skin immediate update event
  socket.on('shipSkinUpdate', (data) => {
    playerLastActivity[socket.id] = Date.now();
    const player = gameState.players[socket.id];
    if (!player) return;
    const newSkin = (data && typeof data.skinId === 'string') ? data.skinId : 'none';
    player.shipSkin = newSkin;
    socket.broadcast.emit('shipSkinUpdate', { playerId: socket.id, skinId: newSkin });
  });

  // Optional: skin effects toggle immediate broadcast (client can implement listener if desired)
  socket.on('skinEffectsToggle', (data) => {
    playerLastActivity[socket.id] = Date.now();
    const player = gameState.players[socket.id];
    if (!player) return;
    if (data && data.enabled !== undefined) {
      player.skinEffectsEnabled = !!data.enabled;
      socket.broadcast.emit('skinEffectsToggle', { playerId: socket.id, enabled: player.skinEffectsEnabled });
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
        projectile: projectile
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
      type: data.type || 'rocket'
    });
  });

  // Handle direct projectile hits on players
  socket.on('projectileHit', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();
    
    console.log(`Projectile hit from ${socket.id} on target ${data.targetId} for ${data.damage} damage`);
    
    // Validate the target exists
    if (!gameState.players[data.targetId]) {
      console.log(`Invalid target ${data.targetId} for projectile hit`);
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
    
    console.log(`Player ${targetPlayer.name} hit by ${attackerPlayer?.name || 'unknown'} for ${data.damage} damage. Shield: ${oldShield} -> ${targetPlayer.shield}, Health: ${oldHealth} -> ${targetPlayer.health}`);
    
    // Broadcast health update to all clients immediately
    io.emit('playerHealthUpdate', {
      id: data.targetId,
      health: targetPlayer.health,
      shield: targetPlayer.shield
    });
    
    // Broadcast the hit effect to all clients including the target
    io.emit('projectileHit', {
      targetId: data.targetId,
      position: data.position,
      damage: data.damage,
      attackerId: socket.id
    });
    
    // Check if player was destroyed
    if (targetPlayer.health <= 0) {
      targetPlayer.losses += 1;
      console.log(`Player ${targetPlayer.name} was destroyed by ${attackerPlayer?.name || 'unknown'}!`);
      
      // Award points to attacker
      if (attackerPlayer) {
        attackerPlayer.score += 500;
        attackerPlayer.credits += 250;
        
        // Broadcast attacker stats update
        io.emit('playerUpdate', {
          id: socket.id,
          score: attackerPlayer.score,
          credits: attackerPlayer.credits
        });
      }
      
      // Broadcast player destroyed event
      // Check if attacker is an NPC (Alien or Dreadnaught)
      let npcType = null;
      if (!gameState.players[socket.id]) {
        const npc = gameState.npcs.find(n => n.id === data.attackerId);
        if (npc) {
          npcType = npc.type;
        }
      }
      io.emit('playerDestroyed', {
        playerId: data.targetId,
        attackerId: socket.id,
        killerAvatar: attackerPlayer?.avatar || 'han',
        killerName: attackerPlayer?.name || `Player-${socket.id.substring(0, 4)}`,
        npcType: npcType
      });
    }
  });
  
  // Player hit something (asteroid, enemy, etc.)
  socket.on('hit', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();
    
    if (data.type === 'asteroid') {
      // Handle asteroid hit - server-side asteroid health management
      const asteroid = gameState.asteroids.find(a => a.id === data.id);
      if (asteroid) {
        // Reduce asteroid health
        asteroid.health -= data.damage;
        
        console.log(`Asteroid ${data.id} hit for ${data.damage} damage. Health: ${asteroid.health}/${asteroid.health + data.damage}`);
        
        // Check if asteroid is destroyed
        if (asteroid.health <= 0) {
          // Handle asteroid splitting before removal
          const fragments = [];
          if (asteroid.radius > 30) { // Only split larger asteroids
            if (Math.random() < 0.7) { // 70% chance to split
              const fragmentCount = 2 + Math.floor(Math.random() * 3); // 2-4 fragments
              console.log(`Creating ${fragmentCount} fragments for asteroid ${data.id} with radius ${asteroid.radius}`);
              
              for (let i = 0; i < fragmentCount; i++) {
                // Generate a random seed for this fragment
                const seed = Math.floor(Math.random() * 1e9);
                function seededRandom(seed) {
                  var x = Math.sin(seed++) * 10000;
                  return x - Math.floor(x);
                }
                const angle = (Math.PI * 2 / fragmentCount) * i + seededRandom(seed) * 0.5;
                const distance = 20 + seededRandom(seed + 1) * 30;
                const fragmentRadius = asteroid.radius * 0.3 + seededRandom(seed + 2) * asteroid.radius * 0.2;
                
                // Calculate fragment velocity for movement
                const velocityMagnitude = 30 + seededRandom(seed + 5) * 40; // Random speed between 30-70
                const velocityAngle = angle + (seededRandom(seed + 6) - 0.5) * Math.PI * 0.5; // Slight random direction
                
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
                  seed: seed
                };
                fragments.push(fragment);
                gameState.asteroids.push(fragment);
                console.log(`Created fragment ${fragment.id} at (${fragment.x}, ${fragment.y}) with radius ${fragment.radius}, seed ${seed}`);
              }
            } else {
              console.log(`Asteroid ${data.id} destroyed without splitting (30% chance)`);
            }
          } else {
            console.log(`Asteroid ${data.id} too small to split (radius: ${asteroid.radius})`);
          }
          
          // Remove original asteroid from server state
          const asteroidIndex = gameState.asteroids.findIndex(a => a.id === data.id);
          if (asteroidIndex >= 0) {
            gameState.asteroids.splice(asteroidIndex, 1);
          }
          
          // Broadcast asteroid destruction and any fragments to all clients
          io.emit('asteroidDestroyed', {
            asteroidId: data.id,
            destroyedBy: socket.id,
            position: { x: asteroid.x, y: asteroid.y },
            fragments: fragments // Include fragment data
          });
          
          console.log(`Asteroid ${data.id} destroyed by player ${socket.id}. Created ${fragments.length} fragments. Broadcasting to all clients. ${gameState.asteroids.length} asteroids remaining.`);
        } else {
          // Broadcast asteroid hit (damage) to all clients
          io.emit('asteroidHit', {
            asteroidId: data.id,
            damage: data.damage,
            playerId: socket.id,
            remainingHealth: asteroid.health
          });
        }
      }
      
      // Award points and credits to the player
      if (gameState.players[socket.id]) {
        const oldScore = gameState.players[socket.id].score;
        gameState.players[socket.id].score += data.points || 0;
        gameState.players[socket.id].credits += data.credits || 0;
        console.log(`Player ${gameState.players[socket.id].name} scored ${data.points || 0} points. Score: ${oldScore} -> ${gameState.players[socket.id].score}`);
        // Broadcast updated stats to all clients
        console.log(`Broadcasting score update for asteroid kill: ${socket.id}`);
        io.emit('playerStatsUpdate', {
          id: socket.id,
          score: gameState.players[socket.id].score,
          wins: gameState.players[socket.id].wins,
          losses: gameState.players[socket.id].losses
        });
      }
      
      // Check if asteroid is destroyed
      if (data.destroyed) {
        socket.broadcast.emit('asteroidDestroyed', {
          asteroidId: data.id,
          playerId: socket.id
        });
      }
    } else if (data.type === 'player') {
      // Handle player hit
      socket.broadcast.emit('playerHit', {
        targetId: data.targetId,
        damage: data.damage,
        attackerId: socket.id
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
        
        console.log(`Player ${player.name} took ${data.damage} damage. Shield: ${oldShield} -> ${player.shield}, Health: ${oldHealth} -> ${player.health}`);
        
        // Broadcast updated health and shield to all clients
        console.log(`Broadcasting health/shield update for player ${data.targetId}: health = ${player.health}, shield = ${player.shield}`);
        io.emit('playerHealthUpdate', {
          id: data.targetId,
          health: player.health,
          shield: player.shield
        });
        
        // Check if player is destroyed
        if (player.health <= 0) {
          // Increment losses for the player who died
          player.losses += 1;
          console.log(`Player ${player.name} was destroyed by player ${gameState.players[socket.id]?.name}! Losses: ${player.losses}`);
          
          // Check if attacker is an NPC (Alien or Dreadnaught)
          let npcType = null;
          if (!gameState.players[socket.id]) {
            const npc = gameState.npcs.find(n => n.id === data.attackerId);
            if (npc) {
              npcType = npc.type;
            }
          }
          io.emit('playerDestroyed', {
            playerId: data.targetId,
            attackerId: socket.id,
            killerAvatar: gameState.players[socket.id]?.avatar || 'han',
            killerName: gameState.players[socket.id]?.name || `Player-${socket.id.substring(0, 4)}`,
            npcType: npcType
          });
          
          // Award points to the attacker
          if (gameState.players[socket.id]) {
            gameState.players[socket.id].score += 500; // Points for defeating a player
            gameState.players[socket.id].credits += 250; // Credits for defeating a player
            
            console.log(`Player ${socket.id} destroyed player ${data.targetId}. Awarded 500 points and 250 credits.`);
            
            // Broadcast updated attacker stats
            io.emit('playerUpdate', {
              id: socket.id,
              score: gameState.players[socket.id].score,
              credits: gameState.players[socket.id].credits
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
          velocity: data.velocity
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
      const v1x = (src.velocity && typeof src.velocity.x === 'number') ? src.velocity.x : 0;
      const v1y = (src.velocity && typeof src.velocity.y === 'number') ? src.velocity.y : 0;
      const v2x = (tgt.velocity && typeof tgt.velocity.x === 'number') ? tgt.velocity.x : 0;
      const v2y = (tgt.velocity && typeof tgt.velocity.y === 'number') ? tgt.velocity.y : 0;

      // Relative velocity along normal
      const relVel = (v1x - v2x) * nx + (v1y - v2y) * ny;

      // Restitution (bounciness)
      const restitution = 0.6; // tweakable

      // Only apply impulse if closing (relVel < 0)
      if (relVel < 0) {
        // Equal mass impulse magnitude j = -(1+e) * relVel / (1/m1 + 1/m2) with m1=m2=1 -> divide by 2
        const j = (-(1 + restitution) * relVel) / 2;

        // Apply impulse
        const newV1x = v1x + j * nx;
        const newV1y = v1y + j * ny;
        const newV2x = v2x - j * nx;
        const newV2y = v2y - j * ny;

        src.velocity = { x: newV1x, y: newV1y };
        tgt.velocity = { x: newV2x, y: newV2y };
      }

      // Simple separation to prevent overlap (assume collision radius ~15 each)
      const radius = 15;
      const penetration = (radius + radius) - distance; // both radii
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
        velocity: src.velocity
      });
      io.emit('playerMoved', {
        id: tgtId,
        x: tgt.x,
        y: tgt.y,
        rotation: tgt.rotation,
        velocity: tgt.velocity
      });

      // Also emit a collision visual/sound event to all clients
      io.emit('playerCollision', {
        sourceId: srcId,
        targetId: tgtId,
        position: { x: (src.x + tgt.x) / 2, y: (src.y + tgt.y) / 2 },
        velocity: src.velocity
      });

      console.log(`Resolved collision server-side: ${srcId} <-> ${tgtId}`);
    } catch (err) {
      console.error('Error resolving playerCollision:', err);
      // fallback: broadcast the original collision for visuals
      socket.broadcast.emit('playerCollision', {
        sourceId: data.sourceId,
        targetId: data.targetId,
        position: data.position,
        velocity: data.velocity
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
      console.log(`Player ${gameState.players[socket.id].name} was destroyed by an asteroid! Losses: ${gameState.players[socket.id].losses}`);
      
      // Broadcast the asteroid death to all clients
      io.emit('playerDestroyedByAsteroid', {
        playerId: socket.id,
        playerName: gameState.players[socket.id].name
      });
      
      // Broadcast updated stats to all clients
      io.emit('playerStatsUpdate', {
        id: socket.id,
        score: gameState.players[socket.id].score,
        wins: gameState.players[socket.id].wins,
        losses: gameState.players[socket.id].losses
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
      
      socket.broadcast.emit('playerRespawned', {
        id: socket.id,
        x: gameState.players[socket.id].x,
        y: gameState.players[socket.id].y
      });

      // Emit analytics respawn event so server records life start
      try {
        // Only create analytics event if we have proper analytics data
        if (socket.analytics && socket.analytics.playerId && socket.analytics.sessionId) {
          const clientIp = socket.request.connection.remoteAddress || socket.request.headers['x-forwarded-for'] || 'unknown';
          const respawnEvent = {
            sessionId: socket.analytics.sessionId,
            playerId: socket.analytics.playerId,
            eventType: 'respawn',
            timestamp: Date.now(),
            data: { x: gameState.players[socket.id].x, y: gameState.players[socket.id].y }
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
          shipSkin: 'none'
        });
      }
    }
    // Also emit server-side analytics for purchases (in case client didn't)
    try {
      const clientIp = socket.request.connection.remoteAddress || socket.request.headers['x-forwarded-for'] || 'unknown';
      const purchaseEvent = {
        sessionId: socket.analytics && socket.analytics.sessionId ? socket.analytics.sessionId : `session_${Date.now()}_${socket.id}`,
        playerId: socket.analytics && socket.analytics.playerId ? socket.analytics.playerId : socket.id,
        eventType: 'shop_purchase',
        timestamp: Date.now(),
        data: {
          type: data.type,
          item: data.id,
          cost: data.cost || 0,
          credits: data.credits || null
        }
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
        color: data.color
      });
      
      console.log(`Player ${gameState.players[socket.id].name} changed ship color to ${data.color}`);
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
      shipSkin: gameState.players[socket.id].shipSkin || 'none'
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
        color: data.color
      });
      
      console.log(`Player ${gameState.players[socket.id].name} changed engine color to ${data.color}`);
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
        skinId: data.skinId
      });
      
      console.log(`Player ${gameState.players[socket.id].name} changed ship skin to ${data.skinId}`);
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
        color: gameState.players[data.playerId].color
      });
      
      console.log(`Player ${socket.id} requested data for player ${data.playerId}`);
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
      
      console.log(`Player ${socket.id} changed name from ${oldName} to ${data.name}`);
      
      // Notify all clients about the name change
      io.emit('playerNameChanged', {
        id: socket.id,
        oldName: oldName,
        newName: data.name
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
      attackerId: socket.id
    });
    
    console.log(`Shield disruption: ${socket.id} -> ${data.targetId} for ${data.duration}s`);
  });

  // Handle NPC spawn events
  socket.on('npcSpawn', (npcData) => {
    playerLastActivity[socket.id] = Date.now();
    
    // Add NPC to server game state
    gameState.npcs.push({
      ...npcData,
      spawnerId: socket.id,
      spawnTime: Date.now()
    });
    
    // Broadcast NPC spawn to all other players
    socket.broadcast.emit('npcSpawn', npcData);
    
    console.log(`NPC spawned: ${npcData.type} (${npcData.id}) by player ${socket.id}`);
  });

  // Handle NPC destruction events
  socket.on('npcDestroyed', (data) => {
    playerLastActivity[socket.id] = Date.now();
    
    // Remove NPC from server game state
    gameState.npcs = gameState.npcs.filter(npc => npc.id !== data.npcId);
    
    // Broadcast NPC destruction to all other players
    socket.broadcast.emit('npcDestroyed', data);
    
    console.log(`NPC destroyed: ${data.npcId} by player ${socket.id}`);
  });

  // Handle NPC leaving events
  socket.on('npcLeaving', (data) => {
    playerLastActivity[socket.id] = Date.now();
    
    // Remove NPC from server game state
    gameState.npcs = gameState.npcs.filter(npc => npc.id !== data.npcId);
    
    // Broadcast NPC leaving to all other players
    socket.broadcast.emit('npcLeaving', data);
    
    console.log(`NPC leaving: ${data.npcId}`);
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
    const activePlayers = Object.keys(gameState.players).filter(playerId => {
      const lastActivity = playerLastActivity[playerId] || 0;
      return now - lastActivity < DREADNAUGHT_ACTIVITY_THRESHOLD;
    }).length;
    
    socket.emit('dreadnaughtScheduleInfo', {
      nextSpawnTime: nextDreadnaughtSpawn,
      timeUntilNext: timeUntilNext,
      lastSpawnTime: lastDreadnaughtSpawn,
      activePlayers: activePlayers,
      minPlayersNeeded: DREADNAUGHT_MIN_PLAYERS,
      dreadnaughtActive: gameState.npcs.some(npc => npc.type === 'dreadnaught')
    });
  });

  // Handle admin force next dreadnaught spawn
  socket.on('forceNextDreadnaught', () => {
    playerLastActivity[socket.id] = Date.now();
    
    // Set next spawn to now (will trigger on next check)
    nextDreadnaughtSpawn = Date.now();
    
    console.log(`Admin ${socket.id} forced next dreadnaught spawn`);
    socket.emit('adminMessage', 'Next dreadnaught spawn triggered! It will spawn within 30 seconds if conditions are met.');
  });

  // Handle NPC state updates (position, rotation, etc.)
  socket.on('npcUpdate', (updateData) => {
    playerLastActivity[socket.id] = Date.now();
    
    // Update NPC in server game state
    const npc = gameState.npcs.find(npc => npc.id === updateData.id && npc.spawnerId === socket.id);
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
      targetSocket.emit('npcProjectileHit', {
        damage: hitData.damage,
        projectileType: hitData.projectileType
      });
      console.log(`NPC projectile hit forwarded to player ${hitData.playerId} for ${hitData.damage} damage`);
    }
  });
  
  // Ping/heartbeat from client (to keep connection alive and reset inactivity timer)
  socket.on('ping', () => {
    playerLastActivity[socket.id] = Date.now();
  });

  // Handle asteroid destruction from players (for syncing fragments and powerups)
  socket.on('asteroidDestroyed', (data) => {
    playerLastActivity[socket.id] = Date.now();
    
    console.log(`🌟 SERVER: Player ${socket.id} destroyed asteroid ${data.asteroidId}`);
    console.log(`🌟 SERVER: Fragments: ${data.fragments ? data.fragments.length : 0}, Powerups: ${data.powerups ? data.powerups.length : 0}`);
    
    // Broadcast the destruction to all other players
    console.log(`🌟 SERVER: Broadcasting to ${Object.keys(gameState.players).length - 1} other players`);
    socket.broadcast.emit('playerAsteroidDestroyed', {
      playerId: socket.id,
      asteroidId: data.asteroidId,
      position: data.position,
      fragments: data.fragments,
      powerups: data.powerups,
      explosion: data.explosion
    });
  });

  // Handle projectile impacts from players (for visual sync)
  socket.on('projectileImpact', (data) => {
    playerLastActivity[socket.id] = Date.now();
    
    // Broadcast the impact to all other players
    socket.broadcast.emit('playerProjectileImpact', {
      playerId: socket.id,
      x: data.x,
      y: data.y,
      radius: data.radius,
      asteroidId: data.asteroidId
    });
  });
  
  // Handle chat messages
  socket.on('chatMessage', (data) => {
    const player = gameState.players[socket.id];
    if (player && data.message) {
      const message = data.message.substring(0, 100); // Limit message length
      console.log(`[CHAT] ${player.name}: ${message}`);
      io.emit('chatMessage', {
        name: player.name,
        message: message,
        isSystem: false
      });
    }
  });
  
  // Player disconnect
  socket.on('disconnect', () => {
    // Synthesize session_end for analytics when possible
    try {
      const clientIp = socket.request && socket.request.connection && (socket.request.connection.remoteAddress || socket.request.headers['x-forwarded-for']) || 'unknown';
      if (socket.analytics && socket.analytics.playerId) {
        const pid = socket.analytics.playerId;
        const sessionObj = analytics.sessions.get(pid);
        if (sessionObj) {
          // compute approximate session duration
          const start = socket.analytics.startTime || sessionObj.startTime || Date.now();
          const duration = Math.max(0, Date.now() - start);
          const endEvent = {
            sessionId: socket.analytics.sessionId || `session_${Date.now()}_${pid}`,
            playerId: pid,
            eventType: 'session_end',
            timestamp: Date.now(),
            data: { sessionDuration: duration }
          };
          analytics.processEvent(endEvent, clientIp);
          
          console.log(`📊 Player left analytics: ${pid} (Session duration: ${Math.floor(duration/1000)}s, Active players: ${analytics.sessions.size})`);
        }
      }
    } catch (e) {
      console.error('Error synthesizing session_end on disconnect:', e);
    }

    if (gameState.players[socket.id]) {
      console.log(`Player ${gameState.players[socket.id].name} disconnected`);
      
      // Clean up NPCs spawned by this player
      const playerNPCs = gameState.npcs.filter(npc => npc.spawnerId === socket.id);
      if (playerNPCs.length > 0) {
        console.log(`Cleaning up ${playerNPCs.length} NPCs spawned by disconnected player`);
        
        // Remove NPCs from game state
        gameState.npcs = gameState.npcs.filter(npc => npc.spawnerId !== socket.id);
        
        // Notify all clients to remove these NPCs
        playerNPCs.forEach(npc => {
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
      io.emit('playerCountUpdate', Object.keys(gameState.players).length);
    } else {
      console.log(`Unknown player disconnected: ${socket.id}`);
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
      console.log(`Disconnecting inactive player: ${playerName} (${socketId})`);
      
      // Notify all clients about the timeout
      io.emit('playerTimedOut', {
        id: socketId,
        name: playerName
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
  io.emit('worldUpdate', {
    asteroids: gameState.asteroids,
    powerups: gameState.powerups
  });
}

// Run world update at a lower frequency than client frame rate
setInterval(updateWorld, 1000 / 10); // 10 updates per second

// Generate a random color for players
function getRandomColor() {
  const colors = ['#f44', '#4f4', '#44f', '#ff4', '#4ff', '#f4f', '#fa4', '#a4f'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SuperSpace multiplayer server running on port ${PORT}`);
});

// Secure reset endpoint for analytics data (POST only, requires header)
app.post('/analytics/reset', async (req, res) => {
  try {
    const secretHeader = req.get('x-analytics-secret');
    const envSecret = process.env.ANALYTICS_RESET_SECRET || 'superspaceRESET_8f7c2b1e4d9a';
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
      if (analytics.sessions && typeof analytics.sessions.clear === 'function') {
        analytics.sessions.clear();
      }
      analytics.sessions = new Map();
      analytics.currentActive = 0;
      analytics.globalPeak = 0;
      await analytics.saveMeta();
      // create today's empty stats
      analytics.dailyStats.set(analytics.getDateString(), analytics.createEmptyDayStats());
      // Log session count for verification
      console.log('[Analytics Reset] Active sessions after reset:', analytics.sessions.size);
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
    const envSecret = process.env.ANALYTICS_RESET_SECRET || 'superspaceRESET_8f7c2b1e4d9a';
    if (!secretHeader || secretHeader !== envSecret) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({
      logs: logBuffer.slice(-50), // Last 50 log entries
      serverTime: new Date().toISOString(),
      activeSessions: analytics.sessions.size,
      activeGamePlayers: Object.keys(gameState.players).length
    });
  } catch (error) {
    console.error('Error in debug logs endpoint:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});