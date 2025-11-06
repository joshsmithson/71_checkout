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
  IconButton,
  Grid
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useUI } from '@/contexts/UIContext';
import { motion, AnimatePresence } from 'framer-motion';
import ScoreEntry from '@/components/game/ScoreEntry';
import Celebration from '@/components/game/Celebration';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import HomeIcon from '@mui/icons-material/Home';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';

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
  game_id: string;
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
    getFriends,
    revertToTurn
  } = useSupabase();

  // Game state
  const [gameData, setGameData] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [temporaryScore, setTemporaryScore] = useState<number | null>(null);
  const [checkoutSuggestion, setCheckoutSuggestion] = useState<string[][] | null>(null);
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
  const [confirmRevertTurn, setConfirmRevertTurn] = useState<{open: boolean, turnId: string, turnInfo: string, affectedCount: number} | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  
  // Game options menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(menuAnchorEl);
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Revert turn functionality
  const handleRevertTurnClick = (turn: Turn, index: number) => {
    const player = players.find(p => p.id === turn.player_id && p.type === turn.player_type);
    const affectedTurns = turns.length - index - 1; // How many turns will be lost
    
    setConfirmRevertTurn({
      open: true,
      turnId: turn.id,
      turnInfo: `${player?.name || 'Unknown'} - Turn ${turn.turn_number}`,
      affectedCount: affectedTurns
    });
  };

  // Load game data function (moved outside useEffect to be reusable)
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
            name = user.user_metadata.name?.split(' ')[0] || 'You';
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

        // Determine current player and turn number
        // Find the last player who took a turn
        const lastTurn = gameTurns[gameTurns.length - 1];
        const lastPlayerIndex = updatedPlayers.findIndex(
          p => p.id === lastTurn.player_id && p.type === lastTurn.player_type
        );
        
        // Next player is the one after the last player
        const nextPlayerIndex = (lastPlayerIndex + 1) % updatedPlayers.length;
        const nextPlayer = updatedPlayers[nextPlayerIndex];
        setCurrentPlayerIndex(nextPlayerIndex);
        
        // CRITICAL FIX: Calculate turn number based on what already exists for the next player
        // Check if the next player already has a turn with the same turn_number as the last turn
        const nextPlayerTurns = gameTurns.filter(
          t => t.player_id === nextPlayer.id && t.player_type === nextPlayer.type
        );
        const lastTurnNumber = lastTurn.turn_number;
        
        // If next player already has this turn number, they've already taken their turn
        // So we need to increment to the next round
        const nextPlayerHasThisTurn = nextPlayerTurns.some(t => t.turn_number === lastTurnNumber);
        
        // Calculate the correct turn number:
        // - If we're cycling back to player 0, always increment
        // - If next player already has this turn number, increment
        // - Otherwise, use the same turn number (same round, different player)
        let newTurnNumber: number;
        if (nextPlayerIndex === 0) {
          // Cycling back to first player means new round
          newTurnNumber = lastTurnNumber + 1;
        } else if (nextPlayerHasThisTurn) {
          // Next player already took this turn, so we need next round
          newTurnNumber = lastTurnNumber + 1;
        } else {
          // Same round, next player hasn't taken their turn yet
          newTurnNumber = lastTurnNumber;
        }
        
        console.log('loadGameData: Calculated turn number', {
          lastTurnNumber,
          nextPlayerIndex,
          nextPlayerHasThisTurn,
          newTurnNumber,
          nextPlayerTurns: nextPlayerTurns.map(t => t.turn_number)
        });
        
        setTurnNumber(newTurnNumber);
      }

      // Get checkout suggestion for current player
      if (playerArray.length > 0) {
        const currentPlayer = playerArray[currentPlayerIndex];
        if (currentPlayer && currentPlayer.score <= 170 && currentPlayer.score > 1) {
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

  const handleConfirmRevert = async () => {
    if (!confirmRevertTurn) return;
    
    setIsReverting(true);
    try {
      const result = await revertToTurn(confirmRevertTurn.turnId);
      
      if (result?.success) {
        // Close the turn history dialog first
        setShowTurnHistory(false);
        
        // Reload game data to reflect the reverted state
        // This will update the turns array with the fresh data from the database
        await loadGameData();
        setError(null);
        
        // Only clear confirmation state after successful completion
        // This ensures error recovery can access the turn context if loadGameData fails
        setConfirmRevertTurn(null);
      } else {
        setError(result?.error || 'Failed to revert turn');
      }
    } catch (err) {
      console.error('Error reverting turn:', err);
      setError('Failed to revert turn');
      // Keep confirmRevertTurn state so user can retry if needed
    } finally {
      setIsReverting(false);
    }
  };

  // Load game data on mount
  useEffect(() => {
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
    // Early validation and guard clauses
    if (!id || !gameData || players.length === 0) {
      console.warn('handleScoreSubmit: Missing required data', { id, gameData, playersLength: players.length });
      return;
    }

    // Prevent processing if already submitting - check early
    if (isSubmittingScore) {
      console.warn('handleScoreSubmit: Already submitting, ignoring duplicate call');
      return;
    }

    try {
      const currentPlayer = players[currentPlayerIndex];
      if (!currentPlayer) {
        console.warn('handleScoreSubmit: No current player', { currentPlayerIndex, playersLength: players.length });
        return;
      }

      // Validate scores array
      if (!Array.isArray(scores) || scores.length === 0) {
        console.warn('handleScoreSubmit: Invalid scores array', { scores });
        return;
      }

      // Check if this is a running update (not final submission)
      const isRunningUpdate = scores.length > 0 && scores[scores.length - 1] === -1;
      
      if (isRunningUpdate) {
        // For running updates, don't block the UI
        // Remove the marker (-1) and calculate temporary score
        const actualScores = scores.slice(0, -1);
        
        // Check if this is an empty update (just [-1]), which means all darts were deleted
        if (actualScores.length === 0) {
          // Reset temporary score to show original score
          setTemporaryScore(null);
          
          // Get checkout suggestion for the original score
          if (currentPlayer.score <= 170 && currentPlayer.score > 1) {
            getCheckoutSuggestion(currentPlayer.score)
              .then(suggestion => {
                setCheckoutSuggestion(suggestion);
              })
              .catch(error => {
                console.error("Error getting checkout suggestion:", error);
                // Don't block UI on checkout suggestion errors
              });
          } else {
            setCheckoutSuggestion(null);
          }
          return;
        }
        
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
              // Don't block UI on checkout suggestion errors
            });
        } else {
          setCheckoutSuggestion(null);
        }
        
        // Just update UI, don't record the turn yet
        return;
      }

      // From here on is handling the final submission (all 3 darts or manual submission)
      // Set flag IMMEDIATELY to prevent multiple submissions
      setIsSubmittingScore(true);
      
      // Reset temporary score
      setTemporaryScore(null);
      
      // Validate scores are valid numbers
      const validScores = scores.filter(score => typeof score === 'number' && !isNaN(score));
      if (validScores.length !== scores.length) {
        console.error('handleScoreSubmit: Invalid scores detected', { scores, validScores });
        setError('Invalid scores detected. Please try again.');
        setIsSubmittingScore(false);
        return;
      }
      
      // Calculate the total score for this turn
      const turnScore = scores.reduce((sum, score) => sum + score, 0);
      
      // Validate turn score is reasonable
      if (turnScore < 0 || turnScore > 180) {
        console.error('handleScoreSubmit: Invalid turn score', { turnScore, scores });
        setError('Invalid turn score. Please try again.');
        setIsSubmittingScore(false);
        return;
      }
      
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
      
      // Check if a turn with this turn number already exists for this player
      // This can happen if the game was reloaded and the turn number calculation was off
      const existingTurn = turns.find(
        t => t.player_id === currentPlayer.id &&
             t.player_type === currentPlayer.type &&
             t.turn_number === turnNumber
      );
      
      if (existingTurn) {
        console.warn('handleScoreSubmit: Turn already exists, reloading game data', {
          existingTurnId: existingTurn.id,
          turnNumber,
          playerId: currentPlayer.id
        });
        // Reload game data to get the correct state
        await loadGameData();
        setIsSubmittingScore(false);
        return;
      }
      
      // Log turn submission for debugging
      console.log('handleScoreSubmit: Submitting turn', {
        gameId: id,
        playerId: currentPlayer.id,
        playerType: currentPlayer.type,
        turnNumber,
        scores,
        remaining,
        isBust,
        isCheckout
      });
      
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
      } catch (error: any) {
        console.error('handleScoreSubmit: Failed to record turn', error);
        
        // Check if it's a duplicate key error
        if (error?.message?.includes('duplicate key') || error?.code === '23505') {
          console.warn('handleScoreSubmit: Duplicate turn detected, reloading game data');
          // Reload game data to sync with database
          await loadGameData();
          setIsSubmittingScore(false);
          return;
        }
        
        setError('Failed to record turn. Please try again.');
        setIsSubmittingScore(false);
        return;
      }

      if (!turn) {
        console.error('handleScoreSubmit: Turn creation returned null', {
          gameId: id,
          playerId: currentPlayer.id,
          turnNumber
        });
        setError('Failed to record turn. Please try again.');
        setIsSubmittingScore(false);
        return;
      }
      
      console.log('handleScoreSubmit: Turn recorded successfully', { turnId: turn.id });

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
          console.log('handleScoreSubmit: Game completed successfully');
        } catch (error) {
          console.error('handleScoreSubmit: Error updating game status', error);
          // Continue anyway, as the turn was recorded successfully
          // The game completion can be fixed later if needed
        }
        
        // Update state before showing dialog to prevent flickering
        // CRITICAL: Add turn to state first before updating any other state
        const updatedTurns = [...turns, turn];
        
        // Update state atomically
        setTurns(updatedTurns);
        setPlayers(updatedPlayers);
        
        // Show confirmation dialog
        setConfirmEndGame(true);
        setIsSubmittingScore(false);
        return;
      }

      // CRITICAL FIX: Add turn to turns array FIRST before calculating next player
      const updatedTurns = [...turns, turn];
      
      // Move to next player
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      
      // Validate next player index
      if (nextPlayerIndex < 0 || nextPlayerIndex >= players.length) {
        console.error('handleScoreSubmit: Invalid next player index', {
          nextPlayerIndex,
          playersLength: players.length,
          currentPlayerIndex
        });
        // Fallback to first player
        const fallbackIndex = 0;
        const fallbackTurnNumber = turnNumber + 1;
        
        setTurns(updatedTurns);
        setPlayers(updatedPlayers);
        setCurrentPlayerIndex(fallbackIndex);
        setTurnNumber(fallbackTurnNumber);
        setIsSubmittingScore(false);
        return;
      }
      
      // Update turn number if we've gone through all players
      const newTurnNumber = nextPlayerIndex === 0 ? turnNumber + 1 : turnNumber;
      
      // Get checkout suggestion for next player - don't block UI
      const nextPlayer = updatedPlayers[nextPlayerIndex];
      
      // CRITICAL: Update all state in one batch with the turn already added
      // This ensures consistency - all state updates happen together
      setTurns(updatedTurns);
      setPlayers(updatedPlayers);
      setCurrentPlayerIndex(nextPlayerIndex);
      setTurnNumber(newTurnNumber);
      
      console.log('handleScoreSubmit: Turn submitted, moving to next player', {
        nextPlayerIndex,
        newTurnNumber,
        nextPlayerScore: nextPlayer.score
      });
      
      // Get checkout suggestion after state updates - don't block on errors
      if (nextPlayer && nextPlayer.score <= 170 && nextPlayer.score > 1) {
        getCheckoutSuggestion(nextPlayer.score)
          .then(suggestion => {
            setCheckoutSuggestion(suggestion);
          })
          .catch(error => {
            console.error('handleScoreSubmit: Error getting checkout suggestion (non-blocking)', error);
            // Don't set error state - this is not critical
            setCheckoutSuggestion(null);
          });
      } else {
        setCheckoutSuggestion(null);
      }
      
      // Reset submission flag after all state updates
      setIsSubmittingScore(false);

    } catch (error) {
      console.error('handleScoreSubmit: Unexpected error', error);
      setError('Failed to submit score. Please try again.');
      // Ensure flag is reset even on unexpected errors
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
    <Container maxWidth="sm" sx={{ py: 1, pb: 8 }}>
      {/* Game Header - More compact */}
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
            {gameData?.type} Game {!isCompleted && <Typography component="span" variant="body2" color="text.secondary">Turn {turnNumber}</Typography>}
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

      {/* Game Paused Alert - More compact */}
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

      {/* Horizontal Player Score Cards - More compact */}
      <Paper sx={{ mb: 1, overflow: 'hidden', borderRadius: '12px' }}>
        <Grid container>
          {players.map((player, index) => (
            <Grid 
              item 
              xs={12 / players.length} 
              key={player.id}
              sx={{ 
                borderRight: index < players.length - 1 ? 1 : 0, 
                borderColor: 'divider',
                backgroundColor: currentPlayerIndex === index ? 'rgba(25, 118, 210, 0.04)' : undefined
              }}
            >
              <Box 
                sx={{ 
                  p: 1, 
                  textAlign: 'center',
                  borderTop: currentPlayerIndex === index ? 2 : 0,
                  borderColor: 'primary.main'
                }}
              >
                <Typography 
                  variant="subtitle2" 
                  noWrap 
                  fontWeight={currentPlayerIndex === index ? 'bold' : 'normal'}
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '0.75rem',
                    mb: 0.25
                  }}
                >
                  {player.name}
                </Typography>
                <Typography 
                  variant="h4" 
                  fontWeight="bold"
                  color={
                    player.score === 0 ? 'success.main' : 
                    player.score <= 40 && player.score % 2 === 0 ? 'warning.main' : 
                    undefined
                  }
                  sx={{ lineHeight: 1.1 }}
                >
                  {temporaryScore !== null && currentPlayerIndex === index 
                    ? temporaryScore 
                    : player.score}
                </Typography>
                {currentPlayerIndex === index && !isCompleted && !isPaused && (
                  <Chip 
                    label="Current" 
                    color="primary" 
                    size="small" 
                    sx={{ 
                      mt: 0.25,
                      height: '20px',
                      '& .MuiChip-label': {
                        px: 0.5,
                        fontSize: '0.65rem'
                      }
                    }}
                  />
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
      
      {/* Checkout Suggestion - Smooth animation */}
      <AnimatePresence mode="wait">
        {currentPlayer && currentPlayer.score <= 170 && currentPlayer.score > 1 && !isCompleted && !isPaused && checkoutSuggestion && checkoutSuggestion.length > 0 && (
          <motion.div
            key="checkout-suggestion"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ 
              duration: 0.25,
              ease: 'easeInOut'
            }}
            style={{ overflow: 'hidden' }}
          >
            <Paper 
              sx={{ 
                p: 1.25, 
                bgcolor: 'grey.900',
                color: 'grey.200', 
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                border: 1,
                borderColor: 'primary.dark'
              }}
            >
              <Grid container alignItems="center" spacing={1}>
                <Grid item xs={4}>
                  <Typography sx={{ color: 'grey.300', fontWeight: 'medium', fontSize: '0.85rem' }}>
                    Checkout Path{checkoutSuggestion.length > 1 ? 's' : ''}:
                  </Typography>
                  <Typography color="primary.main" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {currentPlayer.score}
                  </Typography>
                </Grid>
                <Grid item xs={8}>
                  {checkoutSuggestion.map((suggestion, suggestionIndex) => (
                    <Box key={suggestionIndex} sx={{ 
                      display: 'flex', 
                      justifyContent: 'flex-start', 
                      gap: 0.5,
                      flexWrap: 'wrap',
                      mt: suggestionIndex > 0 ? 1 : 0,
                      mb: 0.5
                    }}>
                      {suggestionIndex > 0 && (
                        <Typography variant="caption" color="grey.500" sx={{ width: '100%', mb: 0.5 }}>
                          Alternative:
                        </Typography>
                      )}
                      {suggestion.map((dart, dartIndex) => {
                        // Use different colors based on dart type (T/D/S)
                        const isDartTriple = dart.startsWith('T');
                        const isDartDouble = dart.startsWith('D');
                        const isBull = dart === 'Bull';
                        
                        return (
                          <Chip 
                            key={dartIndex} 
                            label={dart} 
                            variant="filled" 
                            color={isDartTriple ? "error" : isDartDouble ? "primary" : "default"}
                            size="medium"
                            sx={{ 
                              fontWeight: 'bold',
                              border: isDartTriple || isDartDouble || isBull ? 1 : 0,
                              borderColor: isBull ? 'error.main' : 'transparent',
                              bgcolor: isBull ? 'background.paper' : undefined,
                              color: isBull ? 'error.main' : undefined,
                              fontSize: '0.85rem',
                              mb: 0.5
                            }}
                          />
                        );
                      })}
                    </Box>
                  ))}
                  {checkoutSuggestion.length > 0 && (
                    <Typography variant="caption" color="grey.500" sx={{ textAlign: 'center', display: 'block', mt: 0.5 }}>
                      Suggested checkout path{checkoutSuggestion.length > 1 ? 's' : ''}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {!isCompleted && !isPaused ? (
        <>
          {/* Score Entry */}
          <ScoreEntry
            currentPlayerScore={currentPlayer?.score || 0}
            onScoreSubmit={handleScoreSubmit}
            onCelebrate180={handle180Celebration}
          />
          
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
        maxWidth="md"
        key={`turn-history-${turns.length}-${turns.map(t => t.id).join('-')}`} // Force remount when turns change
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Turn History</Typography>
            <Chip 
              label={`${turns.length} Turn${turns.length !== 1 ? 's' : ''}`} 
              size="small" 
              color="primary"
              variant="outlined"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {turns.length === 0 ? (
            <Typography variant="body1" textAlign="center" sx={{ py: 4 }}>
              No turns recorded yet
            </Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {turns.map((turn, index) => {
                const player = players.find(p => p.id === turn.player_id && p.type === turn.player_type);
                const turnScore = turn.scores.reduce((sum, score) => sum + score, 0);
                const affectedTurns = turns.length - index - 1;
                
                // Calculate what each player's score will be after reverting to this turn
                // When reverting to a turn, we keep all turns up to and including that turn
                // Each player's score will be their remaining score from their last turn up to this point
                const scoresAfterRevert: { [key: string]: number } = {};
                
                // First, set all players to their starting scores
                players.forEach(p => {
                  scoresAfterRevert[`${p.id}-${p.type}`] = p.startingScore;
                });
                
                // Then, apply all turns up to and including the current turn index
                // This simulates what the scores will be after reverting
                for (let i = 0; i <= index; i++) {
                  const t = turns[i];
                  const playerKey = `${t.player_id}-${t.player_type}`;
                  // Update the player's score to the remaining score from this turn
                  scoresAfterRevert[playerKey] = t.remaining;
                }
                
                const isBust = turn.scores.length === 1 && turn.scores[0] === 0;
                const isCheckout = turn.checkout;
                const is180 = turnScore === 180 && turn.scores.length === 3;
                
                return (
                  <Paper 
                    key={index} 
                    elevation={affectedTurns === 0 ? 2 : 0}
                    sx={{ 
                      p: 2,
                      border: affectedTurns === 0 ? 2 : 1,
                      borderColor: affectedTurns === 0 ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      bgcolor: affectedTurns === 0 ? 'action.selected' : 'background.paper',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: 'primary.light'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip 
                            label={`Turn ${turn.turn_number}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                          />
                          <Typography variant="subtitle1" fontWeight="bold">
                            {player?.name || 'Unknown'}
                          </Typography>
                          {isCheckout && (
                            <Chip 
                              label="CHECKOUT" 
                              size="small" 
                              color="success" 
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                          {is180 && (
                            <Chip 
                              label="180" 
                              size="small" 
                              color="error" 
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                          {isBust && (
                            <Chip 
                              label="BUST" 
                              size="small" 
                              color="warning" 
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              Score
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {turn.scores.map((s, i) => (
                                <span key={i}>
                                  {s}
                                  {i < turn.scores.length - 1 ? ' + ' : ''}
                                </span>
                              ))} = <strong>{turnScore}</strong>
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              Remaining
                            </Typography>
                            <Typography 
                              variant="body1" 
                              fontWeight="bold"
                              color={turn.remaining === 0 ? 'success.main' : turn.remaining <= 40 ? 'warning.main' : 'text.primary'}
                            >
                              {turn.remaining}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {affectedTurns > 0 && gameData?.status === 'active' && (
                          <Box sx={{ 
                            mt: 2, 
                            pt: 2, 
                            borderTop: 1, 
                            borderColor: 'divider',
                            bgcolor: 'warning.light',
                            borderRadius: 1,
                            p: 1.5
                          }}>
                            <Typography variant="caption" fontWeight="bold" color="warning.dark" sx={{ display: 'block', mb: 1 }}>
                              Reverting to this turn will:
                            </Typography>
                            <Box component="ul" sx={{ m: 0, pl: 2.5, mb: 1 }}>
                              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                                Remove <strong>{affectedTurns} subsequent turn{affectedTurns !== 1 ? 's' : ''}</strong>
                              </Typography>
                              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                                Reset scores to:
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                              {players.map(p => {
                                const scoreAfter = scoresAfterRevert[`${p.id}-${p.type}`];
                                const currentScore = p.score;
                                const willChange = scoreAfter !== currentScore;
                                
                                return (
                                  <Chip
                                    key={`${p.id}-${p.type}`}
                                    label={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" fontWeight="bold">
                                          {p.name}:
                                        </Typography>
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            textDecoration: willChange ? 'line-through' : 'none',
                                            opacity: willChange ? 0.5 : 1
                                          }}
                                        >
                                          {currentScore}
                                        </Typography>
                                        {willChange && (
                                          <>
                                            <Typography variant="caption">→</Typography>
                                            <Typography variant="caption" fontWeight="bold" color="primary.main">
                                              {scoreAfter}
                                            </Typography>
                                          </>
                                        )}
                                      </Box>
                                    }
                                    size="small"
                                    variant={willChange ? "outlined" : "filled"}
                                    color={willChange ? "primary" : "default"}
                                    sx={{ 
                                      height: 'auto',
                                      py: 0.5,
                                      '& .MuiChip-label': { px: 1 }
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        )}
                        
                        {affectedTurns === 0 && (
                          <Box sx={{ mt: 1.5 }}>
                            <Chip 
                              label="Current State" 
                              size="small" 
                              color="primary" 
                              variant="filled"
                            />
                          </Box>
                        )}
                      </Box>
                      
                      {gameData?.status === 'active' && affectedTurns > 0 && (
                        <IconButton
                          size="medium"
                          color="warning"
                          onClick={() => handleRevertTurnClick(turn, index)}
                          sx={{ 
                            ml: 1,
                            border: 1,
                            borderColor: 'warning.main',
                            '&:hover': {
                              bgcolor: 'warning.light',
                              borderColor: 'warning.dark'
                            }
                          }}
                          title={`Revert to this turn`}
                        >
                          <UndoIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTurnHistory(false)} variant="outlined">Close</Button>
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

      {/* Revert Turn Confirmation Dialog */}
      <Dialog
        open={confirmRevertTurn?.open || false}
        onClose={() => !isReverting && setConfirmRevertTurn(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Revert Turn</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to revert to <strong>{confirmRevertTurn?.turnInfo}</strong>?
          </Typography>
          {confirmRevertTurn && confirmRevertTurn.affectedCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This will permanently remove <strong>{confirmRevertTurn.affectedCount}</strong> turn{confirmRevertTurn.affectedCount !== 1 ? 's' : ''} that came after this turn. This action cannot be undone.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmRevertTurn(null)} 
            disabled={isReverting}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="warning" 
            onClick={handleConfirmRevert}
            disabled={isReverting}
            startIcon={isReverting ? <CircularProgress size={20} /> : <UndoIcon />}
          >
            {isReverting ? 'Reverting...' : 'Revert Turn'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActiveGame;