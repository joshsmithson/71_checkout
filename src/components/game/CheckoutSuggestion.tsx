import { Box, Paper, Typography, Grid, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckoutSuggestionProps {
  score: number;
  suggestion: string[][] | null;
  isVisible: boolean;
}

const CheckoutSuggestion = ({ score, suggestion, isVisible }: CheckoutSuggestionProps) => {
  const shouldShow = isVisible && score <= 170 && score > 1 && suggestion && suggestion.length > 0;

  return (
    <AnimatePresence mode="wait">
      {shouldShow && (
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
                  Checkout Path{suggestion!.length > 1 ? 's' : ''}:
                </Typography>
                <Typography color="primary.main" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {score}
                </Typography>
              </Grid>
              <Grid item xs={8}>
                {suggestion!.map((path, pathIndex) => (
                  <Box
                    key={pathIndex}
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      gap: 0.5,
                      flexWrap: 'wrap',
                      mt: pathIndex > 0 ? 1 : 0,
                      mb: 0.5
                    }}
                  >
                    {pathIndex > 0 && (
                      <Typography variant="caption" color="grey.500" sx={{ width: '100%', mb: 0.5 }}>
                        Alternative:
                      </Typography>
                    )}
                    {path.map((dart, dartIndex) => {
                      const isDartTriple = dart.startsWith('T');
                      const isDartDouble = dart.startsWith('D');
                      const isBull = dart === 'Bull';

                      return (
                        <Chip
                          key={dartIndex}
                          label={dart}
                          variant="filled"
                          color={isDartTriple ? 'error' : isDartDouble ? 'primary' : 'default'}
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
                {suggestion!.length > 0 && (
                  <Typography variant="caption" color="grey.500" sx={{ textAlign: 'center', display: 'block', mt: 0.5 }}>
                    Suggested checkout path{suggestion!.length > 1 ? 's' : ''}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutSuggestion;
