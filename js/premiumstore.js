// Premium Store System for SuperSpace
// Handles premium purchases using Space Gems (premium currency)

export class PremiumStore {
    constructor(player) {
        this.player = player;
        this.storeOpen = false;
        this.currentTab = 'avatars'; // 'avatars', 'skins', 'gems'
        this.spaceGems = this.loadSpaceGems();
        this.premiumPurchases = this.loadPremiumPurchases();
        this.paypalIntegration = null; // Will be set when PayPal is loaded
        this.avatarManager = null; // Will be set when avatar manager is created
        
        // Premium avatar collection
        this.premiumAvatars = [
            {
                id: 'astronaut_gold',
                name: 'Golden Astronaut',
                description: 'Luxurious golden space suit for elite pilots',
                gemPrice: 150,
                realPrice: 2.99, // USD
                owned: false,
                rarity: 'legendary',
                drawMethod: 'drawGoldenAstronaut'
            },
            {
                id: 'alien_commander',
                name: 'Alien Commander',
                description: 'Lead the galaxy with this mysterious alien avatar',
                gemPrice: 200,
                realPrice: 3.99,
                owned: false,
                rarity: 'legendary',
                drawMethod: 'drawAlienCommanderPremium'
            },
            {
                id: 'cyber_pilot',
                name: 'Cyber Pilot',
                description: 'Futuristic cybernetic enhancement suit',
                gemPrice: 120,
                realPrice: 1.99,
                owned: false,
                rarity: 'epic',
                drawMethod: 'drawCyberPilot'
            },
            {
                id: 'galaxy_explorer',
                name: 'Galaxy Explorer',
                description: 'For those who venture into the unknown',
                gemPrice: 100,
                realPrice: 1.49,
                owned: false,
                rarity: 'rare',
                drawMethod: 'drawGalaxyExplorer'
            },
            {
                id: 'neon_warrior',
                name: 'Neon Warrior',
                description: 'Glow with power in the darkness of space',
                gemPrice: 175,
                realPrice: 2.49,
                owned: false,
                rarity: 'legendary',
                drawMethod: 'drawNeonWarrior'
            }
        ];
        
        // Ship skins (cosmetic variations)
        this.shipSkins = [
            // Scout Skins
            {
                id: 'scout_stealth',
                name: 'Stealth Scout',
                description: 'Dark grey hull with blue accents',
                shipType: 'scout',
                gemPrice: 80,
                realPrice: 0.99,
                owned: false,
                rarity: 'rare',
                appearance: {
                    color: '#404040',
                    accent: '#0066cc',
                    effect: 'stealth'
                }
            },
            {
                id: 'scout_neon',
                name: 'Neon Scout',
                description: 'Electric blue hull with cyan glow',
                shipType: 'scout',
                gemPrice: 100,
                realPrice: 1.49,
                owned: false,
                rarity: 'epic',
                appearance: {
                    color: '#00ffff',
                    accent: '#0080ff',
                    effect: 'glow'
                }
            },
            
            // Fighter Skins
            {
                id: 'fighter_crimson',
                name: 'Crimson Fighter',
                description: 'Blood-red hull with golden trim',
                shipType: 'fighter',
                gemPrice: 120,
                realPrice: 1.99,
                owned: false,
                rarity: 'epic',
                appearance: {
                    color: '#cc0000',
                    accent: '#ffdd00',
                    effect: 'metallic'
                }
            },
            {
                id: 'fighter_void',
                name: 'Void Fighter',
                description: 'Deep purple hull with violet accents',
                shipType: 'fighter',
                gemPrice: 150,
                realPrice: 2.99,
                owned: false,
                rarity: 'legendary',
                appearance: {
                    color: '#330066',
                    accent: '#6600cc',
                    effect: 'void'
                }
            },
            
            // Heavy Skins
            {
                id: 'heavy_titan',
                name: 'Titan Heavy',
                description: 'Industrial grey with yellow stripes',
                shipType: 'heavy',
                gemPrice: 140,
                realPrice: 2.49,
                owned: false,
                rarity: 'epic',
                appearance: {
                    color: '#666666',
                    accent: '#ffff00',
                    effect: 'industrial'
                }
            },
            {
                id: 'heavy_phoenix',
                name: 'Phoenix Heavy',
                description: 'Flame orange with red highlights',
                shipType: 'heavy',
                gemPrice: 180,
                realPrice: 3.49,
                owned: false,
                rarity: 'legendary',
                appearance: {
                    color: '#ff4400',
                    accent: '#ffaa00',
                    effect: 'fire'
                }
            },
            
            // Stealth Skins
            {
                id: 'stealth_shadow',
                name: 'Shadow Stealth',
                description: 'Charcoal grey with purple highlights',
                shipType: 'stealth',
                gemPrice: 160,
                realPrice: 2.99,
                owned: false,
                rarity: 'epic',
                appearance: {
                    color: '#4a4a4a',
                    accent: '#8844aa',
                    effect: 'stealth'
                }
            },
            {
                id: 'stealth_ghost',
                name: 'Ghost Stealth',
                description: 'Silver-blue with white details',
                shipType: 'stealth',
                gemPrice: 200,
                realPrice: 3.99,
                owned: false,
                rarity: 'legendary',
                appearance: {
                    color: '#5a6a7a',
                    accent: '#aabbcc',
                    effect: 'ghost'
                }
            }
        ];
        
        // Space Gem packages
        this.gemPackages = [
            {
                id: 'starter_gems',
                name: 'Starter Pack',
                description: 'Perfect for your first premium purchase',
                gems: 100,
                price: 0.99,
                bonus: 0,
                popular: false
            },
            {
                id: 'explorer_gems',
                name: 'Explorer Pack',
                description: 'Great value for space adventurers',
                gems: 250,
                price: 1.99,
                bonus: 50, // 50 bonus gems
                popular: true
            },
            {
                id: 'commander_gems',
                name: 'Commander Pack',
                description: 'For serious space commanders',
                gems: 500,
                price: 3.99,
                bonus: 150,
                popular: false
            },
            {
                id: 'legend_gems',
                name: 'Legend Pack',
                description: 'Ultimate gem collection',
                gems: 1200,
                price: 7.99,
                bonus: 400,
                popular: false
            }
        ];
        
        this.updateOwnedStatus();
    }
    
    loadSpaceGems() {
        const stored = localStorage.getItem('spaceGems');
        return stored ? parseInt(stored) : 0;
    }
    
    saveSpaceGems() {
        localStorage.setItem('spaceGems', this.spaceGems.toString());
    }
    
    loadPremiumPurchases() {
        const stored = localStorage.getItem('premiumPurchases');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to load premium purchases:', e);
            }
        }
        return {
            avatars: [],
            skins: [],
            purchaseHistory: []
        };
    }
    
    savePremiumPurchases() {
        localStorage.setItem('premiumPurchases', JSON.stringify(this.premiumPurchases));
    }
    
    updateOwnedStatus() {
        // Update avatar ownership
        this.premiumAvatars.forEach(avatar => {
            avatar.owned = this.premiumPurchases.avatars.includes(avatar.id);
        });
        
        // Update skin ownership
        this.shipSkins.forEach(skin => {
            skin.owned = this.premiumPurchases.skins.includes(skin.id);
        });
    }
    
    // Purchase with Space Gems
    purchaseWithGems(itemType, itemId) {
        let item;
        let itemArray;
        
        if (itemType === 'avatar') {
            item = this.premiumAvatars.find(a => a.id === itemId);
            itemArray = this.premiumPurchases.avatars;
        } else if (itemType === 'skin') {
            item = this.shipSkins.find(s => s.id === itemId);
            itemArray = this.premiumPurchases.skins;
        }
        
        if (!item) {
            console.error('Item not found:', itemType, itemId);
            return false;
        }
        
        if (item.owned) {
            console.log('Item already owned');
            return false;
        }
        
        if (this.spaceGems < item.gemPrice) {
            console.log('Not enough Space Gems');
            return false;
        }
        
        // Purchase successful
        this.spaceGems -= item.gemPrice;
        itemArray.push(itemId);
        item.owned = true;
        
        // Record purchase
        this.premiumPurchases.purchaseHistory.push({
            type: itemType,
            id: itemId,
            name: item.name,
            cost: item.gemPrice,
            currency: 'gems',
            timestamp: Date.now()
        });
        
        this.saveSpaceGems();
        this.savePremiumPurchases();
        
        // Refresh avatar manager if an avatar was purchased
        if (itemType === 'avatar' && this.avatarManager) {
            this.avatarManager.setupPremiumAvatars();
            this.avatarManager.drawAllAvatars();
        }
        
        console.log(`Purchased ${item.name} for ${item.gemPrice} Space Gems`);
        return true;
    }
    
    // Add Space Gems (after real money purchase)
    addSpaceGems(amount, packageId = null) {
        this.spaceGems += amount;
        this.saveSpaceGems();
        
        if (packageId) {
            this.premiumPurchases.purchaseHistory.push({
                type: 'gems',
                id: packageId,
                amount: amount,
                currency: 'real',
                timestamp: Date.now()
            });
            this.savePremiumPurchases();
        }
        
        console.log(`Added ${amount} Space Gems. Total: ${this.spaceGems}`);
    }
    
    // Get owned premium avatars
    getOwnedPremiumAvatars() {
        return this.premiumAvatars.filter(avatar => avatar.owned);
    }
    
    // Get owned ship skins for a specific ship type
    getOwnedSkinsForShip(shipType) {
        return this.shipSkins.filter(skin => 
            skin.shipType === shipType && skin.owned
        );
    }
    
    // Check if player owns a specific item
    ownsItem(itemType, itemId) {
        if (itemType === 'avatar') {
            return this.premiumPurchases.avatars.includes(itemId);
        } else if (itemType === 'skin') {
            return this.premiumPurchases.skins.includes(itemId);
        }
        return false;
    }
    
    // Toggle store display
    toggleStore() {
        this.storeOpen = !this.storeOpen;
        if (this.storeOpen) {
            this.updateOwnedStatus();
        }
    }
    
    // Switch store tabs
    setTab(tab) {
        this.currentTab = tab;
    }
    
    // Get items for current tab
    getCurrentTabItems() {
        switch (this.currentTab) {
            case 'avatars':
                return this.premiumAvatars;
            case 'skins':
                return this.shipSkins;
            case 'gems':
                return this.gemPackages;
            default:
                return [];
        }
    }
    
    // Render the premium store UI
    render(ctx, canvas) {
        if (!this.storeOpen) return;
        
        // Store background - match game style
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Sci-fi border effect
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        
        // Inner border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);
        
        // Store header - match game typography
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Orbitron, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PREMIUM STORE', canvas.width / 2, 70);
        
        // Subtitle
        ctx.fillStyle = '#00ffff';
        ctx.font = '16px Orbitron, Arial, sans-serif';
        ctx.fillText('COSMETIC UPGRADES & SPACE GEMS', canvas.width / 2, 95);
        
        // Space Gems display - sci-fi style
        ctx.fillStyle = '#000000';
        ctx.fillRect(canvas.width / 2 - 100, 105, 200, 30);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 100, 105, 200, 30);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 18px Orbitron, Arial, sans-serif';
        ctx.fillText(`💎 ${this.spaceGems} SPACE GEMS`, canvas.width / 2, 125);
        
        // Tab buttons - game style
        this.renderTabs(ctx, canvas);
        
        // Store content
        this.renderStoreContent(ctx, canvas);
        
        // Close button - sci-fi style
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(canvas.width - 80, 30, 60, 35);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - 80, 30, 60, 35);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Orbitron, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CLOSE', canvas.width - 50, 52);
        
        // Instructions - match game style
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Orbitron, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK ITEMS TO PURCHASE WITH SPACE GEMS', canvas.width / 2, canvas.height - 50);
        ctx.fillText('PURCHASE SPACE GEMS WITH REAL MONEY IN THE GEMS TAB', canvas.width / 2, canvas.height - 30);
    }
    
    renderTabs(ctx, canvas) {
        const tabs = [
            { id: 'avatars', name: 'AVATARS', icon: '👨‍🚀' },
            { id: 'skins', name: 'SHIP SKINS', icon: '🚀' },
            { id: 'gems', name: 'SPACE GEMS', icon: '💎' }
        ];
        
        const tabWidth = 160;
        const startX = (canvas.width - (tabs.length * tabWidth)) / 2;
        
        tabs.forEach((tab, index) => {
            const x = startX + (index * tabWidth);
            const y = 150;
            const isActive = this.currentTab === tab.id;
            
            // Tab background - sci-fi style
            ctx.fillStyle = isActive ? '#003366' : '#001122';
            ctx.fillRect(x, y, tabWidth - 10, 40);
            
            // Tab border
            ctx.strokeStyle = isActive ? '#00ffff' : '#666666';
            ctx.lineWidth = isActive ? 3 : 1;
            ctx.strokeRect(x, y, tabWidth - 10, 40);
            
            // Tab text - Orbitron font
            ctx.fillStyle = isActive ? '#00ffff' : '#ffffff';
            ctx.font = `${isActive ? 'bold ' : ''}14px Orbitron, Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(`${tab.icon} ${tab.name}`, x + (tabWidth - 10) / 2, y + 25);
        });
    }
    
    renderStoreContent(ctx, canvas) {
        const items = this.getCurrentTabItems();
        const startY = 220;
        const itemHeight = 140;
        const itemsPerRow = 2;
        const itemWidth = 320;
        const spacing = 40;
        
        items.forEach((item, index) => {
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = (canvas.width / 2) - (itemsPerRow * itemWidth + (itemsPerRow - 1) * spacing) / 2 + col * (itemWidth + spacing);
            const y = startY + row * (itemHeight + 30);
            
            this.renderStoreItem(ctx, item, x, y, itemWidth, itemHeight);
        });
    }
    
    renderStoreItem(ctx, item, x, y, width, height) {
        // Item background - sci-fi panel style
        const isOwned = item.owned || (item.gems !== undefined);
        ctx.fillStyle = isOwned ? '#002200' : '#111122';
        ctx.fillRect(x, y, width, height);
        
        // Item border - sci-fi style
        ctx.strokeStyle = isOwned ? '#00ff00' : '#00ffff';
        ctx.lineWidth = isOwned ? 3 : 2;
        ctx.strokeRect(x, y, width, height);
        
        // Inner border
        ctx.strokeStyle = isOwned ? '#004400' : '#003366';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);
        
        // Item content - Orbitron font
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Orbitron, Arial, sans-serif';
        ctx.textAlign = 'left';
        
        if (item.gems !== undefined) {
            // Gem package
            ctx.fillText(item.name.toUpperCase(), x + 15, y + 25);
            ctx.font = '12px Orbitron, Arial, sans-serif';
            ctx.fillStyle = '#cccccc';
            ctx.fillText(item.description, x + 15, y + 45);
            
            ctx.fillStyle = '#00ffff';
            ctx.font = 'bold 18px Orbitron, Arial, sans-serif';
            ctx.fillText(`💎 ${item.gems}${item.bonus > 0 ? ` + ${item.bonus} BONUS` : ''}`, x + 15, y + 75);
            
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 20px Orbitron, Arial, sans-serif';
            ctx.fillText(`$${item.price}`, x + 15, y + 105);
            
            if (item.popular) {
                ctx.fillStyle = '#ff4444';
                ctx.font = 'bold 12px Orbitron, Arial, sans-serif';
                ctx.fillText('POPULAR!', x + width - 90, y + 20);
            }
            
            // Purchase button
            const btnX = x + width - 100;
            const btnY = y + height - 35;
            ctx.fillStyle = '#006600';
            ctx.fillRect(btnX, btnY, 80, 25);
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(btnX, btnY, 80, 25);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Orbitron, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('BUY NOW', btnX + 40, btnY + 16);
            
        } else {
            // Avatar or skin - render actual preview
            if (this.currentTab === 'avatars') {
                // Create a small canvas for avatar preview
                const previewCanvas = document.createElement('canvas');
                previewCanvas.width = 48;
                previewCanvas.height = 48;
                const previewCtx = previewCanvas.getContext('2d');
                
                // Render the actual avatar
                if (this.avatarManager && this.avatarManager[item.drawMethod]) {
                    this.avatarManager[item.drawMethod](previewCtx, 48);
                    ctx.drawImage(previewCanvas, x + 15, y + 15, 48, 48);
                }
            } else if (this.currentTab === 'skins' && item.appearance && item.appearance.effect) {
                // Render ship with skin preview using ACTUAL game ship geometry
                const previewCanvas = document.createElement('canvas');
                previewCanvas.width = 80;
                previewCanvas.height = 60;
                const previewCtx = previewCanvas.getContext('2d');
                
                // Completely transparent background - no boxes or borders
                previewCtx.clearRect(0, 0, 80, 60);
                
                // Center the ship in preview
                previewCtx.save();
                previewCtx.translate(40, 30);
                previewCtx.scale(1.4, 1.4); // Larger scale for better visibility
                
                // Use skin colors
                const shipColor = item.appearance.color || '#666666';
                const accentColor = item.appearance.accent || '#ffffff';
                
                // Apply skin effects BEFORE drawing ship for better results
                if (item.appearance.effect === 'glow') {
                    previewCtx.shadowColor = shipColor;
                    previewCtx.shadowBlur = 12;
                } else if (item.appearance.effect === 'stealth' || item.appearance.effect === 'ghost') {
                    previewCtx.globalAlpha = 0.8; // More visible than before
                }
                
                // Draw the ACTUAL ship shape based on ship type using your game's exact code
                if (item.shipType === 'scout') {
                    // EXACT scout ship from your game
                    previewCtx.fillStyle = shipColor;
                    previewCtx.beginPath();
                    previewCtx.moveTo(0, -15); // front nose
                    previewCtx.lineTo(-4, -10); // left nose edge
                    previewCtx.lineTo(-12, 0); // left wing tip
                    previewCtx.lineTo(-8, 8); // left rear corner
                    previewCtx.lineTo(-5, 5); // left engine mount
                    previewCtx.lineTo(0, 7); // center bottom
                    previewCtx.lineTo(5, 5); // right engine mount
                    previewCtx.lineTo(8, 8); // right rear corner
                    previewCtx.lineTo(12, 0); // right wing tip
                    previewCtx.lineTo(4, -10); // right nose edge
                    previewCtx.closePath();
                    previewCtx.fill();
                    
                    // Cockpit canopy
                    previewCtx.fillStyle = 'rgba(130, 200, 255, 0.7)';
                    previewCtx.beginPath();
                    previewCtx.ellipse(0, -5, 3, 6, 0, 0, Math.PI * 2);
                    previewCtx.fill();
                    
                    // Detail lines
                    previewCtx.strokeStyle = 'rgba(50, 50, 50, 0.7)';
                    previewCtx.lineWidth = 1;
                    previewCtx.beginPath();
                    previewCtx.moveTo(-8, 0);
                    previewCtx.lineTo(-4, -8);
                    previewCtx.moveTo(8, 0);
                    previewCtx.lineTo(4, -8);
                    previewCtx.stroke();
                    
                } else if (item.shipType === 'fighter') {
                    // EXACT fighter ship from your game - no background boxes
                    previewCtx.fillStyle = shipColor;
                    previewCtx.beginPath();
                    previewCtx.moveTo(0, -16); // Front nose tip (scaled for preview)
                    previewCtx.lineTo(-3, -11); // Left side of nose
                    previewCtx.lineTo(-13, -3); // Left wing tip
                    previewCtx.lineTo(-9, 0); // Left wing inner edge
                    previewCtx.lineTo(-11, 9); // Left rear wing
                    previewCtx.lineTo(-3, 6); // Left engine mount
                    previewCtx.lineTo(0, 7); // Center bottom
                    previewCtx.lineTo(3, 6); // Right engine mount
                    previewCtx.lineTo(11, 9); // Right rear wing
                    previewCtx.lineTo(9, 0); // Right wing inner edge
                    previewCtx.lineTo(13, -3); // Right wing tip
                    previewCtx.lineTo(3, -11); // Right side of nose
                    previewCtx.closePath();
                    previewCtx.fill();
                    
                    // Cockpit
                    previewCtx.fillStyle = 'rgba(180, 230, 255, 0.7)';
                    previewCtx.beginPath();
                    previewCtx.ellipse(0, -6, 3, 5, 0, 0, Math.PI * 2);
                    previewCtx.fill();
                    
                    // Wing markings/details
                    previewCtx.fillStyle = accentColor;
                    previewCtx.beginPath();
                    previewCtx.moveTo(-11, -2);
                    previewCtx.lineTo(-7, -1);
                    previewCtx.lineTo(-7, 1);
                    previewCtx.lineTo(-11, 0);
                    previewCtx.closePath();
                    previewCtx.fill();
                    
                    previewCtx.beginPath();
                    previewCtx.moveTo(11, -2);
                    previewCtx.lineTo(7, -1);
                    previewCtx.lineTo(7, 1);
                    previewCtx.lineTo(11, 0);
                    previewCtx.closePath();
                    previewCtx.fill();
                    
                } else if (item.shipType === 'heavy') {
                    // EXACT heavy ship from your game - no background boxes
                    previewCtx.fillStyle = shipColor;
                    previewCtx.beginPath();
                    previewCtx.moveTo(0, -18); // Nose tip (scaled for preview)
                    previewCtx.lineTo(-5, -13); // Left front angled edge
                    previewCtx.lineTo(-8, -3); // Left mid-hull
                    previewCtx.lineTo(-16, 0); // Left wing tip
                    previewCtx.lineTo(-16, 3); // Left wing corner
                    previewCtx.lineTo(-12, 5); // Left wing inner
                    previewCtx.lineTo(-6, 11); // Left engine mount
                    previewCtx.lineTo(0, 9); // Bottom center
                    previewCtx.lineTo(6, 11); // Right engine mount
                    previewCtx.lineTo(12, 5); // Right wing inner 
                    previewCtx.lineTo(16, 3); // Right wing corner
                    previewCtx.lineTo(16, 0); // Right wing tip
                    previewCtx.lineTo(8, -3); // Right mid-hull
                    previewCtx.lineTo(5, -13); // Right front angled edge
                    previewCtx.closePath();
                    previewCtx.fill();
                    
                    // Heavy armor plating
                    previewCtx.strokeStyle = accentColor;
                    previewCtx.lineWidth = 1;
                    previewCtx.beginPath();
                    previewCtx.moveTo(-6, -9);
                    previewCtx.lineTo(-9, -3);
                    previewCtx.moveTo(6, -9);
                    previewCtx.lineTo(9, -3);
                    previewCtx.moveTo(-6, -3);
                    previewCtx.lineTo(6, -3);
                    previewCtx.stroke();
                    
                    // Cockpit
                    previewCtx.fillStyle = 'rgba(150, 200, 255, 0.8)';
                    previewCtx.beginPath();
                    previewCtx.ellipse(0, -7, 3, 5, 0, 0, Math.PI * 2);
                    previewCtx.fill();
                    
                    // Side weapon mounts
                    previewCtx.fillStyle = '#555';
                    previewCtx.beginPath();
                    previewCtx.rect(-14, -1, 5, 2);
                    previewCtx.rect(9, -1, 5, 2);
                    previewCtx.fill();
                    
                } else if (item.shipType === 'stealth') {
                    // EXACT stealth ship from your game - with MORE VISIBLE colors
                    previewCtx.fillStyle = shipColor;
                    previewCtx.beginPath();
                    previewCtx.moveTo(0, -16); // Nose tip (scaled for preview)
                    previewCtx.lineTo(-2, -12); // Narrow front section
                    previewCtx.lineTo(-12, -4); // Left wing edge
                    previewCtx.lineTo(-6, 4); // Left mid-wing
                    previewCtx.lineTo(-9, 12); // Left wing extension
                    previewCtx.lineTo(-4, 9); // Left engine
                    previewCtx.lineTo(0, 8); // Center
                    previewCtx.lineTo(4, 9); // Right engine
                    previewCtx.lineTo(9, 12); // Right wing extension
                    previewCtx.lineTo(6, 4); // Right mid-wing
                    previewCtx.lineTo(12, -4); // Right wing edge
                    previewCtx.lineTo(2, -12); // Narrow front section
                    previewCtx.closePath();
                    previewCtx.fill();
                    
                    // Add visible outline to prevent unfair advantage
                    previewCtx.strokeStyle = accentColor;
                    previewCtx.lineWidth = 1;
                    previewCtx.stroke();
                    
                    // Stealth panels with VISIBLE gradient
                    const stealthGradient = previewCtx.createLinearGradient(0, -12, 0, 12);
                    stealthGradient.addColorStop(0, shipColor);
                    stealthGradient.addColorStop(0.5, accentColor);
                    stealthGradient.addColorStop(1, shipColor);
                    
                    previewCtx.fillStyle = stealthGradient;
                    previewCtx.beginPath();
                    previewCtx.moveTo(-8, -2);
                    previewCtx.lineTo(-5, 0);
                    previewCtx.lineTo(-6, 6);
                    previewCtx.lineTo(-9, 9);
                    previewCtx.closePath();
                    previewCtx.fill();
                    
                    previewCtx.beginPath();
                    previewCtx.moveTo(8, -2);
                    previewCtx.lineTo(5, 0);
                    previewCtx.lineTo(6, 6);
                    previewCtx.lineTo(9, 9);
                    previewCtx.closePath();
                    previewCtx.fill();
                    
                    // Cockpit - VISIBLE tinted window
                    previewCtx.fillStyle = accentColor;
                    previewCtx.beginPath();
                    previewCtx.ellipse(0, -6, 2, 4, 0, 0, Math.PI * 2);
                    previewCtx.fill();
                    
                    // Add distinctive markings to make it clearly visible
                    previewCtx.fillStyle = accentColor;
                    previewCtx.fillRect(-1, -10, 2, 3); // Center stripe
                    previewCtx.fillRect(-6, 2, 2, 1); // Left marking
                    previewCtx.fillRect(4, 2, 2, 1); // Right marking
                }
                
                // Apply additional skin effects AFTER ship is drawn (NO BACKGROUND FILLS)
                if (item.appearance.effect === 'metallic') {
                    // Create metallic shimmer effect without background
                    previewCtx.globalCompositeOperation = 'overlay';
                    const gradient = previewCtx.createLinearGradient(-20, -20, 20, 20);
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
                    previewCtx.fillStyle = gradient;
                    // Only fill the ship area, not the whole canvas
                    previewCtx.fill();
                    previewCtx.globalCompositeOperation = 'source-over';
                } else if (item.appearance.effect === 'fire') {
                    // Add fire glow around ship edges only
                    previewCtx.shadowColor = '#ff4400';
                    previewCtx.shadowBlur = 8;
                    previewCtx.globalCompositeOperation = 'screen';
                    previewCtx.fillStyle = 'rgba(255, 100, 0, 0.2)';
                    previewCtx.fill(); // Only fills the ship path
                    previewCtx.globalCompositeOperation = 'source-over';
                }
                
                previewCtx.restore();
                ctx.drawImage(previewCanvas, x + 15, y + 15, 80, 60);
            }
            
            ctx.textAlign = 'left';
            ctx.font = 'bold 14px Orbitron, Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.name.toUpperCase(), x + 100, y + 25);
            
            ctx.font = '11px Orbitron, Arial, sans-serif';
            ctx.fillStyle = '#cccccc';
            
            // Wrap long descriptions to fit in the item box
            const words = item.description.split(' ');
            let line = '';
            let textY = y + 45; // Use different variable name to avoid conflict
            const maxWidth = width - 110; // Leave space for preview and padding
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, x + 100, textY);
                    line = words[n] + ' ';
                    textY += 14; // Line height
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x + 100, textY);
            
            // Rarity - position it AFTER the description text ends
            const rarityColors = {
                'rare': '#0066ff',
                'epic': '#9933ff',
                'legendary': '#ff6600'
            };
            ctx.fillStyle = rarityColors[item.rarity] || '#cccccc';
            ctx.font = 'bold 12px Orbitron, Arial, sans-serif';
            ctx.fillText(item.rarity.toUpperCase(), x + 100, textY + 20); // 20px below description
            
            // Price or owned status
            if (!isOwned) {
                ctx.fillStyle = '#00ffff';
                ctx.font = 'bold 16px Orbitron, Arial, sans-serif';
                ctx.fillText(`💎 ${item.gemPrice}`, x + 100, textY + 45); // Position relative to description end
                
                ctx.fillStyle = '#ffff00';
                ctx.font = '11px Orbitron, Arial, sans-serif';
                ctx.fillText(`or $${item.realPrice}`, x + 100, textY + 65); // Position relative to description end
                
                // Purchase button
                const btnX = x + width - 100;
                const btnY = y + height - 35;
                ctx.fillStyle = '#003366';
                ctx.fillRect(btnX, btnY, 80, 25);
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(btnX, btnY, 80, 25);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Orbitron, Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('PURCHASE', btnX + 40, btnY + 16);
            } else {
                ctx.fillStyle = '#00ff00';
                ctx.font = 'bold 16px Orbitron, Arial, sans-serif';
                ctx.fillText('OWNED', x + 100, textY + 45); // Position relative to description end
                
                // Equipped button if applicable
                const btnX = x + width - 100;
                const btnY = y + height - 35;
                ctx.fillStyle = '#004400';
                ctx.fillRect(btnX, btnY, 80, 25);
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(btnX, btnY, 80, 25);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Orbitron, Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('EQUIPPED', btnX + 40, btnY + 16);
            }
        }
    }
    
    // Handle clicks on store items
    handleClick(x, y, canvas) {
        if (!this.storeOpen) return false;
        
        // Close button - updated position
        if (x >= canvas.width - 80 && x <= canvas.width - 20 && y >= 30 && y <= 65) {
            this.toggleStore();
            return true;
        }
        
        // Tab buttons - updated positions
        const tabs = ['avatars', 'skins', 'gems'];
        const tabWidth = 160;
        const startX = (canvas.width - (tabs.length * tabWidth)) / 2;
        
        for (let i = 0; i < tabs.length; i++) {
            const tabX = startX + (i * tabWidth);
            const tabY = 150;
            
            if (x >= tabX && x <= tabX + tabWidth - 10 && y >= tabY && y <= tabY + 40) {
                this.setTab(tabs[i]);
                return true;
            }
        }
        
        // Store items - updated positions
        const items = this.getCurrentTabItems();
        const startY = 220;
        const itemHeight = 140;
        const itemsPerRow = 2;
        const itemWidth = 320;
        const spacing = 40;
        
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const itemX = (canvas.width / 2) - (itemsPerRow * itemWidth + (itemsPerRow - 1) * spacing) / 2 + col * (itemWidth + spacing);
            const itemY = startY + row * (itemHeight + 30);
            
            if (x >= itemX && x <= itemX + itemWidth && y >= itemY && y <= itemY + itemHeight) {
                this.handleItemClick(item);
                return true;
            }
        }
        
        return false;
    }
    
    handleItemClick(item) {
        if (item.gems !== undefined) {
            // Gem package - trigger PayPal payment
            console.log(`Initiating PayPal payment for ${item.name} - $${item.price}`);
            
            if (this.paypalIntegration) {
                this.paypalIntegration.createPayPalPayment(item);
            } else {
                console.error('PayPal integration not available');
                alert('Payment system temporarily unavailable. Please try again later.');
            }
        } else if (!item.owned) {
            // Premium item purchase with gems
            const itemType = this.premiumAvatars.includes(item) ? 'avatar' : 'skin';
            if (this.purchaseWithGems(itemType, item.id)) {
                console.log(`Successfully purchased ${item.name}!`);
                // Could trigger particle effects, sound, etc.
            } else {
                console.log(`Cannot purchase ${item.name}. Need ${item.gemPrice - this.spaceGems} more Space Gems.`);
                this.showInsufficientGemsMessage(item);
            }
        }
    }
    
    // Show insufficient gems message
    showInsufficientGemsMessage(item) {
        const needed = item.gemPrice - this.spaceGems;
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
            border: 2px solid #ff6666;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            color: white;
            max-width: 400px;
            box-shadow: 0 0 20px #ff666688;
        `;
        
        messageBox.innerHTML = `
            <h2 style="margin: 0 0 15px 0; color: #ff6666;">Insufficient Space Gems 💎</h2>
            <p style="margin: 0 0 10px 0; font-size: 16px;">You need <strong>${needed} more gems</strong> to purchase ${item.name}</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #cccccc;">
                Current: ${this.spaceGems} gems | Required: ${item.gemPrice} gems
            </p>
            <div>
                <button onclick="this.closest('.overlay').remove(); window.premiumStore.setTab('gems');" 
                        style="background: #00ffff; color: black; border: none; 
                               padding: 10px 15px; border-radius: 5px; cursor: pointer;
                               font-weight: bold; margin: 5px;">
                    Buy Gems
                </button>
                <button onclick="this.closest('.overlay').remove()" 
                        style="background: #666666; color: white; border: none; 
                               padding: 10px 15px; border-radius: 5px; cursor: pointer;
                               margin: 5px;">
                    Cancel
                </button>
            </div>
        `;
        
        overlay.className = 'overlay';
        overlay.appendChild(messageBox);
        document.body.appendChild(overlay);
        
        // Make premium store accessible
        window.premiumStore = this;
    }
    
    // Set avatar manager reference for rendering previews
    setAvatarManager(avatarManager) {
        this.avatarManager = avatarManager;
        console.log('Avatar manager connected to Premium Store');
    }
    
    // Set PayPal integration
    setPayPalIntegration(paypalIntegration) {
        this.paypalIntegration = paypalIntegration;
        console.log('PayPal integration connected to Premium Store');
    }
}
