// Avatar Manager for SuperSpace
// Handles pilot avatar selection and rendering retro-style portraits

export class AvatarManager {
    constructor(premiumStore = null) {
        this.selectedAvatar = localStorage.getItem('selectedAvatar') || 'han';
        this.avatarOptions = ['han', 'ripley', 'robot', 'alien', 'longjohn', 'missy'];
        this.premiumAvatars = ['astronaut_gold', 'alien_commander', 'cyber_pilot', 'galaxy_explorer', 'neon_warrior'];
        this.premiumStore = premiumStore;
        this.initialized = false;
        this.tempSelection = null; // For modal selection
        
        // Try to initialize immediately, but also provide a manual init method
        this.tryInitialize();
    }

    tryInitialize() {
        const avatarOptions = document.querySelectorAll('.avatar-option');
        console.log('Avatar manager initializing, found options:', avatarOptions.length);
        if (avatarOptions.length > 0) {
            this.setupAvatarSelection();
            this.setupModalControls();
            console.log('About to setup premium avatars...');
            this.setupPremiumAvatars();
            this.drawAllAvatars();
            this.drawProfileAvatar();
            this.initialized = true;
            console.log('Avatar manager initialization complete');
        } else {
            console.log('No avatar options found, skipping initialization');
        }
    }

    // Check if player owns a premium avatar
    ownsAvatar(avatarId) {
        const purchases = JSON.parse(localStorage.getItem('premiumPurchases') || '{}');
        console.log(`Checking ownership for ${avatarId}:`, purchases.avatars);
        return purchases.avatars && purchases.avatars.includes(avatarId);
    }

    // Setup premium avatars in the modal
    setupPremiumAvatars() {
        console.log('Setting up premium avatars...');
        const premiumAvatarData = [
            { id: 'astronaut_gold', name: 'Golden Ace' },
            { id: 'alien_commander', name: 'Zorg Prime' }, 
            { id: 'cyber_pilot', name: 'Cyber-X' },
            { id: 'galaxy_explorer', name: 'Nova Star' },
            { id: 'neon_warrior', name: 'Neon Ghost' }
        ];

        console.log('Available premium avatars:', premiumAvatarData.length);
        
        // Step 1: First, reset ALL avatar options completely to prevent duplicates
        const allOptions = document.querySelectorAll('.avatar-option');
        const freeAvatars = ['han', 'ripley', 'robot', 'alien', 'longjohn', 'missy'];
        const freeAvatarNames = ['Han Solo', 'Ellen Ripley', 'Android Pilot', 'Alien Commander', 'Long John', 'Pilot Missy'];
        
        // Reset all options to their default free avatars first
        allOptions.forEach((option, index) => {
            // Remove any existing premium lock icons
            const lockIcon = option.querySelector('.premium-lock');
            if (lockIcon) lockIcon.remove();
            
            // Reset styling
            option.style.border = '';
            option.style.background = '';
            option.classList.remove('disabled');
            
            // Assign free avatars to first 6 slots
            if (index < freeAvatars.length) {
                option.dataset.avatar = freeAvatars[index];
                option.querySelector('.avatar-name').textContent = freeAvatarNames[index];
            } else {
                // Extra slots for premium avatars - initially disabled
                delete option.dataset.avatar;
                option.querySelector('.avatar-name').textContent = 'LOCKED';
                option.classList.add('disabled');
            }
        });

        // Step 2: Now assign premium avatars to the extra slots (beyond the 6 free ones)
        const premiumSlotStart = Math.min(freeAvatars.length, allOptions.length);
        
        for (let i = 0; i < premiumAvatarData.length && (premiumSlotStart + i) < allOptions.length; i++) {
            const option = allOptions[premiumSlotStart + i];
            const premiumData = premiumAvatarData[i];
            
            // Set up the premium avatar slot
            option.dataset.avatar = premiumData.id;
            option.querySelector('.avatar-name').textContent = premiumData.name;
            
            console.log(`Setting up ${premiumData.name} (${premiumData.id}), owned: ${this.ownsAvatar(premiumData.id)}`);
            
            if (this.ownsAvatar(premiumData.id)) {
                // Player owns this avatar - enable it
                option.classList.remove('disabled');
                // Add premium styling for owned
                option.style.border = '2px solid #FFD700';
                option.style.background = 'linear-gradient(45deg, rgba(255, 215, 0, 0.1), rgba(255, 255, 255, 0.05))';
            } else {
                // Player doesn't own this avatar - show as premium locked
                option.classList.add('disabled');
                option.style.border = '2px solid #888';
                option.style.background = 'linear-gradient(45deg, rgba(136, 136, 136, 0.1), rgba(0, 0, 0, 0.3))';
                
                // Add premium lock icon
                const lockIcon = document.createElement('div');
                lockIcon.innerHTML = '🔒';
                lockIcon.className = 'premium-lock';
                lockIcon.style.position = 'absolute';
                lockIcon.style.top = '5px';
                lockIcon.style.right = '5px';
                lockIcon.style.fontSize = '12px';
                lockIcon.style.zIndex = '10';
                option.style.position = 'relative';
                option.appendChild(lockIcon);
            }
        }
        
        console.log('Premium avatar setup complete');
    }

    // Method to initialize after DOM is ready
    initialize() {
        if (!this.initialized) {
            this.tryInitialize();
        }
    }

    setupModalControls() {
        const changePilotBtn = document.getElementById('changePilotBtn');
        const avatarModal = document.getElementById('avatarModal');
        const authenticateBtn = document.getElementById('authenticateBtn');
        const cancelBtn = document.getElementById('cancelAvatarBtn');

        if (changePilotBtn) {
            changePilotBtn.addEventListener('click', () => {
                this.openAvatarModal();
            });
        }

        if (authenticateBtn) {
            authenticateBtn.addEventListener('click', () => {
                this.authenticateSelection();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeAvatarModal();
            });
        }

        // Close modal on outside click
        if (avatarModal) {
            avatarModal.addEventListener('click', (e) => {
                if (e.target === avatarModal) {
                    this.closeAvatarModal();
                }
            });
        }
    }

    openAvatarModal() {
        const avatarModal = document.getElementById('avatarModal');
        if (avatarModal) {
            this.tempSelection = this.selectedAvatar; // Store current selection as temp
            avatarModal.classList.remove('hidden');
            this.drawAllAvatars(); // Redraw modal avatars
            this.updateModalSelection();
        }
    }

    closeAvatarModal() {
        const avatarModal = document.getElementById('avatarModal');
        if (avatarModal) {
            avatarModal.classList.add('hidden');
            this.tempSelection = null;
            this.clearModalSelection();
        }
    }

    authenticateSelection() {
        if (this.tempSelection) {
            this.selectedAvatar = this.tempSelection;
            localStorage.setItem('selectedAvatar', this.selectedAvatar);
            this.drawProfileAvatar();
            
            // Trigger callback if provided
            if (this.onAvatarChange) {
                this.onAvatarChange(this.selectedAvatar);
            }
        }
        this.closeAvatarModal();
    }

    updateModalSelection() {
        const avatarOptions = document.querySelectorAll('#avatarModal .avatar-option');
        avatarOptions.forEach(option => {
            if (option.dataset.avatar === this.tempSelection) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    clearModalSelection() {
        const avatarOptions = document.querySelectorAll('#avatarModal .avatar-option');
        avatarOptions.forEach(option => {
            option.classList.remove('selected');
        });
    }

    setupAvatarSelection() {
        // Handle modal avatar selection
        const modalAvatarOptions = document.querySelectorAll('#avatarModal .avatar-option');
        
        modalAvatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                const avatarType = option.dataset.avatar;
                
                if (!avatarType) return;
                
                // Check if it's a premium avatar that the player doesn't own
                if (this.premiumAvatars.includes(avatarType) && !this.ownsAvatar(avatarType)) {
                    // Show message about needing to purchase
                    if (window.game && window.game.soundManager) {
                        window.game.soundManager.play('error', { volume: 0.5 });
                    }
                    
                    // Flash the option to indicate it's locked
                    option.style.animation = 'flash 0.5s ease-in-out';
                    setTimeout(() => {
                        option.style.animation = '';
                    }, 500);
                    
                    return;
                }
                
                // Allow selection if not disabled and avatar is available
                if (!option.classList.contains('disabled')) {
                    this.tempSelection = avatarType;
                    this.updateModalSelection();
                }
            });
        });
    }

    // Get all available avatars (free + premium owned)
    getAllAvailableAvatars() {
        let avatars = [...this.avatarOptions]; // Default free avatars
        
        if (this.premiumStore) {
            const ownedPremium = this.premiumStore.getOwnedPremiumAvatars();
            ownedPremium.forEach(avatar => {
                avatars.push(avatar.id);
            });
        }
        
        return avatars;
    }
    
    // Check if an avatar is available to use
    isAvatarAvailable(avatarId) {
        // Free avatars are always available
        if (this.avatarOptions.includes(avatarId)) {
            return true;
        }
        
        // Check if it's a premium avatar that's owned
        if (this.premiumStore) {
            return this.premiumStore.ownsItem('avatar', avatarId);
        }
        
        return false;
    }
    
    // Get avatar display name
    getAvatarDisplayName(avatarId) {
        // Check if it's a premium avatar
        if (this.premiumStore) {
            const premiumAvatar = this.premiumStore.premiumAvatars.find(a => a.id === avatarId);
            if (premiumAvatar) {
                return premiumAvatar.name;
            }
        }
        
        // Default avatar names
        const defaultNames = {
            'han': 'Ace',
            'ripley': 'Ripley',
            'robot': 'Marvin',
            'alien': 'Jeff',
            'longjohn': 'Long John',
            'missy': 'Missy'
        };
        
        return defaultNames[avatarId] || avatarId;
    }

    drawAllAvatars() {
        // Draw modal avatars
        const modalAvatarCanvases = document.querySelectorAll('#avatarModal .avatar-canvas');
        modalAvatarCanvases.forEach(canvas => {
            const avatarType = canvas.parentElement.dataset.avatar;
            if (avatarType) {
                this.drawAvatar(canvas, avatarType);
            }
        });
    }

    drawAvatar(canvas, avatarType, customSize = null) {
        const ctx = canvas.getContext('2d');
        const size = customSize || canvas.width; // Use custom size or canvas size
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set crisp pixel rendering
        ctx.imageSmoothingEnabled = false;
        
        // Check if it's a premium avatar
        if (this.premiumAvatars.includes(avatarType)) {
            this.drawPremiumAvatar(ctx, avatarType, size);
            return;
        }
        
        switch (avatarType) {
            case 'han':
                this.drawAce(ctx, size);
                break;
            case 'ripley':
                this.drawRiley(ctx, size);
                break;
            case 'robot':
                this.drawMarvin(ctx, size);
                break;
            case 'alien':
                this.drawGorf(ctx, size);
                break;
            case 'longjohn':
                this.drawLongJohn(ctx, size);
                break;
            case 'missy':
                this.drawMissy(ctx, size);
                break;
        }
    }

    drawAce(ctx, size) {
        // Cool guy pilot - Ace (scalable)
        const scale = size / 24; // Base size is 24, scale accordingly
        
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, size, size);
        
        // Face
        ctx.fillStyle = '#f4c2a1';
        ctx.fillRect(7*scale, 6*scale, 10*scale, 12*scale);
        
        // Brown hair
        ctx.fillStyle = '#4a3425';
        ctx.fillRect(6*scale, 4*scale, 12*scale, 4*scale);
        ctx.fillRect(5*scale, 5*scale, 2*scale, 3*scale);
        ctx.fillRect(17*scale, 5*scale, 2*scale, 3*scale);
        
        // Eyes
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(8*scale, 8*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(14*scale, 8*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Nose
        ctx.fillStyle = '#e6a478';
        ctx.fillRect(11*scale, 10*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Mouth
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(10*scale, 12*scale, 3*scale, Math.max(1, 1*scale));
        
        // Jacket
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(4*scale, 17*scale, 16*scale, 7*scale);
        ctx.fillStyle = '#654321';
        ctx.fillRect(6*scale, 19*scale, 12*scale, 5*scale);
    }

    drawRiley(ctx, size) {
        // Tough female commander - Riley (scalable)
        const scale = size / 24;
        
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, size, size);
        
        // Face (feminine)
        ctx.fillStyle = '#f2c2a1';
        ctx.fillRect(7*scale, 6*scale, 10*scale, 12*scale);
        
        // Blonde hair (shoulder length)
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(6*scale, 4*scale, 12*scale, 5*scale);
        ctx.fillRect(5*scale, 5*scale, 2*scale, 4*scale);
        ctx.fillRect(17*scale, 5*scale, 2*scale, 4*scale);
        // Highlights
        ctx.fillStyle = '#f0d858';
        ctx.fillRect(8*scale, 4*scale, Math.max(1, 1*scale), 3*scale);
        ctx.fillRect(12*scale, 4*scale, Math.max(1, 1*scale), 3*scale);
        ctx.fillRect(15*scale, 4*scale, Math.max(1, 1*scale), 3*scale);
        
        // Eyes (larger, feminine)
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(8*scale, 8*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(14*scale, 8*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Eyebrows (arched)
        ctx.fillStyle = '#b8941f';
        ctx.fillRect(8*scale, 7*scale, 2*scale, Math.max(1, 1*scale));
        ctx.fillRect(14*scale, 7*scale, 2*scale, Math.max(1, 1*scale));
        
        // Nose (smaller)
        ctx.fillStyle = '#e6a478';
        ctx.fillRect(11*scale, 10*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Mouth
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(10*scale, 12*scale, 3*scale, Math.max(1, 1*scale));
        
        // Military uniform
        ctx.fillStyle = '#4a5d23';
        ctx.fillRect(4*scale, 17*scale, 16*scale, 7*scale);
        ctx.fillStyle = '#3a4d1a';
        ctx.fillRect(6*scale, 19*scale, 12*scale, 5*scale);
        
        // Rank insignia
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(7*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(9*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(15*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
    }

    drawMarvin(ctx, size) {
        // AI Unit - Marvin (scalable)
        const scale = size / 24;
        
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, size, size);
        
        // Head (metallic)
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(6*scale, 4*scale, 12*scale, 14*scale);
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(7*scale, 5*scale, 10*scale, 12*scale);
        
        // Visor
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(8*scale, 6*scale, 8*scale, 6*scale);
        
        // Eyes (glowing red)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(9*scale, 7*scale, 2*scale, 2*scale);
        ctx.fillRect(13*scale, 7*scale, 2*scale, 2*scale);
        
        // Mouth grille
        ctx.fillStyle = '#666';
        ctx.fillRect(9*scale, 11*scale, 6*scale, 2*scale);
        ctx.fillStyle = '#333';
        ctx.fillRect(10*scale, 11*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(12*scale, 11*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(14*scale, 11*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Antenna
        ctx.fillStyle = '#888';
        ctx.fillRect(11*scale, 2*scale, 2*scale, 3*scale);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(11*scale, 2*scale, 2*scale, Math.max(1, 1*scale));
        
        // Body
        ctx.fillStyle = '#808080';
        ctx.fillRect(5*scale, 17*scale, 14*scale, 7*scale);
        ctx.fillStyle = '#696969';
        ctx.fillRect(6*scale, 18*scale, 12*scale, 6*scale);
        
        // Control lights
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(7*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(9*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(11*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(13*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(15*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
    }

    drawGorf(ctx, size) {
        // Green alien pilot - Gorf (scalable)
        const scale = size / 24;
        
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, size, size);
        
        // Head (large alien)
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(6*scale, 2*scale, 12*scale, 16*scale);
        ctx.fillStyle = '#5a8c69';
        ctx.fillRect(7*scale, 3*scale, 10*scale, 14*scale);
        
        // Large alien eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(8*scale, 6*scale, 3*scale, 4*scale);
        ctx.fillRect(13*scale, 6*scale, 3*scale, 4*scale);
        ctx.fillStyle = '#2d5d3d';
        ctx.fillRect(8*scale, 6*scale, 2*scale, 3*scale);
        ctx.fillRect(13*scale, 6*scale, 2*scale, 3*scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8*scale, 6*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(13*scale, 6*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Nose slits
        ctx.fillStyle = '#3a6c49';
        ctx.fillRect(11*scale, 10*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(12*scale, 10*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Small mouth
        ctx.fillStyle = '#2d5d3d';
        ctx.fillRect(10*scale, 13*scale, 3*scale, Math.max(1, 1*scale));
        
        // Elongated skull
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(7*scale, 1*scale, 10*scale, 3*scale);
        ctx.fillRect(8*scale, 0*scale, 8*scale, 2*scale);
        
        // Alien uniform
        ctx.fillStyle = '#2d4a3a';
        ctx.fillRect(5*scale, 17*scale, 14*scale, 7*scale);
        ctx.fillStyle = '#3a5a4a';
        ctx.fillRect(6*scale, 18*scale, 12*scale, 6*scale);
        
        // Tech details
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(7*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(9*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(11*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(13*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(15*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Neck ridges
        ctx.fillStyle = '#3a6c49';
        ctx.fillRect(9*scale, 15*scale, 6*scale, Math.max(1, 1*scale));
        ctx.fillRect(10*scale, 16*scale, 4*scale, Math.max(1, 1*scale));
    }

    drawLongJohn(ctx, size) {
        // Pirate captain - Long John (scalable)
        const scale = size / 24;
        
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, size, size);
        
        // Face (weathered)
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(7*scale, 6*scale, 10*scale, 12*scale);
        
        // Dark hair with bandana
        ctx.fillStyle = '#2d1f1a';
        ctx.fillRect(6*scale, 4*scale, 12*scale, 4*scale);
        ctx.fillRect(5*scale, 5*scale, 2*scale, 3*scale);
        ctx.fillRect(17*scale, 5*scale, 2*scale, 3*scale);
        
        // Red bandana
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(7*scale, 3*scale, 10*scale, 2*scale);
        ctx.fillStyle = '#aa3333';
        ctx.fillRect(8*scale, 2*scale, 8*scale, Math.max(1, 1*scale));
        
        // Eyes (one with eyepatch)
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(8*scale, 8*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        // Eyepatch
        ctx.fillStyle = '#000';
        ctx.fillRect(13*scale, 7*scale, 3*scale, 3*scale);
        
        // Scar
        ctx.fillStyle = '#b8945f';
        ctx.fillRect(15*scale, 9*scale, Math.max(1, 1*scale), 3*scale);
        
        // Beard (gray)
        ctx.fillStyle = '#666666';
        ctx.fillRect(8*scale, 12*scale, 8*scale, 4*scale);
        ctx.fillStyle = '#555555';
        ctx.fillRect(9*scale, 13*scale, 6*scale, 3*scale);
        
        // Nose
        ctx.fillStyle = '#c49564';
        ctx.fillRect(11*scale, 10*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Pirate coat (dark blue)
        ctx.fillStyle = '#1a2d5a';
        ctx.fillRect(4*scale, 17*scale, 16*scale, 7*scale);
        ctx.fillStyle = '#243a6a';
        ctx.fillRect(6*scale, 19*scale, 12*scale, 5*scale);
        
        // Gold buttons
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(7*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(7*scale, 22*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // White collar
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8*scale, 17*scale, 8*scale, Math.max(1, 1*scale));
    }

    drawMissy(ctx, size) {
        // Female pilot - Missy (scalable with pink elements)
        const scale = size / 24;
        
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, size, size);
        
        // Face (smooth, feminine)
        ctx.fillStyle = '#f5c4a6';
        ctx.fillRect(7*scale, 6*scale, 10*scale, 12*scale);
        
        // Pink hair with highlights
        ctx.fillStyle = '#d65a9f';
        ctx.fillRect(6*scale, 4*scale, 12*scale, 5*scale);
        ctx.fillRect(5*scale, 5*scale, 2*scale, 4*scale);
        ctx.fillRect(17*scale, 5*scale, 2*scale, 4*scale);
        // Pink highlights
        ctx.fillStyle = '#ff69b4';
        ctx.fillRect(8*scale, 4*scale, Math.max(1, 1*scale), 3*scale);
        ctx.fillRect(11*scale, 4*scale, 2*scale, 3*scale);
        ctx.fillRect(15*scale, 4*scale, Math.max(1, 1*scale), 3*scale);
        
        // Eyes (larger, feminine with makeup)
        ctx.fillStyle = '#2a7c4a';
        ctx.fillRect(8*scale, 8*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(14*scale, 8*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Pink eyeshadow
        ctx.fillStyle = '#ffb3d9';
        ctx.fillRect(7*scale, 7*scale, 3*scale, Math.max(1, 1*scale));
        ctx.fillRect(13*scale, 7*scale, 3*scale, Math.max(1, 1*scale));
        
        // Eyebrows (shaped)
        ctx.fillStyle = '#b8447a';
        ctx.fillRect(8*scale, 7*scale, 2*scale, Math.max(1, 1*scale));
        ctx.fillRect(14*scale, 7*scale, 2*scale, Math.max(1, 1*scale));
        
        // Nose (delicate)
        ctx.fillStyle = '#e6a478';
        ctx.fillRect(11*scale, 10*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Pink lipstick
        ctx.fillStyle = '#ff69b4';
        ctx.fillRect(10*scale, 12*scale, 3*scale, Math.max(1, 1*scale));
        
        // Pink flight suit
        ctx.fillStyle = '#cc4499';
        ctx.fillRect(4*scale, 17*scale, 16*scale, 7*scale);
        ctx.fillStyle = '#dd5aaa';
        ctx.fillRect(6*scale, 19*scale, 12*scale, 5*scale);
        
        // Silver details
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(7*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(9*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(11*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(13*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        ctx.fillRect(15*scale, 20*scale, Math.max(1, 1*scale), Math.max(1, 1*scale));
        
        // Pink collar accent
        ctx.fillStyle = '#ff8fc7';
        ctx.fillRect(8*scale, 17*scale, 8*scale, Math.max(1, 1*scale));
    }

    getSelectedAvatar() {
        return this.selectedAvatar;
    }

    // Generate a small avatar for leaderboard (16x16)
    generateSmallAvatar(avatarType) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        // Draw simplified version based on avatar type
        switch (avatarType) {
            case 'han': // Ace
                ctx.fillStyle = '#f4c2a1';
                ctx.fillRect(4, 4, 8, 8);
                ctx.fillStyle = '#4a3425';
                ctx.fillRect(3, 2, 10, 4);
                ctx.fillStyle = '#4a90e2';
                ctx.fillRect(5, 6, 1, 1);
                ctx.fillRect(10, 6, 1, 1);
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(2, 12, 12, 4);
                break;
            case 'ripley': // 
                ctx.fillStyle = '#f2c2a1';
                ctx.fillRect(4, 4, 8, 8);
                ctx.fillStyle = '#d4af37'; // Blonde
                ctx.fillRect(3, 2, 10, 4);
                ctx.fillStyle = '#f0d858'; // Highlights
                ctx.fillRect(5, 2, 1, 2);
                ctx.fillRect(8, 2, 1, 2);
                ctx.fillRect(11, 2, 1, 2);
                ctx.fillStyle = '#2d5016';
                ctx.fillRect(5, 6, 1, 1);
                ctx.fillRect(10, 6, 1, 1);
                ctx.fillStyle = '#4a5d23';
                ctx.fillRect(2, 12, 12, 4);
                break;
            case 'robot': // Marvin
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(3, 2, 10, 12);
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(4, 4, 8, 4);
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(5, 5, 2, 2);
                ctx.fillRect(9, 5, 2, 2);
                ctx.fillRect(7, 1, 2, 2);
                break;
            case 'alien': // Gorf
                ctx.fillStyle = '#5a8c69';
                ctx.fillRect(3, 1, 10, 13);
                ctx.fillStyle = '#000';
                ctx.fillRect(4, 4, 3, 3);
                ctx.fillRect(9, 4, 3, 3);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(5, 4, 1, 1);
                ctx.fillRect(10, 4, 1, 1);
                ctx.fillStyle = '#2d4a3a';
                ctx.fillRect(2, 12, 12, 4);
                break;
            case 'longjohn': // Long John (Pirate)
                ctx.fillStyle = '#d4a574';
                ctx.fillRect(4, 4, 8, 8);
                ctx.fillStyle = '#2d1f1a';
                ctx.fillRect(3, 2, 10, 4);
                ctx.fillStyle = '#cc4444'; // Red bandana
                ctx.fillRect(4, 2, 8, 1);
                ctx.fillStyle = '#4a90e2';
                ctx.fillRect(5, 6, 1, 1);
                ctx.fillStyle = '#000'; // Eyepatch
                ctx.fillRect(9, 5, 2, 2);
                ctx.fillStyle = '#666666'; // Beard
                ctx.fillRect(5, 9, 6, 3);
                ctx.fillStyle = '#1a2d5a'; // Pirate coat
                ctx.fillRect(2, 12, 12, 4);
                break;
            case 'missy': // Missy (Female with pink)
                ctx.fillStyle = '#f5c4a6';
                ctx.fillRect(4, 4, 8, 8);
                ctx.fillStyle = '#d65a9f'; // Pink hair
                ctx.fillRect(3, 2, 10, 4);
                ctx.fillStyle = '#ff69b4'; // Pink highlights
                ctx.fillRect(5, 2, 1, 2);
                ctx.fillRect(8, 2, 2, 2);
                ctx.fillRect(11, 2, 1, 2);
                ctx.fillStyle = '#2a7c4a';
                ctx.fillRect(5, 6, 1, 1);
                ctx.fillRect(10, 6, 1, 1);
                ctx.fillStyle = '#ffb3d9'; // Pink eyeshadow
                ctx.fillRect(4, 5, 2, 1);
                ctx.fillRect(9, 5, 2, 1);
                ctx.fillStyle = '#ff69b4'; // Pink lips
                ctx.fillRect(6, 9, 3, 1);
                ctx.fillStyle = '#cc4499'; // Pink flight suit
                ctx.fillRect(2, 12, 12, 4);
                break;
        }
        
        // Return the canvas as data URL for use in player list
        return canvas.toDataURL();
    }
    
    // Draw premium avatars
    drawPremiumAvatar(ctx, avatarId, size) {
        const scale = size / 24;
        
        // Set background based on avatar type
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, size, size);
        
        switch (avatarId) {
            case 'astronaut_gold':
                this.drawGoldenAstronaut(ctx, size);
                break;
            case 'alien_commander':
                this.drawAlienCommanderPremium(ctx, size);
                break;
            case 'cyber_pilot':
                this.drawCyberPilot(ctx, size);
                break;
            case 'galaxy_explorer':
                this.drawGalaxyExplorer(ctx, size);
                break;
            case 'neon_warrior':
                this.drawNeonWarrior(ctx, size);
                break;
            default:
                // Fallback to default avatar if unknown
                this.drawAce(ctx, size);
        }
    }
    
    drawGoldenAstronaut(ctx, size) {
        const scale = size / 24;
        
        // Dark space background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, size, size);
        
        // Golden helmet (larger for premium look)
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(5*scale, 3*scale, 14*scale, 12*scale);
        // Gold highlights
        ctx.fillStyle = '#ffdd33';
        ctx.fillRect(6*scale, 4*scale, 12*scale, 2*scale);
        ctx.fillRect(7*scale, 5*scale, 10*scale, 1*scale);
        
        // Dark visor
        ctx.fillStyle = '#001133';
        ctx.fillRect(7*scale, 6*scale, 10*scale, 8*scale);
        // Visor reflection
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(8*scale, 7*scale, 4*scale, 3*scale);
        ctx.fillStyle = '#33aaff';
        ctx.fillRect(9*scale, 8*scale, 2*scale, 1*scale);
        
        // Golden suit
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(6*scale, 15*scale, 12*scale, 9*scale);
        // Suit highlights
        ctx.fillStyle = '#ffdd33';
        ctx.fillRect(7*scale, 16*scale, 10*scale, 1*scale);
        ctx.fillRect(8*scale, 17*scale, 8*scale, 1*scale);
        
        // Control panel on chest
        ctx.fillStyle = '#ff6666';
        ctx.fillRect(10*scale, 18*scale, 4*scale, 2*scale);
        ctx.fillStyle = '#ffaaaa';
        ctx.fillRect(11*scale, 18*scale, 2*scale, 1*scale);
    }
    
    drawAlienCommanderPremium(ctx, size) {
        const scale = size / 24;
        
        // Dark space background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, size, size);
        
        // Large alien head (green)
        ctx.fillStyle = '#66aa66';
        ctx.fillRect(4*scale, 2*scale, 16*scale, 16*scale);
        // Head shading
        ctx.fillStyle = '#55aa55';
        ctx.fillRect(5*scale, 3*scale, 14*scale, 2*scale);
        
        // Large black eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(6*scale, 6*scale, 4*scale, 5*scale);
        ctx.fillRect(14*scale, 6*scale, 4*scale, 5*scale);
        
        // Eye pupils/reflections
        ctx.fillStyle = '#444444';
        ctx.fillRect(7*scale, 7*scale, 2*scale, 2*scale);
        ctx.fillRect(15*scale, 7*scale, 2*scale, 2*scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8*scale, 8*scale, 1*scale, 1*scale);
        ctx.fillRect(16*scale, 8*scale, 1*scale, 1*scale);
        
        // Command uniform
        ctx.fillStyle = '#333366';
        ctx.fillRect(6*scale, 18*scale, 12*scale, 6*scale);
        // Uniform details
        ctx.fillStyle = '#4444aa';
        ctx.fillRect(7*scale, 19*scale, 10*scale, 1*scale);
        
        // Command insignia (gold stars)
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(10*scale, 21*scale, 1*scale, 1*scale);
        ctx.fillRect(13*scale, 21*scale, 1*scale, 1*scale);
    }
    
    drawCyberPilot(ctx, size) {
        const scale = size / 24;
        
        // Dark tech background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, size, size);
        
        // Cybernetic head (metal gray)
        ctx.fillStyle = '#666677';
        ctx.fillRect(6*scale, 4*scale, 12*scale, 12*scale);
        // Tech panel lines
        ctx.fillStyle = '#4444aa';
        ctx.fillRect(7*scale, 5*scale, 10*scale, 1*scale);
        ctx.fillRect(8*scale, 7*scale, 8*scale, 1*scale);
        
        // Red cyber eye (left)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(8*scale, 8*scale, 3*scale, 3*scale);
        ctx.fillStyle = '#ffaaaa';
        ctx.fillRect(9*scale, 9*scale, 1*scale, 1*scale);
        
        // Normal eye (right)
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(13*scale, 9*scale, 2*scale, 2*scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14*scale, 9*scale, 1*scale, 1*scale);
        
        // Cybernetic implants
        ctx.fillStyle = '#999999';
        ctx.fillRect(5*scale, 8*scale, 1*scale, 4*scale);
        ctx.fillRect(18*scale, 7*scale, 1*scale, 5*scale);
        
        // High-tech suit
        ctx.fillStyle = '#222244';
        ctx.fillRect(5*scale, 16*scale, 14*scale, 8*scale);
        // Neon circuit lines
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(7*scale, 18*scale, 10*scale, 1*scale);
        ctx.fillRect(6*scale, 20*scale, 12*scale, 1*scale);
        ctx.fillRect(11*scale, 17*scale, 2*scale, 6*scale);
    }
    
    drawGalaxyExplorer(ctx, size) {
        const scale = size / 24;
        
        // Space background with stars
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, size, size);
        // Small stars
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(3*scale, 2*scale, 1*scale, 1*scale);
        ctx.fillRect(18*scale, 3*scale, 1*scale, 1*scale);
        ctx.fillRect(2*scale, 20*scale, 1*scale, 1*scale);
        
        // Explorer helmet (dark blue)
        ctx.fillStyle = '#1a2266';
        ctx.fillRect(5*scale, 3*scale, 14*scale, 14*scale);
        
        // Constellation pattern on helmet
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(7*scale, 5*scale, 1*scale, 1*scale);
        ctx.fillRect(11*scale, 4*scale, 1*scale, 1*scale);
        ctx.fillRect(15*scale, 6*scale, 1*scale, 1*scale);
        ctx.fillRect(9*scale, 7*scale, 1*scale, 1*scale);
        
        // Face visible through visor
        ctx.fillStyle = '#daa570';
        ctx.fillRect(8*scale, 9*scale, 8*scale, 5*scale);
        
        // Eyes
        ctx.fillStyle = '#4169e1';
        ctx.fillRect(10*scale, 11*scale, 2*scale, 2*scale);
        ctx.fillRect(12*scale, 11*scale, 2*scale, 2*scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(11*scale, 11*scale, 1*scale, 1*scale);
        ctx.fillRect(13*scale, 11*scale, 1*scale, 1*scale);
        
        // Explorer suit
        ctx.fillStyle = '#2f4f4f';
        ctx.fillRect(5*scale, 17*scale, 14*scale, 7*scale);
        
        // Galaxy mission patch
        ctx.fillStyle = '#9370db';
        ctx.fillRect(9*scale, 19*scale, 6*scale, 3*scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(11*scale, 20*scale, 2*scale, 1*scale);
    }
    
    drawNeonWarrior(ctx, size) {
        const scale = size / 24;
        
        // Dark void background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        
        // Dark ninja mask
        ctx.fillStyle = '#111111';
        ctx.fillRect(6*scale, 4*scale, 12*scale, 14*scale);
        
        // Glowing green eyes
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(8*scale, 8*scale, 3*scale, 3*scale);
        ctx.fillRect(13*scale, 8*scale, 3*scale, 3*scale);
        // Eye glow effect
        ctx.fillStyle = '#66ff66';
        ctx.fillRect(9*scale, 9*scale, 1*scale, 1*scale);
        ctx.fillRect(14*scale, 9*scale, 1*scale, 1*scale);
        
        // Face mask details
        ctx.fillStyle = '#333333';
        ctx.fillRect(7*scale, 6*scale, 10*scale, 1*scale);
        
        // Dark armor suit
        ctx.fillStyle = '#000022';
        ctx.fillRect(5*scale, 18*scale, 14*scale, 6*scale);
        
        // Neon circuit patterns
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(6*scale, 19*scale, 12*scale, 1*scale);
        ctx.fillRect(7*scale, 21*scale, 10*scale, 1*scale);
        ctx.fillRect(11*scale, 18*scale, 2*scale, 6*scale);
        
        // Shoulder pads with neon trim
        ctx.fillStyle = '#001122';
        ctx.fillRect(4*scale, 18*scale, 2*scale, 3*scale);
        ctx.fillRect(18*scale, 18*scale, 2*scale, 3*scale);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(4*scale, 18*scale, 2*scale, 1*scale);
        ctx.fillRect(18*scale, 18*scale, 2*scale, 1*scale);
    }
    
    // Draw profile avatar (for UI display)
    drawProfileAvatar() {
        const profileCanvas = document.getElementById('profileAvatarCanvas');
        if (profileCanvas) {
            const ctx = profileCanvas.getContext('2d');
            this.drawAvatar(profileCanvas, this.selectedAvatar);
        }
        
        // Also update any other profile displays
        const avatarDisplays = document.querySelectorAll('.avatar-display');
        avatarDisplays.forEach(canvas => {
            if (canvas.dataset.avatar === 'current') {
                this.drawAvatar(canvas, this.selectedAvatar);
            }
        });
    }
}
