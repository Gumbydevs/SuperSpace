const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function timestamp() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, '-');
}

async function exportPostgres(exportDir) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('No DATABASE_URL present, skipping Postgres export.');
    return { skipped: true };
  }

  console.log('Exporting Postgres database to', exportDir);
  const pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

  const tables = [
    'users',
    'auth_tokens',
    'player_data',
    'analytics_daily_stats',
    'analytics_events',
    'analytics_sessions',
    'analytics_meta'
  ];

  try {
    await pool.connect();

    for (const t of tables) {
      try {
        const res = await pool.query(`SELECT * FROM ${t} ORDER BY id ASC`);
        const outPath = path.join(exportDir, `${t}.json`);
        await fs.writeFile(outPath, JSON.stringify(res.rows, null, 2), 'utf8');
        console.log(`Exported ${res.rows.length} rows from ${t} -> ${outPath}`);
      } catch (e) {
        console.warn(`Warning: failed to export table ${t}:`, e.message);
      }
    }

    // Export schema (best-effort): we will write a note that schema file in this repo can be used
    console.log('Postgres export complete. Please use server/db_schema.sql to recreate schema on target DB.');

    await pool.end();
    return { skipped: false };
  } catch (e) {
    console.error('Postgres export failed:', e.message || e);
    try { await pool.end(); } catch (er) {}
    return { skipped: false, error: e };
  }
}

async function copyIfExists(src, dest) {
  try {
    const s = path.resolve(src);
    if (!fssync.existsSync(s)) {
      console.log(`Source not found: ${s} — skipping`);
      return false;
    }
    // Use fs.cp when available for recursive copy
    if (fs.cp) {
      await fs.cp(s, dest, { recursive: true });
    } else {
      // Fallback: recursive copy via read/write
      await copyRecursive(s, dest);
    }
    console.log(`Copied ${s} -> ${dest}`);
    return true;
  } catch (e) {
    console.error(`Failed to copy ${src} -> ${dest}:`, e.message || e);
    return false;
  }
}

async function copyRecursive(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  await ensureDir(dest);
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function exportFiles(exportDir) {
  // Copy analytics_data and cloud_data folders if present
  const base = path.join(__dirname);
  const analyticsDir = path.join(base, 'analytics_data');
  const cloudDir = path.join(base, 'cloud_data');

  const results = {};
  results.analytics_copied = await copyIfExists(analyticsDir, path.join(exportDir, 'analytics_data'));
  results.cloud_copied = await copyIfExists(cloudDir, path.join(exportDir, 'cloud_data'));

  // Additionally export any server-side JSON summaries if present
  const metaFile = path.join(analyticsDir, 'meta.json');
  if (fssync.existsSync(metaFile)) {
    try {
      const raw = await fs.readFile(metaFile, 'utf8');
      await fs.writeFile(path.join(exportDir, 'analytics_meta.json'), raw, 'utf8');
      results.meta_exported = true;
    } catch (e) {
      results.meta_exported = false;
    }
  }

  return results;
}

async function main() {
  try {
    const outRoot = path.join(__dirname, '..', 'exports');
    await ensureDir(outRoot);
    const outDir = path.join(outRoot, `export-${timestamp()}`);
    await ensureDir(outDir);

    console.log('Starting export into', outDir);

    // Try Postgres export first
    const pgResult = await exportPostgres(outDir);

    // If Postgres was not present or failed, copy files
    if (pgResult.skipped) {
      const filesResult = await exportFiles(outDir);
      console.log('File-based export results:', filesResult);
    }

    // Also include schema SQL for convenience
    try {
      const schemaSrc = path.join(__dirname, 'db_schema.sql');
      if (fssync.existsSync(schemaSrc)) {
        await copyIfExists(schemaSrc, path.join(outDir, 'db_schema.sql'));
      }
    } catch (e) {
      // ignore
    }

    console.log('Export complete. Files are located in', outDir);
  } catch (e) {
    console.error('Export failed:', e.message || e);
    process.exitCode = 2;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
