// Entry point for the SuperSpace server on Render
// This file just requires and runs server.js

// Minimal production log suppression: when running in production, silence console.log/info/debug
if (process.env.NODE_ENV === 'production') {
	console.log = () => {}; // keep console.error/warn for critical issues
	console.info = () => {};
	console.debug = () => {};
}

require('./server.js');
