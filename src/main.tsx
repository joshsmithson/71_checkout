import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Enhanced error handling
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error || event.message);
  
  // Log to the DOM in case console isn't visible
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'background:red;color:white;padding:20px;position:fixed;top:0;left:0;right:0;z-index:9999;';
  errorDiv.textContent = `Error: ${event.error?.message || event.message}`;
  document.body.appendChild(errorDiv);
});

try {
  // Initialize app
  console.log('[Startup] Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    BASE_URL: import.meta.env.BASE_URL,
    SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'defined' : 'undefined',
    SUPABASE_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'defined' : 'undefined'
  });
  
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  
  console.log('[Startup] Rendering app to DOM...');
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter basename="/">
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  console.log('[Startup] App rendered successfully');
} catch (error) {
  console.error('[Startup] Failed to initialize app:', error);
  
  // Show error message
  document.body.innerHTML += `
    <div style="color: white; background: #333; padding: 20px; margin: 20px; border-radius: 4px;">
      <h2>Error Loading Application</h2>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <p>Please check the console for more details.</p>
      <button onclick="window.location.reload()" style="background: #e53935; color: white; border: none; padding: 10px 15px; border-radius: 4px; margin-top: 15px; cursor: pointer;">
        Reload Application
      </button>
    </div>
  `;
} 