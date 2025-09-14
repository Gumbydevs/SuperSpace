// Admin Tools System for SuperSpace
// Provides game administration and player management tools

export class AdminSystem {
  constructor() {
    this.isAdmin = false;
    this.adminKey = null; // Will be set from environment or config
    this.playerData = new Map();
    this.isAdminPanelOpen = false;

    // Check if user is admin (in production, this would use proper authentication)
    this.checkAdminStatus();
  }

  checkAdminStatus() {
    // For development - check localStorage for admin key
    // In production, this should be server-side authentication
    const adminKey = localStorage.getItem('adminKey');
    if (adminKey === 'superspace_dev_admin_2025') {
      this.isAdmin = true;
      this.setupAdminUI();
    }
  }

  // Allow setting admin key during development
  setAdminKey(key) {
    if (key === 'superspace_dev_admin_2025') {
      this.isAdmin = true;
      localStorage.setItem('adminKey', key);
      this.setupAdminUI();
      return true;
    }
    return false;
  }

  setupAdminUI() {
    if (!this.isAdmin) return;

    // Add admin button to the page
    const adminButton = document.createElement('button');
    adminButton.id = 'admin-toggle';
    adminButton.textContent = '⚙️ Admin';
    adminButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 120px;
            background: #f44;
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            z-index: 1600;
            font-family: 'Orbitron', 'Arial', sans-serif;
        `;

    adminButton.onclick = () => this.toggleAdminPanel();
    document.body.appendChild(adminButton);
  }

  createAdminPanel() {
    console.log('createAdminPanel started');

    // Remove existing admin panel if any
    const existingPanel = document.getElementById('admin-overlay');
    if (existingPanel) {
      console.log('Removing existing admin panel');
      existingPanel.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'admin-overlay';
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1500;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            overflow-y: auto;
            font-family: 'Orbitron', 'Arial', sans-serif;
        `;

    console.log('Created admin overlay element');

    const panel = document.createElement('div');
    panel.style.cssText = `
            background: linear-gradient(135deg, #2d1b69, #1a1a2e);
            border: 2px solid #ff4444;
            border-radius: 12px;
            width: 90%;
            max-width: 1000px;
            color: white;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.8);
            margin-top: 20px;
        `;

    // Admin panel header
    const header = document.createElement('div');
    header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #ff4444; font-size: 24px;">
                    ⚙️ SuperSpace Admin Panel
                </h2>
                <button id="close-admin" style="
                    background: #ff4444;
                    border: none;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                ">✕</button>
            </div>
            <div style="color: #ccc; margin-bottom: 20px; font-size: 14px;">
                Server management and player administration tools
            </div>
        `;

    panel.appendChild(header);

    // Tab navigation
    const tabs = document.createElement('div');
    tabs.style.cssText = `
            display: flex;
            border-bottom: 2px solid #ff4444;
            margin-bottom: 20px;
        `;

    const tabButtons = ['Players', 'Server', 'Statistics', 'Tools'];
    tabButtons.forEach((tabName, index) => {
      const tab = document.createElement('button');
      tab.textContent = tabName;
      tab.className = 'admin-tab';
      tab.dataset.tab = tabName.toLowerCase();
      tab.style.cssText = `
                background: ${index === 0 ? '#ff4444' : 'transparent'};
                border: none;
                color: white;
                padding: 10px 20px;
                cursor: pointer;
                border-radius: 4px 4px 0 0;
                margin-right: 5px;
                font-size: 14px;
            `;

      tab.onclick = () => this.switchAdminTab(tabName.toLowerCase());
      tabs.appendChild(tab);
    });

    panel.appendChild(tabs);

    // Tab content container
    const tabContent = document.createElement('div');
    tabContent.id = 'admin-tab-content';
    panel.appendChild(tabContent);

    overlay.appendChild(panel);
    console.log('About to append admin overlay to document.body');
    console.log('Overlay element:', overlay);
    console.log('Document body:', document.body);
    document.body.appendChild(overlay);
    console.log('Admin overlay added to DOM successfully');

    // Event listeners
    document.getElementById('close-admin').onclick = () =>
      this.closeAdminPanel();
    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeAdminPanel();
    };

    // ESC key to close
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeAdminPanel();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Load default tab
    this.switchAdminTab('players');
  }

  switchAdminTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach((tab) => {
      const isActive = tab.dataset.tab === tabName;
      tab.style.background = isActive ? '#ff4444' : 'transparent';
    });

    // Update tab content
    const content = document.getElementById('admin-tab-content');
    content.innerHTML = '';

    switch (tabName) {
      case 'players':
        this.renderPlayersTab(content);
        break;
      case 'server':
        this.renderServerTab(content);
        break;
      case 'statistics':
        this.renderStatisticsTab(content);
        break;
      case 'tools':
        this.renderToolsTab(content);
        break;
    }
  }

  renderPlayersTab(container) {
    const section = document.createElement('div');

    // Connected players
    const playersHeader = document.createElement('h3');
    playersHeader.textContent = '👥 Connected Players';
    playersHeader.style.color = '#ff4444';
    section.appendChild(playersHeader);

    // Get player data
    const players = this.getConnectedPlayers();

    if (players.length === 0) {
      section.innerHTML +=
        '<p style="color: #ccc;">No players currently connected.</p>';
    } else {
      const table = this.createPlayerTable(players);
      section.appendChild(table);
    }

    // Player management actions
    const actionsHeader = document.createElement('h3');
    actionsHeader.textContent = '🔧 Player Management';
    actionsHeader.style.cssText = 'color: #ff4444; margin-top: 30px;';
    section.appendChild(actionsHeader);

    const actionButtons = document.createElement('div');
    actionButtons.style.cssText =
      'display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;';

    const actions = [
      {
        text: 'Reset Challenges',
        action: () => {
          if (window.game && window.game.challengeSystem) {
            window.game.challengeSystem.resetDaily();
            window.game.challengeSystem.resetWeekly();
            window.game.challengeSystem.lastDailyReset = null;
            window.game.challengeSystem.lastWeeklyReset = null;
            if (window.game.shop) window.game.shop.updateShopContent();
            alert('All daily and weekly challenges have been reset!');
          } else {
            alert('Challenge system not available.');
          }
        },
        color: '#2a7',
      },
      {
        text: 'Reset All Player Stats',
        action: () => this.resetAllPlayerStats(),
        color: '#f44',
      },
      {
        text: 'Nuclear Reset (Everything)',
        action: () => this.nuclearReset(),
        color: '#800',
      },
      {
        text: 'Clear All Achievements',
        action: () => this.clearAllAchievements(),
        color: '#f84',
      },
      {
        text: 'Export Player Data',
        action: () => this.exportPlayerData(),
        color: '#48f',
      },
    ];

    actions.forEach((actionConfig) => {
      const button = document.createElement('button');
      button.textContent = actionConfig.text;
      button.style.cssText = `
                background: ${actionConfig.color};
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
      button.onclick = actionConfig.action;
      actionButtons.appendChild(button);
    });

    section.appendChild(actionButtons);
    container.appendChild(section);
  }

  renderServerTab(container) {
    const section = document.createElement('div');

    // Server status
    const statusHeader = document.createElement('h3');
    statusHeader.textContent = '🖥️ Server Status';
    statusHeader.style.color = '#ff4444';
    section.appendChild(statusHeader);

    const serverInfo = document.createElement('div');
    serverInfo.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
        `;

    const serverStatus = this.getServerStatus();
    serverInfo.innerHTML = `
            <div style="margin-bottom: 10px;"><strong>Connection:</strong> ${serverStatus.connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
            <div style="margin-bottom: 10px;"><strong>Players Online:</strong> ${serverStatus.playerCount}</div>
            <div style="margin-bottom: 10px;"><strong>Server URL:</strong> ${serverStatus.serverUrl}</div>
            <div style="margin-bottom: 10px;"><strong>Game Version:</strong> 1.0.0</div>
        `;

    section.appendChild(serverInfo);

    // Server actions
    const actionsHeader = document.createElement('h3');
    actionsHeader.textContent = '⚡ Server Actions';
    actionsHeader.style.cssText = 'color: #ff4444; margin-top: 30px;';
    section.appendChild(actionsHeader);

    const actionButtons = document.createElement('div');
    actionButtons.style.cssText =
      'display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;';

    const serverActions = [
      {
        text: 'Restart Server',
        action: () => this.restartServer(),
        color: '#f44',
      },
      {
        text: 'Clear Server Cache',
        action: () => this.clearServerCache(),
        color: '#f84',
      },
      {
        text: 'Broadcast Message',
        action: () => this.showBroadcastDialog(),
        color: '#4f4',
      },
    ];

    serverActions.forEach((actionConfig) => {
      const button = document.createElement('button');
      button.textContent = actionConfig.text;
      button.style.cssText = `
                background: ${actionConfig.color};
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
      button.onclick = actionConfig.action;
      actionButtons.appendChild(button);
    });

    section.appendChild(actionButtons);
    container.appendChild(section);
  }

  renderStatisticsTab(container) {
    const section = document.createElement('div');

    const statsHeader = document.createElement('h3');
    statsHeader.textContent = '📊 Game Statistics';
    statsHeader.style.color = '#ff4444';
    section.appendChild(statsHeader);

    const stats = this.getGameStatistics();

    const statsGrid = document.createElement('div');
    statsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 15px;
        `;

    Object.entries(stats).forEach(([category, data]) => {
      const card = document.createElement('div');
      card.style.cssText = `
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            `;

      let content = `<h4 style="color: #ff4444; margin: 0 0 10px 0;">${category}</h4>`;
      Object.entries(data).forEach(([key, value]) => {
        content += `<div style="margin: 5px 0; display: flex; justify-content: space-between;">
                    <span>${key}:</span>
                    <span style="font-weight: bold;">${value}</span>
                </div>`;
      });

      card.innerHTML = content;
      statsGrid.appendChild(card);
    });

    section.appendChild(statsGrid);
    container.appendChild(section);
  }

  renderToolsTab(container) {
    const section = document.createElement('div');

    const toolsHeader = document.createElement('h3');
    toolsHeader.textContent = '🛠️ Admin Tools';
    toolsHeader.style.color = '#ff4444';
    section.appendChild(toolsHeader);

    // Debug tools
    const debugSection = document.createElement('div');
    debugSection.innerHTML = `
            <h4 style="color: #4fc3f7; margin-top: 20px;">🐛 Debug Tools</h4>
            <div style="margin: 10px 0;">
                <button id="toggle-debug" style="background: #48f; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Toggle Debug Mode</button>
                <button id="show-console" style="background: #8f4; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Show Console</button>
                <button id="export-logs" style="background: #f84; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Export Logs</button>
            </div>
        `;

    // Game controls
    debugSection.innerHTML += `
            <h4 style="color: #4fc3f7; margin-top: 20px;">🎮 Game Controls</h4>
            <div style="margin: 10px 0;">
                <button id="spawn-powerups" style="background: #4f8; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Spawn Powerups</button>
                <button id="spawn-asteroids" style="background: #84f; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Spawn Asteroids</button>
                <button id="clear-world" style="background: #f48; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Clear World</button>
            </div>
        `;

    // NPC/Enemy tools
    debugSection.innerHTML += `
            <h4 style="color: #4fc3f7; margin-top: 20px;">👽 NPC & Enemy Controls</h4>
            <div style="margin: 10px 0;">
                <button id="spawn-dreadnaught" style="background: #f00; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">⚠️ SPAWN DREADNAUGHT</button>
                <button id="spawn-aliens" style="background: #0a4; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">👽 Spawn Aliens</button>
                <button id="clear-npcs" style="background: #844; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Clear All NPCs</button>
                <button id="emergency-npc-cleanup" style="background: #a44; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">🚨 Emergency NPC Cleanup</button>
            </div>
            
            <h4 style="color: #ffaa00; margin-top: 20px;">📅 Natural Dreadnaught Schedule</h4>
            <div style="margin: 10px 0;">
                <div id="dreadnaught-schedule-info" style="color: #ccc; font-size: 12px; margin-bottom: 10px; background: #1a1a1a; padding: 8px; border-radius: 4px;">
                    <em>Loading schedule info...</em>
                </div>
                <button id="check-dreadnaught-schedule" style="background: #555; border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px;">📊 Refresh Schedule</button>
                <button id="force-next-dreadnaught" style="background: #880; border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">⚡ Force Next Spawn</button>
            </div>
        `;

    // Player tools
    debugSection.innerHTML += `
            <h4 style="color: #4fc3f7; margin-top: 20px;">👤 Player Tools</h4>
            <div style="margin: 10px 0;">
                <input type="number" id="give-credits" placeholder="Credits amount" style="background: rgba(255,255,255,0.1); border: 1px solid #ccc; color: white; padding: 8px; border-radius: 4px; margin-right: 10px; width: 120px;">
                <button id="give-credits-btn" style="background: #f84; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Give Credits</button>
            </div>
            <div style="margin: 10px 0;">
                <input type="number" id="give-gems" placeholder="Gems amount" style="background: rgba(255,255,255,0.1); border: 1px solid #ccc; color: white; padding: 8px; border-radius: 4px; margin-right: 10px; width: 120px;">
                <button id="give-gems-btn" style="background: #FFD700; border: none; color: black; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px; font-weight: bold;">💎 Give Space Gems</button>
            </div>
            <div style="margin: 10px 0;">
                <button id="unlock-all-weapons" style="background: #8f4; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Unlock All Weapons</button>
                <button id="max-upgrades" style="background: #48f; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Max All Upgrades</button>
            </div>
        `;

    section.appendChild(debugSection);

    // Add event listeners for tool buttons
    section.addEventListener('click', (e) => {
      switch (e.target.id) {
        case 'toggle-debug':
          this.toggleDebugMode();
          break;
        case 'show-console':
          this.showConsole();
          break;
        case 'export-logs':
          this.exportLogs();
          break;
        case 'spawn-powerups':
          this.spawnPowerups();
          break;
        case 'spawn-asteroids':
          this.spawnAsteroids();
          break;
        case 'clear-world':
          this.clearWorld();
          break;
        case 'spawn-dreadnaught':
          this.spawnDreadnaught();
          break;
        case 'spawn-aliens':
          this.spawnAliens();
          break;
        case 'clear-npcs':
          this.clearNPCs();
          break;
        case 'emergency-npc-cleanup':
          this.emergencyNPCCleanup();
          break;
        case 'check-dreadnaught-schedule':
          this.checkDreadnaughtSchedule();
          break;
        case 'force-next-dreadnaught':
          this.forceNextDreadnaught();
          break;
        case 'give-credits-btn':
          this.giveCredits();
          break;
        case 'give-gems-btn':
          this.giveGems();
          break;
        case 'unlock-all-weapons':
          this.unlockAllWeapons();
          break;
        case 'max-upgrades':
          this.maxAllUpgrades();
          break;
      }
    });

    container.appendChild(section);
  }

  // Helper methods for admin functionality
  getConnectedPlayers() {
    const players = [];

    if (
      window.game &&
      window.game.multiplayer &&
      window.game.multiplayer.players
    ) {
      // Add local player
      players.push({
        id: 'local',
        name: window.game.multiplayer.playerName || 'Local Player',
        score: window.game.player?.score || 0,
        wins: window.game.player?.wins || 0,
        losses: window.game.player?.losses || 0,
        credits: window.game.player?.credits || 0,
        ship: window.game.player?.currentShip || 'scout',
        weapon: window.game.player?.currentWeapon || 'Basic Laser',
        health: window.game.player?.health || 100,
        isLocal: true,
      });

      // Add remote players
      Object.values(window.game.multiplayer.players).forEach((player) => {
        if (!player.destroyed) {
          players.push({
            id: player.id,
            name: player.name || 'Unknown',
            score: player.score || 0,
            wins: player.wins || 0,
            losses: player.losses || 0,
            credits: 'N/A', // Can't see other players' credits
            ship: player.currentShip || player.ship || 'scout',
            weapon: 'N/A', // Can't see other players' weapons
            health: player.health || 100,
            isLocal: false,
          });
        }
      });
    }

    return players;
  }

  createPlayerTable(players) {
    const table = document.createElement('table');
    table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            overflow: hidden;
            margin: 10px 0;
        `;

    // Header
    const header = document.createElement('tr');
    header.style.background = 'rgba(255, 255, 255, 0.1)';
    header.innerHTML = `
            <th style="padding: 10px; text-align: left; color: #ff4444;">Name</th>
            <th style="padding: 10px; text-align: center; color: #ff4444;">Score</th>
            <th style="padding: 10px; text-align: center; color: #ff4444;">W/L</th>
            <th style="padding: 10px; text-align: center; color: #ff4444;">Ship</th>
            <th style="padding: 10px; text-align: center; color: #ff4444;">Health</th>
            <th style="padding: 10px; text-align: center; color: #ff4444;">Actions</th>
        `;
    table.appendChild(header);

    // Player rows
    players.forEach((player) => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
      const nameStyle = player.isLocal
        ? 'color: #4f4; font-weight: bold;'
        : 'color: #fff;';
      let actionsHtml = '';
      if (player.isLocal) {
        actionsHtml =
          '<button onclick="window.admin.resetPlayerStats(\'' +
          player.id +
          '\')" style="background: #f44; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Reset</button>';
      } else {
        actionsHtml = `<button onclick=\"window.admin.kickPlayer('${player.id}')\" style=\"background: #f44; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;\">Kick</button>`;
      }
      row.innerHTML = `
                <td style="padding: 8px; ${nameStyle}">${player.name}</td>
                <td style="padding: 8px; text-align: center; color: #ccc;">${player.score.toLocaleString()}</td>
                <td style="padding: 8px; text-align: center; color: #ccc;">${player.wins}/${player.losses}</td>
                <td style="padding: 8px; text-align: center; color: #ccc;">${player.ship}</td>
                <td style="padding: 8px; text-align: center; color: ${player.health > 50 ? '#4f4' : '#f44'};">${player.health}</td>
                <td style="padding: 8px; text-align: center;">${actionsHtml}</td>
            `;
      table.appendChild(row);
    });
    return table;
  }

  // Kick a player by socket ID
  kickPlayer(playerId) {
    if (
      !window.game ||
      !window.game.multiplayer ||
      !window.game.multiplayer.socket
    )
      return;
    if (!confirm('Are you sure you want to kick this player?')) return;
    window.game.multiplayer.socket.emit('adminKickPlayer', {
      targetId: playerId,
    });
  }

  getServerStatus() {
    let connected = false;
    let playerCount = 1; // Local player
    let serverUrl = 'Local';

    if (window.game && window.game.multiplayer) {
      connected = window.game.multiplayer.connected;
      playerCount =
        Object.keys(window.game.multiplayer.players || {}).length + 1;

      if (window.location.hostname === 'localhost') {
        serverUrl = 'http://localhost:3000';
      } else {
        serverUrl = 'https://superspace-server.onrender.com';
      }
    }

    return { connected, playerCount, serverUrl };
  }

  getGameStatistics() {
    const stats = {
      'Player Stats': {
        'Total Players': this.getConnectedPlayers().length,
        'Active Games': 1,
        'Average Score': '0',
      },
      Economy: {
        'Total Credits': (window.game?.player?.credits || 0).toLocaleString(),
        'Weapons Owned': '1',
        'Upgrades Purchased': '0',
      },
      Combat: {
        'Total Kills': window.game?.player?.wins || 0,
        'Total Deaths': window.game?.player?.losses || 0,
        'Asteroids Destroyed': '0',
      },
    };

    return stats;
  }

  // Admin action methods
  resetAllPlayerStats() {
    if (
      confirm(
        'Are you sure you want to reset ALL player progression? This will reset:\n- Credits\n- Weapons\n- Upgrades\n- Ship purchases\n- Statistics\n- Achievements\n\nThis will NOT reset:\n- Player name\n- Avatar\n\nThis action cannot be undone.',
      )
    ) {
      console.log('Starting comprehensive player reset...');

      // Reset localStorage items (keep name and avatar)
      const playerName = localStorage.getItem('playerName');
      const selectedAvatar = localStorage.getItem('selectedAvatar');

      // Clear all progression data
      localStorage.removeItem('playerStats');
      localStorage.removeItem('achievements');
      localStorage.removeItem('playerCredits');

      // Clear all weapon purchases
      const weaponKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith('weapon_'),
      );
      weaponKeys.forEach((key) => localStorage.removeItem(key));

      // Clear all ship purchases
      const shipKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith('ship_'),
      );
      shipKeys.forEach((key) => localStorage.removeItem(key));

      // Clear all upgrades
      const upgradeKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith('upgrade_'),
      );
      upgradeKeys.forEach((key) => localStorage.removeItem(key));

      // Clear challenge state explicitly
      if (localStorage.getItem('challenge_state')) {
        localStorage.removeItem('challenge_state');
      }

      // Restore name and avatar
      if (playerName) localStorage.setItem('playerName', playerName);
      if (selectedAvatar)
        localStorage.setItem('selectedAvatar', selectedAvatar);

      // Reset the live game objects if available
      if (window.game) {
        // Reset player credits
        if (window.game.player) {
          window.game.player.credits = 0;
          window.game.player.weapons = ['Laser']; // Reset to default weapon
          window.game.player.currentWeapon = 'Laser';

          // Reset player stats but keep basic properties
          window.game.player.score = 0;
          window.game.player.wins = 0;
          window.game.player.losses = 0;

          // Reset ship to default
          window.game.player.shipType = 'default';

          // Reset upgrades to level 0
          // Restore sensible gameplay defaults (match Player constructor)
          window.game.player.maxSpeed = 400; // Default speed (pixels/sec)
          window.game.player.acceleration = 300; // Default acceleration (units/sec^2)
          window.game.player.maxHealth = 100; // Default health
          window.game.player.health = 100;
          window.game.player.maxEnergy = 100; // Default energy
          window.game.player.energy = 100;
          window.game.player.energyRegen = 1; // Default regen
          window.game.player.shieldCapacity = 0; // No shield by default
          window.game.player.shield = 0;
          window.game.player.damageReduction = 0; // No armor by default
          window.game.player.cargoCapacity = 10; // Default cargo
        }

        // Reset achievements system
        if (window.game.achievements) {
          window.game.achievements.loadProgress();
        }

        // Reset player profile
        if (window.game.playerProfile) {
          window.game.playerProfile.loadStats();
        }

        // Reset shop system
        if (window.game.shop) {
          window.game.shop.loadPurchases();
          window.game.shop.updateShopContent();
        }
      }

      alert(
        'All player progression has been reset! Player name and avatar were preserved.',
      );
      console.log('Player reset completed');

      // Ask if they want to reload the page to ensure everything is refreshed
      if (
        confirm(
          'Reset complete! Would you like to reload the page to ensure all changes take effect?',
        )
      ) {
        window.location.reload();
      }
    }
  }

  nuclearReset() {
    if (
      confirm(
        '⚠️ NUCLEAR RESET ⚠️\n\nThis will completely wipe ALL player data including:\n- Credits, weapons, upgrades, ships\n- Statistics and achievements\n- Player NAME and AVATAR\n\nEverything will be reset to first-time play state.\n\nThis action cannot be undone!\n\nAre you absolutely sure?',
      )
    ) {
      if (confirm('Last chance! This will delete EVERYTHING. Continue?')) {
        console.log('Starting nuclear reset...');

        // Clear ALL localStorage data related to the game
        const gameKeys = Object.keys(localStorage).filter(
          (key) =>
            key.startsWith('player') ||
            key.startsWith('weapon_') ||
            key.startsWith('ship_') ||
            key.startsWith('upgrade_') ||
            key === 'achievements' ||
            key === 'selectedAvatar',
        );

        gameKeys.forEach((key) => {
          console.log('Removing:', key);
          localStorage.removeItem(key);
        });

        // Also remove challenge_state if present
        if (localStorage.getItem('challenge_state')) {
          localStorage.removeItem('challenge_state');
        }

        alert(
          'Nuclear reset complete! All player data has been wiped. The page will now reload.',
        );
        window.location.reload();
      }
    }
  }

  clearAllAchievements() {
    if (confirm('Clear all achievement progress?')) {
      localStorage.removeItem('achievements');
      if (window.game && window.game.achievements) {
        window.game.achievements.loadProgress();
      }
      alert('All achievements have been cleared.');
    }
  }

  exportPlayerData() {
    const data = {
      stats: JSON.parse(localStorage.getItem('playerStats') || '{}'),
      achievements: JSON.parse(localStorage.getItem('achievements') || '{}'),
      credits: localStorage.getItem('playerCredits') || '0',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'superspace_player_data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  resetPlayerStats(playerId) {
    if (playerId === 'local') {
      if (confirm('Reset your player statistics?')) {
        if (window.game && window.game.player) {
          window.game.player.score = 0;
          window.game.player.wins = 0;
          window.game.player.losses = 0;
        }
        localStorage.removeItem('playerStats');
        alert('Your statistics have been reset.');
      }
    }
  }

  giveCredits() {
    const amount = parseInt(document.getElementById('give-credits').value);
    if (amount > 0 && window.game && window.game.player) {
      window.game.player.addCredits(amount);
      alert(`Gave ${amount} credits to player.`);
    }
  }

  giveGems() {
    const amount = parseInt(document.getElementById('give-gems').value);
    if (amount > 0 && window.game && window.game.premiumStore) {
      window.game.premiumStore.addSpaceGems(amount, 'admin_grant');
      alert(`Gave ${amount} Space Gems to player!`);

      // Clear the input field
      document.getElementById('give-gems').value = '';

      // Update premium store display if it's open
      if (window.game.premiumStore.isVisible) {
        window.game.premiumStore.render();
      }
    } else if (amount <= 0) {
      alert('Please enter a valid amount greater than 0');
    } else {
      alert('Premium store not available');
    }
  }

  unlockAllWeapons() {
    if (window.game && window.game.shop) {
      window.game.shop.availableWeapons.forEach((weapon) => {
        if (weapon.id !== 'laser') {
          weapon.owned = true;
          localStorage.setItem(`weapon_${weapon.id}`, 'true');
        }
      });
      window.game.shop.updateShopContent();
      alert('All weapons unlocked!');
    }
  }

  maxAllUpgrades() {
    if (window.game && window.game.shop) {
      window.game.shop.availableUpgrades.forEach((upgrade) => {
        upgrade.level = upgrade.maxLevel;
        localStorage.setItem(
          `upgrade_${upgrade.id}`,
          upgrade.maxLevel.toString(),
        );
      });
      window.game.shop.updateShopContent();
      window.game.shop.applyAllPurchasedUpgrades();
      alert('All upgrades maxed!');
    }
  }

  spawnPowerups() {
    if (window.game && window.game.world) {
      const powerups = window.game.world.generatePowerups(5);
      window.game.world.powerups.push(...powerups);
      alert('Spawned 5 powerups!');
    }
  }

  spawnAsteroids() {
    if (window.game && window.game.world) {
      const asteroids = window.game.world.generateAsteroids(10);
      window.game.world.asteroids.push(...asteroids);
      alert('Spawned 10 asteroids!');
    }
  }

  clearWorld() {
    if (window.game && window.game.world) {
      window.game.world.asteroids = [];
      window.game.world.powerups = [];
      alert('World cleared!');
    }
  }

  // NPC and Enemy Controls
  spawnDreadnaught() {
    if (window.game && window.npcManager) {
      if (window.npcManager.dreadnaughtActive) {
        alert('Dreadnaught already active! Only one can exist at a time.');
        return;
      }

      const dreadnaught = window.npcManager.spawnDreadnaught();
      if (dreadnaught) {
        alert('⚠️ DREADNAUGHT SPAWNED! Prepare for battle!');
      }
    } else {
      alert('NPC Manager not available!');
    }
  }

  spawnAliens() {
    if (window.game && window.npcManager && window.game.world) {
      // Spawn 3-5 aliens at random locations
      const count = 3 + Math.floor(Math.random() * 3);
      let spawned = 0;

      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * window.game.world.width;
        const y = (Math.random() - 0.5) * window.game.world.height;

        if (window.npcManager.spawnAlienFromAsteroid(x, y, true)) {
          // Force spawn
          spawned++;
        }
      }

      alert(`Spawned ${spawned} alien scouts!`);
    } else {
      alert('NPC Manager not available!');
    }
  }

  clearNPCs() {
    if (window.game && window.npcManager) {
      const npcCount = window.npcManager.getNPCCount();
      window.npcManager.clearAll();
      alert(`Cleared ${npcCount} NPCs!`);
    } else {
      alert('NPC Manager not available!');
    }
  }

  emergencyNPCCleanup() {
    if (window.game && window.npcManager) {
      window.npcManager.emergencyCleanup();
      alert('Emergency NPC cleanup performed! Check console for details.');
    } else {
      alert('NPC Manager not available!');
    }
  }

  checkDreadnaughtSchedule() {
    if (
      window.game &&
      window.game.multiplayer &&
      window.game.multiplayer.connected
    ) {
      console.log('Requesting dreadnaught schedule from server...');
      window.game.multiplayer.socket.emit('getDreadnaughtSchedule');
    } else {
      alert('Not connected to server!');
    }
  }

  forceNextDreadnaught() {
    if (
      window.game &&
      window.game.multiplayer &&
      window.game.multiplayer.connected
    ) {
      const confirmed = confirm(
        'Force the next natural dreadnaught spawn? This will trigger it within 30 seconds if conditions are met.',
      );
      if (confirmed) {
        window.game.multiplayer.socket.emit('forceNextDreadnaught');
      }
    } else {
      alert('Not connected to server!');
    }
  }

  toggleDebugMode() {
    window.debugMode = !window.debugMode;
    alert(`Debug mode ${window.debugMode ? 'enabled' : 'disabled'}`);
  }

  showConsole() {
    // Toggle console visibility (browser dev tools)
    alert('Press F12 to open browser console for detailed debug information.');
  }

  exportLogs() {
    const logs = {
      timestamp: new Date().toISOString(),
      gameState: window.game ? 'Running' : 'Not initialized',
      playerData: window.game?.player
        ? {
            score: window.game.player.score,
            health: window.game.player.health,
            credits: window.game.player.credits,
          }
        : null,
      browserInfo: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    };

    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'superspace_debug_logs.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleAdminPanel() {
    console.log(
      'toggleAdminPanel called, isAdmin:',
      this.isAdmin,
      'isAdminPanelOpen:',
      this.isAdminPanelOpen,
    );
    if (this.isAdminPanelOpen) {
      this.closeAdminPanel();
    } else {
      this.openAdminPanel();
    }
  }

  openAdminPanel() {
    console.log('openAdminPanel called, isAdmin:', this.isAdmin);
    if (!this.isAdmin) {
      console.log('Not admin, setting admin status to true for development');
      this.isAdmin = true; // For development, allow admin access
    }

    console.log('Creating admin panel...');
    this.isAdminPanelOpen = true;
    this.createAdminPanel();
  }

  closeAdminPanel() {
    const overlay = document.getElementById('admin-overlay');
    if (overlay) {
      document.body.removeChild(overlay);
    }
    this.isAdminPanelOpen = false;
  }
}

// Make admin system globally accessible
window.AdminSystem = AdminSystem;
