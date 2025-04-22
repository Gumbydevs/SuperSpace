export class Projectile {
    constructor(x, y, angle, type, damage, speed, range, homing = false) {
        // Here we set the projectile's starting position
        this.x = x;
        this.y = y;
        // Here we set the direction the projectile travels
        this.angle = angle;
        // Here we define the type of projectile (laser, burst, missile)
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
                break;
            default:
                // Default fallback appearance
                this.width = 3;
                this.height = 10;
                this.color = '#fff';  // White color
        }
    }
    
    update(deltaTime) {
        // Here we move the projectile based on its velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Here we track the distance traveled for range limitation
        const distanceMoved = this.speed * deltaTime;
        this.distanceTraveled += distanceMoved;
        
        // Here a missile trail effect would be added in a more complete game
        // For example:
        // if (this.type === 'missile') {
        //    createTrailParticle(this.x, this.y);
        // }
    }
    
    render(ctx) {
        // Save the current canvas state
        ctx.save();
        
        // Here we position and rotate the canvas for drawing the projectile
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
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
        }
        
        // Restore the canvas to its original state
        ctx.restore();
    }
}