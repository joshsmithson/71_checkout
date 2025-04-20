import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface CheckoutSuccessData {
  scoreRange: string;
  attempts: number;
  successes: number;
}

interface CheckoutSuccessChartProps {
  data: CheckoutSuccessData[];
}

export const CheckoutSuccessChart: React.FC<CheckoutSuccessChartProps> = ({ data }) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      ...item,
      successRate: item.attempts > 0 ? (item.successes / item.attempts) * 100 : 0
    }));
  }, [data]);

  const totalAttempts = useMemo(() => 
    data?.reduce((sum, item) => sum + item.attempts, 0) || 0,
  [data]);

  const totalSuccesses = useMemo(() => 
    data?.reduce((sum, item) => sum + item.successes, 0) || 0,
  [data]);

  const overallSuccessRate = useMemo(() => 
    totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0,
  [totalAttempts, totalSuccesses]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Checkout Success Rates
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Not enough data to display checkout statistics.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Checkout Success Rates
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Success rates by score range ({totalAttempts} total attempts)
        </Typography>
        
        <Box sx={{ height: 300, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scoreRange" />
              <YAxis yAxisId="left" orientation="left" label={{ value: 'Attempts', angle: -90, position: 'insideLeft' }} />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 100]} 
                label={{ value: 'Success Rate (%)', angle: 90, position: 'insideRight' }} 
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'Success Rate') return `${value.toFixed(1)}%`;
                  return value;
                }}
                labelFormatter={(label) => `Score Range: ${label}`}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="attempts" 
                name="Attempts" 
                fill={theme.palette.primary.light} 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right"
                dataKey="successRate" 
                name="Success Rate" 
                fill={theme.palette.secondary.main} 
                radius={[4, 4, 0, 0]}
              />
              <ReferenceLine 
                yAxisId="right" 
                y={overallSuccessRate} 
                stroke={theme.palette.error.main} 
                strokeDasharray="3 3"
                label={{ 
                  value: `Avg: ${overallSuccessRate.toFixed(1)}%`,
                  position: 'right',
                  fill: theme.palette.error.main
                }} 
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h6" color="primary">{totalAttempts}</Typography>
            <Typography variant="body2" color="textSecondary">Total Attempts</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h6" color="primary">{totalSuccesses}</Typography>
            <Typography variant="body2" color="textSecondary">Total Successes</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h6" color="secondary">{overallSuccessRate.toFixed(1)}%</Typography>
            <Typography variant="body2" color="textSecondary">Overall Success Rate</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}; 