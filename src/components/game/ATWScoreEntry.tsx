import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  Grid, 
  Paper, 
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import { motion } from 'framer-motion';
import BackspaceIcon from '@mui/icons-material/Backspace';
import DeleteIcon from '@mui/icons-material/Delete';
import PublishIcon from '@mui/icons-material/Publish';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useUI } from '@/contexts/UIContext';
import { ATWGameType, getSequenceForGameType, formatTargetDisplay } from '@/types/around-the-world';

// Create motion components using the recommended API
const MotionButton = motion.create(Button);

interface ATWScoreEntryProps {
  gameType: ATWGameType;
  currentTarget: number;
  multiplierAdvances: boolean;
  onScoreSubmit: (hits: number[], multipliers: number[]) => void;
  onCelebrate180?: () => void;
}

const ATWScoreEntry: React.FC<ATWScoreEntryProps> = ({ 
  gameType,
  currentTarget,
  multiplierAdvances,
  onScoreSubmit,
  onCelebrate180
}) => {
  const { isSoundEnabled } = useUI();
  const [dartHits, setDartHits] = useState<{ number: number; multiplier: number }[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeTarget, setActiveTarget] = useState(currentTarget); // Track current target for this turn
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Reset active target when currentTarget changes (new turn)
  useEffect(() => {
    setActiveTarget(currentTarget);
  }, [currentTarget]);
  
  // Reset dart hits and active target when turn is submitted
  useEffect(() => {
    if (dartHits.length === 0) {
      setActiveTarget(currentTarget);
    }
  }, [dartHits.length, currentTarget]);
  
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
      // Clean up audio context when component unmounts
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isSoundEnabled]);
  
  // Get the game sequence
  const sequence = getSequenceForGameType(gameType);
  
  // Check for special achievements
  const is180 = dartHits.reduce((sum, hit) => sum + (hit.number * hit.multiplier), 0) === 180 && dartHits.length === 3;
  
  // Calculate next target in sequence
  const getNextTarget = (currentSeqTarget: number, advancement: number) => {
    const currentIndex = sequence.indexOf(currentSeqTarget);
    if (currentIndex === -1) return currentSeqTarget; // Safety check
    
    const nextIndex = (currentIndex + advancement) % sequence.length;
    return sequence[nextIndex];
  };

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
      
      // Different sound for hit vs miss
      const frequency = isHit ? 660 : 440; // Higher pitch for hit
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

  // Handle hit button press
  const handleHit = (multiplier: number) => {
    // Limit to 3 darts per turn
    if (dartHits.length >= 3) return;

    const newHit = { number: activeTarget, multiplier };
    setDartHits([...dartHits, newHit]);
    playSound(true);
    
    // Advance the target for the next dart in this turn
    if (multiplierAdvances) {
      // In multiplier advance mode: single=1 space, double=2 spaces, triple=3 spaces
      setActiveTarget(getNextTarget(activeTarget, multiplier));
    } else {
      // In standard mode: always advance 1 space on hit
      setActiveTarget(getNextTarget(activeTarget, 1));
    }
  };

  // Handle miss button press
  const handleMiss = () => {
    // Limit to 3 darts per turn
    if (dartHits.length >= 3) return;

    const newHit = { number: 0, multiplier: 0 };
    setDartHits([...dartHits, newHit]);
    playSound(false);
  };

  // Handle backspace button
  const handleBackspace = () => {
    if (dartHits.length > 0) {
      setDartHits(dartHits.slice(0, -1));
      
      // Recalculate the active target by replaying all remaining hits
      let target = currentTarget;
      const remainingHits = dartHits.slice(0, -1);
      
      for (const hit of remainingHits) {
        if (hit.number > 0) { // Only advance on hits, not misses
          const advancement = multiplierAdvances ? hit.multiplier : 1;
          target = getNextTarget(target, advancement);
        }
      }
      
      setActiveTarget(target);
    }
  };

  // Handle clear button
  const handleClear = () => {
    setDartHits([]);
    setActiveTarget(currentTarget); // Reset to original target
  };

  // Handle submit button
  const handleSubmit = () => {
    // Check if we have a 180
    if (is180 && onCelebrate180) {
      setShowCelebration(true);
      return;
    }
    
    // Submit the hits
    const numbers = dartHits.map(hit => hit.number);
    const multipliers = dartHits.map(hit => hit.multiplier);
    onScoreSubmit(numbers, multipliers);
    setDartHits([]); // Reset dart hits after submission
  };

  // Handle celebration confirmation
  const handleCelebrationConfirm = () => {
    if (onCelebrate180) {
      onCelebrate180();
    }
    setShowCelebration(false);
    const numbers = dartHits.map(hit => hit.number);
    const multipliers = dartHits.map(hit => hit.multiplier);
    onScoreSubmit(numbers, multipliers);
    setDartHits([]); // Reset dart hits after celebration
  };

  // Format dart display
  const formatDartDisplay = (hit: { number: number; multiplier: number }) => {
    if (hit.number === 0) return 'Miss';
    
    const prefix = hit.multiplier === 1 ? '' : hit.multiplier === 2 ? 'D' : 'T';
    const targetDisplay = formatTargetDisplay(hit.number);
    return prefix ? `${prefix}${targetDisplay}` : targetDisplay;
  };
  
  // Check if current dart hit the target
  const isDartHit = (hit: { number: number; multiplier: number }) => {
    return hit.number > 0; // Any non-zero number is a hit
  };

  return (
    <>
      {/* Current Target and Turn Summary */}
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
          Current Target
        </Typography>
        <Typography 
          variant="h3" 
          component="div" 
          fontWeight="bold" 
          color="primary.main"
          sx={{ mb: 2, lineHeight: 1 }}
        >
          {formatTargetDisplay(activeTarget)}
        </Typography>
        
        {/* Darts thrown this turn */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1,
          minHeight: '36px'
        }}>
          {dartHits.map((hit, index) => (
            <Chip
              key={index}
              label={formatDartDisplay(hit)}
              color={isDartHit(hit) ? 'success' : 'default'}
              variant="filled"
              size="medium"
              icon={isDartHit(hit) ? <CheckCircleIcon /> : <CancelIcon />}
              sx={{ 
                fontWeight: 'bold',
                fontSize: '0.9rem',
                px: 1
              }}
            />
          ))}
          {[...Array(3 - dartHits.length)].map((_, index) => (
            <Box
              key={`empty-${index}`}
              sx={{ 
                width: '60px', 
                height: '32px', 
                border: '2px dashed', 
                borderColor: 'grey.700', 
                borderRadius: '16px',
                opacity: 0.3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Typography variant="caption" color="grey.600">·</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Simplified Hit/Miss Controls */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: '12px' }}>
        <Typography 
          variant="subtitle2" 
          color="text.secondary" 
          sx={{ mb: 2, textAlign: 'center', fontWeight: 'medium' }}
        >
          Did you hit {formatTargetDisplay(activeTarget)}?
        </Typography>

        {/* Hit buttons */}
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <MotionButton
            variant="contained"
            color="success"
            size="large"
            fullWidth
            onClick={() => handleHit(1)}
            disabled={dartHits.length >= 3}
            startIcon={<CheckCircleIcon />}
            whileTap={{ scale: 0.95 }}
            sx={{ 
              py: 2, 
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: 3
            }}
          >
            HIT (Single)
          </MotionButton>

          {/* Double/Triple buttons - only show if multiplier advances mode */}
          {multiplierAdvances && (
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <MotionButton
                  variant="contained"
                  color="success"
                  size="large"
                  fullWidth
                  onClick={() => handleHit(2)}
                  disabled={dartHits.length >= 3}
                  whileTap={{ scale: 0.95 }}
                  sx={{ 
                    py: 1.5, 
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    bgcolor: 'success.dark'
                  }}
                >
                  HIT (Double)
                </MotionButton>
              </Grid>
              <Grid item xs={6}>
                <MotionButton
                  variant="contained"
                  color="success"
                  size="large"
                  fullWidth
                  onClick={() => handleHit(3)}
                  disabled={dartHits.length >= 3}
                  whileTap={{ scale: 0.95 }}
                  sx={{ 
                    py: 1.5, 
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    bgcolor: 'success.dark'
                  }}
                >
                  HIT (Triple)
                </MotionButton>
              </Grid>
            </Grid>
          )}

          <MotionButton
            variant="outlined"
            color="error"
            size="large"
            fullWidth
            onClick={handleMiss}
            disabled={dartHits.length >= 3}
            startIcon={<CancelIcon />}
            whileTap={{ scale: 0.95 }}
            sx={{ 
              py: 2, 
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2
              }
            }}
          >
            MISS
          </MotionButton>
        </Stack>

        {/* Control buttons */}
        <Grid container spacing={1}>
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

        {/* Game Rules Reminder */}
        {multiplierAdvances && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.dark', borderRadius: '8px' }}>
            <Typography variant="caption" color="info.contrastText" sx={{ fontSize: '0.75rem' }}>
              💡 <strong>Multiplier Advances:</strong> Double = 2 spaces forward, Triple = 3 spaces forward
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 180 Celebration Dialog */}
      <Dialog open={showCelebration} onClose={() => setShowCelebration(false)}>
        <DialogTitle sx={{ textAlign: 'center' }}>
          <Typography variant="h5" component="div" fontWeight="bold">
            ONE HUNDRED AND EIGHTY!
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.2, 1, 1.2, 1] 
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <CelebrationIcon color="primary" sx={{ fontSize: 100 }} />
            </motion.div>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Congratulations! You scored a perfect 180!
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCelebration(false)}>Skip Celebration</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCelebrationConfirm}
            autoFocus
          >
            Celebrate!
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ATWScoreEntry;
