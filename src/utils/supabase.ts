/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Log debug messages if available
const debug = (message: string) => {
  console.log('[Supabase]', message);
  if (typeof window !== 'undefined' && window.debugLog) {
    window.debugLog(message);
  }
};

// Get environment variables with fallbacks
let supabaseUrl: string;
let supabaseAnonKey: string;

try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Log env variable status
  debug(`Supabase URL present: ${!!supabaseUrl}`);
  debug(`Supabase Key present: ${!!supabaseAnonKey}`);
  
  // If we're in production and missing variables, look for them as global variables
  if (import.meta.env.PROD && (!supabaseUrl || !supabaseAnonKey)) {
    debug('Trying to get env vars from window.__ENV');
    // Some deployment platforms inject env variables into the window object
    const windowEnv = (window as any).__ENV;
    if (windowEnv) {
      if (!supabaseUrl && windowEnv.VITE_SUPABASE_URL) {
        supabaseUrl = windowEnv.VITE_SUPABASE_URL;
        debug('Found Supabase URL in window.__ENV');
      }
      if (!supabaseAnonKey && windowEnv.VITE_SUPABASE_ANON_KEY) {
        supabaseAnonKey = windowEnv.VITE_SUPABASE_ANON_KEY;
        debug('Found Supabase Key in window.__ENV');
      }
    }
  }
} catch (err) {
  debug(`Error accessing env variables: ${err}`);
  supabaseUrl = '';
  supabaseAnonKey = '';
}

// Add error handling for production environment
if (!supabaseUrl || !supabaseAnonKey) {
  debug('Supabase environment variables are missing!');
  
  // In production, show a more user-friendly message and potentially retry
  if (typeof window !== 'undefined') {
    // Add to window load event to display error after page loads
    window.addEventListener('load', () => {
      const rootElement = document.getElementById('root');
      if (rootElement) {
        const errorDiv = document.createElement('div');
        errorDiv.style.padding = '20px';
        errorDiv.style.margin = '20px';
        errorDiv.style.background = '#f8d7da';
        errorDiv.style.border = '1px solid #f5c6cb';
        errorDiv.style.borderRadius = '4px';
        errorDiv.style.color = '#721c24';
        errorDiv.innerHTML = `
          <h3>Database Connection Error</h3>
          <p>Unable to connect to the database. This could be due to:</p>
          <ul>
            <li>Missing environment variables (VITE_SUPABASE_URL: ${!!supabaseUrl}, VITE_SUPABASE_ANON_KEY: ${!!supabaseAnonKey})</li>
            <li>Network connectivity issues</li>
            <li>Server configuration problems</li>
          </ul>
          <p>Please try refreshing the page or contact support if the problem persists.</p>
          <button id="retry-connection" style="background:#0d6efd;color:white;border:none;padding:10px 15px;border-radius:4px;cursor:pointer;">
            Retry Connection
          </button>
        `;
        rootElement.appendChild(errorDiv);
        
        // Add retry functionality
        document.getElementById('retry-connection')?.addEventListener('click', () => {
          window.location.reload();
        });
      }
    });
  }
}

// Create Supabase client with error handling
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key',
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

// Verify connection on startup
const checkConnection = async () => {
  try {
    debug('Verifying Supabase connection...');
    const { error } = await supabase.from('games').select('count', { count: 'exact', head: true });
    if (error) {
      debug(`Supabase connection error: ${error.message}`);
      return false;
    } else {
      debug('Supabase connection verified successfully');
      return true;
    }
  } catch (err) {
    debug(`Failed to verify Supabase connection: ${err}`);
    return false;
  }
};

// Run connection check when the DOM is loaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      checkConnection().then(success => {
        if (success) {
          debug('Database connection established');
        } else {
          debug('Database connection failed');
        }
      });
    }, 1000); // Give a slight delay to ensure other initialization is complete
  });
}

export default supabase; 