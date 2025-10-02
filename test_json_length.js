// Test the length of our JSON data
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return { salt, hash };
}

const username = 'testuser';
const password = 'testpass123';

// Generate recovery key
const recoveryKey = 'comet-nebula-galaxy-starship';
const { salt: recoverySalt, hash: recoveryHash } = hashPassword(recoveryKey);

// Hash password 
const { salt, hash } = hashPassword(password);

// Create user data object
const userData = {
  username: username,
  salt,
  hash,
  recoverySalt,
  recoveryHash,
  createdAt: new Date().toISOString(),
};

const jsonString = JSON.stringify(userData);
console.log('JSON Length:', jsonString.length);
console.log('JSON Data:', jsonString);
console.log('Hash length:', hash.length);
console.log('Salt length:', salt.length);