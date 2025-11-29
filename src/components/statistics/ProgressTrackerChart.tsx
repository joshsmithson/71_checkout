import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Divider, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTheme } from '@mui/material/styles';

interface ProgressData {
  date: string;
  averagePerDart: number;
  checkoutPercentage: number;
  winPercentage: number;
}

interface ProgressTrackerChartProps {
  data: ProgressData[];
}

const ProgressTrackerChart: React.FC<ProgressTrackerChartProps> = ({ data }) => {
  const theme = useTheme();
  const [metric, setMetric] = useState<'averagePerDart' | 'checkoutPercentage' | 'winPercentage'>('averagePerDart');

  if (!data || data.length === 0) {
    return (
      <Card sx={{ borderRadius: 2, mb: 4 }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Progress Tracker
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Not enough data to display progress tracking.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const formatData = (data: ProgressData[]) => {
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const metricConfig = {
    averagePerDart: {
      label: 'Average Per Dart',
      color: theme.palette.primary.main,
      formatter: (value: number) => `${value.toFixed(1)} points`
    },
    checkoutPercentage: {
      label: 'Checkout %',
      color: theme.palette.success.main,
      formatter: (value: number) => `${value.toFixed(1)}%`
    },
    winPercentage: {
      label: 'Win Rate',
      color: theme.palette.warning.main,
      formatter: (value: number) => `${value.toFixed(1)}%`
    }
  };

  const handleMetricChange = (_event: React.MouseEvent<HTMLElement>, newMetric: 'averagePerDart' | 'checkoutPercentage' | 'winPercentage') => {
    if (newMetric !== null) {
      setMetric(newMetric);
    }
  };

  const formattedData = formatData(data);
  const currentConfig = metricConfig[metric];

  return (
    <Card sx={{ borderRadius: 2, mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="h6" component="h2">
            Progress Tracker
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={metric}
            exclusive
            onChange={handleMetricChange}
            aria-label="Metric selection"
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none' } }}
          >
            <ToggleButton value="averagePerDart">Avg/Dart</ToggleButton>
            <ToggleButton value="checkoutPercentage">Checkout %</ToggleButton>
            <ToggleButton value="winPercentage">Win Rate</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Typography color="text.secondary" variant="body2" gutterBottom>
          {currentConfig.label} over time
        </Typography>
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ height: 300, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getFullYear().toString().substr(2, 2)}`;
                }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [currentConfig.formatter(value), currentConfig.label]}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                }}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke={currentConfig.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {data.length} data points over {Math.floor(data.length / 3)} months
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProgressTrackerChart; 