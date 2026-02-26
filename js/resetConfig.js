// Reset configuration file
// Edit the flags below to control what is cleared/preserved during a version-driven reset.
// Authoritative version for resets. Edit this value to trigger a version-driven reset.
import NotesModule, { versionNotes as RN_versionNotes, versionLinks as RN_versionLinks, versionLinkLabels as RN_versionLinkLabels } from './releaseNotes.js';

export const GAME_VERSION = '2026.02.26.001';
export const ResetConfig = {
  // Human-readable release notes keyed by version string (imported from js/releaseNotes.js)
  versionNotes: RN_versionNotes,
  versionLinks: RN_versionLinks,
  versionLinkLabels: RN_versionLinkLabels,
  // Threshold version (inclusive): only players with stored versions older
  // than this will receive a destructive reset when GAME_VERSION is bumped.
  // Players with storedVersion >= resetThresholdVersion will have their
  // stored version advanced without destructive resets. Update as needed.
  resetThresholdVersion: '2025.10.02.007',

  // Flags to control which areas are reset. true = reset/clear, false = preserve
  flags: {
    clearDisclaimer: true, // Clear the disclaimer pop up flag to show it again
    resetCredits: true, // In-game currency
    resetShips: true, // Owned ships and ship skins
    resetWeapons: true, // Owned weapons
    resetUpgrades: true, // Owned upgrades
    resetChallenges: true, // Daily and Weekly Challenges
    resetAchievements: true, // PLayer achievements
    resetPlayerStats: true, // score, wins, losses
    resetGems: true, // Premium currency
    resetTutorialCompleted: true, // Reset tutorial completion status
    

    // Preservation toggles
    preservePremiumPurchases: false, // Permanently owned items from the premium store
    preservePlayerName: true, // Player name
    preserveSettings: false, // sound/music and similar preferences
    preservePurchasedUpgrades: false // Upgrades purchased with credits
  },

  // Starting amount to give players after a reset (used when resetGems=true).
  // Default starting gems given to players after a reset.
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
