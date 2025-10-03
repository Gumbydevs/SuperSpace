// Simple leveled logger. Honors LOG_LEVEL env var (error,warn,info,debug).
// Defaults to 'info' in production, 'debug' otherwise.
const envLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
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
