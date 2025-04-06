import { Card, CardContent, Typography, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

interface GameTypeData {
  game_type: string;
  games_played: number;
  games_won: number;
  win_percentage: number;
  average_per_dart: number;
  highest_turn: number;
}

interface GameTypeStatsProps {
  gameTypeStats: GameTypeData[];
}

const GameTypeStats = ({ gameTypeStats }: GameTypeStatsProps) => {
  if (gameTypeStats.length === 0) {
    return null;
  }
  
  return (
    <Card sx={{ mb: 4, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Stats by Game Type
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Game Type</TableCell>
                <TableCell align="right">Games</TableCell>
                <TableCell align="right">Wins</TableCell>
                <TableCell align="right">Win %</TableCell>
                <TableCell align="right">Avg/Dart</TableCell>
                <TableCell align="right">Highest</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gameTypeStats.map((row) => (
                <TableRow key={row.game_type}>
                  <TableCell component="th" scope="row">
                    {row.game_type}
                  </TableCell>
                  <TableCell align="right">{row.games_played}</TableCell>
                  <TableCell align="right">{row.games_won}</TableCell>
                  <TableCell align="right">{row.win_percentage.toFixed(1)}%</TableCell>
                  <TableCell align="right">{row.average_per_dart.toFixed(1)}</TableCell>
                  <TableCell align="right">{row.highest_turn}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default GameTypeStats; 