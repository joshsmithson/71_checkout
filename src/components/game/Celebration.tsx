import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Dialog, 
  Box, 
  Typography, 
  Avatar, 
  IconButton,
  Button,
  Paper,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import { useUI } from '@/contexts/UIContext';

// Confetti import
import Confetti from 'react-confetti';

// Create motion components using the recommended API
const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);

// List of potential callers
const CALLERS = [
  { name: 'Phil Taylor', avatar: 'https://i.imgur.com/7XfcvGD.jpg' },
  { name: 'Michael van Gerwen', avatar: 'https://i.imgur.com/3ZhRFLJ.jpg' },
  { name: 'Peter Wright', avatar: 'https://i.imgur.com/xXABmLn.jpg' },
  { name: 'Gerwyn Price', avatar: 'https://i.imgur.com/6YrCkfS.jpg' },
  { name: 'Rob Cross', avatar: 'https://i.imgur.com/GQHpWoL.jpg' },
  { name: 'Your Biggest Fan', avatar: '' },
];

interface CelebrationProps {
  open: boolean;
  onClose: () => void;
}

const Celebration = ({ open, onClose }: CelebrationProps) => {
  const { isSoundEnabled } = useUI();
  // Use useMemo to pick a stable random caller
  const initialCaller = useMemo(() => {
    return CALLERS[Math.floor(Math.random() * CALLERS.length)];
  }, []);
  const [caller, setCaller] = useState(initialCaller);
  const [answered, setAnswered] = useState(false);
  const ringingSoundRef = useRef<{ play: () => void; pause: () => void } | null>(null);
  const celebrationSoundRef = useRef<HTMLAudioElement | null>(null);
  const [celebrationFinished, setCelebrationFinished] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  // Pre-load audio files
  useEffect(() => {
    // Create audio contexts and oscillators instead of audio elements
    let ringingContext: AudioContext | null = null;
    let celebrationContext: AudioContext | null = null;
    
    if (isSoundEnabled) {
      try {
        // Use Web Audio API instead of HTML Audio elements to avoid browser restrictions
        if (open) {
          // Setup ringing sound - simple repeating beep
          ringingContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = ringingContext.createOscillator();
          const gain = ringingContext.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.value = 880; // A5 note
          gain.gain.value = 0.1;
          
          oscillator.connect(gain);
          gain.connect(ringingContext.destination);
          
          ringingSoundRef.current = {
            play: () => {
              oscillator.start();
            },
            pause: () => {
              oscillator.stop();
              ringingContext?.close();
            }
          };
        }
      } catch (e) {
        console.log("Audio not supported:", e);
      }
    }
    
    // Initial window size measurement
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    
    // Cleanup function
    return () => {
      if (ringingSoundRef.current) {
        try {
          ringingSoundRef.current.pause();
        } catch (e) {
          console.log("Error stopping audio:", e);
        }
      }
      if (celebrationSoundRef.current) {
        try {
          celebrationSoundRef.current.pause();
        } catch (e) {
          console.log("Error stopping audio:", e);
        }
      }
    };
  }, [isSoundEnabled, open]);

  // Only handle dialog open/close effects
  useEffect(() => {
    if (open) {
      // Reset states
      setAnswered(false);
      setCelebrationFinished(false);

      // Play ringing sound if enabled
      if (isSoundEnabled && ringingSoundRef.current) {
        ringingSoundRef.current.play();
      }
    } else {
      // Stop sounds when dialog closes
      if (ringingSoundRef.current) {
        ringingSoundRef.current.pause();
      }
      if (celebrationSoundRef.current) {
        celebrationSoundRef.current.pause();
      }
    }
  }, [open, isSoundEnabled]);

  // Separate effect for window resize
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Handle answering the call
  const handleAnswer = () => {
    setAnswered(true);
    
    // Stop ringing, play celebration sound
    if (ringingSoundRef.current) {
      ringingSoundRef.current.pause();
    }
    
    if (isSoundEnabled) {
      try {
        // Create an oscillator for a celebratory sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.value = 587.33; // D5
        gain.gain.value = 0.1;
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.start();
        
        // Play a short fanfare
        setTimeout(() => {
          oscillator.frequency.value = 659.25; // E5
          setTimeout(() => {
            oscillator.frequency.value = 783.99; // G5
            setTimeout(() => {
              oscillator.stop();
              audioContext.close().catch(() => {});
              setCelebrationFinished(true);
            }, 800);
          }, 200);
        }, 200);
      } catch (e) {
        console.log("Audio not supported for celebration");
        // If sound is disabled or fails, still mark as finished after a delay
        setTimeout(() => setCelebrationFinished(true), 2000);
      }
    } else {
      // If sound is disabled, still mark as finished after a delay
      setTimeout(() => setCelebrationFinished(true), 2000);
    }
  };

  // Handle rejecting the call
  const handleReject = () => {
    if (ringingSoundRef.current) {
      ringingSoundRef.current.pause();
    }
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="xs" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: answered ? '#111' : '#121212'
        }
      }}
    >
      <AnimatePresence mode="wait">
        {!answered ? (
          // Incoming call screen
          <MotionBox
            key="call"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              minHeight: '350px',
              justifyContent: 'space-between'
            }}
          >
            <Box>
              <Typography 
                variant="h6" 
                color="primary"
                sx={{ 
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.6 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.6 }
                  }
                }}
              >
                Incoming Call
              </Typography>
            </Box>
            
            <Box sx={{ my: 4 }}>
              <MotionBox
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
              >
                <Avatar 
                  src={caller.avatar}
                  imgProps={{ referrerPolicy: "no-referrer" }}
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    mx: 'auto',
                    border: '3px solid #E53935'
                  }}
                >
                  {!caller.avatar && caller.name.charAt(0)}
                </Avatar>
              </MotionBox>
              
              <Typography variant="h5" sx={{ mt: 2, fontWeight: 'bold' }}>
                {caller.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                180 Congratulations!
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
              <IconButton 
                color="error" 
                sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(244, 67, 54, 0.2)',
                  '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.3)' }
                }}
                onClick={handleReject}
              >
                <CallEndIcon fontSize="large" />
              </IconButton>
              
              <IconButton 
                color="success" 
                sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(76, 175, 80, 0.2)',
                  '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.3)' }
                }}
                onClick={handleAnswer}
              >
                <CallIcon fontSize="large" />
              </IconButton>
            </Box>
          </MotionBox>
        ) : (
          // Celebration screen
          <MotionBox
            key="celebration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              minHeight: '350px',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Confetti overlay */}
            <Confetti
              width={windowSize.width - 40}
              height={400}
              recycle={!celebrationFinished}
              numberOfPieces={celebrationFinished ? 0 : 200}
            />
            
            <MotionPaper
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              sx={{ 
                bgcolor: 'rgba(0,0,0,0.7)', 
                p: 3, 
                borderRadius: 3,
                width: '100%',
                position: 'relative',
                zIndex: 1
              }}
            >
              <Typography variant="h4" color="primary" fontWeight="bold" gutterBottom>
                ONE HUNDRED AND EIGHTY!
              </Typography>
              
              <Box sx={{ my: 3 }}>
                <Typography variant="h6">
                  {caller.name} says:
                </Typography>
                
                <Typography variant="body1" sx={{ fontStyle: 'italic', mt: 1 }}>
                  "That was absolutely magnificent! Keep up the great darts!"
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<SportsBarIcon />}
                onClick={onClose}
                sx={{ mt: 2 }}
              >
                Continue Game
              </Button>
            </MotionPaper>
          </MotionBox>
        )}
      </AnimatePresence>
      
      {/* Instead of direct refs in JSX, use useEffect to create audio elements */}
    </Dialog>
  );
};

export default Celebration; 