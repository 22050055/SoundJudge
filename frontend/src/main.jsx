import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Suppress errors from CocCoc / Chrome extension scripts
// (onboarding.js, content-script.js, remote-uploader.service, v.v.)
window.addEventListener('unhandledrejection', (e) => {
  if (
    e.reason === undefined ||
    e.reason === null ||
    (typeof e.reason === 'string' && (
      e.reason.includes('message channel closed') ||
      e.reason.includes('listener indicated') ||
      e.reason.includes('Extension context')
    ))
  ) {
    e.preventDefault();
  }
});

window.addEventListener('error', (e) => {
  const src = e.filename || '';
  if (
    src.includes('onboarding') ||
    src.includes('content-script') ||
    src.includes('remote-uploader') ||
    src.includes('extension')
  ) {
    e.preventDefault();
    return true;
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
