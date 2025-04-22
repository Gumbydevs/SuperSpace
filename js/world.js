export class World {
    constructor() {
        this.width = 10000;
        this.height = 10000;
        this.stars = this.generateStars(2000);
        this.asteroids = this.generateAsteroids(150);
        this.powerups = [];
        this.enemies = [];
        this.boundaries = {
            top: -this.height / 2,
            right: this.width / 2,
            bottom: this.height / 2,
            left: -this.width / 2
        };
        this.particles = [];
        this.explosions = [];

        this.maxAsteroids = 150;
        this.asteroidSpawnTimer = 0;
        this.asteroidSpawnInterval = 2;

        this.asteroidCreditValues = {
            small: { min: 10, max: 25 },
            medium: { min: 20, max: 50 },
            large: { min: 40, max: 100 }
        };
    }

    generateStars(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * this.width - this.width / 2,
                y: Math.random() * this.height - this.height / 2,
                size: Math.random() * 2 + 1,
                brightness: Math.random() * 0.7 + 0.3
            });
        }
        return stars;
    }

    generateAsteroids(count) {
        const asteroids = [];
        for (let i = 0; i < count; i++) {
            const size = Math.random() < 0.5 ? 'small' : Math.random() < 0.8 ? 'medium' : 'large';
            const radius = size === 'small' ? 20 : size === 'medium' ? 40 : 60;
            const health = size === 'small' ? 50 : size === 'medium' ? 100 : 200;
            const scoreValue = size === 'small' ? 100 : size === 'medium' ? 200 : 400;

            asteroids.push({
                x: (Math.random() - 0.5) * this.width,
                y: (Math.random() - 0.5) * this.height,
                radius: radius,
                health: health,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.5,
                vertices: this.generateAsteroidVertices(8, 0.4),
                velocityX: (Math.random() - 0.5) * 20,
                velocityY: (Math.random() - 0.5) * 20,
                size: size,
                scoreValue: scoreValue
            });
        }
        return asteroids;
    }

    generateAsteroidVertices(count, irregularity) {
        const vertices = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 1 + (Math.random() * irregularity * 2 - irregularity);
            vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        return vertices;
    }

    update(deltaTime, player, soundManager) {
        this.asteroidSpawnTimer += deltaTime;
        if (this.asteroidSpawnTimer >= this.asteroidSpawnInterval && this.asteroids.length < this.maxAsteroids) {
            this.asteroids.push(...this.generateAsteroids(1));
            this.asteroidSpawnTimer = 0;
        }

        this.asteroids.forEach((asteroid, i) => {
            asteroid.x += asteroid.velocityX * deltaTime;
            asteroid.y += asteroid.velocityY * deltaTime;
            asteroid.rotation += asteroid.rotationSpeed * deltaTime;

            this.wrapPosition(asteroid);

            player.projectiles.forEach((projectile, j) => {
                const dx = projectile.x - asteroid.x;
                const dy = projectile.y - asteroid.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < asteroid.radius) {
                    asteroid.health -= projectile.damage;
                    player.projectiles.splice(j, 1);

                    this.createProjectileHitEffect(asteroid.x, asteroid.y, asteroid.radius, soundManager);

                    if (asteroid.health <= 0) {
                        player.score += asteroid.scoreValue;

                        let creditReward;
                        switch (asteroid.size) {
                            case 'large':
                                creditReward = this.getRandomInt(
                                    this.asteroidCreditValues.large.min,
                                    this.asteroidCreditValues.large.max
                                );
                                break;
                            case 'medium':
                                creditReward = this.getRandomInt(
                                    this.asteroidCreditValues.medium.min,
                                    this.asteroidCreditValues.medium.max
                                );
                                break;
                            default:
                                creditReward = this.getRandomInt(
                                    this.asteroidCreditValues.small.min,
                                    this.asteroidCreditValues.small.max
                                );
                        }
                        player.addCredits(creditReward);

                        this.createExplosion(asteroid.x, asteroid.y, asteroid.radius, soundManager);

                        if (asteroid.size !== 'small') {
                            if (Math.random() < 0.7) {
                                this.splitAsteroid(asteroid, soundManager);
                            } else {
                                this.spawnPowerup(asteroid.x, asteroid.y);
                            }
                        } else if (Math.random() < 0.1) {
                            this.spawnPowerup(asteroid.x, asteroid.y);
                        }

                        this.asteroids.splice(i, 1);
                    }
                }
            });
        });

        this.wrapPosition(player);

        this.powerups.forEach((powerup, i) => {
            powerup.pulsePhase += powerup.pulseSpeed * deltaTime;

            const dx = powerup.x - player.x;
            const dy = powerup.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < powerup.radius + player.width / 2) {
                this.applyPowerup(player, powerup.type);
                this.powerups.splice(i, 1);

                setTimeout(() => {
                    this.powerups.push(...this.generatePowerups(1));
                }, 5000);
            }
        });

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.update(deltaTime);

            if (explosion.timeLeft <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }

    wrapPosition(entity) {
        if (entity.x < this.boundaries.left) {
            entity.x = this.boundaries.right;
        } else if (entity.x > this.boundaries.right) {
            entity.x = this.boundaries.left;
        }

        if (entity.y < this.boundaries.top) {
            entity.y = this.boundaries.bottom;
        } else if (entity.y > this.boundaries.bottom) {
            entity.y = this.boundaries.top;
        }
    }

    splitAsteroid(asteroid, soundManager) {
        this.createAsteroidDebris(asteroid.x, asteroid.y, asteroid.radius);

        if (soundManager) {
            soundManager.play('explosion', {
                volume: 0.3 * (asteroid.radius / 50),
                playbackRate: 1.2,
                position: { x: asteroid.x, y: asteroid.y }
            });
        }

        const fragmentCount = asteroid.radius > 50 ? 3 : 2;

        for (let i = 0; i < fragmentCount; i++) {
            const angleOffset = (Math.PI * 2 / fragmentCount) * i;
            const distance = asteroid.radius * 0.5;
            const offsetX = Math.cos(angleOffset) * distance;
            const offsetY = Math.sin(angleOffset) * distance;

            const newVelocityMagnitude = Math.sqrt(
                asteroid.velocityX * asteroid.velocityX +
                asteroid.velocityY * asteroid.velocityY
            ) * 1.2;

            const velocityAngle = Math.atan2(asteroid.velocityY, asteroid.velocityX) +
                (Math.random() - 0.5) * Math.PI * 0.75;

            const newAsteroid = {
                x: asteroid.x + offsetX,
                y: asteroid.y + offsetY,
                radius: asteroid.radius * 0.55,
                health: asteroid.health * 0.5,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 1.2,
                vertices: this.generateAsteroidVertices(Math.floor(6 + Math.random() * 4), 0.5),
                velocityX: Math.cos(velocityAngle) * newVelocityMagnitude,
                velocityY: Math.sin(velocityAngle) * newVelocityMagnitude,
                size: asteroid.size === 'large' ? 'medium' : 'small',
                scoreValue: asteroid.scoreValue / 2
            };
            this.asteroids.push(newAsteroid);
        }
    }

    createAsteroidDebris(x, y, radius) {
        const particleCount = Math.floor(radius / 4);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius * 0.8;
            
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            const velocityMagnitude = 20 + Math.random() * 40;
            const velocityAngle = Math.random() * Math.PI * 2;
            
            this.particles.push({
                x: particleX,
                y: particleY,
                velocityX: Math.cos(velocityAngle) * velocityMagnitude,
                velocityY: Math.sin(velocityAngle) * velocityMagnitude,
                size: 1 + Math.random() * 3,
                color: '#aaa',
                life: 1.0,
                maxLife: 0.5 + Math.random() * 0.5,
                rotation: Math.random() * Math.PI * 2,
                update(deltaTime) {
                    this.x += this.velocityX * deltaTime;
                    this.y += this.velocityY * deltaTime;
                    this.life -= deltaTime / this.maxLife;
                    this.velocityX *= 0.99;
                    this.velocityY *= 0.99;
                }
            });
        }
    }

    createExplosion(x, y, radius, soundManager) {
        if (soundManager) {
            soundManager.play('explosion', {
                volume: Math.min(0.7, 0.4 * (radius / 30)),
                position: { x, y }
            });
        }

        this.explosions.push({
            x: x,
            y: y,
            radius: radius,
            maxRadius: radius * 2,
            timeLeft: 0.5,
            update(deltaTime) {
                this.timeLeft -= deltaTime;
            }
        });

        for (let i = 0; i < Math.floor(radius / 10); i++) {
            const distance = radius * 0.7;
            const angle = Math.random() * Math.PI * 2;
            const delay = Math.random() * 0.2;

            setTimeout(() => {
                const secondaryX = x + Math.cos(angle) * distance;
                const secondaryY = y + Math.sin(angle) * distance;
                const secondaryRadius = radius * 0.3 + Math.random() * radius * 0.2;

                this.explosions.push({
                    x: secondaryX,
                    y: secondaryY,
                    radius: secondaryRadius,
                    maxRadius: secondaryRadius * 1.8,
                    timeLeft: 0.3,
                    update(deltaTime) {
                        this.timeLeft -= deltaTime;
                    }
                });
            }, delay * 1000);
        }
    }

    createProjectileHitEffect(x, y, radius, soundManager) {
        // Play hit sound effect
        if (soundManager) {
            soundManager.play('hit', {
                volume: Math.min(0.4, 0.3 * (radius / 30)),
                playbackRate: 0.8 + Math.random() * 0.4,
                position: { x, y }
            });
        }

        // Create a small flash effect
        const smallFlash = {
            x: x,
            y: y,
            radius: radius * 0.3,
            maxRadius: radius * 0.6,
            timeLeft: 0.2,
            update(deltaTime) {
                this.timeLeft -= deltaTime;
            }
        };
        this.explosions.push(smallFlash);

        // Create spark particles
        const particleCount = Math.floor(3 + Math.random() * 5);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const size = 1 + Math.random() * 2;
            const lifetime = 0.2 + Math.random() * 0.3;

            this.particles.push({
                x: x,
                y: y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: size,
                color: '#ffbb00', // Spark color (orange-yellow)
                life: 1.0,
                maxLife: lifetime,
                update(deltaTime) {
                    this.x += this.velocityX * deltaTime;
                    this.y += this.velocityY * deltaTime;
                    this.life -= deltaTime / this.maxLife;
                }
            });
        }
    }

    spawnPowerup(x, y) {
        const types = ['health', 'shield', 'energy', 'weapon', 'credits'];
        const weights = [0.3, 0.2, 0.2, 0.2, 0.1];

        let sum = 0;
        const r = Math.random();
        let selectedType;

        for (let i = 0; i < types.length; i++) {
            sum += weights[i];
            if (r <= sum) {
                selectedType = types[i];
                break;
            }
        }

        const powerup = {
            x: x,
            y: y,
            type: selectedType,
            radius: 15,
            pulsePhase: Math.random() * Math.PI * 2
        };

        this.powerups.push(powerup);
    }

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    render(ctx, player) {
        const visibleArea = {
            top: player.y - window.innerHeight / 2 - 100,
            right: player.x + window.innerWidth / 2 + 100,
            bottom: player.y + window.innerHeight / 2 + 100,
            left: player.x - window.innerWidth / 2 - 100
        };

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 5;
        ctx.strokeRect(
            this.boundaries.left,
            this.boundaries.top,
            this.width,
            this.height
        );

        this.stars.forEach(star => {
            if (
                star.x >= visibleArea.left &&
                star.x <= visibleArea.right &&
                star.y >= visibleArea.top &&
                star.y <= visibleArea.bottom
            ) {
                ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        this.asteroids.forEach(asteroid => {
            ctx.save();
            ctx.translate(asteroid.x, asteroid.y);
            ctx.rotate(asteroid.rotation);

            ctx.fillStyle = '#aaa';
            ctx.beginPath();
            asteroid.vertices.forEach((vertex, i) => {
                const scaledX = vertex.x * asteroid.radius;
                const scaledY = vertex.y * asteroid.radius;

                if (i === 0) {
                    ctx.moveTo(scaledX, scaledY);
                } else {
                    ctx.lineTo(scaledX, scaledY);
                }
            });
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        });

        this.powerups.forEach(powerup => {
            const pulseScale = 1 + 0.2 * Math.sin(powerup.pulsePhase);

            let color;
            let label;
            switch (powerup.type) {
                case 'health':
                    color = '#0f0';
                    label = 'HEALTH';
                    break;
                case 'weapon':
                    color = '#f00';
                    label = 'WEAPON';
                    break;
                case 'shield':
                    color = '#00f';
                    label = 'SHIELD';
                    break;
                case 'energy':
                    color = '#ff0';
                    label = 'ENERGY';
                    break;
                case 'credits':
                    color = '#fff';
                    label = 'CREDITS';
                    break;
                default:
                    color = '#fff';
                    label = 'ITEM';
            }

            ctx.save();
            ctx.translate(powerup.x, powerup.y);

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, powerup.radius * pulseScale * 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(0, 0, powerup.radius * pulseScale * 0.7, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;

            ctx.strokeText(label, 0, powerup.radius * 1.8);
            ctx.fillText(label, 0, powerup.radius * 1.8);

            ctx.restore();
        });

        this.explosions.forEach(explosion => {
            const radiusRatio = explosion.timeLeft / 0.5;
            const currentRadius = explosion.maxRadius * (1 - radiusRatio);
            const opacity = explosion.timeLeft * 2;

            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 200, 50, ${opacity * 0.7})`;
            ctx.lineWidth = 3;
            ctx.stroke();

            const gradient = ctx.createRadialGradient(
                explosion.x, explosion.y, 0,
                explosion.x, explosion.y, currentRadius * 0.8
            );
            gradient.addColorStop(0, `rgba(255, 255, 200, ${opacity})`);
            gradient.addColorStop(0.3, `rgba(255, 120, 50, ${opacity * 0.8})`);
            gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, currentRadius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        });

        this.particles.forEach(particle => {
            ctx.save();
            ctx.translate(particle.x, particle.y);

            if (particle.rotation) {
                ctx.rotate(particle.rotation);
            }

            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;

            if (particle.color === '#ffaa00') {
                ctx.beginPath();
                ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(particle.size, 0);
                ctx.lineTo(particle.size * 0.5, particle.size);
                ctx.lineTo(-particle.size, particle.size * 0.5);
                ctx.lineTo(-particle.size * 0.3, -particle.size);
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
        });
    }
}