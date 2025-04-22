export class Projectile {
    constructor(x, y, angle, type, damage, speed, range, homing = false) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.type = type;
        this.damage = damage;
        this.speed = speed;
        this.range = range;
        this.homing = homing;
        this.distanceTraveled = 0;
        this.velocity = {
            x: Math.sin(angle) * speed,
            y: -Math.cos(angle) * speed
        };
        
        // Visual properties based on type
        switch (type) {
            case 'laser':
                this.width = 3;
                this.height = 12;
                this.color = '#0ff';
                break;
            case 'burst':
                this.width = 2;
                this.height = 8;
                this.color = '#ff0';
                break;
            case 'missile':
                this.width = 4;
                this.height = 10;
                this.color = '#f00';
                break;
            default:
                this.width = 3;
                this.height = 10;
                this.color = '#fff';
        }
    }
    
    update(deltaTime) {
        // Move projectile
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Track distance traveled
        const distanceMoved = this.speed * deltaTime;
        this.distanceTraveled += distanceMoved;
        
        // Missile trail effect could be added here in a more complete game
    }
    
    render(ctx) {
        ctx.save();
        
        // Move to projectile position and rotate
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Different visuals based on projectile type
        switch (this.type) {
            case 'laser':
                // Draw laser beam
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                
                // Glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                break;
                
            case 'burst':
                // Draw small bullet
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.width, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'missile':
                // Draw missile
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.lineTo(this.width/2, this.height/2);
                ctx.lineTo(-this.width/2, this.height/2);
                ctx.closePath();
                ctx.fill();
                
                // Draw thruster flame
                ctx.fillStyle = '#ff0';
                ctx.beginPath();
                ctx.moveTo(-this.width/3, this.height/2);
                ctx.lineTo(0, this.height);
                ctx.lineTo(this.width/3, this.height/2);
                ctx.closePath();
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }
}