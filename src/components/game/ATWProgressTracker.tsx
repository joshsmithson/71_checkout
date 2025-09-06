import { Box, Paper, Typography, LinearProgress, Chip, Grid, Avatar } from '@mui/material';
import { motion } from 'framer-motion';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { ATWPlayer } from '@/types/around-the-world';
import { formatTargetDisplay, getProgressPercentage } from '@/types/around-the-world';

const MotionPaper = motion.create(Paper);
const MotionBox = motion.create(Box);

interface ATWProgressTrackerProps {
  players: ATWPlayer[];
  sequence: number[];
  currentPlayerId: string;
  currentPlayerType: 'user' | 'friend';
}

const ATWProgressTracker: React.FC<ATWProgressTrackerProps> = ({
  players,
  sequence,
  currentPlayerId,
  currentPlayerType
}) => {
  // Sort players by progress (most advanced first)
  const sortedPlayers = [...players].sort((a, b) => b.progress.sequence_position - a.progress.sequence_position);
  
  // Determine leader(s)
  const maxPosition = Math.max(...players.map(p => p.progress.sequence_position));
  const leaders = players.filter(p => p.progress.sequence_position === maxPosition);

  return (
    <MotionPaper 
      sx={{ 
        mb: 1, 
        overflow: 'hidden',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Grid container>
        {sortedPlayers.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId && player.type === currentPlayerType;
          const isLeader = leaders.some(l => l.id === player.id && l.type === player.type);
          const progress = getProgressPercentage(player.progress.sequence_position, sequence.length);
          
          return (
            <Grid 
              item 
              xs={12 / players.length} 
              key={`${player.id}-${player.type}`}
              sx={{ 
                borderRight: index < sortedPlayers.length - 1 ? 1 : 0, 
                borderColor: 'divider',
                position: 'relative'
              }}
            >
              {/* Leader crown effect */}
              {isLeader && leaders.length === 1 && (
                <MotionBox
                  sx={{
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 2
                  }}
                  animate={{
                    y: [0, -2, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <EmojiEventsIcon 
                    sx={{ 
                      color: 'gold', 
                      fontSize: 24,
                      filter: 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3))'
                    }} 
                  />
                </MotionBox>
              )}
              
              <Box 
                sx={{ 
                  p: 1.5, 
                  textAlign: 'center',
                  position: 'relative',
                  background: isCurrentPlayer 
                    ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.2) 0%, rgba(25, 118, 210, 0.1) 100%)'
                    : isLeader && leaders.length === 1
                    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%)'
                    : 'transparent',
                  borderTop: isCurrentPlayer ? 3 : 0,
                  borderColor: 'primary.main'
                }}
              >
                {/* Player avatar and name */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      mb: 0.5,
                      bgcolor: isLeader ? 'gold' : 'primary.main',
                      color: isLeader ? 'black' : 'white'
                    }}
                  >
                    <PersonIcon fontSize="small" />
                  </Avatar>
                  <Typography 
                    variant="caption" 
                    noWrap 
                    fontWeight={isCurrentPlayer ? 'bold' : 'normal'}
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.7rem',
                      maxWidth: '100%'
                    }}
                  >
                    {player.name}
                  </Typography>
                </Box>

                {/* Current target */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                    Target
                  </Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color={isCurrentPlayer ? 'primary.main' : 'text.primary'}
                    sx={{ lineHeight: 1.1 }}
                  >
                    {player.progress.sequence_position <= sequence.length 
                      ? formatTargetDisplay(player.progress.current_target)
                      : 'DONE!'
                    }
                  </Typography>
                </Box>

                {/* Progress bar */}
                <Box sx={{ mb: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      bgcolor: 'grey.300',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: isLeader && leaders.length === 1 ? 'gold' : 'primary.main',
                        borderRadius: 3
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {player.progress.sequence_position}/{sequence.length}
                  </Typography>
                </Box>

                {/* Status chips */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  {isCurrentPlayer && (
                    <Chip 
                      label="Current" 
                      color="primary" 
                      size="small" 
                      sx={{ 
                        height: '16px',
                        '& .MuiChip-label': {
                          px: 0.5,
                          fontSize: '0.6rem'
                        }
                      }}
                    />
                  )}
                  {isLeader && (
                    <Chip 
                      label="Leader" 
                      sx={{ 
                        height: '16px',
                        bgcolor: 'gold',
                        color: 'black',
                        '& .MuiChip-label': {
                          px: 0.5,
                          fontSize: '0.6rem',
                          fontWeight: 'bold'
                        }
                      }}
                      size="small"
                    />
                  )}
                  {player.progress.sequence_position > sequence.length && (
                    <Chip 
                      label="WINNER!" 
                      color="success" 
                      size="small" 
                      sx={{ 
                        height: '16px',
                        '& .MuiChip-label': {
                          px: 0.5,
                          fontSize: '0.6rem',
                          fontWeight: 'bold'
                        }
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </MotionPaper>
  );
};

export default ATWProgressTracker;
