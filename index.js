// Root-level entry point for the SuperSpace server
// This file is used by Render for deployment
console.log('Starting SuperSpace server from root index.js...');

// Load the actual server implementation
require('./server/server.js');
