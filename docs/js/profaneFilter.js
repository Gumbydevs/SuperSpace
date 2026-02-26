// Utility to check for profane words in a string
import profaneWords from './data/profaneWords.js';

// Debug log to identify which version is loading
console.log('ProfaneFilter loaded - Version: FIXED_SIMPLE_VERSION_2025_09_12');

export function containsProfanity(str) {
  if (!str) return false;
  const lower = str.toLowerCase();
  return profaneWords.some((word) => lower.includes(word));
}
