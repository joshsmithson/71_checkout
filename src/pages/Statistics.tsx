import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  CircularProgress, 
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  useTheme
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';
import SpeedIcon from '@mui/icons-material/Speed';
import GavelIcon from '@mui/icons-material/Gavel';
import TargetIcon from '@mui/icons-material/GpsFixed';
import StatisticCard from '@/components/statistics/StatisticCard';
import DetailedStatsCard from '@/components/statistics/DetailedStatsCard';
import GameTypeStats from '@/components/statistics/GameTypeStats';
import RecentGames from '@/components/statistics/RecentGames';
import PerformanceTrendChart from '@/components/statistics/PerformanceTrendChart';
import GameTypeComparisonChart from '@/components/statistics/GameTypeComparisonChart';
import ScoreDistributionChart from '@/components/statistics/ScoreDistributionChart';

type StatisticData = {
  player_id: string;
  player_type: string;
  game_type: string;
  games_played: number;
  games_won: number;
  total_score: number;
  highest_turn: number;
  checkout_percentage: number;
  average_per_dart: number;
  count_180: number;
};

type GameHistoryItem = {
  id: string;
  type: string;
  created_at: string;
  players: {
    id: string;
    name: string;
    winner: boolean;
  }[];
};

const Statistics = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getPlayerStatistics, getPlayerStatisticsTrend, getScoreDistribution, getFriends, getGames, getGamePlayers, loading, error } = useSupabase();
  
  const [tabValue, setTabValue] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedPlayerType, setSelectedPlayerType] = useState<'user' | 'friend'>('user');
  const [gameTypeFilter, setGameTypeFilter] = useState<string>('all');
  const [statistics, setStatistics] = useState<StatisticData[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [recentGames, setRecentGames] = useState<GameHistoryItem[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  
  // Fetch user's statistics on component mount
  useEffect(() => {
    if (user) {
      setSelectedPlayerId(user.id);
      loadStatistics(user.id, 'user');
      loadFriends();
      loadRecentGames();
    }
  }, [user]);
  
  const loadStatistics = async (playerId: string, playerType: 'user' | 'friend') => {
    const stats = await getPlayerStatistics(playerId, playerType);
    if (stats) {
      setStatistics(stats);
      
      // Load chart data
      setLoadingCharts(true);
      const [trendData, distributionData] = await Promise.all([
        getPlayerStatisticsTrend(playerId, playerType),
        getScoreDistribution(playerId, playerType, gameTypeFilter)
      ]);
      
      if (trendData) setTrendData(trendData);
      if (distributionData) setScoreDistribution(distributionData);
      setLoadingCharts(false);
    }
  };
  
  const loadFriends = async () => {
    const friendsData = await getFriends();
    if (friendsData) {
      setFriends(friendsData);
    }
  };
  
  const loadRecentGames = async () => {
    if (!user) return;
    
    setLoadingGames(true);
    try {
      const games = await getGames();
      if (games) {
        const gameHistory: GameHistoryItem[] = [];
        
        // Process only the 10 most recent games
        for (const game of games.slice(0, 10)) {
          const players = await getGamePlayers(game.id);
          if (players) {
            const processedPlayers = await Promise.all(players.map(async (player) => {
              let name = '';
              if (player.player_type === 'user' && player.player_id === user.id) {
                name = user.user_metadata?.name || 'You';
              } else if (player.player_type === 'friend') {
                const friend = friends.find(f => f.id === player.player_id);
                name = friend?.name || 'Friend';
              } else {
                name = 'Other Player';
              }
              
              return {
                id: player.player_id,
                name,
                winner: player.winner
              };
            }));
            
            gameHistory.push({
              id: game.id,
              type: game.type,
              created_at: game.created_at,
              players: processedPlayers
            });
          }
        }
        
        setRecentGames(gameHistory);
      }
    } catch (err) {
      console.error('Error loading recent games:', err);
    } finally {
      setLoadingGames(false);
    }
  };
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 0) {
      // Personal stats
      setSelectedPlayerId(user?.id || '');
      setSelectedPlayerType('user');
      if (user) {
        loadStatistics(user.id, 'user');
      }
    }
  };
  
  const handlePlayerChange = (event: any) => {
    const value = event.target.value;
    if (value) {
      const [id, type] = value.split('|');
      setSelectedPlayerId(id);
      setSelectedPlayerType(type as 'user' | 'friend');
      loadStatistics(id, type as 'user' | 'friend');
    }
  };
  
  const handleGameTypeChange = async (event: any) => {
    const newGameType = event.target.value;
    setGameTypeFilter(newGameType);
    
    // Reload score distribution when game type changes
    if (selectedPlayerId) {
      setLoadingCharts(true);
      const distributionData = await getScoreDistribution(
        selectedPlayerId, 
        selectedPlayerType, 
        newGameType
      );
      if (distributionData) setScoreDistribution(distributionData);
      setLoadingCharts(false);
    }
  };
  
  const handleViewGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };
  
  // Filter statistics based on game type
  const filteredStats = gameTypeFilter === 'all' 
    ? statistics 
    : statistics.filter(stat => stat.game_type === gameTypeFilter);
  
  // Calculate aggregated statistics across all game types
  const aggregatedStats = filteredStats.reduce((acc, stat) => {
    return {
      games_played: acc.games_played + stat.games_played,
      games_won: acc.games_won + stat.games_won,
      total_score: acc.total_score + stat.total_score,
      highest_turn: Math.max(acc.highest_turn, stat.highest_turn),
      checkout_percentage: acc.games_played > 0 
        ? (acc.checkout_percentage * acc.games_played + stat.checkout_percentage * stat.games_played) / 
          (acc.games_played + stat.games_played)
        : stat.checkout_percentage,
      average_per_dart: stat.average_per_dart,
      count_180: acc.count_180 + stat.count_180,
    };
  }, {
    games_played: 0,
    games_won: 0,
    total_score: 0,
    highest_turn: 0,
    checkout_percentage: 0,
    average_per_dart: 0,
    count_180: 0,
  });
  
  const winPercentage = aggregatedStats.games_played > 0
    ? (aggregatedStats.games_won / aggregatedStats.games_played) * 100
    : 0;

  // Generate detailed stats for the card
  const detailedStats = [
    { label: 'Highest Turn', value: aggregatedStats.highest_turn },
    { label: 'Games Won', value: aggregatedStats.games_won },
    { label: 'Checkout %', value: `${aggregatedStats.checkout_percentage.toFixed(1)}%` },
    { label: 'Total Score', value: aggregatedStats.total_score },
  ];

  // Prepare game type breakdown
  const gameTypeBreakdown = statistics.map(stat => ({
    game_type: stat.game_type,
    games_played: stat.games_played,
    games_won: stat.games_won,
    win_percentage: stat.games_played > 0 ? (stat.games_won / stat.games_played) * 100 : 0,
    average_per_dart: stat.average_per_dart,
    highest_turn: stat.highest_turn
  }));

  // Format data for game type comparison chart
  const gameTypeComparisonData = statistics.map(stat => ({
    gameType: stat.game_type,
    averagePerDart: stat.average_per_dart,
    winPercentage: stat.games_played > 0 ? (stat.games_won / stat.games_played) * 100 : 0,
    highestTurn: stat.highest_turn,
    checkoutPercentage: stat.checkout_percentage
  }));

  return (
    <Container maxWidth="md" sx={{ py: 4, pb: 10 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Statistics
        </Typography>
        
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ mt: 2, mb: 2 }}
        >
          <Tab label="Personal" />
          <Tab label="Player Stats" />
        </Tabs>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ my: 4 }}>
          <Typography color="error">Error loading statistics: {error.message}</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            {tabValue === 1 && (
              <FormControl fullWidth sx={{ maxWidth: { sm: 300 } }}>
                <InputLabel id="player-select-label">Player</InputLabel>
                <Select
                  labelId="player-select-label"
                  value={`${selectedPlayerId}|${selectedPlayerType}`}
                  label="Player"
                  onChange={handlePlayerChange}
                >
                  <MenuItem value={`${user?.id}|user`}>{user?.user_metadata?.name || 'You'}</MenuItem>
                  <Divider />
                  {friends.map(friend => (
                    <MenuItem key={friend.id} value={`${friend.id}|friend`}>{friend.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <FormControl fullWidth sx={{ maxWidth: { sm: 200 } }}>
              <InputLabel id="game-type-label">Game Type</InputLabel>
              <Select
                labelId="game-type-label"
                value={gameTypeFilter}
                label="Game Type"
                onChange={handleGameTypeChange}
              >
                <MenuItem value="all">All Games</MenuItem>
                <MenuItem value="301">301</MenuItem>
                <MenuItem value="501">501</MenuItem>
                <MenuItem value="701">701</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <StatisticCard 
              title="Games Played" 
              value={aggregatedStats.games_played} 
              icon={<SportsCricketIcon fontSize="large" />} 
            />
            <StatisticCard 
              title="Win Rate" 
              value={`${winPercentage.toFixed(1)}%`} 
              icon={<EmojiEventsIcon fontSize="large" />} 
            />
            <StatisticCard 
              title="Avg Per Dart" 
              value={aggregatedStats.average_per_dart.toFixed(1)} 
              icon={<SpeedIcon fontSize="large" />} 
            />
            <StatisticCard 
              title="180s" 
              value={aggregatedStats.count_180} 
              icon={<ScoreboardIcon fontSize="large" />} 
            />
          </Grid>
          
          {/* Charts Section */}
          {loadingCharts ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {trendData.length > 1 && (
                <PerformanceTrendChart data={trendData} />
              )}
              
              {gameTypeComparisonData.length > 1 && (
                <GameTypeComparisonChart data={gameTypeComparisonData} />
              )}
              
              {scoreDistribution.length > 0 && (
                <ScoreDistributionChart data={scoreDistribution} />
              )}
            </>
          )}
          
          <DetailedStatsCard 
            title="Detailed Statistics" 
            stats={detailedStats}
          />
          
          {gameTypeFilter === 'all' && (
            <GameTypeStats gameTypeStats={gameTypeBreakdown} />
          )}
          
          {tabValue === 0 && (
            <RecentGames games={recentGames} onViewGame={handleViewGame} />
          )}
          
          {filteredStats.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No statistics available for the selected filters.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Play some games to see your statistics here!
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default Statistics; 