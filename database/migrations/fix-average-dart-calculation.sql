-- Migration script to recalculate average_per_dart for all players
-- This fixes historical data after the average_per_dart calculation bugfix

-- First create a temporary function to recalculate player statistics
CREATE OR REPLACE FUNCTION temp_recalculate_player_statistics()
RETURNS VOID AS $$
DECLARE
  stat_record RECORD;
  player_total_score NUMERIC;
  player_total_darts NUMERIC;
BEGIN
  -- For each statistics record
  FOR stat_record IN SELECT * FROM statistics LOOP
    -- Calculate the total score for this player in completed games of this type
    SELECT COALESCE(SUM(
      CASE 
        WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3]
        WHEN array_length(t.scores, 1) = 2 THEN t.scores[1] + t.scores[2]
        WHEN array_length(t.scores, 1) = 1 THEN t.scores[1]
        ELSE 0 
      END
    ), 0) INTO player_total_score
    FROM turns t
    JOIN games g ON t.game_id = g.id
    WHERE t.player_id = stat_record.player_id
    AND t.player_type = stat_record.player_type
    AND g.type = stat_record.game_type
    AND g.status = 'completed';
    
    -- Calculate the total darts thrown by this player in completed games of this type
    SELECT COALESCE(SUM(array_length(t.scores, 1)), 0) INTO player_total_darts
    FROM turns t
    JOIN games g ON t.game_id = g.id
    WHERE t.player_id = stat_record.player_id
    AND t.player_type = stat_record.player_type
    AND g.type = stat_record.game_type
    AND g.status = 'completed';
    
    -- Update the average_per_dart with the correct calculation
    UPDATE statistics
    SET 
      average_per_dart = CASE WHEN player_total_darts > 0 THEN player_total_score / player_total_darts ELSE 0 END,
      last_updated = NOW()
    WHERE id = stat_record.id;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to update all statistics
SELECT temp_recalculate_player_statistics();

-- Drop the temporary function when done
DROP FUNCTION IF EXISTS temp_recalculate_player_statistics();

-- Output a message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: average_per_dart values have been recalculated for all players';
END $$; 