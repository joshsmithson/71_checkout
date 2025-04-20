import React from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';

interface GameTurnData {
  gameType: string;
  averageTurns: number;
  gamesPlayed: number;
}

interface AverageTurnsChartProps {
  data: GameTurnData[];
}

export const AverageTurnsChart: React.FC<AverageTurnsChartProps> = ({ data }) => {
  const theme = useTheme();
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Average Turns Per Game
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Not enough data to display turn statistics.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Sort data by average turns for better visualization
  const sortedData = [...data].sort((a, b) => a.averageTurns - b.averageTurns);
  const totalGames = data.reduce((sum, item) => sum + item.gamesPlayed, 0);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Average Turns Per Game
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Average turns needed to complete each game type ({totalGames} total games)
        </Typography>
        
        <Box sx={{ height: 300, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 'auto']} />
              <YAxis 
                dataKey="gameType" 
                type="category" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'Average Turns') return value.toFixed(1);
                  return value;
                }}
                labelFormatter={(label) => `Game Type: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="averageTurns" 
                name="Average Turns" 
                fill={theme.palette.primary.main} 
                radius={[0, 4, 4, 0]}
              >
                <LabelList 
                  dataKey="averageTurns" 
                  position="right" 
                  formatter={(value: number) => value.toFixed(1)} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2 }}>
          {sortedData.map((item) => (
            <Box key={item.gameType} sx={{ textAlign: 'center', minWidth: 100 }}>
              <Typography variant="h6" color="primary">{item.gamesPlayed}</Typography>
              <Typography variant="body2" color="textSecondary">{item.gameType} Games</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}; 