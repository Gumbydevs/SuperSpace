export class Projectile {
    constructor(x, y, angle, type, damage, speed, range, homing = false, splashRadius = 0, explosionRadius = 0, explosionDamage = 0, minDetonationRange = 0, maxDetonationRange = 0, shieldDisruption = false, disruptionDuration = 0) {
    // For seeker missile logic
    this.hasHomed = false; // Only curve once
    this.homingMinDistance = 60; // Must travel at least 60px before homing
        // Here we set the projectile's starting position
        this.x = x;
        this.y = y;
        // Here we set the direction the projectile travels
        this.angle = angle;
        // Here we define the type of projectile (laser, burst, missile, plasma, quantum, rocket)
        this.type = type;
        // Here we set the damage this projectile does when hitting targets
        this.damage = damage;
        // Here we define how fast the projectile moves
        this.speed = speed;
        // Here we set the maximum distance the projectile can travel before disappearing
        this.range = range;
        // Here we define if the projectile has homing capabilities (for missiles)
        this.homing = homing;
        // Here we track how far the projectile has traveled
        this.distanceTraveled = 0;
        // Here we calculate the velocity vector based on angle and speed
        this.velocity = {
            x: Math.sin(angle) * speed,
            y: -Math.cos(angle) * speed
        };
        // New properties for advanced projectile types
        this.splashRadius = splashRadius; // For plasma cannon
        this.explosionRadius = explosionRadius; // For rocket launcher
        this.explosionDamage = explosionDamage; // Explosion damage for rockets
        this.minDetonationRange = minDetonationRange; // Minimum distance before mortar can explode
        this.maxDetonationRange = maxDetonationRange; // Maximum distance before forced detonation
        this.shieldDisruption = shieldDisruption; // For quantum disruptor shield disable
        this.disruptionDuration = disruptionDuration; // How long shields stay disabled
        this.phasing = false; // For quantum disruptor to pass through obstacles
        this.glow = false; // Visual effect for some projectiles
        this.trail = false; // Whether to leave a trail
        this.trailColor = null; // Color of the trail if enabled
        this.size = null; // Custom size value for specific projectiles
        this.trailParticles = []; // Stores trail particle data
        this.explosive = false; // Whether projectile explodes on impact
        this.hasExploded = false; // Track if projectile has already exploded
        
        // Here we define visual properties based on projectile type
        switch (type) {
            case 'laser':
                // Thin, bright laser beam
                this.width = 3;
                this.height = 12;
                this.color = '#0ff';  // Cyan color
                break;
            case 'burst':
                // Small, fast bullet
                this.width = 2;
                this.height = 8;
                this.color = '#ff0';  // Yellow color
                break;
            case 'missile':
                // Larger, slower missile
                this.width = 4;
                this.height = 10;
                this.color = '#f00';  // Red color
                this.trail = true;
                this.trailColor = '#ff8';
                // Make missile slower
                this.speed = speed * 0.55;
                // Always launch forward (in the direction of angle)
                this.velocity = {
                    x: Math.sin(angle) * this.speed,
                    y: -Math.cos(angle) * this.speed
                };
                break;
            case 'plasma':
                // Glowing plasma projectile
                this.width = 6;
                this.height = 6;
                this.color = '#f0f';  // Magenta color
                this.glow = true;
                break;
            case 'quantum':
                // Advanced quantum projectile
                this.width = 4;
                this.height = 4;
                this.color = '#fff';  // White color with glow
                this.glow = true;
                this.phasing = true;
                break;
            case 'rocket':
                // Explosive mortar shell projectile - short and stubby
                this.width = 8;
                this.height = 6;
                this.color = '#ff6600';  // Orange color
                this.trail = true;
                this.trailColor = '#ffaa00';
                this.explosive = true;
                // Set detonation ranges from constructor parameters
                this.minDetonationRange = minDetonationRange || 0;
                this.maxDetonationRange = maxDetonationRange || 0;
                break;
            default:
                // Default fallback appearance
                this.width = 3;
                this.height = 10;
                this.color = '#fff';  // White color
        }
        
        // Apply custom size if provided
        if (this.size) {
            this.width = this.size;
            this.height = this.size;
        }
    }
    
    update(deltaTime) {
        // Here we move the projectile based on its velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Here we track the distance traveled for range limitation
        const distanceMoved = Math.sqrt(
            (this.velocity.x * deltaTime) ** 2 + 
            (this.velocity.y * deltaTime) ** 2
        );
        this.distanceTraveled += distanceMoved;
        
        // Here we add trail particles for projectiles that have trails
        if (this.trail && Math.random() > 0.6) { // Only add particles sometimes for performance
            const trailColor = this.trailColor || this.color;
            const trailSize = this.type === 'missile' ? 3 : 2;
            const lifetime = this.type === 'missile' ? 0.6 : 0.3;
            
            this.addTrailParticle(
                this.x - Math.sin(this.angle) * (this.height/2), 
                this.y + Math.cos(this.angle) * (this.height/2), 
                trailSize,
                trailColor,
                lifetime
            );
        }
        
        // Update any existing trail particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const particle = this.trailParticles[i];
            particle.life -= deltaTime;
            
            // Remove expired particles
            if (particle.life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
        
        // Implement homing behavior for seeker missiles
        if (this.homing && this.type === 'missile' && window.game && window.game.world) {
            // Only allow homing after traveling a minimum distance and only once
            if (!this.hasHomed && this.distanceTraveled >= this.homingMinDistance) {
                // Find nearest ship or asteroid (excluding the owner if possible)
                let nearest = null;
                let nearestDist = Infinity;
                // Check for multiplayer players
                if (window.game.multiplayer && window.game.multiplayer.players) {
                    Object.values(window.game.multiplayer.players).forEach(p => {
                        if (p.destroyed || p.health <= 0) return;
                        const dx = p.x - this.x;
                        const dy = p.y - this.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < nearestDist) {
                            nearest = p;
                            nearestDist = dist;
                        }
                    });
                }
                // Also check asteroids as backup targets
                if (window.game.world.asteroids) {
                    for (const a of window.game.world.asteroids) {
                        if (!a.active) continue;
                        const dx = a.x - this.x;
                        const dy = a.y - this.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < nearestDist) {
                            nearest = a;
                            nearestDist = dist;
                        }
                    }
                }
                // Only home if within 300px and only curve once
                const homingRadius = 300;
                if (nearest && nearestDist <= homingRadius) {
                    // Calculate direction to target
                    const dx = nearest.x - this.x;
                    const dy = nearest.y - this.y;
                    const angleToTarget = Math.atan2(dy, dx) + Math.PI/2;
                    // Curve missile once toward the target
                    let angleDiff = angleToTarget - this.angle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    this.angle += angleDiff; // Snap/curve once
                    // Update velocity based on new angle
                    this.velocity = {
                        x: Math.sin(this.angle) * this.speed,
                        y: -Math.cos(this.angle) * this.speed
                    };
                    this.hasHomed = true;
                }
            }
        }
        
        // Check for distance-based detonation for mortar shells
        if (this.type === 'rocket' && this.explosive && !this.hasExploded && 
            this.minDetonationRange > 0 && this.maxDetonationRange > 0) {
            
            // Check if we're in the detonation range
            if (this.distanceTraveled >= this.minDetonationRange) {
                // Random chance to explode within the range, higher chance as we get closer to max range
                const rangeProgress = (this.distanceTraveled - this.minDetonationRange) / 
                                    (this.maxDetonationRange - this.minDetonationRange);
                const detonationChance = Math.min(rangeProgress * 0.15 + 0.02, 0.25); // 2% to 25% chance per frame
                
                if (Math.random() < detonationChance || this.distanceTraveled >= this.maxDetonationRange) {
                    this.hasExploded = true;
                    // Trigger explosion in the world
                    if (window.game && window.game.world) {
                        this.createExplosion(window.game.world, window.game.soundManager);
                    }
                }
            }
        }
    }
    
    // Method to add a trail particle
    addTrailParticle(x, y, size, color, lifetime) {
        this.trailParticles.push({
            x, y, size, color, 
            life: lifetime,
            maxLife: lifetime
        });
    }
    
    // Method to create splash damage effect when plasma projectile hits
    createSplashEffect(world, soundManager) {
        if (!this.splashRadius || !world) return;
        
        // Create visual explosion effect
        world.createExplosion(
            this.x, 
            this.y, 
            this.splashRadius, // Size of explosion
            soundManager
        );
        
        // Broadcast splash explosion to other players in multiplayer
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            window.game.multiplayer.socket.emit('projectileExplosion', {
                x: this.x,
                y: this.y,
                radius: this.splashRadius,
                type: 'splash'
            });
        }
        
        // In a real implementation, this would damage all entities within splash radius
        // Example logic:
        /*
        const entitiesInRange = world.getEntitiesInRadius(this.x, this.y, this.splashRadius);
        entitiesInRange.forEach(entity => {
            // Calculate damage falloff based on distance from center
            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const damageFalloff = 1 - (distance / this.splashRadius);
            
            // Apply splash damage with falloff
            const splashDamage = this.damage * damageFalloff;
            entity.takeDamage(splashDamage);
        });
        */
    }
    
    // Method to handle shield disruption effects
    applyShieldDisruption(target) {
        if (this.shieldDisruption && target.shield > 0) {
            // Store original shield value
            const originalShield = target.shield;
            // Disable shield temporarily
            target.shield = 0;
            target.shieldDisrupted = true;
            target.disruptionEndTime = Date.now() + (this.disruptionDuration * 1000);
            
            // Activate electric shock visual effect
            target.electricShockEffect = {
                active: true,
                startTime: Date.now(),
                duration: this.disruptionDuration * 1000
            };
            
            // Set up a timer to restore shields
            setTimeout(() => {
                if (target.shieldDisrupted && target.disruptionEndTime <= Date.now()) {
                    target.shield = originalShield;
                    target.shieldDisrupted = false;
                    target.disruptionEndTime = null;
                    target.electricShockEffect.active = false;
                }
            }, this.disruptionDuration * 1000);
            
            return true; // Shield was disrupted
        }
        return false; // No disruption applied
    }
    
    // Method to create explosive area damage when rocket hits
    createExplosion(world, soundManager) {
        if (!this.explosionRadius || !world) return;
        
        // Create visual explosion effect (larger than splash)
        world.createExplosion(
            this.x, 
            this.y, 
            this.explosionRadius, // Size of explosion
            soundManager,
            'rocket' // Explosion type for different visual/sound effects
        );
        
        // Broadcast explosion to other players in multiplayer
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            window.game.multiplayer.socket.emit('projectileExplosion', {
                x: this.x,
                y: this.y,
                radius: this.explosionRadius,
                type: 'fusionMortar'
            });
        }
        
        // Apply area damage to asteroids within explosion radius
        if (world.asteroids) {
            world.asteroids.forEach(asteroid => {
                if (!asteroid.active) return;
                
                // Calculate distance from explosion center to asteroid
                const dx = asteroid.x - this.x;
                const dy = asteroid.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check if asteroid is within explosion radius
                if (distance <= this.explosionRadius + asteroid.radius) {
                    // Calculate damage falloff based on distance from explosion center
                    const damageFalloff = Math.max(0, 1 - (distance / this.explosionRadius));
                    
                    // Apply explosion damage with falloff
                    const explosionDamage = this.explosionDamage * damageFalloff;
                    if (explosionDamage > 0) {
                        asteroid.health -= explosionDamage;
                        
                        // Award score if asteroid is destroyed
                        if (asteroid.health <= 0 && window.game && window.game.player) {
                            window.game.player.score += asteroid.scoreValue;
                        }
                    }
                }
            });
        }
        
        // Apply area damage to other players in multiplayer (if applicable)
        if (window.game && window.game.multiplayer && window.game.multiplayer.players) {
            Object.values(window.game.multiplayer.players).forEach(player => {
                if (player.destroyed || player.health <= 0) return;
                
                // Calculate distance from explosion center to player
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check if player is within explosion radius
                if (distance <= this.explosionRadius) {
                    // Calculate damage falloff based on distance from explosion center
                    const damageFalloff = Math.max(0, 1 - (distance / this.explosionRadius));
                    
                    // Apply explosion damage with falloff
                    const explosionDamage = this.explosionDamage * damageFalloff;
                    if (explosionDamage > 0) {
                        // Send damage to remote player through multiplayer system
                        if (window.game.multiplayer) {
                            window.game.multiplayer.sendHit('player', player.id, explosionDamage);
                        }
                    }
                }
            });
        }
    }
    
    render(ctx) {
        // Render trail particles first so they appear behind projectile
        this.trailParticles.forEach(particle => {
            ctx.save();
            
            // Make particles fade out over time
            ctx.globalAlpha = particle.life / particle.maxLife;
            
            // Draw the particle
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
        
        // Save the current canvas state
        ctx.save();
        
        // Here we position and rotate the canvas for drawing the projectile
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Apply glow effect for projectiles that have it
        if (this.glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }
        
        // Here we draw different visuals based on projectile type
        switch (this.type) {
            case 'laser':
                // Here we draw a simple rectangle for laser beams
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                
                // Here we add a glow effect to make the laser more vibrant
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                break;
                
            case 'burst':
                // Here we draw a small circular bullet for burst shots
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.width, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'missile':
                // Here we draw a triangle-shaped missile
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);           // Nose of missile
                ctx.lineTo(this.width/2, this.height/2);  // Back right
                ctx.lineTo(-this.width/2, this.height/2); // Back left
                ctx.closePath();
                ctx.fill();
                
                // Here we draw a thruster flame behind the missile
                ctx.fillStyle = '#ff0';  // Yellow flame
                ctx.beginPath();
                ctx.moveTo(-this.width/3, this.height/2);    // Left edge
                ctx.lineTo(0, this.height);                  // Flame tip
                ctx.lineTo(this.width/3, this.height/2);     // Right edge
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'plasma':
                // Draw a glowing plasma ball
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.width, 0, Math.PI * 2);
                ctx.fill();
                
                // Add internal glow with gradient
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width);
                gradient.addColorStop(0, '#fff');  // White core
                gradient.addColorStop(0.4, this.color);
                gradient.addColorStop(1, 'rgba(255, 0, 255, 0.1)'); // Transparent outer edge
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.width * 1.2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'quantum':
                // Draw a quantum projectile with energy waves
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.width, 0, Math.PI * 2);
                ctx.fill();
                
                // Add pulsing effect with animation
                const pulseSize = 1 + Math.sin(Date.now() / 100) * 0.2;
                ctx.strokeStyle = '#0ff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, this.width * 1.5 * pulseSize, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(0, 0, this.width * 2 * (2 - pulseSize), 0, Math.PI * 2);
                ctx.stroke();
                break;
                
            case 'rocket':
                // Draw a short, stubby mortar shell
                ctx.fillStyle = this.color;
                
                // Draw main shell body as oval/ellipse
                ctx.beginPath();
                ctx.ellipse(0, 0, this.width/2, this.height/2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Add a darker tip for the shell
                ctx.fillStyle = '#cc4400';
                ctx.beginPath();
                ctx.ellipse(0, -this.height/4, this.width/3, this.height/6, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Add some flame/exhaust trail particles
                if (this.trail) {
                    ctx.fillStyle = this.trailColor || '#ffaa00';
                    ctx.beginPath();
                    ctx.arc(0, this.height/2 + 1, this.width/4, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Additional small flame particle
                    ctx.fillStyle = '#ff6600';
                    ctx.beginPath();
                    ctx.arc(this.width/4, this.height/2 + 2, this.width/6, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            default:
                // Default projectile rendering
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                break;
        }
        
        // Restore the canvas to its original state
        ctx.restore();
    }
}