/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Check your environment variables.');
  
  // In production, we want to show a proper error instead of crashing
  if (import.meta.env.PROD) {
    // We'll create the client anyway with empty strings to avoid crashing the app
    // The auth will fail, but at least the app will load and show an error message
    console.warn('Creating Supabase client with empty credentials for error display purposes');
  } else {
    // In development, we want to fail fast
    throw new Error('Missing Supabase credentials. Check your environment variables.');
  }
}

export const supabase = createClient<Database>(
  supabaseUrl || '', 
  supabaseAnonKey || '', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      detectSessionInUrl: true,
      storage: localStorage,
    },
  }
);

// Verify connection on startup in production
if (import.meta.env.PROD) {
  // Simple health check to verify Supabase connection
  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('games').select('count', { count: 'exact', head: true });
      if (error) {
        console.error('Supabase connection error:', error);
      } else {
        console.log('Supabase connection verified successfully');
      }
    } catch (err) {
      console.error('Failed to verify Supabase connection:', err);
    }
  };
  
  checkConnection();
}

export default supabase; 