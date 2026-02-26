/**
 * SuperSpace Cloud Sync System
 * Syncs localStorage data to cloud without changing existing game logic
 */

class CloudSyncService {
  // Clear all game-related localStorage keys except session/auth
  clearGameDataLocalStorage() {
    const preserveKeys = ['ss_auth_token', 'ss_username'];
    const includeKeys = [
      'credits',
      'playerCredits',
      'highScore',
      'settings',
      // Keep achievements out of the automatic clear list so we can merge notified state
      //'achievements',
      'playerName',
      'selectedAvatar',
      'selectedShip',
      'unlocked_ships',
      'unlocked_avatars',
      'game_settings',
      'volume_settings',
      'upgrades_purchased',
      'premium_status',
      'pendingPayment',
      'premiumPurchases',
      'adminKey',
      'playerStats',
      'challenge_state',
    ];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        !preserveKeys.includes(key) &&
        (key.startsWith('superspace_') ||
          key.startsWith('player_') ||
          key.startsWith('ss_') ||
          key.startsWith('upgrade_') ||
          key.startsWith('unlock_') ||
          key.startsWith('achievement_') ||
          key.startsWith('skill_') ||
          key.startsWith('weapon_') ||
          includeKeys.includes(key))
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    if (keysToRemove.length > 0) {
      console.log('🧹 Cleared local game data keys:', keysToRemove);
    }
  }
  constructor() {
    this.isLoggedIn = false;
    this.username = null;
    this.authToken = null;
    this.syncInProgress = false;
    this.lastSyncTime = 0;
    this.syncInterval = 30000; // Sync every 30 seconds
  this.serverUrl = window.SUPERSPACE_SERVER_URL || 'https://superspace-server-production.up.railway.app'; // Your server
    this.onDataSynced = null; // Callback for when data is synced
    this.onLoginStatusChanged = null; // Callback for when login status changes
    this.isValidated = false; // Track if the current session has been validated

    // Check if user is already logged in
    this.checkExistingLogin();

    // Ensure playtester entitlements are present for fresh/anonymous users
    try {
      if (typeof this.ensurePlaytesterEntitlements === 'function') {
        this.ensurePlaytesterEntitlements();
      }
    } catch (e) {
      console.warn('Error ensuring playtester entitlements in constructor:', e);
    }

    // Setup automatic syncing
    this.setupAutoSync();
  }

  // Check if user has existing login session
  checkExistingLogin() {
    const savedToken = localStorage.getItem('ss_auth_token');
    const savedUsername = localStorage.getItem('ss_username');

    if (savedToken && savedUsername) {
      this.authToken = savedToken;
      this.username = savedUsername;
      this.isLoggedIn = true;
      console.log('🔐 Found existing login session for:', savedUsername);

      // Notify UI of login status change
      this.notifyLoginStatusChanged();

      // Validate token and sync data
      this.validateTokenAndSync();
    }
  }

  // Create new account
  async createAccount(username, password) {
    try {
      const response = await fetch(`${this.serverUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Account created successfully!',
          recoveryKey: data.recoveryKey,
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          message: error.message || 'Failed to create account',
        };
      }
    } catch (error) {
      console.error('Account creation error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  // Login to existing account
  async login(username, password) {
    try {
      const response = await fetch(`${this.serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token;
        this.username = username;
        this.isLoggedIn = true;
        // Save login session
        localStorage.setItem('ss_auth_token', this.authToken);
        localStorage.setItem('ss_username', username);
        console.log('🔐 Logged in successfully as:', username);
        
        // Notify UI of login status change
        this.notifyLoginStatusChanged();
        
  // Download cloud data and merge with local
  // NOTE: don't clear local game data here — that would permanently
  // remove locally-purchased avatars/skins if the cloud copy is empty.
  // Instead, merge cloud data with local and prefer non-empty local
  // entitlements when appropriate (see mergeGameData below).
  await this.downloadAndMergeCloudData();
        // Ensure playtester entitlements are present even if cloud had no data
        try {
          if (typeof this.ensurePlaytesterEntitlements === 'function') this.ensurePlaytesterEntitlements();
        } catch (e) {
          console.warn('Error ensuring playtester entitlements after login:', e);
        }
        return { success: true, message: `Welcome back, ${username}!` };
      } else {
        const error = await response.json();
        return { success: false, message: error.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  // Logout and clear session
  logout() {
    // Upload final sync before logout
    if (this.isLoggedIn) {
      this.uploadLocalStorageToCloud();
    }

    this.isLoggedIn = false;
    this.username = null;
    this.authToken = null;

    // Clear saved session
    localStorage.removeItem('ss_auth_token');
    localStorage.removeItem('ss_username');

    // Notify UI of login status change
    this.notifyLoginStatusChanged();

    // --- Reset challenge state to local (non-cloud) state on logout ---
    if (window && window.challengeSystem && typeof window.challengeSystem.loadState === 'function') {
      window.challengeSystem.loadState();
      if (typeof window.challengeSystem.saveState === 'function') {
        window.challengeSystem.saveState();
      }
    }

    // Optionally, force UI update if needed (shop, challenge tab, etc)
    if (window && window.shop && typeof window.shop.updateShopContent === 'function') {
      window.shop.updateShopContent();
    }

    console.log('🔐 Logged out successfully, challenge state reset to local.');
  }

  // Upload current localStorage to cloud
  async uploadLocalStorageToCloud() {
    if (!this.isLoggedIn || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      // Collect all SuperSpace related localStorage data
      const gameData = this.collectGameData();

      const response = await fetch(`${this.serverUrl}/sync/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          gameData,
          timestamp: Date.now(),
        }),
      });

      if (response.ok) {
        this.lastSyncTime = Date.now();
        console.log('☁️ Data synced to cloud successfully');
      } else {
        console.error('Failed to sync to cloud:', response.status);
      }
    } catch (error) {
      console.error('Cloud sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Download cloud data and merge with local data
  async downloadAndMergeCloudData() {
    if (!this.isLoggedIn) return;

    try {
      const response = await fetch(`${this.serverUrl}/sync/download`, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (response.ok) {
        const cloudData = await response.json();

        if (cloudData.gameData) {
          // Merge cloud data with local data (cloud takes precedence for most things)
          this.mergeGameData(cloudData.gameData);
          console.log('☁️ Cloud data downloaded and merged');
        }
      }
    } catch (error) {
      console.error('Cloud download error:', error);
    }
  }

  // Collect all game-related localStorage data
  collectGameData() {
    const gameData = {};
    const includeKeys = [
      'credits',
      'playerCredits',
      'highScore',
      'settings',
      'achievements',
      'playerName',
      'selectedAvatar',
      'selectedShip',
      'unlocked_ships',
      'unlocked_avatars',
      'game_settings',
      'volume_settings',
      'upgrades_purchased',
      'premium_status',
      'pendingPayment',
      'premiumPurchases',
      'adminKey',
      'playerStats',
      'challenge_state',
    ];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key.startsWith('superspace_') ||
        key.startsWith('player_') ||
        key.startsWith('ss_') ||
        key.startsWith('upgrade_') ||
        key.startsWith('unlock_') ||
        key.startsWith('achievement_') ||
        key.startsWith('skill_') ||
        key.startsWith('weapon_') ||
        includeKeys.includes(key)
      ) {
        gameData[key] = localStorage.getItem(key);
      }
    }
    return gameData;
  }

  // Merge cloud data with local data
  mergeGameData(cloudData) {
    // If a forced reset of player stats is configured, do not restore playerStats from cloud
    let skipRestorePlayerStats = false;
    // Also optionally skip restoring ship appearance when resetShips is enabled
    let skipRestoreShipAppearance = false;
    try {
      if (typeof ResetConfig !== 'undefined' && ResetConfig.flags && ResetConfig.flags.resetPlayerStats) {
        skipRestorePlayerStats = true;
        console.log('☁️ Skipping playerStats restore due to ResetConfig.flags.resetPlayerStats');
      }
      if (typeof ResetConfig !== 'undefined' && ResetConfig.flags && ResetConfig.flags.resetShips) {
        skipRestoreShipAppearance = true;
        console.log('☁️ Skipping ship appearance restore due to ResetConfig.flags.resetShips');
      }
    } catch (e) {
      // ignore
    }
    for (const [key, value] of Object.entries(cloudData)) {
      // Skip auth tokens
      if (key.includes('auth_token') || key.includes('username')) {
        continue;
      }

  // For some keys, we might want to merge rather than overwrite
      if (key === 'credits' || key === 'playerCredits') {
        // Take the higher value for credits
        const localCredits = parseInt(localStorage.getItem(key) || '0');
        const cloudCredits = parseInt(value || '0');
        localStorage.setItem(
          key,
          Math.max(localCredits, cloudCredits).toString(),
        );
      } else if (key === 'highScore') {
        // Take the higher score
        const localScore = parseInt(localStorage.getItem('highScore') || '0');
        const cloudScore = parseInt(value || '0');
        localStorage.setItem(
          'highScore',
          Math.max(localScore, cloudScore).toString(),
        );
        } else {
          // Merge premium purchases safely so cloud won't wipe local purchases
          if (key === 'premiumPurchases') {
            try {
              const cloudObj = JSON.parse(value || '{}');
              const localRaw = localStorage.getItem('premiumPurchases');
              const localObj = localRaw ? JSON.parse(localRaw) : { avatars: [], skins: [], purchaseHistory: [] };

              const merged = {
                avatars: Array.from(new Set([...(localObj.avatars || []), ...(cloudObj.avatars || [])])),
                skins: Array.from(new Set([...(localObj.skins || []), ...(cloudObj.skins || [])])),
                purchaseHistory: (localObj.purchaseHistory || []).concat(cloudObj.purchaseHistory || []),
              };

              // Deduplicate purchaseHistory entries by JSON string
              const seen = new Set();
              merged.purchaseHistory = merged.purchaseHistory.filter((p) => {
                try {
                  const k = JSON.stringify(p);
                  if (seen.has(k)) return false;
                  seen.add(k);
                  return true;
                } catch (e) {
                  return true;
                }
              });

              localStorage.setItem('premiumPurchases', JSON.stringify(merged));
            } catch (e) {
              // Fallback to overwrite if parse fails
              localStorage.setItem(key, value);
            }
            continue;
          }

          // Merge legacy owned lists too (ownedAvatars / ownedSkins)
          if (key === 'ownedAvatars' || key === 'ownedSkins') {
            try {
              const cloudArr = JSON.parse(value || '[]');
              const localArr = JSON.parse(localStorage.getItem(key) || '[]');
              const mergedArr = Array.from(new Set([...(localArr || []), ...(cloudArr || [])]));
              localStorage.setItem(key, JSON.stringify(mergedArr));
            } catch (e) {
              // If parse fails, just write cloud value
              localStorage.setItem(key, value);
            }
            continue;
          }

          // If cloud is trying to set selectedShipSkin to 'none' but local has a selection,
          // prefer the local non-default selection to avoid clobbering the player's chosen skin.
          if (key === 'selectedShipSkin') {
            try {
              const localSel = localStorage.getItem('selectedShipSkin');
              if (localSel && localSel !== 'none') {
                // Keep local selection
                continue;
              }
            } catch (e) {
              // fall through to set cloud value
            }
          }
        // Special-case achievements: merge per-achievement fields to preserve notified flags
        if (key === 'achievements') {
          try {
            const cloudObj = JSON.parse(value || '{}');
            const localStr = localStorage.getItem('achievements');
            const localObj = localStr ? JSON.parse(localStr) : {};

            const merged = {};
            const ids = new Set([
              ...Object.keys(localObj || {}),
              ...Object.keys(cloudObj || {}),
            ]);

            ids.forEach((id) => {
              const l = localObj[id] || {};
              const c = cloudObj[id] || {};

              const progressL = parseInt(l.progress || 0, 10) || 0;
              const progressC = parseInt(c.progress || 0, 10) || 0;

              merged[id] = {
                progress: Math.max(progressL, progressC),
                unlocked: !!(l.unlocked || c.unlocked),
                // Preserve notified if either side has it true (don't accidentally clear)
                notified: !!(l.notified || c.notified),
              };
            });

            localStorage.setItem('achievements', JSON.stringify(merged));
          } catch (e) {
            console.warn('Failed to merge achievements from cloud:', e);
            // Fallback to overwrite if merge fails
            localStorage.setItem(key, value);
          }
        } else {
          // Respect reset override: playerStats and ship appearance
          if (skipRestorePlayerStats && key === 'playerStats') {
            // intentionally skip restoring playerStats from cloud
            continue;
          }
          if (skipRestoreShipAppearance && (key === 'selectedShipSkin' || key === 'playerShipColor' || key === 'selected_ship_skin')) {
            // intentionally skip restoring ship skin/color when ships were reset
            continue;
          }
          // For most other data, cloud takes precedence
          localStorage.setItem(key, value);
        }
      }
    }

    // Log the restored data for debugging
    console.log('☁️ Restored game data:', {
      playerCredits: localStorage.getItem('playerCredits'),
      playerName: localStorage.getItem('playerName'),
      selectedAvatar: localStorage.getItem('selectedAvatar'),
      selectedShip: localStorage.getItem('selectedShip'),
    });

    // Trigger callback if set
    if (this.onDataSynced && typeof this.onDataSynced === 'function') {
      setTimeout(() => this.onDataSynced(), 100); // Small delay to ensure localStorage is updated
    }
    // Ensure gifted playtester entitlements are present after merging cloud data
    try {
      if (typeof this.ensurePlaytesterEntitlements === 'function') {
        this.ensurePlaytesterEntitlements();
      }
    } catch (e) {
      console.warn('Error while ensuring playtester entitlements:', e);
    }
  }

  // Ensure playtester entitlements (granted to all players by default)
  ensurePlaytesterEntitlements() {
    try {
      const playAv = 'playtester_dummy';
      const playSkin = 'scout_playtester';

      const raw = localStorage.getItem('premiumPurchases');
      let purchases = { avatars: [], skins: [], purchaseHistory: [] };
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          purchases.avatars = Array.isArray(parsed.avatars) ? parsed.avatars : [];
          purchases.skins = Array.isArray(parsed.skins) ? parsed.skins : [];
          purchases.purchaseHistory = Array.isArray(parsed.purchaseHistory)
            ? parsed.purchaseHistory
            : Array.isArray(parsed.purchase_history)
            ? parsed.purchase_history
            : [];
          Object.assign(purchases, parsed);
        } catch (e) {
          // ignore parse errors, we'll overwrite
        }
      }

      let modified = false;
      if (!purchases.avatars.includes(playAv)) {
        purchases.avatars.push(playAv);
        purchases.purchaseHistory = purchases.purchaseHistory || [];
        purchases.purchaseHistory.push({ type: 'avatar', id: playAv, name: 'Playtester Dummy', cost: 0, currency: 'gift', timestamp: Date.now() });
        modified = true;
      }
      if (!purchases.skins.includes(playSkin)) {
        purchases.skins.push(playSkin);
        purchases.purchaseHistory = purchases.purchaseHistory || [];
        purchases.purchaseHistory.push({ type: 'skin', id: playSkin, name: 'Playtester Scout', cost: 0, currency: 'gift', timestamp: Date.now() });
        modified = true;
      }

      if (modified) {
        localStorage.setItem('premiumPurchases', JSON.stringify(purchases));
        // Also write legacy keys to keep other systems happy
        try {
          const ownedAv = JSON.parse(localStorage.getItem('ownedAvatars') || '[]');
          if (!ownedAv.includes(playAv)) {
            ownedAv.push(playAv);
            localStorage.setItem('ownedAvatars', JSON.stringify(ownedAv));
          }
        } catch (e) {}
        try {
          const ownedSk = JSON.parse(localStorage.getItem('ownedSkins') || '[]');
          if (!ownedSk.includes(playSkin)) {
            ownedSk.push(playSkin);
            localStorage.setItem('ownedSkins', JSON.stringify(ownedSk));
          }
        } catch (e) {}
        // Notify other systems if available
        if (typeof window !== 'undefined' && window.notifyNewShipSkin) {
          try { window.notifyNewShipSkin('scout_playtester'); } catch (e) {}
        }
        console.log('🎁 Playtester entitlements ensured (avatar + skin)');
        // If the player hasn't chosen a custom avatar yet, set the Test Dummy as their selected avatar
        try {
          const currentAvatar = localStorage.getItem('selectedAvatar');
          // Only override if no selection or default free avatar in use
          if (!currentAvatar || currentAvatar === 'han') {
            localStorage.setItem('selectedAvatar', playAv);
            // If avatar manager exists, update it immediately so UI reflects the new avatar
            try {
              if (window && window.avatarManagerInstance) {
                window.avatarManagerInstance.selectedAvatar = playAv;
                if (typeof window.avatarManagerInstance.drawProfileAvatar === 'function') {
                  window.avatarManagerInstance.drawProfileAvatar();
                }
                if (typeof window.avatarManagerInstance.onAvatarChange === 'function') {
                  try { window.avatarManagerInstance.onAvatarChange(playAv); } catch (e) { /* ignore */ }
                }
              }
            } catch (e) {
              /* ignore UI update errors */
            }

            // Also ensure the gifted playtester ship skin is selected for fresh players
            try {
              const curSelSkin = localStorage.getItem('selectedShipSkin');
              if (!curSelSkin || curSelSkin === 'none') {
                localStorage.setItem('selectedShipSkin', playSkin);
                if (window && window.game && window.game.shipSkins && typeof window.game.shipSkins.setActiveSkin === 'function') {
                  try { window.game.shipSkins.setActiveSkin('scout', playSkin); } catch (e) { /* ignore */ }
                }
              }
            } catch (e) {
              /* ignore */
            }

            // If user is logged in, trigger an immediate cloud upload to persist this selection
            try {
              if (this && this.isLoggedIn && typeof this.uploadLocalStorageToCloud === 'function') {
                this.uploadLocalStorageToCloud();
              }
            } catch (e) {
              /* ignore upload errors here; periodic sync will retry */
            }
          }
        } catch (e) {
          // ignore errors when trying to set selectedAvatar
        }
        }

        // Refresh in-memory premium and avatar systems so the gifted avatar appears unlocked immediately
        try {
          if (typeof window !== 'undefined') {
            // Refresh PremiumStore if available
            try {
              if (window.game && window.game.premiumStore) {
                const ps = window.game.premiumStore;
                ps.premiumPurchases = ps.loadPremiumPurchases ? ps.loadPremiumPurchases() : JSON.parse(localStorage.getItem('premiumPurchases') || '{}');
                if (typeof ps.updateOwnedStatus === 'function') ps.updateOwnedStatus();
                if (typeof ps.savePremiumPurchases === 'function') ps.savePremiumPurchases();
              }
            } catch (e) {
              console.warn('Failed to refresh PremiumStore after granting playtester entitlements', e);
            }

            // Refresh AvatarManager UI if present
            try {
              if (window.avatarManagerInstance) {
                if (typeof window.avatarManagerInstance.setupPremiumAvatars === 'function') window.avatarManagerInstance.setupPremiumAvatars();
                if (typeof window.avatarManagerInstance.drawAllAvatars === 'function') window.avatarManagerInstance.drawAllAvatars();
                if (typeof window.avatarManagerInstance.drawProfileAvatar === 'function') window.avatarManagerInstance.drawProfileAvatar();
              }
            } catch (e) {
              console.warn('Failed to refresh AvatarManager after granting playtester entitlements', e);
            }
          }
        } catch (e) {
          /* ignore refresh errors */
        }

    } catch (e) {
      console.warn('Failed to ensure playtester entitlements:', e);
    }
  }

  // Validate token and sync
  async validateTokenAndSync() {
    console.log('🔐 Validating authentication token...');
    try {
      const response = await fetch(`${this.serverUrl}/auth/validate`, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (response.ok) {
        // Token is valid, perform initial sync
        console.log('🔐 Token validated successfully');
        await this.downloadAndMergeCloudData();
        // Notify UI that validation is complete and we're still logged in
        // Ensure in-memory systems reflect new entitlements (helps incognito or lazy-initialized UI)
        try {
          if (window && window.game) {
            const ps = window.game.premiumStore;
            try {
              if (ps && typeof ps.loadPremiumPurchases === 'function') {
                ps.premiumPurchases = ps.loadPremiumPurchases();
                if (typeof ps.updateOwnedStatus === 'function') ps.updateOwnedStatus();
                if (typeof ps.savePremiumPurchases === 'function') ps.savePremiumPurchases();
              } else if (ps) {
                try {
                  ps.premiumPurchases = JSON.parse(localStorage.getItem('premiumPurchases') || '{}');
                } catch (e) {
                  ps.premiumPurchases = ps.premiumPurchases || { avatars: [], skins: [], purchaseHistory: [] };
                }
                if (typeof ps.updateOwnedStatus === 'function') ps.updateOwnedStatus();
              }

              // Ensure playtester skin selected if none set
              const curSelSkin = localStorage.getItem('selectedShipSkin');
              if (!curSelSkin || curSelSkin === 'none') {
                try {
                  localStorage.setItem('selectedShipSkin', playSkin);
                  if (window.game && window.game.shipSkins && typeof window.game.shipSkins.setActiveSkin === 'function') {
                    try { window.game.shipSkins.setActiveSkin('scout', playSkin); } catch (e) { /* ignore */ }
                  }
                } catch (e) { /* ignore */ }
              }

              if (typeof window.notifyNewShipSkin === 'function') {
                try { window.notifyNewShipSkin(playSkin); } catch (e) { /* ignore */ }
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }
        this.notifyLoginStatusChanged();
      } else {
        // Token is invalid, clear session
        console.log('🔐 Token validation failed, logging out');
        this.logout();
      }
    } catch (error) {
      console.error('🔐 Token validation error (network issue):', error);
      // On network error, assume we're still logged in but inform UI
      // This allows offline usage with cached credentials
      this.notifyLoginStatusChanged();
    }
  }

  // Setup automatic syncing
  setupAutoSync() {
    // Sync every 30 seconds if logged in
    setInterval(() => {
      if (this.isLoggedIn && !this.syncInProgress) {
        this.uploadLocalStorageToCloud();
      }
    }, this.syncInterval);

    // Sync when page is about to unload
    window.addEventListener('beforeunload', () => {
      if (this.isLoggedIn) {
        // Use sendBeacon for reliable sync on page unload
        const gameData = this.collectGameData();
        navigator.sendBeacon(
          `${this.serverUrl}/sync/upload`,
          JSON.stringify({
            token: this.authToken,
            gameData,
            timestamp: Date.now(),
          }),
        );
      }
    });
  }

  // Reset password using recovery key
  async resetPasswordWithRecoveryKey(username, recoveryKey, newPassword) {
    try {
      const response = await fetch(
        `${this.serverUrl}/auth/reset-password-recovery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, recoveryKey, newPassword }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message || 'Password reset successfully!',
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          message: error.message || 'Failed to reset password',
        };
      }
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  // Get sync status for UI
  getSyncStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      username: this.username,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      isValidated: this.isValidated || false, // Track if token has been validated
    };
  }

  // Notify UI components when login status changes
  notifyLoginStatusChanged() {
    if (this.onLoginStatusChanged && typeof this.onLoginStatusChanged === 'function') {
      setTimeout(() => this.onLoginStatusChanged(), 10); // Small delay to ensure state is consistent
    }
  }
}

// Export for use in game
window.CloudSyncService = CloudSyncService;
