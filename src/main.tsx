import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Filter out noisy third-party browser extension errors from polluting the app console
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = event.reason?.message || String(event.reason || '');
    if (
      errorMsg.includes('message channel closed before a response was received') ||
      errorMsg.includes('chrome-extension://') ||
      errorMsg.includes('couponCollection') ||
      errorMsg.includes('affiliateCashback') ||
      errorMsg.includes('ObjectMultiplex')
    ) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
