export class UI {
    constructor() {
        this.createHudElements();
    }
    
    createHudElements() {
        // Create HUD container
        const hudContainer = document.createElement('div');
        hudContainer.id = 'hud-container';
        hudContainer.style.position = 'fixed'; // Changed from absolute to fixed
        hudContainer.style.top = '0';
        hudContainer.style.left = '0';
        hudContainer.style.width = '100%';
        hudContainer.style.height = '100%';
        hudContainer.style.pointerEvents = 'none'; // Let clicks pass through
        hudContainer.style.zIndex = '1000'; // Higher z-index to ensure it's on top
        
        // Right side - Score and minimap
        const infoPanel = document.createElement('div');
        infoPanel.id = 'info-panel';
        infoPanel.style.position = 'absolute';
        infoPanel.style.top = '20px';
        infoPanel.style.right = '20px';
        infoPanel.style.display = 'flex';
        infoPanel.style.flexDirection = 'column';
        infoPanel.style.alignItems = 'flex-end';
        infoPanel.style.gap = '10px';
        infoPanel.style.zIndex = '1001'; // Higher z-index
        
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
        minimapContainer.style.pointerEvents = 'auto'; // Allow interaction with minimap
        
        const minimapCanvas = document.createElement('canvas');
        minimapCanvas.id = 'minimap';
        minimapCanvas.width = 150;
        minimapCanvas.height = 150;
        minimapContainer.appendChild(minimapCanvas);
        
        // Add to info panel
        infoPanel.appendChild(scoreDisplay);
        infoPanel.appendChild(creditsDisplay);
        infoPanel.appendChild(minimapContainer);
        
        // BOTTOM LEFT - Player status indicators (Health, Weapon, etc.)
        const statusPanel = document.createElement('div');
        statusPanel.id = 'status-panel';
        statusPanel.style.position = 'absolute';
        statusPanel.style.bottom = '20px';
        statusPanel.style.left = '20px';
        statusPanel.style.display = 'flex';
        statusPanel.style.flexDirection = 'column';
        statusPanel.style.gap = '10px';
        statusPanel.style.padding = '15px';
        statusPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        statusPanel.style.borderRadius = '8px';
        statusPanel.style.border = '1px solid #444';
        statusPanel.style.boxShadow = '0 0 10px rgba(0, 100, 255, 0.5)';
        statusPanel.style.zIndex = '1001'; // Higher z-index
        statusPanel.style.pointerEvents = 'auto'; // Make sure the panel can receive pointer events
        
        // Health display
        const healthDisplay = document.createElement('div');
        healthDisplay.className = 'status-item';
        
        // Health bar
        const healthBar = document.createElement('div');
        healthBar.style.width = '100%';
        healthBar.style.height = '8px';
        healthBar.style.backgroundColor = '#333';
        healthBar.style.borderRadius = '4px';
        healthBar.style.overflow = 'hidden';
        healthBar.style.marginTop = '5px';
        
        const healthFill = document.createElement('div');
        healthFill.id = 'health-fill';
        healthFill.style.width = '100%';
        healthFill.style.height = '100%';
        healthFill.style.backgroundColor = '#3f3';
        healthFill.style.transition = 'width 0.3s ease';
        
        healthBar.appendChild(healthFill);
        
        healthDisplay.innerHTML = '<span class="status-label">HEALTH:</span> <span id="health" class="status-value">100</span>';
        this.styleStatusItem(healthDisplay, '#3f3');
        healthDisplay.appendChild(healthBar);
        
        // Weapon display
        const weaponDisplay = document.createElement('div');
        weaponDisplay.className = 'status-item';
        weaponDisplay.innerHTML = '<span class="status-label">WEAPON:</span> <span id="weapons" class="status-value">Basic Laser</span>';
        
        // Weapon icon
        const weaponIcon = document.createElement('div');
        weaponIcon.id = 'weapon-icon';
        weaponIcon.innerHTML = '🔫';
        weaponIcon.style.fontSize = '20px';
        weaponIcon.style.marginLeft = '10px';
        weaponIcon.style.display = 'inline-block';
        weaponIcon.style.verticalAlign = 'middle';
        
        const weaponText = weaponDisplay.querySelector('#weapons');
        if (weaponText) {
            weaponText.parentNode.insertBefore(weaponIcon, weaponText.nextSibling);
        }
        
        this.styleStatusItem(weaponDisplay, '#ff3');
        
        // Add status items to panel
        statusPanel.appendChild(healthDisplay);
        statusPanel.appendChild(weaponDisplay);
        
        // Add panels to HUD
        hudContainer.appendChild(infoPanel);
        hudContainer.appendChild(statusPanel);
        
        // Ensure the HUD is always created AFTER other elements
        // Remove existing HUD if it already exists
        const existingHud = document.getElementById('hud-container');
        if (existingHud) {
            document.body.removeChild(existingHud);
        }
        
        // Add HUD to document body
        document.body.appendChild(hudContainer);
        
        // Force a browser repaint to ensure UI is visible
        setTimeout(() => {
            hudContainer.style.opacity = '0.99';
            setTimeout(() => {
                hudContainer.style.opacity = '1';
            }, 10);
        }, 100);
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
    
    // Update health bar display based on current health percentage
    updateHealthBar(currentHealth, maxHealth = 100) {
        const healthFill = document.getElementById('health-fill');
        const healthValue = document.getElementById('health');
        
        if (healthFill && healthValue) {
            const healthPercentage = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
            healthFill.style.width = `${healthPercentage}%`;
            healthValue.textContent = Math.round(currentHealth);
            
            // Change color based on health level
            if (healthPercentage > 60) {
                healthFill.style.backgroundColor = '#3f3'; // Green
            } else if (healthPercentage > 30) {
                healthFill.style.backgroundColor = '#ff3'; // Yellow
            } else {
                healthFill.style.backgroundColor = '#f33'; // Red
            }
        }
    }
}