export class ShopSystem {
    constructor(player) {
        this.player = player;
        this.shopOpen = false;
        this.currentTab = 'ships'; // 'ships', 'weapons', 'upgrades'
        
        // Load ship ownership from localStorage
        this.availableShips = [
            {
                id: 'scout',
                name: 'Scout',
                description: 'Fast and agile, but lightly armed and armored.',
                price: 0, // Starting ship
                owned: true, // Always owned
                stats: {
                    maxHealth: 100,
                    maxSpeed: 400,
                    acceleration: 300,
                    handling: 4.0,
                    armor: 1.0
                },
                appearance: {
                    color: '#33f',
                    shape: 'triangle'
                }
            },
            {
                id: 'fighter',
                name: 'Fighter',
                description: 'Balanced combat vessel with good speed and firepower.',
                price: 5000,
                owned: localStorage.getItem('ship_fighter') === 'true',
                stats: {
                    maxHealth: 150,
                    maxSpeed: 350,
                    acceleration: 250,
                    handling: 3.5,
                    armor: 1.5
                },
                appearance: {
                    color: '#f33',
                    shape: 'fighter'
                }
            },
            {
                id: 'heavy',
                name: 'Heavy Cruiser',
                description: 'Slower but heavily armed and armored warship.',
                price: 12000,
                owned: localStorage.getItem('ship_heavy') === 'true',
                stats: {
                    maxHealth: 250,
                    maxSpeed: 280,
                    acceleration: 200,
                    handling: 2.5,
                    armor: 3.0
                },
                appearance: {
                    color: '#393',
                    shape: 'heavy'
                }
            },
            {
                id: 'stealth',
                name: 'Stealth Ship',
                description: 'Fast and hard to detect, but lightly armored.',
                price: 20000,
                owned: localStorage.getItem('ship_stealth') === 'true',
                stats: {
                    maxHealth: 120,
                    maxSpeed: 450,
                    acceleration: 350,
                    handling: 4.5,
                    armor: 0.8,
                    stealth: 3.0
                },
                appearance: {
                    color: '#339',
                    shape: 'stealth'
                }
            }
        ];
        
        // Load weapon ownership from localStorage
        this.availableWeapons = [
            {
                id: 'laser',
                name: 'Basic Laser',
                description: 'Standard energy weapon with good balance.',
                price: 0, // Starting weapon
                owned: true, // Always owned
                stats: {
                    damage: 10,
                    cooldown: 0.20,
                    speed: 800,
                    range: 600,
                    energyCost: 5
                }
            },
            {
                id: 'burst',
                name: 'Burst Cannon',
                description: 'Fires multiple projectiles in a spread pattern.',
                price: 2000,
                owned: localStorage.getItem('weapon_burst') === 'true',
                stats: {
                    damage: 5, // Per projectile
                    cooldown: 0.30,
                    speed: 700,
                    range: 400,
                    energyCost: 7,
                    projectileCount: 3
                }
            },
            {
                id: 'missile',
                name: 'Seeker Missile',
                description: 'Guided missile with high damage but slow reload.',
                price: 5000,
                owned: localStorage.getItem('weapon_missile') === 'true',
                stats: {
                    damage: 20,
                    cooldown: 1.0,
                    speed: 500,
                    range: 1000,
                    energyCost: 15,
                    homing: true
                }
            },
            {
                id: 'plasma',
                name: 'Plasma Cannon',
                description: 'Heavy energy weapon with splash damage.',
                price: 8000,
                owned: localStorage.getItem('weapon_plasma') === 'true',
                stats: {
                    damage: 25,
                    cooldown: 0.6,
                    speed: 600,
                    range: 500,
                    energyCost: 20,
                    splash: 30 // Splash radius
                }
            },
            {
                id: 'quantum',
                name: 'Quantum Disruptor',
                description: 'Advanced weapon that phases through obstacles.',
                price: 15000,
                owned: localStorage.getItem('weapon_quantum') === 'true',
                stats: {
                    damage: 30,
                    cooldown: 0.7,
                    speed: 900,
                    range: 800,
                    energyCost: 25,
                    phasing: true
                }
            }
        ];
        
        // Load upgrade levels from localStorage
        this.availableUpgrades = [
            {
                id: 'engine',
                name: 'Engine Upgrade',
                description: 'Improves speed and acceleration.',
                basePrice: 1000,
                level: parseInt(localStorage.getItem('upgrade_engine') || '0'),
                maxLevel: 3,
                getPrice: (level) => 1000 * (level + 1),
                getEffect: (level) => ({ 
                    maxSpeed: level * 30, 
                    acceleration: level * 25 
                })
            },
            {
                id: 'shield',
                name: 'Shield Generator',
                description: 'Adds rechargeable shields that absorb damage.',
                basePrice: 3000,
                level: parseInt(localStorage.getItem('upgrade_shield') || '0'),
                maxLevel: 3,
                getPrice: (level) => 3000 * (level + 1),
                getEffect: (level) => ({ shieldCapacity: 50 + (level * 50) })
            },
            {
                id: 'energy',
                name: 'Energy System',
                description: 'Increases energy capacity and recharge rate.',
                basePrice: 2000,
                level: parseInt(localStorage.getItem('upgrade_energy') || '0'),
                maxLevel: 3,
                getPrice: (level) => 2000 * (level + 1),
                getEffect: (level) => ({ 
                    maxEnergy: 100 + (level * 50),
                    energyRegen: 5 + (level * 3)
                })
            },
            {
                id: 'armor',
                name: 'Hull Reinforcement',
                description: 'Increases maximum health and damage resistance.',
                basePrice: 2500,
                level: parseInt(localStorage.getItem('upgrade_armor') || '0'),
                maxLevel: 3,
                getPrice: (level) => 2500 * (level + 1),
                getEffect: (level) => ({ 
                    maxHealth: level * 30,
                    damageReduction: level * 0.1
                })
            },
            {
                id: 'cargo',
                name: 'Cargo Hold',
                description: 'Increases loot capacity from destroyed enemies.',
                basePrice: 1500,
                level: parseInt(localStorage.getItem('upgrade_cargo') || '0'),
                maxLevel: 2,
                getPrice: (level) => 1500 * (level + 1),
                getEffect: (level) => ({ cargoCapacity: 100 + (level * 100) })
            }
        ];
        
        // After loading data from localStorage, apply all upgrades and set current ship/weapon
        this.applyAllPurchasedUpgrades();
        this.loadCurrentEquipment();
        
        // Initialize UI elements
        this.createShopUI();
    }
    
    // New method to apply all purchased upgrades to the player
    applyAllPurchasedUpgrades() {
        // Apply all upgrade effects to the player
        this.availableUpgrades.forEach(upgrade => {
            if (upgrade.level > 0) {
                const effects = upgrade.getEffect(upgrade.level);
                
                // Apply the upgrade effects differently based on the upgrade type
                switch (upgrade.id) {
                    case 'engine':
                        this.player.maxSpeed += effects.maxSpeed;
                        this.player.acceleration += effects.acceleration;
                        break;
                        
                    case 'shield':
                        this.player.shieldCapacity = effects.shieldCapacity;
                        this.player.shield = effects.shieldCapacity;
                        break;
                        
                    case 'energy':
                        this.player.maxEnergy = effects.maxEnergy;
                        this.player.energy = effects.maxEnergy;
                        this.player.energyRegen = effects.energyRegen;
                        break;
                        
                    case 'armor':
                        this.player.maxHealth += effects.maxHealth;
                        this.player.health += effects.maxHealth;
                        this.player.damageReduction = effects.damageReduction;
                        break;
                        
                    case 'cargo':
                        this.player.cargoCapacity = effects.cargoCapacity;
                        break;
                }
            }
        });
    }
    
    // New method to load current equipment (ship and weapon)
    loadCurrentEquipment() {
        // Load currently equipped ship
        const currentShipId = localStorage.getItem('currentShip') || 'scout';
        const ship = this.availableShips.find(s => s.id === currentShipId);
        
        if (ship && ship.owned) {
            this.player.currentShip = currentShipId;
            
            // Apply ship stats to player
            this.player.maxHealth = ship.stats.maxHealth;
            this.player.maxSpeed = ship.stats.maxSpeed;
            this.player.acceleration = ship.stats.acceleration;
            this.player.rotationSpeed = ship.stats.handling;
            this.player.armor = ship.stats.armor || 1.0;
        }
        
        // Load currently equipped weapon
        const currentWeaponId = localStorage.getItem('currentWeapon') || 'laser';
        const weapon = this.availableWeapons.find(w => w.id === currentWeaponId);
        
        if (weapon && weapon.owned) {
            this.player.currentWeaponId = currentWeaponId;
            
            // Add all owned weapons to player's weapons array
            this.player.weapons = [];
            this.availableWeapons.forEach(w => {
                if (w.owned) {
                    this.player.weapons.push(w.name);
                }
            });
            
            // Set current weapon
            const index = this.player.weapons.findIndex(w => w === weapon.name);
            if (index >= 0) {
                this.player.weaponIndex = index;
                this.player.currentWeapon = weapon.name;
                this.player.fireCooldownTime = weapon.stats.cooldown;
            }
        }
    }
    
    createShopUI() {
        // Create shop container and add it to the DOM
        const shopContainer = document.createElement('div');
        shopContainer.id = 'shop-container';
        shopContainer.className = 'hidden';
        shopContainer.style.position = 'absolute';
        shopContainer.style.top = '50%';
        shopContainer.style.left = '50%';
        shopContainer.style.transform = 'translate(-50%, -50%)';
        shopContainer.style.width = '800px';
        shopContainer.style.height = '600px';
        shopContainer.style.backgroundColor = 'rgba(0, 0, 20, 0.9)';
        shopContainer.style.border = '3px solid #33f';
        shopContainer.style.borderRadius = '10px';
        shopContainer.style.padding = '20px';
        shopContainer.style.color = 'white';
        shopContainer.style.fontFamily = 'Arial, sans-serif';
        shopContainer.style.zIndex = '100';
        
        // Header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '20px';
        
        const title = document.createElement('h2');
        title.textContent = 'Space Dock Shop';
        title.style.color = '#33f';
        title.style.margin = '0';
        
        const credits = document.createElement('div');
        credits.id = 'shop-credits';
        credits.textContent = `Credits: ${this.player.credits || 0}`;
        credits.style.fontSize = '1.2em';
        credits.style.fontWeight = 'bold';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'X';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'white';
        closeBtn.style.fontSize = '1.5em';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => this.toggleShop();
        
        header.appendChild(title);
        header.appendChild(credits);
        header.appendChild(closeBtn);
        shopContainer.appendChild(header);
        
        // Tabs
        const tabs = document.createElement('div');
        tabs.style.display = 'flex';
        tabs.style.marginBottom = '20px';
        tabs.style.borderBottom = '1px solid #33f';
        
        const shipTab = this.createTab('Ships', 'ships');
        const weaponTab = this.createTab('Weapons', 'weapons');
        const upgradeTab = this.createTab('Upgrades', 'upgrades');
        const appearanceTab = this.createTab('Appearance', 'appearance');
        
        tabs.appendChild(shipTab);
        tabs.appendChild(weaponTab);
        tabs.appendChild(upgradeTab);
        tabs.appendChild(appearanceTab);
        shopContainer.appendChild(tabs);
        
        // Content area
        const content = document.createElement('div');
        content.id = 'shop-content';
        content.style.height = '450px';
        content.style.overflowY = 'auto';
        shopContainer.appendChild(content);
        
        document.body.appendChild(shopContainer);
    }
    
    createTab(name, tabId) {
        const tab = document.createElement('div');
        tab.textContent = name;
        tab.style.padding = '10px 20px';
        tab.style.cursor = 'pointer';
        tab.style.borderBottom = this.currentTab === tabId ? '2px solid #33f' : 'none';
        tab.onclick = () => {
            this.currentTab = tabId;
            this.updateShopContent();
            
            // Update tab styling
            document.querySelectorAll('#shop-container > div:nth-child(2) > div').forEach(tab => {
                tab.style.borderBottom = 'none';
            });
            tab.style.borderBottom = '2px solid #33f';
        };
        return tab;
    }
    
    updateShopContent() {
        const content = document.getElementById('shop-content');
        content.innerHTML = ''; // Clear previous content
        
        // Update credits display
        document.getElementById('shop-credits').textContent = `Credits: ${this.player.credits || 0}`;
        
        switch (this.currentTab) {
            case 'ships':
                this.renderShipsTab(content);
                break;
            case 'weapons':
                this.renderWeaponsTab(content);
                break;
            case 'upgrades':
                this.renderUpgradesTab(content);
                break;
            case 'appearance':
                this.renderAppearanceTab(content);
                break;
        }
    }
    
    renderShipsTab(container) {
        this.availableShips.forEach(ship => {
            const shipCard = document.createElement('div');
            shipCard.className = 'shop-item';
            shipCard.style.display = 'flex';
            shipCard.style.margin = '10px 0';
            shipCard.style.padding = '15px';
            shipCard.style.backgroundColor = 'rgba(0, 30, 60, 0.5)';
            shipCard.style.borderRadius = '5px';
            shipCard.style.border = ship.owned ? '1px solid #3f3' : '1px solid #33f';
            
            // Ship preview
            const preview = document.createElement('div');
            preview.style.width = '100px';
            preview.style.height = '100px';
            preview.style.backgroundColor = 'rgba(0, 10, 30, 0.7)';
            preview.style.borderRadius = '5px';
            preview.style.display = 'flex';
            preview.style.justifyContent = 'center';
            preview.style.alignItems = 'center';
            preview.style.marginRight = '15px';
            
            // Simplified ship rendering for preview
            const shipPreview = document.createElement('div');
            shipPreview.style.width = '60px';
            shipPreview.style.height = '60px';
            shipPreview.style.backgroundColor = ship.appearance.color;
            shipPreview.style.clipPath = ship.appearance.shape === 'triangle' ? 
                'polygon(50% 0%, 0% 100%, 100% 100%)' : 
                (ship.appearance.shape === 'fighter' ? 
                    'polygon(50% 0%, 80% 50%, 80% 90%, 50% 100%, 20% 90%, 20% 50%)' :
                    'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)');
            preview.appendChild(shipPreview);
            
            // Info section
            const info = document.createElement('div');
            info.style.flex = '1';
            
            const name = document.createElement('h3');
            name.textContent = ship.name;
            name.style.margin = '0 0 5px 0';
            name.style.color = '#3af';
            
            const description = document.createElement('p');
            description.textContent = ship.description;
            description.style.margin = '0 0 10px 0';
            description.style.fontSize = '0.9em';
            
            // Stats display
            const stats = document.createElement('div');
            stats.style.display = 'flex';
            stats.style.flexWrap = 'wrap';
            stats.style.gap = '5px 15px';
            stats.style.fontSize = '0.85em';
            
            Object.entries(ship.stats).forEach(([key, value]) => {
                const stat = document.createElement('div');
                stat.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
                stats.appendChild(stat);
            });
            
            info.appendChild(name);
            info.appendChild(description);
            info.appendChild(stats);
            
            // Action section
            const action = document.createElement('div');
            action.style.width = '120px';
            action.style.display = 'flex';
            action.style.flexDirection = 'column';
            action.style.justifyContent = 'center';
            action.style.alignItems = 'center';
            
            const button = document.createElement('button');
            if (ship.owned) {
                button.textContent = 'Select';
                button.onclick = () => this.selectShip(ship.id);
            } else {
                button.textContent = `Buy: ${ship.price}`;
                button.disabled = (this.player.credits || 0) < ship.price;
                button.onclick = () => this.buyShip(ship.id);
            }
            
            button.style.padding = '8px 16px';
            button.style.backgroundColor = ship.owned ? '#3f3' : '#33f';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.color = 'white';
            button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
            if (button.disabled) {
                button.style.opacity = '0.5';
            }
            
            action.appendChild(button);
            
            // If this is the current ship, show "SELECTED" indicator
            if (ship.id === this.player.currentShip) {
                const selected = document.createElement('div');
                selected.textContent = 'SELECTED';
                selected.style.marginTop = '10px';
                selected.style.color = '#3f3';
                selected.style.fontWeight = 'bold';
                action.appendChild(selected);
            }
            
            shipCard.appendChild(preview);
            shipCard.appendChild(info);
            shipCard.appendChild(action);
            
            container.appendChild(shipCard);
        });
    }
    
    renderWeaponsTab(container) {
        this.availableWeapons.forEach(weapon => {
            const weaponCard = document.createElement('div');
            weaponCard.className = 'shop-item';
            weaponCard.style.display = 'flex';
            weaponCard.style.margin = '10px 0';
            weaponCard.style.padding = '15px';
            weaponCard.style.backgroundColor = 'rgba(0, 30, 60, 0.5)';
            weaponCard.style.borderRadius = '5px';
            weaponCard.style.border = weapon.owned ? '1px solid #3f3' : '1px solid #33f';
            
            // Weapon icon
            const icon = document.createElement('div');
            icon.style.width = '80px';
            icon.style.height = '80px';
            icon.style.backgroundColor = 'rgba(0, 10, 30, 0.7)';
            icon.style.borderRadius = '5px';
            icon.style.display = 'flex';
            icon.style.justifyContent = 'center';
            icon.style.alignItems = 'center';
            icon.style.marginRight = '15px';
            
            // Simple icon representation based on weapon type
            const iconInner = document.createElement('div');
            if (weapon.id === 'laser') {
                iconInner.style.width = '8px';
                iconInner.style.height = '40px';
                iconInner.style.backgroundColor = '#0ff';
            } else if (weapon.id === 'burst') {
                iconInner.style.display = 'flex';
                iconInner.style.gap = '5px';
                for (let i = 0; i < 3; i++) {
                    const bullet = document.createElement('div');
                    bullet.style.width = '6px';
                    bullet.style.height = '20px';
                    bullet.style.backgroundColor = '#ff0';
                    bullet.style.borderRadius = '3px';
                    iconInner.appendChild(bullet);
                }
            } else if (weapon.id === 'missile') {
                iconInner.style.width = '15px';
                iconInner.style.height = '40px';
                iconInner.style.backgroundColor = '#f00';
                iconInner.style.borderRadius = '3px';
            } else if (weapon.id === 'plasma') {
                iconInner.style.width = '30px';
                iconInner.style.height = '30px';
                iconInner.style.backgroundImage = 'radial-gradient(#f0f, #70f)';
                iconInner.style.borderRadius = '50%';
            } else if (weapon.id === 'quantum') {
                iconInner.style.width = '30px';
                iconInner.style.height = '30px';
                iconInner.style.backgroundColor = '#fff';
                iconInner.style.boxShadow = '0 0 15px #fff, 0 0 25px #0ff';
            }
            
            icon.appendChild(iconInner);
            
            // Info section
            const info = document.createElement('div');
            info.style.flex = '1';
            
            const name = document.createElement('h3');
            name.textContent = weapon.name;
            name.style.margin = '0 0 5px 0';
            name.style.color = '#3af';
            
            const description = document.createElement('p');
            description.textContent = weapon.description;
            description.style.margin = '0 0 10px 0';
            description.style.fontSize = '0.9em';
            
            // Stats display
            const stats = document.createElement('div');
            stats.style.display = 'flex';
            stats.style.flexWrap = 'wrap';
            stats.style.gap = '5px 15px';
            stats.style.fontSize = '0.85em';
            
            Object.entries(weapon.stats).forEach(([key, value]) => {
                const stat = document.createElement('div');
                stat.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
                stats.appendChild(stat);
            });
            
            info.appendChild(name);
            info.appendChild(description);
            info.appendChild(stats);
            
            // Action section
            const action = document.createElement('div');
            action.style.width = '120px';
            action.style.display = 'flex';
            action.style.flexDirection = 'column';
            action.style.justifyContent = 'center';
            action.style.alignItems = 'center';
            
            const button = document.createElement('button');
            if (weapon.owned) {
                button.textContent = 'Select';
                button.onclick = () => this.selectWeapon(weapon.id);
                button.style.backgroundColor = '#3f3';
            } else {
                button.textContent = `Buy: ${weapon.price}`;
                button.disabled = (this.player.credits || 0) < weapon.price;
                button.onclick = () => this.buyWeapon(weapon.id);
                button.style.backgroundColor = '#33f';
            }
            
            button.style.padding = '8px 16px';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.color = 'white';
            button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
            if (button.disabled) {
                button.style.opacity = '0.5';
            }
            
            action.appendChild(button);
            
            // If this is the current weapon, show indicator
            if (weapon.id === this.player.currentWeaponId) {
                const selected = document.createElement('div');
                selected.textContent = 'SELECTED';
                selected.style.marginTop = '10px';
                selected.style.color = '#3f3';
                selected.style.fontWeight = 'bold';
                action.appendChild(selected);
            }
            
            weaponCard.appendChild(icon);
            weaponCard.appendChild(info);
            weaponCard.appendChild(action);
            
            container.appendChild(weaponCard);
        });
    }
    
    renderUpgradesTab(container) {
        this.availableUpgrades.forEach(upgrade => {
            const upgradeCard = document.createElement('div');
            upgradeCard.className = 'shop-item';
            upgradeCard.style.display = 'flex';
            upgradeCard.style.margin = '10px 0';
            upgradeCard.style.padding = '15px';
            upgradeCard.style.backgroundColor = 'rgba(0, 30, 60, 0.5)';
            upgradeCard.style.borderRadius = '5px';
            upgradeCard.style.border = '1px solid #33f';
            
            // Icon
            const icon = document.createElement('div');
            icon.style.width = '60px';
            icon.style.height = '60px';
            icon.style.backgroundColor = 'rgba(0, 10, 30, 0.7)';
            icon.style.borderRadius = '5px';
            icon.style.display = 'flex';
            icon.style.justifyContent = 'center';
            icon.style.alignItems = 'center';
            icon.style.marginRight = '15px';
            
            // Icon content based on upgrade type
            const iconContent = document.createElement('div');
            iconContent.textContent = upgrade.id.charAt(0).toUpperCase();
            iconContent.style.color = '#3af';
            iconContent.style.fontSize = '24px';
            iconContent.style.fontWeight = 'bold';
            
            icon.appendChild(iconContent);
            
            // Info section
            const info = document.createElement('div');
            info.style.flex = '1';
            
            const name = document.createElement('h3');
            name.textContent = upgrade.name;
            name.style.margin = '0 0 5px 0';
            name.style.color = '#3af';
            
            const description = document.createElement('p');
            description.textContent = upgrade.description;
            description.style.margin = '0 0 10px 0';
            description.style.fontSize = '0.9em';
            
            // Level display
            const level = document.createElement('div');
            level.style.display = 'flex';
            level.style.alignItems = 'center';
            level.style.gap = '5px';
            
            const levelLabel = document.createElement('span');
            levelLabel.textContent = 'Level:';
            level.appendChild(levelLabel);
            
            // Level indicators (dots)
            for (let i = 0; i < upgrade.maxLevel; i++) {
                const dot = document.createElement('div');
                dot.style.width = '12px';
                dot.style.height = '12px';
                dot.style.borderRadius = '50%';
                dot.style.backgroundColor = i < upgrade.level ? '#3f3' : 'rgba(100, 100, 100, 0.5)';
                level.appendChild(dot);
            }
            
            info.appendChild(name);
            info.appendChild(description);
            info.appendChild(level);
            
            // Current effect display
            if (upgrade.level > 0) {
                const effect = document.createElement('div');
                effect.style.marginTop = '10px';
                effect.style.fontSize = '0.85em';
                effect.style.color = '#3f3';
                
                const effects = upgrade.getEffect(upgrade.level);
                const effectTexts = Object.entries(effects).map(([key, value]) => {
                    return `${key.charAt(0).toUpperCase() + key.slice(1)}: +${value}`;
                });
                
                effect.textContent = 'Current: ' + effectTexts.join(', ');
                info.appendChild(effect);
            }
            
            // Action section
            const action = document.createElement('div');
            action.style.width = '120px';
            action.style.display = 'flex';
            action.style.flexDirection = 'column';
            action.style.justifyContent = 'center';
            action.style.alignItems = 'center';
            
            const price = upgrade.getPrice(upgrade.level);
            const atMaxLevel = upgrade.level >= upgrade.maxLevel;
            
            const button = document.createElement('button');
            if (atMaxLevel) {
                button.textContent = 'Maxed';
                button.disabled = true;
                button.style.backgroundColor = '#3f3';
            } else {
                button.textContent = `Upgrade: ${price}`;
                button.disabled = (this.player.credits || 0) < price;
                button.onclick = () => this.buyUpgrade(upgrade.id);
                button.style.backgroundColor = '#33f';
            }
            
            button.style.padding = '8px 16px';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.color = 'white';
            button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
            if (button.disabled && !atMaxLevel) {
                button.style.opacity = '0.5';
            }
            
            action.appendChild(button);
            
            // Next level effect preview
            if (!atMaxLevel) {
                const nextEffect = document.createElement('div');
                nextEffect.style.marginTop = '10px';
                nextEffect.style.fontSize = '0.8em';
                nextEffect.style.color = '#aaf';
                
                const effects = upgrade.getEffect(upgrade.level + 1);
                const effectTexts = Object.entries(effects).map(([key, value]) => {
                    // Calculate difference from current level
                    const currentValue = upgrade.level > 0 ? 
                        upgrade.getEffect(upgrade.level)[key] : 0;
                    const increase = value - currentValue;
                    return `${key.charAt(0).toUpperCase() + key.slice(1)}: +${increase}`;
                });
                
                nextEffect.textContent = 'Next: ' + effectTexts.join(', ');
                action.appendChild(nextEffect);
            }
            
            upgradeCard.appendChild(icon);
            upgradeCard.appendChild(info);
            upgradeCard.appendChild(action);
            
            container.appendChild(upgradeCard);
        });
    }
    
    renderAppearanceTab(container) {
        // Create container for appearance customization
        const appearanceSection = document.createElement('div');
        appearanceSection.style.backgroundColor = 'rgba(0, 30, 60, 0.5)';
        appearanceSection.style.borderRadius = '5px';
        appearanceSection.style.padding = '20px';
        appearanceSection.style.marginBottom = '20px';
        
        // Title for the section
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = '🚀 Ship Appearance';
        sectionTitle.style.margin = '0 0 15px 0';
        sectionTitle.style.color = '#3af';
        
        appearanceSection.appendChild(sectionTitle);

        // Add ship preview
        const shipPreviewContainer = document.createElement('div');
        shipPreviewContainer.style.display = 'flex';
        shipPreviewContainer.style.justifyContent = 'center';
        shipPreviewContainer.style.alignItems = 'center';
        shipPreviewContainer.style.marginBottom = '20px';
        shipPreviewContainer.style.height = '120px';
        shipPreviewContainer.style.backgroundColor = 'rgba(0, 10, 30, 0.7)';
        shipPreviewContainer.style.borderRadius = '8px';
        shipPreviewContainer.style.border = '1px solid #444';
        
        // Ship preview canvas
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 180;
        previewCanvas.height = 120;
        previewCanvas.style.display = 'block';
        
        shipPreviewContainer.appendChild(previewCanvas);
        appearanceSection.appendChild(shipPreviewContainer);
        
        // Draw ship preview function
        const drawShipPreview = () => {
            const ctx = previewCanvas.getContext('2d');
            ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            
            // Center the ship
            ctx.save();
            ctx.translate(previewCanvas.width / 2, previewCanvas.height / 2);
            ctx.scale(2.0, 2.0); // Make it larger
            
            // Draw ship body using current color
            ctx.fillStyle = this.player.shipColor || '#33f';
            ctx.beginPath();
            ctx.moveTo(0, -15); // front (points upward)
            ctx.lineTo(-10, 10); // back left
            ctx.lineTo(0, 5);   // back middle
            ctx.lineTo(10, 10);  // back right
            ctx.closePath();
            ctx.fill();
            
            // Draw engine using current color
            ctx.fillStyle = this.player.engineColor || '#f66';
            ctx.beginPath();
            ctx.moveTo(0, 5);
            ctx.lineTo(-5, 12);
            ctx.lineTo(0, 15);
            ctx.lineTo(5, 12);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        };

        // Ship Color Section
        const shipColorSection = document.createElement('div');
        shipColorSection.style.marginBottom = '20px';
        
        const shipColorLabel = document.createElement('div');
        shipColorLabel.textContent = '🎨 Ship Color';
        shipColorLabel.style.fontWeight = 'bold';
        shipColorLabel.style.marginBottom = '10px';
        shipColorSection.appendChild(shipColorLabel);
        
        // Create color selection grid
        const shipColorGrid = document.createElement('div');
        shipColorGrid.style.display = 'grid';
        shipColorGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
        shipColorGrid.style.gap = '8px';
        shipColorGrid.style.marginBottom = '15px';
        
        // Define ship colors
        const shipColors = [
            '#33f', '#4f4', '#f44', '#ff4', '#f4f', '#4ff',
            '#36a', '#3a6', '#a63', '#a36', '#63a', '#6a3',
            '#249', '#924', '#492', '#942', '#294', '#429',
            '#fff', '#aaa', '#555', '#000', '#fa0', '#0af'
        ];
        
        // Create color selection buttons
        shipColors.forEach(color => {
            const colorButton = document.createElement('button');
            colorButton.style.width = '100%';
            colorButton.style.height = '24px';
            colorButton.style.backgroundColor = color;
            colorButton.style.border = color === (this.player.shipColor || '#33f') ? 
                '2px solid white' : '1px solid #555';
            colorButton.style.borderRadius = '4px';
            colorButton.style.cursor = 'pointer';
            colorButton.style.padding = '0';
            
            colorButton.onclick = () => {
                // Update player ship color
                this.player.setShipColor(color);
                
                // Update selected button appearance
                shipColorGrid.querySelectorAll('button').forEach(btn => {
                    btn.style.border = '1px solid #555';
                });
                colorButton.style.border = '2px solid white';
                
                // Update the preview
                drawShipPreview();
                
                // Save to localStorage
                localStorage.setItem('shipColor', color);
                
                // Play a sound
                if (window.game && window.game.soundManager) {
                    window.game.soundManager.play('powerup', { volume: 0.3, playbackRate: 1.5 });
                }
            };
            
            shipColorGrid.appendChild(colorButton);
        });
        
        shipColorSection.appendChild(shipColorGrid);
        appearanceSection.appendChild(shipColorSection);
        
        // Engine Color Section
        const engineColorSection = document.createElement('div');
        
        const engineColorLabel = document.createElement('div');
        engineColorLabel.textContent = '🔥 Engine Color';
        engineColorLabel.style.fontWeight = 'bold';
        engineColorLabel.style.marginBottom = '10px';
        engineColorSection.appendChild(engineColorLabel);
        
        // Create engine color grid
        const engineColorGrid = document.createElement('div');
        engineColorGrid.style.display = 'grid';
        engineColorGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
        engineColorGrid.style.gap = '8px';
        
        // Define engine colors
        const engineColors = [
            '#f66', '#ff6', '#6ff', '#f6f', '#6f6', '#66f',
            '#f00', '#ff0', '#0ff', '#f0f', '#0f0', '#00f',
            '#fa0', '#0af', '#a0f', '#f0a', '#afa', '#faa',
            '#fff', '#aaa', '#555', '#000', '#ffd', '#fdb'
        ];
        
        // Create engine color selection buttons
        engineColors.forEach(color => {
            const colorButton = document.createElement('button');
            colorButton.style.width = '100%';
            colorButton.style.height = '24px';
            colorButton.style.backgroundColor = color;
            colorButton.style.border = color === (this.player.engineColor || '#f66') ? 
                '2px solid white' : '1px solid #555';
            colorButton.style.borderRadius = '4px';
            colorButton.style.cursor = 'pointer';
            colorButton.style.padding = '0';
            
            colorButton.onclick = () => {
                // Update player engine color
                this.player.setEngineColor(color);
                
                // Update selected button appearance
                engineColorGrid.querySelectorAll('button').forEach(btn => {
                    btn.style.border = '1px solid #555';
                });
                colorButton.style.border = '2px solid white';
                
                // Update the preview
                drawShipPreview();
                
                // Save to localStorage
                localStorage.setItem('engineColor', color);
                
                // Play a sound
                if (window.game && window.game.soundManager) {
                    window.game.soundManager.play('powerup', { volume: 0.3, playbackRate: 1.2 });
                }
            };
            
            engineColorGrid.appendChild(colorButton);
        });
        
        engineColorSection.appendChild(engineColorGrid);
        appearanceSection.appendChild(engineColorSection);
        
        container.appendChild(appearanceSection);
        
        // Draw initial ship preview
        drawShipPreview();
    }
    
    toggleShop() {
        this.shopOpen = !this.shopOpen;
        const container = document.getElementById('shop-container');
        
        if (this.shopOpen) {
            container.classList.remove('hidden');
            this.updateShopContent();
        } else {
            container.classList.add('hidden');
        }
    }
    
    buyShip(shipId) {
        const ship = this.availableShips.find(s => s.id === shipId);
        if (!ship || ship.owned || (this.player.credits || 0) < ship.price) {
            return;
        }
        
        // Deduct credits
        this.player.credits -= ship.price;
        
        // Mark as owned
        ship.owned = true;
        
        // Save ship ownership to localStorage
        localStorage.setItem(`ship_${shipId}`, 'true');
        localStorage.setItem('playerCredits', this.player.credits.toString());
        
        // Apply the ship
        this.selectShip(shipId);
        
        // Update shop display
        this.updateShopContent();
    }
    
    selectShip(shipId) {
        const ship = this.availableShips.find(s => s.id === shipId);
        if (!ship || !ship.owned) {
            return;
        }
        
        this.player.currentShip = shipId;
        localStorage.setItem('currentShip', shipId);
        
        // Apply ship stats to player
        this.player.maxHealth = ship.stats.maxHealth;
        this.player.maxSpeed = ship.stats.maxSpeed;
        this.player.acceleration = ship.stats.acceleration;
        this.player.rotationSpeed = ship.stats.handling;
        this.player.armor = ship.stats.armor || 1.0;
        
        // Apply armor bonus on top of base ship stats
        const armorUpgrade = this.availableUpgrades.find(u => u.id === 'armor');
        if (armorUpgrade && armorUpgrade.level > 0) {
            const effects = armorUpgrade.getEffect(armorUpgrade.level);
            this.player.maxHealth += effects.maxHealth;
            this.player.damageReduction = effects.damageReduction;
        }
        
        // Apply engine bonus on top of base ship stats
        const engineUpgrade = this.availableUpgrades.find(u => u.id === 'engine');
        if (engineUpgrade && engineUpgrade.level > 0) {
            const effects = engineUpgrade.getEffect(engineUpgrade.level);
            this.player.maxSpeed += effects.maxSpeed;
            this.player.acceleration += effects.acceleration;
        }
        
        // If health is above new max, cap it
        if (this.player.health > this.player.maxHealth) {
            this.player.health = this.player.maxHealth;
        }
        
        // Update shop display
        this.updateShopContent();
    }
    
    buyWeapon(weaponId) {
        const weapon = this.availableWeapons.find(w => w.id === weaponId);
        if (!weapon || weapon.owned || (this.player.credits || 0) < weapon.price) {
            return;
        }
        
        // Deduct credits
        this.player.credits -= weapon.price;
        
        // Mark as owned
        weapon.owned = true;
        
        // Save to localStorage
        localStorage.setItem(`weapon_${weaponId}`, 'true');
        localStorage.setItem('playerCredits', this.player.credits.toString());
        
        // Add to player's weapons array if not already there
        const weaponName = weapon.name;
        if (!this.player.weapons.includes(weaponName)) {
            this.player.weapons.push(weaponName);
        }
        
        // Select the newly purchased weapon
        this.selectWeapon(weaponId);
        
        // Update shop display
        this.updateShopContent();
    }
    
    selectWeapon(weaponId) {
        const weapon = this.availableWeapons.find(w => w.id === weaponId);
        if (!weapon || !weapon.owned) {
            return;
        }
        
        this.player.currentWeaponId = weaponId;
        localStorage.setItem('currentWeapon', weaponId);
        
        // Find the index of this weapon in the player's weapons array
        const index = this.player.weapons.findIndex(w => w === weapon.name);
        if (index >= 0) {
            this.player.weaponIndex = index;
            this.player.currentWeapon = weapon.name;
        }
        
        // Apply weapon stats
        this.player.fireCooldownTime = weapon.stats.cooldown;
        
        // Update shop display
        this.updateShopContent();
        
        // Update weapon display in UI
        const weaponElement = document.getElementById('weapons');
        if (weaponElement) {
            weaponElement.textContent = weapon.name;
        }
        
        // Update weapon icon based on weapon type
        const weaponIcon = document.getElementById('weapon-icon');
        if (weaponIcon) {
            switch(weapon.name) {
                case 'Basic Laser':
                    weaponIcon.innerHTML = '🔫';
                    break;
                case 'Burst Cannon':
                    weaponIcon.innerHTML = '💥';
                    break;
                case 'Seeker Missile':
                    weaponIcon.innerHTML = '🚀';
                    break;
                case 'Plasma Cannon':
                    weaponIcon.innerHTML = '🔆';
                    break;
                case 'Quantum Disruptor':
                    weaponIcon.innerHTML = '⚡';
                    break;
                default:
                    weaponIcon.innerHTML = '🔫';
            }
        }
    }
    
    buyUpgrade(upgradeId) {
        const upgrade = this.availableUpgrades.find(u => u.id === upgradeId);
        if (!upgrade || upgrade.level >= upgrade.maxLevel) {
            return;
        }
        
        const price = upgrade.getPrice(upgrade.level);
        if ((this.player.credits || 0) < price) {
            return;
        }
        
        // Deduct credits
        this.player.credits -= price;
        
        // Increase level
        upgrade.level += 1;
        
        // Save upgrade level to localStorage
        localStorage.setItem(`upgrade_${upgradeId}`, upgrade.level.toString());
        localStorage.setItem('playerCredits', this.player.credits.toString());
        
        // Apply upgrade effects to player
        const effects = upgrade.getEffect(upgrade.level);
        
        // Apply the upgrade effects differently based on the upgrade type
        switch (upgrade.id) {
            case 'engine':
                this.player.maxSpeed += effects.maxSpeed - (upgrade.level > 1 ? upgrade.getEffect(upgrade.level - 1).maxSpeed : 0);
                this.player.acceleration += effects.acceleration - (upgrade.level > 1 ? upgrade.getEffect(upgrade.level - 1).acceleration : 0);
                break;
                
            case 'shield':
                this.player.shieldCapacity = effects.shieldCapacity;
                // Initialize shield value if not present
                if (this.player.shield === undefined) {
                    this.player.shield = effects.shieldCapacity;
                } else {
                    // Add the difference to current shield value
                    const increase = effects.shieldCapacity - (upgrade.level > 1 ? upgrade.getEffect(upgrade.level - 1).shieldCapacity : 0);
                    this.player.shield = Math.min(this.player.shield + increase, effects.shieldCapacity);
                }
                break;
                
            case 'energy':
                this.player.maxEnergy = effects.maxEnergy;
                this.player.energyRegen = effects.energyRegen;
                // Initialize energy if not present
                if (this.player.energy === undefined) {
                    this.player.energy = effects.maxEnergy;
                } else {
                    // Add the difference to current energy
                    const increase = effects.maxEnergy - (upgrade.level > 1 ? upgrade.getEffect(upgrade.level - 1).maxEnergy : 0);
                    this.player.energy = Math.min(this.player.energy + increase, effects.maxEnergy);
                }
                break;
                
            case 'armor':
                this.player.maxHealth += effects.maxHealth - (upgrade.level > 1 ? upgrade.getEffect(upgrade.level - 1).maxHealth : 0);
                this.player.damageReduction = effects.damageReduction;
                // Add the health increase to current health
                const healthIncrease = effects.maxHealth - (upgrade.level > 1 ? upgrade.getEffect(upgrade.level - 1).maxHealth : 0);
                this.player.health = Math.min(this.player.health + healthIncrease, this.player.maxHealth);
                break;
                
            case 'cargo':
                this.player.cargoCapacity = effects.cargoCapacity;
                break;
        }
        
        // Update shop display
        this.updateShopContent();
    }
    
    // Method to reset localStorage for testing purposes
    resetAllPurchases() {
        // Clear ship ownership
        this.availableShips.forEach(ship => {
            if (ship.id !== 'scout') { // Always keep the scout ship
                localStorage.removeItem(`ship_${ship.id}`);
                ship.owned = false;
            }
        });
        
        // Clear weapon ownership
        this.availableWeapons.forEach(weapon => {
            if (weapon.id !== 'laser') { // Always keep the basic laser
                localStorage.removeItem(`weapon_${weapon.id}`);
                weapon.owned = false;
            }
        });
        
        // Reset upgrade levels
        this.availableUpgrades.forEach(upgrade => {
            localStorage.removeItem(`upgrade_${upgrade.id}`);
            upgrade.level = 0;
        });
        
        // Reset current equipment
        localStorage.setItem('currentShip', 'scout');
        localStorage.setItem('currentWeapon', 'laser');
        
        // Update shop display
        this.updateShopContent();
    }
}