// Skill tree definitions and player skill management
export const SKILLS = [
  {
    id: 'shieldBoost',
    name: 'Shield Boost',
    description: 'Increase shield capacity by 10%',
    maxPoints: 5,
    prerequisite: null,
  },
  {
    id: 'energyRegen',
    name: 'Energy Regen',
    description: 'Increase energy regeneration by 1 per second',
    maxPoints: 5,
    prerequisite: null,
  },
  {
    id: 'fireRate',
    name: 'Fire Rate',
    description: 'Reduce weapon cooldown by 10%',
    maxPoints: 3,
    prerequisite: null, // Removed accuracy prerequisite
  },
  {
    id: 'thrusterPower',
    name: 'Thruster Power',
    description: 'Increase ship acceleration by 15%',
    maxPoints: 3,
    prerequisite: null,
  },
  // Add more skills as needed
];

export function getInitialSkills() {
  return SKILLS.map((skill) => ({ ...skill, points: 0 }));
}
