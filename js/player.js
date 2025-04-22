import { Projectile } from './projectile.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.rotation = 0; // in radians
        this.speed = 0;
        this.maxSpeed = 400; // increased for better top speed
        this.acceleration = 300; // reduced slightly for more gradual acceleration
        this.rotationSpeed = 4.0; // slightly reduced for more realistic turning
        this.friction = 0.998; // dramatically reduced friction for space-like movement
        this.braking = false; // new property to track if player is braking
        this.brakePower = 0.95; // braking effectiveness
        this.width = 30;
        this.height = 30;
        this.velocity = { x: 0, y: 0 };

        // Stats
        this.maxHealth = 100;
        this.health = 100;
        this.armor = 1.0; // Damage multiplier (lower is better)
        this.damageReduction = 0;

        // Ship and equipment tracking
        this.currentShip = 'scout'; // Default starting ship
        this.currentWeaponId = 'laser'; // Track weapon by ID for shop integration

        // Credits and score
        this.credits = 0; // Currency for purchasing ships and upgrades
        this.score = 0;   // Points for game score

        // Weapon systems
        this.weapons = ['Basic Laser', 'Burst Cannon', 'Seeker Missile'];
        this.currentWeapon = this.weapons[0];
        this.weaponIndex = 0;
        this.projectiles = [];
        this.fireCooldown = 0;
        this.fireCooldownTime = 0.20; // decreased from 0.25 for faster firing

        // Energy system (optional until upgraded)
        this.maxEnergy = 100;
        this.energy = 100;
        this.energyRegen = 5; // Energy per second

        // Shield system (requires upgrade)
        this.shieldCapacity = 0;
        this.shield = 0;
        this.shieldRechargeRate = 10; // Shield points per second when not taking damage
        this.shieldRechargeDelay = 3; // Seconds to wait after damage before recharging
        this.lastDamageTime = 0;

        // Cargo system
        this.cargoCapacity = 100;
        this.cargo = 0; // Resource units collected
    }

    update(deltaTime, input, soundManager) {
        // Rotation
        if (input.includes('ArrowLeft')) {
            this.rotation -= this.rotationSpeed * deltaTime;
        }
        if (input.includes('ArrowRight')) {
            this.rotation += this.rotationSpeed * deltaTime;
        }

        // Wrap rotation to stay between 0 and 2π
        this.rotation = this.rotation % (Math.PI * 2);
        if (this.rotation < 0) this.rotation += Math.PI * 2;

        // Thrust
        if (input.includes('ArrowUp')) {
            // Calculate acceleration components based on ship's rotation
            const accelerationX = Math.sin(this.rotation) * this.acceleration * deltaTime;
            const accelerationY = -Math.cos(this.rotation) * this.acceleration * deltaTime;
            
            // Apply acceleration to velocity
            this.velocity.x += accelerationX;
            this.velocity.y += accelerationY;
        }

        // Check if player is braking (using down arrow)
        this.braking = input.includes('ArrowDown');

        // Apply appropriate physics based on braking or coasting
        if (this.braking) {
            // Apply stronger deceleration when braking
            this.velocity.x *= this.brakePower;
            this.velocity.y *= this.brakePower;
        } else {
            // Apply minimal friction when coasting (near-zero in space)
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
        }
        
        // Cap velocity to max speed
        const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (currentSpeed > this.maxSpeed) {
            const ratio = this.maxSpeed / currentSpeed;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
        }

        // Update position based on velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;

        // Weapon shooting
        if (input.includes('Space') && this.fireCooldown <= 0) {
            this.fire(soundManager);
            this.fireCooldown = this.fireCooldownTime;
        }

        // Weapon switching with sound effect
        if ((input.includes('KeyQ') || input.includes('KeyE')) && soundManager) {
            const previousWeapon = this.currentWeapon;
            
            if (input.includes('KeyQ')) {
                this.weaponIndex = (this.weaponIndex - 1 + this.weapons.length) % this.weapons.length;
            } else {
                this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
            }
            
            this.currentWeapon = this.weapons[this.weaponIndex];
            
            // Only play sound if weapon actually changed
            if (previousWeapon !== this.currentWeapon) {
                soundManager.play('powerup', { volume: 0.4, playbackRate: 1.5 });
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(deltaTime);
            
            // Remove projectiles that travel beyond their range
            if (this.projectiles[i].distanceTraveled > this.projectiles[i].range) {
                this.projectiles.splice(i, 1);
            }
        }

        // Reduce cooldowns
        if (this.fireCooldown > 0) {
            this.fireCooldown -= deltaTime;
        }

        // Regenerate energy
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegen * deltaTime);
        }
        
        // Shield recharge logic
        if (this.shieldCapacity > 0 && this.shield < this.shieldCapacity) {
            const now = Date.now() / 1000;
            if (now - this.lastDamageTime >= this.shieldRechargeDelay) {
                this.shield = Math.min(this.shieldCapacity, 
                    this.shield + this.shieldRechargeRate * deltaTime);
            }
        }
    }

    takeDamage(amount) {
        // Record time of damage for shield recharge delay
        this.lastDamageTime = Date.now() / 1000;
        
        // Apply damage reduction if any
        if (this.damageReduction) {
            amount = amount * (1 - this.damageReduction);
        }
        
        // Apply armor multiplier
        amount = amount * this.armor;
        
        // First apply damage to shields if they exist
        if (this.shield > 0) {
            if (this.shield >= amount) {
                this.shield -= amount;
                amount = 0;
            } else {
                amount -= this.shield;
                this.shield = 0;
            }
        }
        
        // Apply remaining damage to hull
        if (amount > 0) {
            this.health -= amount;
            
            // Health can't go below 0
            if (this.health < 0) {
                this.health = 0;
            }
        }
        
        return this.health <= 0; // Return true if player is destroyed
    }

    addCredits(amount) {
        this.credits += amount;
    }

    fire(soundManager) {
        let projectiles = [];
        
        switch (this.currentWeapon) {
            case 'Basic Laser':
                projectiles.push(new Projectile(
                    this.x, this.y,
                    this.rotation,
                    'laser',
                    10, // damage
                    800, // speed
                    600  // range
                 ));
                
                // Play laser sound
                if (soundManager) {
                    soundManager.play('laser', { 
                        volume: 0.4,
                        position: { x: this.x, y: this.y }
                    });
                }
                break;
                
            case 'Burst Cannon':
                // Fire 3 projectiles in a burst
                for (let i = -1; i <= 1; i++) {
                    projectiles.push(new Projectile(
                        this.x, this.y,
                        this.rotation + (i * 0.1),
                        'burst',
                        5, // damage
                        700, // speed
                        400  // range
                    ));
                }
                
                // Play burst sound
                if (soundManager) {
                    soundManager.play('burst', { 
                        volume: 0.4,
                        position: { x: this.x, y: this.y }
                    });
                }
                break;
                
            case 'Seeker Missile':
                projectiles.push(new Projectile(
                    this.x, this.y,
                    this.rotation,
                    'missile',
                    20, // damage
                    500, // speed
                    1000, // range
                    true  // homing
                ));
                
                // Play missile sound
                if (soundManager) {
                    soundManager.play('missile', { 
                        volume: 0.5,
                        position: { x: this.x, y: this.y }
                    });
                }
                break;
        }
        
        this.projectiles.push(...projectiles);
    }

    render(ctx) {
        // Draw projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(ctx);
        });
        
        // Draw ship
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Ship body - rotated 90 degrees counter-clockwise
        ctx.fillStyle = '#33f';
        ctx.beginPath();
        ctx.moveTo(0, -15); // front (now points upward)
        ctx.lineTo(-10, 10); // back left
        ctx.lineTo(0, 5); // back middle
        ctx.lineTo(10, 10); // back right
        ctx.closePath();
        ctx.fill();
        
        // Engine glow - also rotated
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