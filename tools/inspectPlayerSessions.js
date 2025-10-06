/*
  Usage:
    Set DATABASE_URL in the environment (your production DB connection string),
    then run:
      node tools/inspectPlayerSessions.js Captainjellypus

  What it prints:
    - Total session count for the player
    - Average session duration (all and >= 60s)
    - Bucket counts (<60s, 60-300s, 300-600s, >=600s)
    - Median and p90 durations
    - Latest 50 session rows with start/end/duration (ms -> seconds)

  Note: This script only reads data; it won't modify the DB.
*/

const { Client } = require('pg');

async function main() {
  const player = process.argv[2];
  if (!player) {
    console.error('Usage: node tools/inspectPlayerSessions.js <playerIdOrName>');
    process.exit(2);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Please set DATABASE_URL environment variable to your PostgreSQL connection string.');
    process.exit(2);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    // Basic aggregates
    const aggSql = `
      SELECT
        COUNT(*) AS total_sessions,
        AVG(duration_ms)::numeric / 1000.0 AS avg_seconds_all,
        AVG(CASE WHEN duration_ms >= 60000 THEN duration_ms END)::numeric / 1000.0 AS avg_seconds_ge_60
      FROM analytics_sessions
      WHERE player_id = $1 OR player = $1 OR player_id = $1 || '\\0'`;

    const aggRes = await client.query(aggSql, [player]);
    console.log('\nAggregates for player:', player);
    console.log(aggRes.rows[0]);

    // Buckets
    const bucketSql = `
      SELECT
        CASE
          WHEN duration_ms IS NULL THEN 'unknown'
          WHEN duration_ms < 60000 THEN '<60s'
          WHEN duration_ms < 300000 THEN '60-300s'
          WHEN duration_ms < 600000 THEN '300-600s'
          ELSE '>=600s'
        END AS bucket,
        COUNT(*) AS cnt
      FROM analytics_sessions
      WHERE player_id = $1 OR player = $1 OR player_id = $1 || '\\0'
      GROUP BY bucket
      ORDER BY bucket;
    `;
    const bucketRes = await client.query(bucketSql, [player]);
    console.log('\nBucket counts:');
    console.table(bucketRes.rows);

    // Percentiles
    const percSql = `
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) / 1000.0 AS median_sec,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_ms) / 1000.0 AS p90_sec
      FROM analytics_sessions
      WHERE player_id = $1 OR player = $1 OR player_id = $1 || '\\0'
    `;
    const percRes = await client.query(percSql, [player]);
    console.log('\nPercentiles (seconds):', percRes.rows[0]);

    // Latest sessions
    const listSql = `
      SELECT session_id, player_id, start_time, end_time, duration_ms, ip
      FROM analytics_sessions
      WHERE player_id = $1 OR player = $1 OR player_id = $1 || '\\0'
      ORDER BY start_time DESC
      LIMIT 50
    `;
    const listRes = await client.query(listSql, [player]);
    console.log('\nLatest sessions (up to 50):');
    const rows = listRes.rows.map(r => ({
      session_id: r.session_id,
      start_time: r.start_time,
      end_time: r.end_time,
      duration_s: r.duration_ms ? Math.round(r.duration_ms/1000) : null,
      ip: r.ip
    }));
    console.table(rows);

    // Also inspect session_end events in analytics_events for this player to see what session durations were recorded there
    const eventsSql = `
      SELECT id, event_type, timestamp, data
      FROM analytics_events
      WHERE (player_id = $1 OR player = $1) AND (event_type = 'session_end' OR event_type = 'session_end')
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    const eventsRes = await client.query(eventsSql, [player]);
    console.log('\nRecent session_end events (up to 50):');
    for (const r of eventsRes.rows) {
      let dur = null;
      try { const d = r.data; if (d && d.sessionDuration) dur = Math.round(d.sessionDuration/1000); } catch(e){}
      console.log(r.timestamp, r.event_type, 'sessionDuration(s)=', dur);
    }

  } catch (e) {
    console.error('Error querying DB:', e.message || e);
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
