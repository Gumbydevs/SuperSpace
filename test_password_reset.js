const https = require('https');

// Test password reset flow
async function testPasswordReset() {
  console.log('Testing password reset functionality...');
  
  // First, register a test user
  const registerData = JSON.stringify({
    username: 'resetTestUser',
    password: 'oldpass123'
  });

  const registerOptions = {
    hostname: 'superspace-server.onrender.com',
    port: 443,
    path: '/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': registerData.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(registerOptions, (res) => {
      console.log(`Register statusCode: ${res.statusCode}`);

      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        const registerResult = JSON.parse(responseData);
        console.log('Register Response:', registerResult);
        
        if (registerResult.success && registerResult.recoveryKey) {
          console.log('✅ User registered successfully!');
          console.log('📝 Recovery Key:', registerResult.recoveryKey);
          
          // Now test password reset
          testPasswordResetWithKey(registerResult.recoveryKey);
        } else {
          console.log('❌ Registration failed');
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('Registration Error:', error);
      reject(error);
    });

    req.write(registerData);
    req.end();
  });
}

function testPasswordResetWithKey(recoveryKey) {
  const resetData = JSON.stringify({
    username: 'resetTestUser',
    recoveryKey: recoveryKey,
    newPassword: 'newpass456'
  });

  const resetOptions = {
    hostname: 'superspace-server.onrender.com',
    port: 443,
    path: '/auth/reset-password-recovery',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': resetData.length
    }
  };

  const req = https.request(resetOptions, (res) => {
    console.log(`Reset statusCode: ${res.statusCode}`);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      const resetResult = JSON.parse(responseData);
      console.log('Reset Response:', resetResult);
      
      if (resetResult.success) {
        console.log('✅ Password reset successful!');
        // Test login with new password
        testLoginWithNewPassword();
      } else {
        console.log('❌ Password reset failed:', resetResult.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Reset Error:', error);
  });

  req.write(resetData);
  req.end();
}

function testLoginWithNewPassword() {
  const loginData = JSON.stringify({
    username: 'resetTestUser',
    password: 'newpass456'
  });

  const loginOptions = {
    hostname: 'superspace-server.onrender.com',
    port: 443,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const req = https.request(loginOptions, (res) => {
    console.log(`Login statusCode: ${res.statusCode}`);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      const loginResult = JSON.parse(responseData);
      console.log('Login Response:', loginResult);
      
      if (loginResult.success) {
        console.log('✅ Login with new password successful!');
        console.log('🎉 Password reset flow working correctly!');
      } else {
        console.log('❌ Login with new password failed:', loginResult.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Login Error:', error);
  });

  req.write(loginData);
  req.end();
}

// Run the test
testPasswordReset().catch(console.error);