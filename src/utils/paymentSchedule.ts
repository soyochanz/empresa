import type { FinanceTransaction, ClientContact } from '../types';
import { findRecurringOccurrence, getFinanceRecurrenceDate, isFinanceRecurrenceOccurrenceAllowed, toFinanceDateKey } from './financeRecurrence';
import { getStripeForecastOccurrences, type ForecastSubscription } from './stripeForecast';
export interface ScheduledPayment { id:string; date:string; customer:string; description:string; amount:number; currency:string; source:'stripe'|'manual'; method:string; overdue:boolean; estimated:boolean; url?:string; awaitingActivation?:boolean; transactionId?:string; subscriptionId?:string; sessionId?:string; clientId?:string; period?:string; count?:number; paymentMethod?:string; person?:string; logo?:string; state?:'paid'|'failed'|'pending'; historical?:boolean; renewable?:boolean }
export type PaymentPlan = ForecastSubscription & { dashboardUrl?:string; stripePlanId?:string; billingType?:string; clientId?:string; concept?:string; customerEmail?:string };
function canRenewCheckout(tx: FinanceTransaction) {
 return tx.paymentMethod === 'stripe' && (tx.status === 'pending' || tx.status === 'failed') && Boolean(tx.stripeCheckoutSessionId) && !tx.stripeInvoiceId;
}
export function buildPaymentSchedule(transactions:FinanceTransaction[],plans:PaymentPlan[],contacts:ClientContact[],today=new Date()):ScheduledPayment[]{
 const now=toFinanceDateKey(today);const end=new Date(today.getFullYear(),today.getMonth()+12,0,12);const endKey=toFinanceDateKey(end);const result:ScheduledPayment[]=[];
 for(const source of transactions.filter(t=>t.type==='income'&&t.isRecurring&&t.paymentMethod!=='stripe')){
  if(!contacts.some(c=>c.id===source.clientId))continue;
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
 for(const tx of transactions.filter(t=>t.id.startsWith('agenda_')&&t.type==='income'&&t.paymentMethod==='stripe'&&t.status==='pending'&&!t.isRecurring)){
  if(plans.some(p=>p.id===tx.stripePlanId||!!p.stripePlanId&&p.stripePlanId===tx.stripePlanId))continue;
  const customer=contacts.find(c=>c.id===tx.clientId);
  result.push({id:`pending:${tx.id}`,transactionId:tx.id,sessionId:tx.stripeCheckoutSessionId,clientId:tx.clientId,period:tx.recurrencePeriod,count:tx.recurrenceOccurrenceCount,paymentMethod:"stripe",date:tx.date.slice(0,10),customer:customer?.company||customer?.name||'Cliente',description:tx.description,amount:tx.amount,currency:'EUR',source:'stripe',method:'Stripe · pendiente de activar',overdue:false,estimated:true,awaitingActivation:true,renewable:canRenewCheckout(tx),url:tx.stripeCheckoutUrl});
 }
 for(const plan of plans){
  if(!['active','trialing','past_due'].includes(plan.status))continue;
  const dates:Date[]=[];
  for(let m=0;m<12;m++){const month=toFinanceDateKey(new Date(today.getFullYear(),today.getMonth()+m,1,12)).slice(0,7);dates.push(...getStripeForecastOccurrences(plan,month,today,true));}
  if(plan.nextPaymentAt&&toFinanceDateKey(new Date(plan.nextPaymentAt))<now&&(!plan.paymentLimit||plan.paymentCount<plan.paymentLimit)&&(!plan.cancelAt||Date.parse(plan.nextPaymentAt)<Date.parse(plan.cancelAt))&&(!plan.endsAt||plan.nextPaymentAt.slice(0,10)<=plan.endsAt.slice(0,10)))dates.unshift(new Date(plan.nextPaymentAt));
  for(const date of dates){const key=toFinanceDateKey(date);if(!Number.isFinite(date.getTime()))continue;
   const paid=transactions.some(t=>t.type==='income'&&!t.isRecurring&&t.status==='paid'&&(t.stripePlanId===plan.id||!!plan.stripePlanId&&t.stripePlanId===plan.stripePlanId)&&(t.recurrenceScheduledDate||t.date).slice(0,10)===key);if(paid)continue;
   result.push({id:`stripe:${plan.id}:${key}`,subscriptionId:plan.id,clientId:plan.clientId||transactions.find(t=>!!plan.stripePlanId&&t.stripePlanId===plan.stripePlanId)?.clientId,period:plan.interval==="year"?"yearly":"monthly",count:plan.paymentLimit?Math.max(1,plan.paymentLimit-plan.paymentCount):undefined,paymentMethod:"stripe",date:key,customer:plan.customerName,description:plan.concept||(plan.billingType==='installment'?'Cuota Stripe':'Suscripción Stripe'),amount:plan.amount,currency:plan.currency.toUpperCase(),source:'stripe',method:'Stripe automático',overdue:key<now,estimated:!plan.nextPaymentAt||key!==toFinanceDateKey(new Date(plan.nextPaymentAt)),url:plan.dashboardUrl});
  }
 }
 for(const p of result){
  const plan=plans.find(plan=>plan.id===p.subscriptionId);
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
export interface AgendaInvoice {id:string;subscriptionId?:string;clientId?:string;customerName:string;customerEmail?:string;description:string;date:string;amount:number;currency:string;status:'paid'|'failed'|'pending';url?:string}
export function buildMonthlyPaymentActivity(transactions:FinanceTransaction[],invoices:AgendaInvoice[],contacts:ClientContact[],plans:PaymentPlan[],today=new Date()):ScheduledPayment[]{
 const now=toFinanceDateKey(today),month=now.slice(0,7),result:ScheduledPayment[]=[];
 for(const invoice of invoices){
  const date=toFinanceDateKey(new Date(invoice.date));if(date.slice(0,7)!==month||date>now||invoice.amount<=0)continue;
  const plan=plans.find(p=>p.id===invoice.subscriptionId);
  const client=resolvePaymentClient(contacts,invoice.clientId||plan?.clientId,invoice.customerEmail||plan?.customerEmail);
  result.push({id:`invoice:${invoice.id}`,subscriptionId:invoice.subscriptionId,date,customer:client?.company||client?.name||invoice.customerName,person:client?.name||invoice.customerName,logo:client?.avatarUrl,clientId:client?.id,description:invoice.description,amount:invoice.amount,currency:invoice.currency.toUpperCase(),source:'stripe',method:'Stripe',overdue:invoice.status!=='paid'&&date<now,estimated:false,state:invoice.status,historical:true,url:invoice.url});
 }
 for(const tx of transactions){
  if(tx.type!=='income'||!['paid','failed','pending'].includes(tx.status)||tx.category?.trim().toLocaleLowerCase('es-ES')==='transferencia interna'||tx.id.startsWith('tx_stripe_payout_'))continue;
  if(!contacts.some(c=>c.id===tx.clientId))continue;
  if(tx.isRecurring&&tx.paymentMethod==='stripe')continue;
  const date=(tx.paidAt||tx.date).slice(0,10);if(date.slice(0,7)!==month||date>now)continue;
  if(tx.isRecurring&&transactions.some(t=>t.recurrenceSourceId===tx.id&&(t.recurrenceScheduledDate||t.date).slice(0,10)===tx.date.slice(0,10)))continue;
  if(tx.paymentMethod==='stripe'&&invoices.some(i=>i.id===tx.stripeInvoiceId))continue;
  const matchingPlan=plans.find(p=>p.id===tx.stripePlanId||!!p.stripePlanId&&p.stripePlanId===tx.stripePlanId);
  if(tx.paymentMethod==='stripe'&&result.some(p=>p.date===date&&p.amount===tx.amount&&(!!matchingPlan&&p.subscriptionId===matchingPlan.id)))continue;
  const client=resolvePaymentClient(contacts,tx.clientId);
  result.push({id:`activity:${tx.id}`,date,customer:client?.company||client?.name||'Sin cliente vinculado',person:client?.name,logo:client?.avatarUrl,clientId:tx.clientId,description:tx.description,amount:tx.amount,currency:'EUR',source:tx.paymentMethod==='stripe'?'stripe':'manual',method:tx.paymentMethod==='stripe'?'Stripe':tx.paymentMethod==='cash'?'Efectivo':'Transferencia',overdue:tx.status!=='paid'&&date<now,estimated:false,state:tx.status,historical:true,transactionId:tx.recurrenceSourceId||tx.id,subscriptionId:matchingPlan?.id,sessionId:tx.stripeCheckoutSessionId,renewable:canRenewCheckout(tx)&&!matchingPlan});
 }
 return result.sort((a,b)=>(a.state==='paid'?1:0)-(b.state==='paid'?1:0)||a.date.localeCompare(b.date));
}
