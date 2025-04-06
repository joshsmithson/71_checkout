import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Paper, BottomNavigation as MuiBottomNavigation, BottomNavigationAction } from '@mui/material';
import { styled } from '@mui/material/styles';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonIcon from '@mui/icons-material/Person';

const StyledBottomNavigation = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  borderRadius: '12px 12px 0 0',
  overflow: 'hidden',
}));

const NavigationAction = styled(BottomNavigationAction)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&.Mui-selected': {
    color: theme.palette.primary.main,
  },
  minHeight: 56,
}));

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState(0);

  // Map the current path to the navigation value
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setValue(0);
    } else if (path === '/game/new') {
      setValue(1);
    } else if (path === '/stats' || path === '/leaderboard') {
      setValue(2);
    } else if (path === '/profile') {
      setValue(3);
    }
  }, [location]);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/game/new');
        break;
      case 2:
        navigate('/stats');
        break;
      case 3:
        navigate('/profile');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <StyledBottomNavigation elevation={3}>
      <MuiBottomNavigation
        value={value}
        onChange={handleChange}
        showLabels
      >
        <NavigationAction label="Home" icon={<HomeIcon />} />
        <NavigationAction label="New Game" icon={<AddIcon />} />
        <NavigationAction label="Stats" icon={<BarChartIcon />} />
        <NavigationAction label="Profile" icon={<PersonIcon />} />
      </MuiBottomNavigation>
    </StyledBottomNavigation>
  );
};

export default BottomNavigation; 