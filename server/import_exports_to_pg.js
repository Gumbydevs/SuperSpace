#!/usr/bin/env node
/*
  Import exports into PostgreSQL (Railway) using DATABASE_URL env var.
  - Applies db_schema.sql
  - Imports analytics daily JSON files into analytics_daily_stats
  - Imports sessions files if present into analytics_sessions

  Usage: DATABASE_URL="postgres://..." node import_exports_to_pg.js
*/
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

async function applySqlFile(pool, filePath) {
  const sql = await fs.readFile(filePath, 'utf8');
  const logger = require('./logger');
  logger.info('Applying SQL from', filePath);
  await pool.query(sql);
}

async function importDailyStats(pool, exportsDir) {
  const dailyDir = path.join(exportsDir, '..', '..', 'server', 'analytics_data', 'daily');
  try {
    const files = await fs.readdir(dailyDir);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const p = path.join(dailyDir, f);
      const raw = await fs.readFile(p, 'utf8');
      const obj = JSON.parse(raw);
      const date = obj.date || f.replace('.json', '');
  const logger = require('./logger');
  logger.info('Importing daily stats for', date);
      await pool.query(
        `INSERT INTO analytics_daily_stats (date, stats) VALUES ($1, $2) ON CONFLICT (date) DO UPDATE SET stats = $2, updated_at = CURRENT_TIMESTAMP`,
        [date, obj]
      );
    }
  } catch (e) {
    const logger = require('./logger');
    logger.error('Failed to import daily stats:', e.message);
  }
}

async function importSessions(pool, exportsDir) {
  const sessionsDir = path.join(__dirname, 'analytics_data', 'sessions');
  try {
    const files = await fs.readdir(sessionsDir);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const p = path.join(sessionsDir, f);
      const raw = await fs.readFile(p, 'utf8');
      const obj = JSON.parse(raw);
      // attempt to extract session_id and player id
      const sessionId = obj.sessionId || obj.id || path.basename(f, '.json');
      const playerId = obj.playerId || obj.player || obj.player_name || null;
      const startTime = new Date(obj.startTime || obj.start || Date.now());
      const endTime = obj.endTime ? new Date(obj.endTime) : null;
      const durationMs = typeof obj.duration === 'number' ? obj.duration : null;
      const eventsCount = Array.isArray(obj.events) ? obj.events.length : 0;
      const date = new Date(startTime).toISOString().split('T')[0];

  const logger = require('./logger');
  logger.info('Importing session', sessionId, 'player', playerId);
      await pool.query(
        `INSERT INTO analytics_sessions (session_id, player_id, start_time, end_time, duration_ms, events_count, data, date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (session_id) DO UPDATE SET last_activity = CURRENT_TIMESTAMP, data = $7`,
        [sessionId, playerId, startTime, endTime, durationMs, eventsCount, obj, date]
      );
    }
  } catch (e) {
    const logger = require('./logger');
    logger.error('Failed to import sessions:', e.message);
  }
}

async function importExports(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be provided');
  }

  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  try {
    const exportsDir = path.join(__dirname, '..', 'exports');
    // find latest export dir that contains db_schema.sql
    const dirs = await fs.readdir(exportsDir);

    // pick the latest by name (ISO timestamp in name)
    const latest = dirs.filter(d => d.startsWith('export-')).sort().pop();
    if (!latest) {
      throw new Error('No export directories found under exports/');
    }

    const schemaPath = path.join(exportsDir, latest, 'db_schema.sql');
    await applySqlFile(pool, schemaPath);

    await importDailyStats(pool, path.join(exportsDir, latest));
    await importSessions(pool, path.join(exportsDir, latest));

    const logger = require('./logger');
    logger.info('Import complete.');
    return { ok: true, importDir: latest };
  } catch (error) {
    const logger = require('./logger');
    logger.error('Import failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Allow running standalone
if (require.main === module) {
  (async () => {
    try {
      const res = await importExports(process.env.DATABASE_URL);
      const logger = require('./logger');
      logger.info('Standalone import result:', res);
      process.exit(0);
    } catch (e) {
      const logger = require('./logger');
      logger.error('Standalone import error:', e);
      process.exit(1);
    }
  })();
}

module.exports = { importExports };
