import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, useTheme, Grid, Tooltip, Paper } from '@mui/material';

interface ScoreHeatmapProps {
  data: { score: number; count: number }[];
}

export const ScoreHeatmap: React.FC<ScoreHeatmapProps> = ({ data }) => {
  const theme = useTheme();
  
  const heatmapData = useMemo(() => {
    if (!data || data.length === 0) return { segments: [], maxCount: 0, totalCount: 0 };
    
    // Calculate total scores and max count for intensity
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    const maxCount = Math.max(...data.map(item => item.count));
    
    // Function to get segment data for a single score
    const getSegmentData = (score: number) => {
      const item = data.find(d => d.score === score) || { score, count: 0 };
      return {
        score,
        count: item.count,
        percentage: totalCount > 0 ? (item.count / totalCount) * 100 : 0,
        intensity: maxCount > 0 ? item.count / maxCount : 0
      };
    };
    
    // Generate all possible segments
    const segments = [];
    
    // Singles (1-20)
    for (let i = 1; i <= 20; i++) {
      segments.push({
        ...getSegmentData(i),
        label: `S${i}`,
        type: 'single'
      });
    }
    
    // Doubles (2-40, even numbers)
    for (let i = 1; i <= 20; i++) {
      segments.push({
        ...getSegmentData(i * 2),
        label: `D${i}`,
        type: 'double'
      });
    }
    
    // Triples (3-60, multiples of 3)
    for (let i = 1; i <= 20; i++) {
      segments.push({
        ...getSegmentData(i * 3),
        label: `T${i}`,
        type: 'triple'
      });
    }
    
    // Bullseye (25 and 50)
    segments.push({
      ...getSegmentData(25),
      label: 'SB',
      type: 'bull'
    });
    
    segments.push({
      ...getSegmentData(50),
      label: 'DB',
      type: 'bull'
    });
    
    // Add zero score (miss)
    segments.push({
      ...getSegmentData(0),
      label: 'Miss',
      type: 'miss'
    });
    
    return { segments, maxCount, totalCount };
  }, [data]);
  
  // Function to determine segment color based on intensity
  const getSegmentColor = (intensity: number, type: string) => {
    if (intensity === 0) return theme.palette.grey[900];
    
    // Base colors for different segment types
    const baseColors = {
      single: theme.palette.primary.main,
      double: theme.palette.info.main,
      triple: theme.palette.error.main,
      bull: theme.palette.error.main,
      miss: theme.palette.grey[700]
    };
    
    const baseColor = baseColors[type as keyof typeof baseColors] || theme.palette.primary.main;
    
    // Lighten or darken based on intensity
    if (intensity < 0.3) {
      return type === 'miss' 
        ? theme.palette.grey[800]
        : theme.palette.action.disabled;
    } else if (intensity < 0.6) {
      return baseColor;
    } else {
      return type === 'triple' || type === 'bull'
        ? theme.palette.error.light
        : theme.palette.primary.light;
    }
  };
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Dart Score Frequency
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Not enough data to display score frequency.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Dart Score Frequency
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Frequency of dart scores ({heatmapData.totalCount} total darts)
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          {/* Singles Section */}
          <Typography variant="subtitle2" gutterBottom>
            Singles (1-20)
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {heatmapData.segments
              .filter(s => s.type === 'single')
              .map((segment) => (
                <Grid item key={segment.label} xs={1}>
                  <Tooltip 
                    title={`${segment.label}: ${segment.count} darts (${segment.percentage.toFixed(1)}%)`}
                    arrow
                    placement="top"
                  >
                    <Paper
                      sx={{
                        bgcolor: getSegmentColor(segment.intensity, segment.type),
                        color: segment.intensity > 0.3 ? 'white' : 'text.secondary',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        borderRadius: 1,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          zIndex: 1
                        }
                      }}
                    >
                      {segment.label}
                    </Paper>
                  </Tooltip>
                </Grid>
              ))}
          </Grid>
          
          {/* Doubles Section */}
          <Typography variant="subtitle2" gutterBottom>
            Doubles (2-40)
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {heatmapData.segments
              .filter(s => s.type === 'double')
              .map((segment) => (
                <Grid item key={segment.label} xs={1}>
                  <Tooltip 
                    title={`${segment.label}: ${segment.count} darts (${segment.percentage.toFixed(1)}%)`}
                    arrow
                    placement="top"
                  >
                    <Paper
                      sx={{
                        bgcolor: getSegmentColor(segment.intensity, segment.type),
                        color: segment.intensity > 0.3 ? 'white' : 'text.secondary',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        borderRadius: 1,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          zIndex: 1
                        }
                      }}
                    >
                      {segment.label}
                    </Paper>
                  </Tooltip>
                </Grid>
              ))}
          </Grid>
          
          {/* Triples Section */}
          <Typography variant="subtitle2" gutterBottom>
            Triples (3-60)
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {heatmapData.segments
              .filter(s => s.type === 'triple')
              .map((segment) => (
                <Grid item key={segment.label} xs={1}>
                  <Tooltip 
                    title={`${segment.label}: ${segment.count} darts (${segment.percentage.toFixed(1)}%)`}
                    arrow
                    placement="top"
                  >
                    <Paper
                      sx={{
                        bgcolor: getSegmentColor(segment.intensity, segment.type),
                        color: segment.intensity > 0.3 ? 'white' : 'text.secondary',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        borderRadius: 1,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          zIndex: 1
                        }
                      }}
                    >
                      {segment.label}
                    </Paper>
                  </Tooltip>
                </Grid>
              ))}
          </Grid>
          
          {/* Bullseye and Miss */}
          <Typography variant="subtitle2" gutterBottom>
            Bullseye & Miss
          </Typography>
          <Grid container spacing={1}>
            {heatmapData.segments
              .filter(s => s.type === 'bull' || s.type === 'miss')
              .map((segment) => (
                <Grid item key={segment.label} xs={2}>
                  <Tooltip 
                    title={`${segment.label}: ${segment.count} darts (${segment.percentage.toFixed(1)}%)`}
                    arrow
                    placement="top"
                  >
                    <Paper
                      sx={{
                        bgcolor: getSegmentColor(segment.intensity, segment.type),
                        color: segment.intensity > 0.3 ? 'white' : 'text.secondary',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        borderRadius: 1,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          zIndex: 1
                        }
                      }}
                    >
                      {segment.label}
                    </Paper>
                  </Tooltip>
                </Grid>
              ))}
          </Grid>
        </Box>
        
        {/* Stats Summary */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="textSecondary">
            Total Darts: {heatmapData.totalCount}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Most Frequent: {
              heatmapData.segments
                .sort((a, b) => b.count - a.count)
                .slice(0, 1)
                .map(s => `${s.label} (${s.count})`)
                .join(', ')
            }
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}; 