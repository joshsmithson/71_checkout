import { useState } from 'react';
import { Card, CardContent, Typography, Divider, List, ListItem, ListItemText, Chip, Box, Button } from '@mui/material';
import { format } from 'date-fns';

interface GameHistoryItem {
  id: string;
  type: string;
  created_at: string;
  players: {
    id: string;
    name: string;
    winner: boolean;
  }[];
}

interface RecentGamesProps {
  games: GameHistoryItem[];
  onViewGame?: (gameId: string) => void;
}

const RecentGames = ({ games, onViewGame }: RecentGamesProps) => {
  const [expanded, setExpanded] = useState(false);
  
  if (games.length === 0) {
    return null;
  }
  
  const displayGames = expanded ? games : games.slice(0, 5);
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };
  
  return (
    <Card sx={{ mb: 4, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Recent Games
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <List disablePadding>
          {displayGames.map((game) => (
            <ListItem
              key={game.id}
              sx={{ 
                py: 1.5, 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                '&:last-child': { 
                  borderBottom: 'none' 
                } 
              }}
              secondaryAction={
                onViewGame && (
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={() => onViewGame(game.id)}
                  >
                    View
                  </Button>
                )
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" component="span">
                      {`${game.type} Game`}
                    </Typography>
                    <Chip 
                      label={formatDate(game.created_at)} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    {game.players.map((player) => (
                      <Typography 
                        key={player.id} 
                        variant="body2" 
                        component="span" 
                        color={player.winner ? 'success.main' : 'text.secondary'}
                        sx={{ 
                          display: 'inline-block',
                          mr: 2,
                          fontWeight: player.winner ? 'bold' : 'normal'
                        }}
                      >
                        {player.name} {player.winner && '(Winner)'}
                      </Typography>
                    ))}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
        
        {games.length > 5 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button 
              variant="text" 
              size="small" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show Less' : `Show More (${games.length - 5} more)`}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentGames; 