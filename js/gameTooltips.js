// Game Tooltips System
// Displays helpful tips to players via the chat UI (client-side only)

export class GameTooltips {
  constructor(chat) {
    this.chat = chat;
    this.tips = [
      // Combat Tips
      "💡 TIP: Use Impact Deflector (Ctrl/Tab) to bounce asteroids away without taking damage!",
      "💡 TIP: The Impact Deflector has a cooldown - use it strategically!",
      "💡 TIP: Dreadnaughts require teamwork! Coordinate with other players to take them down.",
      "💡 TIP: Each weapon has different damage and fire rates. Experiment to find your favorite!",
      "💡 TIP: Alien scouts are fast - lead your shots to hit them!",
      
      // Movement & Controls
      "💡 TIP: Hold Shift for Afterburner - great for dodging or chasing enemies!",
      "💡 TIP: Use Q and E to quickly switch between weapons during combat.",
      "💡 TIP: Press number keys (0-9) to directly select a specific weapon.",
      "💡 TIP: Afterburner consumes fuel - watch your fuel gauge!",
      "💡 TIP: Disengage your weapons to speed energy recharge!",
      
      // Economy & Progression
      "💡 TIP: Press B to open the shop and upgrade your ship with credits.",
      "💡 TIP: Destroying asteroids and NPCs earns you credits for upgrades.",
      "💡 TIP: Collect powerups dropped by destroyed asteroids and enemies!",
      "💡 TIP: Gems are rare! Use them wisely in the Premium Store.",
      "💡 TIP: Complete daily and weekly challenges for bonus rewards!",
      
      // Strategy
      "💡 TIP: Stay mobile! A moving target is harder to hit.",
      "💡 TIP: Don't fly into the center of asteroid fields - navigate around them!",
      "💡 TIP: Watch your shield! Find a safe spot to let it regenerate.",
      "💡 TIP: Upgraded weapons deal more damage - invest in your arsenal!",
      "💡 TIP: Some weapons are better against shields, others against hull.",
      
      // Multiplayer
      "💡 TIP: Press T to open chat and communicate with other players.",
      "💡 TIP: Team up with other players to take down tough NPCs!",
      "💡 TIP: Respawn is free, but you'll lose your current powerups.",
      "💡 TIP: Check the leaderboard (P) to see how you rank against other pilots!",
      
      // NPC Combat
      "💡 TIP: Dreadnaughts reward ALL players who damage them - join the fight!",
      "💡 TIP: Alien scouts drop valuable loot - prioritize them when spotted!",
      "💡 TIP: NPCs become more challenging as more players join - adapt your strategy!",
      "💡 TIP: Watch for the Dreadnaught's attack patterns and dodge accordingly.",
      
      // Ship Management
      "💡 TIP: Different ship types have unique stats - experiment in the shop!",
      "💡 TIP: Shield upgrades increase your survivability in tough battles.",
      "💡 TIP: Speed upgrades help you dodge projectiles and reposition quickly.",
      "💡 TIP: Damage upgrades make all your weapons hit harder!",
    ];
    
    this.shownTips = new Set();
    this.tipInterval = null;
    this.minInterval = 90000; // Minimum 90 seconds between tips
    this.maxInterval = 180000; // Maximum 3 minutes between tips
    this.enabled = true;
    
    // Load shown tips from localStorage
    this.loadShownTips();
  }
  
  // Start showing random tips
  start() {
    if (!this.enabled) return;
    
    // Show first tip after 30 seconds of gameplay
    setTimeout(() => {
      this.showRandomTip();
    }, 30000);
    
    // Then show tips at random intervals
    this.scheduleNextTip();
  }
  
  // Stop showing tips
  stop() {
    if (this.tipInterval) {
      clearTimeout(this.tipInterval);
      this.tipInterval = null;
    }
  }
  
  // Schedule the next tip at a random interval
  scheduleNextTip() {
    if (!this.enabled) return;
    
    const delay = Math.random() * (this.maxInterval - this.minInterval) + this.minInterval;
    
    this.tipInterval = setTimeout(() => {
      this.showRandomTip();
      this.scheduleNextTip(); // Schedule next one
    }, delay);
  }
  
  // Show a random tip that hasn't been shown yet (or reset if all shown)
  showRandomTip() {
    if (!this.chat || !this.enabled) return;
    
    // If all tips have been shown, reset the set
    if (this.shownTips.size >= this.tips.length) {
      this.shownTips.clear();
      this.saveShownTips();
    }
    
    // Get unshown tips
    const unshownTips = this.tips.filter((tip, index) => !this.shownTips.has(index));
    
    if (unshownTips.length === 0) return;
    
    // Pick a random unshown tip
    const randomTip = unshownTips[Math.floor(Math.random() * unshownTips.length)];
    const tipIndex = this.tips.indexOf(randomTip);
    
    // Mark as shown
    this.shownTips.add(tipIndex);
    this.saveShownTips();
    
    // Display in chat as system message
    this.displayTip(randomTip);
  }
  
  // Display tip in chat UI (client-side only, not sent to server)
  displayTip(message) {
    if (!this.chat) return;
    
    // Use the chat's local display method (doesn't broadcast to server)
    if (typeof this.chat.displayLocalMessage === 'function') {
      this.chat.displayLocalMessage(message, 'system');
    } else {
      // Fallback: create chat message element directly
      const messagesDiv = document.getElementById('chat-messages');
      if (messagesDiv) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message system-message';
        messageDiv.style.color = '#ffeb3b';
        messageDiv.style.fontStyle = 'italic';
        messageDiv.textContent = message;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Limit message history
        while (messagesDiv.children.length > 50) {
          messagesDiv.removeChild(messagesDiv.firstChild);
        }
      }
    }
  }
  
  // Force show a specific tip (useful for context-sensitive tips)
  showTip(message) {
    if (!this.enabled) return;
    this.displayTip(`💡 TIP: ${message}`);
  }
  
  // Load shown tips from localStorage
  loadShownTips() {
    try {
      const stored = localStorage.getItem('gameTooltips_shown');
      if (stored) {
        const array = JSON.parse(stored);
        this.shownTips = new Set(array);
      }
    } catch (e) {
      console.warn('Failed to load shown tips:', e);
    }
  }
  
  // Save shown tips to localStorage
  saveShownTips() {
    try {
      localStorage.setItem('gameTooltips_shown', JSON.stringify([...this.shownTips]));
    } catch (e) {
      console.warn('Failed to save shown tips:', e);
    }
  }
  
  // Enable/disable tips
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    } else {
      this.start();
    }
  }
  
  // Reset all shown tips (show them all again)
  reset() {
    this.shownTips.clear();
    this.saveShownTips();
  }
}

export default GameTooltips;
