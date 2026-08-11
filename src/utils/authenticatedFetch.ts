import { supabase } from '../supabaseClient';

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
 const { data: { session }, error } = await supabase.auth.getSession();
 if (error || !session?.access_token) {
  throw new Error('La sesión administrativa ha caducado. Vuelve a iniciar sesión.');
 }

 const headers = new Headers(init.headers);
 headers.set('Authorization', `Bearer ${session.access_token}`);
 return fetch(input, { ...init, headers });
}
