import { useState, useEffect, Component, ErrorInfo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, Typography, Button } from '@mui/material';
import { AnimatePresence } from 'framer-motion';

// Debug initialization - immediately execute
console.log('[App] Initial load started');
try {
  // Check for environment variables early
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'defined' : 'undefined',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'defined' : 'undefined',
    location: typeof window !== 'undefined' ? window.location.href : 'SSR'
  };
  console.log('[App] Environment check:', envCheck);
  
  // Check if document is defined (this should always work in a browser)
  if (typeof document !== 'undefined') {
    console.log('[App] Document is defined, DOM is available');
    
    // Add a global error handler for debugging
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[App] Unhandled Promise Rejection:', event.reason);
    });
  }
} catch (error) {
  console.error('[App] Error during initialization:', error);
}

// Contexts
import { AuthProvider } from '@/contexts/AuthContext';
import { UIProvider } from '@/contexts/UIContext';

// Components
import BottomNavigation from '@/components/layout/BottomNavigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AuthCallback from '@/components/auth/AuthCallback';
import AuthDebug from '@/components/auth/AuthDebug';
import RLSDebug from '@/components/auth/RLSDebug';

// Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import GameSetup from '@/pages/GameSetup';
import ActiveGame from '@/pages/ActiveGame';
import Statistics from '@/pages/Statistics';
import Profile from '@/pages/Profile';
import Leaderboard from '@/pages/Leaderboard';
import NotFound from '@/pages/NotFound';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E53935',
    },
    secondary: {
      main: '#1E88E5',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    success: {
      main: '#43A047',
    },
    warning: {
      main: '#FFB300',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          textTransform: 'none',
          minHeight: 48,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
        },
      },
    },
  },
});

// Error boundary component to catch runtime errors
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Log to debug display if available
    if (window.debugLog) {
      window.debugLog(`Error caught: ${error.message}`);
    }
    
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box 
          sx={{ 
            p: 3, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            bgcolor: '#121212',
            color: 'white'
          }}
        >
          <Typography variant="h4" gutterBottom color="error">
            Something went wrong
          </Typography>
          <Typography variant="body1" paragraph sx={{ maxWidth: 600, textAlign: 'center', mb: 3 }}>
            The application has encountered an error. Please try refreshing the page.
          </Typography>
          <Box sx={{ bgcolor: '#1e1e1e', p: 2, borderRadius: 1, mb: 3, width: '100%', maxWidth: 600, overflowX: 'auto' }}>
            <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error?.toString() || 'Unknown error'}
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

function App() {
  const location = useLocation();
  const [showNav, setShowNav] = useState(true);
  
  useEffect(() => {
    // Hide navigation on login page and auth callback
    if (location.pathname === '/login' || location.pathname === '/auth/callback') {
      setShowNav(false);
    } else {
      setShowNav(true);
    }
  }, [location]);
  
  // Log app initialization
  useEffect(() => {
    if (window.debugLog) {
      window.debugLog(`App initialized. Path: ${location.pathname}`);
    }
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <AuthProvider>
          <UIProvider>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/debug" element={<AuthDebug />} />
                <Route path="/auth/rls-debug" element={<RLSDebug />} />
                
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/game/new" element={<ProtectedRoute><GameSetup /></ProtectedRoute>} />
                <Route path="/game/:id" element={<ProtectedRoute><ActiveGame /></ProtectedRoute>} />
                <Route path="/stats" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
            
            {showNav && <BottomNavigation />}
          </UIProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App; 