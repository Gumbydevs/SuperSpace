// Defines daily and weekly challenges - REBALANCED for slower progression
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

// Simple challenge manager for tracking progress
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

    // load persisted state if available
    this.loadState();
    }

    check(challengeType) {
        // Ensure profile stats are available
        if (!this.profile || !this.profile.stats) return;
        const list = CHALLENGES[challengeType];
        list.forEach(ch => {
            if (this.completed[challengeType].includes(ch.id)) return;
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
                    done = this.player.score >= 50000;
                    break;
                case 'kill_25_enemies':
                    done = this.profile.stats.totalKills >= 25;
                    break;
                case 'play_20_games':
                    done = this.profile.stats.gamesPlayed >= 20;
                    break;
            }
            if (done && !this.completed[challengeType].includes(ch.id)) {
                // Mark as completed but DO NOT auto-award the reward.
                // Player must claim from the shop Challenges tab.
                this.completed[challengeType].push(ch.id);
                this.saveState();
            }
        });
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
        this.player.credits += ch.reward;
        this.saveState();
        return ch.reward;
    }

    saveState() {
        try {
            const data = {
                completed: this.completed,
                claimed: this.claimed
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
            if (data.completed) {
                this.completed = data.completed;
            }
            if (data.claimed) {
                this.claimed = data.claimed;
            }
        } catch (e) {
            // ignore parse errors
        }
    }

    showChallengeComplete(challenge, type) {
    // Notifications for automatic completion are disabled.
    // Rewards are awarded only when player claims them in the shop.
    }
}
