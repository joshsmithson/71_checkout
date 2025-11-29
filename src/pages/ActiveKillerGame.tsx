import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
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
  LinearProgress
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useUI } from '@/contexts/UIContext';
import KillerScoreEntry from '@/components/game/KillerScoreEntry';
import ConfirmationDialog from '@/components/game/ConfirmationDialog';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import HomeIcon from '@mui/icons-material/Home';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import {
  KillerGameType,
  KillerPlayer,
  KillerPhase,
  isKillerGameType,
  getDisplayNameForGameType,
  getMaxLivesForGameType,
  getGamePhase,
  getNextPlayerIndex,
  checkForWinner,
  getPlayerByNumber,
  formatHitDisplay
} from '@/types/killer';

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
  scores: number[];
  remaining: number;
  checkout: boolean;
}

interface DartHit {
  number: number;
  multiplier: number;
}

const ActiveKillerGame = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  useUI();
  const {
    getGameById,
    getGamePlayers,
    getTurns,
    updateGameStatus,
    setGameWinner,
    deleteGame,
    getKillerProgress,
    claimKillerNumber,
    updateKillerProgress,
    addKillerTurn,
    getFriends
  } = useSupabase();

  // Game state
  const [gameData, setGameData] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [killerPlayers, setKillerPlayers] = useState<KillerPlayer[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [turnNumber, setTurnNumber] = useState(1);
  const [showTurnHistory, setShowTurnHistory] = useState(false);
  const [confirmEndGame, setConfirmEndGame] = useState(false);
  const [confirmPauseGame, setConfirmPauseGame] = useState(false);
  const [confirmExitGame, setConfirmExitGame] = useState(false);
  const [confirmDeleteGame, setConfirmDeleteGame] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [winner, setWinner] = useState<KillerPlayer | null>(null);
  const [currentDartHits, setCurrentDartHits] = useState<DartHit[]>([]);

  // Calculate preview lives for all players based on current dart hits
  const getPreviewLives = (playerId: string, playerType: string): { lives: number; change: number } | null => {
    if (currentDartHits.length === 0 || killerPlayers.length === 0) return null;

    const currentPlayer = killerPlayers[currentPlayerIndex];
    if (!currentPlayer) return null;

    const playerNumber = currentPlayer.progress.claimed_number;
    const wasAlreadyKiller = currentPlayer.progress.is_killer;

    // For the current player - show their own lives change
    if (playerId === currentPlayer.id && playerType === currentPlayer.type) {
      const selfLivesGained = currentDartHits.reduce((total, hit) => {
        if (hit.number === playerNumber && !wasAlreadyKiller) {
          return total + hit.multiplier;
        }
        return total;
      }, 0);
      const newLives = Math.min(currentPlayer.progress.lives + selfLivesGained, maxLives);
      return { lives: newLives, change: selfLivesGained };
    }

    // For other players - calculate damage taken
    const targetPlayer = killerPlayers.find(p => p.id === playerId && p.type === playerType);
    if (!targetPlayer) return null;

    let livesLost = 0;
    let effectiveKillerAtPoint = wasAlreadyKiller;
    let currentLives = currentPlayer.progress.lives;

    currentDartHits.forEach(hit => {
      // First update killer status based on self-hits
      if (hit.number === playerNumber && !wasAlreadyKiller) {
        currentLives += hit.multiplier;
        if (currentLives >= 3) effectiveKillerAtPoint = true;
      }
      // Then check for attacks
      if (hit.number === targetPlayer.progress.claimed_number && effectiveKillerAtPoint) {
        livesLost += hit.multiplier;
      }
    });

    if (livesLost === 0) return null;

    const newLives = Math.max(targetPlayer.progress.lives - livesLost, 0);
    return { lives: newLives, change: -livesLost };
  };

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

        // Verify this is a Killer game
        if (!isKillerGameType(game.type)) {
          throw new Error('This is not a Killer game');
        }

        setGameData(game);

        // Load players
        const gamePlayers = await getGamePlayers(id);
        if (!gamePlayers) {
          throw new Error('Failed to load players');
        }

        // Get all friends
        const friendsList = await getFriends();

        // Create players array with additional info
        const playerArray: Player[] = await Promise.all(
          gamePlayers.map(async (player) => {
            let name = 'Unknown';

            if (player.player_type === 'user' && player.player_id === user?.id) {
              name = user.user_metadata.name?.split(' ')[0] || 'You';
            } else if (player.player_type === 'friend') {
              const friend = friendsList?.find(f => f.id === player.player_id);
              if (friend) {
                name = friend.name;
              } else {
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

        // Load Killer progress
        const progressData = await getKillerProgress(id);

        // Build killer players array - even if progressData is null/empty, use defaults
        const killerPlayerArray: KillerPlayer[] = playerArray.map(player => {
          const progress = progressData?.find(p =>
            p.player_id === player.id && p.player_type === player.type
          );

          const progressWithType = progress || {
            id: '',
            game_id: id,
            player_id: player.id,
            player_type: player.type as 'user' | 'friend',
            claimed_number: null,
            lives: 0,
            max_lives: getMaxLivesForGameType(game.type as KillerGameType),
            is_killer: false,
            is_eliminated: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          return {
            ...player,
            progress: {
              ...progressWithType,
              player_type: progressWithType.player_type as 'user' | 'friend'
            }
          };
        });

        setKillerPlayers(killerPlayerArray);

        // Check for winner (only if we have actual progress data)
        if (progressData && progressData.length > 0) {
          const gameWinner = checkForWinner(killerPlayerArray);
          if (gameWinner) {
            setWinner(gameWinner);
          }
        }

        // Load turns
        const gameTurns = await getTurns(id);
        if (gameTurns && gameTurns.length > 0) {
          setTurns(gameTurns);

          // Set turn number for next turn
          setTurnNumber(Math.floor(gameTurns.length / playerArray.length) + 1);

          // Determine current player
          const lastTurn = gameTurns[gameTurns.length - 1];
          const lastPlayerIndex = playerArray.findIndex(
            p => p.id === lastTurn.player_id && p.type === lastTurn.player_type
          );

          // For Killer, we need to skip eliminated players
          if (progressData) {
            const tempKillerPlayers: KillerPlayer[] = playerArray.map(player => {
              const progress = progressData.find(p =>
                p.player_id === player.id && p.player_type === player.type
              );
              return {
                ...player,
                progress: progress ? {
                  ...progress,
                  player_type: progress.player_type as 'user' | 'friend'
                } : {
                  id: '',
                  game_id: id,
                  player_id: player.id,
                  player_type: player.type as 'user' | 'friend',
                  claimed_number: null,
                  lives: 0,
                  max_lives: 3,
                  is_killer: false,
                  is_eliminated: false,
                  created_at: '',
                  updated_at: ''
                }
              };
            });
            const nextIndex = getNextPlayerIndex(lastPlayerIndex, tempKillerPlayers);
            setCurrentPlayerIndex(nextIndex);
          } else {
            setCurrentPlayerIndex((lastPlayerIndex + 1) % playerArray.length);
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
  }, [id, user?.id]);

  // Get current phase
  const phase: KillerPhase = killerPlayers.length > 0 ? getGamePhase(killerPlayers) : 'claiming';
  const gameType = gameData?.type as KillerGameType;
  const maxLives = gameType ? getMaxLivesForGameType(gameType) : 3;

  // Handle claiming a number
  const handleClaimNumber = async (number: number, multiplier: number) => {
    if (!id || !gameData || killerPlayers.length === 0) return;
    if (isSubmittingScore) return;

    try {
      setIsSubmittingScore(true);
      const currentPlayer = killerPlayers[currentPlayerIndex];

      // Claim the number
      const updatedProgress = await claimKillerNumber(
        id,
        currentPlayer.id,
        currentPlayer.type,
        number,
        multiplier
      );

      if (!updatedProgress) {
        setError('Failed to claim number. Please try again.');
        setIsSubmittingScore(false);
        return;
      }

      // Record the turn
      const encodedHits = [number * 10 + multiplier]; // Encode hit as number*10 + multiplier
      await addKillerTurn(
        id,
        currentPlayer.id,
        currentPlayer.type,
        turnNumber,
        encodedHits,
        updatedProgress.lives
      );

      // Update local state
      const updatedKillerPlayers = [...killerPlayers];
      updatedKillerPlayers[currentPlayerIndex] = {
        ...currentPlayer,
        progress: {
          ...updatedProgress,
          player_type: updatedProgress.player_type as 'user' | 'friend'
        }
      };
      setKillerPlayers(updatedKillerPlayers);

      // Move to next player
      const nextIndex = getNextPlayerIndex(currentPlayerIndex, updatedKillerPlayers);
      const newTurnNumber = nextIndex <= currentPlayerIndex ? turnNumber + 1 : turnNumber;

      setCurrentPlayerIndex(nextIndex);
      setTurnNumber(newTurnNumber);
      setIsSubmittingScore(false);

    } catch (error) {
      console.error('Error claiming number:', error);
      setError('Failed to claim number. Please try again.');
      setIsSubmittingScore(false);
    }
  };

  // Handle building phase submission
  const handleBuildingSubmit = async (hits: DartHit[]) => {
    if (!id || !gameData || killerPlayers.length === 0) return;
    if (isSubmittingScore) return;

    try {
      setIsSubmittingScore(true);
      const currentPlayer = killerPlayers[currentPlayerIndex];
      const playerNumber = currentPlayer.progress.claimed_number!;

      // Calculate lives gained from hits on own number
      let livesGained = 0;
      hits.forEach(hit => {
        if (hit.number === playerNumber) {
          livesGained += hit.multiplier;
        }
      });

      const newLives = Math.min(currentPlayer.progress.lives + livesGained, maxLives);
      const isNowKiller = newLives >= 3;

      // Update progress
      const updatedProgress = await updateKillerProgress(
        id,
        currentPlayer.id,
        currentPlayer.type,
        newLives,
        isNowKiller,
        false
      );

      if (!updatedProgress) {
        setError('Failed to update progress. Please try again.');
        setIsSubmittingScore(false);
        return;
      }

      // Record the turn
      const encodedHits = hits.map(h => h.number * 10 + h.multiplier);
      await addKillerTurn(
        id,
        currentPlayer.id,
        currentPlayer.type,
        turnNumber,
        encodedHits,
        newLives
      );

      // Update local state
      const updatedKillerPlayers = [...killerPlayers];
      updatedKillerPlayers[currentPlayerIndex] = {
        ...currentPlayer,
        progress: {
          ...updatedProgress,
          player_type: updatedProgress.player_type as 'user' | 'friend'
        }
      };
      setKillerPlayers(updatedKillerPlayers);

      // Move to next player
      const nextIndex = getNextPlayerIndex(currentPlayerIndex, updatedKillerPlayers);
      const newTurnNumber = nextIndex <= currentPlayerIndex ? turnNumber + 1 : turnNumber;

      setCurrentPlayerIndex(nextIndex);
      setTurnNumber(newTurnNumber);
      setIsSubmittingScore(false);

    } catch (error) {
      console.error('Error submitting building turn:', error);
      setError('Failed to submit turn. Please try again.');
      setIsSubmittingScore(false);
    }
  };

  // Handle killer phase submission
  const handleKillerSubmit = async (hits: DartHit[]) => {
    if (!id || !gameData || killerPlayers.length === 0) return;
    if (isSubmittingScore) return;

    try {
      setIsSubmittingScore(true);
      const currentPlayer = killerPlayers[currentPlayerIndex];
      const playerNumber = currentPlayer.progress.claimed_number!;
      const wasAlreadyKiller = currentPlayer.progress.is_killer;

      // Calculate effects of hits - need to track when player becomes killer mid-turn
      let selfLivesGained = 0;
      const otherPlayerChanges: Map<string, number> = new Map();

      // First pass: calculate lives gained from own number to determine killer status
      hits.forEach(hit => {
        if (hit.number === playerNumber && !wasAlreadyKiller) {
          selfLivesGained += hit.multiplier;
        }
      });

      // Determine if player is/becomes a killer (either was already, or reached 3 lives this turn)
      const effectiveLives = currentPlayer.progress.lives + selfLivesGained;
      let isEffectivelyKiller = wasAlreadyKiller || effectiveLives >= 3;

      // Second pass: process attacks (only count attacks after becoming killer)
      let livesAtPoint = currentPlayer.progress.lives;
      hits.forEach(hit => {
        if (hit.number === 0) return; // Miss

        if (hit.number === playerNumber) {
          // Hit own number - gain lives (only if not already a killer at start)
          if (!wasAlreadyKiller) {
            livesAtPoint += hit.multiplier;
            // Check if this hit made them a killer
            if (livesAtPoint >= 3) {
              isEffectivelyKiller = true;
            }
          }
        } else if (isEffectivelyKiller) {
          // Killer hitting another player's number - they lose lives
          const target = getPlayerByNumber(killerPlayers, hit.number);
          if (target && !target.progress.is_eliminated) {
            const currentChange = otherPlayerChanges.get(`${target.id}-${target.type}`) || 0;
            otherPlayerChanges.set(`${target.id}-${target.type}`, currentChange + hit.multiplier);
          }
        }
      });

      // Update current player's lives
      const newSelfLives = Math.min(
        Math.max(currentPlayer.progress.lives + selfLivesGained, 0),
        maxLives
      );
      const isSelfNowKiller = newSelfLives >= 3;

      await updateKillerProgress(
        id,
        currentPlayer.id,
        currentPlayer.type,
        newSelfLives,
        isSelfNowKiller,
        false
      );

      // Update other players' lives
      const updatedKillerPlayers = [...killerPlayers];
      updatedKillerPlayers[currentPlayerIndex] = {
        ...currentPlayer,
        progress: {
          ...currentPlayer.progress,
          lives: newSelfLives,
          is_killer: isSelfNowKiller
        }
      };

      for (const [key, livesLost] of otherPlayerChanges) {
        // Key format is "uuid-playerType", need to split on last dash only
        const lastDashIndex = key.lastIndexOf('-');
        const targetId = key.substring(0, lastDashIndex);
        const targetType = key.substring(lastDashIndex + 1);
        const targetIndex = killerPlayers.findIndex(
          p => p.id === targetId && p.type === targetType
        );

        if (targetIndex !== -1) {
          const target = killerPlayers[targetIndex];
          const newTargetLives = Math.max(target.progress.lives - livesLost, 0);
          const isTargetEliminated = newTargetLives === 0 && target.progress.is_killer;

          await updateKillerProgress(
            id,
            target.id,
            target.type,
            newTargetLives,
            target.progress.is_killer,
            isTargetEliminated
          );

          updatedKillerPlayers[targetIndex] = {
            ...target,
            progress: {
              ...target.progress,
              lives: newTargetLives,
              is_eliminated: isTargetEliminated
            }
          };
        }
      }

      setKillerPlayers(updatedKillerPlayers);

      // Record the turn
      const encodedHits = hits.map(h => h.number * 10 + h.multiplier);
      await addKillerTurn(
        id,
        currentPlayer.id,
        currentPlayer.type,
        turnNumber,
        encodedHits,
        newSelfLives
      );

      // Check for winner
      const gameWinner = checkForWinner(updatedKillerPlayers);
      if (gameWinner) {
        setWinner(gameWinner);
        await setGameWinner(id, gameWinner.id, gameWinner.type);
        await updateGameStatus(id, 'completed');
        setConfirmEndGame(true);
        setIsSubmittingScore(false);
        return;
      }

      // Move to next player
      const nextIndex = getNextPlayerIndex(currentPlayerIndex, updatedKillerPlayers);
      const newTurnNumber = nextIndex <= currentPlayerIndex ? turnNumber + 1 : turnNumber;

      setCurrentPlayerIndex(nextIndex);
      setTurnNumber(newTurnNumber);
      setIsSubmittingScore(false);

    } catch (error) {
      console.error('Error submitting killer turn:', error);
      setError('Failed to submit turn. Please try again.');
      setIsSubmittingScore(false);
    }
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

  const currentPlayer = killerPlayers[currentPlayerIndex] || null;
  const isPaused = gameData?.status === 'paused';
  const isCompleted = gameData?.status === 'completed' || winner !== null;

  return (
    <Container maxWidth="sm" sx={{ py: 1, pb: 8 }}>
      {/* Game Header */}
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
            {gameType && getDisplayNameForGameType(gameType)}
            {!isCompleted && (
              <Typography component="span" variant="body2" color="text.secondary">
                {' '}Turn {turnNumber}
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
            {isPaused && <Chip size="small" label="PAUSED" color="warning" />}
            <Chip
              size="small"
              label={phase.toUpperCase()}
              color={phase === 'killer' ? 'error' : phase === 'building' ? 'warning' : 'info'}
              icon={phase === 'killer' ? <GpsFixedIcon /> : undefined}
            />
          </Box>
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

      {/* Player Status Cards */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '12px' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Players
        </Typography>
        <Stack spacing={1}>
          {killerPlayers.map((player, index) => {
            const isCurrent = index === currentPlayerIndex && !isCompleted;
            const preview = getPreviewLives(player.id, player.type);
            const displayLives = preview ? preview.lives : player.progress.lives;
            const livesChange = preview ? preview.change : 0;
            const livesPercent = (displayLives / maxLives) * 100;

            return (
              <Box
                key={`${player.id}-${player.type}`}
                sx={{
                  p: 1,
                  borderRadius: '8px',
                  bgcolor: player.progress.is_eliminated
                    ? 'action.disabledBackground'
                    : isCurrent
                    ? 'primary.dark'
                    : 'background.paper',
                  border: '1px solid',
                  borderColor: livesChange < 0 ? 'error.main' : livesChange > 0 ? 'success.main' : isCurrent ? 'primary.main' : 'divider',
                  opacity: player.progress.is_eliminated ? 0.5 : 1,
                  transition: 'border-color 0.2s ease'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={isCurrent ? 'bold' : 'normal'}
                      sx={{ textDecoration: player.progress.is_eliminated ? 'line-through' : 'none' }}
                    >
                      {player.name}
                    </Typography>
                    {player.progress.claimed_number && (
                      <Chip
                        size="small"
                        label={player.progress.claimed_number}
                        color="primary"
                        variant="outlined"
                        sx={{ height: '20px', fontSize: '0.7rem' }}
                      />
                    )}
                    {player.progress.is_killer && !player.progress.is_eliminated && (
                      <GpsFixedIcon fontSize="small" color="error" />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FavoriteIcon fontSize="small" color={displayLives > 0 ? 'error' : 'disabled'} />
                    <Typography variant="body2" fontWeight="bold">
                      {displayLives}
                    </Typography>
                    {livesChange !== 0 && (
                      <Typography
                        variant="caption"
                        fontWeight="bold"
                        sx={{
                          color: livesChange > 0 ? 'success.main' : 'error.main',
                          ml: 0.5
                        }}
                      >
                        ({livesChange > 0 ? '+' : ''}{livesChange})
                      </Typography>
                    )}
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={livesPercent}
                  color={livesChange < 0 ? 'error' : livesChange > 0 ? 'success' : player.progress.is_killer ? 'error' : 'primary'}
                  sx={{ height: 6, borderRadius: 3, transition: 'all 0.2s ease' }}
                />
              </Box>
            );
          })}
        </Stack>
      </Paper>

      {!isCompleted && !isPaused && currentPlayer ? (
        <>
          {/* Current Player Indicator */}
          <Paper sx={{ p: 1.5, mb: 2, borderRadius: '12px', bgcolor: 'primary.dark' }}>
            <Typography variant="body2" color="primary.contrastText" textAlign="center">
              {currentPlayer.name}'s Turn
            </Typography>
          </Paper>

          {/* Score Entry */}
          <KillerScoreEntry
            phase={phase}
            currentPlayer={currentPlayer}
            allPlayers={killerPlayers}
            maxLives={maxLives}
            onClaimNumber={handleClaimNumber}
            onBuildingSubmit={handleBuildingSubmit}
            onKillerSubmit={handleKillerSubmit}
            onDartHitsChange={setCurrentDartHits}
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
                const decodedHits = turn.scores.map(encoded => ({
                  number: Math.floor(encoded / 10),
                  multiplier: encoded % 10
                }));

                return (
                  <Box key={index} sx={{ py: 1 }}>
                    <Typography variant="subtitle2">
                      {player?.name || 'Unknown'} - Turn {Math.floor(index / players.length) + 1}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        {decodedHits.map(h => h.number === 0 ? 'Miss' : formatHitDisplay(h.number, h.multiplier)).join(', ')}
                      </Typography>
                      <Typography variant="body2">
                        Lives: {turn.remaining}
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

      {/* Pause Game Confirmation */}
      <ConfirmationDialog
        open={confirmPauseGame}
        onClose={() => setConfirmPauseGame(false)}
        onConfirm={handlePauseGame}
        title="Pause Game"
        message="Do you want to pause this game? You can resume it later from the home screen."
        confirmText="Pause Game"
        confirmIcon={<PauseIcon />}
      />

      {/* Game Completed Dialog */}
      <Dialog
        open={confirmEndGame}
        onClose={() => setConfirmEndGame(false)}
      >
        <DialogTitle>Game Completed!</DialogTitle>
        <DialogContent>
          <Typography variant="h5" gutterBottom textAlign="center" sx={{ mt: 2 }}>
            {winner?.name || 'Player'} Wins!
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
      <ConfirmationDialog
        open={confirmExitGame}
        onClose={() => setConfirmExitGame(false)}
        onConfirm={handleExitToHome}
        title="Exit Game?"
        message="Do you want to exit this game? Your progress will be saved and you can return later."
        confirmText="Exit Game"
        confirmIcon={<HomeIcon />}
      />

      {/* Delete Game Confirmation */}
      <ConfirmationDialog
        open={confirmDeleteGame}
        onClose={() => setConfirmDeleteGame(false)}
        onConfirm={handleDeleteGame}
        title="Delete Game?"
        message={
          <>
            <Typography>
              Are you sure you want to delete this game? This action cannot be undone and all game data will be permanently removed.
            </Typography>
            {isCompleted && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This is a completed game. Deleting it will remove it from your game history and may affect your statistics.
              </Alert>
            )}
          </>
        }
        confirmText="Delete Game"
        confirmColor="error"
        confirmIcon={<DeleteIcon />}
        isLoading={isDeleting}
        loadingText="Deleting..."
      />
    </Container>
  );
};

export default ActiveKillerGame;
