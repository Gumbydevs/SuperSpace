
// Utility to check for profane words in a string
import profaneWords from './data/profaneWords.js';

export function containsProfanity(str) {
  if (!str) return false;
  const lower = str.toLowerCase();
  return profaneWords.some(word => lower.includes(word));
}
