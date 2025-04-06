/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add error handling for production environment
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing!');
  
  // In production, show a more user-friendly message and potentially retry
  if (import.meta.env.PROD) {
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
            <li>Missing environment variables</li>
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

// Add global error handler for Supabase connection issues
if (import.meta.env.PROD) {
  // Test connection and show error if failed
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' && !session) {
      console.log('User is not authenticated. This is expected if not logged in.');
    }
  });
}

export default supabase; 