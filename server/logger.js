// Simple leveled logger. Honors LOG_LEVEL env var (error,warn,info,debug).
// Defaults to 'info' in production, 'debug' otherwise.
// Default to 'info' to avoid debug noise on platforms with strict log ingestion limits.
const envLevel = process.env.LOG_LEVEL || 'info';
const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = levels[envLevel] !== undefined ? envLevel : 'info';

function shouldLog(levelName) {
  return levels[levelName] <= levels[current];
}

module.exports = {
  error: (...args) => { if (shouldLog('error')) console.error(...args); },
  warn: (...args) => { if (shouldLog('warn')) console.warn(...args); },
  info: (...args) => { if (shouldLog('info')) console.log(...args); },
  debug: (...args) => { if (shouldLog('debug')) console.log(...args); },
};
