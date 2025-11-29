import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Stack,
  Paper,
  Chip,
  IconButton
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import { Player, Turn, GameStatus } from '@/types/game';

interface TurnHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  turns: Turn[];
  players: Player[];
  gameStatus: GameStatus;
  onRevertClick: (turn: Turn, index: number) => void;
}

const TurnHistoryDialog = ({
  open,
  onClose,
  turns,
  players,
  gameStatus,
  onRevertClick
}: TurnHistoryDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      key={`turn-history-${turns.length}-${turns.map(t => t.id).join('-')}`}
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
              const scoresAfterRevert: { [key: string]: number } = {};

              // First, set all players to their starting scores
              players.forEach(p => {
                scoresAfterRevert[`${p.id}-${p.type}`] = p.startingScore;
              });

              // Then, apply all turns up to and including the current turn index
              for (let i = 0; i <= index; i++) {
                const t = turns[i];
                const playerKey = `${t.player_id}-${t.player_type}`;
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

                      {affectedTurns > 0 && gameStatus === 'active' && (
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

                    {gameStatus === 'active' && affectedTurns > 0 && (
                      <IconButton
                        size="medium"
                        color="warning"
                        onClick={() => onRevertClick(turn, index)}
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
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TurnHistoryDialog;
