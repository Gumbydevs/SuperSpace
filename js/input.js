export class InputHandler {
    constructor() {
        this.keys = [];
        this.isTouchDevice = false;
        this.touchJoystick = { 
            active: false, 
            startX: 0, 
            startY: 0, 
            moveX: 0, 
            moveY: 0,
            angle: 0,          // Angle in radians for direct ship control
            magnitude: 0,      // Magnitude for thrust power
            directControl: true // Flag to use direct control mode on mobile
        };
        this.touchButtons = {};
        
        window.addEventListener('keydown', (e) => {
            // Prevent default behaviors for game control keys
            if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            
            // Add key to the array if it's not already there
            if(!this.keys.includes(e.code) && !e.repeat) {
                this.keys.push(e.code);
            }
        });
        
        window.addEventListener('keyup', (e) => {
            // Remove key from the array
            const index = this.keys.indexOf(e.code);
            if(index > -1) {
                this.keys.splice(index, 1);
            }
        });
        
        // Detect touch device
        this.detectTouchDevice();
        
        // Add touch controls for mobile
        this.setupTouchControls();
    }

    detectTouchDevice() {
        // Check if device has touch capability
        this.isTouchDevice = ('ontouchstart' in window) || 
                            (navigator.maxTouchPoints > 0) || 
                            (navigator.msMaxTouchPoints > 0);
                            
        console.log("Touch device detected:", this.isTouchDevice);
    }
    
    setupTouchControls() {
        // Only create touch controls if this is a touch device
        if (!this.isTouchDevice) return;
        
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
        
        // Add CSS for touch controls
        const style = document.createElement('style');
        style.textContent = `
            .touch-ui {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
                display: none; /* Hide by default, show only on touch devices */
            }
            
            .touch-joystick {
                position: absolute;
                bottom: 20%;
                left: 15%;
                width: 120px;
                height: 120px;
                background-color: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                pointer-events: auto;
            }
            
            .joystick-knob {
                position: absolute;
                width: 50px;
                height: 50px;
                background-color: rgba(255, 255, 255, 0.6);
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            .touch-button {
                position: absolute;
                width: 80px;
                height: 80px;
                background-color: rgba(255, 255, 255, 0.3);
                border: 2px solid rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 30px;
                pointer-events: auto;
            }
            
            #fire-button {
                bottom: 20%;
                right: 15%;
            }
            
            #weapon-button {
                bottom: 35%;
                right: 15%;
            }
            
            @media (hover: none) and (pointer: coarse) {
                .touch-ui {
                    display: block;
                }
            }
        `;
        
        document.head.appendChild(style);
        
        // Store references to elements
        this.touchElements = {
            joystick: joystick,
            knob: joystickKnob,
            fireButton: fireButton,
            weaponButton: weaponButton
        };
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
                this.touchElements.joystick.style.left = (touchX - 60) + 'px';
                this.touchElements.joystick.style.top = (touchY - 60) + 'px';
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
                    this.touchJoystick.startX = joystickRect.left + joystickRect.width / 2;
                    this.touchJoystick.startY = joystickRect.top + joystickRect.height / 2;
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
                if (Math.abs(touchX - this.touchJoystick.startX) < 100 && 
                    Math.abs(touchY - this.touchJoystick.startY) < 100) {
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
                this.touchJoystick.angle = this.touchJoystick.angle + Math.PI/2;
                
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
                    deltaX = deltaX * 40 / distance;
                    deltaY = deltaY * 40 / distance;
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
        this.removeKey('ArrowUp');
        this.removeKey('ArrowDown');
        this.removeKey('ArrowLeft');
        this.removeKey('ArrowRight');
        
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
            this.removeKey('ArrowUp');
            this.removeKey('ArrowDown');
            this.removeKey('ArrowLeft');
            this.removeKey('ArrowRight');
        } else {
            // Check if joystick touch is still active
            let joystickTouchActive = false;
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const touchX = touch.clientX;
                const touchY = touch.clientY;
                
                if (Math.abs(touchX - this.touchJoystick.startX) < 100 && 
                    Math.abs(touchY - this.touchJoystick.startY) < 100) {
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
                this.removeKey('ArrowUp');
                this.removeKey('ArrowDown');
                this.removeKey('ArrowLeft');
                this.removeKey('ArrowRight');
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
}