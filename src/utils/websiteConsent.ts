export const CONSENT_KEY = 'althera_cookie_consent';
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = 'althera:consent';
export const CONSENT_DAYS = 180;
export interface WebsiteConsent { version: number; analytics: boolean; savedAt: number; expiresAt: number }
export function parseConsent(raw: string | null, now = Date.now()): WebsiteConsent | null {
  try {
    const data = JSON.parse(raw || 'null');
    return data?.version === CONSENT_VERSION && typeof data.analytics === 'boolean' && Number.isFinite(data.savedAt) && data.savedAt <= now && Number.isFinite(data.expiresAt) && data.expiresAt > now && data.expiresAt - data.savedAt <= CONSENT_DAYS * 86400000 ? data : null;
  } catch { return null; }
}
let memoryConsent: WebsiteConsent | null = null;
export function getWebsiteConsent(): WebsiteConsent | null {
  if (typeof window === 'undefined') return null;
  try { return parseConsent(window.localStorage.getItem(CONSENT_KEY)) || (memoryConsent && parseConsent(JSON.stringify(memoryConsent))); }
  catch { return memoryConsent && parseConsent(JSON.stringify(memoryConsent)); }
}
export function clearAnalyticsIdentifiers() {
  try { window.localStorage.removeItem('althera_visitor_id'); window.localStorage.removeItem('althera_visitor_id_expires'); } catch {}
  try { window.sessionStorage.removeItem('althera_session_id'); } catch {}
}
export function saveWebsiteConsent(analytics: boolean) {
  const now = Date.now();
  memoryConsent = { version: CONSENT_VERSION, analytics, savedAt: now, expiresAt: now + CONSENT_DAYS * 86400000 };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(memoryConsent)); } catch {}
  if (!analytics) clearAnalyticsIdentifiers();
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
