// Defines daily and weekly challenges
export const CHALLENGES = {
    daily: [
        { id: 'survive_5', description: 'Survive for 5 minutes', reward: 100 },
        { id: 'destroy_50_asteroids', description: 'Destroy 50 asteroids', reward: 150 }
    ],
    weekly: [
        { id: 'score_10000', description: 'Score 10,000 points', reward: 500 },
        { id: 'kill_100_enemies', description: 'Kill 100 enemy ships', reward: 500 }
    ]
};

// Simple challenge manager for tracking progress
export class ChallengeSystem {
    constructor(player) {
        this.player = player;
        this.completed = { daily: [], weekly: [] };
    }

    check(challengeType) {
        const list = CHALLENGES[challengeType];
        list.forEach(ch => {
            if (this.completed[challengeType].includes(ch.id)) return;
            let done = false;
            switch (ch.id) {
                case 'survive_5':
                    done = this.player.profile.stats.longestSurvival >= 300;
                    break;
                case 'destroy_50_asteroids':
                    done = this.player.profile.stats.asteroidsDestroyed >= 50;
                    break;
                case 'score_10000':
                    done = this.player.score >= 10000;
                    break;
                case 'kill_100_enemies':
                    done = this.player.profile.stats.totalKills >= 100;
                    break;
            }
            if (done) {
                this.completed[challengeType].push(ch.id);
                this.player.credits += ch.reward;
            }
        });
    }
}
