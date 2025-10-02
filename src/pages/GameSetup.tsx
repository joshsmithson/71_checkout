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
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon
} from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { ATW_GAME_CONFIGS, ATWGameType, isATWGameType } from '@/types/around-the-world';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import SportsIcon from '@mui/icons-material/Sports';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

const MotionCard = motion.create(Card);

const GameSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    getFriends, 
    createGame, 
    addPlayersToGame, 
    addFriend,
    deleteFriend,
    initializeATWProgress,
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
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [error, setError] = useState<string | null>(null);
  const [creatingGame, setCreatingGame] = useState(false);
  
  // Around the World specific state
  const [multiplierAdvances, setMultiplierAdvances] = useState(false);
  
  // Friend menu state
  const [friendMenuAnchor, setFriendMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [deletingFriend, setDeletingFriend] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<string | null>(null);

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
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      const newFriend = await addFriend(newFriendName.trim());
      if (newFriend) {
        setFriends(prev => [...prev, newFriend]);
        setNewFriendName('');
        setSnackbarMessage('Friend added successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setAddingFriend(false);
      }
    } catch (error) {
      setSnackbarMessage('Failed to add friend');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle friend menu
  const handleFriendMenuOpen = (event: React.MouseEvent<HTMLElement>, friendId: string) => {
    event.stopPropagation();
    setFriendMenuAnchor(event.currentTarget);
    setSelectedFriendId(friendId);
  };

  const handleFriendMenuClose = () => {
    setFriendMenuAnchor(null);
    setSelectedFriendId(null);
  };

  // Handle friend deletion
  const handleDeleteFriendClick = () => {
    setFriendToDelete(selectedFriendId); // Store the friend to delete separately
    setDeleteConfirmOpen(true);
    handleFriendMenuClose();
  };

  const handleDeleteFriendConfirm = async () => {
    if (!friendToDelete) {
      return;
    }

    setDeletingFriend(true);
    try {
      const result = await deleteFriend(friendToDelete);
      
      if (result && result.success) {
        // Remove friend from list
        setFriends(prev => prev.filter(friend => friend.id !== friendToDelete));
        // Remove from selected players if they were selected
        setSelectedPlayers(prev => prev.filter(id => id !== friendToDelete));
        setSnackbarMessage(`${result.friend_name} and all associated data deleted successfully`);
        setSnackbarSeverity('success');
      } else {
        setSnackbarMessage(result?.message || 'Failed to delete friend');
        setSnackbarSeverity('error');
      }
    } catch (error) {
      setSnackbarMessage('Failed to delete friend');
      setSnackbarSeverity('error');
    } finally {
      setDeletingFriend(false);
      setDeleteConfirmOpen(false);
      setFriendToDelete(null); // Clear the friend to delete
      setSnackbarOpen(true);
    }
  };

  const handleDeleteFriendCancel = () => {
    setDeleteConfirmOpen(false);
    setFriendToDelete(null); // Clear the friend to delete
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

      // Determine starting score based on game type
      const isATW = isATWGameType(gameType);
      const startingScore = isATW ? 1 : parseInt(gameType); // ATW starts at position 1, others use the score

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
          startingScore, 
          order: 1 
        }
      ];

      // Add selected friends
      const friendPlayers = selectedPlayers.map((friendId, index) => ({
        playerId: friendId,
        playerType: 'friend' as const,
        startingScore,
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

      // If this is an Around the World game, initialize progress tracking
      if (isATW) {
        const progressPlayers = playersList.map(p => ({ 
          playerId: p.playerId, 
          playerType: p.playerType 
        }));
        await initializeATWProgress(game.id, progressPlayers, gameType as ATWGameType, multiplierAdvances);
      }

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
            <FormControl component="fieldset" fullWidth>
              <RadioGroup 
                value={gameType} 
                onChange={(e) => setGameType(e.target.value)}
              >
                {/* Traditional scoring games */}
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                  Traditional Games
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <FormControlLabel value="301" control={<Radio />} label="301" />
                  <FormControlLabel value="501" control={<Radio />} label="501" />
                  <FormControlLabel value="701" control={<Radio />} label="701" />
                </Box>
                
                {/* Around the World games */}
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                  Around the World
                </Typography>
                {Object.entries(ATW_GAME_CONFIGS).map(([type, config]) => (
                  <FormControlLabel 
                    key={type}
                    value={type} 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {config.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {config.description}
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 1, alignItems: 'flex-start' }}
                  />
                ))}
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
                  <Avatar 
                    src={user?.user_metadata?.avatar_url}
                    imgProps={{ referrerPolicy: "no-referrer" }}
                  >
                    {!user?.user_metadata?.avatar_url && <PersonIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={user?.user_metadata?.name?.split(' ')[0] || 'You'} 
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
                      <Avatar 
                        src={friend.avatar_url}
                        imgProps={{ referrerPolicy: "no-referrer" }}
                      >
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={friend.name} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox 
                        checked={selectedPlayers.includes(friend.id)} 
                        onChange={() => handlePlayerToggle(friend.id)} 
                      />
                      <IconButton
                        size="small"
                        onClick={(event) => handleFriendMenuOpen(event, friend.id)}
                        sx={{ ml: 1 }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
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
            <Stack spacing={1}>
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
              
              {/* Around the World specific options */}
              {isATWGameType(gameType) && (
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={multiplierAdvances} 
                      onChange={() => setMultiplierAdvances(!multiplierAdvances)} 
                    />
                  } 
                  label={
                    <Box>
                      <Typography variant="body2">
                        Doubles/Triples advance extra spaces
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        If enabled, hitting a double advances 2 spaces, triple advances 3 spaces
                      </Typography>
                    </Box>
                  }
                />
              )}
            </Stack>
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
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Friend Options Menu */}
      <Menu
        anchorEl={friendMenuAnchor}
        open={Boolean(friendMenuAnchor)}
        onClose={handleFriendMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleDeleteFriendClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete Friend
        </MenuItem>
      </Menu>

      {/* Delete Friend Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteFriendCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Friend</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography variant="body1">
            Are you sure you want to delete{' '}
            <strong>
              {friends.find(f => f.id === friendToDelete)?.name}
            </strong>
            ?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will permanently delete:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              The friend's profile
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              All their game statistics
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              All their turn records
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              All rivalry data involving this friend
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteFriendCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteFriendConfirm} 
            color="error"
            variant="contained"
            disabled={deletingFriend}
            startIcon={deletingFriend ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deletingFriend ? 'Deleting...' : 'Delete Friend'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GameSetup; 