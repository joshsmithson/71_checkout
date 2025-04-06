import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { supabase } from '@/utils/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Supabase will automatically exchange the code for a session
    // We just need to wait for it to complete and check the session
    const checkSession = async () => {
      try {
        // Wait a moment to allow Supabase to process the URL parameters
        setTimeout(async () => {
          // Check if we have a session
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session check error:', error);
            navigate('/login?error=Session check failed');
            return;
          }
          
          if (data?.session) {
            // Success! We have a session, go to home
            navigate('/');
          } else {
            // No session found, go back to login
            console.error('No session established after OAuth flow');
            navigate('/login?error=Authentication failed');
          }
        }, 2000); // Give it 2 seconds to process
      } catch (err) {
        console.error('Error in auth callback:', err);
        navigate('/login?error=Authentication error');
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress color="primary" />
      <Typography variant="body1" color="text.secondary">
        Completing authentication...
      </Typography>
    </Box>
  );
};

export default AuthCallback; 