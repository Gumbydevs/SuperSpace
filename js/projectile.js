export class Projectile {
    constructor(x, y, angle, type, damage, speed, range, homing = false, splashRadius = 0) {
        // Here we set the projectile's starting position
        this.x = x;
        this.y = y;
        // Here we set the direction the projectile travels
        this.angle = angle;
        // Here we define the type of projectile (laser, burst, missile, plasma, quantum)
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
        this.phasing = false; // For quantum disruptor to pass through obstacles
        this.glow = false; // Visual effect for some projectiles
        this.trail = false; // Whether to leave a trail
        this.trailColor = null; // Color of the trail if enabled
        this.size = null; // Custom size value for specific projectiles
        this.trailParticles = []; // Stores trail particle data
        
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
        if (this.homing && this.type === 'missile') {
            // In a real implementation, we would find nearby targets
            // and adjust the missile's velocity to home in on them
            // For now this is a placeholder
            
            // Example logic for when integrated with game world:
            /*
            const target = findNearestTarget(this.x, this.y);
            if (target) {
                // Calculate direction to target
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const angleToTarget = Math.atan2(dy, dx) + Math.PI/2;
                
                // Gradually adjust missile angle towards target
                const turnSpeed = 1.5 * deltaTime; // radians per second
                const angleDiff = angleToTarget - this.angle;
                
                // Normalize angle difference to between -PI and PI
                let normalizedDiff = angleDiff;
                while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
                while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
                
                // Apply steering
                this.angle += Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), turnSpeed);
                
                // Update velocity based on new angle
                this.velocity = {
                    x: Math.sin(this.angle) * this.speed,
                    y: -Math.cos(this.angle) * this.speed
                };
            }
            */
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