import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
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

  // Custom label formatter for bars
  const renderBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (value === 0) return null;
    return (
      <text 
        x={x + width / 2} 
        y={y - 5} 
        fill={theme.palette.text.primary}
        textAnchor="middle" 
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="500"
      >
        {value}
      </text>
    );
  };

  // Custom label formatter for line (win percentage)
  const renderLineLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === 0) return null;
    return (
      <text 
        x={x} 
        y={y - 10} 
        fill={theme.palette.success.main}
        textAnchor="middle" 
        dominantBaseline="middle"
        fontSize="10"
        fontWeight="500"
      >
        {value.toFixed(0)}%
      </text>
    );
  };

  return (
    <Card sx={{ mb: 4, borderRadius: 2, height: 450 }}>
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          {title}
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ height: 330 }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
                  yAxisId="games"
                  tick={{ fill: theme.palette.text.secondary }}
                  tickLine={{ stroke: theme.palette.divider }}
                  label={{ value: 'Games', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="percentage"
                  orientation="right"
                  tick={{ fill: theme.palette.text.secondary }}
                  tickLine={{ stroke: theme.palette.divider }}
                  label={{ value: 'Win %', angle: 90, position: 'insideRight' }}
                  domain={[0, 100]}
                />
                <Tooltip content={customTooltip} />
                <Legend />
                <Bar
                  yAxisId="games"
                  dataKey="gamesPlayed"
                  name="Games Played"
                  fill={theme.palette.primary.light}
                  opacity={0.7}
                >
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar
                  yAxisId="games"
                  dataKey="gamesWon"
                  name="Games Won"
                  fill={theme.palette.primary.main}
                >
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Line
                  yAxisId="percentage"
                  type="monotone"
                  dataKey="winPercentage"
                  name="Win %"
                  stroke={theme.palette.success.main}
                  strokeWidth={3}
                  dot={{ fill: theme.palette.success.main, r: 4 }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList content={renderLineLabel} />
                </Line>
              </ComposedChart>
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