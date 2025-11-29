-- Migration: Add Killer game mode support

-- First, drop the existing constraint on games table
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_type_check;

-- Add new constraint that includes Killer variants
ALTER TABLE games ADD CONSTRAINT games_type_check
  CHECK (type IN ('301', '501', '701', 'atw_1_20', 'atw_1_20_bull', 'atw_1_20_25_bull', 'killer_3', 'killer_5', 'killer_7'));

-- Update statistics table constraint
ALTER TABLE statistics DROP CONSTRAINT IF EXISTS statistics_game_type_check;
ALTER TABLE statistics ADD CONSTRAINT statistics_game_type_check
  CHECK (game_type IN ('301', '501', '701', 'atw_1_20', 'atw_1_20_bull', 'atw_1_20_25_bull', 'killer_3', 'killer_5', 'killer_7'));

-- Create a new table to track Killer game progress
CREATE TABLE IF NOT EXISTS killer_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_type TEXT NOT NULL CHECK (player_type IN ('user', 'friend')),
  claimed_number INTEGER CHECK (claimed_number IS NULL OR (claimed_number >= 1 AND claimed_number <= 20)), -- The number this player has claimed (1-20)
  lives INTEGER NOT NULL DEFAULT 0 CHECK (lives >= 0), -- Current number of lives
  max_lives INTEGER NOT NULL DEFAULT 3 CHECK (max_lives IN (3, 5, 7)), -- Maximum lives based on game variant
  is_killer BOOLEAN NOT NULL DEFAULT FALSE, -- Whether player has reached killer status (lives >= 3)
  is_eliminated BOOLEAN NOT NULL DEFAULT FALSE, -- Whether player has been eliminated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id, player_type),
  UNIQUE(game_id, claimed_number) -- Each number can only be claimed by one player per game
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_killer_progress_game_id ON killer_progress(game_id);
CREATE INDEX IF NOT EXISTS idx_killer_progress_player ON killer_progress(player_id, player_type);
CREATE INDEX IF NOT EXISTS idx_killer_progress_claimed_number ON killer_progress(game_id, claimed_number);

-- Create RLS policies for killer_progress table
ALTER TABLE killer_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see progress for games they created or are playing in
CREATE POLICY "Users can view killer progress for their games" ON killer_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_id
      AND (g.creator_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM game_players gp
             WHERE gp.game_id = g.id
             AND gp.player_id = auth.uid()
             AND gp.player_type = 'user'
           ))
    )
  );

-- Policy: Users can insert progress for games they created
CREATE POLICY "Users can create killer progress for their games" ON killer_progress
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_id
      AND g.creator_id = auth.uid()
    )
  );

-- Policy: Users can update progress for games they created
CREATE POLICY "Users can update killer progress for their games" ON killer_progress
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_id
      AND g.creator_id = auth.uid()
    )
  );

-- Policy: Users can delete progress for games they created
CREATE POLICY "Users can delete killer progress for their games" ON killer_progress
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_id
      AND g.creator_id = auth.uid()
    )
  );
