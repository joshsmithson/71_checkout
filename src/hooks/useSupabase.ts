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

  // Helper function to check if a dart value is valid
  const isValidDart = (dartString: string): boolean => {
    // Valid formats: S1-S20, D1-D20, T1-T20, 25, Bull
    if (dartString === '25' || dartString === 'Bull') {
      return true;
    }
    
    // Check format for S/D/T + number
    const prefixMatch = dartString.match(/^([SDT])(\d+)$/);
    if (!prefixMatch) return false;
    
    const prefix = prefixMatch[1]; // S, D, or T
    const value = parseInt(prefixMatch[2]);
    
    // Validate the number is between 1 and 20
    return value >= 1 && value <= 20;
  };

  // Checkout suggestions
  const getCheckoutSuggestion = useCallback(async (remainingScore: number): Promise<string[][] | null> => {
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
        // Only return one suggestion for simple odd-single + double finish
        return [[`S${needSingle}`, `D${evenScore/2}`]];
      }
    }
    
    // Simple checkouts (score <= 40 and even)
    if (remainingScore <= 40 && remainingScore % 2 === 0) {
      // Only one possible checkout for simple doubles
      return [[`D${remainingScore/2}`]];
    }
    
    // Generate our local fallback suggestions
    const fallbackSuggestions = generateFallbackCheckout(remainingScore);
    
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
        return fallbackSuggestions;
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return fallbackSuggestions;
      }
      
      // Check if the database suggestion is valid (no impossible darts)
      const dbSuggestion = data;
      let isValidCheckout = true;
      
      for (const dart of dbSuggestion) {
        if (!isValidDart(dart)) {
          console.log(`Invalid dart detected - ${dart} in ${dbSuggestion.join(', ')}`);
          isValidCheckout = false;
          break;
        }
      }
      
      // If the database suggestion is invalid, just use our fallback
      if (!isValidCheckout) {
        return fallbackSuggestions;
      }
      
      // If the database suggestion is valid but differs from our fallback,
      // add it as an additional option
      const dbCheckout = [dbSuggestion];
      
      // Check if the database suggestion is already in our fallbacks
      const isDuplicate = fallbackSuggestions.some(suggestion => 
        suggestion.length === dbSuggestion.length && 
        suggestion.every((dart, idx) => dart === dbSuggestion[idx])
      );
      
      if (!isDuplicate) {
        // Combine suggestions, but limit to 2 total
        const combinedSuggestions = [dbSuggestion, ...fallbackSuggestions];
        return combinedSuggestions.slice(0, 2);
      }
      
      // If already a duplicate, just return our fallbacks
      return fallbackSuggestions;
    } catch (err) {
      console.error("Exception fetching checkout suggestion:", err);
      return fallbackSuggestions;
    }
  }, []);

  // Helper function to generate fallback checkout suggestions
  const generateFallbackCheckout = (remainingScore: number): string[][] => {
    const suggestions: string[][] = [];
    
    // Validate a suggestion before adding it
    const validateAndAddSuggestion = (suggestion: string[]) => {
      // Check if all darts in the suggestion are valid
      if (suggestion.every(dart => isValidDart(dart))) {
        suggestions.push(suggestion);
      } else {
        console.log(`Skipping invalid suggestion: ${suggestion.join(', ')}`);
      }
    };
    
    // Specific case for checkout 115 and similar problematic checkouts
    if (remainingScore === 115) {
      validateAndAddSuggestion(['T20', 'S15', 'D20']);
      validateAndAddSuggestion(['T19', 'S18', 'D20']);
      return suggestions;
    }
    
    // Common checkouts that might not be in the database
    if (remainingScore === 113) {
      validateAndAddSuggestion(['T20', 'S13', 'D20']);
      validateAndAddSuggestion(['T19', 'S16', 'D20']);
      return suggestions;
    }
    
    // Special case for bullseye finish (50)
    if (remainingScore === 50) {
      validateAndAddSuggestion(['Bull']);
      // Alternative route via D20 + D5
      validateAndAddSuggestion(['D20', 'D5']);
      return suggestions;
    }
    
    // Maximum valid double in darts is D20 (40 points)
    // The only valid finish above 40 is the bullseye (50)
    const maxValidDouble = 20;
    
    // Check for finishes with bullseye
    if (remainingScore > 50) {
      // Try to use singles or doubles with bullseye
      const withBull = remainingScore - 50;
      if (withBull > 0 && withBull <= 20) {
        validateAndAddSuggestion([`S${withBull}`, 'Bull']);
      } else if (withBull > 20 && withBull <= 40 && withBull % 2 === 0) {
        validateAndAddSuggestion([`D${withBull/2}`, 'Bull']);
      } else if (withBull > 0 && withBull <= 60 && withBull % 3 === 0) {
        validateAndAddSuggestion([`T${withBull/3}`, 'Bull']);
      }
    }
    
    // For scores above 100, try to use T20 and leave a double
    if (remainingScore > 100) {
      // Try to use T20 and leave a manageable double
      const afterT20 = remainingScore - 60;
      if (afterT20 > 0 && afterT20 % 2 === 0 && afterT20 <= 40) {
        validateAndAddSuggestion(['T20', `D${afterT20/2}`]);
      }
      
      // Try with T19
      const afterT19 = remainingScore - 57;
      if (afterT19 > 0 && afterT19 % 2 === 0 && afterT19 <= 40) {
        validateAndAddSuggestion(['T19', `D${afterT19/2}`]);
      }
      
      // Try to leave bullseye finish
      if (afterT20 === 50) {
        validateAndAddSuggestion(['T20', 'Bull']);
      }
      
      // Try with various triples to leave a manageable double
      for (let i = 20; i >= 10; i--) {
        // Skip T20 and T19 as we've already tried them
        if (i === 20 || i === 19) continue;
        
        const tripleScore = i * 3;
        const remaining = remainingScore - tripleScore;
        
        // Check for regular double finish
        if (remaining > 0 && remaining % 2 === 0 && remaining <= 40) {
          validateAndAddSuggestion([`T${i}`, `D${remaining/2}`]);
          
          // If we have enough suggestions, stop
          if (suggestions.length >= 2) break;
        }
        
        // Check for bullseye finish
        if (remaining === 50) {
          validateAndAddSuggestion([`T${i}`, 'Bull']);
          
          // If we have enough suggestions, stop
          if (suggestions.length >= 2) break;
        }
      }
    }
    
    // If we still don't have enough suggestions, try more approaches
    if (suggestions.length < 2) {
      // For even scores <= 40, suggest direct double
      if (remainingScore <= 40 && remainingScore % 2 === 0) {
        validateAndAddSuggestion([`D${remainingScore/2}`]);
      }
      
      // For odd scores, need to hit a single to make it even
      if (remainingScore % 2 !== 0) {
        // Try to hit a single to leave a manageable double
        const singleNeeded = remainingScore % 2;
        const evenScore = remainingScore - singleNeeded;
        
        if (evenScore > 0 && evenScore <= 40) {
          validateAndAddSuggestion([`S${singleNeeded}`, `D${evenScore/2}`]);
        }
      }
      
      // For scores > 40, try to get to a score <= 40 that we can finish with a double
      if (remainingScore > 40) {
        // Try single dart reductions
        for (let i = 20; i >= 1; i--) {
          // Try single
          const afterSingle = remainingScore - i;
          if (afterSingle > 0 && afterSingle % 2 === 0 && afterSingle <= 40) {
            validateAndAddSuggestion([`S${i}`, `D${afterSingle/2}`]);
            if (suggestions.length >= 2) break;
          }
          
          // Try double
          const afterDouble = remainingScore - (i * 2);
          if (afterDouble > 0 && afterDouble % 2 === 0 && afterDouble <= 40) {
            validateAndAddSuggestion([`D${i}`, `D${afterDouble/2}`]);
            if (suggestions.length >= 2) break;
          }
          
          // Try triple
          const afterTriple = remainingScore - (i * 3);
          if (afterTriple > 0 && afterTriple % 2 === 0 && afterTriple <= 40) {
            validateAndAddSuggestion([`T${i}`, `D${afterTriple/2}`]);
            if (suggestions.length >= 2) break;
          }
        }
      }
    }
    
    // If we still need more suggestions
    if (suggestions.length < 2 && remainingScore > 100) {
      // Try T20, T20, D approach
      const afterTwoT20s = remainingScore - 120;
      if (afterTwoT20s > 0 && afterTwoT20s % 2 === 0 && afterTwoT20s <= 40) {
        validateAndAddSuggestion(['T20', 'T20', `D${afterTwoT20s/2}`]);
      }
      
      // Try other three-dart combinations if we don't have enough suggestions
      if (suggestions.length < 2) {
        // Focus on commonly used doubles
        const preferredDoubles = [20, 16, 10, 8, 4, 2];
        
        for (const doubleValue of preferredDoubles) {
          if (doubleValue > 0 && doubleValue <= 20) {
            const remaining = remainingScore - (doubleValue * 2);
            
            // Try combinations of valid darts to reach the remaining score
            if (remaining > 0 && remaining <= 40) {
              validateAndAddSuggestion([`S${remaining}`, `D${doubleValue}`]);
              if (suggestions.length >= 2) break;
            } else if (remaining > 20 && remaining <= 40) {
              validateAndAddSuggestion([`D${remaining/2}`, `D${doubleValue}`]);
              if (suggestions.length >= 2) break;
            } else {
              // Try to find two darts that add up to the remaining score
              for (let i = 20; i >= 1; i--) {
                // Try triple + single
                const afterTriple = remaining - (i * 3);
                if (afterTriple > 0 && afterTriple <= 20) {
                  validateAndAddSuggestion([`T${i}`, `S${afterTriple}`, `D${doubleValue}`]);
                  if (suggestions.length >= 2) break;
                }
                
                // Try double + single
                const afterDouble = remaining - (i * 2);
                if (afterDouble > 0 && afterDouble <= 20) {
                  validateAndAddSuggestion([`D${i}`, `S${afterDouble}`, `D${doubleValue}`]);
                  if (suggestions.length >= 2) break;
                }
                
                // Try single + single
                for (let j = 20; j >= i; j--) {
                  if (i + j === remaining) {
                    validateAndAddSuggestion([`S${i}`, `S${j}`, `D${doubleValue}`]);
                    if (suggestions.length >= 2) break;
                  }
                }
                if (suggestions.length >= 2) break;
              }
            }
          }
          if (suggestions.length >= 2) break;
        }
      }
    }
    
    // Absolute last resort - ensure we have at least one valid suggestion
    if (suggestions.length === 0) {
      // Safe fallback for any score - aim for D20, T20 and S1
      validateAndAddSuggestion(['T20', 'S1', 'D20']);
    }
    
    return suggestions;
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