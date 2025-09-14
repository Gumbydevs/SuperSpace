# SuperSpace Progress Reset System

## Overview

The game now includes an automatic progress reset system that triggers when you release major updates. This ensures all players start fresh when significant changes are made to the game.

## How It Works

1. **Version Tracking**: The game stores a version number in `localStorage`
2. **Automatic Detection**: When a player loads the game, it compares their stored version with the current game version
3. **Smart Reset**: If versions don't match, it automatically resets progress while preserving important data like player name and avatar
4. **User Notification**: Shows a prominent modal explaining the reset

## How to Use

### To Trigger a Reset for All Players:

1. Open `js/multiplayer.js`
2. Find the line: `this.GAME_VERSION = "2025.09.07.001";`
3. Change the version number (format: YYYY.MM.DD.increment)
4. Examples:
   - `"2025.09.08.001"` - Next day, first update
   - `"2025.09.07.002"` - Same day, second update
   - `"2025.10.01.001"` - October 1st, first update

### What Gets Reset:

- Player credits
- Ship ownership
- Weapon ownership
- Upgrade levels
- Game statistics
- Shop purchases
- All game progress

### What Gets Preserved:

- Player name
- Selected avatar
- Sound/music settings
- Basic preferences

## Testing

You can test the reset system using the browser console:

```javascript
// Force a reset for testing
window.game.multiplayer.forceProgressReset();
```

## Version Format

Use a clear version format like `YYYY.MM.DD.increment`:

- Year.Month.Day.UpdateNumber
- Easy to understand and compare
- Shows when the update was released

## Best Practices

- Only increment version for major updates that require progress reset
- Test the reset system before releasing updates
- Consider timing resets when you have significant new content or balance changes
- Update the version comment to explain what changed

## Example Scenarios

- **Major ship rebalancing**: Reset so everyone starts with equal footing
- **New progression system**: Reset to ensure compatibility
- **Economy overhaul**: Reset credits and purchases
- **Bug fixes that affected progress**: Reset to fix corrupted saves
