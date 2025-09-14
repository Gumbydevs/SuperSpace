/**
 * Analytics Debug Helper
 * Add this script to help debug analytics issues
 */

// Override fetch to monitor analytics requests
const originalFetch = window.fetch;
window.fetch = function (...args) {
  const url = args[0];
  const options = args[1];

  // Check if this is an analytics request
  if (url && url.includes('/analytics/track')) {
    console.log('📡 ANALYTICS REQUEST:', url, options);

    // Call original fetch and monitor response
    return originalFetch
      .apply(this, args)
      .then((response) => {
        if (response.ok) {
          console.log('✅ ANALYTICS REQUEST SUCCESS:', url, response.status);
        } else {
          console.error(
            '❌ ANALYTICS REQUEST FAILED:',
            url,
            response.status,
            response.statusText,
          );
        }
        return response;
      })
      .catch((error) => {
        console.error('❌ ANALYTICS REQUEST ERROR:', url, error);
        throw error;
      });
  }

  // For non-analytics requests, just call original fetch
  return originalFetch.apply(this, args);
};

// Override console.log to also log analytics calls
const originalConsoleLog = console.log;
console.log = function (...args) {
  if (args[0] && args[0].includes && args[0].includes('🎯')) {
    // This is an analytics log, make it stand out
    originalConsoleLog.apply(console, ['🔥 ANALYTICS:', ...args]);
  } else {
    originalConsoleLog.apply(console, args);
  }
};

// Create debug tracker to monitor analytics calls
window.analyticsDebugTracker = {
  calls: [],
  trackCall: function (method, args) {
    const call = {
      timestamp: new Date().toISOString(),
      method: method,
      arguments: args,
      windowAnalyticsExists: !!window.analytics,
    };
    this.calls.push(call);
    console.log(
      '🔥 ANALYTICS CALL:',
      method,
      args,
      'window.analytics exists:',
      !!window.analytics,
    );

    // Keep only last 50 calls
    if (this.calls.length > 50) {
      this.calls = this.calls.slice(-50);
    }
  },
  getCalls: function () {
    return this.calls;
  },
  getCallsSummary: function () {
    const summary = {};
    this.calls.forEach((call) => {
      if (!summary[call.method]) summary[call.method] = 0;
      summary[call.method]++;
    });
    return summary;
  },
};

// Monitor window.analytics usage
if (window.analytics) {
  console.log('🔥 ANALYTICS: window.analytics is available at page load');

  // Wrap analytics methods to track calls
  const originalTrack = window.analytics.track;
  window.analytics.track = function (...args) {
    window.analyticsDebugTracker.trackCall('track', args);
    return originalTrack.apply(this, args);
  };

  const originalTrackWeaponFired = window.analytics.trackWeaponFired;
  window.analytics.trackWeaponFired = function (...args) {
    window.analyticsDebugTracker.trackCall('trackWeaponFired', args);
    return originalTrackWeaponFired.apply(this, args);
  };

  const originalTrackPlayerDied = window.analytics.trackPlayerDied;
  window.analytics.trackPlayerDied = function (...args) {
    window.analyticsDebugTracker.trackCall('trackPlayerDied', args);
    return originalTrackPlayerDied.apply(this, args);
  };
} else {
  console.log('🔥 ANALYTICS: window.analytics is NOT available at page load');

  // Monitor for when it becomes available
  let checkCount = 0;
  const checkInterval = setInterval(() => {
    checkCount++;
    if (window.analytics) {
      console.log(
        `🔥 ANALYTICS: window.analytics became available after ${checkCount * 100}ms`,
      );
      clearInterval(checkInterval);
    } else if (checkCount > 100) {
      // Stop checking after 10 seconds
      console.log('🔥 ANALYTICS: window.analytics never became available');
      clearInterval(checkInterval);
    }
  }, 100);
}

// Add helper function to test analytics manually
window.testAnalytics = function () {
  console.log('🔥 TESTING ANALYTICS:');
  console.log('window.analytics exists:', !!window.analytics);

  if (window.analytics) {
    console.log('Testing trackWeaponFired...');
    window.analytics.trackWeaponFired('test_weapon', 'test_target');

    console.log('Testing track...');
    window.analytics.track('test_event', { test: 'data' });

    console.log('Analytics test calls sent. Check server logs for reception.');
  } else {
    console.log('window.analytics not available for testing');
  }
};

console.log(
  '🔥 ANALYTICS DEBUG: Debug helper loaded. Use window.testAnalytics() to test manually.',
);
console.log(
  '🔥 ANALYTICS DEBUG: Use window.analyticsDebugTracker.getCalls() to see all analytics calls.',
);
