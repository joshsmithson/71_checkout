import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, Typography, Divider, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface DataPoint {
  date: string;
  averagePerDart: number;
  winPercentage: number;
  highestTurn: number;
}

interface PerformanceTrendChartProps {
  data: DataPoint[];
  title?: string;
}

type MetricType = 'averagePerDart' | 'winPercentage' | 'highestTurn';

const metricLabels: Record<MetricType, string> = {
  averagePerDart: 'Avg. Per Dart',
  winPercentage: 'Win %',
  highestTurn: 'Highest Turn'
};

const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({ 
  data,
  title = 'Performance Trends'
}) => {
  const theme = useTheme();
  const [metric, setMetric] = useState<MetricType>('averagePerDart');

  const handleMetricChange = (_event: React.MouseEvent<HTMLElement>, newMetric: MetricType | null) => {
    if (newMetric !== null) {
      setMetric(newMetric);
    }
  };

  // Get min/max values for proper Y-axis scaling
  const values = data.map(d => d[metric] as number);
  const min = Math.floor(Math.max(0, Math.min(...values) * 0.9)); // 10% below min, but not below 0
  const max = Math.ceil(Math.max(...values) * 1.1); // 10% above max

  return (
    <Card sx={{ mb: 4, borderRadius: 2, height: 420 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          <ToggleButtonGroup
            value={metric}
            exclusive
            onChange={handleMetricChange}
            size="small"
            aria-label="performance metric"
          >
            <ToggleButton value="averagePerDart" aria-label="Average Per Dart">
              Avg/Dart
            </ToggleButton>
            <ToggleButton value="winPercentage" aria-label="Win Percentage">
              Win %
            </ToggleButton>
            <ToggleButton value="highestTurn" aria-label="Highest Turn">
              Best Turn
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ height: 300 }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: theme.palette.text.secondary }}
                  tickLine={{ stroke: theme.palette.divider }}
                />
                <YAxis 
                  domain={[min, max]}
                  tick={{ fill: theme.palette.text.secondary }}
                  tickLine={{ stroke: theme.palette.divider }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme.palette.background.paper,
                    borderColor: theme.palette.divider,
                    borderRadius: 8
                  }}
                  formatter={(value) => [
                    metric === 'winPercentage' ? `${value}%` : value,
                    metricLabels[metric]
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={metric}
                  name={metricLabels[metric]}
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={{ fill: theme.palette.primary.main, r: 4 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center'
            }}>
              <Typography variant="body2" color="text.secondary">
                Not enough data to show performance trends.
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PerformanceTrendChart; 