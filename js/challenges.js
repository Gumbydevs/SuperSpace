// Defines daily and weekly challenges - REBALANCED for slower progression
import { MarvinAssistant } from './marvin.js';

export const CHALLENGES = {
    daily: [
        { id: 'survive_10', description: 'Survive for 10 minutes', reward: 500 },
        { id: 'destroy_200_asteroids', description: 'Destroy 200 asteroids', reward: 400 },
        { id: 'earn_1000_credits', description: 'Earn 1000 credits in one session', reward: 300 }
    ],
    weekly: [
        { id: 'score_50000', description: 'Score 50,000 points in one game', reward: 1500 },
        { id: 'kill_25_enemies', description: 'Kill 25 enemy ships', reward: 1200 },
        { id: 'play_20_games', description: 'Play 20 games this week', reward: 800 }
    ]
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
        const list = CHALLENGES[challengeType] || [];
        list.forEach(ch => {
            // Allow showing a popup this session even if the challenge was completed in a previous session.
            const alreadyCompleted = (this.completed[challengeType] || []).includes(ch.id);

            let done = false;
            switch (ch.id) {
                case 'survive_10':
                    done = this.profile.stats.longestSurvival >= 600;
                    break;
                case 'destroy_200_asteroids':
                    done = this.profile.stats.asteroidsDestroyed >= 200;
                    break;
                case 'earn_1000_credits':
                    done = this.profile.stats.totalCreditsEarned >= 1000;
                    break;
                case 'score_50000':
                    done = this.player && this.player.score >= 50000;
                    break;
                case 'kill_25_enemies':
                    done = this.profile.stats.totalKills >= 25;
                    break;
                case 'play_20_games':
                    done = this.profile.stats.gamesPlayed >= 20;
                    break;
            }

            // If it became done in this run, mark completed (but don't auto-award)
            if (done && !alreadyCompleted) {
                this.completed[challengeType].push(ch.id);
            }

            // Ensure a popup is displayed at least once per session for any completed challenge.
            try {
                this.sessionNotified[challengeType] = this.sessionNotified[challengeType] || [];
                this.notified[challengeType] = this.notified[challengeType] || [];
                if (done && !this.sessionNotified[challengeType].includes(ch.id)) {
                    this.sessionNotified[challengeType].push(ch.id);
                    if (!this.notified[challengeType].includes(ch.id)) {
                        this.notified[challengeType].push(ch.id);
                    }
                    if (window && window.console) console.log('Challenge complete (showing popup):', ch.id, challengeType);
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
        const list = CHALLENGES[type] || [];
        const ch = list.find(c => c.id === challengeId);
        if (!ch) return false;
        if (!this.completed[type].includes(challengeId)) {
            this.completed[type].push(challengeId);
        }
        this.sessionNotified[type] = this.sessionNotified[type] || [];
        this.notified[type] = this.notified[type] || [];
        if (!this.sessionNotified[type].includes(challengeId)) {
            this.sessionNotified[type].push(challengeId);
            if (!this.notified[type].includes(challengeId)) this.notified[type].push(challengeId);
            this.showChallengeComplete(ch, type);
        }
        this.saveState();
        return true;
    }

    // Claim a completed challenge's reward. Returns reward amount if successful, 0 otherwise.
    claimChallenge(type, challengeId) {
        const list = CHALLENGES[type] || [];
        const ch = list.find(c => c.id === challengeId);
        if (!ch) return 0;

        // Only allow claim if completed and not already claimed
        if (!this.completed[type].includes(challengeId)) return 0;
        if (this.claimed[type].includes(challengeId)) return 0;

        this.claimed[type].push(challengeId);
        // Award credits
        if (this.player) this.player.credits += ch.reward;
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
                lastWeeklyReset: this.lastWeeklyReset
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
            if (data.completed) this.completed = {
                daily: Array.isArray(data.completed.daily) ? data.completed.daily : [],
                weekly: Array.isArray(data.completed.weekly) ? data.completed.weekly : []
            };
            if (data.claimed) this.claimed = {
                daily: Array.isArray(data.claimed.daily) ? data.claimed.daily : [],
                weekly: Array.isArray(data.claimed.weekly) ? data.claimed.weekly : []
            };
            if (data.notified) this.notified = {
                daily: Array.isArray(data.notified.daily) ? data.notified.daily : [],
                weekly: Array.isArray(data.notified.weekly) ? data.notified.weekly : []
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
                hour12: false
            }).formatToParts(now);
            const map = {};
            parts.forEach(p => map[p.type] = p.value);
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
            return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), hh: n.getHours(), mm: n.getMinutes(), ss: n.getSeconds() };
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
        const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - dayNum + 3));
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
        this._resetTimer = setTimeout(() => {
            this.performResetsIfNeeded();
            this.scheduleNextResets();
        }, 10 * 60 * 1000);
    }

    resetDaily() {
        try {
            this.completed.daily = [];
            this.claimed.daily = [];
            this.notified.daily = [];
            this.sessionNotified.daily = [];
            if (window && window.console) console.log('Daily challenges reset (Eastern midnight)');
        } catch (e) {}
    }

    resetWeekly() {
        try {
            this.completed.weekly = [];
            this.claimed.weekly = [];
            this.notified.weekly = [];
            this.sessionNotified.weekly = [];
            if (window && window.console) console.log('Weekly challenges reset (Eastern week boundary)');
        } catch (e) {}
    }

    showChallengeComplete(challenge, type) {
        // Create a temporary notification at top-center (briefly visible)
        try {
            if (window && window.console) console.log('showChallengeComplete called for', challenge.id, type);
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            // Use a gold/yellow themed look for challenge notifications
            notification.style.backgroundColor = 'rgba(30, 20, 0, 0.95)';
            notification.style.color = '#ffd965';
            notification.style.padding = '12px 18px';
            notification.style.borderRadius = '6px';
            notification.style.border = '3px solid #ffcf5c';
            notification.style.zIndex = '10000';
            notification.style.fontFamily = "'Orbitron', monospace";
            notification.style.fontSize = '14px';
            notification.style.boxShadow = '0 8px 24px rgba(0,0,0,0.7), 0 0 10px rgba(255,207,92,0.15)';
            notification.style.position = 'relative'; // Required for positioning Marvin
            notification.innerHTML = `
                <div style="font-weight:800; margin-bottom:6px; color:#fff">${type.toUpperCase()} CHALLENGE COMPLETE!</div>
                <div style="font-size:0.96em; color: #ffeaa7;">${challenge.description}</div>
            `;

            document.body.appendChild(notification);
            
            // Add Marvin to the notification
            if (!window.marvinAssistant) {
                window.marvinAssistant = new MarvinAssistant();
            }
            window.marvinAssistant.attachToNotification(notification);

            // Remove notification after 3.5 seconds
            setTimeout(() => {
                try {
                    if (notification.parentNode) notification.parentNode.removeChild(notification);
                } catch (e) {}
            }, 3500);
        } catch (e) {
            // ignore DOM errors in non-browser contexts
        }
    }
}
