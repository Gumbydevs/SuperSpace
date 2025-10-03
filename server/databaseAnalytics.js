/**
 * Database-backed Analytics for SuperSpace
 * Persistent analytics storage using PostgreSQL
 */

const database = require('./database');

class DatabaseAnalytics {
  constructor() {
    this.initialized = false;
    this._retryIntervalMs = 15000; // retry every 15s when DB is unreachable
    this.init();
  }

  async init() {
    try {
      // Check if we have database connection
      if (process.env.DATABASE_URL && database.pool) {
        // Perform a lightweight health check to ensure DB is reachable before marking initialized
        try {
          await database.pool.query('SELECT 1');
          this.initialized = true;
          console.log('✅ Database Analytics initialized (DB reachable)');

          // Initialize meta data if not exists
          await this.initializeMeta();
          return;
        } catch (healthErr) {
          // DB not reachable - don't mark initialized, schedule retry
          this.initialized = false;
          console.error('❌ Database Analytics health check failed:', healthErr && healthErr.message ? healthErr.message : healthErr);
          console.log(`Retrying Database Analytics init in ${this._retryIntervalMs / 1000}s`);
          setTimeout(() => this.init(), this._retryIntervalMs);
          return;
        }
      } else {
        console.log('⚠️ Database not available, analytics will use file system');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Database Analytics:', error);
      // Schedule retry in case of unexpected init error
      setTimeout(() => this.init(), this._retryIntervalMs);
    }
  }

  async initializeMeta() {
    try {
      // Initialize global peak if not exists
      const globalPeak = await database.getAnalyticsMeta('globalPeak');
      if (globalPeak === null) {
        await database.setAnalyticsMeta('globalPeak', 0);
      }
    } catch (error) {
      console.error('Error initializing meta:', error);
    }
  }

  // Track a game event (with rate limiting for performance)
  async trackEvent(eventType, playerId, sessionId, data = {}) {
    if (!this.initialized) return;
    
    try {
      // Don't await - fire and forget for performance
      database.saveAnalyticsEvent(eventType, playerId, sessionId, {
        ...data,
        timestamp: new Date().toISOString()
      }).catch(err => {
        // Silent error - don't log every DB error to avoid spam
        if (Math.random() < 0.01) { // Log 1% of errors
          console.error('Database analytics error (sampled):', err.message);
        }
      });
    } catch (error) {
      // Ignore errors completely - never impact gameplay
    }
  }

  // Start or update a session (fire and forget)
  async trackSession(sessionId, playerId, startTime = null, data = {}) {
    if (!this.initialized) return;
    
    try {
      const start = startTime || new Date();
      // Don't await - fire and forget for performance
      database.saveAnalyticsSession(sessionId, playerId, start, data)
        .catch(() => {}); // Silent error handling
    } catch (error) {
      // Ignore errors completely
    }
  }

  // End a session (fire and forget)
  async endSession(sessionId, endTime = null, eventsCount = 0) {
    if (!this.initialized) return;
    
    try {
      const end = endTime || new Date();
      
      // Don't await - fire and forget for performance
      database.pool.query(
        'SELECT start_time FROM analytics_sessions WHERE session_id = $1',
        [sessionId]
      ).then(sessions => {
        if (sessions.rows.length > 0) {
          const startTime = new Date(sessions.rows[0].start_time);
          const durationMs = end.getTime() - startTime.getTime();
          
          database.updateAnalyticsSession(sessionId, end, durationMs, eventsCount)
            .catch(() => {}); // Silent error handling
        }
      }).catch(() => {}); // Silent error handling
    } catch (error) {
      // Ignore errors completely
    }
  }

  // Save daily stats (fire and forget)
  async saveDailyStats(date, stats) {
    if (!this.initialized) return;
    
    try {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      // Don't await - fire and forget for performance
      database.saveDailyStats(dateStr, stats)
        .catch(() => {}); // Silent error handling
    } catch (error) {
      // Ignore errors completely
    }
  }

  // Get statistics for analytics dashboard
  async getStats() {
    if (!this.initialized) {
      return {
        today: {},
        allTime: {},
        source: 'database-unavailable'
      };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get today's events
      const todayEvents = await database.getAnalyticsEvents(today, today);
      
      // Get all events for all-time stats
      const allEvents = await database.getAnalyticsEvents('2020-01-01', today);
      
      // Get today's sessions
      const todaySessions = await database.pool.query(
        'SELECT * FROM analytics_sessions WHERE date = $1',
        [today]
      );
      
      // Get all sessions for all-time stats
      const allSessions = await database.pool.query(
        'SELECT * FROM analytics_sessions WHERE date >= $1',
        ['2020-01-01']
      );

      // Get global peak
      const globalPeak = await database.getAnalyticsMeta('globalPeak') || 0;

      // Calculate today's stats
      const todayStats = this.calculateStats(todayEvents.rows, todaySessions.rows);
      
      // Calculate all-time stats
      const allTimeStats = this.calculateStats(allEvents.rows, allSessions.rows);

      return {
        today: todayStats,
        allTime: {
          ...allTimeStats,
          globalPeak: globalPeak
        },
        source: 'database'
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        today: {},
        allTime: {},
        source: 'database-error',
        error: error.message
      };
    }
  }

  // Calculate statistics from events and sessions
  calculateStats(events, sessions) {
    const stats = {
      totalSessions: sessions.length,
      totalGameTime: 0,
      kills: 0,
      deaths: 0,
      shotsFired: 0,
      powerupsCollected: 0,
      averageSessionTime: 0,
      peakPlayers: 0,
      uniquePlayers: new Set(),
      tutorialStarted: 0,
      tutorialCompleted: 0
    };

    // Process sessions
    sessions.forEach(session => {
      if (session.duration_ms) {
        stats.totalGameTime += session.duration_ms;
      }
      if (session.player_id) {
        stats.uniquePlayers.add(session.player_id);
      }
    });

    // Process events
    events.forEach(event => {
      const eventData = event.data || {};
      
      switch (event.event_type) {
        case 'player_killed':
        case 'kill':
          stats.kills++;
          break;
        case 'player_died':
        case 'death':
          stats.deaths++;
          break;
        case 'shot_fired':
          stats.shotsFired++;
          break;
        case 'powerup_collected':
          stats.powerupsCollected++;
          break;
        case 'tutorial_started':
          stats.tutorialStarted++;
          break;
        case 'tutorial_completed':
          stats.tutorialCompleted++;
          break;
      }
      
      if (event.player_id) {
        stats.uniquePlayers.add(event.player_id);
      }
    });

    // Calculate averages
    stats.averageSessionTime = sessions.length > 0 ? stats.totalGameTime / sessions.length : 0;
    stats.uniquePlayersCount = stats.uniquePlayers.size;
    delete stats.uniquePlayers; // Remove Set for JSON serialization

    // Convert total game time from ms to seconds
    stats.totalGameTime = Math.floor(stats.totalGameTime / 1000);

    return stats;
  }

  // Update global peak players
  async updateGlobalPeak(currentPlayers) {
    if (!this.initialized) return;
    
    try {
      const currentPeak = await database.getAnalyticsMeta('globalPeak') || 0;
      if (currentPlayers > currentPeak) {
        await database.setAnalyticsMeta('globalPeak', currentPlayers);
        console.log(`🎉 New global peak: ${currentPlayers} players!`);
      }
    } catch (error) {
      console.error('Error updating global peak:', error);
    }
  }

  // Get recent events for real-time dashboard
  async getRecentEvents(limit = 100) {
    if (!this.initialized) return [];
    
    try {
      const result = await database.pool.query(
        'SELECT * FROM analytics_events ORDER BY timestamp DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting recent events:', error);
      return [];
    }
  }

  // Get session data for analytics
  async getSessionData(startDate, endDate) {
    if (!this.initialized) return [];
    
    try {
      const result = await database.pool.query(
        'SELECT * FROM analytics_sessions WHERE date >= $1 AND date <= $2 ORDER BY start_time DESC',
        [startDate, endDate]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting session data:', error);
      return [];
    }
  }
}

module.exports = DatabaseAnalytics;