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
  useTheme,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';
import SpeedIcon from '@mui/icons-material/Speed';
import GavelIcon from '@mui/icons-material/Gavel';
import TargetIcon from '@mui/icons-material/GpsFixed';
import RefreshIcon from '@mui/icons-material/Refresh';
import StatisticCard from '@/components/statistics/StatisticCard';
import DetailedStatsCard from '@/components/statistics/DetailedStatsCard';
import GameTypeStats from '@/components/statistics/GameTypeStats';
import RecentGames from '@/components/statistics/RecentGames';
import PerformanceTrendChart from '@/components/statistics/PerformanceTrendChart';
import GameTypeComparisonChart from '@/components/statistics/GameTypeComparisonChart';
import ScoreDistributionChart from '@/components/statistics/ScoreDistributionChart';
import { CheckoutSuccessChart } from '@/components/statistics/CheckoutSuccessChart';
import { AverageTurnsChart } from '@/components/statistics/AverageTurnsChart';
import { ScoreHeatmap } from '@/components/statistics/ScoreHeatmap';

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
  const { 
    getPlayerStatistics, 
    getPlayerStatisticsTrend, 
    getScoreDistribution, 
    getFriends, 
    getGames, 
    getGamePlayers, 
    getAverageTurnsPerGameType,
    getCheckoutSuccessData,
    getDartScoreFrequency,
    reconcileUserStatistics,
    loading, 
    error 
  } = useSupabase();
  
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
  const [checkoutSuccessData, setCheckoutSuccessData] = useState<any[]>([]);
  const [averageTurnsData, setAverageTurnsData] = useState<any[]>([]);
  const [dartScoreFrequency, setDartScoreFrequency] = useState<any[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  
  // Reconciliation state
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<any>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
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
      const [
        trendData, 
        distributionData, 
        checkoutData, 
        turnsData,
        scoreFrequency
      ] = await Promise.all([
        getPlayerStatisticsTrend(playerId, playerType),
        getScoreDistribution(playerId, playerType, gameTypeFilter),
        getCheckoutSuccessData(playerId, playerType),
        getAverageTurnsPerGameType(playerId, playerType),
        getDartScoreFrequency(playerId, playerType)
      ]);
      
      if (trendData) setTrendData(trendData);
      if (distributionData) setScoreDistribution(distributionData);
      if (checkoutData) setCheckoutSuccessData(checkoutData);
      if (turnsData) setAverageTurnsData(turnsData);
      if (scoreFrequency) setDartScoreFrequency(scoreFrequency);
      
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

  // Format checkout success data for compatibility with the chart
  const formattedCheckoutData = checkoutSuccessData.map(item => ({
    ...item,
    successes: item.success
  }));

  const handleReconcile = async () => {
    if (!user) return;
    
    setReconciling(true);
    try {
      const result = await reconcileUserStatistics();
      if (result) {
        setReconcileResult(result);
        setSnackbarMessage(result.message);
        setSnackbarSeverity(result.success ? 'success' : 'error');
        setSnackbarOpen(true);
        
        // Reload statistics after successful reconciliation
        if (result.success) {
          loadStatistics(user.id, 'user');
        }
      }
    } catch (err) {
      console.error('Error reconciling statistics:', err);
      setReconcileResult({ success: false, message: 'An error occurred while reconciling statistics.' });
      setSnackbarMessage('An error occurred while reconciling statistics.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setReconciling(false);
    }
  };

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
          
          {/* Reconciliation Section - only show for personal stats */}
          {tabValue === 0 && (
            <Box sx={{ mb: 4, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Statistics Maintenance
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                If you notice inconsistencies in your game counts between the homepage and statistics page, 
                use this tool to recalculate your statistics from the actual game data.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => setReconcileDialogOpen(true)}
                disabled={reconciling}
                size="small"
              >
                {reconciling ? 'Reconciling...' : 'Reconcile Statistics'}
              </Button>
            </Box>
          )}
          
          {/* Charts Section */}
          {loadingCharts ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {trendData.length > 1 && (
                <Box sx={{ mb: 4 }}>
                  <PerformanceTrendChart data={trendData} />
                </Box>
              )}
              
              {gameTypeComparisonData.length > 1 && (
                <Box sx={{ mb: 4 }}>
                  <GameTypeComparisonChart data={gameTypeComparisonData} />
                </Box>
              )}
              
              {/* New visualizations */}
              {averageTurnsData && averageTurnsData.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <AverageTurnsChart data={averageTurnsData} />
                </Box>
              )}
              
              {formattedCheckoutData && formattedCheckoutData.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <CheckoutSuccessChart data={formattedCheckoutData} />
                </Box>
              )}
              
              {dartScoreFrequency && dartScoreFrequency.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <ScoreHeatmap data={dartScoreFrequency} />
                </Box>
              )}
              
              {scoreDistribution.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <ScoreDistributionChart data={scoreDistribution} />
                </Box>
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
          
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={() => setSnackbarOpen(false)}
          >
            <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity}>
              {snackbarMessage}
            </Alert>
          </Snackbar>
          
          {/* Reconciliation Confirmation Dialog */}
          <Dialog
            open={reconcileDialogOpen}
            onClose={() => setReconcileDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Reconcile Statistics
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" gutterBottom>
                This will recalculate all your statistics from scratch based on your actual game data. 
                This process will:
              </Typography>
              <Box component="ul" sx={{ mt: 2, mb: 2 }}>
                <Typography component="li" variant="body2">
                  Delete your current statistics records
                </Typography>
                <Typography component="li" variant="body2">
                  Recalculate games played, wins, scores, and other metrics from actual game data
                </Typography>
                <Typography component="li" variant="body2">
                  Fix any inconsistencies between game records and statistics
                </Typography>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                This operation is safe and only affects the statistics calculations, not your actual game data.
              </Alert>
              {reconcileResult && (
                <Alert 
                  severity={reconcileResult.success ? 'success' : 'error'} 
                  sx={{ mt: 2 }}
                >
                  {reconcileResult.success ? (
                    <>
                      <Typography variant="body2">
                        Statistics reconciled successfully!
                      </Typography>
                      <Typography variant="body2">
                        Games before: {reconcileResult.games_before}
                      </Typography>
                      <Typography variant="body2">
                        Games after: {reconcileResult.games_after}
                      </Typography>
                      {reconcileResult.difference !== 0 && (
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Difference: {reconcileResult.difference > 0 ? '+' : ''}{reconcileResult.difference}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2">
                      {reconcileResult.message}
                    </Typography>
                  )}
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setReconcileDialogOpen(false)}
                disabled={reconciling}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  handleReconcile();
                  setReconcileDialogOpen(false);
                }}
                variant="contained"
                disabled={reconciling}
                startIcon={reconciling ? <CircularProgress size={16} /> : <RefreshIcon />}
              >
                {reconciling ? 'Reconciling...' : 'Reconcile'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Container>
  );
};

export default Statistics; 