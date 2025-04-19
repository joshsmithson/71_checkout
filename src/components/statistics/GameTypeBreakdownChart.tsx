import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, Typography, Divider, Box, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface GameTypeBreakdown {
  game_type: string;
  count: number;
  player1_wins: number;
  player2_wins: number;
}

interface GameTypeBreakdownChartProps {
  data: GameTypeBreakdown[];
  player1Name: string;
  player2Name: string;
  title?: string;
}

const GameTypeBreakdownChart: React.FC<GameTypeBreakdownChartProps> = ({ 
  data,
  player1Name,
  player2Name,
  title = 'Game Type Breakdown'
}) => {
  const theme = useTheme();

  // Calculate total games by type
  const gameTypeData = data.map(item => ({
    name: item.game_type,
    value: item.count,
    player1_wins: item.player1_wins,
    player2_wins: item.player2_wins
  }));

  // Calculate win distribution
  const winDistributionData = [
    { 
      name: player1Name, 
      value: data.reduce((sum, item) => sum + item.player1_wins, 0) 
    },
    { 
      name: player2Name, 
      value: data.reduce((sum, item) => sum + item.player2_wins, 0) 
    }
  ];

  // Custom colors for game types
  const gameTypeColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.error.main
  ];

  // Custom colors for players
  const playerColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main
  ];

  return (
    <Card sx={{ mb: 4, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          {/* Game Type Distribution */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" align="center" gutterBottom>
              Games by Type
            </Typography>
            <Box sx={{ height: 200 }}>
              {gameTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gameTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {gameTypeData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={gameTypeColors[index % gameTypeColors.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} games`, name]}
                      contentStyle={{ 
                        backgroundColor: theme.palette.background.paper,
                        borderColor: theme.palette.divider,
                        borderRadius: 8
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    No game type data available.
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
          
          {/* Win Distribution */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" align="center" gutterBottom>
              Win Distribution
            </Typography>
            <Box sx={{ height: 200 }}>
              {winDistributionData[0].value + winDistributionData[1].value > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {winDistributionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={playerColors[index % playerColors.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} wins`, name]}
                      contentStyle={{ 
                        backgroundColor: theme.palette.background.paper,
                        borderColor: theme.palette.divider,
                        borderRadius: 8
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    No win data available.
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
        
        {/* Game Type Breakdown Table */}
        {data.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Performance by Game Type
            </Typography>
            <Grid container sx={{ mt: 1 }}>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">Game</Typography>
              </Grid>
              <Grid item xs={3} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">Total</Typography>
              </Grid>
              <Grid item xs={3} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">{player1Name}</Typography>
              </Grid>
              <Grid item xs={3} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">{player2Name}</Typography>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 1 }} />
            
            {data.map((item, index) => (
              <Grid container key={index} sx={{ my: 0.5 }}>
                <Grid item xs={3}>
                  <Typography variant="body2">{item.game_type}</Typography>
                </Grid>
                <Grid item xs={3} sx={{ textAlign: 'center' }}>
                  <Typography variant="body2">{item.count}</Typography>
                </Grid>
                <Grid item xs={3} sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="body2" 
                    color={item.player1_wins > item.player2_wins ? 'primary' : 'text.primary'}
                  >
                    {item.player1_wins}
                  </Typography>
                </Grid>
                <Grid item xs={3} sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="body2" 
                    color={item.player2_wins > item.player1_wins ? 'secondary' : 'text.primary'}
                  >
                    {item.player2_wins}
                  </Typography>
                </Grid>
              </Grid>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default GameTypeBreakdownChart; 