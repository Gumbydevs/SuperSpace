// Avatar Manager for SuperSpace
// Handles pilot avatar selection and rendering retro-style portraits

export class AvatarManager {
    constructor() {
        this.selectedAvatar = localStorage.getItem('selectedAvatar') || 'han';
        this.avatarOptions = ['han', 'ripley', 'robot', 'alien', 'longjohn', 'missy'];
        this.initialized = false;
        this.tempSelection = null; // For modal selection
        
        // Try to initialize immediately, but also provide a manual init method
        this.tryInitialize();
    }

    tryInitialize() {
        const avatarOptions = document.querySelectorAll('.avatar-option');
        if (avatarOptions.length > 0) {
            this.setupAvatarSelection();
            this.setupModalControls();
            this.drawAllAvatars();
            this.drawProfileAvatar();
            this.initialized = true;
        }
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
                if (avatarType && !option.classList.contains('disabled')) {
                    this.tempSelection = avatarType;
                    this.updateModalSelection();
                }
            });
        });
    }

    drawProfileAvatar() {
        const profileCanvas = document.getElementById('profileAvatarCanvas');
        if (profileCanvas) {
            this.drawAvatar(profileCanvas, this.selectedAvatar, 64);
        }
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
            case 'ripley': // Riley
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
        
        return canvas.toDataURL();
    }
}
