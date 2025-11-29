// Killer darts game types

export type KillerGameType = 'killer_3' | 'killer_5' | 'killer_7';

export type KillerPhase = 'claiming' | 'building' | 'killer';

export interface KillerGameConfig {
  type: KillerGameType;
  maxLives: number;
  displayName: string;
  description: string;
}

export interface KillerProgress {
  id: string;
  game_id: string;
  player_id: string;
  player_type: 'user' | 'friend';
  claimed_number: number | null;
  lives: number;
  max_lives: number;
  is_killer: boolean;
  is_eliminated: boolean;
  created_at: string;
  updated_at: string;
}

export interface KillerPlayer {
  id: string;
  type: 'user' | 'friend';
  name: string;
  order: number;
  progress: KillerProgress;
}

export interface KillerTurn {
  id: string;
  player_id: string;
  player_type: string;
  game_id: string;
  turn_number: number;
  hits: number[]; // Numbers that were hit this turn
  lives_after: number; // Lives after this turn
}

// Game configuration constants
export const KILLER_GAME_CONFIGS: Record<KillerGameType, KillerGameConfig> = {
  killer_3: {
    type: 'killer_3',
    maxLives: 3,
    displayName: 'Killer (3 Lives)',
    description: 'Classic Killer - become a killer at 3 lives'
  },
  killer_5: {
    type: 'killer_5',
    maxLives: 5,
    displayName: 'Killer (5 Lives)',
    description: 'Extended Killer - become a killer at 3 lives, max 5'
  },
  killer_7: {
    type: 'killer_7',
    maxLives: 7,
    displayName: 'Killer (7 Lives)',
    description: 'Marathon Killer - become a killer at 3 lives, max 7'
  }
};

// Helper functions
export function isKillerGameType(gameType: string): gameType is KillerGameType {
  return gameType.startsWith('killer_');
}

export function getMaxLivesForGameType(gameType: KillerGameType): number {
  return KILLER_GAME_CONFIGS[gameType].maxLives;
}

export function getDisplayNameForGameType(gameType: KillerGameType): string {
  return KILLER_GAME_CONFIGS[gameType].displayName;
}

/**
 * Determine the current phase of a Killer game
 * - claiming: Players are selecting their numbers
 * - building: At least one player has claimed but not all non-eliminated players are killers
 * - killer: All non-eliminated players have reached killer status
 */
export function getGamePhase(players: KillerPlayer[]): KillerPhase {
  const activePlayers = players.filter(p => !p.progress.is_eliminated);

  // If any player hasn't claimed a number, we're in claiming phase
  const allClaimed = activePlayers.every(p => p.progress.claimed_number !== null);
  if (!allClaimed) {
    return 'claiming';
  }

  // If all active players are killers, we're in killer phase
  const allKillers = activePlayers.every(p => p.progress.is_killer);
  if (allKillers) {
    return 'killer';
  }

  // Otherwise, we're in building phase
  return 'building';
}

/**
 * Get all numbers that have been claimed in a game
 */
export function getClaimedNumbers(players: KillerPlayer[]): number[] {
  return players
    .filter(p => p.progress.claimed_number !== null)
    .map(p => p.progress.claimed_number as number);
}

/**
 * Find which player owns a specific number
 */
export function getPlayerByNumber(players: KillerPlayer[], number: number): KillerPlayer | undefined {
  return players.find(p => p.progress.claimed_number === number);
}

/**
 * Calculate lives gained from a hit on own number
 * Single = 1, Double = 2, Triple = 3
 */
export function calculateLivesGained(multiplier: number): number {
  return multiplier;
}

/**
 * Calculate lives lost from a hit by a killer on your number
 * Single = 1, Double = 2, Triple = 3
 */
export function calculateLivesLost(multiplier: number): number {
  return multiplier;
}

/**
 * Get the next active player index (skipping eliminated players)
 */
export function getNextPlayerIndex(currentIndex: number, players: KillerPlayer[]): number {
  const playerCount = players.length;
  let nextIndex = (currentIndex + 1) % playerCount;
  let attempts = 0;

  // Keep looking until we find a non-eliminated player or we've checked everyone
  while (players[nextIndex].progress.is_eliminated && attempts < playerCount) {
    nextIndex = (nextIndex + 1) % playerCount;
    attempts++;
  }

  return nextIndex;
}

/**
 * Check if the game has a winner (only one non-eliminated player remains)
 */
export function checkForWinner(players: KillerPlayer[]): KillerPlayer | null {
  const activePlayers = players.filter(p => !p.progress.is_eliminated);

  // Need at least 2 players to have been in killer phase for there to be a winner
  const killersExist = players.some(p => p.progress.is_killer || p.progress.is_eliminated);

  if (activePlayers.length === 1 && killersExist) {
    return activePlayers[0];
  }

  return null;
}

/**
 * Format hit display for UI
 */
export function formatHitDisplay(number: number, multiplier: number): string {
  const prefix = multiplier === 1 ? 'S' : multiplier === 2 ? 'D' : 'T';
  return `${prefix}${number}`;
}
