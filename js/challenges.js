// Defines daily and weekly challenges - REBALANCED for slower progression
import { MarvinAssistant } from './marvin.js';

export const CHALLENGES = {
  daily: [
    { id: 'survive_10', description: 'Survive for 10 minutes', reward: 500, gems: 2 },
    { id: 'destroy_200_asteroids', description: 'Destroy 200 asteroids', reward: 400, gems: 2 },
    { id: 'earn_1000_credits', description: 'Earn 1000 credits in one session', reward: 300, gems: 1 },
    { id: 'kill_10_enemies', description: 'Kill 10 enemy ships', reward: 350, gems: 2 },
    { id: 'collect_5_powerups', description: 'Collect 5 power-ups', reward: 250, gems: 1 },
    { id: 'no_damage_5', description: 'Survive 5 minutes without taking damage', reward: 400, gems: 2 },
    { id: 'use_3_bombs', description: 'Use 3 bombs in one game', reward: 200, gems: 1 },
    { id: 'spend_500_credits', description: 'Spend 500 credits in the shop', reward: 300, gems: 1 },
    { id: 'fly_10km', description: 'Travel 10 kilometers in one session', reward: 350, gems: 2 },
    { id: 'chat_1', description: 'Send a message in chat', reward: 100, gems: 1 },
    { id: 'equip_skin', description: 'Equip a new ship skin', reward: 150, gems: 1 },
    { id: 'evade_20_projectiles', description: 'Evade 20 enemy projectiles', reward: 250, gems: 1 },
  { id: 'upgrade_weapon', description: 'Upgrade your ship once', reward: 200, gems: 1 },
    { id: 'visit_sector_5', description: 'Visit sector 5', reward: 180, gems: 1 },
    { id: 'scan_3_artifacts', description: 'Scan 3 space artifacts', reward: 220, gems: 1 },
    { id: 'destroy_boss', description: 'Defeat a boss ship', reward: 500, gems: 3 },
    { id: 'collect_10_powerups', description: 'Collect 10 power-ups in one day', reward: 300, gems: 2 },
    { id: 'activate_shield', description: 'Activate your shield 3 times', reward: 180, gems: 1 },
  ],
  weekly: [
    { id: 'score_50000', description: 'Score 50,000 points in one game', reward: 1500, gems: 6 },
    { id: 'kill_25_enemies', description: 'Kill 25 enemy ships', reward: 1200, gems: 5 },
    { id: 'play_20_games', description: 'Play 20 games this week', reward: 800, gems: 4 },
    { id: 'destroy_1000_asteroids', description: 'Destroy 1,000 asteroids', reward: 1100, gems: 5 },
    { id: 'earn_10000_credits', description: 'Earn 10,000 credits this week', reward: 1000, gems: 4 },
  // { id: 'top_scorer_10min', description: 'Be the top scorer in a 10-minute period', reward: 2000, gems: 8 }, // Disabled: not supported
    { id: 'no_death_3_games', description: 'Complete 3 games in a row without dying', reward: 1800, gems: 7 },
    { id: 'buy_3_items', description: 'Buy 3 different items from the shop', reward: 900, gems: 4 },
    { id: 'explore_50km', description: 'Travel a total of 50 kilometers', reward: 1200, gems: 5 },
    { id: 'defeat_5_bosses', description: 'Defeat 5 boss ships', reward: 2200, gems: 10 },
    { id: 'collect_10_gems', description: 'Collect 10 rare space gems', reward: 1300, gems: 6 },
    { id: 'upgrade_5_times', description: 'Upgrade your ship 5 times', reward: 1100, gems: 4 },
    { id: 'scan_15_artifacts', description: 'Scan 15 space artifacts', reward: 1400, gems: 5 },
    { id: 'evade_100_projectiles', description: 'Evade 100 enemy projectiles', reward: 1200, gems: 5 },
  ],
};

// Challenge manager for tracking progress, notifications, and resets
export class ChallengeSystem {
  /**
   * @param {object} player - Player instance (for current score and credits)
   * @param {object} profile - PlayerProfile instance (for persistent stats)
   */
  constructor(player, profile) {
    this.player = player;
    this.profile = profile;

    // completed now means completed (may be unclaimed). claimed tracks those already claimed
    this.completed = { daily: [], weekly: [] };
    this.claimed = { daily: [], weekly: [] };
    // notified tracks whether we've shown the on-screen popup for a completed challenge
    this.notified = { daily: [], weekly: [] };
    // sessionNotified ensures we show the popup at least once during the current page session
    this.sessionNotified = { daily: [], weekly: [] };

    // Track last reset markers so we can reset challenges at configured times (Eastern)
    this.lastDailyReset = null; // e.g. '2025-09-08'
    this.lastWeeklyReset = null; // e.g. '2025-W36'

    // Timer to periodically re-evaluate reset boundaries
    this._resetTimer = null;

    // Make sure Marvin is available
    if (!window.marvinAssistant) {
      window.marvinAssistant = new MarvinAssistant();
    }

    // load persisted state if available
    this.loadState();

    // Ensure resets are performed if needed now and schedule periodic checks
    try {
      this.performResetsIfNeeded();
      this.scheduleNextResets();
    } catch (e) {
      // ignore scheduling errors in non-browser contexts
    }
  }

  check(challengeType) {
    // Ensure profile stats are available
    if (!this.profile || !this.profile.stats) return;
  // Only allow progress for current daily/weekly challenges
  let allowedIds = challengeType === 'daily' ? this.currentDaily : this.currentWeekly;
  if (!Array.isArray(allowedIds)) allowedIds = [];
  const list = (CHALLENGES[challengeType] || []).filter((ch) => allowedIds.includes(ch.id));
  list.forEach((ch) => {
      // Allow showing a popup this session even if the challenge was completed in a previous session.
      const alreadyCompleted = (this.completed[challengeType] || []).includes(
        ch.id,
      );

      let done = false;
      switch (ch.id) {
        // Daily
        case 'survive_10':
          done = this.profile.stats.longestSurvival >= 600;
          break;
        case 'destroy_200_asteroids':
          done = this.profile.stats.asteroidsDestroyed >= 200;
          break;
        case 'earn_1000_credits':
          done = this.profile.stats.totalCreditsEarned >= 1000;
          break;
        case 'kill_10_enemies':
          done = this.profile.stats.totalKills >= 10;
          break;
        case 'collect_5_powerups':
          done = this.profile.stats.powerupsCollected >= 5;
          break;
        case 'no_damage_5':
          done = this.profile.stats.noDamageSurvival >= 300;
          break;
        case 'use_3_bombs':
          done = this.profile.stats.bombsUsed >= 3;
          break;
        case 'spend_500_credits':
          done = this.profile.stats.totalCreditsSpent >= 500;
          break;
        case 'fly_10km':
          done = this.profile.stats.totalDistance >= 10000;
          break;
        case 'chat_1':
          done = this.profile.stats.chatMessagesSent >= 1;
          break;
        case 'equip_skin':
          done = this.profile.stats.skinsEquipped >= 1;
          break;
        case 'evade_20_projectiles':
          done = this.profile.stats.projectilesEvaded >= 20;
          break;
        case 'upgrade_weapon':
          done = this.profile.stats.weaponsUpgraded >= 1;
          break;
        case 'visit_sector_5':
          done = this.profile.stats.sectorsVisited && this.profile.stats.sectorsVisited.includes(5);
          break;
        case 'scan_3_artifacts':
          done = this.profile.stats.artifactsScanned >= 3;
          break;
        case 'destroy_boss':
          done = this.profile.stats.bossesDefeated >= 1;
          break;
        case 'collect_10_powerups':
          done = this.profile.stats.powerupsCollected >= 10;
          break;
        case 'activate_shield':
          done = this.profile.stats.shieldActivations >= 3;
          break;

        // Weekly
        case 'score_50000':
          done = this.player && this.player.score >= 50000;
          break;
        case 'kill_25_enemies':
          done = this.profile.stats.totalKills >= 25;
          break;
        case 'play_20_games':
          done = this.profile.stats.gamesPlayed >= 20;
          break;
        case 'destroy_1000_asteroids':
          done = this.profile.stats.asteroidsDestroyed >= 1000;
          break;
        case 'earn_10000_credits':
          done = this.profile.stats.totalCreditsEarned >= 10000;
          break;
        case 'top_scorer_10min':
          done = this.profile.stats.topScorer10min;
          break;
        case 'no_death_3_games':
          done = this.profile.stats.noDeathStreak >= 3;
          break;
        case 'buy_3_items':
          done = this.profile.stats.uniqueShopItemsBought >= 3;
          break;
        case 'explore_50km':
          done = this.profile.stats.totalDistance >= 50000;
          break;
        case 'defeat_5_bosses':
          done = this.profile.stats.bossesDefeated >= 5;
          break;
        case 'collect_10_gems':
          done = this.profile.stats.rareGemsCollected >= 10;
          break;
        case 'upgrade_5_times':
          done = this.profile.stats.weaponsUpgraded >= 5;
          break;
        case 'scan_15_artifacts':
          done = this.profile.stats.artifactsScanned >= 15;
          break;
        case 'evade_100_projectiles':
          done = this.profile.stats.projectilesEvaded >= 100;
          break;
        default:
          done = false;
      }

      // If it became done in this run, mark completed (but don't auto-award)
      if (done && !alreadyCompleted) {
        this.completed[challengeType].push(ch.id);
      }

      // Ensure a popup is displayed at least once per session for any completed challenge.
      try {
        this.sessionNotified[challengeType] =
          this.sessionNotified[challengeType] || [];
        this.notified[challengeType] = this.notified[challengeType] || [];
        if (done && !this.sessionNotified[challengeType].includes(ch.id)) {
          this.sessionNotified[challengeType].push(ch.id);
          if (!this.notified[challengeType].includes(ch.id)) {
            this.notified[challengeType].push(ch.id);
          }
          if (window && window.console)
            console.log(
              'Challenge complete (showing popup):',
              ch.id,
              challengeType,
            );
          this.showChallengeComplete(ch, challengeType);
        }
      } catch (e) {
        // ignore DOM errors but attempt to continue
      }

      // Persist any changes to completed/notified state
      this.saveState();
    });
  }

  // Helper to mark a challenge completed and show popup (useful instead of mutating arrays directly)
  markCompleted(type, challengeId) {
  // Only allow marking if in current pool
  let allowedIds = type === 'daily' ? this.currentDaily : this.currentWeekly;
  if (!Array.isArray(allowedIds)) allowedIds = [];
  const list = (CHALLENGES[type] || []).filter((ch) => allowedIds.includes(ch.id));
  const ch = list.find((c) => c.id === challengeId);
  if (!ch) return false;
    let newlyCompleted = false;
    if (!this.completed[type].includes(challengeId)) {
      this.completed[type].push(challengeId);
      newlyCompleted = true;
    }
    this.sessionNotified[type] = this.sessionNotified[type] || [];
    this.notified[type] = this.notified[type] || [];
    // Always show popup if just completed now
    if (newlyCompleted && !this.sessionNotified[type].includes(challengeId)) {
      this.sessionNotified[type].push(challengeId);
      if (!this.notified[type].includes(challengeId))
        this.notified[type].push(challengeId);
      this.showChallengeComplete(ch, type);
    }
    this.saveState();
    return newlyCompleted;
  }

  // Claim a completed challenge's reward. Returns reward amount if successful, 0 otherwise.
  claimChallenge(type, challengeId) {
  // Only allow claim if in current pool
  let allowedIds = type === 'daily' ? this.currentDaily : this.currentWeekly;
  if (!Array.isArray(allowedIds)) allowedIds = [];
  const list = (CHALLENGES[type] || []).filter((ch) => allowedIds.includes(ch.id));
  const ch = list.find((c) => c.id === challengeId);
  if (!ch) return 0;

    // Only allow claim if completed and not already claimed
    if (!this.completed[type].includes(challengeId)) return 0;
    if (this.claimed[type].includes(challengeId)) return 0;

    this.claimed[type].push(challengeId);
    // Award credits and gems
    if (this.player) {
      this.player.credits += ch.reward;
      // Award premium gems to premiumStore if available
      if (typeof ch.gems === 'number' && ch.gems > 0 && window.game && window.game.premiumStore && typeof window.game.premiumStore.addSpaceGems === 'function') {
        window.game.premiumStore.addSpaceGems(ch.gems);
      }
      // Still update player.gems for legacy/compatibility
      if (typeof this.player.gems === 'number') {
        this.player.gems += ch.gems || 0;
      } else {
        this.player.gems = ch.gems || 0;
      }
      // Track coins and gems earned from challenge
      if (window.analytics) {
        window.analytics.trackCoinsEarned(ch.reward, 'challenge_reward');
        if (ch.gems) {
          window.analytics.track('gems_earned', { amount: ch.gems, source: 'challenge_reward' });
        }
      }
    }
    this.saveState();
    return ch.reward;
  }

  saveState() {
    try {
      const data = {
        completed: this.completed,
        claimed: this.claimed,
        notified: this.notified,
        lastDailyReset: this.lastDailyReset,
        lastWeeklyReset: this.lastWeeklyReset,
      };
      localStorage.setItem('challenge_state', JSON.stringify(data));
    } catch (e) {
      // ignore storage errors
    }
  }

  loadState() {
    try {
      const raw = localStorage.getItem('challenge_state');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.completed)
        this.completed = {
          daily: Array.isArray(data.completed.daily)
            ? data.completed.daily
            : [],
          weekly: Array.isArray(data.completed.weekly)
            ? data.completed.weekly
            : [],
        };
      if (data.claimed)
        this.claimed = {
          daily: Array.isArray(data.claimed.daily) ? data.claimed.daily : [],
          weekly: Array.isArray(data.claimed.weekly) ? data.claimed.weekly : [],
        };
      if (data.notified)
        this.notified = {
          daily: Array.isArray(data.notified.daily) ? data.notified.daily : [],
          weekly: Array.isArray(data.notified.weekly)
            ? data.notified.weekly
            : [],
        };
      if (data.lastDailyReset) this.lastDailyReset = data.lastDailyReset;
      if (data.lastWeeklyReset) this.lastWeeklyReset = data.lastWeeklyReset;
    } catch (e) {
      // ignore parse errors
    }
  }

  // --- Eastern time helpers and reset logic ---
  // Return eastern Y/M/D components as numbers using Intl
  getEasternYMD() {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const map = {};
      parts.forEach((p) => (map[p.type] = p.value));
      const y = parseInt(map.year, 10);
      const m = parseInt(map.month, 10);
      const d = parseInt(map.day, 10);
      const hh = parseInt(map.hour || '0', 10);
      const mm = parseInt(map.minute || '0', 10);
      const ss = parseInt(map.second || '0', 10);
      return { y, m, d, hh, mm, ss };
    } catch (e) {
      // Fallback: use local date (not ideal for TZ-sensitive resets, but robust)
      const n = new Date();
      return {
        y: n.getFullYear(),
        m: n.getMonth() + 1,
        d: n.getDate(),
        hh: n.getHours(),
        mm: n.getMinutes(),
        ss: n.getSeconds(),
      };
    }
  }

  getEasternDateKey() {
    const { y, m, d } = this.getEasternYMD();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  getEasternWeekKey() {
    // Compute ISO week number using Eastern-local date components
    const { y, m, d } = this.getEasternYMD();
    // Use UTC-based Date constructed from eastern components to avoid local timezone skew
    const date = new Date(Date.UTC(y, m - 1, d));
    // ISO week algorithm
    const dayNum = (date.getUTCDay() + 6) % 7; // Monday=0, Sunday=6
    const thursday = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() - dayNum + 3,
      ),
    );
    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const weekNo = Math.floor(((thursday - yearStart) / 86400000 + 1) / 7) + 1;
    return `${thursday.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  performResetsIfNeeded() {
    try {
      const currentDaily = this.getEasternDateKey();
      if (this.lastDailyReset !== currentDaily) {
        this.resetDaily();
        this.lastDailyReset = currentDaily;
      }

      const currentWeek = this.getEasternWeekKey();
      if (this.lastWeeklyReset !== currentWeek) {
        this.resetWeekly();
        this.lastWeeklyReset = currentWeek;
      }

      this.saveState();
    } catch (e) {
      // ignore errors during reset check
    }
  }

  scheduleNextResets() {
    // Clear existing timer
    if (this._resetTimer) {
      clearTimeout(this._resetTimer);
      this._resetTimer = null;
    }
    // Poll every 10 minutes to re-evaluate reset boundaries. This is robust across browsers and DST.
    this._resetTimer = setTimeout(
      () => {
        this.performResetsIfNeeded();
        this.scheduleNextResets();
      },
      10 * 60 * 1000,
    );
  }

  resetDaily() {
    try {
      this.completed.daily = [];
      this.claimed.daily = [];
      this.notified.daily = [];
      this.sessionNotified.daily = [];
      if (window && window.console)
        console.log('Daily challenges reset (Eastern midnight)');
    } catch (e) {}
  }

  resetWeekly() {
    try {
      this.completed.weekly = [];
      this.claimed.weekly = [];
      this.notified.weekly = [];
      this.sessionNotified.weekly = [];
      if (window && window.console)
        console.log('Weekly challenges reset (Eastern week boundary)');
    } catch (e) {}
  }

  showChallengeComplete(challenge, type) {
    // Use the same container and CSS as achievement notifications for guaranteed visibility
    try {
      if (window && window.console)
        console.log('showChallengeComplete called for', challenge.id, type);
      let container = document.getElementById('achievement-notifications');
      if (!container) {
        container = document.createElement('div');
        container.id = 'achievement-notifications';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '2000';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }
      const element = document.createElement('div');
      element.className = 'achievement-notification';
      element.style.cssText = `
        background: linear-gradient(135deg, #FFD700, #FFB300);
        color: #222;
        padding: 14px 22px 32px 22px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        font-family: 'Orbitron', 'Arial', sans-serif;
        font-size: 15px;
        max-width: 340px;
        animation: slideIn 0.3s ease-out;
        position: relative;
        padding-right: 65px;
        pointer-events: all;
        z-index: 99999;
      `;
      const icon = document.createElement('span');
      icon.textContent = '🏆';
      icon.style.fontSize = '24px';
      icon.style.marginRight = '12px';
      const content = document.createElement('div');
      content.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 2px; color:#222;">${type.toUpperCase()} CHALLENGE COMPLETE!</div>
        <div style="font-size: 13px; opacity: 0.95; color:#222;">${challenge.description}</div>
      `;
      element.appendChild(icon);
      element.appendChild(content);
      container.appendChild(element);
      if (!window.marvinAssistant) {
        window.marvinAssistant = new MarvinAssistant();
      }
      window.marvinAssistant.attachToNotification(element);
      setTimeout(() => {
        if (element.parentNode) element.parentNode.removeChild(element);
      }, 4000);
    } catch (e) {
      console.error('[ChallengePopup] Popup error:', e);
    }
  }
}
