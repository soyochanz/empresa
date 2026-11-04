import type Stripe from 'stripe';
import type {SupabaseClient} from '@supabase/supabase-js';
const id=(value:any)=>typeof value==='string'?value:value?.id;
export function paymentAlert(event:Stripe.Event){
 const item=event.data.object as any;
 if(item.metadata?.althera_deleted==='true'||item.metadata?.althera_replaced==='true')return null;
 let state='',key='',amount=0;
 const invoiceId=id(item.invoice);
 if((event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded')&&item.payment_status==='paid'&&item.amount_total>0){state='Pago recibido';key=`paid:${invoiceId||item.id}`;amount=item.amount_total;}
 else if((event.type==='invoice.paid'||event.type==='invoice.payment_succeeded')&&item.status==='paid'&&item.amount_paid>0){state='Pago recibido';key=`paid:${item.id}`;amount=item.amount_paid;}
 else if(event.type==='invoice.payment_failed'){state='Pago fallido';key=`failed:${item.id}:${item.attempt_count||1}`;amount=item.amount_due;}
 else if(event.type==='checkout.session.async_payment_failed'){state='Pago fallido';key=invoiceId?`failed:${invoiceId}:1`:`failed:${item.id}`;amount=item.amount_total;}
 else if(event.type==='checkout.session.expired'&&item.status==='expired'){state='Enlace caducado';key=`expired:${item.id}`;amount=item.amount_total;}
 else return null;
 const money=Number.isFinite(amount)?new Intl.NumberFormat('es-ES',{style:'currency',currency:item.currency||'eur'}).format(amount/100):'';
 return {key,title:`Althera · ${state}`,body:[item.metadata?.clientName||item.customer_details?.name||item.customer_name||'Cliente',money,item.metadata?.concept||item.description||''].filter(Boolean).join(' · ').slice(0,250),tag:`payment-${key}`,url:'/admin/calendar?cobros=1'};
}
export async function queuePaymentAlert(db:SupabaseClient,event:Stripe.Event,stripe:Stripe){
 const supported=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','invoice.paid','invoice.payment_succeeded','invoice.payment_failed','payment_intent.payment_failed'];
 if(!supported.includes(event.type))return;
 let normalized=event;let item=event.data.object as any;
 if(event.type==='payment_intent.payment_failed'){
  // Subscription failures are covered by invoice.payment_failed. Resolve one-off Checkout ownership.
  if(item.invoice||item.last_payment_error?.payment_method?.type!=='card')return;
  const sessions=await stripe.checkout.sessions.list({payment_intent:item.id,limit:1});
  const session=sessions.data[0];if(!session||session.mode==='subscription'||session.payment_status==='paid')return;
  normalized={...event,type:'checkout.session.async_payment_failed',data:{object:{...session,id:`${session.id}:${event.id}`}}} as Stripe.Event;item=normalized.data.object;
 }
 if(event.type.startsWith('invoice.')){
  const subId=id(item.parent?.subscription_details?.subscription)||id(item.subscription);
  const subscription=subId?await stripe.subscriptions.retrieve(subId):null;
  item={...item,metadata:{...subscription?.metadata,...item.parent?.subscription_details?.metadata,...item.subscription_details?.metadata,...item.metadata}};
  if(event.type==='invoice.payment_failed'){
   const latest=await stripe.invoices.retrieve(item.id);if(latest.status==='paid'||latest.status==='void')return;
  }
  normalized={...event,data:{object:item}} as Stripe.Event;
 }
 // This Stripe account also serves other products. Notify only Althera CRM/website requests.
 if(!item.metadata?.clientId&&!item.metadata?.pendingTxId&&!item.metadata?.webOfferId&&!item.metadata?.stripePlanId)return;
 const payload=paymentAlert(normalized);if(!payload)return;
 const {data,error}=await db.from('calendar_push_subscriptions').select('endpoint,user_id,payments_since').eq('payments_enabled',true);if(error)throw error;
 // Only changes occurring after the device opted in, never a replay of old history.
 const rows=(data||[]).filter(s=>s.payments_since&&event.created>=Math.floor(Date.parse(s.payments_since)/1000)).map(s=>({notification_key:payload.key,endpoint:s.endpoint,user_id:s.user_id,payload}));
 if(!rows.length)return;
 const result=await db.from('payment_push_deliveries').upsert(rows,{onConflict:'notification_key,endpoint',ignoreDuplicates:true});if(result.error)throw result.error;
}
export async function dispatchPaymentAlerts(db:SupabaseClient,send:(sub:any,payload:any)=>Promise<unknown>,authorized:(id:string,email:string)=>boolean){
 const {data:jobs,error}=await db.rpc('claim_payment_push_deliveries');if(error)throw error;
 let sent=0,failed=0;
 for(const job of jobs||[]){
  try{
   const {data:sub,error:subError}=await db.from('calendar_push_subscriptions').select('*').eq('endpoint',job.endpoint).eq('user_id',job.user_id).maybeSingle();if(subError)throw subError;
   const {data:{user},error:userError}=await db.auth.admin.getUserById(job.user_id);if(userError)throw userError;
   if(sub?.payments_enabled&&user&&authorized(user.id,user.email||'')){await send(sub.subscription,job.payload);sent++;}
   const result=await db.from('payment_push_deliveries').update({sent_at:new Date().toISOString(),locked_until:null}).eq('id',job.id);if(result.error)throw result.error;
  }catch(error){failed++;const status=(error as any).statusCode;if(status===404||status===410){await db.from('calendar_push_subscriptions').delete().eq('endpoint',job.endpoint);}else{await db.from('payment_push_deliveries').update({locked_until:new Date(Date.now()+60000*Math.min(job.attempts,60)).toISOString()}).eq('id',job.id);}}
 }
 return {sent,failed};
}
