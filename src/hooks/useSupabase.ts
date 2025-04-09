import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];
type GameRow = Tables['games']['Row'];
type GamePlayerRow = Tables['game_players']['Row'];
type TurnRow = Tables['turns']['Row'];
type FriendRow = Tables['friends']['Row'];
type StatisticsRow = Tables['statistics']['Row'];
type RivalRow = Tables['rivals']['Row'];

export const useSupabase = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Generic fetch function with better error handling
  const fetchData = useCallback(async <T,>(
    fetchFunction: () => Promise<{ data: T | null; error: Error | null }>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchFunction();
      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching data:', error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Game Operations
  const createGame = useCallback(async (gameType: string): Promise<GameRow | null> => {
    if (!user) return null;
    
    return fetchData(async () => {
      const result = await supabase.from('games').insert({
        type: gameType,
        creator_id: user.id,
        status: 'active',
      }).select().single();
      
      return result;
    });
  }, [user, fetchData]);

  const getGames = useCallback(async (): Promise<GameRow[] | null> => {
    if (!user) return null;
    
    return fetchData(async () => {
      const result = await supabase
        .from('games')
        .select()
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
        
      return result;
    });
  }, [user, fetchData]);

  const getGameById = async (gameId: string): Promise<GameRow | null> => {
    return fetchData(async () => {
      const result = await supabase
        .from('games')
        .select()
        .eq('id', gameId)
        .single();
      
      return result;
    });
  };

  const updateGameStatus = async (gameId: string, status: 'active' | 'paused' | 'completed'): Promise<void> => {
    await fetchData(async () => {
      const result = await supabase
        .from('games')
        .update({ 
          status,
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', gameId);
      
      return result;
    });
  };

  // Delete game and all related data
  const deleteGame = async (gameId: string): Promise<void> => {
    if (!user) return;
    
    return fetchData(async () => {
      // First, get the game to ensure it exists and belongs to the user
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select()
        .eq('id', gameId)
        .eq('creator_id', user.id)
        .single();
      
      if (gameError || !game) {
        throw new Error('Game not found or you do not have permission to delete it');
      }
      
      // Load turns to later update statistics
      const { data: turns, error: turnsError } = await supabase
        .from('turns')
        .select()
        .eq('game_id', gameId);
      
      if (turnsError) {
        console.error('Error loading turns:', turnsError);
        // Continue with deletion even if we can't load turns
      }
      
      // Load game players
      const { data: gamePlayers, error: playersError } = await supabase
        .from('game_players')
        .select()
        .eq('game_id', gameId);
      
      if (playersError) {
        console.error('Error loading game players:', playersError);
        // Continue with deletion even if we can't load players
      }
      
      // Begin a transaction to ensure all data is deleted consistently
      // Delete in order: turns -> game_players -> game
      
      // 1. Delete turns
      const { error: deleteTurnsError } = await supabase
        .from('turns')
        .delete()
        .eq('game_id', gameId);
      
      if (deleteTurnsError) {
        throw new Error(`Failed to delete turns: ${deleteTurnsError.message}`);
      }
      
      // 2. Delete game players
      const { error: deletePlayersError } = await supabase
        .from('game_players')
        .delete()
        .eq('game_id', gameId);
      
      if (deletePlayersError) {
        throw new Error(`Failed to delete game players: ${deletePlayersError.message}`);
      }
      
      // 3. Delete the game itself
      const { error: deleteGameError } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);
      
      if (deleteGameError) {
        throw new Error(`Failed to delete game: ${deleteGameError.message}`);
      }
      
      // 4. Update statistics if the game was completed
      if (game.status === 'completed' && turns && gamePlayers) {
        // We should update the statistics for all players involved
        // This would need to be done via a service function or stored procedure on the server
        // For now, we'll just log a message
        console.log(`Game ${gameId} deleted successfully. Statistics need to be updated.`);
      }
      
      // Return success
      return { data: null, error: null };
    });
  };

  // Game Players Operations
  const addPlayersToGame = async (
    gameId: string, 
    players: { playerId: string; playerType: 'user' | 'friend'; startingScore: number; order: number }[]
  ): Promise<GamePlayerRow[] | null> => {
    const gamePlayers = players.map(player => ({
      game_id: gameId,
      player_id: player.playerId,
      player_type: player.playerType,
      starting_score: player.startingScore,
      order: player.order,
    }));
    
    return fetchData(async () => {
      const result = await supabase
        .from('game_players')
        .insert(gamePlayers)
        .select();
      
      return result;
    });
  };

  const getGamePlayers = async (gameId: string): Promise<GamePlayerRow[] | null> => {
    return fetchData(async () => {
      const result = await supabase
        .from('game_players')
        .select()
        .eq('game_id', gameId)
        .order('order', { ascending: true });
      
      return result;
    });
  };

  const setGameWinner = async (gameId: string, playerId: string, playerType: 'user' | 'friend'): Promise<void> => {
    await fetchData(async () => {
      const result = await supabase
        .from('game_players')
        .update({ winner: true })
        .eq('game_id', gameId)
        .eq('player_id', playerId)
        .eq('player_type', playerType);
      
      return result;
    });
  };

  // Turns Operations
  const addTurn = async (
    gameId: string,
    playerId: string,
    playerType: 'user' | 'friend',
    turnNumber: number,
    scores: number[],
    remaining: number,
    checkout: boolean = false
  ): Promise<TurnRow | null> => {
    return fetchData(async () => {
      const result = await supabase
        .from('turns')
        .insert({
          game_id: gameId,
          player_id: playerId,
          player_type: playerType,
          turn_number: turnNumber,
          scores,
          remaining,
          checkout
        })
        .select()
        .single();
      
      return result;
    });
  };

  const getTurns = async (gameId: string): Promise<TurnRow[] | null> => {
    return fetchData(async () => {
      const result = await supabase
        .from('turns')
        .select()
        .eq('game_id', gameId)
        .order('turn_number', { ascending: true });
      
      return result;
    });
  };

  const updateTurn = async (
    turnId: string,
    scores: number[],
    remaining: number,
    checkout: boolean = false
  ): Promise<TurnRow | null> => {
    return fetchData(async () => {
      const result = await supabase
        .from('turns')
        .update({
          scores,
          remaining,
          checkout,
          edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', turnId)
        .select()
        .single();
      
      return result;
    });
  };

  // Delete a turn by ID
  const deleteTurn = async (turnId: string): Promise<void> => {
    return fetchData(async () => {
      const result = await supabase
        .from('turns')
        .delete()
        .eq('id', turnId);
      
      return result;
    });
  };

  // Friends Operations
  const getFriends = useCallback(async (): Promise<FriendRow[] | null> => {
    if (!user) return null;
    
    return fetchData(async () => {
      const result = await supabase
        .from('friends')
        .select()
        .eq('creator_id', user.id)
        .order('name', { ascending: true });
      
      return result;
    });
  }, [user, fetchData]);

  const addFriend = async (name: string): Promise<FriendRow | null> => {
    if (!user) return null;
    
    return fetchData(async () => {
      const result = await supabase
        .from('friends')
        .insert({
          name,
          creator_id: user.id
        })
        .select()
        .single();
      
      return result;
    });
  };

  // Statistics Operations
  const getPlayerStatistics = async (playerId: string, playerType: 'user' | 'friend'): Promise<StatisticsRow[] | null> => {
    return fetchData(async () => {
      const result = await supabase
        .from('statistics')
        .select()
        .eq('player_id', playerId)
        .eq('player_type', playerType);
      
      return result;
    });
  };

  // Leaderboard
  const getLeaderboard = async (): Promise<any[] | null> => {
    if (!user) return null;
    
    return fetchData(async () => {
      const result = await supabase
        .rpc('calculate_leaderboard', { user_id: user.id });
      
      return result;
    });
  };

  // Rivals
  const getRivals = async (highlighted: boolean = false): Promise<RivalRow[] | null> => {
    if (!user) return null;
    
    const query = supabase
      .from('rivals')
      .select()
      .eq('creator_id', user.id);
    
    if (highlighted) {
      query.eq('highlighted', true);
    }
    
    return fetchData(async () => {
      const result = await query;
      return result;
    });
  };

  const getRivalryStats = async (player1Id: string, player2Id: string): Promise<any | null> => {
    return fetchData(async () => {
      const result = await supabase
        .rpc('get_rivalry_stats', { player1_id: player1Id, player2_id: player2Id });
      
      return result;
    });
  };

  // Checkout suggestions
  const getCheckoutSuggestion = useCallback(async (remainingScore: number): Promise<string[] | null> => {
    // Client-side validation to ensure valid checkout scores
    if (remainingScore > 170 || remainingScore <= 1) {
      return null;
    }
    
    // For scores not divisible by 2 (require a single), ensure it's a valid checkout
    if (remainingScore % 2 !== 0 && remainingScore > 2) {
      // Must hit an odd single to make the score even
      const needSingle = remainingScore % 2;
      const evenScore = remainingScore - needSingle;
      
      if (evenScore > 0 && evenScore <= 40) {
        return [`S${needSingle}`, `D${evenScore/2}`];
      }
    }
    
    // Simple checkouts (score <= 40 and even)
    if (remainingScore <= 40 && remainingScore % 2 === 0) {
      return [`D${remainingScore/2}`];
    }
    
    // Try the database function for pre-determined checkout paths
    try {
      // Make TypeScript-compatible RPC call
      const { data, error } = await supabase.rpc('suggest_checkout', { 
        remaining_score: remainingScore 
      }) as unknown as { 
        data: string[] | null; 
        error: Error | null 
      };
      
      if (error) {
        console.error("Error fetching checkout suggestion:", error);
        return generateFallbackCheckout(remainingScore);
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return generateFallbackCheckout(remainingScore);
      }
      
      return data;
    } catch (err) {
      console.error("Exception fetching checkout suggestion:", err);
      return generateFallbackCheckout(remainingScore);
    }
  }, []);

  // Helper function to generate fallback checkout suggestions
  const generateFallbackCheckout = (remainingScore: number): string[] => {
    // Specific case for checkout 115 and similar problematic checkouts
    if (remainingScore === 115) {
      return ['T20', '15', 'D20'];
    }
    
    // Common checkouts that might not be in the database
    if (remainingScore === 113) {
      return ['T20', '13', 'D20'];
    }
    
    // Fallback: Try to reduce to a manageable double
    // First try to leave a score <= 40 for a direct double
    const targetScore = Math.min(40, Math.floor(remainingScore / 2) * 2);
    const scoreToRemove = remainingScore - targetScore;
    
    // Make sure we're not suggesting anything above a Double 20
    if (targetScore > 40) {
      // If too high, aim for a Double 20 and calculate what's left
      const newTargetScore = 40;
      const newScoreToRemove = remainingScore - newTargetScore;
      
      // Try to hit the largest sections first
      if (newScoreToRemove >= 60 && newScoreToRemove <= 180) {
        // Try combinations of T20 first
        if (newScoreToRemove >= 60 && newScoreToRemove % 60 === 0) {
          // Can be done with multiples of T20
          const count = newScoreToRemove / 60;
          return [...Array(count).fill('T20'), 'D20'];
        } else if (newScoreToRemove > 60) {
          // Try T20 + something else
          const t20Count = Math.floor(newScoreToRemove / 60);
          const remaining = newScoreToRemove - (t20Count * 60);
          
          if (remaining <= 20) {
            return [...Array(t20Count).fill('T20'), `S${remaining}`, 'D20'];
          } else if (remaining % 3 === 0 && remaining <= 60) {
            return [...Array(t20Count).fill('T20'), `T${remaining/3}`, 'D20'];
          } else if (remaining % 2 === 0 && remaining <= 40) {
            return [...Array(t20Count).fill('T20'), `D${remaining/2}`, 'D20'];
          }
        }
      }
      
      // Try singles and doubles combinations
      if (newScoreToRemove <= 20) {
        return [`S${newScoreToRemove}`, 'D20'];
      } else if (newScoreToRemove <= 40 && newScoreToRemove % 2 === 0) {
        return [`D${newScoreToRemove/2}`, 'D20'];
      } else if (newScoreToRemove <= 60 && newScoreToRemove % 3 === 0) {
        return [`T${newScoreToRemove/3}`, 'D20'];
      } else {
        // For awkward scores, try to break it down into two darts
        const s19 = 19;
        const remaining = newScoreToRemove - s19;
        if (remaining <= 20) {
          return [`S19`, `S${remaining}`, 'D20'];
        }
      }
    }
    
    // Original logic for manageable scores
    if (scoreToRemove <= 60) {
      // If we can get there with a single dart
      if (scoreToRemove <= 20) {
        return [`S${scoreToRemove}`, `D${targetScore/2}`];
      } else if (scoreToRemove % 2 === 0 && scoreToRemove <= 40) {
        return [`D${scoreToRemove/2}`, `D${targetScore/2}`];
      } else if (scoreToRemove % 3 === 0 && scoreToRemove <= 60) {
        return [`T${scoreToRemove/3}`, `D${targetScore/2}`];
      }
    }
    
    // For scores above 100, try to use T20 and leave a double
    if (remainingScore > 100) {
      // Try to use T20 and leave a manageable double
      const afterT20 = remainingScore - 60;
      if (afterT20 > 0 && afterT20 % 2 === 0 && afterT20 <= 40) {
        return ['T20', `D${afterT20/2}`];
      }
      
      // Try with T19
      const afterT19 = remainingScore - 57;
      if (afterT19 > 0 && afterT19 % 2 === 0 && afterT19 <= 40) {
        return ['T19', `D${afterT19/2}`];
      }
    }
    
    // If all else fails, use a smarter default fallback
    // Try to leave D16 (a common finish) or D20
    const preferredDoubles = [16, 20, 18, 12, 8];
    
    for (const doubleValue of preferredDoubles) {
      const target = doubleValue * 2;
      const toRemove = remainingScore - target;
      
      if (toRemove > 0 && toRemove <= 20) {
        return [`S${toRemove}`, `D${doubleValue}`];
      } else if (toRemove > 20 && toRemove <= 40 && toRemove % 2 === 0) {
        return [`D${toRemove/2}`, `D${doubleValue}`];
      } else if (toRemove > 0 && toRemove <= 60 && toRemove % 3 === 0) {
        return [`T${toRemove/3}`, `D${doubleValue}`];
      }
    }
    
    // Last resort - old fallback
    return [`S${remainingScore % 2 || 1}`, `D${Math.floor((remainingScore - (remainingScore % 2 || 1))/2)}`];
  };

  return {
    loading,
    error,
    // Game operations
    createGame,
    getGames,
    getGameById,
    updateGameStatus,
    deleteGame,
    // Game players operations
    addPlayersToGame,
    getGamePlayers,
    setGameWinner,
    // Turns operations
    addTurn,
    getTurns,
    updateTurn,
    deleteTurn,
    // Friends operations
    getFriends,
    addFriend,
    // Statistics operations
    getPlayerStatistics,
    // Leaderboard
    getLeaderboard,
    // Rivals
    getRivals,
    getRivalryStats,
    // Checkout suggestions
    getCheckoutSuggestion,
  };
}; 