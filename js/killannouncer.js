// Kill Announcer system for SuperSpace
// Provides Unreal Tournament style kill announcements and streak tracking

export class KillAnnouncer {
    constructor() {
        // Tracks active kill announcements
        this.announcements = [];
        
        // Tracks kill streaks for all players
        this.playerStreaks = {};
        
        // Time between kills to count as a streak (in seconds)
        this.streakTimeLimit = 15;
        
        // Unreal Tournament style streak messages
        this.streakMessages = {
            2: 'Double Kill',
            3: 'Multi Kill',
            4: 'Ultra Kill',
            5: 'Monster Kill',
            7: 'LUDICROUS KILL',
            10: 'HOLY SHIT!!'
        };
        
        // Domination messages (consecutive kills without dying)
        this.dominationMessages = {
            5: 'Rampage',
            10: 'Dominating',
            15: 'UNSTOPPABLE',
            20: 'GODLIKE',
            30: 'WICKED SICK'
        };
        
        // Map to track last kill timestamp for each player
        this.lastKillTime = {};
        
        // Create the DOM container for our announcements
        this.createAnnouncementContainer();
    }
    
    // Create DOM container for kill announcements
    createAnnouncementContainer() {
        // Remove existing container if it exists
        const existingContainer = document.getElementById('kill-announcements');
        if (existingContainer) {
            document.body.removeChild(existingContainer);
        }
        
        // Create new container
        const container = document.createElement('div');
        container.id = 'kill-announcements';
        container.style.position = 'absolute';
        container.style.top = '80px';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'flex-start';
        container.style.pointerEvents = 'none'; // Don't block mouse events
        container.style.zIndex = '1000';
        
        document.body.appendChild(container);
    }
    
    // Announce a player kill
    announceKill(killerName, victimName, weaponType = 'destroyed') {
        // Create the announcement text
        let announcement = `${killerName} ${weaponType} ${victimName}`;
        
        // Track kill streak
        this.trackKillStreak(killerName);
        
        // Reset victim's streak
        this.resetPlayerStreak(victimName);
        
        // Create and show the announcement
        this.showAnnouncement(announcement, '#ff3333');
    }
    
    // Track kill streaks for a player
    trackKillStreak(playerName) {
        const currentTime = Date.now() / 1000;
        
        // Initialize streak tracking for this player if needed
        if (!this.playerStreaks[playerName]) {
            this.playerStreaks[playerName] = 1;
        } else {
            this.playerStreaks[playerName]++;
        }
        
        // Check for quick successive kills (multi-kills)
        if (this.lastKillTime[playerName]) {
            const timeSinceLastKill = currentTime - this.lastKillTime[playerName];
            
            if (timeSinceLastKill <= this.streakTimeLimit) {
                // Get streak count for this sequence of quick kills
                const quickKillCount = this.playerStreaks[playerName];
                
                // Announce streak if it matches one of our thresholds
                if (this.streakMessages[quickKillCount]) {
                    setTimeout(() => {
                        this.showAnnouncement(this.streakMessages[quickKillCount], '#ff9900', 1.3);
                    }, 800); // Slight delay after kill message
                }
            }
        }
        
        // Update last kill time
        this.lastKillTime[playerName] = currentTime;
        
        // Check for domination announcements (based on total kills without dying)
        const totalStreak = this.playerStreaks[playerName];
        if (this.dominationMessages[totalStreak]) {
            setTimeout(() => {
                this.showAnnouncement(`${playerName} is ${this.dominationMessages[totalStreak]}!`, '#00ffff', 1.5);
            }, 1500); // Longer delay for domination announcements
        }
    }
    
    // Reset a player's kill streak (when they die)
    resetPlayerStreak(playerName) {
        if (this.playerStreaks[playerName] && this.playerStreaks[playerName] >= 5) {
            // Announce the end of a good streak
            setTimeout(() => {
                this.showAnnouncement(`${playerName}'s killing spree has ended!`, '#ffff00');
            }, 1000);
        }
        
        // Reset the streak counter
        this.playerStreaks[playerName] = 0;
    }
    
    // Show an announcement with dissolving effect
    showAnnouncement(text, color = '#ffffff', scaleFactor = 1.0) {
        const container = document.getElementById('kill-announcements');
        if (!container) return;
        
        // Create announcement element
        const announcement = document.createElement('div');
        announcement.textContent = text;
        announcement.style.color = color;
        announcement.style.fontFamily = '"Russo One", "Impact", sans-serif';
        announcement.style.fontSize = `${32 * scaleFactor}px`;
        announcement.style.fontWeight = 'bold';
        announcement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
        announcement.style.textAlign = 'center';
        announcement.style.opacity = '0';
        announcement.style.transform = 'scale(0.5)';
        announcement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        announcement.style.margin = '5px 0';
        announcement.style.whiteSpace = 'nowrap';
        announcement.style.position = 'relative';
        
        // Store creation time for animation
        announcement.dataset.createdAt = Date.now().toString();
        
        // Add to container
        container.appendChild(announcement);
        
        // Track this announcement
        const announcementObj = {
            element: announcement,
            createdAt: Date.now(),
            duration: 3000, // Show for 3 seconds
            dissolving: false
        };
        
        this.announcements.push(announcementObj);
        
        // Trigger entrance animation in the next frame
        requestAnimationFrame(() => {
            announcement.style.opacity = '1';
            announcement.style.transform = 'scale(1)';
        });
        
        // Start animation update loop if not already running
        if (this.announcements.length === 1) {
            this.updateAnnouncements();
        }
    }
    
    // Update animations for all announcements
    updateAnnouncements() {
        const currentTime = Date.now();
        
        // Process each announcement
        for (let i = this.announcements.length - 1; i >= 0; i--) {
            const announcement = this.announcements[i];
            const element = announcement.element;
            const elapsed = currentTime - announcement.createdAt;
            
            if (elapsed >= announcement.duration && !announcement.dissolving) {
                // Start dissolving effect
                announcement.dissolving = true;
                element.style.opacity = '0';
                element.style.transform = 'scale(1.2) translateY(-20px)';
                element.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
                
                // Remove after dissolve animation completes
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                    this.announcements.splice(this.announcements.indexOf(announcement), 1);
                }, 700);
            }
        }
        
        // Continue animation loop if we still have announcements
        if (this.announcements.length > 0) {
            requestAnimationFrame(() => this.updateAnnouncements());
        }
    }
    
    // Preload the special font for better looking announcements
    preloadFont() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Russo+One&display=swap';
        document.head.appendChild(link);
    }
}