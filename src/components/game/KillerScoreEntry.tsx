import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import { motion } from 'framer-motion';
import BackspaceIcon from '@mui/icons-material/Backspace';
import DeleteIcon from '@mui/icons-material/Delete';
import PublishIcon from '@mui/icons-material/Publish';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useUI } from '@/contexts/UIContext';
import {
  KillerPhase,
  KillerPlayer,
  formatHitDisplay,
  getClaimedNumbers,
  getPlayerByNumber
} from '@/types/killer';

const MotionButton = motion.create(Button);

interface DartHit {
  number: number;
  multiplier: number;
}

interface KillerScoreEntryProps {
  phase: KillerPhase;
  currentPlayer: KillerPlayer;
  allPlayers: KillerPlayer[];
  maxLives: number;
  onClaimNumber: (number: number, multiplier: number) => void;
  onBuildingSubmit: (hits: DartHit[]) => void;
  onKillerSubmit: (hits: DartHit[]) => void;
  onDartHitsChange?: (hits: DartHit[]) => void;
}

const KillerScoreEntry: React.FC<KillerScoreEntryProps> = ({
  phase,
  currentPlayer,
  allPlayers,
  maxLives,
  onClaimNumber,
  onBuildingSubmit,
  onKillerSubmit,
  onDartHitsChange
}) => {
  const { isSoundEnabled } = useUI();
  const [dartHits, setDartHits] = useState<DartHit[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Reset dart hits when phase or player changes
  useEffect(() => {
    setDartHits([]);
    setSelectedNumber(null);
  }, [phase, currentPlayer.id]);

  // Notify parent of dart hits changes for live preview
  useEffect(() => {
    onDartHitsChange?.(dartHits);
  }, [dartHits, onDartHitsChange]);

  // Calculate effective lives (current + gained this turn from hitting own number)
  const playerNumber = currentPlayer.progress.claimed_number;
  const livesGainedThisTurn = dartHits.reduce((total, hit) => {
    if (hit.number === playerNumber) {
      return total + hit.multiplier;
    }
    return total;
  }, 0);
  const effectiveLives = Math.min(currentPlayer.progress.lives + livesGainedThisTurn, maxLives);
  const isEffectivelyKiller = effectiveLives >= 3;

  // Initialize audio context once
  useEffect(() => {
    if (isSoundEnabled) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        console.log("Audio context not supported");
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isSoundEnabled]);

  const claimedNumbers = getClaimedNumbers(allPlayers);

  // Play sound
  const playSound = (isHit: boolean) => {
    if (!isSoundEnabled) return;

    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
        return;
      }

      const frequency = isHit ? 660 : 440;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.1;

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();

      setTimeout(() => {
        try {
          oscillator.stop();
          oscillator.disconnect();
          gain.disconnect();
        } catch {
          // Ignore oscillator stop errors
        }
      }, 100);
    } catch {
      console.log("Audio feedback unavailable");
    }
  };

  // Handle number selection in claiming phase
  const handleNumberSelect = (number: number) => {
    if (claimedNumbers.includes(number)) return;
    setSelectedNumber(number);
  };

  // Handle multiplier selection for claiming
  const handleClaimWithMultiplier = (multiplier: number) => {
    if (selectedNumber === null) return;
    playSound(true);
    onClaimNumber(selectedNumber, multiplier);
    setSelectedNumber(null);
  };

  // Handle hit in building/killer phase
  const handleHit = (number: number, multiplier: number) => {
    if (dartHits.length >= 3) return;

    const newHit = { number, multiplier };
    setDartHits([...dartHits, newHit]);
    playSound(true);
  };

  // Handle miss
  const handleMiss = () => {
    if (dartHits.length >= 3) return;

    const newHit = { number: 0, multiplier: 0 };
    setDartHits([...dartHits, newHit]);
    playSound(false);
  };

  // Handle backspace
  const handleBackspace = () => {
    if (dartHits.length > 0) {
      setDartHits(dartHits.slice(0, -1));
    }
  };

  // Handle clear
  const handleClear = () => {
    setDartHits([]);
    setSelectedNumber(null);
  };

  // Handle submit
  const handleSubmit = () => {
    if (phase === 'building') {
      // If player became a killer mid-turn, use killer submit to process any attacks
      if (isEffectivelyKiller) {
        onKillerSubmit(dartHits);
      } else {
        onBuildingSubmit(dartHits);
      }
    } else if (phase === 'killer') {
      onKillerSubmit(dartHits);
    }
    setDartHits([]);
  };

  // Format dart display
  const formatDartDisplay = (hit: DartHit) => {
    if (hit.number === 0) return 'Miss';
    return formatHitDisplay(hit.number, hit.multiplier);
  };

  // Get player who owns a number
  const getOwnerName = (number: number): string => {
    const owner = getPlayerByNumber(allPlayers, number);
    return owner ? owner.name : '';
  };

  // Render Claiming Phase UI
  if (phase === 'claiming') {
    return (
      <>
        <Paper sx={{
          p: 2,
          mb: 2,
          bgcolor: 'grey.900',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
        }}>
          <Typography
            variant="caption"
            color="grey.500"
            sx={{
              fontWeight: 'medium',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Claiming Phase
          </Typography>
          <Typography
            variant="h5"
            component="div"
            fontWeight="bold"
            color="primary.main"
            sx={{ mb: 1, lineHeight: 1.2 }}
          >
            {currentPlayer.name}, throw at any number to claim it!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your first hit claims that number as yours for the game.
          </Typography>
        </Paper>

        {/* Number Selection Grid */}
        <Paper sx={{ p: 2, mb: 2, borderRadius: '12px' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            {selectedNumber ? `Selected: ${selectedNumber} - Choose multiplier` : 'Select the number you hit'}
          </Typography>

          {!selectedNumber ? (
            <Grid container spacing={1}>
              {[...Array(20)].map((_, i) => {
                const num = i + 1;
                const isClaimed = claimedNumbers.includes(num);
                return (
                  <Grid item xs={3} key={num}>
                    <MotionButton
                      variant={isClaimed ? 'outlined' : 'contained'}
                      color={isClaimed ? 'error' : 'primary'}
                      fullWidth
                      disabled={isClaimed}
                      onClick={() => handleNumberSelect(num)}
                      whileTap={{ scale: 0.95 }}
                      sx={{
                        py: 1.5,
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        opacity: isClaimed ? 0.5 : 1
                      }}
                    >
                      {num}
                    </MotionButton>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Stack spacing={1.5}>
              <MotionButton
                variant="contained"
                color="success"
                size="large"
                fullWidth
                onClick={() => handleClaimWithMultiplier(1)}
                whileTap={{ scale: 0.95 }}
                sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}
              >
                Single {selectedNumber} (+1 life)
              </MotionButton>
              <MotionButton
                variant="contained"
                color="success"
                size="large"
                fullWidth
                onClick={() => handleClaimWithMultiplier(2)}
                whileTap={{ scale: 0.95 }}
                sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', bgcolor: 'success.dark' }}
              >
                Double {selectedNumber} (+2 lives)
              </MotionButton>
              <MotionButton
                variant="contained"
                color="success"
                size="large"
                fullWidth
                onClick={() => handleClaimWithMultiplier(3)}
                whileTap={{ scale: 0.95 }}
                sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', bgcolor: 'success.dark' }}
              >
                Triple {selectedNumber} (+3 lives)
              </MotionButton>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                onClick={() => setSelectedNumber(null)}
                sx={{ py: 1.5, borderRadius: '12px' }}
              >
                Back to Numbers
              </Button>
            </Stack>
          )}
        </Paper>
      </>
    );
  }

  // Render Building Phase UI (can transition to killer mid-turn)
  if (phase === 'building') {
    const ownNumber = currentPlayer.progress.claimed_number!;

    return (
      <>
        <Paper sx={{
          p: 2,
          mb: 2,
          bgcolor: isEffectivelyKiller ? 'error.dark' : 'grey.900',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'background-color 0.3s ease'
        }}>
          <Typography
            variant="caption"
            color={isEffectivelyKiller ? 'error.contrastText' : 'grey.500'}
            sx={{
              fontWeight: 'medium',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {isEffectivelyKiller ? 'YOU ARE NOW A KILLER!' : 'Building Phase'} - Your Number: {ownNumber}
          </Typography>
          <Typography
            variant="h4"
            component="div"
            fontWeight="bold"
            color={isEffectivelyKiller ? 'error.contrastText' : 'primary.main'}
            sx={{ mb: 1, lineHeight: 1 }}
          >
            {effectiveLives} / {maxLives} lives
            {livesGainedThisTurn > 0 && (
              <Typography component="span" variant="body2" sx={{ ml: 1, opacity: 0.8 }}>
                (+{livesGainedThisTurn} this turn)
              </Typography>
            )}
          </Typography>
          <Typography variant="body2" color={isEffectivelyKiller ? 'error.contrastText' : 'text.secondary'}>
            {isEffectivelyKiller
              ? 'You can now attack other players with your remaining darts!'
              : `Hit your number (${ownNumber}) to gain lives. Reach 3 to become a Killer!`
            }
          </Typography>

          {/* Darts thrown this turn */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
            minHeight: '36px',
            mt: 2
          }}>
            {dartHits.map((hit, index) => {
              const owner = hit.number > 0 ? getPlayerByNumber(allPlayers, hit.number) : null;
              const isOwnNumber = hit.number === ownNumber;
              const isAttack = owner && !isOwnNumber && owner.id !== currentPlayer.id;
              return (
                <Chip
                  key={index}
                  label={formatDartDisplay(hit)}
                  color={isAttack ? 'error' : isOwnNumber ? 'success' : hit.number === 0 ? 'default' : 'warning'}
                  variant="filled"
                  size="medium"
                  icon={isOwnNumber ? <CheckCircleIcon /> : hit.number === 0 ? <CancelIcon /> : undefined}
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    px: 1
                  }}
                />
              );
            })}
            {[...Array(3 - dartHits.length)].map((_, index) => (
              <Box
                key={`empty-${index}`}
                sx={{
                  width: '60px',
                  height: '32px',
                  border: '2px dashed',
                  borderColor: isEffectivelyKiller ? 'error.light' : 'grey.700',
                  borderRadius: '16px',
                  opacity: 0.3,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="caption" color={isEffectivelyKiller ? 'error.light' : 'grey.600'}>·</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Building Controls - switches to Killer controls when reaching 3 lives */}
        <Paper sx={{ p: 2, mb: 2, borderRadius: '12px' }}>
          {!isEffectivelyKiller ? (
            // Building mode - only hit own number
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                Did you hit {ownNumber}?
              </Typography>

              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <MotionButton
                  variant="contained"
                  color="success"
                  size="large"
                  fullWidth
                  onClick={() => handleHit(ownNumber, 1)}
                  disabled={dartHits.length >= 3}
                  startIcon={<CheckCircleIcon />}
                  whileTap={{ scale: 0.95 }}
                  sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', boxShadow: 3 }}
                >
                  Single {ownNumber} (+1 life)
                </MotionButton>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <MotionButton
                      variant="contained"
                      color="success"
                      size="large"
                      fullWidth
                      onClick={() => handleHit(ownNumber, 2)}
                      disabled={dartHits.length >= 3}
                      whileTap={{ scale: 0.95 }}
                      sx={{ py: 1.5, borderRadius: '12px', fontWeight: 'bold', bgcolor: 'success.dark' }}
                    >
                      Double (+2)
                    </MotionButton>
                  </Grid>
                  <Grid item xs={6}>
                    <MotionButton
                      variant="contained"
                      color="success"
                      size="large"
                      fullWidth
                      onClick={() => handleHit(ownNumber, 3)}
                      disabled={dartHits.length >= 3}
                      whileTap={{ scale: 0.95 }}
                      sx={{ py: 1.5, borderRadius: '12px', fontWeight: 'bold', bgcolor: 'success.dark' }}
                    >
                      Triple (+3)
                    </MotionButton>
                  </Grid>
                </Grid>

                <MotionButton
                  variant="outlined"
                  color="error"
                  size="large"
                  fullWidth
                  onClick={handleMiss}
                  disabled={dartHits.length >= 3}
                  startIcon={<CancelIcon />}
                  whileTap={{ scale: 0.95 }}
                  sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', borderWidth: 2 }}
                >
                  MISS
                </MotionButton>
              </Stack>
            </>
          ) : (
            // Killer mode mid-turn - show full number grid to attack
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                Attack other players! Select the number you hit.
              </Typography>

              {!selectedNumber ? (
                <>
                  <Grid container spacing={1}>
                    {[...Array(20)].map((_, i) => {
                      const num = i + 1;
                      const owner = getPlayerByNumber(allPlayers, num);
                      const isOwnNumber = num === ownNumber;
                      const isEliminated = owner?.progress.is_eliminated;

                      return (
                        <Grid item xs={3} key={num}>
                          <MotionButton
                            variant={owner ? 'contained' : 'outlined'}
                            color={
                              isOwnNumber ? 'success' :
                              isEliminated ? 'inherit' :
                              owner ? 'error' :
                              'inherit'
                            }
                            fullWidth
                            disabled={dartHits.length >= 3 || isEliminated}
                            onClick={() => setSelectedNumber(num)}
                            whileTap={{ scale: 0.95 }}
                            sx={{
                              py: 1,
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              flexDirection: 'column',
                              opacity: isEliminated ? 0.3 : 1
                            }}
                          >
                            <span>{num}</span>
                            {owner && (
                              <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
                                {owner.name.substring(0, 5)}
                              </Typography>
                            )}
                          </MotionButton>
                        </Grid>
                      );
                    })}
                  </Grid>

                  <Box sx={{ mt: 2 }}>
                    <MotionButton
                      variant="outlined"
                      color="error"
                      size="large"
                      fullWidth
                      onClick={handleMiss}
                      disabled={dartHits.length >= 3}
                      startIcon={<CancelIcon />}
                      whileTap={{ scale: 0.95 }}
                      sx={{ py: 1.5, borderRadius: '12px', fontWeight: 'bold', borderWidth: 2 }}
                    >
                      MISS
                    </MotionButton>
                  </Box>
                </>
              ) : (
                <Stack spacing={1.5}>
                  <Typography variant="h6" textAlign="center" color="primary">
                    {selectedNumber} {getOwnerName(selectedNumber) ? `(${getOwnerName(selectedNumber)})` : '(Unclaimed)'}
                  </Typography>
                  <MotionButton
                    variant="contained"
                    color={selectedNumber === ownNumber ? 'success' : 'error'}
                    size="large"
                    fullWidth
                    onClick={() => {
                      handleHit(selectedNumber, 1);
                      setSelectedNumber(null);
                    }}
                    whileTap={{ scale: 0.95 }}
                    sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}
                  >
                    Single ({selectedNumber === ownNumber ? '+1 life' : '-1 life'})
                  </MotionButton>
                  <MotionButton
                    variant="contained"
                    color={selectedNumber === ownNumber ? 'success' : 'error'}
                    size="large"
                    fullWidth
                    onClick={() => {
                      handleHit(selectedNumber, 2);
                      setSelectedNumber(null);
                    }}
                    whileTap={{ scale: 0.95 }}
                    sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}
                  >
                    Double ({selectedNumber === ownNumber ? '+2 lives' : '-2 lives'})
                  </MotionButton>
                  <MotionButton
                    variant="contained"
                    color={selectedNumber === ownNumber ? 'success' : 'error'}
                    size="large"
                    fullWidth
                    onClick={() => {
                      handleHit(selectedNumber, 3);
                      setSelectedNumber(null);
                    }}
                    whileTap={{ scale: 0.95 }}
                    sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}
                  >
                    Triple ({selectedNumber === ownNumber ? '+3 lives' : '-3 lives'})
                  </MotionButton>
                  <Button
                    variant="outlined"
                    color="inherit"
                    fullWidth
                    onClick={() => setSelectedNumber(null)}
                    sx={{ py: 1.5, borderRadius: '12px' }}
                  >
                    Back to Numbers
                  </Button>
                </Stack>
              )}
            </>
          )}

          {/* Control buttons */}
          <Grid container spacing={1} sx={{ mt: 2 }}>
            <Grid item xs={3}>
              <IconButton
                onClick={handleBackspace}
                disabled={dartHits.length === 0}
                color="warning"
                sx={{
                  width: '100%',
                  border: '2px solid',
                  borderColor: dartHits.length === 0 ? 'divider' : 'warning.main',
                  borderRadius: '12px',
                  py: 1
                }}
              >
                <BackspaceIcon />
              </IconButton>
            </Grid>
            <Grid item xs={3}>
              <IconButton
                onClick={handleClear}
                disabled={dartHits.length === 0}
                color="error"
                sx={{
                  width: '100%',
                  border: '2px solid',
                  borderColor: dartHits.length === 0 ? 'divider' : 'error.main',
                  borderRadius: '12px',
                  py: 1
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={dartHits.length === 0}
                fullWidth
                startIcon={<PublishIcon />}
                sx={{ py: 1.5, borderRadius: '12px', fontWeight: 'bold' }}
              >
                Submit Turn
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </>
    );
  }

  // Render Killer Phase UI
  const killerPlayerNumber = currentPlayer.progress.claimed_number!;
  const isKiller = currentPlayer.progress.is_killer;

  return (
    <>
      <Paper sx={{
        p: 2,
        mb: 2,
        bgcolor: isKiller ? 'error.dark' : 'grey.900',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
      }}>
        <Typography
          variant="caption"
          color={isKiller ? 'error.contrastText' : 'grey.500'}
          sx={{
            fontWeight: 'medium',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {isKiller ? 'KILLER MODE' : 'Building Lives'} - Your Number: {killerPlayerNumber}
        </Typography>
        <Typography
          variant="h4"
          component="div"
          fontWeight="bold"
          color={isKiller ? 'error.contrastText' : 'primary.main'}
          sx={{ mb: 1, lineHeight: 1 }}
        >
          {currentPlayer.progress.lives} / {maxLives} lives
        </Typography>
        <Typography variant="body2" color={isKiller ? 'error.contrastText' : 'text.secondary'}>
          {isKiller
            ? 'Attack other players by hitting their numbers!'
            : `Keep building lives. You need ${3 - currentPlayer.progress.lives} more to become a Killer.`
          }
        </Typography>

        {/* Darts thrown this turn */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1,
          minHeight: '36px',
          mt: 2
        }}>
          {dartHits.map((hit, index) => {
            const owner = hit.number > 0 ? getPlayerByNumber(allPlayers, hit.number) : null;
            const isOwnNumber = hit.number === killerPlayerNumber;
            const isAttack = owner && !isOwnNumber && owner.id !== currentPlayer.id;
            return (
              <Chip
                key={index}
                label={formatDartDisplay(hit)}
                color={isAttack ? 'error' : isOwnNumber ? 'success' : hit.number === 0 ? 'default' : 'warning'}
                variant="filled"
                size="medium"
                sx={{
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  px: 1
                }}
              />
            );
          })}
          {[...Array(3 - dartHits.length)].map((_, index) => (
            <Box
              key={`empty-${index}`}
              sx={{
                width: '60px',
                height: '32px',
                border: '2px dashed',
                borderColor: isKiller ? 'error.light' : 'grey.700',
                borderRadius: '16px',
                opacity: 0.3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Typography variant="caption" color={isKiller ? 'error.light' : 'grey.600'}>·</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Killer Phase Controls */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: '12px' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
          Select the number you hit, then choose multiplier
        </Typography>

        {!selectedNumber ? (
          <>
            {/* Number Grid with Owner Info */}
            <Grid container spacing={1}>
              {[...Array(20)].map((_, i) => {
                const num = i + 1;
                const owner = getPlayerByNumber(allPlayers, num);
                const isOwnNumber = num === killerPlayerNumber;
                const isEliminated = owner?.progress.is_eliminated;

                return (
                  <Grid item xs={3} key={num}>
                    <MotionButton
                      variant={owner ? 'contained' : 'outlined'}
                      color={
                        isOwnNumber ? 'success' :
                        isEliminated ? 'inherit' :
                        owner ? 'error' :
                        'inherit'
                      }
                      fullWidth
                      disabled={dartHits.length >= 3 || isEliminated}
                      onClick={() => setSelectedNumber(num)}
                      whileTap={{ scale: 0.95 }}
                      sx={{
                        py: 1,
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        flexDirection: 'column',
                        opacity: isEliminated ? 0.3 : 1
                      }}
                    >
                      <span>{num}</span>
                      {owner && (
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
                          {owner.name.substring(0, 5)}
                        </Typography>
                      )}
                    </MotionButton>
                  </Grid>
                );
              })}
            </Grid>

            {/* Miss Button */}
            <Box sx={{ mt: 2 }}>
              <MotionButton
                variant="outlined"
                color="error"
                size="large"
                fullWidth
                onClick={handleMiss}
                disabled={dartHits.length >= 3}
                startIcon={<CancelIcon />}
                whileTap={{ scale: 0.95 }}
                sx={{ py: 1.5, borderRadius: '12px', fontWeight: 'bold', borderWidth: 2 }}
              >
                MISS
              </MotionButton>
            </Box>
          </>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="h6" textAlign="center" color="primary">
              {selectedNumber} {getOwnerName(selectedNumber) ? `(${getOwnerName(selectedNumber)})` : '(Unclaimed)'}
            </Typography>
            <MotionButton
              variant="contained"
              color={selectedNumber === killerPlayerNumber ? 'success' : 'error'}
              size="large"
              fullWidth
              onClick={() => {
                handleHit(selectedNumber, 1);
                setSelectedNumber(null);
              }}
              whileTap={{ scale: 0.95 }}
              sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              Single ({selectedNumber === killerPlayerNumber ? '+1 life' : '-1 life'})
            </MotionButton>
            <MotionButton
              variant="contained"
              color={selectedNumber === killerPlayerNumber ? 'success' : 'error'}
              size="large"
              fullWidth
              onClick={() => {
                handleHit(selectedNumber, 2);
                setSelectedNumber(null);
              }}
              whileTap={{ scale: 0.95 }}
              sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              Double ({selectedNumber === killerPlayerNumber ? '+2 lives' : '-2 lives'})
            </MotionButton>
            <MotionButton
              variant="contained"
              color={selectedNumber === killerPlayerNumber ? 'success' : 'error'}
              size="large"
              fullWidth
              onClick={() => {
                handleHit(selectedNumber, 3);
                setSelectedNumber(null);
              }}
              whileTap={{ scale: 0.95 }}
              sx={{ py: 2, borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              Triple ({selectedNumber === killerPlayerNumber ? '+3 lives' : '-3 lives'})
            </MotionButton>
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              onClick={() => setSelectedNumber(null)}
              sx={{ py: 1.5, borderRadius: '12px' }}
            >
              Back to Numbers
            </Button>
          </Stack>
        )}

        {/* Control buttons */}
        <Grid container spacing={1} sx={{ mt: 2 }}>
          <Grid item xs={3}>
            <IconButton
              onClick={handleBackspace}
              disabled={dartHits.length === 0}
              color="warning"
              sx={{
                width: '100%',
                border: '2px solid',
                borderColor: dartHits.length === 0 ? 'divider' : 'warning.main',
                borderRadius: '12px',
                py: 1
              }}
            >
              <BackspaceIcon />
            </IconButton>
          </Grid>
          <Grid item xs={3}>
            <IconButton
              onClick={handleClear}
              disabled={dartHits.length === 0}
              color="error"
              sx={{
                width: '100%',
                border: '2px solid',
                borderColor: dartHits.length === 0 ? 'divider' : 'error.main',
                borderRadius: '12px',
                py: 1
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={dartHits.length === 0}
              fullWidth
              startIcon={<PublishIcon />}
              sx={{ py: 1.5, borderRadius: '12px', fontWeight: 'bold' }}
            >
              Submit Turn
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
};

export default KillerScoreEntry;
