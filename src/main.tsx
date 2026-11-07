import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { FirebaseProvider } from './context/FirebaseContext';
import './index.css';
import './mobile.css';

// Google Maps Platform Quota Exceeded listener
(window as any).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};
const origError = console.error;
console.error = (...args: unknown[]) => {
  origError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

// Suppress generic third-party cross-origin "Script error." notifications from leaking
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || !event.message) {
    event.preventDefault();
    return true;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FirebaseProvider>
      <App />
    </FirebaseProvider>
  </React.StrictMode>
);
