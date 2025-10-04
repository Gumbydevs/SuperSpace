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
    } catch (e) {
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

  // --- Color helpers ---
  // Convert a hex color (#rgb or #rrggbb) to {r,g,b}
  _hexToRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    const cleaned = hex.replace('#', '');
    if (cleaned.length === 3) {
      return {
        r: parseInt(cleaned[0] + cleaned[0], 16),
        g: parseInt(cleaned[1] + cleaned[1], 16),
        b: parseInt(cleaned[2] + cleaned[2], 16),
      };
    }
    if (cleaned.length === 6) {
      return {
        r: parseInt(cleaned.substring(0, 2), 16),
        g: parseInt(cleaned.substring(2, 4), 16),
        b: parseInt(cleaned.substring(4, 6), 16),
      };
    }
    // fallback
    return { r: 0, g: 0, b: 0 };
  }

  _rgbToHex({ r, g, b }) {
    const toHex = (v) => {
      const s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length === 1 ? '0' + s : s;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Return true if the hex color is very dark (near black)
  _isHexDark(hex) {
    try {
      const { r, g, b } = this._hexToRgb(String(hex || '#000'));
      // Perceived luminance
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return lum < 0.22; // threshold: very dark
    } catch (e) {
      return false;
    }
  }

  // Mix two hex colors. weight is fraction of colorB (0..1). Result is hex string.
  _mixHex(colorA, colorB, weight = 0.5) {
    const a = this._hexToRgb(String(colorA || '#000'));
    const b = this._hexToRgb(String(colorB || '#000'));
    const w = Math.max(0, Math.min(1, Number(weight) || 0));
    const r = a.r * (1 - w) + b.r * w;
    const g = a.g * (1 - w) + b.g * w;
    const bcol = a.b * (1 - w) + b.b * w;
    return this._rgbToHex({ r, g, b: bcol });
  }

  // Convert a hex color (#rgb or #rrggbb) to an rgba(...) string with given alpha
  _hexToRgbaString(hex, alpha = 1) {
    try {
      const { r, g, b } = this._hexToRgb(String(hex || '#000'));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
      return null;
    }
  }


  saveActiveSkins() {
    localStorage.setItem('activeSkins', JSON.stringify(this.activeSkins));
  }

  // Set active skin for a ship type
  setActiveSkin(shipType, skinId) {
    // Enforce that skins can only be activated if the player actually owns them.
    // This prevents non-playtesters from manually setting the playtester-only skin
    // via localStorage or other means.
    try {
      if (skinId && skinId !== 'none' && window.game && window.game.premiumStore) {
        const premiumStore = window.game.premiumStore;
        const skinData = premiumStore.shipSkins.find((s) => s.id === skinId);
        if (!skinData) {
          console.warn(`Unknown skin id: ${skinId}`);
          return false;
        }

        // Primary check: explicit owned flag on the skin entry
        let isOwned = !!skinData.owned;

        // Secondary check: premiumPurchases recorded (newer shape)
        try {
          const purchases = premiumStore.premiumPurchases || {};
          const purchasedSkins = Array.isArray(purchases.skins) ? purchases.skins : [];
          if (purchasedSkins.includes(skinId)) isOwned = true;
        } catch (e) {
          // ignore parsing issues
        }

        // Tertiary check: legacy localStorage key ownedSkins
        try {
          const legacyOwned = JSON.parse(localStorage.getItem('ownedSkins') || '[]');
          if (Array.isArray(legacyOwned) && legacyOwned.includes(skinId)) isOwned = true;
        } catch (e) {}

        // Final fallback: allow if the skin is exclusive but the player has an explicit
        // selectedSkin set to it (this can happen in preview flows). This prevents
        // a bad UX where the Appearance tab preview cannot be applied for granted entitlements.
        try {
          const sel = localStorage.getItem('selectedShipSkin');
          if (sel === skinId) isOwned = true;
        } catch (e) {}

        if (!isOwned) {
          console.warn(`Attempt to equip skin not owned: ${skinId}`);
          return false;
        }

        // CRITICAL: Verify ship type matches - block if mismatch
        if (skinData.shipType && skinData.shipType !== shipType) {
          console.warn(`Skin ${skinId} (type: ${skinData.shipType}) does not match current ship type ${shipType} - blocking equip`);
          return false;
        }
      }
    } catch (e) {
      // On any error, fail-safe by rejecting activation so we don't accidentally
      // enable an exclusive skin.
      console.warn('Error while validating skin ownership, blocking equip', e);
      return false;
    }

    this.activeSkins[shipType] = skinId;
    this.saveActiveSkins();

    // Also update the global selectedShipSkin storage for consistency
    try {
      if (skinId && skinId !== 'none') {
        localStorage.setItem('selectedShipSkin', skinId);
        // Increment skinsEquipped stat if available and trigger challenge check
        if (window.game && window.game.playerProfile) {
          // Use centralized helper so challenge checks always run
          if (typeof window.game.playerProfile.onSkinEquipped === 'function') {
            window.game.playerProfile.onSkinEquipped();
          } else {
            window.game.playerProfile.stats.skinsEquipped = (window.game.playerProfile.stats.skinsEquipped || 0) + 1;
            if (typeof window.game.playerProfile.saveStats === 'function') window.game.playerProfile.saveStats();
            if (window.game && window.game.challengeSystem) {
              window.game.challengeSystem.check('daily');
              window.game.challengeSystem.check('weekly');
            }
          }
        }
      } else {
        localStorage.setItem('selectedShipSkin', 'none');
      }
    } catch (e) {
      // ignore localStorage/profile errors
    }

    console.log(`Set active skin for ${shipType}: ${skinId}`);
    return true;
  }

  // Get active skin for a ship type
  getActiveSkin(shipType) {
    // First check the new global selectedShipSkin storage (used by shop/player)
    const globalSelectedSkin = localStorage.getItem('selectedShipSkin');
    if (globalSelectedSkin && globalSelectedSkin !== 'none') {
      // Verify this skin is for the current ship type
      const skin = window.game?.premiumStore?.shipSkins?.find(
        (s) => s.id === globalSelectedSkin,
      );
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

    const skin = premiumStore.shipSkins.find((s) => s.id === skinId);
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
      case 'hazard_stripes':
        this.applyHazardStripesEffect(ctx, ship, appearance, time);
        break;
      case 'fire':
        this.applyFireEffect(ctx, ship, appearance, time);
        break;
    }

    ctx.restore();
  }

  applyHazardStripesEffect(ctx, ship, appearance, time) {
    // Crash test dummy skin matching original image - v2
    const yellow = '#FFD700';
    const blue = '#6495ED';
    const black = '#000000';
    
  // Debug: hazard stripes effect triggered (silenced in normal runs)
  if (typeof console.debug === 'function') console.debug('HAZARD STRIPES EFFECT CALLED for', ship.currentShip);

    ctx.save();
    
    // Build hull path
    const path = new Path2D();
    switch (ship.currentShip) {
      case 'scout':
        path.moveTo(0, -15);
        path.lineTo(-4, -10);
        path.lineTo(-12, 0);
        path.lineTo(-8, 8);
        path.lineTo(-5, 5);
        path.lineTo(0, 7);
        path.lineTo(5, 5);
        path.lineTo(8, 8);
        path.lineTo(12, 0);
        path.lineTo(4, -10);
        path.closePath();
        break;
      case 'fighter':
        path.moveTo(0, -16);
        path.lineTo(-3, -11);
        path.lineTo(-13, -3);
        path.lineTo(-9, 0);
        path.lineTo(-11, 9);
        path.lineTo(-3, 6);
        path.lineTo(0, 7);
        path.lineTo(3, 6);
        path.lineTo(11, 9);
        path.lineTo(9, 0);
        path.lineTo(13, -3);
        path.lineTo(3, -11);
        path.closePath();
        break;
      case 'heavy':
        path.moveTo(0, -28);
        path.lineTo(-8, -20);
        path.lineTo(-12, -5);
        path.lineTo(-25, 0);
        path.lineTo(-25, 5);
        path.lineTo(-18, 8);
        path.lineTo(-10, 18);
        path.lineTo(0, 15);
        path.lineTo(10, 18);
        path.lineTo(18, 8);
        path.lineTo(25, 5);
        path.lineTo(25, 0);
        path.lineTo(12, -5);
        path.lineTo(8, -20);
        path.closePath();
        break;
      default:
        path.moveTo(0, -20);
        path.lineTo(-3, -15);
        path.lineTo(-15, -5);
        path.lineTo(-8, 5);
        path.lineTo(-12, 15);
        path.lineTo(-5, 12);
        path.lineTo(0, 10);
        path.lineTo(5, 12);
        path.lineTo(12, 15);
        path.lineTo(8, 5);
        path.lineTo(15, -5);
        path.lineTo(3, -15);
        path.closePath();
        break;
    }

  // Draw an outer darker yellow border first, then fill, then a thin inner black stripe
  const hullColor = (appearance && appearance.color) || yellow;
  const outerYellow = '#DAA520'; // slightly darker/gold for border
  ctx.lineWidth = 2; // outer border width (slimmer)
  ctx.strokeStyle = outerYellow;
  ctx.stroke(path);

  // Fill the hull
  ctx.fillStyle = hullColor;
  ctx.fill(path);

  // Thin inner black stripe to match crash-test dummy outline
  ctx.lineWidth = 1;
  ctx.strokeStyle = black;
  // outer black outline removed per request; keep inner overlay details only

    // Windshield drawing moved to overlay stage so it's always visible on top

    // Interior crash-test details are drawn as overlays to ensure they
    // render on top of any engine flames or later effects. The overlay
    // drawing happens after the main render pass (see drawHazardOverlays).

    ctx.restore();
  }

  // Draw the black overlay details for hazard stripes last so they are
  // always visible on top of flames / engine effects. This uses slightly
  // thicker strokes/fills to survive downsampling and anti-aliasing.
  drawHazardOverlays(ctx, ship, appearance) {
    if (!appearance || appearance.effect !== 'hazard_stripes') return;
    const black = '#000000';

    ctx.save();
    // Ensure we draw over everything
    try { ctx.globalCompositeOperation = 'source-over'; } catch (e) {}

    // Clip all overlays to the hull shape so nothing spills outside the ship
    const hullPath = new Path2D();
    switch (ship.currentShip) {
      case 'scout':
        hullPath.moveTo(0, -15);
        hullPath.lineTo(-4, -10);
        hullPath.lineTo(-12, 0);
        hullPath.lineTo(-8, 8);
        hullPath.lineTo(-5, 5);
        hullPath.lineTo(0, 7);
        hullPath.lineTo(5, 5);
        hullPath.lineTo(8, 8);
        hullPath.lineTo(12, 0);
        hullPath.lineTo(4, -10);
        hullPath.closePath();
        break;
      case 'fighter':
        hullPath.moveTo(0, -16);
        hullPath.lineTo(-3, -11);
        hullPath.lineTo(-13, -3);
        hullPath.lineTo(-9, 0);
        hullPath.lineTo(-11, 9);
        hullPath.lineTo(-3, 6);
        hullPath.lineTo(0, 7);
        hullPath.lineTo(3, 6);
        hullPath.lineTo(11, 9);
        hullPath.lineTo(9, 0);
        hullPath.lineTo(13, -3);
        hullPath.lineTo(3, -11);
        hullPath.closePath();
        break;
      case 'heavy':
        hullPath.moveTo(0, -28);
        hullPath.lineTo(-8, -20);
        hullPath.lineTo(-12, -5);
        hullPath.lineTo(-25, 0);
        hullPath.lineTo(-25, 5);
        hullPath.lineTo(-18, 8);
        hullPath.lineTo(-10, 18);
        hullPath.lineTo(0, 15);
        hullPath.lineTo(10, 18);
        hullPath.lineTo(18, 8);
        hullPath.lineTo(25, 5);
        hullPath.lineTo(25, 0);
        hullPath.lineTo(12, -5);
        hullPath.lineTo(8, -20);
        hullPath.closePath();
        break;
    }
    ctx.clip(hullPath);

  ctx.fillStyle = black;
  ctx.strokeStyle = black;
  ctx.lineWidth = 1; // keep fills/shapes tight

    if (ship.currentShip === 'scout') {
      // Pixel-aligned, simplified overlays for scout to avoid blocky artifacts
      // Short central stripe (1px) that stops before the thruster area
      ctx.fillRect(-0.5, -13, 1, 11);

      // Small nose triangle
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(-1.5, -12);
      ctx.lineTo(1.5, -12);
      ctx.closePath();
      ctx.fill();

      // Small body blocks (subtle)
      ctx.fillRect(-3, -6, 2, 3);
      ctx.fillRect(1, -6, 2, 3);

      // Add depth/panel lines to center body for industrial look
      ctx.strokeStyle = black;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      // Horizontal panel lines across body
      ctx.moveTo(-4, -3);
      ctx.lineTo(4, -3);
      ctx.moveTo(-5, 1);
      ctx.lineTo(5, 1);
      ctx.moveTo(-4, 4);
      ctx.lineTo(4, 4);
      // Vertical seam lines (shortened to not cover cockpit area)
      ctx.moveTo(-2, -3);
      ctx.lineTo(-2, 5);
      ctx.moveTo(2, -3);
      ctx.lineTo(2, 5);
      ctx.stroke();

      // Wing checkerboard pattern (1px cells, tight pattern matching crash-test dummy reference)
      const wingCheckerSize = 1;
      // Left wing checker (runs along wing from root to tip)
      for (let x = -12; x <= -8; x += wingCheckerSize) {
        for (let y = -2; y <= 4; y += wingCheckerSize) {
          if ((x + y) % 2 === 0) {
            ctx.fillRect(x, y, wingCheckerSize, wingCheckerSize);
          }
        }
      }
      // Right wing checker (mirrored)
      for (let x = 8; x <= 12; x += wingCheckerSize) {
        for (let y = -2; y <= 4; y += wingCheckerSize) {
          if ((x + y) % 2 === 0) {
            ctx.fillRect(x, y, wingCheckerSize, wingCheckerSize);
          }
        }
      }

      // outer wing squares removed per request

  // Small rivets near engines moved outward slightly
  ctx.beginPath(); ctx.arc(-7, 5, 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, 5, 0.7, 0, Math.PI * 2); ctx.fill();
      // Nose vents
      ctx.fillRect(-2, -11, 1, 2);
      ctx.fillRect(1, -11, 1, 2);
    
    } else if (ship.currentShip === 'fighter') {
      ctx.fillRect(-0.5, -14, 1, 22);
      const checkerSizeF = 2;
      const fLeftX0 = -13;
      const fLeftY0 = -1;
      for (let cx = 0; cx < 3; cx++) {
        for (let ry = 0; ry < 4; ry++) {
          const xi = fLeftX0 + cx * checkerSizeF;
          const yi = fLeftY0 + ry * checkerSizeF;
          if ((cx + ry) % 2 === 0) ctx.fillRect(xi, yi, checkerSizeF, checkerSizeF);
        }
      }
      const fRightX0 = 8;
      for (let cx = 0; cx < 3; cx++) {
        for (let ry = 0; ry < 4; ry++) {
          const xi = fRightX0 + cx * checkerSizeF;
          const yi = fLeftY0 + ry * checkerSizeF;
          if ((cx + ry) % 2 === 0) ctx.fillRect(xi, yi, checkerSizeF, checkerSizeF);
        }
      }
      ctx.fillRect(-8, 4, 3, 3);
      ctx.fillRect(5, 4, 3, 3);
    } else if (ship.currentShip === 'heavy') {
      ctx.fillRect(-1, -26, 2, 34);
      const checkerSizeH = 3;
      const hLeftX0 = -25;
      for (let cx = 0; cx < 3; cx++) {
        for (let ry = 0; ry < 4; ry++) {
          const xi = hLeftX0 + cx * checkerSizeH;
          const yi = -2 + ry * checkerSizeH;
          if ((cx + ry) % 2 === 0) ctx.fillRect(xi, yi, checkerSizeH, checkerSizeH);
        }
      }
      const hRightX0 = 17;
      for (let cx = 0; cx < 3; cx++) {
        for (let ry = 0; ry < 4; ry++) {
          const xi = hRightX0 + cx * checkerSizeH;
          const yi = -2 + ry * checkerSizeH;
          if ((cx + ry) % 2 === 0) ctx.fillRect(xi, yi, checkerSizeH, checkerSizeH);
        }
      }
      ctx.fillRect(-13, 10, 4, 4);
      ctx.fillRect(9, 10, 4, 4);
    }

    // Draw windshield last so it stays visible above overlays
    ctx.fillStyle = '#6495ED'; // blue
    ctx.strokeStyle = black;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ship.currentShip === 'scout') {
      ctx.ellipse(0, -8, 2.5, 3.5, 0, 0, Math.PI * 2);
    } else if (ship.currentShip === 'fighter') {
      ctx.ellipse(0, -9, 3, 4.5, 0, 0, Math.PI * 2);
    } else if (ship.currentShip === 'heavy') {
      ctx.ellipse(0, -12, 4, 5.5, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(0, -10, 3, 4.5, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  applyGlowEffect(ctx, ship, appearance, time) {
    // Create pulsing glow effect drawn in local ship coordinates so it can
    // be placed precisely relative to thrusters (not centered on world coords).
    const pulseIntensity = 0.5 + 0.5 * Math.sin(time * 3);

    // Thrust-based scaling: use ship.thrustLevel when available to size and
    // position the glow so it never sits on top of the hull when starting
    // from rest. thrustLevel expected 0..1.
    const thrust = Math.max(0, Math.min(1, ship.thrustLevel || 0));

    // Determine local offset and radius per ship type. Offsets move further
    // down when thrust increases so glow rides with the flame; base offsets
    // are chosen so glow is behind hull even at thrust==0.
    let offsetY = 12;
    let offsetXLeft = -6;
    let offsetXRight = 6;
    let minRadius = 6;
    let maxRadius = 18;

    if (ship.currentShip === 'heavy') {
      // Heavy: base offset placed well past hull; glow grows with thrust
      offsetY = 22 + thrust * 10; // base further back (22) -> up to ~32
      offsetXLeft = -6;
      offsetXRight = 6;
      minRadius = 8;
      maxRadius = 20;
    } else if (ship.currentShip === 'fighter') {
      offsetY = 14 + thrust * 6;
      offsetXLeft = -7;
      offsetXRight = 7;
      minRadius = 7;
      maxRadius = 16;
    } else {
      // scout / default
      offsetY = 12 + thrust * 5;
      offsetXLeft = -5;
      offsetXRight = 5;
      minRadius = 6;
      maxRadius = 14;
    }

    // Interpolate radius by thrust so at rest the glow is small and won't overlap
    const glowRadius = minRadius + (maxRadius - minRadius) * thrust + pulseIntensity * 2;

    // Draw two smaller glows behind left/right thrusters using local coords.
    // Use 'destination-over' so the glow is rendered behind the hull geometry
    // (this prevents the glow from overlapping the ship body).
    ctx.save();

    // Small debug marker when debugging flag enabled. Does not run in normal use
    try {
      if (localStorage.getItem('debugShipFX') === 'true') {
        ctx.save();
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
        console.log('shipskins: hazard_stripes debug marker drawn for', ship.currentShip);
      }
    } catch (e) {}
    const priorComposite = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'destination-over';
    const glowColor = appearance.color || '#ffd700';

    // Optional debug output
    try {
      if (localStorage.getItem('debugShipFX') === 'true') {
        console.log('applyGlowEffect', { ship: ship.currentShip, thrust, offsetY, glowRadius, offsetXLeft, offsetXRight });
      }
    } catch (e) {}

    // Left glow
  const g1 = ctx.createRadialGradient(offsetXLeft, offsetY, 0, offsetXLeft, offsetY, glowRadius);
  g1.addColorStop(0, `${glowColor}88`);
    g1.addColorStop(0.6, `${glowColor}33`);
    g1.addColorStop(1, `${glowColor}00`);
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.arc(offsetXLeft, offsetY, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Right glow
  const g2 = ctx.createRadialGradient(offsetXRight, offsetY, 0, offsetXRight, offsetY, glowRadius);
  g2.addColorStop(0, `${glowColor}88`);
    g2.addColorStop(0.6, `${glowColor}33`);
    g2.addColorStop(1, `${glowColor}00`);
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(offsetXRight, offsetY, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // restore composite and transform
    ctx.globalCompositeOperation = priorComposite;
    ctx.restore();
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
      const offset = ((time * 50 + i * 10) % 60) - 30;
      ctx.beginPath();
      ctx.moveTo(ship.x - 25, ship.y + offset);
      ctx.lineTo(ship.x + 25, ship.y + offset);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  applyMetallicEffect(ctx, ship, appearance, time) {
    // Metallic reflection sweep - modified to not interfere with shields
    const sweep = ((time * 0.5) % 2) - 1; // -1 to 1

    const gradient = ctx.createLinearGradient(
      ship.x - 20,
      ship.y - 20,
      ship.x + 20,
      ship.y + 20,
    );

    const reflection = Math.abs(sweep);
    gradient.addColorStop(0, appearance.color);
    gradient.addColorStop(0.5 - sweep * 0.3, appearance.color);
    gradient.addColorStop(0.5, appearance.accent + '66'); // Less visible
    gradient.addColorStop(0.5 + sweep * 0.3, appearance.color);
    gradient.addColorStop(1, appearance.color);

    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    // Use smaller radius and draw ship shape instead of circle to avoid shield confusion
    ctx.arc(ship.x, ship.y, 15, 0, Math.PI * 2); // Smaller radius so it doesn't look like shields
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
      ctx.fillRect(-15, -2, 30, 4);
      ctx.fillRect(-2, -15, 4, 30);
    }
    // Industrial panel lines
    ctx.strokeStyle = appearance.accent + '66';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-20, i * 8);
      ctx.lineTo(20, i * 8);
      ctx.stroke();
    }
  }

  applyFireEffect(ctx, ship, appearance, time) {
    // Flame trail particles
    ctx.fillStyle = appearance.color + '88';
    for (let i = 0; i < 12; i++) {
      const age = (time * 3 + i) % 1;
      const trailX = -ship.vx * age * 0.1 + (Math.random() - 0.5) * 10 * age;
      const trailY = -ship.vy * age * 0.1 + (Math.random() - 0.5) * 10 * age;
      const size = (1 - age) * 3;
      if (size > 0.5) {
        ctx.beginPath();
        ctx.arc(trailX, trailY, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Phoenix glow
    const phoenixGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 35);
    phoenixGlow.addColorStop(0, appearance.accent + '44');
    phoenixGlow.addColorStop(0.7, appearance.color + '22');
    phoenixGlow.addColorStop(1, appearance.color + '00');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = phoenixGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // Render ship with skin
  renderShipWithSkin(ctx, ship, premiumStore) {
    // Get active skin appearance - check ship.shipSkin first (for shop previews), then stored active skin
    // Validate that a per-ship selected skin actually matches the ship type. If it doesn't,
    // clear it for the local player and ignore it for rendering to avoid cross-applying skins.
    let skinId = null;
    try {
      const candidate = ship.shipSkin && ship.shipSkin !== 'none' ? ship.shipSkin : null;
      if (candidate) {
        // Only validate if we have premium store available - otherwise allow the skin attempt
        if (premiumStore && premiumStore.shipSkins) {
          const skinData = premiumStore.shipSkins.find((s) => s.id === candidate);
          if (skinData && skinData.shipType === ship.currentShip) {
            // Skin matches - use it
            skinId = candidate;
          } else if (skinData && skinData.shipType !== ship.currentShip) {
            // Skin exists but doesn't match this ship type; clear it for the local player
            try {
              if (window && window.game && window.game.player === ship) {
                ship.shipSkin = 'none';
                localStorage.setItem('selectedShipSkin', 'none');
                if (window.game && window.game.ui) {
                  // Refresh any UI displays that depend on equipped skin
                  window.game.ui.updateCreditsDisplay?.();
                }
              }
            } catch (e) {
              // ignore
            }
            // Don't use the candidate for rendering
            skinId = null;
          }
          // If skinData is null (skin not found), just skip it silently
        } else {
          // No premium store available - try to use the candidate anyway
          skinId = candidate;
        }
      }
    } catch (e) {
      skinId = null;
    }

    if (!skinId) {
      skinId = this.getActiveSkin(ship.currentShip);
    }
    const appearance = skinId
      ? this.getSkinAppearance(premiumStore, ship.currentShip, skinId)
      : null;

    // Optional debug: log active skin and effect when flag enabled
    try {
      if (localStorage.getItem('debugShipFX') === 'true' && window && window.game && window.game.player === ship) {
        console.log('shipskins: render', { ship: ship.currentShip, skinId, effect: appearance && appearance.effect, appearance });
      }
    } catch (e) {
      // ignore
    }


    // If we have a skin, temporarily override the ship colors BEFORE rendering
    const originalShipColor = ship.shipColor;
    const originalEngineColor = ship.engineColor;

    if (appearance) {
      // Override ship colors with skin colors
      ship.shipColor = appearance.color;

      // Compute a safe engine color: prefer explicit user engineColor if present
      // (so users can change engine color even when a skin is active). If no
      // user engine color exists, fall back to the skin accent (brightened
      // if the accent is near-black).
      let computedEngine = appearance.accent || appearance.color;
      if (this._isHexDark(computedEngine)) {
        computedEngine = this._mixHex(appearance.color || '#ffd700', '#ffffff', 0.55);
      }

      // Prefer the engine color already present on the ship (comes from player settings or remote data)
      if (originalEngineColor && originalEngineColor !== 'none') {
        ship.engineColor = originalEngineColor;
      } else {
        ship.engineColor = computedEngine;
      }

      // (engine color already set above: prefer user-selected engine color if available,
      // otherwise we used a brightened accent)
    }

    ctx.save();

    // If a skin is active, draw the EXACT premium store preview geometry (no extra scribble overlays)
    if (appearance) {
      // Pass accent fallback so skins without an explicit accent use their primary color
      this.renderPremiumGeometry(
        ctx,
        ship.currentShip || 'scout',
        appearance.color,
        appearance.accent || appearance.color,
      );
    } else if (typeof ship.render === 'function') {
      ship.render(ctx);
    } else {
      this.renderShipHullOnly(ctx, ship);
    }

    // THEN apply any special skin effects on top (respect user toggle)
    if (appearance && appearance.effect && this.effectsEnabled) {
      this.applySkinEffects(ctx, ship, appearance);
    }

    // Draw dynamic engine flames for skins so thrusters/afterburners are visible
    // (skins previously only rendered the hull + trail, skipping the per-ship flames)
    try {
      this.renderEngineFlame(ctx, ship);
    } catch (e) {
      // Non-fatal - if flame render fails just continue
      // console.warn('shipskins: renderEngineFlame failed', e);
    }

    // Draw hazard overlays inside the local ship transform so they follow the ship
    try {
      this.drawHazardOverlays(ctx, ship, appearance);
    } catch (e) {}

    ctx.restore();

    // Restore original colors after rendering
    if (appearance) {
      ship.shipColor = originalShipColor;
      ship.engineColor = originalEngineColor;
    }

    // If a skin was used, also draw dynamic engine trail/flame based on ship visual state
    try {
      const thrust =
        ship.thrustLevel !== undefined
          ? ship.thrustLevel
          : ship.speed
            ? Math.min(1, ship.speed * 0.01)
            : 0;
      if (thrust > 0) {
        // Choose engine color from appearance accent if available
        // Prefer the resolved ship.engineColor (which may be user-selected or
        // auto-brightened above). Only fall back to appearance.accent if
        // ship.engineColor is not available.
        const engineColor = ship.engineColor || (appearance && appearance.accent) || '#f66';
        // Render a simple engine trail behind the ship using existing helper
        // Provide a temporary object with x,y,rotation,vx,vy expected by renderEngineTrail
        const trailShip = {
          x: ship.x || 0,
          y: ship.y || 0,
          rotation: ship.rotation || 0,
          vx: ship.vx || 0,
          vy: ship.vy || 0,
          speed: ship.speed || 0,
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

    // overlays already drawn in local space above
  }

  // Toggle effects preference
  setEffectsEnabled(enabled) {
    this.effectsEnabled = !!enabled;
    try {
      localStorage.setItem(
        'shipSkinEffectsEnabled',
        this.effectsEnabled ? 'true' : 'false',
      );
    } catch (e) {}
  }

  // Add distinctive accent / pattern overlays per skin so visual change is obvious
  drawSkinPattern(ctx, ship, skinId, appearance) {
    // Patterns disabled: exact geometry already drawn; keep function for backward compatibility.
    return; // Intentionally no-op now.
  }

  // Exact premium store geometry for consistency (centered at 0,0, no translation)
  renderPremiumGeometry(ctx, shipType, primaryColor, accentColor) {
  const shipColor = primaryColor || '#33f';
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
        ctx.moveTo(-8, 0);
        ctx.lineTo(-4, -8);
        ctx.moveTo(8, 0);
        ctx.lineTo(4, -8);
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
      case 'stealth': {
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
        // Outline: only use accent if it's different from main color, else transparent
        let outlineColor = accent;
        if (accent === shipColor) {
          outlineColor = 'rgba(0,0,0,0)';
        }
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        // Panels (simplified)
        const stealthGradient2 = ctx.createLinearGradient(0, -12, 0, 12);
        stealthGradient2.addColorStop(0, shipColor);
        stealthGradient2.addColorStop(0.5, accent);
        stealthGradient2.addColorStop(1, shipColor);
        ctx.fillStyle = stealthGradient2;
        ctx.beginPath();
        ctx.moveTo(-8, -2);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-6, 6);
        ctx.lineTo(-9, 9);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, -2);
        ctx.lineTo(5, 0);
        ctx.lineTo(6, 6);
        ctx.lineTo(9, 9);
        ctx.closePath();
        ctx.fill();
        // Cockpit
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.ellipse(0, -6, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default:
        // Fallback simple circle
        ctx.fillStyle = shipColor;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
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

  // Use additive blending so bright engine colors remain visible over black space
  const priorComposite = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';

    // Engine trail particles
    const trailLength = Math.min((ship.speed || 0) * 0.1, 30);
    // Fallback engineColor
    let baseEngine = engineColor || '#f66';

    // If the engine color is very dark (black or near-black), force a visible grey
    // so trails are readable on black space.
    try {
      if (typeof baseEngine === 'string' && baseEngine.startsWith('#')) {
        if (this._isHexDark(baseEngine)) {
          baseEngine = '#9a9a9a';
        }
      } else if (typeof baseEngine === 'string' && baseEngine.startsWith('rgb')) {
        // Try to detect near-black rgb/rgba as fallback
        const m = baseEngine.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(',').map((p) => Number(p.trim()));
          if (parts.length >= 3) {
            const [r, g, b] = parts;
            const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            if (lum < 0.22) baseEngine = '#9a9a9a';
          }
        }
      }
    } catch (e) {
      // ignore and keep baseEngine
    }
    // Compute a robust rgba fillStyle: prefer converting hex -> rgba with alpha
    let trailFill = null;
    if (typeof baseEngine === 'string' && baseEngine.startsWith('#')) {
      trailFill = this._hexToRgbaString(baseEngine, 0.7);
    } else if (typeof baseEngine === 'string' && baseEngine.startsWith('rgb')) {
      // If already rgb/rgba, try to set alpha via simple replacement
      const rgbaMatch = baseEngine.match(/rgba?\(([^)]+)\)/);
      if (rgbaMatch) {
        const parts = rgbaMatch[1].split(',').map((p) => p.trim());
        // Ensure we have r,g,b
        if (parts.length >= 3) {
          const r = parts[0];
          const g = parts[1];
          const b = parts[2];
          trailFill = `rgba(${r}, ${g}, ${b}, 0.7)`;
        }
      }
    }
    if (!trailFill) {
      // Fallback: use a semi-transparent default color
      trailFill = 'rgba(255, 102, 102, 0.7)';
    }
    ctx.fillStyle = trailFill;

    // Draw particles behind the ship along local +Y (ship faces up in geometry)
  // Start the trail a bit closer to the ship so there's no visible gap
  const baseOffset = 4 + trailLength * 0.3;
    // Helper to parse color to rgb components
    const parseToRgb = (col) => {
      try {
        if (!col) return { r: 255, g: 102, b: 102 };
        if (col.startsWith('#')) return this._hexToRgb(col);
        const m = col.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(',').map((p) => Number(p.trim()));
          return { r: parts[0] || 255, g: parts[1] || 102, b: parts[2] || 102 };
        }
      } catch (e) {}
      return { r: 255, g: 102, b: 102 };
    };

    const baseRgb = parseToRgb(baseEngine);

    for (let i = 0; i < 4; i++) {
      // Slight horizontal spread and vertical offset to create a central trail
      const x = (Math.random() - 0.5) * 6; // small left/right jitter
      const y =
        baseOffset + i * (2 + trailLength * 0.15) + (Math.random() * 2 - 1);
      const size = Math.max(0.8, 3 - i * 0.6 + trailLength * 0.03);

      // Create radial gradient per particle: center is the base color, outer is a darker shade
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(6, size * 3));
      const r = baseRgb.r;
      const gcol = baseRgb.g;
      const b = baseRgb.b;
      // darker shade (approx 45% brightness)
      const dr = Math.max(0, Math.floor(r * 0.45));
      const dg = Math.max(0, Math.floor(gcol * 0.45));
      const db = Math.max(0, Math.floor(b * 0.45));

  // Reduced alpha for more transparent trails
  g.addColorStop(0, `rgba(${r}, ${gcol}, ${b}, 0.6)`);
  g.addColorStop(0.6, `rgba(${dr}, ${dg}, ${db}, 0.35)`);
      g.addColorStop(1, `rgba(${dr}, ${dg}, ${db}, 0)`);

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Restore composite and transform
    ctx.globalCompositeOperation = priorComposite;
    ctx.restore();
  }

  // Render the dynamic engine flame for skins (so thrusters/afterburner visuals are visible)
  renderEngineFlame(ctx, ship) {
    // ship is expected to include: thrustLevel (0..1), engineColor, shipColor, currentShip
    const thrustLevel = ship.thrustLevel || 0;
    const engineColor = ship.engineColor || ship.getEngineColor?.() || '#f66';
    const shipColor = ship.shipColor || ship.getShipColor?.() || '#7d7d7d';

    if (thrustLevel <= 0) return;

    ctx.save();
    ctx.translate(ship.x || 0, ship.y || 0);
    if (ship.rotation) ctx.rotate(ship.rotation);

    switch (ship.currentShip) {
      case 'fighter':
        ctx.fillStyle = engineColor;
        ctx.beginPath();
        ctx.moveTo(-7, 8);
        ctx.lineTo(-4, 8 + 10 * thrustLevel);
        ctx.lineTo(0, 8 + 6 * thrustLevel);
        ctx.lineTo(4, 8 + 10 * thrustLevel);
        ctx.lineTo(7, 8);
        ctx.closePath();
        ctx.fill();

        const fighterEngineGlow = ctx.createRadialGradient(
          0,
          12,
          0,
          0,
          12,
          8 + 10 * thrustLevel,
        );
        fighterEngineGlow.addColorStop(0, engineColor);
        fighterEngineGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fighterEngineGlow;
        ctx.fillRect(-8, 10, 16, 8 + 12 * thrustLevel);
        break;

      case 'heavy':
        ctx.fillStyle = engineColor;
        // Left engine - positioned at the engine mount (y: 11)
        ctx.beginPath();
        ctx.moveTo(-6, 11);
        ctx.lineTo(-8, 11 + 8 * thrustLevel);
        ctx.lineTo(-4, 11 + 6 * thrustLevel);
        ctx.closePath();
        ctx.fill();
        // Right engine - positioned at the engine mount (y: 11)
        ctx.beginPath();
        ctx.moveTo(6, 11);
        ctx.lineTo(8, 11 + 8 * thrustLevel);
        ctx.lineTo(4, 11 + 6 * thrustLevel);
        ctx.closePath();
        ctx.fill();

        const engineGlowSize = 5 + 6 * thrustLevel;
        // Left engine glow - positioned well past the hull, only on the thruster trail
        const leftEngineGlow = ctx.createRadialGradient(
          -6,
          16 + 3 * thrustLevel,
          0,
          -6,
          16 + 3 * thrustLevel,
          engineGlowSize,
        );
        leftEngineGlow.addColorStop(0, engineColor);
        leftEngineGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftEngineGlow;
        ctx.fillRect(-10, 16, 8, 5 + 8 * thrustLevel);
        // Right engine glow - positioned well past the hull, only on the thruster trail
        const rightEngineGlow = ctx.createRadialGradient(
          6,
          16 + 3 * thrustLevel,
          0,
          6,
          16 + 3 * thrustLevel,
          engineGlowSize,
        );
        rightEngineGlow.addColorStop(0, engineColor);
        rightEngineGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rightEngineGlow;
        ctx.fillRect(2, 16, 8, 5 + 8 * thrustLevel);
        break;

      case 'stealth':
        ctx.globalAlpha = 0.3 + 0.4 * thrustLevel;
        ctx.fillStyle = engineColor;
        ctx.beginPath();
        ctx.moveTo(-5, 12);
        ctx.lineTo(-3, 12 + 8 * thrustLevel);
        ctx.lineTo(0, 12 + 4 * thrustLevel);
        ctx.lineTo(3, 12 + 8 * thrustLevel);
        ctx.lineTo(5, 12);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        break;

      default: // scout and fallback
        ctx.fillStyle = engineColor;
        ctx.beginPath();
        ctx.moveTo(-5, 5);
        ctx.lineTo(-3, 5 + 9 * thrustLevel);
        ctx.lineTo(0, 5 + 5 * thrustLevel);
        ctx.lineTo(3, 5 + 9 * thrustLevel);
        ctx.lineTo(5, 5);
        ctx.closePath();
        ctx.fill();

        const glowSize = 4 + 7 * thrustLevel;
        const engineGradient = ctx.createRadialGradient(
          0,
          9,
          0,
          0,
          9,
          glowSize,
        );
        engineGradient.addColorStop(0, engineColor);
        engineGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = engineGradient;
        ctx.beginPath();
        ctx.ellipse(
          0,
          9 + 3 * thrustLevel,
          5 * thrustLevel,
          6 * thrustLevel,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  // Render just the ship hull for previews (no shields, UI, etc.)
  renderShipHullOnly(ctx, ship) {
    const shipColor = ship.getShipColor
      ? ship.getShipColor()
      : ship.shipColor || '#7d7d7d';
    const engineColor = ship.getEngineColor
      ? ship.getEngineColor()
      : ship.engineColor || '#f66';

    // Render based on current ship type if available
    const shipType =
      ship.currentShip || window.game?.player?.shipType || 'scout';

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
        // Use engineColor as fallback for accentColor which isn't defined in this scope
        this.renderPremiumGeometry(ctx, 'stealth', shipColor, engineColor);
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
