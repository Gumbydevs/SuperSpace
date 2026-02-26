// PayPal Integration for SuperSpace Premium Store
// Handles real money purchases for Space Gems

export class PayPalIntegration {
  constructor(premiumStore) {
    this.premiumStore = premiumStore;
    this.paypalEmail = 'gumbydev@icloud.com';
    this.currency = 'USD';
    this.isProduction = true; // Set to true for live payments

    // PayPal return URLs - update these for your domain
    this.returnUrl = window.location.origin + '/premium-success.html';
    this.cancelUrl = window.location.origin + '/premium-cancel.html';

    console.log('PayPal Integration initialized for SuperSpace');
    console.log('Production mode:', this.isProduction);
  }

  // Create PayPal payment for gem package or individual item
  createPayPalPayment(item) {
    console.log('Creating PayPal payment for:', item);

    const paypalUrl = this.isProduction
      ? 'https://www.paypal.com/cgi-bin/webscr'
      : 'https://www.sandbox.paypal.com/cgi-bin/webscr';

    // Determine if this is a gem package or individual item
    const isGemPackage = item.gems !== undefined;
    const itemName = isGemPackage 
      ? `SuperSpace ${item.name}` 
      : `SuperSpace ${item.name} (${item.type})`;

    // Create form data for PayPal
    const formData = {
      cmd: '_xclick',
      business: this.paypalEmail,
      item_name: itemName,
      item_number: item.id,
      amount: item.price.toFixed(2),
      currency_code: this.currency,
      return: this.returnUrl,
      cancel_return: this.cancelUrl,
      notify_url: window.location.origin + '/paypal-ipn.php',
      custom: JSON.stringify({
        gameId: 'superspace',
        packageId: item.id,
        itemType: isGemPackage ? 'gems' : item.type,
        gems: isGemPackage ? (item.gems + (item.bonus || 0)) : 0,
        playerId: this.generatePlayerId(),
      }),
    };

    // Create and submit form
    this.submitPayPalForm(paypalUrl, formData);
  }

  // Submit PayPal payment form
  submitPayPalForm(action, formData) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    form.target = '_blank'; // Open in new tab

    // Add form fields
    Object.keys(formData).forEach((key) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = formData[key];
      form.appendChild(input);
    });

    // Submit form
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    console.log('PayPal payment form submitted:', formData);
  }

  // Generate unique player ID for tracking
  generatePlayerId() {
    let playerId = localStorage.getItem('superspacePlayerId');
    if (!playerId) {
      playerId =
        'ss_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('superspacePlayerId', playerId);
    }
    return playerId;
  }

  // Handle successful payment (call this from success page)
  handlePaymentSuccess(packageId, transactionId, customData = null) {
    // Parse custom data if provided
    let itemType = 'gems';
    if (customData) {
      try {
        const parsedCustom = JSON.parse(customData);
        itemType = parsedCustom.itemType || 'gems';
      } catch (e) {
        console.warn('Could not parse custom data:', e);
      }
    }

    if (itemType === 'gems') {
      // Handle gem package purchase
      const gemPackage = this.premiumStore.gemPackages.find(
        (p) => p.id === packageId,
      );
      if (gemPackage) {
        const totalGems = gemPackage.gems + (gemPackage.bonus || 0);
        this.premiumStore.addSpaceGems(totalGems, packageId);

        // Record transaction
        this.recordTransaction(packageId, transactionId, 'completed');

        console.log(`Payment successful! Added ${totalGems} Space Gems`);

        // Show success message
        this.showPaymentSuccess(gemPackage, totalGems);
      }
    } else {
      // Handle individual item purchase (avatar or skin)
      console.log(`Payment successful! Granting ${itemType}: ${packageId}`);
      
      // Grant the item directly
      if (itemType === 'avatar') {
        this.premiumStore.grantAvatar(packageId);
      } else if (itemType === 'skin') {
        this.premiumStore.grantSkin(packageId);
      }

      // Record transaction
      this.recordTransaction(packageId, transactionId, 'completed');

      // Show success message for item
      this.showItemPaymentSuccess(packageId, itemType);
    }
  }

  // Handle payment cancellation
  handlePaymentCancel() {
    console.log('PayPal payment was cancelled');
    this.showPaymentMessage(
      'Payment Cancelled',
      'Your payment was cancelled. No charges were made.',
      '#ffaa00',
    );
  }

  // Record transaction for tracking
  recordTransaction(packageId, transactionId, status) {
    const transactions = JSON.parse(
      localStorage.getItem('superspaceTransactions') || '[]',
    );
    transactions.push({
      packageId,
      transactionId,
      status,
      timestamp: Date.now(),
      playerId: this.generatePlayerId(),
    });
    localStorage.setItem(
      'superspaceTransactions',
      JSON.stringify(transactions),
    );
  }

  // Show payment success message
  showPaymentSuccess(gemPackage, totalGems) {
    this.showPaymentMessage(
      'Purchase Successful! 🎉',
      `You received ${totalGems} Space Gems from ${gemPackage.name}!`,
      '#00ff00',
    );
  }

  // Show item payment success message
  showItemPaymentSuccess(itemId, itemType) {
    let itemName = itemId;
    let emoji = '🎉';
    
    // Find the item name
    if (itemType === 'avatar') {
      const avatar = this.premiumStore.premiumAvatars.find(a => a.id === itemId);
      if (avatar) {
        itemName = avatar.name;
        emoji = '👨‍🚀';
      }
    } else if (itemType === 'skin') {
      const skin = this.premiumStore.shipSkins.find(s => s.id === itemId);
      if (skin) {
        itemName = skin.name;
        emoji = '🚀';
      }
    }

    this.showPaymentMessage(
      `Purchase Successful! ${emoji}`,
      `You unlocked ${itemName}!`,
      '#00ff00',
    );
  }

  // Show payment message overlay
  showPaymentMessage(title, message, color = '#ffffff') {
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
            z-index: 10000;
        `;

    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
            background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
            border: 2px solid ${color};
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            color: white;
            max-width: 400px;
            box-shadow: 0 0 20px ${color}88;
        `;

    messageBox.innerHTML = `
            <h2 style="margin: 0 0 15px 0; color: ${color};">${title}</h2>
            <p style="margin: 0 0 20px 0; font-size: 16px;">${message}</p>
            <button onclick="this.closest('.overlay').remove()" 
                    style="background: ${color}; color: black; border: none; 
                           padding: 10px 20px; border-radius: 5px; cursor: pointer;
                           font-weight: bold;">
                Continue
            </button>
        `;

    overlay.className = 'overlay';
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 5000);
  }

  // Test payment (for development)
  testPayment(gemPackage) {
    console.log('TEST PAYMENT:', gemPackage);

    // Simulate payment delay
    setTimeout(() => {
      const totalGems = gemPackage.gems + (gemPackage.bonus || 0);
      this.premiumStore.addSpaceGems(totalGems, gemPackage.id);
      this.showPaymentSuccess(gemPackage, totalGems);
    }, 2000);

    this.showPaymentMessage(
      'Test Payment Processing...',
      'This is a test payment. Gems will be added in 2 seconds.',
      '#ffaa00',
    );
  }
}
