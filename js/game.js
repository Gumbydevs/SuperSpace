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
        this.gameState = 'menu';  // Game can be in 'menu', 'playing', or 'gameover' state
        this.thrusterSoundActive = false;  // Tracks if thruster sound is currently playing
        
        // Initialize multiplayer system
        this.multiplayer = new MultiplayerManager(this);

        // Here we make the canvas fullscreen and respond to window resizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Set up event listeners for menu buttons
        document.getElementById('play-btn').addEventListener('click', () => this.startGame());
        document.getElementById('options-btn').addEventListener('click', () => this.showOptions());
        
        // Here we create UI controls for mute and shop
        this.createMuteButton();
        this.createShopButton();
        
        // Set up keyboard shortcuts
        this.setupHotkeys();

        // Here we connect to the multiplayer server
        // Use the deployed server URL in production, localhost in development
        const serverUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000'
            : 'https://superspace-server.onrender.com'; // We'll deploy to Render
        
        this.multiplayer.connect(serverUrl)
            .then(() => {
                console.log('Connected to multiplayer server at', serverUrl);
            })
            .catch(error => {
                console.error('Failed to connect to multiplayer server:', error);
            });
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
        muteBtn.style.top = '20px';
        muteBtn.style.right = '20px';
        muteBtn.style.zIndex = '100';
        muteBtn.style.background = 'rgba(0, 0, 0, 0.5)';
        muteBtn.style.color = 'white';
        muteBtn.style.border = '1px solid #33f';
        muteBtn.style.borderRadius = '5px';
        muteBtn.style.padding = '10px 15px';
        muteBtn.style.cursor = 'pointer';
        // Here we set up the click handler to toggle mute state
        muteBtn.onclick = () => {
            const isMuted = this.soundManager.toggleMute();
            // Update button icon based on mute state
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
        };
        // Add the button to the document body
        document.body.appendChild(muteBtn);
    }
    
    // Here we create a shop button to access the in-game store
    createShopButton() {
        const shopBtn = document.createElement('button');
        shopBtn.textContent = '🛒 Shop';
        shopBtn.id = 'shop-btn';
        // Style the shop button similar to mute button
        shopBtn.style.position = 'absolute';
        shopBtn.style.top = '20px';
        shopBtn.style.right = '90px';
        shopBtn.style.zIndex = '100';
        shopBtn.style.background = 'rgba(0, 0, 50, 0.7)';
        shopBtn.style.color = 'white';
        shopBtn.style.border = '1px solid #33f';
        shopBtn.style.borderRadius = '5px';
        shopBtn.style.padding = '10px 15px';
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
        window.addEventListener('keydown', e => {
            // Shop hotkey (B key)
            if (e.code === 'KeyB' && this.gameState === 'playing') {
                this.toggleShop();
            }
        });
    }

    // Here we transition from menu to active gameplay
    startGame() {
        // Resume audio context (needed because of browser autoplay policy)
        this.soundManager.resumeAudio();
        
        this.gameState = 'playing';
        document.getElementById('menu').classList.add('hidden');
        
        // Show shop button when game starts
        document.getElementById('shop-btn').style.display = 'block';
    }

    // Placeholder for options menu
    showOptions() {
        console.log('Options menu - to be implemented');
    }

    // Here we update all game components each frame using delta time
    update(deltaTime) {
        if (this.gameState === 'playing') {
            // Skip game updates if shop is open
            if (this.shop.shopOpen) return;
            
            // Here we handle thruster sound based on player input
            if (this.input.keys.includes('ArrowUp')) {
                if (!this.thrusterSoundActive) {
                    // Start thruster sound when player starts accelerating
                    this.soundManager.startThrusterSound({ volume: 0.3 });
                    this.thrusterSoundActive = true;
                }
            } else if (this.thrusterSoundActive) {
                // Stop thruster sound when player stops accelerating
                this.soundManager.stopThrusterSound();
                this.thrusterSoundActive = false;
            }
            
            // Here we update player position, rotation, and actions
            this.player.update(deltaTime, this.input.keys, this.soundManager);
            
            // Here we update world elements like asteroids and powerups
            this.world.update(deltaTime, this.player, this.soundManager);
            
            // Here we update UI elements with current game state
            document.getElementById('score').textContent = this.player.score;
            document.getElementById('health').textContent = Math.floor(this.player.health);
            document.getElementById('weapons').textContent = this.player.currentWeapon;
            document.getElementById('credits').textContent = this.player.credits;
            
            // Here we dynamically update shield and energy UI if player has these capabilities
            if (this.player.shieldCapacity > 0) {
                const shieldElement = document.getElementById('shield');
                if (shieldElement) {
                    shieldElement.textContent = Math.floor(this.player.shield);
                } else {
                    // Add shield display if player has gained shield capability
                    this.ui.addShieldDisplay();
                }
            }
            
            if (this.player.maxEnergy > 0) {
                const energyElement = document.getElementById('energy');
                if (energyElement) {
                    energyElement.textContent = Math.floor(this.player.energy);
                } else {
                    // Add energy display if player has gained energy capability
                    this.ui.addEnergyDisplay();
                }
            }
            
            // Check for player death
            if (this.player.health <= 0) {
                this.gameOver();
            }
        }
    }

    // Here we draw all game elements to the canvas
    render() {
        // Clear canvas with black background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === 'playing') {
            // Save context state for camera transformations
            this.ctx.save();
            
            // Here we apply camera transformation to center view on player
            this.ctx.translate(
                this.canvas.width / 2 - this.player.x, 
                this.canvas.height / 2 - this.player.y
            );
            
            // Here we render the world and player objects
            this.world.render(this.ctx, this.player);
            this.player.render(this.ctx);
            
            // Restore context to original state
            this.ctx.restore();
            
            // Here we render HUD elements like the minimap
            this.ui.renderMinimap(this.ctx, this.player, this.world);
        }
    }

    // Here we handle the game over state
    gameOver() {
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
}

// Initialize and start the game when the page is loaded
window.addEventListener('load', () => {
    const game = new Game();
    game.start();
});