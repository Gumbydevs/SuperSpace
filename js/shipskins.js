// Ship Skin System for SuperSpace
// Handles cosmetic ship appearances and effects

export class ShipSkinSystem {
    constructor() {
        this.activeSkins = this.loadActiveSkins();
        this.skinEffects = new Map();
    }
    
    loadActiveSkins() {
        const stored = localStorage.getItem('activeSkins');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to load active skins:', e);
            }
        }
        return {};
    }
    
    saveActiveSkins() {
        localStorage.setItem('activeSkins', JSON.stringify(this.activeSkins));
    }
    
    // Set active skin for a ship type
    setActiveSkin(shipType, skinId) {
        this.activeSkins[shipType] = skinId;
        this.saveActiveSkins();
        console.log(`Set active skin for ${shipType}: ${skinId}`);
    }
    
    // Get active skin for a ship type
    getActiveSkin(shipType) {
        return this.activeSkins[shipType] || null;
    }
    
    // Remove active skin (revert to default)
    removeActiveSkin(shipType) {
        delete this.activeSkins[shipType];
        this.saveActiveSkins();
    }
    
    // Get skin appearance data
    getSkinAppearance(premiumStore, shipType, skinId) {
        if (!skinId) return null;
        
        const skin = premiumStore.shipSkins.find(s => s.id === skinId);
        return skin ? skin.appearance : null;
    }
    
    // Apply skin effects to ship rendering
    applySkinEffects(ctx, ship, appearance) {
        if (!appearance || !appearance.effect) return;
        
        const effect = appearance.effect;
        const time = Date.now() * 0.001;
        
        ctx.save();
        
        switch (effect) {
            case 'glow':
                this.applyGlowEffect(ctx, ship, appearance, time);
                break;
            case 'stealth':
                this.applyStealthEffect(ctx, ship, appearance, time);
                break;
            case 'metallic':
                this.applyMetallicEffect(ctx, ship, appearance, time);
                break;
            case 'void':
                this.applyVoidEffect(ctx, ship, appearance, time);
                break;
            case 'industrial':
                this.applyIndustrialEffect(ctx, ship, appearance, time);
                break;
            case 'fire':
                this.applyFireEffect(ctx, ship, appearance, time);
                break;
        }
        
        ctx.restore();
    }
    
    applyGlowEffect(ctx, ship, appearance, time) {
        // Create pulsing glow effect
        const pulseIntensity = 0.5 + 0.5 * Math.sin(time * 3);
        const glowRadius = 30 + pulseIntensity * 10;
        
        const gradient = ctx.createRadialGradient(
            ship.x, ship.y, 0,
            ship.x, ship.y, glowRadius
        );
        
        const glowColor = appearance.color;
        gradient.addColorStop(0, `${glowColor}66`); // Semi-transparent center
        gradient.addColorStop(0.7, `${glowColor}33`);
        gradient.addColorStop(1, `${glowColor}00`); // Fully transparent edge
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
    
    applyStealthEffect(ctx, ship, appearance, time) {
        // Flickering transparency effect
        const flicker = 0.3 + 0.4 * Math.sin(time * 5) * Math.sin(time * 2.3);
        ctx.globalAlpha = flicker;
        
        // Add scanning lines
        ctx.strokeStyle = appearance.accent + '44';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        
        for (let i = 0; i < 3; i++) {
            const offset = (time * 50 + i * 10) % 60 - 30;
            ctx.beginPath();
            ctx.moveTo(ship.x - 25, ship.y + offset);
            ctx.lineTo(ship.x + 25, ship.y + offset);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
    
    applyMetallicEffect(ctx, ship, appearance, time) {
        // Metallic reflection sweep
        const sweep = (time * 0.5) % 2 - 1; // -1 to 1
        
        const gradient = ctx.createLinearGradient(
            ship.x - 30, ship.y - 30,
            ship.x + 30, ship.y + 30
        );
        
        const reflection = Math.abs(sweep);
        gradient.addColorStop(0, appearance.color);
        gradient.addColorStop(0.5 - sweep * 0.3, appearance.color);
        gradient.addColorStop(0.5, appearance.accent + 'aa');
        gradient.addColorStop(0.5 + sweep * 0.3, appearance.color);
        gradient.addColorStop(1, appearance.color);
        
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
    
    applyVoidEffect(ctx, ship, appearance, time) {
        // Dark energy distortion
        const distortion = Math.sin(time * 2) * 0.1;
        
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.scale(1 + distortion, 1 - distortion);
        ctx.translate(-ship.x, -ship.y);
        
        // Void particles
        ctx.fillStyle = appearance.accent + '77';
        for (let i = 0; i < 8; i++) {
            const angle = (time + i) * 0.5;
            const distance = 20 + Math.sin(time * 3 + i) * 5;
            const px = ship.x + Math.cos(angle) * distance;
            const py = ship.y + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(px, py, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    applyIndustrialEffect(ctx, ship, appearance, time) {
        // Warning light flashing
        const flash = Math.floor(time * 4) % 2;
        if (flash) {
            ctx.fillStyle = appearance.accent + '88';
            ctx.fillRect(ship.x - 15, ship.y - 2, 30, 4);
            ctx.fillRect(ship.x - 2, ship.y - 15, 4, 30);
        }
        
        // Industrial panel lines
        ctx.strokeStyle = appearance.accent + '66';
        ctx.lineWidth = 1;
        
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(ship.x - 20, ship.y + i * 8);
            ctx.lineTo(ship.x + 20, ship.y + i * 8);
            ctx.stroke();
        }
    }
    
    applyFireEffect(ctx, ship, appearance, time) {
        // Flame trail particles
        ctx.fillStyle = appearance.color + '88';
        
        for (let i = 0; i < 12; i++) {
            const age = (time * 3 + i) % 1;
            const trailX = ship.x - ship.vx * age * 0.1 + (Math.random() - 0.5) * 10 * age;
            const trailY = ship.y - ship.vy * age * 0.1 + (Math.random() - 0.5) * 10 * age;
            const size = (1 - age) * 3;
            
            if (size > 0.5) {
                ctx.beginPath();
                ctx.arc(trailX, trailY, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Phoenix glow
        const phoenixGlow = ctx.createRadialGradient(
            ship.x, ship.y, 0,
            ship.x, ship.y, 35
        );
        phoenixGlow.addColorStop(0, appearance.accent + '44');
        phoenixGlow.addColorStop(0.7, appearance.color + '22');
        phoenixGlow.addColorStop(1, appearance.color + '00');
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = phoenixGlow;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // Render ship with skin
    renderShipWithSkin(ctx, ship, premiumStore) {
        // Get active skin appearance
        const skinId = this.getActiveSkin(ship.currentShip);
        const appearance = skinId ? this.getSkinAppearance(premiumStore, ship.currentShip, skinId) : null;
        
        // If we have a skin, temporarily override the ship colors
        const originalShipColor = ship.shipColor;
        const originalEngineColor = ship.engineColor;
        
        if (appearance) {
            ship.shipColor = appearance.color;
            ship.engineColor = appearance.accent || appearance.color;
        }
        
        ctx.save();
        
        // Apply any special skin effects
        if (appearance) {
            this.applySkinEffects(ctx, ship, appearance);
        }
        
        // Call the original ship render method if available
        if (typeof ship.render === 'function') {
            ship.render(ctx);
        } else {
            // For shop previews, use the actual player's render method
            if (window.game && window.game.player && typeof window.game.player.render === 'function') {
                // Temporarily override player position and rotation for preview
                const originalX = window.game.player.x;
                const originalY = window.game.player.y;
                const originalRotation = window.game.player.rotation;
                
                window.game.player.x = 0;
                window.game.player.y = 0;
                window.game.player.rotation = 0;
                
                // Render using the actual player's render method
                window.game.player.render(ctx);
                
                // Restore original position
                window.game.player.x = originalX;
                window.game.player.y = originalY;
                window.game.player.rotation = originalRotation;
            } else {
                // Last resort fallback
                this.renderProperShipForPreview(ctx, ship);
            }
        }
        
        ctx.restore();
        
        // Restore original colors
        if (appearance) {
            ship.shipColor = originalShipColor;
            ship.engineColor = originalEngineColor;
        }
    }
    
    renderShipGeometry(ctx, ship, primaryColor, accentColor) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.rotation);
        
        // Different shapes for different ship types
        switch (ship.currentShip) {
            case 'scout':
                this.renderScoutGeometry(ctx, primaryColor, accentColor);
                break;
            case 'fighter':
                this.renderFighterGeometry(ctx, primaryColor, accentColor);
                break;
            case 'heavy':
                this.renderHeavyGeometry(ctx, primaryColor, accentColor);
                break;
            default:
                this.renderDefaultGeometry(ctx, primaryColor, accentColor);
        }
        
        ctx.restore();
    }
    
    renderScoutGeometry(ctx, primaryColor, accentColor) {
        // Scout ship - triangle design
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -8);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.fill();
        
        // Accent details
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Engine trail
        ctx.fillStyle = accentColor + '77';
        ctx.beginPath();
        ctx.arc(-8, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderFighterGeometry(ctx, primaryColor, accentColor) {
        // Fighter ship - classic fighter design
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        // Main body
        ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Wings
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(-15, -12);
        ctx.lineTo(-12, -6);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-8, 8);
        ctx.lineTo(-15, 12);
        ctx.lineTo(-12, 6);
        ctx.closePath();
        ctx.fill();
        
        // Nose
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(8, -3);
        ctx.lineTo(8, 3);
        ctx.closePath();
        ctx.fill();
    }
    
    renderHeavyGeometry(ctx, primaryColor, accentColor) {
        // Heavy cruiser - large rectangular design
        ctx.fillStyle = primaryColor;
        ctx.fillRect(-15, -10, 30, 20);
        
        // Armor plating details
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -10, 30, 20);
        
        // Command tower
        ctx.fillStyle = accentColor;
        ctx.fillRect(-5, -8, 15, 6);
        
        // Engine blocks
        ctx.fillStyle = primaryColor;
        ctx.fillRect(-18, -6, 6, 4);
        ctx.fillRect(-18, 2, 6, 4);
        
        // Engine glow
        ctx.fillStyle = accentColor + 'aa';
        ctx.beginPath();
        ctx.arc(-20, -4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-20, 4, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderDefaultGeometry(ctx, primaryColor, accentColor) {
        // Default simple ship
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    renderEngineTrail(ctx, ship, engineColor) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.rotation);
        
        // Engine trail particles
        const trailLength = Math.min(ship.speed * 0.1, 20);
        ctx.fillStyle = engineColor + '77';
        
        for (let i = 0; i < 3; i++) {
            const x = -15 - i * 3;
            const y = (Math.random() - 0.5) * 6;
            const size = 2 - i * 0.5;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Proper ship rendering for shop previews
    renderProperShipForPreview(ctx, ship) {
        const shipColor = ship.getShipColor ? ship.getShipColor() : '#33f';
        const engineColor = ship.getEngineColor ? ship.getEngineColor() : '#f66';
        
        // Use the same ship rendering as the actual game
        // This is based on the default ship design from player.js
        
        ctx.fillStyle = shipColor;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        
        // Main ship body (triangle with rounded edges)
        ctx.beginPath();
        ctx.moveTo(12, 0);    // Nose point
        ctx.lineTo(-8, -6);   // Left wing
        ctx.lineTo(-6, -3);   // Left inner
        ctx.lineTo(-6, 3);    // Right inner  
        ctx.lineTo(-8, 6);    // Right wing
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Cockpit detail
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(2, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Engine glow
        ctx.fillStyle = engineColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(-6, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Wing tips
        ctx.fillStyle = '#aaa';
        ctx.fillRect(-8, -6, 2, 1);
        ctx.fillRect(-8, 5, 2, 1);
    }
}
