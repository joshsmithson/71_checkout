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
import ATWScoreEntry from '@/components/game/ATWScoreEntry';
import ATWProgressTracker from '@/components/game/ATWProgressTracker';
import Celebration from '@/components/game/Celebration';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import HomeIcon from '@mui/icons-material/Home';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { 
  ATWGameType, 
  ATWPlayer, 
  getSequenceForGameType, 
  calculateAdvancement,
  isATWGameType,
  getDisplayNameForGameType
} from '@/types/around-the-world';

// Define types
interface Player {
  id: string;
  type: 'user' | 'friend';
  name: string;
  order: number;
}

interface Turn {
  id: string;
  player_id: string;
  player_type: string;
  game_id: string;
  turn_number: number;
  scores: number[]; // Hit numbers
  remaining: number; // Current position in sequence
  checkout: boolean;
}

// Create motion components using the recommended API
const MotionCard = motion.create(Card);

const ActiveATWGame = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showCelebration } = useUI();
  const { 
    getGameById, 
    getGamePlayers, 
    getTurns, 
    updateGameStatus,
    setGameWinner,
    deleteGame,
    getATWProgress,
    updateATWProgress,
    addATWTurn,
    loading,
    getFriends
  } = useSupabase();

  // Game state
  const [gameData, setGameData] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [atwPlayers, setATWPlayers] = useState<ATWPlayer[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
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
        
        // Verify this is an ATW game
        if (!isATWGameType(game.type)) {
          throw new Error('This is not an Around the World game');
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
              order: player.order
            };
          })
        );

        // Sort players by order
        playerArray.sort((a, b) => a.order - b.order);
        setPlayers(playerArray);

        // Load ATW progress
        const progressData = await getATWProgress(id);
        if (progressData) {
          const atwPlayerArray: ATWPlayer[] = playerArray.map(player => {
            const progress = progressData.find(p => 
              p.player_id === player.id && p.player_type === player.type
            );
            
            return {
              ...player,
              progress: progress || {
                id: '',
                game_id: id,
                player_id: player.id,
                player_type: player.type,
                current_target: 1,
                sequence_position: 1,
                completed_targets: [],
                multiplier_advances: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            };
          });
          
          setATWPlayers(atwPlayerArray);
        }

        // Load turns
        const gameTurns = await getTurns(id);
        if (gameTurns && gameTurns.length > 0) {
          setTurns(gameTurns);

          // Set turn number for next turn
          setTurnNumber(Math.floor(gameTurns.length / playerArray.length) + 1);

          // Determine current player
          // Find the last player who took a turn
          const lastTurn = gameTurns[gameTurns.length - 1];
          const lastPlayerIndex = playerArray.findIndex(
            p => p.id === lastTurn.player_id && p.type === lastTurn.player_type
          );
          
          // Next player is the one after the last player
          setCurrentPlayerIndex((lastPlayerIndex + 1) % playerArray.length);
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

  // Handle score submission for ATW
  const handleScoreSubmit = async (hits: number[], multipliers: number[]) => {
    if (!id || !gameData || players.length === 0 || atwPlayers.length === 0) return;

    // Prevent processing if already submitting
    if (isSubmittingScore) return;

    try {
      const currentPlayer = players[currentPlayerIndex];
      const currentATWPlayer = atwPlayers[currentPlayerIndex];
      if (!currentPlayer || !currentATWPlayer) return;

      setIsSubmittingScore(true);
      
      const gameType = gameData.type as ATWGameType;
      const sequence = getSequenceForGameType(gameType);
      const multiplierAdvances = currentATWPlayer.progress.multiplier_advances;
      
      // Calculate advancement
      let totalAdvances = 0;
      let newPosition = currentATWPlayer.progress.sequence_position;
      let newTarget = currentATWPlayer.progress.current_target;
      const newCompletedTargets = [...currentATWPlayer.progress.completed_targets];
      
      for (let i = 0; i < hits.length; i++) {
        const hit = hits[i];
        const multiplier = multipliers[i];
        
        if (hit === 0) continue; // Miss
        
        const advancement = calculateAdvancement(
          newTarget,
          hit,
          multiplier,
          multiplierAdvances,
          sequence
        );
        
        if (advancement.advances > 0) {
          totalAdvances += advancement.advances;
          newCompletedTargets.push(newTarget);
          
          // Advance position
          newPosition += advancement.advances;
          
          // Update target for next position
          if (newPosition <= sequence.length) {
            newTarget = sequence[newPosition - 1];
          }
        }
      }
      
      // Check if player has won
      const hasWon = newPosition > sequence.length;
      
      // Record the turn
      const turn = await addATWTurn(
        id,
        currentPlayer.id,
        currentPlayer.type,
        turnNumber,
        hits,
        totalAdvances,
        currentATWPlayer.progress.sequence_position,
        newPosition,
        hasWon
      );

      if (!turn) {
        setError('Failed to record turn. Please try again.');
        setIsSubmittingScore(false);
        return;
      }

      // Update ATW progress
      await updateATWProgress(
        id,
        currentPlayer.id,
        currentPlayer.type,
        newTarget,
        newPosition,
        newCompletedTargets
      );

      // Update local state
      const updatedATWPlayers = [...atwPlayers];
      updatedATWPlayers[currentPlayerIndex] = {
        ...currentATWPlayer,
        progress: {
          ...currentATWPlayer.progress,
          current_target: newTarget,
          sequence_position: newPosition,
          completed_targets: newCompletedTargets
        }
      };
      setATWPlayers(updatedATWPlayers);
      setTurns(prevTurns => [...prevTurns, turn]);
      
      // If player has won
      if (hasWon) {
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
        
        // Show confirmation dialog
        setConfirmEndGame(true);
        setIsSubmittingScore(false);
        return;
      }

      // Move to next player
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      
      // Update turn number if we've gone through all players
      const newTurnNumber = nextPlayerIndex === 0 ? turnNumber + 1 : turnNumber;
      
      // Update state
      setCurrentPlayerIndex(nextPlayerIndex);
      setTurnNumber(newTurnNumber);
      
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

  // Get current player and game info
  const currentPlayer = players[currentPlayerIndex] || null;
  const currentATWPlayer = atwPlayers[currentPlayerIndex] || null;
  const isPaused = gameData?.status === 'paused';
  const isCompleted = gameData?.status === 'completed';
  const gameType = gameData?.type as ATWGameType;
  const sequence = getSequenceForGameType(gameType);

  return (
    <Container maxWidth="sm" sx={{ py: 1, pb: 8 }}>
      {/* Game Header */}
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
            {getDisplayNameForGameType(gameType)} {!isCompleted && <Typography component="span" variant="body2" color="text.secondary">Turn {turnNumber}</Typography>}
          </Typography>
          {isPaused && <Chip size="small" label="PAUSED" color="warning" sx={{ mr: 1 }} />}
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton 
            size="small" 
            onClick={() => setShowTurnHistory(true)}
            aria-label="Turn history"
          >
            <HistoryIcon />
          </IconButton>
          {isPaused ? (
            <IconButton
              size="small"
              color="success"
              onClick={handleResumeGame}
              aria-label="Resume game"
            >
              <PlayArrowIcon />
            </IconButton>
          ) : !isCompleted && (
            <IconButton
              size="small"
              color="warning"
              onClick={() => setConfirmPauseGame(true)}
              aria-label="Pause game"
            >
              <PauseIcon />
            </IconButton>
          )}
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            aria-label="game options"
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
          sx={{ mb: 1, py: 0 }}
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
          Game paused
        </Alert>
      )}

      {/* Progress Tracker */}
      <ATWProgressTracker 
        players={atwPlayers}
        sequence={sequence}
        currentPlayerId={currentPlayer?.id || ''}
        currentPlayerType={currentPlayer?.type || 'user'}
      />

      {!isCompleted && !isPaused ? (
        <>
          {/* Score Entry */}
          {currentATWPlayer && (
            <ATWScoreEntry
              gameType={gameType}
              currentTarget={currentATWPlayer.progress.current_target}
              multiplierAdvances={currentATWPlayer.progress.multiplier_advances}
              onScoreSubmit={handleScoreSubmit}
              onCelebrate180={handle180Celebration}
            />
          )}
          
          {/* Fixed Action Bar */}
          <Paper 
            elevation={3} 
            sx={{ 
              position: 'fixed', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              py: 0.5, 
              px: 2, 
              zIndex: 10, 
              borderRadius: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Button
              color="inherit"
              onClick={() => setConfirmExitGame(true)}
              startIcon={<HomeIcon />}
              size="small"
            >
              Exit
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={() => setConfirmPauseGame(true)}
              startIcon={<PauseIcon />}
              size="small"
            >
              Pause
            </Button>
            
            <Button
              color="inherit"
              onClick={() => setShowTurnHistory(true)}
              startIcon={<HistoryIcon />}
              size="small"
            >
              History
            </Button>
          </Paper>
        </>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          {isPaused ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleResumeGame}
              startIcon={<PlayArrowIcon />}
              sx={{ mb: 2 }}
            >
              Continue Game
            </Button>
          ) : (
            <Typography variant="h6" gutterBottom color="success.main">
              Game Completed!
            </Typography>
          )}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={handleExitToHome}
              fullWidth
            >
              Return to Home
            </Button>
          </Box>
        </Box>
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
                
                return (
                  <Box key={index} sx={{ py: 1 }}>
                    <Typography variant="subtitle2">
                      {player?.name || 'Unknown'} - Turn {Math.floor(index / players.length) + 1}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Hit: {turn.scores.join(', ')}
                      </Typography>
                      <Typography variant="body2">
                        Position: {turn.remaining}
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

      {/* Dialog confirmations - same as regular game */}
      {/* ... (keeping all the existing dialog components from ActiveGame) ... */}
      
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
            {atwPlayers.find(p => p.progress.sequence_position > sequence.length)?.name || 'Player'} Wins!
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

export default ActiveATWGame;
