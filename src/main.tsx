import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Define the DEBUG interface for TypeScript
declare global {
  interface Window {
    _DEBUG?: {
      logs: Array<{time: string, msg: string}>;
      timing: Record<string, number>;
      log: (msg: string) => void;
      updateStatus?: (msg: string) => void;
      initTimeout?: number;
    }
  }
}

// Log early execution
console.log('[INIT] main.tsx module starting to execute');

// Define a helper to update the load status
const updateStatus = (message: string) => {
  console.log(`[INIT] ${message}`);
  if (window._DEBUG && window._DEBUG.updateStatus) {
    window._DEBUG.updateStatus(message);
  }
};

// Report environment status
updateStatus('Checking environment...');
try {
  const envStatus = {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    baseUrl: import.meta.env.BASE_URL,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? '✓ present' : '✗ missing',
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ present' : '✗ missing',
  };
  console.log('[INIT] Environment status:', envStatus);
} catch (err) {
  console.error('[INIT] Error checking environment:', err);
}

// Error handling
updateStatus('Setting up error handlers...');
window.addEventListener('error', (event) => {
  console.error('[INIT] Global error caught:', event.error || event.message);
  updateStatus(`Error: ${event.error?.message || event.message || 'Unknown error'}`);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[INIT] Unhandled Promise Rejection:', event.reason);
  updateStatus(`Promise Error: ${event.reason?.message || 'Unknown promise error'}`);
});

// Main initialization
try {
  updateStatus('Starting application initialization...');
  
  // Check for root element
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  updateStatus('Found root element...');
  
  // Clear any initialization timeout
  if (window._DEBUG && window._DEBUG.initTimeout) {
    clearTimeout(window._DEBUG.initTimeout);
  }
  
  // Render app
  updateStatus('Rendering application...');
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter basename="/">
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  updateStatus('Application rendered successfully');
  console.log('[INIT] Application render completed');
  
  // Capture any errors that might occur in render phase
  setTimeout(() => {
    if (root.childElementCount === 0) {
      console.error('[INIT] Warning: Root element is empty after rendering');
      updateStatus('Warning: UI failed to render properly');
    } else {
      updateStatus('Application running');
    }
  }, 0);
  
} catch (error) {
  console.error('[INIT] Failed to initialize app:', error);
  updateStatus(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  
  // Show a simple error message
  document.body.innerHTML += `
    <div style="color: white; background: #333; padding: 20px; margin: 20px; border-radius: 4px;">
      <h2>Error Loading Application</h2>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <pre style="background: #222; padding: 10px; color: #f88; white-space: pre-wrap;">${error instanceof Error ? error.stack : 'No stack trace available'}</pre>
      <button onclick="window.location.reload()" style="background: #e53935; color: white; border: none; padding: 10px 15px; border-radius: 4px; margin-top: 15px; cursor: pointer;">
        Reload Application
      </button>
    </div>
  `;
} 