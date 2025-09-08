// NPC System for SuperSpace
// Handles AI-controlled enemy spaceships including alien scouts and dreadnaughts

export class NPCManager {
    constructor(world, soundManager) {
        this.world = world;
        this.soundManager = soundManager;
        this.npcs = [];
        this.nextId = 0;
        
        // Dreadnaught event system
        this.dreadnaughtActive = false;
        this.dreadnaughtWarningSent = false;
        this.dreadnaughtAnnounceTimer = 0;
        
        // Alien spawn chances (high for testing)
        this.alienSpawnChance = 0.8; // 80% chance for testing (normally would be 0.1-0.2)
        
        // Timeout timers for NPCs
        this.alienLifespan = 120000; // 2 minutes before aliens fly away
        this.dreadnaughtRetreatTimer = 180000; // 3 minutes before dreadnaught retreats
    }
    
    // Create an alien scout that emerges from an asteroid
    spawnAlienFromAsteroid(asteroidX, asteroidY, forceSpawn = false) {
        if (!forceSpawn && Math.random() > this.alienSpawnChance) return;
        
        const alien = {
            id: `alien_${this.nextId++}`,
            type: 'alien_scout',
            x: asteroidX + (Math.random() - 0.5) * 100,
            y: asteroidY + (Math.random() - 0.5) * 100,
            rotation: Math.random() * Math.PI * 2,
            velocity: { x: 0, y: 0 },
            health: 30,
            maxHealth: 30,
            radius: 20,
            speed: 150,
            
            // AI behavior
            target: null,
            lastFireTime: 0,
            fireRate: 1000, // Fire every 1 second
            aggroRange: 400,
            attackRange: 300,
            
            // Visual effects
            glowPhase: Math.random() * Math.PI * 2,
            emergingEffect: {
                scale: 0.1,
                opacity: 0.3,
                duration: 1.5,
                elapsed: 0
            },
            
            // Movement AI
            patrolAngle: Math.random() * Math.PI * 2,
            patrolRadius: 200,
            patrolCenter: { x: asteroidX, y: asteroidY },
            state: 'emerging', // emerging, patrolling, attacking, fleeing, leaving
            spawnTime: Date.now(),
            lastTargetTime: 0 // Track when alien last had a target
        };
        
        this.npcs.push(alien);
        
        // Broadcast alien spawn to other players
        this.broadcastNPCSpawn(alien);
        
        // Play emergence sound effect
        if (this.soundManager) {
            this.soundManager.play('hit', {
                volume: 0.5,
                playbackRate: 0.3,
                position: { x: asteroidX, y: asteroidY }
            });
        }
        
        // Show warning message
        if (window.game && window.game.ui) {
            this.showMessage('⚠️ ALIEN DETECTED', '#0f0', 2000);
        }
        
        return alien;
    }
    
    // Spawn the massive Dreadnaught boss
    spawnDreadnaught() {
        if (this.dreadnaughtActive) {
            console.log('Dreadnaught already active, cannot spawn another');
            return null; // Only one dreadnaught at a time
        }
        
        // Double-check by looking for existing dreadnaughts
        const existingDreadnaught = this.npcs.find(npc => npc.type === 'dreadnaught');
        if (existingDreadnaught) {
            console.log('Found existing dreadnaught in NPC list, cannot spawn');
            this.dreadnaughtActive = true;
            return null;
        }
        
        // Spawn at edge of map
        const spawnSide = Math.floor(Math.random() * 4);
        let x, y;
        const worldBounds = this.world.boundaries;
        
        switch (spawnSide) {
            case 0: // Top
                x = Math.random() * this.world.width - this.world.width / 2;
                y = worldBounds.top - 100;
                break;
            case 1: // Right  
                x = worldBounds.right + 100;
                y = Math.random() * this.world.height - this.world.height / 2;
                break;
            case 2: // Bottom
                x = Math.random() * this.world.width - this.world.width / 2;
                y = worldBounds.bottom + 100;
                break;
            case 3: // Left
                x = worldBounds.left - 100;
                y = Math.random() * this.world.height - this.world.height / 2;
                break;
        }
        
        const dreadnaught = {
            id: `dreadnaught_${this.nextId++}`,
            type: 'dreadnaught',
            x: x,
            y: y,
            rotation: 0,
            velocity: { x: 0, y: 0 },
            health: 1000,
            maxHealth: 1000,
            radius: 120,
            speed: 50,
            
            // AI behavior
            target: null,
            lastFireTime: 0,
            fireRate: 500, // Fire every 0.5 seconds
            burstCount: 0,
            burstMax: 5,
            burstCooldown: 3000,
            lastBurstTime: 0,
            aggroRange: 1000, // Increased aggro range for earlier detection
            attackRange: 700, // Slightly increased attack range
            
            // Visual effects
            shieldPhase: 0,
            engineGlowPhase: 0,
            warningFlash: 0,
            
            // Movement AI
            targetPosition: { x: 0, y: 0 }, // Move toward center
            state: 'approaching', // approaching, combat, retreating, leaving
            spawnTime: Date.now(),
            lastPlayerContact: Date.now(), // Track when dreadnaught last saw players
            
            // Weapons
            weaponMounts: [
                { x: -40, y: -60, lastFire: 0 },
                { x: 40, y: -60, lastFire: 0 },
                { x: -60, y: 0, lastFire: 0 },
                { x: 60, y: 0, lastFire: 0 },
                { x: 0, y: 40, lastFire: 0 }
            ]
        };
        
        this.npcs.push(dreadnaught);
        this.dreadnaughtActive = true;
        this.dreadnaughtWarningSent = false;
        
        // Broadcast NPC spawn to other players
        this.broadcastNPCSpawn(dreadnaught);
        
        // Show dramatic warning
        this.showDreadnaughtWarning();
        
        return dreadnaught;
    }
    
    // Show dramatic dreadnaught warning
    showDreadnaughtWarning() {
        if (window.game && window.game.ui) {
            // Flash red warning text
            this.showMessage('⚠️ DREADNAUGHT DETECTED ⚠️', '#f00', 5000, true);
            
            // Skip screen flash effect - function doesn't exist
            // TODO: Implement screen flash in game engine if needed
        }
        
        // Play warning sound
        if (this.soundManager) {
            this.soundManager.play('explosion', {
                volume: 0.8,
                playbackRate: 0.5
            });
        }
    }
    
    // Update all NPCs
    update(deltaTime, player) {
        for (let i = this.npcs.length - 1; i >= 0; i--) {
            const npc = this.npcs[i];
            
            if (npc.health <= 0) {
                this.destroyNPC(npc, i);
                continue;
            }
            
            // Check for timeout/lifespan
            const age = Date.now() - npc.spawnTime;
            if (npc.type === 'alien_scout' && age > this.alienLifespan) {
                // Alien flies away after timeout
                npc.state = 'leaving';
            } else if (npc.type === 'dreadnaught' && age > this.dreadnaughtRetreatTimer) {
                // Dreadnaught retreats after timeout
                npc.state = 'leaving';
            }
            
            // Skip AI updates for remote NPCs (they're controlled by other players)
            if (npc.isRemote) {
                // Only update visual effects for remote NPCs
                if (npc.type === 'alien_scout') {
                    npc.glowPhase += deltaTime * 3;
                } else if (npc.type === 'dreadnaught') {
                    npc.shieldPhase += deltaTime * 2;
                    npc.engineGlowPhase += deltaTime * 4;
                    npc.warningFlash += deltaTime * 8;
                }
                continue;
            }
            
            // Run AI for local NPCs only
            if (npc.type === 'alien_scout') {
                this.updateAlienScout(npc, deltaTime, player);
            } else if (npc.type === 'dreadnaught') {
                this.updateDreadnaught(npc, deltaTime, player);
            }
            
            // Broadcast NPC state updates for local NPCs (throttled)
            if (!npc.isRemote && (!npc.lastBroadcast || Date.now() - npc.lastBroadcast > 100)) {
                this.broadcastNPCUpdate(npc);
                npc.lastBroadcast = Date.now();
            }
            
            // Remove NPCs that have left the map
            if (npc.state === 'leaving' && this.isOffScreen(npc)) {
                this.npcs.splice(i, 1);
                
                // Broadcast departure to other players
                this.broadcastNPCLeaving(npc);
                
                if (npc.type === 'dreadnaught') {
                    this.dreadnaughtActive = false;
                    this.showMessage('Dreadnaught has left the area...', '#888', 3000);
                }
            }
        }
    }
    
    // Check if entity is in safe zone
    isInSafeZone(entity) {
        if (!this.world || !this.world.safeZone) return false;
        
        const dx = entity.x - this.world.safeZone.x;
        const dy = entity.y - this.world.safeZone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < this.world.safeZone.size / 2;
    }
    
    // Check if NPC is off screen/out of world bounds
    isOffScreen(npc) {
        const bounds = this.world.boundaries;
        const margin = 200; // Extra margin before considering "off screen"
        
        return (npc.x < bounds.left - margin || 
                npc.x > bounds.right + margin ||
                npc.y < bounds.top - margin || 
                npc.y > bounds.bottom + margin);
    }
    
    // Update alien scout AI
    updateAlienScout(alien, deltaTime, player) {
        // Update visual effects
        alien.glowPhase += deltaTime * 3;
        
        // Handle emerging state
        if (alien.state === 'emerging') {
            alien.emergingEffect.elapsed += deltaTime;
            const progress = alien.emergingEffect.elapsed / alien.emergingEffect.duration;
            
            if (progress >= 1) {
                alien.state = 'patrolling';
                alien.emergingEffect.scale = 1;
                alien.emergingEffect.opacity = 1;
            } else {
                alien.emergingEffect.scale = 0.1 + (progress * 0.9);
                alien.emergingEffect.opacity = 0.3 + (progress * 0.7);
            }
            return;
        }
        
        // Find closest target (player or other players)
        const targets = [player];
        if (window.game && window.game.multiplayer && window.game.multiplayer.players) {
            targets.push(...Object.values(window.game.multiplayer.players));
        }
        
        let closestTarget = null;
        let closestDistance = Infinity;
        
        targets.forEach(target => {
            if (!target || target.destroyed) return;
            const dx = target.x - alien.x;
            const dy = target.y - alien.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = target;
            }
        });
        
        alien.target = closestTarget;
        
        // Check for leaving state
        if (alien.state === 'leaving') {
            // Fly toward edge of map
            const bounds = this.world.boundaries;
            const centerX = (bounds.left + bounds.right) / 2;
            const centerY = (bounds.top + bounds.bottom) / 2;
            
            // Choose the closest edge to fly toward
            let targetX, targetY;
            if (Math.abs(alien.x - bounds.left) < Math.abs(alien.x - bounds.right)) {
                targetX = bounds.left - 300; // Fly off left edge
                targetY = alien.y;
            } else {
                targetX = bounds.right + 300; // Fly off right edge
                targetY = alien.y;
            }
            
            const dx = targetX - alien.x;
            const dy = targetY - alien.y;
            alien.rotation = Math.atan2(dy, dx) + Math.PI / 2;
            alien.velocity.x = Math.cos(alien.rotation - Math.PI / 2) * alien.speed * deltaTime;
            alien.velocity.y = Math.sin(alien.rotation - Math.PI / 2) * alien.speed * deltaTime;
        }
        else if (closestTarget && closestDistance < alien.aggroRange && !this.isInSafeZone(closestTarget)) {
            // Attack mode
            alien.state = 'attacking';
            alien.lastTargetTime = Date.now();
            const dx = closestTarget.x - alien.x;
            const dy = closestTarget.y - alien.y;
            
            // Don't attack if alien is in safe zone
            if (this.isInSafeZone(alien)) {
                // Move out of safe zone first
                const safeZone = this.world.safeZone;
                const escapeX = alien.x + (alien.x - safeZone.x) * 2; // Move away from center
                const escapeY = alien.y + (alien.y - safeZone.y) * 2;
                
                alien.velocity.x = Math.cos(Math.atan2(escapeY - alien.y, escapeX - alien.x)) * alien.speed * deltaTime;
                alien.velocity.y = Math.sin(Math.atan2(escapeY - alien.y, escapeX - alien.x)) * alien.speed * deltaTime;
            } else {
                // Face target
                alien.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                
                // Move toward target but maintain distance
                if (closestDistance > alien.attackRange * 0.8) {
                    alien.velocity.x = Math.cos(alien.rotation - Math.PI / 2) * alien.speed * deltaTime;
                    alien.velocity.y = Math.sin(alien.rotation - Math.PI / 2) * alien.speed * deltaTime;
                } else if (closestDistance < alien.attackRange * 0.5) {
                    // Back away
                    alien.velocity.x = -Math.cos(alien.rotation - Math.PI / 2) * alien.speed * deltaTime;
                    alien.velocity.y = -Math.sin(alien.rotation - Math.PI / 2) * alien.speed * deltaTime;
                }
                
                // Fire at target (only if not in safe zone)
                if (Date.now() - alien.lastFireTime > alien.fireRate) {
                    this.fireAlienWeapon(alien, closestTarget);
                    alien.lastFireTime = Date.now();
                }
            }
        } else {
            // Check if alien has been without a target for too long
            if (alien.lastTargetTime > 0 && Date.now() - alien.lastTargetTime > 30000) { // 30 seconds without target
                alien.state = 'leaving';
                return;
            }
            
            // Patrol mode
            alien.state = 'patrolling';
            alien.patrolAngle += deltaTime * 0.5;
            
            const targetX = alien.patrolCenter.x + Math.cos(alien.patrolAngle) * alien.patrolRadius;
            const targetY = alien.patrolCenter.y + Math.sin(alien.patrolAngle) * alien.patrolRadius;
            
            const dx = targetX - alien.x;
            const dy = targetY - alien.y;
            
            alien.rotation = Math.atan2(dy, dx) + Math.PI / 2;
            alien.velocity.x = Math.cos(alien.rotation - Math.PI / 2) * alien.speed * 0.3 * deltaTime;
            alien.velocity.y = Math.sin(alien.rotation - Math.PI / 2) * alien.speed * 0.3 * deltaTime;
        }
        
        // Apply movement
        alien.x += alien.velocity.x;
        alien.y += alien.velocity.y;
        
        // Keep in world bounds
        this.world.wrapPosition(alien);
    }
    
    // Update dreadnaught AI
    updateDreadnaught(dreadnaught, deltaTime, player) {
        // Update visual effects
        dreadnaught.shieldPhase += deltaTime * 2;
        dreadnaught.engineGlowPhase += deltaTime * 4;
        dreadnaught.warningFlash += deltaTime * 8;
        
        // Show warning periodically
        if (!this.dreadnaughtWarningSent || (Date.now() % 10000 < 100)) {
            if (!this.dreadnaughtWarningSent) {
                this.dreadnaughtWarningSent = true;
            }
        }
        
        // Find all potential targets
        const targets = [player];
        if (window.game && window.game.multiplayer && window.game.multiplayer.players) {
            targets.push(...Object.values(window.game.multiplayer.players));
        }
        
        let closestTarget = null;
        let closestDistance = Infinity;
        
        targets.forEach(target => {
            if (!target || target.destroyed) return;
            const dx = target.x - dreadnaught.x;
            const dy = target.y - dreadnaught.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = target;
            }
        });
        
        // Improved target selection - MUCH more sticky to current target
        if (dreadnaught.target && closestTarget) {
            const currentTargetDistance = Math.sqrt(
                (dreadnaught.target.x - dreadnaught.x) ** 2 + 
                (dreadnaught.target.y - dreadnaught.y) ** 2
            );
            
            // Only switch targets if:
            // 1. New target is MUCH closer (50% closer) OR
            // 2. Current target is very far away (>1000 units) OR  
            // 3. Haven't switched targets in the last 10 seconds
            const timeSinceLastSwitch = Date.now() - (dreadnaught.lastTargetSwitch || 0);
            const shouldSwitch = (
                closestDistance < currentTargetDistance * 0.5 || // Much closer target
                currentTargetDistance > 1000 || // Current target too far
                timeSinceLastSwitch > 10000 // Been targeting same for 10+ seconds
            );
            
            if (shouldSwitch) {
                dreadnaught.target = closestTarget;
                dreadnaught.lastTargetSwitch = Date.now();
            }
        } else {
            dreadnaught.target = closestTarget;
            dreadnaught.lastTargetSwitch = Date.now();
        }
        
        // Update last player contact time if any players are nearby
        if (closestTarget && closestDistance < dreadnaught.aggroRange * 1.5) {
            dreadnaught.lastPlayerContact = Date.now();
        }
        
        // Check if dreadnaught should retreat (no players for a while)
        if (Date.now() - dreadnaught.lastPlayerContact > 60000) { // 1 minute without players
            dreadnaught.state = 'leaving';
        }
        
        // Movement AI based on state
        if (dreadnaught.state === 'leaving') {
            // Retreat to edge of map
            const bounds = this.world.boundaries;
            const targetX = dreadnaught.x > 0 ? bounds.right + 300 : bounds.left - 300;
            const targetY = dreadnaught.y > 0 ? bounds.bottom + 300 : bounds.top - 300;
            
            const dx = targetX - dreadnaught.x;
            const dy = targetY - dreadnaught.y;
            
            dreadnaught.rotation = Math.atan2(dy, dx) + Math.PI / 2;
            dreadnaught.velocity.x = Math.cos(dreadnaught.rotation - Math.PI / 2) * dreadnaught.speed * deltaTime;
            dreadnaught.velocity.y = Math.sin(dreadnaught.rotation - Math.PI / 2) * dreadnaught.speed * deltaTime;
        }
        else if (dreadnaught.state === 'approaching') {
            // Check if we should avoid approaching safe zone - change target if needed
            const safeZone = this.world.safeZone;
            const distanceToSafeZone = Math.sqrt(
                (dreadnaught.targetPosition.x - safeZone.x) ** 2 + 
                (dreadnaught.targetPosition.y - safeZone.y) ** 2
            );
            
            // If target is in safe zone, find new target position away from safe zone
            if (distanceToSafeZone < safeZone.size / 2 + 200) {
                // Pick a new target position outside safe zone
                const angle = Math.random() * Math.PI * 2;
                const distance = safeZone.size / 2 + 500;
                dreadnaught.targetPosition = {
                    x: safeZone.x + Math.cos(angle) * distance,
                    y: safeZone.y + Math.sin(angle) * distance
                };
            }
            
            // Move toward target position
            const dx = dreadnaught.targetPosition.x - dreadnaught.x;
            const dy = dreadnaught.targetPosition.y - dreadnaught.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Switch to combat mode earlier if players are nearby
            if (distance < 100 || (closestTarget && closestDistance < dreadnaught.aggroRange)) {
                dreadnaught.state = 'combat';
            } else {
                dreadnaught.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                dreadnaught.velocity.x = Math.cos(dreadnaught.rotation - Math.PI / 2) * dreadnaught.speed * deltaTime;
                dreadnaught.velocity.y = Math.sin(dreadnaught.rotation - Math.PI / 2) * dreadnaught.speed * deltaTime;
            }
            
            // Fire weapons while approaching if players are in range and attacking
            if (closestTarget && closestDistance < dreadnaught.attackRange) {
                const targetInSafeZone = this.world.isInSafeZone && this.world.isInSafeZone(closestTarget);
                if (!targetInSafeZone) {
                    // Face the target while approaching
                    const targetDx = closestTarget.x - dreadnaught.x;
                    const targetDy = closestTarget.y - dreadnaught.y;
                    dreadnaught.rotation = Math.atan2(targetDy, targetDx) + Math.PI / 2;
                    
                    this.fireDreadnaughtWeapons(dreadnaught, targets, deltaTime);
                }
            }
        } else if (dreadnaught.state === 'combat') {
            // Combat maneuvers - slow circle strafe, but avoid safe zone
            const safeZone = this.world.safeZone;
            const distanceToSafeZone = Math.sqrt(
                (dreadnaught.x - safeZone.x) ** 2 + 
                (dreadnaught.y - safeZone.y) ** 2
            );
            
            // Stay at least 400 units away from safe zone center
            const minSafeDistance = safeZone.size / 2 + 400;
            
            if (distanceToSafeZone < minSafeDistance) {
                // Move away from safe zone
                const awayAngle = Math.atan2(dreadnaught.y - safeZone.y, dreadnaught.x - safeZone.x);
                dreadnaught.velocity.x = Math.cos(awayAngle) * dreadnaught.speed * deltaTime;
                dreadnaught.velocity.y = Math.sin(awayAngle) * dreadnaught.speed * deltaTime;
                dreadnaught.rotation = awayAngle + Math.PI / 2;
            } else {
                // Normal circle strafe pattern
                const circleAngle = Date.now() / 5000;
                const circleRadius = 400;
                const targetX = Math.cos(circleAngle) * circleRadius;
                const targetY = Math.sin(circleAngle) * circleRadius;
                
                const dx = targetX - dreadnaught.x;
                const dy = targetY - dreadnaught.y;
                
                dreadnaught.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                dreadnaught.velocity.x = dx * 0.1 * deltaTime;
                dreadnaught.velocity.y = dy * 0.1 * deltaTime;
            }
            
            // Only fire weapons if no players are in safe zone
            if (closestTarget && closestDistance < dreadnaught.attackRange) {
                const targetInSafeZone = this.world.isInSafeZone && this.world.isInSafeZone(closestTarget);
                if (!targetInSafeZone) {
                    this.fireDreadnaughtWeapons(dreadnaught, targets, deltaTime);
                }
            }
        }
        
        // Apply movement
        dreadnaught.x += dreadnaught.velocity.x;
        dreadnaught.y += dreadnaught.velocity.y;
        
        // Only limit bounds if not leaving - let it go off-screen when leaving
        if (dreadnaught.state !== 'leaving') {
            const bounds = this.world.boundaries;
            dreadnaught.x = Math.max(bounds.left + 200, Math.min(bounds.right - 200, dreadnaught.x));
            dreadnaught.y = Math.max(bounds.top + 200, Math.min(bounds.bottom - 200, dreadnaught.y));
        }
    }
    
    // Fire alien scout weapon
    fireAlienWeapon(alien, target) {
        // SAFETY: Never fire weapons for remote NPCs
        if (alien.isRemote) {
            console.warn('Attempted to fire weapon for remote NPC, blocked!');
            return;
        }
        
        const dx = target.x - alien.x;
        const dy = target.y - alien.y;
        const angle = Math.atan2(dy, dx);
        
        // Create alien plasma projectile
        const projectile = {
            x: alien.x + Math.cos(angle) * 25,
            y: alien.y + Math.sin(angle) * 25,
            velocityX: Math.cos(angle) * 300,
            velocityY: Math.sin(angle) * 300,
            damage: 15,
            type: 'alien_plasma',
            owner: alien.id,
            color: '#0f0',
            size: 6,
            life: 1,
            maxLife: 3,
            update: function(deltaTime) {
                this.x += this.velocityX * deltaTime;
                this.y += this.velocityY * deltaTime;
                this.life -= deltaTime / this.maxLife;
            },
            render: function(ctx) {
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };
        
        if (!this.world.npcProjectiles) {
            this.world.npcProjectiles = [];
        }
        this.world.npcProjectiles.push(projectile);
        
        // Play alien weapon sound
        if (this.soundManager) {
            this.soundManager.play('laser', {
                volume: 0.3,
                playbackRate: 0.7,
                position: { x: alien.x, y: alien.y }
            });
        }
    }
    
    // Fire dreadnaught weapons
    fireDreadnaughtWeapons(dreadnaught, targets, deltaTime) {
        // SAFETY: Never fire weapons for remote NPCs
        if (dreadnaught.isRemote) {
            console.warn('Attempted to fire dreadnaught weapons for remote NPC, blocked!');
            return;
        }
        
        const currentTime = Date.now();
        
        // Burst fire system
        if (currentTime - dreadnaught.lastBurstTime > dreadnaught.burstCooldown) {
            dreadnaught.burstCount = 0;
            dreadnaught.lastBurstTime = currentTime;
        }
        
        if (dreadnaught.burstCount < dreadnaught.burstMax && 
            currentTime - dreadnaught.lastFireTime > dreadnaught.fireRate) {
            
            // Fire from multiple weapon mounts (with safety check)
            if (dreadnaught.weaponMounts && dreadnaught.weaponMounts.length > 0) {
                dreadnaught.weaponMounts.forEach((mount, index) => {
                    if (currentTime - mount.lastFire > 200) { // Stagger weapon fire
                    const mountWorldX = dreadnaught.x + Math.cos(dreadnaught.rotation - Math.PI/2) * mount.x - Math.sin(dreadnaught.rotation - Math.PI/2) * mount.y;
                    const mountWorldY = dreadnaught.y + Math.sin(dreadnaught.rotation - Math.PI/2) * mount.x + Math.cos(dreadnaught.rotation - Math.PI/2) * mount.y;
                    
                    // Find target for this mount
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    if (target && !target.destroyed) {
                        const dx = target.x - mountWorldX;
                        const dy = target.y - mountWorldY;
                        const angle = Math.atan2(dy, dx);
                        
                        // Create dreadnaught projectile
                        const projectile = {
                            x: mountWorldX,
                            y: mountWorldY,
                            velocityX: Math.cos(angle) * 400,
                            velocityY: Math.sin(angle) * 400,
                            damage: 25,
                            type: 'dreadnaught_cannon',
                            owner: dreadnaught.id,
                            color: '#f44',
                            size: 8,
                            life: 1,
                            maxLife: 4,
                            update: function(deltaTime) {
                                this.x += this.velocityX * deltaTime;
                                this.y += this.velocityY * deltaTime;
                                this.life -= deltaTime / this.maxLife;
                            },
                            render: function(ctx) {
                                ctx.save();
                                ctx.globalAlpha = this.life;
                                ctx.fillStyle = this.color;
                                ctx.shadowBlur = 15;
                                ctx.shadowColor = this.color;
                                ctx.beginPath();
                                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                                ctx.fill();
                                
                                // Add trailing effect
                                ctx.globalAlpha *= 0.5;
                                ctx.beginPath();
                                ctx.arc(this.x - this.velocityX * 0.01, this.y - this.velocityY * 0.01, this.size * 0.7, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.restore();
                            }
                        };
                        
                        if (!this.world.npcProjectiles) {
                            this.world.npcProjectiles = [];
                        }
                        this.world.npcProjectiles.push(projectile);
                        
                        mount.lastFire = currentTime;
                    }
                    }
                });
            }
            
            dreadnaught.burstCount++;
            dreadnaught.lastFireTime = currentTime;            // Play dreadnaught weapon sound
            if (this.soundManager) {
                this.soundManager.play('explosion', {
                    volume: 0.6,
                    playbackRate: 1.5,
                    position: { x: dreadnaught.x, y: dreadnaught.y }
                });
            }
        }
    }
    
    // Destroy an NPC
    destroyNPC(npc, index) {
        // Broadcast destruction to other players
        this.broadcastNPCDestruction(npc);
        
        // Create explosion
        this.world.createExplosion(npc.x, npc.y, npc.radius * 1.5, this.soundManager);
        
        // Award credits to nearby players
        if (window.game && window.game.player) {
            const dx = npc.x - window.game.player.x;
            const dy = npc.y - window.game.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 500) { // Award if player is nearby
                let creditReward = npc.type === 'dreadnaught' ? 500 : 50;
                window.game.player.addCredits(creditReward);
                
                // Show destruction message
                const message = npc.type === 'dreadnaught' ? 
                    '🏆 DREADNAUGHT DESTROYED! +500 Credits' : 
                    '👽 Alien Destroyed! +50 Credits';
                this.showMessage(message, npc.type === 'dreadnaught' ? '#ffd700' : '#0f0', 3000);
            }
        }
        
        // Special handling for dreadnaught destruction
        if (npc.type === 'dreadnaught') {
            this.dreadnaughtActive = false;
            this.showMessage('🎉 VICTORY! Dreadnaught eliminated!', '#ffd700', 5000, true);
            
            // Spawn multiple powerups
            for (let i = 0; i < 5; i++) {
                this.world.spawnPowerup(
                    npc.x + (Math.random() - 0.5) * 200,
                    npc.y + (Math.random() - 0.5) * 200
                );
            }
        }
        
        // Remove NPC
        this.npcs.splice(index, 1);
    }
    
    // Render all NPCs
    render(ctx) {
        this.npcs.forEach(npc => {
            if (npc.type === 'alien_scout') {
                this.renderAlienScout(ctx, npc);
            } else if (npc.type === 'dreadnaught') {
                this.renderDreadnaught(ctx, npc);
            }
        });
        
        // Render NPC projectiles
        if (this.world.npcProjectiles) {
            this.world.npcProjectiles.forEach(projectile => {
                if (projectile.render) {
                    projectile.render(ctx);
                }
            });
        }
    }
    
    // Render alien scout
    renderAlienScout(ctx, alien) {
        ctx.save();
        ctx.translate(alien.x, alien.y);
        ctx.rotate(alien.rotation);
        
        // Apply emerging effect
        if (alien.emergingEffect) {
            ctx.scale(alien.emergingEffect.scale, alien.emergingEffect.scale);
            ctx.globalAlpha = alien.emergingEffect.opacity;
        }
        
        // Green alien flying saucer design
        ctx.fillStyle = '#0a4';
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        
        // Main saucer body (ellipse)
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Central dome
        ctx.fillStyle = '#4f4';
        ctx.beginPath();
        ctx.ellipse(0, -3, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Cockpit glow
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.beginPath();
        ctx.ellipse(0, -3, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Weapon ports
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(-15, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing edge effect
        const glowIntensity = 0.5 + 0.5 * Math.sin(alien.glowPhase);
        ctx.shadowBlur = 15 * glowIntensity;
        ctx.shadowColor = '#0f0';
        ctx.strokeStyle = `rgba(0, 255, 0, ${glowIntensity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Health bar (above ship)
        if (alien.health < alien.maxHealth) {
            ctx.rotate(-alien.rotation); // Counter-rotate for upright health bar
            const barWidth = 30;
            const barHeight = 4;
            const healthPercent = alien.health / alien.maxHealth;
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(-barWidth/2, -35, barWidth, barHeight);
            
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(-barWidth/2, -35, barWidth * healthPercent, barHeight);
        }
        
        ctx.restore();
    }
    
    // Render dreadnaught
    renderDreadnaught(ctx, dreadnaught) {
        ctx.save();
        ctx.translate(dreadnaught.x, dreadnaught.y);
        ctx.rotate(dreadnaught.rotation);
        
        // Shield effect
        const shieldOpacity = 0.3 + 0.2 * Math.sin(dreadnaught.shieldPhase);
        ctx.strokeStyle = `rgba(100, 150, 255, ${shieldOpacity})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, dreadnaught.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        
        // Warning flash effect
        if (Math.sin(dreadnaught.warningFlash) > 0.7) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ff0000';
        }
        
        // Main hull - massive triangular dreadnaught
        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.moveTo(0, -100); // Front point
        ctx.lineTo(-60, 40);  // Left rear
        ctx.lineTo(-30, 60);  // Left rear inner
        ctx.lineTo(30, 60);   // Right rear inner
        ctx.lineTo(60, 40);   // Right rear
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Bridge/command section
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.rect(-15, -20, 30, 40);
        ctx.fill();
        ctx.stroke();
        
        // Weapon mounts
        ctx.fillStyle = '#888';
        if (dreadnaught.weaponMounts && dreadnaught.weaponMounts.length > 0) {
            dreadnaught.weaponMounts.forEach(mount => {
                ctx.beginPath();
                ctx.arc(mount.x, mount.y, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Weapon barrel
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(mount.x, mount.y);
                ctx.lineTo(mount.x, mount.y - 15);
                ctx.stroke();
            });
        }
        
        // Engine glow
        const engineGlow = 0.5 + 0.5 * Math.sin(dreadnaught.engineGlowPhase);
        ctx.fillStyle = `rgba(0, 100, 255, ${engineGlow})`;
        ctx.beginPath();
        ctx.ellipse(-20, 50, 8, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(20, 50, 8, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Hull details and armor plating
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = -80 + i * 20;
            ctx.beginPath();
            ctx.moveTo(-40, y);
            ctx.lineTo(40, y);
            ctx.stroke();
        }
        
        // Health bar (scaled for boss)
        ctx.rotate(-dreadnaught.rotation); // Counter-rotate for upright health bar
        const barWidth = 100;
        const barHeight = 8;
        const healthPercent = dreadnaught.health / dreadnaught.maxHealth;
        
        // Health bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-barWidth/2 - 2, -140 - 2, barWidth + 4, barHeight + 4);
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(-barWidth/2, -140, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 100, 0, 0.8)';
        ctx.fillRect(-barWidth/2, -140, barWidth * healthPercent, barHeight);
        
        // Boss name
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DREADNAUGHT', 0, -150);
        
        ctx.restore();
    }
    
    // Update NPC projectiles
    updateNPCProjectiles(deltaTime, player) {
        if (!this.world.npcProjectiles) return;
        
        for (let i = this.world.npcProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.world.npcProjectiles[i];
            projectile.update(deltaTime);
            
            // Remove expired projectiles
            if (projectile.life <= 0) {
                this.world.npcProjectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            const dx = projectile.x - player.x;
            const dy = projectile.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20) { // Hit player
                player.takeDamage(projectile.damage);
                this.world.createProjectileHitEffect(projectile.x, projectile.y, 15, this.soundManager);
                this.world.npcProjectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with other players
            if (window.game && window.game.multiplayer && window.game.multiplayer.players) {
                let hit = false;
                Object.values(window.game.multiplayer.players).forEach(otherPlayer => {
                    if (hit || !otherPlayer || otherPlayer.destroyed) return;
                    
                    const dx2 = projectile.x - otherPlayer.x;
                    const dy2 = projectile.y - otherPlayer.y;
                    const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                    
                    if (distance2 < 20) {
                        this.world.createProjectileHitEffect(projectile.x, projectile.y, 15, this.soundManager);
                        this.world.npcProjectiles.splice(i, 1);
                        hit = true;
                    }
                });
            }
        }
    }
    
    // Check if NPC projectiles hit players
    checkProjectileCollisions(player) {
        if (!this.world.npcProjectiles) return;
        
        // Don't damage players in safe zone
        if (this.world.isInSafeZone && this.world.isInSafeZone(player)) {
            return;
        }
        
        this.world.npcProjectiles.forEach((projectile, index) => {
            const dx = projectile.x - player.x;
            const dy = projectile.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20) {
                // Hit player
                if (player.takeDamage) {
                    player.takeDamage(projectile.damage);
                } else {
                    // Fallback damage handling
                    player.health = Math.max(0, player.health - projectile.damage);
                }
                
                this.world.createProjectileHitEffect(projectile.x, projectile.y, 15, this.soundManager);
                this.world.npcProjectiles.splice(index, 1);
            }
        });
    }
    
    // Show message to player
    showMessage(text, color = '#fff', duration = 3000, flash = false) {
        if (window.game && window.game.multiplayer && window.game.multiplayer.showGameMessage) {
            window.game.multiplayer.showGameMessage(text, color, duration);
        } else {
            // Fallback message display
            console.log(`NPC Message: ${text}`);
        }
        
        if (flash && window.game && window.game.multiplayer && window.game.multiplayer.addScreenFlash) {
            window.game.multiplayer.addScreenFlash(color, 0.3, duration / 2);
        }
    }
    
    // Get NPC count by type
    getNPCCount(type = null) {
        if (type) {
            return this.npcs.filter(npc => npc.type === type).length;
        }
        return this.npcs.length;
    }
    
    // Clear all NPCs
    clearAll() {
        console.log(`Clearing ${this.npcs.length} NPCs`);
        
        // Broadcast NPC clear to other players
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            window.game.multiplayer.socket.emit('npcClearAll', {});
        }
        
        this.npcs = [];
        this.dreadnaughtActive = false;
        this.dreadnaughtWarningSent = false;
        
        if (this.world.npcProjectiles) {
            this.world.npcProjectiles = [];
        }
        
        this.showMessage('All NPCs cleared!', '#ff6b6b', 3000);
    }
    
    // Emergency function to clean up stuck/duplicate NPCs
    emergencyCleanup() {
        console.log('Performing emergency NPC cleanup...');
        
        // Remove duplicate NPCs (same ID)
        const seen = new Set();
        this.npcs = this.npcs.filter(npc => {
            if (seen.has(npc.id)) {
                console.log(`Removing duplicate NPC: ${npc.id}`);
                return false;
            }
            seen.add(npc.id);
            return true;
        });
        
        // Remove NPCs that are too old or in invalid states
        this.npcs = this.npcs.filter(npc => {
            const age = Date.now() - npc.spawnTime;
            if (age > 300000) { // 5 minutes
                console.log(`Removing old NPC: ${npc.id} (age: ${age}ms)`);
                return false;
            }
            return true;
        });
        
        // Reset dreadnaught flag if no dreadnaughts exist
        const dreadnaughtExists = this.npcs.some(npc => npc.type === 'dreadnaught');
        if (!dreadnaughtExists) {
            this.dreadnaughtActive = false;
        }
        
        console.log(`Emergency cleanup complete. ${this.npcs.length} NPCs remaining.`);
    }
    
    // Broadcast NPC spawn to other players
    broadcastNPCSpawn(npc) {
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            const npcData = {
                id: npc.id,
                type: npc.type,
                x: npc.x,
                y: npc.y,
                rotation: npc.rotation,
                health: npc.health,
                maxHealth: npc.maxHealth,
                radius: npc.radius,
                speed: npc.speed,
                state: npc.state || 'spawning'
            };
            
            // Include additional data for specific NPC types
            if (npc.type === 'dreadnaught' && npc.weaponMounts) {
                npcData.weaponMounts = npc.weaponMounts;
                npcData.targetPosition = npc.targetPosition;
            }
            
            window.game.multiplayer.socket.emit('npcSpawn', npcData);
        }
    }
    
    // Broadcast NPC destruction to other players
    broadcastNPCDestruction(npc) {
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            window.game.multiplayer.socket.emit('npcDestroyed', {
                id: npc.id,
                type: npc.type,
                x: npc.x,
                y: npc.y
            });
        }
    }
    
    // Broadcast NPC leaving to other players
    broadcastNPCLeaving(npc) {
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            window.game.multiplayer.socket.emit('npcLeaving', {
                id: npc.id,
                type: npc.type
            });
        }
    }
    
    // Broadcast NPC state updates to other players (position, rotation, state)
    broadcastNPCUpdate(npc) {
        if (window.game && window.game.multiplayer && window.game.multiplayer.connected) {
            window.game.multiplayer.socket.emit('npcUpdate', {
                id: npc.id,
                x: npc.x,
                y: npc.y,
                rotation: npc.rotation,
                state: npc.state,
                health: npc.health,
                velocity: npc.velocity
            });
        }
    }
    
    // Handle receiving NPC data from other players
    handleRemoteNPCSpawn(npcData) {
        // Check if NPC already exists
        const existingNPC = this.npcs.find(npc => npc.id === npcData.id);
        if (existingNPC) {
            console.log(`NPC ${npcData.id} already exists, skipping duplicate spawn`);
            return;
        }
        
        // Prevent spawning too many NPCs to avoid performance issues
        if (this.npcs.length > 20) {
            console.log('Too many NPCs already spawned, ignoring remote spawn');
            return;
        }
        
        // Create remote NPC (AI disabled for remote NPCs)
        const remoteNPC = {
            id: npcData.id,
            type: npcData.type,
            x: npcData.x,
            y: npcData.y,
            rotation: npcData.rotation,
            health: npcData.health,
            maxHealth: npcData.maxHealth,
            radius: npcData.radius,
            speed: npcData.speed,
            state: 'remote', // Mark as remote
            velocity: { x: 0, y: 0 },
            // Essential for preventing issues
            lastFireTime: 0,
            fireRate: 1000,
            spawnTime: Date.now(),
            // Visual effects only
            glowPhase: Math.random() * Math.PI * 2,
            shieldPhase: 0,
            engineGlowPhase: 0,
            warningFlash: 0,
            isRemote: true // Flag for remote NPCs
        };
        
        // Add type-specific properties for proper rendering
        if (npcData.type === 'dreadnaught') {
            // Essential dreadnaught properties for rendering
            remoteNPC.weaponMounts = npcData.weaponMounts || [
                { x: -40, y: -60, lastFire: 0 },
                { x: 40, y: -60, lastFire: 0 },
                { x: -60, y: 0, lastFire: 0 },
                { x: 60, y: 0, lastFire: 0 },
                { x: 0, y: 40, lastFire: 0 }
            ];
            remoteNPC.targetPosition = npcData.targetPosition || { x: 0, y: 0 };
            remoteNPC.burstCount = 0;
            remoteNPC.burstMax = 5;
        }
        
        this.npcs.push(remoteNPC);
        console.log(`Remote NPC spawned: ${npcData.type} (${npcData.id})`);
        
        // Reduced intensity warnings for remote NPCs
        if (npcData.type === 'dreadnaught') {
            this.showMessage('⚠️ DREADNAUGHT DETECTED', '#ff4444', 2000);
        } else if (npcData.type === 'alien_scout') {
            this.showMessage('⚠️ ALIEN DETECTED', '#0f0', 1500);
        }
    }
    
    // Handle remote NPC destruction
    handleRemoteNPCDestruction(npcData) {
        const index = this.npcs.findIndex(npc => npc.id === npcData.id);
        if (index >= 0) {
            const npc = this.npcs[index];
            
            // Create explosion effect
            this.world.createExplosion(npcData.x, npcData.y, npc.radius * 1.5, this.soundManager);
            
            // Remove NPC
            this.npcs.splice(index, 1);
            
            if (npc.type === 'dreadnaught') {
                this.dreadnaughtActive = false;
                this.showMessage('🎉 VICTORY! Dreadnaught eliminated!', '#ffd700', 5000, true);
            }
        }
    }
    
    // Handle remote NPC leaving
    handleRemoteNPCLeaving(npcData) {
        const index = this.npcs.findIndex(npc => npc.id === npcData.id);
        if (index >= 0) {
            const npc = this.npcs[index];
            
            // Remove NPC
            this.npcs.splice(index, 1);
            
            if (npc.type === 'dreadnaught') {
                this.dreadnaughtActive = false;
                this.showMessage('Dreadnaught has left the area...', '#888', 3000);
            }
        }
    }
    
    // Handle remote NPC clear all
    handleRemoteNPCClearAll(data) {
        this.npcs = [];
        this.dreadnaughtActive = false;
        this.showMessage('All NPCs cleared by admin', '#ff6b6b', 3000);
    }
    
    // Handle remote NPC updates (position, state, etc.)
    handleRemoteNPCUpdate(updateData) {
        const npc = this.npcs.find(npc => npc.id === updateData.id);
        if (npc && npc.isRemote) {
            // Update position and state
            npc.x = updateData.x;
            npc.y = updateData.y;
            npc.rotation = updateData.rotation;
            npc.state = updateData.state;
            npc.health = updateData.health;
            npc.velocity = updateData.velocity || { x: 0, y: 0 };
        }
    }
    
    // Emergency function to clean up stuck/duplicate NPCs
    emergencyCleanup() {
        console.log('Performing emergency NPC cleanup...');
        
        // Remove duplicate NPCs (same ID)
        const seen = new Set();
        this.npcs = this.npcs.filter(npc => {
            if (seen.has(npc.id)) {
                console.log(`Removing duplicate NPC: ${npc.id}`);
                return false;
            }
            seen.add(npc.id);
            return true;
        });
        
        // Remove NPCs that are too old or in invalid states
        this.npcs = this.npcs.filter(npc => {
            const age = Date.now() - npc.spawnTime;
            if (age > 300000) { // 5 minutes
                console.log(`Removing old NPC: ${npc.id} (age: ${age}ms)`);
                return false;
            }
            return true;
        });
        
        // Reset dreadnaught flag if no dreadnaughts exist
        const dreadnaughtExists = this.npcs.some(npc => npc.type === 'dreadnaught');
        if (!dreadnaughtExists) {
            this.dreadnaughtActive = false;
        }
        
        // Clear NPC projectiles
        if (this.world && this.world.npcProjectiles) {
            this.world.npcProjectiles = [];
        }
        
        console.log(`Emergency cleanup complete. ${this.npcs.length} NPCs remaining.`);
        this.showMessage(`Emergency cleanup: ${this.npcs.length} NPCs remaining`, '#ff6b6b', 3000);
    }
}
