// Player Profile System for SuperSpace
// Displays detailed player statistics and progress

export class PlayerProfile {
    constructor(player) {
        this.player = player;
        this.stats = {
            totalPlayTime: 0,
            totalDistance: 0,
            totalShots: 0,
            totalHits: 0,
            gamesPlayed: 0,
            totalWins: 0,        // Total wins across all sessions
            totalLosses: 0,      // Total losses across all sessions
            totalKills: 0,       // Total player kills
            totalDeaths: 0,      // Total deaths
            highestScore: 0,
            longestSurvival: 0,
            favoriteWeapon: 'Basic Laser',
            weaponStats: {},
            sessionStartTime: Date.now(),
            totalCreditsEarned: 0,
            totalCreditsSpent: 0,
            asteroidsDestroyed: 0,
            averageAccuracy: 0,
            nemesis: null,       // Player who killed us the most
            nemesisKills: 0,     // How many times nemesis killed us
            killedByPlayers: {}  // Track who killed us and how many times
        };
        
        this.loadStats();
        this.isProfileOpen = false;
    }
    
    loadStats() {
        const saved = localStorage.getItem('playerStats');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.stats = { ...this.stats, ...data };
            } catch (e) {
                console.error('Failed to load player stats:', e);
            }
        }
    }
    
    saveStats() {
        // Update total play time
        const now = Date.now();
        const sessionTime = (now - this.stats.sessionStartTime) / 1000; // seconds
        this.stats.totalPlayTime += sessionTime;
        this.stats.sessionStartTime = now;
        
        localStorage.setItem('playerStats', JSON.stringify(this.stats));
    }
    
    // Update playtime (called from game loop)
    updatePlaytime(deltaTime) {
        // Update playtime every few seconds to avoid too frequent saves
        if (!this.lastPlaytimeUpdate) {
            this.lastPlaytimeUpdate = Date.now();
        }
        
        // Update every 5 seconds
        const now = Date.now();
        if (now - this.lastPlaytimeUpdate >= 5000) {
            this.saveStats();
            this.lastPlaytimeUpdate = now;
        }
    }
    
    // Update statistics
    onShot(weapon) {
        this.stats.totalShots++;
        
        // Track weapon usage
        if (!this.stats.weaponStats[weapon]) {
            this.stats.weaponStats[weapon] = {
                shots: 0,
                hits: 0,
                kills: 0,
                accuracy: 0
            };
        }
        this.stats.weaponStats[weapon].shots++;
        
        this.updateFavoriteWeapon();
        this.saveStats();
    }
    
    onHit(weapon) {
        this.stats.totalHits++;
        
        if (this.stats.weaponStats[weapon]) {
            this.stats.weaponStats[weapon].hits++;
            this.stats.weaponStats[weapon].accuracy = 
                (this.stats.weaponStats[weapon].hits / this.stats.weaponStats[weapon].shots) * 100;
        }
        
        this.stats.averageAccuracy = (this.stats.totalHits / this.stats.totalShots) * 100;
        this.saveStats();
    }
    
    onKill(weapon, isPlayer = false) {
        if (this.stats.weaponStats[weapon]) {
            this.stats.weaponStats[weapon].kills++;
        }
        
        if (isPlayer && this.player) {
            // Update highest score
            this.stats.highestScore = Math.max(this.stats.highestScore, this.player.score);
        }
        
        this.saveStats();
    }
    
    onGameStart() {
        this.stats.gamesPlayed++;
        this.currentGameStartTime = Date.now();
        this.saveStats();
    }
    
    onGameEnd() {
        if (this.currentGameStartTime) {
            const survivalTime = (Date.now() - this.currentGameStartTime) / 1000;
            this.stats.longestSurvival = Math.max(this.stats.longestSurvival, survivalTime);
        }
        this.saveStats();
    }
    
    // Track wins (called when player gets a kill)
    onWin() {
        this.stats.totalWins++;
        this.stats.totalKills++;
        this.saveStats();
    }
    
    // Track deaths and losses (called when player dies)
    onDeath(killerName = null) {
        this.stats.totalLosses++;
        this.stats.totalDeaths++;
        
        // Track nemesis (who killed us the most)
        if (killerName && killerName !== 'asteroid') {
            if (!this.stats.killedByPlayers[killerName]) {
                this.stats.killedByPlayers[killerName] = 0;
            }
            this.stats.killedByPlayers[killerName]++;
            
            // Update nemesis
            let topKiller = null;
            let maxKills = 0;
            for (const [player, kills] of Object.entries(this.stats.killedByPlayers)) {
                if (kills > maxKills) {
                    maxKills = kills;
                    topKiller = player;
                }
            }
            
            if (topKiller) {
                this.stats.nemesis = topKiller;
                this.stats.nemesisKills = maxKills;
            }
        }
        
        this.saveStats();
    }
    
    onDistanceTraveled(distance) {
        this.stats.totalDistance += distance;
        this.saveStats();
    }
    
    onCreditsEarned(amount) {
        this.stats.totalCreditsEarned += amount;
        this.saveStats();
    }
    
    onCreditsSpent(amount) {
        this.stats.totalCreditsSpent += amount;
        this.saveStats();
    }
    
    onAsteroidDestroyed() {
        this.stats.asteroidsDestroyed++;
        this.saveStats();
    }
    
    updateFavoriteWeapon() {
        let mostUsed = 'Basic Laser';
        let maxShots = 0;
        
        for (const [weapon, stats] of Object.entries(this.stats.weaponStats)) {
            if (stats.shots > maxShots) {
                maxShots = stats.shots;
                mostUsed = weapon;
            }
        }
        
        this.stats.favoriteWeapon = mostUsed;
    }
    
    createProfileUI() {
        const overlay = document.createElement('div');
        overlay.id = 'profile-overlay';
        overlay.className = 'profile-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1500;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Orbitron', 'Arial', sans-serif;
        `;
        
        const profileWindow = document.createElement('div');
        profileWindow.className = 'profile-window';
        profileWindow.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 2px solid #4fc3f7;
            border-radius: 12px;
            width: 80%;
            max-width: 800px;
            max-height: 80%;
            overflow-y: auto;
            padding: 20px;
            color: white;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;
        
        // Profile header
        const header = document.createElement('div');
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #4fc3f7; font-size: 28px;">
                    🚀 Pilot Profile
                </h2>
                <button id="close-profile" style="
                    background: #f44;
                    border: none;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                ">✕</button>
            </div>
        `;
        
        profileWindow.appendChild(header);
        
        // Stats container
        const statsContainer = document.createElement('div');
        statsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        `;
        
        // General Stats
        statsContainer.appendChild(this.createStatsSection('📊 General Statistics', [
            { label: 'Games Played', value: this.stats.gamesPlayed },
            { label: 'Total Play Time', value: this.formatTime(this.stats.totalPlayTime) },
            { label: 'Highest Score', value: this.stats.highestScore.toLocaleString() },
            { label: 'Win Rate', value: this.getWinRate() + '%' },
            { label: 'Longest Survival', value: this.formatTime(this.stats.longestSurvival) }
        ]));
        
        // Combat Stats
        statsContainer.appendChild(this.createStatsSection('⚔️ Combat Statistics', [
            { label: 'Total Shots Fired', value: this.stats.totalShots.toLocaleString() },
            { label: 'Total Hits', value: this.stats.totalHits.toLocaleString() },
            { label: 'Average Accuracy', value: this.stats.averageAccuracy.toFixed(1) + '%' },
            { label: 'Player Kills', value: this.stats.totalKills },
            { label: 'Total Deaths', value: this.stats.totalDeaths },
            { label: 'K/D Ratio', value: this.getKDRatio() },
            { label: 'Total Wins', value: this.stats.totalWins },
            { label: 'Total Losses', value: this.stats.totalLosses },
            { label: 'Favorite Weapon', value: this.stats.favoriteWeapon },
            { label: 'Asteroids Destroyed', value: this.stats.asteroidsDestroyed.toLocaleString() },
            { label: 'Nemesis', value: this.stats.nemesis ? `${this.stats.nemesis} (${this.stats.nemesisKills} kills)` : 'None' }
        ]));
        
        // Economic Stats
        statsContainer.appendChild(this.createStatsSection('💰 Economic Statistics', [
            { label: 'Current Credits', value: (this.player.credits || 0).toLocaleString() },
            { label: 'Total Credits Earned', value: this.stats.totalCreditsEarned.toLocaleString() },
            { label: 'Total Credits Spent', value: this.stats.totalCreditsSpent.toLocaleString() },
            { label: 'Net Worth', value: (this.stats.totalCreditsEarned - this.stats.totalCreditsSpent).toLocaleString() }
        ]));
        
        // Exploration Stats
        statsContainer.appendChild(this.createStatsSection('🌌 Exploration Statistics', [
            { label: 'Total Distance', value: this.formatDistance(this.stats.totalDistance) },
            { label: 'Average Speed', value: this.getAverageSpeed() + ' units/min' }
        ]));
        
        profileWindow.appendChild(statsContainer);
        
        // Weapon Statistics Table
        if (Object.keys(this.stats.weaponStats).length > 0) {
            const weaponStatsSection = document.createElement('div');
            weaponStatsSection.style.marginTop = '20px';
            weaponStatsSection.innerHTML = '<h3 style="color: #4fc3f7; margin-bottom: 15px;">🗡️ Weapon Statistics</h3>';
            
            const table = this.createWeaponStatsTable();
            weaponStatsSection.appendChild(table);
            profileWindow.appendChild(weaponStatsSection);
        }
        
        // Achievement progress
        if (window.game && window.game.achievements) {
            const achievementSection = document.createElement('div');
            achievementSection.style.marginTop = '20px';
            achievementSection.innerHTML = `
                <h3 style="color: #4fc3f7; margin-bottom: 15px;">🏆 Achievement Progress</h3>
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <div>Unlocked: ${window.game.achievements.getUnlockedCount()}/${window.game.achievements.getTotalCount()}</div>
                    <div>Achievement Points: ${window.game.achievements.getAchievementPoints()}</div>
                </div>
            `;
            profileWindow.appendChild(achievementSection);
        }

        // Reset Progress Section
        const resetSection = document.createElement('div');
        resetSection.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: rgba(255, 100, 100, 0.1);
            border: 1px solid rgba(255, 100, 100, 0.3);
            border-radius: 8px;
        `;
        resetSection.innerHTML = '<h3 style="color: #ff6b6b; margin: 0 0 15px 0;">⚠️ Danger Zone</h3>';
        
        const resetButton = document.createElement('button');
        resetButton.textContent = '🗑️ Reset All Progress';
        resetButton.id = 'reset-progress-btn';
        resetButton.style.cssText = `
            background: #d32f2f;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.3s;
            margin-bottom: 10px;
        `;
        
        const resetWarning = document.createElement('div');
        resetWarning.style.cssText = `
            font-size: 12px;
            color: #ffab91;
            line-height: 1.4;
        `;
        resetWarning.textContent = 'This will permanently delete ALL your progress including stats, purchases, achievements, and settings. This cannot be undone!';
        
        resetSection.appendChild(resetButton);
        resetSection.appendChild(resetWarning);
        profileWindow.appendChild(resetSection);
        
        overlay.appendChild(profileWindow);
        document.body.appendChild(overlay);
        
        // Event listeners
        document.getElementById('close-profile').onclick = () => this.closeProfile();
        overlay.onclick = (e) => {
            if (e.target === overlay) this.closeProfile();
        };
        
        // Reset progress button with double confirmation
        document.getElementById('reset-progress-btn').onclick = () => this.handleResetProgress();
        
        // ESC key to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeProfile();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    createStatsSection(title, stats) {
        const section = document.createElement('div');
        section.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 15px;
        `;
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.cssText = `
            margin: 0 0 15px 0;
            color: #4fc3f7;
            font-size: 16px;
        `;
        
        section.appendChild(titleElement);
        
        stats.forEach(stat => {
            const statElement = document.createElement('div');
            statElement.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 4px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            `;
            
            statElement.innerHTML = `
                <span style="color: #ccc;">${stat.label}:</span>
                <span style="color: #fff; font-weight: bold;">${stat.value}</span>
            `;
            
            section.appendChild(statElement);
        });
        
        return section;
    }
    
    createWeaponStatsTable() {
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            overflow: hidden;
        `;
        
        // Header
        const header = document.createElement('tr');
        header.style.background = 'rgba(255, 255, 255, 0.1)';
        header.innerHTML = `
            <th style="padding: 10px; text-align: left; color: #4fc3f7;">Weapon</th>
            <th style="padding: 10px; text-align: center; color: #4fc3f7;">Shots</th>
            <th style="padding: 10px; text-align: center; color: #4fc3f7;">Hits</th>
            <th style="padding: 10px; text-align: center; color: #4fc3f7;">Accuracy</th>
            <th style="padding: 10px; text-align: center; color: #4fc3f7;">Kills</th>
        `;
        table.appendChild(header);
        
        // Data rows
        for (const [weapon, stats] of Object.entries(this.stats.weaponStats)) {
            const row = document.createElement('tr');
            row.style.cssText = `
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            `;
            
            row.innerHTML = `
                <td style="padding: 8px; color: #fff;">${weapon}</td>
                <td style="padding: 8px; text-align: center; color: #ccc;">${stats.shots}</td>
                <td style="padding: 8px; text-align: center; color: #ccc;">${stats.hits}</td>
                <td style="padding: 8px; text-align: center; color: ${stats.accuracy > 50 ? '#4f4' : '#ff4'};">${stats.accuracy.toFixed(1)}%</td>
                <td style="padding: 8px; text-align: center; color: #f44;">${stats.kills}</td>
            `;
            
            table.appendChild(row);
        }
        
        return table;
    }
    
    formatTime(seconds) {
        if (seconds < 60) return seconds.toFixed(0) + 's';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + Math.floor(seconds % 60) + 's';
        return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
    }
    
    formatDistance(units) {
        if (units < 1000) return units.toFixed(0) + ' units';
        if (units < 1000000) return (units / 1000).toFixed(1) + 'K units';
        return (units / 1000000).toFixed(1) + 'M units';
    }
    
    getWinRate() {
        const total = this.stats.totalWins + this.stats.totalLosses;
        if (total === 0) return 0;
        return ((this.stats.totalWins) / total * 100).toFixed(1);
    }
    
    getKDRatio() {
        if (this.stats.totalDeaths === 0) {
            return this.stats.totalKills > 0 ? this.stats.totalKills.toFixed(2) : '0.00';
        }
        return (this.stats.totalKills / this.stats.totalDeaths).toFixed(2);
    }
    
    getAverageSpeed() {
        if (this.stats.totalPlayTime === 0) return 0;
        return Math.round(this.stats.totalDistance / (this.stats.totalPlayTime / 60));
    }
    
    openProfile() {
        if (this.isProfileOpen) return;
        
        this.isProfileOpen = true;
        this.saveStats(); // Update stats before showing
        this.createProfileUI();
    }
    
    closeProfile() {
        const overlay = document.getElementById('profile-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        this.isProfileOpen = false;
    }
    
    toggleProfile() {
        if (this.isProfileOpen) {
            this.closeProfile();
        } else {
            this.openProfile();
        }
    }
    
    // Alias for openProfile to match UI expectations
    showProfile() {
        this.openProfile();
    }

    handleResetProgress() {
        // First confirmation
        const firstConfirm = confirm(
            "⚠️ WARNING: Reset All Progress ⚠️\n\n" +
            "This will permanently delete:\n" +
            "• All statistics and achievements\n" +
            "• All purchased ships and weapons\n" +
            "• All upgrade progress\n" +
            "• Player profile data\n" +
            "• Credits and score\n" +
            "• All game settings\n\n" +
            "This action CANNOT be undone!\n\n" +
            "Are you absolutely sure you want to continue?"
        );

        if (!firstConfirm) {
            return; // User cancelled
        }

        // Second confirmation with typing requirement
        const confirmText = "DELETE MY PROGRESS";
        const userInput = prompt(
            "⚠️ FINAL CONFIRMATION ⚠️\n\n" +
            "To confirm you want to delete ALL your progress,\n" +
            "type the following text exactly (case sensitive):\n\n" +
            "DELETE MY PROGRESS\n\n" +
            "Type here:"
        );

        if (userInput !== confirmText) {
            if (userInput !== null) { // null means user cancelled
                alert("Reset cancelled - text did not match exactly.");
            }
            return;
        }

        // Perform the complete reset
        this.performCompleteReset();
    }

    performCompleteReset() {
        try {
            // Get all localStorage keys that might be related to the game
            const gameKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Include all keys that might be related to SuperSpace
                if (key && (
                    key.startsWith('player') ||
                    key.startsWith('weapon_') ||
                    key.startsWith('ship_') ||
                    key.startsWith('upgrade_') ||
                    key.includes('Credits') ||
                    key.includes('Ship') ||
                    key.includes('Weapon') ||
                    key.includes('achievement') ||
                    key.includes('disclaimer') ||
                    key === 'currentShip' ||
                    key === 'currentWeapon' ||
                    key === 'playerStats'
                )) {
                    gameKeys.push(key);
                }
            }

            // Remove all identified game-related localStorage items
            gameKeys.forEach(key => {
                localStorage.removeItem(key);
                console.log(`Removed localStorage key: ${key}`);
            });

            // Reset the player profile stats
            this.stats = {
                totalPlayTime: 0,
                totalDistance: 0,
                totalShots: 0,
                totalHits: 0,
                gamesPlayed: 0,
                highestScore: 0,
                longestSurvival: 0,
                favoriteWeapon: 'Basic Laser',
                weaponStats: {},
                sessionStartTime: Date.now(),
                totalCreditsEarned: 0,
                totalCreditsSpent: 0,
                asteroidsDestroyed: 0,
                averageAccuracy: 0
            };

            // Save the reset stats
            this.saveStats();

            // Show success message and reload
            alert(
                "✅ Progress Reset Complete!\n\n" +
                "All game data has been permanently deleted.\n" +
                "The page will now reload to apply changes."
            );

            // Reload the page to ensure all systems reset properly
            window.location.reload();

        } catch (error) {
            console.error('Error during progress reset:', error);
            alert(
                "❌ Reset Error\n\n" +
                "An error occurred while resetting progress.\n" +
                "Some data may not have been deleted.\n" +
                "Please try refreshing the page manually."
            );
        }
    }
}
