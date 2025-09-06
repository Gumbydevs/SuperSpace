export class UI {
    constructor() {
        this.isMobileDevice = window.innerWidth <= 768; // Check if mobile/tablet (screen width <= 768px)
        this.isSmallMobile = window.innerWidth <= 480; // Check if small mobile (screen width <= 480px)
        this.createHudElements();
        // Initially hide gameplay UI elements since we start at menu
        this.setGameplayUIVisibility(false);
        
        // Add window resize listener to adjust UI when device orientation changes
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobileDevice;
            const wasSmallMobile = this.isSmallMobile;
            
            this.isMobileDevice = window.innerWidth <= 768;
            this.isSmallMobile = window.innerWidth <= 480;
            
            // Only recreate HUD if device category changed (mobile/tablet ↔ desktop or small mobile ↔ larger mobile)
            if (wasMobile !== this.isMobileDevice || wasSmallMobile !== this.isSmallMobile) {
                this.createHudElements();
            }
        });
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
        
        // Determine appropriate scaling based on device size
        let topPanelScale = 0.85; // Default desktop scale
        let statusPanelScale = 0.85; // Default desktop scale
        let minimapSize = 120; // Default desktop size
        let statusPanelPadding = '10px';
        let minimapMargin = '15px';
        let topPanelPosition = '10px';
        
        // Apply additional scaling for mobile/tablet devices
        if (this.isMobileDevice) {
            topPanelScale = 0.7;
            statusPanelScale = 0.7;
            minimapSize = 100;
            statusPanelPadding = '8px';
            minimapMargin = '10px'; 
            topPanelPosition = '5px';
            
            // Further adjustments for small mobile screens
            if (this.isSmallMobile) {
                topPanelScale = 0.6;
                statusPanelScale = 0.6;
                minimapSize = 80;
                statusPanelPadding = '6px';
                minimapMargin = '8px';
            }
        }
        
        // Create a unified top row panel for Online, Score and Credits - ALL IN ONE ROW
        const topInfoPanel = document.createElement('div');
        topInfoPanel.id = 'top-info-panel';
        topInfoPanel.style.position = 'absolute';
        topInfoPanel.style.top = topPanelPosition;
        topInfoPanel.style.left = '10px';
        topInfoPanel.style.display = 'flex';
        topInfoPanel.style.flexDirection = 'row';
        topInfoPanel.style.alignItems = 'center';
        topInfoPanel.style.gap = this.isMobileDevice ? '6px' : '10px';
        topInfoPanel.style.zIndex = '1001';
        topInfoPanel.style.transform = `scale(${topPanelScale})`;
        topInfoPanel.style.transformOrigin = 'top left';
        
        // Move the server info element (Online players) into our panel
        const serverInfo = document.getElementById('server-info');
        if (serverInfo) {
            // Detach from its current location
            serverInfo.parentNode.removeChild(serverInfo);
            
            // Style to match other elements
            serverInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            serverInfo.style.padding = this.isMobileDevice ? 
                (this.isSmallMobile ? '2px 4px' : '2px 5px') : '3px 6px';
            serverInfo.style.borderRadius = '3px';
            serverInfo.style.border = '1px solid #555';
            serverInfo.style.fontSize = this.isMobileDevice ? 
                (this.isSmallMobile ? '0.75em' : '0.8em') : '0.85em';
            
            // Add to our panel
            topInfoPanel.appendChild(serverInfo);
        } else {
            // Create placeholder if not found (shouldn't happen)
            const onlineDisplay = document.createElement('div');
            onlineDisplay.className = 'status-item-small';
            onlineDisplay.innerHTML = '<span class="status-label">ONLINE:</span> <span id="player-count" class="status-value">0</span>';
            this.styleStatusItemSmall(onlineDisplay, '#0af');
            topInfoPanel.appendChild(onlineDisplay);
        }
        
        // Score display
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'status-item-small';
        scoreDisplay.innerHTML = '<span class="status-label">SCORE:</span> <span id="score" class="status-value">0</span>';
        this.styleStatusItemSmall(scoreDisplay, '#fff');
        topInfoPanel.appendChild(scoreDisplay);
        
        // Credits display
        const creditsDisplay = document.createElement('div');
        creditsDisplay.className = 'status-item-small';
        creditsDisplay.innerHTML = '<span class="status-label">CREDITS:</span> <span id="credits" class="status-value">0</span>';
        this.styleStatusItemSmall(creditsDisplay, '#ff0');
        topInfoPanel.appendChild(creditsDisplay);
        
        // Bottom right - Minimap - SCALED DOWN
        const minimapContainer = document.createElement('div');
        minimapContainer.id = 'minimap-container';
        minimapContainer.style.position = 'absolute';
        minimapContainer.style.bottom = minimapMargin;
        minimapContainer.style.right = minimapMargin;
        minimapContainer.style.width = `${minimapSize}px`;
        minimapContainer.style.height = `${minimapSize}px`;
        minimapContainer.style.border = '1px solid #555';
        minimapContainer.style.borderRadius = '4px';
        minimapContainer.style.overflow = 'hidden';
        minimapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        minimapContainer.style.pointerEvents = 'auto';
        minimapContainer.style.zIndex = '1001';
        
        const minimapCanvas = document.createElement('canvas');
        minimapCanvas.id = 'minimap';
        minimapCanvas.width = minimapSize;
        minimapCanvas.height = minimapSize;
        minimapContainer.appendChild(minimapCanvas);

        // Add score and credits to info panel
        topInfoPanel.appendChild(scoreDisplay);
        topInfoPanel.appendChild(creditsDisplay);
        
        // BOTTOM LEFT - Player status indicators (Health, Weapon, etc.) - SCALED DOWN
        const statusPanel = document.createElement('div');
        statusPanel.id = 'status-panel';
        statusPanel.style.position = 'absolute';
        statusPanel.style.bottom = minimapMargin;
        statusPanel.style.left = minimapMargin;
        statusPanel.style.display = 'flex';
        statusPanel.style.flexDirection = 'column';
        statusPanel.style.gap = this.isMobileDevice ? '4px' : '6px';
        statusPanel.style.padding = statusPanelPadding;
        statusPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        statusPanel.style.borderRadius = '6px';
        statusPanel.style.border = '1px solid #444';
        statusPanel.style.boxShadow = '0 0 8px rgba(0, 100, 255, 0.5)';
        statusPanel.style.zIndex = '1001';
        statusPanel.style.pointerEvents = 'auto';
        statusPanel.style.transform = `scale(${statusPanelScale})`;
        statusPanel.style.transformOrigin = 'bottom left';
        
        // Health display
        const healthDisplay = document.createElement('div');
        healthDisplay.className = 'status-item';
        
        // Health bar - made more compact
        const healthBar = document.createElement('div');
        healthBar.style.width = '100%';
        healthBar.style.height = this.isMobileDevice ? '4px' : '6px';
        healthBar.style.backgroundColor = '#333';
        healthBar.style.borderRadius = '3px';
        healthBar.style.overflow = 'hidden';
        healthBar.style.marginTop = this.isMobileDevice ? '3px' : '4px';
        
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
        weaponIcon.style.fontSize = this.isMobileDevice ? '14px' : '16px';
        weaponIcon.style.marginLeft = this.isMobileDevice ? '6px' : '8px';
        weaponIcon.style.display = 'inline-block';
        weaponIcon.style.verticalAlign = 'middle';
        
        const weaponText = weaponDisplay.querySelector('#weapons');
        if (weaponText) {
            weaponText.parentNode.insertBefore(weaponIcon, weaponText.nextSibling);
        }
        
        this.styleStatusItem(weaponDisplay, '#ff3');
        
        // Energy display - for afterburner system
        const energyDisplay = document.createElement('div');
        energyDisplay.className = 'status-item';
        energyDisplay.innerHTML = '<span class="status-label">ENERGY:</span> <span id="energy" class="status-value">100</span>';
        this.styleStatusItem(energyDisplay, '#f0f');
        
        // Energy bar - similar to health bar but purple
        const energyBar = document.createElement('div');
        energyBar.style.width = '100%';
        energyBar.style.height = this.isMobileDevice ? '4px' : '6px';
        energyBar.style.backgroundColor = '#333';
        energyBar.style.borderRadius = '3px';
        energyBar.style.overflow = 'hidden';
        energyBar.style.marginTop = this.isMobileDevice ? '3px' : '4px';
        
        const energyFill = document.createElement('div');
        energyFill.id = 'energy-fill';
        energyFill.style.width = '100%';
        energyFill.style.height = '100%';
        energyFill.style.backgroundColor = '#f0f';
        energyFill.style.transition = 'width 0.3s ease';
        
        energyBar.appendChild(energyFill);
        energyDisplay.appendChild(energyBar);
        
        // Add status items to panel
        statusPanel.appendChild(healthDisplay);
        statusPanel.appendChild(weaponDisplay);
        statusPanel.appendChild(energyDisplay);
        
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
        const fontSize = this.isMobileDevice ? (this.isSmallMobile ? '0.8em' : '0.85em') : '0.9em';
        const padding = this.isMobileDevice ? (this.isSmallMobile ? '4px 7px' : '5px 8px') : '6px 10px';
        
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = padding;
        element.style.borderRadius = '4px';
        element.style.border = '1px solid #555';
        element.style.color = 'white';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontSize = fontSize;
        
        const label = element.querySelector('.status-label');
        if (label) {
            label.style.color = color;
            label.style.fontWeight = 'bold';
            label.style.marginRight = this.isMobileDevice ? '3px' : '4px';
        }
        
        const value = element.querySelector('.status-value');
        if (value) {
            value.style.fontWeight = 'bold';
        }
    }
    
    styleStatusItemSmall(element, color) {
        const fontSize = this.isMobileDevice ? (this.isSmallMobile ? '0.75em' : '0.8em') : '0.85em';
        const padding = this.isMobileDevice ? (this.isSmallMobile ? '2px 4px' : '2px 5px') : '3px 6px';
        
        element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        element.style.padding = padding;
        element.style.borderRadius = '3px';
        element.style.border = '1px solid #555';
        element.style.color = 'white';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontSize = fontSize;
        
        const label = element.querySelector('.status-label');
        if (label) {
            label.style.color = color;
            label.style.fontWeight = 'bold';
            label.style.marginRight = this.isMobileDevice ? '1px' : '2px';
        }
        
        const value = element.querySelector('.status-value');
        if (value) {
            value.style.fontWeight = 'bold';
        }
    }
    
    addShieldDisplay() {
        const statusPanel = document.getElementById('status-panel');
        if (!statusPanel) return;
        
        // Create shield display wrapper
        const shieldDisplay = document.createElement('div');
        shieldDisplay.className = 'status-item';
        shieldDisplay.innerHTML = '<span class="status-label">SHIELD:</span> <span id="shield" class="status-value">0</span>';
        this.styleStatusItem(shieldDisplay, '#33f');
        
        // Create shield bar - similar to health bar but blue
        const shieldBar = document.createElement('div');
        shieldBar.style.width = '100%';
        shieldBar.style.height = this.isMobileDevice ? '4px' : '6px';
        shieldBar.style.backgroundColor = '#333';
        shieldBar.style.borderRadius = '3px';
        shieldBar.style.overflow = 'hidden';
        shieldBar.style.marginTop = this.isMobileDevice ? '3px' : '4px';
        
        const shieldFill = document.createElement('div');
        shieldFill.id = 'shield-fill';
        shieldFill.style.width = '100%';
        shieldFill.style.height = '100%';
        shieldFill.style.backgroundColor = '#33f';
        shieldFill.style.transition = 'width 0.3s ease';
        
        shieldBar.appendChild(shieldFill);
        shieldDisplay.appendChild(shieldBar);
        
        // Insert shield display BEFORE health display (so shields appear above health)
        const healthDisplay = statusPanel.querySelector('.status-item');
        if (healthDisplay) {
            statusPanel.insertBefore(shieldDisplay, healthDisplay);
        } else {
            statusPanel.appendChild(shieldDisplay);
        }
    }
    
    addEnergyDisplay() {
        const statusPanel = document.getElementById('status-panel');
        if (!statusPanel) return;
        
        // Create energy display wrapper
        const energyDisplay = document.createElement('div');
        energyDisplay.className = 'status-item';
        energyDisplay.innerHTML = '<span class="status-label">ENERGY:</span> <span id="energy" class="status-value">0</span>';
        this.styleStatusItem(energyDisplay, '#f0f');
        
        // Create energy bar - similar to health bar but purple
        const energyBar = document.createElement('div');
        energyBar.style.width = '100%';
        energyBar.style.height = this.isMobileDevice ? '4px' : '6px';
        energyBar.style.backgroundColor = '#333';
        energyBar.style.borderRadius = '3px';
        energyBar.style.overflow = 'hidden';
        energyBar.style.marginTop = this.isMobileDevice ? '3px' : '4px';
        
        const energyFill = document.createElement('div');
        energyFill.id = 'energy-fill';
        energyFill.style.width = '100%';
        energyFill.style.height = '100%';
        energyFill.style.backgroundColor = '#f0f';
        energyFill.style.transition = 'width 0.3s ease';
        
        energyBar.appendChild(energyFill);
        energyDisplay.appendChild(energyBar);
        
        // Add energy display after shield and health but before weapon
        const weaponDisplay = Array.from(statusPanel.querySelectorAll('.status-item')).find(
            item => item.innerHTML.includes('WEAPON:')
        );
        
        if (weaponDisplay) {
            statusPanel.insertBefore(energyDisplay, weaponDisplay);
        } else {
            statusPanel.appendChild(energyDisplay);
        }
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
        
        // Draw safe zone - now as a square since world.safeZone is a square
        if (world.safeZone) {
            const safeX = (world.safeZone.x + world.width/2) * scale;
            const safeY = (world.safeZone.y + world.height/2) * scale;
            const safeSize = world.safeZone.size * scale;
            
            // Draw safe zone fill with semi-transparent blue
            minimapCtx.fillStyle = 'rgb(255, 153, 0)';
            minimapCtx.fillRect(
                safeX - safeSize/2, 
                safeY - safeSize/2,
                safeSize,
                safeSize
            );
            
            // Draw pulsing border
            const pulseAmount = 0.6 + 0.4 * Math.sin(Date.now() / 500); // Subtle pulsing effect
            minimapCtx.strokeStyle = `rgba(255, 251, 0, ${pulseAmount})`;
            minimapCtx.lineWidth = 1.5;
            minimapCtx.strokeRect(
                safeX - safeSize/2, 
                safeY - safeSize/2,
                safeSize,
                safeSize
            );
            
            // Add "SAFE" text in the center of the safe zone
            minimapCtx.fillStyle = 'rgba(238, 255, 0, 0.8)';
            minimapCtx.font = '8px courier, monospace';
            minimapCtx.textAlign = 'center';
            minimapCtx.fillText('SAFE', safeX, safeY + 12);
        }
        
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
            minimapCtx.arc(x, y, this.isMobileDevice ? 1 : 1.5, 0, Math.PI * 2);
            minimapCtx.fill();
        });
        
        // Draw other players from multiplayer system
        // IMPORTANT: Use window.game.multiplayer instead of player.game.multiplayer
        if (window.game && window.game.multiplayer && window.game.multiplayer.players) {
            const otherPlayers = window.game.multiplayer.players;
            
            // Log players for debugging
            console.log("Players on minimap:", Object.keys(otherPlayers).length);
            
            // Draw each player on the minimap
            Object.values(otherPlayers).forEach(otherPlayer => {
                // Skip destroyed players and the current player
                if (otherPlayer.destroyed || (window.game.multiplayer.socket && otherPlayer.id === window.game.multiplayer.socket.id)) {
                    return;
                }
                
                // Convert player coords to minimap coords
                const px = (otherPlayer.x + world.width/2) * scale;
                const py = (otherPlayer.y + world.height/2) * scale;
                
                // Use player's ship color or default to red
                const playerColor = otherPlayer.color || '#f00';
                
                // Draw player dot
                minimapCtx.fillStyle = playerColor;
                minimapCtx.beginPath();
                minimapCtx.arc(px, py, this.isMobileDevice ? 2 : 2.5, 0, Math.PI * 2);
                minimapCtx.fill();
                
                // Draw direction indicator if rotation is available
                if (otherPlayer.rotation !== undefined) {
                    const dirLength = this.isMobileDevice ? 3 : 4;
                    minimapCtx.strokeStyle = playerColor;
                    minimapCtx.lineWidth = 1;
                    minimapCtx.beginPath();
                    minimapCtx.moveTo(px, py);
                    minimapCtx.lineTo(
                        px + Math.sin(otherPlayer.rotation) * dirLength,
                        py - Math.cos(otherPlayer.rotation) * dirLength
                    );
                    minimapCtx.stroke();
                }
            });
        }
        
        // Draw player (always draw last so it's on top)
        const playerX = (player.x + world.width/2) * scale;
        const playerY = (player.y + world.height/2) * scale;
        
        // Draw current player with a distinctive color and slightly larger dot
        minimapCtx.fillStyle = '#3af'; // Bright cyan-blue
        minimapCtx.beginPath();
        minimapCtx.arc(playerX, playerY, this.isMobileDevice ? 2.5 : 3, 0, Math.PI * 2);
        minimapCtx.fill();
        
        // Add direction indicator for player
        const dirLength = this.isMobileDevice ? 4 : 5;
        minimapCtx.strokeStyle = '#3af';
        minimapCtx.lineWidth = 1.5;
        minimapCtx.beginPath();
        minimapCtx.moveTo(playerX, playerY);
        minimapCtx.lineTo(
            playerX + Math.sin(player.rotation) * dirLength,
            playerY - Math.cos(player.rotation) * dirLength
        );
        minimapCtx.stroke();
        
        // Draw view area (visible area on main screen)
        const viewWidth = window.innerWidth * scale;
        const viewHeight = window.innerHeight * scale;
        
        minimapCtx.strokeStyle = 'rgba(51, 153, 255, 0.6)';
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
    
    // Update shield bar display based on current shield percentage
    updateShieldBar(currentShield, maxShield = 100) {
        const shieldFill = document.getElementById('shield-fill');
        const shieldValue = document.getElementById('shield');
        
        if (shieldFill && shieldValue) {
            const shieldPercentage = Math.max(0, Math.min(100, (currentShield / maxShield) * 100));
            shieldFill.style.width = `${shieldPercentage}%`;
            shieldValue.textContent = Math.round(currentShield);
            
            // Change opacity based on shield level for visual feedback
            const opacity = 0.7 + (shieldPercentage / 100) * 0.3;
            shieldFill.style.opacity = opacity;
            
            // Add pulsing effect when shields are low
            if (shieldPercentage < 30) {
                shieldFill.style.animation = 'shield-pulse 1s infinite';
                if (!shieldFill.style.animationName) {
                    // Create the animation if it doesn't exist
                    const style = document.createElement('style');
                    style.textContent = `
                        @keyframes shield-pulse {
                            0% { opacity: ${opacity * 0.7}; }
                            50% { opacity: ${opacity}; }
                            100% { opacity: ${opacity * 0.7}; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            } else {
                shieldFill.style.animation = 'none';
            }
        }
    }
    
    // Update energy bar display based on current energy percentage
    updateEnergyBar(currentEnergy, maxEnergy = 100) {
        const energyFill = document.getElementById('energy-fill');
        const energyValue = document.getElementById('energy');
        
        if (energyFill && energyValue) {
            const energyPercentage = Math.max(0, Math.min(100, (currentEnergy / maxEnergy) * 100));
            energyFill.style.width = `${energyPercentage}%`;
            energyValue.textContent = Math.round(currentEnergy);
            
            // Change color based on energy level
            if (energyPercentage > 60) {
                energyFill.style.backgroundColor = '#f0f'; // Full purple
            } else if (energyPercentage > 30) {
                energyFill.style.backgroundColor = '#d0d'; // Dimmer purple
            } else {
                energyFill.style.backgroundColor = '#a0a'; // Low purple
            }
        }
    }
}