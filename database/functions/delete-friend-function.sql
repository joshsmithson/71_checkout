-- Function to delete a friend and all their associated data
CREATE OR REPLACE FUNCTION delete_friend_and_data(friend_id UUID, creator_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSON;
  friend_record RECORD;
  deleted_games_count INTEGER := 0;
  deleted_turns_count INTEGER := 0;
  deleted_statistics_count INTEGER := 0;
  deleted_rivals_count INTEGER := 0;
BEGIN
  -- First, verify the friend exists and belongs to the creator
  SELECT * INTO friend_record FROM friends 
  WHERE id = friend_id AND creator_id = creator_user_id;
  
  IF NOT FOUND THEN
    result := json_build_object(
      'success', false,
      'message', 'Friend not found or you do not have permission to delete this friend',
      'timestamp', NOW()
    );
    RETURN result;
  END IF;
  
  -- Start deletion process in the correct order to avoid foreign key violations
  
  -- 1. Delete statistics records for this friend
  DELETE FROM statistics 
  WHERE player_id = friend_id AND player_type = 'friend';
  GET DIAGNOSTICS deleted_statistics_count = ROW_COUNT;
  
  -- 2. Delete rivalry records involving this friend
  DELETE FROM rivals 
  WHERE (player1_id = friend_id AND player1_type = 'friend') 
     OR (player2_id = friend_id AND player2_type = 'friend');
  GET DIAGNOSTICS deleted_rivals_count = ROW_COUNT;
  
  -- 3. Delete turns for this friend
  DELETE FROM turns 
  WHERE player_id = friend_id AND player_type = 'friend';
  GET DIAGNOSTICS deleted_turns_count = ROW_COUNT;
  
  -- 4. Delete game_players records for this friend
  DELETE FROM game_players 
  WHERE player_id = friend_id AND player_type = 'friend';
  
  -- 5. Delete games that now have no players (optional - could be games where only this friend participated)
  WITH games_without_players AS (
    SELECT g.id 
    FROM games g 
    WHERE g.creator_id = creator_user_id
      AND NOT EXISTS (
        SELECT 1 FROM game_players gp WHERE gp.game_id = g.id
      )
  )
  DELETE FROM games 
  WHERE id IN (SELECT id FROM games_without_players);
  GET DIAGNOSTICS deleted_games_count = ROW_COUNT;
  
  -- 6. Finally, delete the friend record itself
  DELETE FROM friends 
  WHERE id = friend_id AND creator_id = creator_user_id;
  
  -- Return success with summary
  result := json_build_object(
    'success', true,
    'message', 'Friend and all associated data deleted successfully',
    'friend_name', friend_record.name,
    'deleted_statistics', deleted_statistics_count,
    'deleted_rivals', deleted_rivals_count,
    'deleted_turns', deleted_turns_count,
    'deleted_games', deleted_games_count,
    'timestamp', NOW()
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error information
  result := json_build_object(
    'success', false,
    'message', 'Failed to delete friend: ' || SQLERRM,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$; 