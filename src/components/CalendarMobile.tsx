import React,{useEffect,useState} from 'react';
import {supabase} from '../supabaseClient';
async function request(path:string,body?:unknown) {
 const {data:{session}}=await supabase.auth.getSession();
 const response=await fetch(`/api/calendar-push/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session?.access_token||''}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json().catch(()=>({error:'El servidor no respondió. Inténtalo de nuevo.'}));
 if(!response.ok) throw new Error(result.error||'No se pudo guardar.');
 return result;
}
export default function CalendarMobile(){
 const [time,setTime]=useState('08:00');
 const [zone,setZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);
 const [key,setKey]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [active,setActive]=useState(false);
 const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator & {standalone?:boolean}).standalone;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
 useEffect(()=>{
  const manifest=document.querySelector<HTMLLinkElement>('link[rel="manifest"]');const previous=manifest?.getAttribute('href');if(manifest)manifest.href='/calendar.webmanifest';
  request('config').then(async config=>{setKey(config.publicKey);if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.register('/calendar-sw.js',{scope:'/'});const sub=await reg.pushManager.getSubscription();if(sub){const settings=await request('settings',{endpoint:sub.endpoint});setActive(!!settings.active);if(settings.time)setTime(settings.time);if(settings.timezone)setZone(settings.timezone);}}}).catch(e=>setMessage(e.message));
  return()=>{if(manifest&&previous)manifest.href=previous;};
 },[]);
 async function enable(){
  // Must be invoked directly by a tap on iOS, before any network request.
  const permissionPromise=Notification.requestPermission();setBusy(true);setMessage('');
  try{if(await permissionPromise!=='granted')throw new Error('Permite las notificaciones en los ajustes de tu iPhone para recibir avisos.');
   const reg=await navigator.serviceWorker.ready;
   const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const existing=await reg.pushManager.getSubscription();const sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
   await request('subscribe',{subscription:sub.toJSON(),time,timezone:zone});setActive(true);setMessage('Avisos guardados. Recibirás las tareas pendientes del día a la hora elegida.');
  }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
 }
 async function disable(){setBusy(true);try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub){await request('unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();}setActive(false);setMessage('Avisos desactivados en este dispositivo.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function test(){setBusy(true);try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();await request('test',{endpoint:sub?.endpoint});setMessage('Aviso de prueba enviado.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <details className="calendar-mobile"><summary>Calendario en tu iPhone · {active?'Avisos activados':'Instalar y configurar avisos'}</summary>
 {!standalone&&<p>En Safari, abre este calendario, pulsa <strong>Compartir → Añadir a pantalla de inicio → Añadir</strong>. Después abre Althera desde su icono e inicia sesión. Para los avisos necesitas iOS 16.4 o posterior.</p>}
 <div className="mobile-controls"><label>Resumen de la mañana<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Zona horaria<input value={zone} onChange={e=>setZone(e.target.value)} aria-label="Zona horaria IANA"/></label>
 <button type="button" disabled={busy||!key||!('Notification' in window)||!('PushManager' in window)||(ios&&!standalone)} onClick={enable}>{busy?'Guardando…':active?'Guardar hora':'Activar avisos'}</button>
 {active&&<><button type="button" disabled={busy} onClick={test}>Probar aviso</button><button type="button" disabled={busy} onClick={disable}>Desactivar</button></>}</div>
 <p>Solo te avisamos si tienes tareas pendientes ese día. Toca el aviso para abrir el calendario. La entrega puede variar según la conexión y los modos de concentración del iPhone.</p>
 {message&&<p role="status">{message}</p>}
 </details>;
}
