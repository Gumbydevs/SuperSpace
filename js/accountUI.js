/**
 * SuperSpace Account Login UI
 * Integrated into main menu for better user flow
 */

class AccountUI {
    constructor(cloudSync) {
        this.cloudSync = cloudSync;
        this.isVisible = false;
        this.addCloudSyncToMainMenu();
        this.createLoginOverlay();
        this.setupEventListeners();
    }
    
    addCloudSyncToMainMenu() {
        // Find the main menu and add cloud sync button after options
        const menu = document.getElementById('menu');
        const optionsBtn = document.getElementById('options-btn');
        
        if (menu && optionsBtn) {
            // Create cloud sync button
            this.cloudSyncButton = document.createElement('button');
            this.cloudSyncButton.id = 'cloud-sync-btn';
            this.cloudSyncButton.innerHTML = '☁️ Cloud Sync';
            this.cloudSyncButton.style.cssText = `
                background: linear-gradient(135deg, #4a90e2, #357abd);
                border: 2px solid #6bb6ff;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-family: 'Orbitron', Arial, sans-serif;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 8px 0;
                width: 200px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `;
            
            this.cloudSyncButton.addEventListener('mouseenter', () => {
                this.cloudSyncButton.style.transform = 'scale(1.05)';
                this.cloudSyncButton.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
            });
            
            this.cloudSyncButton.addEventListener('mouseleave', () => {
                this.cloudSyncButton.style.transform = 'scale(1)';
                this.cloudSyncButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            });
            
            // Insert after options button
            optionsBtn.parentNode.insertBefore(this.cloudSyncButton, optionsBtn.nextSibling);
            
            // Update button based on login status
            this.updateCloudSyncButton();
        }
    }
    
    createLoginOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'cloud-sync-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
            font-family: 'Orbitron', Arial, sans-serif;
        `;
        
        this.overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #2d1b69, #1a1a2e);
                border: 2px solid #4a90e2;
                border-radius: 12px;
                padding: 30px;
                max-width: 450px;
                width: 90%;
                color: white;
                text-align: center;
                position: relative;
            ">
                <button id="close-cloud-sync" style="
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
                
                <h2 style="margin: 0 0 20px 0; color: #4a90e2;">☁️ Cloud Sync</h2>
                <p style="margin: 0 0 25px 0; color: #ccc; font-size: 14px;">
                    Save your progress to the cloud and play on any device!
                </p>
                
                <form id="cloud-sync-form">
                    <div id="login-section">
                        <div style="margin-bottom: 15px;">
                            <input type="text" id="sync-username" name="username" placeholder="Username" autocomplete="username" style="
                                width: 100%;
                                padding: 12px;
                                border: 1px solid #4a90e2;
                                border-radius: 6px;
                                background: rgba(255,255,255,0.1);
                                color: white;
                                font-family: 'Orbitron', Arial, sans-serif;
                                box-sizing: border-box;
                                font-size: 14px;
                            ">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <input type="password" id="sync-password" name="password" placeholder="Password" autocomplete="current-password" style="
                                width: 100%;
                                padding: 12px;
                                border: 1px solid #4a90e2;
                                border-radius: 6px;
                                background: rgba(255,255,255,0.1);
                                color: white;
                                font-family: 'Orbitron', Arial, sans-serif;
                                box-sizing: border-box;
                                font-size: 14px;
                            ">
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                            <button type="button" id="sync-login-btn" style="
                                flex: 1;
                                padding: 12px;
                                background: linear-gradient(135deg, #4a90e2, #357abd);
                                border: none;
                                color: white;
                                border-radius: 6px;
                                cursor: pointer;
                                font-family: 'Orbitron', Arial, sans-serif;
                                font-weight: bold;
                                font-size: 14px;
                            ">Login</button>
                            
                            <button type="button" id="sync-register-btn" style="
                                flex: 1;
                                padding: 12px;
                                background: linear-gradient(135deg, #28a745, #1e7e34);
                                border: none;
                                color: white;
                                border-radius: 6px;
                                cursor: pointer;
                                font-family: 'Orbitron', Arial, sans-serif;
                                font-weight: bold;
                                font-size: 14px;
                            ">Register</button>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <button type="button" id="skip-cloud-sync" style="
                                width: 100%;
                                padding: 10px;
                                background: rgba(255,255,255,0.1);
                                border: 1px solid #666;
                                color: #ccc;
                                border-radius: 6px;
                                cursor: pointer;
                                font-family: 'Orbitron', Arial, sans-serif;
                                font-size: 12px;
                            ">Skip - Play Offline (No Cloud Save)</button>
                        </div>
                        
                        <div id="sync-message" style="
                            min-height: 20px;
                            font-size: 12px;
                            color: #ffaa00;
                            margin-bottom: 10px;
                        "></div>
                    </div>
                </form>
                
                <div id="logged-in-section" style="display: none;">
                    <div style="margin-bottom: 20px;">
                        <p style="margin: 5px 0; color: #4a90e2;">✅ Logged in as <span id="logged-sync-username"></span></p>
                        <p style="margin: 5px 0; font-size: 12px; color: #aaa;">
                            Status: <span id="sync-status-text">Connected</span>
                        </p>
                        <p style="margin: 5px 0; font-size: 10px; color: #888;">
                            Last Sync: <span id="last-sync-text">Now</span>
                        </p>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="sync-logout-btn" style="
                            flex: 1;
                            padding: 10px 20px;
                            background: linear-gradient(135deg, #dc3545, #c82333);
                            border: none;
                            color: white;
                            border-radius: 6px;
                            cursor: pointer;
                            font-family: 'Orbitron', Arial, sans-serif;
                            font-size: 12px;
                        ">Logout</button>
                        
                        <button id="close-after-login" style="
                            flex: 2;
                            padding: 10px 20px;
                            background: linear-gradient(135deg, #28a745, #1e7e34);
                            border: none;
                            color: white;
                            border-radius: 6px;
                            cursor: pointer;
                            font-family: 'Orbitron', Arial, sans-serif;
                            font-size: 12px;
                        ">Continue to Game</button>
                    </div>
                </div>
                
                <div style="
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #4a90e2;
                    font-size: 11px;
                    color: #888;
                ">
                    🔐 Your progress syncs across devices<br>
                    💾 Data is stored locally + cloud backup<br>
                    🎮 Play the same account anywhere!
                </div>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
    }
    
    setupEventListeners() {
        // Cloud sync button click
        this.cloudSyncButton.addEventListener('click', () => {
            this.showCloudSyncPanel();
        });
        
        // Close button
        document.getElementById('close-cloud-sync').addEventListener('click', () => {
            this.hideCloudSyncPanel();
        });
        
        // Overlay click (close when clicking outside)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hideCloudSyncPanel();
            }
        });
        
        // Login button
        document.getElementById('sync-login-btn').addEventListener('click', () => {
            this.handleLogin();
        });
        
        // Register button
        document.getElementById('sync-register-btn').addEventListener('click', () => {
            this.handleRegister();
        });
        
        // Skip cloud sync button
        document.getElementById('skip-cloud-sync').addEventListener('click', () => {
            this.hideCloudSyncPanel();
        });
        
        // Logout button
        document.getElementById('sync-logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Continue to game button
        document.getElementById('close-after-login').addEventListener('click', () => {
            this.hideCloudSyncPanel();
        });
        
        // Enter key in password field
        document.getElementById('sync-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
        
        // Form submission (prevent default)
        document.getElementById('cloud-sync-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Update UI when sync status changes
        setInterval(() => {
            this.updateSyncStatus();
        }, 5000);
    }
    
    showCloudSyncPanel() {
        this.isVisible = true;
        this.overlay.style.display = 'flex';
        this.updateLoginPanel();
        
        // Focus username field if not logged in
        if (!this.cloudSync.isLoggedIn) {
            setTimeout(() => {
                document.getElementById('sync-username').focus();
            }, 100);
        }
    }
    
    hideCloudSyncPanel() {
        this.isVisible = false;
        this.overlay.style.display = 'none';
        this.clearMessage();
    }
    
    updateCloudSyncButton() {
        const status = this.cloudSync.getSyncStatus();
        
        if (status.isLoggedIn) {
            this.cloudSyncButton.innerHTML = `☁️ ${status.username}`;
            this.cloudSyncButton.style.background = 'linear-gradient(135deg, #28a745, #1e7e34)';
        } else {
            this.cloudSyncButton.innerHTML = '☁️ Cloud Sync';
            this.cloudSyncButton.style.background = 'linear-gradient(135deg, #4a90e2, #357abd)';
        }
    }
    
    updateLoginPanel() {
        const status = this.cloudSync.getSyncStatus();
        
        if (status.isLoggedIn) {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('logged-in-section').style.display = 'block';
            document.getElementById('logged-sync-username').textContent = status.username;
        } else {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('logged-in-section').style.display = 'none';
        }
    }
    
    updateSyncStatus() {
        if (!this.cloudSync.isLoggedIn) return;
        
        const status = this.cloudSync.getSyncStatus();
        const syncStatusEl = document.getElementById('sync-status-text');
        const lastSyncEl = document.getElementById('last-sync-text');
        
        if (syncStatusEl) {
            if (status.syncInProgress) {
                syncStatusEl.textContent = 'Syncing...';
                syncStatusEl.style.color = '#ffaa00';
            } else {
                syncStatusEl.textContent = 'Connected';
                syncStatusEl.style.color = '#28a745';
            }
        }
        
        if (lastSyncEl && status.lastSyncTime) {
            const timeDiff = Date.now() - status.lastSyncTime;
            const minutes = Math.floor(timeDiff / 60000);
            
            if (minutes < 1) {
                lastSyncEl.textContent = 'Now';
            } else if (minutes < 60) {
                lastSyncEl.textContent = `${minutes}m ago`;
            } else {
                lastSyncEl.textContent = `${Math.floor(minutes/60)}h ago`;
            }
        }
    }
    
    async handleLogin() {
        const username = document.getElementById('sync-username').value.trim();
        const password = document.getElementById('sync-password').value;
        
        if (!username || !password) {
            this.showMessage('Please enter username and password', 'error');
            return;
        }
        
        this.showMessage('Logging in...', 'info');
        
        const result = await this.cloudSync.login(username, password);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            this.updateCloudSyncButton();
            this.updateLoginPanel();
            
            // Clear password field
            document.getElementById('sync-password').value = '';
            
            // Show continue option
            setTimeout(() => {
                this.showMessage('Ready to play! Click "Continue to Game" or close this window.', 'success');
            }, 2000);
        } else {
            this.showMessage(result.message, 'error');
        }
    }
    
    async handleRegister() {
        const username = document.getElementById('sync-username').value.trim();
        const password = document.getElementById('sync-password').value;
        
        if (!username || !password) {
            this.showMessage('Please enter username and password', 'error');
            return;
        }
        
        if (username.length < 3) {
            this.showMessage('Username must be at least 3 characters', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        this.showMessage('Creating account...', 'info');
        
        const result = await this.cloudSync.createAccount(username, password);
        
        if (result.success) {
            this.showMessage(result.message + ' You can now login!', 'success');
            // Clear fields
            document.getElementById('sync-username').value = '';
            document.getElementById('sync-password').value = '';
        } else {
            this.showMessage(result.message, 'error');
        }
    }
    
    handleLogout() {
        this.cloudSync.logout();
        this.updateCloudSyncButton();
        this.updateLoginPanel();
        this.showMessage('Logged out successfully', 'success');
        
        // Clear form fields
        document.getElementById('sync-username').value = '';
        document.getElementById('sync-password').value = '';
        
        // Close panel after 1 second
        setTimeout(() => {
            this.hideCloudSyncPanel();
        }, 1000);
    }
    
    showMessage(message, type) {
        const messageEl = document.getElementById('sync-message');
        messageEl.textContent = message;
        
        switch (type) {
            case 'success':
                messageEl.style.color = '#28a745';
                break;
            case 'error':
                messageEl.style.color = '#dc3545';
                break;
            case 'info':
                messageEl.style.color = '#4a90e2';
                break;
            default:
                messageEl.style.color = '#ffaa00';
        }
    }
    
    clearMessage() {
        const messageEl = document.getElementById('sync-message');
        if (messageEl) {
            messageEl.textContent = '';
        }
    }
}

// Export for use in game
window.AccountUI = AccountUI;