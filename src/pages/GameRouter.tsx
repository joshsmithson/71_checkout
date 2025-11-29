import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, CircularProgress, Alert, Button } from '@mui/material';
import { useSupabase } from '@/hooks/useSupabase';
import { isATWGameType } from '@/types/around-the-world';
import { isKillerGameType } from '@/types/killer';
import ActiveGame from './ActiveGame';
import ActiveATWGame from './ActiveATWGame';
import ActiveKillerGame from './ActiveKillerGame';

const GameRouter = () => {
  const { id } = useParams<{ id: string }>();
  const { getGameById } = useSupabase();
  const [gameType, setGameType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const determineGameType = async () => {
      if (!id) {
        setError('No game ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const game = await getGameById(id);
        if (!game) {
          setError('Game not found');
          setIsLoading(false);
          return;
        }

        setGameType(game.type);
        setIsLoading(false);
      } catch (error) {
        console.error('Error determining game type:', error);
        setError('Failed to load game');
        setIsLoading(false);
      }
    };

    determineGameType();
  }, [id, getGameById]);

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => window.location.href = '/'}>
          Back to Home
        </Button>
      </Container>
    );
  }

  if (!gameType) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Unknown game type
        </Alert>
        <Button variant="outlined" onClick={() => window.location.href = '/'}>
          Back to Home
        </Button>
      </Container>
    );
  }

  // Route to appropriate game component
  if (isATWGameType(gameType)) {
    return <ActiveATWGame />;
  } else if (isKillerGameType(gameType)) {
    return <ActiveKillerGame />;
  } else {
    return <ActiveGame />;
  }
};

export default GameRouter;
