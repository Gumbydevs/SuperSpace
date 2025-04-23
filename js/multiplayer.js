import { KillAnnouncer } from './killannouncer.js';

export class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.players = {};
        this.playerId = null;
        
        // Initialize our kill announcer system
        this.killAnnouncer = new KillAnnouncer();
        
        // Load player name from localStorage or use default
        this.playerName = localStorage.getItem('playerName') || "Pilot";
        
        // Check if player has already set their name in a previous session
        this.hasSetName = localStorage.getItem('hasSetName') === 'true';
        
        this.lastUpdate = 0;
        this.updateInterval = 50; // 50ms = 20 updates per second
        
        // Show offline status immediately
        this.addConnectionIndicator();
        this.createPlayerListUI();
        
        // Initialize player count to 0
        this.updatePlayerCount();
        
        // Preload the font for kill announcements
        this.killAnnouncer.preloadFont();
    }

    connect(serverUrl = 'http://localhost:3000') {
        // If we're already connected or have already set a name, skip the dialog
        const showNameDialog = !this.connected && !this.hasSetName;
        
        // Create a promise chain that may or may not include the name dialog
        let connectionPromise = Promise.resolve();
        
        // Only show the name dialog if needed
        if (showNameDialog) {
            connectionPromise = this.showPlayerNameDialog().then(() => {
                // Mark that we've set the name to avoid showing the dialog again
                this.hasSetName = true;
            });
        }
        
        // Then connect to the server
        return connectionPromise.then(() => {
            // Now load Socket.IO client library dynamically
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
        });
    }

    // Show dialog to let player set their name
    showPlayerNameDialog() {
        return new Promise((resolve) => {
            // Create modal backdrop
            const backdrop = document.createElement('div');
            backdrop.style.position = 'fixed';
            backdrop.style.top = '0';
            backdrop.style.left = '0';
            backdrop.style.width = '100%';
            backdrop.style.height = '100%';
            backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            backdrop.style.display = 'flex';
            backdrop.style.justifyContent = 'center';
            backdrop.style.alignItems = 'center';
            backdrop.style.zIndex = '1000';
            
            // Create modal dialog
            const dialog = document.createElement('div');
            dialog.style.backgroundColor = '#222';
            dialog.style.color = 'white';
            dialog.style.borderRadius = '10px';
            dialog.style.padding = '20px';
            dialog.style.maxWidth = '400px';
            dialog.style.width = '90%';
            dialog.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
            dialog.style.border = '2px solid #444';
            
            // Create dialog title
            const title = document.createElement('h2');
            title.textContent = '💫 Enter Your Pilot Name';
            title.style.margin = '0 0 20px 0';
            title.style.textAlign = 'center';
            title.style.color = '#4af';
            title.style.textShadow = '0 0 5px rgba(64, 170, 255, 0.7)';
            dialog.appendChild(title);
            
            // Create input group
            const inputGroup = document.createElement('div');
            inputGroup.style.marginBottom = '20px';
            
            // Add label
            const label = document.createElement('label');
            label.textContent = 'Choose your pilot name:';
            label.style.display = 'block';
            label.style.marginBottom = '8px';
            label.style.color = '#ccc';
            inputGroup.appendChild(label);
            
            // Add input field - use the exact stored name as default
            const input = document.createElement('input');
            input.type = 'text';
            input.value = this.playerName; // Use the stored name without modifications
            input.style.width = '100%';
            input.style.padding = '10px';
            input.style.borderRadius = '5px';
            input.style.border = '1px solid #555';
            input.style.backgroundColor = '#333';
            input.style.color = '#fff';
            input.style.fontSize = '16px';
            input.style.outline = 'none';
            input.style.boxSizing = 'border-box';
            
            // Select all text when focused
            input.onclick = () => input.select();
            
            // Add input field with auto-select
            inputGroup.appendChild(input);
            dialog.appendChild(inputGroup);
            
            // Create buttons container
            const buttons = document.createElement('div');
            buttons.style.display = 'flex';
            buttons.style.justifyContent = 'center';
            buttons.style.gap = '10px';
            
            // Create confirm button
            const confirmButton = document.createElement('button');
            confirmButton.textContent = '🚀 Connect';
            confirmButton.style.padding = '10px 20px';
            confirmButton.style.borderRadius = '5px';
            confirmButton.style.border = 'none';
            confirmButton.style.backgroundColor = '#4af';
            confirmButton.style.color = 'white';
            confirmButton.style.cursor = 'pointer';
            confirmButton.style.fontSize = '16px';
            confirmButton.style.fontWeight = 'bold';
            confirmButton.style.transition = 'background-color 0.2s';
            
            // Hover effect
            confirmButton.onmouseover = () => {
                confirmButton.style.backgroundColor = '#6cf';
            };
            confirmButton.onmouseout = () => {
                confirmButton.style.backgroundColor = '#4af';
            };
            
            confirmButton.onclick = () => {
                // Validate and set player name (min 3 chars, max 15 chars)
                let name = input.value.trim();
                
                // Default to random name if empty
                if (name === '') {
                    name = 'Pilot-' + Math.floor(Math.random() * 1000);
                }
                
                // Enforce length limits
                if (name.length < 3) {
                    name = name.padEnd(3, '0');
                }
                
                if (name.length > 15) {
                    name = name.substring(0, 15);
                }
                
                // Update player name
                this.setPlayerName(name);
                
                // Remove modal
                document.body.removeChild(backdrop);
                
                // Resolve the promise
                resolve();
            };
            
            buttons.appendChild(confirmButton);
            dialog.appendChild(buttons);
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);
            
            // Focus the input field
            input.focus();
            input.select();
            
            // Submit on Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    confirmButton.click();
                }
            });
        });
    }

    // Set player name and update UI if needed
    setPlayerName(name) {
        this.playerName = name;
        
        // Save player name to localStorage
        localStorage.setItem('playerName', name);
        
        // Save that we've set the name
        this.hasSetName = true;
        localStorage.setItem('hasSetName', 'true');
        
        // Update player list if already connected
        const playerList = document.getElementById('player-list-container');
        if (playerList) {
            this.updatePlayerList();
        }
        
        // Show confirmation message
        this.showGameMessage(`Welcome, ${name}!`, '#4af');
    }

    // Add ability to change name later
    showChangeNameUI() {
        this.showPlayerNameDialog().then(() => {
            // If already connected, update server with new name
            if (this.connected) {
                this.socket.emit('playerNameChange', {
                    id: this.playerId,
                    name: this.playerName
                });
            }
        });
    }

    setupSocketEvents() {
        // Handle connection to server
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.playerId = this.socket.id;
            this.connected = true;
            
            // Send player data to server after connecting
            this.socket.emit('playerJoin', {
                x: this.game.player.x,
                y: this.game.player.y,
                rotation: this.game.player.rotation,
                ship: this.game.player.currentShip || 'scout',
                name: this.playerName
            });
            
            // Show connection indicator
            this.updateConnectionIndicator(true);
            
            // Update the player count display
            this.updatePlayerCount();
        });

        // Handle disconnection from server
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
            this.players = {}; // Clear remote players
            
            // Show disconnected indicator
            this.updateConnectionIndicator(false);
            
            // Update the player count display
            this.updatePlayerCount();
            
            // Show disconnection message
            this.showGameMessage('Disconnected from server', '#f44', 5000);
        });

        // Handle connection error
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.connected = false;
            
            // Show disconnected indicator
            this.updateConnectionIndicator(false);
            
            // Update the player count display
            this.updatePlayerCount();
            
            // Show error message
            this.showGameMessage('Connection error: ' + error.message, '#f44', 5000);
        });

        // Handle receiving game state from server
        this.socket.on('gameState', (data) => {
            console.log('Received game state:', data);
            
            // Process all players in the game
            Object.values(data.players).forEach(player => {
                if (player.id !== this.playerId) {
                    this.addRemotePlayer(player);
                }
            });
            
            // Update the player count display
            this.updatePlayerCount();
            
            // Show connection success message
            this.showGameMessage('Connected to multiplayer server', '#4f4', 3000);
        });

        // Handle new player joining
        this.socket.on('playerJoined', (playerData) => {
            this.addRemotePlayer(playerData);
            this.showGameMessage(`${playerData.name} joined the game`, '#4ff');
            
            // Update the player count display
            this.updatePlayerCount();
        });

        // Handle player movement updates
        this.socket.on('playerMoved', (playerData) => {
            this.updateRemotePlayer(playerData);
        });

        // Handle player projectile firing
        this.socket.on('projectileFired', (data) => {
            this.handleRemoteProjectile(data.playerId, data.projectile);
        });

        // Handle projectile hits on players
        this.socket.on('projectileHit', (data) => {
            // Visualize hits on remote players (not on local player - those are handled by playerHit)
            if (data.targetId !== this.playerId) {
                this.handleRemoteProjectileHit(data.targetId, data.position, data.damage);
            }
        });

        // Handle player hits (damage)
        this.socket.on('playerHit', (data) => {
            if (data.targetId === this.playerId) {
                this.handleDamage(data.damage, data.attackerId);
            }
        });

        // Handle player destruction
        this.socket.on('playerDestroyed', (data) => {
            // Get player names for the kill message
            const killerName = data.attackerId === this.playerId ? 
                'You' : 
                (this.players[data.attackerId]?.name || 'Another player');
            
            const victimName = data.playerId === this.playerId ? 
                'you' : 
                (this.players[data.playerId]?.name || 'another player');
                
            // Announce the kill with the kill announcer system for all players
            // Show appropriate message based on player perspective
            if (data.attackerId === this.playerId) {
                // If you're the killer
                this.killAnnouncer.announceKill('You', victimName);
            } else if (data.playerId === this.playerId) {
                // If you're the victim - you see who killed you
                this.killAnnouncer.announceKill(killerName, 'you');
            } else {
                // If you're a spectator - you see who killed whom
                this.killAnnouncer.announceKill(killerName, victimName);
            }
            
            // Now handle the actual player death events
            if (data.playerId === this.playerId) {
                // Local player destroyed
                this.handleDeath(data.attackerId);
            } else {
                // Remote player destroyed
                this.handleRemotePlayerDeath(data.playerId, data.attackerId);
            }
        });

        // Handle player disconnection
        this.socket.on('playerLeft', (playerId) => {
            const playerName = this.players[playerId]?.name || 'A player';
            this.removeRemotePlayer(playerId);
            this.showGameMessage(`${playerName} left the game`, '#aaa');
            
            // Update the player count display
            this.updatePlayerCount();
        });

        // Handle player respawn
        this.socket.on('playerRespawned', (data) => {
            this.handleRemotePlayerRespawn(data.id, data.x, data.y);
        });

        // Handle player name changes
        this.socket.on('playerNameChanged', (data) => {
            // Update local cache of player names
            if (this.players[data.id]) {
                this.players[data.id].name = data.newName;
                
                // Rebuild the player list UI
                this.updatePlayerList();
                
                // Show notification message
                if (data.id !== this.playerId) {
                    this.showGameMessage(`${data.oldName} is now known as ${data.newName}`, '#fff');
                }
            }
        });

        // Handle player ship changes
        this.socket.on('playerShipChanged', (data) => {
            if (this.players[data.id]) {
                this.players[data.id].ship = data.ship;
            }
        });

        // Handle player timeout notifications
        this.socket.on('playerTimedOut', (data) => {
            this.removeRemotePlayer(data.id);
            this.showGameMessage(`${data.name} was disconnected due to inactivity`, '#ff9');
            
            // Update the player count display
            this.updatePlayerCount();
        });
        
        // Handle player collision events from other players
        this.socket.on('playerCollision', (data) => {
            // Get the player objects involved in the collision
            const sourcePlayer = this.players[data.sourceId];
            const targetPlayer = this.players[data.targetId];
            
            // Make sure both players exist in our local game state
            if (sourcePlayer && targetPlayer) {
                // Calculate the collision point (midway between the two ships)
                const collisionX = (sourcePlayer.x + targetPlayer.x) / 2;
                const collisionY = (sourcePlayer.y + targetPlayer.y) / 2;
                
                // Create a visual effect at the collision point
                if (this.game.world) {
                    this.game.world.createCollisionEffect(collisionX, collisionY);
                    
                    // Play collision sound
                    if (this.game.soundManager) {
                        this.game.soundManager.play('hit', {
                            volume: 0.4,
                            playbackRate: 1.2,
                            position: { x: collisionX, y: collisionY }
                        });
                    }
                }
            }
        });
        
        // Start ping interval to keep connection alive and reset inactivity timer
        this.startPingInterval();
    }

    // Send periodic pings to keep the connection active
    startPingInterval() {
        // Clear any existing interval first
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        // Start a new ping interval - send ping every 20 seconds
        this.pingInterval = setInterval(() => {
            if (this.connected) {
                this.socket.emit('ping');
            }
        }, 20000); // 20 seconds
    }

    // Handle cleanup when the game is closed
    cleanup() {
        // Clear ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        // Disconnect socket if connected
        if (this.socket && this.connected) {
            this.socket.disconnect();
        }
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
            angle: projectile.angle,
            velocity: {
                x: projectile.velocity.x,
                y: projectile.velocity.y
            },
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

    // Send player collision data when ships collide with each other
    sendPlayerCollision(targetId) {
        if (!this.connected || !this.socket) return;
        
        this.socket.emit('playerCollision', {
            sourceId: this.socket.id,
            targetId: targetId,
            position: {
                x: this.game.player.x,
                y: this.game.player.y
            },
            velocity: this.game.player.velocity
        });
    }

    // Send projectile hit data for remote players
    sendProjectileHit(targetId, hitX, hitY, damage) {
        if (!this.connected) return;
        
        this.socket.emit('projectileHit', {
            targetId: targetId,
            position: { x: hitX, y: hitY },
            damage: damage,
            attackerId: this.socket.id
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
            projectiles: [],
            destroyed: false // Add destroyed flag
        };
        
        this.players[playerData.id] = player;
        
        // Update the player list UI whenever a new player is added
        this.updatePlayerList();
        
        console.log("Added remote player:", player.name, "Total players:", Object.keys(this.players).length);
    }

    // Update a remote player's data
    updateRemotePlayer(playerData) {
        let player = this.players[playerData.id];
        
        if (!player) {
            this.addRemotePlayer(playerData);
            player = this.players[playerData.id];
        }
        
        // Update player position and state
        if (player && !player.destroyed) { // Skip updates for destroyed players
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
        
        // Update the player list UI when a player is removed
        this.updatePlayerList();
        
        console.log("Removed player:", playerId, "Total players:", Object.keys(this.players).length);
    }

    // Handle receiving a projectile from another player
    handleRemoteProjectile(playerId, projectileData) {
        // Create a visual representation of the remote projectile
        const projectile = {
            x: projectileData.x,
            y: projectileData.y,
            velocityX: projectileData.velocity ? projectileData.velocity.x : 0,
            velocityY: projectileData.velocity ? projectileData.velocity.y : 0,
            damage: projectileData.damage,
            type: projectileData.type || 'laser',
            color: projectileData.color || '#f00',
            remoteId: playerId
        };
        
        // Add to remote player's projectiles if they exist
        if (this.players[playerId] && !this.players[playerId].destroyed) { // Skip for destroyed players
            if (!this.players[playerId].projectiles) {
                this.players[playerId].projectiles = [];
            }
            this.players[playerId].projectiles.push(projectile);
        }
    }

    // Handle projectile hit on remote players
    handleRemoteProjectileHit(targetId, position, damage) {
        // Get the target player
        const targetPlayer = this.players[targetId];
        if (!targetPlayer || targetPlayer.destroyed) return; // Skip for destroyed players
        
        // Create visual hit effect at impact position
        if (this.game.world) {
            // Calculate exact hit position or use the provided position
            const hitX = position ? position.x : targetPlayer.x;
            const hitY = position ? position.y : targetPlayer.y;
            
            // Create main hit effect with small explosion
            this.game.world.createProjectileHitEffect(
                hitX, hitY, 
                15 + damage * 0.3, // Size based on damage
                this.game.soundManager
            );
            
            // Add secondary hit effects for more visual impact
            setTimeout(() => {
                if (!this.game || !this.game.world) return; // Safety check
                
                // Add a smaller secondary explosion
                const offsetX = (Math.random() - 0.5) * 10;
                const offsetY = (Math.random() - 0.5) * 10;
                
                this.game.world.createProjectileHitEffect(
                    hitX + offsetX,
                    hitY + offsetY,
                    8,
                    null // No additional sound for secondary explosion
                );
            }, 50);
            
            // Play hit sound with distance-based volume
            if (this.game.soundManager) {
                // Calculate distance from local player
                const dx = this.game.player.x - hitX;
                const dy = this.game.player.y - hitY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Scale volume based on distance and damage
                const maxDistance = 1000;
                const volumeFactor = Math.max(0.2, 1 - (distance / maxDistance));
                const volumeScale = Math.min(0.7, 0.3 + (damage / 30) * 0.4);
                
                this.game.soundManager.play('hit', {
                    volume: volumeScale * volumeFactor,
                    playbackRate: 0.9 + Math.random() * 0.2, // Slight randomization
                    position: { x: hitX, y: hitY }
                });
            }
        }
    }

    // Handle damage to player
    handleDamage(damage, attackerId) {
        this.game.player.takeDamage(damage);
        
        // Create explosion effect at impact point with enhanced visuals
        if (this.game.world) {
            // Calculate impact position (slightly offset from player center)
            const impactOffset = 10 + Math.random() * 7; // Add some randomness to the offset
            const impactAngle = Math.random() * Math.PI * 2; // random direction
            const impactX = this.game.player.x + Math.cos(impactAngle) * impactOffset;
            const impactY = this.game.player.y + Math.sin(impactAngle) * impactOffset;
            
            // Create main hit effect with small explosion
            this.game.world.createProjectileHitEffect(
                impactX, impactY, 
                15 + damage * 0.5, // Size based on damage
                this.game.soundManager
            );
            
            // Create secondary hit effect after a short delay for more dramatic effect
            setTimeout(() => {
                if (!this.game || !this.game.world) return; // Safety check
                
                const secondaryOffset = 8 + Math.random() * 5;
                const secondaryAngle = Math.random() * Math.PI * 2;
                const secondaryX = this.game.player.x + Math.cos(secondaryAngle) * secondaryOffset;
                const secondaryY = this.game.player.y + Math.sin(secondaryAngle) * secondaryOffset;
                
                this.game.world.createProjectileHitEffect(
                    secondaryX, secondaryY,
                    10,
                    this.game.soundManager
                );
            }, 60);
            
            // Add more noticeable camera shake effect
            this.addCameraShake(damage * 0.7); // Increased intensity
        }
        
        // Show damage message
        const attacker = this.players[attackerId]?.name || 'Another player';
        this.showGameMessage(`Hit by ${attacker} (-${damage.toFixed(1)})`, '#f88');
    }

    // Handle player death (local)
    handleDeath(attackerId) {
        // Store current credits value
        const currentCredits = this.game.player.credits;
        
        // Hide the player ship immediately
        this.game.player.visible = false;
        
        // Set the game state to "dying" - IMPORTANT: do this before creating effects
        if (this.game) {
            this.game.gameState = 'dying';
        }
        
        // Use the game's createShipDestructionEffect
        if (this.game && this.game.createShipDestructionEffect) {
            this.game.createShipDestructionEffect();
        } else {
            // Fallback if not available - basic explosion
            if (this.game.world) {
                const playerX = this.game.player.x;
                const playerY = this.game.player.y;
                
                // Play explosion sound
                if (this.game.soundManager) {
                    this.game.soundManager.play('explosion', {
                        volume: 0.9,
                        position: { x: playerX, y: playerY }
                    });
                }
                
                // Create explosion at player position
                this.game.world.createExplosion(
                    playerX,
                    playerY,
                    40,
                    this.game.soundManager
                );
            }
        }
        
        // Show death message
        const attacker = this.players[attackerId]?.name || 'Another player';
        this.showGameMessage(`Destroyed by ${attacker}!`, '#f44', 3000);
        
        // Add intense camera shake for death
        this.addCameraShake(25);
        
        // Respawn after delay
        setTimeout(() => {
            if (!this.game) return; // Safety check
            
            const spawnX = (Math.random() - 0.5) * 1000;
            const spawnY = (Math.random() - 0.5) * 1000;
            
            this.game.player.x = spawnX;
            this.game.player.y = spawnY;
            this.game.player.health = this.game.player.maxHealth;
            this.game.player.visible = true;
            
            if (this.game.gameState === 'dying') {
                this.game.gameState = 'playing';
            }
            
            // The credits value is already persisted via localStorage, but let's ensure
            // it's consistent with what we had before death
            if (this.game.player.credits !== currentCredits) {
                this.game.player.credits = currentCredits;
                localStorage.setItem('playerCredits', currentCredits.toString());
            }
            
            // Notify server about respawn
            this.sendRespawn(spawnX, spawnY);
            
            this.showGameMessage('Respawned!', '#4f4');
        }, 3000);
    }

    // Handle remote player death
    handleRemotePlayerDeath(playerId, attackerId) {
        // Get player data before removing them
        const deadPlayer = this.players[playerId];
        if (!deadPlayer) return;
        
        // Mark the player as destroyed so they can't be targeted or rendered
        deadPlayer.destroyed = true;
        
        const deadPlayerName = deadPlayer.name || 'A player';
        const attacker = attackerId === this.playerId 
            ? 'You' 
            : (this.players[attackerId]?.name || 'Another player');
        
        // Show kill message
        if (attackerId === this.playerId) {
            this.showGameMessage(`You destroyed ${deadPlayerName}! (+500 pts, +250 credits)`, '#4f4');
            
            // Award credits and points if local player was the killer
            if (this.game.player) {
                this.game.player.score += 500;
                this.game.player.addCredits(250);
            }
        } else {
            this.showGameMessage(`${attacker} destroyed ${deadPlayerName}!`, '#fff');
        }
        
        // Create ship destruction effect for remote player
        if (this.game.world && deadPlayer) {
            // Use the createRemoteShipDestructionEffect with player's data
            this.createRemoteShipDestructionEffect(deadPlayer);
            
            // Add slight camera shake if player is nearby (within 500 units)
            const playerDistance = Math.sqrt(
                Math.pow(this.game.player.x - deadPlayer.x, 2) + 
                Math.pow(this.game.player.y - deadPlayer.y, 2)
            );
            
            if (playerDistance < 500) {
                const shakeIntensity = 15 * (1 - playerDistance / 500);
                this.addCameraShake(shakeIntensity);
            }
        }

        // Announce the kill using KillAnnouncer
        this.killAnnouncer.announceKill(attacker, deadPlayerName);

        // Remove the player after a delay to let death animation play out
        setTimeout(() => {
            delete this.players[playerId];
            this.updatePlayerList();
        }, 3000);
    }

    // Create ship destruction effect for remote players
    createRemoteShipDestructionEffect(deadPlayer) {
        if (!this.game.world) return;
        
        const playerX = deadPlayer.x;
        const playerY = deadPlayer.y;
        const playerRotation = deadPlayer.rotation || 0;
        const playerColor = deadPlayer.color || '#ff0000';
        
        // Play explosion sound with distance-based volume
        if (this.game.soundManager) {
            // Calculate distance from local player
            const dx = this.game.player.x - playerX;
            const dy = this.game.player.y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Reduce volume based on distance
            const maxDistance = 1500;
            const volumeFactor = Math.max(0, 1 - (distance / maxDistance));
            
            this.game.soundManager.play('explosion', {
                volume: 0.7 * volumeFactor,
                position: { x: playerX, y: playerY }
            });
        }
        
        // Create main explosion at player position
        this.game.world.createExplosion(
            playerX,
            playerY,
            35, // Large radius for main explosion
            this.game.soundManager
        );
        
        // Create ship pieces - these will represent the breaking apart ship
        // Wing pieces
        this.createShipPiece(
            playerX, 
            playerY, 
            playerRotation,
            [-10, 10], // Left wing x,y offset from center
            [15, 15],  // Size
            playerColor,
            [-80, -30], // Velocity
            2 + Math.random() * 2 // Rotation speed
        );
        
        this.createShipPiece(
            playerX, 
            playerY, 
            playerRotation,
            [10, 10], // Right wing x,y offset from center
            [15, 15], // Size
            playerColor,
            [80, -30], // Velocity
            -(2 + Math.random() * 2) // Rotation speed (opposite direction)
        );
        
        // Nose piece
        this.createShipPiece(
            playerX, 
            playerY, 
            playerRotation,
            [0, -15], // Nose x,y offset from center
            [10, 20], // Size
            playerColor,
            [0, -120], // Velocity - shoots forward
            Math.random() * 4 - 2 // Random rotation either direction
        );
        
        // Cockpit/center piece
        this.createShipPiece(
            playerX, 
            playerY, 
            playerRotation,
            [0, 0], // Center x,y (no offset)
            [12, 12], // Size
            this.getLighterColor(playerColor), // Slightly lighter color for cockpit
            [(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40], // Random velocity
            Math.random() * 3 - 1.5 // Slow random rotation
        );
        
        // Engine piece
        this.createShipPiece(
            playerX, 
            playerY, 
            playerRotation,
            [0, 10], // Engine x,y offset from center
            [8, 10], // Size
            '#f66', // Engine color (reddish)
            [0, 100], // Velocity - shoots backward
            Math.random() * 6 - 3 // Faster random rotation
        );
        
        // Create lingering smoke particles
        for (let i = 0; i < 15; i++) {
            const smokeSize = 4 + Math.random() * 10;
            const smokeDuration = 1.0 + Math.random() * 2.0; // 1-3 seconds
            
            // Create smoke with minimal initial velocity
            this.game.world.createSmokeParticle(
                playerX + (Math.random() - 0.5) * 15,
                playerY + (Math.random() - 0.5) * 15,
                smokeSize,
                smokeDuration,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
        }
        
        // Create additional scattered explosions with delays for a chain reaction effect
        for (let i = 0; i < 8; i++) {
            const offsetDistance = Math.random() * 25 + 5;
            const angle = Math.random() * Math.PI * 2;
            const delay = Math.random() * 0.5; // stagger explosions
            
            setTimeout(() => {
                if (!this.game || !this.game.world) return; // Safety check
                
                const explosionX = playerX + Math.cos(angle) * offsetDistance;
                const explosionY = playerY + Math.sin(angle) * offsetDistance;
                
                // Create secondary explosion
                this.game.world.createExplosion(
                    explosionX,
                    explosionY,
                    10 + Math.random() * 15,
                    null // No additional sound for small explosions
                );
            }, delay * 1000);
        }
        
        // Create smaller debris pieces
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 100;
            const size = 1 + Math.random() * 3;
            
            // Create debris with mixed colors
            const colors = [playerColor, this.getLighterColor(playerColor), '#f66', '#ddd'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const debris = {
                x: playerX + (Math.random() - 0.5) * 10, // Slight random offset
                y: playerY + (Math.random() - 0.5) * 10,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: size,
                color: color,
                life: 1.0,
                maxLife: 1.0 + Math.random() * 2.0, // Longer lifetime
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 5,
                update(deltaTime) {
                    // Move debris
                    this.x += this.velocityX * deltaTime;
                    this.y += this.velocityY * deltaTime;
                    // Decrease lifetime
                    this.life -= deltaTime / this.maxLife;
                    // Slow down over time
                    this.velocityX *= 0.99;
                    this.velocityY *= 0.99;
                    // Rotate debris
                    this.rotation += this.rotationSpeed * deltaTime;
                }
            };
            
            this.game.world.particles.push(debris);
        }
    }

    // Helper to create a ship piece with specific properties
    createShipPiece(x, y, rotation, offset, size, color, velocity, rotationSpeed) {
        if (!this.game.world) return null;
        
        // Calculate the actual starting position based on offset and rotation
        const offsetX = offset[0] * Math.cos(rotation) - offset[1] * Math.sin(rotation);
        const offsetY = offset[0] * Math.sin(rotation) + offset[1] * Math.cos(rotation);
        
        // Create the ship piece as a specialized particle
        const piece = {
            x: x + offsetX,
            y: y + offsetY,
            width: size[0],
            height: size[1],
            velocityX: velocity[0],
            velocityY: velocity[1],
            color: color,
            rotation: rotation,
            rotationSpeed: rotationSpeed,
            life: 1.0,
            maxLife: 3.0, // Longer lifetime for ship pieces
            isShipPiece: true, // Flag to identify this as a ship piece
            drag: 0.98, // Slightly higher drag for ship pieces
            update(deltaTime) {
                // Move piece
                this.x += this.velocityX * deltaTime;
                this.y += this.velocityY * deltaTime;
                
                // Apply drag to gradually slow down
                this.velocityX *= this.drag;
                this.velocityY *= this.drag;
                
                // Rotate piece
                this.rotation += this.rotationSpeed * deltaTime;
                
                // Decrease lifetime
                this.life -= deltaTime / this.maxLife;
            }
        };
        
        // Add to world particles
        this.game.world.particles.push(piece);
        return piece;
    }

    // Helper to generate a lighter version of a color for cockpit
    getLighterColor(color) {
        // Simple way to lighten a hex color
        if (color.startsWith('#') && color.length === 4) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        
        // Default lighter blue if we can't parse the color
        if (!color.startsWith('#') || color.length !== 7) {
            return '#66f';
        }
        
        try {
            // Parse RGB components
            const r = parseInt(color.substr(1, 2), 16);
            const g = parseInt(color.substr(3, 2), 16);
            const b = parseInt(color.substr(5, 2), 16);
            
            // Lighten by 30%
            const newR = Math.min(255, r + 60);
            const newG = Math.min(255, g + 60);
            const newB = Math.min(255, b + 60);
            
            // Convert back to hex
            return '#' + 
                newR.toString(16).padStart(2, '0') +
                newG.toString(16).padStart(2, '0') +
                newB.toString(16).padStart(2, '0');
        } catch (e) {
            return '#66f'; // Fallback if parsing fails
        }
    }

    // Handle remote player respawn
    handleRemotePlayerRespawn(playerId, x, y) {
        if (this.players[playerId]) {
            this.players[playerId].x = x;
            this.players[playerId].y = y;
            this.players[playerId].health = 100;
            this.players[playerId].destroyed = false; // Reset destroyed flag
            
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
        indicator.style.top = '15px';
        indicator.style.left = '20px';
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
        // Remove existing player list if it exists
        const existingList = document.getElementById('player-list');
        if (existingList) {
            document.body.removeChild(existingList);
        }
        
        const playerList = document.createElement('div');
        playerList.id = 'player-list';
        playerList.style.position = 'absolute';
        playerList.style.top = '50px'; // Position below connection indicator
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
        playerList.style.maxHeight = '300px';
        playerList.style.overflowY = 'auto';
        
        // Create a single container for everything
        const contentContainer = document.createElement('div');
        
        // Title text without any container or borders
        const titleText = document.createElement('div');
        titleText.textContent = '🌐 PLAYERS ONLINE';
        titleText.style.fontWeight = 'bold';
        titleText.style.marginBottom = '5px'; // Reduced margin to be closer to divider
        contentContainer.appendChild(titleText);
        
        // Add subtle divider - separate element from both title and player list
        const divider = document.createElement('div');
        divider.style.height = '1px';
        divider.style.background = 'linear-gradient(to right, transparent, rgba(80, 160, 255, 0.5), transparent)';
        divider.style.margin = '0 -5px 8px -5px'; // Negative left/right margin to extend slightly beyond container
        divider.style.border = 'none';
        contentContainer.appendChild(divider);
        
        // Create player list container directly
        const listContainer = document.createElement('div');
        listContainer.id = 'player-list-container';
        
        // Reset EVERY possible style that could create lines
        listContainer.style.border = 'none';
        listContainer.style.outline = 'none';
        listContainer.style.boxShadow = 'none';
        listContainer.style.textDecoration = 'none';
        listContainer.style.borderBottom = 'none';
        listContainer.style.borderTop = 'none';
        listContainer.style.boxSizing = 'border-box';
        listContainer.style.background = 'transparent';
        
        contentContainer.appendChild(listContainer);
        playerList.appendChild(contentContainer);
        document.body.appendChild(playerList);
        
        // Update the player list immediately
        this.updatePlayerList();
    }

    // Update player list UI with explicit styles to prevent any unwanted decorations
    updatePlayerList() {
        const listContainer = document.getElementById('player-list-container');
        if (!listContainer) return;
        
        // Clear existing list
        listContainer.innerHTML = '';
        
        // Add current player with very explicit styling
        const currentPlayerItem = document.createElement('div');
        currentPlayerItem.style.display = 'flex';
        currentPlayerItem.style.alignItems = 'center';
        currentPlayerItem.style.marginBottom = '5px';
        currentPlayerItem.style.position = 'relative'; // Ensure proper positioning
        currentPlayerItem.style.padding = '2px';
        currentPlayerItem.style.borderRadius = '3px';
        
        const currentPlayerColor = document.createElement('span');
        currentPlayerColor.style.display = 'inline-block';
        currentPlayerColor.style.width = '10px';
        currentPlayerColor.style.height = '10px';
        currentPlayerColor.style.backgroundColor = '#0f0';
        currentPlayerColor.style.borderRadius = '50%';
        currentPlayerColor.style.marginRight = '5px';
        currentPlayerColor.style.flexShrink = '0';
        
        const currentPlayerText = document.createElement('span');
        currentPlayerText.textContent = `${this.playerName} (You)`;
        currentPlayerText.style.color = '#0f0';
        // Very explicit style reset to prevent any decoration
        currentPlayerText.style.textDecoration = 'none';
        currentPlayerText.style.borderBottom = 'none';
        currentPlayerText.style.borderTop = 'none';
        currentPlayerText.style.textShadow = 'none';
        currentPlayerText.style.boxShadow = 'none';
        currentPlayerText.style.position = 'relative';
        currentPlayerText.style.whiteSpace = 'nowrap';
        currentPlayerText.style.overflow = 'hidden';
        currentPlayerText.style.textOverflow = 'ellipsis';
        
        // Clear any potential overlays
        currentPlayerItem.appendChild(currentPlayerColor);
        currentPlayerItem.appendChild(currentPlayerText);
        listContainer.appendChild(currentPlayerItem);
        
        // Add other players with same explicit styling
        Object.values(this.players).forEach(player => {
            if (player.id === this.playerId || player.destroyed) return; // Skip destroyed players
            
            const playerItem = document.createElement('div');
            playerItem.style.display = 'flex';
            playerItem.style.alignItems = 'center';
            playerItem.style.marginBottom = '5px';
            playerItem.style.position = 'relative'; // Ensure proper positioning
            playerItem.style.padding = '2px';
            playerItem.style.borderRadius = '3px';
            
            const playerColor = document.createElement('span');
            playerColor.style.display = 'inline-block';
            playerColor.style.width = '10px';
            playerColor.style.height = '10px';
            playerColor.style.backgroundColor = player.color || '#f00';
            playerColor.style.borderRadius = '50%';
            playerColor.style.marginRight = '5px';
            playerColor.style.flexShrink = '0';
            
            const playerText = document.createElement('span');
            playerText.textContent = player.name;
            // Very explicit style reset to prevent any decoration
            playerText.style.textDecoration = 'none';
            playerText.style.borderBottom = 'none';
            playerText.style.borderTop = 'none';
            playerText.style.textShadow = 'none';
            playerText.style.boxShadow = 'none';
            playerText.style.position = 'relative';
            playerText.style.whiteSpace = 'nowrap';
            playerText.style.overflow = 'hidden';
            playerText.style.textOverflow = 'ellipsis';
            
            playerItem.appendChild(playerColor);
            playerItem.appendChild(playerText);
            listContainer.appendChild(playerItem);
        });
        
        // Ensure the container itself doesn't add any decorations
        listContainer.style.border = 'none';
        listContainer.style.borderTop = 'none';
        listContainer.style.borderBottom = 'none';
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
            if (player.id === this.playerId || player.destroyed) return; // Skip destroyed players
            
            // Draw remote player's ship
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.rotation);
            
            // Draw ship based on type
            if (player.ship === 'fighter') {
                // Fighter ship design
                ctx.fillStyle = player.color;
                ctx.beginPath();
                ctx.moveTo(0, -20); // Front (points in direction of travel)
                ctx.lineTo(-15, 10);
                ctx.lineTo(-5, 5);
                ctx.lineTo(5, 5); 
                ctx.lineTo(15, 10);
                ctx.closePath();
                ctx.fill();
                
                // Engine glow
                ctx.fillStyle = '#ff6';
                ctx.beginPath();
                ctx.moveTo(-7, 8);
                ctx.lineTo(0, 15);
                ctx.lineTo(7, 8);
                ctx.closePath();
                ctx.fill();
            } else if (player.ship === 'cruiser') {
                // Heavy cruiser design
                ctx.fillStyle = player.color;
                ctx.beginPath();
                ctx.moveTo(0, -25); // Front
                ctx.lineTo(-8, -10);
                ctx.lineTo(-20, 15);
                ctx.lineTo(-8, 10);
                ctx.lineTo(8, 10);
                ctx.lineTo(20, 15);
                ctx.lineTo(8, -10);
                ctx.closePath();
                ctx.fill();
                
                // Engine glow
                ctx.fillStyle = '#f66';
                ctx.beginPath();
                ctx.moveTo(-12, 12);
                ctx.lineTo(0, 20);
                ctx.lineTo(12, 12);
                ctx.closePath();
                ctx.fill();
            } else {
                // Default scout ship design (pointing up at rotation 0)
                ctx.fillStyle = player.color;
                ctx.beginPath();
                ctx.moveTo(0, -15); // front (points upward when rotation = 0)
                ctx.lineTo(-10, 10); // back left
                ctx.lineTo(0, 5); // back middle
                ctx.lineTo(10, 10); // back right
                ctx.closePath();
                ctx.fill();
                
                // Engine glow
                ctx.fillStyle = '#6ff';
                ctx.beginPath();
                ctx.moveTo(-5, 12);
                ctx.lineTo(0, 15);
                ctx.lineTo(5, 12);
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
                    
                    // Draw projectile based on type
                    switch(projectile.type) {
                        case 'laser':
                            ctx.fillStyle = projectile.color || '#f00';
                            ctx.beginPath();
                            ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
                            ctx.fill();
                            
                            // Add laser trail effect
                            ctx.strokeStyle = projectile.color || '#f00';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(projectile.x, projectile.y);
                            ctx.lineTo(
                                projectile.x - projectile.velocityX * 0.02,
                                projectile.y - projectile.velocityY * 0.02
                            );
                            ctx.stroke();
                            break;
                            
                        case 'burst':
                            ctx.fillStyle = '#ff0';
                            ctx.beginPath();
                            ctx.arc(projectile.x, projectile.y, 2, 0, Math.PI * 2);
                            ctx.fill();
                            break;
                            
                        case 'missile':
                            // Draw missile body
                            ctx.save();
                            ctx.translate(projectile.x, projectile.y);
                            
                            // Calculate rotation from velocity
                            let rotation = Math.atan2(projectile.velocityY, projectile.velocityX);
                            ctx.rotate(rotation);
                            
                            ctx.fillStyle = '#f80';
                            ctx.beginPath();
                            ctx.moveTo(5, 0);
                            ctx.lineTo(0, -2);
                            ctx.lineTo(-5, -2);
                            ctx.lineTo(-5, 2);
                            ctx.lineTo(0, 2);
                            ctx.closePath();
                            ctx.fill();
                            
                            // Engine exhaust
                            ctx.fillStyle = '#f00';
                            ctx.beginPath();
                            ctx.moveTo(-5, -1);
                            ctx.lineTo(-8, 0);
                            ctx.lineTo(-5, 1);
                            ctx.closePath();
                            ctx.fill();
                            
                            ctx.restore();
                            break;
                            
                        default:
                            // Generic projectile
                            ctx.fillStyle = projectile.color || '#f00';
                            ctx.beginPath();
                            ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
                            ctx.fill();
                    }
                    
                    // Check collision with local player
                    const dx = projectile.x - this.game.player.x;
                    const dy = projectile.y - this.game.player.y;
                    const distSq = dx * dx + dy * dy;
                    
                    if (distSq < 225) { // 15 squared - rough collision radius
                        // Check if player is in safe zone before applying damage
                        if (this.game.world && !this.game.world.isInSafeZone(this.game.player)) {
                            // Hit the player!
                            const damage = projectile.damage || 10;
                            this.game.player.takeDamage(damage);
                            
                            // Create explosion effect at point of impact
                            if (this.game.world) {
                                this.game.world.createProjectileHitEffect(
                                    projectile.x, 
                                    projectile.y,
                                    12 + damage * 0.3, // Size based on damage
                                    this.game.soundManager
                                );
                            }
                            
                            // Show hit message
                            this.showGameMessage(`Hit by ${player.name} (-${damage})`, '#f88');
                            
                            // Send hit confirmation to server
                            this.socket.emit('hit', {
                                type: 'player',
                                targetId: this.playerId,
                                damage: damage,
                                attackerId: player.id
                            });
                            
                            // Check if player was destroyed
                            if (this.game.player.health <= 0) {
                                this.socket.emit('playerDestroyed', {
                                    playerId: this.playerId,
                                    attackerId: player.id
                                });
                            }
                        } else {
                            // Player in safe zone - show protection message
                            this.showGameMessage('Safe Zone Protection Active', '#ffcc00');
                        }
                        
                        // Remove the projectile
                        player.projectiles.splice(i, 1);
                    }
                    // Remove projectiles that are too far away
                    else if (distSq > 1000000) { // 1000 distance squared
                        player.projectiles.splice(i, 1);
                    }
                });
            }
        });
    }

    // Add camera shake effect
    addCameraShake(intensity) {
        if (!this.game.canvas) return;
        
        // Initialize shake properties if needed
        if (!this.shakeIntensity) {
            this.shakeIntensity = 0;
            this.shakeDuration = 0;
            this.shakeStartTime = 0;
            this.originalTransform = this.game.ctx.getTransform();
        }
        
        // Add new shake intensity to existing shake
        this.shakeIntensity = Math.min(15, this.shakeIntensity + intensity);
        this.shakeDuration = 0.5; // half second shake
        this.shakeStartTime = Date.now() / 1000;
        
        // If we're not already updating the shake, start the update loop
        if (!this.shakingActive) {
            this.shakingActive = true;
            this.updateCameraShake();
        }
    }
    
    // Update camera shake each frame
    updateCameraShake() {
        if (!this.shakeIntensity || !this.game.ctx) {
            this.shakingActive = false;
            return;
        }
        
        const currentTime = Date.now() / 1000;
        const elapsedTime = currentTime - this.shakeStartTime;
        
        // Check if shake should stop
        if (elapsedTime > this.shakeDuration) {
            // Reset to original position
            this.game.ctx.setTransform(this.originalTransform);
            this.shakeIntensity = 0;
            this.shakingActive = false;
            return;
        }
        
        // Calculate remaining shake percentage
        const shakeProgress = 1 - (elapsedTime / this.shakeDuration);
        const currentIntensity = this.shakeIntensity * shakeProgress;
        
        // Generate random offset
        const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
        const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
        
        // Apply shake by moving the canvas
        this.game.ctx.setTransform(this.originalTransform);
        this.game.ctx.translate(offsetX, offsetY);
        
        // Continue shaking in next frame
        requestAnimationFrame(() => this.updateCameraShake());
    }

    // Update the player count on the start page
    updatePlayerCount() {
        const playerCountElement = document.getElementById('player-count');
        if (playerCountElement) {
            // Count is current player (if connected) plus all remote players
            const count = (this.connected ? 1 : 0) + Object.keys(this.players).length;
            playerCountElement.textContent = count;
        }
    }
}