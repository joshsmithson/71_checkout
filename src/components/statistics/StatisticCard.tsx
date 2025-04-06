import { ReactNode } from 'react';
import { Grid, Paper, Box, Typography, useTheme } from '@mui/material';

interface StatisticCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  gridSize?: {
    xs: number;
    sm?: number;
    md?: number;
  };
}

const StatisticCard = ({ 
  title, 
  value, 
  icon, 
  gridSize = { xs: 6, sm: 3 } 
}: StatisticCardProps) => {
  const theme = useTheme();
  
  return (
    <Grid item xs={gridSize.xs} sm={gridSize.sm} md={gridSize.md}>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: 2,
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Box sx={{ color: theme.palette.primary.main, mb: 1 }}>
          {icon}
        </Box>
        <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Paper>
    </Grid>
  );
};

export default StatisticCard; 