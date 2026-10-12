import { getWebsiteConsent, clearAnalyticsIdentifiers } from './websiteConsent';
type AnalyticsEvent = 'page_view' | 'contact_intent' | 'portal_open';
const getId = (key: string, persistent: boolean, expiresAt: number) => {
 const storage = persistent ? window.localStorage : window.sessionStorage;
 if (persistent && Number(storage.getItem('althera_visitor_id_expires') || 0) <= Date.now()) storage.removeItem(key);
 let id = storage.getItem(key);
 if (!id) { id = crypto.randomUUID(); storage.setItem(key, id); }
 if (persistent) storage.setItem('althera_visitor_id_expires', String(expiresAt));
 return id;
};
export const trackWebsiteEvent = (eventName: AnalyticsEvent, path?: string) => {
 if (typeof window === 'undefined') return;
 const consent = getWebsiteConsent();
 if (!consent?.analytics) { clearAnalyticsIdentifiers(); return; }
 if (['localhost', '127.0.0.1'].includes(window.location.hostname)) return;
 try {
  const url = new URL(window.location.href);
  const payload = {
   eventName, path: path || window.location.pathname,
   visitorId: getId('althera_visitor_id', true, consent.expiresAt), sessionId: getId('althera_session_id', false, consent.expiresAt),
   referrerHost: document.referrer ? new URL(document.referrer).hostname : '',
   utmSource: url.searchParams.get('utm_source') || '', utmMedium: url.searchParams.get('utm_medium') || '',
   utmCampaign: url.searchParams.get('utm_campaign') || '', deviceType: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  };
  fetch('/api/analytics/track', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Althera-Consent': 'analytics-v1' }, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined);
 } catch { /* Blocked storage or an invalid referrer must never interrupt navigation. */ }
};
