import React, { useEffect, useState } from 'react';
import { getWebsiteConsent, saveWebsiteConsent } from '../../utils/websiteConsent';
import { LandingCopy } from './content';
import { PublicLanguage } from '../../utils/publicLocale';
export const OPEN_COOKIE_PREFERENCES = 'althera:open-cookies';
export default function CookiePreferences({ t, language }: { t: LandingCopy; language: PublicLanguage }) {
  const [open, setOpen] = useState(() => !getWebsiteConsent());
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(() => getWebsiteConsent()?.analytics || false);
  useEffect(() => {
    const show = () => { setAnalytics(getWebsiteConsent()?.analytics || false); setCustomize(true); setOpen(true); };
    window.addEventListener(OPEN_COOKIE_PREFERENCES, show);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES, show);
  }, []);
  const save = (allow: boolean) => { saveWebsiteConsent(allow); setAnalytics(allow); setOpen(false); };
  if (!open) return null;
  return <aside className="lp-cookie" aria-label={t.preferences}>
    <div><h2>{t.cookiesTitle}</h2><p>{t.cookiesText} <a href={`/${language}/cookies`}>{t.legal[2]}</a></p></div>
    {customize && <div className="lp-cookie-options"><div><strong>{t.necessary}</strong><p>{t.necessaryText}</p></div><label><span><strong>{t.analytics}</strong><span>{t.analyticsText}</span></span><input type="checkbox" checked={analytics} onChange={event => setAnalytics(event.target.checked)} /></label></div>}
    <div className="lp-cookie-actions"><button onClick={() => save(false)}>{t.reject}</button><button onClick={() => save(true)}>{t.accept}</button>{customize ? <button onClick={() => save(analytics)}>{t.save}</button> : <button onClick={() => setCustomize(true)}>{t.customize}</button>}</div>
  </aside>;
}
