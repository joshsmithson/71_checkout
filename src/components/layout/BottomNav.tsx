import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const BottomNav = () => {
  const location = useLocation();
  const [value, setValue] = useState(0);
  
  const pathToIndexMap: { [key: string]: number } = {
    '/': 0,
    '/stats': 1,
    '/profile': 2
  };
  
  useEffect(() => {
    // Extract the base path (e.g., '/game/123' -> '/game')
    const exactPath = location.pathname;
    
    if (exactPath in pathToIndexMap) {
      setValue(pathToIndexMap[exactPath]);
    } else if (exactPath.startsWith('/game/')) {
      setValue(0); // Home tab when viewing a game
    } else {
      setValue(0); // Default to home
    }
  }, [location]);
  
  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, newValue) => {
          setValue(newValue);
        }}
      >
        <BottomNavigationAction label="Home" icon={<HomeIcon />} component={Link} to="/" />
        <BottomNavigationAction label="Stats" icon={<BarChartIcon />} component={Link} to="/stats" />
        <BottomNavigationAction label="Profile" icon={<AccountCircleIcon />} component={Link} to="/profile" />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav; 