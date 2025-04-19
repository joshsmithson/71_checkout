import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PeopleIcon from '@mui/icons-material/People';

const BottomNav = () => {
  const location = useLocation();
  const [value, setValue] = useState(0);
  
  const pathToIndexMap: { [key: string]: number } = {
    '/': 0,
    '/game/new': 1,
    '/stats': 2,
    '/leaderboard': 3,
    '/rivals': 4,
    '/profile': 5
  };
  
  useEffect(() => {
    // Extract the base path (e.g., '/game/123' -> '/game')
    const path = location.pathname.split('/').slice(0, 2).join('/');
    const exactPath = location.pathname;
    
    if (exactPath in pathToIndexMap) {
      setValue(pathToIndexMap[exactPath]);
    } else if (exactPath.startsWith('/game/')) {
      setValue(1); // Game tab
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
        <BottomNavigationAction label="Play" icon={<SportsCricketIcon />} component={Link} to="/game/new" />
        <BottomNavigationAction label="Stats" icon={<BarChartIcon />} component={Link} to="/stats" />
        <BottomNavigationAction label="Leaders" icon={<LeaderboardIcon />} component={Link} to="/leaderboard" />
        <BottomNavigationAction label="Rivals" icon={<PeopleIcon />} component={Link} to="/rivals" />
        <BottomNavigationAction label="Profile" icon={<AccountCircleIcon />} component={Link} to="/profile" />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav; 