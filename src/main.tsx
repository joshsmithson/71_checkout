import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Basic error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error || event.message);
});

try {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter basename="/" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to initialize app:', error);
  
  // Show error message
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