-- Deploy updated functions with search_path security fix
-- Run this in Supabase SQL Editor to update the remaining 3 functions

-- 1. Update revert_to_turn function
CREATE OR REPLACE FUNCTION revert_to_turn(target_turn_id UUID)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_turn RECORD;
    affected_turns_count INTEGER;
    game_record RECORD;
    player_record RECORD;
    result JSON;
BEGIN
    -- Get the target turn details
    SELECT * INTO target_turn 
    FROM turns 
    WHERE id = target_turn_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Turn not found'
        );
    END IF;
    
    -- Get game details
    SELECT * INTO game_record 
    FROM games 
    WHERE id = target_turn.game_id;
    
    -- Don't allow reverting completed games
    IF game_record.status = 'completed' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot revert turns in completed games'
        );
    END IF;
    
    -- Skip ATW games for now as requested
    IF game_record.type LIKE 'atw_%' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ATW game reversion not yet supported'
        );
    END IF;
    
    -- Count how many turns will be affected (deleted)
    SELECT COUNT(*) INTO affected_turns_count
    FROM turns 
    WHERE game_id = target_turn.game_id 
    AND created_at > target_turn.created_at;
    
    -- Start transaction for data consistency
    BEGIN
        -- Delete all turns that came after the target turn
        DELETE FROM turns 
        WHERE game_id = target_turn.game_id 
        AND created_at > target_turn.created_at;
        
        -- Recalculate each player's current remaining score
        -- by replaying all remaining turns from the beginning
        FOR player_record IN 
            SELECT DISTINCT player_id, player_type, starting_score
            FROM game_players 
            WHERE game_id = target_turn.game_id
        LOOP
            -- Calculate total score from remaining turns
            DECLARE
                total_scored INTEGER := 0;
                new_remaining INTEGER;
            BEGIN
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN array_length(scores, 1) >= 1 THEN scores[1] ELSE 0 
                    END +
                    CASE 
                        WHEN array_length(scores, 1) >= 2 THEN scores[2] ELSE 0 
                    END +
                    CASE 
                        WHEN array_length(scores, 1) >= 3 THEN scores[3] ELSE 0 
                    END
                ), 0) INTO total_scored
                FROM turns 
                WHERE game_id = target_turn.game_id 
                AND player_id = player_record.player_id 
                AND player_type = player_record.player_type;
                
                new_remaining := player_record.starting_score - total_scored;
                
                -- Update the player's remaining score in the last turn
                UPDATE turns 
                SET remaining = new_remaining
                WHERE game_id = target_turn.game_id 
                AND player_id = player_record.player_id 
                AND player_type = player_record.player_type
                AND created_at = (
                    SELECT MAX(created_at) 
                    FROM turns t2 
                    WHERE t2.game_id = target_turn.game_id 
                    AND t2.player_id = player_record.player_id 
                    AND t2.player_type = player_record.player_type
                );
            END;
        END LOOP;
        
        -- Reset any winner status since we're reverting
        UPDATE game_players 
        SET winner = false 
        WHERE game_id = target_turn.game_id;
        
        -- Mark the target turn as edited for audit trail
        UPDATE turns 
        SET edited = true, edited_at = NOW()
        WHERE id = target_turn_id;
        
        -- Build success response
        result := json_build_object(
            'success', true,
            'affected_turns_count', affected_turns_count,
            'reverted_to_turn', target_turn.turn_number,
            'reverted_to_player', target_turn.player_id,
            'game_id', target_turn.game_id
        );
        
    EXCEPTION WHEN others THEN
        -- Rollback on any error
        RAISE;
    END;
    
    RETURN result;
END;
$$;

-- 2. Update recalculate_all_statistics function
CREATE OR REPLACE FUNCTION recalculate_all_statistics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- 3. Update recalculate_statistics_after_game_deletion function
CREATE OR REPLACE FUNCTION recalculate_statistics_after_game_deletion(game_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
          AND g.type = game_type_record.type
          AND gp.player_id = player_record.player_id
          AND gp.player_type = player_record.player_type
        GROUP BY 
          player_record.player_id,
          player_record.player_type,
          game_type_record.type
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
        NOW()
      FROM player_stats
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
        
      RAISE NOTICE 'Recalculated statistics for player % % and game type %',
        player_record.player_id, player_record.player_type, game_type_record.type;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Statistics recalculated for all players in game %', game_id;
END;
$$;
