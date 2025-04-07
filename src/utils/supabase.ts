/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Log debug messages
const debug = (message: string) => {
  console.log('[Supabase]', message);
  if (typeof window !== 'undefined' && window.debugLog) {
    window.debugLog(message);
  }
};

// Get environment variables with fallbacks
// Using more robust detection of environment variables
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  // Priority 1: Check window.__ENV (from env.js)
  if (typeof window !== 'undefined' && window.__ENV) {
    debug('window.__ENV exists, checking for Supabase config');
    
    if (window.__ENV.VITE_SUPABASE_URL && window.__ENV.VITE_SUPABASE_URL !== '{{VITE_SUPABASE_URL}}') {
      supabaseUrl = window.__ENV.VITE_SUPABASE_URL;
      debug('Using Supabase URL from window.__ENV');
    }
    
    if (window.__ENV.VITE_SUPABASE_ANON_KEY && window.__ENV.VITE_SUPABASE_ANON_KEY !== '{{VITE_SUPABASE_ANON_KEY}}') {
      supabaseAnonKey = window.__ENV.VITE_SUPABASE_ANON_KEY;
      debug('Using Supabase Key from window.__ENV');
    }
  }
  
  // Priority 2: Check import.meta.env (Vite standard)
  if (!supabaseUrl && import.meta.env.VITE_SUPABASE_URL) {
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    debug('Using Supabase URL from import.meta.env');
  }
  
  if (!supabaseAnonKey && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    debug('Using Supabase Key from import.meta.env');
  }
  
  // Priority 3: Check process.env (fallback for some environments)
  if (!supabaseUrl && typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) {
    supabaseUrl = process.env.VITE_SUPABASE_URL;
    debug('Using Supabase URL from process.env');
  }
  
  if (!supabaseAnonKey && typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) {
    supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    debug('Using Supabase Key from process.env');
  }
  
  // FALLBACK FOR VERCEL: Use the values from .env.production
  if (!supabaseUrl) {
    // This should only be used if everything else fails
    debug('FALLBACK: Using hardcoded Supabase URL from .env.production');
    supabaseUrl = 'https://wcsbyzenlydqobayftwl.supabase.co';
  }
  
  if (!supabaseAnonKey) {
    debug('FALLBACK: Using hardcoded Supabase Key from .env.production');
    supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjc2J5emVubHlkcW9iYXlmdHdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MzcwMTcsImV4cCI6MjA1OTUxMzAxN30.rH6kj-Qt07W-n8U-hYmLTztpzl5t1qvraXHckTXLWx0';
  }
  
  // Log final status
  debug(`Final Supabase URL: ${supabaseUrl.substring(0, 20)}...`);
  debug(`Supabase Key present: ${!!supabaseAnonKey}`);
  
} catch (err) {
  debug(`Error accessing env variables: ${err}`);
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
          <a href="/debug.html" style="display:inline-block;margin-left:10px;background:#6c757d;color:white;padding:10px 15px;border-radius:4px;text-decoration:none;">
            View Diagnostics
          </a>
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

// Create Supabase client with added safeguards
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
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