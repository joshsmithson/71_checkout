import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, Typography, Divider, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface ScoreCount {
  score: number;
  count: number;
}

interface ScoreDistributionChartProps {
  data: ScoreCount[];
  title?: string;
}

type GroupingType = 'detailed' | 'grouped';

const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({ 
  data,
  title = 'Score Distribution'
}) => {
  const theme = useTheme();
  const [grouping, setGrouping] = useState<GroupingType>('grouped');

  const handleGroupingChange = (_event: React.MouseEvent<HTMLElement>, newGrouping: GroupingType | null) => {
    if (newGrouping !== null) {
      setGrouping(newGrouping);
    }
  };

  // Process data for grouped view
  const groupedData = React.useMemo(() => {
    if (grouping === 'detailed') {
      return data;
    }

    const groups: { [key: string]: number } = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
      '101-120': 0,
      '121-140': 0,
      '141-160': 0,
      '161-180': 0
    };

    data.forEach(item => {
      if (item.score <= 20) groups['0-20'] += item.count;
      else if (item.score <= 40) groups['21-40'] += item.count;
      else if (item.score <= 60) groups['41-60'] += item.count;
      else if (item.score <= 80) groups['61-80'] += item.count;
      else if (item.score <= 100) groups['81-100'] += item.count;
      else if (item.score <= 120) groups['101-120'] += item.count;
      else if (item.score <= 140) groups['121-140'] += item.count;
      else if (item.score <= 160) groups['141-160'] += item.count;
      else groups['161-180'] += item.count;
    });

    return Object.entries(groups).map(([range, count]) => ({
      score: range,
      count
    }));
  }, [data, grouping]);

  return (
    <Card sx={{ mb: 4, borderRadius: 2, height: 440 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          <ToggleButtonGroup
            value={grouping}
            exclusive
            onChange={handleGroupingChange}
            size="small"
            aria-label="score grouping"
          >
            <ToggleButton value="grouped" aria-label="Score Ranges">
              Ranges
            </ToggleButton>
            <ToggleButton value="detailed" aria-label="Exact Scores">
              Detailed
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ height: 320, width: '100%' }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupedData}
                margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis 
                  dataKey="score" 
                  tick={{ fill: theme.palette.text.secondary }}
                  tickLine={{ stroke: theme.palette.divider }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  tick={{ fill: theme.palette.text.secondary }}
                  tickLine={{ stroke: theme.palette.divider }}
                  label={{ 
                    value: 'Frequency', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: theme.palette.text.secondary }
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme.palette.background.paper,
                    borderColor: theme.palette.divider,
                    borderRadius: 8
                  }}
                  formatter={(value) => [`${value} turns`, 'Frequency']}
                  labelFormatter={(value) => typeof value === 'number' ? `Score: ${value}` : value}
                />
                <Bar 
                  dataKey="count" 
                  name="Frequency"
                  fill={theme.palette.primary.main}
                  animationDuration={1000}
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
                Not enough data to show score distribution.
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ScoreDistributionChart; 