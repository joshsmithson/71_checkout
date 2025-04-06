import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Write a message to the document body if something fails
const showError = (message: string) => {
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
  console.log('Initializing application...');
  
  // Get the root element
  const root = document.getElementById('root');
  
  if (!root) {
    throw new Error('Root element not found! Expected element with id "root"');
  }
  
  console.log('Found root element, creating React root...');
  
  // Create and render the root
  const reactRoot = ReactDOM.createRoot(root);
  
  console.log('Rendering application...');
  
  reactRoot.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  console.log('Application rendered successfully');
} catch (error) {
  console.error('Error mounting React application:', error);
  showError(`Failed to load application: ${error instanceof Error ? error.message : String(error)}`);
} 