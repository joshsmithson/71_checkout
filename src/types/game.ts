// Shared game types for ActiveGame and ActiveATWGame

export interface Player {
  id: string;
  type: 'user' | 'friend';
  name: string;
  order: number;
  score: number;
  startingScore: number;
}

export interface Turn {
  id: string;
  player_id: string;
  player_type: string;
  game_id: string;
  turn_number: number;
  scores: number[];
  remaining: number;
  checkout: boolean;
}

export interface RevertTurnState {
  open: boolean;
  turnId: string;
  turnInfo: string;
  affectedCount: number;
}

export type GameStatus = 'active' | 'paused' | 'completed';
