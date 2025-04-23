export class UI {
    constructor() {
        this.createHudElements();
        // Initially hide gameplay UI elements since we start at menu
        this.setGameplayUIVisibility(false);
    }
    
    // Show or hide gameplay UI elements based on game state
    setGameplayUIVisibility(visible) {
        // Hide or show minimap - always hidden on title screen
        const minimapContainer = document.getElementById('minimap-container');
        if (minimapContainer) {
            minimapContainer.style.display = visible ? 'block' : 'none';
        }
        
        // Hide or show player status panel (health, weapons) - always hidden on title screen
        const statusPanel = document.getElementById('status-panel');
        if (statusPanel) {
            statusPanel.style.display = visible ? 'flex' : 'none';
        }
        
        // Note: We keep the following visible at all times:
        // - Top info panel (score, credits)
        // - Connection indicator
        // - Player list
        // - Mute and shop buttons are managed elsewhere
    }
    
    createHudElements() {
        // Create HUD container
        const hudContainer = document.createElement('div');
        hudContainer.id = 'hud-container';
        hudContainer.style.position = 'fixed'; 
        hudContainer.style.top = '0';
        hudContainer.style.left = '0';
        hudContainer.style.width = '100%';
        hudContainer.style.height = '100%';
        hudContainer.style.pointerEvents = 'none'; 
        hudContainer.style.zIndex = '1000'; 
        
        // Top bar - Score and credits in horizontal row - SCALED DOWN
        const topInfoPanel = document.createElement('div');
        topInfoPanel.id = 'top-info-panel';
        topInfoPanel.style.position = 'absolute';
        topInfoPanel.style.top = '10px'; // Moved up slightly
        topInfoPanel.style.left = '80px'; // Less space needed
        topInfoPanel.style.display = 'flex';
        topInfoPanel.style.flexDirection = 'row';
        topInfoPanel.style.alignItems = 'center';
        topInfoPanel.style.gap = '10px'; // Reduced gap
        topInfoPanel.style.zIndex = '1001';
        topInfoPanel.style.transform = 'scale(0.85)'; // Scale down the entire panel
        topInfoPanel.style.transformOrigin = 'top left'; // Keep position relative to top left
        
        // Score display - made even more compact
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'status-item-small';
        scoreDisplay.innerHTML = '<span class="status-label">SCORE:</span> <span id="score" class="status-value">0</span>';
        this.styleStatusItemSmall(scoreDisplay, '#fff');
        
        // Credits display - made even more compact
        const creditsDisplay = document.createElement('div');
        creditsDisplay.className = 'status-item-small';
        creditsDisplay.innerHTML = '<span class="status-label">CREDITS:</span> <span id="credits" class="status-value">0</span>';
        this.styleStatusItemSmall(creditsDisplay, '#ff0');
        
        // Bottom right - Minimap - SCALED DOWN
        const minimapContainer = document.createElement('div');
        minimapContainer.id = 'minimap-container';
        minimapContainer.style.position = 'absolute';
        minimapContainer.style.bottom = '15px'; // Moved closer to bottom edge
        minimapContainer.style.right = '15px'; // Moved closer to right edge
        minimapContainer.style.width = '120px'; // Smaller width
        minimapContainer.style.height = '120px'; // Smaller height
        minimapContainer.style.border = '1px solid #555'; // Thinner border
        minimapContainer.style.borderRadius = '4px'; // Smaller border radius
        minimapContainer.style.overflow = 'hidden';
        minimapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        minimapContainer.style.pointerEvents = 'auto';
        minimapContainer.style.zIndex = '1001';
        
        const minimapCanvas = document.createElement('canvas');
        minimapCanvas.id = 'minimap';
        minimapCanvas.width = 120; // Match new container size
        minimapCanvas.height = 120; // Match new container size
        minimapContainer.appendChild(minimapCanvas);
        
        // Add score and credits to info panel
        topInfoPanel.appendChild(scoreDisplay);
        topInfoPanel.appendChild(creditsDisplay);
        
        // BOTTOM LEFT - Player status indicators (Health, Weapon, etc.) - SCALED DOWN
        const statusPanel = document.createElement('div');
        statusPanel.id = 'status-panel';
        statusPanel.style.position = 'absolute';
        statusPanel.style.bottom = '15px'; // Moved closer to bottom edge
        statusPanel.style.left = '15px'; // Moved closer to left edge
        statusPanel.style.display = 'flex';
        statusPanel.style.flexDirection = 'column';
        statusPanel.style.gap = '6px'; // Reduced gap between items
        statusPanel.style.padding = '10px'; // Reduced padding
        statusPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        statusPanel.style.borderRadius = '6px'; // Smaller border radius
        statusPanel.style.border = '1px solid #444'; // Thinner border
        statusPanel.style.boxShadow = '0 0 8px rgba(0, 100, 255, 0.5)'; // Less intense shadow
        statusPanel.style.zIndex = '1001';
        statusPanel.style.pointerEvents = 'auto';
        statusPanel.style.transform = 'scale(0.85)'; // Scale the entire panel down
        statusPanel.style.transformOrigin = 'bottom left'; // Keep position relative to bottom left
        
        // Health display
        const healthDisplay = document.createElement('div');
        healthDisplay.className = 'status-item';
        
        // Health bar - made more compact
        const healthBar = document.createElement('div');
        healthBar.style.width = '100%';
        healthBar.style.height = '6px'; // Thinner bar
        healthBar.style.backgroundColor = '#333';
        healthBar.style.borderRadius = '3px'; // Smaller border radius
        healthBar.style.overflow = 'hidden';
        healthBar.style.marginTop = '4px'; // Less margin
        
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
        
        // Weapon display - made more compact
        const weaponDisplay = document.createElement('div');
        weaponDisplay.className = 'status-item';
        weaponDisplay.innerHTML = '<span class="status-label">WEAPON:</span> <span id="weapons" class="status-value">Basic Laser</span>';
        
        // Weapon icon - made smaller
        const weaponIcon = document.createElement('div');
        weaponIcon.id = 'weapon-icon';
        weaponIcon.innerHTML = '🔫';
        weaponIcon.style.fontSize = '16px'; // Smaller icon
        weaponIcon.style.marginLeft = '8px'; // Less margin
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
        hudContainer.appendChild(topInfoPanel);
        hudContainer.appendChild(statusPanel);
        hudContainer.appendChild(minimapContainer);
        
        // Ensure the HUD is always created AFTER other elements
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
        element.style.padding = '6px 10px'; // Reduced padding
        element.style.borderRadius = '4px'; // Smaller border radius
        element.style.border = '1px solid #555'; // Thinner border
        element.style.color = 'white';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontSize = '0.9em'; // Slightly smaller font
        
        const label = element.querySelector('.status-label');
        if (label) {
            label.style.color = color;
            label.style.fontWeight = 'bold';
            label.style.marginRight = '4px'; // Less margin
        }
        
        const value = element.querySelector('.status-value');
        if (value) {
            value.style.fontWeight = 'bold';
        }
    }
    
    styleStatusItemSmall(element, color) {
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = '3px 6px'; // Reduced padding
        element.style.borderRadius = '3px';
        element.style.border = '1px solid #555'; // Thinner border
        element.style.color = 'white';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontSize = '0.85em'; // Smaller font
        
        const label = element.querySelector('.status-label');
        if (label) {
            label.style.color = color;
            label.style.fontWeight = 'bold';
            label.style.marginRight = '2px'; // Less margin
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
            minimapCtx.arc(x, y, 1.5, 0, Math.PI * 2); // Smaller powerup dots
            minimapCtx.fill();
        });
        
        // Draw player
        const playerX = (player.x + world.width/2) * scale;
        const playerY = (player.y + world.height/2) * scale;
        
        minimapCtx.fillStyle = '#33f';
        minimapCtx.beginPath();
        minimapCtx.arc(playerX, playerY, 2.5, 0, Math.PI * 2); // Slightly smaller player dot
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