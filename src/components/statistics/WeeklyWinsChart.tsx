import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, Typography, Divider, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface WeeklyDataPoint {
  date: string;
  gamesPlayed: number;
  gamesWon: number;
  winPercentage: number;
  count180: number;
}

interface WeeklyWinsChartProps {
  data: WeeklyDataPoint[];
  title?: string;
}

const WeeklyWinsChart: React.FC<WeeklyWinsChartProps> = ({ 
  data,
  title = 'Weekly Performance'
}) => {
  const theme = useTheme();

  // Custom tooltip formatter
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 8,
          padding: '12px',
          boxShadow: theme.shadows[2]
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Week of {label}
          </Typography>
          <Typography variant="body2" color="primary">
            Games Won: {data.gamesWon}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Games Played: {data.gamesPlayed}
          </Typography>
          <Typography variant="body2" color="success.main">
            Win Rate: {data.winPercentage.toFixed(1)}%
          </Typography>
          <Typography variant="body2" color="warning.main">
            180s: {data.count180}
          </Typography>
        </div>
      );
    }
    return null;
  };

  return (
    <Card sx={{ mb: 4, borderRadius: 2, height: 420 }}>
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          {title}
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ height: 300 }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  tickLine={{ stroke: theme.palette.divider }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fill: theme.palette.text.secondary }}
                  tickLine={{ stroke: theme.palette.divider }}
                />
                <Tooltip content={customTooltip} />
                <Legend />
                <Bar
                  dataKey="gamesPlayed"
                  name="Games Played"
                  fill={theme.palette.primary.light}
                  opacity={0.7}
                />
                <Bar
                  dataKey="gamesWon"
                  name="Games Won"
                  fill={theme.palette.primary.main}
                />
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
                No weekly data available yet. Play more games to see trends!
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WeeklyWinsChart; 