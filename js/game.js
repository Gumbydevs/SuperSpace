// filepath: d:\Code_Playground\Games\SuperSpace\js\game.js
// Import all necessary game components from their respective modules
import { Player } from './player.js';
import { World } from './world.js';
import { InputHandler } from './input.js';
import { UI } from './ui.js';
import { SoundManager } from './sound.js';
import { ShopSystem } from './shop.js';
import { MultiplayerManager } from './multiplayer.js';
import { AchievementSystem } from './achievements.js';
import { PlayerProfile } from './playerprofile.js';
import { AdminSystem } from './adminsystem.js';
import { SkillSystem } from './skillSystem.js';
import { ChallengeSystem } from './challenges.js';
import { NPCManager } from './npc.js';
import { PremiumStore } from './premiumstore.js';
import { ShipSkinSystem } from './shipskins.js';
import { AvatarManager } from './avatarmanager.js';
import { PayPalIntegration } from './paypal-integration.js';
import { MarvinAssistant } from './marvin.js';
import Chat from './chat.js';

// Main Game class that coordinates all game systems and components
class Game {
    constructor() {
        // Here we get the canvas element and its context for drawing
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Ensure canvas has proper z-index (reset any inline styles)
        this.canvas.style.zIndex = '1';
        
        // Here we initialize all major game systems
        this.world = new World();  // Manages game world, asteroids, powerups, etc.
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);  // Creates player ship at center
        this.input = new InputHandler();  // Handles keyboard and mouse input
        this.ui = new UI();  // Manages UI elements on screen
        window.ui = this.ui;  // Make UI accessible globally for avatar manager
        
        // Initialize weapon icon to match starting weapon (Disengaged)
        setTimeout(() => {
            const weaponIcon = document.getElementById('weapon-icon');
            if (weaponIcon && this.player.updateWeaponIcon) {
                this.player.updateWeaponIcon(weaponIcon, this.player.currentWeapon);
            }
        }, 100); // Small delay to ensure DOM is ready
        
        this.soundManager = new SoundManager();  // Handles all game audio
        this.shop = new ShopSystem(this.player);  // In-game shop for upgrades
        this.premiumStore = new PremiumStore(this.player);  // Premium monetization store
        this.shipSkins = new ShipSkinSystem();  // Ship skin system
        this.avatarManager = new AvatarManager(this.premiumStore);  // Avatar manager with premium support
        this.marvinAssistant = new MarvinAssistant(); // Marvin the Robot assistant for notifications
        this.paypalIntegration = new PayPalIntegration(this.premiumStore);  // PayPal payment system
        
        // Connect systems to premium store
        this.premiumStore.setAvatarManager(this.avatarManager);
        this.premiumStore.setPayPalIntegration(this.paypalIntegration);
        this.achievements = new AchievementSystem(this.player);  // Achievement tracking system
        this.playerProfile = new PlayerProfile(this.player);  // Player statistics and profile
        this.adminSystem = new AdminSystem();  // Admin tools and management
        this.skillSystem = new SkillSystem(this.player);
        this.challengeSystem = new ChallengeSystem(this.player, this.playerProfile);
        this.npcManager = new NPCManager(this.world, this.soundManager);  // NPC enemies and AI
        this.lastTime = 0;  // Used for calculating delta time between frames
        this.gameState = 'menu';  // Game can be in 'menu', 'playing', 'dying', or 'gameover' state
        this.thrusterSoundActive = false;  // Tracks if thruster sound is currently playing
        
        // Make systems globally accessible
        window.admin = this.adminSystem;
        window.npcManager = this.npcManager;  // Make NPC manager accessible for admin tools
        
        // Initialize multiplayer system (but don't connect yet)
        this.multiplayer = new MultiplayerManager(this);
        this.chat = new Chat(this.input);
        this.multiplayerConnected = false;

        // Store a reference to the UI for other classes to access
        window.gameUI = this.ui;

        // Here we make the canvas fullscreen and respond to window resizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Add mouse click handling for premium store
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Handle premium store clicks
            if (this.premiumStore.handleClick(x, y, this.canvas)) {
                return; // Click was handled by premium store
            }
        });

        // Set up event listeners for menu buttons
        document.getElementById('play-btn').addEventListener('click', () => {
            // Track UI interaction
            if (window.gameAnalytics) {
                window.gameAnalytics.trackUIInteraction('play-btn', 'click');
            }
            this.startGame();
        });
        // Use the new overlay logic for options
        document.getElementById('options-btn').addEventListener('click', () => {
            // Track UI interaction
            if (window.gameAnalytics) {
                window.gameAnalytics.trackUIInteraction('options-btn', 'click');
            }
            if (this.ui && this.ui.showOptionsOverlay) {
                this.ui.showOptionsOverlay();
            }
        });
        
        // Here we create UI controls for mute, music, and shop
        this.createMuteButton();
        this.createMusicButton();
        this.createShopButton();
        this.createPremiumStoreButton();
        this.createAdminButton();
        
        // Set up keyboard shortcuts
        this.setupHotkeys();
        
        // Initialize player count display by connecting to server without joining game
        this.initializePlayerCount();

        // GUARANTEED EXPLOSION SYSTEM
        // This uses a DOM-based approach as fallback to ensure explosions always appear
        this.setupGuaranteedExplosionSystem();
        
        // Check for pending PayPal payments
        this.processPendingPayments();
    }
    
        // Helper function to track analytics events
        trackAnalyticsEvent(eventName, properties = {}) {
            try {
                // Try multiple methods to track the event
                if (window.va && typeof window.va.track === 'function') {
                    window.va.track(eventName, properties);
                    console.log(`📊 Analytics tracked: ${eventName}`, properties);
                } else if (window.gtag) {
                    window.gtag('event', eventName, properties);
                    console.log(`📊 GA4 tracked: ${eventName}`, properties);
                } else {
                    console.log(`📊 Analytics not available for event: ${eventName}`, properties);
                }
            } catch (error) {
                console.warn('Analytics tracking error:', error);
            }
        }
        
        // Test function for debugging analytics (can be called from browser console)
        testAnalytics() {
            console.log('🧪 Testing Vercel Analytics...');
            this.trackAnalyticsEvent('test_event', { 
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                page_url: window.location.href
            });
        }    // Connect to the server to get player count without joining the game
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
            const tempSocket = io(serverUrl, {
                reconnection: false,
                timeout: 5000
            });
            
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
        muteBtn.style.right = '0px';
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
        musicBtn.style.right = '52px'; // Position directly left of mute button
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
        shopBtn.style.top = '76px'; // Position below the top row (moved down from 60px)
        shopBtn.style.right = '0px';
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
    // Here we create a premium store button for cosmetic purchases
    createPremiumStoreButton() {
        const premiumBtn = document.createElement('button');
        premiumBtn.textContent = '💎 Premium';
        premiumBtn.id = 'premium-btn';
        premiumBtn.style.position = 'absolute';
        // Lower the premium button so it doesn't overlap the shop button
        premiumBtn.style.top = '132px'; // moved down from 114px
        premiumBtn.style.right = '0px';
        premiumBtn.style.zIndex = '1002';
        premiumBtn.style.background = 'linear-gradient(45deg, #6a0dad, #9932cc)';
        premiumBtn.style.color = 'white';
        premiumBtn.style.border = '1px solid #ffd700';
        premiumBtn.style.borderRadius = '5px'; // Match shop button radius
        premiumBtn.style.padding = '6px 12px'; // Match shop button padding
        premiumBtn.style.cursor = 'pointer';
        premiumBtn.style.display = 'none';  // Initially hidden until game starts
        premiumBtn.style.fontWeight = 'normal'; // Match shop button font weight
        premiumBtn.style.fontSize = '14px'; // Match standard button size

        // Add subtle hover effect
        premiumBtn.onmouseenter = () => {
            premiumBtn.style.background = 'linear-gradient(45deg, #7b1fa2, #ab47bc)';
            premiumBtn.style.transform = 'scale(1.02)';
        };
        premiumBtn.onmouseleave = () => {
            premiumBtn.style.background = 'linear-gradient(45deg, #6a0dad, #9932cc)';
            premiumBtn.style.transform = 'scale(1)';
        };

        // Click toggles the premium store
        premiumBtn.onclick = () => this.togglePremiumStore();

        // Try to match the shop button width at runtime but cap to a smaller max
        // so the premium button is not overly wide. If shop button isn't
        // available, fall back to a sensible default of 90px.
        try {
            const shopBtn = document.getElementById('shop-btn');
            let width = 90; // sensible default
            if (shopBtn) {
                const shopWidth = shopBtn.offsetWidth || parseInt(window.getComputedStyle(shopBtn).width, 10) || 120;
                // Cap to max 100px to keep premium button compact
                width = Math.min(shopWidth, 100);
            }
            premiumBtn.style.width = width + 'px';
        } catch (e) {
            premiumBtn.style.width = '90px';
        }

        // Append the button once
        document.body.appendChild(premiumBtn);
    }

    // Here we create an admin button for game management
    // Here we create an admin button for game management
    createAdminButton() {
        const adminBtn = document.createElement('button');
        adminBtn.textContent = '⚙️ Admin';
        adminBtn.id = 'admin-btn';
        adminBtn.style.position = 'absolute';
        adminBtn.style.top = '152px'; // Position below premium button
        adminBtn.style.right = '0px';
        adminBtn.style.zIndex = '1002';
        adminBtn.style.background = 'rgba(50, 0, 0, 0.7)';
        adminBtn.style.color = 'white';
        adminBtn.style.border = '1px solid #f33';
        adminBtn.style.borderRadius = '5px';
        adminBtn.style.padding = '6px 12px';
        adminBtn.style.cursor = 'pointer';
        adminBtn.style.display = 'none';  // Initially hidden until game starts
        adminBtn.onclick = () => this.toggleAdmin();
        document.body.appendChild(adminBtn);
    }
    
    // Here we toggle the admin interface on/off
    toggleAdmin() {
        console.log('toggleAdmin called');
        console.log('adminSystem exists:', !!this.adminSystem);
        console.log('adminSystem type:', typeof this.adminSystem);
        if (this.adminSystem) {
            console.log('adminSystem methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.adminSystem)));
            console.log('Calling adminSystem.toggleAdminPanel()');
            this.adminSystem.toggleAdminPanel();
        } else {
            console.error('AdminSystem not initialized!');
        }
    }
    
    // Here we toggle the shop interface on/off
    toggleShop() {
        // Only allow shop access when playing
        if (this.gameState === 'playing') {
            this.shop.toggleShop();
        }
    }
    togglePremiumStore() {
        // Allow premium store access during menu or playing
        if (this.gameState === 'menu' || this.gameState === 'playing') {
            // Close avatar modal if open
            const avatarModal = document.getElementById('avatarModal');
            if (avatarModal && !avatarModal.classList.contains('hidden')) {
                avatarModal.classList.add('hidden');
            }
            // Close options overlay if open
            const optionsOverlay = document.getElementById('options-overlay');
            if (optionsOverlay && !optionsOverlay.classList.contains('hidden')) {
                optionsOverlay.classList.add('hidden');
            }
            // Open the premium store
            this.premiumStore.toggleStore();
        }
    }

    // Process pending PayPal payments
    // Process pending PayPal payments
    processPendingPayments() {
        const pendingPayment = localStorage.getItem('pendingPayment');
        if (pendingPayment) {
            try {
                const payment = JSON.parse(pendingPayment);
                if (!payment.processed) {
                    // Process the payment
                    this.paypalIntegration.handlePaymentSuccess(payment.itemNumber, payment.transactionId);
                    
                    // Mark as processed
                    payment.processed = true;
                    localStorage.setItem('pendingPayment', JSON.stringify(payment));
                    
                    console.log('Processed pending PayPal payment:', payment);
                }
            } catch (e) {
                console.error('Failed to process pending payment:', e);
                localStorage.removeItem('pendingPayment'); // Remove invalid data
            }
        }
    }
    
    // Here we set up keyboard shortcuts for game functions
    setupHotkeys() {
        // Track key sequence for cheat codes
        let keySequence = [];
        const moneyCheatCode = ['KeyM', 'KeyO', 'KeyN', 'KeyE', 'KeyY']; // "MONEY" cheat code
        
        // Track currently pressed keys for admin combination
        let keysPressed = new Set();
        
        window.addEventListener('keydown', e => {
            // Track pressed keys for admin combination
            keysPressed.add(e.code);
            // console.log('Key pressed:', e.code, 'Current keys:', Array.from(keysPressed));
            
            // Check for admin combination F+T+G (must be pressed together)
            if (keysPressed.has('KeyF') && keysPressed.has('KeyT') && keysPressed.has('KeyG')) {
                console.log('Admin key combination detected! F+T+G pressed');
                this.toggleAdmin();
                keysPressed.clear(); // Clear to prevent repeated triggers
                return;
            }
            
            // Admin panel access removed from F12 - use secret key sequence instead (F+T+G)
            
            // Shop hotkey (B key)
            if (e.code === 'KeyB' && this.gameState === 'playing' && !this.input.isChatting) {
                this.toggleShop();
            }

            // Chat hotkey (T key)
            if (e.code === 'KeyT' && this.gameState === 'playing') {
                e.preventDefault(); // Prevent the 'T' from being typed
                this.chat.toggleChat();
            }

            // Escape key to close chat or open options
            if (e.code === 'Escape') {
                if (this.chat.isVisible) {
                    this.chat.hideChat();
                    e.preventDefault(); // Prevent options menu from opening
                } else if (this.ui && this.ui.optionsOverlay.classList.contains('hidden')) {
                    // Original functionality to open options if not already open
                    // this.ui.showOptionsOverlay(); 
                    // The default behavior of Esc is handled elsewhere for the menu, so we might not need this.
                }
            }
            
            // Profile hotkey (P key) - show profile directly (only if not typing)
            if (e.code === 'KeyP') {
                const activeElement = document.activeElement;
                const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
                
                if (!isTyping && this.playerProfile) {
                    this.playerProfile.showProfile();
                }
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
        
        // Track key releases for admin combination
        window.addEventListener('keyup', e => {
            keysPressed.delete(e.code);
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
        
        // Track game start event (Vercel Analytics)
        this.trackAnalyticsEvent('game_started', { 
            player_health: this.player.health,
            multiplayer_connected: this.multiplayerConnected 
        });
        
        // Track game start with our custom analytics system
        if (window.gameAnalytics) {
            window.gameAnalytics.setPlayerId(this.player.id || `player_${Date.now()}`);
            window.gameAnalytics.trackGameStart();
            window.gameAnalytics.trackShipChange(null, this.player.shipType || 'scout');
        }
        
        // Record start time for survival tracking
        this.gameStartTime = Date.now();
        
        this.gameState = 'playing';
        document.getElementById('menu').classList.add('hidden');
        
        // Show shop button when game starts
        document.getElementById('shop-btn').style.display = 'block';
        
        // Show premium store button 
        document.getElementById('premium-btn').style.display = 'block';
        
        // Show gameplay UI elements
        this.ui.setGameplayUIVisibility(true);
        
        // Ensure player starts with full health based on their upgrades
        this.player.health = this.player.maxHealth;
        
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
                    this.chat.setSocket(this.multiplayer.socket);
                    
                    // Track multiplayer connection
                    this.trackAnalyticsEvent('multiplayer_connected', { 
                        server_url: serverUrl,
                        game_state: this.gameState 
                    });
                })
                .catch(error => {
                    console.error('Failed to connect to multiplayer server:', error);
                    this.trackAnalyticsEvent('multiplayer_connection_failed', { 
                        server_url: serverUrl,
                        error: error.message 
                    });
                });
        }
    }

    // Here we update all game components each frame using delta time
    update(deltaTime) {
        if (this.gameState === 'playing') {
            // Skip game updates if shop is open
            if (this.shop.shopOpen) return;
            
            // Here we handle thruster sound based on player input and afterburner
            const isThrusting = this.input.keys && Array.isArray(this.input.keys) && 
                (this.input.keys.includes('ArrowUp') || this.input.keys.includes('KeyW'));
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
            
            // Update NPCs and AI enemies
            this.npcManager.update(deltaTime, this.player);
            this.npcManager.updateNPCProjectiles(deltaTime, this.player);
            this.npcManager.checkProjectileCollisions(this.player);
            
            // Update multiplayer status and send player position to server
            if (this.multiplayer && this.multiplayer.connected) {
                this.multiplayer.update(deltaTime);
            }
            
            // Update achievements and player profile with current data
            if (this.achievements) {
                // Track survival time
                const currentTime = Date.now();
                const survivalTime = (currentTime - this.gameStartTime) / 1000;
                if (typeof this.achievements.onSurvivalTime === 'function') {
                    this.achievements.onSurvivalTime(survivalTime);
                }
                
                // Track credits
                if (typeof this.achievements.onCreditsChanged === 'function') {
                    this.achievements.onCreditsChanged(this.player.credits || 0);
                }
            }
            
            if (this.playerProfile) {
                // Update playtime
                this.playerProfile.updatePlaytime(deltaTime);
            }
            
            // Update player profile statistics
            if (this.playerProfile) {
                // Track distance traveled (approximate based on velocity)
                if (this.player.velocity && (this.player.velocity.x !== 0 || this.player.velocity.y !== 0)) {
                    const distance = Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.y ** 2) * deltaTime;
                    this.playerProfile.onDistanceTraveled(distance);
                }
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
                // In multiplayer, death is handled by the multiplayer system
                if (this.multiplayer && (this.multiplayer.connected || this.multiplayer.socket)) {
                    // Let multiplayer handle death - it has its own respawn logic
                    if (!this.player.deathTriggered) {
                        this.player.die(); // This will trigger multiplayer.handleDeath
                    }
                } else {
                    // In single-player, show game over screen
                    this.gameOver();
                }
            }
        } else if (this.gameState === 'dying') {
            // When player is dying, keep the world alive
            this.world.update(deltaTime, this.player, this.soundManager);
            this.npcManager.update(deltaTime, this.player);
            if (this.multiplayer && this.multiplayer.connected) {
                this.multiplayer.update(deltaTime);
            }
            // Gently float the player's wreckage
            if (this.player.updatePosition) {
                this.player.updatePosition(deltaTime);
            }
        }
        
        // Update skill points based on current score
        if (this.gameState === 'playing') {
            this.skillSystem.updateSkillPoints();
            this.challengeSystem.check('daily');
            this.challengeSystem.check('weekly');
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
        
        // Render NPCs and enemies
        this.npcManager.render(this.ctx);
        
        // Render the player when actively playing
        if (this.gameState === 'playing') {
            this.player.render(this.ctx);
        }
        
        // Always render other players from multiplayer (even when dying)
        if (this.multiplayer && this.multiplayer.connected) {
            this.multiplayer.render(this.ctx);
        }
        
        // Restore context to original state
        this.ctx.restore();
        
        // Render minimap when playing or dying (so dead players can see what's happening)
        if (this.gameState === 'playing' || this.gameState === 'dying') {
            this.ui.renderMinimap(this.ctx, this.player, this.world);
        }

        // Render fire rate boost timer
        if (this.gameState === 'playing') {
            this.ui.renderFireRateBoostTimer(this.ctx, this.player);
        }
        
        // Render premium store overlay (can be accessed from menu or playing)
        this.premiumStore.render(this.ctx, this.canvas);
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
            
            // Track game over event (Vercel Analytics)
            this.trackAnalyticsEvent('game_over', { 
                final_score: this.player.score,
                final_credits: this.player.credits,
                survival_time: Date.now() - (this.gameStartTime || 0),
                multiplayer_connected: this.multiplayerConnected 
            });
            
            // Track game end with our custom analytics system
            if (window.gameAnalytics) {
                window.gameAnalytics.trackGameEnd();
            }
            
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
            
            // Hide premium store button
            document.getElementById('premium-btn').style.display = 'none';
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
                const debrisColors = ['#7d7d7d', '#66f', '#f66', '#999', '#ff0', '#f80'];
                const color = debrisColors[Math.floor(Math.random() * debrisColors.length)];

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
        text.style.fontFamily = "'Orbitron', 'Arial', sans-serif";
        text.style.fontWeight = '700';
        text.style.fontSize = '100px';
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
        
        // Update weapon icon to match starting weapon (Disengaged)  
        setTimeout(() => {
            const weaponIcon = document.getElementById('weapon-icon');
            if (weaponIcon && this.player.updateWeaponIcon) {
                this.player.updateWeaponIcon(weaponIcon, this.player.currentWeapon);
            }
        }, 100);
        
        // Reset shop with new player reference
        this.shop = new ShopSystem(this.player);
        
        // Ensure player starts with full health after restart
        this.player.health = this.player.maxHealth;
        
        // Show shop button again
        document.getElementById('shop-btn').style.display = 'block';
        
        // Show premium store button again
        document.getElementById('premium-btn').style.display = 'block';
        
        // Reset game state to playing
        this.gameState = 'playing';
        
        // Restart ambient music
        this.soundManager.stopAmbientMusic();
        this.soundManager.startAmbientMusic();
        
        // Reinitialize health bar with new player's health
        this.ui.updateHealthBar(this.player.health, this.player.maxHealth);
        
        // Reset skill and challenge systems for new session
        this.skillSystem.reset();
        this.challengeSystem.completed = { daily: [], weekly: [] };
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
    // Store a global reference to Marvin for notification access
    window.marvinAssistant = game.marvinAssistant;
    game.start();
});