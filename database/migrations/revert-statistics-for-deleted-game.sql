-- Migration to add function for reverting statistics when a game is deleted
-- Date: 2025-04-20

-- Function to revert statistics when a completed game is deleted
CREATE OR REPLACE FUNCTION revert_statistics_for_deleted_game(game_id UUID)
RETURNS VOID AS $$
DECLARE
  game_record RECORD;
BEGIN
  -- First, check if the game exists and was completed
  SELECT * INTO game_record FROM games WHERE id = game_id;
  
  -- If game doesn't exist or wasn't completed, do nothing
  IF NOT FOUND OR game_record.status <> 'completed' THEN
    RAISE NOTICE 'Game % not found or was not completed. No statistics to revert.', game_id;
    RETURN;
  END IF;
  
  -- Get all player data and turn data needed to revert statistics
  WITH game_summary AS (
    SELECT 
      gp.player_id,
      gp.player_type,
      gp.winner,
      game_record.type AS game_type,
      (
        SELECT COALESCE(SUM(
          CASE 
            WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3]
            WHEN array_length(t.scores, 1) = 2 THEN t.scores[1] + t.scores[2]
            WHEN array_length(t.scores, 1) = 1 THEN t.scores[1]
            ELSE 0 
          END), 0)
        FROM turns t
        WHERE t.game_id = game_id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
      ) AS total_score,
      (
        SELECT COUNT(*)
        FROM turns t
        WHERE t.game_id = game_id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
          AND array_length(t.scores, 1) = 3 AND t.scores[1] + t.scores[2] + t.scores[3] = 180
      ) AS count_180,
      (
        SELECT COALESCE(SUM(array_length(t.scores, 1)), 0)
        FROM turns t
        WHERE t.game_id = game_id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
      ) AS total_darts
    FROM game_players gp
    WHERE gp.game_id = game_id
  )
  -- Update statistics for each player
  UPDATE statistics s
  SET 
    games_played = s.games_played - 1,
    games_won = s.games_won - (CASE WHEN gs.winner THEN 1 ELSE 0 END),
    total_score = s.total_score - gs.total_score,
    -- Don't adjust highest_turn as it's a max value that might apply to other games
    -- Recalculate average_per_dart based on updated totals
    average_per_dart = CASE 
      WHEN s.games_played - 1 > 0 THEN
        (s.total_score - gs.total_score)::NUMERIC / 
        (SELECT COALESCE(SUM(array_length(t.scores, 1)), 0) 
         FROM turns t 
         WHERE t.player_id = s.player_id 
         AND t.player_type = s.player_type 
         AND t.game_id IN (
           SELECT g.id FROM games g 
           WHERE g.status = 'completed' 
           AND g.id <> game_id
         ))
      ELSE 0
    END,
    count_180 = s.count_180 - gs.count_180,
    last_updated = NOW()
  FROM game_summary gs
  WHERE s.player_id = gs.player_id
    AND s.player_type = gs.player_type
    AND s.game_type = gs.game_type;
    
  -- Also revert rivalry updates
  WITH game_winners AS (
    SELECT 
      player_id,
      player_type
    FROM game_players
    WHERE game_id = game_id AND winner = TRUE
  ),
  game_losers AS (
    SELECT 
      player_id,
      player_type
    FROM game_players
    WHERE game_id = game_id AND winner = FALSE
  ),
  rivalry_pairs AS (
    SELECT 
      w.player_id AS winner_id,
      w.player_type AS winner_type,
      l.player_id AS loser_id,
      l.player_type AS loser_type
    FROM game_winners w
    CROSS JOIN game_losers l
  )
  -- For each winner-loser pair, update the rivalry record
  UPDATE rivals r
  SET
    player1_wins = CASE 
      WHEN r.player1_id = rp.winner_id THEN GREATEST(r.player1_wins - 1, 0)
      ELSE r.player1_wins
    END,
    player2_wins = CASE 
      WHEN r.player2_id = rp.winner_id THEN GREATEST(r.player2_wins - 1, 0)
      ELSE r.player2_wins
    END,
    -- Don't update last_game_id as it should point to a valid game
    last_game_id = (
      SELECT g.id 
      FROM games g
      JOIN game_players gp1 ON g.id = gp1.game_id AND gp1.player_id = r.player1_id AND gp1.player_type = r.player1_type
      JOIN game_players gp2 ON g.id = gp2.game_id AND gp2.player_id = r.player2_id AND gp2.player_type = r.player2_type
      WHERE g.status = 'completed' AND g.id <> game_id
      ORDER BY g.completed_at DESC NULLS LAST
      LIMIT 1
    )
  FROM rivalry_pairs rp
  WHERE (r.player1_id = rp.winner_id AND r.player2_id = rp.loser_id)
     OR (r.player2_id = rp.winner_id AND r.player1_id = rp.loser_id);
     
  RAISE NOTICE 'Statistics reverted for game %', game_id;
END;
$$ LANGUAGE plpgsql;

-- Log that migration was successful
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: added revert_statistics_for_deleted_game function';
END $$; 