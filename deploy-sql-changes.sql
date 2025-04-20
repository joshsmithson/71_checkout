-- Combined SQL for deployment
-- Generated at: 2025-04-20T00:22:05.262Z

-- Source: supabase-migrations/revert-statistics-for-deleted-game.sql
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

-- Source: supabase-migrations/recalculate-statistics-on-delete.sql
-- Migration to add function to recalculate statistics when a game is deleted
-- Date: 2025-04-20

-- Function to completely recalculate statistics after a game is deleted
CREATE OR REPLACE FUNCTION recalculate_statistics_after_game_deletion(game_id UUID)
RETURNS VOID AS $$
DECLARE
  game_record RECORD;
  player_record RECORD;
  game_type_record RECORD;
  rivalry_record RECORD;
BEGIN
  -- First, check if the game exists
  SELECT * INTO game_record FROM games WHERE id = game_id;
  
  -- If game doesn't exist, do nothing
  IF NOT FOUND THEN
    RAISE NOTICE 'Game % not found. No statistics to recalculate.', game_id;
    RETURN;
  END IF;
  
  -- Get all affected players from the game
  FOR player_record IN 
    SELECT DISTINCT player_id, player_type 
    FROM game_players 
    WHERE game_players.game_id = game_id
  LOOP
    -- Get all game types this player has played
    FOR game_type_record IN
      SELECT DISTINCT g.type 
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      WHERE gp.player_id = player_record.player_id
        AND gp.player_type = player_record.player_type
        AND g.status = 'completed'
    LOOP
      -- Recalculate all statistics for this player and game type
      WITH player_stats AS (
        SELECT
          player_record.player_id AS player_id,
          player_record.player_type AS player_type,
          game_type_record.type AS game_type,
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
          ) AS count_180
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        LEFT JOIN turns t ON g.id = t.game_id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
        WHERE g.status = 'completed'
          AND g.id <> game_id
          AND g.type = game_type_record.type
          AND gp.player_id = player_record.player_id
          AND gp.player_type = player_record.player_type
        GROUP BY 
          player_id, 
          player_type, 
          game_type
      )
      -- Update or delete the statistics record
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
        NOW()
      FROM player_stats
      WHERE games_played > 0
      ON CONFLICT (player_id, player_type, game_type) 
      DO UPDATE SET
        games_played = EXCLUDED.games_played,
        games_won = EXCLUDED.games_won,
        total_score = EXCLUDED.total_score,
        highest_turn = EXCLUDED.highest_turn,
        checkout_percentage = EXCLUDED.checkout_percentage,
        average_per_dart = EXCLUDED.average_per_dart,
        count_180 = EXCLUDED.count_180,
        last_updated = NOW();
        
      -- If there are no more games of this type, delete the statistics record
      DELETE FROM statistics 
      WHERE player_id = player_record.player_id
        AND player_type = player_record.player_type
        AND game_type = game_type_record.type
        AND NOT EXISTS (
          SELECT 1 
          FROM games g
          JOIN game_players gp ON g.id = gp.game_id
          WHERE g.status = 'completed'
            AND g.id <> game_id
            AND g.type = game_type_record.type
            AND gp.player_id = player_record.player_id
            AND gp.player_type = player_record.player_type
        );
    END LOOP;
    
    -- Get all rivalries this player is part of
    FOR rivalry_record IN
      SELECT DISTINCT 
        r.id,
        r.player1_id,
        r.player1_type,
        r.player2_id,
        r.player2_type
      FROM rivals r
      WHERE (r.player1_id = player_record.player_id AND r.player1_type = player_record.player_type) OR
            (r.player2_id = player_record.player_id AND r.player2_type = player_record.player_type)
    LOOP
      -- Recalculate wins
      WITH wins_summary AS (
        SELECT
          COUNT(CASE WHEN gp.player_id = rivalry_record.player1_id AND gp.player_type = rivalry_record.player1_type AND gp.winner THEN 1 ELSE NULL END) AS player1_wins,
          COUNT(CASE WHEN gp.player_id = rivalry_record.player2_id AND gp.player_type = rivalry_record.player2_type AND gp.winner THEN 1 ELSE NULL END) AS player2_wins,
          (SELECT g2.id FROM games g2 
           JOIN game_players gp1 ON g2.id = gp1.game_id AND gp1.player_id = rivalry_record.player1_id AND gp1.player_type = rivalry_record.player1_type
           JOIN game_players gp2 ON g2.id = gp2.game_id AND gp2.player_id = rivalry_record.player2_id AND gp2.player_type = rivalry_record.player2_type
           WHERE g2.status = 'completed'
           AND g2.id <> game_id
           ORDER BY g2.completed_at DESC NULLS LAST
           LIMIT 1) AS last_game_id
        FROM games g
        JOIN game_players gp1 ON g.id = gp1.game_id AND gp1.player_id = rivalry_record.player1_id AND gp1.player_type = rivalry_record.player1_type
        JOIN game_players gp2 ON g.id = gp2.game_id AND gp2.player_id = rivalry_record.player2_id AND gp2.player_type = rivalry_record.player2_type
        JOIN game_players gp ON g.id = gp.game_id
        WHERE g.status = 'completed'
          AND g.id <> game_id
      )
      -- Update or delete the rivalry
      UPDATE rivals
      SET
        player1_wins = ws.player1_wins,
        player2_wins = ws.player2_wins,
        last_game_id = ws.last_game_id
      FROM wins_summary ws
      WHERE id = rivalry_record.id
        AND (ws.player1_wins > 0 OR ws.player2_wins > 0);
      
      -- If there are no more games between these players, delete the rivalry
      DELETE FROM rivals
      WHERE id = rivalry_record.id
        AND NOT EXISTS (
          SELECT 1
          FROM games g
          JOIN game_players gp1 ON g.id = gp1.game_id AND gp1.player_id = rivalry_record.player1_id AND gp1.player_type = rivalry_record.player1_type
          JOIN game_players gp2 ON g.id = gp2.game_id AND gp2.player_id = rivalry_record.player2_id AND gp2.player_type = rivalry_record.player2_type
          WHERE g.status = 'completed'
            AND g.id <> game_id
        );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Statistics recalculated for all players in game %', game_id;
END;
$$ LANGUAGE plpgsql;

-- Log that migration was successful
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: added recalculate_statistics_after_game_deletion function';
END $$; 

-- Source: supabase-migrations/recalculate-all-statistics.sql
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

