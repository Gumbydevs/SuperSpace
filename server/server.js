const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');

// Create the Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure CORS to allow requests from any origin
// In production, you might want to restrict this to your frontend domain
app.use(cors());

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Add a home route that shows server status
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    players: Object.keys(gameState.players).length,
    uptime: process.uptime()
  });
});

// Create Socket.IO server with CORS configuration
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
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

// Connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
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
      ship: playerData.ship || 'scout',
      name: playerData.name || `Player-${socket.id.substring(0, 4)}`,
      score: 0,
      wins: 0,
      losses: 0,
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
      // Update player state
      player.x = data.x;
      player.y = data.y;
      player.rotation = data.rotation;
      player.velocity = data.velocity;
      player.health = data.health;
      player.ship = data.ship;
      player.color = data.color || player.color;
      
      // Broadcast the updated position to all other players
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        x: player.x,
        y: player.y,
        rotation: player.rotation,
        velocity: player.velocity,
        health: player.health,
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
  
  // Player hit something (asteroid, enemy, etc.)
  socket.on('hit', (data) => {
    // Update activity timestamp
    playerLastActivity[socket.id] = Date.now();
    
    if (data.type === 'asteroid') {
      // Handle asteroid hit
      socket.broadcast.emit('asteroidHit', {
        asteroidId: data.id,
        damage: data.damage,
        playerId: socket.id
      });
      
      // Award points and credits to the player
      if (gameState.players[socket.id]) {
        gameState.players[socket.id].score += data.points || 0;
        gameState.players[socket.id].credits += data.credits || 0;
        // Broadcast updated stats to all clients
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
        gameState.players[data.targetId].health -= data.damage;
        
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
            // Broadcast updated stats to all clients
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
            // Broadcast updated stats to all clients
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
  
  // Ping/heartbeat from client (to keep connection alive and reset inactivity timer)
  socket.on('ping', () => {
    playerLastActivity[socket.id] = Date.now();
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