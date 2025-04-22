import { Player } from './player.js';
import { World } from './world.js';
import { InputHandler } from './input.js';
import { UI } from './ui.js';
import { SoundManager } from './sound.js';
import { ShopSystem } from './shop.js';
import { MultiplayerManager } from './multiplayer.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.world = new World();
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.input = new InputHandler();
        this.ui = new UI();
        this.soundManager = new SoundManager();
        this.shop = new ShopSystem(this.player);
        this.lastTime = 0;
        this.gameState = 'menu'; // menu, playing, gameover
        this.thrusterSoundActive = false;
        
        // Initialize multiplayer
        this.multiplayer = new MultiplayerManager(this);

        // Set canvas to fullscreen
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Event listeners
        document.getElementById('play-btn').addEventListener('click', () => this.startGame());
        document.getElementById('options-btn').addEventListener('click', () => this.showOptions());
        
        // Add mute and shop buttons to DOM
        this.createMuteButton();
        this.createShopButton();
        
        // Set up hotkeys
        this.setupHotkeys();

        // Connect to multiplayer server - always use local server during development
        const serverUrl = 'http://localhost:3000';
        // Later for production use:
        // const serverUrl = window.location.hostname === 'localhost' 
        //    ? 'http://localhost:3000'
        //    : 'https://your-deployed-url.com';
        
        this.multiplayer.connect(serverUrl)
            .then(() => {
                console.log('Connected to multiplayer server at', serverUrl);
            })
            .catch(error => {
                console.error('Failed to connect to multiplayer server:', error);
            });
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createMuteButton() {
        const muteBtn = document.createElement('button');
        muteBtn.textContent = '🔊';
        muteBtn.id = 'mute-btn';
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
        muteBtn.onclick = () => {
            const isMuted = this.soundManager.toggleMute();
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
        };
        document.body.appendChild(muteBtn);
    }
    
    createShopButton() {
        const shopBtn = document.createElement('button');
        shopBtn.textContent = '🛒 Shop';
        shopBtn.id = 'shop-btn';
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
        shopBtn.style.display = 'none'; // Initially hidden until game starts
        shopBtn.onclick = () => this.toggleShop();
        document.body.appendChild(shopBtn);
    }
    
    toggleShop() {
        // Only allow shop access when playing
        if (this.gameState === 'playing') {
            this.shop.toggleShop();
        }
    }
    
    setupHotkeys() {
        window.addEventListener('keydown', e => {
            // Shop hotkey (B key)
            if (e.code === 'KeyB' && this.gameState === 'playing') {
                this.toggleShop();
            }
        });
    }

    startGame() {
        // Resume audio context (needed because of browser autoplay policy)
        this.soundManager.resumeAudio();
        
        this.gameState = 'playing';
        document.getElementById('menu').classList.add('hidden');
        
        // Show shop button when game starts
        document.getElementById('shop-btn').style.display = 'block';
    }

    showOptions() {
        console.log('Options menu - to be implemented');
    }

    update(deltaTime) {
        if (this.gameState === 'playing') {
            // Skip game updates if shop is open
            if (this.shop.shopOpen) return;
            
            // Handle thruster sound based on input
            if (this.input.keys.includes('ArrowUp')) {
                if (!this.thrusterSoundActive) {
                    this.soundManager.startThrusterSound({ volume: 0.3 });
                    this.thrusterSoundActive = true;
                }
            } else if (this.thrusterSoundActive) {
                this.soundManager.stopThrusterSound();
                this.thrusterSoundActive = false;
            }
            
            // Update player (pass sound manager for shooting sounds)
            this.player.update(deltaTime, this.input.keys, this.soundManager);
            
            // Update world (pass sound manager for collision sounds)
            this.world.update(deltaTime, this.player, this.soundManager);
            
            // Update UI elements
            document.getElementById('score').textContent = this.player.score;
            document.getElementById('health').textContent = Math.floor(this.player.health);
            document.getElementById('weapons').textContent = this.player.currentWeapon;
            document.getElementById('credits').textContent = this.player.credits;
            
            // Update shield and energy UI if they exist
            if (this.player.shieldCapacity > 0) {
                const shieldElement = document.getElementById('shield');
                if (shieldElement) {
                    shieldElement.textContent = Math.floor(this.player.shield);
                } else {
                    this.ui.addShieldDisplay();
                }
            }
            
            if (this.player.maxEnergy > 0) {
                const energyElement = document.getElementById('energy');
                if (energyElement) {
                    energyElement.textContent = Math.floor(this.player.energy);
                } else {
                    this.ui.addEnergyDisplay();
                }
            }
            
            // Check for player death
            if (this.player.health <= 0) {
                this.gameOver();
            }
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === 'playing') {
            // Save context state for camera transformations
            this.ctx.save();
            
            // Apply camera transformation (center on player)
            this.ctx.translate(
                this.canvas.width / 2 - this.player.x, 
                this.canvas.height / 2 - this.player.y
            );
            
            // Render world and objects
            this.world.render(this.ctx, this.player);
            this.player.render(this.ctx);
            
            // Restore context state
            this.ctx.restore();
            
            // Render HUD elements that need canvas drawing
            this.ui.renderMinimap(this.ctx, this.player, this.world);
        }
    }

    gameOver() {
        this.gameState = 'gameover';
        
        // Create game over screen
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'gameover';
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
        
        const gameOverTitle = document.createElement('h2');
        gameOverTitle.textContent = 'Game Over';
        gameOverTitle.style.color = '#f33';
        
        const scoreText = document.createElement('p');
        scoreText.textContent = `Final Score: ${this.player.score}`;
        
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
        
        gameOverScreen.appendChild(gameOverTitle);
        gameOverScreen.appendChild(scoreText);
        gameOverScreen.appendChild(restartButton);
        
        document.body.appendChild(gameOverScreen);
        
        // Hide shop button
        document.getElementById('shop-btn').style.display = 'none';
    }
    
    restartGame() {
        // Remove game over screen
        const gameOverScreen = document.getElementById('gameover');
        if (gameOverScreen) {
            document.body.removeChild(gameOverScreen);
        }
        
        // Reset player and world
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.world = new World();
        
        // Reset shop with new player reference
        this.shop = new ShopSystem(this.player);
        
        // Show shop button again
        document.getElementById('shop-btn').style.display = 'block';
        
        // Reset game state
        this.gameState = 'playing';
    }

    gameLoop(currentTime) {
        // Calculate deltaTime in seconds
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    start() {
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize and start the game when the page is loaded
window.addEventListener('load', () => {
    const game = new Game();
    game.start();
});