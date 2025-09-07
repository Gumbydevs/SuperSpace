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
        this.completed = { daily: [], weekly: [] };
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
                this.completed[challengeType].push(ch.id);
                this.player.credits += ch.reward;
                // Show notification
                this.showChallengeComplete(ch, challengeType);
            }
        });
    }

    showChallengeComplete(challenge, type) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = 'rgba(0, 60, 30, 0.9)';
        notification.style.color = '#3f3';
        notification.style.padding = '15px';
        notification.style.borderRadius = '5px';
        notification.style.border = '2px solid #3f3';
        notification.style.zIndex = '1000';
        notification.style.fontFamily = "'Orbitron', monospace";
        notification.style.fontSize = '14px';
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">${type.toUpperCase()} CHALLENGE COMPLETE!</div>
            <div>${challenge.description}</div>
            <div style="color: #fc3; margin-top: 5px;">+${challenge.reward} Credits</div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }
}
