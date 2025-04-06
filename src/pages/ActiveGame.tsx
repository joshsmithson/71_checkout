import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  IconButton
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useUI } from '@/contexts/UIContext';
import { motion } from 'framer-motion';
import ScoreEntry from '@/components/game/ScoreEntry';
import Celebration from '@/components/game/Celebration';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import HomeIcon from '@mui/icons-material/Home';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

// Define types
interface Player {
  id: string;
  type: 'user' | 'friend';
  name: string;
  order: number;
  score: number;
  startingScore: number;
}

interface Turn {
  id: string;
  player_id: string;
  player_type: string;
  turn_number: number;
  scores: number[];
  remaining: number;
  checkout: boolean;
}

// Create motion components using the recommended API
const MotionCard = motion.create(Card);

const ActiveGame = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showCelebration } = useUI();
  const { 
    getGameById, 
    getGamePlayers, 
    getTurns, 
    getCheckoutSuggestion,
    addTurn,
    updateGameStatus,
    setGameWinner,
    deleteGame,
    loading,
    getFriends
  } = useSupabase();

  // Game state
  const [gameData, setGameData] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [temporaryScore, setTemporaryScore] = useState<number | null>(null);
  const [checkoutSuggestion, setCheckoutSuggestion] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [turnNumber, setTurnNumber] = useState(1);
  const [showTurnHistory, setShowTurnHistory] = useState(false);
  const [show180Celebration, setShow180Celebration] = useState(false);
  const [confirmEndGame, setConfirmEndGame] = useState(false);
  const [confirmPauseGame, setConfirmPauseGame] = useState(false);
  const [confirmExitGame, setConfirmExitGame] = useState(false);
  const [confirmDeleteGame, setConfirmDeleteGame] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Game options menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(menuAnchorEl);
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Load game data
  useEffect(() => {
    const loadGameData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load game details
        const game = await getGameById(id);
        if (!game) {
          throw new Error('Game not found');
        }
        setGameData(game);

        // Load players
        const gamePlayers = await getGamePlayers(id);
        if (!gamePlayers) {
          throw new Error('Failed to load players');
        }

        // Get all friends first to have their data available
        const friendsList = await getFriends();
        
        // Create players array with additional info
        const playerArray: Player[] = await Promise.all(
          gamePlayers.map(async (player) => {
            let name = 'Unknown';
            
            // Get player name
            if (player.player_type === 'user' && player.player_id === user?.id) {
              name = user.user_metadata.name || 'You';
            } else if (player.player_type === 'friend') {
              // Find the friend name from our friends list
              const friend = friendsList?.find(f => f.id === player.player_id);
              if (friend) {
                name = friend.name;
              } else {
                // Fallback
                name = 'Friend ' + player.order;
              }
            }

            return {
              id: player.player_id,
              type: player.player_type as 'user' | 'friend',
              name,
              order: player.order,
              score: player.starting_score,
              startingScore: player.starting_score
            };
          })
        );

        // Sort players by order
        playerArray.sort((a, b) => a.order - b.order);
        setPlayers(playerArray);

        // Load turns
        const gameTurns = await getTurns(id);
        if (gameTurns && gameTurns.length > 0) {
          setTurns(gameTurns);

          // Apply turns to player scores
          const updatedPlayers = [...playerArray];
          gameTurns.forEach(turn => {
            const playerIndex = updatedPlayers.findIndex(
              p => p.id === turn.player_id && p.type === turn.player_type
            );
            if (playerIndex !== -1) {
              updatedPlayers[playerIndex].score = turn.remaining;
            }
          });
          setPlayers(updatedPlayers);

          // Set turn number for next turn
          setTurnNumber(Math.floor(gameTurns.length / playerArray.length) + 1);

          // Determine current player
          // Find the last player who took a turn
          const lastTurn = gameTurns[gameTurns.length - 1];
          const lastPlayerIndex = updatedPlayers.findIndex(
            p => p.id === lastTurn.player_id && p.type === lastTurn.player_type
          );
          
          // Next player is the one after the last player
          setCurrentPlayerIndex((lastPlayerIndex + 1) % updatedPlayers.length);
        }

        // Get checkout suggestion for current player
        if (playerArray.length > 0) {
          const currentPlayer = playerArray[currentPlayerIndex];
          if (currentPlayer && currentPlayer.score <= 170) {
            const suggestion = await getCheckoutSuggestion(currentPlayer.score);
            setCheckoutSuggestion(suggestion);
          } else {
            setCheckoutSuggestion(null);
          }
        }
      } catch (error) {
        console.error('Error loading game:', error);
        setError('Failed to load game data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();
    // Only run when game id changes or user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Reset temporary score when changing to a new player
  useEffect(() => {
    setTemporaryScore(null);
  }, [currentPlayerIndex]);

  // Reset temporary score when component unmounts
  useEffect(() => {
    return () => {
      setTemporaryScore(null);
    };
  }, []);

  // Handle score submission
  const handleScoreSubmit = async (scores: number[]) => {
    if (!id || !gameData || players.length === 0) return;

    // Prevent processing if already submitting
    if (isSubmittingScore) return;

    try {
      const currentPlayer = players[currentPlayerIndex];
      if (!currentPlayer) return;

      // Check if this is a running update (not final submission)
      const isRunningUpdate = scores.length > 0 && scores[scores.length - 1] === -1;
      
      if (isRunningUpdate) {
        // For running updates, don't block the UI
        // Remove the marker (-1) and calculate temporary score
        const actualScores = scores.slice(0, -1);
        const runningTotal = actualScores.reduce((sum, score) => sum + score, 0);
        const temporaryRemaining = currentPlayer.score - runningTotal;
        
        // Update temporary score for display purposes
        const validTemporaryScore = temporaryRemaining < 0 || temporaryRemaining === 1 
          ? currentPlayer.score // Show original score if it would bust
          : temporaryRemaining;
        
        setTemporaryScore(validTemporaryScore);
        
        // Get checkout suggestion for current player's temporary score - don't await this
        if (validTemporaryScore <= 170 && validTemporaryScore > 1) {
          getCheckoutSuggestion(validTemporaryScore)
            .then(suggestion => {
              setCheckoutSuggestion(suggestion);
            })
            .catch(error => {
              console.error("Error getting checkout suggestion:", error);
            });
        } else {
          setCheckoutSuggestion(null);
        }
        
        // Just update UI, don't record the turn yet
        return;
      }

      // Reset temporary score
      setTemporaryScore(null);

      // From here on is handling the final submission (all 3 darts or manual submission)
      // Set a flag to prevent multiple submissions
      setIsSubmittingScore(true);
      
      // Calculate the total score for this turn
      const turnScore = scores.reduce((sum, score) => sum + score, 0);
      
      // Calculate remaining score
      let remaining = currentPlayer.score - turnScore;
      
      // Handle busts (score = 0 or 1 is a bust)
      let isBust = false;
      if (remaining < 0 || remaining === 1) {
        remaining = currentPlayer.score;
        isBust = true;
      }
      
      // Check if player has won (checkout)
      const isCheckout = remaining === 0;
      
      // Create turn record - don't block UI while waiting for the database
      let turn;
      try {
        turn = await addTurn(
          id,
          currentPlayer.id,
          currentPlayer.type,
          turnNumber,
          isBust ? [0] : scores,
          remaining,
          isCheckout
        );
      } catch (error) {
        console.error('Failed to record turn:', error);
        setError('Failed to record turn. Please try again.');
        setIsSubmittingScore(false);
        return;
      }

      if (!turn) {
        setError('Failed to record turn. Please try again.');
        setIsSubmittingScore(false);
        return;
      }

      // Update players with the new score before updating the UI
      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIndex].score = remaining;
      
      // If player has won
      if (isCheckout) {
        // Update player as winner and game status
        try {
          await Promise.all([
            setGameWinner(id, currentPlayer.id, currentPlayer.type),
            updateGameStatus(id, 'completed')
          ]);
        } catch (error) {
          console.error('Error updating game status:', error);
          // Continue anyway, as the turn was recorded successfully
        }
        
        // Update state before showing dialog to prevent flickering
        setPlayers(updatedPlayers);
        setTurns(prevTurns => [...prevTurns, turn]);
        
        // Show confirmation dialog
        setConfirmEndGame(true);
        setIsSubmittingScore(false);
        return;
      }

      // Move to next player
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      
      // Update turn number if we've gone through all players
      const newTurnNumber = nextPlayerIndex === 0 ? turnNumber + 1 : turnNumber;
      
      // Get checkout suggestion for next player - don't block UI
      const nextPlayer = updatedPlayers[nextPlayerIndex];
      let newCheckoutSuggestion = null;
      
      // Update state first, then fetch checkout suggestion separately
      setPlayers(updatedPlayers);
      setTurns(prevTurns => [...prevTurns, turn]);
      setCurrentPlayerIndex(nextPlayerIndex);
      setTurnNumber(newTurnNumber);
      
      // Get checkout suggestion after state updates
      if (nextPlayer.score <= 170 && nextPlayer.score > 1) {
        getCheckoutSuggestion(nextPlayer.score)
          .then(suggestion => {
            setCheckoutSuggestion(suggestion);
          })
          .catch(error => {
            console.error('Error getting checkout suggestion:', error);
          });
      } else {
        setCheckoutSuggestion(null);
      }
      
      // Reset submission flag
      setIsSubmittingScore(false);

    } catch (error) {
      console.error('Error submitting score:', error);
      setError('Failed to submit score. Please try again.');
    } finally {
      // Reset the flag after processing in case an unexpected error occurs
      setIsSubmittingScore(false);
    }
  };

  // Handle celebration for 180
  const handle180Celebration = () => {
    setShow180Celebration(true);
  };

  // Handle game pause
  const handlePauseGame = async () => {
    if (!id || !gameData) return;

    try {
      await updateGameStatus(id, 'paused');
      setConfirmPauseGame(false);
      navigate('/');
    } catch (error) {
      console.error('Error pausing game:', error);
      setError('Failed to pause game. Please try again.');
    }
  };

  // Handle game resume
  const handleResumeGame = async () => {
    if (!id || !gameData) return;

    try {
      await updateGameStatus(id, 'active');
      // No need to navigate, we're already on the game page
      // Just update the local game data
      setGameData({
        ...gameData,
        status: 'active'
      });
    } catch (error) {
      console.error('Error resuming game:', error);
      setError('Failed to resume game. Please try again.');
    }
  };

  // Handle game deletion
  const handleDeleteGame = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await deleteGame(id);
      setConfirmDeleteGame(false);
      // Navigate back to home after successful deletion
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error deleting game:', error);
      setError('Failed to delete game. Please try again.');
      setIsDeleting(false);
    }
  };

  // Handle exit to home
  const handleExitToHome = () => {
    navigate('/');
  };

  // Handle game complete
  const handleGameComplete = () => {
    navigate('/');
  };

  // Display loading state
  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Display error state
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </Container>
    );
  }

  // Get current player
  const currentPlayer = players[currentPlayerIndex] || null;
  const isPaused = gameData?.status === 'paused';
  const isCompleted = gameData?.status === 'completed';

  return (
    <Container maxWidth="sm" sx={{ py: 4, pb: 10 }}>
      {/* Game Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight="bold">
            {gameData?.type} Game
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!isCompleted ? `Turn ${turnNumber}` : 'Completed'}
            {isPaused && <Chip size="small" label="PAUSED" color="warning" sx={{ ml: 1 }} />}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<HistoryIcon />}
            onClick={() => setShowTurnHistory(true)}
          >
            History
          </Button>
          {isPaused ? (
            <Button 
              variant="outlined" 
              size="small" 
              color="success"
              startIcon={<PlayArrowIcon />}
              onClick={handleResumeGame}
            >
              Resume
            </Button>
          ) : !isCompleted && (
            <Button 
              variant="outlined" 
              size="small" 
              color="warning"
              startIcon={<PauseIcon />}
              onClick={() => setConfirmPauseGame(true)}
            >
              Pause
            </Button>
          )}
          <IconButton 
            aria-label="more options"
            aria-controls="game-menu"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            size="small"
          >
            <MoreVertIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Game options menu */}
      <Menu
        id="game-menu"
        anchorEl={menuAnchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        MenuListProps={{
          'aria-labelledby': 'game-options',
        }}
      >
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            setConfirmExitGame(true);
          }}
        >
          <ListItemIcon>
            <HomeIcon fontSize="small" />
          </ListItemIcon>
          Exit to Home
        </MenuItem>
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            setConfirmDeleteGame(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete Game
        </MenuItem>
      </Menu>

      {/* Game Paused Alert */}
      {isPaused && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={handleResumeGame}
            >
              Resume
            </Button>
          }
        >
          This game is currently paused. Click Resume to continue playing.
        </Alert>
      )}

      {/* Current Player & Player List Combined Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {currentPlayer && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h2" fontWeight="bold">
                  {currentPlayer.name}
                  {isSubmittingScore && (
                    <CircularProgress size={16} color="secondary" sx={{ ml: 1, verticalAlign: 'middle' }} />
                  )}
                </Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h4" component="div" fontWeight="bold" className="scores" 
                    sx={{ 
                      color: temporaryScore !== null ? 'info.main' : 'primary.main',
                      transition: 'color 0.3s ease'
                    }}>
                    {temporaryScore !== null ? temporaryScore : currentPlayer.score}
                  </Typography>
                  {temporaryScore !== null && (
                    <Typography variant="caption" color="text.secondary">
                      Calculating...
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            All Players
          </Typography>
          <Stack 
            divider={<Divider />} 
            spacing={0.5}
          >
            {players.map((player, index) => (
              <Box 
                key={`player-${player.id}-${player.type}`}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  py: 0.5,
                  bgcolor: index === currentPlayerIndex ? 'action.selected' : 'transparent',
                  borderRadius: 1
                }}
              >
                <Typography variant="body2">
                  {player.name}
                  {index === currentPlayerIndex && !isPaused && ' (Current)'}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {player.score}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Score Entry section - only show if game is active */}
      {!isPaused && !isCompleted && (
        <>
          {/* Checkout Suggestion - Fixed height container to prevent layout shifts */}
          <Box sx={{ minHeight: currentPlayer && currentPlayer.score <= 170 && currentPlayer.score > 1 ? '100px' : '0px', mb: 3, opacity: 1, transition: 'min-height 0.2s ease-in-out' }}>
            {checkoutSuggestion && currentPlayer && currentPlayer.score <= 170 && currentPlayer.score > 1 && (
              <Paper sx={{ p: 2, bgcolor: 'success.dark' }}>
                <Typography variant="body2" color="text.secondary">
                  Checkout Suggestion
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {currentPlayer.score} = {checkoutSuggestion.join(' → ')}
                </Typography>
              </Paper>
            )}
          </Box>

          {/* Score Entry with fixed container */}
          <Box sx={{ mb: 3, opacity: 1 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Enter Score
            </Typography>
            {currentPlayer && (
              <ScoreEntry 
                key={`score-entry-${currentPlayerIndex}`}
                currentPlayerScore={currentPlayer.score}
                onScoreSubmit={handleScoreSubmit}
                onCelebrate180={handle180Celebration}
              />
            )}
          </Box>
        </>
      )}

      {/* Turn History Dialog */}
      <Dialog 
        open={showTurnHistory} 
        onClose={() => setShowTurnHistory(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Turn History</DialogTitle>
        <DialogContent>
          {turns.length === 0 ? (
            <Typography variant="body1" textAlign="center" sx={{ py: 2 }}>
              No turns recorded yet
            </Typography>
          ) : (
            <Stack divider={<Divider />} spacing={1} sx={{ mt: 1 }}>
              {turns.map((turn, index) => {
                const player = players.find(p => p.id === turn.player_id && p.type === turn.player_type);
                const turnScore = turn.scores.reduce((sum, score) => sum + score, 0);
                
                return (
                  <Box key={index} sx={{ py: 1 }}>
                    <Typography variant="subtitle2">
                      {player?.name || 'Unknown'} - Turn {Math.floor(index / players.length) + 1}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        {turn.scores.join(' + ')} = {turnScore}
                      </Typography>
                      <Typography variant="body2">
                        Remaining: {turn.remaining}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTurnHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* 180 Celebration */}
      <Celebration 
        open={show180Celebration} 
        onClose={() => setShow180Celebration(false)} 
      />

      {/* Pause Game Confirmation */}
      <Dialog
        open={confirmPauseGame}
        onClose={() => setConfirmPauseGame(false)}
      >
        <DialogTitle>Pause Game</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to pause this game? You can resume it later from the home screen.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPauseGame(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handlePauseGame}
          >
            Pause Game
          </Button>
        </DialogActions>
      </Dialog>

      {/* Game Completed Dialog */}
      <Dialog
        open={confirmEndGame}
        onClose={() => setConfirmEndGame(false)}
      >
        <DialogTitle>Game Completed!</DialogTitle>
        <DialogContent>
          <Typography variant="h5" gutterBottom textAlign="center" sx={{ mt: 2 }}>
            {players.find(p => p.score === 0)?.name || 'Player'} Wins!
          </Typography>
          <Typography>
            The game has been completed and statistics have been updated.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleGameComplete}
            startIcon={<HomeIcon />}
          >
            Return to Home
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exit Game Confirmation */}
      <Dialog
        open={confirmExitGame}
        onClose={() => setConfirmExitGame(false)}
      >
        <DialogTitle>Exit Game?</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to exit this game? Your progress will be saved and you can return later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmExitGame(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleExitToHome}
          >
            Exit Game
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Game Confirmation */}
      <Dialog
        open={confirmDeleteGame}
        onClose={() => setConfirmDeleteGame(false)}
      >
        <DialogTitle>Delete Game?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this game? This action cannot be undone and all game data will be permanently removed.
          </Typography>
          {isCompleted && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This is a completed game. Deleting it will remove it from your game history and may affect your statistics.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDeleteGame(false)} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteGame}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete Game'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActiveGame;