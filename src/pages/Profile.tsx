import { Box, Container, Typography, Button, Avatar, Divider, List, ListItem, ListItemText, Switch, Card, CardContent } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import LogoutIcon from '@mui/icons-material/Logout';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleTheme, isSoundEnabled, toggleSound, isHapticEnabled, toggleHaptic } = useUI();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4, pb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Profile
        </Typography>

        <Card sx={{ mt: 2, borderRadius: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
            src={user?.user_metadata?.avatar_url}
            imgProps={{ referrerPolicy: "no-referrer" }}
              alt={user?.user_metadata?.name || 'User'}
              sx={{ width: 60, height: 60, mr: 2 }}
            />
            <Box>
              <Typography variant="h6">{user?.user_metadata?.name?.split(' ')[0] || 'User'}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Settings
        </Typography>
        
        <Card sx={{ borderRadius: 2 }}>
          <List disablePadding>
            <ListItem>
              <ListItemText primary="Dark Mode" secondary="Enable dark theme" />
              <Switch checked={isDarkMode} onChange={toggleTheme} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="Sound Effects" secondary="Enable audio feedback" />
              <Switch checked={isSoundEnabled} onChange={toggleSound} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="Haptic Feedback" secondary="Enable vibration" />
              <Switch checked={isHapticEnabled} onChange={toggleHaptic} />
            </ListItem>
          </List>
        </Card>
      </Box>

      <Button
        variant="outlined"
        color="primary"
        startIcon={<LogoutIcon />}
        onClick={handleSignOut}
        fullWidth
        sx={{ mt: 4 }}
      >
        Sign Out
      </Button>
    </Container>
  );
};

export default Profile; 