/**
 * SuperSpace Account Login UI
 * Integrated into main menu for better user flow
 */

class AccountUI {
  constructor(cloudSync) {
    this.cloudSync = cloudSync;
    this.isVisible = false;
    this.isRegistering = false;
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
      this.cloudSyncButton.innerHTML = 'CLOUD SYNC';
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
                width: 250px;
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

      // Insert before options button (so cloud sync appears first)
      optionsBtn.parentNode.insertBefore(this.cloudSyncButton, optionsBtn);

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
                        
                        <div style="margin-bottom: 15px;">
                            <button type="button" id="forgot-password-btn" style="
                                width: 100%;
                                padding: 8px;
                                background: none;
                                border: 1px solid #666;
                                color: #aaa;
                                border-radius: 6px;
                                cursor: pointer;
                                font-family: 'Orbitron', Arial, sans-serif;
                                font-size: 11px;
                            ">Forgot Password?</button>
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
    document
      .getElementById('close-cloud-sync')
      .addEventListener('click', () => {
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
    document
      .getElementById('sync-register-btn')
      .addEventListener('click', () => {
        this.handleRegister();
      });

    // Forgot password button
    document
      .getElementById('forgot-password-btn')
      .addEventListener('click', () => {
        this.showForgotPasswordForm();
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
    document
      .getElementById('close-after-login')
      .addEventListener('click', () => {
        this.hideCloudSyncPanel();
      });

    // Enter key in password field
    document
      .getElementById('sync-password')
      .addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleLogin();
        }
      });

    // Form submission (prevent default)
    document
      .getElementById('cloud-sync-form')
      .addEventListener('submit', (e) => {
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
      this.cloudSyncButton.innerHTML = `${status.username}`;
      this.cloudSyncButton.style.background =
        'linear-gradient(135deg, #28a745, #1e7e34)';
    } else {
      this.cloudSyncButton.innerHTML = 'CLOUD SYNC';
      this.cloudSyncButton.style.background =
        'linear-gradient(135deg, #4a90e2, #357abd)';
    }
  }

  updateLoginPanel() {
    const status = this.cloudSync.getSyncStatus();

    if (status.isLoggedIn) {
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('logged-in-section').style.display = 'block';
      document.getElementById('logged-sync-username').textContent =
        status.username;
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
        lastSyncEl.textContent = `${Math.floor(minutes / 60)}h ago`;
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
        this.showMessage(
          'Ready to play! Click "Continue to Game" or close this window.',
          'success',
        );
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
      this.showMessage(result.message + ' Save your recovery key!', 'success');
      // Show recovery key to user
      this.showRecoveryKey(result.recoveryKey, username);
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

  showRecoveryKey(recoveryKey, username) {
    // Create a modal/overlay to show the recovery key
    const keyOverlay = document.createElement('div');
    keyOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

    keyOverlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid #4a90e2;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                color: white;
                font-family: 'Orbitron', Arial, sans-serif;
                text-align: center;
            ">
                <h3 style="color: #4a90e2; margin: 0 0 20px 0;">🚀 Account Created Successfully!</h3>
                <p style="margin: 0 0 15px 0; color: #ccc;">
                    Account: <strong>${username}</strong>
                </p>
                <p style="margin: 0 0 20px 0; color: #ff6b6b; font-size: 14px; font-weight: bold;">
                    ⚠️ IMPORTANT: Save your recovery key!
                </p>
                <p style="margin: 0 0 15px 0; color: #ffaa00; font-size: 12px;">
                    You'll need this to reset your password if you forget it:
                </p>
                <div style="
                    background: rgba(255,255,255,0.1);
                    border: 2px solid #4a90e2;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 0 0 20px 0;
                    font-size: 16px;
                    font-weight: bold;
                    color: #4a90e2;
                    letter-spacing: 2px;
                " id="recovery-key-text">${recoveryKey}</div>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="copy-recovery-key" style="
                        flex: 1;
                        padding: 10px;
                        background: linear-gradient(135deg, #28a745, #1e7e34);
                        border: none;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: 'Orbitron', Arial, sans-serif;
                        font-size: 12px;
                    ">Copy Key</button>
                    <button id="close-recovery-key" style="
                        flex: 1;
                        padding: 10px;
                        background: linear-gradient(135deg, #4a90e2, #357abd);
                        border: none;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: 'Orbitron', Arial, sans-serif;
                        font-size: 12px;
                    ">I Saved It</button>
                </div>
                <p style="margin: 0; font-size: 10px; color: #888;">
                    Write this down, take a screenshot, or save it in a password manager
                </p>
            </div>
        `;

    document.body.appendChild(keyOverlay);

    // Copy key functionality
    document
      .getElementById('copy-recovery-key')
      .addEventListener('click', () => {
        navigator.clipboard
          .writeText(recoveryKey)
          .then(() => {
            document.getElementById('copy-recovery-key').textContent =
              'Copied!';
            setTimeout(() => {
              document.getElementById('copy-recovery-key').textContent =
                'Copy Key';
            }, 2000);
          })
          .catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = recoveryKey;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            document.getElementById('copy-recovery-key').textContent =
              'Copied!';
          });
      });

    // Close overlay
    document
      .getElementById('close-recovery-key')
      .addEventListener('click', () => {
        document.body.removeChild(keyOverlay);
      });

    // Prevent closing by clicking background (force user to acknowledge)
  }

  showForgotPasswordForm() {
    const username = document.getElementById('sync-username').value.trim();

    if (!username) {
      this.showMessage('Please enter your username first', 'error');
      return;
    }

    this.showPasswordResetModal(username);
  }

  showPasswordResetModal(username) {
    // Create a modal/overlay for password reset
    const resetOverlay = document.createElement('div');
    resetOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

    resetOverlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid #4a90e2;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                color: white;
                font-family: 'Orbitron', Arial, sans-serif;
                text-align: center;
            ">
                <h3 style="color: #4a90e2; margin: 0 0 20px 0;">🔑 Reset Password</h3>
                <p style="margin: 0 0 15px 0; color: #ccc;">
                    Account: <strong>${username}</strong>
                </p>
                <p style="margin: 0 0 20px 0; color: #ffaa00; font-size: 12px;">
                    Enter your recovery key (shown when you created your account):
                </p>
                <input type="text" id="reset-recovery-key" placeholder="STAR-MOON-MARS-COMET-1234" style="
                    width: 100%;
                    padding: 12px;
                    margin: 0 0 15px 0;
                    background: rgba(255,255,255,0.1);
                    border: 2px solid #4a90e2;
                    border-radius: 6px;
                    color: white;
                    font-family: 'Orbitron', Arial, sans-serif;
                    font-size: 14px;
                    text-align: center;
                    letter-spacing: 1px;
                    box-sizing: border-box;
                ">
                <p style="margin: 0 0 10px 0; color: #ffaa00; font-size: 12px;">
                    Enter your new password:
                </p>
                <input type="password" id="reset-new-password" placeholder="New password (6+ characters)" style="
                    width: 100%;
                    padding: 12px;
                    margin: 0 0 20px 0;
                    background: rgba(255,255,255,0.1);
                    border: 2px solid #4a90e2;
                    border-radius: 6px;
                    color: white;
                    font-family: 'Orbitron', Arial, sans-serif;
                    font-size: 14px;
                    box-sizing: border-box;
                ">
                <div style="display: flex; gap: 10px;">
                    <button id="confirm-password-reset" style="
                        flex: 1;
                        padding: 12px;
                        background: linear-gradient(135deg, #28a745, #1e7e34);
                        border: none;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: 'Orbitron', Arial, sans-serif;
                        font-size: 14px;
                    ">Reset Password</button>
                    <button id="cancel-password-reset" style="
                        flex: 1;
                        padding: 12px;
                        background: linear-gradient(135deg, #dc3545, #bd2130);
                        border: none;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: 'Orbitron', Arial, sans-serif;
                        font-size: 14px;
                    ">Cancel</button>
                </div>
            </div>
        `;

    document.body.appendChild(resetOverlay);

    // Focus on recovery key input
    setTimeout(() => {
      document.getElementById('reset-recovery-key').focus();
    }, 100);

    // Handle form submission
    const confirmBtn = resetOverlay.querySelector('#confirm-password-reset');
    const cancelBtn = resetOverlay.querySelector('#cancel-password-reset');
    const recoveryKeyInput = resetOverlay.querySelector('#reset-recovery-key');
    const passwordInput = resetOverlay.querySelector('#reset-new-password');

    const handleSubmit = () => {
      const recoveryKey = recoveryKeyInput.value.trim();
      const newPassword = passwordInput.value;

      if (!recoveryKey) {
        this.showMessage('Please enter your recovery key', 'error');
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        this.showMessage('New password must be at least 6 characters', 'error');
        return;
      }

      document.body.removeChild(resetOverlay);
      this.handlePasswordResetWithKey(username, recoveryKey, newPassword);
    };

    const handleCancel = () => {
      document.body.removeChild(resetOverlay);
    };

    confirmBtn.addEventListener('click', handleSubmit);
    cancelBtn.addEventListener('click', handleCancel);

    // Allow Enter key to submit
    [recoveryKeyInput, passwordInput].forEach((input) => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleSubmit();
        }
      });
    });

    // Allow Escape key to cancel
    resetOverlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    });
  }

  async handlePasswordResetWithKey(username, recoveryKey, newPassword) {
    this.showMessage('Resetting password...', 'info');

    const result = await this.cloudSync.resetPasswordWithRecoveryKey(
      username,
      recoveryKey,
      newPassword,
    );

    if (result.success) {
      this.showMessage(
        'Password reset successful! You can now login with your new password.',
        'success',
      );
      document.getElementById('sync-password').value = '';
    } else {
      this.showMessage(result.message || 'Failed to reset password', 'error');
    }
  }
}

// Export for use in game
window.AccountUI = AccountUI;
