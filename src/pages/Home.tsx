import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  CardActionArea,
  Grid,
  Divider,
  CircularProgress,
  Stack,
  Chip,
  Badge,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

interface Game {
  id: string;
  type: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  completed_at: string | null;
  creator_id?: string;
  started_at?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`game-tabpanel-${index}`}
      aria-labelledby={`game-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getGames, deleteGame, loading } = useSupabase();
  const [games, setGames] = useState<Game[]>([]);
  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [completedGames, setCompletedGames] = useState<Game[]>([]);
  const [tabValue, setTabValue] = useState(0);
  
  // Game menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [confirmDeleteGame, setConfirmDeleteGame] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadGames = async () => {
    const gamesData = await getGames();
    if (gamesData) {
      setGames(gamesData.map(game => ({
        ...game,
        status: game.status as 'active' | 'paused' | 'completed'
      })));
      
      // Filter games by status
      setActiveGames(gamesData.filter(game => 
        game.status === 'active' || game.status === 'paused'
      ).map(game => ({
        ...game,
        status: game.status as 'active' | 'paused' | 'completed'
      })));
      
      setCompletedGames(gamesData.filter(game => 
        game.status === 'completed'
      ).map(game => ({
        ...game,
        status: game.status as 'active' | 'paused' | 'completed'
      })));
    }
  };

  useEffect(() => {
    loadGames();
    // Only run once on component mount and when user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleNewGame = () => {
    navigate('/game/new');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'paused':
        return 'warning';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };
  
  const handleGameMenuOpen = (event: React.MouseEvent<HTMLElement>, gameId: string) => {
    event.stopPropagation(); // Prevent card click from triggering
    setSelectedGameId(gameId);
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleGameMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleDeleteGameClick = () => {
    handleGameMenuClose();
    setConfirmDeleteGame(true);
  };
  
  const handleDeleteGame = async () => {
    if (!selectedGameId) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await deleteGame(selectedGameId);
      setConfirmDeleteGame(false);
      setSelectedGameId(null);
      // Reload games after deletion
      loadGames();
    } catch (error) {
      console.error('Error deleting game:', error);
      setDeleteError('Failed to delete game. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Find selected game details
  const selectedGame = games.find(game => game.id === selectedGameId);

  return (
    <Container maxWidth="sm" sx={{ pb: 8, pt: 2 }}>
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Welcome, {user?.user_metadata?.name?.split(' ')[0] || 'Player'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleNewGame}
          fullWidth
          sx={{ mb: 4, py: 1.5 }}
        >
          Start New Game
        </Button>

        <Box sx={{ mb: 4 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="fullWidth"
            sx={{ mb: 2 }}
          >
            <Tab 
              label={
                <Badge 
                  badgeContent={activeGames.length} 
                  color="primary"
                  sx={{ '& .MuiBadge-badge': { right: -15 } }}
                >
                  Active Games
                </Badge>
              } 
              id="game-tab-0"
            />
            <Tab 
              label={
                <Badge 
                  badgeContent={completedGames.length} 
                  color="success"
                  sx={{ '& .MuiBadge-badge': { right: -15 } }}
                >
                  Completed
                </Badge>
              }
              id="game-tab-1" 
            />
          </Tabs>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TabPanel value={tabValue} index={0}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : activeGames.length > 0 ? (
                  <Stack spacing={2}>
                    {activeGames.map((game) => (
                      <MotionCard 
                        key={game.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardActionArea onClick={() => navigate(`/game/${game.id}`)}>
                          <CardContent sx={{ position: 'relative', pr: 8 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="h6" fontWeight="medium">
                                  {game.type} Game
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(game.created_at)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={game.status.toUpperCase()}
                                  color={getStatusColor(game.status) as "success" | "warning" | "info"}
                                  size="small"
                                  sx={{ mr: 1 }}
                                />
                                <PlayArrowIcon color="primary" />
                              </Box>
                            </Box>
                            <IconButton
                              aria-label="game-options"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleGameMenuOpen(e, game.id);
                              }}
                              sx={{ 
                                position: 'absolute', 
                                top: '50%',
                                transform: 'translateY(-50%)',
                                right: 8,
                                zIndex: 10,
                                bgcolor: 'rgba(30, 30, 30, 0.8)',
                                '&:hover': { bgcolor: 'action.hover' }
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </CardContent>
                        </CardActionArea>
                      </MotionCard>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ opacity: 1 }}>
                    <Card sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                      <CardContent>
                        <Box sx={{ py: 2, textAlign: 'center' }}>
                          <Typography variant="body1" color="text.secondary" gutterBottom>
                            No active games
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Start a new game using the button above
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {completedGames.length > 0 ? (
                  <Stack spacing={2}>
                    {completedGames.map((game) => (
                      <Card 
                        key={game.id} 
                        sx={{ 
                          borderRadius: 2, 
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.02)'
                          }
                        }}
                        onClick={() => navigate(`/game/${game.id}`)}
                      >
                        <CardContent sx={{ position: 'relative', pr: 8 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {game.type} Game
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(game.created_at)}
                              </Typography>
                            </Box>
                            <Chip 
                              icon={<EmojiEventsIcon fontSize="small" />}
                              label="COMPLETED"
                              color="success"
                              size="small"
                            />
                          </Box>
                          <IconButton
                            aria-label="game-options"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleGameMenuOpen(e, game.id);
                            }}
                            sx={{ 
                              position: 'absolute', 
                              top: '50%',
                              transform: 'translateY(-50%)',
                              right: 8,
                              zIndex: 10,
                              bgcolor: 'rgba(30, 30, 30, 0.8)',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Card sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                    <CardContent>
                      <Typography align="center" color="text.secondary">
                        No completed games
                      </Typography>
                      <Typography align="center" variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Complete a game to see it here
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </TabPanel>
            </>
          )}
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Quick Stats
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Games Played
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold" className="scores">
                    {completedGames.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Active Games
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold" className="scores">
                    {activeGames.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </MotionBox>
      
      {/* Game Options Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleGameMenuClose}
      >
        <MenuItem onClick={() => {
          handleGameMenuClose();
          if (selectedGameId) {
            navigate(`/game/${selectedGameId}`);
          }
        }}>
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          View Game
        </MenuItem>
        <MenuItem 
          onClick={handleDeleteGameClick}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete Game
        </MenuItem>
      </Menu>
      
      {/* Delete Game Confirmation Dialog */}
      <Dialog
        open={confirmDeleteGame}
        onClose={() => !isDeleting && setConfirmDeleteGame(false)}
      >
        <DialogTitle>Delete Game?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {selectedGame?.type} game? This action cannot be undone.
          </Typography>
          {selectedGame?.status === 'completed' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This is a completed game. Deleting it will remove it from your game history and may affect your statistics.
            </Alert>
          )}
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDeleteGame(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleDeleteGame}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete Game'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Home;