export class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.players = {};
        this.playerId = null;
        this.playerName = "Player-" + Math.floor(Math.random() * 1000);
        this.lastUpdate = 0;
        this.updateInterval = 50; // 50ms = 20 updates per second
    }

    connect(serverUrl = 'http://localhost:3000') {
        // Load Socket.IO client library dynamically
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
            script.integrity = 'sha384-/KNQL8Nu5gCHLqwqfQjA689Hhoqgi2S84SNUxC3roTe4EhJ9AfLkp8QiQcU8AMzI';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                try {
                    this.socket = io(serverUrl);
                    this.setupSocketEvents();
                    resolve(true);
                } catch (error) {
                    console.error('Error connecting to multiplayer server:', error);
                    reject(error);
                }
            };
            script.onerror = (error) => {
                console.error('Error loading Socket.IO client:', error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.connected = true;
            this.playerId = this.socket.id;
            
            // Join the game
            this.joinGame();
            
            // Add connection status indicator
            this.addConnectionIndicator();
            
            // Show the player list UI
            this.createPlayerListUI();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
            this.updateConnectionIndicator(false);
        });

        // Game state update from server
        this.socket.on('gameState', (state) => {
            console.log('Received game state:', state);
            
            // Process all players
            Object.values(state.players).forEach(playerData => {
                if (playerData.id !== this.playerId) {
                    this.updateRemotePlayer(playerData);
                }
            });
            
            // Update player list
            this.updatePlayerList(state.players);
        });

        // Another player joined
        this.socket.on('playerJoined', (player) => {
            console.log('Player joined:', player);
            this.addRemotePlayer(player);
            this.updatePlayerList();
            
            // Show welcome message
            this.showGameMessage(`${player.name} joined the game`, '#4f4');
        });

        // Another player left
        this.socket.on('playerLeft', (playerId) => {
            console.log('Player left:', playerId);
            this.removeRemotePlayer(playerId);
            this.updatePlayerList();
            
            const playerName = this.players[playerId]?.name || 'A player';
            this.showGameMessage(`${playerName} left the game`, '#f44');
        });

        // Player movement updates
        this.socket.on('playerMoved', (data) => {
            this.updateRemotePlayer(data);
        });

        // Handle projectiles from other players
        this.socket.on('projectileFired', (data) => {
            this.handleRemoteProjectile(data.playerId, data.projectile);
        });

        // Handle hits on asteroids
        this.socket.on('asteroidHit', (data) => {
            this.handleAsteroidHit(data.asteroidId, data.damage, data.playerId);
        });

        // Handle asteroid destruction
        this.socket.on('asteroidDestroyed', (data) => {
            this.handleAsteroidDestroyed(data.asteroidId, data.playerId);
        });

        // Handle player getting hit
        this.socket.on('playerHit', (data) => {
            if (data.targetId === this.playerId) {
                this.handleDamage(data.damage, data.attackerId);
            }
        });

        // Handle player being destroyed
        this.socket.on('playerDestroyed', (data) => {
            if (data.playerId === this.playerId) {
                this.handleDeath(data.attackerId);
            } else {
                this.handleRemotePlayerDeath(data.playerId, data.attackerId);
            }
        });

        // Handle player respawn
        this.socket.on('playerRespawned', (data) => {
            this.handleRemotePlayerRespawn(data.id, data.x, data.y);
        });

        // Handle world updates (asteroids, powerups)
        this.socket.on('worldUpdate', (data) => {
            // Update any world entities managed by the server
            // This would synchronize asteroids and powerups between clients
        });

        // Handle player ship changes
        this.socket.on('playerShipChanged', (data) => {
            if (this.players[data.id]) {
                this.players[data.id].ship = data.ship;
            }
        });
    }

    // Send player data to server
    joinGame() {
        if (!this.connected) return;
        
        const playerData = {
            x: this.game.player.x,
            y: this.game.player.y,
            rotation: this.game.player.rotation,
            ship: this.game.player.shipId || 'scout',
            name: this.playerName,
            color: this.getRandomPlayerColor()
        };
        
        this.socket.emit('playerJoin', playerData);
    }

    // Update local player data to server
    update(deltaTime) {
        if (!this.connected) return;
        
        this.lastUpdate += deltaTime * 1000; // Convert to milliseconds
        
        if (this.lastUpdate >= this.updateInterval) {
            const playerData = {
                x: this.game.player.x,
                y: this.game.player.y,
                rotation: this.game.player.rotation,
                velocity: this.game.player.velocity,
                health: this.game.player.health,
                ship: this.game.player.shipId || 'scout'
            };
            
            this.socket.emit('playerUpdate', playerData);
            this.lastUpdate = 0;
        }
    }

    // Send projectile data when player shoots
    sendProjectile(projectile) {
        if (!this.connected) return;
        
        const projectileData = {
            x: projectile.x,
            y: projectile.y,
            velocityX: projectile.velocityX,
            velocityY: projectile.velocityY,
            damage: projectile.damage,
            type: projectile.type || 'laser',
            color: projectile.color || '#f00'
        };
        
        this.socket.emit('playerFire', projectileData);
    }

    // Send hit data when player hits something
    sendHit(type, id, damage, points = 0, credits = 0, destroyed = false) {
        if (!this.connected) return;
        
        const hitData = {
            type: type, // 'asteroid' or 'player'
            id: id,
            damage: damage,
            points: points,
            credits: credits,
            destroyed: destroyed
        };
        
        // If hitting another player, specify the target
        if (type === 'player') {
            hitData.targetId = id;
        }
        
        this.socket.emit('hit', hitData);
    }

    // Send respawn request
    sendRespawn(x, y) {
        if (!this.connected) return;
        
        this.socket.emit('respawn', { x, y });
    }

    // Send purchase/upgrade data
    sendPurchase(type, id, credits) {
        if (!this.connected) return;
        
        this.socket.emit('playerPurchase', {
            type: type, // 'ship', 'weapon', 'upgrade'
            id: id,
            credits: credits
        });
    }

    // Add a visual remote player
    addRemotePlayer(playerData) {
        const player = {
            id: playerData.id,
            x: playerData.x || 0,
            y: playerData.y || 0,
            rotation: playerData.rotation || 0,
            health: playerData.health || 100,
            ship: playerData.ship || 'scout',
            name: playerData.name || 'Unknown',
            color: playerData.color || '#f00',
            projectiles: []
        };
        
        this.players[playerData.id] = player;
    }

    // Update a remote player's data
    updateRemotePlayer(playerData) {
        let player = this.players[playerData.id];
        
        if (!player) {
            this.addRemotePlayer(playerData);
            player = this.players[playerData.id];
        }
        
        // Update player position and state
        if (player) {
            player.x = playerData.x || player.x;
            player.y = playerData.y || player.y;
            player.rotation = playerData.rotation || player.rotation;
            player.velocity = playerData.velocity || player.velocity;
            player.health = playerData.health || player.health;
            player.ship = playerData.ship || player.ship;
        }
    }

    // Remove a remote player
    removeRemotePlayer(playerId) {
        delete this.players[playerId];
    }

    // Handle receiving a projectile from another player
    handleRemoteProjectile(playerId, projectileData) {
        // Create a visual representation of the remote projectile
        const projectile = {
            x: projectileData.x,
            y: projectileData.y,
            velocityX: projectileData.velocityX,
            velocityY: projectileData.velocityY,
            damage: projectileData.damage,
            type: projectileData.type || 'laser',
            color: projectileData.color || '#f00',
            remoteId: playerId
        };
        
        // Add to remote player's projectiles if they exist
        if (this.players[playerId]) {
            if (!this.players[playerId].projectiles) {
                this.players[playerId].projectiles = [];
            }
            this.players[playerId].projectiles.push(projectile);
        }
    }

    // Handle damage to player
    handleDamage(damage, attackerId) {
        this.game.player.takeDamage(damage);
        
        // Show damage message
        const attacker = this.players[attackerId]?.name || 'Another player';
        this.showGameMessage(`Hit by ${attacker} (-${damage.toFixed(1)})`, '#f88');
    }

    // Handle player death (local)
    handleDeath(attackerId) {
        // Show death message
        const attacker = this.players[attackerId]?.name || 'Another player';
        this.showGameMessage(`Destroyed by ${attacker}!`, '#f44', 3000);
        
        // Respawn after delay
        setTimeout(() => {
            const spawnX = (Math.random() - 0.5) * 1000;
            const spawnY = (Math.random() - 0.5) * 1000;
            
            this.game.player.x = spawnX;
            this.game.player.y = spawnY;
            this.game.player.health = this.game.player.maxHealth;
            
            // Notify server about respawn
            this.sendRespawn(spawnX, spawnY);
            
            this.showGameMessage('Respawned!', '#4f4');
        }, 3000);
    }

    // Handle remote player death
    handleRemotePlayerDeath(playerId, attackerId) {
        const deadPlayer = this.players[playerId]?.name || 'A player';
        const attacker = attackerId === this.playerId 
            ? 'You' 
            : (this.players[attackerId]?.name || 'Another player');
        
        // Show kill message
        if (attackerId === this.playerId) {
            this.showGameMessage(`You destroyed ${deadPlayer}! (+500 pts, +250 credits)`, '#4f4');
        } else {
            this.showGameMessage(`${attacker} destroyed ${deadPlayer}!`, '#fff');
        }
    }

    // Handle remote player respawn
    handleRemotePlayerRespawn(playerId, x, y) {
        if (this.players[playerId]) {
            this.players[playerId].x = x;
            this.players[playerId].y = y;
            this.players[playerId].health = 100;
            
            const playerName = this.players[playerId].name;
            this.showGameMessage(`${playerName} respawned!`, '#8af');
        }
    }

    // Handle asteroid hit from another player
    handleAsteroidHit(asteroidId, damage, playerId) {
        // Find the asteroid by ID and apply damage
        for (let i = 0; i < this.game.world.asteroids.length; i++) {
            const asteroid = this.game.world.asteroids[i];
            if (asteroid.id === asteroidId) {
                asteroid.health -= damage;
                break;
            }
        }
    }

    // Handle asteroid destruction from another player
    handleAsteroidDestroyed(asteroidId, playerId) {
        // Find and remove the asteroid by ID
        for (let i = 0; i < this.game.world.asteroids.length; i++) {
            if (this.game.world.asteroids[i].id === asteroidId) {
                // Create explosion effect but don't award points to local player
                this.game.world.createExplosion(
                    this.game.world.asteroids[i].x, 
                    this.game.world.asteroids[i].y, 
                    this.game.world.asteroids[i].radius
                );
                
                // Remove the asteroid
                this.game.world.asteroids.splice(i, 1);
                break;
            }
        }
    }

    // Connection indicator UI
    addConnectionIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'connection-indicator';
        indicator.style.position = 'absolute';
        indicator.style.bottom = '20px';
        indicator.style.right = '20px';
        indicator.style.padding = '5px 10px';
        indicator.style.borderRadius = '5px';
        indicator.style.fontFamily = 'Arial, sans-serif';
        indicator.style.fontSize = '14px';
        indicator.style.fontWeight = 'bold';
        indicator.style.zIndex = '100';
        
        document.body.appendChild(indicator);
        
        this.updateConnectionIndicator(this.connected);
    }

    // Update connection indicator
    updateConnectionIndicator(connected) {
        const indicator = document.getElementById('connection-indicator');
        if (!indicator) return;
        
        if (connected) {
            indicator.textContent = '🟢 Online';
            indicator.style.backgroundColor = 'rgba(0, 100, 0, 0.7)';
            indicator.style.color = 'white';
            indicator.style.border = '1px solid #0f0';
        } else {
            indicator.textContent = '🔴 Offline';
            indicator.style.backgroundColor = 'rgba(100, 0, 0, 0.7)';
            indicator.style.color = 'white';
            indicator.style.border = '1px solid #f00';
        }
    }

    // Create player list UI
    createPlayerListUI() {
        const playerList = document.createElement('div');
        playerList.id = 'player-list';
        playerList.style.position = 'absolute';
        playerList.style.top = '20px';
        playerList.style.left = '20px';
        playerList.style.padding = '10px';
        playerList.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        playerList.style.color = 'white';
        playerList.style.borderRadius = '5px';
        playerList.style.border = '1px solid #555';
        playerList.style.fontFamily = 'Arial, sans-serif';
        playerList.style.fontSize = '14px';
        playerList.style.zIndex = '100';
        playerList.style.minWidth = '200px';
        
        const title = document.createElement('div');
        title.textContent = '🌐 PLAYERS ONLINE';
        title.style.fontWeight = 'bold';
        title.style.borderBottom = '1px solid #555';
        title.style.paddingBottom = '5px';
        title.style.marginBottom = '5px';
        
        playerList.appendChild(title);
        
        const listContainer = document.createElement('div');
        listContainer.id = 'player-list-container';
        playerList.appendChild(listContainer);
        
        document.body.appendChild(playerList);
    }

    // Update player list UI
    updatePlayerList() {
        const listContainer = document.getElementById('player-list-container');
        if (!listContainer) return;
        
        // Clear existing list
        listContainer.innerHTML = '';
        
        // Add current player
        const currentPlayerItem = document.createElement('div');
        currentPlayerItem.style.display = 'flex';
        currentPlayerItem.style.alignItems = 'center';
        currentPlayerItem.style.marginBottom = '5px';
        
        const currentPlayerColor = document.createElement('span');
        currentPlayerColor.style.display = 'inline-block';
        currentPlayerColor.style.width = '10px';
        currentPlayerColor.style.height = '10px';
        currentPlayerColor.style.backgroundColor = '#0f0';
        currentPlayerColor.style.borderRadius = '50%';
        currentPlayerColor.style.marginRight = '5px';
        
        const currentPlayerText = document.createElement('span');
        currentPlayerText.textContent = `${this.playerName} (You)`;
        currentPlayerText.style.color = '#0f0';
        
        currentPlayerItem.appendChild(currentPlayerColor);
        currentPlayerItem.appendChild(currentPlayerText);
        listContainer.appendChild(currentPlayerItem);
        
        // Add other players
        Object.values(this.players).forEach(player => {
            if (player.id === this.playerId) return;
            
            const playerItem = document.createElement('div');
            playerItem.style.display = 'flex';
            playerItem.style.alignItems = 'center';
            playerItem.style.marginBottom = '5px';
            
            const playerColor = document.createElement('span');
            playerColor.style.display = 'inline-block';
            playerColor.style.width = '10px';
            playerColor.style.height = '10px';
            playerColor.style.backgroundColor = player.color || '#f00';
            playerColor.style.borderRadius = '50%';
            playerColor.style.marginRight = '5px';
            
            const playerText = document.createElement('span');
            playerText.textContent = player.name;
            
            playerItem.appendChild(playerColor);
            playerItem.appendChild(playerText);
            listContainer.appendChild(playerItem);
        });
    }

    // Show game message (chat, kills, etc.)
    showGameMessage(message, color = '#fff', duration = 5000) {
        // Create messages container if it doesn't exist
        let messagesContainer = document.getElementById('game-messages');
        if (!messagesContainer) {
            messagesContainer = document.createElement('div');
            messagesContainer.id = 'game-messages';
            messagesContainer.style.position = 'absolute';
            messagesContainer.style.bottom = '100px';
            messagesContainer.style.left = '50%';
            messagesContainer.style.transform = 'translateX(-50%)';
            messagesContainer.style.width = '60%';
            messagesContainer.style.maxHeight = '150px';
            messagesContainer.style.overflowY = 'hidden';
            messagesContainer.style.display = 'flex';
            messagesContainer.style.flexDirection = 'column-reverse';
            messagesContainer.style.zIndex = '100';
            document.body.appendChild(messagesContainer);
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.style.color = color;
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageElement.style.borderRadius = '5px';
        messageElement.style.padding = '5px 10px';
        messageElement.style.margin = '5px 0';
        messageElement.style.textAlign = 'center';
        messageElement.style.fontFamily = 'Arial, sans-serif';
        messageElement.style.fontSize = '16px';
        messageElement.style.opacity = '1';
        messageElement.style.transition = 'opacity 0.5s ease';
        
        // Add to container
        messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);
        
        // Remove after duration
        setTimeout(() => {
            messageElement.style.opacity = '0';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 500);
        }, duration);
    }

    // Get a random player color
    getRandomPlayerColor() {
        const colors = [
            '#f44', '#4f4', '#44f', '#ff4', '#4ff', '#f4f',
            '#fa4', '#a4f', '#4af', '#f84', '#8f4', '#48f'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Render all remote players
    render(ctx) {
        if (!this.connected) return;
        
        Object.values(this.players).forEach(player => {
            if (player.id === this.playerId) return;
            
            // Draw remote player's ship
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.rotation);
            
            // Draw ship based on type
            if (player.ship === 'fighter') {
                // Fighter ship design
                ctx.fillStyle = player.color;
                ctx.beginPath();
                ctx.moveTo(20, 0);
                ctx.lineTo(-10, -15);
                ctx.lineTo(-5, -5);
                ctx.lineTo(-5, 5);
                ctx.lineTo(-10, 15);
                ctx.closePath();
                ctx.fill();
                
                // Engine glow
                ctx.fillStyle = '#ff6';
                ctx.beginPath();
                ctx.moveTo(-8, -7);
                ctx.lineTo(-15, 0);
                ctx.lineTo(-8, 7);
                ctx.closePath();
                ctx.fill();
            } else if (player.ship === 'cruiser') {
                // Heavy cruiser design
                ctx.fillStyle = player.color;
                ctx.beginPath();
                ctx.moveTo(25, 0);
                ctx.lineTo(10, -8);
                ctx.lineTo(-15, -20);
                ctx.lineTo(-10, -8);
                ctx.lineTo(-10, 8);
                ctx.lineTo(-15, 20);
                ctx.lineTo(10, 8);
                ctx.closePath();
                ctx.fill();
                
                // Engine glow
                ctx.fillStyle = '#f66';
                ctx.beginPath();
                ctx.moveTo(-12, -12);
                ctx.lineTo(-20, 0);
                ctx.lineTo(-12, 12);
                ctx.closePath();
                ctx.fill();
            } else {
                // Default scout ship design
                ctx.fillStyle = player.color;
                ctx.beginPath();
                ctx.moveTo(15, 0);
                ctx.lineTo(-10, -10);
                ctx.lineTo(-5, 0);
                ctx.lineTo(-10, 10);
                ctx.closePath();
                ctx.fill();
                
                // Engine glow
                ctx.fillStyle = '#6ff';
                ctx.beginPath();
                ctx.moveTo(-7, -5);
                ctx.lineTo(-12, 0);
                ctx.lineTo(-7, 5);
                ctx.closePath();
                ctx.fill();
            }
            
            // Draw player name
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(player.name, 0, -25);
            
            // Draw health bar
            const healthBarWidth = 30;
            const healthPercentage = Math.max(0, player.health / 100);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-healthBarWidth/2, -20, healthBarWidth, 4);
            
            ctx.fillStyle = healthPercentage > 0.6 ? '#0f0' : healthPercentage > 0.3 ? '#ff0' : '#f00';
            ctx.fillRect(-healthBarWidth/2, -20, healthBarWidth * healthPercentage, 4);
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-healthBarWidth/2, -20, healthBarWidth, 4);
            
            ctx.restore();
            
            // Draw remote player's projectiles
            if (player.projectiles) {
                player.projectiles.forEach((projectile, i) => {
                    // Update projectile position
                    projectile.x += projectile.velocityX * 0.016; // Assumes 60 FPS
                    projectile.y += projectile.velocityY * 0.016;
                    
                    // Draw projectile
                    ctx.fillStyle = projectile.color || '#f00';
                    ctx.beginPath();
                    ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Remove projectiles that are too far away
                    const dx = projectile.x - this.game.player.x;
                    const dy = projectile.y - this.game.player.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > 1000000) { // 1000 distance squared
                        player.projectiles.splice(i, 1);
                    }
                });
            }
        });
    }
}