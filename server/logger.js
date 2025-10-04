// Simple leveled logger. Honors LOG_LEVEL env var (error,warn,info,debug).
// Defaults to 'info' in production, 'debug' otherwise. If LOG_LEVEL is set
// it will be used instead. Using console.debug for debug-level messages can
// help platforms differentiate verbose debug output from normal stdout.
const defaultLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const envLevel = process.env.LOG_LEVEL || defaultLevel;
const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = levels[envLevel] !== undefined ? envLevel : 'info';

function shouldLog(levelName) {
  return levels[levelName] <= levels[current];
}

module.exports = {
  error: (...args) => { if (shouldLog('error')) console.error(...args); },
  warn: (...args) => { if (shouldLog('warn')) console.warn(...args); },
  info: (...args) => { if (shouldLog('info')) console.log(...args); },
  debug: (...args) => { if (shouldLog('debug')) {
    // Prefer console.debug where available so hosting platforms can treat
    // debug-level output separately from regular logs.
    if (typeof console.debug === 'function') console.debug(...args);
    else console.log(...args);
  } },
};
