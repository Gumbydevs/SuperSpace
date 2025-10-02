// Reset configuration file
// Edit the flags below to control what is cleared/preserved during a version-driven reset.
// Authoritative version for resets. Edit this value to trigger a version-driven reset.
export const GAME_VERSION = '2025.10.02.003';
export const ResetConfig = {
  // Human-readable release notes keyed by version string
  versionNotes: {
    // Use the same version format as GAME_VERSION above
    [GAME_VERSION]: [
        'Players have received a special pre-release avatar and ship skin to show our appreciation for your support!',
        'Restored original ship rotation physics! No more rotational inertia. Original feel restored: smoother, more responsive flight feel.',
        'Added Impact Deflector system: Press Left Ctrl or TAB for a brief energy shield that deflects asteroids without damage!',
        'Tweaks to daily and weekly challenges: improved claim flow and fixed repeated weekly notifications.',
        'Improved performance and stability.'
    ]
  },

  // Flags to control which areas are reset. true = reset/clear, false = preserve
  flags: {
    clearDisclaimer: true,
  // Clear the disclaimer acceptance flag to show it again
    resetCredits: true,
    resetShips: true,
    resetWeapons: true,
    resetUpgrades: true,
    resetChallenges: true,
    resetAchievements: true,
    resetPlayerStats: true, // score, wins, losses
    resetGems: true,
    resetTutorialCompleted: true, // Reset tutorial completion status
    

    // Preservation toggles
    preservePremiumPurchases: false,
    preservePlayerName: true,
    preserveSettings: false, // sound/music and similar preferences
    preservePurchasedUpgrades: false
  },

  // Starting amount to give players after a reset (used when resetGems=true).
  // Default starting gems given to players after a reset. Set to 5 per request.
  startingGems: 5,

  // Text used for the progress-reset modal 'continue' button. Customize this
  // to change the wording shown to players after a reset (examples: "Awesome!",
  // "Let's play space!", "Great job Gumby").
  continueButtonText: 'Awesome!',

  // Explicit keys to preserve during clear (merged with heuristic regex preserve)
  explicitPreserveKeys: [
    'playerName',
    'player_name',
    'name',
    'hasSetName',
    'has_set_name',
    'gameVersion',
    'game_version',
    'soundEnabled',
    'musicEnabled',
    'selectedAvatar',
    'selected_avatar',
    'selectedShipSkin',
    'selected_ship_skin',
    'shipSkinEffectsEnabled',
    'ownedSkins',
    'ownedAvatars',
    'purchasedSkins',
    'purchasedAvatars',
    'ownedShipSkins',
    'owned_items',
    'ownedItems',
    'purchasedItems',
    'premiumPurchases',
    'premium_purchases',
  'credits',
  'playerCredits',
    'premiumPurchasesHistory',
    'premium_purchases_history',
    'spaceGems',
    'space_gems',
    'gems',
    'gem_balance',
    'purchases',
    'shop_owned',
    'shop_purchased',
    'entitlements',
    'purchase_history',
    'purchaseHistory',
    'paypal_receipt',
    'paypal_purchase',
    'premiumStore',
    'premium_store'
  ]
};

// Ensure GAME_VERSION is available on the ResetConfig object for backwards compatibility
try {
  ResetConfig.GAME_VERSION = typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : ResetConfig.GAME_VERSION;
} catch (e) {
  // ignore
}

export default ResetConfig;
