-- Migration to recalculate all statistics in the database
-- Date: 2025-04-20

-- Function to recalculate all statistics for all players
CREATE OR REPLACE FUNCTION recalculate_all_statistics()
RETURNS VOID AS $$
DECLARE
  player_record RECORD;
  game_type_record TEXT;
BEGIN
  -- Clear all statistics first to ensure clean recalculation
  DELETE FROM statistics;
  
  -- Get all distinct player/type combinations that have played games
  FOR player_record IN 
    SELECT DISTINCT player_id, player_type 
    FROM game_players
  LOOP
    -- Get all distinct game types
    FOR game_type_record IN 
      SELECT DISTINCT g.type 
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      WHERE g.status = 'completed'
        AND gp.player_id = player_record.player_id
        AND gp.player_type = player_record.player_type
    LOOP
      -- Calculate statistics for this player and game type
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
        player_record.player_id,
        player_record.player_type,
        game_type_record,
        COUNT(DISTINCT g.id),
        COUNT(DISTINCT CASE WHEN gp.winner THEN g.id ELSE NULL END),
        COALESCE(SUM(
          CASE 
            WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3]
            WHEN array_length(t.scores, 1) = 2 THEN t.scores[1] + t.scores[2]
            WHEN array_length(t.scores, 1) = 1 THEN t.scores[1]
            ELSE 0 
          END
        ), 0),
        COALESCE(MAX(
          CASE 
            WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3]
            WHEN array_length(t.scores, 1) = 2 THEN t.scores[1] + t.scores[2]
            WHEN array_length(t.scores, 1) = 1 THEN t.scores[1]
            ELSE 0 
          END
        ), 0),
        CASE WHEN COUNT(t.id) > 0 THEN 
          (COUNT(CASE WHEN t.checkout THEN 1 ELSE NULL END)::NUMERIC / COUNT(t.id)) * 100 
        ELSE 0 END,
        CASE WHEN SUM(array_length(t.scores, 1)) > 0 THEN 
          COALESCE(SUM(
            CASE 
              WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3]
              WHEN array_length(t.scores, 1) = 2 THEN t.scores[1] + t.scores[2]
              WHEN array_length(t.scores, 1) = 1 THEN t.scores[1]
              ELSE 0 
            END
          ), 0)::NUMERIC / SUM(array_length(t.scores, 1))
        ELSE 0 END,
        COUNT(
          CASE WHEN array_length(t.scores, 1) = 3 AND t.scores[1] + t.scores[2] + t.scores[3] = 180 
          THEN 1 ELSE NULL END
        ),
        NOW()
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      LEFT JOIN turns t ON g.id = t.game_id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
      WHERE g.status = 'completed'
        AND g.type = game_type_record
        AND gp.player_id = player_record.player_id
        AND gp.player_type = player_record.player_type
      GROUP BY 
        player_record.player_id, 
        player_record.player_type, 
        game_type_record;
        
      RAISE NOTICE 'Recalculated statistics for player % % and game type %', 
        player_record.player_id, player_record.player_type, game_type_record;
    END LOOP;
  END LOOP;
  
  -- Now recalculate all rivalry statistics
  -- First, clear all wins
  UPDATE rivals SET player1_wins = 0, player2_wins = 0;
  
  -- Now recalculate based on existing games
  WITH rivalry_wins AS (
    SELECT
      r.id,
      COUNT(CASE WHEN gp.player_id = r.player1_id AND gp.player_type = r.player1_type AND gp.winner THEN 1 ELSE NULL END) AS player1_wins,
      COUNT(CASE WHEN gp.player_id = r.player2_id AND gp.player_type = r.player2_type AND gp.winner THEN 1 ELSE NULL END) AS player2_wins,
      (SELECT g2.id FROM games g2 
       JOIN game_players gp3 ON g2.id = gp3.game_id AND gp3.player_id = r.player1_id AND gp3.player_type = r.player1_type
       JOIN game_players gp4 ON g2.id = gp4.game_id AND gp4.player_id = r.player2_id AND gp4.player_type = r.player2_type
       WHERE g2.status = 'completed'
       ORDER BY g2.completed_at DESC NULLS LAST
       LIMIT 1) AS last_game_id
    FROM rivals r
    JOIN game_players gp1 ON gp1.player_id = r.player1_id AND gp1.player_type = r.player1_type
    JOIN game_players gp2 ON gp2.game_id = gp1.game_id AND gp2.player_id = r.player2_id AND gp2.player_type = r.player2_type
    JOIN games g ON g.id = gp1.game_id
    JOIN game_players gp ON gp.game_id = g.id
    WHERE g.status = 'completed'
    GROUP BY r.id
  )
  UPDATE rivals r
  SET
    player1_wins = rw.player1_wins,
    player2_wins = rw.player2_wins,
    last_game_id = rw.last_game_id
  FROM rivalry_wins rw
  WHERE r.id = rw.id;
  
  -- Delete any rivals with no games
  DELETE FROM rivals r
  WHERE NOT EXISTS (
    SELECT 1
    FROM games g
    JOIN game_players gp1 ON g.id = gp1.game_id AND gp1.player_id = r.player1_id AND gp1.player_type = r.player1_type
    JOIN game_players gp2 ON g.id = gp2.game_id AND gp2.player_id = r.player2_id AND gp2.player_type = r.player2_type
    WHERE g.status = 'completed'
  );
  
  RAISE NOTICE 'All statistics have been recalculated successfully';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to recalculate all statistics
SELECT recalculate_all_statistics();

-- Log that migration was successful
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: recalculated all statistics';
END $$; 