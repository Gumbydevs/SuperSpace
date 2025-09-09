// Ship Skin System for SuperSpace
// Handles cosmetic ship appearances and effects

export class ShipSkinSystem {
    constructor() {
        this.activeSkins = this.loadActiveSkins();
        this.skinEffects = new Map();
        // Load effects enabled preference (default true)
        try {
            const stored = localStorage.getItem('shipSkinEffectsEnabled');
            this.effectsEnabled = stored === null ? true : stored === 'true';
        } catch(e) {
            this.effectsEnabled = true;
        }
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
        
        // Also update the global selectedShipSkin storage for consistency
        if (skinId && skinId !== 'none') {
            localStorage.setItem('selectedShipSkin', skinId);
        } else {
            localStorage.setItem('selectedShipSkin', 'none');
        }
        
        console.log(`Set active skin for ${shipType}: ${skinId}`);
    }
    
    // Get active skin for a ship type
    getActiveSkin(shipType) {
        // First check the new global selectedShipSkin storage (used by shop/player)
        const globalSelectedSkin = localStorage.getItem('selectedShipSkin');
        if (globalSelectedSkin && globalSelectedSkin !== 'none') {
            // Verify this skin is for the current ship type
            const skin = window.game?.premiumStore?.shipSkins?.find(s => s.id === globalSelectedSkin);
            if (skin && skin.shipType === shipType) {
                return globalSelectedSkin;
            }
        }
        
        // Fall back to the old activeSkins storage
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
        // Get active skin appearance - check ship.shipSkin first (for shop previews), then stored active skin
        let skinId = ship.shipSkin || this.getActiveSkin(ship.currentShip);
        const appearance = skinId ? this.getSkinAppearance(premiumStore, ship.currentShip, skinId) : null;
        
        // If we have a skin, temporarily override the ship colors BEFORE rendering
        const originalShipColor = ship.shipColor;
        const originalEngineColor = ship.engineColor;
        
        if (appearance) {
            // Override ship colors with skin colors
            ship.shipColor = appearance.color;
            ship.engineColor = appearance.accent || appearance.color;
        }
        
        ctx.save();
        
        // If a skin is active, draw the EXACT premium store preview geometry (no extra scribble overlays)
        if (appearance) {
            this.renderPremiumGeometry(ctx, ship.currentShip || 'scout', appearance.color, appearance.accent);
        } else if (typeof ship.render === 'function') {
            ship.render(ctx);
        } else {
            this.renderShipHullOnly(ctx, ship);
        }

    // THEN apply any special skin effects on top (respect user toggle)
    if (appearance && appearance.effect && this.effectsEnabled) {
            this.applySkinEffects(ctx, ship, appearance);
        }
        
        ctx.restore();
        
        // Restore original colors after rendering
        if (appearance) {
            ship.shipColor = originalShipColor;
            ship.engineColor = originalEngineColor;
        }
        
        // If a skin was used, also draw dynamic engine trail/flame based on ship visual state
        try {
            const thrust = (ship.thrustLevel !== undefined) ? ship.thrustLevel : (ship.speed ? Math.min(1, ship.speed * 0.01) : 0);
            if (thrust > 0) {
                // Choose engine color from appearance accent if available
                const engineColor = (appearance && appearance.accent) ? appearance.accent : (ship.engineColor || '#f66');
                // Render a simple engine trail behind the ship using existing helper
                // Provide a temporary object with x,y,rotation,vx,vy expected by renderEngineTrail
                const trailShip = {
                    x: ship.x || 0,
                    y: ship.y || 0,
                    rotation: ship.rotation || 0,
                    vx: ship.vx || 0,
                    vy: ship.vy || 0,
                    speed: ship.speed || 0
                };
                ctx.save();
                ctx.globalAlpha = appearance && this.effectsEnabled ? 1.0 : 0.9;
                this.renderEngineTrail(ctx, trailShip, engineColor);
                ctx.restore();
            }
        } catch (e) {
            // Non-fatal - if skins system doesn't have expected fields just skip engine trail
            // console.warn('shipskins: engine trail render skipped', e);
        }
    }

    // Toggle effects preference
    setEffectsEnabled(enabled) {
        this.effectsEnabled = !!enabled;
        try { localStorage.setItem('shipSkinEffectsEnabled', this.effectsEnabled ? 'true' : 'false'); } catch(e) {}
    }

    // Add distinctive accent / pattern overlays per skin so visual change is obvious
    drawSkinPattern(ctx, ship, skinId, appearance) {
        // Patterns disabled: exact geometry already drawn; keep function for backward compatibility.
        return; // Intentionally no-op now.
    }

    // Exact premium store geometry for consistency (centered at 0,0, no translation)
    renderPremiumGeometry(ctx, shipType, primaryColor, accentColor) {
    const shipColor = primaryColor || '#7d7d7d';
        const accent = accentColor || '#f66';
        switch (shipType) {
            case 'scout':
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.lineTo(-4, -10);
                ctx.lineTo(-12, 0);
                ctx.lineTo(-8, 8);
                ctx.lineTo(-5, 5);
                ctx.lineTo(0, 7);
                ctx.lineTo(5, 5);
                ctx.lineTo(8, 8);
                ctx.lineTo(12, 0);
                ctx.lineTo(4, -10);
                ctx.closePath();
                ctx.fill();
                // Cockpit
                ctx.fillStyle = 'rgba(130, 200, 255, 0.7)';
                ctx.beginPath();
                ctx.ellipse(0, -5, 3, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                // Detail lines
                ctx.strokeStyle = 'rgba(50, 50, 50, 0.7)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-8, 0); ctx.lineTo(-4, -8);
                ctx.moveTo(8, 0); ctx.lineTo(4, -8);
                ctx.stroke();
                break;
            case 'fighter':
                // Match player.js fighter geometry (larger, consistent size)
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -22); // Front nose tip (larger than old premium preview)
                ctx.lineTo(-5, -15); // Left side of nose
                ctx.lineTo(-18, -5); // Left wing tip
                ctx.lineTo(-12, 0); // Left wing inner edge
                ctx.lineTo(-15, 12); // Left rear wing
                ctx.lineTo(-5, 8); // Left engine mount
                ctx.lineTo(0, 10); // Center bottom
                ctx.lineTo(5, 8); // Right engine mount
                ctx.lineTo(15, 12); // Right rear wing
                ctx.lineTo(12, 0); // Right wing inner edge
                ctx.lineTo(18, -5); // Right wing tip
                ctx.lineTo(5, -15); // Right side of nose
                ctx.closePath();
                ctx.fill();
                // Cockpit
                ctx.fillStyle = 'rgba(180, 230, 255, 0.7)';
                ctx.beginPath();
                ctx.ellipse(0, -8, 4, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                // Wing markings/details
                ctx.fillStyle = accent;
                ctx.beginPath();
                ctx.moveTo(-15, -4);
                ctx.lineTo(-10, -2);
                ctx.lineTo(-10, 0);
                ctx.lineTo(-15, -2);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(15, -4);
                ctx.lineTo(10, -2);
                ctx.lineTo(10, 0);
                ctx.lineTo(15, -2);
                ctx.closePath();
                ctx.fill();
                break;
            case 'heavy':
                // Match player.js heavy/cruiser geometry (larger hull)
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -28); // Nose tip
                ctx.lineTo(-8, -20); // Left front angled edge
                ctx.lineTo(-12, -5); // Left mid-hull
                ctx.lineTo(-25, 0); // Left wing tip
                ctx.lineTo(-25, 5); // Left wing corner
                ctx.lineTo(-18, 8); // Left wing inner
                ctx.lineTo(-10, 18); // Left engine mount
                ctx.lineTo(0, 15); // Bottom center
                ctx.lineTo(10, 18); // Right engine mount
                ctx.lineTo(18, 8); // Right wing inner 
                ctx.lineTo(25, 5); // Right wing corner
                ctx.lineTo(25, 0); // Right wing tip
                ctx.lineTo(12, -5); // Right mid-hull
                ctx.lineTo(8, -20); // Right front angled edge
                ctx.closePath();
                ctx.fill();
                // Heavy armor plating - draw inside hull clip to avoid any overdraw
                ctx.save();
                // Create clipping path matching the hull
                ctx.beginPath();
                ctx.moveTo(0, -28);
                ctx.lineTo(-8, -20);
                ctx.lineTo(-12, -5);
                ctx.lineTo(-25, 0);
                ctx.lineTo(-25, 5);
                ctx.lineTo(-18, 8);
                ctx.lineTo(-10, 18);
                ctx.lineTo(0, 15);
                ctx.lineTo(10, 18);
                ctx.lineTo(18, 8);
                ctx.lineTo(25, 5);
                ctx.lineTo(25, 0);
                ctx.lineTo(12, -5);
                ctx.lineTo(8, -20);
                ctx.closePath();
                ctx.clip();

                ctx.strokeStyle = accent;
                ctx.lineWidth = 1;
                ctx.beginPath();
                // Left plating lines (subtle, inside the clip)
                ctx.moveTo(-10, -15);
                ctx.lineTo(-14, -6);
                // Right plating lines
                ctx.moveTo(10, -15);
                ctx.lineTo(14, -6);
                // Center seam
                ctx.moveTo(-8, -5);
                ctx.lineTo(8, -5);
                ctx.stroke();

                ctx.restore();
                // Cockpit
                ctx.fillStyle = 'rgba(150, 200, 255, 0.8)';
                ctx.beginPath();
                ctx.ellipse(0, -12, 5, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                // Side weapon mounts
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.rect(-22, -2, 8, 4);
                ctx.rect(14, -2, 8, 4);
                ctx.fill();
                break;
            case 'stealth':
                // Stealth ship - match player.js stealth sizing and subtle engine behavior
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -20); // Nose tip
                ctx.lineTo(-3, -15);
                ctx.lineTo(-15, -5);
                ctx.lineTo(-8, 5);
                ctx.lineTo(-12, 15);
                ctx.lineTo(-5, 12);
                ctx.lineTo(0, 10);
                ctx.lineTo(5, 12);
                ctx.lineTo(12, 15);
                ctx.lineTo(8, 5);
                ctx.lineTo(15, -5);
                ctx.lineTo(3, -15);
                ctx.closePath();
                ctx.fill();
                // Outline
                ctx.strokeStyle = accent;
                ctx.lineWidth = 1;
                ctx.stroke();
                // Panels (simplified)
                const stealthGradient2 = ctx.createLinearGradient(0, -12, 0, 12);
                stealthGradient2.addColorStop(0, shipColor);
                stealthGradient2.addColorStop(0.5, accent);
                stealthGradient2.addColorStop(1, shipColor);
                ctx.fillStyle = stealthGradient2;
                ctx.beginPath();
                ctx.moveTo(-8, -2); ctx.lineTo(-5, 0); ctx.lineTo(-6, 6); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(8, -2); ctx.lineTo(5, 0); ctx.lineTo(6, 6); ctx.lineTo(9, 9); ctx.closePath(); ctx.fill();
                // Cockpit
                ctx.fillStyle = accent;
                ctx.beginPath(); ctx.ellipse(0, -6, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
                break;
            default:
                // Fallback simple circle
                ctx.fillStyle = shipColor;
                ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
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
    
    // Render just the ship hull for previews (no shields, UI, etc.)
    renderShipHullOnly(ctx, ship) {
    const shipColor = ship.getShipColor ? ship.getShipColor() : (ship.shipColor || '#7d7d7d');
        const engineColor = ship.getEngineColor ? ship.getEngineColor() : (ship.engineColor || '#f66');
        
        // Render based on current ship type if available
        const shipType = ship.currentShip || window.game?.player?.shipType || 'scout';
        
        ctx.save();
        ctx.translate(ship.x || 0, ship.y || 0);
        if (ship.rotation) {
            ctx.rotate(ship.rotation);
        }
        
        // Use the SAME detailed geometry as premium store previews
        switch (shipType) {
            case 'scout':
                // EXACT scout ship geometry from premium store
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -15); // front nose
                ctx.lineTo(-4, -10); // left nose edge
                ctx.lineTo(-12, 0); // left wing tip
                ctx.lineTo(-8, 8); // left rear corner
                ctx.lineTo(-5, 5); // left engine mount
                ctx.lineTo(0, 7); // center bottom
                ctx.lineTo(5, 5); // right engine mount
                ctx.lineTo(8, 8); // right rear corner
                ctx.lineTo(12, 0); // right wing tip
                ctx.lineTo(4, -10); // right nose edge
                ctx.closePath();
                ctx.fill();
                
                // Cockpit canopy
                ctx.fillStyle = 'rgba(130, 200, 255, 0.7)';
                ctx.beginPath();
                ctx.ellipse(0, -5, 3, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Detail lines
                ctx.strokeStyle = 'rgba(50, 50, 50, 0.7)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-8, 0);
                ctx.lineTo(-4, -8);
                ctx.moveTo(8, 0);
                ctx.lineTo(4, -8);
                ctx.stroke();
                break;
                
            case 'fighter':
                // EXACT fighter ship geometry from premium store
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -16); // Front nose tip
                ctx.lineTo(-3, -11); // Left side of nose
                ctx.lineTo(-13, -3); // Left wing tip
                ctx.lineTo(-9, 0); // Left wing inner edge
                ctx.lineTo(-11, 9); // Left rear wing
                ctx.lineTo(-3, 6); // Left engine mount
                ctx.lineTo(0, 7); // Center bottom
                ctx.lineTo(3, 6); // Right engine mount
                ctx.lineTo(11, 9); // Right rear wing
                ctx.lineTo(9, 0); // Right wing inner edge
                ctx.lineTo(13, -3); // Right wing tip
                ctx.lineTo(3, -11); // Right side of nose
                ctx.closePath();
                ctx.fill();
                
                // Cockpit
                ctx.fillStyle = 'rgba(180, 230, 255, 0.7)';
                ctx.beginPath();
                ctx.ellipse(0, -6, 3, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Wing markings/details
                ctx.fillStyle = engineColor;
                ctx.beginPath();
                ctx.moveTo(-11, -2);
                ctx.lineTo(-7, -1);
                ctx.lineTo(-7, 1);
                ctx.lineTo(-11, 0);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(11, -2);
                ctx.lineTo(7, -1);
                ctx.lineTo(7, 1);
                ctx.lineTo(11, 0);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'heavy':
                // EXACT heavy ship geometry from premium store
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(0, -18); // Nose tip
                ctx.lineTo(-5, -13); // Left front angled edge
                ctx.lineTo(-8, -3); // Left mid-hull
                ctx.lineTo(-16, 0); // Left wing tip
                ctx.lineTo(-16, 3); // Left wing corner
                ctx.lineTo(-12, 5); // Left wing inner
                ctx.lineTo(-6, 11); // Left engine mount
                ctx.lineTo(0, 9); // Bottom center
                ctx.lineTo(6, 11); // Right engine mount
                ctx.lineTo(12, 5); // Right wing inner 
                ctx.lineTo(16, 3); // Right wing corner
                ctx.lineTo(16, 0); // Right wing tip
                ctx.lineTo(8, -3); // Right mid-hull
                ctx.lineTo(5, -13); // Right front angled edge
                ctx.closePath();
                ctx.fill();
                
                // Heavy armor plating
                ctx.strokeStyle = engineColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-6, -9);
                ctx.lineTo(-9, -3);
                ctx.moveTo(6, -9);
                ctx.lineTo(9, -3);
                ctx.moveTo(-6, -3);
                ctx.lineTo(6, -3);
                ctx.stroke();
                
                // Cockpit
                ctx.fillStyle = 'rgba(150, 200, 255, 0.8)';
                ctx.beginPath();
                ctx.ellipse(0, -7, 3, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Side weapon mounts
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.rect(-14, -1, 5, 2);
                ctx.rect(9, -1, 5, 2);
                ctx.fill();
                break;
            case 'stealth':
                // Use the premium geometry for stealth previews so the appearance tab matches the store
                this.renderPremiumGeometry(ctx, 'stealth', shipColor, accentColor);
                break;
                
            default:
                // Simple default ship
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = engineColor;
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
}
