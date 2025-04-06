-- Function to update statistics after a game is completed
CREATE OR REPLACE FUNCTION update_statistics_after_game()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed games
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Update statistics for each player in the game
    WITH game_summary AS (
      SELECT 
        gp.player_id,
        gp.player_type,
        gp.winner,
        NEW.type AS game_type,
        (
          SELECT COALESCE(SUM(CASE WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3] ELSE 0 END), 0)
          FROM turns t
          WHERE t.game_id = NEW.id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
        ) AS total_score,
        (
          SELECT COALESCE(MAX(CASE WHEN array_length(t.scores, 1) = 3 THEN t.scores[1] + t.scores[2] + t.scores[3] ELSE 0 END), 0)
          FROM turns t
          WHERE t.game_id = NEW.id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
        ) AS highest_turn,
        (
          SELECT COUNT(*)
          FROM turns t
          WHERE t.game_id = NEW.id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
            AND array_length(t.scores, 1) = 3 AND t.scores[1] + t.scores[2] + t.scores[3] = 180
        ) AS count_180,
        (
          SELECT COUNT(*)
          FROM turns t
          WHERE t.game_id = NEW.id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
            AND t.checkout = TRUE
        ) AS checkouts,
        (
          SELECT COUNT(*)
          FROM turns t
          WHERE t.game_id = NEW.id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
        ) AS total_turns,
        (
          SELECT COALESCE(SUM(array_length(t.scores, 1)), 0)
          FROM turns t
          WHERE t.game_id = NEW.id AND t.player_id = gp.player_id AND t.player_type = gp.player_type
        ) AS total_darts
      FROM game_players gp
      WHERE gp.game_id = NEW.id
    )
    -- Insert or update statistics for each player
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
      gs.player_id,
      gs.player_type,
      gs.game_type,
      1, -- games_played increment
      CASE WHEN gs.winner THEN 1 ELSE 0 END, -- games_won increment
      gs.total_score,
      gs.highest_turn,
      CASE WHEN gs.total_turns > 0 THEN 
        (gs.checkouts::NUMERIC / gs.total_turns) * 100 
      ELSE 0 END,
      CASE WHEN gs.total_darts > 0 THEN 
        gs.total_score::NUMERIC / gs.total_darts 
      ELSE 0 END,
      gs.count_180,
      NOW()
    FROM game_summary gs
    ON CONFLICT (player_id, player_type, game_type) 
    DO UPDATE SET
      games_played = statistics.games_played + 1,
      games_won = statistics.games_won + CASE WHEN EXCLUDED.games_won > 0 THEN 1 ELSE 0 END,
      total_score = statistics.total_score + EXCLUDED.total_score,
      highest_turn = GREATEST(statistics.highest_turn, EXCLUDED.highest_turn),
      checkout_percentage = (
        (statistics.checkout_percentage * statistics.games_played + EXCLUDED.checkout_percentage) / 
        (statistics.games_played + 1)
      ),
      average_per_dart = (
        (statistics.average_per_dart * statistics.games_played + EXCLUDED.average_per_dart) / 
        (statistics.games_played + 1)
      ),
      count_180 = statistics.count_180 + EXCLUDED.count_180,
      last_updated = NOW();

    -- Update rivalries
    WITH game_winners AS (
      SELECT 
        player_id,
        player_type
      FROM game_players
      WHERE game_id = NEW.id AND winner = TRUE
    ),
    game_losers AS (
      SELECT 
        player_id,
        player_type
      FROM game_players
      WHERE game_id = NEW.id AND winner = FALSE
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
    -- For each winner-loser pair, update or create a rivalry record
    INSERT INTO rivals (
      player1_id,
      player1_type,
      player2_id,
      player2_type,
      player1_wins,
      player2_wins,
      last_game_id,
      creator_id
    )
    SELECT
      rp.winner_id,
      rp.winner_type,
      rp.loser_id,
      rp.loser_type,
      1, -- winner gets a win
      0, -- loser gets nothing
      NEW.id,
      NEW.creator_id
    FROM rivalry_pairs rp
    ON CONFLICT (player1_id, player2_id, creator_id) 
    DO UPDATE SET
      player1_wins = CASE 
        WHEN rivals.player1_id = EXCLUDED.player1_id THEN rivals.player1_wins + 1
        ELSE rivals.player1_wins
      END,
      player2_wins = CASE 
        WHEN rivals.player2_id = EXCLUDED.player1_id THEN rivals.player2_wins + 1
        ELSE rivals.player2_wins
      END,
      last_game_id = EXCLUDED.last_game_id;
      
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update statistics when a game is completed
CREATE TRIGGER update_stats_on_game_complete
AFTER UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_statistics_after_game();

-- Function to calculate leaderboard
CREATE OR REPLACE FUNCTION calculate_leaderboard(user_id UUID)
RETURNS TABLE (
  player_id UUID,
  player_type TEXT,
  player_name TEXT,
  games_played BIGINT,
  games_won BIGINT,
  win_percentage NUMERIC,
  average_per_dart NUMERIC,
  highest_turn INTEGER,
  count_180 BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH player_stats AS (
    -- User stats
    SELECT 
      u.id AS player_id,
      'user' AS player_type,
      u.raw_user_meta_data->>'name' AS player_name,
      COALESCE(SUM(s.games_played), 0) AS games_played,
      COALESCE(SUM(s.games_won), 0) AS games_won,
      COALESCE(AVG(s.average_per_dart), 0) AS average_per_dart,
      COALESCE(MAX(s.highest_turn), 0) AS highest_turn,
      COALESCE(SUM(s.count_180), 0) AS count_180
    FROM auth.users u
    LEFT JOIN statistics s ON u.id = s.player_id AND s.player_type = 'user'
    WHERE u.id = user_id
    GROUP BY u.id, u.raw_user_meta_data->>'name'
    
    UNION ALL
    
    -- Friend stats for the user
    SELECT 
      f.id AS player_id,
      'friend' AS player_type,
      f.name AS player_name,
      COALESCE(SUM(s.games_played), 0) AS games_played,
      COALESCE(SUM(s.games_won), 0) AS games_won,
      COALESCE(AVG(s.average_per_dart), 0) AS average_per_dart,
      COALESCE(MAX(s.highest_turn), 0) AS highest_turn,
      COALESCE(SUM(s.count_180), 0) AS count_180
    FROM friends f
    LEFT JOIN statistics s ON f.id = s.player_id AND s.player_type = 'friend'
    WHERE f.creator_id = user_id
    GROUP BY f.id, f.name
  )
  SELECT 
    ps.player_id,
    ps.player_type,
    ps.player_name,
    ps.games_played,
    ps.games_won,
    CASE WHEN ps.games_played > 0 THEN 
      (ps.games_won::NUMERIC / ps.games_played) * 100 
    ELSE 0 END AS win_percentage,
    ps.average_per_dart,
    ps.highest_turn,
    ps.count_180
  FROM player_stats ps
  ORDER BY 
    win_percentage DESC,
    ps.games_won DESC,
    ps.average_per_dart DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get rivalry stats between two players
CREATE OR REPLACE FUNCTION get_rivalry_stats(player1_id UUID, player2_id UUID)
RETURNS TABLE (
  player1_wins INTEGER,
  player2_wins INTEGER,
  total_games INTEGER,
  last_game_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(r.player1_wins, 0) AS player1_wins,
    COALESCE(r.player2_wins, 0) AS player2_wins,
    COALESCE(r.player1_wins, 0) + COALESCE(r.player2_wins, 0) AS total_games,
    g.completed_at AS last_game_date
  FROM rivals r
  LEFT JOIN games g ON r.last_game_id = g.id
  WHERE 
    (r.player1_id = player1_id AND r.player2_id = player2_id) OR
    (r.player1_id = player2_id AND r.player2_id = player1_id)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to suggest checkout combinations
CREATE OR REPLACE FUNCTION suggest_checkout(remaining_score INTEGER)
RETURNS TEXT[] AS $$
DECLARE
  suggestion TEXT[];
BEGIN
  -- Only provide suggestions for valid checkout scores (170 or less)
  IF remaining_score > 170 OR remaining_score <= 0 THEN
    RETURN ARRAY['No checkout possible'];
  END IF;
  
  -- Common checkout suggestions
  CASE remaining_score
    WHEN 170 THEN suggestion := ARRAY['T20', 'T20', 'Bull'];
    WHEN 167 THEN suggestion := ARRAY['T20', 'T19', 'Bull'];
    WHEN 164 THEN suggestion := ARRAY['T20', 'T18', 'Bull'];
    WHEN 161 THEN suggestion := ARRAY['T20', 'T17', 'Bull'];
    WHEN 160 THEN suggestion := ARRAY['T20', 'T20', 'D20'];
    WHEN 158 THEN suggestion := ARRAY['T20', 'T20', 'D19'];
    WHEN 157 THEN suggestion := ARRAY['T20', 'T19', 'D20'];
    WHEN 156 THEN suggestion := ARRAY['T20', 'T20', 'D18'];
    WHEN 155 THEN suggestion := ARRAY['T20', 'T19', 'D19'];
    WHEN 154 THEN suggestion := ARRAY['T20', 'T18', 'D20'];
    WHEN 153 THEN suggestion := ARRAY['T20', 'T19', 'D18'];
    WHEN 152 THEN suggestion := ARRAY['T20', 'T20', 'D16'];
    WHEN 151 THEN suggestion := ARRAY['T20', 'T17', 'D20'];
    WHEN 150 THEN suggestion := ARRAY['T20', 'T18', 'D18'];
    WHEN 149 THEN suggestion := ARRAY['T20', 'T19', 'D16'];
    WHEN 148 THEN suggestion := ARRAY['T20', 'T20', 'D14'];
    WHEN 147 THEN suggestion := ARRAY['T20', 'T17', 'D18'];
    WHEN 146 THEN suggestion := ARRAY['T20', 'T18', 'D16'];
    WHEN 145 THEN suggestion := ARRAY['T20', 'T19', 'D14'];
    WHEN 144 THEN suggestion := ARRAY['T20', 'T20', 'D12'];
    WHEN 143 THEN suggestion := ARRAY['T20', 'T17', 'D16'];
    WHEN 142 THEN suggestion := ARRAY['T20', 'T14', 'D20'];
    WHEN 141 THEN suggestion := ARRAY['T20', 'T19', 'D12'];
    WHEN 140 THEN suggestion := ARRAY['T20', 'T20', 'D10'];
    WHEN 139 THEN suggestion := ARRAY['T20', 'T13', 'D20'];
    WHEN 138 THEN suggestion := ARRAY['T20', 'T18', 'D12'];
    WHEN 137 THEN suggestion := ARRAY['T20', 'T19', 'D10'];
    WHEN 136 THEN suggestion := ARRAY['T20', 'T20', 'D8'];
    WHEN 135 THEN suggestion := ARRAY['T20', 'T15', 'D15'];
    WHEN 134 THEN suggestion := ARRAY['T20', 'T14', 'D16'];
    WHEN 133 THEN suggestion := ARRAY['T20', 'T19', 'D8'];
    WHEN 132 THEN suggestion := ARRAY['T20', 'T16', 'D12'];
    WHEN 131 THEN suggestion := ARRAY['T20', 'T13', 'D16'];
    WHEN 130 THEN suggestion := ARRAY['T20', 'T18', 'D8'];
    WHEN 129 THEN suggestion := ARRAY['T19', 'T16', 'D12'];
    WHEN 128 THEN suggestion := ARRAY['T20', 'T16', 'D10'];
    WHEN 127 THEN suggestion := ARRAY['T20', 'T17', 'D8'];
    WHEN 126 THEN suggestion := ARRAY['T19', 'T19', 'D6'];
    WHEN 125 THEN suggestion := ARRAY['T20', 'T15', 'D10'];
    WHEN 124 THEN suggestion := ARRAY['T20', 'T16', 'D8'];
    WHEN 123 THEN suggestion := ARRAY['T19', 'T16', 'D9'];
    WHEN 122 THEN suggestion := ARRAY['T18', 'T18', 'D7'];
    WHEN 121 THEN suggestion := ARRAY['T20', 'T11', 'D14'];
    WHEN 120 THEN suggestion := ARRAY['T20', 'S20', 'D20'];
    WHEN 119 THEN suggestion := ARRAY['T19', 'T12', 'D13'];
    WHEN 118 THEN suggestion := ARRAY['T20', '18', 'D20'];
    WHEN 117 THEN suggestion := ARRAY['T20', '17', 'D20'];
    WHEN 116 THEN suggestion := ARRAY['T20', '16', 'D20'];
    WHEN 115 THEN suggestion := ARRAY['T20', '15', 'D20'];
    WHEN 114 THEN suggestion := ARRAY['T20', '14', 'D20'];
    WHEN 113 THEN suggestion := ARRAY['T20', '13', 'D20'];
    WHEN 112 THEN suggestion := ARRAY['T20', '12', 'D20'];
    WHEN 111 THEN suggestion := ARRAY['T20', '11', 'D20'];
    WHEN 110 THEN suggestion := ARRAY['T20', '10', 'D20'];
    WHEN 109 THEN suggestion := ARRAY['T20', '9', 'D20'];
    WHEN 108 THEN suggestion := ARRAY['T20', '8', 'D20'];
    WHEN 107 THEN suggestion := ARRAY['T19', '10', 'D20'];
    WHEN 106 THEN suggestion := ARRAY['T20', '6', 'D20'];
    WHEN 105 THEN suggestion := ARRAY['T20', '5', 'D20'];
    WHEN 104 THEN suggestion := ARRAY['T20', '4', 'D20'];
    WHEN 103 THEN suggestion := ARRAY['T20', '3', 'D20'];
    WHEN 102 THEN suggestion := ARRAY['T20', '2', 'D20'];
    WHEN 101 THEN suggestion := ARRAY['T20', '1', 'D20'];
    WHEN 100 THEN suggestion := ARRAY['T20', 'D20'];
    WHEN 99 THEN suggestion := ARRAY['T19', '10', 'D16'];
    WHEN 98 THEN suggestion := ARRAY['T20', 'D19'];
    WHEN 97 THEN suggestion := ARRAY['T19', 'D20'];
    WHEN 96 THEN suggestion := ARRAY['T20', 'D18'];
    WHEN 95 THEN suggestion := ARRAY['T19', 'D19'];
    WHEN 94 THEN suggestion := ARRAY['T18', 'D20'];
    WHEN 93 THEN suggestion := ARRAY['T19', 'D18'];
    WHEN 92 THEN suggestion := ARRAY['T20', 'D16'];
    WHEN 91 THEN suggestion := ARRAY['T17', 'D20'];
    WHEN 90 THEN suggestion := ARRAY['T18', 'D18'];
    WHEN 89 THEN suggestion := ARRAY['T19', 'D16'];
    WHEN 88 THEN suggestion := ARRAY['T20', 'D14'];
    WHEN 87 THEN suggestion := ARRAY['T17', 'D18'];
    WHEN 86 THEN suggestion := ARRAY['T18', 'D16'];
    WHEN 85 THEN suggestion := ARRAY['T15', 'D20'];
    WHEN 84 THEN suggestion := ARRAY['T20', 'D12'];
    WHEN 83 THEN suggestion := ARRAY['T17', 'D16'];
    WHEN 82 THEN suggestion := ARRAY['T14', 'D20'];
    WHEN 81 THEN suggestion := ARRAY['T19', 'D12'];
    WHEN 80 THEN suggestion := ARRAY['T20', 'D10'];
    WHEN 79 THEN suggestion := ARRAY['T13', 'D20'];
    WHEN 78 THEN suggestion := ARRAY['T18', 'D12'];
    WHEN 77 THEN suggestion := ARRAY['T19', 'D10'];
    WHEN 76 THEN suggestion := ARRAY['T20', 'D8'];
    WHEN 75 THEN suggestion := ARRAY['T15', 'D15'];
    WHEN 74 THEN suggestion := ARRAY['T14', 'D16'];
    WHEN 73 THEN suggestion := ARRAY['T19', 'D8'];
    WHEN 72 THEN suggestion := ARRAY['T16', 'D12'];
    WHEN 71 THEN suggestion := ARRAY['T13', 'D16'];
    WHEN 70 THEN suggestion := ARRAY['T10', 'D20'];
    WHEN 69 THEN suggestion := ARRAY['T19', 'D6'];
    WHEN 68 THEN suggestion := ARRAY