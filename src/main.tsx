import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Create a debug element that will be shown if there are critical errors
const createDebugDisplay = (message: string) => {
  const debugEl = document.createElement('div');
  debugEl.style.position = 'fixed';
  debugEl.style.bottom = '0';
  debugEl.style.left = '0';
  debugEl.style.right = '0';
  debugEl.style.padding = '10px';
  debugEl.style.background = 'rgba(0,0,0,0.8)';
  debugEl.style.color = '#ff5252';
  debugEl.style.zIndex = '9999';
  debugEl.style.fontSize = '12px';
  debugEl.style.fontFamily = 'monospace';
  debugEl.style.whiteSpace = 'pre-wrap';
  debugEl.style.maxHeight = '50vh';
  debugEl.style.overflow = 'auto';
  debugEl.textContent = message;
  document.body.appendChild(debugEl);
};

// Define a global debug log function
declare global {
  interface Window {
    debugLog: (message: string) => void;
    __ENV?: Record<string, string>;
  }
}

// Simple console logger for debugging
const isDebug = import.meta.env.DEV || import.meta.env.VITE_APP_DEBUG === 'true';
window.debugLog = (message: string) => {
  if (isDebug) {
    console.log(`[Dart Counter] ${message}`);
  }
  
  // Always log to debug display in production
  const debugInfo = document.getElementById('debug-info');
  if (debugInfo) {
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
    debugInfo.style.display = 'block';
    const line = document.createElement('div');
    line.textContent = `[${timestamp}] ${message}`;
    debugInfo.appendChild(line);
    
    // Scroll to bottom
    debugInfo.scrollTop = debugInfo.scrollHeight;
  }
};

// Add window error handler for production debugging
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error || event.message);
    window.debugLog(`Global error: ${event.error?.message || event.message || 'Unknown error'}`);
    
    // If we haven't rendered anything yet, show an error message
    const root = document.getElementById('root');
    if (root && root.children.length === 1 && root.children[0].classList.contains('loading-container')) {
      createDebugDisplay(`Error Loading Application: ${event.error?.message || event.message || 'Unknown error'}`);
      
      root.innerHTML += `
        <div style="color: white; background: #333; padding: 20px; margin: 20px; border-radius: 4px; max-width: 600px; margin: 20px auto;">
          <h2>Error Loading Application</h2>
          <p>${event.error?.message || event.message || 'Unknown error'}</p>
          <p>Check the console for more details or visit <a href="/debug.html" style="color: #E53935;">/debug.html</a> for diagnostics.</p>
          <button onclick="window.location.reload()" style="background: #e53935; color: white; border: none; padding: 10px 15px; border-radius: 4px; margin-top: 15px; cursor: pointer;">
            Reload Application
          </button>
        </div>
      `;
    }
  });
}

// Check environment vars and make sure they're properly exposed
const checkEnvironmentVars = () => {
  window.debugLog('Checking environment variables...');
  
  // First check if we have environment variables directly
  const envVars = {
    'VITE_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL || 'missing',
    'VITE_SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY ? '[present but hidden]' : 'missing',
    'NODE_ENV': import.meta.env.MODE || 'unknown',
    'DEV': import.meta.env.DEV ? 'true' : 'false',
    'BASE_URL': import.meta.env.BASE_URL || 'unknown'
  };
  
  window.debugLog(`Environment variables: ${JSON.stringify(envVars)}`);
  
  // If we're missing critical vars, make it very obvious
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    window.debugLog('CRITICAL: Missing required environment variables!');
    
    // Make missing env vars more obvious
    if (import.meta.env.PROD) {
      createDebugDisplay(`MISSING ENVIRONMENT VARIABLES
        VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? 'Present' : 'Missing'}
        VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing'}
        
        This error usually indicates that the environment variables are not properly 
        configured in your Vercel project. Visit /debug.html for more information.
      `);
    }
    
    return false;
  }
  
  return true;
};

try {
  window.debugLog('Initializing application...');
  
  // Log environment info
  window.debugLog(`Running in ${import.meta.env.MODE} mode`);
  window.debugLog(`Base URL: ${import.meta.env.BASE_URL}`);
  
  // Check environment variables
  const envVarsValid = checkEnvironmentVars();
  
  // Check for required environment variables
  if (!envVarsValid) {
    window.debugLog('WARNING: Environment variable check failed');
  }
  
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  
  // Show debug info element in production for easier troubleshooting
  if (import.meta.env.PROD) {
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
      debugInfo.style.display = 'block';
      window.debugLog('Debug display enabled');
    }
  }
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter basename="/">
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  window.debugLog('Application rendered successfully');
} catch (error) {
  console.error('Failed to initialize app:', error);
  window.debugLog(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  
  document.body.innerHTML += `
    <div style="color: white; background: #333; padding: 20px; margin: 20px; border-radius: 4px;">
      <h2>Error Loading Application</h2>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <p>This may be due to missing environment variables or configuration issues.</p>
      <p>Check the console for more details or visit <a href="/debug.html" style="color: #E53935;">/debug.html</a> for diagnostics.</p>
      <button onclick="window.location.reload()" style="background: #e53935; color: white; border: none; padding: 10px 15px; border-radius: 4px; margin-top: 15px; cursor: pointer;">
        Reload Application
      </button>
    </div>
  `;
} 