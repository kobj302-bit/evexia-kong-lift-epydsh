export interface Rank {
  name: string;
  emoji: string;
  minXP: number;
  maxXP: number;
}

export const RANKS: Rank[] = [
  { name: 'Resolutioner', emoji: '🧤', minXP: 0, maxXP: 99 },
  { name: 'Sleeper', emoji: '🎽', minXP: 100, maxXP: 399 },
  { name: 'Gym Rat', emoji: '🐀', minXP: 400, maxXP: 1199 },
  { name: 'Silverback', emoji: '🦍', minXP: 1200, maxXP: 2999 },
  { name: 'Final Boss', emoji: '👑', minXP: 3000, maxXP: Infinity },
];

export const XP_AWARDS = {
  WORKOUT_FINISH: 50,
  WOD_COMPLETE: 75,
  CHALLENGE_JOIN: 25,
  GOAL_HIT: 100,
  PR_BONUS: 30,
} as const;

export function getRank(xp: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRank(xp: number): Rank | null {
  const currentRank = getRank(xp);
  const currentIndex = RANKS.findIndex((r) => r.name === currentRank.name);
  if (currentIndex === RANKS.length - 1) return null;
  return RANKS[currentIndex + 1];
}

export function getRankProgress(xp: number): number {
  const currentRank = getRank(xp);
  const nextRank = getNextRank(xp);
  if (!nextRank) return 1;
  const rangeSize = nextRank.minXP - currentRank.minXP;
  const progress = xp - currentRank.minXP;
  return Math.min(1, Math.max(0, progress / rangeSize));
}

export function getXPToNextRank(xp: number): number {
  const nextRank = getNextRank(xp);
  if (!nextRank) return 0;
  return nextRank.minXP - xp;
}
