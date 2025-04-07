import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Add window error handler for production debugging
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error || event.message);
    
    // If we haven't rendered anything yet, show an error message
    const root = document.getElementById('root');
    if (root && root.children.length === 1 && root.children[0].classList.contains('loading-container')) {
      root.innerHTML += `
        <div style="color: white; background: #333; padding: 20px; margin: 20px; border-radius: 4px; max-width: 600px; margin: 20px auto;">
          <h2>Error Loading Application</h2>
          <p>${event.error?.message || event.message || 'Unknown error'}</p>
          <button onclick="window.location.reload()" style="background: #e53935; color: white; border: none; padding: 10px 15px; border-radius: 4px; margin-top: 15px; cursor: pointer;">
            Reload Application
          </button>
        </div>
      `;
    }
  });
}

// Simple console logger for debugging
const isDebug = import.meta.env.DEV || import.meta.env.VITE_APP_DEBUG === 'true';
const debug = (message: string) => {
  if (isDebug) {
    console.log(`[Dart Counter] ${message}`);
  }
};

try {
  debug('Initializing application...');
  
  // Log environment info
  debug(`Running in ${import.meta.env.MODE} mode`);
  debug(`Base URL: ${import.meta.env.BASE_URL}`);
  
  // Check for required environment variables
  if (!import.meta.env.VITE_SUPABASE_URL) {
    console.warn('VITE_SUPABASE_URL environment variable is missing');
  }
  
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('VITE_SUPABASE_ANON_KEY environment variable is missing');
  }
  
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter basename="/">
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  debug('Application rendered successfully');
} catch (error) {
  console.error('Failed to initialize app:', error);
  document.body.innerHTML += `
    <div style="color: white; background: #333; padding: 20px; margin: 20px; border-radius: 4px;">
      <h2>Error Loading Application</h2>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <button onclick="window.location.reload()" style="background: #e53935; color: white; border: none; padding: 10px 15px; border-radius: 4px; margin-top: 15px; cursor: pointer;">
        Reload Application
      </button>
    </div>
  `;
} 