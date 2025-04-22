import { Projectile } from './projectile.js';

export class Player {
    constructor(x, y) {
        // Here we set the initial position of the player's ship
        this.x = x;
        this.y = y;
        this.rotation = 0; // in radians, 0 means facing up
        this.speed = 0;
        this.maxSpeed = 400; // Maximum possible speed for the ship
        this.acceleration = 300; // How quickly the ship speeds up
        this.rotationSpeed = 4.0; // How quickly the ship can turn
        this.friction = 0.998; // Space-like movement with minimal friction
        this.braking = false; // Tracks if player is actively braking
        this.brakePower = 0.95; // How effective braking is (lower = stronger brakes)
        this.width = 30; // Ship collision width
        this.height = 30; // Ship collision height
        this.velocity = { x: 0, y: 0 }; // Current movement vector

        // Here we define the player's health and defense stats
        this.maxHealth = 100;
        this.health = 100;
        this.armor = 1.0; // Damage multiplier (lower values mean better protection)
        this.damageReduction = 0; // Flat damage reduction percentage

        // Here we track the player's current ship and equipment
        this.currentShip = 'scout'; // Default starting ship
        this.currentWeaponId = 'laser'; // Track weapon by ID for shop integration

        // Here we define the player's economy and score
        this.credits = 0; // Currency for purchasing ships and upgrades
        this.score = 0;   // Points for game score

        // Here we set up the weapon systems
        this.weapons = ['Basic Laser', 'Burst Cannon', 'Seeker Missile'];
        this.currentWeapon = this.weapons[0];
        this.weaponIndex = 0;
        this.projectiles = []; // Active projectiles fired by player
        this.fireCooldown = 0; // Current cooldown time before can fire again
        this.fireCooldownTime = 0.20; // Base time between shots

        // Here we define the energy system (optional until upgraded)
        this.maxEnergy = 100;
        this.energy = 100;
        this.energyRegen = 5; // Energy points regenerated per second

        // Here we set up the shield system (requires upgrade)
        this.shieldCapacity = 0; // No shields by default until upgraded
        this.shield = 0;
        this.shieldRechargeRate = 10; // Shield points per second when recharging
        this.shieldRechargeDelay = 3; // Seconds to wait after damage before recharging
        this.lastDamageTime = 0;

        // Here we define the cargo system
        this.cargoCapacity = 100;
        this.cargo = 0; // Resource units collected
    }

    update(deltaTime, input, soundManager) {
        // Handle direct joystick control for mobile devices
        if (input.directRotation !== undefined && input.directRotation !== null) {
            // Direct control from joystick - directly set the rotation value
            this.rotation = input.directRotation;
            
            // Use the joystick thrust amount (if provided) to scale acceleration
            const thrustMultiplier = input.thrustAmount || 1.0;
            
            // Calculate acceleration based on the ship's rotation
            const accelerationX = Math.sin(this.rotation) * this.acceleration * deltaTime * thrustMultiplier;
            const accelerationY = -Math.cos(this.rotation) * this.acceleration * deltaTime * thrustMultiplier;
            
            // Apply acceleration to velocity
            this.velocity.x += accelerationX;
            this.velocity.y += accelerationY;
        } else {
            // Standard keyboard controls
            
            // Here we handle rotation based on player input
            if (input.keys.includes('ArrowLeft')) {
                this.rotation -= this.rotationSpeed * deltaTime;
            }
            if (input.keys.includes('ArrowRight')) {
                this.rotation += this.rotationSpeed * deltaTime;
            }
    
            // Here we wrap rotation to stay between 0 and 2π
            this.rotation = this.rotation % (Math.PI * 2);
            if (this.rotation < 0) this.rotation += Math.PI * 2;
    
            // Here we handle thrust/acceleration
            if (input.keys.includes('ArrowUp')) {
                // Calculate acceleration components based on ship's rotation
                // Sine for X because 0 radians points up in our coordinate system
                const accelerationX = Math.sin(this.rotation) * this.acceleration * deltaTime;
                const accelerationY = -Math.cos(this.rotation) * this.acceleration * deltaTime;
                
                // Apply acceleration to velocity
                this.velocity.x += accelerationX;
                this.velocity.y += accelerationY;
            }
        }

        // Here we check if player is braking (using down arrow)
        this.braking = input.keys.includes('ArrowDown');

        // Here we apply physics based on whether the player is braking or coasting
        if (this.braking) {
            // Apply stronger deceleration when braking
            this.velocity.x *= this.brakePower;
            this.velocity.y *= this.brakePower;
        } else {
            // Apply minimal friction when coasting (near-zero in space)
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
        }
        
        // Here we cap velocity to the maximum speed
        const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (currentSpeed > this.maxSpeed) {
            const ratio = this.maxSpeed / currentSpeed;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
        }

        // Here we update the ship's position based on its velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;

        // Here we handle weapon firing
        if (input.keys.includes('Space') && this.fireCooldown <= 0) {
            this.fire(soundManager);
            this.fireCooldown = this.fireCooldownTime;
        }

        // Here we handle weapon switching with Q and E keys
        if ((input.keys.includes('KeyQ') || input.keys.includes('KeyE')) && soundManager) {
            const previousWeapon = this.currentWeapon;
            
            if (input.keys.includes('KeyQ')) {
                // Cycle backwards through weapons
                this.weaponIndex = (this.weaponIndex - 1 + this.weapons.length) % this.weapons.length;
            } else {
                // Cycle forwards through weapons
                this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
            }
            
            this.currentWeapon = this.weapons[this.weaponIndex];
            
            // Only play sound if weapon actually changed
            if (previousWeapon !== this.currentWeapon) {
                soundManager.play('powerup', { volume: 0.4, playbackRate: 1.5 });
                
                // Update weapon display in UI
                const weaponElement = document.getElementById('weapons');
                if (weaponElement) {
                    weaponElement.textContent = this.currentWeapon;
                }
                
                // Update weapon icon based on weapon type
                const weaponIcon = document.getElementById('weapon-icon');
                if (weaponIcon) {
                    switch(this.currentWeapon) {
                        case 'Basic Laser':
                            weaponIcon.innerHTML = '🔫';
                            break;
                        case 'Burst Cannon':
                            weaponIcon.innerHTML = '💥';
                            break;
                        case 'Seeker Missile':
                            weaponIcon.innerHTML = '🚀';
                            break;
                        default:
                            weaponIcon.innerHTML = '🔫';
                    }
                }
            }
        }

        // Here we update projectiles and remove those that exceed their range
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(deltaTime);
            
            // Remove projectiles that travel beyond their range
            if (this.projectiles[i].distanceTraveled > this.projectiles[i].range) {
                this.projectiles.splice(i, 1);
            }
        }

        // Here we reduce cooldown timers
        if (this.fireCooldown > 0) {
            this.fireCooldown -= deltaTime;
        }

        // Here we regenerate energy over time
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegen * deltaTime);
        }
        
        // Here we handle shield recharge after not taking damage for a while
        if (this.shieldCapacity > 0 && this.shield < this.shieldCapacity) {
            const now = Date.now() / 1000;
            if (now - this.lastDamageTime >= this.shieldRechargeDelay) {
                this.shield = Math.min(this.shieldCapacity, 
                    this.shield + this.shieldRechargeRate * deltaTime);
            }
        }
    }

    takeDamage(amount) {
        // Check if player is in safe zone - prevent all damage if they are
        if (window.game && window.game.world && window.game.world.isInSafeZone(this)) {
            // Show message about safe zone protection
            if (window.game.multiplayer) {
                window.game.multiplayer.showGameMessage('Safe Zone Protection Active', '#ffcc00');
            }
            return false; // No damage applied in safe zone
        }
        
        // Record time of damage for shield recharge delay
        this.lastDamageTime = Date.now() / 1000;
        
        // Here we apply damage reduction if any
        if (this.damageReduction) {
            amount = amount * (1 - this.damageReduction);
        }
        
        // Here we apply armor multiplier (lower armor value means less damage)
        amount = amount * this.armor;
        
        // Here we apply damage to shields first if they exist
        if (this.shield > 0) {
            if (this.shield >= amount) {
                // Shield absorbs all damage
                this.shield -= amount;
                amount = 0;
            } else {
                // Shield is depleted, remaining damage goes to hull
                amount -= this.shield;
                this.shield = 0;
            }
        }
        
        // Here we apply remaining damage to hull
        if (amount > 0) {
            this.health -= amount;
            
            // Health can't go below 0
            if (this.health < 0) {
                this.health = 0;
            }
            
            // Update the health display in the UI
            if (window.game && window.game.ui) {
                window.game.ui.updateHealthBar(this.health, this.maxHealth);
            }
        }
        
        return this.health <= 0; // Return true if player is destroyed
    }

    addCredits(amount) {
        // Here we add credits to player's account (from destroying asteroids, etc.)
        this.credits += amount;
    }

    fire(soundManager) {
        let projectiles = [];
        
        // Here we handle different weapon types
        switch (this.currentWeapon) {
            case 'Basic Laser':
                // Here we create a single straight laser projectile
                projectiles.push(new Projectile(
                    this.x, this.y,
                    this.rotation,
                    'laser',
                    10, // damage
                    800, // speed
                    600  // range
                 ));
                
                // Here we play the laser sound effect
                if (soundManager) {
                    soundManager.play('laser', { 
                        volume: 0.4,
                        position: { x: this.x, y: this.y } // Positional audio
                    });
                }
                break;
                
            case 'Burst Cannon':
                // Here we fire 3 projectiles in a spread pattern
                for (let i = -1; i <= 1; i++) {
                    projectiles.push(new Projectile(
                        this.x, this.y,
                        this.rotation + (i * 0.1), // Small angle offset for spread
                        'burst',
                        5, // Lower damage per projectile
                        700, // speed
                        400  // range
                    ));
                }
                
                // Here we play the burst cannon sound
                if (soundManager) {
                    soundManager.play('burst', { 
                        volume: 0.4,
                        position: { x: this.x, y: this.y }
                    });
                }
                break;
                
            case 'Seeker Missile':
                // Here we fire a single homing missile
                projectiles.push(new Projectile(
                    this.x, this.y,
                    this.rotation,
                    'missile',
                    20, // High damage
                    500, // Slower speed
                    1000, // Longer range
                    true  // Homing capability
                ));
                
                // Here we play the missile launch sound
                if (soundManager) {
                    soundManager.play('missile', { 
                        volume: 0.5,
                        position: { x: this.x, y: this.y }
                    });
                }
                break;
        }
        
        // Send projectile data to multiplayer system if it exists
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            projectiles.forEach(projectile => {
                window.game.multiplayer.sendProjectile(projectile);
            });
        }
        
        // Add the new projectiles to the player's active projectiles array
        this.projectiles.push(...projectiles);
    }

    render(ctx) {
        // Here we draw all active projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(ctx);
        });
        
        // Here we draw the player's ship
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Ship body - triangular shape rotated so tip points in direction of travel
        ctx.fillStyle = '#33f';
        ctx.beginPath();
        ctx.moveTo(0, -15); // front (points upward when rotation = 0)
        ctx.lineTo(-10, 10); // back left
        ctx.lineTo(0, 5); // back middle
        ctx.lineTo(10, 10); // back right
        ctx.closePath();
        ctx.fill();
        
        // Here we draw the engine glow effect
        ctx.fillStyle = '#f66';
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(-5, 12);
        ctx.lineTo(0, 15);
        ctx.lineTo(5, 12);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}