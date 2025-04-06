-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Friends table (for non-app users)
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('301', '501', '701')),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game players table
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_type TEXT NOT NULL CHECK (player_type IN ('user', 'friend')),
  starting_score INTEGER NOT NULL,
  "order" INTEGER NOT NULL,
  winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id, player_type)
);

-- Turns table
CREATE TABLE turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_type TEXT NOT NULL CHECK (player_type IN ('user', 'friend')),
  turn_number INTEGER NOT NULL,
  scores INTEGER[] NOT NULL,
  remaining INTEGER NOT NULL,
  checkout BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(game_id, player_id, player_type, turn_number)
);

-- Statistics table
CREATE TABLE statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL,
  player_type TEXT NOT NULL CHECK (player_type IN ('user', 'friend')),
  game_type TEXT NOT NULL CHECK (game_type IN ('301', '501', '701')),
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  highest_turn INTEGER DEFAULT 0,
  checkout_percentage NUMERIC DEFAULT 0,
  average_per_dart NUMERIC DEFAULT 0,
  count_180 INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, player_type, game_type)
);

-- Rivals table
CREATE TABLE rivals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player1_id UUID NOT NULL,
  player2_id UUID NOT NULL,
  player1_type TEXT NOT NULL CHECK (player1_type IN ('user', 'friend')),
  player2_type TEXT NOT NULL CHECK (player2_type IN ('user', 'friend')),
  player1_wins INTEGER DEFAULT 0,
  player2_wins INTEGER DEFAULT 0,
  last_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  highlighted BOOLEAN DEFAULT FALSE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player1_id, player2_id, creator_id)
);
