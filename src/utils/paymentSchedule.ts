import {stripeMethodLabel} from './stripePaymentDetails';
import type { FinanceTransaction, ClientContact } from '../types';
import { findRecurringOccurrence, getFinanceRecurrenceDate, isFinanceRecurrenceOccurrenceAllowed, toFinanceDateKey } from './financeRecurrence';
import { getStripeForecastOccurrences, type ForecastSubscription } from './stripeForecast';
export interface ScheduledPayment { id:string; scheduledDate?:string; origin?:'instaremoveai'|'bites'; excluded?:boolean; invoiceId?:string; date:string; customer:string; description:string; amount:number; currency:string; source:'stripe'|'manual'; method:string; overdue:boolean; estimated:boolean; url?:string; awaitingActivation?:boolean; transactionId?:string; subscriptionId?:string; sessionId?:string; clientId?:string; period?:string; count?:number; paymentMethod?:string; person?:string; logo?:string; state?:'paid'|'failed'|'pending'; processing?:boolean; historical?:boolean; renewable?:boolean }
export type PaymentPlan = ForecastSubscription & { estimatedAmount?:boolean; origin?:'instaremoveai'|'bites'; dashboardUrl?:string; stripePlanId?:string; billingType?:string; clientId?:string; concept?:string; customerEmail?:string };
function canRenewCheckout(tx: FinanceTransaction) {
 return tx.paymentMethod === 'stripe' && (tx.status === 'pending' || tx.status === 'failed') && Boolean(tx.stripeCheckoutSessionId) && !tx.stripeInvoiceId;
}
export function buildPaymentSchedule(transactions:FinanceTransaction[],plans:PaymentPlan[],contacts:ClientContact[],today=new Date()):ScheduledPayment[]{
 const now=toFinanceDateKey(today);const end=new Date(today.getFullYear(),today.getMonth()+12,0,12);const endKey=toFinanceDateKey(end);const result:ScheduledPayment[]=[];
 for(const source of transactions.filter(t=>t.type==='income'&&t.isRecurring&&t.paymentMethod!=='stripe')){
  const anchor=new Date(`${source.date.slice(0,10)}T12:00:00`);if(!Number.isFinite(anchor.getTime()))continue;
  for(let i=0;i<10000;i++){
   const date=getFinanceRecurrenceDate(anchor,source.recurrencePeriod,i);const key=toFinanceDateKey(date);
   if(key>endKey||!isFinanceRecurrenceOccurrenceAllowed(source,i,date))break;
   const existing=findRecurringOccurrence(source,key,transactions);
   if(existing?.status==='paid'||(!existing&&i===0&&source.status==='paid'))continue;
   const amount=Number(existing?.amount??(i===0?source.firstAmount??source.amount:source.nextAmount??source.amount));if(!Number.isFinite(amount)||amount<=0)continue;
   const customer=contacts.find(c=>c.id===source.clientId);
   result.push({id:`manual:${source.id}:${key}`,transactionId:source.id,clientId:source.clientId,period:source.recurrencePeriod,count:source.recurrenceOccurrenceCount,paymentMethod:source.paymentMethod,date:key,customer:customer?.company||customer?.name||'Sin cliente vinculado',description:source.description,amount,currency:'EUR',source:'manual',method:source.paymentMethod==='cash'?'Efectivo':source.paymentMethod==='transfer'?'Transferencia':'Cobro manual',overdue:key<now,estimated:false});
  }
 }
 for(const tx of transactions.filter(t=>t.type==='income'&&t.status==='pending'&&!t.isRecurring&&(!t.recurrenceSourceId||!transactions.some(s=>s.id===t.recurrenceSourceId&&s.isRecurring))&&t.category?.toLowerCase()!=='transferencia interna'&&!t.id.startsWith('tx_stripe_payout_'))){
  if(tx.date.slice(0,10)>endKey)continue;
  if(plans.some(p=>p.id===tx.stripePlanId||!!p.stripePlanId&&p.stripePlanId===tx.stripePlanId))continue;
  const customer=contacts.find(c=>c.id===tx.clientId);
  result.push({id:`pending:${tx.id}`,transactionId:tx.id,sessionId:tx.stripeCheckoutSessionId,clientId:tx.clientId,period:tx.recurrencePeriod,count:tx.recurrenceOccurrenceCount,paymentMethod:tx.paymentMethod,date:tx.date.slice(0,10),customer:customer?.company||customer?.name||'Cliente',description:tx.description,amount:tx.amount,currency:'EUR',source:tx.paymentMethod==='stripe'?'stripe':'manual',method:tx.paymentMethod==='stripe'?'Stripe · pendiente de activar':tx.paymentMethod==='cash'?'Efectivo':tx.paymentMethod==='card'?'Tarjeta':'Transferencia',overdue:tx.date.slice(0,10)<now,estimated:tx.paymentMethod==='stripe',awaitingActivation:tx.paymentMethod==='stripe',renewable:canRenewCheckout(tx),url:tx.stripeCheckoutUrl});
 }
 for(const plan of plans){
  if(!['active','trialing','past_due'].includes(plan.status))continue;
  const dates:Date[]=[];
  for(let m=0;m<12;m++){const month=toFinanceDateKey(new Date(today.getFullYear(),today.getMonth()+m,1,12)).slice(0,7);dates.push(...getStripeForecastOccurrences(plan,month,today,true));}
  if(plan.nextPaymentAt&&toFinanceDateKey(new Date(plan.nextPaymentAt))<now&&(!plan.paymentLimit||plan.paymentCount<plan.paymentLimit)&&(!plan.cancelAt||Date.parse(plan.nextPaymentAt)<Date.parse(plan.cancelAt))&&(!plan.endsAt||plan.nextPaymentAt.slice(0,10)<=plan.endsAt.slice(0,10)))dates.unshift(new Date(plan.nextPaymentAt));
  for(const date of dates){const key=toFinanceDateKey(date);if(!Number.isFinite(date.getTime()))continue;
   const paid=transactions.some(t=>t.type==='income'&&!t.isRecurring&&t.status==='paid'&&(t.stripePlanId===plan.id||!!plan.stripePlanId&&t.stripePlanId===plan.stripePlanId)&&(t.recurrenceScheduledDate||t.date).slice(0,10)===key);if(paid)continue;
   result.push({id:`stripe:${plan.id}:${key}`,origin:plan.origin,subscriptionId:plan.id,clientId:plan.clientId||transactions.find(t=>!!plan.stripePlanId&&t.stripePlanId===plan.stripePlanId)?.clientId,period:plan.interval==="year"?"yearly":"monthly",count:plan.paymentLimit?Math.max(1,plan.paymentLimit-plan.paymentCount):undefined,paymentMethod:"stripe",date:key,customer:plan.customerName,description:plan.concept||(plan.billingType==='installment'?'Cuota Stripe':'Suscripción Stripe'),amount:plan.amount,currency:plan.currency.toUpperCase(),source:'stripe',method:'Stripe automático',overdue:key<now,estimated:!!plan.estimatedAmount||!plan.nextPaymentAt||key!==toFinanceDateKey(new Date(plan.nextPaymentAt)),url:plan.dashboardUrl});
  }
 }
 for(const p of result){
  const plan=plans.find(plan=>plan.id===p.subscriptionId);
  p.origin ||= transactionOrigin(transactions.find(t=>t.id===p.transactionId));
  const client=resolvePaymentClient(contacts,p.clientId,plan?.customerEmail);
  if(client){p.customer=client.company||client.name;p.person=client.name;p.logo=client.avatarUrl;p.clientId=client.id;}
 }
 return result.sort((a,b)=>a.date.localeCompare(b.date)||a.customer.localeCompare(b.customer));
}
export const paymentMoney=(p:Pick<ScheduledPayment,'amount'|'currency'>)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:p.currency}).format(p.amount);

export function resolvePaymentClient(contacts:ClientContact[],id?:string,email?:string){
 const byId=id?contacts.find(c=>c.id===id):undefined;if(byId)return byId;
 const matches=email?contacts.filter(c=>c.email?.trim().toLowerCase()===email.trim().toLowerCase()):[];
 return matches.length===1?matches[0]:undefined;
}
export interface AgendaInvoice {id:string;origin?:'instaremoveai'|'bites';method?:string;processing?:boolean;transactionId?:string;subscriptionId?:string;clientId?:string;customerName:string;customerEmail?:string;description:string;date:string;amount:number;currency:string;status:'paid'|'failed'|'pending';url?:string}
export function buildMonthlyPaymentActivity(transactions:FinanceTransaction[],invoices:AgendaInvoice[],contacts:ClientContact[],plans:PaymentPlan[],today=new Date(),allHistory=false):ScheduledPayment[]{
 const now=toFinanceDateKey(today),month=now.slice(0,7),result:ScheduledPayment[]=[];
 for(const invoice of invoices){
  const date=toFinanceDateKey(new Date(invoice.date));if((!allHistory&&((date.slice(0,7)!==month&&!invoice.processing)||date>now))||invoice.amount<=0)continue;
  const plan=plans.find(p=>p.id===invoice.subscriptionId);
  const client=resolvePaymentClient(contacts,invoice.clientId||plan?.clientId,invoice.customerEmail||plan?.customerEmail);
  result.push({id:`invoice:${invoice.id}`,invoiceId:invoice.id,origin:invoice.origin||plan?.origin,subscriptionId:invoice.subscriptionId,date,customer:client?.company||client?.name||invoice.customerName,person:client?.name||invoice.customerName,logo:client?.avatarUrl,clientId:client?.id,description:invoice.description,amount:invoice.amount,currency:invoice.currency.toUpperCase(),source:'stripe',method:stripeMethodLabel(invoice.method),transactionId:invoice.transactionId,processing:invoice.processing,overdue:!invoice.processing&&invoice.status!=='paid'&&date<now,estimated:false,state:invoice.status,historical:true,url:invoice.url});
 }
 for(const tx of transactions){
  if(tx.type!=='income'||!['paid','failed','pending'].includes(tx.status)||tx.category?.trim().toLocaleLowerCase('es-ES')==='transferencia interna'||tx.id.startsWith('tx_stripe_payout_'))continue;
  if(tx.isRecurring&&tx.paymentMethod==='stripe')continue;
  const date=(tx.paidAt||tx.date).slice(0,10);if(!allHistory&&(date.slice(0,7)!==month||date>now))continue;
  if(tx.isRecurring&&transactions.some(t=>t.recurrenceSourceId===tx.id&&(t.recurrenceScheduledDate||t.date).slice(0,10)===tx.date.slice(0,10)))continue;
  if(tx.paymentMethod==='stripe'&&invoices.some(i=>i.id===tx.stripeInvoiceId||i.transactionId===tx.id))continue;
  const matchingPlan=plans.find(p=>p.id===tx.stripePlanId||!!p.stripePlanId&&p.stripePlanId===tx.stripePlanId);
  if(tx.paymentMethod==='stripe'&&result.some(p=>p.date===date&&p.amount===tx.amount&&(!!matchingPlan&&p.subscriptionId===matchingPlan.id)))continue;
  const client=resolvePaymentClient(contacts,tx.clientId);
  result.push({id:`activity:${tx.id}`,scheduledDate:tx.recurrenceScheduledDate,origin:transactionOrigin(tx),date,customer:client?.company||client?.name||'Sin cliente vinculado',person:client?.name,logo:client?.avatarUrl,clientId:tx.clientId,description:tx.description,amount:tx.amount,currency:'EUR',source:tx.paymentMethod==='stripe'?'stripe':'manual',method:tx.paymentMethod==='stripe'?'Stripe':tx.paymentMethod==='cash'?'Efectivo':tx.paymentMethod==='card'?'Tarjeta':'Transferencia',overdue:tx.status!=='paid'&&date<now,estimated:false,state:tx.status,historical:date<=now,transactionId:tx.recurrenceSourceId||tx.id,paymentMethod:tx.paymentMethod,subscriptionId:matchingPlan?.id,sessionId:tx.stripeCheckoutSessionId,renewable:canRenewCheckout(tx)&&!matchingPlan});
 }
 return result.sort((a,b)=>(a.state==='paid'?1:0)-(b.state==='paid'?1:0)||a.date.localeCompare(b.date));
}

export function transactionOrigin(tx?:FinanceTransaction):ScheduledPayment['origin'] {
 if (/^instaremoveai$/i.test(tx?.category||'') || /^instaremoveai ·/i.test(tx?.description||'')) return 'instaremoveai';
 if (/^bites$/i.test(tx?.category||'') || /^bites ·/i.test(tx?.description||'')) return 'bites';
}
export function paymentKey(p:ScheduledPayment):string {
 if(p.subscriptionId)return `cycle:${p.subscriptionId}:${p.date}`;
 if(p.transactionId)return `tx:${p.transactionId}:${p.scheduledDate||p.date}`;
 return `invoice:${p.invoiceId||p.id.replace(/[^\w.-]/g,'_')}`;
}
export function paymentCanBeExcluded(p:ScheduledPayment){return p.state!=='paid'&&!p.processing;}
export function buildPaymentMaster(payments:ScheduledPayment[],activity:ScheduledPayment[],excluded:string[]=[]):ScheduledPayment[]{
 const rows=new Map<string,ScheduledPayment>();
 for(const p of [...payments,...activity]){
  const key=paymentKey(p),old=rows.get(key);
  // Confirmed receipts take precedence over projections of the same cycle.
  if(old?.state==='paid'&&p.state!=='paid')continue;
  rows.set(key,{...old,...p,excluded:paymentCanBeExcluded(p)&&excluded.includes(key)});
 }
 return [...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.customer.localeCompare(b.customer));
}
export function groupPayments(rows:ScheduledPayment[]){
 const groups=new Map<string,{id:string;name:string;logo?:string;origin?:ScheduledPayment['origin'];payments:ScheduledPayment[]}>();
 for(const p of rows){
  const key=p.origin||p.clientId||p.customer.trim().toLowerCase();
  let group=groups.get(key);
  if(!group){group={id:key,name:p.origin==='instaremoveai'?'InstaremoveAI':p.origin==='bites'?'Bites':p.customer,logo:p.logo,origin:p.origin,payments:[]};groups.set(key,group);}
  group.payments.push(p);
 }
 return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
