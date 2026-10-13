import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import PublicApp from './PublicApp';
import { isPublicEntry } from './utils/publicEntry';
const PrivateApp = lazy(() => import('./PrivateApp'));
const publicEntry = isPublicEntry(window.location.pathname, window.location.search, window.location.hash);
import './index.css';

if (typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
 document.documentElement.classList.add('is-mac');
}

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
 {publicEntry ? <PublicApp /> : <Suspense fallback={<div role="status" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#090c0b', color: '#d6bd83' }}>Cargando área privada…</div>}><PrivateApp /></Suspense>}
 </StrictMode>,
);
