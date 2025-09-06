import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  Grid, 
  Paper, 
  Typography,
  IconButton,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import { motion } from 'framer-motion';
import BackspaceIcon from '@mui/icons-material/Backspace';
import DeleteIcon from '@mui/icons-material/Delete';
import PublishIcon from '@mui/icons-material/Publish';
import CelebrationIcon from '@mui/icons-material/Celebration';
import { useUI } from '@/contexts/UIContext';
import { ATWGameType, getSequenceForGameType, formatTargetDisplay } from '@/types/around-the-world';

// Create motion components using the recommended API
const MotionButton = motion.create(Button);
const MotionChip = motion.create(Chip);

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
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1); // Default to single
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize audio context once
  useEffect(() => {
    if (isSoundEnabled) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
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
  const hitTargetThisTurn = dartHits.some(hit => hit.number === currentTarget);
  const is180 = dartHits.reduce((sum, hit) => sum + (hit.number * hit.multiplier), 0) === 180 && dartHits.length === 3;

  // Handle number button press
  const handleNumberPress = (num: number) => {
    // Limit to 3 darts per turn
    if (dartHits.length >= 3) return;

    const newHit = { number: num, multiplier: selectedMultiplier };
    setDartHits([...dartHits, newHit]);
    
    // Reset multiplier to single after each dart (unless it's a special button)
    if (num !== 25 && num !== 50) {
      setSelectedMultiplier(1);
    }

    // Play sound if enabled
    if (isSoundEnabled) {
      try {
        const audioContext = audioContextRef.current;
        if (!audioContext) return;
        
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
          return;
        }
        
        // Different sound for hitting the target vs missing
        const frequency = num === currentTarget ? 660 : 440; // Higher pitch for target hit
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
          } catch (e) {
            // Ignore oscillator stop errors
          }
        }, 100);
      } catch (e) {
        console.log("Audio feedback unavailable");
      }
    }
  };

  // Handle multiplier selection
  const handleMultiplierSelect = (multiplier: number) => {
    setSelectedMultiplier(multiplier);
  };

  // Handle backspace button
  const handleBackspace = () => {
    if (dartHits.length > 0) {
      setDartHits(dartHits.slice(0, -1));
    }
  };

  // Handle clear button
  const handleClear = () => {
    setDartHits([]);
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

  // Get multiplier text representation
  const getMultiplierLabel = (multiplier: number) => {
    switch(multiplier) {
      case 1: return 'Single';
      case 2: return 'Double';
      case 3: return 'Triple';
      default: return 'Single';
    }
  };

  // Format dart display
  const formatDartDisplay = (hit: { number: number; multiplier: number }) => {
    if (hit.number === 25) return '25';
    if (hit.number === 50) return 'Bull';
    
    const prefix = hit.multiplier === 1 ? 'S' : hit.multiplier === 2 ? 'D' : 'T';
    return `${prefix}${hit.number}`;
  };

  return (
    <>
      {/* Current Target and Turn Summary */}
      <Paper sx={{ 
        p: 1, 
        mb: 1, 
        bgcolor: 'grey.900',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }}>
        <Grid container alignItems="center" spacing={1}>
          <Grid item xs={4}>
            <Typography variant="caption" color="grey.500" sx={{ fontWeight: 'medium', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Target
            </Typography>
            <Typography 
              variant="h5" 
              component="div" 
              fontWeight="bold" 
              color="primary.main"
              sx={{ lineHeight: 1.1 }}
            >
              {formatTargetDisplay(currentTarget)}
            </Typography>
          </Grid>
          
          <Grid item xs={8}>
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              height: '100%',
              px: 1
            }}>
              {dartHits.map((hit, index) => (
                <Chip
                  key={index}
                  label={formatDartDisplay(hit)}
                  color={hit.number === currentTarget ? 'success' : 'default'}
                  variant="filled"
                  size="small"
                  sx={{ 
                    mx: 0.25, 
                    fontWeight: 'bold',
                    height: '24px',
                  }}
                />
              ))}
              {[...Array(3 - dartHits.length)].map((_, index) => (
                <Box
                  key={`empty-${index}`}
                  sx={{ 
                    width: '26px', 
                    height: '20px', 
                    border: '1px dashed', 
                    borderColor: 'grey.700', 
                    borderRadius: '12px',
                    mx: 0.25,
                    opacity: 0.4,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="caption" color="grey.600">·</Typography>
                </Box>
              ))}
              {hitTargetThisTurn && (
                <Chip 
                  label="HIT!" 
                  color="success" 
                  size="small" 
                  sx={{ 
                    ml: 0.5,
                    height: '20px', 
                    '& .MuiChip-label': { px: 1, fontSize: '0.6rem', fontWeight: 'bold' }
                  }} 
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Mobile-optimized Score Entry */}
      <Paper sx={{ p: 1.5, mb: 1, borderRadius: '8px' }}>
        {/* Multiplier Selection - Select this FIRST */}
        <Grid container spacing={1} sx={{ mb: 1 }}>
          <Grid item xs={3} sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
              Step 1:
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Button
              variant={selectedMultiplier === 1 ? "contained" : "outlined"}
              color="primary"
              fullWidth
              onClick={() => handleMultiplierSelect(1)}
              sx={{ py: 0.75, borderRadius: '8px' }}
            >
              Single
            </Button>
          </Grid>
          <Grid item xs={3}>
            <Button
              variant={selectedMultiplier === 2 ? "contained" : "outlined"}
              color="primary"
              fullWidth
              onClick={() => handleMultiplierSelect(2)}
              sx={{ py: 0.75, borderRadius: '8px' }}
            >
              Double
            </Button>
          </Grid>
          <Grid item xs={3}>
            <Button
              variant={selectedMultiplier === 3 ? "contained" : "outlined"}
              color="primary"
              fullWidth
              onClick={() => handleMultiplierSelect(3)}
              sx={{ py: 0.75, borderRadius: '8px' }}
            >
              Triple
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 1 }} />
        
        {/* Number Selection - AFTER selecting multiplier */}
        <Grid container sx={{ mb: 1 }}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
              Step 2: {selectedMultiplier > 1 && 
                <Typography component="span" color="primary.main" fontWeight="bold">
                  {selectedMultiplier === 2 ? 'Double' : 'Triple'}
                </Typography>
              }
            </Typography>
          </Grid>
          <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
            {/* Special quick buttons */}
            <Button 
              variant="outlined"
              color="secondary"
              onClick={() => handleNumberPress(25)} 
              disabled={dartHits.length >= 3}
              size="small" 
              sx={{ minWidth: 0, px: 1.5, py: 0.6 }}
            >
              25
            </Button>
            <Button 
              variant="outlined"
              color="secondary"
              onClick={() => handleNumberPress(50)} 
              disabled={dartHits.length >= 3}
              size="small" 
              sx={{ minWidth: 0, px: 1.5, py: 0.6 }}
            >
              Bull
            </Button>
            <Button 
              variant="outlined"
              onClick={() => handleNumberPress(0)} 
              disabled={dartHits.length >= 3}
              size="small"
              sx={{ minWidth: 0, px: 1.5, py: 0.6 }}
            >
              Miss
            </Button>
          </Grid>
        </Grid>
        
        {/* Numbers Pad in a 5x4 grid layout with larger buttons */}
        <Grid container spacing={1} sx={{ mb: 1 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(num => (
            <Grid item xs={2.4} key={num}>
              <Button
                variant={num === currentTarget ? "contained" : "outlined"}
                color={num === currentTarget ? "success" : "primary"}
                onClick={() => handleNumberPress(num)}
                disabled={dartHits.length >= 3}
                sx={{ 
                  width: '100%', 
                  minWidth: 0, 
                  py: 0.75,
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  fontWeight: num === currentTarget ? 'bold' : 'normal',
                  '&:hover': {
                    bgcolor: num === currentTarget ? 'success.dark' : 'primary.light',
                    color: 'white',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                {num}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Control buttons */}
        <Grid container spacing={1}>
          <Grid item xs={2}>
            <IconButton 
              onClick={handleBackspace} 
              disabled={dartHits.length === 0}
              color="error"
              sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
            >
              <BackspaceIcon />
            </IconButton>
          </Grid>
          <Grid item xs={2}>
            <IconButton 
              onClick={handleClear} 
              disabled={dartHits.length === 0}
              color="error"
              sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
            >
              <DeleteIcon />
            </IconButton>
          </Grid>
          <Grid item xs={8}>
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              disabled={dartHits.length === 0}
              fullWidth
              startIcon={<PublishIcon />}
              sx={{ py: 1, borderRadius: '8px' }}
            >
              Submit Turn
            </Button>
          </Grid>
        </Grid>

        {/* Game Rules Reminder */}
        {multiplierAdvances && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'info.dark', borderRadius: 1 }}>
            <Typography variant="caption" color="info.contrastText">
              Multiplier Advances: Double = 2 spaces, Triple = 3 spaces
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
