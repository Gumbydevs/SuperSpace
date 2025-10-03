export class InputHandler {
  constructor() {
    this.keys = [];
    this.isTouchDevice = false;
    this.isChatting = false; // Add this line
    this.touchJoystick = {
      active: false,
      startX: 0,
      startY: 0,
      moveX: 0,
      moveY: 0,
      angle: 0, // Angle in radians for direct ship control
      magnitude: 0, // Magnitude for thrust power
      directControl: true, // Flag to use direct control mode on mobile
    };
    this.touchButtons = {};

    window.addEventListener('keydown', (e) => {
      if (this.isChatting) return; // Ignore game input when chatting

      // Don't capture keys if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable);

      if (isTyping) {
        return; // Let the browser handle the key normally
      }

      // Prevent default behaviors for game control keys
      if (
        [
          'Space',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'ShiftLeft',
          'ShiftRight',
          'ControlLeft',
          'Tab',
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
        ].includes(e.code)
      ) {
        e.preventDefault();
      }

      // Add key to the array if it's not already there
      if (!this.keys.includes(e.code) && !e.repeat) {
        this.keys.push(e.code);

        // Handle shift keys as generic 'Shift' for afterburner
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          if (!this.keys.includes('Shift')) {
            this.keys.push('Shift');
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      // Don't handle key releases if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable);

      if (isTyping) {
        return; // Let the browser handle the key normally
      }

      // Remove key from the array
      const index = this.keys.indexOf(e.code);
      if (index > -1) {
        this.keys.splice(index, 1);
      }

      // Handle shift keys - remove generic 'Shift' when both shift keys are released
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (
          !this.keys.includes('ShiftLeft') &&
          !this.keys.includes('ShiftRight')
        ) {
          const shiftIndex = this.keys.indexOf('Shift');
          if (shiftIndex > -1) {
            this.keys.splice(shiftIndex, 1);
          }
        }
      }
    });

    // Detect touch device
    this.detectTouchDevice();

    // Add touch controls for mobile
    this.setupTouchControls();
  }

  // Helper function to remove all direction keys (both arrow keys and WASD)
  removeAllDirectionKeys() {
    this.removeKey('ArrowUp');
    this.removeKey('ArrowDown');
    this.removeKey('ArrowLeft');
    this.removeKey('ArrowRight');
    this.removeKey('KeyW');
    this.removeKey('KeyA');
    this.removeKey('KeyS');
    this.removeKey('KeyD');
  }

  detectTouchDevice() {
    // Check if device has touch capability
    this.isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;

    console.log('Touch device detected:', this.isTouchDevice);
  }

  setupTouchControls() {
    // Only create touch controls for small mobile devices (phones), not iPads
    const isSmallMobileDevice = this.isTouchDevice && window.innerWidth <= 480;
    if (!isSmallMobileDevice) return;

    // Create touch UI container
    this.createTouchInterface();

    // Setup touch events for joystick
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    document.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
  }

  createTouchInterface() {
    // Create container for all touch controls
    const touchUI = document.createElement('div');
    touchUI.id = 'touch-controls';
    touchUI.className = 'touch-ui';

    // Create and style the virtual joystick
    const joystick = document.createElement('div');
    joystick.id = 'touch-joystick';
    joystick.className = 'touch-joystick';

    const joystickKnob = document.createElement('div');
    joystickKnob.id = 'joystick-knob';
    joystickKnob.className = 'joystick-knob';

    joystick.appendChild(joystickKnob);
    touchUI.appendChild(joystick);

    // Create fire button
    const fireButton = document.createElement('div');
    fireButton.id = 'fire-button';
    fireButton.className = 'touch-button';
    fireButton.innerHTML = '🔥';
    touchUI.appendChild(fireButton);

    // Create weapon switch button
    const weaponButton = document.createElement('div');
    weaponButton.id = 'weapon-button';
    weaponButton.className = 'touch-button';
    weaponButton.innerHTML = '🔄';
    touchUI.appendChild(weaponButton);

    // Create afterburner button
    const afterburnerButton = document.createElement('div');
    afterburnerButton.id = 'afterburner-button';
    afterburnerButton.className = 'touch-button afterburner-button';
    afterburnerButton.innerHTML = '🚀';
    touchUI.appendChild(afterburnerButton);

    // Create Impact Deflector button
    const deflectorButton = document.createElement('div');
    deflectorButton.id = 'deflector-button';
    deflectorButton.className = 'touch-button deflector-button';
    deflectorButton.innerHTML = '🛡️';
    touchUI.appendChild(deflectorButton);

    // Create brake/stop button (mobile equivalent of down arrow)
    const brakeButton = document.createElement('div');
    brakeButton.id = 'brake-button';
    brakeButton.className = 'touch-button brake-button';
    brakeButton.innerHTML = '🛑';
    touchUI.appendChild(brakeButton);

    // Create mobile menu/pause button - only on small mobile devices (phones), not iPads
    const menuButton = document.createElement('div');
    menuButton.id = 'mobile-menu-button';
    menuButton.className = 'touch-button mobile-menu-button';
    menuButton.innerHTML = '⚙️ Options'; // Match shop button format
    // Only show on very small screens (phones), explicitly hide on iPads
    const isSmallPhone = window.innerWidth <= 480;
    const isTabletOrLarger = window.innerWidth > 480;
    menuButton.style.display = (this.isTouchDevice && isSmallPhone) ? 'flex' : 'none';
    if (isTabletOrLarger) {
      menuButton.style.display = 'none !important'; // Force hide on tablets/iPads
    }
    document.body.appendChild(menuButton); // Add to body instead of touchUI

    // Add click handler for mobile menu button
    menuButton.addEventListener('click', () => {
      if (window.game && window.game.ui && window.game.ui.showOptionsOverlay) {
        window.game.ui.showOptionsOverlay();
      }
    });

    document.body.appendChild(touchUI);

    // Add button touch events
    fireButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!this.keys.includes('Space')) {
        this.keys.push('Space');
      }
    });

    fireButton.addEventListener('touchend', () => {
      const index = this.keys.indexOf('Space');
      if (index > -1) {
        this.keys.splice(index, 1);
      }
    });

    weaponButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      // Switch weapon (Q key)
      if (!this.keys.includes('KeyQ')) {
        this.keys.push('KeyQ');
        // Remove it after a short delay to simulate a keypress
        setTimeout(() => {
          const index = this.keys.indexOf('KeyQ');
          if (index > -1) {
            this.keys.splice(index, 1);
          }
        }, 100);
      }
    });

    // Add afterburner button events
    afterburnerButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!this.keys.includes('Shift')) {
        this.keys.push('Shift');
        afterburnerButton.classList.add('active');
      }
    });

    afterburnerButton.addEventListener('touchend', () => {
      const index = this.keys.indexOf('Shift');
      if (index > -1) {
        this.keys.splice(index, 1);
        afterburnerButton.classList.remove('active');
      }
    });

    // Add Impact Deflector button events
    deflectorButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!this.keys.includes('ControlLeft')) {
        this.keys.push('ControlLeft');
        deflectorButton.classList.add('active');
        // Remove it after a short delay to simulate a keypress
        setTimeout(() => {
          const index = this.keys.indexOf('ControlLeft');
          if (index > -1) {
            this.keys.splice(index, 1);
            deflectorButton.classList.remove('active');
          }
        }, 100);
      }
    });

    // Add mobile menu button events
    menuButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      // Directly call the showOptionsOverlay function if available
      if (window.game && window.game.ui && window.game.ui.showOptionsOverlay) {
        window.game.ui.showOptionsOverlay();
      }
    });

    // Add brake button events
    brakeButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!this.keys.includes('ArrowDown')) {
        this.keys.push('ArrowDown');
        brakeButton.classList.add('active');
      }
    });

    brakeButton.addEventListener('touchend', () => {
      const index = this.keys.indexOf('ArrowDown');
      if (index > -1) {
        this.keys.splice(index, 1);
        brakeButton.classList.remove('active');
      }
    });

    // Add CSS for touch controls - updated for better mobile experience
    const style = document.createElement('style');
    style.textContent = `
            .touch-ui {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 140px;
                pointer-events: none;
                z-index: 1001;
                display: none; /* Hide by default, show only on touch devices */
                background: linear-gradient(to top, rgba(0,0,0,0.2), transparent);
            }
            
            .touch-joystick {
                position: absolute;
                bottom: 20px;
                left: 20px;
                width: 100px;
                height: 100px;
                background-color: rgba(255, 255, 255, 0.15);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                pointer-events: auto;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            
            .joystick-knob {
                position: absolute;
                width: 40px;
                height: 40px;
                background-color: rgba(255, 255, 255, 0.7);
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                transition: all 0.1s ease;
            }
            
            .touch-button {
                position: absolute;
                background-color: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                pointer-events: auto;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
                -webkit-tap-highlight-color: transparent;
                transition: all 0.1s ease;
            }
            
            .touch-button:active {
                background-color: rgba(255, 255, 255, 0.4);
                transform: scale(0.95);
            }
            
            #fire-button {
                /* Positioning delegated to external stylesheet via CSS variables */
                bottom: var(--touch-gap, 30px);
                right: var(--touch-gap, 30px);
                width: 80px;
                height: 80px;
                background-color: rgba(255, 100, 100, 0.3);
                border-color: rgba(255, 100, 100, 0.6);
                font-size: 28px;
            }
            
            #fire-button:active {
                background-color: rgba(255, 100, 100, 0.6);
                box-shadow: 0 0 15px rgba(255, 100, 100, 0.8);
            }
            
            #weapon-button {
                bottom: var(--touch-gap, 30px);
                right: calc(var(--touch-gap, 30px) + var(--touch-gap-large, 100px));
                width: 60px;
                height: 60px;
                background-color: rgba(100, 150, 255, 0.3);
                border-color: rgba(100, 150, 255, 0.6);
            }
            
            #weapon-button:active {
                background-color: rgba(100, 150, 255, 0.6);
                box-shadow: 0 0 15px rgba(100, 150, 255, 0.8);
            }
            
            #afterburner-button {
                /* place above the fire button using same spacing variables */
                bottom: calc(var(--touch-gap, 30px) + var(--touch-gap-large, 100px));
                right: var(--touch-gap, 30px);
                width: 60px;
                height: 60px;
                background-color: rgba(255, 200, 100, 0.3);
                border-color: rgba(255, 200, 100, 0.6);
            }
            
            #afterburner-button:active,
            #afterburner-button.active {
                background-color: rgba(255, 200, 100, 0.6);
                box-shadow: 0 0 15px rgba(255, 200, 100, 0.8);
            }
            
            #deflector-button {
                /* place above the afterburner button */
                bottom: calc(var(--touch-gap, 30px) + var(--touch-gap-large, 100px) * 2);
                right: var(--touch-gap, 30px);
                width: 60px;
                height: 60px;
                background-color: rgba(0, 255, 255, 0.3);
                border-color: rgba(0, 255, 255, 0.6);
            }
            
            #deflector-button:active,
            #deflector-button.active {
                background-color: rgba(0, 255, 255, 0.6);
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
            }
            
            #brake-button {
                bottom: 140px;
                left: 20px;
                width: 50px;
                height: 50px;
                background-color: rgba(255, 80, 80, 0.3);
                border-color: rgba(255, 80, 80, 0.6);
                font-size: 18px;
            }
            
            #brake-button:active,
            #brake-button.active {
                background-color: rgba(255, 80, 80, 0.6);
                box-shadow: 0 0 15px rgba(255, 80, 80, 0.8);
            }
            
            #mobile-menu-button {
                bottom: 100px;
                right: 100px;
                width: 50px;
                height: 50px;
                background-color: rgba(200, 200, 200, 0.3);
                border-color: rgba(200, 200, 200, 0.6);
                font-size: 20px;
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1002;
            }
            
            #mobile-menu-button:active {
                background-color: rgba(200, 200, 200, 0.6);
                box-shadow: 0 0 15px rgba(200, 200, 200, 0.8);
            }
            
            #brake-button {
                bottom: 130px;
                left: 20px;
                width: 50px;
                height: 50px;
                background-color: rgba(255, 50, 50, 0.3);
                border-color: rgba(255, 50, 50, 0.6);
                font-size: 18px;
            }
            
            #brake-button:active,
            #brake-button.active {
                background-color: rgba(255, 50, 50, 0.6);
                box-shadow: 0 0 15px rgba(255, 50, 50, 0.8);
            }
            
            @media (hover: none) and (pointer: coarse) {
                .touch-ui {
                    display: block !important;
                }
                
                #mobile-menu-button {
                    display: flex !important;
                }
                
                #brake-button {
                    display: flex !important;
                }
            }
            
            /* Small mobile adjustments */
            @media screen and (max-width: 480px) {
                .touch-ui {
                    height: 120px;
                }
                
                .touch-joystick {
                    width: 80px;
                    height: 80px;
                    bottom: 15px;
                    left: 15px;
                }
                
                .joystick-knob {
                    width: 30px;
                    height: 30px;
                }
                
                #fire-button {
                    width: 65px;
                    height: 65px;
                    bottom: 20px;
                    right: 20px;
                    font-size: 20px;
                }
                
                #weapon-button {
                    width: 50px;
                    height: 50px;
                    bottom: 20px;
                    right: 100px;
                    font-size: 18px;
                }
                
                #afterburner-button {
                    width: 50px;
                    height: 50px;
                    bottom: 80px;
                    right: 20px;
                    font-size: 18px;
                }
                
                #mobile-menu-button {
                    width: 45px;
                    height: 45px;
                    top: 15px;
                    right: 15px;
                    font-size: 18px;
                }
                
                #brake-button {
                    width: 45px;
                    height: 45px;
                    bottom: 120px;
                    left: 15px;
                    font-size: 16px;
                }
                
                #brake-button {
                    width: 40px;
                    height: 40px;
                    bottom: 110px;
                    left: 15px;
                    font-size: 16px;
                }
            }
        `;

    document.head.appendChild(style);

    // Store references to elements
    this.touchElements = {
      joystick: joystick,
      knob: joystickKnob,
      fireButton: fireButton,
      weaponButton: weaponButton,
      afterburnerButton: afterburnerButton,
      deflectorButton: deflectorButton,
      menuButton: menuButton,
      brakeButton: brakeButton,
    };

    // Apply computed positions from CSS variables to ensure buttons are placed correctly at runtime.
    const applyTouchButtonPositions = () => {
      try {
        const rootStyles = getComputedStyle(touchUI);
        const gap = parseInt(rootStyles.getPropertyValue('--touch-gap')) || 30;
        const gapLarge =
          parseInt(rootStyles.getPropertyValue('--touch-gap-large')) || 100;

        // Fire button -> bottom/right = gap
        fireButton.style.bottom = gap + 'px';
        fireButton.style.right = gap + 'px';

        // Weapon button -> bottom = gap, right = gap + gapLarge
        weaponButton.style.bottom = gap + 'px';
        weaponButton.style.right = gap + gapLarge + 'px';

        // Afterburner -> bottom = gap + gapLarge, right = gap
        afterburnerButton.style.bottom = gap + gapLarge + 'px';
        afterburnerButton.style.right = gap + 'px';
      } catch (err) {
        // ignore in older browsers
      }
    };

    // Run once and on resize/orientation change to keep in sync with CSS changes
    applyTouchButtonPositions();
    window.addEventListener('resize', applyTouchButtonPositions);
    window.addEventListener('orientationchange', applyTouchButtonPositions);
  }

  handleTouchStart(e) {
    // Identify which part of the screen was touched
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    // Check if touch is on the left side (joystick area)
    if (touchX < window.innerWidth / 2 && !this.touchJoystick.active) {
      e.preventDefault();
      this.touchJoystick.active = true;
      this.touchJoystick.startX = touchX;
      this.touchJoystick.startY = touchY;
      this.touchJoystick.moveX = touchX;
      this.touchJoystick.moveY = touchY;

      // Position the joystick at the touch point
      if (this.touchElements && this.touchElements.joystick) {
        this.touchElements.joystick.style.left = touchX - 60 + 'px';
        this.touchElements.joystick.style.top = touchY - 60 + 'px';
        this.touchElements.knob.style.left = '50%';
        this.touchElements.knob.style.top = '50%';
      }
    }
  }
  handleTouchStart(e) {
    // Only activate joystick if touch starts within joystick area
    if (!this.touchElements || !this.touchElements.joystick) return;
    const joystickRect = this.touchElements.joystick.getBoundingClientRect();
    let found = false;
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const touchX = touch.clientX;
      const touchY = touch.clientY;
      if (
        touchX >= joystickRect.left &&
        touchX <= joystickRect.right &&
        touchY >= joystickRect.top &&
        touchY <= joystickRect.bottom
      ) {
        found = true;
        if (!this.touchJoystick.active) {
          e.preventDefault();
          this.touchJoystick.active = true;
          // Always use joystick center as origin
          this.touchJoystick.startX =
            joystickRect.left + joystickRect.width / 2;
          this.touchJoystick.startY =
            joystickRect.top + joystickRect.height / 2;
          this.touchJoystick.moveX = touchX;
          this.touchJoystick.moveY = touchY;
          // Center knob
          if (this.touchElements && this.touchElements.knob) {
            this.touchElements.knob.style.left = '50%';
            this.touchElements.knob.style.top = '50%';
          }
        }
        break;
      }
    }
    // If no touch is in joystick area, do not activate joystick
    if (!found) {
      // Allow other UI to handle the touch
      return;
    }
  }

  handleTouchMove(e) {
    // Handle joystick movement
    if (this.touchJoystick.active) {
      e.preventDefault();

      // Find the touch that started on the joystick
      let touchIndex = -1;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        // Rough estimate to identify the joystick touch
        if (
          Math.abs(touchX - this.touchJoystick.startX) < 100 &&
          Math.abs(touchY - this.touchJoystick.startY) < 100
        ) {
          touchIndex = i;
          break;
        }
      }

      if (touchIndex >= 0) {
        const touch = e.touches[touchIndex];
        this.touchJoystick.moveX = touch.clientX;
        this.touchJoystick.moveY = touch.clientY;

        // Calculate joystick movement
        let deltaX = this.touchJoystick.moveX - this.touchJoystick.startX;
        let deltaY = this.touchJoystick.moveY - this.touchJoystick.startY;

        // Calculate angle and magnitude for direct control mode
        this.touchJoystick.angle = Math.atan2(deltaY, deltaX);

        // Convert to ship orientation (where 0 is up, not right)
        this.touchJoystick.angle = this.touchJoystick.angle + Math.PI / 2;

        // Normalize angle to 0-2π range
        if (this.touchJoystick.angle < 0) {
          this.touchJoystick.angle += Math.PI * 2;
        }

        // Calculate magnitude (distance from center)
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Normalize magnitude to 0-1 range (with max being 40px)
        this.touchJoystick.magnitude = Math.min(distance / 40, 1);

        // Limit to a circle with radius 40
        if (distance > 40) {
          deltaX = (deltaX * 40) / distance;
          deltaY = (deltaY * 40) / distance;
        }

        // Update knob position
        if (this.touchElements && this.touchElements.knob) {
          this.touchElements.knob.style.left = `calc(50% + ${deltaX}px)`;
          this.touchElements.knob.style.top = `calc(50% + ${deltaY}px)`;
        }

        if (this.touchJoystick.directControl) {
          // Direct control mode for mobile: convert to rotation and thrust
          this.handleDirectJoystickControl();
        } else {
          // Legacy mode for backwards compatibility
          this.handleJoystickInput(deltaX, deltaY);
        }
      }
    }
  }

  handleDirectJoystickControl() {
    // Remove all direction keys first
    this.removeAllDirectionKeys();

    // Only apply controls if the joystick is moved enough
    if (this.touchJoystick.magnitude > 0.2) {
      // Add simulated rotation key input based on angle
      // These will be used by the Player class to set its rotation directly

      // Add direct rotation property to be read by the Player class
      this.directRotation = this.touchJoystick.angle;

      // Apply thrust if the joystick magnitude is significant
      if (this.touchJoystick.magnitude > 0.3) {
        if (!this.keys.includes('ArrowUp')) {
          this.keys.push('ArrowUp');
        }

        // Set thrust amount proportional to joystick distance
        this.thrustAmount = this.touchJoystick.magnitude;
      }
    } else {
      // Reset direct rotation if joystick is back to center
      this.directRotation = null;
      this.thrustAmount = 0;
    }
  }

  handleTouchEnd(e) {
    // Reset joystick if all touches are removed
    if (e.touches.length === 0) {
      this.touchJoystick.active = false;

      // Reset knob position
      if (this.touchElements && this.touchElements.knob) {
        this.touchElements.knob.style.left = '50%';
        this.touchElements.knob.style.top = '50%';
      }

      // Reset direct control values
      this.directRotation = null;
      this.thrustAmount = 0;

      // Remove all direction keys
      this.removeAllDirectionKeys();
    } else {
      // Check if joystick touch is still active
      let joystickTouchActive = false;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        if (
          Math.abs(touchX - this.touchJoystick.startX) < 100 &&
          Math.abs(touchY - this.touchJoystick.startY) < 100
        ) {
          joystickTouchActive = true;
          break;
        }
      }

      if (!joystickTouchActive) {
        this.touchJoystick.active = false;

        // Reset knob position
        if (this.touchElements && this.touchElements.knob) {
          this.touchElements.knob.style.left = '50%';
          this.touchElements.knob.style.top = '50%';
        }

        // Reset direct control values
        this.directRotation = null;
        this.thrustAmount = 0;

        // Remove all direction keys
        this.removeAllDirectionKeys();
      }
    }
  }

  handleJoystickInput(deltaX, deltaY) {
    // Convert joystick position to key presses

    // Horizontal movement
    if (deltaX > 15) {
      // Right
      if (!this.keys.includes('ArrowRight')) {
        this.keys.push('ArrowRight');
      }
      this.removeKey('ArrowLeft');
    } else if (deltaX < -15) {
      // Left
      if (!this.keys.includes('ArrowLeft')) {
        this.keys.push('ArrowLeft');
      }
      this.removeKey('ArrowRight');
    } else {
      // Center zone - remove both left and right
      this.removeKey('ArrowLeft');
      this.removeKey('ArrowRight');
    }

    // Vertical movement
    if (deltaY < -15) {
      // Up
      if (!this.keys.includes('ArrowUp')) {
        this.keys.push('ArrowUp');
      }
      this.removeKey('ArrowDown');
    } else if (deltaY > 15) {
      // Down (braking)
      if (!this.keys.includes('ArrowDown')) {
        this.keys.push('ArrowDown');
      }
      this.removeKey('ArrowUp');
    } else {
      // Center zone - remove both up and down
      this.removeKey('ArrowUp');
      this.removeKey('ArrowDown');
    }
  }

  removeKey(key) {
    const index = this.keys.indexOf(key);
    if (index > -1) {
      this.keys.splice(index, 1);
    }
  }

  setChatting(isChatting) {
    this.isChatting = isChatting;
    if (isChatting) {
      this.keys = []; // Clear all keys when entering chat mode
    }
  }
}
