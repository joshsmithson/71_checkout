// Around the World game types

export type ATWGameType = 'atw_1_20' | 'atw_1_20_bull' | 'atw_1_20_25_bull';

export interface ATWGameConfig {
  type: ATWGameType;
  sequence: number[]; // The sequence of numbers to hit
  multiplierAdvances: boolean; // Whether doubles/triples advance extra spaces
  displayName: string;
  description: string;
}

export interface ATWProgress {
  id: string;
  game_id: string;
  player_id: string;
  player_type: 'user' | 'friend';
  current_target: number;
  sequence_position: number;
  completed_targets: number[];
  multiplier_advances: boolean;
  created_at: string;
  updated_at: string;
}

export interface ATWPlayer {
  id: string;
  type: 'user' | 'friend';
  name: string;
  order: number;
  progress: ATWProgress;
  isLeader?: boolean;
}

export interface ATWTurn {
  id: string;
  player_id: string;
  player_type: string;
  game_id: string;
  turn_number: number;
  hits: number[]; // Numbers that were hit this turn
  advances: number; // How many positions advanced
  position_before: number;
  position_after: number;
  completed_game: boolean;
}

// Game configuration constants
export const ATW_GAME_CONFIGS: Record<ATWGameType, ATWGameConfig> = {
  atw_1_20: {
    type: 'atw_1_20',
    sequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    multiplierAdvances: false,
    displayName: 'Around the World (1-20)',
    description: 'Hit numbers 1 through 20 in sequence'
  },
  atw_1_20_bull: {
    type: 'atw_1_20_bull',
    sequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 50],
    multiplierAdvances: false,
    displayName: 'Around the World (1-20 + Bull)',
    description: 'Hit numbers 1 through 20, then bullseye'
  },
  atw_1_20_25_bull: {
    type: 'atw_1_20_25_bull',
    sequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 50],
    multiplierAdvances: false,
    displayName: 'Around the World (1-20 + 25 + Bull)',
    description: 'Hit numbers 1 through 20, then 25, then bullseye'
  }
};

// Helper functions
export function getSequenceForGameType(gameType: ATWGameType): number[] {
  return ATW_GAME_CONFIGS[gameType].sequence;
}

export function getDisplayNameForGameType(gameType: ATWGameType): string {
  return ATW_GAME_CONFIGS[gameType].displayName;
}

export function isATWGameType(gameType: string): gameType is ATWGameType {
  return gameType.startsWith('atw_');
}

export function calculateAdvancement(
  currentTarget: number,
  hitNumber: number,
  multiplier: number,
  multiplierAdvances: boolean,
  sequence: number[]
): { advances: number; newPosition: number; completed: boolean } {
  const currentIndex = sequence.indexOf(currentTarget);
  
  if (currentIndex === -1) {
    return { advances: 0, newPosition: currentIndex, completed: false };
  }

  // Check if the hit matches the current target
  if (hitNumber === currentTarget) {
    let advances = 1;
    
    // If multiplier advances are enabled, doubles and triples advance extra spaces
    if (multiplierAdvances && multiplier > 1) {
      advances = multiplier;
    }
    
    const newPosition = Math.min(currentIndex + advances, sequence.length);
    const completed = newPosition >= sequence.length;
    
    return { advances, newPosition, completed };
  }
  
  return { advances: 0, newPosition: currentIndex, completed: false };
}

export function getProgressPercentage(position: number, sequenceLength: number): number {
  return Math.min((position / sequenceLength) * 100, 100);
}

export function formatTargetDisplay(target: number): string {
  if (target === 25) return 'Single Bull (25)';
  if (target === 50) return 'Bullseye (50)';
  return target.toString();
}
