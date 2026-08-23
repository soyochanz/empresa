type AnalyticsEvent = 'page_view' | 'contact_intent' | 'portal_open';

const getId = (key: string, persistent: boolean) => {
 const storage = persistent ? window.localStorage : window.sessionStorage;
 let id = storage.getItem(key);
 if (!id) { id = crypto.randomUUID(); storage.setItem(key, id); }
 return id;
};

export const trackWebsiteEvent = (eventName: AnalyticsEvent, path = window.location.pathname) => {
 if (typeof window === 'undefined' || window.location.hostname === 'localhost') return;
 const url = new URL(window.location.href);
 const referrerHost = document.referrer ? new URL(document.referrer).hostname : '';
 const payload = {
  eventName, path, visitorId: getId('althera_visitor_id', true), sessionId: getId('althera_session_id', false),
  referrerHost, utmSource: url.searchParams.get('utm_source') || '', utmMedium: url.searchParams.get('utm_medium') || '',
  utmCampaign: url.searchParams.get('utm_campaign') || '', deviceType: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
 };
 fetch('/api/analytics/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined);
};
