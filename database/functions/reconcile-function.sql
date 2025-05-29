-- Function to reconcile statistics for a specific user
CREATE OR REPLACE FUNCTION reconcile_user_statistics(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  games_before INTEGER;
  games_after INTEGER;
  stats_record RECORD;
BEGIN
  -- Get current games count before reconciliation
  SELECT COALESCE(SUM(games_played), 0) INTO games_before
  FROM statistics 
  WHERE player_id = user_id AND player_type = 'user';
  
  -- Recalculate statistics for each game type this user has played
  FOR stats_record IN
    SELECT DISTINCT g.type AS game_type
    FROM games g
    JOIN game_players gp ON g.id = gp.game_id
    WHERE g.status = 'completed'
      AND gp.player_id = user_id
      AND gp.player_type = 'user'
  LOOP
    -- Calculate and insert/update statistics for this game type using UPSERT
    WITH calculated_stats AS (
      SELECT
        user_id AS player_id,
        'user' AS player_type,
        stats_record.game_type AS game_type,
        COUNT(DISTINCT g.id) AS games_played,
        COUNT(DISTINCT CASE WHEN gp.winner THEN g.id ELSE NULL END) AS games_won,
        COALESCE(SUM(
          CASE 
            WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3]
            WHEN array_length(t.scores, 1) = 2 THEN t.scores[1] + t.scores[2]
            WHEN array_length(t.scores, 1) = 1 THEN t.scores[1]
            ELSE 0 
          END
        ), 0) AS total_score,
        COALESCE(MAX(
          CASE 
            WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3]
            WHEN array_length(t.scores, 1) = 2 THEN t.scores[1] + t.scores[2]
            WHEN array_length(t.scores, 1) = 1 THEN t.scores[1]
            ELSE 0 
          END
        ), 0) AS highest_turn,
        CASE WHEN COUNT(t.id) > 0 THEN 
          (COUNT(CASE WHEN t.checkout THEN 1 ELSE NULL END)::NUMERIC / COUNT(t.id)) * 100 
        ELSE 0 END AS checkout_percentage,
        CASE WHEN SUM(array_length(t.scores, 1)) > 0 THEN 
          COALESCE(SUM(
            CASE 
              WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3]
              WHEN array_length(t.scores, 1) = 2 THEN t.scores[1] + t.scores[2]
              WHEN array_length(t.scores, 1) = 1 THEN t.scores[1]
              ELSE 0 
            END
          ), 0)::NUMERIC / SUM(array_length(t.scores, 1))
        ELSE 0 END AS average_per_dart,
        COUNT(
          CASE WHEN array_length(t.scores, 1) = 3 AND t.scores[1] + t.scores[2] + t.scores[3] = 180 
          THEN 1 ELSE NULL END
        ) AS count_180,
        NOW() AS last_updated
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      LEFT JOIN turns t ON g.id = t.game_id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
      WHERE g.status = 'completed'
        AND g.type = stats_record.game_type
        AND gp.player_id = user_id
        AND gp.player_type = 'user'
      GROUP BY g.type
    )
    INSERT INTO statistics (
      player_id,
      player_type,
      game_type,
      games_played,
      games_won,
      total_score,
      highest_turn,
      checkout_percentage,
      average_per_dart,
      count_180,
      last_updated
    )
    SELECT
      player_id,
      player_type,
      game_type,
      games_played,
      games_won,
      total_score,
      highest_turn,
      checkout_percentage,
      average_per_dart,
      count_180,
      last_updated
    FROM calculated_stats
    ON CONFLICT (player_id, player_type, game_type) 
    DO UPDATE SET
      games_played = EXCLUDED.games_played,
      games_won = EXCLUDED.games_won,
      total_score = EXCLUDED.total_score,
      highest_turn = EXCLUDED.highest_turn,
      checkout_percentage = EXCLUDED.checkout_percentage,
      average_per_dart = EXCLUDED.average_per_dart,
      count_180 = EXCLUDED.count_180,
      last_updated = EXCLUDED.last_updated;
  END LOOP;
  
  -- Delete any statistics records for game types this user no longer has completed games for
  DELETE FROM statistics 
  WHERE player_id = user_id 
    AND player_type = 'user'
    AND game_type NOT IN (
      SELECT DISTINCT g.type
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      WHERE g.status = 'completed'
        AND gp.player_id = user_id
        AND gp.player_type = 'user'
    );
  
  -- Get games count after reconciliation
  SELECT COALESCE(SUM(games_played), 0) INTO games_after
  FROM statistics 
  WHERE player_id = user_id AND player_type = 'user';
  
  -- Return summary of changes
  result := json_build_object(
    'success', true,
    'message', 'Statistics reconciled successfully',
    'games_before', games_before,
    'games_after', games_after,
    'difference', games_after - games_before,
    'timestamp', NOW()
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error information
  result := json_build_object(
    'success', false,
    'message', 'Failed to reconcile statistics: ' || SQLERRM,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql; 