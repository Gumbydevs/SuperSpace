// Console Test Script for Premium Purchase System
// Copy and paste this into the browser console to test the purchase flow

console.log("=== TESTING PURCHASE SYSTEM ===");

// Step 0: Force refresh avatars first
console.log("Step 0: Force refreshing avatars...");
window.refreshAvatars();

// Step 0.5: Check HTML structure
console.log("Step 0.5: Checking HTML structure...");
const allAvatarOptions = document.querySelectorAll('.avatar-option');
const disabledOptions = document.querySelectorAll('.avatar-option.disabled');
console.log('Total avatar options:', allAvatarOptions.length);
console.log('Disabled avatar options:', disabledOptions.length);
console.log('First 5 disabled options:', Array.from(disabledOptions).slice(0, 5).map(el => ({
    dataset: el.dataset.avatar,
    text: el.querySelector('.avatar-name')?.textContent,
    disabled: el.classList.contains('disabled')
})));

// Step 1: Grant admin gems
console.log("Step 1: Granting 1000 admin gems...");
window.game.adminSystem.grantSpaceGems(1000);

// Step 2: Check current state
console.log("Step 2: Current state before purchase:");
window.debugPurchaseState();

// Step 3: Attempt to purchase Golden Astronaut
console.log("Step 3: Attempting to purchase Golden Astronaut...");
const success = window.game.premiumStore.purchaseWithGems('avatar', 'astronaut_gold');
console.log("Purchase result:", success);

// Step 4: Check state after purchase
console.log("Step 4: State after purchase:");
window.debugPurchaseState();

// Step 5: Check avatar manager
console.log("Step 5: Checking avatar ownership:");
console.log("Avatar manager owns astronaut_gold:", window.game.avatarManager.ownsAvatar('astronaut_gold'));
console.log("Available avatars:", window.game.avatarManager.getAllAvailableAvatars());

console.log("=== TEST COMPLETE ===");
