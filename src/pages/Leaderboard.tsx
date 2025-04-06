import { Box, Container, Typography } from '@mui/material';

const Leaderboard = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Leaderboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page will contain the player leaderboard
        </Typography>
      </Box>
    </Container>
  );
};

export default Leaderboard; 