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
  DialogActions 
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

  // Handle number button press
  const handleNumberPress = (num: number) => {
    // Limit to 3 darts per turn
    if (dartScores.length >= 3) return;

    // Common dart scores
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
      // Regular numbers 1-20
      setDartScores([...dartScores, num]);
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

  // Handle single, double, triple button press
  const handleMultiplier = (multiplier: number) => {
    if (dartScores.length === 0) return;
    
    const lastScore = dartScores[dartScores.length - 1];
    
    // Only apply to regular numbers 1-20
    if (lastScore > 0 && lastScore <= 20) {
      // Replace the last score with its multiplied value
      const newScores = [...dartScores];
      newScores[newScores.length - 1] = lastScore * multiplier;
      setDartScores(newScores);
    }
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

  return (
    <>
      {/* Running Total */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          This Turn
        </Typography>
        <Typography 
          variant="h3" 
          component="div" 
          fontWeight="bold" 
          className="scores"
          color={wouldBust ? 'error.main' : 'inherit'}
        >
          {totalScore} {wouldBust && '(BUST)'}
        </Typography>
        {/* Fixed height container for dart score chips */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            mt: 1, 
            minHeight: '32px',
            opacity: 1
          }}
        >
          {dartScores.map((score, index) => (
            <MotionChip
              key={index}
              label={score}
              color={score >= 40 ? 'primary' : 'default'}
              variant="filled"
              sx={{ mx: 0.5 }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          ))}
          {[...Array(3 - dartScores.length)].map((_, index) => (
            <Chip
              key={`empty-${index}`}
              label="-"
              variant="outlined"
              sx={{ mx: 0.5, opacity: 0.3 }}
            />
          ))}
        </Box>
      </Box>

      {/* Number Pad */}
      <Paper sx={{ p: 2 }}>
        {/* Numbers 1-20 */}
        <Grid container spacing={1} sx={{ mb: 1 }}>
          {[...Array(20)].map((_, i) => (
            <Grid item xs={2.4} key={i + 1}>
              <Button
                variant="outlined"
                onClick={() => handleNumberPress(i + 1)}
                disabled={dartScores.length >= 3}
                sx={{ minWidth: 0, width: '100%' }}
              >
                {i + 1}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Special buttons: Bull, Double Bull, Miss */}
        <Grid container spacing={1} sx={{ mb: 1 }}>
          <Grid item xs={4}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={() => handleNumberPress(25)}
              disabled={dartScores.length >= 3}
            >
              Bull (25)
            </Button>
          </Grid>
          <Grid item xs={4}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={() => handleNumberPress(50)}
              disabled={dartScores.length >= 3}
            >
              D-Bull (50)
            </Button>
          </Grid>
          <Grid item xs={4}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => handleNumberPress(0)}
              disabled={dartScores.length >= 3}
            >
              Miss (0)
            </Button>
          </Grid>
        </Grid>

        {/* Multipliers */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={() => handleMultiplier(1)}
              disabled={dartScores.length === 0 || dartScores[dartScores.length - 1] > 20 || dartScores[dartScores.length - 1] === 0}
            >
              Single
            </Button>
          </Grid>
          <Grid item xs={4}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={() => handleMultiplier(2)}
              disabled={dartScores.length === 0 || dartScores[dartScores.length - 1] > 20 || dartScores[dartScores.length - 1] === 0}
            >
              Double
            </Button>
          </Grid>
          <Grid item xs={4}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={() => handleMultiplier(3)}
              disabled={dartScores.length === 0 || dartScores[dartScores.length - 1] > 20 || dartScores[dartScores.length - 1] === 0}
            >
              Triple
            </Button>
          </Grid>
        </Grid>

        {/* Control buttons */}
        <Stack direction="row" spacing={1} justifyContent="space-between">
          <IconButton onClick={handleBackspace} disabled={dartScores.length === 0}>
            <BackspaceIcon />
          </IconButton>

          <IconButton onClick={handleClear} disabled={dartScores.length === 0}>
            <DeleteIcon />
          </IconButton>

          <Button
            variant="contained"
            color={wouldBust ? 'error' : 'primary'}
            startIcon={<PublishIcon />}
            onClick={handleSubmit}
            disabled={dartScores.length === 0}
            sx={{ flexGrow: 1 }}
          >
            {wouldBust ? 'Record Bust' : 'Submit Score'}
          </Button>
        </Stack>
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