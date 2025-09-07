// Avatar Manager for SuperSpace
// Handles pilot avatar selection and rendering retro-style portraits

export class AvatarManager {
    constructor() {
        this.selectedAvatar = localStorage.getItem('selectedAvatar') || 'han';
        this.avatarOptions = ['han', 'ripley', 'robot', 'alien'];
        this.initialized = false;
        
        // Try to initialize immediately, but also provide a manual init method
        this.tryInitialize();
    }

    tryInitialize() {
        const avatarOptions = document.querySelectorAll('.avatar-option');
        if (avatarOptions.length > 0) {
            this.setupAvatarSelection();
            this.drawAllAvatars();
            this.initialized = true;
        }
    }

    // Method to initialize after DOM is ready
    initialize() {
        if (!this.initialized) {
            this.tryInitialize();
        }
    }

    setupAvatarSelection() {
        const avatarOptions = document.querySelectorAll('.avatar-option');
        
        avatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                const avatarType = option.dataset.avatar;
                this.selectAvatar(avatarType);
            });
        });

        // Set initial selection
        this.updateSelection();
    }

    selectAvatar(avatarType) {
        this.selectedAvatar = avatarType;
        localStorage.setItem('selectedAvatar', avatarType);
        this.updateSelection();
        
        // Trigger callback if provided
        if (this.onAvatarChange) {
            this.onAvatarChange(avatarType);
        }
    }

    updateSelection() {
        const avatarOptions = document.querySelectorAll('.avatar-option');
        avatarOptions.forEach(option => {
            if (option.dataset.avatar === this.selectedAvatar) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    drawAllAvatars() {
        const avatarCanvases = document.querySelectorAll('.avatar-canvas');
        avatarCanvases.forEach(canvas => {
            const avatarType = canvas.parentElement.dataset.avatar;
            this.drawAvatar(canvas, avatarType);
        });
    }

    drawAvatar(canvas, avatarType) {
        const ctx = canvas.getContext('2d');
        const size = 24; // Back to 24x24 but in compact containers
        
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        
        // Set smooth rendering
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
        }
    }

    drawAce(ctx, size) {
        // Cool guy pilot - Ace (24x24)
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, size, size);
        
        // Face
        ctx.fillStyle = '#f4c2a1';
        ctx.fillRect(7, 6, 10, 12);
        
        // Brown hair
        ctx.fillStyle = '#4a3425';
        ctx.fillRect(6, 4, 12, 4);
        ctx.fillRect(5, 5, 2, 3);
        ctx.fillRect(17, 5, 2, 3);
        
        // Eyes
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(8, 8, 1, 1);
        ctx.fillRect(14, 8, 1, 1);
        
        // Nose
        ctx.fillStyle = '#e6a478';
        ctx.fillRect(11, 10, 1, 1);
        
        // Mouth
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(10, 12, 3, 1);
        
        // Jacket
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(4, 17, 16, 7);
        ctx.fillStyle = '#654321';
        ctx.fillRect(6, 19, 12, 5);
    }

    drawRiley(ctx, size) {
        // Tough female commander - Riley (24x24)
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, size, size);
        
        // Face (feminine)
        ctx.fillStyle = '#f2c2a1';
        ctx.fillRect(7, 6, 10, 12);
        
        // Blonde hair (shoulder length)
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(6, 4, 12, 5);
        ctx.fillRect(5, 5, 2, 4);
        ctx.fillRect(17, 5, 2, 4);
        // Highlights
        ctx.fillStyle = '#f0d858';
        ctx.fillRect(8, 4, 1, 3);
        ctx.fillRect(12, 4, 1, 3);
        ctx.fillRect(15, 4, 1, 3);
        
        // Eyes (larger, feminine)
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(8, 8, 1, 1);
        ctx.fillRect(14, 8, 1, 1);
        
        // Eyebrows (arched)
        ctx.fillStyle = '#b8941f';
        ctx.fillRect(8, 7, 2, 1);
        ctx.fillRect(14, 7, 2, 1);
        
        // Nose (smaller)
        ctx.fillStyle = '#e6a478';
        ctx.fillRect(11, 10, 1, 1);
        
        // Mouth
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(10, 12, 3, 1);
        
        // Military uniform
        ctx.fillStyle = '#4a5d23';
        ctx.fillRect(4, 17, 16, 7);
        ctx.fillStyle = '#3a4d1a';
        ctx.fillRect(6, 19, 12, 5);
        
        // Rank insignia
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(7, 20, 1, 1);
        ctx.fillRect(9, 20, 1, 1);
        ctx.fillRect(15, 20, 1, 1);
    }

    drawMarvin(ctx, size) {
        // AI Unit - Marvin (24x24)
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, size, size);
        
        // Head (metallic)
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(6, 4, 12, 14);
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(7, 5, 10, 12);
        
        // Visor
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(8, 6, 8, 6);
        
        // Eyes (glowing red)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(9, 7, 2, 2);
        ctx.fillRect(13, 7, 2, 2);
        
        // Mouth grille
        ctx.fillStyle = '#666';
        ctx.fillRect(9, 11, 6, 2);
        ctx.fillStyle = '#333';
        ctx.fillRect(10, 11, 1, 1);
        ctx.fillRect(12, 11, 1, 1);
        ctx.fillRect(14, 11, 1, 1);
        
        // Antenna
        ctx.fillStyle = '#888';
        ctx.fillRect(11, 2, 2, 3);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(11, 2, 2, 1);
        
        // Body
        ctx.fillStyle = '#808080';
        ctx.fillRect(5, 17, 14, 7);
        ctx.fillStyle = '#696969';
        ctx.fillRect(6, 18, 12, 6);
        
        // Control lights
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(7, 20, 1, 1);
        ctx.fillRect(9, 20, 1, 1);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(11, 20, 1, 1);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(13, 20, 1, 1);
        ctx.fillRect(15, 20, 1, 1);
    }

    drawGorf(ctx, size) {
        // Green alien pilot - Gorf (24x24)
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, size, size);
        
        // Head (large alien)
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(6, 2, 12, 16);
        ctx.fillStyle = '#5a8c69';
        ctx.fillRect(7, 3, 10, 14);
        
        // Large alien eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(8, 6, 3, 4);
        ctx.fillRect(13, 6, 3, 4);
        ctx.fillStyle = '#2d5d3d';
        ctx.fillRect(8, 6, 2, 3);
        ctx.fillRect(13, 6, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 6, 1, 1);
        ctx.fillRect(13, 6, 1, 1);
        
        // Nose slits
        ctx.fillStyle = '#3a6c49';
        ctx.fillRect(11, 10, 1, 1);
        ctx.fillRect(12, 10, 1, 1);
        
        // Small mouth
        ctx.fillStyle = '#2d5d3d';
        ctx.fillRect(10, 13, 3, 1);
        
        // Elongated skull
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(7, 1, 10, 3);
        ctx.fillRect(8, 0, 8, 2);
        
        // Alien uniform
        ctx.fillStyle = '#2d4a3a';
        ctx.fillRect(5, 17, 14, 7);
        ctx.fillStyle = '#3a5a4a';
        ctx.fillRect(6, 18, 12, 6);
        
        // Tech details
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(7, 20, 1, 1);
        ctx.fillRect(9, 20, 1, 1);
        ctx.fillRect(11, 20, 1, 1);
        ctx.fillRect(13, 20, 1, 1);
        ctx.fillRect(15, 20, 1, 1);
        
        // Neck ridges
        ctx.fillStyle = '#3a6c49';
        ctx.fillRect(9, 15, 6, 1);
        ctx.fillRect(10, 16, 4, 1);
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
        }
        
        return canvas.toDataURL();
    }
}
