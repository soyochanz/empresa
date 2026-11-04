import {dispatchPaymentAlerts} from './paymentAlerts';
import type express from 'express';
import type {SupabaseClient} from '@supabase/supabase-js';
import webpush from 'web-push';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {eventVisible,localClock,validPushEndpoint} from './digest';
export function registerCalendarPush(app:express.Express,db:SupabaseClient,admin:express.RequestHandler,isAuthorized:(id:string,email:string)=>boolean){
 const route=(fn:(req:express.Request,res:express.Response)=>Promise<unknown>):express.RequestHandler=>(req,res)=>{void fn(req,res).catch(()=>res.status(503).json({error:'Los avisos aún no están disponibles. Falta activar o verificar el programador del calendario.'}));};
 async function config(){
  let {data,error}=await db.from('calendar_push_config').select('*').eq('id',true).maybeSingle();if(error)throw error;
  if(!data){const keys=webpush.generateVAPIDKeys();const inserted=await db.from('calendar_push_config').insert({id:true,public_key:keys.publicKey,private_key:keys.privateKey,cron_secret:randomBytes(32).toString('hex')});if(inserted.error&&inserted.error.code!=='23505')throw inserted.error;const result=await db.from('calendar_push_config').select('*').eq('id',true).single();if(result.error)throw result.error;data=result.data;}
  return data;
 }
 async function send(subscription:any,payload:any,keys:any){return webpush.sendNotification(subscription,JSON.stringify(payload),{TTL:3600,timeout:10000,vapidDetails:{subject:'mailto:contact@altherasolutions.com',publicKey:keys.public_key,privateKey:keys.private_key}});}
 app.get('/api/calendar-push/config',admin,route(async(_req,res)=>{const keys=await config();res.setHeader('Cache-Control','no-store');res.json({publicKey:keys.public_key});}));
 app.post('/api/calendar-push/settings',admin,route(async(req,res)=>{const {data,error}=await db.from('calendar_push_subscriptions').select('reminder_time,timezone,calendar_enabled,payments_enabled').eq('endpoint',String(req.body.endpoint||'')).eq('user_id',res.locals.adminUserId).maybeSingle();if(error)throw error;res.json({active:!!data,time:data?.reminder_time,timezone:data?.timezone,calendarEnabled:data?.calendar_enabled,paymentsEnabled:data?.payments_enabled});}));
 app.post('/api/calendar-push/subscribe',admin,route(async(req,res)=>{
  const {subscription,time,timezone}=req.body;
  if(!subscription||typeof subscription.endpoint!=='string'||subscription.endpoint.length>2048||!validPushEndpoint(subscription.endpoint)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||typeof timezone!=='string'||timezone.length>100||!/^[-_a-zA-Z0-9]{20,200}$/.test(subscription.keys?.p256dh)||!/^[-_a-zA-Z0-9]{16,100}$/.test(subscription.keys?.auth))return res.status(400).json({error:'Comprueba la hora y la suscripción del dispositivo.'});
  try{localClock(new Date(),timezone);}catch{return res.status(400).json({error:'Zona horaria no válida. Usa, por ejemplo, Europe/Madrid o Asia/Dubai.'});}
  const previous=await db.from('calendar_push_subscriptions').select('user_id,calendar_enabled,payments_enabled,payments_since').eq('endpoint',subscription.endpoint).maybeSingle();if(previous.error)throw previous.error;
  const own=previous.data?.user_id===res.locals.adminUserId?previous.data:null;
  const calendarEnabled=typeof req.body.calendarEnabled==='boolean'?req.body.calendarEnabled:own?.calendar_enabled??true;
  const paymentsEnabled=typeof req.body.paymentsEnabled==='boolean'?req.body.paymentsEnabled:own?.payments_enabled??false;
  const paymentsSince=paymentsEnabled?(own?.payments_enabled?own.payments_since:new Date().toISOString()):null;
  // Endpoint possession permits switching the current device to a different admin account.
  const {error}=await db.from('calendar_push_subscriptions').upsert({endpoint:subscription.endpoint,user_id:res.locals.adminUserId,subscription:{endpoint:subscription.endpoint,keys:subscription.keys},reminder_time:time,timezone,calendar_enabled:calendarEnabled,payments_enabled:paymentsEnabled,payments_since:paymentsSince,updated_at:new Date().toISOString()});if(error)throw error;res.json({ok:true});
 }));
 app.post('/api/calendar-push/unsubscribe',admin,route(async(req,res)=>{const {error}=await db.from('calendar_push_subscriptions').delete().eq('endpoint',String(req.body.endpoint||'')).eq('user_id',res.locals.adminUserId);if(error)throw error;res.json({ok:true});}));
 app.post('/api/calendar-push/test',admin,route(async(req,res)=>{const {data,error}=await db.from('calendar_push_subscriptions').select('*').eq('endpoint',String(req.body.endpoint||'')).eq('user_id',res.locals.adminUserId).single();if(error)throw error;await send(data.subscription,{title:'Althera · Avisos activados',body:data.payments_enabled?'Este dispositivo recibirá avisos de pagos y enlaces de Stripe.':'Este dispositivo ya puede recibir tu agenda de la mañana.',url:data.payments_enabled?'/admin/calendar?cobros=1':'/admin/calendar',tag:'althera-test'},await config());res.json({ok:true});}));
 let running=false;
 app.post('/api/calendar-push/dispatch',route(async(req,res)=>{
  // Do not initialise configuration from a public request.
  const {data:keys,error}=await db.from('calendar_push_config').select('*').eq('id',true).maybeSingle();if(error)throw error;
  const supplied=Buffer.from(req.get('authorization')||'');const expected=Buffer.from(`Bearer ${keys?.cron_secret||''}`);
  if(!keys||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return res.sendStatus(401);
  if(running)return res.status(202).json({running:true});running=true;
  try{
   const {data:subscriptions,error:subError}=await db.from('calendar_push_subscriptions').select('*');if(subError)throw subError;
   const paymentResult=await dispatchPaymentAlerts(db,(sub,payload)=>send(sub,payload,keys),isAuthorized);
   let sent=0,failed=0;
   for(const subscription of subscriptions||[]){
    if(!subscription.calendar_enabled)continue;
    const clock=localClock(new Date(),subscription.timezone);const [h,m]=subscription.reminder_time.split(':').map(Number);const delta=clock.minutes-(h*60+m);if(delta<0||delta>=60)continue;
    const {data:{user},error:userError}=await db.auth.admin.getUserById(subscription.user_id);if(userError||!user||!isAuthorized(user.id,user.email||''))continue;
    const {data:events,error:eventError}=await db.from('events').select('id,title,date,time,description').eq('date',clock.date).order('time');if(eventError)throw eventError;
    const tasks=(events||[]).filter(event=>eventVisible(event,user.id,user.email||''));if(!tasks.length)continue;
    const claim=await db.from('calendar_push_deliveries').insert({endpoint:subscription.endpoint,day:clock.date});if(claim.error){if(claim.error.code==='23505')continue;throw claim.error;}
    try{await send(subscription.subscription,{title:`Hoy · ${tasks.length} ${tasks.length===1?'tarea pendiente':'tareas pendientes'}`,body:tasks.slice(0,3).map(t=>`${String(t.time||'').slice(0,5)} ${t.title}`).join(' · ').slice(0,300),tag:`agenda-${clock.date}`},keys);sent++;}
    catch(err){failed++;const status=(err as {statusCode?:number}).statusCode;if(status===404||status===410){await db.from('calendar_push_subscriptions').delete().eq('endpoint',subscription.endpoint);}else{await db.from('calendar_push_deliveries').delete().eq('endpoint',subscription.endpoint).eq('day',clock.date);}}
   }
   return res.json({sent,failed,payments:paymentResult});
  }finally{running=false;}
 }));
}
