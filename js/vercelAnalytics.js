/**
/**
 * SuperSpace Vercel Analytics Integration
 * Clean, modern analytics using Vercel Analytics with comprehensive game metrics
 */

// Production mode flag - set to true to disable debug logging
const ANALYTICS_PRODUCTION_MODE = true;

class SuperSpaceAnalytics {
  constructor() {
    this.sessionStartTime = Date.now();
    this.playerId = this.getOrCreatePlayerId();
    this.sessionId = this.generateSessionId();
    this.isReturningPlayer = this.checkReturningPlayer();
    this.gameStartTime = null;
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.totalKills = 0;
    this.totalDeaths = 0;
    this.lastDeathTime = null;
    this.sessionEngaged = false; // Has player actually played (spawned/killed/died)
    this.pvpEngaged = false; // Has player fought (kill OR death)
    // Initialize tracking
    this.initializeTracking();
    if (!ANALYTICS_PRODUCTION_MODE) {
      console.log('SuperSpace Vercel Analytics initialized');
    }
  }

  // Utility Methods
  generateSessionId() {
    return (
      'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    );
  }

  getOrCreatePlayerId() {
    let playerId = localStorage.getItem('superspace_player_id');
    if (!playerId) {
      playerId =
        'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('superspace_player_id', playerId);
    }
    return playerId;
  }

  checkReturningPlayer() {
    const lastSession = localStorage.getItem('superspace_last_session');
    const isReturning = !!lastSession;
    localStorage.setItem('superspace_last_session', Date.now().toString());
    return isReturning;
  }

  track(eventName, properties = {}) {
    // Add common properties to all events
    const enrichedProperties = {
      ...properties,
      playerId: this.playerId,
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      isReturning: this.isReturningPlayer,
      timestamp: Date.now(),
    };

    // Try multiple Vercel Analytics methods
    if (typeof window.vercelTrack === 'function') {
      // Modern @vercel/analytics import method
      window.vercelTrack(eventName, enrichedProperties);
      console.log(`≡ƒÄ» VERCEL TRACK EVENT: ${eventName}`, enrichedProperties);
    } else if (typeof window.va === 'function') {
      // Legacy va method
      window.va('track', eventName, enrichedProperties);
      console.log(`≡ƒÄ» VERCEL VA EVENT: ${eventName}`, enrichedProperties);
    } else if (typeof window.gtag === 'function') {
      // Google Analytics fallback
      window.gtag('event', eventName, enrichedProperties);
      console.log(`≡ƒÄ» GTAG EVENT: ${eventName}`, enrichedProperties);
    } else {
      console.log(
        `≡ƒÄ» ANALYTICS DEBUG (no tracking available): ${eventName}`,
        enrichedProperties,
      );
    }

    // Also send to our custom analytics API as backup (silently)
    this.sendToCustomAnalytics(eventName, enrichedProperties);
  }

  // Backup analytics to our own endpoint
  async sendToCustomAnalytics(eventName, properties) {
    try {
      // Send to the Render server analytics endpoint instead of Vercel
      // Allow overriding analytics host in dev via global variable
      const analyticsHost = window.SUPERSPACE_ANALYTICS_HOST || window.location.origin;
      await fetch(analyticsHost + '/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventName,
          data: properties,
          timestamp: Date.now(),
          url: window.location.href,
        }),
      });
    } catch (e) {
      // Silently fail - this is backup tracking
    }
  }

  initializeTracking() {
    // Check for Vercel Analytics availability (disabled debug in production)
    if (!ANALYTICS_PRODUCTION_MODE) {
      console.log('🔍 Checking Vercel Analytics setup:');
      console.log('window.va available:', typeof window.va);
      console.log('window.gtag available:', typeof window.gtag);
      console.log('_vercel available:', typeof window._vercel);
    }

    // Track session start
    this.track('session_start', {
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      isReturning: this.isReturningPlayer,
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Commented out to reduce bandwidth: tab hidden events are not essential
        // this.track('tab_hidden');
      } else {
        this.track('tab_visible');
      }
    });

    // Track before page unload
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - this.sessionStartTime;
      const gameDuration = this.gameStartTime
        ? Date.now() - this.gameStartTime
        : 0;

      this.track('session_end', {
        sessionDuration,
        gameDuration,
        totalKills: this.totalKills,
        totalDeaths: this.totalDeaths,
        maxStreak: this.maxStreak,
        engaged: this.sessionEngaged,
        pvpEngaged: this.pvpEngaged,
      });
    });
  }

  // === CORE PLAYER LIFECYCLE ===

  trackPlayerSpawned(shipType = null) {
    this.sessionEngaged = true;
    if (!this.gameStartTime) {
      this.gameStartTime = Date.now();
      this.track('game_started', {
        shipType,
        timeToSpawn: Date.now() - this.sessionStartTime,
      });
    }

    this.track('player_spawned', { shipType });
  }

  trackPlayerDied(killerInfo = {}) {
    this.totalDeaths++;
    this.currentStreak = 0;
    this.pvpEngaged = true;
    this.lastDeathTime = Date.now();

    const survivalTime = this.gameStartTime
      ? Date.now() - this.gameStartTime
      : 0;

    this.track('player_died', {
      kills: this.totalKills,
      deaths: this.totalDeaths,
      timeAlive: survivalTime,
      maxStreak: this.maxStreak,
      killerType: killerInfo.type || 'unknown', // 'player', 'npc', 'environment'
      killerId: killerInfo.id || null,
      weapon: killerInfo.weapon || null,
    });

    // Check for rage quit (died within 30 seconds of spawning)
    if (survivalTime < 30000) {
      this.track('ragequit', {
        survivalTime,
        wasFirstDeath: this.totalDeaths === 1,
      });
    }
  }

  // === COMBAT & ENGAGEMENT ===

  trackKill(victimInfo = {}) {
    this.totalKills++;
    this.currentStreak++;
    this.maxStreak = Math.max(this.maxStreak, this.currentStreak);
    this.pvpEngaged = true;

    // Track first kill milestone
    if (this.totalKills === 1) {
      this.track('first_kill', {
        timeToFirstKill: this.gameStartTime
          ? Date.now() - this.gameStartTime
          : 0,
      });
    }

    this.track('player_kill', {
      totalKills: this.totalKills,
      currentStreak: this.currentStreak,
      victimType: victimInfo.type || 'unknown', // 'player', 'npc'
      victimId: victimInfo.id || null,
      weapon: victimInfo.weapon || null,
    });

    // Track kill streaks at milestones
    if ([3, 5, 10, 15, 20].includes(this.currentStreak)) {
      this.track('kill_streak', {
        kills: this.currentStreak,
        weapon: victimInfo.weapon,
      });
    }
  }

  trackWeaponFired(weaponName, targetType = null) {
    this.track('weapon_fired', {
      weapon: weaponName,
      targetType, // 'player', 'npc', null (missed)
      currentStreak: this.currentStreak,
    });
  }

  // === PROGRESSION & ECONOMY ===

  trackShipUpgraded(oldShip, newShip, cost = null) {
    this.track('ship_upgraded', {
      oldShip,
      newShip,
      cost,
      totalKills: this.totalKills,
    });
  }

  trackWeaponPurchased(weaponName, cost = null, currency = 'coins') {
    this.track('weapon_purchased', {
      weapon: weaponName,
      cost,
      currency,
      totalKills: this.totalKills,
    });
  }

  trackCoinsEarned(amount, source) {
    this.track('coins_earned', {
      amount,
      source, // 'kill', 'npc', 'bonus', 'daily'
      totalKills: this.totalKills,
    });
  }

  trackShopInteraction(action, item = null) {
    this.track('shop_interaction', {
      action, // 'opened', 'viewed_item', 'purchased', 'closed'
      item,
      sessionEngaged: this.sessionEngaged,
    });
  }

  // === SESSION QUALITY METRICS ===

  trackLongSession() {
    const sessionMinutes = Math.floor(
      (Date.now() - this.sessionStartTime) / 60000,
    );

    // Track at milestone intervals
    if ([5, 10, 15, 30, 60].includes(sessionMinutes)) {
      this.track('long_session', {
        minutes: sessionMinutes,
        kills: this.totalKills,
        deaths: this.totalDeaths,
        maxStreak: this.maxStreak,
      });
    }
  }

  trackPvpEngagement() {
    if (!this.pvpEngaged) {
      this.pvpEngaged = true;
      this.track('pvp_engagement', {
        timeToEngagement: Date.now() - this.sessionStartTime,
      });
    }
  }

  // === UI & FEATURE USAGE ===

  trackUIInteraction(element, action) {
    this.track('ui_interaction', {
      element, // 'chat', 'leaderboard', 'settings', 'help'
      action, // 'opened', 'closed', 'clicked', 'typed'
    });
  }

  trackChatMessage(messageLength = 0) {
    this.track('chat_message', {
      messageLength,
      sessionEngaged: this.sessionEngaged,
    });
  }

  trackSettingsChange(setting, value) {
    this.track('settings_change', {
      setting, // 'sound', 'graphics', 'controls'
      value,
    });
  }

  // === SOCIAL & MULTIPLAYER ===

  trackPlayerCount(count) {
    // Commented out to reduce bandwidth: frequent player count events are non-essential
    // this.track('concurrent_players', {
    //   count,
    //   isPeakHour: this.isPeakHour(),
    // });
  }

  trackServerConnection(status) {
    // Commented out to reduce bandwidth: server connection pings are non-essential
    // this.track('server_connection', {
    //   status, // 'connected', 'disconnected', 'error'
    //   sessionDuration: Date.now() - this.sessionStartTime,
    // });
  }

  // === ACHIEVEMENTS & CHALLENGES ===

  trackAchievement(achievementId) {
    this.track('achievement_unlocked', {
      achievementId,
      totalKills: this.totalKills,
      sessionDuration: Date.now() - this.sessionStartTime,
    });
  }

  trackChallenge(challengeId, progress, completed = false) {
    this.track('challenge_progress', {
      challengeId,
      progress,
      completed,
      totalKills: this.totalKills,
    });
  }

  // === UTILITY METHODS ===

  isPeakHour() {
    const hour = new Date().getHours();
    // Define peak hours (example: 7pm-11pm and 12pm-2pm)
    return (hour >= 19 && hour <= 23) || (hour >= 12 && hour <= 14);
  }

  trackError(errorType, errorMessage) {
    this.track('game_error', {
      errorType,
      errorMessage: errorMessage?.substring(0, 100), // Limit length
      sessionDuration: Date.now() - this.sessionStartTime,
    });
  }

  // === AUTO-TRACKING HELPERS ===

  startPeriodicTracking() {
    // Track session length milestones
    setInterval(() => {
      this.trackLongSession();
    }, 60000); // Check every minute

    // Track player count periodically (if available)
    setInterval(() => {
      if (window.players && typeof window.players === 'object') {
        const count = Object.keys(window.players).length;
        this.trackPlayerCount(count);
      }
    }, 30000); // Every 30 seconds
  }

  // === DEBUG METHODS ===

  getSessionStats() {
    return {
      sessionId: this.sessionId,
      playerId: this.playerId,
      sessionDuration: Date.now() - this.sessionStartTime,
      gameDuration: this.gameStartTime ? Date.now() - this.gameStartTime : 0,
      totalKills: this.totalKills,
      totalDeaths: this.totalDeaths,
      maxStreak: this.maxStreak,
      currentStreak: this.currentStreak,
      sessionEngaged: this.sessionEngaged,
      pvpEngaged: this.pvpEngaged,
      isReturning: this.isReturningPlayer,
    };
  }

  // Premium store and shopping analytics
  trackStoreVisit(storeType = 'premium_store') {
    this.track('store_visit', {
      storeType: storeType,
      sessionEngaged: this.sessionEngaged,
    });
  }

  trackPremiumPurchase(itemName, cost, currency = 'gems') {
    // Use different event types for gem spending vs real money revenue
    const eventType = currency === 'gems' ? 'gem_purchase' : 'revenue_purchase';

    this.track(eventType, {
      item: itemName,
      amount: cost,
      currency: currency,
      sessionEngaged: this.sessionEngaged,
    });
  }

  // New method specifically for PayPal gem purchases (real money)
  trackGemPurchase(gemAmount, realPrice, currency = 'USD') {
    this.track('revenue_purchase', {
      item: `${gemAmount} gems`,
      amount: realPrice,
      currency: currency,
      gemAmount: gemAmount,
      sessionEngaged: this.sessionEngaged,
    });
  }
}

// Initialize global analytics instance
window.analytics = new SuperSpaceAnalytics();

// Start periodic tracking
window.analytics.startPeriodicTracking();

// Debug access
window.analyticsDebug = {
  stats: () => window.analytics.getSessionStats(),
  track: (event, props) => window.analytics.track(event, props),
};

if (!ANALYTICS_PRODUCTION_MODE) {
  console.log('SuperSpace Vercel Analytics loaded');
}
