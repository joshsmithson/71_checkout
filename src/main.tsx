import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Initialize debug logger
if (typeof window !== 'undefined') {
  window.DEBUG_MODE = import.meta.env.VITE_APP_DEBUG === 'true' || import.meta.env.DEV;
  
  window.debugLog = (message: string) => {
    if (!window.DEBUG_MODE) return;
    
    console.log('[Debug]', message);
    
    // Create debug info div if it doesn't exist
    let debugDiv = document.getElementById('debug-info');
    if (!debugDiv) {
      debugDiv = document.createElement('div');
      debugDiv.id = 'debug-info';
      debugDiv.style.position = 'fixed';
      debugDiv.style.bottom = '10px';
      debugDiv.style.left = '10px';
      debugDiv.style.background = 'rgba(0,0,0,0.8)';
      debugDiv.style.color = '#4CAF50';
      debugDiv.style.fontFamily = 'monospace';
      debugDiv.style.padding = '10px';
      debugDiv.style.borderRadius = '5px';
      debugDiv.style.maxWidth = '90%';
      debugDiv.style.maxHeight = '200px';
      debugDiv.style.overflowY = 'auto';
      debugDiv.style.fontSize = '12px';
      debugDiv.style.zIndex = '9999';
      debugDiv.style.display = 'block';
      document.body.appendChild(debugDiv);
    }
    
    // Add the message to the debug div
    const msgElement = document.createElement('div');
    msgElement.textContent = `${new Date().toISOString().substr(11, 8)}: ${message}`;
    debugDiv.appendChild(msgElement);
    
    // Auto-scroll to bottom
    debugDiv.scrollTop = debugDiv.scrollHeight;
  };
}

// Helper to log debug messages
const debug = (message: string) => {
  console.log('[Dart Counter]', message);
  if (window.debugLog) {
    window.debugLog(message);
  }
};

// Write a message to the document body if something fails
const showError = (message: string) => {
  debug(`ERROR: ${message}`);
  
  const errorDiv = document.createElement('div');
  errorDiv.style.padding = '20px';
  errorDiv.style.margin = '20px';
  errorDiv.style.background = '#f8d7da';
  errorDiv.style.border = '1px solid #f5c6cb';
  errorDiv.style.borderRadius = '4px';
  errorDiv.style.color = '#721c24';
  errorDiv.innerHTML = `<h3>Error Loading App</h3><p>${message}</p>`;
  document.body.appendChild(errorDiv);
};

try {
  debug('Initializing application...');
  
  // Environment variables check
  debug(`Supabase URL present: ${!!import.meta.env.VITE_SUPABASE_URL}`);
  debug(`Supabase Key present: ${!!import.meta.env.VITE_SUPABASE_ANON_KEY}`);
  debug(`Build environment: ${import.meta.env.MODE}`);
  
  // Get the root element
  const root = document.getElementById('root');
  
  if (!root) {
    throw new Error('Root element not found! Expected element with id "root"');
  }
  
  debug('Found root element, creating React root...');
  
  // Create and render the root
  const reactRoot = ReactDOM.createRoot(root);
  
  debug('Rendering application...');
  
  reactRoot.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  debug('Application rendered successfully');
} catch (error) {
  console.error('Error mounting React application:', error);
  showError(`Failed to load application: ${error instanceof Error ? error.message : String(error)}`);
} 