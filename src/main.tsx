import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister any stale service workers that might be intercepting API calls from previous sessions on this shared domain
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
 navigator.serviceWorker.getRegistrations().then((registrations) => {
 for (const registration of registrations) {
  registration.unregister().then((success) => {
  if (success) {
   console.log('Successfully unregistered stale service worker:', registration);
   window.location.reload();
  }
  });
 }
 });
}

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <App />
 </StrictMode>,
);
