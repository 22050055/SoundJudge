import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// ── Suppress lỗi từ extension trình duyệt (CocCoc, Adblock...) ──
// Những lỗi này không liên quan đến code, tránh làm crash React
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  // Chỉ suppress lỗi undefined hoặc từ extension (không có stack trace của app)
  if (
    reason === undefined ||
    reason === null ||
    (reason instanceof Error && (
      reason.message?.includes('message channel closed') ||
      reason.message?.includes('listener indicated') ||
      reason.message?.includes('Extension context')
    ))
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  if (
    event.filename?.includes('extension') ||
    event.filename?.includes('onboarding') ||
    event.filename?.includes('content-script')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
