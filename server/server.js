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

// Game state
const gameState = {
  players: {},
  asteroids: [],
  powerups: []
};

// Connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Player joined
  socket.on('playerJoin', (playerData) => {
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
      credits: 0,
      color: playerData.color || getRandomColor(),
      projectiles: []
    };
    
    // Send the current game state to the new player
    socket.emit('gameState', gameState);
    
    // Notify all clients about the new player
    socket.broadcast.emit('playerJoined', gameState.players[socket.id]);
    
    console.log(`Player ${gameState.players[socket.id].name} joined the game`);
  });
  
  // Player movement update
  socket.on('playerUpdate', (data) => {
    const player = gameState.players[socket.id];
    if (player) {
      // Update player state
      player.x = data.x;
      player.y = data.y;
      player.rotation = data.rotation;
      player.velocity = data.velocity;
      player.health = data.health;
      player.ship = data.ship;
      
      // Broadcast the updated position to all other players
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        x: player.x,
        y: player.y,
        rotation: player.rotation,
        velocity: player.velocity,
        ship: player.ship
      });
    }
  });
  
  // Player fired a projectile
  socket.on('playerFire', (projectile) => {
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
            
            console.log(`Player ${gameState.players[socket.id].name} destroyed ${gameState.players[data.targetId].name}`);
          }
        }
      }
    }
  });
  
  // Player respawn
  socket.on('respawn', (data) => {
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
  
  // Player name change
  socket.on('playerNameChange', (data) => {
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
  
  // Player disconnect
  socket.on('disconnect', () => {
    if (gameState.players[socket.id]) {
      console.log(`Player ${gameState.players[socket.id].name} disconnected`);
      
      // Send player left message to all other clients
      socket.broadcast.emit('playerLeft', socket.id);
      
      // Remove the player from the game state
      delete gameState.players[socket.id];
    } else {
      console.log(`Unknown player disconnected: ${socket.id}`);
    }
  });
});

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