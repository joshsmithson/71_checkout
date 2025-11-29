# Killer Darts Game Mode Implementation Plan

## Game Rules Summary
- **Number Claiming**: Each player throws at any segment (1-20) to claim their number
- **Lives**: Single=1 life, Double=2 lives, Triple=3 lives
- **Killer Status**: Achieved at 3 lives - can then attack other players
- **Self-hit Rule**: Killer hitting own number has no effect
- **Elimination**: Players with 0 lives (after being a killer) are eliminated and skipped
- **Win Condition**: Last player standing wins
- **Variants**: `killer_3` (max 3 lives), `killer_5` (max 5), `killer_7` (max 7)

## Files to Create

### 1. `/src/types/killer.ts`
Type definitions and helper functions:
```typescript
export type KillerGameType = 'killer_3' | 'killer_5' | 'killer_7';
export type KillerPhase = 'claiming' | 'building' | 'killer';

export interface KillerGameConfig {
  type: KillerGameType;
  maxLives: number;
  displayName: string;
  description: string;
}

export const KILLER_GAME_CONFIGS: Record<KillerGameType, KillerGameConfig>;

// Helper functions
export function isKillerGameType(gameType: string): gameType is KillerGameType;
export function getGamePhase(players: KillerPlayer[]): KillerPhase;
export function getClaimedNumbers(players: KillerPlayer[]): number[];
```

### 2. `/database/migrations/add-killer-support.sql`
Database migration:
- Update `games.type` constraint to include `killer_3`, `killer_5`, `killer_7`
- Update `statistics.game_type` constraint
- Create `killer_progress` table:
  - `game_id`, `player_id`, `player_type`
  - `claimed_number` (1-20, nullable, unique per game)
  - `lives` (0 to max_lives)
  - `max_lives` (3, 5, or 7)
  - `is_killer` (boolean)
  - `is_eliminated` (boolean)
- Add RLS policies matching `atw_progress` pattern

### 3. `/src/components/game/KillerScoreEntry.tsx`
Phase-adaptive score entry component with three modes:

**Claiming Phase**:
- 1-20 number grid
- Claimed numbers disabled
- Single dart per turn

**Building Phase**:
- Show player's number prominently
- Hit buttons: Single (+1), Double (+2), Triple (+3)
- Miss button
- 3 darts per turn
- Lives progress display

**Killer Phase**:
- Full number input (1-20)
- Show who owns each number
- Visual feedback on targets
- 3 darts per turn

### 4. `/src/pages/ActiveKillerGame.tsx`
Main game component handling:
- Loading game, players, and killer_progress
- Phase detection and transitions
- Turn management (skipping eliminated players)
- Score submission for each phase
- Winner detection

## Files to Modify

### 1. `/src/hooks/useSupabase.ts`
Add functions:
- `initializeKillerProgress(gameId, players, gameType)`
- `getKillerProgress(gameId)`
- `claimKillerNumber(gameId, playerId, playerType, number)`
- `updateKillerProgress(gameId, playerId, playerType, lives, isKiller, isEliminated)`
- `addKillerTurn(gameId, playerId, playerType, turnNumber, hits, livesAfter)`

### 2. `/src/types/supabase.ts`
Add `killer_progress` table type definitions.

### 3. `/src/pages/GameRouter.tsx`
Add routing:
```typescript
if (isKillerGameType(gameType)) {
  return <ActiveKillerGame />;
}
```

### 4. `/src/pages/GameSetup.tsx`
Add Killer game type options under "Party Games" section with all three variants.

## Implementation Order

1. **Database**: Create migration, run it
2. **Types**: Create `killer.ts`, update `supabase.ts`
3. **Hooks**: Add Killer functions to `useSupabase.ts`
4. **Setup**: Update `GameSetup.tsx` with Killer options
5. **Router**: Update `GameRouter.tsx` routing
6. **Score Entry**: Build `KillerScoreEntry.tsx`
7. **Active Game**: Build `ActiveKillerGame.tsx`
8. **Testing**: Test all phases and edge cases

## Key Implementation Details

### Phase Transitions
```
CLAIMING: All players have claimed_number === null
    ↓ (all players have claimed)
BUILDING: Any non-eliminated player has lives < 3
    ↓ (all non-eliminated players have lives >= 3)
KILLER: All non-eliminated players are killers
```

### Turn Skipping Logic
```typescript
const getNextPlayerIndex = (currentIndex: number, players: KillerPlayer[]): number => {
  let next = (currentIndex + 1) % players.length;
  while (players[next].progress.is_eliminated && next !== currentIndex) {
    next = (next + 1) % players.length;
  }
  return next;
};
```

### Score Submission by Phase
- **Claiming**: First hit on unclaimed 1-20 claims that number
- **Building**: Count hits on own number, add lives (capped at max)
- **Killer**: Hits on others' numbers remove their lives; hits on own number ignored

## Critical Reference Files
- `/src/types/around-the-world.ts` - Type definition pattern
- `/src/pages/ActiveATWGame.tsx` - Game component structure
- `/src/components/game/ATWScoreEntry.tsx` - Score entry pattern
- `/src/hooks/useSupabase.ts` - Database operations pattern
- `/database/migrations/add-around-the-world-support-fixed.sql` - Migration pattern
