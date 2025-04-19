import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  CircularProgress, 
  Card, 
  CardContent, 
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import { 
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  EmojiEvents as EmojiEventsIcon,
  SportsCricket as SportsCricketIcon,
  Delete as DeleteIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import RivalryHistoryChart from '@/components/statistics/RivalryHistoryChart';
import GameTypeBreakdownChart from '@/components/statistics/GameTypeBreakdownChart';

interface Rival {
  id: string;
  player1_id: string;
  player1_type: 'user' | 'friend';
  player2_id: string;
  player2_type: 'user' | 'friend';
  player1_wins: number;
  player2_wins: number;
  last_game_id: string | null;
  highlighted: boolean;
  player1_name?: string;
  player2_name?: string;
}

interface RivalDetails {
  player1_wins: number;
  player2_wins: number;
  total_games: number;
  last_game_date: string | null;
  player1_avg: number;
  player2_avg: number;
  player1_best: number;
  player2_best: number;
  win_streak: number;
  streak_holder: 'player1' | 'player2' | null;
  recent_games?: any[];
  game_type_breakdown?: any[];
}

const Rivals = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    getRivals, 
    getFriends, 
    getRivalryStats, 
    getPlayerStatistics,
    getGames,
    loading,
    error,
    toggleRivalHighlight,
    deleteRival
  } = useSupabase();
  
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedRival, setSelectedRival] = useState<Rival | null>(null);
  const [rivalDetails, setRivalDetails] = useState<RivalDetails | null>(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openNewRivalDialog, setOpenNewRivalDialog] = useState(false);
  const [player1, setPlayer1] = useState<string>('');
  const [player2, setPlayer2] = useState<string>('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  useEffect(() => {
    if (user) {
      loadRivals();
      loadFriends();
    }
  }, [user]);
  
  const loadRivals = async () => {
    const data = await getRivals();
    if (data) {
      // Fetch names for each rival
      const enrichedRivals = await Promise.all(
        data.map(async (rival) => {
          let player1Name = '';
          let player2Name = '';
          
          if (rival.player1_type === 'user' && rival.player1_id === user?.id) {
            player1Name = user?.user_metadata?.name || 'You';
          } else if (rival.player1_type === 'friend') {
            const friend = friends.find(f => f.id === rival.player1_id);
            player1Name = friend?.name || 'Friend';
          }
          
          if (rival.player2_type === 'user' && rival.player2_id === user?.id) {
            player2Name = user?.user_metadata?.name || 'You';
          } else if (rival.player2_type === 'friend') {
            const friend = friends.find(f => f.id === rival.player2_id);
            player2Name = friend?.name || 'Friend';
          }
          
          return {
            ...rival,
            player1_name: player1Name,
            player2_name: player2Name
          };
        })
      );
      
      // Sort by highlighted first, then by total games
      const sortedRivals = enrichedRivals.sort((a, b) => {
        if (a.highlighted !== b.highlighted) {
          return a.highlighted ? -1 : 1;
        }
        const aTotalGames = a.player1_wins + a.player2_wins;
        const bTotalGames = b.player1_wins + b.player2_wins;
        return bTotalGames - aTotalGames;
      });
      
      setRivals(sortedRivals);
    }
  };
  
  const loadFriends = async () => {
    const friendsData = await getFriends();
    if (friendsData) {
      setFriends(friendsData);
    }
  };
  
  const handleViewRivalDetails = async (rival: Rival) => {
    setSelectedRival(rival);
    setLoadingDetails(true);
    
    // Get detailed rivalry statistics
    const stats = await getRivalryStats(rival.player1_id, rival.player2_id);
    if (stats) {
      // Get player averages from their statistics
      const [player1Stats, player2Stats] = await Promise.all([
        getPlayerStatistics(rival.player1_id, rival.player1_type),
        getPlayerStatistics(rival.player2_id, rival.player2_type)
      ]);
      
      // Get recent games to calculate streak
      const games = await getGames();
      let currentStreak = 0;
      let streakHolder: 'player1' | 'player2' | null = null;
      
      if (games) {
        // Filter games between these two players and sort by date (newest first)
        const relevantGames = games
          .filter(game => {
            return game.id === rival.last_game_id || game.rivalry_ids?.includes(rival.id);
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Calculate current streak
        if (relevantGames.length > 0) {
          const latestWinner = relevantGames[0].winner_id === rival.player1_id ? 'player1' : 'player2';
          streakHolder = latestWinner;
          
          for (const game of relevantGames) {
            const gameWinner = game.winner_id === rival.player1_id ? 'player1' : 'player2';
            if (gameWinner === streakHolder) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }
      
      // Calculate average per dart
      const player1Avg = player1Stats ? 
        player1Stats.reduce((sum, stat) => sum + stat.average_per_dart, 0) / player1Stats.length : 
        0;
      
      const player2Avg = player2Stats ? 
        player2Stats.reduce((sum, stat) => sum + stat.average_per_dart, 0) / player2Stats.length : 
        0;
      
      // Calculate highest turn
      const player1Best = player1Stats ? 
        Math.max(...player1Stats.map(stat => stat.highest_turn)) : 
        0;
      
      const player2Best = player2Stats ? 
        Math.max(...player2Stats.map(stat => stat.highest_turn)) : 
        0;
      
      setRivalDetails({
        player1_wins: stats.player1_wins,
        player2_wins: stats.player2_wins,
        total_games: stats.total_games,
        last_game_date: stats.last_game_date,
        player1_avg: player1Avg,
        player2_avg: player2Avg,
        player1_best: player1Best,
        player2_best: player2Best,
        win_streak: currentStreak,
        streak_holder: streakHolder,
        recent_games: stats.recent_games || [],
        game_type_breakdown: stats.game_type_breakdown || []
      });
    }
    
    setLoadingDetails(false);
    setOpenDetailDialog(true);
  };
  
  const handleCloseDetailDialog = () => {
    setOpenDetailDialog(false);
    setSelectedRival(null);
    setRivalDetails(null);
  };
  
  const handleOpenNewRivalDialog = () => {
    setOpenNewRivalDialog(true);
  };
  
  const handleCloseNewRivalDialog = () => {
    setOpenNewRivalDialog(false);
    setPlayer1('');
    setPlayer2('');
  };
  
  const handleAddNewRival = async () => {
    if (!player1 || !player2 || player1 === player2) return;
    
    const [player1Id, player1Type] = player1.split('|');
    const [player2Id, player2Type] = player2.split('|');
    
    await addRival(
      player1Id, 
      player1Type as 'user' | 'friend',
      player2Id, 
      player2Type as 'user' | 'friend'
    );
    
    handleCloseNewRivalDialog();
    loadRivals();
  };
  
  const handleToggleHighlight = async (rivalId: string, highlighted: boolean) => {
    await toggleRivalHighlight(rivalId, !highlighted);
    loadRivals();
  };
  
  const handleDeleteRival = async (rivalId: string) => {
    await deleteRival(rivalId);
    loadRivals();
  };
  
  return (
    <Container maxWidth="md" sx={{ py: 4, pb: 10 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Rivalries
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleOpenNewRivalDialog}
        >
          New Rivalry
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ my: 4 }}>
          <Typography color="error">Error loading rivalries: {error.message}</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {rivals.length > 0 ? (
            rivals.map((rival) => (
              <Grid item xs={12} sm={6} key={rival.id}>
                <Card 
                  sx={{ 
                    borderRadius: 2,
                    position: 'relative',
                    ...(rival.highlighted && {
                      borderColor: 'primary.main',
                      borderWidth: 2,
                      borderStyle: 'solid'
                    })
                  }}
                >
                  <CardContent>
                    <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleToggleHighlight(rival.id, rival.highlighted)}
                        color={rival.highlighted ? 'primary' : 'default'}
                      >
                        {rival.highlighted ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                      <IconButton 
                        size="small"
                        color="error"
                        onClick={() => handleDeleteRival(rival.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography variant="h6">{rival.player1_name}</Typography>
                        <Typography 
                          variant="h3" 
                          color={rival.player1_wins > rival.player2_wins ? 'primary' : 'text.secondary'}
                          fontWeight="bold"
                        >
                          {rival.player1_wins}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mx: 2 }}>
                        <Typography variant="h5" color="text.secondary">vs</Typography>
                      </Box>
                      
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography variant="h6">{rival.player2_name}</Typography>
                        <Typography 
                          variant="h3" 
                          color={rival.player2_wins > rival.player1_wins ? 'primary' : 'text.secondary'}
                          fontWeight="bold"
                        >
                          {rival.player2_wins}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Typography variant="body1">
                        {rival.player1_wins + rival.player2_wins} total matches
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Button 
                        variant="outlined" 
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => handleViewRivalDetails(rival)}
                      >
                        View Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No rivalries yet. Create one to start tracking!
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
      
      {/* Rivalry Details Dialog */}
      <Dialog 
        open={openDetailDialog} 
        onClose={handleCloseDetailDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Rivalry Details
          {selectedRival && (
            <Typography variant="subtitle1">
              {selectedRival.player1_name} vs {selectedRival.player2_name}
            </Typography>
          )}
        </DialogTitle>
        
        <DialogContent dividers>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : rivalDetails && selectedRival ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6">{selectedRival.player1_name}</Typography>
                  <Typography 
                    variant="h3" 
                    color={rivalDetails.player1_wins > rivalDetails.player2_wins ? 'primary' : 'text.secondary'}
                    fontWeight="bold"
                  >
                    {rivalDetails.player1_wins}
                  </Typography>
                </Box>
                
                <Box sx={{ mx: 2 }}>
                  <Typography variant="h5" color="text.secondary">vs</Typography>
                </Box>
                
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6">{selectedRival.player2_name}</Typography>
                  <Typography 
                    variant="h3" 
                    color={rivalDetails.player2_wins > rivalDetails.player1_wins ? 'primary' : 'text.secondary'}
                    fontWeight="bold"
                  >
                    {rivalDetails.player2_wins}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {rivalDetails.win_streak > 1 && (
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                  <Chip 
                    icon={<EmojiEventsIcon />} 
                    label={`${rivalDetails.streak_holder === 'player1' ? selectedRival.player1_name : selectedRival.player2_name} is on a ${rivalDetails.win_streak} game winning streak!`}
                    color="primary"
                  />
                </Box>
              )}
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Average Per Dart</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <Typography fontWeight="bold">{selectedRival.player1_name}:</Typography>
                        <Typography>{rivalDetails.player1_avg.toFixed(1)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight="bold">{selectedRival.player2_name}:</Typography>
                        <Typography>{rivalDetails.player2_avg.toFixed(1)}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6}>
                  <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Best Turn</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <Typography fontWeight="bold">{selectedRival.player1_name}:</Typography>
                        <Typography>{rivalDetails.player1_best}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight="bold">{selectedRival.player2_name}:</Typography>
                        <Typography>{rivalDetails.player2_best}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Typography variant="body2" color="text.secondary">
                Win Rate
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                <Box sx={{ 
                  flex: rivalDetails.player1_wins, 
                  bgcolor: 'primary.main', 
                  height: 20, 
                  borderTopLeftRadius: 10, 
                  borderBottomLeftRadius: 10 
                }} />
                <Box sx={{ 
                  flex: rivalDetails.player2_wins, 
                  bgcolor: 'secondary.main', 
                  height: 20, 
                  borderTopRightRadius: 10, 
                  borderBottomRightRadius: 10 
                }} />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="body2">
                  {selectedRival.player1_name}: {(rivalDetails.player1_wins / rivalDetails.total_games * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2">
                  {selectedRival.player2_name}: {(rivalDetails.player2_wins / rivalDetails.total_games * 100).toFixed(1)}%
                </Typography>
              </Box>
              
              {/* Match History Chart */}
              {rivalDetails.recent_games && rivalDetails.recent_games.length > 0 && (
                <RivalryHistoryChart 
                  recentGames={rivalDetails.recent_games}
                  player1Name={selectedRival.player1_name}
                  player2Name={selectedRival.player2_name}
                />
              )}
              
              {/* Game Type Breakdown Chart */}
              {rivalDetails.game_type_breakdown && rivalDetails.game_type_breakdown.length > 0 && (
                <GameTypeBreakdownChart 
                  data={rivalDetails.game_type_breakdown}
                  player1Name={selectedRival.player1_name}
                  player2Name={selectedRival.player2_name}
                />
              )}
              
              {rivalDetails.last_game_date && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Last played: {new Date(rivalDetails.last_game_date).toLocaleDateString()}
                </Typography>
              )}
            </>
          ) : (
            <Typography>No details available</Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDetailDialog}>Close</Button>
          {selectedRival && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SportsCricketIcon />}
              onClick={() => {
                handleCloseDetailDialog();
                navigate('/game/new', { 
                  state: { 
                    rivals: [
                      { 
                        id: selectedRival.player1_id, 
                        type: selectedRival.player1_type, 
                        name: selectedRival.player1_name 
                      },
                      { 
                        id: selectedRival.player2_id, 
                        type: selectedRival.player2_type, 
                        name: selectedRival.player2_name 
                      }
                    ] 
                  } 
                });
              }}
            >
              Start New Game
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* New Rivalry Dialog */}
      <Dialog 
        open={openNewRivalDialog} 
        onClose={handleCloseNewRivalDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Create New Rivalry</DialogTitle>
        
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="player1-label">Player 1</InputLabel>
              <Select
                labelId="player1-label"
                value={player1}
                label="Player 1"
                onChange={(e) => setPlayer1(e.target.value as string)}
              >
                <MenuItem value={`${user?.id}|user`}>{user?.user_metadata?.name || 'You'}</MenuItem>
                <Divider />
                {friends.map(friend => (
                  <MenuItem key={friend.id} value={`${friend.id}|friend`}>{friend.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel id="player2-label">Player 2</InputLabel>
              <Select
                labelId="player2-label"
                value={player2}
                label="Player 2"
                onChange={(e) => setPlayer2(e.target.value as string)}
              >
                {player1 !== `${user?.id}|user` && (
                  <MenuItem value={`${user?.id}|user`}>{user?.user_metadata?.name || 'You'}</MenuItem>
                )}
                <Divider />
                {friends
                  .filter(friend => {
                    const friendValue = `${friend.id}|friend`;
                    return friendValue !== player1;
                  })
                  .map(friend => (
                    <MenuItem key={friend.id} value={`${friend.id}|friend`}>{friend.name}</MenuItem>
                  ))
                }
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseNewRivalDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleAddNewRival}
            disabled={!player1 || !player2 || player1 === player2}
          >
            Create Rivalry
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Rivals; 