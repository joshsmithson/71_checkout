import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Access debug logger from window
declare global {
  interface Window {
    debugLog?: (message: string) => void;
  }
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