import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Divider } from '@mui/material';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const AuthDebug = () => {
  const { user, session, loading } = useAuth();
  const [localSession, setLocalSession] = useState<any>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkSessionFromSupabase = async () => {
      try {
        setCheckingSession(true);
        setErrorMsg(null);
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setErrorMsg(error.message);
        } else {
          setLocalSession(data.session);
          setLocalUser(data.session?.user || null);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Unknown error');
      } finally {
        setCheckingSession(false);
      }
    };
    
    checkSessionFromSupabase();
  }, []);

  const refreshSession = async () => {
    try {
      setCheckingSession(true);
      setErrorMsg(null);
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        setErrorMsg(error.message);
      } else {
        setLocalSession(data.session);
        setLocalUser(data.session?.user || null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unknown error');
    } finally {
      setCheckingSession(false);
    }
  };

  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>Auth Debug Information</Typography>
        
        {checkingSession && (
          <Box display="flex" alignItems="center" my={2}>
            <CircularProgress size={20} sx={{ mr: 2 }} />
            <Typography>Checking session...</Typography>
          </Box>
        )}
        
        {errorMsg && (
          <Typography color="error" variant="body1" sx={{ my: 2 }}>
            Error: {errorMsg}
          </Typography>
        )}
        
        <Button 
          variant="outlined" 
          onClick={refreshSession} 
          disabled={checkingSession}
          sx={{ mb: 2 }}
        >
          Refresh Session Info
        </Button>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6">From Auth Context</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
          {loading ? 'Loading...' : (
            `User: ${user ? 'Authenticated' : 'Not authenticated'}
            User ID: ${user?.id || 'None'}
            Email: ${user?.email || 'None'}
            Session: ${session ? 'Active' : 'None'}
            Provider: ${user?.app_metadata?.provider || 'None'}`
          )}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6">Direct from Supabase</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {`User: ${localUser ? 'Authenticated' : 'Not authenticated'}
          User ID: ${localUser?.id || 'None'}
          Email: ${localUser?.email || 'None'}
          Session: ${localSession ? 'Active' : 'None'}
          Provider: ${localUser?.app_metadata?.provider || 'None'}
          Session expires: ${localSession?.expires_at ? new Date(localSession.expires_at * 1000).toLocaleString() : 'N/A'}`}
        </Typography>
      </Paper>
    </Box>
  );
};

export default AuthDebug; 