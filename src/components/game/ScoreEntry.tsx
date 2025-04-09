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

// Create motion components using the recommended API
const MotionButton = motion.create(Button);
const MotionChip = motion.create(Chip);

interface ScoreEntryProps {
  currentPlayerScore: number;
  onScoreSubmit: (scores: number[]) => void;
  onCelebrate180?: () => void;
}

const ScoreEntry: React.FC<ScoreEntryProps> = ({ 
  currentPlayerScore, 
  onScoreSubmit,
  onCelebrate180
}) => {
  const { isSoundEnabled } = useUI();
  const [dartScores, setDartScores] = useState<number[]>([]);
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
  
  // Calculate running total
  const totalScore = dartScores.reduce((sum, score) => sum + score, 0);
  
  // Check if current entry would result in bust
  const wouldBust = currentPlayerScore - totalScore < 0 || (currentPlayerScore - totalScore === 1);
  
  // Check if current entry is a 180
  const is180 = totalScore === 180 && dartScores.length === 3;

  // Update parent component with running total after each dart
  useEffect(() => {
    // Only send running updates when we have dart scores but not all 3 yet
    if (dartScores.length > 0 && dartScores.length < 3) {
      // We use a special format to indicate this is a running update, not a final submission
      // Wrap in a try/catch to prevent crashes
      try {
        onScoreSubmit([...dartScores, -1]); // The -1 indicates this is a running update
      } catch (error) {
        console.error("Error updating score:", error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dartScores]); // Remove onScoreSubmit from dependencies to prevent potential loops

  // Handle number button press - now with multiplier first approach
  const handleNumberPress = (num: number) => {
    // Limit to 3 darts per turn
    if (dartScores.length >= 3) return;

    // Special cases that ignore multiplier
    if (num === 25) {
      // Single Bull
      setDartScores([...dartScores, 25]);
    } else if (num === 50) {
      // Double Bull
      setDartScores([...dartScores, 50]);
    } else if (num === 0) {
      // Miss (0 points)
      setDartScores([...dartScores, 0]);
    } else {
      // Regular numbers 1-20, apply the selected multiplier
      setDartScores([...dartScores, num * selectedMultiplier]);
      // Reset multiplier to single after each dart
      setSelectedMultiplier(1);
    }

    // Play sound if enabled
    if (isSoundEnabled) {
      try {
        // Check if audio playback is allowed
        const audioContext = audioContextRef.current;
        if (!audioContext) return;
        
        if (audioContext.state === 'suspended') {
          // Try to resume the audio context if suspended
          audioContext.resume().catch(() => {});
          return;
        }
        
        // Use a simple oscillator instead of loading a file
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // A4 note
        gain.gain.value = 0.1; // Lower volume
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.start();
        
        // Stop the oscillator after a short time, but don't close the context
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
        // Silently fail if audio is not supported
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
    if (dartScores.length > 0) {
      setDartScores(dartScores.slice(0, -1));
    }
  };

  // Handle clear button
  const handleClear = () => {
    setDartScores([]);
  };

  // Handle submit button
  const handleSubmit = () => {
    // Check if we have a 180
    if (is180 && onCelebrate180) {
      setShowCelebration(true);
      return;
    }
    
    // If it's a bust, record it as [0]
    if (wouldBust) {
      onScoreSubmit([0]);
      setDartScores([]); // Reset dart scores after submission
      return;
    }
    
    // Otherwise submit the scores
    onScoreSubmit(dartScores);
    setDartScores([]); // Reset dart scores after submission
  };

  // Handle celebration confirmation
  const handleCelebrationConfirm = () => {
    if (onCelebrate180) {
      onCelebrate180();
    }
    setShowCelebration(false);
    onScoreSubmit(dartScores);
    setDartScores([]); // Reset dart scores after celebration
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

  return (
    <>
      {/* Running Total - More compact and dark theme design */}
      <Paper sx={{ 
        p: 0.75, 
        mb: 1, 
        bgcolor: 'grey.900',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }}>
        <Grid container alignItems="center" spacing={0}>
          <Grid item xs={3} sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="grey.500" sx={{ fontWeight: 'medium', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Turn
            </Typography>
            <Typography 
              variant="h5" 
              component="div" 
              fontWeight="bold" 
              className="scores"
              color={wouldBust ? 'error.main' : 'primary.main'}
              sx={{ lineHeight: 1.1 }}
            >
              {totalScore}
            </Typography>
          </Grid>
          
          <Grid item xs={9}>
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              height: '100%',
              px: 1
            }}>
              {dartScores.map((score, index) => (
                <Chip
                  key={index}
                  label={score}
                  color={score >= 40 ? 'primary' : 'default'}
                  variant="filled"
                  size="small"
                  sx={{ 
                    mx: 0.25, 
                    fontWeight: 'bold',
                    height: '24px',
                  }}
                />
              ))}
              {[...Array(3 - dartScores.length)].map((_, index) => (
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
              {wouldBust && (
                <Chip 
                  label="BUST" 
                  color="error" 
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
          <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {/* Special quick buttons */}
            <Button 
              variant="outlined"
              color="secondary"
              onClick={() => handleNumberPress(25)} 
              disabled={dartScores.length >= 3}
              size="small" 
              sx={{ ml: 0.5, minWidth: 0, px: 1 }}
            >
              Bull
            </Button>
            <Button 
              variant="outlined"
              color="secondary"
              onClick={() => handleNumberPress(50)} 
              disabled={dartScores.length >= 3}
              size="small" 
              sx={{ ml: 0.5, minWidth: 0, px: 1 }}
            >
              D-Bull
            </Button>
            <Button 
              variant="outlined"
              onClick={() => handleNumberPress(0)} 
              disabled={dartScores.length >= 3}
              size="small"
              sx={{ ml: 0.5, minWidth: 0, px: 1 }}
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
                variant="outlined"
                onClick={() => handleNumberPress(num)}
                disabled={dartScores.length >= 3}
                sx={{ 
                  width: '100%', 
                  minWidth: 0, 
                  py: 0.75,
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'primary.light',
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
              disabled={dartScores.length === 0}
              color="error"
              sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
            >
              <BackspaceIcon />
            </IconButton>
          </Grid>
          <Grid item xs={2}>
            <IconButton 
              onClick={handleClear} 
              disabled={dartScores.length === 0}
              color="error"
              sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
            >
              <DeleteIcon />
            </IconButton>
          </Grid>
          <Grid item xs={8}>
            <Button
              variant="contained"
              color={wouldBust ? 'error' : 'success'}
              onClick={handleSubmit}
              disabled={dartScores.length === 0}
              fullWidth
              startIcon={<PublishIcon />}
              sx={{ py: 1, borderRadius: '8px' }}
            >
              {wouldBust ? 'Record Bust' : 'Submit Score'}
            </Button>
          </Grid>
        </Grid>
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

export default ScoreEntry; 