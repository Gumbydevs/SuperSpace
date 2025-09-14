/**
 * SuperSpace Account Login UI
 * Non-intrusive login interface that overlays the game
 */

class AccountUI {
    constructor(cloudSync) {
        this.cloudSync = cloudSync;
        this.isVisible = false;
        this.createLoginUI();
        this.setupEventListeners();
    }
    
    createLoginUI() {
        // Create account button (small, top-right corner)
        this.accountButton = document.createElement('button');
        this.accountButton.id = 'account-button';
        this.accountButton.innerHTML = '👤 Account';
        this.accountButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #4a90e2, #357abd);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            z-index: 1500;
            font-family: 'Orbitron', Arial, sans-serif;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        
        this.accountButton.addEventListener('mouseenter', () => {
            this.accountButton.style.transform = 'scale(1.05)';
        });
        
        this.accountButton.addEventListener('mouseleave', () => {
            this.accountButton.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(this.accountButton);
        
        // Create login overlay (hidden by default)
        this.createLoginOverlay();
        
        // Update button based on login status
        this.updateAccountButton();
    }
    
    createLoginOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'account-overlay';
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
                max-width: 400px;
                width: 90%;
                color: white;
                text-align: center;
                position: relative;
            ">
                <button id="close-account" style="
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
                
                <h2 style="margin: 0 0 20px 0; color: #4a90e2;">SuperSpace Account</h2>
                
                <div id="login-form">
                    <div style="margin-bottom: 15px;">
                        <input type="text" id="username" placeholder="Username" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #4a90e2;
                            border-radius: 6px;
                            background: rgba(255,255,255,0.1);
                            color: white;
                            font-family: 'Orbitron', Arial, sans-serif;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <input type="password" id="password" placeholder="Password" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #4a90e2;
                            border-radius: 6px;
                            background: rgba(255,255,255,0.1);
                            color: white;
                            font-family: 'Orbitron', Arial, sans-serif;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <button id="login-btn" style="
                            flex: 1;
                            padding: 12px;
                            background: linear-gradient(135deg, #4a90e2, #357abd);
                            border: none;
                            color: white;
                            border-radius: 6px;
                            cursor: pointer;
                            font-family: 'Orbitron', Arial, sans-serif;
                            font-weight: bold;
                        ">Login</button>
                        
                        <button id="register-btn" style="
                            flex: 1;
                            padding: 12px;
                            background: linear-gradient(135deg, #28a745, #1e7e34);
                            border: none;
                            color: white;
                            border-radius: 6px;
                            cursor: pointer;
                            font-family: 'Orbitron', Arial, sans-serif;
                            font-weight: bold;
                        ">Register</button>
                    </div>
                    
                    <div id="account-message" style="
                        min-height: 20px;
                        font-size: 12px;
                        color: #ffaa00;
                        margin-bottom: 10px;
                    "></div>
                </div>
                
                <div id="logged-in-panel" style="display: none;">
                    <div style="margin-bottom: 20px;">
                        <p style="margin: 5px 0;">Welcome, <span id="logged-username"></span>!</p>
                        <p style="margin: 5px 0; font-size: 12px; color: #aaa;">
                            Sync Status: <span id="sync-status">Connected</span>
                        </p>
                        <p style="margin: 5px 0; font-size: 10px; color: #888;">
                            Last Sync: <span id="last-sync">Now</span>
                        </p>
                    </div>
                    
                    <button id="logout-btn" style="
                        padding: 10px 20px;
                        background: linear-gradient(135deg, #dc3545, #c82333);
                        border: none;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: 'Orbitron', Arial, sans-serif;
                    ">Logout</button>
                </div>
                
                <div style="
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #4a90e2;
                    font-size: 11px;
                    color: #888;
                ">
                    🔐 Your game progress syncs across devices<br>
                    💾 All data stays in your browser + cloud backup
                </div>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
    }
    
    setupEventListeners() {
        // Account button click
        this.accountButton.addEventListener('click', () => {
            this.toggleAccountPanel();
        });
        
        // Close button
        document.getElementById('close-account').addEventListener('click', () => {
            this.hideAccountPanel();
        });
        
        // Overlay click (close when clicking outside)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hideAccountPanel();
            }
        });
        
        // Login button
        document.getElementById('login-btn').addEventListener('click', () => {
            this.handleLogin();
        });
        
        // Register button
        document.getElementById('register-btn').addEventListener('click', () => {
            this.handleRegister();
        });
        
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Enter key in password field
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
        
        // Update UI when sync status changes
        setInterval(() => {
            this.updateSyncStatus();
        }, 5000);
    }
    
    toggleAccountPanel() {
        if (this.isVisible) {
            this.hideAccountPanel();
        } else {
            this.showAccountPanel();
        }
    }
    
    showAccountPanel() {
        this.isVisible = true;
        this.overlay.style.display = 'flex';
        this.updateLoginPanel();
        
        // Focus username field if not logged in
        if (!this.cloudSync.isLoggedIn) {
            setTimeout(() => {
                document.getElementById('username').focus();
            }, 100);
        }
    }
    
    hideAccountPanel() {
        this.isVisible = false;
        this.overlay.style.display = 'none';
        this.clearMessage();
    }
    
    updateAccountButton() {
        const status = this.cloudSync.getSyncStatus();
        
        if (status.isLoggedIn) {
            this.accountButton.innerHTML = `👤 ${status.username}`;
            this.accountButton.style.background = 'linear-gradient(135deg, #28a745, #1e7e34)';
        } else {
            this.accountButton.innerHTML = '👤 Account';
            this.accountButton.style.background = 'linear-gradient(135deg, #4a90e2, #357abd)';
        }
    }
    
    updateLoginPanel() {
        const status = this.cloudSync.getSyncStatus();
        
        if (status.isLoggedIn) {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('logged-in-panel').style.display = 'block';
            document.getElementById('logged-username').textContent = status.username;
        } else {
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('logged-in-panel').style.display = 'none';
        }
    }
    
    updateSyncStatus() {
        if (!this.cloudSync.isLoggedIn) return;
        
        const status = this.cloudSync.getSyncStatus();
        const syncStatusEl = document.getElementById('sync-status');
        const lastSyncEl = document.getElementById('last-sync');
        
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
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showMessage('Please enter username and password', 'error');
            return;
        }
        
        this.showMessage('Logging in...', 'info');
        
        const result = await this.cloudSync.login(username, password);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            this.updateAccountButton();
            this.updateLoginPanel();
            
            // Clear password field
            document.getElementById('password').value = '';
            
            // Close panel after 2 seconds
            setTimeout(() => {
                this.hideAccountPanel();
            }, 2000);
        } else {
            this.showMessage(result.message, 'error');
        }
    }
    
    async handleRegister() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
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
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        } else {
            this.showMessage(result.message, 'error');
        }
    }
    
    handleLogout() {
        this.cloudSync.logout();
        this.updateAccountButton();
        this.updateLoginPanel();
        this.showMessage('Logged out successfully', 'success');
        
        // Close panel after 1 second
        setTimeout(() => {
            this.hideAccountPanel();
        }, 1000);
    }
    
    showMessage(message, type) {
        const messageEl = document.getElementById('account-message');
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
        const messageEl = document.getElementById('account-message');
        if (messageEl) {
            messageEl.textContent = '';
        }
    }
}

// Export for use in game
window.AccountUI = AccountUI;