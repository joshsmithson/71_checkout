/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Simple logging function
const logMessage = (message: string) => {
  console.log(`[Supabase] ${message}`);
};

// Get Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log connection info (without exposing credentials)
logMessage(`Initializing Supabase client (URL exists: ${!!supabaseUrl}, Key exists: ${!!supabaseAnonKey})`);

// Create Supabase client
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      detectSessionInUrl: true,
    },
  }
);

export default supabase; 