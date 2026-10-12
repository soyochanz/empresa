import { useEffect, useRef, useState } from 'react';
import { languageFromPath, PublicLanguage, resolvePublicLanguage } from '../../utils/publicLocale';
const LANGUAGE_KEY = 'althera_language';
export function readLanguagePreference(): PublicLanguage | null {
  try {
    const value = JSON.parse(localStorage.getItem(LANGUAGE_KEY) || 'null');
    if (value?.expiresAt > Date.now() && ['es', 'en'].includes(value.language)) return value.language;
    localStorage.removeItem(LANGUAGE_KEY);
  } catch {}
  return null;
}
export function saveLanguagePreference(language: PublicLanguage) {
  try { localStorage.setItem(LANGUAGE_KEY, JSON.stringify({ language, expiresAt: Date.now() + 180 * 86400000 })); } catch {}
}
export function usePublicLanguage() {
  const initialPreference = useRef(readLanguagePreference());
  const [language, setLanguage] = useState<PublicLanguage>(() => resolvePublicLanguage(window.location.pathname, initialPreference.current, null, navigator.language));
  useEffect(() => {
    if (languageFromPath(window.location.pathname) || initialPreference.current) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);
    fetch('/api/locale', { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!controller.signal.aborted) setLanguage(resolvePublicLanguage(window.location.pathname, readLanguagePreference(), data?.country, navigator.language)); })
      .catch(() => undefined).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    const title = language === 'es' ? 'Althera Solutions — Diseño web, SEO y Meta Ads' : 'Althera Solutions — Web design, SEO & Meta Ads';
    document.title = title;
    const description = language === 'es' ? 'Diseño web, SEO, Meta Ads y productos digitales para hacer crecer tu negocio. Conoce Althera Solutions.' : 'Web design, SEO, Meta Ads and digital products to grow your business. Meet Althera Solutions.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  }, [language]);
  return language;
}
