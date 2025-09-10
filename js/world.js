export class World {
    // Generate an array of new powerups
    generatePowerups(count = 1) {
        const powerups = [];
        for (let i = 0; i < count; i++) {
            // Random position within world bounds
            const x = this.getRandomInt(-this.width / 2 + 50, this.width / 2 - 50);
            const y = this.getRandomInt(-this.height / 2 + 50, this.height / 2 - 50);
            // Random type
            const types = ['health', 'shield', 'energy', 'credits'];
            const selectedType = types[Math.floor(Math.random() * types.length)];
            powerups.push({
                x,
                y,
                type: selectedType,
                radius: 15,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: 5 + Math.random() * 2
            });
        }
        return powerups;
    }
    constructor() {
        // Here we define the game world dimensions
        this.width = 10000;
        this.height = 10000;
        
        // Here we set up the stars for the parallax background
        this.stars = this.generateStars(2000); // Keep the original stars for backward compatibility
        this.starLayers = []; // Multiple layers for parallax effect
        this.starCount = {
            far: 800,    // Distant stars (slowest movement)
            mid: 500,    // Middle distance stars
            near: 300,   // Near stars (fastest movement)
            special: 40  // Special stars (large, colored, or animated)
        };
        this.shootingStars = []; // Array for shooting stars
        this.shootingStarTimer = 0;
        this.shootingStarInterval = 2 + Math.random() * 3; // Random interval between shooting stars
        
        // Initialize the star layers as empty arrays to prevent errors
        this.starLayers = [[], [], [], []];
        
        // Generate star layers only if we're in a browser environment
        // This prevents errors in Node.js or other environments without window
        if (typeof window !== 'undefined') {
            try {
                this.generateStarLayers();
            } catch (e) {
                console.error('Error generating star layers:', e);
                // Ensure we have empty arrays even if generation fails
                this.starLayers = [[], [], [], []];
            }
        }
        
        // Here we create the initial asteroids in the world
        this.asteroidIdCounter = 0; // Unique ID counter for asteroids
        // Initialize empty asteroid array - will be populated by server in multiplayer mode
        // or by generateAsteroids in single player mode
        this.asteroids = [];

    // Initialize players array to prevent undefined errors
    this.players = [];
        
        // ONLY multiplayer mode - asteroids come from server via setupServerAsteroidField
        console.log('Multiplayer mode - waiting for server asteroids, NO local generation');
        // Here we initialize arrays for game objects
        this.powerups = [];
        this.enemies = [];
        // Here we define the world boundaries for collision detection
        this.boundaries = {
            top: -this.height / 2,
            right: this.width / 2,
            bottom: this.height / 2,
            left: -this.width / 2
        };
        
        // Here we add the safe zone at the center (spawn area) - now square
        this.safeZone = {
            x: 0,
            y: 0, 
            size: 500, // Safe zone side length
            active: true, // Can be toggled for events
            pulsePhase: 0 // For docking light animation
        };
        
        // Here we initialize arrays for visual effects
        this.particles = [];
        this.explosions = [];

        // Here we define asteroid spawning parameters
        this.maxAsteroids = 150;
        this.asteroidSpawnTimer = 0;
        this.asteroidSpawnInterval = 2;

        // Here we define how many credits each asteroid type is worth - REBALANCED for slower progression
        this.asteroidCreditValues = {
            small: { min: 2, max: 8 },
            medium: { min: 5, max: 15 },
            large: { min: 10, max: 25 }
        };
    }

    // Generate starfield with multiple parallax layers
    generateStarLayers() {
        // Color palettes for different star types
        const colorPalettes = {
            white: ['#ffffff', '#f8f8ff', '#fffafa', '#f0f8ff', '#f5f5f5'],
            blue: ['#add8e6', '#87cefa', '#87ceeb', '#b0e0e6', '#00bfff'],
            red: ['#ffb6c1', '#fa8072', '#f08080', '#cd5c5c', '#dc143c'],
            yellow: ['#ffffe0', '#fffacd', '#fafad2', '#ffefd5', '#ffd700'],
            purple: ['#e6e6fa', '#d8bfd8', '#dda0dd', '#ee82ee', '#da70d6']
        };

        // Create far layer (smallest, slowest moving stars)
        const farStars = [];
        for (let i = 0; i < this.starCount.far; i++) {
            // Mostly white/blue stars in the distance
            const colorSet = Math.random() < 0.8 ? colorPalettes.white : colorPalettes.blue;
            const color = colorSet[Math.floor(Math.random() * colorSet.length)];
            
            farStars.push({
                x: Math.random() * this.width - this.width / 2,
                y: Math.random() * this.height - this.height / 2,
                size: Math.random() * 1.2 + 0.5, // Smaller stars
                color: color,
                brightness: Math.random() * 0.4 + 0.2, // Dimmer
                blinkSpeed: 0, // Most far stars don't blink
                blinkPhase: 0,
                parallaxFactor: 0.1 // Moves very slowly
            });
        }
        this.starLayers.push(farStars);

        // Create mid layer (medium stars)
        const midStars = [];
        for (let i = 0; i < this.starCount.mid; i++) {
            // More color variety in middle layer
            const colorType = Math.random();
            let colorSet;
            
            if (colorType < 0.6) colorSet = colorPalettes.white;
            else if (colorType < 0.8) colorSet = colorPalettes.blue;
            else if (colorType < 0.9) colorSet = colorPalettes.yellow;
            else colorSet = colorPalettes.red;
            
            const color = colorSet[Math.floor(Math.random() * colorSet.length)];
            const hasBlink = Math.random() < 0.2; // 20% of mid stars blink
            
            midStars.push({
                x: Math.random() * this.width - this.width / 2,
                y: Math.random() * this.height - this.height / 2,
                size: Math.random() * 1.5 + 1, // Medium size
                color: color,
                brightness: Math.random() * 0.5 + 0.4, // Medium brightness
                blinkSpeed: hasBlink ? Math.random() * 2 + 1 : 0,
                blinkPhase: Math.random() * Math.PI * 2,
                parallaxFactor: 0.3 // Medium movement speed
            });
        }
        this.starLayers.push(midStars);

        // Create near layer (largest, fastest moving stars)
        const nearStars = [];
        for (let i = 0; i < this.starCount.near; i++) {
            // Most color variety in near layer
            const colorType = Math.random();
            let colorSet;
            
            if (colorType < 0.4) colorSet = colorPalettes.white;
            else if (colorType < 0.6) colorSet = colorPalettes.blue;
            else if (colorType < 0.75) colorSet = colorPalettes.yellow;
            else if (colorType < 0.9) colorSet = colorPalettes.red;
            else colorSet = colorPalettes.purple;
            
            const color = colorSet[Math.floor(Math.random() * colorSet.length)];
            const hasBlink = Math.random() < 0.4; // 40% of near stars blink
            
            nearStars.push({
                x: Math.random() * this.width - this.width / 2,
                y: Math.random() * this.height - this.height / 2,
                size: Math.random() * 2 + 1.5, // Larger size
                color: color,
                brightness: Math.random() * 0.4 + 0.6, // Brighter
                blinkSpeed: hasBlink ? Math.random() * 3 + 1.5 : 0,
                blinkPhase: Math.random() * Math.PI * 2,
                parallaxFactor: 0.6 // Faster movement
            });
        }
        this.starLayers.push(nearStars);

        // Create special stars (extra bright or large stars, binary systems, etc)
        const specialStars = [];
        for (let i = 0; i < this.starCount.special; i++) {
            // Randomly pick a special star type
            const starType = Math.random();
            
            if (starType < 0.4) {
                // Bright star with glow
                const hue = Math.floor(Math.random() * 360);
                specialStars.push({
                    x: Math.random() * this.width - this.width / 2,
                    y: Math.random() * this.height - this.height / 2,
                    size: Math.random() * 3 + 2.5,
                    color: `hsl(${hue}, 100%, 80%)`,
                    brightness: 1.0,
                    blinkSpeed: Math.random() * 1.5 + 0.5,
                    blinkPhase: Math.random() * Math.PI * 2,
                    hasGlow: true,
                    glowSize: Math.random() * 10 + 5,
                    parallaxFactor: 0.4,
                    type: 'bright'
                });
            } 
            else if (starType < 0.7) {
                // Binary star system
                const hue1 = Math.floor(Math.random() * 360);
                const hue2 = (hue1 + 180) % 360; // Complementary color
                const orbitSpeed = Math.random() * 0.5 + 0.2;
                const orbitRadius = Math.random() * 6 + 3;
                
                specialStars.push({
                    x: Math.random() * this.width - this.width / 2,
                    y: Math.random() * this.height - this.height / 2,
                    size: Math.random() * 2 + 1,
                    color: `hsl(${hue1}, 100%, 75%)`,
                    secondaryColor: `hsl(${hue2}, 100%, 75%)`,
                    brightness: 0.9,
                    orbitSpeed: orbitSpeed,
                    orbitRadius: orbitRadius,
                    orbitPhase: Math.random() * Math.PI * 2,
                    parallaxFactor: 0.35,
                    type: 'binary'
                });
            }
            else if (starType < 0.85) {
                // Pulsing star (like a pulsar or variable star)
                const baseHue = Math.random() < 0.5 ? 220 : 30; // Blue or yellow/orange
                const pulseSpeed = Math.random() * 4 + 2;
                
                specialStars.push({
                    x: Math.random() * this.width - this.width / 2,
                    y: Math.random() * this.height - this.height / 2,
                    baseSize: Math.random() * 2 + 2,
                    size: 0, // Will be calculated in update
                    color: `hsl(${baseHue}, 100%, 75%)`,
                    brightness: 0.9,
                    pulseSpeed: pulseSpeed,
                    pulsePhase: Math.random() * Math.PI * 2,
                    parallaxFactor: 0.35,
                    type: 'pulsar'
                });
            }
            else {
                // Nebula-like cluster
                const baseHue = Math.floor(Math.random() * 360);
                const clusterColor = `hsla(${baseHue}, 80%, 70%, 0.3)`;
                const starCount = Math.floor(Math.random() * 8) + 5;
                const clusterStars = [];
                
                // Create mini-stars for the cluster
                for (let j = 0; j < starCount; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * 15 + 5;
                    clusterStars.push({
                        offsetX: Math.cos(angle) * dist,
                        offsetY: Math.sin(angle) * dist,
                        size: Math.random() * 1.5 + 0.5,
                        brightness: Math.random() * 0.3 + 0.7
                    });
                }
                
                specialStars.push({
                    x: Math.random() * this.width - this.width / 2,
                    y: Math.random() * this.height - this.height / 2,
                    clusterSize: Math.random() * 25 + 15,
                    color: clusterColor,
                    stars: clusterStars,
                    rotationSpeed: (Math.random() - 0.5) * 0.2,
                    rotation: Math.random() * Math.PI * 2,
                    parallaxFactor: 0.2,
                    type: 'cluster'
                });
            }
        }
        this.starLayers.push(specialStars);
    }

    // Create a shooting star
    createShootingStar() {
        // Calculate a random position near the visible area
        const edgeType = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let x, y;
        
        // Determine position based on edge
        switch (edgeType) {
            case 0: // Top
                x = Math.random() * this.width - this.width / 2;
                y = -this.height / 2;
                break;
            case 1: // Right
                x = this.width / 2;
                y = Math.random() * this.height - this.height / 2;
                break;
            case 2: // Bottom
                x = Math.random() * this.width - this.width / 2;
                y = this.height / 2;
                break;
            case 3: // Left
                x = -this.width / 2;
                y = Math.random() * this.height - this.height / 2;
                break;
        }
        
        // Calculate trajectory (always toward center with some randomness)
        const angle = Math.atan2(-y, -x) + (Math.random() - 0.5) * 0.5; // Angle toward center with some variation
        const speed = Math.random() * 500 + 400; // Fast!
        
        // Create the shooting star
        const shootingStar = {
            x: x,
            y: y,
            trailLength: Math.random() * 100 + 50,
            speed: speed,
            angle: angle,
            life: 1.0, // Full life
            maxLife: 1.5 + Math.random(), // 1.5-2.5 seconds
            color: Math.random() < 0.7 ? '#ffffff' : (Math.random() < 0.5 ? '#aaccff' : '#ffccaa'),
            size: Math.random() * 2 + 1,
            twinkleFreq: 10 + Math.random() * 15,
            update(deltaTime) {
                // Move shooting star
                this.x += Math.cos(this.angle) * this.speed * deltaTime;
                this.y += Math.sin(this.angle) * this.speed * deltaTime;
                
                // Decrease lifetime
                this.life -= deltaTime / this.maxLife;
            }
        };
        
        this.shootingStars.push(shootingStar);
    }

    generateStars(count) {
        // Here we create background stars with random positions and properties
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                // Position stars randomly throughout the world
                x: Math.random() * this.width - this.width / 2,
                y: Math.random() * this.height - this.height / 2,
                // Vary star sizes slightly 
                size: Math.random() * 2 + 1,
                // Vary star brightness for a more realistic starfield
                brightness: Math.random() * 0.7 + 0.3
            });
        }
        return stars;
    }

    generateAsteroids(count) {
        const asteroids = [];
        for (let i = 0; i < count; i++) {
            // Here we randomly determine asteroid size category
            const size = Math.random() < 0.5 ? 'small' : Math.random() < 0.8 ? 'medium' : 'large';
            // Here we set radius based on size category
            const radius = size === 'small' ? 20 : size === 'medium' ? 40 : 60;
            // Here we set health based on size category
            const health = size === 'small' ? 50 : size === 'medium' ? 100 : 200;
            // Here we set score value based on size category - REBALANCED for slower progression
            const scoreValue = size === 'small' ? 25 : size === 'medium' ? 50 : 100;

            // Here we create an asteroid with random position and properties
            asteroids.push({
                id: `asteroid_${this.asteroidIdCounter++}`, // Unique identifier
                // Random position within world bounds
                x: (Math.random() - 0.5) * this.width,
                y: (Math.random() - 0.5) * this.height,
                radius: radius,
                health: health,
                // Random initial rotation
                rotation: Math.random() * Math.PI * 2,
                // Random rotation speed
                rotationSpeed: (Math.random() - 0.5) * 0.5,
                // Generate jagged vertices for the asteroid shape
                vertices: this.generateAsteroidVertices(8, 0.4),
                // Random initial velocity
                velocityX: (Math.random() - 0.5) * 20,
                velocityY: (Math.random() - 0.5) * 20,
                size: size,
                scoreValue: scoreValue
            });
        }
        return asteroids;
    }

    // Method to force clear all local asteroids (for multiplayer mode)
    clearLocalAsteroids() {
        const count = this.asteroids.length;
        this.asteroids = [];
        console.log(`Cleared ${count} local asteroids for multiplayer mode`);
    }

    // Method to set up asteroids from server data (for multiplayer synchronization)
    setupServerAsteroidField(serverAsteroids) {
        console.log('Setting up server asteroid field:', serverAsteroids.length, 'asteroids');
        console.log('Clearing', this.asteroids.length, 'existing local asteroids');
        
        // Convert server asteroids to client format
        this.asteroids = serverAsteroids.map(serverAsteroid => {
            // Determine size category based on radius
            let size, health, scoreValue;
            if (serverAsteroid.radius <= 25) {
                size = 'small';
                health = 50;
                scoreValue = 100;
            } else if (serverAsteroid.radius <= 45) {
                size = 'medium';
                health = 100;
                scoreValue = 200;
            } else {
                size = 'large';
                health = 200;
                scoreValue = 400;
            }

            // Create client-side asteroid object compatible with existing code
            return {
                id: serverAsteroid.id,
                x: serverAsteroid.x,
                y: serverAsteroid.y,
                radius: serverAsteroid.radius,
                health: serverAsteroid.health || health, // Use server health if available, fallback to calculated
                maxHealth: serverAsteroid.health || health,
                rotation: serverAsteroid.rotation || 0,
                rotationSpeed: serverAsteroid.rotationSpeed || (Math.random() - 0.5) * 2,
                // Generate vertices for irregular shape
                vertices: this.generateAsteroidVertices(8 + Math.floor(Math.random() * 4), 0.3),
                // Stationary asteroids for multiplayer tactical gameplay - FORCED TO ZERO
                velocityX: 0,
                velocityY: 0,
                size: size,
                scoreValue: scoreValue,
                type: serverAsteroid.type || 'rock' // Default to rock if no type specified
            };
        });

        console.log('Successfully synchronized', this.asteroids.length, 'asteroids from server - all stationary');
    }

    // Method to update asteroid health from server (for multiplayer synchronization)
    updateAsteroidHealth(asteroidId, damage) {
        const asteroid = this.asteroids.find(a => a.id === asteroidId);
        if (asteroid) {
            asteroid.health -= damage;
            // Ensure health doesn't go below 0
            asteroid.health = Math.max(0, asteroid.health);
            console.log(`Updated asteroid ${asteroidId} health to ${asteroid.health} after ${damage} damage`);
        }
    }

    // Method to destroy asteroid from server command (for multiplayer synchronization)
    destroyServerAsteroid(asteroidId, createExplosion = true) {
        const asteroidIndex = this.asteroids.findIndex(a => a.id === asteroidId);
        if (asteroidIndex >= 0) {
            const asteroid = this.asteroids[asteroidIndex];
            
            if (createExplosion) {
                // Create explosion particles at asteroid location
                this.createExplosion(asteroid.x, asteroid.y, asteroid.radius, null, 'asteroid');
            }
            
            // Remove asteroid from client array
            this.asteroids.splice(asteroidIndex, 1);
            console.log(`Destroyed asteroid ${asteroidId} by server command. ${this.asteroids.length} asteroids remaining locally.`);
        }
    }

    generateAsteroidVertices(count, irregularity) {
        // Here we create irregular polygon shapes for asteroids
        // Optionally accept a seed for deterministic generation
        let seed = undefined;
        if (typeof arguments[2] !== 'undefined') {
            seed = arguments[2];
        }
        let randomFunc = Math.random;
        if (seed !== undefined) {
            let s = seed;
            randomFunc = function() {
                var x = Math.sin(s++) * 10000;
                return x - Math.floor(x);
            };
        }
        const vertices = [];
        for (let i = 0; i < count; i++) {
            // Calculate angle for this vertex (evenly distributed around 360°)
            const angle = (i / count) * Math.PI * 2;
            // Vary the radius to create an irregular shape
            const radius = 1 + (randomFunc() * irregularity * 2 - irregularity);
            // Add the vertex using polar coordinates
            vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        return vertices;
    }

    update(deltaTime, player, soundManager) {
        // Update star animations and parallax effect
        this.updateStars(deltaTime, player);
        
        // Update fire rate boosts
        this.updateFireRateBoosts(player);
        
        // In multiplayer-only mode, server handles ALL asteroid management - ZERO local generation

        // Update safe zone pulse phase for docking lights
        this.safeZone.pulsePhase += deltaTime * 2;

        // Here we update each asteroid's position and check for collisions
        this.asteroids.forEach((asteroid, i) => {
            // Move asteroid based on its velocity (fragments can have velocity from server)
            asteroid.x += (asteroid.velocityX || 0) * deltaTime;
            asteroid.y += (asteroid.velocityY || 0) * deltaTime;
            // Keep asteroid within world boundaries
            this.wrapPosition(asteroid);
            
            // Always rotate asteroids for visual appeal
            asteroid.rotation += asteroid.rotationSpeed * deltaTime;

            if (!this.isInSafeZone(player)) {
                const dx = player.x - asteroid.x;
                const dy = player.y - asteroid.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Collision occurs when player is within asteroid radius plus player collision radius
                if (distance < asteroid.radius + player.collisionRadius) {
                    // Handle collision effects (bounce, damage, etc.)
                    player.handleAsteroidCollision(asteroid, soundManager);
                }
            }

            // Here we check for collisions with player projectiles
            player.projectiles.forEach((projectile, j) => {
                // Skip asteroids marked as pending destruction
                if (asteroid.pendingDestruction) return;
                
                const dx = projectile.x - asteroid.x;
                const dy = projectile.y - asteroid.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < asteroid.radius) {
                    // Here we handle collision with projectile
                    asteroid.health -= projectile.damage;

                    // Calculate the exact impact point on the asteroid's edge
                    const impactAngle = Math.atan2(dy, dx);
                    const impactX = asteroid.x + Math.cos(impactAngle) * asteroid.radius;
                    const impactY = asteroid.y + Math.sin(impactAngle) * asteroid.radius;

                    // Create hit effect at the impact point
                    this.createProjectileHitEffect(impactX, impactY, asteroid.radius, soundManager);
                    
                    // Send projectile impact to other players for visual sync
                    const multiplayerAvailable = window.game && window.game.multiplayer && window.game.multiplayer.connected;
                    if (multiplayerAvailable) {
                        window.game.multiplayer.sendProjectileImpact({
                            x: impactX,
                            y: impactY,
                            radius: asteroid.radius,
                            asteroidId: asteroid.id
                        });
                    }

                    // Handle special projectile effects before removing the projectile
                    if (projectile.type === 'plasma' && projectile.splashRadius) {
                        projectile.createSplashEffect(this, soundManager);
                    } else if (projectile.type === 'rocket' && projectile.explosive) {
                        projectile.createExplosion(this, soundManager);
                        // Mark as exploded so it gets removed properly
                        projectile.hasExploded = true;
                    }

                    // Remove the projectile
                    player.projectiles.splice(j, 1);

                    // Here we handle asteroid destruction
                    if (asteroid.health <= 0) {
                        // Award score to player immediately for responsive gameplay
                        player.score += asteroid.scoreValue;

                        // Update multiplayer UI immediately if connected
                        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
                            window.game.multiplayer.updatePlayerList();
                            // Broadcast stats update for real-time leaderboard sync
                            window.game.multiplayer.broadcastStatsUpdate();
                        }

                        // Handle asteroid destruction immediately (like other game elements)
                        const multiplayerAvailable = window.game && window.game.multiplayer && window.game.multiplayer.connected;
                        
                        // Create explosion immediately
                        this.createExplosion(impactX, impactY, asteroid.radius, soundManager);
                        
                        // Award credits based on asteroid size
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
                        
                        // Track achievements and player profile
                        if (window.game && window.game.achievements && typeof window.game.achievements.onAsteroidDestroyed === 'function') {
                            window.game.achievements.onAsteroidDestroyed();
                        }
                        if (window.game && window.game.playerProfile && typeof window.game.playerProfile.onCreditsEarned === 'function') {
                            window.game.playerProfile.onCreditsEarned(creditReward);
                        }
                        if (window.game && window.game.playerProfile && typeof window.game.playerProfile.onAsteroidDestroyed === 'function') {
                            window.game.playerProfile.onAsteroidDestroyed();
                        }
                        
                        // Chance for alien to emerge from destroyed asteroid
                        if (window.game && window.game.npcManager) {
                            window.game.npcManager.spawnAlienFromAsteroid(asteroid.x, asteroid.y);
                        }
                        
                        // Track fragments and powerups for multiplayer sync
                        const fragmentsCreated = [];
                        const powerupsCreated = [];
                        const originalAsteroidCount = this.asteroids.length;
                        
                        // Split asteroid if it's not small
                        if (asteroid.size !== 'small') {
                            this.splitAsteroid(asteroid, soundManager);
                            
                            // Get the newly created fragments (they were added to the end of the array)
                            const newFragments = this.asteroids.slice(originalAsteroidCount);
                            fragmentsCreated.push(...newFragments);
                            
                            // Chance to spawn powerup
                            if (Math.random() < 0.3) {
                                const powerupCountBefore = this.powerups.length;
                                this.spawnPowerup(asteroid.x, asteroid.y);
                                // Get the newly spawned powerup (it was added to the end)
                                if (this.powerups.length > powerupCountBefore) {
                                    const newPowerup = this.powerups[this.powerups.length - 1];
                                    powerupsCreated.push({
                                        x: newPowerup.x,
                                        y: newPowerup.y,
                                        type: newPowerup.type
                                    });
                                }
                            }
                        } else if (Math.random() < 0.1) {
                            // Small chance for small asteroids to spawn powerup
                            const powerupCountBefore = this.powerups.length;
                            this.spawnPowerup(asteroid.x, asteroid.y);
                            // Get the newly spawned powerup (it was added to the end)
                            if (this.powerups.length > powerupCountBefore) {
                                const newPowerup = this.powerups[this.powerups.length - 1];
                                powerupsCreated.push({
                                    x: newPowerup.x,
                                    y: newPowerup.y,
                                    type: newPowerup.type
                                });
                            }
                        }
                        
                        // Remove the original asteroid
                        this.asteroids.splice(i, 1);
                        
                        // Send destruction data to server for other players
                        if (multiplayerAvailable) {
                            console.log('🚀 Sending asteroid destruction to server:', {
                                asteroid: asteroid.id,
                                fragments: fragmentsCreated.length,
                                powerups: powerupsCreated.length
                            });
                            window.game.multiplayer.sendAsteroidDestruction(
                                asteroid,
                                fragmentsCreated,
                                powerupsCreated,
                                { x: impactX, y: impactY, radius: asteroid.radius }
                            );
                        }
                    }
                }
            });
        });

        // Check collisions between player projectiles and NPCs
        if (window.game && window.game.npcManager && window.game.npcManager.npcs) {
            for (let npcIndex = window.game.npcManager.npcs.length - 1; npcIndex >= 0; npcIndex--) {
                const npc = window.game.npcManager.npcs[npcIndex];
                
                for (let projectileIndex = player.projectiles.length - 1; projectileIndex >= 0; projectileIndex--) {
                    const projectile = player.projectiles[projectileIndex];
                    const dx = projectile.x - npc.x;
                    const dy = projectile.y - npc.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Improved collision detection - smaller hitbox for dreadnaught hull
                    let hitRadius = npc.radius;
                    if (npc.type === 'dreadnaught') {
                        // Use a more realistic hull hitbox for dreadnaught (smaller than visual radius)
                        hitRadius = npc.radius * 0.7; // 70% of visual size for hull hits
                    }

                    if (distance < hitRadius + 10) { // Hit NPC
                        npc.health -= projectile.damage;
                        
                        // Create hit effect at impact point
                        const impactX = npc.x + (dx / distance) * hitRadius;
                        const impactY = npc.y + (dy / distance) * hitRadius;
                        this.createProjectileHitEffect(impactX, impactY, npc.radius * 0.5, soundManager);
                        
                        // Handle special projectile effects
                        if (projectile.type === 'rocket' && projectile.explosive) {
                            projectile.createExplosion(this, soundManager);
                        }
                        
                        // Remove projectile
                        player.projectiles.splice(projectileIndex, 1);
                        
                        // Award partial score for hitting
                        player.score += npc.type === 'dreadnaught' ? 10 : 5;
                        
                        console.log(`Hit NPC ${npc.type} for ${projectile.damage} damage. Health: ${npc.health}/${npc.maxHealth}`);
                        break; // Exit projectile loop since this projectile hit
                    }
                }
            }
        }

        // Keep player within world boundaries
        this.wrapPosition(player);

        // Check collisions with other players
        const otherPlayers = window.game.multiplayer.players;
        if (otherPlayers) {
            // Fix: Use Object.values to convert the players object into an array that we can iterate
            Object.values(otherPlayers).forEach(otherPlayer => {
                // Skip collision with self, invalid players, or players in safe zone
                if (!otherPlayer || 
                    typeof otherPlayer.x === 'undefined' || 
                    typeof otherPlayer.y === 'undefined' ||
                    otherPlayer.id === window.game.multiplayer.socket.id || 
                    this.isInSafeZone(player) || 
                    this.isInSafeZone(otherPlayer)) {
                    return;
                }
                
                // Calculate distance between players
                const dx = player.x - otherPlayer.x;
                const dy = player.y - otherPlayer.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check collision with simple distance check
                if (distance < 30) {
                    // Use the same collision handling as asteroids
                    if (player.collisionCooldown <= 0) {
                        // Calculate collision vector from other player to this player
                        const nx = distance > 0 ? dx / distance : 1;
                        const ny = distance > 0 ? dy / distance : 0;
                        
                        // Calculate impact force based on relative velocity
                        const impactForce = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
                        
                        // Calculate impulse (how strongly we bounce) - same as asteroid collision  
                        const baseKnockback = Math.max(50, impactForce * 0.2); // Minimum 50, scales with speed
                        const impulseStrength = baseKnockback * (1 + (player.bounceStrength || 0.5));
                        
                        // Apply impulse in the direction away from collision
                        player.velocity.x = nx * impulseStrength;
                        player.velocity.y = ny * impulseStrength;
                        
                        // Don't apply local force to remote player - let server handle it
                        // This prevents desync issues
                        
                        // Play collision sound - same as asteroid
                        if (soundManager) {
                            soundManager.play('hit', {
                                volume: 0.4,
                                playbackRate: 1.2,
                                position: { x: player.x, y: player.y }
                            });
                        }
                        
                        // Create visual impact effect - same as asteroid
                        if (window.game && window.game.world) {
                            const impactX = player.x - nx * (player.collisionRadius || 15) / 2;
                            const impactY = player.y - ny * (player.collisionRadius || 15) / 2;
                            window.game.world.createCollisionEffect(impactX, impactY);
                        }
                        
                        // Set cooldown to prevent multiple collisions
                        player.collisionCooldown = player.collisionCooldownTime || 0.1;
                        
                        // Notify server with collision force data
                        if (window.game.multiplayer.connected) {
                            const knockbackForce = {
                                x: -nx * impulseStrength,
                                y: -ny * impulseStrength
                            };
                            window.game.multiplayer.sendPlayerCollision(otherPlayer.id, knockbackForce);
                        }
                    }
                }
            });
        }

        // Check collisions between player and NPCs
        if (window.game && window.game.npcManager && window.game.npcManager.npcs) {
            window.game.npcManager.npcs.forEach(npc => {
                if (!npc || npc.isRemote) return; // Skip invalid or remote NPCs
                
                const dx = player.x - npc.x;
                const dy = player.y - npc.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Use different collision radii for different NPC types
                let npcCollisionRadius = npc.radius * 0.8; // Slightly smaller than visual radius
                if (npc.type === 'dreadnaught') {
                    npcCollisionRadius = npc.radius * 0.6; // Tighter collision for dreadnaught hull
                }
                
                if (distance < player.collisionRadius + npcCollisionRadius) {
                    // Handle collision with NPC
                    const damage = npc.type === 'dreadnaught' ? 25 : 15; // More damage from dreadnaught
                    player.takeDamage(damage);
                    
                    // Create collision effect
                    this.createProjectileHitEffect(player.x, player.y, player.collisionRadius, soundManager);
                    
                    // Push player away from NPC
                    const pushForce = 100;
                    const angle = Math.atan2(dy, dx);
                    player.velocity.x += Math.cos(angle) * pushForce;
                    player.velocity.y += Math.sin(angle) * pushForce;
                    
                    console.log(`Player collided with ${npc.type} for ${damage} damage!`);
                }
            });
        }

        // Check collisions between NPC projectiles and all players (local and remote)
        if (this.npcProjectiles && this.npcProjectiles.length > 0) {
            const allPlayers = [player];
            
            // Add remote players
            if (window.game && window.game.multiplayer && window.game.multiplayer.players) {
                Object.values(window.game.multiplayer.players).forEach(remotePlayer => {
                    if (remotePlayer && !remotePlayer.destroyed && remotePlayer.health > 0) {
                        allPlayers.push(remotePlayer);
                    }
                });
            }
            
            // Check collisions for each player
            allPlayers.forEach(targetPlayer => {
                if (!targetPlayer || targetPlayer.destroyed || targetPlayer.health <= 0) return;
                
                for (let i = this.npcProjectiles.length - 1; i >= 0; i--) {
                    const projectile = this.npcProjectiles[i];
                    if (!projectile || projectile.life <= 0) continue;
                    
                    const dx = projectile.x - targetPlayer.x;
                    const dy = projectile.y - targetPlayer.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    const collisionRadius = projectile.size + (targetPlayer.collisionRadius || targetPlayer.width / 2);
                    
                    if (distance < collisionRadius) {
                        // Hit the player
                        const damage = projectile.type === 'dreadnaught_cannon' ? 35 : 20;
                        
                        // Only apply damage to local player directly
                        if (targetPlayer === player) {
                            targetPlayer.takeDamage(damage);
                            console.log(`NPC projectile hit local player for ${damage} damage!`);
                        } else {
                            // For remote players, send damage event through multiplayer
                            if (window.game.multiplayer && window.game.multiplayer.connected) {
                                window.game.multiplayer.socket.emit('npcProjectileHit', {
                                    playerId: targetPlayer.id,
                                    damage: damage,
                                    projectileType: projectile.type
                                });
                            }
                            console.log(`NPC projectile hit remote player ${targetPlayer.id} for ${damage} damage!`);
                        }
                        
                        // Create hit effect
                        this.createProjectileHitEffect(projectile.x, projectile.y, projectile.size * 2, soundManager);
                        
                        // Remove projectile
                        this.npcProjectiles.splice(i, 1);
                        break; // Exit inner loop since projectile is destroyed
                    }
                }
            });
        }

        // Here we update powerups and check for player collection
        this.powerups.forEach((powerup, i) => {
            // Animate powerup pulsing effect
            powerup.pulsePhase += powerup.pulseSpeed * deltaTime;

            // Check for collision with player
            const dx = powerup.x - player.x;
            const dy = powerup.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < powerup.radius + player.width / 2) {
                // Apply powerup effect to player
                this.applyPowerup(player, powerup.type);
                // Remove collected powerup
                this.powerups.splice(i, 1);

                // Spawn a new powerup after delay (maintains powerup count in world)
                setTimeout(() => {
                    this.powerups.push(...this.generatePowerups(1));
                }, 5000);
            }
        });

        // Here we update particle effects (debris, etc.)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);

            // Remove expired particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Here we update explosion effects
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.update(deltaTime);

            // Remove finished explosions
            if (explosion.timeLeft <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }

    // Update star layers and shooting stars
    updateStars(deltaTime, player) {
        // Process special stars animations (pulsing, binary, etc.)
        const specialStars = this.starLayers[3] || [];
        specialStars.forEach(star => {
            if (star.type === 'binary') {
                // Update binary star orbit phase
                star.orbitPhase += star.orbitSpeed * deltaTime;
            } 
            else if (star.type === 'pulsar') {
                // Update pulsing star
                star.pulsePhase += star.pulseSpeed * deltaTime;
                star.size = star.baseSize * (0.6 + 0.4 * Math.sin(star.pulsePhase)); 
            }
            else if (star.type === 'cluster') {
                // Slowly rotate star cluster
                star.rotation += star.rotationSpeed * deltaTime;
            }
            else if (star.blinkSpeed > 0) {
                // Update blinking phase for bright stars
                star.blinkPhase += star.blinkSpeed * deltaTime;
            }
        });

        // Update normal stars blinking (for stars that have blinking enabled)
        for (let layer = 0; layer < this.starLayers.length - 1; layer++) {
            const stars = this.starLayers[layer] || [];
            stars.forEach(star => {
                if (star.blinkSpeed > 0) {
                    star.blinkPhase += star.blinkSpeed * deltaTime;
                }
            });
        }

        // Random shooting star generation
        this.shootingStarTimer += deltaTime;
        if (this.shootingStarTimer >= this.shootingStarInterval) {
            this.createShootingStar();
            // Reset timer with random interval
            this.shootingStarTimer = 0;
            this.shootingStarInterval = 2 + Math.random() * 8; // 2-10 seconds between shooting stars
        }

        // Update shooting stars
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const shootingStar = this.shootingStars[i];
            shootingStar.update(deltaTime);
            
            // Remove expired shooting stars
            if (shootingStar.life <= 0) {
                this.shootingStars.splice(i, 1);
            }
        }
    }

    wrapPosition(entity) {
        // Here we implement screen wrapping to keep objects in the game world
        // If an object goes beyond one edge, it appears on the opposite side

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
        // Here we create visual debris when an asteroid is split
        this.createAsteroidDebris(asteroid.x, asteroid.y, asteroid.radius);

        // Play explosion sound for the split
        if (soundManager) {
            soundManager.play('explosion', {
                volume: 0.3 * (asteroid.radius / 50),
                playbackRate: 1.2,
                position: { x: asteroid.x, y: asteroid.y }
            });
        }

        // Here we determine how many fragments to create based on size
        const fragmentCount = asteroid.radius > 50 ? 3 : 2;

        // Here we create smaller asteroids from the split
        for (let i = 0; i < fragmentCount; i++) {
            // Calculate position offset for each fragment (evenly distributed)
            const angleOffset = (Math.PI * 2 / fragmentCount) * i;
            const distance = asteroid.radius * 0.5;
            const offsetX = Math.cos(angleOffset) * distance;
            const offsetY = Math.sin(angleOffset) * distance;

            // Calculate new velocity (faster than parent asteroid)
            const newVelocityMagnitude = Math.sqrt(
                asteroid.velocityX * asteroid.velocityX +
                asteroid.velocityY * asteroid.velocityY
            ) * 1.2;

            // Add some randomness to the velocity direction
            const velocityAngle = Math.atan2(asteroid.velocityY, asteroid.velocityX) +
                (Math.random() - 0.5) * Math.PI * 0.75;

            // Create the new smaller asteroid
            const newAsteroid = {
                id: `asteroid_${this.asteroidIdCounter++}`, // Unique identifier for new asteroid
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
        // Here we create debris particles when an asteroid breaks
        const particleCount = Math.floor(radius / 4);
        
        for (let i = 0; i < particleCount; i++) {
            // Randomize particle position within asteroid
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius * 0.8;
            
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            // Randomize particle velocity (outward from center)
            const velocityMagnitude = 20 + Math.random() * 40;
            const velocityAngle = Math.random() * Math.PI * 2;
            
            // Create and add the particle
            this.particles.push({
                x: particleX,
                y: particleY,
                velocityX: Math.cos(velocityAngle) * velocityMagnitude,
                velocityY: Math.sin(velocityAngle) * velocityMagnitude,
                size: 1 + Math.random() * 3,
                color: '#aaa',  // Gray color for rock debris
                life: 1.0,      // Full life to start
                maxLife: 0.5 + Math.random() * 0.5,  // Random lifetime
                rotation: Math.random() * Math.PI * 2,
                update(deltaTime) {
                    // Move particle
                    this.x += this.velocityX * deltaTime;
                    this.y += this.velocityY * deltaTime;
                    // Decrease lifetime
                    this.life -= deltaTime / this.maxLife;
                    // Slow down over time
                    this.velocityX *= 0.99;
                    this.velocityY *= 0.99;
                }
            });
        }
    }

    createExplosion(x, y, radius, soundManager, type = 'default') {
        // Here we play the explosion sound based on type
        if (soundManager) {
            let soundName = 'explosion';
            let volume = Math.min(0.7, 0.4 * (radius / 30));
            
            if (type === 'rocket') {
                soundName = 'rocket_explosion';
                volume = Math.min(0.8, 0.5 * (radius / 30));
                // Fallback to explosion sound if rocket_explosion doesn't exist
                if (!soundManager.isSoundLoaded('rocket_explosion')) {
                    soundName = 'explosion';
                }
            }
            
            soundManager.play(soundName, {
                volume: volume,
                position: { x, y }
            });
        }

        // Here we create the main explosion effect with type-specific properties
        const explosionColor = type === 'rocket' ? '#ff6600' : '#ff4400'; // Orange for rockets, red-orange for others
        
        this.explosions.push({
            x: x,
            y: y,
            radius: radius,
            maxRadius: radius * (type === 'rocket' ? 2.5 : 2), // Rockets have larger explosions
            timeLeft: type === 'rocket' ? 0.7 : 0.5, // Rockets last longer
            color: explosionColor,
            type: type,
            update(deltaTime) {
                this.timeLeft -= deltaTime;
            }
        });

        // Here we create secondary explosion effects for a more complex look
        for (let i = 0; i < Math.floor(radius / 10); i++) {
            const distance = radius * 0.7;
            const angle = Math.random() * Math.PI * 2;
            const delay = Math.random() * 0.2;

            // Create secondary explosions with a slight delay
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
        // Here we play hit sound effect
        if (soundManager) {
            soundManager.play('hit', {
                volume: Math.min(0.4, 0.3 * (radius / 30)),
                playbackRate: 0.8 + Math.random() * 0.4, // Randomize pitch slightly
                position: { x, y }
            });
        }

        // Here we create a small flash effect
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
        
        // Add a second, slightly larger flash with delay for better visual effect
        setTimeout(() => {
            if (this.explosions) { // Safety check in case World was destroyed
                const secondaryFlash = {
                    x: x + (Math.random() - 0.5) * 5,
                    y: y + (Math.random() - 0.5) * 5,
                    radius: radius * 0.2,
                    maxRadius: radius * 0.4,
                    timeLeft: 0.15,
                    update(deltaTime) {
                        this.timeLeft -= deltaTime;
                    }
                };
                this.explosions.push(secondaryFlash);
            }
        }, 50);

        // Here we create spark particles
        const particleCount = Math.floor(5 + Math.random() * 7); // Increased count for better effect
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 120; // Increased speed variation
            const size = 1 + Math.random() * 2;
            const lifetime = 0.2 + Math.random() * 0.3;

            this.particles.push({
                x: x,
                y: y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: size,
                color: Math.random() > 0.3 ? '#ffbb00' : '#ff4400', // Mix of colors
                life: 1.0,
                maxLife: lifetime,
                update(deltaTime) {
                    // Move the spark
                    this.x += this.velocityX * deltaTime;
                    this.y += this.velocityY * deltaTime;
                    // Decrease lifetime
                    this.life -= deltaTime / this.maxLife;
                    // Add slight deceleration
                    this.velocityX *= 0.97;
                    this.velocityY *= 0.97;
                }
            });
        }
    }

    createSmokeParticle(x, y, size, duration, velocityX = 0, velocityY = 0) {
        const smoke = {
            x: x,
            y: y,
            velocityX: velocityX + (Math.random() - 0.5) * 20, // Base velocity plus some random spread
            velocityY: velocityY + (Math.random() - 0.5) * 20,
            size: size,
            originalSize: size,
            opacity: 0.7,
            life: 1.0,
            maxLife: duration,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 1.0,
            color: Math.random() > 0.5 ? 'rgba(40, 40, 40, 0.7)' : 'rgba(70, 70, 70, 0.7)',
            
            update(deltaTime) {
                // Move particle
                this.x += this.velocityX * deltaTime;
                this.y += this.velocityY * deltaTime;
                
                // Decrease lifetime
                this.life -= deltaTime / this.maxLife;
                
                // Slow down over time
                this.velocityX *= 0.98;
                this.velocityY *= 0.98;
                
                // Grow slightly as it disperses
                this.size = this.originalSize * (1 + (1 - this.life) * 0.8);
                
                // Rotate the smoke particle
                this.rotation += this.rotationSpeed * deltaTime;
                
                // Fade out
                this.opacity = this.life * 0.7;
            }
        };
        
        this.particles.push(smoke);
        return smoke;
    }

    createCollisionEffect(x, y) {
        // Create a flash effect at the collision point
        this.explosions.push({
            x: x,
            y: y,
            radius: 10,
            maxRadius: 20,
            timeLeft: 0.2,
            update(deltaTime) {
                this.timeLeft -= deltaTime;
            }
        });
        
        // Create spark particles for collision
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 80;
            
            this.particles.push({
                x: x,
                y: y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: 1 + Math.random() * 2,
                color: Math.random() > 0.5 ? '#aaaaff' : '#ffffff', // Blue/white sparks
                life: 1.0,
                maxLife: 0.2 + Math.random() * 0.2,
                update(deltaTime) {
                    // Move particle
                    this.x += this.velocityX * deltaTime;
                    this.y += this.velocityY * deltaTime;
                    // Decrease lifetime
                    this.life -= deltaTime / this.maxLife;
                }
            });
        }
    }

    spawnPowerup(x, y, type = null) {
        let selectedType;
        
        if (type) {
            // Use the provided type (for multiplayer sync)
            selectedType = type;
        } else {
            // Generate random type (original behavior)
            const types = ['health', 'shield', 'energy', 'weapon', 'credits'];
            const weights = [0.3, 0.2, 0.2, 0.2, 0.1]; // Health has highest chance

            // Here we use weighted random selection
            let sum = 0;
            const r = Math.random();

            for (let i = 0; i < types.length; i++) {
                sum += weights[i];
                if (r <= sum) {
                    selectedType = types[i];
                    break;
                }
            }
        }

        // Here we create the powerup object
        const powerup = {
            x: x,
            y: y,
            type: selectedType,
            radius: 15,
            pulsePhase: Math.random() * Math.PI * 2, // Random starting phase
            pulseSpeed: 5 + Math.random() * 2       // Random pulse speed
        };

        this.powerups.push(powerup);
    }

    // Check if an entity is within the safe zone
    isInSafeZone(entity) {
        if (!this.safeZone.active) return false;
        
        // Calculate distance from entity to safe zone center
        const dx = entity.x - this.safeZone.x;
        const dy = entity.y - this.safeZone.y;
        
        // Check if entity is within the square safe zone
        return (
            dx >= -this.safeZone.size / 2 &&
            dx <= this.safeZone.size / 2 &&
            dy >= -this.safeZone.size / 2 &&
            dy <= this.safeZone.size / 2
        );
    }

    getRandomInt(min, max) {
        // Helper function to get random integer in range (inclusive)
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    applyPowerup(player, type) {
        // Here we handle effects for different powerup types
        switch(type) {
            case 'health':
                // Restore 25% of max health
                const healthToAdd = player.maxHealth * 0.25;
                player.health = Math.min(player.health + healthToAdd, player.maxHealth);
                
                // Show pickup message
                if (window.game && window.game.multiplayer) {
                    window.game.multiplayer.showGameMessage('Health +25%', '#0f0');
                }
                
                // Update health display
                if (window.gameUI) {
                    window.gameUI.updateHealthBar(player.health, player.maxHealth);
                }
                break;
                
            case 'shield':
                // Add shield capacity if player doesn't have it yet
                if (player.shieldCapacity === 0) {
                    player.shieldCapacity = 50;
                    player.shield = 50;
                    
                    // Show message about new capability
                    if (window.game && window.game.multiplayer) {
                        window.game.multiplayer.showGameMessage('Shield System Activated!', '#00f');
                    }
                    
                    // Add shield display to UI
                    if (window.gameUI && player.shieldCapacity > 0) {
                        window.gameUI.addShieldDisplay();
                    }
                } else {
                    // Restore 50% of shield capacity
                    player.shield = Math.min(player.shield + player.shieldCapacity * 0.5, player.shieldCapacity);
                    
                    // Show pickup message
                    if (window.game && window.game.multiplayer) {
                        window.game.multiplayer.showGameMessage('Shield +50%', '#00f');
                    }
                }
                break;
                
            case 'energy':
                // Add energy capacity if player doesn't have it yet
                if (player.maxEnergy === 0) {
                    player.maxEnergy = 100;
                    player.energy = 100;
                    
                    // Show message about new capability
                    if (window.game && window.game.multiplayer) {
                        window.game.multiplayer.showGameMessage('Energy System Activated!', '#f0f');
                    }
                    
                    // Add energy display to UI
                    if (window.gameUI && player.maxEnergy > 0) {
                        window.gameUI.addEnergyDisplay();
                    }
                } else {
                    // Restore 50% of energy capacity
                    player.energy = Math.min(player.energy + player.maxEnergy * 0.5, player.maxEnergy);
                    
                    // Show pickup message
                    if (window.game && window.game.multiplayer) {
                        window.game.multiplayer.showGameMessage('Energy +50%', '#f0f');
                    }
                }
                break;
                
            case 'weapon':
                // Give player a random weapon upgrade
                // If they already have all weapons, improve fire rate
                if (!player.weapons.includes('Burst Cannon')) {
                    player.weapons.push('Burst Cannon');
                    player.weaponIndex = player.weapons.length - 1;
                    player.currentWeapon = player.weapons[player.weaponIndex];
                    
                    // Update weapon display in UI
                    const weaponElement = document.getElementById('weapons');
                    if (weaponElement) {
                        weaponElement.textContent = player.currentWeapon;
                    }
                    // Update weapon icon
                    const weaponIcon = document.getElementById('weapon-icon');
                    if (weaponIcon && player.updateWeaponIcon) {
                        player.updateWeaponIcon(weaponIcon, player.currentWeapon);
                    }
                    
                    // Show pickup message
                    if (window.game && window.game.multiplayer) {
                        window.game.multiplayer.showGameMessage('New Weapon: Burst Cannon!', '#f00');
                    }
                } else if (!player.weapons.includes('Seeker Missile')) {
                    player.weapons.push('Seeker Missile');
                    player.weaponIndex = player.weapons.length - 1;
                    player.currentWeapon = player.weapons[player.weaponIndex];
                    
                    // Update weapon display in UI
                    const weaponElement = document.getElementById('weapons');
                    if (weaponElement) {
                        weaponElement.textContent = player.currentWeapon;
                    }
                    // Update weapon icon
                    const weaponIcon = document.getElementById('weapon-icon');
                    if (weaponIcon && player.updateWeaponIcon) {
                        player.updateWeaponIcon(weaponIcon, player.currentWeapon);
                    }
                    
                    // Show pickup message
                    if (window.game && window.game.multiplayer) {
                        window.game.multiplayer.showGameMessage('New Weapon: Seeker Missile!', '#f00');
                    }
                } else {
                    // Apply temporary fire rate boost - 60% faster for 10 seconds
                    const fireRateBoost = {
                        multiplier: 0.4, // 60% faster (100% / 0.4 = 250% total)
                        duration: 10000, // 10 seconds
                        startTime: Date.now()
                    };
                    
                    // Store the boost info
                    if (!player.fireRateBoosts) {
                        player.fireRateBoosts = [];
                    }
                    player.fireRateBoosts.push(fireRateBoost);
                    
                    // Apply the boost immediately
                    if (!player.originalFireCooldownTime) {
                        player.originalFireCooldownTime = player.fireCooldownTime;
                    }
                    player.fireCooldownTime = player.originalFireCooldownTime * fireRateBoost.multiplier;
                    
                    // Show pickup message with timer
                    if (window.game && window.game.multiplayer) {
                        window.game.multiplayer.showGameMessage('FIRE RATE BOOST! (10s)', '#f33');
                    }
                }
                

                
                // Update weapon icon based on new weapon
                const weaponIcon = document.getElementById('weapon-icon');
                if (weaponIcon) {
                    switch(player.currentWeapon) {
                        case 'Basic Laser':
                            weaponIcon.innerHTML = 'ðŸ”«';
                            break;
                        case 'Burst Cannon':
                            weaponIcon.innerHTML = 'ðŸ’¥';
                            break;
                        case 'Seeker Missile':
                            weaponIcon.innerHTML = 'ðŸš€';
                            break;
                        default:
                            weaponIcon.innerHTML = 'ðŸ”«';
                    }
                }
                break;
                
            case 'credits':
                // Award bonus credits
                const creditsBonus = 100;
                player.addCredits(creditsBonus);
                
                // Show pickup message
                if (window.game && window.game.multiplayer) {
                    window.game.multiplayer.showGameMessage(`+${creditsBonus} CREDITS!`, '#fff');
                }
                break;
        }
    }

    // Update particles only (used during ship destruction)
    updateParticles(deltaTime) {
        // Update particle effects (debris, etc.)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);

            // Remove expired particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update explosion effects
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.update(deltaTime);

            // Remove finished explosions
            if (explosion.timeLeft <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }

    // Update fire rate boosts - handle timers and cleanup expired boosts
    updateFireRateBoosts(player) {
        if (!player.fireRateBoosts || player.fireRateBoosts.length === 0) {
            return;
        }
        
        const currentTime = Date.now();
        let hasActiveBoosts = false;
        
        // Check each boost and remove expired ones
        player.fireRateBoosts = player.fireRateBoosts.filter(boost => {
            const elapsed = currentTime - boost.startTime;
            if (elapsed < boost.duration) {
                hasActiveBoosts = true;
                return true; // Keep this boost
            }
            return false; // Remove this boost
        });
        
        if (!hasActiveBoosts) {
            // No more boosts active - restore original fire rate
            if (player.originalFireCooldownTime) {
                player.fireCooldownTime = player.originalFireCooldownTime;
                player.originalFireCooldownTime = null;
            }
            player.fireRateBoosts = [];
        } else {
            // Calculate strongest boost (lowest multiplier = fastest fire rate)
            let strongestMultiplier = 1.0;
            for (let boost of player.fireRateBoosts) {
                if (boost.multiplier < strongestMultiplier) {
                    strongestMultiplier = boost.multiplier;
                }
            }
            
            // Apply the strongest boost
            if (player.originalFireCooldownTime) {
                player.fireCooldownTime = player.originalFireCooldownTime * strongestMultiplier;
            }
        }
    }

    render(ctx, player) {
        // Here we define the visible area for rendering optimization
        const visibleArea = {
            top: player.y - window.innerHeight / 2 - 100,
            right: player.x + window.innerWidth / 2 + 100,
            bottom: player.y + window.innerHeight / 2 + 100,
            left: player.x - window.innerWidth / 2 - 100
        };

        // Get current game state to determine what to render
        const gameState = window.game ? window.game.gameState : 'menu';

        // Here we draw the world boundary
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 5;
        ctx.strokeRect(
            this.boundaries.left,
            this.boundaries.top,
            this.width,
            this.height
        );
        
        // Render multi-layered parallax starfield
        this.renderStarLayers(ctx, player, visibleArea);
        
        // Only draw safe zone when actually playing the game or when dying (so players can still see it)
        if (this.safeZone.active && (gameState === 'playing' || gameState === 'dying')) {
            // Create checkered pattern with yellow/black safety stripes
            const stripeWidth = 40;
            const stripeCount = Math.ceil(this.safeZone.size / stripeWidth);
            
            // Draw transparent floor first
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#888';
            ctx.fillRect(
                this.safeZone.x - this.safeZone.size / 2,
                this.safeZone.y - this.safeZone.size / 2,
                this.safeZone.size,
                this.safeZone.size
            );
            ctx.restore();
            
            // Draw safety stripes pattern
            ctx.save();
            ctx.beginPath();
            ctx.rect(
                this.safeZone.x - this.safeZone.size / 2,
                this.safeZone.y - this.safeZone.size / 2,
                this.safeZone.size,
                this.safeZone.size
            );
            ctx.clip();
            
            // Draw stripes
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < stripeCount; i++) {
                for (let j = 0; j < stripeCount; j++) {
                    if ((i + j) % 2 === 0) {
                        ctx.fillStyle = '#ffcc00'; // Yellow
                    } else {
                        ctx.fillStyle = '#000000'; // Black
                    }
                    
                    const x = this.safeZone.x - this.safeZone.size / 2 + i * stripeWidth;
                    const y = this.safeZone.y - this.safeZone.size / 2 + j * stripeWidth;
                    ctx.fillRect(x, y, stripeWidth, stripeWidth);
                }
            }
            
            // Draw border
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#ffcc00';
            ctx.strokeRect(
                this.safeZone.x - this.safeZone.size / 2,
                this.safeZone.y - this.safeZone.size / 2,
                this.safeZone.size,
                this.safeZone.size
            );
            
            // Draw inner border
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(
                this.safeZone.x - this.safeZone.size / 2 + 5,
                this.safeZone.y - this.safeZone.size / 2 + 5,
                this.safeZone.size - 10,
                this.safeZone.size - 10
            );
            
            // Draw "SAFE ZONE" text
            ctx.globalAlpha = 1.0;
            ctx.font = 'bold 20px Orbitron, Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText('SAFE ZONE', this.safeZone.x, this.safeZone.y - this.safeZone.size / 2 - 20);
            ctx.fillText('SAFE ZONE', this.safeZone.x, this.safeZone.y - this.safeZone.size / 2 - 20);
            
            // Draw semi-transparent "SAFE ZONE" text along the inside borders
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Orbitron, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Top border text
            ctx.save();
            ctx.translate(this.safeZone.x, this.safeZone.y - this.safeZone.size / 2 + 30);
            ctx.fillText('SAFE ZONE', 0, 0);
            ctx.restore();
            
            // Bottom border text
            ctx.save();
            ctx.translate(this.safeZone.x, this.safeZone.y + this.safeZone.size / 2 - 30);
            ctx.fillText('SAFE ZONE', 0, 0);
            ctx.restore();
            
            // Left border text - rotated 90 degrees
            ctx.save();
            ctx.translate(this.safeZone.x - this.safeZone.size / 2 + 30, this.safeZone.y);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('SAFE ZONE', 0, 0);
            ctx.restore();
            
            // Right border text - rotated 90 degrees
            ctx.save();
            ctx.translate(this.safeZone.x + this.safeZone.size / 2 - 30, this.safeZone.y);
            ctx.rotate(Math.PI / 2);
            ctx.fillText('SAFE ZONE', 0, 0);
            ctx.restore();
            
            ctx.restore();
            ctx.restore();

            // Draw pulsing docking lights at cardinal points
            const dockingLightRadius = 10 + 5 * Math.sin(this.safeZone.pulsePhase);
            const dockingLightPositions = [
                { x: this.safeZone.x, y: this.safeZone.y - this.safeZone.size / 2 }, // North
                { x: this.safeZone.x + this.safeZone.size / 2, y: this.safeZone.y }, // East
                { x: this.safeZone.x, y: this.safeZone.y + this.safeZone.size / 2 }, // South
                { x: this.safeZone.x - this.safeZone.size / 2, y: this.safeZone.y }  // West
            ];

            // Draw outer glow for docking lights
            dockingLightPositions.forEach(pos => {
                const glowRadius = dockingLightRadius * 2.5;
                const gradient = ctx.createRadialGradient(
                    pos.x, pos.y, 0,
                    pos.x, pos.y, glowRadius
                );
                gradient.addColorStop(0, 'rgba(255, 50, 50, 0.8)');
                gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.5)');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw the actual docking lights
            ctx.save();
            dockingLightPositions.forEach(pos => {
                // Main red light
                ctx.fillStyle = '#ff0000';
                ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.safeZone.pulsePhase);
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, dockingLightRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Bright center
                ctx.fillStyle = '#ffaaaa';
                ctx.globalAlpha = 0.9;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, dockingLightRadius * 0.6, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        // Here we draw asteroids
        this.asteroids.forEach(asteroid => {
            ctx.save();
            ctx.translate(asteroid.x, asteroid.y);
            ctx.rotate(asteroid.rotation);

            // Draw the asteroid using its vertices
            ctx.fillStyle = '#aaa';
            ctx.beginPath();
            
            // Safety check for vertices
            if (!asteroid.vertices || !Array.isArray(asteroid.vertices)) {
                console.warn(`Asteroid ${asteroid.id} missing vertices, generating new ones`);
                asteroid.vertices = this.generateAsteroidVertices(Math.floor(6 + Math.random() * 4), 0.5);
            }
            
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

        // Only draw powerups when in playing or dying mode
        if (gameState === 'playing' || gameState === 'dying') {
            // Here we draw powerups
            this.powerups.forEach(powerup => {
                // Calculate pulse effect
                const pulseScale = 1 + 0.2 * Math.sin(powerup.pulsePhase);

                // Determine color and label based on powerup type
                let color;
                let label;
                switch (powerup.type) {
                    case 'health':
                        color = '#3f3';  // Bright green (matches UI)
                        label = 'HEALTH';
                        break;
                    case 'weapon':
                        color = '#f33';  // Red (fire rate boost)
                        label = 'FIRE RATE';
                        break;
                    case 'shield':
                        color = '#33f';  // Blue (matches UI)
                        label = 'SHIELD';
                        break;
                    case 'energy':
                        color = '#f0f';  // Pink/magenta (matches UI)
                        label = 'ENERGY';
                        break;
                    case 'credits':
                        color = '#ff0';  // Yellow (like gold/coins)
                        label = 'CREDITS';
                        break;
                    default:
                        color = '#fff';
                        label = 'ITEM';
                }

                ctx.save();
                ctx.translate(powerup.x, powerup.y);

                // Here we draw the outer glow
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.3;  // Transparent
                ctx.beginPath();
                ctx.arc(0, 0, powerup.radius * pulseScale * 1.5, 0, Math.PI * 2);
                ctx.fill();

                // Here we draw the inner core
                ctx.globalAlpha = 1;  // Fully opaque
                ctx.beginPath();
                ctx.arc(0, 0, powerup.radius * pulseScale * 0.7, 0, Math.PI * 2);
                ctx.fill();

                // Here we draw the label text
                ctx.font = '11px Orbitron, Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;

                // Outlined text for better visibility
                ctx.strokeText(label, 0, powerup.radius * 1.8);
                ctx.fillText(label, 0, powerup.radius * 1.8);

                ctx.restore();
            });

            // Here we draw explosions
            this.explosions.forEach(explosion => {
                const maxTime = explosion.type === 'rocket' ? 0.7 : 0.5;
                const radiusRatio = explosion.timeLeft / maxTime;
                const currentRadius = explosion.maxRadius * (1 - radiusRatio);
                const opacity = explosion.timeLeft * (explosion.type === 'rocket' ? 1.4 : 2);

                // Get explosion colors based on type
                const baseColor = explosion.color || '#ff4400';
                let strokeColor, centerColor, middleColor;
                
                if (explosion.type === 'rocket') {
                    strokeColor = `rgba(255, 150, 0, ${opacity * 0.8})`;     // Bright orange for rockets
                    centerColor = `rgba(255, 255, 150, ${opacity})`;         // Bright yellow center
                    middleColor = `rgba(255, 100, 0, ${opacity * 0.8})`;     // Deep orange middle
                } else {
                    strokeColor = `rgba(255, 200, 50, ${opacity * 0.7})`;    // Default orange-yellow
                    centerColor = `rgba(255, 255, 200, ${opacity})`;         // Bright center
                    middleColor = `rgba(255, 120, 50, ${opacity * 0.8})`;    // Orange middle
                }

                // Draw explosion ring
                ctx.beginPath();
                ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = explosion.type === 'rocket' ? 4 : 3;
                ctx.stroke();

                // Draw explosion glow using radial gradient
                const gradient = ctx.createRadialGradient(
                    explosion.x, explosion.y, 0,
                    explosion.x, explosion.y, currentRadius * 0.8
                );
                gradient.addColorStop(0, centerColor);      // Bright center
                gradient.addColorStop(0.3, middleColor);    // Colored middle
                gradient.addColorStop(1, 'rgba(255, 50, 0, 0)'); // Transparent edge

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(explosion.x, explosion.y, currentRadius * 0.8, 0, Math.PI * 2);
                ctx.fill();
            });

            // Here we draw particles (debris, etc.)
            this.particles.forEach(particle => {
                ctx.save();
                ctx.translate(particle.x, particle.y);

                if (particle.rotation) {
                    ctx.rotate(particle.rotation);
                }

                // Fade out as lifetime decreases
                ctx.globalAlpha = particle.life;
                ctx.fillStyle = particle.color;

                // Different drawing for different particle types
                if (particle.color === '#ffbb00') {  // Sparks
                    ctx.beginPath();
                    ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {  // Debris
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

    // Render all star layers with parallax effect
    renderStarLayers(ctx, player, visibleArea) {
        // Draw standard stars from oldest code for backward compatibility
        this.stars.forEach(star => {
            // Only draw stars in visible area (optimization)
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

        // Calculate screen center for parallax
        const centerX = player.x;
        const centerY = player.y;

        // Loop through each star layer for parallax (except special stars)
        for (let layerIndex = 0; layerIndex < this.starLayers.length - 1; layerIndex++) {
            const stars = this.starLayers[layerIndex];
            const parallaxFactor = (layerIndex + 1) * 0.2; // Increase factor with each layer
            
            stars.forEach(star => {
                // Apply parallax offset based on player position
                const parallaxX = star.x - (centerX * star.parallaxFactor);
                const parallaxY = star.y - (centerY * star.parallaxFactor);
                
                // Only draw if within visible area
                if (
                    parallaxX >= visibleArea.left &&
                    parallaxX <= visibleArea.right &&
                    parallaxY >= visibleArea.top &&
                    parallaxY <= visibleArea.bottom
                ) {
                    // Calculate blinking effect for stars that blink
                    let brightness = star.brightness;
                    if (star.blinkSpeed > 0) {
                        brightness *= 0.7 + 0.3 * Math.sin(star.blinkPhase);
                    }
                    
                    ctx.fillStyle = star.color || `rgba(255, 255, 255, ${brightness})`;
                    if (star.color && star.color.startsWith('#')) {
                        // For hex colors, apply alpha
                        ctx.globalAlpha = brightness;
                    }
                    
                    ctx.beginPath();
                    ctx.arc(parallaxX, parallaxY, star.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Reset global alpha if we changed it
                    if (star.color && star.color.startsWith('#')) {
                        ctx.globalAlpha = 1.0;
                    }
                }
            });
        }
        
        // Render special stars (bright stars, binary systems, etc.)
        const specialStars = this.starLayers[3] || [];
        specialStars.forEach(star => {
            // Apply parallax offset
            const parallaxX = star.x - (centerX * star.parallaxFactor);
            const parallaxY = star.y - (centerY * star.parallaxFactor);
            
            // Only draw if in visible area
            if (
                parallaxX >= visibleArea.left &&
                parallaxX <= visibleArea.right &&
                parallaxY >= visibleArea.top &&
                parallaxY <= visibleArea.bottom
            ) {
                ctx.save();
                ctx.translate(parallaxX, parallaxY);
                
                if (star.type === 'bright') {
                    // Draw glow halo
                    if (star.hasGlow) {
                        const gradient = ctx.createRadialGradient(
                            0, 0, 0,
                            0, 0, star.glowSize
                        );
                        
                        let brightness = star.brightness;
                        if (star.blinkSpeed > 0) {
                            brightness *= 0.7 + 0.3 * Math.sin(star.blinkPhase);
                        }
                        
                        gradient.addColorStop(0, star.color);
                        gradient.addColorStop(0.5, star.color.replace('80%', '50%').replace(')', ', 0.5)'));
                        gradient.addColorStop(1, 'transparent');
                        
                        ctx.fillStyle = gradient;
                        ctx.globalAlpha = brightness * 0.6;
                        ctx.beginPath();
                        ctx.arc(0, 0, star.glowSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    // Draw actual star
                    let brightness = star.brightness;
                    if (star.blinkSpeed > 0) {
                        brightness *= 0.7 + 0.3 * Math.sin(star.blinkPhase);
                    }
                    
                    ctx.fillStyle = star.color;
                    ctx.globalAlpha = brightness;
                    ctx.beginPath();
                    ctx.arc(0, 0, star.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add cross-shaped light ray for bright stars
                    const rayLength = star.size * 4;
                    ctx.globalAlpha = brightness * 0.4;
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = star.color;
                    
                    // Horizontal ray
                    ctx.beginPath();
                    ctx.moveTo(-rayLength, 0);
                    ctx.lineTo(rayLength, 0);
                    ctx.stroke();
                    
                    // Vertical ray
                    ctx.beginPath();
                    ctx.moveTo(0, -rayLength);
                    ctx.lineTo(0, rayLength);
                    ctx.stroke();
                    
                } else if (star.type === 'binary') {
                    // Draw binary star system
                    const orbitX = Math.cos(star.orbitPhase) * star.orbitRadius;
                    const orbitY = Math.sin(star.orbitPhase) * star.orbitRadius;
                    
                    // First star
                    ctx.fillStyle = star.color;
                    ctx.globalAlpha = star.brightness;
                    ctx.beginPath();
                    ctx.arc(-orbitX/2, -orbitY/2, star.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Second star
                    ctx.fillStyle = star.secondaryColor;
                    ctx.beginPath();
                    ctx.arc(orbitX/2, orbitY/2, star.size * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Faint connecting line/orbit trail
                    ctx.globalAlpha = 0.2;
                    ctx.strokeStyle = 'white';
                    ctx.beginPath();
                    ctx.moveTo(-orbitX/2, -orbitY/2);
                    ctx.lineTo(orbitX/2, orbitY/2);
                    ctx.stroke();
                    
                } else if (star.type === 'pulsar') {
                    // Draw pulsing star
                    const pulsePhase = star.pulsePhase;
                    const pulseSize = star.baseSize * (0.6 + 0.4 * Math.sin(pulsePhase));
                    
                    // Outer glow
                    const gradient = ctx.createRadialGradient(
                        0, 0, 0,
                        0, 0, pulseSize * 2
                    );
                    gradient.addColorStop(0, star.color);
                    gradient.addColorStop(0.5, star.color.replace('75%', '50%').replace(')', ', 0.3)'));
                    gradient.addColorStop(1, 'transparent');
                    
                    ctx.fillStyle = gradient;
                    ctx.globalAlpha = 0.5 * (0.6 + 0.4 * Math.abs(Math.sin(pulsePhase)));
                    ctx.beginPath();
                    ctx.arc(0, 0, pulseSize * 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Core
                    ctx.fillStyle = star.color;
                    ctx.globalAlpha = 0.9;
                    ctx.beginPath();
                    ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                } else if (star.type === 'cluster') {
                    // Draw nebula-like cluster
                    ctx.rotate(star.rotation);
                    
                    // Draw nebula cloud
                    ctx.fillStyle = star.color;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.arc(0, 0, star.clusterSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw individual stars in the cluster
                    ctx.globalAlpha = 1.0;
                    star.stars.forEach(miniStar => {
                        ctx.fillStyle = 'rgba(255, 255, 255, ' + miniStar.brightness + ')';
                        ctx.beginPath();
                        ctx.arc(
                            miniStar.offsetX,
                            miniStar.offsetY,
                            miniStar.size,
                            0, Math.PI * 2
                        );
                        ctx.fill();
                    });
                }
                
                ctx.restore();
            }
        });
        
        // Draw shooting stars
        this.shootingStars.forEach(shootingStar => {
            // Calculate trail points
            const trailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.trailLength * shootingStar.life;
            const trailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.trailLength * shootingStar.life;
            
            // Draw the shooting star trail
            const gradient = ctx.createLinearGradient(
                shootingStar.x, shootingStar.y,
                trailX, trailY
            );
            
            // Fix the incorrect color format that was causing the error
            const colorBase = shootingStar.color.replace('#', '');
            gradient.addColorStop(0, shootingStar.color);
            gradient.addColorStop(0.6, `rgba(${parseInt(colorBase.substr(0, 2), 16)}, ${parseInt(colorBase.substr(2, 2), 16)}, ${parseInt(colorBase.substr(4, 2), 16)}, 0.5)`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = shootingStar.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(shootingStar.x, shootingStar.y);
            ctx.lineTo(trailX, trailY);
            ctx.stroke();
            
            // Draw the head/core of the shooting star
            ctx.fillStyle = 'rgba(255, 255, 255, ' + shootingStar.life + ')';
            ctx.beginPath();
            ctx.arc(shootingStar.x, shootingStar.y, shootingStar.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Add a twinkle effect at the head
            const twinkleSize = shootingStar.size * 3 * Math.abs(Math.sin(shootingStar.life * shootingStar.twinkleFreq));
            ctx.fillStyle = 'rgba(255, 255, 255, ' + shootingStar.life * 0.7 + ')';
            
            ctx.beginPath();
            ctx.moveTo(shootingStar.x, shootingStar.y - twinkleSize);
            ctx.lineTo(shootingStar.x + twinkleSize/3, shootingStar.y - twinkleSize/3);
            ctx.lineTo(shootingStar.x + twinkleSize, shootingStar.y);
            ctx.lineTo(shootingStar.x + twinkleSize/3, shootingStar.y + twinkleSize/3);
            ctx.lineTo(shootingStar.x, shootingStar.y + twinkleSize);
            ctx.lineTo(shootingStar.x - twinkleSize/3, shootingStar.y + twinkleSize/3);
            ctx.lineTo(shootingStar.x - twinkleSize, shootingStar.y);
            ctx.lineTo(shootingStar.x - twinkleSize/3, shootingStar.y - twinkleSize/3);
            ctx.closePath();
            ctx.fill();
        });
    }
}