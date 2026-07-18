import React from 'react';
import ReactDOM from 'react-dom/client';
import DigitalTwinApp from './App.jsx';

console.log('⚛️ React Entry Point (main.jsx) executing...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found!');
  }

  console.log('⚛️ Found root element, creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('⚛️ Rendering DigitalTwinApp...');
  root.render(
    <React.StrictMode>
      <DigitalTwinApp />
    </React.StrictMode>
  );
  console.log('⚛️ Render command issued.');
} catch (error) {
  console.error('🔥 FATAL ERROR in main.jsx:', error);
  document.body.innerHTML += `<div style="color:red; font-size: 20px; padding: 20px;">FATAL REACT ERROR: ${error.message}</div>`;
}

// Also initialize the legacy 3D viewer for integration
import '../main.js';