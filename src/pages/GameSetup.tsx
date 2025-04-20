import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Divider,
  Checkbox,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  InputAdornment
} from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import SportsIcon from '@mui/icons-material/Sports';

const MotionCard = motion.create(Card);

const GameSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    getFriends, 
    createGame, 
    addPlayersToGame, 
    addFriend,
    loading 
  } = useSupabase();

  // State
  const [gameType, setGameType] = useState('501');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [addingFriend, setAddingFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [shufflePlayers, setShufflePlayers] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creatingGame, setCreatingGame] = useState(false);

  // Load friends on component mount
  useEffect(() => {
    const loadFriends = async () => {
      const friendsData = await getFriends();
      if (friendsData) {
        setFriends(friendsData);
      }
    };
    
    loadFriends();
    // Only run on component mount and when user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Handle player selection
  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prevSelected => {
      if (prevSelected.includes(playerId)) {
        return prevSelected.filter(id => id !== playerId);
      } else {
        return [...prevSelected, playerId];
      }
    });
  };

  // Toggle add friend dialog
  const handleAddFriendToggle = () => {
    setAddingFriend(!addingFriend);
    setNewFriendName('');
  };

  // Add a new friend
  const handleAddFriend = async () => {
    if (!newFriendName.trim()) {
      setSnackbarMessage('Friend name cannot be empty');
      setSnackbarOpen(true);
      return;
    }

    try {
      const newFriend = await addFriend(newFriendName.trim());
      if (newFriend) {
        setFriends(prev => [...prev, newFriend]);
        setNewFriendName('');
        setSnackbarMessage('Friend added successfully');
        setSnackbarOpen(true);
        setAddingFriend(false);
      }
    } catch (error) {
      setSnackbarMessage('Failed to add friend');
      setSnackbarOpen(true);
    }
  };

  // Create a new game
  const handleCreateGame = async () => {
    // Validate player count
    if (selectedPlayers.length === 0) {
      setError('Please select at least one player');
      return;
    }

    setCreatingGame(true);
    setError(null);

    try {
      // Create the game
      const game = await createGame(gameType);
      if (!game) {
        throw new Error('Failed to create game');
      }

      // Prepare player list with the current user as first player
      let playersList: Array<{
        playerId: string;
        playerType: 'user' | 'friend';
        startingScore: number;
        order: number;
      }> = [
        { 
          playerId: user!.id, 
          playerType: 'user', 
          startingScore: parseInt(gameType), 
          order: 1 
        }
      ];

      // Add selected friends
      const friendPlayers = selectedPlayers.map((friendId, index) => ({
        playerId: friendId,
        playerType: 'friend' as const,
        startingScore: parseInt(gameType),
        order: index + 2  // +2 because the user is order 1
      }));

      playersList = [...playersList, ...friendPlayers];

      // Shuffle player order if requested
      if (shufflePlayers) {
        playersList = playersList.sort(() => 0.5 - Math.random());
        
        // Re-assign order based on shuffled array
        playersList = playersList.map((player, index) => ({
          ...player,
          order: index + 1
        }));
      }

      // Add players to the game
      await addPlayersToGame(game.id, playersList);

      // Navigate to the created game
      navigate(`/game/${game.id}`);
    } catch (error) {
      setError('Failed to create game. Please try again.');
      setCreatingGame(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4, pb: 10 }}>
      <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        Game Setup
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Game Type Selection */}
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Game Type
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup 
                row 
                value={gameType} 
                onChange={(e) => setGameType(e.target.value)}
              >
                <FormControlLabel value="301" control={<Radio />} label="301" />
                <FormControlLabel value="501" control={<Radio />} label="501" />
                <FormControlLabel value="701" control={<Radio />} label="701" />
              </RadioGroup>
            </FormControl>
          </CardContent>
        </MotionCard>

        {/* Player Selection */}
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Select Players
              </Typography>
              <Button 
                startIcon={<AddIcon />} 
                size="small" 
                onClick={handleAddFriendToggle}
              >
                Add Friend
              </Button>
            </Box>

            {/* Current User */}
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar src={user?.user_metadata?.avatar_url}>
                    {!user?.user_metadata?.avatar_url && <PersonIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={user?.user_metadata?.name || 'You'} 
                  secondary="You (always included)"
                />
                <Checkbox checked disabled />
              </ListItem>
              
              <Divider component="li" />

              {/* Friends */}
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : friends.length > 0 ? (
                friends.map((friend) => (
                  <ListItem key={friend.id}>
                    <ListItemAvatar>
                      <Avatar src={friend.avatar_url}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={friend.name} />
                    <Checkbox 
                      checked={selectedPlayers.includes(friend.id)} 
                      onChange={() => handlePlayerToggle(friend.id)} 
                    />
                  </ListItem>
                ))
              ) : (
                <Box sx={{ py: 2, opacity: 1 }}>
                  <ListItem>
                    <ListItemText 
                      primary="No friends added yet"
                      secondary="Add some friends to play with"
                      primaryTypographyProps={{
                        align: 'center',
                        variant: 'body1',
                        color: 'text.secondary',
                      }}
                      secondaryTypographyProps={{
                        align: 'center',
                        variant: 'body2',
                      }}
                    />
                  </ListItem>
                </Box>
              )}
            </List>
          </CardContent>
        </MotionCard>

        {/* Game Options */}
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Game Options
            </Typography>
            <FormControlLabel 
              control={
                <Checkbox 
                  checked={shufflePlayers} 
                  onChange={() => setShufflePlayers(!shufflePlayers)} 
                  icon={<ShuffleIcon color="action" />}
                  checkedIcon={<ShuffleIcon color="primary" />}
                />
              } 
              label="Randomize player order" 
            />
          </CardContent>
        </MotionCard>

        {/* Start Game Button */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleCreateGame}
          disabled={creatingGame || selectedPlayers.length === 0}
          startIcon={creatingGame ? <CircularProgress size={20} color="inherit" /> : <SportsIcon />}
          sx={{ py: 1.5, mt: 2 }}
        >
          {creatingGame ? 'Creating Game...' : 'Start Game'}
        </Button>
      </Stack>

      {/* Add Friend Dialog */}
      <Dialog open={addingFriend} onClose={handleAddFriendToggle}>
        <DialogTitle>Add Friend</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Friend's Name"
            fullWidth
            variant="outlined"
            value={newFriendName}
            onChange={(e) => setNewFriendName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddFriendToggle}>Cancel</Button>
          <Button onClick={handleAddFriend} color="primary">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default GameSetup; 