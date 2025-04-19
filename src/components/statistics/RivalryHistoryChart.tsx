import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Card, CardContent, Typography, Divider, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface GameResult {
  id: string;
  type: string;
  completed_at: string;
  winner: 'player1' | 'player2' | null;
}

interface RivalryHistoryChartProps {
  recentGames: GameResult[];
  player1Name: string;
  player2Name: string;
  title?: string;
}

const RivalryHistoryChart: React.FC<RivalryHistoryChartProps> = ({ 
  recentGames,
  player1Name,
  player2Name,
  title = 'Recent Matches'
}) => {
  const theme = useTheme();

  // Transform data for chart format
  const chartData = recentGames.map((game) => {
    // Value will be positive for player1 wins, negative for player2 wins
    const value = game.winner === 'player1' ? 1 : game.winner === 'player2' ? -1 : 0;
    return {
      id: game.id,
      type: game.type,
      date: new Date(game.completed_at).toLocaleDateString(),
      value,
      winner: game.winner
    };
  }).reverse(); // Show oldest to newest

  return (
    <Card sx={{ mb: 4, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ height: 240, width: '100%' }}>
          {recentGames.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: theme.palette.text.secondary }}
                  tickLine={{ stroke: theme.palette.divider }}
                  height={40}
                />
                <YAxis 
                  tick={false}
                  tickLine={false}
                  axisLine={false}
                  domain={[-1, 1]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme.palette.background.paper,
                    borderColor: theme.palette.divider,
                    borderRadius: 8
                  }}
                  formatter={(value, name, props) => {
                    const isPositive = Number(value) > 0;
                    return [
                      isPositive ? player1Name : player2Name,
                      `Winner (${props.payload.type})`
                    ];
                  }}
                  labelFormatter={(value) => `Game on ${value}`}
                />
                <ReferenceLine y={0} stroke={theme.palette.divider} />
                <Bar 
                  dataKey="value" 
                  name="Winner"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.value > 0 ? theme.palette.primary.main : theme.palette.secondary.main}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center'
            }}>
              <Typography variant="body2" color="text.secondary">
                No recent matches between these players.
              </Typography>
            </Box>
          )}
        </Box>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 12, 
              height: 12, 
              bgcolor: theme.palette.primary.main, 
              mr: 1,
              borderRadius: '50%'
            }} />
            <Typography variant="caption">{player1Name}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 12, 
              height: 12, 
              bgcolor: theme.palette.secondary.main, 
              mr: 1,
              borderRadius: '50%'
            }} />
            <Typography variant="caption">{player2Name}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RivalryHistoryChart; 