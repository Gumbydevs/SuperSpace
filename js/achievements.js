// Achievement System for SuperSpace
// Tracks player achievements and milestones

export class AchievementSystem {
    constructor(player) {
        this.player = player;
        this.achievements = new Map();
        this.notifications = [];
        
        // Initialize achievements
        this.initializeAchievements();
        
        // Load progress from localStorage
        this.loadProgress();
        
        // Create achievement notification UI
        this.createNotificationUI();
    }
    
    initializeAchievements() {
        // Combat achievements
        this.achievements.set('first_kill', {
            id: 'first_kill',
            name: 'First Blood',
            description: 'Destroy your first enemy player',
            icon: '⚔️',
            category: 'combat',
            requirement: 1,
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 10
        });
        
        this.achievements.set('killer_spree', {
            id: 'killer_spree',
            name: 'Killing Spree',
            description: 'Get 5 kills in one life',
            icon: '🔥',
            category: 'combat',
            requirement: 5,
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 25
        });
        
        this.achievements.set('veteran', {
            id: 'veteran',
            name: 'Combat Veteran',
            description: 'Win 25 battles',
            icon: '🏆',
            category: 'combat',
            requirement: 25,
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 50
        });
        
        // Mining achievements
        this.achievements.set('first_asteroid', {
            id: 'first_asteroid',
            name: 'Space Miner',
            description: 'Destroy your first asteroid',
            icon: '⛏️',
            category: 'mining',
            requirement: 1,
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 5
        });
        
        this.achievements.set('asteroid_hunter', {
            id: 'asteroid_hunter',
            name: 'Asteroid Hunter',
            description: 'Destroy 100 asteroids',
            icon: '💎',
            category: 'mining',
            requirement: 100,
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 30
        });
        
        // Economic achievements
        this.achievements.set('first_purchase', {
            id: 'first_purchase',
            name: 'Big Spender',
            description: 'Make your first shop purchase',
            icon: '💰',
            category: 'economy',
            requirement: 1,
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 5
        });
        
        this.achievements.set('wealthy', {
            id: 'wealthy',
            name: 'Space Tycoon',
            description: 'Accumulate 50,000 credits',
            icon: '💸',
            category: 'economy',
            requirement: 50000,
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 40
        });
        
        // Survival achievements
        this.achievements.set('survivor', {
            id: 'survivor',
            name: 'Survivor',
            description: 'Survive for 10 minutes without dying',
            icon: '🛡️',
            category: 'survival',
            requirement: 600, // 10 minutes in seconds
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 20
        });
        
        // Weapon achievements
        this.achievements.set('weapon_master', {
            id: 'weapon_master',
            name: 'Weapon Master',
            description: 'Own all available weapons',
            icon: '🗡️',
            category: 'collection',
            requirement: 8, // Total number of weapons
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 60
        });
        
        // Secret achievements
        this.achievements.set('pacifist', {
            id: 'pacifist',
            name: 'Pacifist',
            description: 'Accumulate 10,000 points without killing a player',
            icon: '☮️',
            category: 'special',
            requirement: 10000,
            progress: 0,
            unlocked: false,
            hidden: true, // Hidden achievement
            points: 75
        });
        
        // Exploration achievement
        this.achievements.set('explorer', {
            id: 'explorer',
            name: 'Space Explorer',
            description: 'Travel a total distance of 1,000,000 units',
            icon: '🚀',
            category: 'exploration',
            requirement: 1000000,
            progress: 0,
            unlocked: false,
            hidden: false,
            points: 35
        });
    }
    
    loadProgress() {
        const saved = localStorage.getItem('achievements');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                for (const [id, achievement] of this.achievements) {
                    if (data[id]) {
                        achievement.progress = data[id].progress || 0;
                        achievement.unlocked = data[id].unlocked || false;
                    }
                }
            } catch (e) {
                console.error('Failed to load achievement progress:', e);
            }
        }
    }
    
    saveProgress() {
        const data = {};
        for (const [id, achievement] of this.achievements) {
            data[id] = {
                progress: achievement.progress,
                unlocked: achievement.unlocked
            };
        }
        localStorage.setItem('achievements', JSON.stringify(data));
    }
    
    // Update achievement progress
    updateProgress(achievementId, progress) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlocked) return;
        
        achievement.progress = Math.max(achievement.progress, progress);
        
        if (achievement.progress >= achievement.requirement) {
            this.unlockAchievement(achievementId);
        }
        
        this.saveProgress();
    }
    
    // Increment achievement progress
    incrementProgress(achievementId, amount = 1) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlocked) return;
        
        achievement.progress += amount;
        
        if (achievement.progress >= achievement.requirement) {
            this.unlockAchievement(achievementId);
        }
        
        this.saveProgress();
    }
    
    unlockAchievement(achievementId) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlocked) return;
        
        achievement.unlocked = true;
        
        // Add achievement points to player score (optional)
        if (this.player) {
            this.player.score += achievement.points;
        }
        
        // Show notification
        this.showNotification(achievement);
        
        // Play achievement sound
        if (window.game && window.game.soundManager) {
            window.game.soundManager.play('powerup', {
                volume: 0.8,
                playbackRate: 1.2
            });
        }
        
        console.log(`Achievement unlocked: ${achievement.name}`);
        this.saveProgress();
    }
    
    showNotification(achievement) {
        const notification = {
            achievement,
            timestamp: Date.now(),
            duration: 5000 // 5 seconds
        };
        
        this.notifications.push(notification);
        this.updateNotificationDisplay();
        
        // Auto-remove after duration
        setTimeout(() => {
            const index = this.notifications.indexOf(notification);
            if (index >= 0) {
                this.notifications.splice(index, 1);
                this.updateNotificationDisplay();
            }
        }, notification.duration);
    }
    
    createNotificationUI() {
        const container = document.createElement('div');
        container.id = 'achievement-notifications';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '2000';
        container.style.pointerEvents = 'none';
        
        document.body.appendChild(container);
    }
    
    updateNotificationDisplay() {
        const container = document.getElementById('achievement-notifications');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.notifications.forEach((notification, index) => {
            const element = document.createElement('div');
            element.className = 'achievement-notification';
            element.style.cssText = `
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                font-family: Arial, sans-serif;
                font-size: 14px;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
                transform: translateX(${index * 5}px);
            `;
            
            const icon = document.createElement('span');
            icon.textContent = notification.achievement.icon;
            icon.style.fontSize = '24px';
            icon.style.marginRight = '12px';
            
            const content = document.createElement('div');
            content.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 2px;">Achievement Unlocked!</div>
                <div style="font-size: 12px; opacity: 0.9;">${notification.achievement.name}</div>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">+${notification.achievement.points} points</div>
            `;
            
            element.appendChild(icon);
            element.appendChild(content);
            container.appendChild(element);
        });
    }
    
    // Event handlers for different game actions
    onPlayerKill(victimId) {
        this.incrementProgress('first_kill');
        
        // Track kill streak for killing spree achievement
        if (!this.currentKillStreak) this.currentKillStreak = 0;
        this.currentKillStreak++;
        this.updateProgress('killer_spree', this.currentKillStreak);
    }
    
    onPlayerDeath() {
        // Reset kill streak
        this.currentKillStreak = 0;
    }
    
    onWin() {
        this.incrementProgress('veteran');
    }
    
    onAsteroidDestroyed() {
        this.incrementProgress('first_asteroid');
        this.incrementProgress('asteroid_hunter');
    }
    
    onPurchase() {
        this.incrementProgress('first_purchase');
    }
    
    onCreditsChanged(newAmount) {
        this.updateProgress('wealthy', newAmount);
    }
    
    onWeaponAcquired() {
        // Count owned weapons
        if (window.game && window.game.shop) {
            const ownedWeapons = window.game.shop.availableWeapons.filter(w => w.owned).length;
            this.updateProgress('weapon_master', ownedWeapons);
        }
    }
    
    onSurvivalTime(timeInSeconds) {
        this.updateProgress('survivor', timeInSeconds);
    }
    
    onDistanceTraveled(totalDistance) {
        this.updateProgress('explorer', totalDistance);
    }
    
    onScoreIncrease(newScore, fromPlayerKill = false) {
        // Track pacifist achievement (score without player kills)
        if (!fromPlayerKill) {
            if (!this.pacifistScore) this.pacifistScore = 0;
            this.pacifistScore = newScore;
            this.updateProgress('pacifist', this.pacifistScore);
        } else {
            // Reset pacifist progress if they killed a player
            this.pacifistScore = 0;
            this.achievements.get('pacifist').progress = 0;
        }
    }
    
    // Get achievements for display
    getAchievements(category = null) {
        let achievements = Array.from(this.achievements.values());
        
        if (category) {
            achievements = achievements.filter(a => a.category === category);
        }
        
        return achievements.filter(a => !a.hidden || a.unlocked);
    }
    
    getUnlockedCount() {
        return Array.from(this.achievements.values()).filter(a => a.unlocked).length;
    }
    
    getTotalCount() {
        return this.achievements.size;
    }
    
    getAchievementPoints() {
        return Array.from(this.achievements.values())
            .filter(a => a.unlocked)
            .reduce((total, a) => total + a.points, 0);
    }
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
