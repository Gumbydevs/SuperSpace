import { KillAnnouncer } from './killannouncer.js';

export class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.players = {};
        // Track last displayed leaderboard state for real-time updates
        this.lastLeaderboardState = '';
        this.playerId = null;
        
        // Initialize our kill announcer system
        this.killAnnouncer = new KillAnnouncer();
        
        // Load player name from localStorage or use default
        this.playerName = localStorage.getItem('playerName') || "Pilot";
        
        // Check if player has already set their name in a previous session
        this.hasSetName = localStorage.getItem('hasSetName') === 'true';
        
        this.lastUpdate = 0;
        this.updateInterval = 50; // 50ms = 20 updates per second
        
        // Add a cache to store player names even after they're removed
        this.playerNameCache = {};
        
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
        return connectionPromise.then(async () => {
            // Check server status before attempting Socket.IO connection
            try {
                console.log('Checking server status at', serverUrl);
                const response = await fetch(serverUrl + '/status', { 
                    method: 'GET',
                    mode: 'cors',
                    signal: AbortSignal.timeout(5000)
                });
                if (response.ok) {
                    const status = await response.json();
                    console.log('Server is online:', status);
                } else {
                    console.warn('Server status check returned:', response.status);
                }
            } catch (error) {
                console.warn('Server status check failed:', error.message, '- Proceeding with connection attempt');
            }

            // Now load Socket.IO client library dynamically
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
                script.integrity = 'sha384-/KNQL8Nu5gCHLqwqfQjA689Hhoqgi2S84SNUxC3roTe4EhJ9AfLkp8QiQcU8AMzI';
                script.crossOrigin = 'anonymous';
                script.onload = () => {
                    try {
                        this.socket = io(serverUrl, {
                            reconnection: true,
                            reconnectionAttempts: 5,
                            reconnectionDelay: 2000,
                            reconnectionDelayMax: 10000,
                            timeout: 10000
                        });
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
            confirmButton.textContent = '🚀 Authenticate';
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
        // Listen for real-time player stats updates
        this.socket.on('playerStatsUpdate', (data) => {
            // console.log('Received playerStatsUpdate:', data);
            if (data.id === this.playerId) {
                // Update local player stats
                // console.log('Updating LOCAL player stats:', data);
                if (this.game.player) {
                    this.game.player.wins = data.wins;
                    this.game.player.losses = data.losses;
                    // Score is already handled locally, but sync it too
                    this.game.player.score = data.score;
                }
                this.updatePlayerList();
            } else if (this.players[data.id]) {
                // console.log('Updating REMOTE player stats:', data);
                this.players[data.id].score = data.score;
                this.players[data.id].wins = data.wins;
                this.players[data.id].losses = data.losses;
                this.updatePlayerList();
            } else {
                // console.log('Received stats update for unknown player:', data.id);
            }
        });
        
        // Listen for real-time player health updates
        this.socket.on('playerHealthUpdate', (data) => {
            // console.log('Received playerHealthUpdate:', data);
            if (data.id !== this.playerId && this.players[data.id]) {
                // console.log(`Updating player ${this.players[data.id].name} health from ${this.players[data.id].health} to ${data.health}`);
                this.players[data.id].health = data.health;
                // Also update shield if provided
                if (data.shield !== undefined) {
                    this.players[data.id].shield = data.shield;
                }
            }
        });

        // Handle connection to server
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.playerId = this.socket.id;
            this.connected = true;
            
            // Reset connection error count on successful connection
            this.connectionErrorCount = 0;
            
            // Send player data to server after connecting
            this.socket.emit('playerJoin', {
                x: this.game.player.x,
                y: this.game.player.y,
                rotation: this.game.player.rotation,
                health: this.game.player.health,
                shield: this.game.player.shield || 0,
                maxShield: this.game.player.shieldCapacity || 0,
                ship: this.game.player.currentShip || 'scout',
                name: this.playerName,
                color: this.game.player.color || '#0f0',
                score: this.game.player.score || 0,
                wins: this.game.player.wins || 0,
                losses: this.game.player.losses || 0,
                avatar: localStorage.getItem('selectedAvatar') || 'han'
            });
            
            // Show connection indicator
            this.updateConnectionIndicator(true);
            
            // Start periodic leaderboard updates for real-time sync
            this.startLeaderboardUpdates();
            
            // Update the player count display
            this.updatePlayerCount();
        });

        // Handle player data from server (in response to our request)
        this.socket.on('playerData', (playerData) => {
            // Update the player with the correct data from server
            if (this.players[playerData.id]) {
                this.players[playerData.id].name = playerData.name || this.players[playerData.id].name;
                this.players[playerData.id].ship = playerData.ship || this.players[playerData.id].ship;
                this.players[playerData.id].color = playerData.color || this.players[playerData.id].color;
                this.players[playerData.id].avatar = playerData.avatar || this.players[playerData.id].avatar;
                
                // Update the player list to show the correct name
                this.updatePlayerList();
                
                // Show player name correction message
                if (playerData.name && this.players[playerData.id].name === 'Unknown') {
                    this.showGameMessage(`Player identified: ${playerData.name}`, '#aaf');
                }
            }
        });

        // Handle asteroid field update from server
        this.socket.on('asteroidFieldUpdate', (data) => {
            console.log('Received asteroid field from server:', data.asteroids.length, 'asteroids');
            if (this.game.world) {
                // Set up the asteroid field with server data
                this.game.world.setupServerAsteroidField(data.asteroids);
                
                this.showGameMessage('Asteroid field synchronized', '#aaf', 3000);
            }
        });

        // Handle new asteroids being added from server
        this.socket.on('newAsteroids', (data) => {
            console.log('Received new asteroids from server:', data.asteroids.length, 'asteroids');
            if (this.game.world) {
                // Add new asteroids to existing field
                const newClientAsteroids = data.asteroids.map(serverAsteroid => {
                    // Convert server asteroid format to client format (same as setupServerAsteroidField)
                    let size, health, scoreValue;
                    if (serverAsteroid.radius <= 25) {
                        size = 'small';
                        health = 50;
                        scoreValue = 100;
                    } else if (serverAsteroid.radius <= 45) {
                        size = 'medium';
                        health = 100;
                        scoreValue = 200;
                    } else {
                        size = 'large';
                        health = 200;
                        scoreValue = 400;
                    }

                    return {
                        id: serverAsteroid.id,
                        x: serverAsteroid.x,
                        y: serverAsteroid.y,
                        radius: serverAsteroid.radius,
                        health: serverAsteroid.health || health,
                        maxHealth: serverAsteroid.health || health,
                        rotation: serverAsteroid.rotation || 0,
                        rotationSpeed: serverAsteroid.rotationSpeed || (Math.random() - 0.5) * 2,
                        vertices: this.game.world.generateAsteroidVertices(8 + Math.floor(Math.random() * 4), 0.3),
                        // Stationary asteroids for multiplayer tactical gameplay
                        velocityX: 0,
                        velocityY: 0,
                        size: size,
                        scoreValue: scoreValue,
                        type: serverAsteroid.type || 'rock'
                    };
                });
                
                // Add the new asteroids to the existing field
                this.game.world.asteroids.push(...newClientAsteroids);
                console.log('Added', newClientAsteroids.length, 'new asteroids. Total:', this.game.world.asteroids.length);
            }
        });
        
        // Handle asteroid hit from server
        this.socket.on('asteroidHit', (data) => {
            if (this.game.world) {
                // Update the asteroid's health to server's authoritative value
                const asteroid = this.game.world.asteroids.find(a => a.id === data.asteroidId);
                if (asteroid) {
                    asteroid.health = data.remainingHealth;
                    console.log(`Asteroid ${data.asteroidId} health synchronized to ${data.remainingHealth}`);
                }
            }
        });
        
        // Handle asteroid destruction from server
        this.socket.on('asteroidDestroyed', (data) => {
            // console.log('🌟 Received asteroidDestroyed event from server:', data);
            // console.log('🌟 Server data contains fragments:', data.fragments ? data.fragments.length : 'none');
            if (this.game.world) {
                // Use the new fragment handling method
                this.handleAsteroidDestroyedWithFragments(data);
            } else {
                console.warn('No game world available to handle asteroid destruction');
            }
        });

        // Handle asteroid destruction from other players
        this.socket.on('playerAsteroidDestroyed', (data) => {
            // console.log('💥 Received playerAsteroidDestroyed event:', data);
            // console.log('💥 My socket ID:', this.socket.id, 'Event from:', data.playerId);
            if (this.game.world && data.playerId !== this.socket.id) {
                // console.log('💥 Processing asteroid destruction from other player');
                // Another player destroyed an asteroid - show the effects
                this.handleOtherPlayerAsteroidDestruction(data);
            } else {
                // console.log('💥 Ignoring own asteroid destruction or no game world');
            }
        });

        // Handle projectile impacts from other players
        this.socket.on('playerProjectileImpact', (data) => {
            console.log('💥 Player projectile impact:', data);
            if (this.game.world && data.playerId !== this.socket.id) {
                // Show the hit effect for other players
                this.game.world.createProjectileHitEffect(data.x, data.y, data.radius);
            }
        });
        
        // Handle world update from server
        this.socket.on('worldUpdate', (data) => {
            // Process updated asteroid positions if needed
            if (data.asteroids && this.game.world) {
                // This could be used for minor position corrections
                // but the full field update is handled by asteroidFieldUpdate
            }
        });

        // Handle disconnection from server
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
            this.players = {}; // Clear remote players
            
            // Clear leaderboard update timer
            if (this.leaderboardTimer) {
                clearInterval(this.leaderboardTimer);
                this.leaderboardTimer = null;
            }
            
            // Show disconnected indicator
            this.updateConnectionIndicator(false);
            
            // Update the player count display
            this.updatePlayerCount();
            
            // Show disconnection message
            this.showGameMessage('Disconnected from server', '#f44', 5000);
        });

        // Handle connection error
        this.socket.on('connect_error', (error) => {
            // Reduce console spam - only log first few errors
            if (!this.connectionErrorCount) this.connectionErrorCount = 0;
            this.connectionErrorCount++;
            
            if (this.connectionErrorCount <= 3) {
                console.error('Connection error:', error.message || error);
            } else if (this.connectionErrorCount === 4) {
                console.error('Connection errors continuing... (suppressing further logs)');
            }
            
            this.connected = false;
            
            // Show disconnected indicator
            this.updateConnectionIndicator(false);
            
            // Update the player count display
            this.updatePlayerCount();
            
            // Show error message only on first few failures to avoid spam
            if (this.connectionErrorCount <= 2) {
                this.showGameMessage('Connection error: ' + (error.message || error), '#f44', 5000);
            }
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
            
            // Set up synchronized asteroid field if provided
            if (data.asteroids && this.game.world) {
                this.game.world.setupServerAsteroidField(data.asteroids);
                console.log('Synchronized asteroid field from game state:', data.asteroids.length, 'asteroids');
            }
            
            // Update the player count display
            this.updatePlayerCount();
            
            // Show connection success message
            this.showGameMessage('Connected to multiplayer server', '#4f4', 3000);
        });

        // Handle new player joining
        this.socket.on('playerJoined', (playerData) => {
            // Don't add ourselves as a remote player
            if (playerData.id !== this.playerId) {
                this.addRemotePlayer(playerData);
                this.showGameMessage(`${playerData.name} joined the game`, '#4ff');
                
                // Update the player count display
                this.updatePlayerCount();
            }
        });

        // Handle player movement updates
        this.socket.on('playerMoved', (playerData) => {
            this.updateRemotePlayer(playerData);
        });

        // Handle player general updates (stats, etc.)
        this.socket.on('playerUpdate', (playerData) => {
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

        // Handle shield disruption events
        this.socket.on('shieldDisruption', (data) => {
            if (data.targetId === this.playerId) {
                this.handleShieldDisruption(data.duration, data.attackerId);
            } else {
                // Handle shield disruption for remote players (visual effects only)
                this.handleRemoteShieldDisruption(data.targetId, data.duration);
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
                
            // IMPORTANT: If this is OUR player that died, ALWAYS create the explosion effect immediately
            // This ensures death animation is visible even if server and client communication has issues
            if (data.playerId === this.playerId) {
                // Force create explosion at player's position
                if (this.game.player && this.game.world) {
                    // Create an explosion effect at our location
                    this.game.world.createExplosion(
                        this.game.player.x,
                        this.game.player.y,
                        35, // Size of explosion
                        this.game.soundManager
                    );
                    
                    // Add intense camera shake too
                    this.addCameraShake(25);
                    
                    // Create additional debris and ship parts
                    this.createLocalExplosionEffect(
                        this.game.player.x,
                        this.game.player.y,
                        this.game.player.rotation
                    );
                }
            }
                
            // Ensure kill announcer is ready before announcing kills
            this.ensureKillAnnouncerReady();

            // Get killer avatar information
            let killerAvatar = null;
            if (data.attackerId === this.playerId) {
                // Local player is the killer - get their avatar
                killerAvatar = localStorage.getItem('selectedAvatar') || 'han';
            } else if (this.players[data.attackerId]) {
                // Remote player is the killer - get their avatar from player data
                killerAvatar = this.players[data.attackerId].avatar || 'han';
            }

            // Announce the kill with the kill announcer system for all players
            // Show appropriate message based on player perspective
            if (data.attackerId === this.playerId) {
                // If you're the killer
                this.killAnnouncer.announceKill('You', victimName, 'destroyed', killerAvatar);
            } else if (data.playerId === this.playerId) {
                // If you're the victim - you see who killed you
                this.killAnnouncer.announceKill(killerName, 'you', 'destroyed', killerAvatar);
            } else {
                // If you're a spectator - you see who killed whom
                this.killAnnouncer.announceKill(killerName, victimName, 'destroyed', killerAvatar);
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

        // Handle player destruction by asteroid
        this.socket.on('playerDestroyedByAsteroid', (data) => {
            const victimName = data.playerId === this.playerId ? 
                'You' : 
                (this.players[data.playerId]?.name || data.playerName || 'A player');
                
            // Show kill announcement for all asteroid deaths
            this.ensureKillAnnouncerReady();
            if (data.playerId === this.playerId) {
                // Own death
                this.killAnnouncer.announceKill('An asteroid', 'you');
            } else {
                // Other player death
                this.killAnnouncer.announceKill('An asteroid', victimName);
                
                // Handle remote player death (no killer)
                this.handleRemotePlayerDeath(data.playerId, 'asteroid');
            }
        });        // Handle player disconnection
        this.socket.on('playerLeft', (playerId) => {
            const playerName = this.players[playerId]?.name || 'A player';
            this.removeRemotePlayer(playerId);
            this.showGameMessage(`${playerName} left the game`, '#aaa');
            
            // Update the player count display
            this.updatePlayerCount();
        });

        // Handle player respawn
        this.socket.on('playerRespawned', (data) => {
            // Don't process respawn events for our own player - we handle that locally
            if (data.id !== this.playerId) {
                this.handleRemotePlayerRespawn(data.id, data.x, data.y);
            }
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
        
        // Handle ship color update from server
        this.socket.on('shipColorUpdate', (data) => {
            this.handleRemoteShipColorUpdate(data.playerId, data.color);
        });

        // Handle engine color update from server
        this.socket.on('engineColorUpdate', (data) => {
            this.handleRemoteEngineColorUpdate(data.playerId, data.color);
        });

        // Handle projectile explosions from other players
        this.socket.on('projectileExplosion', (data) => {
            if (this.game.world) {
                // Create explosion effect at the received coordinates
                this.game.world.createExplosion(
                    data.x,
                    data.y,
                    data.radius,
                    this.game.soundManager,
                    data.type || 'rocket'
                );
            }
        });

        // Start ping interval to keep connection alive and reset inactivity timer
        this.startPingInterval();
    }

    // Ensure kill announcer is properly setup before announcing kills
    ensureKillAnnouncerReady() {
        // Check if the kill announcements container exists
        if (!document.getElementById('kill-announcements')) {
            console.log('Kill announcements container missing, recreating it');
            // If container is missing, recreate it
            this.killAnnouncer.createAnnouncementContainer();
        }
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
        
        // Ensure player has full health before joining
        this.game.player.health = this.game.player.maxHealth;
        
        const playerData = {
            x: this.game.player.x,
            y: this.game.player.y,
            rotation: this.game.player.rotation,
            health: this.game.player.health,
            shield: this.game.player.shield || 0,
            maxShield: this.game.player.shieldCapacity || 0,
            ship: this.game.player.shipId || 'scout',
            name: this.playerName,
            color: this.getRandomPlayerColor(),
            score: this.game.player.score || 0,
            wins: this.game.player.wins || 0,
            losses: this.game.player.losses || 0,
            avatar: localStorage.getItem('selectedAvatar') || 'han'
        };
        
        this.socket.emit('playerJoin', playerData);
    }

    // Main update function called by game loop
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
                shield: this.game.player.shield || 0,
                maxShield: this.game.player.shieldCapacity || 0,
                ship: this.game.player.shipId || 'scout',
                color: this.game.player.color || '#0f0',
                score: this.game.player.score || 0,
                wins: this.game.player.wins || 0,
                losses: this.game.player.losses || 0
            };

            // Debug: Log when sending significant stat changes
            if (!this.lastSentStats || 
                this.lastSentStats.score !== playerData.score ||
                this.lastSentStats.wins !== playerData.wins ||
                this.lastSentStats.losses !== playerData.losses) {
                console.log('SENDING PLAYER UPDATE:', { score: playerData.score, wins: playerData.wins, losses: playerData.losses });
                this.lastSentStats = { score: playerData.score, wins: playerData.wins, losses: playerData.losses };
            }

            this.socket.emit('playerUpdate', playerData);
            this.lastUpdate = 0;
        }

        // Real-time leaderboard update: only update if player stats changed
        if (document.getElementById('player-list-container')) {
            const allPlayers = [
                {
                    id: this.playerId,
                    name: this.playerName,
                    color: '#0f0',
                    score: this.game.player?.score || 0,
                    wins: this.game.player?.wins || 0,
                    losses: this.game.player?.losses || 0,
                    isSelf: true
                },
                ...Object.values(this.players).filter(p => !p.destroyed).map(p => ({
                    id: p.id,
                    name: p.name,
                    color: p.color || '#f00',
                    score: p.score || 0,
                    wins: p.wins || 0,
                    losses: p.losses || 0,
                    isSelf: false
                }))
            ];
            allPlayers.sort((a, b) => b.score - a.score);
            // Serialize leaderboard state for change detection
            const leaderboardState = JSON.stringify(allPlayers.map(p => ({id:p.id,score:p.score,wins:p.wins,losses:p.losses})));
            if (leaderboardState !== this.lastLeaderboardState) {
                this.updatePlayerList();
                this.lastLeaderboardState = leaderboardState;
            }
        }

        // Update and clean up remote projectiles
        Object.values(this.players).forEach(player => {
            if (player.projectiles && Array.isArray(player.projectiles)) {
                // Update each remote projectile's position and effects
                player.projectiles = player.projectiles.filter(projectile => {
                    // Update projectile if it has an update method
                    if (projectile.update) {
                        return projectile.update(0.016, this.game.world); // 60 FPS approximation
                    } else {
                        // Legacy update for basic projectiles
                        projectile.x += projectile.velocityX * 0.016;
                        projectile.y += projectile.velocityY * 0.016;
                        
                        // Calculate distance from origin for cleanup
                        const distX = projectile.x - player.x;
                        const distY = projectile.y - player.y;
                        const distanceTraveled = Math.sqrt(distX * distX + distY * distY);

                        // Use projectile's range if available, otherwise default to 800
                        const maxRange = projectile.range || 800;
                        return distanceTraveled < maxRange;
                    }
                });
            }
        });
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
            color: projectile.color || '#f00',
            // Enhanced projectile properties for proper visual synchronization
            speed: projectile.speed,
            range: projectile.range,
            homing: projectile.homing || false,
            splashRadius: projectile.splashRadius || 0,
            explosionRadius: projectile.explosionRadius || 0,
            explosionDamage: projectile.explosionDamage || 0,
            shieldDisruption: projectile.shieldDisruption || false,
            disruptionDuration: projectile.disruptionDuration || 0,
            // Visual properties
            width: projectile.width,
            height: projectile.height,
            glow: projectile.glow || false,
            trail: projectile.trail || false,
            trailColor: projectile.trailColor,
            size: projectile.size,
            explosive: projectile.explosive || false,
            // Mine-specific properties
            isArmed: projectile.isArmed || false,
            armingTimer: projectile.armingTimer || 0,
            armingTime: projectile.armingTime || 0,
            lifetime: projectile.lifetime || 0,
            lifetimeTimer: projectile.lifetimeTimer || 0,
            // Seeker missile properties
            hasHomed: projectile.hasHomed || false,
            homingStarted: projectile.homingStarted || false,
            homingMinDistance: projectile.homingMinDistance || 200,
            distanceTraveled: projectile.distanceTraveled || 0
        };
        
        this.socket.emit('playerFire', projectileData);
    }

    // Send hit data when player hits something
    sendHit(type, id, damage, points = 0, credits = 0, destroyed = false) {
        if (!this.connected) {
            console.warn('Cannot send hit - multiplayer not connected');
            return;
        }
        
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
        
        console.log('Sending hit to server:', hitData);
        this.socket.emit('hit', hitData);
    }

    // Send asteroid destruction with fragments and powerups
    sendAsteroidDestruction(asteroid, fragments, powerups, explosionData) {
        if (!this.connected) return;
        
        const destructionData = {
            asteroidId: asteroid.id,
            position: { x: asteroid.x, y: asteroid.y },
            fragments: fragments.map(frag => ({
                id: frag.id,
                x: frag.x,
                y: frag.y,
                radius: frag.radius,
                health: frag.health,
                rotation: frag.rotation,
                rotationSpeed: frag.rotationSpeed,
                velocityX: frag.velocityX,
                velocityY: frag.velocityY,
                size: frag.size,
                scoreValue: frag.scoreValue,
                vertices: frag.vertices
            })),
            powerups: powerups,
            explosion: explosionData
        };
        
        // console.log('Sending asteroid destruction to server:', destructionData);
        this.socket.emit('asteroidDestroyed', destructionData);
    }

    // Send projectile impact for visual sync
    sendProjectileImpact(impactData) {
        if (!this.connected) return;
        
        console.log('Sending projectile impact to server:', impactData);
        this.socket.emit('projectileImpact', impactData);
    }

    // Send shield disruption data when player disrupts enemy shields
    sendShieldDisruption(targetId, duration) {
        if (!this.connected) return;
        
        this.socket.emit('shieldDisruption', {
            targetId: targetId,
            duration: duration,
            attackerId: this.playerId
        });
    }

    // Broadcast stats update immediately when wins/losses/score changes
    broadcastStatsUpdate() {
        if (!this.connected || !this.game.player) return;
        
        // Force immediate playerUpdate with current stats
        const playerData = {
            id: this.playerId,
            x: this.game.player.x,
            y: this.game.player.y,
            rotation: this.game.player.rotation,
            velocity: this.game.player.velocity,
            health: this.game.player.health,
            shield: this.game.player.shield || 0,
            maxShield: this.game.player.shieldCapacity || 0,
            ship: this.game.player.shipId || 'scout',
            color: this.game.player.color || '#0f0',
            score: this.game.player.score || 0,
            wins: this.game.player.wins || 0,
            losses: this.game.player.losses || 0
        };
        
        console.log('Force broadcasting player stats:', { score: playerData.score, wins: playerData.wins, losses: playerData.losses });
        
        // Send as both playerUpdate and playerMoved to ensure server compatibility
        this.socket.emit('playerUpdate', playerData);
        this.socket.emit('playerMoved', playerData);
        
        // Also try the dedicated stats update in case server supports it
        this.socket.emit('playerStatsUpdate', {
            id: this.playerId,
            score: playerData.score,
            wins: playerData.wins,
            losses: playerData.losses
        });
    }

    // Start periodic leaderboard updates for smooth real-time competition
    startLeaderboardUpdates() {
        // Clear any existing timer
        if (this.leaderboardTimer) {
            clearInterval(this.leaderboardTimer);
        }
        
        // Update leaderboard every 2 seconds for smooth real-time updates
        this.leaderboardTimer = setInterval(() => {
            if (this.connected && document.getElementById('player-list-container')) {
                this.updatePlayerList();
            }
        }, 2000);
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

    // Send ship color update to server and other players
    sendShipColorUpdate(color) {
        if (!this.connected) return;
        
        this.socket.emit('shipColorUpdate', {
            color: color
        });
    }
    
    // Send engine color update to server and other players
    sendEngineColorUpdate(color) {
        if (!this.connected) return;
        
        this.socket.emit('engineColorUpdate', {
            color: color
        });
    }
    
    // Handle remote player's ship color update
    handleRemoteShipColorUpdate(playerId, color) {
        if (this.players[playerId]) {
            this.players[playerId].shipColor = color;
        }
    }
    
    // Handle remote player's engine color update
    handleRemoteEngineColorUpdate(playerId, color) {
        if (this.players[playerId]) {
            this.players[playerId].engineColor = color;
        }
    }

    // Add a visual remote player
    addRemotePlayer(playerData) {
        // Safety check: Don't add ourselves as a remote player
        if (playerData.id === this.playerId) {
            console.warn('Attempted to add local player as remote player, ignoring');
            return;
        }
        
        const player = {
            id: playerData.id,
            x: playerData.x || 0,
            y: playerData.y || 0,
            rotation: playerData.rotation || 0,
            health: playerData.health || 100,
            shield: playerData.shield || 0,
            maxShield: playerData.maxShield || 0,
            ship: playerData.ship || 'scout',
            name: playerData.name || 'Unknown',
            color: playerData.color || '#f00',
            score: playerData.score || 0,
            wins: playerData.wins || 0,
            losses: playerData.losses || 0,
            avatar: playerData.avatar || 'han', // Add avatar information
            projectiles: [],
            destroyed: false, // Add destroyed flag
            // Initialize electric shock effect
            electricShockEffect: {
                active: false,
                startTime: 0,
                duration: 3000
            }
        };
        
        this.players[playerData.id] = player;
        
        // Cache the player's name for future reference (after death/respawn)
        if (player.name !== 'Unknown') {
            this.playerNameCache[playerData.id] = player.name;
        }
        
        // Update the player list UI whenever a new player is added
        this.updatePlayerList();
        
        console.log("Added remote player:", player.name, "Total players:", Object.keys(this.players).length);
    }

    // Update a remote player's data
    updateRemotePlayer(playerData) {
        // Don't process remote player updates for our own player
        if (playerData.id === this.playerId) {
            return;
        }
        
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
            player.health = playerData.health !== undefined ? playerData.health : player.health;
            player.shield = playerData.shield !== undefined ? playerData.shield : (player.shield || 0);
            player.maxShield = playerData.maxShield !== undefined ? playerData.maxShield : (player.maxShield || 0);
            player.ship = playerData.ship || player.ship;
            player.color = playerData.color || player.color;
            
            // Debug: Log stat updates
            const oldScore = player.score;
            const oldWins = player.wins;
            const oldLosses = player.losses;
            
            player.score = playerData.score !== undefined ? playerData.score : player.score;
            player.wins = playerData.wins !== undefined ? playerData.wins : player.wins;
            player.losses = playerData.losses !== undefined ? playerData.losses : player.losses;
            
            if (oldScore !== player.score || oldWins !== player.wins || oldLosses !== player.losses) {
                console.log(`REMOTE PLAYER UPDATE: ${player.name} - Score: ${oldScore}->${player.score}, Wins: ${oldWins}->${player.wins}, Losses: ${oldLosses}->${player.losses}`);
            }
            
            // Update name if provided and cache it
            if (playerData.name && playerData.name !== 'Unknown') {
                player.name = playerData.name;
                this.playerNameCache[playerData.id] = playerData.name;
            } 
            // If player has Unknown name but we have a cached name, restore it
            else if (player.name === 'Unknown' && this.playerNameCache[playerData.id]) {
                player.name = this.playerNameCache[playerData.id];
            }
        }
    }

    // Remove a remote player
    removeRemotePlayer(playerId) {
        if (this.players[playerId]) {
            // Cache the player's name before removing
            this.playerNameCache[playerId] = this.players[playerId].name;
        }
        
        delete this.players[playerId];
        
        // Update the player list UI when a player is removed
        this.updatePlayerList();
        
        console.log("Removed player:", playerId, "Total players:", Object.keys(this.players).length);
    }

    // Handle receiving a projectile from another player
    handleRemoteProjectile(playerId, projectileData) {
        // Create a proper Projectile instance for remote players with all properties
        // Import Projectile class to create full instances
        const projectile = {
            x: projectileData.x,
            y: projectileData.y,
            angle: projectileData.angle,
            velocityX: projectileData.velocity ? projectileData.velocity.x : 0,
            velocityY: projectileData.velocity ? projectileData.velocity.y : 0,
            velocity: {
                x: projectileData.velocity ? projectileData.velocity.x : 0,
                y: projectileData.velocity ? projectileData.velocity.y : 0
            },
            damage: projectileData.damage,
            type: projectileData.type || 'laser',
            color: projectileData.color || '#f00',
            // Enhanced projectile properties for proper visual rendering
            speed: projectileData.speed || (projectileData.type === 'missile' && projectileData.homing ? 350 : 300), // Slower for homing missiles
            range: projectileData.range || 800,
            homing: projectileData.homing || false,
            splashRadius: projectileData.splashRadius || 0,
            explosionRadius: projectileData.explosionRadius || 0,
            explosionDamage: projectileData.explosionDamage || 0,
            shieldDisruption: projectileData.shieldDisruption || false,
            disruptionDuration: projectileData.disruptionDuration || 0,
            // Visual properties
            width: projectileData.width || 3,
            height: projectileData.height || 12,
            glow: projectileData.glow || false,
            trail: projectileData.trail || false,
            trailColor: projectileData.trailColor,
            size: projectileData.size,
            explosive: projectileData.explosive || false,
            // Mine-specific properties
            isArmed: projectileData.isArmed || false,
            armingTimer: projectileData.armingTimer || 0,
            armingTime: projectileData.armingTime || 0,
            lifetime: projectileData.lifetime || 0,
            lifetimeTimer: projectileData.lifetimeTimer || 0,
            // Seeker missile properties
            hasHomed: projectileData.hasHomed || false,
            homingStarted: projectileData.homingStarted || false,
            homingMinDistance: projectileData.homingMinDistance || 200,
            distanceTraveled: projectileData.distanceTraveled || 0,
            // Initialize trail particles for visual effects
            trailParticles: [],
            hasExploded: false,
            remoteId: playerId,
            // Add update method for remote projectiles to handle trails and homing
            update: function(deltaTime, world) {
                // Handle mine arming for remote mines
                if (this.type === 'mine') {
                    // Handle arming timer
                    if (!this.isArmed && this.armingTime > 0) {
                        this.armingTimer -= deltaTime;
                        if (this.armingTimer <= 0) {
                            this.isArmed = true;
                            // Change color when armed to show it's dangerous
                            this.color = '#f00'; // Red when armed (dangerous)
                        }
                    }
                    
                    // Handle lifetime
                    this.lifetimeTimer -= deltaTime;
                    if (this.lifetimeTimer <= 0) {
                        // Mine expires - mark for removal
                        this.distanceTraveled = this.range + 1; // Force removal
                        return;
                    }
                    
                    // Mines don't move after deployment
                    return;
                }
                
                // Implement homing behavior for seeker missiles
                if (this.homing && this.type === 'missile' && world) {
                    // Find nearest target (players or asteroids)
                    let nearest = null;
                    let nearestDist = Infinity;
                    
                    // Check for multiplayer players first
                    if (window.game && window.game.multiplayer && window.game.multiplayer.players) {
                        Object.values(window.game.multiplayer.players).forEach(p => {
                            if (p.destroyed || p.health <= 0) return;
                            const dx = p.x - this.x;
                            const dy = p.y - this.y;
                            const dist = Math.sqrt(dx*dx + dy*dy);
                            if (dist < nearestDist && dist > 50) { // Avoid self-targeting at close range
                                nearest = p;
                                nearestDist = dist;
                            }
                        });
                    }
                    
                    // Also check local player as potential target
                    if (window.game && window.game.player) {
                        const dx = window.game.player.x - this.x;
                        const dy = window.game.player.y - this.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < nearestDist && dist > 50) {
                            nearest = window.game.player;
                            nearestDist = dist;
                        }
                    }
                    
                    // Apply homing behavior if target found
                    if (nearest) {
                        // Calculate direction to target
                        const dx = nearest.x - this.x;
                        const dy = nearest.y - this.y;
                        const angleToTarget = Math.atan2(dy, dx) + Math.PI/2;
                        
                        // Gradually adjust missile angle towards target
                        const turnSpeed = 5.0 * deltaTime; // Smooth turning for visual appeal
                        let angleDiff = angleToTarget - this.angle;
                        
                        // Normalize angle difference to between -PI and PI
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        
                        // Apply steering with smooth turning
                        this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnSpeed);
                        
                        // Update velocity based on new angle
                        this.velocity.x = Math.sin(this.angle) * this.speed;
                        this.velocity.y = -Math.cos(this.angle) * this.speed;
                    }
                }
                
                // Update position
                this.x += this.velocity.x * deltaTime;
                this.y += this.velocity.y * deltaTime;
                this.distanceTraveled += this.speed * deltaTime;
                
                // Update trail particles if trail is enabled
                if (this.trail || this.type === 'missile') {
                    const trailSize = this.type === 'missile' ? 3 : 2;
                    const lifetime = this.type === 'missile' ? 0.6 : 0.3;
                    
                    this.trailParticles.push({
                        x: this.x,
                        y: this.y,
                        timeLeft: lifetime,
                        maxTime: lifetime,
                        size: trailSize
                    });
                    
                    // Remove old trail particles
                    this.trailParticles = this.trailParticles.filter(particle => {
                        particle.timeLeft -= deltaTime;
                        return particle.timeLeft > 0;
                    });
                }
                
                return this.distanceTraveled < this.range;
            },
            
            // Add render method for enhanced visual effects
            render: function(ctx) {
                // Call the enhanced remote projectile renderer
                if (window.game && window.game.player && window.game.player.renderRemoteProjectile) {
                    window.game.player.renderRemoteProjectile(ctx, this);
                } else {
                    // Fallback basic rendering
                    ctx.save();
                    ctx.fillStyle = this.color || '#f00';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
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

    // Handle player damage and check for death
    handleDamage(damage, attackerId) {
        // Record the attacker ID for kill attribution
        if (this.game.player) {
            this.game.player.recordDamageFrom(attackerId);
        }
        
        // Trigger combat tension music
        if (this.game.soundSystem) {
            this.game.soundSystem.triggerCombatTension();
        }
        
        // Apply damage
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

    // Handle shield disruption (when local player's shields are disrupted)
    handleShieldDisruption(duration, attackerId) {
        if (!this.game.player) return;
        
        // Store original shield value
        const originalShield = this.game.player.shield;
        
        // Disable shield temporarily
        this.game.player.shield = 0;
        this.game.player.shieldDisrupted = true;
        this.game.player.disruptionEndTime = Date.now() + (duration * 1000);
        
        // Activate electric shock visual effect
        this.game.player.electricShockEffect = {
            active: true,
            startTime: Date.now(),
            duration: duration * 1000
        };
        
        // Set up a timer to restore shields
        setTimeout(() => {
            if (this.game.player && this.game.player.shieldDisrupted && 
                this.game.player.disruptionEndTime <= Date.now()) {
                this.game.player.shield = originalShield;
                this.game.player.shieldDisrupted = false;
                this.game.player.disruptionEndTime = null;
                this.game.player.electricShockEffect.active = false;
                
                // Show shield restoration message
                this.showGameMessage('Shields restored!', '#4f4');
            }
        }, duration * 1000);
        
        // Show disruption message
        const attacker = this.players[attackerId]?.name || 'Another player';
        this.showGameMessage(`Shields disrupted by ${attacker}!`, '#f84');
    }

    // Handle shield disruption for remote players (visual effects only)
    handleRemoteShieldDisruption(targetId, duration) {
        const remotePlayer = this.players[targetId];
        if (!remotePlayer) return;
        
        // Store original shield value
        const originalShield = remotePlayer.shield;
        
        // Disable shield visually for remote player
        remotePlayer.shield = 0;
        remotePlayer.shieldDisrupted = true;
        remotePlayer.disruptionEndTime = Date.now() + (duration * 1000);
        
        // Activate electric shock visual effect
        remotePlayer.electricShockEffect = {
            active: true,
            startTime: Date.now(),
            duration: duration * 1000
        };
        
        // Set up a timer to restore shield visuals
        setTimeout(() => {
            if (remotePlayer && remotePlayer.shieldDisrupted && 
                remotePlayer.disruptionEndTime <= Date.now()) {
                remotePlayer.shield = originalShield;
                remotePlayer.shieldDisrupted = false;
                remotePlayer.disruptionEndTime = null;
                remotePlayer.electricShockEffect.active = false;
            }
        }, duration * 1000);
    }

    // Handle player death (local)
    handleDeath(attackerId) {
        // Don't increment losses locally - server handles all loss counting
        // This prevents double loss counts
        
        // Send death event to server 
        if (attackerId === 'asteroid') {
            // Server will handle the announcement broadcast to all players
            this.socket.emit('playerDestroyedByAsteroid', {
                playerId: this.playerId
            });
        } else if (attackerId && attackerId !== this.playerId) {
            // Player vs player death - notify server for point/stat tracking
            this.socket.emit('playerDestroyed', {
                playerId: this.playerId,
                attackerId: attackerId
            });
        }
        
        // Store current credits value
        const currentCredits = this.game.player.credits;
        
        // Make sure the die() method has been called to create explosion effects
        if (!this.game.player.deathTriggered) {
            this.game.player.die();
        }
        
        // Show death message based on cause
        let deathMessage;
        if (attackerId === 'asteroid') {
            deathMessage = 'Destroyed by an asteroid!';
        } else {
            const attacker = this.players[attackerId]?.name || 'Another player';
            deathMessage = `Destroyed by ${attacker}!`;
        }
        this.showGameMessage(deathMessage, '#f44', 3000);
        
        // Track achievements and player profile for death (with safety checks)
        if (this.game.achievements && typeof this.game.achievements.onDeath === 'function') {
            this.game.achievements.onDeath();
        }
        if (this.game.playerProfile && typeof this.game.playerProfile.onDeath === 'function') {
            this.game.playerProfile.onDeath();
        }
        
        // Respawn after delay
        setTimeout(() => {
            if (!this.game) return; // Safety check
            
            const spawnX = (Math.random() - 0.5) * 400; // -200 to +200 (safely inside safe zone)
            const spawnY = (Math.random() - 0.5) * 400; // -200 to +200 (safely inside safe zone)
            
            this.game.player.x = spawnX;
            this.game.player.y = spawnY;
            this.game.player.health = this.game.player.maxHealth;
            this.game.player.visible = true;
            this.game.player.deathTriggered = false;
            
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
                
                // Award credits and points immediately for responsive gameplay
                if (this.game.player) {
                    this.game.player.score += 500;  // Restore immediate score update
                    this.game.player.addCredits(250);
                    this.game.player.wins += 1;  // Track wins locally too
                    this.updatePlayerList(); // Update UI immediately
                    
                    // Track achievements and player profile (with safety checks)
                    if (this.game.achievements && typeof this.game.achievements.onPlayerKill === 'function') {
                        this.game.achievements.onPlayerKill(playerId);
                    }
                    if (this.game.achievements && typeof this.game.achievements.onWin === 'function') {
                        this.game.achievements.onWin();
                    }
                    if (this.game.playerProfile && typeof this.game.playerProfile.onKill === 'function') {
                        this.game.playerProfile.onKill(this.game.player.currentWeapon, true);
                    }
                    if (this.game.playerProfile && typeof this.game.playerProfile.onCreditsEarned === 'function') {
                        this.game.playerProfile.onCreditsEarned(250);
                    }
                    
                    // Broadcast stats update immediately
                    this.broadcastStatsUpdate();
                }
            } else {
                this.showGameMessage(`${attacker} destroyed ${deadPlayerName}!`, '#fff');
            }        // Create ship destruction effect for remote player
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
        // Safety check: Don't process respawn for our own player
        if (playerId === this.playerId) {
            console.warn('Ignoring remote respawn event for local player');
            return;
        }
        
        // Prevent duplicate processing by checking if player was already processed recently
        const now = Date.now();
        if (!this.respawnProcessingCache) {
            this.respawnProcessingCache = new Map();
        }
        
        const lastProcessed = this.respawnProcessingCache.get(playerId);
        if (lastProcessed && (now - lastProcessed) < 1000) { // Prevent duplicate within 1 second
            console.log('Preventing duplicate respawn processing for player:', playerId);
            return;
        }
        
        this.respawnProcessingCache.set(playerId, now);
        
        // Check if this is a player we already know about
        if (this.players[playerId]) {
            // Player exists in our list, update them
            this.players[playerId].x = x;
            this.players[playerId].y = y;
            this.players[playerId].health = 100;
            this.players[playerId].destroyed = false; // Reset destroyed flag
            
            const playerName = this.players[playerId].name;
            this.showGameMessage(`${playerName} respawned!`, '#8af');
        } else {
            // This is a player who was removed from our list after destruction
            // Re-add them with a name and await the next player update to fill in details
            this.players[playerId] = {
                id: playerId,
                x: x,
                y: y,
                rotation: 0,
                health: 100,
                ship: 'scout',
                name: this.playerNameCache[playerId] || 'Unknown', // Use cached name if available
                color: this.getRandomPlayerColor(),
                projectiles: [],
                destroyed: false,
                // Initialize electric shock effect
                electricShockEffect: {
                    active: false,
                    startTime: 0,
                    duration: 3000
                }
            };
            
            // Request current player data from server to get correct name
            if (this.socket) {
                this.socket.emit('requestPlayerData', { playerId: playerId });
            }
            
            // Show respawn message with player name if we have it cached
            if (this.playerNameCache[playerId]) {
                this.showGameMessage(`${this.playerNameCache[playerId]} respawned!`, '#8af');
            } else {
                this.showGameMessage(`A player respawned!`, '#8af');
            }
        }
        
        // Ensure kill announcer is ready after respawn
        this.ensureKillAnnouncerReady();
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

    // Handle asteroid destruction with fragments from server
    handleAsteroidDestroyedWithFragments(data) {
        // console.log('Handling asteroid destruction with fragments:', data);
        // console.log('Current asteroids count:', this.game.world.asteroids.length);
        
        // Find and remove the original asteroid by ID (if it still exists)
        let asteroidFound = false;
        for (let i = 0; i < this.game.world.asteroids.length; i++) {
            if (this.game.world.asteroids[i].id === data.asteroidId) {
                // console.log(`Found asteroid ${data.asteroidId} to destroy at index ${i}`);
                asteroidFound = true;
                
                const asteroid = this.game.world.asteroids[i];
                
                // Clear any pending destruction timeout
                if (asteroid.destructionTimeout) {
                    clearTimeout(asteroid.destructionTimeout);
                }
                
                // Award credits locally (since we destroyed it)
                if (data.destroyedBy === this.socket.id && this.game.player) {
                    // Calculate credit reward based on asteroid size
                    let creditReward;
                    switch (asteroid.size) {
                        case 'large':
                            creditReward = this.game.world.getRandomInt(
                                this.game.world.asteroidCreditValues.large.min,
                                this.game.world.asteroidCreditValues.large.max
                            );
                            break;
                        case 'medium':
                            creditReward = this.game.world.getRandomInt(
                                this.game.world.asteroidCreditValues.medium.min,
                                this.game.world.asteroidCreditValues.medium.max
                            );
                            break;
                        default:
                            creditReward = this.game.world.getRandomInt(
                                this.game.world.asteroidCreditValues.small.min,
                                this.game.world.asteroidCreditValues.small.max
                            );
                    }
                    this.game.player.addCredits(creditReward);
                    
                    // Spawn powerups locally
                    if (asteroid.size !== 'small') {
                        if (Math.random() < 0.3) { // 30% chance for large/medium asteroids
                            this.game.world.spawnPowerup(asteroid.x, asteroid.y);
                        }
                    } else if (Math.random() < 0.1) { // 10% chance for small asteroids
                        this.game.world.spawnPowerup(asteroid.x, asteroid.y);
                    }
                }
                
                // Don't create explosion here - it was already created on hit
                // The explosion should happen immediately when projectile hits, not when server responds
                
                // Remove the original asteroid
                this.game.world.asteroids.splice(i, 1);
                // console.log(`Removed original asteroid ${data.asteroidId}`);
                break;
            }
        }
        
        if (!asteroidFound) {
            // console.log(`Asteroid ${data.asteroidId} already removed locally - creating explosion at server position`);
            // Create explosion at the position provided by server
            this.game.world.createExplosion(data.position.x, data.position.y, 50);
        }
        
        // Add any fragments from the server
        if (data.fragments && data.fragments.length > 0) {
            console.log(`Adding ${data.fragments.length} fragments:`, data.fragments);
            data.fragments.forEach(fragment => {
                const size = fragment.radius > 50 ? 'large' : fragment.radius > 25 ? 'medium' : 'small';
                const scoreValue = size === 'large' ? 50 : size === 'medium' ? 20 : 10;
                
                // Use the server-provided seed to generate deterministic vertices
                let vertices;
                if (fragment.seed !== undefined) {
                    vertices = this.game.world.generateAsteroidVertices(8, 0.4, fragment.seed);
                } else {
                    vertices = this.game.world.generateAsteroidVertices(Math.floor(6 + Math.random() * 4), 0.5);
                }
                this.game.world.asteroids.push({
                    id: fragment.id,
                    x: fragment.x,
                    y: fragment.y,
                    radius: fragment.radius,
                    health: fragment.health,
                    type: fragment.type,
                    rotation: fragment.rotation,
                    rotationSpeed: fragment.rotationSpeed,
                    velocityX: fragment.velocityX || 0, // Include fragment velocity
                    velocityY: fragment.velocityY || 0, // Include fragment velocity
                    size: size,
                    scoreValue: scoreValue,
                    vertices: vertices
                });
                console.log(`Added fragment ${fragment.id} at (${fragment.x}, ${fragment.y}) with radius ${fragment.radius}`);
            });
            // console.log(`Successfully added ${data.fragments.length} asteroid fragments from server`);
        } else {
            // console.log('No fragments in server response');
        }
    }

    // Handle other player's asteroid destruction
    handleOtherPlayerAsteroidDestruction(data) {
        // console.log('🔥 Handling other player asteroid destruction:', data);
        // console.log('🔥 Current asteroids before:', this.game.world.asteroids.length);
        
        // Find and remove the asteroid
        const asteroidIndex = this.game.world.asteroids.findIndex(a => a.id === data.asteroidId);
        if (asteroidIndex >= 0) {
            this.game.world.asteroids.splice(asteroidIndex, 1);
            // console.log(`🔥 Removed asteroid ${data.asteroidId} destroyed by other player`);
        } else {
            // console.log(`🔥 Asteroid ${data.asteroidId} not found in local asteroids array`);
        }
        
        // Create explosion effect
        if (data.explosion) {
            console.log('🔥 Creating explosion at:', data.explosion);
            this.game.world.createExplosion(data.explosion.x, data.explosion.y, data.explosion.radius);
        }
        
        // Add fragments
        if (data.fragments && data.fragments.length > 0) {
            console.log(`🔥 Adding ${data.fragments.length} fragments:`, data.fragments);
            data.fragments.forEach((fragment, index) => {
                console.log(`🔥 Adding fragment ${index}:`, fragment);
                this.game.world.asteroids.push(fragment);
            });
            console.log(`🔥 Added ${data.fragments.length} fragments from other player`);
        } else {
            console.log('🔥 No fragments to add');
        }
        
        // Add powerups
        if (data.powerups && data.powerups.length > 0) {
            // console.log(`🔥 Adding ${data.powerups.length} powerups:`, data.powerups);
            data.powerups.forEach((powerup, index) => {
                // console.log(`🔥 Spawning powerup ${index}:`, powerup);
                this.game.world.spawnPowerup(powerup.x, powerup.y, powerup.type);
            });
            // console.log(`🔥 Added ${data.powerups.length} powerups from other player`);
        } else {
            // console.log('🔥 No powerups to add');
        }
        
        // console.log('🔥 Current asteroids after:', this.game.world.asteroids.length);
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
        
        // PLAYERS ONLINE title With live player count displayed in bracke
        const titleText = document.createElement('div');
        titleText.textContent = '🌐 ACTIVE PILOTS';
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
        
        // Start with remote players data
        const remotePlayers = Object.values(this.players).filter(p => !p.destroyed).map(p => ({
            id: p.id,
            name: p.name,
            color: p.color || '#f00',
            score: p.score || 0,
            wins: p.wins || 0,
            losses: p.losses || 0,
            avatar: p.avatar || 'han',
            isSelf: false
        }));
        
        // Add self (local player) with current stats - but avoid duplicates
        const selfData = {
            id: this.playerId,
            name: this.playerName,
            color: '#0f0',
            score: this.game.player?.score || 0,
            wins: this.game.player?.wins || 0,
            losses: this.game.player?.losses || 0,
            avatar: localStorage.getItem('selectedAvatar') || 'han',
            isSelf: true
        };
        
        // Remove any remote player entry that matches our ID (prevent duplicates)
        const filteredRemotePlayers = remotePlayers.filter(p => p.id !== this.playerId);
        
        // Combine all players
        const allPlayers = [selfData, ...filteredRemotePlayers];
        
        // Debug: Log player data before sorting
        console.log('PLAYER LIST UPDATE - Before sort:', allPlayers.map(p => ({ name: p.name, score: p.score, wins: p.wins, losses: p.losses, id: p.id })));
        
        allPlayers.sort((a, b) => b.score - a.score);
        
        // Debug: Log player data after sorting
        console.log('PLAYER LIST UPDATE - After sort:', allPlayers.map(p => ({ name: p.name, score: p.score, wins: p.wins, losses: p.losses, id: p.id })));

        // Header row
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.fontWeight = 'bold';
        header.style.marginBottom = '4px';
        header.innerHTML = `<span style="width:30px;text-align:center;">#</span><span style="width:16px;"></span><span style="width:20px;"></span><span style="flex:1;">Player</span><span style="width:60px;text-align:center;">Score</span><span style="width:50px;text-align:center;">Wins</span><span style="width:60px;text-align:center;">Losses</span>`;
        listContainer.appendChild(header);

        allPlayers.forEach((player, index) => {
            const playerItem = document.createElement('div');
            playerItem.style.display = 'flex';
            playerItem.style.alignItems = 'center';
            playerItem.style.marginBottom = '3px';
            playerItem.style.position = 'relative';
            playerItem.style.padding = '2px';
            playerItem.style.borderRadius = '3px';
            playerItem.style.background = player.isSelf ? 'rgba(0,255,0,0.08)' : '';

            const rankNumber = document.createElement('span');
            rankNumber.textContent = `${index + 1}.`;
            rankNumber.style.width = '30px';
            rankNumber.style.textAlign = 'center';
            rankNumber.style.color = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#fff';
            rankNumber.style.fontWeight = 'bold';
            rankNumber.style.flexShrink = '0';

            const playerColor = document.createElement('span');
            playerColor.style.display = 'inline-block';
            playerColor.style.width = '10px';
            playerColor.style.height = '10px';
            playerColor.style.backgroundColor = player.color;
            playerColor.style.borderRadius = '50%';
            playerColor.style.marginRight = '5px';
            playerColor.style.flexShrink = '0';

            // Profile picture placeholder
            const profilePicture = document.createElement('span');
            profilePicture.style.display = 'inline-block';
            profilePicture.style.width = '14px';
            profilePicture.style.height = '14px';
            profilePicture.style.backgroundColor = 'rgba(100, 100, 100, 0.3)';
            profilePicture.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            profilePicture.style.borderRadius = '2px';
            profilePicture.style.marginRight = '5px';
            profilePicture.style.flexShrink = '0';
            profilePicture.style.backgroundSize = 'cover';
            profilePicture.style.backgroundPosition = 'center';
            
            // Generate small avatar for this player
            if (window.ui && window.ui.avatarManager) {
                const avatarDataUrl = window.ui.avatarManager.generateSmallAvatar(player.avatar);
                profilePicture.style.backgroundImage = `url(${avatarDataUrl})`;
                profilePicture.style.backgroundColor = 'transparent';
            }

            const playerName = document.createElement('span');
            playerName.textContent = player.isSelf ? `${player.name} (You)` : player.name;
            playerName.style.flex = '1';
            playerName.style.color = player.isSelf ? '#0f0' : '#fff';
            playerName.style.textDecoration = 'none';
            playerName.style.overflow = 'hidden';
            playerName.style.textOverflow = 'ellipsis';
            playerName.style.whiteSpace = 'nowrap';

            const score = document.createElement('span');
            score.textContent = player.score;
            score.style.width = '60px';
            score.style.textAlign = 'center';
            score.style.color = '#3af';

            const wins = document.createElement('span');
            wins.textContent = player.wins;
            wins.style.width = '50px';
            wins.style.textAlign = 'center';
            wins.style.color = '#4f4';

            const losses = document.createElement('span');
            losses.textContent = player.losses;
            losses.style.width = '60px';
            losses.style.textAlign = 'center';
            losses.style.color = '#f44';

            playerItem.appendChild(rankNumber);
            playerItem.appendChild(playerColor);
            playerItem.appendChild(profilePicture);
            playerItem.appendChild(playerName);
            playerItem.appendChild(score);
            playerItem.appendChild(wins);
            playerItem.appendChild(losses);
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
            
            // Draw name, health bar and shield info above ship - NOT ROTATING with ship
            ctx.save();
            
            // Position the UI elements above the ship
            const uiY = player.y - 30; // Position above ship
            const uiX = player.x;
            
            // Draw player name FIRST (at the top)
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeText(player.name, uiX, uiY - 5);
            ctx.fillText(player.name, uiX, uiY - 5);
            
            // Draw shield bar SECOND (below the name) if player has shields
            if (player.shield !== undefined && player.shield > 0) {
                const shieldBarWidth = 30;
                const shieldBarHeight = 2;
                const shieldBarY = uiY + 2; // Position BELOW name, ABOVE health bar
                const shieldBarX = uiX - (shieldBarWidth / 2);
                
                // Calculate shield percentage
                const shieldPercent = player.shield / (player.maxShield || 100);
                
                // Draw background (dark blue)
                ctx.fillStyle = 'rgba(0, 0, 60, 0.7)';
                ctx.fillRect(shieldBarX, shieldBarY, shieldBarWidth, shieldBarHeight);
                
                // Draw filled portion (blue for shield)
                const shieldFillWidth = shieldBarWidth * shieldPercent;
                ctx.fillStyle = '#00f';
                ctx.fillRect(shieldBarX, shieldBarY, shieldFillWidth, shieldBarHeight);
                
                // Draw border
                ctx.strokeStyle = 'rgba(100, 150, 255, 0.7)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(shieldBarX, shieldBarY, shieldBarWidth, shieldBarHeight);
            }

            // Draw health bar THIRD (at the bottom)
            const healthBarWidth = 30;
            const healthBarHeight = 4;
            const healthBarY = uiY + 5; // Position below shield bar
            const healthBarX = uiX - (healthBarWidth / 2);
            
            // Calculate health percentage
            const healthPercent = player.health / (player.maxHealth || 100);
            
            // Draw background (dark red)
            ctx.fillStyle = 'rgba(60, 0, 0, 0.7)';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            
            // Draw filled portion (gradient from yellow to green based on health)
            let healthColor;
            if (healthPercent > 0.7) {
                healthColor = '#0f0'; // Green for high health
            } else if (healthPercent > 0.3) {
                healthColor = '#ff0'; // Yellow for medium health
            } else {
                healthColor = '#f00'; // Red for low health
            }
            
            const fillWidth = healthBarWidth * healthPercent;
            ctx.fillStyle = healthColor;
            ctx.fillRect(healthBarX, healthBarY, fillWidth, healthBarHeight);
            
            // Draw border
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
            ctx.lineWidth = 1;
            ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            
            ctx.restore();
            
            // Draw shield effect for remote players when they have shields
            if (player.shield && player.shield > 0) {
                // Save context before drawing the shield
                ctx.save();
                ctx.translate(player.x, player.y);
                
                // Create shield visual effect based on shield strength
                const shieldPercentage = player.shield / (player.maxShield || 100); // Use maxShield if available, otherwise default to 100
                const glowSize = 25 + (shieldPercentage * 8); // Similar to player shield
                const glowOpacity = 0.3 + (shieldPercentage * 0.4);
                
                // Create radial gradient for shield effect
                const shieldGradient = ctx.createRadialGradient(0, 0, glowSize * 0.3, 0, 0, glowSize);
                shieldGradient.addColorStop(0, `rgba(64, 160, 255, ${glowOpacity * 0.15})`); // Inner glow
                shieldGradient.addColorStop(0.6, `rgba(64, 160, 255, ${glowOpacity * 0.8})`); // Main shield glow
                shieldGradient.addColorStop(1, `rgba(32, 100, 255, 0)`); // Fade out at the edge
                
                // Draw the shield glow
                ctx.fillStyle = shieldGradient;
                ctx.beginPath();
                ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Add multiple ripple rings with different timing
                const drawRipple = (phase, width, opacity) => {
                    const pulsePhase = (Date.now() % 2000) / 2000;
                    const adjustedPhase = (pulsePhase + phase) % 1;
                    if (adjustedPhase < 0.7) { // Only show ripple during part of the cycle
                        // Calculate ripple size based on pulse phase
                        const rippleSize = glowSize * (0.8 + adjustedPhase * 0.6);
                        const rippleOpacity = (0.7 - Math.abs(0.35 - adjustedPhase)) * opacity * shieldPercentage;
                        
                        // Draw ripple effect
                        ctx.strokeStyle = `rgba(120, 200, 255, ${rippleOpacity})`;
                        ctx.lineWidth = width;
                        ctx.beginPath();
                        ctx.arc(0, 0, rippleSize, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                };
                
                // Draw multiple ripples at different phases for a more dynamic effect
                drawRipple(0, 1.8, 0.5);
                drawRipple(0.3, 1.2, 0.4);
                drawRipple(0.6, 1.0, 0.3);
                
                // Extra effect: shield impact flashes when taking recent damage
                if (player.lastDamageTime) {
                    const timeSinceDamage = (Date.now() / 1000) - player.lastDamageTime;
                    if (timeSinceDamage < 0.3) {
                        const flashOpacity = 0.7 * (1 - (timeSinceDamage / 0.3));
                        ctx.fillStyle = `rgba(200, 230, 255, ${flashOpacity})`;
                        ctx.beginPath();
                        ctx.arc(0, 0, glowSize * 0.9, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                
                ctx.restore();
            }
            
            // Draw electric shock effect if shields are disrupted
            if (player.electricShockEffect && player.electricShockEffect.active) {
                ctx.save();
                ctx.translate(player.x, player.y);
                
                const currentTime = Date.now();
                const elapsed = currentTime - player.electricShockEffect.startTime;
                const intensity = 1 - (elapsed / player.electricShockEffect.duration);
                
                if (intensity > 0) {
                    // Draw multiple random lightning bolts around the ship
                    const numBolts = 8 + Math.floor(Math.random() * 6);
                    
                    for (let i = 0; i < numBolts; i++) {
                        // Random angle for each bolt
                        const angle = (Math.PI * 2 * i) / numBolts + Math.random() * 0.5;
                        const distance = 20 + Math.random() * 15;
                        
                        // Calculate bolt endpoints
                        const startX = Math.cos(angle) * 10;
                        const startY = Math.sin(angle) * 10;
                        const endX = Math.cos(angle) * distance;
                        const endY = Math.sin(angle) * distance;
                        
                        // Draw jagged lightning bolt
                        ctx.strokeStyle = `rgba(255, 255, 100, ${intensity * (0.7 + Math.random() * 0.3)})`;
                        ctx.lineWidth = 1 + Math.random() * 2;
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        
                        // Add jagged segments
                        const segments = 3 + Math.floor(Math.random() * 3);
                        for (let j = 1; j <= segments; j++) {
                            const t = j / segments;
                            const jaggedX = startX + (endX - startX) * t + (Math.random() - 0.5) * 8;
                            const jaggedY = startY + (endY - startY) * t + (Math.random() - 0.5) * 8;
                            ctx.lineTo(jaggedX, jaggedY);
                        }
                        ctx.stroke();
                    }
                    
                    // Add electric aura around ship
                    const auraGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 30);
                    auraGradient.addColorStop(0, `rgba(255, 255, 0, ${intensity * 0.3})`);
                    auraGradient.addColorStop(0.5, `rgba(255, 100, 0, ${intensity * 0.2})`);
                    auraGradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
                    
                    ctx.fillStyle = auraGradient;
                    ctx.beginPath();
                    ctx.arc(0, 0, 30, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
            }
            
            // Draw remote player's ship
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.rotation);
            
            // Get ship color - use player's color or fallback
            const shipColor = player.shipColor || player.color || '#f00';
            const engineColor = player.engineColor || '#6ff';
            
            // Set thrust level based on player velocity (if not provided directly)
            let thrustLevel = 0;
            if (player.thrustLevel !== undefined) {
                thrustLevel = player.thrustLevel;
            } else if (player.velocity) {
                // Estimate thrust level based on velocity magnitude
                const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
                thrustLevel = Math.min(1.0, speed / 200); // Scale to 0-1 range
            }
            
            // Draw ship based on type
            if (player.ship === 'fighter') {
                // Enhanced fighter ship design
                // Main body
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -22); // Front nose tip
                ctx.lineTo(-5, -15); // Left side of nose
                ctx.lineTo(-18, -5); // Left wing tip
                ctx.lineTo(-12, 0); // Left wing inner edge
                ctx.lineTo(-15, 12); // Left rear wing
                ctx.lineTo(-5, 8); // Left engine mount
                ctx.lineTo(0, 10); // Center bottom
                ctx.lineTo(5, 8); // Right engine mount
                ctx.lineTo(15, 12); // Right rear wing
                ctx.lineTo(12, 0); // Right wing inner edge
                ctx.lineTo(18, -5); // Right wing tip
                ctx.lineTo(5, -15); // Right side of nose
                ctx.closePath();
                ctx.fill();
                
                // Cockpit
                ctx.fillStyle = 'rgba(180, 230, 255, 0.7)';
                ctx.beginPath();
                ctx.ellipse(0, -8, 4, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Wing markings/details
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.moveTo(-15, -4);
                ctx.lineTo(-10, -2);
                ctx.lineTo(-10, 0);
                ctx.lineTo(-15, -2);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(15, -4);
                ctx.lineTo(10, -2);
                ctx.lineTo(10, 0);
                ctx.lineTo(15, -2);
                ctx.closePath();
                ctx.fill();
                
                // Dynamic engine flame based on thrust level
                if (thrustLevel > 0) {
                    // Base engine flame shape grows with thrust level
                    ctx.fillStyle = engineColor;
                    ctx.beginPath();
                    ctx.moveTo(-7, 8);
                    ctx.lineTo(-4, 8 + (10 * thrustLevel)); // Left side extends with thrust
                    ctx.lineTo(0, 8 + (6 * thrustLevel)); // Center point
                    ctx.lineTo(4, 8 + (10 * thrustLevel)); // Right side extends with thrust
                    ctx.lineTo(7, 8);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Engine glow effect - intensity increases with thrust
                    const engineGlowSize = 8 + (10 * thrustLevel);
                    const fighterEngineGradient = ctx.createRadialGradient(0, 12, 0, 0, 12, engineGlowSize);
                    fighterEngineGradient.addColorStop(0, engineColor);
                    fighterEngineGradient.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = fighterEngineGradient;
                    ctx.fillRect(-8, 10, 16, 8 + (12 * thrustLevel));
                    
                    // Add animated flickering for more realistic flame
                    if (thrustLevel > 0.7) {
                        const flickerIntensity = (Math.random() * 0.2) * thrustLevel;
                        ctx.globalAlpha = 0.5 * flickerIntensity;
                        ctx.beginPath();
                        ctx.arc(0, 12 + (8 * thrustLevel), 6 * thrustLevel, 0, Math.PI * 2);
                        ctx.fillStyle = '#fff';
                        ctx.fill();
                        ctx.globalAlpha = 1.0;
                    }
                }
                
            } else if (player.ship === 'cruiser' || player.ship === 'heavy') {
                // Enhanced heavy cruiser design
                // Main body
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -28); // Nose tip
                ctx.lineTo(-8, -20); // Left front angled edge
                ctx.lineTo(-12, -5); // Left mid-hull
                ctx.lineTo(-25, 0); // Left wing tip
                ctx.lineTo(-25, 5); // Left wing corner
                ctx.lineTo(-18, 8); // Left wing inner
                ctx.lineTo(-10, 18); // Left engine mount
                ctx.lineTo(0, 15); // Bottom center
                ctx.lineTo(10, 18); // Right engine mount
                ctx.lineTo(18, 8); // Right wing inner 
                ctx.lineTo(25, 5); // Right wing corner
                ctx.lineTo(25, 0); // Right wing tip
                ctx.lineTo(12, -5); // Right mid-hull
                ctx.lineTo(8, -20); // Right front angled edge
                ctx.closePath();
                ctx.fill();
                
                // Heavy armor plating
                ctx.strokeStyle = 'rgba(60, 60, 60, 0.8)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-10, -15);
                ctx.lineTo(-15, -5);
                ctx.moveTo(10, -15);
                ctx.lineTo(15, -5);
                ctx.moveTo(-10, -5);
                ctx.lineTo(10, -5);
                ctx.stroke();
                
                // Cockpit
                ctx.fillStyle = 'rgba(150, 200, 255, 0.8)';
                ctx.beginPath();
                ctx.ellipse(0, -12, 5, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Side weapon mounts
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.rect(-22, -2, 8, 4);
                ctx.rect(14, -2, 8, 4);
                ctx.fill();
                
                // Weapon barrels
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.rect(-20, -1, 12, 2);
                ctx.rect(8, -1, 12, 2);
                ctx.fill();
                
                // Dynamic dual engine flames based on thrust level
                if (thrustLevel > 0) {
                    ctx.fillStyle = engineColor;
                    
                    // Left engine
                    ctx.beginPath();
                    ctx.moveTo(-10, 18);
                    ctx.lineTo(-14, 18 + (10 * thrustLevel));
                    ctx.lineTo(-8, 18 + (8 * thrustLevel));
                    ctx.closePath();
                    ctx.fill();
                    
                    // Right engine
                    ctx.beginPath();
                    ctx.moveTo(10, 18);
                    ctx.lineTo(14, 18 + (10 * thrustLevel)); 
                    ctx.lineTo(8, 18 + (8 * thrustLevel));
                    ctx.closePath();
                    ctx.fill();
                    
                    // Engine glow effects - intensity increases with thrust
                    const engineGlowSize = 6 + (8 * thrustLevel);
                    
                    // Left engine glow
                    const leftEngineGlow = ctx.createRadialGradient(-10, 22, 0, -10, 22, engineGlowSize);
                    leftEngineGlow.addColorStop(0, engineColor);
                    leftEngineGlow.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = leftEngineGlow;
                    ctx.fillRect(-16, 20, 12, 6 + (10 * thrustLevel));
                    
                    // Right engine glow
                    const rightEngineGlow = ctx.createRadialGradient(10, 22, 0, 10, 22, engineGlowSize);
                    rightEngineGlow.addColorStop(0, engineColor);
                    rightEngineGlow.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = rightEngineGlow;
                    ctx.fillRect(4, 20, 12, 6 + (10 * thrustLevel));
                    
                    // Add animated flickering for more realistic flame
                    if (thrustLevel > 0.6) {
                        // Left engine flicker
                        const leftFlickerIntensity = (Math.random() * 0.3) * thrustLevel;
                        ctx.globalAlpha = 0.5 * leftFlickerIntensity;
                        ctx.beginPath();
                        ctx.arc(-10, 22 + (6 * thrustLevel), 4 * thrustLevel, 0, Math.PI * 2);
                        ctx.fillStyle = '#fff';
                        ctx.fill();
                        
                        // Right engine flicker
                        const rightFlickerIntensity = (Math.random() * 0.3) * thrustLevel;
                        ctx.globalAlpha = 0.5 * rightFlickerIntensity;
                        ctx.beginPath();
                        ctx.arc(10, 22 + (6 * thrustLevel), 4 * thrustLevel, 0, Math.PI * 2);
                        ctx.fillStyle = '#fff';
                        ctx.fill();
                        ctx.globalAlpha = 1.0;
                    }
                }
                
            } else if (player.ship === 'stealth') {
                // Stealth ship design - sleek and angular
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -20); // Nose tip
                ctx.lineTo(-3, -15); // Narrow front section
                ctx.lineTo(-15, -5); // Left wing edge
                ctx.lineTo(-8, 5); // Left mid-wing
                ctx.lineTo(-12, 15); // Left wing extension
                ctx.lineTo(-5, 12); // Left engine
                ctx.lineTo(0, 10); // Center
                ctx.lineTo(5, 12); // Right engine
                ctx.lineTo(12, 15); // Right wing extension
                ctx.lineTo(8, 5); // Right mid-wing
                ctx.lineTo(15, -5); // Right wing edge
                ctx.lineTo(3, -15); // Narrow front section
                ctx.closePath();
                ctx.fill();
                
                // Stealth panels with subtle gradient
                const stealthGradient = ctx.createLinearGradient(0, -15, 0, 15);
                stealthGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
                stealthGradient.addColorStop(0.5, 'rgba(40, 40, 50, 0.5)');
                stealthGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
                
                ctx.fillStyle = stealthGradient;
                ctx.beginPath();
                ctx.moveTo(-10, -3);
                ctx.lineTo(-6, 0);
                ctx.lineTo(-8, 8);
                ctx.lineTo(-12, 12);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(10, -3);
                ctx.lineTo(6, 0);
                ctx.lineTo(8, 8);
                ctx.lineTo(12, 12);
                ctx.closePath();
                ctx.fill();
                
                // Cockpit - tinted dark
                ctx.fillStyle = 'rgba(30, 50, 80, 0.8)';
                ctx.beginPath();
                ctx.ellipse(0, -8, 2, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Stealth engines have subtle glow that intensifies with thrust
                if (thrustLevel > 0) {
                    // More transparent for stealth ship
                    ctx.globalAlpha = 0.3 + (0.4 * thrustLevel);
                    ctx.fillStyle = engineColor;
                    
                    // Engine flame shape
                    ctx.beginPath();
                    ctx.moveTo(-5, 12);
                    ctx.lineTo(-3, 12 + (8 * thrustLevel));
                    ctx.lineTo(0, 12 + (4 * thrustLevel));
                    ctx.lineTo(3, 12 + (8 * thrustLevel));
                    ctx.lineTo(5, 12);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Add subtle pulsing effect unique to stealth engines
                    const pulseIntensity = (Math.sin(Date.now() / 200) * 0.2 + 0.8) * thrustLevel;
                    ctx.globalAlpha = 0.2 * pulseIntensity;
                    ctx.beginPath();
                    ctx.arc(0, 14 + (4 * thrustLevel), 4 * thrustLevel, 0, Math.PI * 2);
                    ctx.fillStyle = engineColor;
                    ctx.fill();
                    
                    ctx.globalAlpha = 1.0;
                }
                
            } else {
                // Default scout ship design - modernized
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -15); // front nose
                ctx.lineTo(-4, -10); // left nose edge
                ctx.lineTo(-12, 0); // left wing tip
                ctx.lineTo(-8, 8); // left rear corner
                ctx.lineTo(-5, 5); // left engine mount
                ctx.lineTo(0, 7); // center bottom
                ctx.lineTo(5, 5); // right engine mount
                ctx.lineTo(8, 8); // right rear corner
                ctx.lineTo(12, 0); // right wing tip
                ctx.lineTo(4, -10); // right nose edge
                ctx.closePath();
                ctx.fill();
                
                // Cockpit canopy
                ctx.fillStyle = 'rgba(130, 200, 255, 0.7)';
                ctx.beginPath();
                ctx.ellipse(0, -5, 3, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Detail lines
                ctx.strokeStyle = 'rgba(50, 50, 50, 0.7)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-8, 0);
                ctx.lineTo(-4, -8);
                ctx.moveTo(8, 0);
                ctx.lineTo(4, -8);
                ctx.stroke();
                
                // Dynamic engine flame based on thrust level
                if (thrustLevel > 0) {
                    ctx.fillStyle = engineColor;
                    ctx.beginPath();
                    ctx.moveTo(-5, 5);
                    ctx.lineTo(-3, 5 + (9 * thrustLevel)); // Left flame point
                    ctx.lineTo(0, 5 + (5 * thrustLevel)); // Center flame
                    ctx.lineTo(3, 5 + (9 * thrustLevel)); // Right flame point
                    ctx.lineTo(5, 5);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Add engine glow effect - size based on thrust level
                    const engineGlowSize = 4 + (7 * thrustLevel);
                    const engineGradient = ctx.createRadialGradient(0, 9, 0, 0, 9, engineGlowSize);
                    engineGradient.addColorStop(0, engineColor);
                    engineGradient.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = engineGradient;
                    ctx.beginPath();
                    ctx.ellipse(0, 9 + (3 * thrustLevel), 5 * thrustLevel, 6 * thrustLevel, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add subtle flame variations when at high thrust
                    if (thrustLevel > 0.5) {
                        const flicker = Math.random() * 0.3 * thrustLevel;
                        ctx.globalAlpha = 0.3 * flicker;
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(0, 9 + (3 * thrustLevel), 2 * thrustLevel, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1.0;
                    }
                }
            }
            
            ctx.restore();
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

    // Create local explosion effect for player death
    createLocalExplosionEffect(x, y, rotation) {
        if (!this.game || !this.game.world) return;
        
        const playerX = x;
        const playerY = y;
        const playerRotation = rotation;
        
        // Default player ship color - could be customized later
        const playerColor = '#33f';
        
        // Play explosion sound
        if (this.game.soundManager) {
            this.game.soundManager.play('explosion', {
                volume: 0.9,
                position: { x: playerX, y: playerY }
            });
        }
        
        // Create main explosion at the center
        this.game.world.createExplosion(
            playerX,
            playerY,
            35, // Size of explosion
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
            '#66f', // Slightly lighter color for cockpit
            [(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40], // Small random velocity
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
        
        // Create smaller debris pieces
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 120;
            const size = 1 + Math.random() * 3;
            
            // Create debris with mixed colors
            const colors = [playerColor, '#66f', '#f66', '#999'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const debris = {
                x: playerX + (Math.random() - 0.5) * 10, // Slight random offset
                y: playerY + (Math.random() - 0.5) * 10,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: size,
                color: color,
                life: 1.0,
                maxLife: 1.0 + Math.random() * 2.0, // Longer lifetime for some pieces
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
        
        // Add smoke/fire trails to pieces
        const createSmokeTrails = () => {
            // For random pieces in the world that are ship pieces
            this.game.world.particles
                .filter(p => p.isShipPiece && Math.random() > 0.5)
                .forEach(piece => {
                    // Create smoke at the position of each piece
                    this.game.world.createSmokeParticle(
                        piece.x,
                        piece.y,
                        3 + Math.random() * 3,
                        0.5 + Math.random() * 0.5,
                        piece.velocityX * 0.1,
                        piece.velocityY * 0.1
                    );
                });
        };
        
        // Create smoke trails at intervals
        const smokeInterval = setInterval(() => {
            // Stop if game state has changed
            if (this.game.gameState !== 'dying') {
                clearInterval(smokeInterval);
                return;
            }
            
            createSmokeTrails();
        }, 60); // Every 60ms
        
        // Clear interval after a few seconds
        setTimeout(() => {
            clearInterval(smokeInterval);
        }, 2000);
        
        // Create secondary explosions with delays
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (!this.game || !this.game.world || this.game.gameState !== 'dying') return;
                
                const explosionX = playerX + (Math.random() - 0.5) * 30;
                const explosionY = playerY + (Math.random() - 0.5) * 30;
                
                this.game.world.createExplosion(
                    explosionX,
                    explosionY,
                    10 + Math.random() * 15,
                    null // No additional sounds for secondary explosions
                );
            }, 100 + Math.random() * 500); // Stagger between 100-600ms
        }
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

    sendPositionUpdate() {
        if (this.connected && this.game.player) {
            // Calculate the current thrust level based on player velocity
            const currentSpeed = Math.sqrt(this.game.player.velocity.x ** 2 + this.game.player.velocity.y ** 2);
            const thrustLevel = Math.min(1.0, currentSpeed / (this.game.player.maxSpeed * 0.7));
            
            this.socket.emit('position', {
                x: this.game.player.x,
                y: this.game.player.y,
                rotation: this.game.player.rotation,
                ship: this.game.player.currentShip,
                shipColor: this.game.player.shipColor,
                engineColor: this.game.player.engineColor,
                thrustLevel: this.game.player.thrustLevel || thrustLevel, // Send the actual thrust level if available
                health: this.game.player.health,
                maxHealth: this.game.player.maxHealth,
                shield: this.game.player.shield,
                maxShield: this.game.player.shieldCapacity,
                destroyed: this.game.player.health <= 0
            });
        }
    }
}