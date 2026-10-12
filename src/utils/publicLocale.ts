export type PublicLanguage = 'es' | 'en';
// Latin America, including Brazil and Haiti as requested, plus Spain.
const SPANISH_COUNTRIES = new Set(['ES', 'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'PR', 'CO', 'VE', 'EC', 'PE', 'BO', 'PY', 'CL', 'AR', 'UY', 'BR', 'HT', 'GF', 'GP', 'MQ', 'BL', 'MF']);
export function languageForCountry(country?: string | null): PublicLanguage | null {
  if (!country || !/^[A-Z]{2}$/.test(country.toUpperCase()) || ['XX', 'T1'].includes(country.toUpperCase())) return null;
  return SPANISH_COUNTRIES.has(country.toUpperCase()) ? 'es' : 'en';
}
export function languageFromPath(path: string): PublicLanguage | null {
  return /^\/es(?:\/|$)/.test(path) ? 'es' : /^\/en(?:\/|$)/.test(path) ? 'en' : null;
}
export function resolvePublicLanguage(path: string, saved?: string | null, country?: string | null, browserLanguage = 'en'): PublicLanguage {
  return languageFromPath(path) || (saved === 'es' || saved === 'en' ? saved : null) || languageForCountry(country) || (browserLanguage.toLowerCase().startsWith('es') ? 'es' : 'en');
}
