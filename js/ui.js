export class UI {
    constructor() {
        this.createHudElements();
    }
    
    createHudElements() {
        // Create HUD container
        const hudContainer = document.createElement('div');
        hudContainer.id = 'hud-container';
        hudContainer.style.position = 'absolute';
        hudContainer.style.top = '0';
        hudContainer.style.left = '0';
        hudContainer.style.width = '100%';
        hudContainer.style.padding = '20px';
        hudContainer.style.display = 'flex';
        hudContainer.style.justifyContent = 'space-between';
        hudContainer.style.pointerEvents = 'none'; // Let clicks pass through
        
        // Left side - Status indicators
        const statusPanel = document.createElement('div');
        statusPanel.id = 'status-panel';
        statusPanel.style.display = 'flex';
        statusPanel.style.flexDirection = 'column';
        statusPanel.style.gap = '10px';
        
        // Health display
        const healthDisplay = document.createElement('div');
        healthDisplay.className = 'status-item';
        healthDisplay.innerHTML = '<span class="status-label">HEALTH:</span> <span id="health" class="status-value">100</span>';
        this.styleStatusItem(healthDisplay, '#3f3');
        
        // Weapon display
        const weaponDisplay = document.createElement('div');
        weaponDisplay.className = 'status-item';
        weaponDisplay.innerHTML = '<span class="status-label">WEAPON:</span> <span id="weapons" class="status-value">Basic Laser</span>';
        this.styleStatusItem(weaponDisplay, '#ff3');
        
        // Add status items to panel
        statusPanel.appendChild(healthDisplay);
        statusPanel.appendChild(weaponDisplay);
        
        // Right side - Score and minimap
        const infoPanel = document.createElement('div');
        infoPanel.id = 'info-panel';
        infoPanel.style.display = 'flex';
        infoPanel.style.flexDirection = 'column';
        infoPanel.style.alignItems = 'flex-end';
        infoPanel.style.gap = '10px';
        
        // Score display
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'status-item';
        scoreDisplay.innerHTML = '<span class="status-label">SCORE:</span> <span id="score" class="status-value">0</span>';
        this.styleStatusItem(scoreDisplay, '#fff');
        
        // Credits display
        const creditsDisplay = document.createElement('div');
        creditsDisplay.className = 'status-item';
        creditsDisplay.innerHTML = '<span class="status-label">CREDITS:</span> <span id="credits" class="status-value">0</span>';
        this.styleStatusItem(creditsDisplay, '#ff0');
        
        // Add minimap canvas
        const minimapContainer = document.createElement('div');
        minimapContainer.style.position = 'relative';
        minimapContainer.style.width = '150px';
        minimapContainer.style.height = '150px';
        minimapContainer.style.border = '2px solid #555';
        minimapContainer.style.borderRadius = '5px';
        minimapContainer.style.overflow = 'hidden';
        minimapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        
        const minimapCanvas = document.createElement('canvas');
        minimapCanvas.id = 'minimap';
        minimapCanvas.width = 150;
        minimapCanvas.height = 150;
        minimapContainer.appendChild(minimapCanvas);
        
        // Add to info panel
        infoPanel.appendChild(scoreDisplay);
        infoPanel.appendChild(creditsDisplay);
        infoPanel.appendChild(minimapContainer);
        
        // Add panels to HUD
        hudContainer.appendChild(statusPanel);
        hudContainer.appendChild(infoPanel);
        
        // Add HUD to document
        document.body.appendChild(hudContainer);
    }
    
    styleStatusItem(element, color) {
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = '8px 12px';
        element.style.borderRadius = '5px';
        element.style.border = '1px solid #555';
        element.style.color = 'white';
        element.style.fontFamily = 'Arial, sans-serif';
        
        const label = element.querySelector('.status-label');
        if (label) {
            label.style.color = color;
            label.style.fontWeight = 'bold';
            label.style.marginRight = '5px';
        }
        
        const value = element.querySelector('.status-value');
        if (value) {
            value.style.fontWeight = 'bold';
        }
    }
    
    addShieldDisplay() {
        const statusPanel = document.getElementById('status-panel');
        
        const shieldDisplay = document.createElement('div');
        shieldDisplay.className = 'status-item';
        shieldDisplay.innerHTML = '<span class="status-label">SHIELD:</span> <span id="shield" class="status-value">0</span>';
        this.styleStatusItem(shieldDisplay, '#00f');
        
        statusPanel.appendChild(shieldDisplay);
    }
    
    addEnergyDisplay() {
        const statusPanel = document.getElementById('status-panel');
        
        const energyDisplay = document.createElement('div');
        energyDisplay.className = 'status-item';
        energyDisplay.innerHTML = '<span class="status-label">ENERGY:</span> <span id="energy" class="status-value">0</span>';
        this.styleStatusItem(energyDisplay, '#f0f');
        
        statusPanel.appendChild(energyDisplay);
    }
    
    renderMinimap(ctx, player, world) {
        const minimapCanvas = document.getElementById('minimap');
        if (!minimapCanvas) return;
        
        const minimapCtx = minimapCanvas.getContext('2d');
        const scale = minimapCanvas.width / world.width;
        
        // Clear minimap
        minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        
        // Draw world boundary
        minimapCtx.strokeStyle = '#555';
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        
        // Draw asteroids
        minimapCtx.fillStyle = '#aaa';
        world.asteroids.forEach(asteroid => {
            const x = (asteroid.x + world.width/2) * scale;
            const y = (asteroid.y + world.height/2) * scale;
            const radius = asteroid.radius * scale;
            
            minimapCtx.beginPath();
            minimapCtx.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
            minimapCtx.fill();
        });
        
        // Draw powerups
        world.powerups.forEach(powerup => {
            const x = (powerup.x + world.width/2) * scale;
            const y = (powerup.y + world.height/2) * scale;
            
            let color;
            switch(powerup.type) {
                case 'health': color = '#0f0'; break;
                case 'weapon': color = '#f00'; break;
                case 'shield': color = '#00f'; break;
                case 'energy': color = '#ff0'; break;
                default: color = '#fff';
            }
            
            minimapCtx.fillStyle = color;
            minimapCtx.beginPath();
            minimapCtx.arc(x, y, 2, 0, Math.PI * 2);
            minimapCtx.fill();
        });
        
        // Draw player
        const playerX = (player.x + world.width/2) * scale;
        const playerY = (player.y + world.height/2) * scale;
        
        minimapCtx.fillStyle = '#33f';
        minimapCtx.beginPath();
        minimapCtx.arc(playerX, playerY, 3, 0, Math.PI * 2);
        minimapCtx.fill();
        
        // Draw view area (visible area on main screen)
        const viewWidth = window.innerWidth * scale;
        const viewHeight = window.innerHeight * scale;
        
        minimapCtx.strokeStyle = '#33f';
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(
            playerX - viewWidth/2,
            playerY - viewHeight/2,
            viewWidth,
            viewHeight
        );
    }
}