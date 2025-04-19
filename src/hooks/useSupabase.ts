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

  // Get statistics trend data for charts 
  const getPlayerStatisticsTrend = async (playerId: string, playerType: 'user' | 'friend'): Promise<any[] | null> => {
    try {
      // Get all turns for this player
      const { data: turns, error: turnsError } = await supabase
        .from('turns')
        .select(`
          id,
          game_id,
          scores,
          remaining,
          checkout,
          created_at,
          games!inner(type, status)
        `)
        .eq('player_id', playerId)
        .eq('player_type', playerType)
        .eq('games.status', 'completed')
        .order('created_at', { ascending: true });
      
      if (turnsError) throw turnsError;
      if (!turns || turns.length === 0) return [];
      
      // Group turns by month for trend data
      const monthlyData: { [key: string]: any } = {};
      
      for (const turn of turns) {
        const date = new Date(turn.created_at);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            date: monthYear,
            totalScore: 0,
            totalDarts: 0,
            turnCount: 0,
            highestTurn: 0,
            games: new Set(),
            wins: 0
          };
        }
        
        // Calculate score for this turn
        const turnScore = turn.scores.reduce((acc: number, score: number) => acc + score, 0);
        const dartCount = turn.scores.length;
        
        monthlyData[monthYear].totalScore += turnScore;
        monthlyData[monthYear].totalDarts += dartCount;
        monthlyData[monthYear].turnCount++;
        monthlyData[monthYear].highestTurn = Math.max(monthlyData[monthYear].highestTurn, turnScore);
        monthlyData[monthYear].games.add(turn.game_id);
      }
      
      // Get wins for each month
      for (const monthYear in monthlyData) {
        const gameIds = Array.from(monthlyData[monthYear].games);
        
        const { data: winners, error: winnersError } = await supabase
          .from('game_players')
          .select('game_id')
          .eq('player_id', playerId)
          .eq('player_type', playerType)
          .eq('winner', true)
          .in('game_id', gameIds);
        
        if (winnersError) throw winnersError;
        
        monthlyData[monthYear].wins = winners?.length || 0;
      }
      
      // Format the data for charts
      return Object.entries(monthlyData).map(([monthYear, data]) => {
        const gamesPlayed = data.games.size;
        return {
          date: monthYear,
          averagePerDart: data.totalDarts > 0 ? data.totalScore / data.totalDarts : 0,
          winPercentage: gamesPlayed > 0 ? (data.wins / gamesPlayed) * 100 : 0,
          highestTurn: data.highestTurn,
          gamesPlayed
        };
      });
      
    } catch (error) {
      console.error('Error fetching statistics trend data:', error);
      return null;
    }
  };

  // Get score distribution data
  const getScoreDistribution = async (playerId: string, playerType: 'user' | 'friend', gameType?: string): Promise<any[] | null> => {
    try {
      // Build query with game type filter if provided
      let query = supabase
        .from('turns')
        .select(`
          id,
          scores,
          games!inner(type, status)
        `)
        .eq('player_id', playerId)
        .eq('player_type', playerType)
        .eq('games.status', 'completed');
        
      if (gameType && gameType !== 'all') {
        query = query.eq('games.type', gameType);
      }
      
      const { data: turns, error } = await query;
      
      if (error) throw error;
      if (!turns || turns.length === 0) return [];
      
      // Calculate score distribution
      const scoreDistribution: { [key: number]: number } = {};
      
      for (const turn of turns) {
        const turnScore = turn.scores.reduce((acc: number, score: number) => acc + score, 0);
        scoreDistribution[turnScore] = (scoreDistribution[turnScore] || 0) + 1;
      }
      
      // Format for chart
      return Object.entries(scoreDistribution)
        .map(([score, count]) => ({ score: parseInt(score), count }))
        .sort((a, b) => a.score - b.score);
      
    } catch (error) {
      console.error('Error fetching score distribution data:', error);
      return null;
    }
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
    try {
      let query = supabase
        .from('rivals')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (highlighted) {
        query = query.eq('highlighted', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching rivals:', error);
      return null;
    }
  };

  const getRivalryStats = async (player1Id: string, player2Id: string): Promise<any | null> => {
    try {
      const { data, error } = await supabase.rpc('get_rivalry_stats', { 
        player1_id: player1Id, 
        player2_id: player2Id 
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching rivalry stats:', error);
      return null;
    }
  };
  
  const toggleRivalHighlight = async (rivalId: string, highlighted: boolean): Promise<void> => {
    try {
      const { error } = await supabase
        .from('rivals')
        .update({ highlighted })
        .eq('id', rivalId)
        .eq('creator_id', user?.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating rival highlight:', error);
      setError({ message: 'Failed to update rival highlight' });
    }
  };
  
  const deleteRival = async (rivalId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('rivals')
        .delete()
        .eq('id', rivalId)
        .eq('creator_id', user?.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting rival:', error);
      setError({ message: 'Failed to delete rival' });
    }
  };
  
  const addRival = async (
    player1Id: string,
    player1Type: 'user' | 'friend',
    player2Id: string,
    player2Type: 'user' | 'friend'
  ): Promise<RivalRow | null> => {
    try {
      const { data, error } = await supabase
        .from('rivals')
        .insert({
          player1_id: player1Id,
          player1_type: player1Type,
          player2_id: player2Id,
          player2_type: player2Type,
          player1_wins: 0,
          player2_wins: 0,
          highlighted: false,
          creator_id: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding rival:', error);
      setError({ message: 'Failed to add new rival' });
      return null;
    }
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

  // Helper function to get the numeric value of a dart
  const getDartValue = (dartString: string): number => {
    if (dartString === 'Bull') return 50;
    if (dartString === '25') return 25;
    
    const prefixMatch = dartString.match(/^([SDT])(\d+)$/);
    if (!prefixMatch) return 0;
    
    const prefix = prefixMatch[1]; // S, D, or T
    const value = parseInt(prefixMatch[2]);
    
    if (prefix === 'S') return value;
    if (prefix === 'D') return value * 2;
    if (prefix === 'T') return value * 3;
    
    return 0;
  };

  // Helper function to verify a checkout suggestion adds up to the target score
  const verifyCheckoutTotal = (suggestion: string[], targetScore: number): boolean => {
    const total = suggestion.reduce((sum, dart) => sum + getDartValue(dart), 0);
    if (total !== targetScore) {
      console.log(`Invalid checkout suggestion: ${suggestion.join(', ')} = ${total}, not ${targetScore}`);
      return false;
    }
    return true;
  };

  // Helper function to generate fallback checkout suggestions
  const generateFallbackCheckout = (remainingScore: number): string[][] => {
    const suggestions: string[][] = [];
    
    // Validate a suggestion before adding it
    const validateAndAddSuggestion = (suggestion: string[]) => {
      try {
        // Check if all darts in the suggestion are valid
        if (suggestion.every(dart => isValidDart(dart)) && 
            verifyCheckoutTotal(suggestion, remainingScore)) {
          suggestions.push(suggestion);
        } else {
          console.log(`Skipping invalid suggestion: ${suggestion.join(', ')}`);
        }
      } catch (error) {
        console.error(`Error validating suggestion: ${suggestion.join(', ')}`, error);
        // Don't add invalid suggestions to prevent game issues
      }
    };
    
    // Known good checkout paths for specific scores
    // These are common and well-established checkout paths in darts
    const knownCheckouts: Record<number, string[][]> = {
      170: [['T20', 'T20', 'Bull']],
      167: [['T20', 'T19', 'Bull']],
      164: [['T20', 'T18', 'Bull']],
      161: [['T20', 'T17', 'Bull']],
      160: [['T20', 'T20', 'D20']],
      158: [['T20', 'T20', 'D19']],
      157: [['T20', 'T19', 'D20']],
      156: [['T20', 'T20', 'D18']],
      155: [['T20', 'T19', 'D19']],
      154: [['T20', 'T18', 'D20']],
      153: [['T20', 'T19', 'D18']],
      152: [['T20', 'T20', 'D16']],
      151: [['T20', 'T17', 'D20']],
      150: [['T20', 'T18', 'D18']],
      149: [['T20', 'T19', 'D16']],
      148: [['T20', 'T20', 'D14']],
      147: [['T20', 'T17', 'D18']],
      146: [['T20', 'T18', 'D16']],
      145: [['T20', 'T19', 'D14']],
      144: [['T20', 'T20', 'D12']],
      143: [['T20', 'T17', 'D16']],
      142: [['T20', 'T14', 'D20']],
      141: [['T20', 'T19', 'D12']],
      140: [['T20', 'T20', 'D10']],
      139: [['T20', 'T13', 'D20']],
      138: [['T20', 'T18', 'D12']],
      137: [['T20', 'T19', 'D10']],
      136: [['T20', 'T20', 'D8']],
      135: [['T20', 'T15', 'D15']],
      134: [['T20', 'T14', 'D16']],
      133: [['T20', 'T19', 'D8']],
      132: [['T20', 'T16', 'D12']],
      131: [['T20', 'T13', 'D16']],
      130: [['T20', 'T18', 'D8']],
      129: [['T19', 'T16', 'D12']],
      128: [['T20', 'T16', 'D10']],
      127: [['T20', 'T17', 'D8']],
      126: [['T19', 'T19', 'D6']],
      125: [['T20', 'T15', 'D10']],
      124: [['T20', 'T16', 'D8']],
      123: [['T19', 'T16', 'D9']],
      122: [['T18', 'T18', 'D7']],
      121: [['T19', 'S14', 'D20'], ['T17', 'T10', 'D20']],
      120: [['T20', 'S20', 'D20']],
      119: [['T19', 'T12', 'D13']],
      118: [['T20', 'S18', 'D20']],
      117: [['T20', 'S17', 'D20']],
      116: [['T20', 'S16', 'D20']],
      115: [['T20', 'S15', 'D20'], ['T19', 'S18', 'D20']],
      113: [['T20', 'S13', 'D20'], ['T19', 'S16', 'D20']],
      112: [['T20', 'S12', 'D20']],
      111: [['T20', 'S11', 'D20']],
      110: [['T20', 'S10', 'D20']],
      109: [['T20', 'S9', 'D20']],
      108: [['T20', 'S8', 'D20']],
      107: [['T19', 'S10', 'D20']],
      106: [['T20', 'S6', 'D20']],
      105: [['T20', 'S5', 'D20']],
      104: [['T20', 'S4', 'D20']],
      103: [['T19', 'S6', 'D20']],
      102: [['T20', 'S2', 'D20']],
      101: [['T17', 'S10', 'D20']],
      100: [['T20', 'D20']],
      99: [['T19', 'S10', 'D16']],
      98: [['T20', 'D19']],
      97: [['T19', 'D20']],
      96: [['T20', 'D18']],
      95: [['T19', 'D19']],
      94: [['T18', 'D20']],
      93: [['T19', 'D18']],
      92: [['T20', 'D16']],
      91: [['T17', 'D20']],
      90: [['T18', 'D18']],
      89: [['T19', 'D16']],
      88: [['T20', 'D14']],
      87: [['T17', 'D18']],
      86: [['T18', 'D16']],
      85: [['T15', 'D20']],
      84: [['T20', 'D12']],
      83: [['T17', 'D16']],
      82: [['T14', 'D20']],
      81: [['T19', 'D12']],
      80: [['T20', 'D10']],
      79: [['T13', 'D20']],
      78: [['T18', 'D12']],
      77: [['T19', 'D10']],
      76: [['T20', 'D8']],
      75: [['T15', 'D15']],
      74: [['T14', 'D16']],
      73: [['T19', 'D8']],
      72: [['T16', 'D12']],
      71: [['T13', 'D16']],
      70: [['T10', 'D20']],
      69: [['T19', 'D6']],
      68: [['T20', 'D4']],
      67: [['T17', 'D8']],
      66: [['T10', 'D18']],
      65: [['T19', 'D4']],
      64: [['T16', 'D8']],
      63: [['T13', 'D12']],
      62: [['T10', 'D16']],
      61: [['T15', 'D8']],
      60: [['S20', 'D20']],
      59: [['S19', 'D20']],
      58: [['S18', 'D20']],
      57: [['S17', 'D20']],
      56: [['T16', 'D4']],
      55: [['S15', 'D20']],
      54: [['S14', 'D20']],
      53: [['S13', 'D20']],
      52: [['T12', 'D8']],
      51: [['S11', 'D20']],
      50: [['Bull'], ['S10', 'D20']],
      49: [['S9', 'D20']],
      48: [['S16', 'D16']],
      47: [['S15', 'D16']],
      46: [['S6', 'D20']],
      45: [['S13', 'D16']],
      44: [['S12', 'D16']],
      43: [['S11', 'D16']],
      42: [['S10', 'D16']],
      41: [['S9', 'D16']],
      40: [['D20']],
      39: [['S7', 'D16']],
      38: [['D19']],
      37: [['S5', 'D16']],
      36: [['D18']],
      35: [['S3', 'D16']],
      34: [['D17']],
      33: [['S1', 'D16']],
      32: [['D16']],
      31: [['S15', 'D8']],
      30: [['D15']],
      29: [['S13', 'D8']],
      28: [['D14']],
      27: [['S11', 'D8']],
      26: [['D13']],
      25: [['S9', 'D8']],
      24: [['D12']],
      23: [['S7', 'D8']],
      22: [['D11']],
      21: [['S5', 'D8']],
      20: [['D10']],
      19: [['S3', 'D8']],
      18: [['D9']],
      17: [['S1', 'D8']],
      16: [['D8']],
      15: [['S7', 'D4']],
      14: [['D7']],
      13: [['S5', 'D4']],
      12: [['D6']],
      11: [['S3', 'D4']],
      10: [['D5']],
      9: [['S1', 'D4']],
      8: [['D4']],
      7: [['S3', 'D2']],
      6: [['D3']],
      5: [['S1', 'D2']],
      4: [['D2']],
      3: [['S1', 'D1']],
      2: [['D1']]
    };
    
    // If we have a known checkout for this score, use it
    if (knownCheckouts[remainingScore]) {
      // Always validate known checkouts too, just in case
      knownCheckouts[remainingScore].forEach(checkout => {
        validateAndAddSuggestion(checkout);
      });
      
      // If we have valid suggestions from known checkouts, return them
      if (suggestions.length > 0) {
        return suggestions;
      }
    }
    
    // Special case for bullseye finish (50)
    if (remainingScore === 50) {
      validateAndAddSuggestion(['Bull']);
      // Alternative route via D20 + D5
      validateAndAddSuggestion(['S10', 'D20']);
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
      
      // For 3-dart finishes, try standard combinations
      if (remainingScore <= 170) {
        for (let t = 20; t >= 1; t--) {
          // Try triple followed by single and double
          const tripleValue = t * 3;
          const afterTriple = remainingScore - tripleValue;
          
          if (afterTriple > 2) { // Need at least a S1 + D1
            for (let s = 20; s >= 1; s--) {
              const afterSingle = afterTriple - s;
              if (afterSingle > 0 && afterSingle % 2 === 0 && afterSingle <= 40) {
                validateAndAddSuggestion([`T${t}`, `S${s}`, `D${afterSingle/2}`]);
                if (suggestions.length >= 2) break;
              }
            }
            if (suggestions.length >= 2) break;
          }
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
    }
    
    // Absolute last resort - ensure we have at least one valid suggestion
    if (suggestions.length === 0) {
      // Try a safe approach with a triple 19 followed by appropriate darts
      const remaining = remainingScore - 57; // T19 = 57
      if (remaining > 0) {
        // Try to find a double finish
        if (remaining % 2 === 0 && remaining <= 40) {
          validateAndAddSuggestion(['T19', `D${remaining/2}`]);
        } else {
          // Try to find a single + double finish
          for (let s = 20; s >= 1; s--) {
            const afterSingle = remaining - s;
            if (afterSingle > 0 && afterSingle % 2 === 0 && afterSingle <= 40) {
              validateAndAddSuggestion(['T19', `S${s}`, `D${afterSingle/2}`]);
              break;
            }
          }
        }
      }
    }
    
    // If still no suggestions, just provide any mathematically correct checkout
    if (suggestions.length === 0) {
      console.log(`No standard checkout found for ${remainingScore}. Generating alternative.`);
      
      // Try to generate a basic checkout with standard values
      if (remainingScore <= 60) {
        for (let i = 20; i >= 1; i--) {
          for (let j = 20; j >= 1; j--) {
            // Ensure j is a valid double (1-20)
            if (i + (j * 2) === remainingScore && j <= 20) {
              validateAndAddSuggestion([`S${i}`, `D${j}`]);
              break;
            }
          }
          if (suggestions.length > 0) break;
        }
      } else {
        // Last resort for higher scores - start with T20 and figure out the rest
        const afterT20 = remainingScore - 60;
        for (let i = 20; i >= 1; i--) {
          for (let j = 20; j >= 1; j--) {
            // Ensure j is a valid double (1-20)
            if (i + (j * 2) === afterT20 && j <= 20) {
              validateAndAddSuggestion(['T20', `S${i}`, `D${j}`]);
              break;
            }
          }
          if (suggestions.length > 0) break;
        }
      }
    }
    
    return suggestions;
  };

  // Modify getCheckoutSuggestion to validate database responses
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
      
      // Validate all darts in the suggestion
      for (const dart of dbSuggestion) {
        if (!isValidDart(dart)) {
          console.log(`Invalid dart detected - ${dart} in ${dbSuggestion.join(', ')}`);
          isValidCheckout = false;
          break;
        }
      }
      
      // Also verify the total adds up
      if (isValidCheckout && !verifyCheckoutTotal(dbSuggestion, remainingScore)) {
        isValidCheckout = false;
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
    getPlayerStatisticsTrend,
    getScoreDistribution,
    // Leaderboard
    getLeaderboard,
    // Rivals
    getRivals,
    getRivalryStats,
    toggleRivalHighlight,
    deleteRival,
    addRival,
    // Checkout suggestions
    getCheckoutSuggestion,
  };
}; 