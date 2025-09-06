// filepath: d:\Code_Playground\Games\SuperSpace\js\game.js
// Import all necessary game components from their respective modules
import { Player } from './player.js';
import { World } from './world.js';
import { InputHandler } from './input.js';
import { UI } from './ui.js';
import { SoundManager } from './sound.js';
import { ShopSystem } from './shop.js';
import { MultiplayerManager } from './multiplayer.js';

// Main Game class that coordinates all game systems and components
class Game {
    constructor() {
        // Here we get the canvas element and its context for drawing
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Here we initialize all major game systems
        this.world = new World();  // Manages game world, asteroids, powerups, etc.
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);  // Creates player ship at center
        this.input = new InputHandler();  // Handles keyboard and mouse input
        this.ui = new UI();  // Manages UI elements on screen
        this.soundManager = new SoundManager();  // Handles all game audio
        this.shop = new ShopSystem(this.player);  // In-game shop for upgrades
        this.lastTime = 0;  // Used for calculating delta time between frames
        this.gameState = 'menu';  // Game can be in 'menu', 'playing', 'dying', or 'gameover' state
        this.thrusterSoundActive = false;  // Tracks if thruster sound is currently playing
        
        // Initialize multiplayer system (but don't connect yet)
        this.multiplayer = new MultiplayerManager(this);
        this.multiplayerConnected = false;

        // Store a reference to the UI for other classes to access
        window.gameUI = this.ui;

        // Here we make the canvas fullscreen and respond to window resizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Set up event listeners for menu buttons
        document.getElementById('play-btn').addEventListener('click', () => this.startGame());
        // Use the new overlay logic for options
        document.getElementById('options-btn').addEventListener('click', () => {
            if (this.ui && this.ui.showOptionsOverlay) {
                this.ui.showOptionsOverlay();
            }
        });
        
        // Here we create UI controls for mute, music, and shop
        this.createMuteButton();
        this.createMusicButton();
        this.createShopButton();
        
        // Set up keyboard shortcuts
        this.setupHotkeys();
        
        // Initialize player count display by connecting to server without joining game
        this.initializePlayerCount();

        // GUARANTEED EXPLOSION SYSTEM
        // This uses a DOM-based approach as fallback to ensure explosions always appear
        this.setupGuaranteedExplosionSystem();
    }
    
    // Connect to the server to get player count without joining the game
    initializePlayerCount() {
        const serverUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000'
            : 'https://superspace-server.onrender.com';
            
        console.log('Initializing player count, connecting to:', serverUrl);
        
        // Load Socket.IO client only if not already loaded
        if (typeof io === 'undefined') {
            console.log('Socket.IO not loaded, loading script...');
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
            script.integrity = '';  // Removed integrity check which can cause issues
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                console.log('Socket.IO script loaded successfully');
                this.createPlayerCountConnection(serverUrl);
            };
            script.onerror = (error) => {
                console.error('Error loading Socket.IO script:', error);
            };
            document.head.appendChild(script);
        } else {
            console.log('Socket.IO already loaded, creating connection');
            this.createPlayerCountConnection(serverUrl);
        }
    }
    
    // Create a connection specifically for player count
    createPlayerCountConnection(serverUrl) {
        try {
            console.log('Creating temporary socket connection for player count');
            const tempSocket = io(serverUrl);
            
            // Setup event handlers
            tempSocket.on('connect', () => {
                console.log('Player count socket connected with ID:', tempSocket.id);
                // Request player count once connected
                tempSocket.emit('getPlayerCount');
            });
            
            tempSocket.on('connect_error', (error) => {
                console.error('Player count socket connection error:', error);
            });
            
            // Listen for player count updates
            tempSocket.on('playerCountUpdate', (count) => {
                console.log('Received player count update:', count);
                const playerCountElement = document.getElementById('player-count');
                if (playerCountElement) {
                    playerCountElement.textContent = count;
                    console.log('Player count element updated to:', count);
                } else {
                    console.warn('Player count element not found in DOM');
                }
            });
            
            // Store the socket so we can disconnect it later when actual game starts
            this.tempSocket = tempSocket;
            
            // If we have a real connection but no player count after 2 seconds,
            // try requesting it again (sometimes first request gets lost)
            setTimeout(() => {
                const playerCountElement = document.getElementById('player-count');
                if (playerCountElement && playerCountElement.textContent === '0' && tempSocket.connected) {
                    console.log('Re-requesting player count...');
                    tempSocket.emit('getPlayerCount');
                }
            }, 2000);
        } catch (error) {
            console.error('Error creating player count connection:', error);
        }
    }

    // Here we adjust canvas size to match window size for responsive gameplay
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Here we create a mute button to toggle game sound on/off
    createMuteButton() {
        const muteBtn = document.createElement('button');
        muteBtn.textContent = '🔊';  // Default sound on icon
        muteBtn.id = 'mute-btn';
        // Here we style the button with CSS
        muteBtn.style.position = 'absolute';
        muteBtn.style.top = '26px';
        muteBtn.style.right = '15px';
        muteBtn.style.zIndex = '1002'; 
        muteBtn.style.background = 'rgba(0, 0, 0, 0.5)';
        muteBtn.style.color = 'white';
        muteBtn.style.border = '1px solid #33f';
        muteBtn.style.borderRadius = '3px';
        muteBtn.style.padding = '4px 8px';
        muteBtn.style.cursor = 'pointer';
        muteBtn.style.fontSize = '14px';
        // Here we set up the click handler to toggle mute state
        muteBtn.onclick = () => {
            const isMuted = this.soundManager.toggleMute();
            // Update button icon based on mute state
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
        };
        // Add the button to the document body
        document.body.appendChild(muteBtn);
    }
    
    // Here we create a music toggle button to control ambient music
    createMusicButton() {
        const musicBtn = document.createElement('button');
        musicBtn.textContent = '🎵';
        musicBtn.id = 'music-btn';
        
        // Style the music button
        musicBtn.style.position = 'absolute';
        musicBtn.style.top = '26px';
        musicBtn.style.right = '65px'; // Position directly left of mute button
        musicBtn.style.zIndex = '1002';
        musicBtn.style.background = 'rgba(0, 0, 50, 0.7)';
        musicBtn.style.color = 'white';
        musicBtn.style.border = '1px solid #33f';
        musicBtn.style.borderRadius = '5px';
        musicBtn.style.padding = '5px 10px';
        musicBtn.style.cursor = 'pointer';
        musicBtn.style.fontSize = '16px';
        
        // Set up click handler to toggle music
        musicBtn.onclick = () => {
            if (this.soundManager.ambientMusic && this.soundManager.ambientMusic.active) {
                this.soundManager.stopAmbientMusic();
                musicBtn.textContent = '🔇♪';
                musicBtn.style.opacity = '0.5';
                console.log('Music stopped by user');
            } else {
                this.soundManager.startAmbientMusic();
                musicBtn.textContent = '🎵';
                musicBtn.style.opacity = '1';
                console.log('Music started by user');
            }
        };
        
        // Add the button to the document body
        document.body.appendChild(musicBtn);
    }
    
    // Here we create a shop button to access the in-game store
    createShopButton() {
        const shopBtn = document.createElement('button');
        shopBtn.textContent = '🛒 Shop';
        shopBtn.id = 'shop-btn';
        // Style the shop button similar to mute button
        shopBtn.style.position = 'absolute';
        shopBtn.style.top = '71px'; // Position below the top row (moved down from 60px)
        shopBtn.style.right = '15px';
        shopBtn.style.zIndex = '1002';
        shopBtn.style.background = 'rgba(0, 0, 50, 0.7)';
        shopBtn.style.color = 'white';
        shopBtn.style.border = '1px solid #33f';
        shopBtn.style.borderRadius = '5px';
        shopBtn.style.padding = '6px 12px';
        shopBtn.style.cursor = 'pointer';
        shopBtn.style.display = 'none';  // Initially hidden until game starts
        // Set up click handler to toggle shop visibility
        shopBtn.onclick = () => this.toggleShop();
        document.body.appendChild(shopBtn);
    }
    
    // Here we toggle the shop interface on/off
    toggleShop() {
        // Only allow shop access when playing
        if (this.gameState === 'playing') {
            this.shop.toggleShop();
        }
    }
    
    // Here we set up keyboard shortcuts for game functions
    setupHotkeys() {
        // Track key sequence for cheat codes
        let keySequence = [];
        const moneyCheatCode = ['KeyM', 'KeyO', 'KeyN', 'KeyE', 'KeyY']; // "MONEY" cheat code
        
        window.addEventListener('keydown', e => {
            // Shop hotkey (B key)
            if (e.code === 'KeyB' && this.gameState === 'playing') {
                this.toggleShop();
            }
            
            // Cheat code system
            keySequence.push(e.code);
            // Only keep the most recent X keys (X being the length of our longest cheat code)
            if (keySequence.length > moneyCheatCode.length) {
                keySequence.shift();
            }
            
            // Check for money cheat code (M-O-N-E-Y)
            if (this.gameState === 'playing' && arrayEquals(keySequence, moneyCheatCode)) {
                // Give the player 100,000 credits
                if (this.player) {
                    this.player.credits += 100000;
                    localStorage.setItem('playerCredits', this.player.credits.toString());
                    
                    // Show notification
                    const message = document.createElement('div');
                    message.textContent = '💰 CHEAT ACTIVATED: +100,000 CREDITS!';
                    message.style.position = 'absolute';
                    message.style.top = '30%';
                    message.style.left = '50%';
                    message.style.transform = 'translate(-50%, -50%)';
                    message.style.background = 'rgba(0, 150, 0, 0.8)';
                    message.style.color = 'white';
                    message.style.padding = '15px 30px';
                    message.style.borderRadius = '8px';
                    message.style.fontSize = '24px';
                    message.style.fontWeight = 'bold';
                    message.style.zIndex = '1000';
                    message.style.boxShadow = '0 0 20px gold';
                    message.style.textShadow = '2px 2px 4px #000';
                    document.body.appendChild(message);
                    
                    // Play money sound
                    if (this.soundManager) {
                        this.soundManager.play('powerup', { volume: 1.0 });
                    }
                    
                    // Remove the message after a delay
                    setTimeout(() => {
                        document.body.removeChild(message);
                    }, 3000);
                    
                    // Reset key sequence to prevent multiple activations
                    keySequence = [];
                }
            }
        });
        
        // Helper function to compare arrays
        function arrayEquals(a, b) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }
    }

    // Here we transition from menu to active gameplay
    startGame() {
        // If there's a temporary socket for player count, disconnect it
        if (this.tempSocket) {
            console.log('Disconnecting temporary player count socket');
            this.tempSocket.disconnect();
            this.tempSocket = null;
        }
        
        // Resume audio context (needed because of browser autoplay policy)
        this.soundManager.resumeAudio();
        
        // Start ambient music
        this.soundManager.startAmbientMusic();
        
        this.gameState = 'playing';
        document.getElementById('menu').classList.add('hidden');
        
        // Show shop button when game starts
        document.getElementById('shop-btn').style.display = 'block';
        
        // Show gameplay UI elements
        this.ui.setGameplayUIVisibility(true);
        
        // Initialize the health bar with the player's current health
        this.ui.updateHealthBar(this.player.health, this.player.maxHealth);

        // Connect to the multiplayer server when the game starts
        if (!this.multiplayerConnected) {
            const serverUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000'
                : 'https://superspace-server.onrender.com'; // We'll deploy to Render
            
            this.multiplayer.connect(serverUrl)
                .then(() => {
                    console.log('Connected to multiplayer server at', serverUrl);
                    this.multiplayerConnected = true;
                })
                .catch(error => {
                    console.error('Failed to connect to multiplayer server:', error);
                });
        }
    }

    // Create and show the options menu
    showOptions() {
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
        
        // Create options dialog
        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#222';
        dialog.style.color = 'white';
        dialog.style.borderRadius = '10px';
        dialog.style.padding = '20px';
        dialog.style.width = '400px';
        dialog.style.maxWidth = '90%';
        dialog.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        dialog.style.border = '2px solid #444';
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = '⚙️ Options';
        title.style.margin = '0 0 20px 0';
        title.style.textAlign = 'center';
        title.style.color = '#4af';
        title.style.textShadow = '0 0 5px rgba(64, 170, 255, 0.7)';
        dialog.appendChild(title);
        
        // Create options list
        const optionsList = document.createElement('div');
        optionsList.style.marginBottom = '20px';
        
        // Add sound option
        const soundOption = document.createElement('div');
        soundOption.style.display = 'flex';
        soundOption.style.justifyContent = 'space-between';
        soundOption.style.alignItems = 'center';
        soundOption.style.marginBottom = '10px';
        soundOption.style.padding = '8px';
        soundOption.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        soundOption.style.borderRadius = '5px';
        
        const soundLabel = document.createElement('div');
        soundLabel.textContent = '🔊 Sound';
        soundLabel.style.fontWeight = 'bold';
        
        const soundToggle = document.createElement('div');
        
        const soundButton = document.createElement('button');
        soundButton.textContent = this.soundManager.muted ? 'OFF' : 'ON';
        soundButton.style.padding = '5px 10px';
        soundButton.style.backgroundColor = this.soundManager.muted ? '#555' : '#4af';
        soundButton.style.color = 'white';
        soundButton.style.border = 'none';
        soundButton.style.borderRadius = '3px';
        soundButton.style.cursor = 'pointer';
        soundButton.onclick = () => {
            const isMuted = this.soundManager.toggleMute();
            soundButton.textContent = isMuted ? 'OFF' : 'ON';
            soundButton.style.backgroundColor = isMuted ? '#555' : '#4af';
            
            // Update mute button outside options
            const muteBtn = document.getElementById('mute-btn');
            if (muteBtn) {
                muteBtn.textContent = isMuted ? '🔇' : '🔊';
            }
        };
        
        soundToggle.appendChild(soundButton);
        soundOption.appendChild(soundLabel);
        soundOption.appendChild(soundToggle);
        optionsList.appendChild(soundOption);
        
        // Add rename pilot option
        const renameOption = document.createElement('div');
        renameOption.style.display = 'flex';
        renameOption.style.justifyContent = 'space-between';
        renameOption.style.alignItems = 'center';
        renameOption.style.marginBottom = '10px';
        renameOption.style.padding = '8px';
        renameOption.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        renameOption.style.borderRadius = '5px';
        
        const renameLabel = document.createElement('div');
        renameLabel.textContent = '👨‍✈️ Pilot Name';
        renameLabel.style.fontWeight = 'bold';
        
        const renameButton = document.createElement('button');
        renameButton.textContent = 'Rename';
        renameButton.style.padding = '5px 10px';
        renameButton.style.backgroundColor = '#4af';
        renameButton.style.color = 'white';
        renameButton.style.border = 'none';
        renameButton.style.borderRadius = '3px';
        renameButton.style.cursor = 'pointer';
        renameButton.onclick = () => {
            // Close options dialog first
            document.body.removeChild(backdrop);
            
            // Show rename dialog
            if (this.multiplayer) {
                this.multiplayer.showChangeNameUI();
            }
        };
        
        renameOption.appendChild(renameLabel);
        renameOption.appendChild(renameButton);
        optionsList.appendChild(renameOption);
        
        // Add current pilot name display
        const currentNameInfo = document.createElement('div');
        currentNameInfo.style.fontSize = '14px';
        currentNameInfo.style.color = '#aaa';
        currentNameInfo.style.marginTop = '-5px';
        currentNameInfo.style.marginBottom = '10px';
        currentNameInfo.style.marginLeft = '8px';
        currentNameInfo.textContent = `Current name: ${this.multiplayer ? this.multiplayer.playerName : 'Unknown'}`;
        optionsList.appendChild(currentNameInfo);
        
        // Add game info option
        const gameInfoOption = document.createElement('div');
        gameInfoOption.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        gameInfoOption.style.borderRadius = '5px';
        gameInfoOption.style.padding = '8px';
        gameInfoOption.style.marginTop = '20px';
        
        const gameInfoTitle = document.createElement('div');
        gameInfoTitle.textContent = 'ℹ️ Game Info';
        gameInfoTitle.style.fontWeight = 'bold';
        gameInfoTitle.style.marginBottom = '8px';
        
        const gameInfoText = document.createElement('div');
        gameInfoText.style.fontSize = '13px';
        gameInfoText.style.color = '#bbb';
        gameInfoText.style.lineHeight = '1.4';
        gameInfoText.innerHTML = 'Ship customization is available in the Shop under the Appearance tab.<br><br>Press B or click the Shop button to open the shop.';
        
        gameInfoOption.appendChild(gameInfoTitle);
        gameInfoOption.appendChild(gameInfoText);
        optionsList.appendChild(gameInfoOption);
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.display = 'block';
        closeButton.style.margin = '0 auto';
        closeButton.style.padding = '8px 20px';
        closeButton.style.backgroundColor = '#555';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => {
            document.body.removeChild(backdrop);
        };
        
        dialog.appendChild(optionsList);
        dialog.appendChild(closeButton);
        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);
        
        // Add keyboard shortcut to close dialog with Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && document.body.contains(backdrop)) {
                document.body.removeChild(backdrop);
                window.removeEventListener('keydown', escapeHandler);
            }
        };
        window.addEventListener('keydown', escapeHandler);
    }

    // Here we update all game components each frame using delta time
    update(deltaTime) {
        if (this.gameState === 'playing') {
            // Skip game updates if shop is open
            if (this.shop.shopOpen) return;
            
            // Here we handle thruster sound based on player input and afterburner
            const isThrusting = this.input.keys && Array.isArray(this.input.keys) && this.input.keys.includes('ArrowUp');
            const isAfterburning = this.player.afterburnerActive;
            
            if (isThrusting) {
                if (!this.thrusterSoundActive) {
                    // Start thruster sound when player starts accelerating
                    const volume = isAfterburning ? 0.6 : 0.3;
                    const playbackRate = isAfterburning ? 1.8 : 1.0;
                    this.soundManager.startThrusterSound({ 
                        volume: volume,
                        playbackRate: playbackRate 
                    });
                    this.thrusterSoundActive = true;
                } else if (isAfterburning) {
                    // Update thruster sound for afterburner if already playing
                    this.soundManager.updateThrusterSound({ 
                        volume: 0.6,
                        playbackRate: 1.8 
                    });
                } else {
                    // Update thruster sound back to normal if afterburner deactivated
                    this.soundManager.updateThrusterSound({ 
                        volume: 0.3,
                        playbackRate: 1.0 
                    });
                }
            } else if (this.thrusterSoundActive) {
                // Stop thruster sound when player stops accelerating
                this.soundManager.stopThrusterSound();
                this.thrusterSoundActive = false;
            }
            
            // Here we update player position, rotation, and actions
            // Pass the entire input object instead of just keys
            this.player.update(deltaTime, this.input, this.soundManager);
            
            // Here we update world elements like asteroids and powerups
            this.world.update(deltaTime, this.player, this.soundManager);
            
            // Update multiplayer status and send player position to server
            if (this.multiplayer && this.multiplayer.connected) {
                this.multiplayer.update(deltaTime);
            }
            
            // Here we update UI elements with current game state
            document.getElementById('score').textContent = this.player.score;
            // Use the new UI update methods for health, shields, and energy
            this.ui.updateHealthBar(this.player.health, this.player.maxHealth);
            
            // Check if credits element exists (it might not be in your HTML yet)
            const creditsElement = document.getElementById('credits');
            if (creditsElement) {
                creditsElement.textContent = this.player.credits;
            }
            
            // Here we dynamically update shield and energy UI if player has these capabilities
            if (this.player.shieldCapacity > 0) {
                const shieldElement = document.getElementById('shield');
                if (shieldElement) {
                    // Use the shield bar update method
                    this.ui.updateShieldBar(this.player.shield, this.player.shieldCapacity);
                } else {
                    // Add shield display if player has gained shield capability
                    this.ui.addShieldDisplay();
                    // Initialize the shield bar
                    setTimeout(() => this.ui.updateShieldBar(this.player.shield, this.player.shieldCapacity), 50);
                }
            }
            
            if (this.player.maxEnergy > 0) {
                const energyElement = document.getElementById('energy');
                if (energyElement) {
                    // Use the energy bar update method
                    this.ui.updateEnergyBar(this.player.energy, this.player.maxEnergy);
                } else {
                    // Add energy display if player has gained energy capability
                    this.ui.addEnergyDisplay();
                    // Initialize the energy bar
                    setTimeout(() => this.ui.updateEnergyBar(this.player.energy, this.player.maxEnergy), 50);
                }
            }
            
            // Check for player death
            if (this.player.health <= 0) {
                this.gameOver();
            }
        } else if (this.gameState === 'dying') {
            // Update world particles for ship destruction effect
            this.world.updateParticles(deltaTime);
        }
    }

    // Here we draw all game elements to the canvas
    render() {
        // Clear canvas with black background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Always render the stars and asteroids in the background regardless of game state
        this.ctx.save();
        // Center the view
        this.ctx.translate(
            this.canvas.width / 2 - this.player.x, 
            this.canvas.height / 2 - this.player.y
        );
        
        // Render the world (stars and asteroids)
        this.world.render(this.ctx, this.player);
        
        // Only render the player and projectiles when actively playing
        if (this.gameState === 'playing') {
            this.player.render(this.ctx);
            
            // Render other players from multiplayer
            if (this.multiplayer && this.multiplayer.connected) {
                this.multiplayer.render(this.ctx);
            }
        }
        
        // Restore context to original state
        this.ctx.restore();
        
        // Only render minimap when playing
        if (this.gameState === 'playing') {
            this.ui.renderMinimap(this.ctx, this.player, this.world);
        }
    }

    // Here we handle the game over state
    gameOver() {
        // Don't show game over screen immediately - allow time for explosion animation
        // Mark the game state as dying but not yet fully game over
        this.gameState = 'dying';
        
        // Hide the player's ship - it will be replaced by explosion effects
        this.player.visible = false;
        
        // Create ship destruction effect - breaking into pieces
        this.createShipDestructionEffect();
        
        // Show full-screen explosion effect
        this.showFullScreenExplosion();
        
        // Only show game over screen after a delay to see the explosion
        setTimeout(() => {
            this.gameState = 'gameover';
            
            // Here we create game over screen UI
            const gameOverScreen = document.createElement('div');
            gameOverScreen.id = 'gameover';
            // Style the game over screen
            gameOverScreen.style.position = 'absolute';
            gameOverScreen.style.top = '50%';
            gameOverScreen.style.left = '50%';
            gameOverScreen.style.transform = 'translate(-50%, -50%)';
            gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            gameOverScreen.style.color = 'white';
            gameOverScreen.style.padding = '30px';
            gameOverScreen.style.borderRadius = '10px';
            gameOverScreen.style.textAlign = 'center';
            gameOverScreen.style.zIndex = '200';
            
            // Create game over title
            const gameOverTitle = document.createElement('h2');
            gameOverTitle.textContent = 'Game Over';
            gameOverTitle.style.color = '#f33';
            
            // Display final score
            const scoreText = document.createElement('p');
            scoreText.textContent = `Final Score: ${this.player.score}`;
            
            // Create restart button
            const restartButton = document.createElement('button');
            restartButton.textContent = 'Restart Game';
            restartButton.style.padding = '10px 20px';
            restartButton.style.marginTop = '20px';
            restartButton.style.background = '#33f';
            restartButton.style.color = 'white';
            restartButton.style.border = 'none';
            restartButton.style.borderRadius = '5px';
            restartButton.style.cursor = 'pointer';
            restartButton.onclick = () => this.restartGame();
            
            // Assemble and add game over screen to document
            gameOverScreen.appendChild(gameOverTitle);
            gameOverScreen.appendChild(scoreText);
            gameOverScreen.appendChild(restartButton);
            
            document.body.appendChild(gameOverScreen);
            
            // Hide shop button
            document.getElementById('shop-btn').style.display = 'none';
        }, 3000); // 3 second delay to see explosion and ship parts
    }
    
    // Create the effect of ship breaking into pieces
    createShipDestructionEffect() {
        if (!this.world) return;
        
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRotation = this.player.rotation;
        const playerColor = '#33f'; // Player ship color
        
        // Play explosion sound
        if (this.soundManager) {
            this.soundManager.play('explosion', {
                volume: 0.8,
                position: { x: playerX, y: playerY }
            });
        }
        
        // Create main explosion at the center
        this.world.createExplosion(
            playerX,
            playerY,
            35, // Size of explosion
            this.soundManager
        );
        
        // Add intense camera shake
        if (this.multiplayer) {
            this.multiplayer.addCameraShake(25);
        }
        
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
            
            this.world.particles.push(debris);
        }
        
        // Add smoke/fire trail to some pieces
        const createSmokeTrail = (piece) => {
            const interval = setInterval(() => {
                // Check if the piece still exists and game is still in dying state
                if (!piece || this.gameState !== 'dying') {
                    clearInterval(interval);
                    return;
                }
                
                // Add smoke particle at the piece's position
                this.world.createSmokeParticle(
                    piece.x, 
                    piece.y,
                    3 + Math.random() * 3,
                    0.5 + Math.random() * 0.5,
                    piece.velocityX * 0.1, 
                    piece.velocityY * 0.1
                );
            }, 60); // Create smoke every 60ms
            
            // Auto-clear after a few seconds
            setTimeout(() => clearInterval(interval), 2000);
        };
        
        // Add smoke trails to some of the larger pieces
        this.world.particles
            .filter(p => p.isShipPiece && Math.random() > 0.5) // Only some pieces get trails
            .forEach(piece => createSmokeTrail(piece));
    }
    
    // Helper to create a ship piece with specific properties
    createShipPiece(x, y, rotation, offset, size, color, velocity, rotationSpeed) {
        if (!this.world) return null;
        
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
            // Slightly higher drag for ship pieces compared to small debris
            drag: 0.98,
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
        this.world.particles.push(piece);
        return piece;
    }
    
    // Override die() to actually show the explosion
    forcePlayerExplosion() {
        // Force an explosion at the player's position - this is a direct workaround
        // that doesn't depend on any timing in the player class
        
        console.log("FORCING PLAYER EXPLOSION!");
        
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // Play explosion sound immediately with max volume
        this.soundManager.play('explosion', {
            volume: 1.0,
            position: { x: playerX, y: playerY }
        });
        
        // Create a massive explosion for visibility
        if (this.world) {
            for (let i = 0; i < 3; i++) { // Create multiple layers of explosions
                this.world.createExplosion(
                    playerX + (Math.random() - 0.5) * 10, 
                    playerY + (Math.random() - 0.5) * 10, 
                    45 + i*10,  // Giant explosion
                    null  // No sound, we already played it
                );
            }
            
            // Create many small secondary explosions
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    const offsetX = (Math.random() - 0.5) * 50;
                    const offsetY = (Math.random() - 0.5) * 50;
                    this.world.createExplosion(
                        playerX + offsetX,
                        playerY + offsetY,
                        15 + Math.random() * 15,
                        null
                    );
                }, i * 80); // Staggered timing
            }
            
            // Create massive amounts of debris
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 40 + Math.random() * 150;
                const size = 1 + Math.random() * 4;
                
                // Create debris with mixed colors
                const colors = ['#33f', '#66f', '#f66', '#999', '#ff0', '#f80'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                const debris = {
                    x: playerX + (Math.random() - 0.5) * 15,
                    y: playerY + (Math.random() - 0.5) * 15,
                    velocityX: Math.cos(angle) * speed,
                    velocityY: Math.sin(angle) * speed,
                    size: size,
                    color: color,
                    life: 1.0,
                    maxLife: 1.0 + Math.random() * 3.0,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 8,
                    update(deltaTime) {
                        // Move debris
                        this.x += this.velocityX * deltaTime;
                        this.y += this.velocityY * deltaTime;
                        // Decrease lifetime
                        this.life -= deltaTime / this.maxLife;
                        // Slow down over time
                        this.velocityX *= 0.98;
                        this.velocityY *= 0.98;
                        // Rotate debris
                        this.rotation += this.rotationSpeed * deltaTime;
                    }
                };
                
                this.world.particles.push(debris);
            }
        }
        
        // Add extreme camera shake for dramatic effect
        if (this.multiplayer) {
            this.multiplayer.addCameraShake(40);
        }
    }
    
    // Add UNMISSABLE full screen explosion effect
    showFullScreenExplosion() {
        console.log("CREATING FULL-SCREEN EXPLOSION EFFECT!");
        
        // Create full-screen overlay for explosion effect
        const overlay = document.createElement('div');
        overlay.id = 'death-explosion-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '10000'; // Above everything
        overlay.style.backgroundColor = 'rgba(255, 100, 0, 0)'; // Start transparent
        overlay.style.transition = 'background-color 0.15s ease-out';
        document.body.appendChild(overlay);
        
        // Flash the screen bright orange
        setTimeout(() => { 
            overlay.style.backgroundColor = 'rgba(255, 100, 0, 0.8)'; 
            
            // Play loud explosion sound
            if (this.soundManager) {
                this.soundManager.play('explosion', { volume: 1.0 });
                // Play it twice for more impact
                this.soundManager.play('explosion', { volume: 1.0, playbackRate: 0.8 });
            }
        }, 10);
        
        // Add animated explosion elements
        for (let i = 0; i < 40; i++) {
            const piece = document.createElement('div');
            const size = 30 + Math.random() * 200;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const delay = Math.random() * 0.3;
            const duration = 0.5 + Math.random() * 0.8;
            
            piece.style.position = 'absolute';
            piece.style.width = `${size}px`;
            piece.style.height = `${size}px`;
            piece.style.borderRadius = '50%';
            piece.style.left = `${x}%`;
            piece.style.top = `${y}%`;
            piece.style.transform = 'translate(-50%, -50%) scale(0.1)';
            piece.style.background = Math.random() > 0.5 ?
                'radial-gradient(circle, rgba(255,220,150,1) 0%, rgba(255,100,50,0.8) 50%, rgba(255,0,0,0) 100%)' :
                'radial-gradient(circle, rgba(255,255,200,1) 0%, rgba(255,150,50,0.8) 50%, rgba(255,50,0,0) 100%)';
            piece.style.boxShadow = '0 0 30px rgba(255, 150, 50, 0.8)';
            piece.style.opacity = '0';
            piece.style.animation = `fullscreen-explosion ${duration}s ease-out ${delay}s forwards`;
            
            overlay.appendChild(piece);
        }
        
        // Add fiery text that says "DESTROYED!"
        const text = document.createElement('div');
        text.textContent = 'DESTROYED!';
        text.style.position = 'absolute';
        text.style.top = '50%';
        text.style.left = '50%';
        text.style.transform = 'translate(-50%, -50%) scale(0.1)';
        text.style.fontFamily = 'Arial, sans-serif';
        text.style.fontSize = '100px';
        text.style.fontWeight = 'bold';
        text.style.color = '#fff';
        text.style.textShadow = '0 0 20px #ff0, 0 0 40px #f80, 0 0 60px #f00';
        text.style.opacity = '0';
        text.style.animation = 'explosion-text 1s ease-out 0.2s forwards';
        overlay.appendChild(text);
        
        // Add CSS for animations if not already present
        if (!document.getElementById('fullscreen-explosion-style')) {
            const style = document.createElement('style');
            style.id = 'fullscreen-explosion-style';
            style.textContent = `
                @keyframes fullscreen-explosion {
                    0% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.1); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
                }
                @keyframes explosion-text {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.1); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Fade out and remove overlay after animation
        setTimeout(() => {
            overlay.style.backgroundColor = 'rgba(255, 100, 0, 0)';
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 1000);
        }, 1000);
    }
    
    // Here we reset the game state to start a new game
    restartGame() {
        // Remove game over screen
        const gameOverScreen = document.getElementById('gameover');
        if (gameOverScreen) {
            document.body.removeChild(gameOverScreen);
        }
        
        // Reset player and world to initial state
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.world = new World();
        
        // Reset shop with new player reference
        this.shop = new ShopSystem(this.player);
        
        // Show shop button again
        document.getElementById('shop-btn').style.display = 'block';
        
        // Reset game state to playing
        this.gameState = 'playing';
        
        // Restart ambient music
        this.soundManager.stopAmbientMusic();
        this.soundManager.startAmbientMusic();
        
        // Reinitialize health bar with new player's health
        this.ui.updateHealthBar(this.player.health, this.player.maxHealth);
    }

    // Here we implement the main game loop using requestAnimationFrame
    gameLoop(currentTime) {
        // Calculate deltaTime in seconds for smooth animation regardless of frame rate
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update game state and render
        this.update(deltaTime);
        this.render();
        
        // Request next animation frame to continue the loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // Here we start the game loop
    start() {
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // This adds a guaranteed explosion system that works independently of the game loop
    setupGuaranteedExplosionSystem() {
        // Create an explosion effect container that will be positioned at player death
        const explosionContainer = document.createElement('div');
        explosionContainer.id = 'guaranteed-explosion';
        explosionContainer.style.position = 'absolute';
        explosionContainer.style.pointerEvents = 'none';
        explosionContainer.style.zIndex = '1000';
        explosionContainer.style.display = 'none'; // Hidden initially
        document.body.appendChild(explosionContainer);
        
        // Store the container for later use
        this.explosionContainer = explosionContainer;
        
        // Set up a simple health observer that checks regularly for health=0 condition
        this.lastHealth = 100;
        this.healthCheckInterval = setInterval(() => {
            // If player exists and health dropped to zero since last check
            if (this.player && this.player.health === 0 && this.lastHealth > 0) {
                console.log("HEALTH ZERO DETECTED - TRIGGERING EXPLOSION");
                
                // Show explosion at player position
                this.showGuaranteedExplosion();
                
                // Create in-game explosion as well - belt and suspenders approach
                this.forcePlayerExplosion();
            }
            
            // Remember the current health for next check
            if (this.player) {
                this.lastHealth = this.player.health;
            }
        }, 50); // Check every 50ms
    }
    
    // This shows a CSS animation explosion effect that is not dependent on game rendering
    showGuaranteedExplosion() {
        if (!this.player || !this.explosionContainer) return;
        
        // Play explosion sound at max volume
        if (this.soundManager) {
            this.soundManager.play('explosion', {
                volume: 1.0,
                playbackRate: 0.9,
                position: { x: this.player.x, y: this.player.y }
            });
        }
        
        // Position the explosion at the center of the viewport
        // This ensures it's visible on screen regardless of camera position
        this.explosionContainer.style.top = '50%';
        this.explosionContainer.style.left = '50%';
        this.explosionContainer.style.transform = 'translate(-50%, -50%)';
        this.explosionContainer.style.width = '300px';
        this.explosionContainer.style.height = '300px';
        this.explosionContainer.style.display = 'block';
        
        // Reset the container
        this.explosionContainer.innerHTML = '';
        
        // Create the main explosion
        for (let i = 0; i < 30; i++) {
            const size = 20 + Math.random() * 80;
            const delay = Math.random() * 0.4;
            const duration = 0.5 + Math.random() * 0.7;
            const x = (Math.random() - 0.5) * 160;
            const y = (Math.random() - 0.5) * 160;
            
            const explosionPiece = document.createElement('div');
            explosionPiece.style.position = 'absolute';
            explosionPiece.style.width = `${size}px`;
            explosionPiece.style.height = `${size}px`;
            explosionPiece.style.background = i % 3 === 0 ? 
                'radial-gradient(circle, rgba(255,200,100,1) 0%, rgba(255,100,50,0.7) 50%, rgba(255,30,0,0) 100%)' : 
                'radial-gradient(circle, rgba(255,255,180,1) 0%, rgba(255,150,50,0.7) 50%, rgba(255,50,0,0) 100%)';
            explosionPiece.style.borderRadius = '50%';
            explosionPiece.style.left = `${150 + x - size/2}px`;
            explosionPiece.style.top = `${150 + y - size/2}px`;
            explosionPiece.style.opacity = '0';
            explosionPiece.style.transform = 'scale(0.1)';
            explosionPiece.style.animation = `explosion ${duration}s ease-out ${delay}s forwards`;
            this.explosionContainer.appendChild(explosionPiece);
        }
        
        // Add CSS animation rules if they don't exist
        if (!document.getElementById('explosion-style')) {
            const style = document.createElement('style');
            style.id = 'explosion-style';
            style.textContent = `
                @keyframes explosion {
                    0% { 
                        opacity: 0.2; 
                        transform: scale(0.1); 
                    }
                    50% { 
                        opacity: 1; 
                        transform: scale(1.2); 
                    }
                    100% { 
                        opacity: 0; 
                        transform: scale(1.7); 
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Hide the explosion elements after animation completes
        setTimeout(() => {
            if (this.explosionContainer) {
                this.explosionContainer.style.display = 'none';
            }
        }, 2000);
    }
}

// Initialize and start the game when the page is loaded
window.addEventListener('load', () => {
    const game = new Game();
    // Store a global reference to the game for multiplayer access
    window.game = game;
    game.start();
});