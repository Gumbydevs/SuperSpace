// Utility to check for profane words in a string
const profaneWords = require('./data/profaneWords');

function containsProfanity(str) {
  if (!str) return false;
  const lower = str.toLowerCase();
  return profaneWords.some(word => lower.includes(word));
}

module.exports = { containsProfanity };
