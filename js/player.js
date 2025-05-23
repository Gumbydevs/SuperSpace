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
        this.visible = true; // Whether to render the ship (false when destroyed)
        
        // Ship color - load from localStorage or use default blue
        this.shipColor = localStorage.getItem('playerShipColor') || '#33f';
        this.engineColor = localStorage.getItem('playerEngineColor') || '#f66';

        // Add collision properties
        this.collisionRadius = 15; // Radius used for collision detection
        this.collisionCooldown = 0; // Time remaining before next collision can occur
        this.collisionCooldownTime = 0.1; // Time between collision processing to prevent multiple hits
        this.bounceStrength = 0.5; // How strongly ships bounce off obstacles (0-1)

        // Here we define the player's health and defense stats
        this.maxHealth = 100;
        this.health = 100;
        this.armor = 1.0; // Damage multiplier (lower values mean better protection)
        this.damageReduction = 0; // Flat damage reduction percentage

        // Here we track the player's current ship and equipment
        this.currentShip = 'scout'; // Default starting ship
        this.currentWeaponId = 'laser'; // Track weapon by ID for shop integration

        // Here we define the player's economy and score
        // Load persisted credits from localStorage or default to 0
        this.credits = parseInt(localStorage.getItem('playerCredits') || 0);
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

        // Track the last player who damaged us
        this.lastDamageFrom = null;
        this.damageAttributionTimeout = null;
        this.deathTriggered = false;

        // Engine flame animation variables
        this.thrustLevel = 0; // Current visual size of engine flame (0-1)
        this.targetThrustLevel = 0; // Target size based on throttle input
        this.thrustTransitionSpeed = 2.0; // How quickly flame grows/shrinks
    }

    update(deltaTime, input, soundManager) {
        // Ensure input.keys is always an array to prevent "includes is not a function" error
        if (!input.keys || !Array.isArray(input.keys)) {
            input.keys = [];
        }
        
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

        // Update engine thrust animation level
        // Set target thrust level based on input
        if (input.keys.includes('ArrowUp') || (input.thrustAmount && input.thrustAmount > 0)) {
            this.targetThrustLevel = input.thrustAmount ? input.thrustAmount : 1.0;
        } else {
            this.targetThrustLevel = 0;
        }
        
        // Gradually transition current thrust level toward target
        if (this.thrustLevel < this.targetThrustLevel) {
            this.thrustLevel = Math.min(
                this.targetThrustLevel, 
                this.thrustLevel + (this.thrustTransitionSpeed * deltaTime)
            );
        } else if (this.thrustLevel > this.targetThrustLevel) {
            this.thrustLevel = Math.max(
                this.targetThrustLevel, 
                this.thrustLevel - (this.thrustTransitionSpeed * deltaTime)
            );
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

        // Reduce collision cooldown
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= deltaTime;
        }

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

        // Check for projectile collisions with remote players
        if (window.game && window.game.multiplayer && window.game.multiplayer.players) {
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                let hit = false;
                
                // Check against all remote players
                Object.values(window.game.multiplayer.players).forEach(remotePlayer => {
                    // Skip destroyed players
                    if (remotePlayer.destroyed || hit) return;
                    
                    const dx = projectile.x - remotePlayer.x;
                    const dy = projectile.y - remotePlayer.y;
                    const distSq = dx * dx + dy * dy;
                    
                    // Adjust collision radius if player has shield
                    const collisionRadius = remotePlayer.shield > 0 ? 25 : 15;
                    const collisionRadiusSq = collisionRadius * collisionRadius;
                    
                    // Check if projectile hit a remote player
                    if (distSq < collisionRadiusSq) {
                        // Check if remote player is in safe zone
                        if (window.game.world && !window.game.world.isInSafeZone(remotePlayer)) {
                            // Create explosion effect at point of impact for local visualization
                            if (window.game.world) {
                                // Create different visual effect based on whether hit shield or hull
                                if (remotePlayer.shield > 0) {
                                    // Shield hit effect - blue energy ripple
                                    this.createShieldHitEffect(
                                        projectile.x,
                                        projectile.y,
                                        remotePlayer.x,
                                        remotePlayer.y
                                    );
                                } else {
                                    // Normal hit effect
                                    window.game.world.createProjectileHitEffect(
                                        projectile.x,
                                        projectile.y,
                                        12 + projectile.damage * 0.3, // Size based on damage
                                        window.game.soundManager
                                    );
                                }
                            }
                            
                            // Send hit info to server
                            window.game.multiplayer.sendHit('player', remotePlayer.id, projectile.damage);
                            
                            // Also broadcast the hit effect to all clients
                            window.game.multiplayer.sendProjectileHit(
                                remotePlayer.id,
                                projectile.x,
                                projectile.y, 
                                projectile.damage
                            );
                            
                            // Show hit message
                            window.game.multiplayer.showGameMessage(`Hit ${remotePlayer.name}!`, '#4f4');
                            
                            // Record hit time for shield impact flash
                            remotePlayer.lastDamageTime = Date.now() / 1000;
                            
                            // Check if kill - Only trigger if remote player health will drop to 0 or below
                            if (remotePlayer.shield <= 0 && remotePlayer.health <= projectile.damage) {
                                // This hit will kill the player - announce it on all screens
                                // We use setTimeout to make sure the server has time to process the hit first
                                setTimeout(() => {
                                    // The kill will be announced through the multiplayer system's handleRemotePlayerDeath
                                    // which will then use the killAnnouncer
                                }, 50);
                            }
                            
                            hit = true;
                            this.projectiles.splice(i, 1); // Remove projectile
                        }
                    }
                });
                
                if (!hit) {
                    // Update projectile position and check range
                    projectile.update(deltaTime);
                    
                    // Remove projectiles that travel beyond their range
                    if (projectile.distanceTraveled > projectile.range) {
                        this.projectiles.splice(i, 1);
                    }
                }
            }
        } else {
            // Standard projectile update when not in multiplayer
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                this.projectiles[i].update(deltaTime);
                
                // Remove projectiles that travel beyond their range
                if (this.projectiles[i].distanceTraveled > this.projectiles[i].range) {
                    this.projectiles.splice(i, 1);
                }
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

        // Check if player is now dead
        if (this.health <= 0 && window.game) {
            // DIRECT EXPLOSION: Use our guaranteed method from the game class
            window.game.forcePlayerExplosion();
            
            // Set game state to dying
            window.game.gameState = 'dying';
            
            // Hide the player ship (after explosion is created)
            this.visible = false;
            this.deathTriggered = true;
            
            // Handle remote player notification if in multiplayer
            if (window.game.multiplayer && window.game.multiplayer.handleDeath) {
                window.game.multiplayer.handleDeath(this.lastDamageFrom);
            }
        } else {
            // Reset the death triggered flag if we're somehow resurrected
            this.deathTriggered = false;
        }
        
        return this.health <= 0; // Return true if player is destroyed
    }

    die() {
        // Set health to 0
        this.health = 0;
        
        // Make sure the world knows we're dying
        if (window.game) {
            window.game.gameState = 'dying';
        }
        
        // CRITICAL: Mark that death was triggered, but DON'T hide the ship yet!
        // We'll hide it after the explosion is created
        this.deathTriggered = true;
        
        // GUARANTEED EXPLOSION EFFECT - this will work 100% of the time
        if (window.game && window.game.world) {
            // Store player's position since we need it after the ship is hidden
            const playerX = this.x;
            const playerY = this.y;
            const playerRotation = this.rotation;
            
            // Play explosion sound FIRST to ensure audio feedback is immediate
            if (window.game.soundManager) {
                window.game.soundManager.play('explosion', {
                    volume: 0.9,
                    position: { x: playerX, y: playerY }
                });
            }
            
            // Add camera shake immediately for tactile feedback
            if (window.game.multiplayer) {
                window.game.multiplayer.addCameraShake(25);
            }
            
            // Create main explosion BEFORE hiding the ship
            window.game.world.createExplosion(
                playerX, 
                playerY, 
                35,  // Size of explosion
                null  // We already played the sound above
            );
            
            // IMPORTANT: NOW hide the ship AFTER the explosion has been created
            // This ensures the explosion gets drawn in the correct frame
            this.visible = false;
            
            // Create multiple secondary explosions for dramatic effect
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    if (window.game && window.game.world) {
                        const offsetX = (Math.random() - 0.5) * 30;
                        const offsetY = (Math.random() - 0.5) * 30;
                        window.game.world.createExplosion(
                            playerX + offsetX,
                            playerY + offsetY,
                            15 + Math.random() * 10,
                            null
                        );
                    }
                }, 100 + Math.random() * 300);
            }
            
            // Create debris pieces
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 30 + Math.random() * 120;
                const size = 1 + Math.random() * 3;
                
                // Create debris with mixed colors
                const colors = ['#33f', '#66f', '#f66', '#999'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                const debris = {
                    x: playerX + (Math.random() - 0.5) * 10,
                    y: playerY + (Math.random() - 0.5) * 10,
                    velocityX: Math.cos(angle) * speed,
                    velocityY: Math.sin(angle) * speed,
                    size: size,
                    color: color,
                    life: 1.0,
                    maxLife: 1.0 + Math.random() * 2.0,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 5,
                    update(deltaTime) {
                        // Move debris
                        this.x += this.velocityX * deltaTime;
                        this.y += this.velocityY * deltaTime;
                        // Decrease lifetime
                        this.life -= deltaTime / this.maxLife;
                        // Slow down over time
                        this.velocityX *= 0.99;
                        this.velocityY *= 0.99;
                        // Rotate debris
                        this.rotation += this.rotationSpeed * deltaTime;
                    }
                };
                
                window.game.world.particles.push(debris);
            }
        }
        
        // Handle remote player notification if in multiplayer
        if (window.game && window.game.multiplayer && window.game.multiplayer.handleDeath) {
            window.game.multiplayer.handleDeath(this.lastDamageFrom);
        }
    }

    recordDamageFrom(attackerId) {
        this.lastDamageFrom = attackerId;
        
        // Clear the attack attribution after a while (if they don't kill us)
        if (this.damageAttributionTimeout) {
            clearTimeout(this.damageAttributionTimeout);
        }
        
        this.damageAttributionTimeout = setTimeout(() => {
            this.lastDamageFrom = null;
        }, 5000); // 5 second attribution window
    }

    addCredits(amount) {
        // Here we add credits to player's account (from destroying asteroids, etc.)
        this.credits += amount;
        
        // Save credits to localStorage to persist between deaths
        localStorage.setItem('playerCredits', this.credits.toString());
        
        // Update UI display if available
        if (window.game && window.game.ui) {
            const creditsElement = document.getElementById('credits');
            if (creditsElement) {
                creditsElement.textContent = this.credits;
            }
        }
    }

    fire(soundManager) {
        let projectiles = [];
        
        // Get the weapon stats from the available weapons in shop
        let weaponStats = null;
        if (window.game && window.game.shop) {
            const weapon = window.game.shop.availableWeapons.find(w => w.name === this.currentWeapon);
            if (weapon) {
                weaponStats = weapon.stats;
            }
        }
        
        // Here we handle different weapon types based on the current weapon
        switch (this.currentWeapon) {
            case 'Basic Laser':
                // Here we create a single straight laser projectile
                projectiles.push(new Projectile(
                    this.x, this.y,
                    this.rotation,
                    'laser',
                    weaponStats ? weaponStats.damage : 10, // damage
                    weaponStats ? weaponStats.speed : 800, // speed
                    weaponStats ? weaponStats.range : 600  // range
                ));
                
                // Play laser sound
                if (soundManager) {
                    soundManager.play('laser', { 
                        volume: 0.4,
                        position: { x: this.x, y: this.y } // Positional audio
                    });
                }
                break;
                
            case 'Burst Cannon':
                // Fire 3 projectiles in a spread pattern
                const burstCount = weaponStats ? weaponStats.projectileCount : 3;
                const spreadAngle = 0.1; // Angle between projectiles
                
                for (let i = -(burstCount > 1 ? Math.floor(burstCount / 2) : 0); i <= (burstCount > 1 ? Math.floor((burstCount - 1) / 2) : 0); i++) {
                    projectiles.push(new Projectile(
                        this.x, this.y,
                        this.rotation + (i * spreadAngle), // Small angle offset for spread
                        'burst',
                        weaponStats ? weaponStats.damage : 5, // Lower damage per projectile
                        weaponStats ? weaponStats.speed : 700, // speed
                        weaponStats ? weaponStats.range : 400  // range
                    ));
                }
                
                // Play burst cannon sound
                if (soundManager) {
                    soundManager.play('burst', { 
                        volume: 0.4,
                        position: { x: this.x, y: this.y }
                    });
                }
                break;
                
            case 'Seeker Missile':
                // Fire a single homing missile
                projectiles.push(new Projectile(
                    this.x, this.y,
                    this.rotation,
                    'missile',
                    weaponStats ? weaponStats.damage : 20, // High damage
                    weaponStats ? weaponStats.speed : 500, // Slower speed
                    weaponStats ? weaponStats.range : 1000, // Longer range
                    true  // Homing capability
                ));
                
                // Play missile launch sound
                if (soundManager) {
                    soundManager.play('missile', { 
                        volume: 0.5,
                        position: { x: this.x, y: this.y }
                    });
                }
                break;
                
            case 'Plasma Cannon':
                // Fire a plasma projectile with splash damage
                const plasmaProj = new Projectile(
                    this.x, this.y,
                    this.rotation,
                    'plasma',
                    weaponStats ? weaponStats.damage : 25, // High damage
                    weaponStats ? weaponStats.speed : 600, // Medium speed
                    weaponStats ? weaponStats.range : 500, // Medium range
                    false, // Not homing
                    weaponStats ? weaponStats.splash : 30 // Splash radius
                );
                
                // Set plasma visual properties
                plasmaProj.color = '#f0f';
                plasmaProj.size = 8;
                plasmaProj.trail = true;
                plasmaProj.trailColor = '#a0f';
                
                projectiles.push(plasmaProj);
                
                // Play plasma sound
                if (soundManager) {
                    soundManager.play('plasma', { 
                        volume: 0.7,
                        position: { x: this.x, y: this.y }
                    });
                    
                    // If plasma sound doesn't exist, use a fallback sound
                    if (!soundManager.isSoundLoaded('plasma')) {
                        soundManager.play('laser', {
                            volume: 0.7,
                            playbackRate: 0.7,
                            position: { x: this.x, y: this.y }
                        });
                    }
                }
                break;
                
            case 'Quantum Disruptor':
                // Fire a quantum projectile that can phase through obstacles
                const quantumProj = new Projectile(
                    this.x, this.y,
                    this.rotation,
                    'quantum',
                    weaponStats ? weaponStats.damage : 30, // Very high damage
                    weaponStats ? weaponStats.speed : 900, // Fast speed
                    weaponStats ? weaponStats.range : 800, // Good range
                    false // Not homing
                );
                
                // Set quantum visual properties
                quantumProj.color = '#fff';
                quantumProj.phasing = true; // Allows passing through asteroids
                quantumProj.size = 6;
                quantumProj.glow = true; // Add glow effect
                quantumProj.trail = true;
                quantumProj.trailColor = '#0ff';
                
                projectiles.push(quantumProj);
                
                // Play quantum sound
                if (soundManager) {
                    soundManager.play('quantum', { 
                        volume: 0.6,
                        position: { x: this.x, y: this.y }
                    });
                    
                    // If quantum sound doesn't exist, use a fallback sound
                    if (!soundManager.isSoundLoaded('quantum')) {
                        soundManager.play('powerup', {
                            volume: 0.5,
                            playbackRate: 1.2,
                            position: { x: this.x, y: this.y }
                        });
                    }
                }
                break;
                
            default:
                // Fallback to basic laser if weapon not recognized
                projectiles.push(new Projectile(
                    this.x, this.y,
                    this.rotation,
                    'laser',
                    10, // damage
                    800, // speed
                    600  // range
                ));
                
                if (soundManager) {
                    soundManager.play('laser', { 
                        volume: 0.4,
                        position: { x: this.x, y: this.y }
                    });
                }
        }
        
        // Send projectile data to multiplayer system if it exists
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            projectiles.forEach(projectile => {
                window.game.multiplayer.sendProjectile(projectile);
            });
        }
        
        // Add the new projectiles to the player's active projectiles array
        this.projectiles.push(...projectiles);
        
        // Consume energy if energy system is active
        if (this.maxEnergy > 0 && weaponStats && weaponStats.energyCost) {
            this.energy = Math.max(0, this.energy - weaponStats.energyCost);
        }
    }

    render(ctx) {
        // Here we draw all active projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(ctx);
        });
        
        // Render remote projectiles from other players if multiplayer is active
        if (window.game && window.game.multiplayer && window.game.multiplayer.players) {
            // Iterate through all remote players
            Object.values(window.game.multiplayer.players).forEach(remotePlayer => {
                // Check if the remote player has projectiles
                if (remotePlayer.projectiles && Array.isArray(remotePlayer.projectiles)) {
                    // Render each projectile from this remote player
                    remotePlayer.projectiles.forEach(projectile => {
                        // Skip rendering if projectile is missing critical properties
                        if (projectile.x === undefined || projectile.y === undefined) return;
                        
                        // Save context state
                        ctx.save();
                        
                        // Determine projectile color based on type or default
                        let color = projectile.color || '#f00';
                        let size = 3;
                        
                        switch(projectile.type) {
                            case 'laser':
                                color = projectile.color || '#f33';
                                size = 3;
                                break;
                            case 'burst':
                                color = projectile.color || '#ff3';
                                size = 2;
                                break;
                            case 'missile':
                                color = projectile.color || '#3af';
                                size = 4;
                                break;
                            case 'plasma':
                                color = projectile.color || '#f0f';
                                size = 5;
                                break;
                            case 'quantum':
                                color = projectile.color || '#fff';
                                size = 3;
                                break;
                        }
                        
                        // Draw the projectile
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(projectile.x, projectile.y, size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Add glow effect for certain projectile types
                        if (['plasma', 'quantum', 'missile'].includes(projectile.type)) {
                            const glowSize = size * 2;
                            const gradient = ctx.createRadialGradient(
                                projectile.x, projectile.y, size/2,
                                projectile.x, projectile.y, glowSize
                            );
                            gradient.addColorStop(0, color);
                            gradient.addColorStop(1, 'rgba(0,0,0,0)');
                            
                            ctx.fillStyle = gradient;
                            ctx.beginPath();
                            ctx.arc(projectile.x, projectile.y, glowSize, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        // Restore context state
                        ctx.restore();
                        
                        // Update projectile position for next frame using its velocity
                        projectile.x += projectile.velocityX * (1/60); // Assume 60fps if no deltaTime
                        projectile.y += projectile.velocityY * (1/60);
                    });
                }
            });
        }
        
        // Here we draw the player's ship
        if (this.visible) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            // Draw shield effect when shields are active
            if (this.shield > 0) {
                // Create pulsing blue glow around ship based on shield percentage
                const shieldPercentage = this.shield / this.shieldCapacity;
                const glowSize = 25 + (shieldPercentage * 8); // Increased size for more visible shield
                const glowOpacity = 0.3 + (shieldPercentage * 0.4); // Higher opacity for better visibility
                
                // Create radial gradient for shield effect
                const shieldGradient = ctx.createRadialGradient(0, 0, glowSize * 0.3, 0, 0, glowSize);
                shieldGradient.addColorStop(0, `rgba(64, 160, 255, ${glowOpacity * 0.15})`); // Inner glow
                shieldGradient.addColorStop(0.6, `rgba(64, 160, 255, ${glowOpacity * 0.8})`); // Main shield glow
                shieldGradient.addColorStop(1, `rgba(32, 100, 255, 0)`); // Fade out at the edge
                
                // Draw the shield glow
                ctx.fillStyle = shieldGradient;
                ctx.beginPath();
                ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw multiple ripple rings with different timing
                const drawRipple = (phase, width, opacity) => {
                    const pulsePhase = (Date.now() % 2000) / 2000;
                    const adjustedPhase = (pulsePhase + phase) % 1;
                    if (adjustedPhase < 0.7) { // Only show ripple during part of the cycle
                        // Calculate ripple size based on pulse phase
                        const rippleSize = glowSize * (0.8 + adjustedPhase * 0.6);
                        const rippleOpacity = (0.7 - Math.abs(0.35 - adjustedPhase)) * opacity * shieldPercentage;
                        
                        // Draw ripple effect
                        ctx.strokeStyle = `rgba(120, 200, 255, ${rippleOpacity})`;
                        ctx.lineWidth = width;
                        ctx.beginPath();
                        ctx.arc(0, 0, rippleSize, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                };
                
                // Draw multiple ripples at different phases for a more dynamic effect
                drawRipple(0, 1.8, 0.5);
                drawRipple(0.3, 1.2, 0.4);
                drawRipple(0.6, 1.0, 0.3);
                
                // Extra effect: shield impact flashes when taking recent damage
                const timeSinceDamage = (Date.now() / 1000) - this.lastDamageTime;
                if (timeSinceDamage < 0.3) {
                    const flashOpacity = 0.7 * (1 - (timeSinceDamage / 0.3));
                    ctx.fillStyle = `rgba(200, 230, 255, ${flashOpacity})`;
                    ctx.beginPath();
                    ctx.arc(0, 0, glowSize * 0.9, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Draw different ship based on the currentShip property
            switch(this.currentShip) {
                case 'fighter':
                    // Enhanced fighter ship design
                    // Main body
                    ctx.fillStyle = this.shipColor;
                    ctx.beginPath();
                    ctx.moveTo(0, -22); // Front nose tip
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
                    ctx.fillStyle = '#333';
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
                    
                    // Dynamic engine flame based on thrust level
                    if (this.thrustLevel > 0) {
                        // Base engine flame shape grows with thrust level
                        ctx.fillStyle = this.engineColor;
                        ctx.beginPath();
                        ctx.moveTo(-7, 8);
                        ctx.lineTo(-4, 8 + (10 * this.thrustLevel)); // Left side extends with thrust
                        ctx.lineTo(0, 8 + (6 * this.thrustLevel)); // Center point
                        ctx.lineTo(4, 8 + (10 * this.thrustLevel)); // Right side extends with thrust
                        ctx.lineTo(7, 8);
                        ctx.closePath();
                        ctx.fill();
                        
                        // Engine glow effect - intensity increases with thrust
                        const engineGlowSize = 8 + (10 * this.thrustLevel);
                        const fighterEngineGradient = ctx.createRadialGradient(0, 12, 0, 0, 12, engineGlowSize);
                        fighterEngineGradient.addColorStop(0, this.engineColor);
                        fighterEngineGradient.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = fighterEngineGradient;
                        ctx.fillRect(-8, 10, 16, 8 + (12 * this.thrustLevel));
                        
                        // Add animated flickering for more realistic flame
                        if (this.thrustLevel > 0.7) {
                            const flickerIntensity = (Math.random() * 0.2) * this.thrustLevel;
                            ctx.globalAlpha = 0.5 * flickerIntensity;
                            ctx.beginPath();
                            ctx.arc(0, 12 + (8 * this.thrustLevel), 6 * this.thrustLevel, 0, Math.PI * 2);
                            ctx.fillStyle = '#fff';
                            ctx.fill();
                            ctx.globalAlpha = 1.0;
                        }
                    }
                    break;
                    
                case 'heavy':
                    // Enhanced heavy cruiser design
                    // Main body
                    ctx.fillStyle = this.shipColor;
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
                    
                    // Heavy armor plating
                    ctx.strokeStyle = 'rgba(60, 60, 60, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-10, -15);
                    ctx.lineTo(-15, -5);
                    ctx.moveTo(10, -15);
                    ctx.lineTo(15, -5);
                    ctx.moveTo(-10, -5);
                    ctx.lineTo(10, -5);
                    ctx.stroke();
                    
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
                    
                    // Weapon barrels
                    ctx.fillStyle = '#333';
                    ctx.beginPath();
                    ctx.rect(-20, -1, 12, 2);
                    ctx.rect(8, -1, 12, 2);
                    ctx.fill();
                    
                    // Dynamic dual engine flames based on thrust level
                    if (this.thrustLevel > 0) {
                        ctx.fillStyle = this.engineColor;
                        
                        // Left engine
                        ctx.beginPath();
                        ctx.moveTo(-10, 18);
                        ctx.lineTo(-14, 18 + (10 * this.thrustLevel));
                        ctx.lineTo(-8, 18 + (8 * this.thrustLevel));
                        ctx.closePath();
                        ctx.fill();
                        
                        // Right engine
                        ctx.beginPath();
                        ctx.moveTo(10, 18);
                        ctx.lineTo(14, 18 + (10 * this.thrustLevel)); 
                        ctx.lineTo(8, 18 + (8 * this.thrustLevel));
                        ctx.closePath();
                        ctx.fill();
                        
                        // Engine glow effects - intensity increases with thrust
                        const engineGlowSize = 6 + (8 * this.thrustLevel);
                        
                        // Left engine glow
                        const leftEngineGlow = ctx.createRadialGradient(-10, 22, 0, -10, 22, engineGlowSize);
                        leftEngineGlow.addColorStop(0, this.engineColor);
                        leftEngineGlow.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = leftEngineGlow;
                        ctx.fillRect(-16, 20, 12, 6 + (10 * this.thrustLevel));
                        
                        // Right engine glow
                        const rightEngineGlow = ctx.createRadialGradient(10, 22, 0, 10, 22, engineGlowSize);
                        rightEngineGlow.addColorStop(0, this.engineColor);
                        rightEngineGlow.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = rightEngineGlow;
                        ctx.fillRect(4, 20, 12, 6 + (10 * this.thrustLevel));
                        
                        // Add animated flickering for more realistic flame
                        if (this.thrustLevel > 0.6) {
                            // Left engine flicker
                            const leftFlickerIntensity = (Math.random() * 0.3) * this.thrustLevel;
                            ctx.globalAlpha = 0.5 * leftFlickerIntensity;
                            ctx.beginPath();
                            ctx.arc(-10, 22 + (6 * this.thrustLevel), 4 * this.thrustLevel, 0, Math.PI * 2);
                            ctx.fillStyle = '#fff';
                            ctx.fill();
                            
                            // Right engine flicker
                            const rightFlickerIntensity = (Math.random() * 0.3) * this.thrustLevel;
                            ctx.globalAlpha = 0.5 * rightFlickerIntensity;
                            ctx.beginPath();
                            ctx.arc(10, 22 + (6 * this.thrustLevel), 4 * this.thrustLevel, 0, Math.PI * 2);
                            ctx.fillStyle = '#fff';
                            ctx.fill();
                            ctx.globalAlpha = 1.0;
                        }
                    }
                    break;
                    
                case 'stealth':
                    // Stealth ship design - sleek and angular
                    ctx.fillStyle = this.shipColor;
                    ctx.beginPath();
                    ctx.moveTo(0, -20); // Nose tip
                    ctx.lineTo(-3, -15); // Narrow front section
                    ctx.lineTo(-15, -5); // Left wing edge
                    ctx.lineTo(-8, 5); // Left mid-wing
                    ctx.lineTo(-12, 15); // Left wing extension
                    ctx.lineTo(-5, 12); // Left engine
                    ctx.lineTo(0, 10); // Center
                    ctx.lineTo(5, 12); // Right engine
                    ctx.lineTo(12, 15); // Right wing extension
                    ctx.lineTo(8, 5); // Right mid-wing
                    ctx.lineTo(15, -5); // Right wing edge
                    ctx.lineTo(3, -15); // Narrow front section
                    ctx.closePath();
                    ctx.fill();
                    
                    // Stealth panels with subtle gradient
                    const stealthGradient = ctx.createLinearGradient(0, -15, 0, 15);
                    stealthGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
                    stealthGradient.addColorStop(0.5, 'rgba(40, 40, 50, 0.5)');
                    stealthGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
                    
                    ctx.fillStyle = stealthGradient;
                    ctx.beginPath();
                    ctx.moveTo(-10, -3);
                    ctx.lineTo(-6, 0);
                    ctx.lineTo(-8, 8);
                    ctx.lineTo(-12, 12);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(10, -3);
                    ctx.lineTo(6, 0);
                    ctx.lineTo(8, 8);
                    ctx.lineTo(12, 12);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Cockpit - tinted dark
                    ctx.fillStyle = 'rgba(30, 50, 80, 0.8)';
                    ctx.beginPath();
                    ctx.ellipse(0, -8, 2, 6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Stealth engines have subtle glow that intensifies with thrust
                    if (this.thrustLevel > 0) {
                        // More transparent for stealth ship
                        ctx.globalAlpha = 0.3 + (0.4 * this.thrustLevel);
                        ctx.fillStyle = this.engineColor;
                        
                        // Engine flame shape
                        ctx.beginPath();
                        ctx.moveTo(-5, 12);
                        ctx.lineTo(-3, 12 + (8 * this.thrustLevel));
                        ctx.lineTo(0, 12 + (4 * this.thrustLevel));
                        ctx.lineTo(3, 12 + (8 * this.thrustLevel));
                        ctx.lineTo(5, 12);
                        ctx.closePath();
                        ctx.fill();
                        
                        // Add subtle pulsing effect unique to stealth engines
                        const pulseIntensity = (Math.sin(Date.now() / 200) * 0.2 + 0.8) * this.thrustLevel;
                        ctx.globalAlpha = 0.2 * pulseIntensity;
                        ctx.beginPath();
                        ctx.arc(0, 14 + (4 * this.thrustLevel), 4 * this.thrustLevel, 0, Math.PI * 2);
                        ctx.fillStyle = this.engineColor;
                        ctx.fill();
                        
                        ctx.globalAlpha = 1.0;
                    }
                    break;
                    
                default: // 'scout' as default
                    // Default scout ship design - modernized
                    ctx.fillStyle = this.shipColor;
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
                    
                    // Dynamic engine flame based on thrust level
                    if (this.thrustLevel > 0) {
                        ctx.fillStyle = this.engineColor;
                        ctx.beginPath();
                        ctx.moveTo(-5, 5);
                        ctx.lineTo(-3, 5 + (9 * this.thrustLevel)); // Left flame point
                        ctx.lineTo(0, 5 + (5 * this.thrustLevel)); // Center flame
                        ctx.lineTo(3, 5 + (9 * this.thrustLevel)); // Right flame point
                        ctx.lineTo(5, 5);
                        ctx.closePath();
                        ctx.fill();
                        
                        // Add engine glow effect - size based on thrust level
                        const engineGlowSize = 4 + (7 * this.thrustLevel);
                        const engineGradient = ctx.createRadialGradient(0, 9, 0, 0, 9, engineGlowSize);
                        engineGradient.addColorStop(0, this.engineColor);
                        engineGradient.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = engineGradient;
                        ctx.beginPath();
                        ctx.ellipse(0, 9 + (3 * this.thrustLevel), 5 * this.thrustLevel, 6 * this.thrustLevel, 0, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Add subtle flame variations when at high thrust
                        if (this.thrustLevel > 0.5) {
                            const flicker = Math.random() * 0.3 * this.thrustLevel;
                            ctx.globalAlpha = 0.3 * flicker;
                            ctx.fillStyle = '#fff';
                            ctx.beginPath();
                            ctx.arc(0, 9 + (3 * this.thrustLevel), 2 * this.thrustLevel, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1.0;
                        }
                    }
            }
            
            // Draw upgrade attachments based on purchased upgrades
            // We can access the shop system through the global game object
            if (window.game && window.game.shop) {
                const shop = window.game.shop;
                
                // Check for weapon upgrades
                if (this.currentWeaponId) {
                    // Different weapon mounts based on weapon type
                    switch(this.currentWeaponId) {
                        case 'laser':
                            // Basic laser - small single mount
                            ctx.fillStyle = '#555';
                            ctx.fillRect(-2, -10, 4, 4);
                            break;
                            
                        case 'dual_laser':
                            // Dual lasers - two small mounts
                            ctx.fillStyle = '#555';
                            ctx.fillRect(-6, -8, 3, 4);
                            ctx.fillRect(3, -8, 3, 4);
                            break;
                            
                        case 'burst':
                            // Burst cannon - wider single mount
                            ctx.fillStyle = '#555';
                            ctx.fillRect(-4, -8, 8, 5);
                            // Barrel detail
                            ctx.fillStyle = '#333';
                            ctx.fillRect(-3, -12, 6, 4);
                            break;
                            
                        case 'missile':
                            // Missile launchers on wing tips
                            ctx.fillStyle = '#444';
                            // Missile pods
                            if (this.currentShip === 'heavy' || this.currentShip === 'cruiser') {
                                // Heavy ships have bigger wing-mounted missile pods
                                ctx.fillRect(-25, -3, 6, 6);
                                ctx.fillRect(19, -3, 6, 6);
                            } else {
                                // Smaller ships have smaller pods on wings
                                ctx.fillRect(-12, -3, 4, 4);
                                ctx.fillRect(8, -3, 4, 4);
                            }
                            break;
                    }
                }
                
                // Check for engine upgrades
                const engineUpgrade = shop.availableUpgrades.find(u => u.id === 'engine');
                if (engineUpgrade && engineUpgrade.level > 0) {
                    // Enhanced engine exhaust
                    ctx.globalAlpha = 0.7;
                    const engineLevelGlow = ctx.createRadialGradient(0, 15, 0, 0, 15, 10 + (engineUpgrade.level * 5));
                    engineLevelGlow.addColorStop(0, this.engineColor);
                    engineLevelGlow.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = engineLevelGlow;
                    
                    if (this.currentShip === 'heavy') {
                        // Dual engine trails
                        ctx.fillRect(-16, 18, 12, 15 + engineUpgrade.level * 5);
                        ctx.fillRect(4, 18, 12, 15 + engineUpgrade.level * 5);
                    } else {
                        // Single engine trail
                        ctx.fillRect(-8, 12, 16, 15 + engineUpgrade.level * 5);
                    }
                    ctx.globalAlpha = 1.0;
                }
                
                // Check for armor upgrades
                const armorUpgrade = shop.availableUpgrades.find(u => u.id === 'armor');
                if (armorUpgrade && armorUpgrade.level > 0) {
                    // Armor plating visualization
                    ctx.strokeStyle = '#555';
                    ctx.lineWidth = 1 + armorUpgrade.level * 0.5;
                    
                    if (this.currentShip === 'heavy') {
                        // Heavy ship gets thicker hull lines
                        ctx.beginPath();
                        ctx.moveTo(-12, -15);
                        ctx.lineTo(-15, -5);
                        ctx.lineTo(-25, 0);
                        ctx.moveTo(12, -15);
                        ctx.lineTo(15, -5);
                        ctx.lineTo(25, 0);
                        ctx.stroke();
                    } else if (this.currentShip === 'fighter') {
                        // Fighter gets reinforced wings
                        ctx.beginPath();
                        ctx.moveTo(-5, -15);
                        ctx.lineTo(-18, -5);
                        ctx.lineTo(-12, 0);
                        ctx.moveTo(5, -15);
                        ctx.lineTo(18, -5);
                        ctx.lineTo(12, 0);
                        ctx.stroke();
                    } else {
                        // Default outline reinforcement
                        ctx.beginPath();
                        ctx.moveTo(0, -15);
                        ctx.lineTo(-12, 0);
                        ctx.lineTo(-8, 8);
                        ctx.lineTo(0, 7);
                        ctx.lineTo(8, 8);
                        ctx.lineTo(12, 0);
                        ctx.closePath();
                        ctx.stroke();
                    }
                }
                
                // Check for cargo upgrades
                const cargoUpgrade = shop.availableUpgrades.find(u => u.id === 'cargo');
                if (cargoUpgrade && cargoUpgrade.level > 0) {
                    // Add cargo pods
                    ctx.fillStyle = '#777';
                    
                    if (this.currentShip === 'heavy') {
                        // Heavy ship gets large central cargo bay
                        ctx.fillRect(-8, 0, 16, 10);
                    } else if (this.currentShip === 'fighter') {
                        // Fighter gets wing-mounted pods
                        ctx.fillRect(-15, 2, 6, 6);
                        ctx.fillRect(9, 2, 6, 6);
                    } else {
                        // Default gets small rear cargo pod
                        ctx.fillRect(-4, 3, 8, 5);
                    }
                }
            }
            
            ctx.restore();
        }
    }
    
    // New method to set ship color and save it to localStorage
    setShipColor(color) {
        this.shipColor = color;
        localStorage.setItem('playerShipColor', color);
        
        // If in multiplayer, notify others of the color change
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            window.game.multiplayer.sendShipColorUpdate(color);
        }
    }
    
    // New method to set engine color and save it to localStorage
    setEngineColor(color) {
        this.engineColor = color;
        localStorage.setItem('playerEngineColor', color);
        
        // If in multiplayer, notify others of the color change
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            window.game.multiplayer.sendEngineColorUpdate(color);
        }
    }

    // Add method to handle collisions with asteroids
    handleAsteroidCollision(asteroid, soundManager) {
        if (this.collisionCooldown <= 0) {
            // Calculate collision vector from asteroid center to player
            const dx = this.x - asteroid.x;
            const dy = this.y - asteroid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize collision vector
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Calculate relative velocity
            const relVelX = this.velocity.x;
            const relVelY = this.velocity.y;
            
            // Calculate impact force
            const impactForce = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
            
            // Calculate impulse (how strongly we bounce)
            const impulseStrength = (1 + this.bounceStrength) * impactForce * 0.5;
            
            // Apply impulse in the direction away from collision
            this.velocity.x = nx * impulseStrength;
            this.velocity.y = ny * impulseStrength;
            
            // Create visual impact effect at the collision point
            if (window.game && window.game.world) {
                // Calculate impact position at the collision point
                const impactX = asteroid.x + nx * asteroid.radius;
                const impactY = asteroid.y + ny * asteroid.radius;
                
                // Create basic collision effect for all impacts
                window.game.world.createCollisionEffect(impactX, impactY);
                
                // For high-velocity impacts, create a more dramatic effect
                if (impactForce > 150) {
                    // Create a small explosion based on impact force
                    const explosionSize = Math.min(25, 10 + impactForce * 0.1);
                    window.game.world.createExplosion(
                        impactX, 
                        impactY,
                        explosionSize,
                        soundManager
                    );
                    
                    // Add camera shake proportional to impact force
                    if (window.game.multiplayer) {
                        window.game.multiplayer.addCameraShake(Math.min(15, impactForce * 0.05));
                    }
                }
            }
            
            // Play collision sound
            if (soundManager) {
                soundManager.play('hit', {
                    volume: Math.min(0.8, 0.3 + (impactForce * 0.001)),
                    playbackRate: 0.7,
                    position: { x: this.x, y: this.y }
                });
                
                // For really hard impacts, also play a crash sound
                if (impactForce > 200) {
                    soundManager.play('explosion', {
                        volume: Math.min(0.5, impactForce * 0.001),
                        playbackRate: 1.2,
                        position: { x: this.x, y: this.y }
                    });
                }
            }
            
            // Calculate damage based on impact force
            const damageFactor = 0.1; // Controls how much damage is taken per unit of speed
            const damage = Math.max(5, impactForce * damageFactor);
            
            // Apply damage to health
            this.health -= damage;
            
            // Update the health display in the UI
            if (window.game && window.game.ui) {
                window.game.ui.updateHealthBar(this.health, this.maxHealth);
            }
            
            // Check if player is now dead (health <= 0)
            if (this.health <= 0) {
                // THIS IS THE KEY CHANGE: Use our guaranteed explosion method
                if (window.game) {
                    // Use our direct explosion method instead of regular die()
                    window.game.forcePlayerExplosion();
                    
                    // Set game state to dying
                    window.game.gameState = 'dying';
                    
                    // Hide the player ship
                    this.visible = false;
                    
                    // Mark death as triggered
                    this.deathTriggered = true;
                    
                    // Notify multiplayer if available
                    if (window.game.multiplayer && window.game.multiplayer.handleDeath) {
                        window.game.multiplayer.handleDeath(this.lastDamageFrom);
                    }
                }
            }
            
            // Set cooldown to prevent multiple collisions
            this.collisionCooldown = this.collisionCooldownTime;
            
            return true; // Collision occurred
        }
        
        return false; // No new collision
    }
    
    // Add method to handle collisions with other players
    handlePlayerCollision(otherPlayer, soundManager) {
        if (this.collisionCooldown <= 0) {
            // Calculate collision vector between players
            const dx = this.x - otherPlayer.x;
            const dy = this.y - otherPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize collision vector
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Calculate relative velocity
            const relVelX = this.velocity.x - otherPlayer.velocity.x;
            const relVelY = this.velocity.y - otherPlayer.velocity.y;
            
            // Calculate impulse (how strongly we bounce)
            const impulseStrength = (1 + this.bounceStrength) * Math.sqrt(relVelX * relVelX + relVelY * relVelY) * 0.5;
            
            // Apply impulse in the direction away from collision
            this.velocity.x += nx * impulseStrength * 0.5;
            this.velocity.y += ny * impulseStrength * 0.5;
            
            // Take minimal damage from player collision
            const impactForce = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
            if (impactForce > 200) { // Only deal damage for high-speed collisions
                const damageFactor = 0.05; // Less damage for player-player collisions
                const damage = Math.max(1, impactForce * damageFactor);
                this.takeDamage(damage);
            }
            
            // Play collision sound
            if (soundManager) {
                soundManager.play('hit', {
                    volume: 0.4,
                    playbackRate: 1.2,
                    position: { x: this.x, y: this.y }
                });
            }
            
            // Create visual impact effect
            if (window.game && window.game.world) {
                const impactX = this.x - nx * this.collisionRadius / 2;
                const impactY = this.y - ny * this.collisionRadius / 2;
                window.game.world.createCollisionEffect(impactX, impactY);
            }
            
            // Set cooldown to prevent multiple collisions
            this.collisionCooldown = this.collisionCooldownTime;
            
            return true; // Collision occurred
        }
        
        return false; // No new collision
    }

    // Create shield hit effect when projectiles hit shields
    createShieldHitEffect(hitX, hitY, playerX, playerY) {
        if (!window.game || !window.game.world) return;
        
        // Calculate hit direction vector relative to player center
        const dx = hitX - playerX;
        const dy = hitY - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize the hit direction
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate impact point on shield perimeter
        const shieldRadius = 25; // Match the collision radius used for shields
        const impactX = playerX + nx * shieldRadius;
        const impactY = playerY + ny * shieldRadius;
        
        // Create shield impact ripple effect
        for (let i = 0; i < 2; i++) { // Create multiple ripples for a better effect
            const delay = i * 50; // Stagger ripple timings
            
            setTimeout(() => {
                if (!window.game || !window.game.world) return;
                
                // Create expanding ripple 
                const ripple = {
                    x: impactX,
                    y: impactY,
                    radius: 5, // Starting radius
                    maxRadius: 30 + Math.random() * 10,
                    thickness: 2 - (i * 0.5), // First ripple thicker
                    opacity: 1.0,
                    growth: 60 + Math.random() * 40, // Speed of expansion
                    playerX: playerX, // Store reference to player position
                    playerY: playerY,
                    life: 1.0,
                    color: 'rgba(100, 180, 255', // Shield blue color
                    
                    update(deltaTime) {
                        // Expand the radius
                        this.radius += this.growth * deltaTime;
                        
                        // Reduce opacity as it expands
                        this.opacity = Math.max(0, 1.0 - (this.radius / this.maxRadius));
                        
                        // Set life based on radius
                        this.life = Math.max(0, 1.0 - (this.radius / this.maxRadius));
                    },
                    
                    render(ctx) {
                        ctx.save();
                        ctx.strokeStyle = `${this.color}, ${this.opacity})`;
                        ctx.lineWidth = this.thickness;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                };
                
                // Add ripple to world particle system
                window.game.world.particles.push(ripple);
            }, delay);
        }
        
        // Create shield impact flash - a quickly fading bright spot
        const flash = {
            x: impactX,
            y: impactY, 
            radius: 8,
            opacity: 0.8,
            life: 1.0,
            duration: 0.2, // Short duration
            
            update(deltaTime) {
                this.life -= deltaTime / this.duration;
                this.opacity = Math.max(0, this.life);
            },
            
            render(ctx) {
                ctx.save();
                // Gradient for a nicer glow effect
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.radius
                );
                gradient.addColorStop(0, `rgba(200, 230, 255, ${this.opacity})`);
                gradient.addColorStop(1, `rgba(100, 180, 255, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };
        
        // Add flash to world particle system
        window.game.world.particles.push(flash);
        
        // Play shield impact sound
        if (window.game.soundManager) {
            window.game.soundManager.play('hit', {
                volume: 0.3,
                playbackRate: 1.5, // Higher pitch for shield hit
                position: { x: impactX, y: impactY }
            });
        }
    }
}