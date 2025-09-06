-- Migration: Add Around the World game support
-- Fixed version addressing the UUID = text operator error

-- First, drop the existing constraint on games table
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_type_check;

-- Add new constraint that includes Around the World variants
ALTER TABLE games ADD CONSTRAINT games_type_check 
  CHECK (type IN ('301', '501', '701', 'atw_1_20', 'atw_1_20_bull', 'atw_1_20_25_bull'));

-- Update statistics table constraint
ALTER TABLE statistics DROP CONSTRAINT IF EXISTS statistics_game_type_check;
ALTER TABLE statistics ADD CONSTRAINT statistics_game_type_check 
  CHECK (game_type IN ('301', '501', '701', 'atw_1_20', 'atw_1_20_bull', 'atw_1_20_25_bull'));

-- Create a new table to track Around the World game progress
CREATE TABLE IF NOT EXISTS atw_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_type TEXT NOT NULL CHECK (player_type IN ('user', 'friend')),
  current_target INTEGER NOT NULL DEFAULT 1, -- Current number they need to hit (1-20, 25=25, 50=bullseye)
  sequence_position INTEGER NOT NULL DEFAULT 1, -- Position in the sequence (1-based)
  completed_targets INTEGER[] DEFAULT '{}', -- Array of completed targets for tracking
  multiplier_advances BOOLEAN DEFAULT FALSE, -- Whether doubles/triples advance extra spaces
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id, player_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_atw_progress_game_id ON atw_progress(game_id);
CREATE INDEX IF NOT EXISTS idx_atw_progress_player ON atw_progress(player_id, player_type);

-- Create RLS policies for atw_progress table
ALTER TABLE atw_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see progress for games they created or are playing in
-- FIXED: Removed ::text casting from auth.uid() comparison with UUID column
CREATE POLICY "Users can view ATW progress for their games" ON atw_progress
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
CREATE POLICY "Users can create ATW progress for their games" ON atw_progress
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g 
      WHERE g.id = game_id 
      AND g.creator_id = auth.uid()
    )
  );

-- Policy: Users can update progress for games they created
CREATE POLICY "Users can update ATW progress for their games" ON atw_progress
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM games g 
      WHERE g.id = game_id 
      AND g.creator_id = auth.uid()
    )
  );

-- Policy: Users can delete progress for games they created
CREATE POLICY "Users can delete ATW progress for their games" ON atw_progress
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM games g 
      WHERE g.id = game_id 
      AND g.creator_id = auth.uid()
    )
  );
