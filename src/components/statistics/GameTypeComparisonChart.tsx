import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, Typography, Divider, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface GameTypeData {
  gameType: string;
  averagePerDart: number;
  winPercentage: number;
  highestTurn: number;
  checkoutPercentage: number;
}

interface FormattedData {
  metric: string;
  [gameType: string]: string | number;
}

interface GameTypeComparisonChartProps {
  data: GameTypeData[];
  title?: string;
}

const GameTypeComparisonChart: React.FC<GameTypeComparisonChartProps> = ({ 
  data,
  title = 'Game Type Comparison'
}) => {
  const theme = useTheme();

  // Transform data for radar chart format
  const transformedData: FormattedData[] = [
    { 
      metric: 'Avg/Dart', 
      ...Object.fromEntries(data.map(item => [item.gameType, item.averagePerDart]))
    },
    { 
      metric: 'Win %', 
      ...Object.fromEntries(data.map(item => [item.gameType, item.winPercentage]))
    },
    { 
      metric: 'Highest Turn', 
      ...Object.fromEntries(data.map(item => [item.gameType, item.highestTurn]))
    },
    { 
      metric: 'Checkout %', 
      ...Object.fromEntries(data.map(item => [item.gameType, item.checkoutPercentage]))
    }
  ];

  // Generate colors for game types
  const gameTypeColors = {
    '301': theme.palette.primary.main,
    '501': theme.palette.secondary.main,
    '701': theme.palette.error.main
  };

  return (
    <Card sx={{ mb: 4, borderRadius: 2, height: 460 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ height: 380 }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart 
                cx="50%" 
                cy="50%" 
                outerRadius="75%" 
                data={transformedData}
              >
                <PolarGrid stroke={theme.palette.divider} />
                <PolarAngleAxis 
                  dataKey="metric"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 'auto']}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                />
                
                {data.map((item) => (
                  <Radar
                    key={item.gameType}
                    name={`${item.gameType}`}
                    dataKey={item.gameType}
                    stroke={gameTypeColors[item.gameType as keyof typeof gameTypeColors] || theme.palette.grey[500]}
                    fill={gameTypeColors[item.gameType as keyof typeof gameTypeColors] || theme.palette.grey[500]}
                    fillOpacity={0.3}
                  />
                ))}
                
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme.palette.background.paper,
                    borderColor: theme.palette.divider,
                    borderRadius: 8
                  }}
                  formatter={(value) => [
                    typeof value === 'number' ? (
                      value.toFixed(1) + (value && ['Win %', 'Checkout %'].includes(String(name)) ? '%' : '')
                    ) : value,
                    ''
                  ]}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center'
            }}>
              <Typography variant="body2" color="text.secondary">
                Not enough data to compare game types.
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default GameTypeComparisonChart; 