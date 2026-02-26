// Centralized release notes data to make it easy to add new versions/notes.
export const versionNotes = {
  // Server back online announcement
  '2025.11.12.001': [
    '<span style="color: #00ff88; font-weight: bold;">🎉 Welcome back! The server is now online after several weeks of downtime.</span>',
    '<span style="color: #7ad1ff;">All your cloud data has been preserved and is ready to sync when you reconnect your account!</span>',
    'Thank you for your patience during the extended maintenance period. Happy space battling!'
  ],

  // Newer release (developer summary)
  '2025.10.05.001': [
    'Afterburner physics overhaul: changed afterburner to apply increased thrust (force) instead of an instantaneous speed spike — preserves inertia and improves turning feel while boosted.',
    'Mobile improvements: redesigned touch controls and joystick handling for more precise direct rotation and thrust; refined touch button layout for better accessibility.',
    'Full server migration: moved multiplayer backend to a new host for improved stability and lower latency.',
    'Database integration: primary analytics and cloud saves now backed by PostgreSQL for persistence across deploys.',
    'Misc player-facing fixes and polish: impact deflector activation fixes, seeker missile visual fixes (alternate wing launcher firing), and UI improvements.'
  ],

  // Existing release notes (kept for history)
  '2025.10.02.007': [
    '<span style="color: #ff4444; font-weight: bold;">Important: Due to a glitch in deploying the last patch, you may need to re-register your cloud account if you experience login issues.</span>',
    'Players have received a special pre-release avatar and ship skin to show our appreciation for your support!',
    'Restored original ship rotation physics! No more rotational inertia. Original feel restored: smoother, more responsive flight feel.',
    'Added Impact Deflector system: Press Left Ctrl or TAB for a brief energy shield that deflects asteroids without damage!',
    'Tweaks to daily and weekly challenges: improved claim flow and fixed repeated weekly notifications.',
    'Improved performance and stability.'
  ]
};

// Optional per-version external links for more detailed devlogs
export const versionLinks = {
  '2025.10.02.007': 'https://gumbydev.itch.io/superspace/devlog/1064512/-superspace-dev-log-4-community-features-polish-and-whats-next',
  '2025.10.05.001': 'https://gumbydev.itch.io/superspace/devlog/1068054/superspace-dev-log-5-post-launch-hotfixes-improvements'
};

export const versionLinkLabels = {
  '2025.10.02.007': 'Devlog & Release Notes-2025.10.02',
  '2025.10.05.001': 'Devlog & Release Notes-2025.10.05'
};

export default {
  versionNotes,
  versionLinks,
  versionLinkLabels,
};
