// Marvin the Robot Assistant for SuperSpace
// Provides a character assistant for game notifications

export class MarvinAssistant {
    constructor() {
        // Create style for Marvin
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes marvinWave {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-15deg); }
                75% { transform: rotate(15deg); }
            }
            
            @keyframes marvinLightBlink {
                0%, 50%, 100% { opacity: 1; }
                25%, 75% { opacity: 0.5; }
            }
            
            @keyframes marvinAppear {
                0% { transform: translateX(30px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            
            .marvin-container {
                position: absolute;
                top: 0px;
                left: 100%;
                width: 48px;
                height: 48px;
                pointer-events: none;
                animation: marvinAppear 0.5s ease-out forwards;
                z-index: 10001; /* Ensure Marvin appears above other elements */
            }
            
            .marvin-canvas {
                width: 48px;
                height: 48px;
            }
            
            .marvin-arm {
                position: absolute;
                width: 6px;
                height: 16px;
                background: #666;
                top: 30px;
                right: 10px;
                transform-origin: top center;
                animation: marvinWave 2s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    createMarvin() {
        const container = document.createElement('div');
        container.className = 'marvin-container';
        
        // Create arm that waves
        const arm = document.createElement('div');
        arm.className = 'marvin-arm';
        container.appendChild(arm);
        
        // Create canvas for pixel art
        const canvas = document.createElement('canvas');
        canvas.className = 'marvin-canvas';
        canvas.width = 48;
        canvas.height = 48;
        container.appendChild(canvas);
        
        // Draw Marvin on the canvas
        this.drawMarvin(canvas.getContext('2d'), 48);
        
        return container;
    }
    
    drawMarvin(ctx, size) {
        // AI Unit - Marvin (scalable)
        // This matches the pixel art style from avatarmanager.js
        const scale = size / 24;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, size, size);
        
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
        
    // Add arms - angled upwards and outwards at 45 degrees
    ctx.save();
    ctx.fillStyle = '#666';
    // Left arm
    ctx.translate(6*scale, 19*scale); // Move to left shoulder
    ctx.rotate(-Math.PI/4); // Rotate -45 degrees (up and out)
    ctx.fillRect(-1*scale, 0, 2*scale, 7*scale); // Draw arm
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#666';
    // Right arm
    ctx.translate(18*scale, 19*scale); // Move to right shoulder
    ctx.rotate(Math.PI/4); // Rotate +45 degrees (up and out)
    ctx.fillRect(-1*scale, 0, 2*scale, 7*scale); // Draw arm
    ctx.restore();
    }
    
    attachToNotification(notificationElement) {
        const marvin = this.createMarvin();
        notificationElement.style.position = 'relative';
        notificationElement.appendChild(marvin);
        return marvin;
    }
}

// Initialize Marvin globally for easy access
window.marvinAssistant = new MarvinAssistant();
