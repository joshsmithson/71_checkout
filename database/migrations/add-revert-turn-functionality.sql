-- Function to revert game state to a specific turn
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
