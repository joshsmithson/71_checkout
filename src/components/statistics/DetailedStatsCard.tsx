import { Card, CardContent, Typography, Divider, Grid } from '@mui/material';

interface StatItem {
  label: string;
  value: string | number;
}

interface DetailedStatsCardProps {
  title: string;
  stats: StatItem[];
}

const DetailedStatsCard = ({ title, stats }: DetailedStatsCardProps) => {
  return (
    <Card sx={{ mb: 4, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          {stats.map((stat, index) => (
            <Grid item xs={6} key={index}>
              <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
              <Typography variant="body1" fontWeight="medium">{stat.value}</Typography>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default DetailedStatsCard; 