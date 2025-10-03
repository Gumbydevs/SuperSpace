// Tutorial System for SuperSpace
// Provides comprehensive onboarding experience with Marvin the robot

import { MarvinAssistant } from './marvin.js';

export class TutorialSystem {
  constructor(game) {
    this.game = game;
    this.player = game.player;
    this.isActive = false;
    this.currentStep = 0;
    this.tutorialSteps = [];
    this.completedTutorial = this.getCompletedStatus();
    this.tutorialEnabled = this.getTutorialEnabledStatus();
    this.notificationQueue = [];
    this.isShowingNotification = false;
    this.hasEnteredWorld = false; // Track if player has entered the world
    this.playerStartPosition = null; // Track starting position for movement detection
    this.hasPlayerMoved = false; // Track if player has moved significantly
    this.lastWeapon = null; // Track weapon changes
    this.tutorialStarted = false; // Prevent double-starting
    this.stopHoldStart = null; // Track when player starts holding stop key
  this.wasInSafeZone = null; // Track player's safe zone status for leave_safe_zone step
    // Analytics/timing fields
    this._tutorialStartTs = null; // ms
    this._currentStepStartTs = null; // ms - when current step was shown
    this._stepDurations = {}; // stepId -> seconds
    
    // Create tutorial UI elements
    this.createTutorialUI();
    this.initializeTutorialSteps();
    
    // Listen for game events to trigger tutorial steps
    this.setupEventListeners();
    
    // Don't start tutorial immediately - wait for world entry
  }

  getCompletedStatus() {
    return localStorage.getItem('tutorialCompleted') === 'true';
  }

  getTutorialEnabledStatus() {
    const stored = localStorage.getItem('tutorialEnabled');
    return stored !== 'false'; // Default to enabled
  }

  markTutorialCompleted() {
    localStorage.setItem('tutorialCompleted', 'true');
    this.completedTutorial = true;
  }

  initializeTutorialSteps() {
    this.tutorialSteps = [
      {
        id: 'welcome',
        title: 'Welcome to SuperSpace! 🚀',
        message: "Greetings, pilot! Welcome to SuperSpace! I'm Marvin, your robotic assistant.  This is a persistent multiplayer space deathmatch game with RPG elements where everyone fights in ONE shared galaxy!",
        trigger: 'auto',
        reward: null,
        rewardText: "You will be rewarded after completing the tutorial! 🎁",
        action: null
      },
      {
        id: 'world_explanation',
        title: 'One Galaxy, Endless Battles',
        message: "This is ONE persistent world shared by ALL players globally! Other ships that you see are real players. Your actions affect the entire galaxy. Every asteroid mined, every battle fought!",
        trigger: 'auto',
        reward: null,
        rewardText: "Keep going to earn your rewards! 🎯",
        action: null
      },
      {
        id: 'basic_movement',
        title: 'Master Your Ship Controls',
        message: "Move your ship forward! Press W or Arrow Up to thrust. The Arrow Keys or WSAD will help you navigate. Try moving now! Your ship has realistic momentum so plan your maneuvers carefully in combat.",
        trigger: 'auto',
        reward: null,
        rewardText: "Give it a little thrust! ⭐",
        action: 'movement'
      },
      {
        id: 'stopping',
        title: 'Learn to Stop! 🛑',
        message: "Your ship has momentum and won't stop immediately! Hold S or DOWN arrow for 1 second to brake and come to a full stop. On mobile/iPad, hold the red STOP button (🛑). Mastering stopping is crucial for precise movement!",
        trigger: 'auto',
        reward: null,
        rewardText: "You're getting the hang of it! 🎯",
        action: 'stop_ship'
      },
      {
        id: 'weapon_selection',
        title: 'Engage Your Weapons! ⚡',
        message: "Your weapons can be DISENGAGED. When weapons are DISENGAGED energy recharges faster. Press Q and E to cycle through and ACTIVATE your weapons, or press numbers 1-8 to select directly. You must engage a weapon before you can shoot!",
        trigger: 'auto',
        reward: null,
        rewardText: "Rewards coming! 🏆",
        action: 'change_weapon'
      },
      {
        id: 'shooting',
        title: 'Fire Your Weapons! 🔫',
        message: "Perfect! Now make sure your weapons are engaged and fire! Press SPACEBAR to shoot (or tap the FIRE button on mobile/iPad). Try firing once to test your weapon.",
        trigger: 'auto',
        reward: null,
        rewardText: "Next let's find some targets! ✨",
        action: 'shoot'
      },
      {
        id: 'safe_zone_info',
        title: 'Safe Zones for Shopping',
        message: "The Safe Zone is a protected area. You can't attack or be attacked here, allowing you to shop safely without fear of other players. Perfect for upgrading between battles!",
        trigger: 'auto',
        reward: null,
        action: null
      },
      {
        id: 'leave_safe_zone',
        title: 'Leave the Safe Zone',
        message: "Fly out of the checkerboard safe zone and into open space. Outside the safe zone you can mine asteroids and earn credits. Leave the checkerboard area to continue.",
        trigger: 'auto',
        reward: null,
        rewardText: "Little bird is leaving the nest! 🐦",
        action: 'leave_safe_zone'
      },
      {
        id: 'asteroids_mining',
        title: 'Mine for Credits & Gems',
        message: "See those gray rocks? Shoot asteroids to mine them for credits. Destroy one completely to continue. Mining is how you earn resources, but watch out - other players can attack while you're distracted!",
        trigger: 'auto',
        reward: null,
        rewardText: "You're learning fast! Keep going! 💪",
        action: 'mine_asteroid'
      },
      {
        id: 'return_to_safe_zone',
        title: 'Return to the Safe Zone',
        message: "Head back to the Safe Zone. Use the minimap or head toward center of the asteroid field.",
        trigger: 'auto',
        reward: null,
        rewardText: "Safe and sound — great mining run!",
        action: 'return_to_safe_zone'
      },
      {
        id: 'npcs_and_players',
        title: 'Combat Targets',
        message: "Alien NPCs and Boss ships can appear to attack you. Other ships are real players, killing them grants credits, gems, and leaderboard points!",
        trigger: 'auto',
        reward: null,
        action: null
      },
      
      {
        id: 'shop_introduction',
        title: 'Upgrade Your Arsenal',
        message: "Press B or click the Shop button to open the shop! Here you can spend credits to buy better weapons, shields, and ship upgrades. Each weapon has unique damage and abilities!",
        trigger: 'auto',
        reward: null,
        action: 'open_shop'
      },
      
      {
        id: 'challenges_missions',
        title: 'Daily & Weekly Challenges',
        message: "Check the shop for Daily and Weekly Challenges! Daily challenges reset every day and give quick credits/gems, while weekly challenges reward bigger bonuses and longer-term goals. Complete them for bonus credits, gems, and special rewards.",
        trigger: 'auto',
        reward: null,
        rewardText: "Complete Daily & Weekly Challenges to earn bonus credits, gems, and special rewards! 🏆",
        action: null
      },
      {
        id: 'skill_system',
        title: 'Unlock Skills & Abilities 🌟',
        message: "The Skills Tab provides access to powerful abilities that last for the current session. Each time you respawn or rejoin, you'll earn skills again with credits earned from mining and combat.",
        trigger: 'auto',
        reward: null,
        rewardText: "Choose wisely for each run! ⚡",
        action: null
      },
      {
        id: 'health_system',
        title: 'Survival Mechanics',
        message: "Watch your health bar! Taking damage from enemies or asteroid collisions will hurt you. If it reaches zero, you'll respawn but lose some credits!",
        trigger: 'auto',
        reward: null,
        rewardText: "Combat training complete! Time for your rewards! 🏅",
        action: null
      },
      {
        id: 'progression_systems',
        title: 'Endless Progression',
        message: "Earn achievements, complete challenges, unlock ship skins, and dominate the leaderboard! Check your profile (P key) to track your progress and compare stats with other players.",
        trigger: 'auto',
        reward: null,
        rewardText: "Progression system mastered! One more step! 🌟",
        action: null
      },
      {
        id: 'final_encouragement',
        title: 'Tutorial Complete! 🎉',
        message: "Congratulations, pilot! You're now ready to conquer SuperSpace. Remember: mine resources, upgrade gear, and blast enemies to climb the leaderboard. Good luck out there!",
        trigger: 'auto',
        reward: { credits: 500, gems: 25 },
        action: null
      }
    ];
  }

  createTutorialUI() {
    // Create tutorial notification container
    const container = document.createElement('div');
    container.id = 'tutorial-notifications';
    // Desktop-first: keep notifications centered and fixed near the top
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 3000;
      pointer-events: none;
      font-family: 'Orbitron', Arial, sans-serif;
      box-sizing: border-box;
    `;
    document.body.appendChild(container);

    // Add tutorial-specific styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes tutorialSlideIn {
        0% { 
          transform: translateY(-20px); 
          opacity: 0; 
        }
        100% { 
          transform: translateY(0); 
          opacity: 1; 
        }
      }
      
      @keyframes tutorialSlideOut {
        0% { 
          transform: translateY(0); 
          opacity: 1; 
        }
        100% { 
          transform: translateY(20px); 
          opacity: 0; 
        }
      }

      .tutorial-notification {
        background: linear-gradient(135deg, rgba(70, 130, 180, 0.95), rgba(100, 149, 237, 0.95));
        color: white;
        padding: 20px 25px 35px 25px;
        border-radius: 12px;
        margin-bottom: 15px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.1);
        max-width: 400px;
        position: relative;
        animation: tutorialSlideIn 0.6s ease-out;
        backdrop-filter: blur(10px);
        padding-right: 80px;
        pointer-events: auto;
        cursor: pointer;
      }

      .tutorial-notification.action-required {
        border: 2px solid rgba(255, 215, 0, 0.6);
        background: linear-gradient(135deg, rgba(70, 130, 180, 0.95), rgba(138, 43, 226, 0.85));
      }

      .tutorial-notification:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
      }

      .tutorial-notification.removing {
        animation: tutorialSlideOut 0.4s ease-in forwards;
      }

      .tutorial-title {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 8px;
        color: #FFD700;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      }

      .tutorial-message {
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: 10px;
        color: rgba(255, 255, 255, 0.95);
      }

      .tutorial-reward {
        font-size: 12px;
        color: #90EE90;
        font-weight: bold;
        margin-top: 8px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      }

      .tutorial-progress {
        position: absolute;
        bottom: 8px;
        right: 15px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
      }

      .tutorial-skip-btn {
        position: absolute;
        top: 8px;
        right: 12px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        transition: background 0.2s;
        pointer-events: auto;
      }

      .tutorial-skip-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .tutorial-continue-hint {
        position: absolute;
        bottom: 8px;
        left: 15px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        font-style: italic;
      }

      .tutorial-action-hint {
        position: absolute;
        bottom: 8px;
        left: 15px;
        font-size: 11px;
        color: rgba(255, 215, 0, 0.9);
        font-weight: bold;
      }
      /* Mobile / small-screen adjustments: make notifications full-width and respect safe areas */
      @media (max-width: 640px) {
        #tutorial-notifications {
          left: 0;
          transform: none;
          width: 100%;
          top: env(safe-area-inset-top, 20px);
          padding-left: max(8px, env(safe-area-inset-left, 8px));
          padding-right: max(8px, env(safe-area-inset-right, 8px));
        }
        .tutorial-notification {
          width: calc(100% - 32px);
          max-width: none;
          padding: 12px 14px 20px 14px;
          padding-right: 48px;
        }
        .tutorial-skip-btn {
          width: 36px;
          height: 36px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    // Listen for various game events
    document.addEventListener('keydown', (e) => {
      if (this.isActive) {
        this.handleKeyPress(e.code); // Use e.code instead of e.key
      }
    });

    // Listen for key releases to reset stop timer
    document.addEventListener('keyup', (e) => {
      if (this.isActive) {
        this.handleKeyRelease(e.code);
      }
    });

    // Listen for mouse clicks for shooting
    this.game.canvas.addEventListener('click', () => {
      if (this.isActive) {
        // Only count as shooting if a weapon is actually engaged
        if (this.canPlayerShoot()) {
          this.checkStepProgress('shoot');
        } else {
          // console.log('🎯 Tutorial: Click ignored - no weapon engaged'); // Production: disabled
        }
      }
    });
  }

  // Helper to determine if the player can actually shoot (weapon engaged)
  canPlayerShoot() {
    try {
      if (!this.player) return false;
      // Weapons are represented by name; default disengaged state is 'Disengaged'
      const cur = this.player.currentWeapon || this.player.currentWeaponId || '';
      if (typeof cur === 'string' && cur.toLowerCase() === 'disengaged') return false;
      // If weapon exists and is not disengaged, allow shooting progression
      return true;
    } catch (e) {
      return false;
    }
  }

  handleKeyRelease(key) {
    const currentStepData = this.tutorialSteps[this.currentStep];
    if (!currentStepData) return;
    
    // Stop detection is now handled in checkStopping() method which checks input state
    // This allows both keyboard and mobile brake button to work properly
  }

  handleKeyPress(key) {
    // console.log(`🎮 Tutorial: Key pressed: ${key}`); // Production: disabled
    
    const currentStepData = this.tutorialSteps[this.currentStep];
    if (!currentStepData) return;
    
    // Only handle keys relevant to the current step
    switch (currentStepData.action) {
      case 'movement':
        if (['KeyW', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(key)) {
          // console.log('🎮 Tutorial: Movement key detected'); // Production: disabled
          this.checkStepProgress('movement');
        }
        break;
        
      case 'stop_ship':
        // Stop detection is now handled in checkStopping() method which checks input state
        // This allows both keyboard and mobile brake button to work
        break;
        
      case 'change_weapon':
        if (['KeyQ', 'KeyE', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'].includes(key)) {
          // console.log('🎮 Tutorial: Weapon change key detected'); // Production: disabled
          this.checkStepProgress('change_weapon');
        }
        break;
        
      case 'shoot':
        // Shooting detection is now handled in checkShooting() method which checks input state
        // This allows both keyboard and mobile fire button to work
        break;
        
      // Other actions handled by callbacks, not key presses
    }
  }

  // Called when player enters the game world and is connected
  onWorldEntered() {
    this.hasEnteredWorld = true;
    
    // Record player starting position for movement detection
    if (this.player) {
      this.playerStartPosition = { x: this.player.x, y: this.player.y };
      this.lastWeapon = this.player.currentWeapon; // Initialize weapon tracking
      // Initialize safe zone state
      if (window.game && window.game.world && typeof window.game.world.isInSafeZone === 'function') {
        this.wasInSafeZone = window.game.world.isInSafeZone(this.player);
      } else {
        this.wasInSafeZone = false;
      }
    }
    
    // Start tutorial if it's a new player and tutorial is enabled
    if (!this.completedTutorial && this.tutorialEnabled) {
      setTimeout(() => this.startTutorial(), 3000); // Start after 3 seconds to let things settle
    }
  }

  // Alternative method for when game starts in single-player mode
  onGameStarted() {
    // If we're playing but haven't entered "world" via multiplayer, treat game start as world entry
    if (this.game.gameState === 'playing' && !this.hasEnteredWorld) {
      this.onWorldEntered();
    }
  }

  // Called from game update loop to check for step completion
  update() {
    if (!this.isActive) return;
    
    const currentStepData = this.tutorialSteps[this.currentStep];
    if (!currentStepData) return;
    
    // Only check for the current step's specific action
    switch (currentStepData.action) {
      case 'movement':
        this.checkMovement();
        break;
      case 'stop_ship':
        this.checkStopping();
        break;
      case 'change_weapon':
        this.checkWeaponChange();
        break;
      case 'shoot':
        this.checkShooting();
        break;
      case 'leave_safe_zone':
        this.checkLeaveSafeZone();
        break;
      case 'return_to_safe_zone':
        this.checkReturnToSafeZone();
        break;
      case 'mine_asteroid':
        // Handled by callback from world.js
        break;
      case 'open_shop':
        // Handled by callback from shop.js
        break;
      case 'safe_zone_shop':
        // Handled by callback from shop.js
        break;
      case 'buy_weapon':
        // Handled by callback from shop.js
        break;
      case 'take_damage':
        // Handled by callback from player.js
        break;
      // null action steps are info-only and advance by click
    }
  }

  checkMovement() {
    if (!this.player) {
      // console.log('🔍 Tutorial: checkMovement - no player object yet'); // Production: disabled
      return;
    }
    
    // Don't check movement if we're not currently showing a notification
    if (!this.isShowingNotification) {
      return;
    }
    
    // Only check if current step is the movement step
    const currentStepData = this.tutorialSteps[this.currentStep];
    if (!currentStepData || currentStepData.action !== 'movement') {
      return;
    }
    
    if (!this.playerStartPosition) {
      // console.log('🔍 Tutorial: checkMovement - no playerStartPosition set, capturing now'); // Production: disabled
      // Capture it now if it wasn't set
      this.playerStartPosition = { x: this.player.x, y: this.player.y };
      return;
    }

    if (!this.hasPlayerMoved) {
      const dx = this.player.x - this.playerStartPosition.x;
      const dy = this.player.y - this.playerStartPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Log less frequently to avoid spam - only every 60 frames (about 1 second)
      // if (this.game.frameCount % 60 === 0) { // Production: disabled
      //   console.log(`🔍 Tutorial: checkMovement - start(${this.playerStartPosition.x.toFixed(1)},${this.playerStartPosition.y.toFixed(1)}) current(${this.player.x.toFixed(1)},${this.player.y.toFixed(1)}) distance=${distance.toFixed(1)}`);
      // }
      
      if (distance > 30) {
        // console.log('📚 Tutorial: Player movement detected! Distance: ' + distance.toFixed(1)); // Production: disabled
        this.hasPlayerMoved = true;
        this.checkStepProgress('movement');
      }
    }
  }

  checkStopping() {
    // Don't check if we're not showing a notification
    if (!this.isShowingNotification) {
      return;
    }
    
    // Only check if current step is the stopping step
    const currentStepData = this.tutorialSteps[this.currentStep];
    if (!currentStepData || currentStepData.action !== 'stop_ship') {
      return;
    }
    
    // Check if stop/brake is currently being held (keyboard OR mobile button)
    const isStopPressed = this.game.input.keys.includes('KeyS') || 
                         this.game.input.keys.includes('ArrowDown');
    
    if (isStopPressed) {
      if (!this.stopHoldStart) {
        this.stopHoldStart = Date.now();
        // console.log('🛑 Tutorial: Stop detected (keyboard or mobile) - starting timer'); // Production: disabled
      }
      
      const holdTime = Date.now() - this.stopHoldStart;
      // console.log(`🛑 Tutorial: Holding stop for ${(holdTime/1000).toFixed(1)}s (need 1.0s)`); // Production: disabled
      
      if (holdTime >= 1000) {
        // console.log('📚 Tutorial: Stop held for 1 second - advancing!'); // Production: disabled
        this.checkStepProgress('stop_ship');
        this.stopHoldStart = null;
      }
    } else {
      // Reset timer if stop is not pressed
      this.stopHoldStart = null;
    }
  }

  checkLeaveSafeZone() {
    // Don't check if we're not showing a notification
    if (!this.isShowingNotification) {
      return;
    }
    
    if (!this.player || !window.game || !window.game.world) return;
    const currentlyInSafe = window.game.world.isInSafeZone(this.player);

    // If player is already outside the safe zone, auto-complete the step.
    // This covers cases where wasInSafeZone was set earlier and would otherwise prevent auto-completion.
    if (!currentlyInSafe) {
      // console.log('📚 Tutorial: Player already outside safe zone - auto-completing step'); // Production: disabled
      // mark state and advance after a short delay to allow the notification to render
      this.wasInSafeZone = false;
      setTimeout(() => {
        this.checkStepProgress('leave_safe_zone');
      }, 300);
      return;
    }

    // Initialize state on first check (player is inside safe zone now)
    if (this.wasInSafeZone === null) {
      this.wasInSafeZone = true;
    }

    // Normal check: if we were in the safe zone and now we are not, requirement is met
    if (this.wasInSafeZone && !currentlyInSafe) {
      // console.log('📚 Tutorial: Player left safe zone - advancing step'); // Production: disabled
      this.checkStepProgress('leave_safe_zone');
      this.wasInSafeZone = false;
    }
  }

  checkReturnToSafeZone() {
    // Don't check if we're not showing a notification
    if (!this.isShowingNotification) {
      return;
    }
    
    if (!this.player || !window.game || !window.game.world) return;
    const currentlyInSafe = window.game.world.isInSafeZone(this.player);
    // Track if we've been outside the safe zone (to prevent immediate completion)
    if (this.wasInSafeZone === null) {
      this.wasInSafeZone = currentlyInSafe;
    }
    // If we were outside and now we are back in, requirement is met
    if (this.wasInSafeZone === false && currentlyInSafe) {
      // console.log('📚 Tutorial: Player returned to safe zone - advancing step'); // Production: disabled
      this.checkStepProgress('return_to_safe_zone');
      // update state
      this.wasInSafeZone = true;
    } else if (!currentlyInSafe) {
      // Track that we've left (so we can detect return)
      this.wasInSafeZone = false;
    }
  }

  checkWeaponChange() {
    // Don't check if we're not showing a notification
    if (!this.isShowingNotification) {
      return;
    }
    
    // Only check if current step is the weapon change step
    const currentStepData = this.tutorialSteps[this.currentStep];
    if (!currentStepData || currentStepData.action !== 'change_weapon') {
      return;
    }
    
    if (this.player.currentWeapon !== this.lastWeapon) {
      if (this.lastWeapon !== null) {
        // console.log(`🔧 Tutorial: Weapon changed from ${this.lastWeapon} to ${this.player.currentWeapon}`); // Production: disabled
        this.checkStepProgress('change_weapon');
      }
      this.lastWeapon = this.player.currentWeapon;
    }
  }

  checkShooting() {
    // Don't check if we're not showing a notification
    if (!this.isShowingNotification) {
      return;
    }
    
    // Only check if current step is the shooting step
    const currentStepData = this.tutorialSteps[this.currentStep];
    if (!currentStepData || currentStepData.action !== 'shoot') {
      return;
    }
    
    // Check if fire button is currently being pressed (keyboard OR mobile button)
    const isFirePressed = this.game.input.keys.includes('Space');
    
    if (isFirePressed && this.canPlayerShoot()) {
      // console.log('🎯 Tutorial: Fire detected (keyboard or mobile) - advancing!'); // Production: disabled
      this.checkStepProgress('shoot');
    }
  }

  startTutorial() {
    if (this.tutorialStarted) {
      // console.log('🎓 Tutorial already started, ignoring duplicate start request'); // Production: disabled
      return;
    }
    
    if (this.completedTutorial && !this.getTutorialEnabledStatus()) {
      return; // Don't start if completed and tutorial is disabled
    }

    if (!this.hasEnteredWorld) {
      // console.log('🎓 Tutorial waiting for world entry...'); // Production: disabled
      return; // Don't start until player has entered the world
    }

    this.isActive = true;
    this.currentStep = 0;
    this.hasPlayerMoved = false; // Reset movement tracking
    this.tutorialStarted = true; // Mark as started
    
    // console.log('🎓 Starting SuperSpace tutorial...'); // Production: disabled
    // Start timing
    try {
      this._tutorialStartTs = Date.now();
      this._currentStepStartTs = Date.now();
      this._stepDurations = {};
    } catch (e) {
      console.warn('Tutorial: failed to initialize timing fields', e);
    }
    // Analytics: tutorial start
    try {
      const payload = { playerId: window.game && window.game.multiplayer ? window.game.multiplayer.playerId : null };
      if (window.analytics && typeof window.analytics.track === 'function') {
        window.analytics.track('tutorial_started', payload);
      } else if (window.gameAnalytics && typeof window.gameAnalytics.trackEvent === 'function') {
        window.gameAnalytics.trackEvent('tutorial_started', payload);
      }
    } catch (e) {
      console.warn('Tutorial: failed to send analytics for tutorial_started', e);
    }
    
    // Clear any existing notifications
    const container = document.getElementById('tutorial-notifications');
    if (container) {
      container.innerHTML = '';
    }
    this.isShowingNotification = false;
    this.notificationQueue = [];
    
    // Start with first step
    // Ensure we have a fresh starting position
    if (this.player && this.player.x !== undefined && this.player.y !== undefined) {
      this.playerStartPosition = { x: this.player.x, y: this.player.y };
      console.log(`🔍 Tutorial: startTutorial - captured playerStartPosition (${this.playerStartPosition.x.toFixed(1)}, ${this.playerStartPosition.y.toFixed(1)})`);
    }
    this.showCurrentStep();
  }

  showCurrentStep() {
    if (this.currentStep >= this.tutorialSteps.length) {
      // console.log('📚 Tutorial: All steps completed, finishing tutorial'); // Production: disabled
      this.completeTutorial();
      return;
    }

    const step = this.tutorialSteps[this.currentStep];
    // console.log(`📚 Showing tutorial step ${this.currentStep + 1}: ${step.id} (action: ${step.action})`); // Production: disabled
    // Record step start time and if we're moving from a previous step record its duration
    try {
      const now = Date.now();
      // If we have a previous step start timestamp and a previous step exists, record duration
      if (this._currentStepStartTs != null && this.currentStep > 0) {
        const prevStep = this.tutorialSteps[this.currentStep - 1];
        const durMs = now - this._currentStepStartTs;
        this._stepDurations[prevStep.id] = (durMs / 1000);
        // Emit per-step duration event for previous step
        const durPayload = { stepId: prevStep.id, index: this.currentStep - 1, durationSeconds: Math.round(durMs / 1000) };
        try {
          if (window.analytics && typeof window.analytics.track === 'function') {
            window.analytics.track('tutorial_step_duration', durPayload);
          } else if (window.gameAnalytics && typeof window.gameAnalytics.trackEvent === 'function') {
            window.gameAnalytics.trackEvent('tutorial_step_duration', durPayload);
          }
        } catch (e) {
          console.warn('Tutorial: failed to send analytics for tutorial_step_duration', e);
        }
      }
      this._currentStepStartTs = now;
    } catch (e) {
      console.warn('Tutorial: error recording step start time', e);
    }
    
    // Reset state for specific steps
    if (step.action === 'stop_ship') {
      // console.log('🛑 Tutorial: Resetting stop timer for stopping step'); // Production: disabled
      this.stopHoldStart = null; // Reset timer when showing stopping step
    }
    
    // Reset safe zone tracking for leave_safe_zone step
    if (step.id === 'leave_safe_zone') {
      // console.log('🔍 Tutorial: Resetting safe zone tracking for leave_safe_zone step'); // Production: disabled
      this.wasInSafeZone = null; // Reset to allow fresh check
    }
    
    // Reset movement tracking when STARTING the movement step
    if (step.id === 'basic_movement') {
      this.hasPlayerMoved = false;
      // Capture fresh starting position right when this step shows
      if (this.player && this.player.x !== undefined && this.player.y !== undefined) {
        this.playerStartPosition = { x: this.player.x, y: this.player.y };
        // console.log(`🔍 Tutorial: basic_movement step - reset start position to (${this.playerStartPosition.x.toFixed(1)}, ${this.playerStartPosition.y.toFixed(1)}), hasPlayerMoved=${this.hasPlayerMoved}`); // Production: disabled
      } else {
        console.warn('⚠️ Tutorial: Player position not available when starting movement step!');
      }
    }
    
    // Auto-switch to Challenges tab when showing challenges step
    if (step.id === 'challenges_missions' && this.game.shop) {
      // console.log('📚 Tutorial: Switching to Challenges tab'); // Production: disabled
      this.game.shop.currentTab = 'challenges';
      this.game.shop.updateShopContent();
    }
    
    // Auto-switch to Skills tab when showing skills step
    if (step.id === 'skill_system' && this.game.shop) {
      // console.log('📚 Tutorial: Switching to Skills tab'); // Production: disabled
      this.game.shop.currentTab = 'skills';
      this.game.shop.updateShopContent();
    }
    
    // Show the notification
    this.showTutorialNotification(step);
    // Analytics: step shown
    try {
      const payload = { stepId: step.id, index: this.currentStep, totalSteps: this.tutorialSteps.length };
      if (window.analytics && typeof window.analytics.track === 'function') {
        window.analytics.track('tutorial_step_shown', payload);
      } else if (window.gameAnalytics && typeof window.gameAnalytics.trackEvent === 'function') {
        window.gameAnalytics.trackEvent('tutorial_step_shown', payload);
      }
    } catch (e) {
      console.warn('Tutorial: failed to send analytics for tutorial_step_shown', e);
    }
  }

  checkStepProgress(actionType) {
    if (!this.isActive || this.currentStep >= this.tutorialSteps.length) return;

    const step = this.tutorialSteps[this.currentStep];
    
    // Don't check progress if we're not showing a notification (transitioning between steps)
    if (!this.isShowingNotification) {
      // console.log(`⏸️ Tutorial: Ignoring ${actionType} check - no notification showing (transitioning)`); // Production: disabled
      return;
    }
    
    // console.log(`🎯 Tutorial: Checking action ${actionType} for step ${step.id} (needs: ${step.action})`); // Production: disabled
    
    // Check if this action matches what we're waiting for
    if (step.action === actionType) {
      // Additional guard: for shooting, ensure a weapon is actually engaged
      if (actionType === 'shoot' && !this.canPlayerShoot()) {
        // console.log('❌ Tutorial: shoot action ignored - player has no weapon engaged'); // Production: disabled
        return;
      }
      // console.log(`✅ Tutorial action completed: ${actionType} - advancing step`); // Production: disabled
      
      // Prevent double-advancement by immediately marking as inactive during transition
      const wasActive = this.isActive;
      this.isActive = false;
      
      // Mark as not showing notification first
      this.isShowingNotification = false;
      
      // Remove current notification
      const container = document.getElementById('tutorial-notifications');
      if (container && container.firstChild) {
        const notification = container.firstChild;
        notification.classList.add('removing');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 400);
      }
      
      // Move to next step
      setTimeout(() => {
        this.isActive = wasActive; // Restore active state
        this.nextStep();
        // Analytics: step completed
        try {
          const payload = { stepId: step.id, action: actionType, index: this.currentStep };
          if (window.analytics && typeof window.analytics.track === 'function') {
            window.analytics.track('tutorial_step_completed', payload);
          } else if (window.gameAnalytics && typeof window.gameAnalytics.trackEvent === 'function') {
            window.gameAnalytics.trackEvent('tutorial_step_completed', payload);
          }
        } catch (e) {
          console.warn('Tutorial: failed to send analytics for tutorial_step_completed', e);
        }
        // Record duration for the completed step
        try {
          const now = Date.now();
          if (this._currentStepStartTs != null) {
            const durMs = now - this._currentStepStartTs;
            this._stepDurations[step.id] = (durMs / 1000);
            const durPayload = { stepId: step.id, index: this.currentStep, durationSeconds: Math.round(durMs / 1000) };
            try {
              if (window.analytics && typeof window.analytics.track === 'function') {
                window.analytics.track('tutorial_step_duration', durPayload);
              } else if (window.gameAnalytics && typeof window.gameAnalytics.trackEvent === 'function') {
                window.gameAnalytics.trackEvent('tutorial_step_duration', durPayload);
              }
            } catch (e) {
              console.warn('Tutorial: failed to send analytics for tutorial_step_duration', e);
            }
          }
        } catch (e) {
          console.warn('Tutorial: error recording step completion duration', e);
        }
      }, 500);
    } else {
      // console.log(`❌ Tutorial: Action ${actionType} doesn't match required ${step.action} - not advancing`); // Production: disabled
    }
  }

  showTutorialNotification(step) {
    // console.log(`📢 Tutorial: Attempting to show notification for step: ${step.id}`); // Production: disabled
    
    if (this.isShowingNotification) {
      // console.log(`📢 Tutorial: Queueing step ${step.id} (notification already showing)`); // Production: disabled
      this.notificationQueue.push(step);
      return;
    }

    // console.log(`📢 Tutorial: Displaying notification for step: ${step.id}`); // Production: disabled
    this.isShowingNotification = true;
    
    // Play robot chatter sound when panel appears
    if (this.game && this.game.soundManager) {
      this.game.soundManager.play('robotchatter', { volume: 0.85 });
    }
    
    const container = document.getElementById('tutorial-notifications');
    if (!container) {
      console.error('Tutorial container not found!');
      return;
    }

    // Clear any existing notifications first to prevent duplicates
    container.innerHTML = '';

    const notification = document.createElement('div');
    notification.className = 'tutorial-notification';
    
    // Add special styling for action-required steps
    if (step.action) {
      notification.classList.add('action-required');
    }
    
    // Create skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'tutorial-skip-btn';
    skipBtn.innerHTML = '×';
    skipBtn.title = 'Skip Tutorial';
    skipBtn.onclick = (e) => {
      e.stopPropagation();
      this.skipTutorial();
    };

    // Create content
    const title = document.createElement('div');
    title.className = 'tutorial-title';
    title.textContent = step.title;

    const message = document.createElement('div');
    message.className = 'tutorial-message';
    message.textContent = step.message;

    const progress = document.createElement('div');
    progress.className = 'tutorial-progress';
    progress.textContent = `${this.currentStep + 1}/${this.tutorialSteps.length}`;

    notification.appendChild(skipBtn);
    notification.appendChild(title);
    notification.appendChild(message);

    // Add reward info if present
    if (step.reward) {
      const reward = document.createElement('div');
      reward.className = 'tutorial-reward';
      const rewards = [];
      if (step.reward.credits) rewards.push(`+${step.reward.credits} Credits`);
      if (step.reward.gems) rewards.push(`+${step.reward.gems} Gems`);
      reward.textContent = `Reward: ${rewards.join(', ')} 💎`;
      notification.appendChild(reward);

      // Actually give the reward when showing the notification
      // console.log(`💰 Tutorial: Giving reward - ${step.reward.credits} credits, ${step.reward.gems} gems`); // Production: disabled
      this.giveReward(step.reward);
    } else if (step.rewardText) {
      // Show reward text for steps that don't give immediate rewards
      const rewardText = document.createElement('div');
      rewardText.className = 'tutorial-reward';
      rewardText.textContent = step.rewardText;
      notification.appendChild(rewardText);
    }

    // Add appropriate hint based on step type
    const hint = document.createElement('div');
    if (step.action) {
      hint.className = 'tutorial-action-hint';
      const actionTexts = {
        'movement': 'Try moving with WASD or arrow keys',
        'stop_ship': 'Hold S or DOWN arrow to stop your ship',
        'change_weapon': 'Press Q/E or number keys to change weapons',
        'shoot': 'Press SPACEBAR to shoot',
        'leave_safe_zone': 'Leave the checkerboard safe zone area',
        'return_to_safe_zone': 'Return to the safe zone (green area)',
        'mine_asteroid': 'Shoot an asteroid to mine it',
        'open_shop': 'Press B or click Shop button',
        'safe_zone_shop': 'Open shop while in a safe zone (green area)',
        'buy_weapon': 'Purchase a weapon from the shop',
        'take_damage': 'This will trigger when you take damage'
      };
      hint.textContent = actionTexts[step.action] || 'Complete the required action';
    } else {
      hint.className = 'tutorial-continue-hint';
      hint.textContent = 'Click to continue';
      
      // Make notification clickable for info steps
      notification.style.cursor = 'pointer';
      notification.onclick = () => {
        this.removeNotification(notification);
        setTimeout(() => this.nextStep(), 200);
      };
    }
    
    notification.appendChild(hint);
    notification.appendChild(progress);
    container.appendChild(notification);

    // Add Marvin to the notification
    if (window.marvinAssistant) {
      window.marvinAssistant.attachToNotification(notification);
    }

    // For action-required steps, don't auto-remove
    if (!step.action) {
      // Info steps stay until clicked
      return;
    }
  }

  removeNotification(notification) {
    if (!notification) return;
    
    // console.log(`📤 Tutorial: Removing notification`); // Production: disabled
    notification.classList.add('removing');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.isShowingNotification = false;
      // console.log(`📤 Tutorial: Notification removed, showing flag set to false`); // Production: disabled
      
      // Show next queued notification if any
      if (this.notificationQueue.length > 0) {
        // console.log(`📤 Tutorial: Processing queued notification (${this.notificationQueue.length} in queue)`); // Production: disabled
        const nextStep = this.notificationQueue.shift();
        setTimeout(() => {
          this.showTutorialNotification(nextStep);
        }, 100);
      }
    }, 400);
  }

  giveReward(reward) {
    if (reward.credits && this.player) {
      this.player.credits += reward.credits;
      
      // Update UI
      if (this.game.ui && this.game.ui.updateHUD) {
        this.game.ui.updateHUD();
      }
    }

    if (reward.gems && this.player) {
      this.player.gems = (this.player.gems || 0) + reward.gems;
      
      // Award gems to premiumStore if available
      if (reward.gems > 0 && window.game && window.game.premiumStore && typeof window.game.premiumStore.addSpaceGems === 'function') {
        window.game.premiumStore.addSpaceGems(reward.gems);
      }
      
      // Update UI
      if (this.game.ui && this.game.ui.updateHUD) {
        this.game.ui.updateHUD();
      }
    }

    // Update shop credits display if shop is open
    const creditsEl = document.getElementById('shop-credits');
    if (creditsEl) {
      creditsEl.textContent = `Credits: ${this.player.credits || 0}`;
    }
    
    // Update main UI credits display (outside shop)
    if (window.game && window.game.ui && typeof window.game.ui.updateCreditsDisplay === 'function') {
      window.game.ui.updateCreditsDisplay();
    }
    
    // Update main UI gems display if premiumStore exists
    if (window.game && window.game.premiumStore && typeof window.game.premiumStore.updateGemDisplay === 'function') {
      window.game.premiumStore.updateGemDisplay();
    }
    
    // Direct DOM fallback: update the visible top-left counters immediately
    try {
      const mainCredits = document.getElementById('credits');
      if (mainCredits) mainCredits.textContent = this.player.credits || 0;
      const mainGems = document.getElementById('gems');
      if (mainGems) mainGems.textContent = (window.game && window.game.premiumStore) ? window.game.premiumStore.spaceGems : 0;
    } catch (e) {
      console.log('⚠️ Tutorial: Could not update DOM counters directly:', e);
    }

    // Update shop UI if shop is open
    if (this.game.shop && typeof this.game.shop.updateShopContent === 'function') {
      this.game.shop.updateShopContent();
      // console.log('💰 Tutorial: Updated shop UI with new credits/gems'); // Production: disabled
    }

    // Save player progress
    if (this.player && this.player.saveToLocalStorage) {
      this.player.saveToLocalStorage();
    }
  }

  nextStep() {
    this.currentStep++;
    // console.log(`📚 Tutorial: Moving to step ${this.currentStep + 1}/${this.tutorialSteps.length}`); // Production: disabled
    
    // Small delay before showing next step
    setTimeout(() => {
      this.showCurrentStep();
    }, 300);
  }

  skipTutorial() {
    this.isActive = false;
    this.markTutorialCompleted();
    
    // Clear any notifications
    const container = document.getElementById('tutorial-notifications');
    if (container) {
      container.innerHTML = '';
    }
    
    this.isShowingNotification = false;
    this.notificationQueue = [];

    // Show skip message
    if (window.game && window.game.ui && window.game.ui.showMessage) {
      window.game.ui.showMessage('Tutorial skipped. You can re-enable it in Options!', '#4CAF50');
    }
    // Analytics: tutorial quit
    try {
      // finalize current step timing
      this._finalizeCurrentStepDuration();
      const now = Date.now();
      const totalSec = this._tutorialStartTs ? Math.round((now - this._tutorialStartTs) / 1000) : 0;
      const lastStepIndex = Math.max(0, this.currentStep);
      const payload = {
        playerId: window.game && window.game.multiplayer ? window.game.multiplayer.playerId : null,
        lastStepIndex,
        lastStepId: this.tutorialSteps[this.currentStep]?.id || null,
        totalDurationSeconds: totalSec,
        stepDurations: this._stepDurations || {}
      };
      if (window.analytics && typeof window.analytics.track === 'function') {
        window.analytics.track('tutorial_quit', payload);
      } else if (window.gameAnalytics && typeof window.gameAnalytics.trackEvent === 'function') {
        window.gameAnalytics.trackEvent('tutorial_quit', payload);
      }
    } catch (e) {
      console.warn('Tutorial: failed to send analytics for tutorial_quit', e);
    }
  }

  completeTutorial() {
    this.isActive = false;
    this.markTutorialCompleted();
    
    // Show completion message
    if (window.game && window.game.ui && window.game.ui.showMessage) {
      window.game.ui.showMessage('Tutorial completed! Welcome to SuperSpace, pilot! 🚀', '#FFD700');
    }

    // Play completion sound
    if (this.game.soundManager) {
      this.game.soundManager.play('powerup', {
        volume: 1.0,
        playbackRate: 1.5
      });
    }

    // console.log('🎓 Tutorial completed!'); // Production: disabled
    // Analytics: tutorial completed with total duration and per-step durations
    try {
      // finalize the current step timing before sending totals
      this._finalizeCurrentStepDuration();
      const now = Date.now();
      const totalSec = this._tutorialStartTs ? Math.round((now - this._tutorialStartTs) / 1000) : 0;
      const payload = {
        playerId: window.game && window.game.multiplayer ? window.game.multiplayer.playerId : null,
        totalDurationSeconds: totalSec,
        stepDurations: this._stepDurations || {}
      };
      if (window.analytics && typeof window.analytics.track === 'function') {
        window.analytics.track('tutorial_completed', payload);
      } else if (window.gameAnalytics && typeof window.gameAnalytics.trackEvent === 'function') {
        window.gameAnalytics.trackEvent('tutorial_completed', payload);
      }
    } catch (e) {
      console.warn('Tutorial: failed to send analytics for tutorial_completed', e);
    }
  }

  // Called by external systems when events occur
  onAsteroidDestroyed() {
    this.checkStepProgress('mine_asteroid');
  }

  onDamageTaken() {
    this.checkStepProgress('take_damage');
  }

  onShopOpened() {
    this.checkStepProgress('open_shop');
  }

  onWeaponPurchased() {
    this.checkStepProgress('buy_weapon');
  }

  onWeaponChanged() {
    // console.log('🔧 Tutorial: Weapon change detected!'); // Production: disabled
    this.checkStepProgress('change_weapon');
  }

  onPlayerRespawn() {
    this.checkStepProgress('respawn');
  }

  // Toggle tutorial from options
  toggleTutorial(enabled) {
    this.tutorialEnabled = enabled;
    localStorage.setItem('tutorialEnabled', enabled ? 'true' : 'false');
    
    if (enabled && this.completedTutorial) {
      // Allow re-running tutorial but without rewards
      this.completedTutorial = false;
      this.startTutorial();
    } else if (!enabled && this.isActive) {
      this.skipTutorial();
    }
  }

  // Reset tutorial progress (for testing or user request)
  resetTutorial() {
    localStorage.removeItem('tutorialCompleted');
    this.completedTutorial = false;
    this.isActive = false;
    this.currentStep = 0;
    this.hasPlayerMoved = false;
    
    // Clear any existing notifications
    const container = document.getElementById('tutorial-notifications');
    if (container) {
      container.innerHTML = '';
    }
    this.isShowingNotification = false;
    this.notificationQueue = [];
    
    if (this.getTutorialEnabledStatus()) {
      // If player is already in world, start immediately
      if (this.hasEnteredWorld || this.game.gameState === 'playing') {
        setTimeout(() => this.startTutorial(), 1000);
      }
      // Otherwise it will start when they enter the world
    }
  }

  // Record duration for the currently shown step (if any)
  _finalizeCurrentStepDuration() {
    try {
      if (this._currentStepStartTs != null && this.currentStep < this.tutorialSteps.length) {
        const now = Date.now();
        const step = this.tutorialSteps[this.currentStep];
        const durMs = now - this._currentStepStartTs;
        this._stepDurations[step.id] = (durMs / 1000);
        const durPayload = { stepId: step.id, index: this.currentStep, durationSeconds: Math.round(durMs / 1000) };
        try {
          if (window.analytics && typeof window.analytics.track === 'function') {
            window.analytics.track('tutorial_step_duration', durPayload);
          } else if (window.gameAnalytics && typeof window.gameAnalytics.trackEvent === 'function') {
            window.gameAnalytics.trackEvent('tutorial_step_duration', durPayload);
          }
        } catch (e) {
          console.warn('Tutorial: failed to send analytics for tutorial_step_duration (finalize)', e);
        }
      }
    } catch (e) {
      console.warn('Tutorial: error finalizing current step duration', e);
    }
  }

  // Manual advance for testing/debugging
  manualAdvance() {
    // console.log(`🔧 Manual advance: Current step ${this.currentStep + 1}/${this.tutorialSteps.length}`); // Production: disabled
    if (this.isActive && this.currentStep < this.tutorialSteps.length) {
      // Remove current notification
      const container = document.getElementById('tutorial-notifications');
      if (container && container.firstChild) {
        const notification = container.firstChild;
        notification.classList.add('removing');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 400);
      }
      
      this.isShowingNotification = false;
      this.nextStep();
    }
  }

  // Tutorial callback methods
  onSafeZoneShopOpened() {
    // console.log('📚 Tutorial: Safe zone shop opened callback'); // Production: disabled
    if (this.isActive) {
      const currentStepData = this.tutorialSteps[this.currentStep];
      if (currentStepData && currentStepData.action === 'safe_zone_shop') {
        // console.log('📚 Tutorial: Safe zone shop requirement met, advancing step'); // Production: disabled
        this.nextStep();
      }
    }
  }
}