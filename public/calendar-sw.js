// Deliberately no fetch/cache handler: private CRM data is never cached offline.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
 let data = {};
 try { data = event.data?.json() || {}; } catch {}
 event.waitUntil(self.registration.showNotification(data.title || 'Tu agenda de Althera', {
  body: data.body || 'Abre el calendario para consultar tus tareas.',
  icon: '/web-app-manifest-192x192.png', tag: data.tag || 'althera-calendar',
  data: {url: '/admin/calendar'},
 }));
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil((async () => {
  const url = new URL('/admin/calendar',self.location.origin).href;
  const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing = windows.find(client => client.url.startsWith(self.location.origin+'/admin'));
  if (existing) { await existing.navigate(url); return existing.focus(); }
  return self.clients.openWindow(url);
 })());
});
