// Manages player skills, score-based skill points, and skill point allocation
import { SKILLS, getInitialSkills } from './data/skills.js';

export class SkillSystem {
  constructor(player) {
    this.player = player;
    this.skills = getInitialSkills();
    this.skillPoints = 0; // Available points to spend
    this.lastScoreCheck = 0; // Last score when we calculated skill points
    this.MAX_POINTS_PER_RUN = 5; // Limit per run
  }

  // Check if player earned new skill points based on score
  updateSkillPoints() {
    // Award 1 skill point per 1500 score points (increased from 1000 for balance)
    const earnedPoints = Math.floor(this.player.score / 1500);
    const currentAllocated = this.getAllocatedPoints();

    const previousSkillPoints = this.skillPoints;
    
    // Only give points up to the max per run
    this.skillPoints = Math.min(
      earnedPoints - currentAllocated,
      this.MAX_POINTS_PER_RUN - currentAllocated,
    );
    if (this.skillPoints < 0) this.skillPoints = 0;
    
    // Update badge if skill points changed
    if (this.skillPoints !== previousSkillPoints && window.game && window.game.shop) {
      window.game.shop.updateSkillsTabBadge();
    }
  }

  // Allocate a point to a skill if possible
  allocate(skillId) {
    const skill = this.skills.find((s) => s.id === skillId);
    if (!skill) return false;
    if (this.skillPoints <= 0) return false;
    const allocated = this.getAllocatedPoints();
    if (allocated >= this.MAX_POINTS_PER_RUN) return false;
    if (skill.points >= skill.maxPoints) return false;
    if (skill.prerequisite) {
      const prereq = this.skills.find((s) => s.id === skill.prerequisite);
      if (!prereq || prereq.points <= 0) return false;
    }
    skill.points++;
    this.skillPoints--;
    // Apply skill effects, e.g.:
    switch (skill.id) {
      case 'shieldBoost':
        // Calculate the increase amount (10% of current capacity)
        const shieldIncrease = this.player.shieldCapacity * 0.1;
        this.player.shieldCapacity += shieldIncrease;
        // Also increase current shield by the same amount (up to new max)
        this.player.shield = Math.min(
          this.player.shield + shieldIncrease,
          this.player.shieldCapacity
        );
        break;
      case 'energyRegen':
        this.player.energyRegen += 1;
        break;
      case 'fireRate':
        // Store original fire cooldown time if not already stored
        if (!this.player.baseFireCooldownTime) {
          this.player.baseFireCooldownTime = this.player.fireCooldownTime;
        }
        // Reduce cooldown by 10% (multiply by 0.9)
        this.player.baseFireCooldownTime *= 0.9;
        this.player.fireCooldownTime = this.player.baseFireCooldownTime;
        break;
      case 'thrusterPower':
        this.player.acceleration += this.player.acceleration * 0.15;
        break;
    }
    return true;
  }

  // Reset skill points and allocations for new run
  reset() {
    this.skills.forEach((s) => (s.points = 0));
    this.skillPoints = 0;
    this.lastScoreCheck = 0;
  }

  getAllocatedPoints() {
    return this.skills.reduce((sum, s) => sum + s.points, 0);
  }
}
