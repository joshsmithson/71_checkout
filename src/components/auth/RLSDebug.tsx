import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  List, 
  ListItem, 
  ListItemText,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Define valid tables to check - must match the Database type definition
type ValidTable = 'games' | 'game_players' | 'turns' | 'statistics' | 'friends' | 'rivals' | 'profiles';
const VALID_TABLES: ValidTable[] = ['games', 'game_players', 'turns', 'statistics', 'friends', 'rivals', 'profiles'];

type TestResult = {
  name: string;
  status: 'success' | 'error' | 'info';
  error: string | null;
  details: string;
};

const RLSDebug = () => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Function to test Supabase RLS policies by querying tables
  const testRLS = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    
    const testResults: TestResult[] = [];
    
    try {
      // Test session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      testResults.push({
        name: "Check Auth Session",
        status: sessionData?.session ? "success" : "error",
        error: sessionError?.message || null,
        details: sessionData?.session ? 
          `User ID: ${sessionData.session.user.id}` : 
          "No session found"
      });
      
      // Skip profile check since we're not sure which table is used
      if (sessionData?.session) {
        testResults.push({
          name: "User Profile Check",
          status: "info",
          error: null,
          details: "User is authenticated with ID: " + sessionData.session.user.id
        });
      }
      
      // Try to list a few tables to check RLS
      for (const table of VALID_TABLES) {
        const { data, error: tableError } = await supabase
          .from(table)
          .select('count(*)')
          .limit(1);
          
        testResults.push({
          name: `Query ${table} table`,
          status: tableError ? "error" : "success",
          error: tableError?.message || null,
          details: !tableError ? 
            `Query succeeded` : 
            `Failed to query ${table}`
        });
      }
      
    } catch (e) {
      setError(`Error running tests: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setResults(testResults);
      setLoading(false);
    }
  };

  // Run the test on mount
  useEffect(() => {
    testRLS();
  }, []);

  return (
    <Box p={3} maxWidth="800px" mx="auto">
      <Typography variant="h4" gutterBottom>
        Supabase RLS Debug
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Authentication Status
        </Typography>
        
        {user ? (
          <Box>
            <Typography variant="body1">
              Authenticated as: {user.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              User ID: {user.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Session Expires: {session ? new Date(session.expires_at! * 1000).toLocaleString() : 'Unknown'}
            </Typography>
          </Box>
        ) : (
          <Typography color="error">
            Not authenticated
          </Typography>
        )}
        
        <Button 
          variant="contained" 
          sx={{ mt: 2 }} 
          onClick={testRLS}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Run RLS Tests"}
        </Button>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper elevation={2}>
        <List>
          <ListItem>
            <ListItemText 
              primary="Test Results" 
              secondary={`${results.length} tests run`}
            />
          </ListItem>
          <Divider />
          
          {results.map((result, index) => (
            <Box key={index}>
              <ListItem>
                <ListItemText
                  primary={result.name}
                  secondary={
                    <Box>
                      <Typography 
                        component="span" 
                        color={
                          result.status === "success" ? "success.main" : 
                          result.status === "info" ? "info.main" : "error"
                        }
                      >
                        {
                          result.status === "success" ? "✓ Success" : 
                          result.status === "info" ? "ℹ Info" : "✗ Failed"
                        }
                      </Typography>
                      
                      {result.details && (
                        <Typography component="div" variant="body2" sx={{ mt: 1 }}>
                          {result.details}
                        </Typography>
                      )}
                      
                      {result.error && (
                        <Typography component="div" variant="body2" color="error" sx={{ mt: 1 }}>
                          Error: {result.error}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              {index < results.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default RLSDebug; 