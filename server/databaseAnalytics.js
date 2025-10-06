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
          const logger = require('./logger');
          logger.info('✅ Database Analytics initialized (DB reachable)');

          // Initialize meta data if not exists
          await this.initializeMeta();
          return;
        } catch (healthErr) {
          // DB not reachable - don't mark initialized, schedule retry
          this.initialized = false;
          const logger = require('./logger');
          logger.error('❌ Database Analytics health check failed:', healthErr && healthErr.message ? healthErr.message : healthErr);
          logger.debug(`Retrying Database Analytics init in ${this._retryIntervalMs / 1000}s`);
          setTimeout(() => this.init(), this._retryIntervalMs);
          return;
        }
      } else {
  const logger = require('./logger');
  logger.warn('⚠️ Database not available, analytics will use file system');
      }
    } catch (error) {
  const logger = require('./logger');
  logger.error('❌ Failed to initialize Database Analytics:', error);
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
  const logger = require('./logger');
  logger.error('Error initializing meta:', error);
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
  // Use EST (America/New_York) for 'today' so it matches the dashboard timezone
  const estNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const today = estNow.toISOString().split('T')[0];
  const yesterdayDate = new Date(estNow.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  // Get today's events (include yesterday to account for timezone/date mismatches)
  const todayEvents = await database.getAnalyticsEvents(yesterday, today);
      
      // Get all events for all-time stats
      const allEvents = await database.getAnalyticsEvents('2020-01-01', today);
      
      // Get today's sessions (include yesterday to account for timezone boundaries)
      const todaySessions = await database.pool.query(
        'SELECT * FROM analytics_sessions WHERE date >= $1 AND date <= $2',
        [yesterday, today]
      );
      
      // Get all sessions for all-time stats
      const allSessions = await database.pool.query(
        'SELECT * FROM analytics_sessions WHERE date >= $1',
        ['2020-01-01']
      );

      // Get global peak
      const globalPeak = await database.getAnalyticsMeta('globalPeak') || 0;

      // Calculate today's stats
      const todayStatsRaw = this.calculateStats(todayEvents.rows, todaySessions.rows);
      // Calculate all-time stats
      const allTimeStatsRaw = this.calculateStats(allEvents.rows, allSessions.rows);

      // Normalize field names to match file-based analytics shape used by the dashboard
      // Defensive conversion: some callers may already provide an average in seconds
      // while others provide milliseconds. If value looks large (>10s) we treat
      // it as milliseconds and divide by 1000, otherwise assume seconds.
      function toSecondsPossibly(msOrSec) {
        if (typeof msOrSec !== 'number' || !isFinite(msOrSec)) return 0;
        // If value is greater than 10,000 treat it as milliseconds (10,000ms = 10s)
        // This guards against double-divide (ms -> /1000 twice) or missing conversion.
        return Math.floor(msOrSec > 10000 ? msOrSec / 1000 : msOrSec);
      }

      const todayStats = Object.assign({}, todayStatsRaw, {
        // Convert averageSessionTime (ms or sec) into seconds for the dashboard
        averageSessionDuration: toSecondsPossibly(todayStatsRaw.averageSessionTime),
        // ensure hourlyActivity is present
        hourlyActivity: Array.isArray(todayStatsRaw.hourlyActivity) ? todayStatsRaw.hourlyActivity : Array(24).fill(0),
        // ensure hourlyUniquePlayers is present for charting
        hourlyUniquePlayers: Array.isArray(todayStatsRaw.hourlyUniquePlayers) ? todayStatsRaw.hourlyUniquePlayers : (Array.isArray(todayStatsRaw.hourlyActivity) ? todayStatsRaw.hourlyActivity : Array(24).fill(0)),
        // expose eventCounts and tutorial shape
        eventCounts: todayStatsRaw.eventCounts || {},
        tutorial: todayStatsRaw.tutorial || { started: 0, completed: 0, completionDurations: [], quitCounts: {}, quitDurations: [], stepDurations: {} },
      });

      const allTimeStats = Object.assign({}, allTimeStatsRaw, {
        averageSessionDuration: toSecondsPossibly(allTimeStatsRaw.averageSessionTime),
        hourlyActivity: Array.isArray(allTimeStatsRaw.hourlyActivity) ? allTimeStatsRaw.hourlyActivity : Array(24).fill(0),
        hourlyUniquePlayers: Array.isArray(allTimeStatsRaw.hourlyUniquePlayers) ? allTimeStatsRaw.hourlyUniquePlayers : (Array.isArray(allTimeStatsRaw.hourlyActivity) ? allTimeStatsRaw.hourlyActivity : Array(24).fill(0)),
        eventCounts: allTimeStatsRaw.eventCounts || {},
        tutorial: allTimeStatsRaw.tutorial || { started: 0, completed: 0, completionDurations: [], quitCounts: {}, quitDurations: [], stepDurations: {} },
      });

      return {
        today: todayStats,
        allTime: Object.assign({}, allTimeStats, { globalPeak: globalPeak }),
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
    // Defensive: ensure events and sessions are arrays to avoid crashes when callers are disabled
    events = Array.isArray(events) ? events : [];
    sessions = Array.isArray(sessions) ? sessions : [];

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
      // Maintain an eventCounts map so callers (frontend) can read counts by event type
      eventCounts: {},
      // Nested tutorial object to mirror file-based analytics shape
      tutorial: {
        started: 0,
        completed: 0,
        completionDurations: [],
        quitCounts: {},
        quitDurations: [],
        stepDurations: {},
      },
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

      // Maintain eventCounts map
      try {
        const et = event.event_type || event.eventType || 'unknown';
        stats.eventCounts[et] = (stats.eventCounts[et] || 0) + 1;
      } catch (e) {}

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
          stats.tutorial.started = (stats.tutorial.started || 0) + 1;
          break;
        case 'tutorial_completed':
          stats.tutorial.completed = (stats.tutorial.completed || 0) + 1;
          // Accept either seconds or milliseconds in event payload
          const durSec = (eventData && (typeof eventData.totalDurationSeconds === 'number')) ? Number(eventData.totalDurationSeconds) : null;
          const durMs = (eventData && (typeof eventData.totalDurationMs === 'number')) ? Number(eventData.totalDurationMs) : null;
          if (durSec != null) stats.tutorial.completionDurations.push(durSec);
          else if (durMs != null) stats.tutorial.completionDurations.push(Math.round(durMs / 1000));

          // merge step durations if present
          if (eventData && eventData.stepDurations && typeof eventData.stepDurations === 'object') {
            for (const [sid, sdur] of Object.entries(eventData.stepDurations)) {
              if (!stats.tutorial.stepDurations[sid]) stats.tutorial.stepDurations[sid] = [];
              stats.tutorial.stepDurations[sid].push(Number(sdur));
            }
          }
          break;
        case 'tutorial_quit':
          try {
            const lastStep = eventData && eventData.lastStepId ? String(eventData.lastStepId) : 'unknown';
            stats.tutorial.quitCounts[lastStep] = (stats.tutorial.quitCounts[lastStep] || 0) + 1;
            const qdurSec = (eventData && typeof eventData.totalDurationSeconds === 'number') ? Number(eventData.totalDurationSeconds) : null;
            const qdurMs = (eventData && typeof eventData.totalDurationMs === 'number') ? Number(eventData.totalDurationMs) : null;
            if (qdurSec != null) stats.tutorial.quitDurations.push(qdurSec);
            else if (qdurMs != null) stats.tutorial.quitDurations.push(Math.round(qdurMs / 1000));
            if (eventData && eventData.stepDurations && typeof eventData.stepDurations === 'object') {
              for (const [sid, sdur] of Object.entries(eventData.stepDurations)) {
                if (!stats.tutorial.stepDurations[sid]) stats.tutorial.stepDurations[sid] = [];
                stats.tutorial.stepDurations[sid].push(Number(sdur));
              }
            }
          } catch (e) {}
          break;
        case 'tutorial_step_duration':
          try {
            const sid = eventData && eventData.stepId ? String(eventData.stepId) : 'unknown';
            const dur = eventData && (typeof eventData.durationSeconds === 'number') ? Number(eventData.durationSeconds) : null;
            if (dur != null) {
              if (!stats.tutorial.stepDurations[sid]) stats.tutorial.stepDurations[sid] = [];
              stats.tutorial.stepDurations[sid].push(dur);
            }
          } catch (e) {}
          break;
      }

      if (event.player_id) {
        stats.uniquePlayers.add(event.player_id);
      }
    });

  // Build hourly activity array (counts per hour in EST) so dashboard can plot last-24h
    try {
  const hourlyActivity = Array(24).fill(0);
  const hourlyUnique = Array(24).fill(0);
  const hourlyUniqueSets = Array.from({ length: 24 }, () => new Set());
      // Prefer session start times when available (sessions are a good proxy for active players)
      if (Array.isArray(sessions) && sessions.length > 0) {
        sessions.forEach(s => {
          const ts = s.start_time || s.startTime || s.started_at || s.startedAt || s.start || s.timestamp;
          if (!ts) return;
          const playerId = s.player_id || s.playerId || s.player || s.username || null;
          const d = new Date(ts);
          const est = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const hour = est.getHours();
          if (Number.isInteger(hour) && hour >= 0 && hour < 24) {
            hourlyActivity[hour]++;
            if (playerId) hourlyUniqueSets[hour].add(playerId);
          }
        });
      } else {
        // Fallback to events if no session records are available
        events.forEach(event => {
          const ts = event.timestamp || event.time || event.created_at || event.createdAt || event.tstamp;
          if (!ts) return;
          const d = new Date(ts);
          const est = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const hour = est.getHours();
          if (Number.isInteger(hour) && hour >= 0 && hour < 24) {
            hourlyActivity[hour]++;
            const playerId = event.player_id || event.playerId || event.player || null;
            if (playerId) hourlyUniqueSets[hour].add(playerId);
          }
        });
      }
      // Convert sets to counts for hourlyUnique
      for (let h = 0; h < 24; h++) {
        hourlyUnique[h] = hourlyUniqueSets[h].size;
      }
      stats.hourlyActivity = hourlyActivity;
      stats.hourlyUniquePlayers = hourlyUnique;
    } catch (e) {
      // defensive: if something goes wrong, expose zeros
      stats.hourlyActivity = Array(24).fill(0);
      stats.hourlyUniquePlayers = Array(24).fill(0);
    }

    // Calculate averages
    // Exclude very short sessions from averages (configurable via env var)
  const minSessionSeconds = Number(process.env.ANALYTICS_MIN_SESSION_SECONDS) || 60;
    // sessions here hold duration_ms; convert candidate durations to seconds and filter
    const sessionSecondsArr = sessions
      .map(s => (typeof s.duration_ms === 'number' && isFinite(s.duration_ms) ? Math.round(s.duration_ms / 1000) : 0))
      .filter(d => d >= minSessionSeconds);
    stats.averageSessionTime = sessionSecondsArr.length > 0 ? sessionSecondsArr.reduce((a, b) => a + b, 0) / sessionSecondsArr.length : 0;
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