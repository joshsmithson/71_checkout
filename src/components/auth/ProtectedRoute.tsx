import { ReactNode, useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        attemptsRef.current += 1;
        
        // Check directly through Supabase to avoid any context staleness
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setCheckError(`Authentication check failed: ${error.message}`);
          setIsAuthenticated(false);
        } else if (data?.session) {
          setIsAuthenticated(true);
          setCheckError(null);
        } else {
          // If context has user but Supabase doesn't have a session, context might be stale
          setIsAuthenticated(false);
          setCheckError("No active session found");
        }
      } catch (error) {
        setIsAuthenticated(false);
        setCheckError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsChecking(false);
      }
    };
    
    // If we have a session already in the context, use that
    if (session) {
      setIsAuthenticated(true);
      setIsChecking(false);
      return;
    }
    
    // Otherwise check directly with Supabase
    if (!loading) {
      checkAuth();
    }
  }, [loading, user, session]);

  // Show detailed loading state
  if (loading || isChecking) {
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
        <Typography variant="body2" color="text.secondary">
          {loading ? "Loading authentication state..." : "Verifying session..."}
        </Typography>
        {checkError && (
          <Typography variant="caption" color="error" maxWidth="80%" textAlign="center">
            {checkError}
          </Typography>
        )}
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 