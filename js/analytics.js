/**
 * SuperSpace Analytics System
 * Client-side analytics that sends data to server for analysis
 */

class GameAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.playerId = this.getOrCreatePlayerId();
    this.playerIp = null; // Server will track this
    this.events = [];
    this.isEnabled = true;

    // Always connect analytics socket to the correct server
    this.socketAvailable = false;
    try {
      if (typeof io === 'function') {
        if (
          !window.socket ||
          !window.socket.io ||
          window.socket.io.uri !== 'https://superspace-server.onrender.com'
        ) {
          window.socket = io('https://superspace-server.onrender.com');
        }
        this.socketAvailable = !!(window.socket && window.socket.emit);
      } else {
        console.warn(
          'Analytics: Socket.IO client not found. Analytics will buffer locally only.',
        );
      }
    } catch (e) {
      console.warn('Analytics: failed to initialize socket:', e);
      this.socketAvailable = false;
    }

    // Session tracking
    this.gameStartTime = null;
    this.gameEndTime = null;
    this.currentGameSession = null;

    // Periodic stats
    this.statsInterval = null;
    this.lastStatsTime = Date.now();

    // Track user interactions
    this.setupEventListeners();

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    // Send session start
    this.trackSessionStart();
  }

  getOrCreatePlayerId() {
    try {
      let pid = localStorage.getItem('superspace_player_id');
      if (!pid) {
        pid =
          'player_' +
          Date.now() +
          '_' +
          Math.random().toString(36).substr(2, 9);
        try {
          localStorage.setItem('superspace_player_id', pid);
        } catch (e) {
          /* ignore */
        }
      }
      return pid;
    } catch (e) {
      // localStorage may be unavailable in some browsers/privacy modes
      return (
        'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      );
    }
  }

  generateSessionId() {
    return (
      'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    );
  }

  setPlayerId(id) {
    // Only set if not already set (persistent)
    if (!this.playerId) {
      this.playerId = id;
      localStorage.setItem('superspace_player_id', id);
    }
    this.trackEvent('player_identified', { playerId: this.playerId });
  }

  setupEventListeners() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('tab_hidden');
      } else {
        this.trackEvent('tab_visible');
      }
    });

    // Track when user leaves
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
    });
  }

  trackEvent(eventType, data = {}) {
    if (!this.isEnabled) return;

    const event = {
      sessionId: this.sessionId,
      playerId: this.playerId,
      eventType: eventType,
      timestamp: Date.now(),
      data: data,
    };

    // Send immediately to server via socket (guarded)
    if (
      this.socketAvailable &&
      window.socket &&
      typeof window.socket.emit === 'function'
    ) {
      try {
        window.socket.emit('analytics_event', event);
      } catch (e) {
        console.warn('Analytics: socket emit failed', e);
        this.socketAvailable = false;
      }
    }

    // Also store locally as backup
    try {
      this.events.push(event);
      // Keep only last 100 events in memory
      if (this.events.length > 100) {
        this.events = this.events.slice(-100);
      }
    } catch (e) {
      // ignore push errors
    }
  }

  trackSessionStart() {
    // Check if we recently sent a session_start to avoid duplicates on quick page refreshes
    const lastSessionStart = localStorage.getItem(
      'superspace_last_session_start',
    );
    const now = Date.now();

    // If last session start was less than 30 seconds ago, don't send another one
    if (lastSessionStart && now - parseInt(lastSessionStart) < 30000) {
      console.log('Skipping duplicate session_start - recent session detected');
      return;
    }

    // Store when we're sending this session_start
    try {
      localStorage.setItem('superspace_last_session_start', now.toString());
    } catch (e) {
      // Ignore localStorage errors
    }

    this.trackEvent('session_start', {
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    });
  }

  trackSessionEnd() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    this.trackEvent('session_end', {
      sessionDuration: sessionDuration,
      eventsCount: this.events.length,
    });

    // Clear the last session start timestamp since this session is ending
    try {
      localStorage.removeItem('superspace_last_session_start');
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  trackGameStart() {
    this.gameStartTime = Date.now();
    this.currentGameSession = {
      startTime: this.gameStartTime,
      kills: 0,
      deaths: 0,
      shotsFired: 0,
      damageDealt: 0,
      damageReceived: 0,
      coinsEarned: 0,
      experienceGained: 0,
      shipType: null,
      weaponsUsed: new Set(),
      achievementsUnlocked: [],
      challengesCompleted: [],
    };

    this.trackEvent('game_start');

    // Start periodic stats collection
    this.startStatsCollection();
  }

  trackGameEnd() {
    if (!this.currentGameSession) return;

    this.gameEndTime = Date.now();
    const gameDuration = this.gameEndTime - this.gameStartTime;

    const gameStats = {
      ...this.currentGameSession,
      endTime: this.gameEndTime,
      duration: gameDuration,
      weaponsUsed: Array.from(this.currentGameSession.weaponsUsed),
    };

    this.trackEvent('game_end', gameStats);
    this.stopStatsCollection();
    this.currentGameSession = null;
  }

  startStatsCollection() {
    this.statsInterval = setInterval(() => {
      this.collectPeriodicStats();
    }, 10000); // Every 10 seconds
  }

  stopStatsCollection() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  collectPeriodicStats() {
    if (!window.player || !this.currentGameSession) return;

    const stats = {
      position: { x: window.player.x, y: window.player.y },
      health: window.player.health,
      coins: window.player.coins,
      experience: window.player.experience,
      level: window.player.level,
      kills: window.player.kills,
      deaths: window.player.deaths,
      currentShip: window.player.shipType,
      playersNearby: this.countPlayersNearby(),
      npcsNearby: this.countNpcsNearby(),
    };

    this.trackEvent('periodic_stats', stats);
  }

  countPlayersNearby() {
    if (!window.players || !window.player) return 0;

    let count = 0;
    const nearbyDistance = 500; // pixels

    Object.values(window.players).forEach((otherPlayer) => {
      if (otherPlayer.id !== window.player.id) {
        const distance = Math.sqrt(
          Math.pow(otherPlayer.x - window.player.x, 2) +
            Math.pow(otherPlayer.y - window.player.y, 2),
        );
        if (distance <= nearbyDistance) {
          count++;
        }
      }
    });

    return count;
  }

  countNpcsNearby() {
    if (!window.npcs || !window.player) return 0;

    let count = 0;
    const nearbyDistance = 500; // pixels

    window.npcs.forEach((npc) => {
      const distance = Math.sqrt(
        Math.pow(npc.x - window.player.x, 2) +
          Math.pow(npc.y - window.player.y, 2),
      );
      if (distance <= nearbyDistance) {
        count++;
      }
    });

    return count;
  }

  // Specific game event tracking methods
  trackKill(victimId, weapon) {
    if (this.currentGameSession) {
      this.currentGameSession.kills++;
      if (weapon) this.currentGameSession.weaponsUsed.add(weapon);
    }

    this.trackEvent('player_kill', {
      victimId: victimId,
      weapon: weapon,
      position: window.player
        ? { x: window.player.x, y: window.player.y }
        : null,
    });
  }

  trackDeath(killerId, weapon) {
    if (this.currentGameSession) {
      this.currentGameSession.deaths++;
    }

    this.trackEvent('player_death', {
      killerId: killerId,
      weapon: weapon,
      position: window.player
        ? { x: window.player.x, y: window.player.y }
        : null,
    });
  }

  trackShipChange(oldShip, newShip) {
    if (this.currentGameSession) {
      this.currentGameSession.shipType = newShip;
    }

    this.trackEvent('ship_change', {
      oldShip: oldShip,
      newShip: newShip,
    });
  }

  trackWeaponFire(weapon, target) {
    if (this.currentGameSession) {
      this.currentGameSession.shotsFired++;
      if (weapon) this.currentGameSession.weaponsUsed.add(weapon);
    }

    this.trackEvent('weapon_fire', {
      weapon: weapon,
      target: target,
      position: window.player
        ? { x: window.player.x, y: window.player.y }
        : null,
    });
  }

  trackPurchase(item, cost, currency) {
    this.trackEvent('shop_purchase', {
      item: item,
      cost: cost,
      currency: currency,
      playerCoins: window.player ? window.player.coins : null,
    });
  }

  trackAchievement(achievementId) {
    if (this.currentGameSession) {
      this.currentGameSession.achievementsUnlocked.push(achievementId);
    }

    this.trackEvent('achievement_unlocked', {
      achievementId: achievementId,
    });
  }

  trackChallenge(challengeId, completed) {
    if (completed && this.currentGameSession) {
      this.currentGameSession.challengesCompleted.push(challengeId);
    }

    this.trackEvent('challenge_update', {
      challengeId: challengeId,
      completed: completed,
    });
  }

  trackUIInteraction(element, action) {
    this.trackEvent('ui_interaction', {
      element: element,
      action: action,
    });
  }

  sendHeartbeat() {
    this.trackEvent('heartbeat', {
      sessionDuration: Date.now() - this.sessionStartTime,
      gameActive: this.currentGameSession !== null,
    });
  }

  // Admin/Debug methods
  getSessionStats() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      eventsCount: this.events.length,
      currentGameSession: this.currentGameSession,
    };
  }

  exportData() {
    return {
      sessionId: this.sessionId,
      playerId: this.playerId,
      sessionStartTime: this.sessionStartTime,
      events: this.events,
      currentGameSession: this.currentGameSession,
    };
  }

  clearData() {
    this.events = [];
    console.log('Analytics data cleared');
  }

  disable() {
    this.isEnabled = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.stopStatsCollection();
    console.log('Analytics disabled');
  }

  enable() {
    this.isEnabled = true;
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
    console.log('Analytics enabled');
  }
}

// Initialize analytics when script loads
window.gameAnalytics = new GameAnalytics();

// Debug commands for console
window.analytics = {
  stats: () => window.gameAnalytics.getSessionStats(),
  export: () => window.gameAnalytics.exportData(),
  clear: () => window.gameAnalytics.clearData(),
  disable: () => window.gameAnalytics.disable(),
  enable: () => window.gameAnalytics.enable(),
};
