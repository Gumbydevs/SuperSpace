// Premium Store System for SuperSpace
// Handles premium purchases using Space Gems (premium currency)

export class PremiumStore {
  constructor(player) {
    this.player = player;
    this.storeOpen = false;
    this.currentTab = 'avatars'; // 'avatars', 'skins', 'gems'
    this.spaceGems = this.loadSpaceGems();
    this.premiumPurchases = this.loadPremiumPurchases();
    this.paypalIntegration = null; // Will be set when PayPal is loaded
    this.avatarManager = null; // Will be set when avatar manager is created

    // Premium avatar collection
    this.premiumAvatars = [
      {
        id: 'robot',
        name: 'Marvin',
        description: 'Iconic AI pilot with glowing eyes',
        gemPrice: 100,
        realPrice: 0.99,
        owned: false,
        rarity: 'rare',
        drawMethod: 'drawMarvin',
      },
      {
        id: 'alien',
        name: 'Jeff',
        description: 'Mysterious green alien pilot',
        gemPrice: 110,
        realPrice: 1.49,
        owned: false,
        rarity: 'rare',
        drawMethod: 'drawGorf',
      },
      {
        id: 'longjohn',
        name: 'Long John',
        description: 'Legendary space pirate with an eyepatch',
        gemPrice: 120,
        realPrice: 1.99,
        owned: false,
        rarity: 'epic',
        drawMethod: 'drawLongJohn',
      },
      {
        id: 'astronaut_gold',
        name: 'Golden Astronaut',
        description: 'Luxurious golden space suit for elite pilots',
        gemPrice: 150,
        realPrice: 2.99, // USD
        owned: false,
        rarity: 'legendary',
        drawMethod: 'drawGoldenAstronaut',
      },
      {
        id: 'alien_commander',
        name: 'Alien Commander',
        description: 'Lead the galaxy with this mysterious alien avatar',
        gemPrice: 200,
        realPrice: 3.99,
        owned: false,
        rarity: 'legendary',
        drawMethod: 'drawAlienCommanderPremium',
      },
      {
        id: 'cyber_pilot',
        name: 'Cyber Pilot',
        description: 'Futuristic cybernetic enhancement suit',
        gemPrice: 120,
        realPrice: 1.99,
        owned: false,
        rarity: 'epic',
        drawMethod: 'drawCyberPilot',
      },
      {
        id: 'galaxy_explorer',
        name: 'Galaxy Explorer',
        description: 'For those who venture into the unknown',
        gemPrice: 100,
        realPrice: 1.49,
        owned: false,
        rarity: 'rare',
        drawMethod: 'drawGalaxyExplorer',
      },
      {
        id: 'neon_warrior',
        name: 'Neon Warrior',
        description: 'Glow with power in the darkness of space',
        gemPrice: 175,
        realPrice: 2.49,
        owned: false,
        rarity: 'legendary',
        drawMethod: 'drawNeonWarrior',
      },
      {
        id: 'steve',
        name: 'Steve',
        description: 'The legendary block builder from another dimension',
        gemPrice: 190,
        realPrice: 1.99,
        owned: false,
        rarity: 'epic',
        drawMethod: 'drawSteve',
      },
      {
        id: 'enderman',
        name: 'Endingman',
        description: 'Mysterious dark entity from the End dimension',
        gemPrice: 240,
        realPrice: 2.49,
        owned: false,
        rarity: 'epic',
        drawMethod: 'drawEnderman',
      },
      // Playtester exclusive avatar (gifted to pre-release players)
      {
        id: 'playtester_dummy',
        name: 'Test Dummy',
        description: 'Special pre-release crash-test dummy pilot — exclusive to playtesters',
        gemPrice: 0,
        realPrice: 0,
        owned: false,
        rarity: 'exclusive',
        drawMethod: 'drawCrashDummy',
        // Do not show this exclusive, granted avatar in the public Premium Store
        storeVisible: false,
      },
    ];

    // Ship skins (cosmetic variations)
    this.shipSkins = [
      // Scout Skins
      {
        id: 'scout_stealth',
        name: 'Stealth Scout',
        description: 'Dark grey hull with blue accents',
        shipType: 'scout',
        gemPrice: 80,
        realPrice: 0.99,
        owned: false,
        rarity: 'rare',
        appearance: {
          color: '#404040',
          accent: '#0066cc',
          effect: 'stealth',
        },
      },
      {
        id: 'scout_neon',
        name: 'Neon Scout',
        description: 'Electric blue hull with cyan glow',
        shipType: 'scout',
        gemPrice: 100,
        realPrice: 1.49,
        owned: false,
        rarity: 'epic',
        appearance: {
          color: '#00ffff',
          accent: '#0080ff',
          effect: 'glow',
        },
      },

      // Playtester exclusive scout skin (gifted)
      {
        id: 'scout_playtester',
        name: 'Test Dummy',
        description: 'Black & hazard-yellow crash-test paint — awarded to pre-release playtesters',
        shipType: 'scout',
        gemPrice: 0,
        realPrice: 0,
        owned: false,
        rarity: 'exclusive',
        appearance: {
          color: '#ffd700',
          accent: '#000000',
          effect: 'hazard_stripes',
        },
        // Gifted exclusive - do not list in the public Premium Store
        storeVisible: false,
      },

      // Fighter Skins
      {
        id: 'fighter_crimson',
        name: 'Crimson Fighter',
        description: 'Blood-red hull with golden trim',
        shipType: 'fighter',
        gemPrice: 120,
        realPrice: 1.99,
        owned: false,
        rarity: 'epic',
        appearance: {
          color: '#cc0000',
          accent: '#ffdd00',
          effect: 'metallic',
        },
      },
      {
        id: 'fighter_void',
        name: 'Void Fighter',
        description: 'Deep purple hull with violet accents',
        shipType: 'fighter',
        gemPrice: 150,
        realPrice: 2.99,
        owned: false,
        rarity: 'legendary',
        appearance: {
          color: '#330066',
          accent: '#6600cc',
          effect: 'void',
        },
      },

      // Heavy Skins
      {
        id: 'heavy_titan',
        name: 'Titan Heavy',
        description: 'Industrial grey with yellow stripes',
        shipType: 'heavy',
        gemPrice: 140,
        realPrice: 2.49,
        owned: false,
        rarity: 'epic',
        appearance: {
          color: '#666666',
          accent: '#ffff00',
          effect: 'industrial',
        },
      },
      {
        id: 'heavy_phoenix',
        name: 'Phoenix Heavy',
        description: 'Flame orange with red highlights',
        shipType: 'heavy',
        gemPrice: 180,
        realPrice: 3.49,
        owned: false,
        rarity: 'legendary',
        appearance: {
          color: '#ff4400',
          accent: '#ffaa00',
          effect: 'fire',
        },
      },

      // Stealth Skins
      {
        id: 'stealth_shadow',
        name: 'Shadow Stealth',
        description: 'Charcoal grey with purple highlights',
        shipType: 'stealth',
        gemPrice: 160,
        realPrice: 2.99,
        owned: false,
        rarity: 'epic',
        appearance: {
          color: '#4a4a4a',
          accent: '#8844aa',
          effect: 'stealth',
        },
      },
      {
        id: 'stealth_ghost',
        name: 'Ghost Stealth',
        description: 'Silver-blue with white details',
        shipType: 'stealth',
        gemPrice: 200,
        realPrice: 3.99,
        owned: false,
        rarity: 'legendary',
        appearance: {
          color: '#5a6a7a',
          accent: '#aabbcc',
          effect: 'ghost',
        },
      },
    ];

    // Space Gem packages
    this.gemPackages = [
      {
        id: 'starter_gems',
        name: 'Starter Pack',
        description: 'Perfect for your first premium purchase',
        gems: 100,
        price: 0.99,
        bonus: 0,
        popular: false,
      },
      {
        id: 'explorer_gems',
        name: 'Explorer Pack',
        description: 'Great value for space adventurers',
        gems: 250,
        price: 1.99,
        bonus: 50, // 50 bonus gems
        popular: true,
      },
      {
        id: 'commander_gems',
        name: 'Commander Pack',
        description: 'For serious space commanders',
        gems: 500,
        price: 3.99,
        bonus: 150,
        popular: false,
      },
      {
        id: 'legend_gems',
        name: 'Legend Pack',
        description: 'Ultimate gem collection',
        gems: 1200,
        price: 7.99,
        bonus: 400,
        popular: false,
      },
    ];

    this.updateOwnedStatus();
  }

  loadSpaceGems() {
    const stored = localStorage.getItem('spaceGems');
    return stored ? parseInt(stored) : 0;
  }

  saveSpaceGems() {
    localStorage.setItem('spaceGems', this.spaceGems.toString());
  }

  loadPremiumPurchases() {
    const stored = localStorage.getItem('premiumPurchases');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Normalize structure to ensure expected arrays exist
        return {
          avatars: Array.isArray(parsed.avatars) ? parsed.avatars : [],
          skins: Array.isArray(parsed.skins) ? parsed.skins : [],
          purchaseHistory: Array.isArray(parsed.purchaseHistory)
            ? parsed.purchaseHistory
            : parsed.purchase_history && Array.isArray(parsed.purchase_history)
            ? parsed.purchase_history
            : [],
          // keep any other keys present to avoid losing data
          ...parsed,
        };
      } catch (e) {
        console.error('Failed to load premium purchases:', e);
      }
    }
    return {
      avatars: [],
      skins: [],
      purchaseHistory: [],
    };
  }

  savePremiumPurchases() {
    localStorage.setItem(
      'premiumPurchases',
      JSON.stringify(this.premiumPurchases),
    );
  }

  // Ensure HUD gem display can be updated centrally
  updateGemDisplay() {
    try {
      // Persist gems and update visible HUD
      this.saveSpaceGems();
      const gemsEl = document.getElementById('gems');
      if (gemsEl) gemsEl.textContent = this.spaceGems;
    } catch (e) {
      // ignore errors
    }
  }

  updateOwnedStatus() {
    // Update avatar ownership
    const ownedAvatars = (this.premiumPurchases && Array.isArray(this.premiumPurchases.avatars))
      ? this.premiumPurchases.avatars
      : [];
    this.premiumAvatars.forEach((avatar) => {
      avatar.owned = ownedAvatars.includes(avatar.id);
    });

    // Update skin ownership
    const ownedSkins = (this.premiumPurchases && Array.isArray(this.premiumPurchases.skins))
      ? this.premiumPurchases.skins
      : [];
    this.shipSkins.forEach((skin) => {
      skin.owned = ownedSkins.includes(skin.id);
    });
  }

  // Purchase with Space Gems
  purchaseWithGems(itemType, itemId) {
    let item;
    let itemArray;

    if (itemType === 'avatar') {
      item = this.premiumAvatars.find((a) => a.id === itemId);
      itemArray = this.premiumPurchases.avatars;
    } else if (itemType === 'skin') {
      item = this.shipSkins.find((s) => s.id === itemId);
      itemArray = this.premiumPurchases.skins;
    }

    if (!item) {
      console.error('Item not found:', itemType, itemId);
      return false;
    }

    if (item.owned) {
      console.log('Item already owned');
      return false;
    }

    if (this.spaceGems < item.gemPrice) {
      console.log('Not enough Space Gems');
      return false;
    }

    // Purchase successful
    this.spaceGems -= item.gemPrice;
    itemArray.push(itemId);
    item.owned = true;

    console.log(
      `Purchase successful! Item ${itemId} added to array:`,
      itemArray,
    );
    console.log('Current premiumPurchases:', this.premiumPurchases);

    // Record purchase
    this.premiumPurchases.purchaseHistory.push({
      type: itemType,
      id: itemId,
      name: item.name,
      cost: item.gemPrice,
      currency: 'gems',
      timestamp: Date.now(),
    });

    this.saveSpaceGems();
    this.savePremiumPurchases();

    // Track premium purchase for analytics
    if (window.analytics) {
      window.analytics.trackPremiumPurchase(item.name, item.gemPrice, 'gems');
    }

    // Update owned status to sync the .owned properties
    this.updateOwnedStatus();

    // Refresh avatar manager if an avatar was purchased
    if (itemType === 'avatar' && this.avatarManager) {
      console.log('Refreshing avatar manager after avatar purchase...');
      this.avatarManager.setupPremiumAvatars();
      this.avatarManager.drawAllAvatars();
    } else if (itemType === 'avatar') {
      console.log('No avatar manager reference found!');
    }

    console.log(`Purchased ${item.name} for ${item.gemPrice} Space Gems`);

    // Add global debug function
    window.debugPurchaseState = () => {
      console.log('=== PURCHASE DEBUG STATE ===');
      console.log('Space Gems:', this.spaceGems);
      console.log('Premium Purchases:', this.premiumPurchases);
      console.log(
        'Premium Avatars with owned status:',
        this.premiumAvatars.map((a) => ({ id: a.id, owned: a.owned })),
      );
      console.log(
        'localStorage premiumPurchases:',
        JSON.parse(localStorage.getItem('premiumPurchases') || '{}'),
      );
    };

    // Add manual refresh function
    window.refreshAvatars = () => {
      console.log('Manually refreshing avatars...');
      if (this.avatarManager) {
        this.avatarManager.setupPremiumAvatars();
        this.avatarManager.drawAllAvatars();
        console.log('Avatar refresh complete');
      }
    };

    return true;
  }

  // Add Space Gems (after real money purchase)
  addSpaceGems(amount, packageId = null) {
    this.spaceGems += amount;
    this.saveSpaceGems();

    if (packageId) {
      // Find the gem package to get the real price
      const gemPackage = this.gemPackages.find((p) => p.id === packageId);
      const realPrice = gemPackage ? gemPackage.price : 0;

      this.premiumPurchases.purchaseHistory.push({
        type: 'gems',
        id: packageId,
        amount: amount,
        currency: 'real',
        timestamp: Date.now(),
      });
      this.savePremiumPurchases();

      // Track revenue for analytics (real money purchase)
      if (window.analytics && gemPackage) {
        console.log(
          `💰 Tracking revenue purchase: ${gemPackage.name} for $${realPrice}`,
        );
        window.analytics.trackGemPurchase(amount, realPrice, 'USD');
      }
    }

    console.log(`Added ${amount} Space Gems. Total: ${this.spaceGems}`);
  }

  // Get owned premium avatars
  getOwnedPremiumAvatars() {
    return this.premiumAvatars.filter((avatar) => avatar.owned);
  }

  // Get owned ship skins for a specific ship type
  getOwnedSkinsForShip(shipType) {
    return this.shipSkins.filter(
      (skin) => skin.shipType === shipType && skin.owned,
    );
  }

  // Check if player owns a specific item
  ownsItem(itemType, itemId) {
    if (itemType === 'avatar') {
      return this.premiumPurchases.avatars.includes(itemId);
    } else if (itemType === 'skin') {
      return this.premiumPurchases.skins.includes(itemId);
    }
    return false;
  }

  // Toggle store display
  toggleStore() {
    this.storeOpen = !this.storeOpen;
    
    // Hide/show game UI elements to prevent overlap
    if (window.game && window.game.ui) {
      if (this.storeOpen) {
        // Hide game UI when store opens
        this.hideGameUIForStore();
      } else {
        // Restore game UI when store closes
        this.showGameUIAfterStore();
      }
    }
    
    if (this.storeOpen) {
      this.updateOwnedStatus();

      // Track store visit for analytics
      if (window.analytics) {
        window.analytics.trackStoreVisit('premium_store');
      }
    }
  }

  // Hide game UI elements that interfere with the premium store
  hideGameUIForStore() {
    // Boost game canvas z-index to appear above all UI elements
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.style.zIndex = '10000';
    }
    
    // Hide right-side buttons and panels
    const elementsToHide = [
      'status-panel',
      'minimap-container', 
      'player-list',
      'mute-btn',
      'options-btn',
      'premium-btn'
    ];
    
    elementsToHide.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });
    
    // Also hide any other UI overlays
    const overlays = document.querySelectorAll('.ui-overlay, .game-ui-panel');
    overlays.forEach(overlay => {
      overlay.style.display = 'none';
    });
  }

  // Restore game UI elements after premium store closes
  showGameUIAfterStore() {
    // Restore game canvas original z-index
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.style.zIndex = '1';
    }
    
    // Restore right-side buttons and panels
    const elementsToShow = [
      { id: 'status-panel', display: 'flex' },
      { id: 'minimap-container', display: 'block' },
      { id: 'player-list', display: 'block' },
      { id: 'mute-btn', display: 'block' },
      { id: 'options-btn', display: 'block' },
      { id: 'premium-btn', display: 'block' }
    ];
    
    elementsToShow.forEach(({id, display}) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = display;
      }
    });
    
    // Restore other UI overlays  
    const overlays = document.querySelectorAll('.ui-overlay, .game-ui-panel');
    overlays.forEach(overlay => {
      overlay.style.display = '';
    });
  }

  // Switch store tabs
  setTab(tab) {
    this.currentTab = tab;
  }

  // Get items for current tab
  getCurrentTabItems() {
    switch (this.currentTab) {
      case 'avatars':
        // Exclude store-hidden items (like playtester gifts) from public listing
        return this.premiumAvatars.filter((a) => a.storeVisible !== false);
      case 'skins':
        return this.shipSkins.filter((s) => s.storeVisible !== false);
      case 'gems':
        return this.gemPackages;
      default:
        return [];
    }
  }

  // Render the premium store UI
  render(ctx, canvas) {
    if (!this.storeOpen) return;

    // Enhanced responsive scale for better mobile/tablet support
    // Detect iPads and tablets more accurately
    const isMobile = canvas.width < 600 || canvas.height < 700;
    const isTablet = (!isMobile && (canvas.width < 1200 || canvas.height < 900)) || 
                     (navigator.userAgent.includes('iPad') || 
                      (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1));
    
    let baseScale, dynamicFactor;
    if (isMobile) {
      baseScale = 0.7; // Significantly reduced from 0.9 to 0.7 for mobile
      dynamicFactor = 0.85; // Reduced from 0.95 to 0.85
    } else if (isTablet) {
      baseScale = 0.85; // Slightly larger for tablets
      dynamicFactor = 0.9; // Better tablet support
    } else {
      baseScale = 0.75;
      dynamicFactor = 1;
    }
    
    const scale = baseScale * dynamicFactor;
    const scaledWidthBase = Math.min(
      Math.floor(canvas.width * scale),
      canvas.width - (isMobile ? 20 : 40), // Less margin on mobile
    );
    const scaledHeightBase = Math.min(
      Math.floor(canvas.height * scale),
      canvas.height - (isMobile ? 20 : 40), // Less margin on mobile
    );

    // Determine required height to fit tabs + grid + footers so outer box always encloses items
    const items = this.getCurrentTabItems();
    const itemHeight = isMobile ? 65 : 100; // Even smaller items on mobile (was 80)
    const itemWidth = isMobile ? 160 : 240; // Even narrower items on mobile (was 180)
    const spacing = isMobile ? 10 : 30; // Even less spacing on mobile (was 15)
    const availableInner = scaledWidthBase - (isMobile ? 20 : 40);
    const itemsPerRow = Math.max(
      1,
      Math.floor((availableInner + spacing) / (itemWidth + spacing)),
    );
    const rows = Math.max(1, Math.ceil(items.length / itemsPerRow));
    const gridHeight = rows * (itemHeight + (isMobile ? 10 : 25)) - (isMobile ? 10 : 25); // Even tighter spacing

    // Adjust header and footer heights for mobile
    const headerHeight = isMobile ? 120 : 200; // Even smaller header (was 140)
    const footerHeight = isMobile ? 60 : 140; // Even smaller footer (was 80)

    const neededHeight = headerHeight + gridHeight + footerHeight;

    const scaledHeight = Math.min(
      canvas.height - (isMobile ? 20 : 40),
      Math.max(scaledHeightBase, neededHeight),
    );
    const scaledWidth = scaledWidthBase;
    const offsetX = Math.floor((canvas.width - scaledWidth) / 2);
    const offsetY = Math.floor((canvas.height - scaledHeight) / 2);

    // Store background - match game style
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sci-fi border effect (scaled and centered) - thinner on mobile
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = isMobile ? 2 : 3;
    const borderMargin = isMobile ? 10 : 20;
    ctx.strokeRect(
      offsetX + borderMargin,
      offsetY + borderMargin,
      scaledWidth - borderMargin * 2,
      scaledHeight - borderMargin * 2,
    );

    // Inner border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const innerMargin = isMobile ? 12 : 25;
    ctx.strokeRect(
      offsetX + innerMargin,
      offsetY + innerMargin,
      scaledWidth - innerMargin * 2,
      scaledHeight - innerMargin * 2,
    );

    // Store header - match game typography (responsive font sizes)
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isMobile ? '18px' : '24px'} Orbitron, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('PREMIUM STORE', canvas.width / 2, offsetY + (isMobile ? 35 : 55));

    // Subtitle
    ctx.fillStyle = '#00ffff';
    ctx.font = `${isMobile ? '11px' : '14px'} Orbitron, Arial, sans-serif`;
    ctx.fillText(
      'COSMETIC UPGRADES & SPACE GEMS',
      canvas.width / 2,
      offsetY + (isMobile ? 50 : 75),
    );

    // Space Gems display - sci-fi style (responsive sizing)
    const gemsBoxWidth = isMobile ? 140 : 160;
    const gemsBoxHeight = isMobile ? 20 : 25;
    const gemsBoxY = offsetY + (isMobile ? 60 : 85);
    ctx.fillStyle = '#000000';
    ctx.fillRect(
      canvas.width / 2 - gemsBoxWidth / 2,
      gemsBoxY,
      gemsBoxWidth,
      gemsBoxHeight,
    );
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      canvas.width / 2 - gemsBoxWidth / 2,
      gemsBoxY,
      gemsBoxWidth,
      gemsBoxHeight,
    );

    ctx.fillStyle = '#00ffff';
    ctx.font = `bold ${isMobile ? '11px' : '14px'} Orbitron, Arial, sans-serif`;
    ctx.fillText(
      `💎 ${this.spaceGems} SPACE GEMS`,
      canvas.width / 2,
      gemsBoxY + (isMobile ? 14 : 17),
    );

    // Tab buttons - game style
    this.renderTabs(ctx, canvas, offsetX, offsetY, scale, isMobile);

    // Store content
    this.renderStoreContent(ctx, canvas, offsetX, offsetY, scale);

    // Small skin effects toggle (bottom-left inside window when on skins tab)
    if (this.currentTab === 'skins') {
      const effectsEnabled =
        localStorage.getItem('shipSkinEffectsEnabled') === null
          ? true
          : localStorage.getItem('shipSkinEffectsEnabled') === 'true';
      const toggleW = 130;
      const toggleH = 22;
      const toggleX = offsetX + 30;
      const toggleY = offsetY + scaledHeight - toggleH - 50;
      ctx.fillStyle = effectsEnabled ? '#062' : '#222';
      ctx.fillRect(toggleX, toggleY, toggleW, toggleH);
      ctx.strokeStyle = effectsEnabled ? '#0f8' : '#555';
      ctx.lineWidth = 2;
      ctx.strokeRect(toggleX, toggleY, toggleW, toggleH);
      ctx.fillStyle = '#fff';
      ctx.font = '10px Orbitron, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        effectsEnabled ? 'Effects: ON' : 'Effects: OFF',
        toggleX + toggleW / 2,
        toggleY + 15,
      );
      // Cache toggle bounds for click handling
      this._effectsToggleBounds = {
        x: toggleX,
        y: toggleY,
        w: toggleW,
        h: toggleH,
      };
    } else {
      this._effectsToggleBounds = null;
    }

    // Close button - sci-fi style (responsive sizing) - Larger on mobile for better touch
    const closeButtonWidth = isMobile ? 60 : 50; // Increased from 40 to 60 on mobile
    const closeButtonHeight = isMobile ? 35 : 28; // Increased from 22 to 35 on mobile
    const closeButtonMargin = isMobile ? 10 : 20;
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(
      offsetX + scaledWidth - closeButtonWidth - closeButtonMargin,
      offsetY + (isMobile ? 15 : 25),
      closeButtonWidth,
      closeButtonHeight,
    );
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      offsetX + scaledWidth - closeButtonWidth - closeButtonMargin,
      offsetY + (isMobile ? 15 : 25),
      closeButtonWidth,
      closeButtonHeight,
    );
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isMobile ? '12px' : '14px'} Orbitron, Arial, sans-serif`; // Larger font on mobile
    ctx.textAlign = 'center';
    ctx.fillText(
      'CLOSE',
      offsetX + scaledWidth - closeButtonWidth / 2 - closeButtonMargin,
      offsetY + (isMobile ? 33 : 42), // Adjusted for larger button
    );

    // Instructions - match game style (scaled)
    ctx.fillStyle = '#cccccc';
    ctx.font = '12px Orbitron, Arial, sans-serif'; // Smaller instructions
    ctx.textAlign = 'center';
    ctx.fillText(
      'CLICK ITEMS TO PURCHASE WITH SPACE GEMS',
      canvas.width / 2,
      offsetY + scaledHeight - 40,
    );
    ctx.fillText(
      'PURCHASE SPACE GEMS WITH REAL MONEY IN THE GEMS TAB',
      canvas.width / 2,
      offsetY + scaledHeight - 25,
    );
  }

  renderTabs(ctx, canvas, offsetX, offsetY, scale, isMobile = false) {
    // Use consistent tablet detection
    const isTablet = (!isMobile && (canvas.width < 1200 || canvas.height < 900)) || 
                     (navigator.userAgent.includes('iPad') || 
                      (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1));
    
    const tabs = [
      { id: 'avatars', name: 'AVATARS', icon: '👨‍🚀' },
      { id: 'skins', name: 'SHIP SKINS', icon: '🚀' },
      { id: 'gems', name: 'SPACE GEMS', icon: '💎' },
    ];

    const tabWidth = isMobile ? 80 : isTablet ? 100 : 120; // Tablet-specific tabs
    // Center tabs inside the scaled store area so tabs align with store content
    const scaledWidth = Math.min(
      Math.floor(canvas.width * scale),
      canvas.width - (isMobile ? 20 : 40),
    );
    const startX =
      offsetX + Math.floor((scaledWidth - tabs.length * tabWidth) / 2);

    tabs.forEach((tab, index) => {
      const x = startX + index * tabWidth;
      const y = offsetY + (isMobile ? 85 : isTablet ? 105 : 120); // Tablet-specific positioning
      const isActive = this.currentTab === tab.id;

      // Tab background - sci-fi style
      ctx.fillStyle = isActive ? '#003366' : '#001122';
      const tabHeight = isMobile ? 24 : isTablet ? 28 : 32; // Tablet-specific height
      ctx.fillRect(x, y, tabWidth - (isMobile ? 5 : 10), tabHeight);

      // Tab border
      ctx.strokeStyle = isActive ? '#00ffff' : '#666666';
      ctx.lineWidth = isActive ? (isMobile ? 2 : 3) : 1;
      ctx.strokeRect(x, y, tabWidth - (isMobile ? 5 : 10), tabHeight);

      // Tab text - Orbitron font (responsive sizing)
      ctx.fillStyle = isActive ? '#00ffff' : '#ffffff';
      ctx.font = `${isActive ? 'bold ' : ''}${isMobile ? '9px' : isTablet ? '10px' : '12px'} Orbitron, Arial, sans-serif`; // Tablet-specific font
      ctx.textAlign = 'center';
      
      if (isMobile) {
        // Mobile: show only icon to save space
        ctx.fillText(tab.icon, x + (tabWidth - 5) / 2, y + tabHeight / 2 + 3);
      } else {
        // Desktop and Tablet: show icon and name (tablet gets smaller font)
        const textY = isTablet ? y + 18 : y + 20; // Tablet-specific text positioning
        ctx.fillText(`${tab.icon} ${tab.name}`, x + (tabWidth - 10) / 2, textY);
      }
    });
  }

  renderStoreContent(ctx, canvas, offsetX, offsetY, scale) {
    const items = this.getCurrentTabItems();
    // Use consistent tablet detection across all methods
    const isMobile = canvas.width < 600 || canvas.height < 700;
    const isTablet = (!isMobile && (canvas.width < 1200 || canvas.height < 900)) || 
                     (navigator.userAgent.includes('iPad') || 
                      (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1));
    
    const startY = offsetY + (isMobile ? 100 : isTablet ? 150 : 170); // Better tablet positioning
    const itemHeight = isMobile ? 65 : isTablet ? 85 : 100; // Tablet-specific sizing
    const itemWidth = isMobile ? 160 : isTablet ? 200 : 240; // Tablet-specific sizing
    const spacing = isMobile ? 10 : isTablet ? 20 : 30; // Tablet-specific spacing

    // Compute scaled store area and derive how many items fit per row dynamically
    const scaledWidth = Math.min(
      Math.floor(canvas.width * scale),
      canvas.width - (isMobile ? 20 : 40),
    );
    const availableInner = scaledWidth - (isMobile ? 20 : 40); // padding inside scaled area
    const itemsPerRow = Math.max(
      1,
      Math.floor((availableInner + spacing) / (itemWidth + spacing)),
    );

    items.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      // Center the grid inside the scaled area using offsetX
      const gridWidth = itemsPerRow * itemWidth + (itemsPerRow - 1) * spacing;
      const startX =
        offsetX + (isMobile ? 10 : 20) + Math.floor((scaledWidth - (isMobile ? 20 : 40) - gridWidth) / 2);
      const x = startX + col * (itemWidth + spacing);
      const y = startY + row * (itemHeight + (isMobile ? 10 : 25)); // Even smaller row spacing on mobile

      this.renderStoreItem(ctx, item, x, y, itemWidth, itemHeight, isMobile);
    });
  }

  renderStoreItem(ctx, item, x, y, width, height, isMobile = false) {
    // Item background - sci-fi panel style
    const isOwned = item.owned || item.gems !== undefined;
    ctx.fillStyle = isOwned ? '#002200' : '#111122';
    ctx.fillRect(x, y, width, height);

    // Item border - sci-fi style (thinner on mobile)
    ctx.strokeStyle = isOwned ? '#00ff00' : '#00ffff';
    ctx.lineWidth = isOwned ? (isMobile ? 2 : 3) : (isMobile ? 1 : 2);
    ctx.strokeRect(x, y, width, height);

    // Inner border
    ctx.strokeStyle = isOwned ? '#004400' : '#003366';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);

    // Item content - Orbitron font (responsive sizing)
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isMobile ? '11px' : '13px'} Orbitron, Arial, sans-serif`;
    ctx.textAlign = 'left';

    if (item.gems !== undefined) {
      // Gem package
      ctx.fillText(item.name.toUpperCase(), x + 12, y + (isMobile ? 16 : 20));
      ctx.font = `${isMobile ? '8px' : '10px'} Orbitron, Arial, sans-serif`;
      ctx.fillStyle = '#cccccc';
      ctx.fillText(item.description, x + 12, y + (isMobile ? 28 : 35));

      ctx.fillStyle = '#00ffff';
      ctx.font = `bold ${isMobile ? '11px' : '14px'} Orbitron, Arial, sans-serif`;
      ctx.fillText(
        `💎 ${item.gems}${item.bonus > 0 ? ` + ${item.bonus} BONUS` : ''}`,
        x + 12,
        y + (isMobile ? 42 : 55),
      );

      ctx.fillStyle = '#ffff00';
      ctx.font = `bold ${isMobile ? '13px' : '16px'} Orbitron, Arial, sans-serif`;
      ctx.fillText(`$${item.price}`, x + 12, y + (isMobile ? 58 : 75));

      if (item.popular) {
        ctx.fillStyle = '#ff4444';
        ctx.font = `bold ${isMobile ? '8px' : '10px'} Orbitron, Arial, sans-serif`;
        ctx.fillText('POPULAR!', x + width - (isMobile ? 50 : 70), y + (isMobile ? 12 : 15));
      }

      // Purchase button (responsive sizing)
      const btnW = isMobile ? 50 : 65;
      const btnH = isMobile ? 16 : 20;
      const btnX = x + width - btnW - (isMobile ? 8 : 15);
      const btnY = y + height - btnH - (isMobile ? 6 : 8);
      ctx.fillStyle = '#006600';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(btnX, btnY, btnW, btnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isMobile ? '8px' : '10px'} Orbitron, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('BUY NOW', btnX + 32, btnY + 13);
    } else {
      // Avatar or skin - render actual preview
      if (this.currentTab === 'avatars') {
        // Create a small canvas for avatar preview
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 48;
        previewCanvas.height = 48;
        const previewCtx = previewCanvas.getContext('2d');

        // Render the actual avatar
        if (this.avatarManager && this.avatarManager[item.drawMethod]) {
          this.avatarManager[item.drawMethod](previewCtx, 48);
          ctx.drawImage(previewCanvas, x + 15, y + 15, 48, 48);
        }
      } else if (
        this.currentTab === 'skins' &&
        item.appearance &&
        item.appearance.effect
      ) {
        // Render ship with skin preview using ACTUAL game ship geometry
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 80;
        previewCanvas.height = 60;
        const previewCtx = previewCanvas.getContext('2d');

        // Completely transparent background - no boxes or borders
        previewCtx.clearRect(0, 0, 80, 60);

        // Center the ship in preview
        previewCtx.save();
        previewCtx.translate(40, 30);
        previewCtx.scale(1.4, 1.4); // Larger scale for better visibility

        // Use skin colors
        const shipColor = item.appearance.color || '#666666';
        const accentColor = item.appearance.accent || '#ffffff';

        // Apply skin effects BEFORE drawing ship for better results
        if (item.appearance.effect === 'glow') {
          previewCtx.shadowColor = shipColor;
          previewCtx.shadowBlur = 12;
        } else if (
          item.appearance.effect === 'stealth' ||
          item.appearance.effect === 'ghost'
        ) {
          previewCtx.globalAlpha = 0.8; // More visible than before
        }

        // Helper: draw hazard pattern (black/yellow checkers + circular targets)
        function drawHazardPattern(ctx, shipColor, accentColor) {
          // Preview hazard pattern that matches in-game: apply checker only to wings
          const square = 10; // base square before scaling
          // Make squares larger so pattern is clearly visible in preview
          const squareSize = Math.max(3, Math.round(square * 0.45));

          // Helper to draw checker grid in a box
          const drawCheckerInBox = (minX, minY, maxX, maxY) => {
            const w = maxX - minX;
            const h = maxY - minY;
            const cols = Math.max(2, Math.ceil((w + squareSize * 2) / squareSize));
            const rows = Math.max(2, Math.ceil((h + squareSize * 2) / squareSize));
        const totalW = cols * squareSize;
        const totalH = rows * squareSize;
        const startX = Math.round(minX - (totalW - w) / 2);
        const startY = Math.round(minY - (totalH - h) / 2);

            const fadeRadius = Math.max(10, (maxX - minX) * 0.45);
            const minAlpha = 0.12; // slightly stronger base visibility

            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                const xx = Math.round(startX + c * squareSize);
                const yy = Math.round(startY + r * squareSize);
                const parity = (c + r) & 1;
                const cx = xx + squareSize * 0.5;
                const cy = yy + squareSize * 0.5;
                const dist = Math.hypot(cx, cy);
                const t = Math.max(0, Math.min(1, dist / fadeRadius));
                const alpha = minAlpha + (1 - minAlpha) * t;

                const prevAlpha = ctx.globalAlpha;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = parity === 0 ? shipColor : accentColor;
                ctx.fillRect(xx, yy, squareSize, squareSize);
                ctx.globalAlpha = prevAlpha;
              }
            }
          };

          // Wing polygons for preview (match shipskins shapes)
          const wings = [
            [
              { x: -12, y: 0 },
              { x: -8, y: 8 },
              { x: -5, y: 5 },
              { x: -12, y: 4 },
            ],
            [
              { x: 12, y: 0 },
              { x: 8, y: 8 },
              { x: 5, y: 5 },
              { x: 12, y: 4 },
            ],
          ];

          ctx.save();
          wings.forEach((pts) => {
            const p = new Path2D();
            p.moveTo(pts[0].x, pts[0].y);
            let minX = pts[0].x,
              maxX = pts[0].x,
              minY = pts[0].y,
              maxY = pts[0].y;
            for (let i = 1; i < pts.length; i++) {
              p.lineTo(pts[i].x, pts[i].y);
              minX = Math.min(minX, pts[i].x);
              maxX = Math.max(maxX, pts[i].x);
              minY = Math.min(minY, pts[i].y);
              maxY = Math.max(maxY, pts[i].y);
            }
            p.closePath();
            ctx.save();
            ctx.clip(p);
            drawCheckerInBox(minX, minY, maxX, maxY);
            // Sheen limited to wing area
            ctx.globalCompositeOperation = 'overlay';
            const sheen = ctx.createLinearGradient(minX, minY, maxX, maxY);
            sheen.addColorStop(0, 'rgba(255,255,255,0.07)');
            sheen.addColorStop(0.5, 'rgba(255,255,255,0.02)');
            sheen.addColorStop(1, 'rgba(0,0,0,0.02)');
            ctx.fillStyle = sheen;
            ctx.fillRect(Math.round(minX), Math.round(minY), Math.round(maxX - minX), Math.round(maxY - minY));
            ctx.restore();
          });
          ctx.restore();
        }

        // Draw the ACTUAL ship shape based on ship type using your game's exact code
        if (item.shipType === 'scout') {
          // EXACT scout ship from your game (use Path2D so we can clip the pattern)
          const shipPath = new Path2D();
          shipPath.moveTo(0, -15); // front nose
          shipPath.lineTo(-4, -10); // left nose edge
          shipPath.lineTo(-12, 0); // left wing tip
          shipPath.lineTo(-8, 8); // left rear corner
          shipPath.lineTo(-5, 5); // left engine mount
          shipPath.lineTo(0, 7); // center bottom
          shipPath.lineTo(5, 5); // right engine mount
          shipPath.lineTo(8, 8); // right rear corner
          shipPath.lineTo(12, 0); // right wing tip
          shipPath.lineTo(4, -10); // right nose edge
          shipPath.closePath();

          previewCtx.fillStyle = shipColor;
          previewCtx.fill(shipPath);

          // If hazard pattern requested, clip to ship and draw pattern
          if (item.appearance.effect === 'hazard_stripes') {
            previewCtx.save();
            previewCtx.clip(shipPath);
            drawHazardPattern(previewCtx, shipColor, accentColor);
            previewCtx.restore();
          }

          // Cockpit canopy
          previewCtx.fillStyle = 'rgba(130, 200, 255, 0.7)';
          previewCtx.beginPath();
          previewCtx.ellipse(0, -5, 3, 6, 0, 0, Math.PI * 2);
          previewCtx.fill();

          // Detail lines
          previewCtx.strokeStyle = 'rgba(50, 50, 50, 0.7)';
          previewCtx.lineWidth = 1;
          previewCtx.beginPath();
          previewCtx.moveTo(-8, 0);
          previewCtx.lineTo(-4, -8);
          previewCtx.moveTo(8, 0);
          previewCtx.lineTo(4, -8);
          previewCtx.stroke();
        } else if (item.shipType === 'fighter') {
          const shipPath = new Path2D();
          shipPath.moveTo(0, -16); // Front nose tip (scaled for preview)
          shipPath.lineTo(-3, -11); // Left side of nose
          shipPath.lineTo(-13, -3); // Left wing tip
          shipPath.lineTo(-9, 0); // Left wing inner edge
          shipPath.lineTo(-11, 9); // Left rear wing
          shipPath.lineTo(-3, 6); // Left engine mount
          shipPath.lineTo(0, 7); // Center bottom
          shipPath.lineTo(3, 6); // Right engine mount
          shipPath.lineTo(11, 9); // Right rear wing
          shipPath.lineTo(9, 0); // Right wing inner edge
          shipPath.lineTo(13, -3); // Right wing tip
          shipPath.lineTo(3, -11); // Right side of nose
          shipPath.closePath();

          previewCtx.fillStyle = shipColor;
          previewCtx.fill(shipPath);

          if (item.appearance.effect === 'hazard_stripes') {
            previewCtx.save();
            previewCtx.clip(shipPath);
            drawHazardPattern(previewCtx, shipColor, accentColor);
            previewCtx.restore();
          }

          // Cockpit
          previewCtx.fillStyle = 'rgba(180, 230, 255, 0.7)';
          previewCtx.beginPath();
          previewCtx.ellipse(0, -6, 3, 5, 0, 0, Math.PI * 2);
          previewCtx.fill();

          // Wing markings/details
          previewCtx.fillStyle = accentColor;
          previewCtx.beginPath();
          previewCtx.moveTo(-11, -2);
          previewCtx.lineTo(-7, -1);
          previewCtx.lineTo(-7, 1);
          previewCtx.lineTo(-11, 0);
          previewCtx.closePath();
          previewCtx.fill();

          previewCtx.beginPath();
          previewCtx.moveTo(11, -2);
          previewCtx.lineTo(7, -1);
          previewCtx.lineTo(7, 1);
          previewCtx.lineTo(11, 0);
          previewCtx.closePath();
          previewCtx.fill();
        } else if (item.shipType === 'heavy') {
          const shipPath = new Path2D();
          shipPath.moveTo(0, -18); // Nose tip (scaled for preview)
          shipPath.lineTo(-5, -13); // Left front angled edge
          shipPath.lineTo(-8, -3); // Left mid-hull
          shipPath.lineTo(-16, 0); // Left wing tip
          shipPath.lineTo(-16, 3); // Left wing corner
          shipPath.lineTo(-12, 5); // Left wing inner
          shipPath.lineTo(-6, 11); // Left engine mount
          shipPath.lineTo(0, 9); // Bottom center
          shipPath.lineTo(6, 11); // Right engine mount
          shipPath.lineTo(12, 5); // Right wing inner
          shipPath.lineTo(16, 3); // Right wing corner
          shipPath.lineTo(16, 0); // Right wing tip
          shipPath.lineTo(8, -3); // Right mid-hull
          shipPath.lineTo(5, -13); // Right front angled edge
          shipPath.closePath();

          previewCtx.fillStyle = shipColor;
          previewCtx.fill(shipPath);

          if (item.appearance.effect === 'hazard_stripes') {
            previewCtx.save();
            previewCtx.clip(shipPath);
            drawHazardPattern(previewCtx, shipColor, accentColor);
            previewCtx.restore();
          }

          // Heavy armor plating
          previewCtx.strokeStyle = accentColor;
          previewCtx.lineWidth = 1;
          previewCtx.beginPath();
          previewCtx.moveTo(-6, -9);
          previewCtx.lineTo(-9, -3);
          previewCtx.moveTo(6, -9);
          previewCtx.lineTo(9, -3);
          previewCtx.moveTo(-6, -3);
          previewCtx.lineTo(6, -3);
          previewCtx.stroke();

          // Cockpit
          previewCtx.fillStyle = 'rgba(150, 200, 255, 0.8)';
          previewCtx.beginPath();
          previewCtx.ellipse(0, -7, 3, 5, 0, 0, Math.PI * 2);
          previewCtx.fill();

          // Side weapon mounts
          previewCtx.fillStyle = '#555';
          previewCtx.beginPath();
          previewCtx.rect(-14, -1, 5, 2);
          previewCtx.rect(9, -1, 5, 2);
          previewCtx.fill();
        } else if (item.shipType === 'stealth') {
          const shipPath = new Path2D();
          shipPath.moveTo(0, -16); // Nose tip (scaled for preview)
          shipPath.lineTo(-2, -12); // Narrow front section
          shipPath.lineTo(-12, -4); // Left wing edge
          shipPath.lineTo(-6, 4); // Left mid-wing
          shipPath.lineTo(-9, 12); // Left wing extension
          shipPath.lineTo(-4, 9); // Left engine
          shipPath.lineTo(0, 8); // Center
          shipPath.lineTo(4, 9); // Right engine
          shipPath.lineTo(9, 12); // Right wing extension
          shipPath.lineTo(6, 4); // Right mid-wing
          shipPath.lineTo(12, -4); // Right wing edge
          shipPath.lineTo(2, -12); // Narrow front section
          shipPath.closePath();

          previewCtx.fillStyle = shipColor;
          previewCtx.fill(shipPath);

          if (item.appearance.effect === 'hazard_stripes') {
            previewCtx.save();
            previewCtx.clip(shipPath);
            drawHazardPattern(previewCtx, shipColor, accentColor);
            previewCtx.restore();
          }

          // Add visible outline to prevent unfair advantage
          previewCtx.strokeStyle = accentColor;
          previewCtx.lineWidth = 1;
          previewCtx.stroke();

          // Stealth panels with VISIBLE gradient
          const stealthGradient = previewCtx.createLinearGradient(
            0,
            -12,
            0,
            12,
          );
          stealthGradient.addColorStop(0, shipColor);
          stealthGradient.addColorStop(0.5, accentColor);
          stealthGradient.addColorStop(1, shipColor);

          previewCtx.fillStyle = stealthGradient;
          previewCtx.beginPath();
          previewCtx.moveTo(-8, -2);
          previewCtx.lineTo(-5, 0);
          previewCtx.lineTo(-6, 6);
          previewCtx.lineTo(-9, 9);
          previewCtx.closePath();
          previewCtx.fill();

          previewCtx.beginPath();
          previewCtx.moveTo(8, -2);
          previewCtx.lineTo(5, 0);
          previewCtx.lineTo(6, 6);
          previewCtx.lineTo(9, 9);
          previewCtx.closePath();
          previewCtx.fill();

          // Cockpit - VISIBLE tinted window
          previewCtx.fillStyle = accentColor;
          previewCtx.beginPath();
          previewCtx.ellipse(0, -6, 2, 4, 0, 0, Math.PI * 2);
          previewCtx.fill();

          // Add distinctive markings to make it clearly visible
          previewCtx.fillStyle = accentColor;
          previewCtx.fillRect(-1, -10, 2, 3); // Center stripe
          previewCtx.fillRect(-6, 2, 2, 1); // Left marking
          previewCtx.fillRect(4, 2, 2, 1); // Right marking
        }

        // Apply additional skin effects AFTER ship is drawn (NO BACKGROUND FILLS)
        if (item.appearance.effect === 'metallic') {
          // Create metallic shimmer effect without background
          previewCtx.globalCompositeOperation = 'overlay';
          const gradient = previewCtx.createLinearGradient(-20, -20, 20, 20);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
          gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
          previewCtx.fillStyle = gradient;
          // Only fill the ship area, not the whole canvas
          previewCtx.fill();
          previewCtx.globalCompositeOperation = 'source-over';
        } else if (item.appearance.effect === 'fire') {
          // Add fire glow around ship edges only
          previewCtx.shadowColor = '#ff4400';
          previewCtx.shadowBlur = 8;
          previewCtx.globalCompositeOperation = 'screen';
          previewCtx.fillStyle = 'rgba(255, 100, 0, 0.2)';
          previewCtx.fill(); // Only fills the ship path
          previewCtx.globalCompositeOperation = 'source-over';
        }

        previewCtx.restore();
        ctx.drawImage(previewCanvas, x + 15, y + 15, 80, 60);
      }

      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Orbitron, Arial, sans-serif'; // Smaller item name
      ctx.fillStyle = '#ffffff';
      ctx.fillText(item.name.toUpperCase(), x + 80, y + 20); // Adjusted position for smaller layout

      ctx.font = '9px Orbitron, Arial, sans-serif'; // Smaller description
      ctx.fillStyle = '#cccccc';

      // Wrap long descriptions to fit in the item box
      const words = item.description.split(' ');
      let line = '';
      let textY = y + 35; // Use different variable name to avoid conflict
      const maxWidth = width - 90; // Leave space for preview and padding

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x + 80, textY);
          line = words[n] + ' ';
          textY += 11; // Smaller line height
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x + 80, textY);

      // Rarity - position it AFTER the description text ends
      const rarityColors = {
        rare: '#0066ff',
        epic: '#9933ff',
        legendary: '#ff6600',
      };
      ctx.fillStyle = rarityColors[item.rarity] || '#cccccc';
      ctx.font = 'bold 10px Orbitron, Arial, sans-serif'; // Smaller rarity text
      ctx.fillText(item.rarity.toUpperCase(), x + 80, textY + 15); // Smaller spacing

      // Price / equip logic
      if (!isOwned) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 12px Orbitron, Arial, sans-serif'; // Smaller price
        ctx.fillText(`💎 ${item.gemPrice}`, x + 80, textY + 30); // Position relative to description end

        ctx.fillStyle = '#ffff00';
        ctx.font = '9px Orbitron, Arial, sans-serif'; // Smaller real price
        ctx.fillText(`or $${item.realPrice}`, x + 80, textY + 45); // Position relative to description end

        // Purchase button (smaller)
        const btnX = x + width - 80;
        const btnY = y + height - 28;
        ctx.fillStyle = '#003366';
        ctx.fillRect(btnX, btnY, 80, 25);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(btnX, btnY, 80, 25);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Orbitron, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PURCHASE', btnX + 40, btnY + 16);
      } else {
        // Determine if this skin is currently equipped
        const equippedSkin = localStorage.getItem('selectedShipSkin') || 'none';
        const isEquipped = equippedSkin === item.id;

        // Per UX: always display 'OWNED' for purchased items (do not show EQUIPPED/PURCHASED)
        ctx.fillStyle = '#339933';
        ctx.font = 'bold 14px Orbitron, Arial, sans-serif';
        ctx.fillText('OWNED', x + 90, textY + 45);

        // NOTE: per UX, hide the equip/unequip button in the Premium Store
        // item card once the item is owned to avoid overlapping the status
        // label. Equipping can still be done by clicking the item card (handled
        // in `handleItemClick`) or in the Appearance tab.
          }
    }
  }

  // Handle clicks on store items
  handleClick(x, y, canvas) {
    if (!this.storeOpen) return false;
    
    // Debug logging for tablets
    console.log(`Click at: ${x}, ${y} | Canvas: ${canvas.width}x${canvas.height}`);
    
    // Use EXACT same mobile/tablet detection and responsive logic as render method
    const isMobile = canvas.width < 600 || canvas.height < 700;
    const isTablet = (!isMobile && (canvas.width < 1200 || canvas.height < 900)) || 
                     (navigator.userAgent.includes('iPad') || 
                      (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1));
    
    let baseScale, dynamicFactor;
    if (isMobile) {
      baseScale = 0.7; // Match render method - was 0.9
      dynamicFactor = 0.85; // Match render method - was 0.95
    } else if (isTablet) {
      baseScale = 0.85; // Match render method - was 0.8
      dynamicFactor = 0.9; // Match render method - was 0.8
    } else {
      baseScale = 0.75;
      dynamicFactor = 1;
    }
    
    const scale = baseScale * dynamicFactor;
    const scaledWidthBase = Math.min(
      Math.floor(canvas.width * scale),
      canvas.width - (isMobile ? 20 : 40),
    );
    const scaledHeightBase = Math.min(
      Math.floor(canvas.height * scale),
      canvas.height - (isMobile ? 20 : 40),
    );

    // Recompute grid metrics using consistent tablet-responsive values
    const gridItemsForHeight = this.getCurrentTabItems();
    const gridItemHeight = isMobile ? 65 : isTablet ? 85 : 100; // Match renderStoreContent
    const gridItemWidth = isMobile ? 160 : isTablet ? 200 : 240; // Match renderStoreContent
    const gridSpacing = isMobile ? 10 : isTablet ? 20 : 30; // Match renderStoreContent
    const availableInnerBase = scaledWidthBase - (isMobile ? 20 : 40);
    const itemsPerRowBase = Math.max(
      1,
      Math.floor(
        (availableInnerBase + gridSpacing) / (gridItemWidth + gridSpacing),
      ),
    );
    const rowsBase = Math.max(
      1,
      Math.ceil(gridItemsForHeight.length / itemsPerRowBase),
    );
    const gridHeight = rowsBase * (gridItemHeight + (isMobile ? 10 : isTablet ? 20 : 25)) - (isMobile ? 10 : isTablet ? 20 : 25);

    const headerHeight = isMobile ? 120 : isTablet ? 160 : 200; // Tablet-specific heights
    const footerHeight = isMobile ? 60 : isTablet ? 100 : 140; // Tablet-specific heights
    const neededHeight = headerHeight + gridHeight + footerHeight;

    const scaledHeight = Math.min(
      canvas.height - (isMobile ? 20 : 40),
      Math.max(scaledHeightBase, neededHeight),
    );
    const scaledWidth = scaledWidthBase;
    const offsetX = Math.floor((canvas.width - scaledWidth) / 2);
    const offsetY = Math.floor((canvas.height - scaledHeight) / 2);

    // Close button - responsive sizing (matches render method) - Larger on mobile/tablet for better touch
    const closeButtonWidth = isMobile ? 60 : isTablet ? 55 : 50; // Tablet-specific sizing
    const closeButtonHeight = isMobile ? 35 : isTablet ? 32 : 28; // Tablet-specific sizing
    const closeButtonMargin = isMobile ? 10 : 20;
    const closeX = offsetX + scaledWidth - closeButtonWidth - closeButtonMargin;
    const closeY = offsetY + (isMobile ? 15 : 25);
    
    if (
      x >= closeX &&
      x <= closeX + closeButtonWidth &&
      y >= closeY &&
      y <= closeY + closeButtonHeight
    ) {
      this.toggleStore();
      return true;
    }

    // Tab buttons - responsive sizing (matches render method)
    const tabs = ['avatars', 'skins', 'gems'];
    const tabWidth = isMobile ? 80 : isTablet ? 100 : 120; // Tablet-specific tab width
    const tabStartX =
      offsetX + Math.floor((scaledWidth - tabs.length * tabWidth) / 2);

    for (let i = 0; i < tabs.length; i++) {
      const tabX = tabStartX + i * tabWidth;
      const tabY = offsetY + (isMobile ? 85 : isTablet ? 105 : 120); // Tablet-specific tab Y
      const tabHeight = isMobile ? 24 : isTablet ? 28 : 32; // Tablet-specific tab height

      if (
        x >= tabX &&
        x <= tabX + tabWidth - (isMobile ? 5 : 10) &&
        y >= tabY &&
        y <= tabY + tabHeight
      ) {
        // Smaller tab height
        this.setTab(tabs[i]);
        return true;
      }
    }

    // Store items - updated positions (matches render method)
    const items = this.getCurrentTabItems();
    const startYItems = offsetY + (isMobile ? 100 : isTablet ? 150 : 170); // Match renderStoreContent
    const itemHeight = isMobile ? 65 : isTablet ? 85 : 100; // Match renderStoreContent
    const itemWidth = isMobile ? 160 : isTablet ? 200 : 240; // Match renderStoreContent  
    const spacing = isMobile ? 10 : isTablet ? 20 : 30; // Match renderStoreContent

    // Compute how many items per row using same logic as renderStoreContent
    const availableInner = scaledWidth - (isMobile ? 20 : 40);
    const itemsPerRow = Math.max(
      1,
      Math.floor((availableInner + spacing) / (itemWidth + spacing)),
    );
    const gridWidth = itemsPerRow * itemWidth + (itemsPerRow - 1) * spacing;
    const startXItems =
      offsetX + (isMobile ? 10 : 20) + Math.floor((scaledWidth - (isMobile ? 20 : 40) - gridWidth) / 2);

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const itemX = startXItems + col * (itemWidth + spacing);
      const itemY = startYItems + row * (itemHeight + (isMobile ? 10 : isTablet ? 20 : 25)); // Match renderStoreContent spacing

      if (
        x >= itemX &&
        x <= itemX + itemWidth &&
        y >= itemY &&
        y <= itemY + itemHeight
      ) {
        // Click is inside the item box. Decide intent:
        // - For gem packages: only trigger purchase when clicking the small BUY NOW button
        // - For non-owned avatars/skins: only trigger purchase when clicking the PURCHASE button
        // - For owned skins: clicking the item box toggles equip (keep existing behavior)

        if (item.gems !== undefined) {
          // Gem package BUY NOW button (matches render): btnW=65, btnH=20
          const btnX = itemX + itemWidth - 80;
          const btnY = itemY + itemHeight - 28;
          const btnW = 65;
          const btnH = 20;
          if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
            this.handleItemClick(item);
            return true;
          }
          // Click inside package box but not on button -> ignore
          return false;
        }

        if (!item.owned) {
          // Non-owned avatar/skin purchase button (matches render): btnW=80, btnH=25
          const btnX = itemX + itemWidth - 80;
          const btnY = itemY + itemHeight - 28;
          const btnW = 80;
          const btnH = 25;
          if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
            this.handleItemClick(item);
            return true;
          }
          // Click inside item but not on purchase button -> ignore
          return false;
        }

        // Owned item: allow full-box click to toggle equip (skins)
        this.handleItemClick(item);
        return true;
      }
    }

    // Effects toggle click (if visible)
    if (this.currentTab === 'skins' && this._effectsToggleBounds) {
      const b = this._effectsToggleBounds;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        const current =
          localStorage.getItem('shipSkinEffectsEnabled') === 'true';
        const next = !current;
        localStorage.setItem('shipSkinEffectsEnabled', next ? 'true' : 'false');
        if (window.game && window.game.shipSkins) {
          window.game.shipSkins.setEffectsEnabled(next);
        }
        return true; // Will re-render next frame
      }
    }

    return false;
  }

  handleItemClick(item) {
    if (item.gems !== undefined) {
      // Gem package - trigger PayPal payment
      console.log(
        `Initiating PayPal payment for ${item.name} - $${item.price}`,
      );

      if (this.paypalIntegration) {
        this.paypalIntegration.createPayPalPayment(item);
      } else {
        console.error('PayPal integration not available');
        alert(
          'Payment system temporarily unavailable. Please try again later.',
        );
      }
    } else if (!item.owned) {
      // Premium item purchase with gems
      const itemType = this.premiumAvatars.includes(item) ? 'avatar' : 'skin';
      if (this.purchaseWithGems(itemType, item.id)) {
        console.log(`Successfully purchased ${item.name}!`);
      } else {
        console.log(
          `Cannot purchase ${item.name}. Need ${item.gemPrice - this.spaceGems} more Space Gems.`,
        );
        this.showInsufficientGemsMessage(item);
      }
    } else if (item.owned) {
      // Toggle equip for skins only
      const isSkin = this.shipSkins.includes(item);
      if (isSkin) {
        const equippedSkin = localStorage.getItem('selectedShipSkin') || 'none';
        if (equippedSkin === item.id) {
          // Unequip via player API
          if (window.game && window.game.player) {
            window.game.player.setShipSkin('none');
          } else {
            localStorage.setItem('selectedShipSkin', 'none');
          }
        } else {
          // Equip via player API
          if (window.game && window.game.player) {
            window.game.player.setShipSkin(item.id);
          } else {
            localStorage.setItem('selectedShipSkin', item.id);
          }
        }
      }
    }
  }

  // Show insufficient gems message
  showInsufficientGemsMessage(item) {
    const needed = item.gemPrice - this.spaceGems;
    const overlay = document.createElement('div');
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;

    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
            background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
            border: 2px solid #ff6666;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            color: white;
            max-width: 400px;
            box-shadow: 0 0 20px #ff666688;
        `;

    messageBox.innerHTML = `
            <h2 style="margin: 0 0 15px 0; color: #ff6666; font-family: 'Orbitron', monospace;">Insufficient Space Gems 💎</h2>
            <p style="margin: 0 0 10px 0; font-size: 16px; font-family: 'Orbitron', monospace;">You need <strong>${needed} more gems</strong> to purchase ${item.name}</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #cccccc; font-family: 'Orbitron', monospace;">
                Current: ${this.spaceGems} gems | Required: ${item.gemPrice} gems
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button onclick="this.closest('.overlay').remove(); window.premiumStore.purchaseWithRealMoney('${item.id}', '${item.name}', ${item.realPrice});" 
                        style="background: #28a745; color: white; border: none; 
                               padding: 12px 20px; border-radius: 5px; cursor: pointer;
                               font-weight: bold; font-size: 14px; font-family: 'Orbitron', monospace;">
                    Buy for $${item.realPrice}
                </button>
                <button onclick="this.closest('.overlay').remove(); window.premiumStore.setTab('gems');" 
                        style="background: #00ffff; color: black; border: none; 
                               padding: 10px 15px; border-radius: 5px; cursor: pointer;
                               font-weight: bold; margin: 5px; font-family: 'Orbitron', monospace;">
                    Buy Gems
                </button>
                <button onclick="this.closest('.overlay').remove()" 
                        style="background: #666666; color: white; border: none; 
                               padding: 10px 15px; border-radius: 5px; cursor: pointer;
                               margin: 5px; font-family: 'Orbitron', monospace;">
                    Cancel
                </button>
            </div>
        `;

    overlay.className = 'overlay';
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);

    // Make premium store accessible
    window.premiumStore = this;
  }

  // Set avatar manager reference for rendering previews
  setAvatarManager(avatarManager) {
    this.avatarManager = avatarManager;
    console.log('Avatar manager connected to Premium Store');
  }

  // Set PayPal integration
  setPayPalIntegration(paypalIntegration) {
    this.paypalIntegration = paypalIntegration;
    console.log('PayPal integration connected to Premium Store');
  }

  // Purchase item directly with real money (PayPal)
  purchaseWithRealMoney(itemId, itemName, realPrice) {
    console.log(`Initiating PayPal payment for ${itemName} - $${realPrice}`);
    
    // Find the item in avatars or skins
    let item = this.premiumAvatars.find(avatar => avatar.id === itemId);
    if (!item) {
      item = this.shipSkins.find(skin => skin.id === itemId);
    }
    
    if (!item) {
      console.error(`Item ${itemId} not found`);
      return;
    }

    // Create a PayPal payment item object
    const paymentItem = {
      id: itemId,
      name: itemName,
      price: realPrice, // Use the realPrice parameter directly
      type: this.premiumAvatars.includes(item) ? 'avatar' : 'skin'
    };

    if (this.paypalIntegration) {
      this.paypalIntegration.createPayPalPayment(paymentItem);
    } else {
      console.error('PayPal integration not available');
      alert('Payment system temporarily unavailable. Please try again later.');
    }
  }

  // Grant avatar after successful PayPal purchase
  grantAvatar(avatarId) {
    const purchases = this.loadPremiumPurchases();
    if (!purchases.avatars) purchases.avatars = [];
    
    if (!purchases.avatars.includes(avatarId)) {
      purchases.avatars.push(avatarId);
      localStorage.setItem('premiumPurchases', JSON.stringify(purchases));
      
      // Update the avatar in the store
      const avatar = this.premiumAvatars.find(a => a.id === avatarId);
      if (avatar) {
        avatar.owned = true;
      }
      
      console.log(`Avatar ${avatarId} granted successfully`);
    }
  }

  // Grant skin after successful PayPal purchase  
  grantSkin(skinId) {
    const purchases = this.loadPremiumPurchases();
    if (!purchases.skins) purchases.skins = [];
    
    if (!purchases.skins.includes(skinId)) {
      purchases.skins.push(skinId);
      localStorage.setItem('premiumPurchases', JSON.stringify(purchases));
      
      // Update the skin in the store
      const skin = this.shipSkins.find(s => s.id === skinId);
      if (skin) {
        skin.owned = true;
      }
      
      console.log(`Skin ${skinId} granted successfully`);
    }
  }
}
