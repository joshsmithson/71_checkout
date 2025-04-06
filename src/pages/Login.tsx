import { Box, Button, Container, Typography, Paper, Link, CircularProgress, Alert, Snackbar } from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import SportsBar from '@mui/icons-material/SportsBar';
import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';

const MotionBox = motion(Box);

const Login = () => {
  const { signIn, loading, isSigningIn, user } = useAuth();
  const [showDebug, setShowDebug] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for error message in URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [location]);

  // If user is already logged in, redirect to home
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return; // Prevent multiple clicks
    
    setErrorMessage(null);
    try {
      await signIn();
    } catch (error) {
      console.error('Failed to sign in:', error);
      setErrorMessage('Failed to start sign-in process. Please try again.');
    }
  };

  // Toggle debug mode after clicking the icon
  const handleIconClick = () => {
    setShowDebug(true);
  };

  // Close error message
  const handleCloseError = () => {
    setErrorMessage(null);
  };

  return (
    <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{ width: '100%' }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <MotionBox
            whileHover={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5 }}
            sx={{ mb: 3 }}
            onClick={handleIconClick}
          >
            <SportsBar color="primary" sx={{ fontSize: 64 }} />
          </MotionBox>
          
          <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight="bold">
            Dart Counter
          </Typography>
          
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Track scores, get checkout suggestions, and maintain statistics for your dart games.
          </Typography>
          
          <Button
            variant="contained"
            startIcon={isSigningIn ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
            onClick={handleGoogleSignIn}
            disabled={loading || isSigningIn}
            fullWidth
            size="large"
            sx={{ borderRadius: 28, py: 1.5 }}
          >
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </Button>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 3 }}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Typography>

          {errorMessage && (
            <Alert severity="error" sx={{ mt: 3, width: '100%' }} onClose={handleCloseError}>
              {errorMessage}
            </Alert>
          )}

          {showDebug && (
            <Box mt={4} width="100%" textAlign="center">
              <Divider sx={{ my: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Debugging Tools
                </Typography>
              </Divider>
              <Box display="flex" justifyContent="center" gap={2} mt={2}>
                <Button 
                  variant="outlined" 
                  size="small"
                  component={RouterLink}
                  to="/auth/debug"
                >
                  Auth Debug
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  component={RouterLink}
                  to="/auth/rls-debug"
                >
                  RLS Debug
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </MotionBox>
      
      <Snackbar 
        open={!!errorMessage} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={handleCloseError}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Divider component for debugging section
const Divider = ({ children, ...props }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      ...props.sx
    }}
  >
    <Box sx={{ flexGrow: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }} />
    <Box sx={{ px: 2 }}>{children}</Box>
    <Box sx={{ flexGrow: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }} />
  </Box>
);

export default Login; 