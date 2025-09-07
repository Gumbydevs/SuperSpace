const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');

// Create the Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure CORS to allow requests from specific domains
app.use(cors({
  origin: '*',
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Add a home route that shows server status
app.get('/status', (req, res) => {
  console.log('Status endpoint hit from origin:', req.get('origin'));
  res.json({
    status: 'running',
    players: Object.keys(gameState.players).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Add a simple test endpoint for CORS testing
app.get('/test', (req, res) => {
  console.log('Test endpoint hit from origin:', req.get('origin'));
  res.json({ message: 'CORS test successful', origin: req.get('origin') });
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
  powerups: []
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

// Connection handling
io.on('connection', (socket) => {
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
      projectiles: []
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
        score: player.score,
        wins: player.wins,
        losses: player.losses
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
      
      // Update target player health
      if (gameState.players[data.targetId]) {
        const oldHealth = gameState.players[data.targetId].health;
        gameState.players[data.targetId].health -= data.damage;
        const newHealth = gameState.players[data.targetId].health;
        
        console.log(`Player ${gameState.players[data.targetId].name} took ${data.damage} damage. Health: ${oldHealth} -> ${newHealth}`);
        
        // Broadcast updated health to all clients
        console.log(`Broadcasting health update for player ${data.targetId}: health = ${newHealth}`);
        io.emit('playerHealthUpdate', {
          id: data.targetId,
          health: gameState.players[data.targetId].health
        });
        
        // Check if player is destroyed
        if (gameState.players[data.targetId].health <= 0) {
          io.emit('playerDestroyed', {
            playerId: data.targetId,
            attackerId: socket.id
          });
          
          // Award points to the attacker
          if (gameState.players[socket.id]) {
            gameState.players[socket.id].score += 500; // Points for defeating a player
            gameState.players[socket.id].credits += 250; // Credits for defeating a player
            gameState.players[socket.id].wins += 1; // Increment wins for attacker
            console.log(`Player ${gameState.players[socket.id].name} got a win! Wins: ${gameState.players[socket.id].wins}`);
            // Broadcast updated stats to all clients
            console.log(`Broadcasting attacker stats update for ${socket.id}`);
            io.emit('playerStatsUpdate', {
              id: socket.id,
              score: gameState.players[socket.id].score,
              wins: gameState.players[socket.id].wins,
              losses: gameState.players[socket.id].losses
            });
            console.log(`Player ${gameState.players[socket.id].name} destroyed ${gameState.players[data.targetId].name}`);
          }
          
          // Increment losses for the destroyed player
          if (gameState.players[data.targetId]) {
            gameState.players[data.targetId].losses += 1;
            console.log(`Player ${gameState.players[data.targetId].name} got a loss! Losses: ${gameState.players[data.targetId].losses}`);
            // Broadcast updated stats to all clients
            console.log(`Broadcasting victim stats update for ${data.targetId}`);
            io.emit('playerStatsUpdate', {
              id: data.targetId,
              score: gameState.players[data.targetId].score,
              wins: gameState.players[data.targetId].wins,
              losses: gameState.players[data.targetId].losses
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
    
    // Broadcast the collision to other players
    socket.broadcast.emit('playerCollision', {
      sourceId: data.sourceId,
      targetId: data.targetId,
      position: data.position,
      velocity: data.velocity
    });
    
    console.log(`Player collision: ${data.sourceId} collided with ${data.targetId}`);
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
        socket.broadcast.emit('playerShipChanged', {
          id: socket.id,
          ship: data.id
        });
      }
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
  
  // Player disconnect
  socket.on('disconnect', () => {
    if (gameState.players[socket.id]) {
      console.log(`Player ${gameState.players[socket.id].name} disconnected`);
      
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