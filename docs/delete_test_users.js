const https = require('https');

const testUsers = [
  'testuser3',
  'gumby'
];

const requestData = JSON.stringify({
  users: testUsers,
  confirmKey: 'delete-test-users-2025'
});

const options = {
  hostname: 'superspace-server-production.up.railway.app',
  port: 443,
  path: '/admin/delete-users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': requestData.length
  }
};

console.log('🗑️ Requesting deletion of test users:', testUsers);

const req = https.request(options, (res) => {
  console.log(`Response status: ${res.statusCode}`);

  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      console.log('\n📊 Deletion Results:');
      
      if (result.success) {
        result.results.forEach(r => {
          if (r.success) {
            console.log(`✅ ${r.username} - deleted (tokens: ${r.tokensDeleted}, data: ${r.playerDataDeleted})`);
          } else {
            console.log(`❌ ${r.username} - failed: ${r.message}`);
          }
        });
        console.log(`\n👥 Remaining users in database: ${result.remainingUsers}`);
      } else {
        console.log('❌ Request failed:', result.message);
      }
    } catch (e) {
      console.log('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(requestData);
req.end();