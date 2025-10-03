import { AvatarManager } from './avatarmanager.js';

export class UI {
  constructor() {
    this.isMobileDevice = window.innerWidth <= 768; // Check if mobile/tablet (screen width <= 768px)
    this.isSmallMobile = window.innerWidth <= 480; // Check if small mobile (screen width <= 480px)
    this.createHudElements();
    // Initially hide gameplay UI elements since we start at menu
    this.setGameplayUIVisibility(false);

    // Initialize Avatar Manager
    this.avatarManager = new AvatarManager();
    // Expose globally so other modules (notifyNewSkin) can call into it if needed
    try {
      window.avatarManagerInstance = this.avatarManager;
    } catch (e) {
      /* ignore */
    }

    // Set up avatar change callback to notify multiplayer
    this.avatarManager.onAvatarChange = (newAvatar) => {
      if (
        this.game &&
        this.game.multiplayer &&
        this.game.multiplayer.connected
      ) {
        this.game.multiplayer.broadcastStatsUpdate();
      }
    };

    // Add window resize listener to adjust UI when device orientation changes
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobileDevice;
      const wasSmallMobile = this.isSmallMobile;

      this.isMobileDevice = window.innerWidth <= 768;
      this.isSmallMobile = window.innerWidth <= 480;

      // Only recreate HUD if device category changed (mobile/tablet ↔ desktop or small mobile ↔ larger mobile)
      if (
        wasMobile !== this.isMobileDevice ||
        wasSmallMobile !== this.isSmallMobile
      ) {
        this.createHudElements();
      }
    });

    // --- Options/Instructions Overlay Logic ---
    this.optionsOverlay = document.getElementById('options-overlay');
    this.optionsBtn = document.getElementById('options-btn');
    this.closeOptionsBtn = document.getElementById('close-options-btn');
    this.musicToggle = document.getElementById('music-toggle');
    this.musicVolume = document.getElementById('music-volume');
    this.sfxVolume = document.getElementById('sfx-volume');

    // Show overlay from menu button
    if (this.optionsBtn) {
      this.optionsBtn.addEventListener('click', () =>
        this.showOptionsOverlay(),
      );
    }
    // Close overlay from close button
    if (this.closeOptionsBtn) {
      this.closeOptionsBtn.addEventListener('click', () =>
        this.hideOptionsOverlay(),
      );
    }
    // Escape toggles overlay
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (
          this.optionsOverlay &&
          this.optionsOverlay.classList.contains('hidden')
        ) {
          this.showOptionsOverlay();
        } else {
          this.hideOptionsOverlay();
        }
      }
    });
    // Music toggle
    if (this.musicToggle) {
      this.musicToggle.addEventListener('change', (e) => {
        if (window.game && window.game.soundManager) {
          window.game.soundManager.setMusicEnabled(e.target.checked);
        }
      });
    }
    // Music volume
    if (this.musicVolume) {
      this.musicVolume.addEventListener('input', (e) => {
        if (window.game && window.game.soundManager) {
          window.game.soundManager.setMusicVolume(parseFloat(e.target.value));
        }
      });
    }
    // SFX volume
    if (this.sfxVolume) {
      this.sfxVolume.addEventListener('input', (e) => {
        if (window.game && window.game.soundManager) {
          const vol = parseFloat(e.target.value);
          // Ensure audio context is resumed (user interaction requirement)
          try {
            if (window.game.soundManager && window.game.soundManager.resumeAudio) {
              window.game.soundManager.resumeAudio();
            }
          } catch (err) {
            /* ignore */
          }

          window.game.soundManager.setSfxVolume(vol);

          // Play a short sample (laser) so user can gauge loudness.
          // Throttle so rapid slider moves don't spawn many sounds.
          if (!this._lastSfxSample || Date.now() - this._lastSfxSample > 120) {
            this._lastSfxSample = Date.now();
            try {
              if (window.game && window.game.soundManager && window.game.soundManager.isSoundLoaded('laser')) {
                window.game.soundManager.play('laser', { volume: 0.9 });
              }
            } catch (err) {
              console.error('Error playing sfx sample:', err);
            }
          }
        }
      });
    }

    // --- Pilot Name and Rename Button Logic ---
    this.pilotNameSpan = document.getElementById('pilot-name');
    this.renameBtn = document.getElementById('rename-btn');
    // Set pilot name on overlay open
    this.showOptionsOverlay = () => {
      if (this.optionsOverlay) this.optionsOverlay.classList.remove('hidden');
      const menu = document.getElementById('menu');
      if (menu) menu.style.display = 'none';
      // Update pilot name
      let name = '(Unknown)';
      if (
        window.game &&
        window.game.multiplayer &&
        window.game.multiplayer.playerName
      ) {
        name = window.game.multiplayer.playerName;
      }
      if (this.pilotNameSpan) this.pilotNameSpan.textContent = name;
    };
    // Hide overlay and show menu
    this.hideOptionsOverlay = () => {
      if (this.optionsOverlay) this.optionsOverlay.classList.add('hidden');
      const menu = document.getElementById('menu');
      if (menu) menu.style.display = '';
    };
    // Rename button logic
    if (this.renameBtn) {
      this.renameBtn.onclick = () => {
        this.hideOptionsOverlay();
        if (
          window.game &&
          window.game.multiplayer &&
          window.game.multiplayer.showChangeNameUI
        ) {
          window.game.multiplayer.showChangeNameUI();
        }
      };
    }

    // Profile buttons logic
    const viewProfileBtn = document.getElementById('view-profile-btn');
    const viewAchievementsBtn = document.getElementById(
      'view-achievements-btn',
    );

    if (viewProfileBtn) {
      viewProfileBtn.onclick = () => {
        console.log('Profile button clicked');
        this.hideOptionsOverlay();
        if (window.game && window.game.playerProfile) {
          window.game.playerProfile.showProfile();
        } else {
          console.error('PlayerProfile system not available');
        }
      };
    }

    if (viewAchievementsBtn) {
      viewAchievementsBtn.onclick = () => {
        console.log('Achievements button clicked');
        this.hideOptionsOverlay();
        if (window.game && window.game.achievements) {
          window.game.achievements.showAchievements();
        } else {
          console.error('Achievements system not available');
        }
      };
    }
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

    // Determine appropriate scaling and positioning based on device size
    let topPanelScale = 0.85; // Default desktop scale
    let statusPanelScale = 0.85; // Default desktop scale
    let minimapSize = 120; // Default desktop size
    let statusPanelPadding = '10px';
    let minimapMargin = '15px';
    let topPanelPosition = '10px';
    let statusBottomPosition = '80px'; // Move status bar down from middle of screen to lower position

    // Apply additional scaling for mobile/tablet devices
    if (this.isMobileDevice) {
      topPanelScale = 0.8;
      statusPanelScale = 0.85;
      minimapSize = 90;
      statusPanelPadding = '8px';
      minimapMargin = '10px';
      topPanelPosition = '10px'; // KEEP ORIGINAL DESKTOP POSITION
      statusBottomPosition = '160px'; // Move up to avoid touch controls

      // Further adjustments for small mobile screens
      if (this.isSmallMobile) {
        topPanelScale = 0.75;
        statusPanelScale = 0.8;
        minimapSize = 80;
        statusPanelPadding = '6px';
        minimapMargin = '8px';
        topPanelPosition = '10px'; // KEEP ORIGINAL DESKTOP POSITION
        statusBottomPosition = '150px'; // Even higher for small screens
      }
    }

    // Create a unified top row panel for Online, Score, Credits, and Gems - ALL IN ONE ROW
    const topInfoPanel = document.createElement('div');
    topInfoPanel.id = 'top-info-panel';
    topInfoPanel.style.position = 'absolute';
    topInfoPanel.style.top = topPanelPosition;
    topInfoPanel.style.left = '100px'; // Tighter fit, just clears ONLINE button
    topInfoPanel.style.display = 'flex';
    topInfoPanel.style.flexDirection = 'row';
    topInfoPanel.style.alignItems = 'center';
    topInfoPanel.style.gap = this.isMobileDevice ? '6px' : '10px';
    topInfoPanel.style.zIndex = '1001';
    topInfoPanel.style.transform = `scale(${topPanelScale})`;
    topInfoPanel.style.transformOrigin = 'top left';

    // Hide the top right online player panel by default
    setTimeout(() => {
      const topRightPanel = document.getElementById('top-right-panel');
      if (topRightPanel) topRightPanel.style.display = 'none';
    }, 0);

    // Do NOT add redundant ONLINE label; rely on existing button/indicator in HTML

    // Score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'status-item-small';
    scoreDisplay.innerHTML =
      '<span class="status-label">SCORE:</span> <span id="score" class="status-value">0</span>';
    // restore horizontal spacing to avoid overlapping the Online indicator
  scoreDisplay.style.marginLeft = '3ch'; // restore spacing to match original layout
    scoreDisplay.style.marginTop = '0.5em';
    this.styleStatusItemSmall(scoreDisplay, '#fff');

    // Credits display
    const creditsDisplay = document.createElement('div');
    creditsDisplay.className = 'status-item-small';
    creditsDisplay.innerHTML =
      '<span class="status-label">CREDITS:</span> <span id="credits" class="status-value">0</span>';
    // vertical offset to align with score
  creditsDisplay.style.marginTop = '0.5em';
  creditsDisplay.style.marginLeft = '0.5ch';
    this.styleStatusItemSmall(creditsDisplay, '#ff0');

    // Check if multiplayer reset occurred and ensure credits display is correct
    if (this.game && this.game.multiplayer) {
      this.game.multiplayer.ensureCreditsReset();
    }

    // Bottom right - Minimap - positioned to avoid touch controls on mobile
    const minimapContainer = document.createElement('div');
    minimapContainer.id = 'minimap-container';
    minimapContainer.style.position = 'absolute';
    minimapContainer.style.bottom = this.isMobileDevice
      ? statusBottomPosition
      : minimapMargin;
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

    // Gem display (styled like credits, right of credits)
    const gemsDisplay = document.createElement('div');
    gemsDisplay.className = 'status-item-small';
    gemsDisplay.innerHTML =
      '<span class="status-label">GEMS:</span> <span id="gems" class="status-value">0</span>';
    gemsDisplay.style.marginTop = '0.5em';
    gemsDisplay.style.marginLeft = '0.5ch';
    this.styleStatusItemSmall(gemsDisplay, '#3cf');
    topInfoPanel.appendChild(gemsDisplay);

    // Live update gem count from premiumStore
    const updateGemsUI = () => {
      let gems = 0;
      if (window.game && window.game.premiumStore && typeof window.game.premiumStore.spaceGems === 'number') {
        gems = window.game.premiumStore.spaceGems;
      }
      const gemsEl = document.getElementById('gems');
      if (gemsEl) gemsEl.textContent = gems;
    };
    updateGemsUI();
    setInterval(updateGemsUI, 1000);

    // BOTTOM CENTER (Mobile/iPad) / BOTTOM LEFT (Desktop) - Player status indicators (Health, Weapon, etc.) - positioned to avoid touch controls
    const statusPanel = document.createElement('div');
    statusPanel.id = 'status-panel';
    statusPanel.style.position = 'absolute';
    statusPanel.style.bottom = this.isMobileDevice
      ? statusBottomPosition
      : minimapMargin;
    
    // Simple positioning: center on mobile/small screens, left on desktop
    if (window.innerWidth <= 768) {
      // Mobile/iPad: Center the status panel
      statusPanel.style.left = '50%';
      statusPanel.style.transform = `translateX(-50%) scale(${statusPanelScale})`;
      statusPanel.style.transformOrigin = 'bottom center';
    } else {
      // Desktop: Keep in bottom-left
      statusPanel.style.left = minimapMargin;
      statusPanel.style.transform = `scale(${statusPanelScale})`;
      statusPanel.style.transformOrigin = 'bottom left';
    }
    
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

    healthDisplay.innerHTML =
      '<span class="status-label">HEALTH:</span> <span id="health" class="status-value">100</span>';
    this.styleStatusItem(healthDisplay, '#3f3');
    healthDisplay.appendChild(healthBar);

    // Weapon display - made more compact
    const weaponDisplay = document.createElement('div');
    weaponDisplay.className = 'status-item';
    weaponDisplay.innerHTML =
      '<span class="status-label">WEAPON:</span> <span id="weapons" class="status-value">Disengaged</span>';

    // Weapon icon - made smaller with fixed width to prevent resizing
    const weaponIcon = document.createElement('div');
    weaponIcon.id = 'weapon-icon';
    weaponIcon.innerHTML = '❌'; // Default to disengaged icon
    weaponIcon.style.fontSize = this.isMobileDevice ? '12px' : '14px';
    weaponIcon.style.marginLeft = this.isMobileDevice ? '6px' : '8px';
    weaponIcon.style.display = 'inline-block';
    weaponIcon.style.verticalAlign = 'middle';
    weaponIcon.style.textShadow = '0 0 3px #f00';
    weaponIcon.style.width = '16px'; // Fixed width to accommodate largest weapon icon (Plasma Cannon 12px + some padding)
    weaponIcon.style.height = '16px'; // Fixed height
    weaponIcon.style.textAlign = 'center';
    weaponIcon.style.lineHeight = '16px';

    const weaponText = weaponDisplay.querySelector('#weapons');
    if (weaponText) {
      weaponText.parentNode.insertBefore(weaponIcon, weaponText.nextSibling);
    }

    this.styleStatusItem(weaponDisplay, '#ff3');

    // Energy display - for afterburner system
    const energyDisplay = document.createElement('div');
    energyDisplay.className = 'status-item';
    energyDisplay.innerHTML =
      '<span class="status-label">ENERGY:</span> <span id="energy" class="status-value">100</span>';
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

    // Add status items to panel in correct order: Health, Energy, Weapon
    statusPanel.appendChild(healthDisplay);
    statusPanel.appendChild(energyDisplay);
    statusPanel.appendChild(weaponDisplay);

    // Add panels to HUD
    hudContainer.appendChild(topInfoPanel);
    hudContainer.appendChild(statusPanel);
    hudContainer.appendChild(minimapContainer);

    // Create top right panel for Online Players
    const topRightPanel = document.createElement('div');
    topRightPanel.id = 'top-right-panel';
    topRightPanel.style.position = 'absolute';
    topRightPanel.style.top = topPanelPosition;
    topRightPanel.style.right = '10px';
    topRightPanel.style.display = 'flex';
    topRightPanel.style.flexDirection = 'row';
    topRightPanel.style.alignItems = 'center';
    topRightPanel.style.zIndex = '1001';
    topRightPanel.style.transform = `scale(${topPanelScale})`;
    topRightPanel.style.transformOrigin = 'top right';

    // Move the server info element (Online players) into the top right panel
    const serverInfo = document.getElementById('server-info');
    if (serverInfo) {
      // Detach from its current location if it exists somewhere else
      if (serverInfo.parentNode) {
        serverInfo.parentNode.removeChild(serverInfo);
      }
      // Style to match other elements
      serverInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      serverInfo.style.padding = this.isMobileDevice
        ? this.isSmallMobile
          ? '2px 4px'
          : '2px 5px'
        : '3px 6px';
      serverInfo.style.borderRadius = '3px';
      serverInfo.style.border = '1px solid #555';
      serverInfo.style.fontSize = this.isMobileDevice
        ? this.isSmallMobile
          ? '0.75em'
          : '0.8em'
        : '0.85em';
      serverInfo.style.color = 'white';
      serverInfo.style.fontFamily = "'Orbitron', 'Arial', sans-serif";
      serverInfo.style.fontWeight = '500';
      // Add to top right panel
      topRightPanel.appendChild(serverInfo);
    } else {
      // Create online display if server-info doesn't exist
      const onlineDisplay = document.createElement('div');
      onlineDisplay.className = 'status-item-small';
      onlineDisplay.innerHTML =
        '<span class="status-label">ONLINE:</span> <span id="player-count" class="status-value">0</span>';
      this.styleStatusItemSmall(onlineDisplay, '#0af');
      topRightPanel.appendChild(onlineDisplay);
    }

    hudContainer.appendChild(topRightPanel);

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
    const fontSize = this.isMobileDevice
      ? this.isSmallMobile
        ? '0.8em'
        : '0.85em'
      : '0.9em';
    const padding = this.isMobileDevice
      ? this.isSmallMobile
        ? '4px 7px'
        : '5px 8px'
      : '6px 10px';

    element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    element.style.padding = padding;
    element.style.borderRadius = '4px';
    element.style.border = '1px solid #555';
    element.style.color = 'white';
    element.style.fontFamily = "'Orbitron', 'Arial', sans-serif";
    element.style.fontWeight = '500';
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
    const fontSize = this.isMobileDevice
      ? this.isSmallMobile
        ? '0.75em'
        : '0.8em'
      : '0.85em';
    const padding = this.isMobileDevice
      ? this.isSmallMobile
        ? '2px 4px'
        : '2px 5px'
      : '3px 6px';

    element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    element.style.padding = padding;
    element.style.borderRadius = '3px';
    element.style.border = '1px solid #555';
    element.style.color = 'white';
    element.style.fontFamily = "'Orbitron', 'Arial', sans-serif";
    element.style.fontWeight = '500';
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
    shieldDisplay.innerHTML =
      '<span class="status-label">SHIELD:</span> <span id="shield" class="status-value">0</span>';
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
    energyDisplay.innerHTML =
      '<span class="status-label">ENERGY:</span> <span id="energy" class="status-value">0</span>';
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
    const weaponDisplay = Array.from(
      statusPanel.querySelectorAll('.status-item'),
    ).find((item) => item.innerHTML.includes('WEAPON:'));

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
    // Increase scale by 1.5x to zoom in minimap items, centered on world
    const ZOOM = 1.2;
    const baseScale = minimapCanvas.width / world.width;
    const scale = baseScale * ZOOM;

    // Save and transform context to keep minimap centered on world
    minimapCtx.save();
    // Center the world center in the minimap after scaling
    minimapCtx.translate(minimapCanvas.width / 2, minimapCanvas.height / 2);
    minimapCtx.scale(ZOOM, ZOOM);
    // Offset so that the world center is at the minimap center
    const worldCenterX = (world.width / 2) * scale;
    const worldCenterY = (world.height / 2) * scale;
    minimapCtx.translate(-worldCenterX, -worldCenterY);

    // Clear minimap
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    // Draw world boundary
    minimapCtx.strokeStyle = '#555';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    // Draw safe zone - now as a square since world.safeZone is a square
    if (world.safeZone) {
      const safeX = (world.safeZone.x + world.width / 2) * scale;
      const safeY = (world.safeZone.y + world.height / 2) * scale;
      const safeSize = world.safeZone.size * scale;

      // Draw safe zone fill with semi-transparent blue
      minimapCtx.fillStyle = 'rgb(255, 153, 0)';
      minimapCtx.fillRect(
        safeX - safeSize / 2,
        safeY - safeSize / 2,
        safeSize,
        safeSize,
      );

      // Draw pulsing border
      const pulseAmount = 0.6 + 0.4 * Math.sin(Date.now() / 500); // Subtle pulsing effect
      minimapCtx.strokeStyle = `rgba(255, 251, 0, ${pulseAmount})`;
      minimapCtx.lineWidth = 1.5;
      minimapCtx.strokeRect(
        safeX - safeSize / 2,
        safeY - safeSize / 2,
        safeSize,
        safeSize,
      );

      // Add "SAFE" text in the center of the safe zone
      minimapCtx.fillStyle = 'rgba(238, 255, 0, 0.8)';
      minimapCtx.font = '8px courier, monospace';
      minimapCtx.textAlign = 'center';
      minimapCtx.fillText('SAFE', safeX, safeY + 12);
    }

    // Draw asteroids
    minimapCtx.fillStyle = '#aaa';
    world.asteroids.forEach((asteroid) => {
      const x = (asteroid.x + world.width / 2) * scale;
      const y = (asteroid.y + world.height / 2) * scale;
      const radius = asteroid.radius * scale;
      minimapCtx.beginPath();
      minimapCtx.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
      minimapCtx.fill();
    });

    // Draw powerups
    world.powerups.forEach((powerup) => {
      const x = (powerup.x + world.width / 2) * scale;
      const y = (powerup.y + world.height / 2) * scale;
      let color;
      switch (powerup.type) {
        case 'health':
          color = '#0f0';
          break;
        case 'weapon':
          color = '#f00';
          break;
        case 'shield':
          color = '#00f';
          break;
        case 'energy':
          color = '#ff0';
          break;
        default:
          color = '#fff';
      }
      minimapCtx.fillStyle = color;
      minimapCtx.beginPath();
      minimapCtx.arc(x, y, this.isMobileDevice ? 1 : 1.5, 0, Math.PI * 2);
      minimapCtx.fill();
    });

    // Draw other players from multiplayer system
    // IMPORTANT: Use window.game.multiplayer instead of player.game.multiplayer
    if (
      window.game &&
      window.game.multiplayer &&
      window.game.multiplayer.players
    ) {
      const otherPlayers = window.game.multiplayer.players;
      // Draw each player on the minimap
      Object.values(otherPlayers).forEach((otherPlayer) => {
        // Skip destroyed players and the current player
        if (
          otherPlayer.destroyed ||
          (window.game.multiplayer.socket &&
            otherPlayer.id === window.game.multiplayer.socket.id)
        ) {
          return;
        }
        // Convert player coords to minimap coords
        const px = (otherPlayer.x + world.width / 2) * scale;
        const py = (otherPlayer.y + world.height / 2) * scale;
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
            py - Math.cos(otherPlayer.rotation) * dirLength,
          );
          minimapCtx.stroke();
        }
      });
    }

    // Draw NPCs on minimap
    if (window.game && window.game.npcManager && window.game.npcManager.npcs) {
      window.game.npcManager.npcs.forEach((npc) => {
        const nx = (npc.x + world.width / 2) * scale;
        const ny = (npc.y + world.height / 2) * scale;
        // Different colors for different NPC types
        let npcColor;
        switch (npc.type) {
          case 'alien_scout':
            npcColor = '#0f0'; // Green for aliens
            break;
          case 'dreadnaught':
            npcColor = '#f00'; // Red for dreadnaught
            break;
          default:
            npcColor = '#f80'; // Orange for other NPCs
        }
        minimapCtx.fillStyle = npcColor;
        minimapCtx.beginPath();
        const npcSize = npc.type === 'dreadnaught' ? 4 : 2; // Larger dot for boss
        minimapCtx.arc(
          nx,
          ny,
          this.isMobileDevice ? npcSize : npcSize + 0.5,
          0,
          Math.PI * 2,
        );
        minimapCtx.fill();
        // Add pulsing effect for dreadnaught
        if (npc.type === 'dreadnaught') {
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
          minimapCtx.strokeStyle = `rgba(255, 0, 0, ${pulse})`;
          minimapCtx.lineWidth = 2;
          minimapCtx.beginPath();
          minimapCtx.arc(nx, ny, 6, 0, Math.PI * 2);
          minimapCtx.stroke();
        }
      });
    }

    // Draw player (always draw last so it's on top)
    // Draw current player with a distinctive color and slightly larger dot
    const playerX = (player.x + world.width / 2) * scale;
    const playerY = (player.y + world.height / 2) * scale;
    minimapCtx.fillStyle = '#3af'; // Bright cyan-blue
    minimapCtx.beginPath();
    minimapCtx.arc(
      playerX,
      playerY,
      this.isMobileDevice ? 2.5 : 3,
      0,
      Math.PI * 2,
    );
    minimapCtx.fill();

    // Add direction indicator for player
    const dirLength = this.isMobileDevice ? 4 : 5;
    minimapCtx.strokeStyle = '#3af';
    minimapCtx.lineWidth = 1.5;
    minimapCtx.beginPath();
    minimapCtx.moveTo(playerX, playerY);
    minimapCtx.lineTo(
      playerX + Math.sin(player.rotation) * dirLength,
      playerY - Math.cos(player.rotation) * dirLength,
    );
    minimapCtx.stroke();

    // Removed blue view area rectangle from minimap
    minimapCtx.restore();
  }

  // Update health bar display based on current health percentage
  updateHealthBar(currentHealth, maxHealth = 100) {
    const healthFill = document.getElementById('health-fill');
    const healthValue = document.getElementById('health');

    if (healthFill && healthValue) {
      const healthPercentage = Math.max(
        0,
        Math.min(100, (currentHealth / maxHealth) * 100),
      );
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
      const shieldPercentage = Math.max(
        0,
        Math.min(100, (currentShield / maxShield) * 100),
      );
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
      const energyPercentage = Math.max(
        0,
        Math.min(100, (currentEnergy / maxEnergy) * 100),
      );
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

  // Update Impact Deflector status indicator
  updateImpactDeflectorIndicator(player) {
    // Create or update the deflector indicator in the UI
    let deflectorIndicator = document.getElementById('deflector-indicator');
    
    if (!deflectorIndicator) {
      // Create the indicator element if it doesn't exist
      deflectorIndicator = document.createElement('div');
      deflectorIndicator.id = 'deflector-indicator';
      deflectorIndicator.style.position = 'absolute';
  // Shifted down 40px originally; now nudged up 10px to sit better over status panel
  deflectorIndicator.style.top = this.isMobileDevice ? '85px' : '105px';
      deflectorIndicator.style.left = '10px';
      deflectorIndicator.style.padding = '4px 8px';
      deflectorIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      deflectorIndicator.style.border = '1px solid #0ff';
      deflectorIndicator.style.borderRadius = '4px';
      deflectorIndicator.style.color = '#0ff';
      deflectorIndicator.style.fontSize = this.isMobileDevice ? '10px' : '12px';
      deflectorIndicator.style.fontFamily = 'monospace';
      deflectorIndicator.style.display = 'none';
      deflectorIndicator.style.zIndex = '1000';
      document.body.appendChild(deflectorIndicator);
    }

    if (player.impactDeflector) {
      if (player.impactDeflector.active) {
        // Show active deflector with remaining time
        const timeLeft = Math.max(0, player.impactDeflector.remainingTime);
        deflectorIndicator.textContent = `DEFLECTOR: ${timeLeft.toFixed(1)}s`;
        // Position the indicator over the status panel (shield/health) when available
        const statusPanel = document.getElementById('status-panel');
        if (statusPanel) {
          const rect = statusPanel.getBoundingClientRect();
          // Ensure it's rendered so we can measure its height without flashing on-screen
          deflectorIndicator.style.display = 'block';
          deflectorIndicator.style.visibility = 'hidden';
          const popupRect = deflectorIndicator.getBoundingClientRect();
          const padding = 8; // gap between popup and status panel
          deflectorIndicator.style.left = `${Math.round(rect.left)}px`;
          // Place the indicator fully above the status panel
          deflectorIndicator.style.top = `${Math.round(rect.top - popupRect.height - padding)}px`;
          deflectorIndicator.style.visibility = 'visible';
        } else {
          // Fallback to previous top-left position if status panel not present
          deflectorIndicator.style.top = this.isMobileDevice ? '85px' : '105px';
          deflectorIndicator.style.left = '10px';
          deflectorIndicator.style.display = 'block';
        }
        deflectorIndicator.style.color = '#0ff';
        deflectorIndicator.style.borderColor = '#0ff';
      } else if (player.impactDeflector.cooldownRemaining > 0) {
        // Show cooldown remaining
        const cooldownLeft = Math.max(0, player.impactDeflector.cooldownRemaining);
        deflectorIndicator.textContent = `DEFLECTOR: ${cooldownLeft.toFixed(1)}s`;
        // Position the indicator over the status panel (shield/health) when available
        const statusPanel = document.getElementById('status-panel');
        if (statusPanel) {
          const rect = statusPanel.getBoundingClientRect();
          deflectorIndicator.style.display = 'block';
          deflectorIndicator.style.visibility = 'hidden';
          const popupRect = deflectorIndicator.getBoundingClientRect();
          const padding = 8;
          deflectorIndicator.style.left = `${Math.round(rect.left)}px`;
          deflectorIndicator.style.top = `${Math.round(rect.top - popupRect.height - padding)}px`;
          deflectorIndicator.style.visibility = 'visible';
        } else {
          deflectorIndicator.style.top = this.isMobileDevice ? '85px' : '105px';
          deflectorIndicator.style.left = '10px';
          deflectorIndicator.style.display = 'block';
        }
        deflectorIndicator.style.color = '#888';
        deflectorIndicator.style.borderColor = '#888';
      } else {
        // Ready to use - show ready indicator briefly or hide
        deflectorIndicator.style.display = 'none';
      }
    } else {
      deflectorIndicator.style.display = 'none';
    }
  }

  showOptionsOverlay() {
    if (this.optionsOverlay) {
      this.optionsOverlay.classList.remove('hidden');
      // Initialize avatar manager after showing overlay
      if (this.avatarManager) {
        setTimeout(() => {
          this.avatarManager.initialize();
        }, 50);
      }
      // Refresh tutorial toggle from storage
      if (this.tutorialToggle) {
        try {
          const stored = localStorage.getItem('tutorialEnabled');
          if (stored !== null) this.tutorialToggle.checked = stored === 'true';
        } catch (e) {
          // ignore
        }
      }
    }
  }
  hideOptionsOverlay() {
    if (this.optionsOverlay) this.optionsOverlay.classList.add('hidden');
  }

  // Ensure a central method exists to update the top-left credits display
  updateCreditsDisplay() {
    try {
      const creditsEl = document.getElementById('credits');
      if (creditsEl) {
        // Use the canonical player object if available
        const creditsVal = (window.game && window.game.player && typeof window.game.player.credits !== 'undefined') ? window.game.player.credits : (window.game && window.game.player ? window.game.player.credits : null);
        creditsEl.textContent = creditsVal !== null ? creditsVal : (window.shopSystem && shopSystem.player ? shopSystem.player.credits : '0');
      }
    } catch (e) {
      // ignore DOM errors
    }
  }

  // Render fire rate boost timer on canvas
  renderFireRateBoostTimer(ctx, player) {
    if (!player.fireRateBoosts || player.fireRateBoosts.length === 0) {
      return;
    }

    const currentTime = Date.now();
    let longestTimeLeft = 0;

    // Find the boost with the most time remaining
    for (let boost of player.fireRateBoosts) {
      const elapsed = currentTime - boost.startTime;
      const timeLeft = boost.duration - elapsed;
      if (timeLeft > longestTimeLeft) {
        longestTimeLeft = timeLeft;
      }
    }

    if (longestTimeLeft > 0) {
      const seconds = Math.ceil(longestTimeLeft / 1000);

      // Position timer near the health bar
      const x = 20;
      const y = 150;

      // Draw background
      ctx.fillStyle = 'rgba(255, 51, 51, 0.3)';
      ctx.fillRect(x - 5, y - 25, 120, 35);

      // Draw border
      ctx.strokeStyle = '#f33';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 5, y - 25, 120, 35);

      // Draw text
      ctx.fillStyle = '#f33';
      ctx.font = 'bold 14px Orbitron, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`FIRE BOOST: ${seconds}s`, x, y);
    }
  }
}
