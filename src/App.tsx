import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AnimatePresence } from 'framer-motion';

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

  return (
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
  );
}

export default App; 