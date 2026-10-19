// Keep authentication and legacy payment callbacks in the existing application.
export function isPublicEntry(pathname: string, search = '', hash = ''): boolean {
  if (/^\/(?:es\/|en\/)?webs\/?$/.test(pathname) || /^\/business\/(?:account|[a-f0-9]{48})\/?$/.test(pathname)) return true;
  const params = new URLSearchParams(search);
  if (['stripe_connect', 'stripe_status', 'stripe_session_id', 'code', 'token_hash', 'error_description'].some(key => params.has(key))) return false;
  if (/(?:^#|&)(?:access_token|refresh_token|type|error)=/.test(hash)) return false;
  return /^\/(?:es|en)?\/?$/.test(pathname) || /^\/(?:es\/|en\/)?(?:legal|privacy|cookies|terms)\/?$/.test(pathname);
}
