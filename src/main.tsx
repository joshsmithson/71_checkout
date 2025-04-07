import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Simple console logger for debugging
const isDebug = import.meta.env.DEV || import.meta.env.VITE_APP_DEBUG === 'true';
const debug = (message: string) => {
  if (isDebug) {
    console.log(`[Dart Counter] ${message}`);
  }
};

try {
  debug('Initializing application...');
  
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
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
    </div>
  `;
} 