// Skill tree definitions and player skill management
export const SKILLS = [
    { id: 'accuracy', name: 'Accuracy', description: 'Increase weapon accuracy by 5%', maxPoints: 5, prerequisite: null },
    { id: 'shieldBoost', name: 'Shield Boost', description: 'Increase shield capacity by 10%', maxPoints: 5, prerequisite: null },
    { id: 'energyRegen', name: 'Energy Regen', description: 'Increase energy regeneration by 1 per second', maxPoints: 5, prerequisite: null },
    // Add more skills as needed
];

export function getInitialSkills() {
    return SKILLS.map(skill => ({ ...skill, points: 0 }));
}
