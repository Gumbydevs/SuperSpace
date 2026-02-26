// Ship Skin Notification System for SuperSpace
// Handles badge notifications for new ship skins (same UX as challenges)

// Production mode flag - set to true to disable debug logging
const SKIN_DEBUG_MODE = false;

class ShipSkinNotificationManager {
  constructor() {
    this._newSkinsKey = 'newShipSkins';
    this._seenSkinsKey = 'seenShipSkins'; // Track skins the player has acknowledged
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    
    // Inject badge styles
    this._injectBadgeStyle();
    
    // Set up click listeners on skin buttons to clear badges
    this._setupClickListeners();
    
    // Check if players have the playtester skin but haven't been notified yet
    this._checkForUnseenSkins();
    
    // Render initial badges (will show if there are any new skins)
    setTimeout(() => this._renderBadges(), 500); // Delay to ensure tabs are rendered
    
    this._initialized = true;
    if (SKIN_DEBUG_MODE) {
      if (SKIN_DEBUG_MODE) console.log('✨ Ship skin notification system initialized');
    }
  }

  // Check if player has skins they haven't been notified about yet
  _checkForUnseenSkins() {
    try {
      const purchases = JSON.parse(localStorage.getItem('premiumPurchases') || '{"skins":[]}');
      const ownedSkins = purchases.skins || [];
      const notifiedSkins = this._getNewSkins();
      const seenSkins = this._getSeenSkins();
      
      // List of skins that should trigger notifications
      const notifiableSkins = ['scout_playtester'];
      
      for (const skinId of notifiableSkins) {
        // Only notify if player owns it, hasn't been notified, AND hasn't seen it before
        if (ownedSkins.includes(skinId) && !notifiedSkins.includes(skinId) && !seenSkins.includes(skinId)) {
          if (SKIN_DEBUG_MODE) {
            if (SKIN_DEBUG_MODE) console.log(`🎨 Player has ${skinId} but hasn't been notified - adding notification`);
          }
          this.addNewSkin(skinId);
        }
      }
    } catch (e) {
      if (SKIN_DEBUG_MODE) {
        if (SKIN_DEBUG_MODE) console.warn('Failed to check for unseen skins:', e);
      }
    }
  }

  // Add a new skin notification
  addNewSkin(skinId) {
    if (!skinId) return;
    const arr = this._getNewSkins();
    if (!arr.includes(skinId)) {
      arr.push(skinId);
      this._setNewSkins(arr);
      if (SKIN_DEBUG_MODE) {
        if (SKIN_DEBUG_MODE) console.log(`🎨 New skin notification added: ${skinId}`);
      }
    }
  }

  // Force refresh badges (useful after shop opens)
  refresh() {
    if (SKIN_DEBUG_MODE) {
      if (SKIN_DEBUG_MODE) console.log('Refreshing skin badges...');
    }
    this._renderBadges();
  }

  // Clear notification for a specific skin
  clearNewSkin(skinId) {
    if (!skinId) return;
    const arr = this._getNewSkins().filter((s) => s !== skinId);
    this._setNewSkins(arr);
    
    // Mark this skin as seen so it doesn't come back on refresh
    this._markSkinAsSeen(skinId);
    
    if (SKIN_DEBUG_MODE) {
      if (SKIN_DEBUG_MODE) console.log(`✓ Skin notification cleared: ${skinId}`);
    }
  }

  // Clear all skin notifications
  clearAllNewSkins() {
    const allNewSkins = this._getNewSkins();
    // Mark all as seen before clearing
    allNewSkins.forEach(skinId => this._markSkinAsSeen(skinId));
    this._setNewSkins([]);
  }

  // Mark a skin as seen/acknowledged by the player
  _markSkinAsSeen(skinId) {
    if (!skinId) return;
    try {
      const seenSkins = this._getSeenSkins();
      if (!seenSkins.includes(skinId)) {
        seenSkins.push(skinId);
        localStorage.setItem(this._seenSkinsKey, JSON.stringify(seenSkins));
        if (SKIN_DEBUG_MODE) {
          if (SKIN_DEBUG_MODE) console.log(`Marked skin as seen: ${skinId}`);
        }
      }
    } catch (e) {
      if (SKIN_DEBUG_MODE) {
        if (SKIN_DEBUG_MODE) console.warn('Failed to mark skin as seen:', e);
      }
    }
  }

  // Get list of skins the player has already seen/acknowledged
  _getSeenSkins() {
    try {
      const raw = localStorage.getItem(this._seenSkinsKey) || '[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  // Get list of new skins from localStorage
  _getNewSkins() {
    try {
      const raw = localStorage.getItem(this._newSkinsKey) || '[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  // Save list of new skins to localStorage and re-render badges
  _setNewSkins(arr) {
    try {
      localStorage.setItem(this._newSkinsKey, JSON.stringify(arr || []));
    } catch (e) {
      if (SKIN_DEBUG_MODE) console.warn('Failed to save new skins:', e);
    }
    this._renderBadges();
  }

  // Find the Shop tab element (Ships tab)
  _findShopTab() {
    // Primary selector - ships tab
    const tab = document.querySelector("[data-tab-id='ships']");
    if (tab) {
      if (SKIN_DEBUG_MODE) console.log('Found ships tab with data-tab-id selector');
      return tab;
    }
    
    // Fallback: look for tab with text containing 'Ships'
    const allTabs = document.querySelectorAll('.tab, [class*="tab"]');
    for (const t of allTabs) {
      if (/^ships$/i.test(t.textContent.trim())) {
        if (SKIN_DEBUG_MODE) console.log('Found ships tab by text content');
        return t;
      }
    }
    
    if (SKIN_DEBUG_MODE) console.warn('Could not find ships tab');
    return null;
  }

  // Find the Appearance tab element
  _findAppearanceTab() {
    // Primary selector - appearance tab
    const tab = document.querySelector("[data-tab-id='appearance']");
    if (tab) {
      if (SKIN_DEBUG_MODE) console.log('Found appearance tab with data-tab-id selector');
      return tab;
    }
    
    // Fallback: look for tab with text containing 'Appearance'
    const allTabs = document.querySelectorAll('.tab, [class*="tab"]');
    for (const t of allTabs) {
      if (/^appearance$/i.test(t.textContent.trim())) {
        if (SKIN_DEBUG_MODE) console.log('Found appearance tab by text content');
        return t;
      }
    }
    
    if (SKIN_DEBUG_MODE) console.warn('Could not find appearance tab');
    return null;
  }

  // Find the main Shop button in the UI
  _findShopButton() {
    // Look for shop button by ID or class
    const candidates = [
      '#shopBtn',
      '#shop-btn',
      '.shop-button',
      '[onclick*="shop"]',
      'button[id*="shop"]'
    ];
    
    for (const selector of candidates) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          if (SKIN_DEBUG_MODE) console.log(`Found shop button with selector: ${selector}`);
          return el;
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }
    
    // Fallback: look for button with text containing 'Shop'
    const allButtons = document.querySelectorAll('button, [role="button"], .btn');
    for (const btn of allButtons) {
      if (/shop/i.test(btn.textContent) || /shop/i.test(btn.id) || /shop/i.test(btn.className)) {
        if (SKIN_DEBUG_MODE) console.log('Found shop button by text/id/class');
        return btn;
      }
    }
    
    if (SKIN_DEBUG_MODE) console.warn('Could not find shop button');
    return null;
  }

  // Render notification badges on tabs
  _renderBadges() {
    try {
      const newSkins = this._getNewSkins();
      const count = newSkins.length;

      if (SKIN_DEBUG_MODE) console.log(`Rendering ${count} skin notification badges`, newSkins);

      // Badge on Appearance tab (where skins are displayed)
      const appearanceTab = this._findAppearanceTab();
      if (appearanceTab) {
        this._updateBadge(appearanceTab, count);
        if (SKIN_DEBUG_MODE) console.log('✓ Badge updated on Appearance tab');
      } else {
        if (SKIN_DEBUG_MODE) console.warn('Could not find appearance tab for badge');
        // Try again in a moment
        setTimeout(() => {
          const tab = this._findAppearanceTab();
          if (tab) {
            this._updateBadge(tab, count);
            if (SKIN_DEBUG_MODE) console.log('✓ Badge updated on Appearance tab (retry)');
          }
        }, 1000);
      }

      // Badge on main Shop button in UI
      const shopButton = this._findShopButton();
      if (shopButton) {
        this._updateShopButtonBadge(shopButton, count);
        if (SKIN_DEBUG_MODE) console.log('✓ Badge updated on Shop button');
      } else {
        if (SKIN_DEBUG_MODE) console.warn('Could not find shop button for badge');
        // Try again in a moment
        setTimeout(() => {
          const btn = this._findShopButton();
          if (btn) {
            this._updateShopButtonBadge(btn, count);
            if (SKIN_DEBUG_MODE) console.log('✓ Badge updated on Shop button (retry)');
          }
        }, 1000);
      }
      
      // Highlight skin buttons with notifications
      this._highlightNewSkinButtons(newSkins);
    } catch (e) {
      if (SKIN_DEBUG_MODE) console.warn('Failed to render skin badges:', e);
    }
  }

  // Add glow effect to skin buttons that have notifications
  _highlightNewSkinButtons(newSkins) {
    if (SKIN_DEBUG_MODE) console.log('🔍 Highlighting new skin buttons. New skins:', newSkins);
    
    // Remove has-notification class from all skin buttons first
    document.querySelectorAll('.skin-selection-button.has-notification').forEach(btn => {
      btn.classList.remove('has-notification');
    });
    
    // Debug: Log all available skin buttons (only those with skin-selection-button class)
    const allSkinButtons = document.querySelectorAll('.skin-selection-button[data-skin]');
    if (SKIN_DEBUG_MODE) console.log('📋 Available skin buttons:', Array.from(allSkinButtons).map(b => b.dataset.skin));
    
    // Add has-notification class to buttons for new skins (ONLY skin-selection-button elements)
    if (newSkins && newSkins.length > 0) {
      newSkins.forEach(skinId => {
        // Important: Only select elements that have BOTH the skin-selection-button class AND data-skin attribute
        const skinButton = document.querySelector(`.skin-selection-button[data-skin="${skinId}"]`);
        if (skinButton) {
          skinButton.classList.add('has-notification');
          if (SKIN_DEBUG_MODE) console.log(`✨ Added notification glow to skin button: ${skinId}`);
        } else {
          if (SKIN_DEBUG_MODE) console.warn(`⚠️ Could not find skin button for: ${skinId}`);
        }
      });
    }
  }

  // Update or create badge on the main shop button (matches challenge badge style)
  _updateShopButtonBadge(shopButton, count) {
    // Use a unique ID for skin badges on the shop button
    let badge = document.getElementById('shop-skin-badge');
    
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'shop-skin-badge';
      badge.style.position = 'absolute';
      badge.style.top = '50%';
      badge.style.left = '0';
      badge.style.transform = 'translate(-50%, -50%)';
      badge.style.minWidth = '18px';
      badge.style.height = '18px';
      badge.style.padding = '0 6px';
      badge.style.background = '#ffcc00';
      badge.style.color = '#000';
      badge.style.borderRadius = '12px';
      badge.style.fontWeight = '700';
      badge.style.fontSize = '12px';
      badge.style.display = 'flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.boxShadow = '0 0 6px rgba(255,204,0,0.6)';
      badge.style.zIndex = '1003';
      badge.setAttribute('data-badge-type', 'skin');
      
      // Ensure shop button can anchor the badge
      if (!shopButton.style.position || shopButton.style.position === 'static') {
        shopButton.style.position = 'relative';
      }
      
      shopButton.appendChild(badge);
    }
    
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Update or create badge on a tab element
  _updateBadge(tabElement, count) {
    let badge = tabElement.querySelector('.skin-notification-badge');
    
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'skin-notification-badge';
      badge.setAttribute('aria-label', 'New skins available');
      tabElement.style.position = tabElement.style.position || 'relative';
      tabElement.appendChild(badge);
    }
    
    if (count > 0) {
      badge.textContent = String(count);
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Set up click listeners on skin buttons
  _setupClickListeners() {
    // Listen for clicks on any element with data-skin attribute
    document.addEventListener('click', (e) => {
      try {
        const skinButton = e.target.closest('[data-skin]');
        if (!skinButton) return;
        
        const skinId = skinButton.dataset.skin;
        if (!skinId || skinId === 'none') return;
        
        const newSkins = this._getNewSkins();
        if (newSkins.includes(skinId)) {
          this.clearNewSkin(skinId);
          // Remove the glow class immediately
          skinButton.classList.remove('has-notification');
          if (SKIN_DEBUG_MODE) console.log(`✓ Removed notification glow from clicked skin: ${skinId}`);
        }
      } catch (err) {
        // Ignore
      }
    }, true); // Use capture phase to catch early
  }

  // Inject CSS styles for badges
  _injectBadgeStyle() {
    if (document.getElementById('skin-notification-badge-style')) return;
    
    const style = document.createElement('style');
    style.id = 'skin-notification-badge-style';
    style.innerHTML = `
      .skin-notification-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        right: 6px;
        top: 6px;
        min-width: 18px;
        height: 18px;
        padding: 0 6px;
        background: #ffcc00;
        color: #000;
        font-weight: 700;
        font-size: 12px;
        border-radius: 999px;
        box-shadow: 0 0 6px rgba(255,204,0,0.6);
        line-height: 18px;
        z-index: 10060;
        pointer-events: none;
      }
      
      /* Yellow glow for new SHIP SKIN buttons ONLY (not avatars) */
      button.skin-selection-button.has-notification,
      .skin-selection-button.has-notification {
        border: 2px solid #ffcc00 !important;
        box-shadow: 
          0 0 15px rgba(255, 204, 0, 0.8),
          0 0 30px rgba(255, 204, 0, 0.5),
          0 0 45px rgba(255, 204, 0, 0.3),
          inset 0 0 15px rgba(255, 204, 0, 0.2) !important;
        animation: skin-notification-pulse 1.5s ease-in-out infinite;
        position: relative;
      }
      
      /* Ensure avatar-option elements NEVER get the notification glow */
      .avatar-option.has-notification {
        border: inherit !important;
        box-shadow: none !important;
        animation: none !important;
      }
      
      @keyframes skin-notification-pulse {
        0%, 100% {
          box-shadow: 
            0 0 15px rgba(255, 204, 0, 0.8),
            0 0 30px rgba(255, 204, 0, 0.5),
            0 0 45px rgba(255, 204, 0, 0.3),
            inset 0 0 15px rgba(255, 204, 0, 0.2);
        }
        50% {
          box-shadow: 
            0 0 20px rgba(255, 204, 0, 1),
            0 0 40px rgba(255, 204, 0, 0.7),
            0 0 60px rgba(255, 204, 0, 0.5),
            inset 0 0 20px rgba(255, 204, 0, 0.3);
        }
      }
      
      /* If a skin is both selected and has notification, prioritize notification glow */
      .skin-selection-button.has-notification {
        border: 3px solid #ffcc00 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Create global instance and expose helper function
window.shipSkinNotifications = new ShipSkinNotificationManager();

// Global helper function to notify about new skins
window.notifyNewShipSkin = (skinId) => {
  if (window.shipSkinNotifications) {
    window.shipSkinNotifications.addNewSkin(skinId);
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.shipSkinNotifications.initialize();
  });
} else {
  window.shipSkinNotifications.initialize();
}
