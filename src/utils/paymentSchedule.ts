import type { FinanceTransaction, ClientContact } from '../types';
import { findRecurringOccurrence, getFinanceRecurrenceDate, isFinanceRecurrenceOccurrenceAllowed, toFinanceDateKey } from './financeRecurrence';
import { getStripeForecastOccurrences, type ForecastSubscription } from './stripeForecast';
export interface ScheduledPayment { id:string; date:string; customer:string; description:string; amount:number; currency:string; source:'stripe'|'manual'; method:string; overdue:boolean; estimated:boolean; url?:string; awaitingActivation?:boolean }
export type PaymentPlan = ForecastSubscription & { dashboardUrl?:string; stripePlanId?:string; billingType?:string };
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
   result.push({id:`manual:${source.id}:${key}`,date:key,customer:customer?.company||customer?.name||'Sin cliente vinculado',description:source.description,amount,currency:'EUR',source:'manual',method:source.paymentMethod==='cash'?'Efectivo':source.paymentMethod==='transfer'?'Transferencia':'Cobro manual',overdue:key<now,estimated:false});
  }
 }
 for(const tx of transactions.filter(t=>t.id.startsWith('agenda_')&&t.type==='income'&&t.paymentMethod==='stripe'&&t.status==='pending'&&!t.isRecurring)){
  if(plans.some(p=>p.id===tx.stripePlanId||!!p.stripePlanId&&p.stripePlanId===tx.stripePlanId))continue;
  const customer=contacts.find(c=>c.id===tx.clientId);
  result.push({id:`pending:${tx.id}`,date:tx.date.slice(0,10),customer:customer?.company||customer?.name||'Cliente',description:tx.description,amount:tx.amount,currency:'EUR',source:'stripe',method:'Stripe · pendiente de activar',overdue:false,estimated:true,awaitingActivation:true,url:tx.stripeCheckoutUrl});
 }
 for(const plan of plans){
  if(!['active','trialing','past_due'].includes(plan.status))continue;
  const dates:Date[]=[];
  for(let m=0;m<12;m++){const month=toFinanceDateKey(new Date(today.getFullYear(),today.getMonth()+m,1,12)).slice(0,7);dates.push(...getStripeForecastOccurrences(plan,month,today,true));}
  if(plan.nextPaymentAt&&toFinanceDateKey(new Date(plan.nextPaymentAt))<now&&(!plan.paymentLimit||plan.paymentCount<plan.paymentLimit)&&(!plan.cancelAt||Date.parse(plan.nextPaymentAt)<Date.parse(plan.cancelAt))&&(!plan.endsAt||plan.nextPaymentAt.slice(0,10)<=plan.endsAt.slice(0,10)))dates.unshift(new Date(plan.nextPaymentAt));
  for(const date of dates){const key=toFinanceDateKey(date);if(!Number.isFinite(date.getTime()))continue;
   const paid=transactions.some(t=>t.type==='income'&&!t.isRecurring&&t.status==='paid'&&(t.stripePlanId===plan.id||!!plan.stripePlanId&&t.stripePlanId===plan.stripePlanId)&&(t.recurrenceScheduledDate||t.date).slice(0,10)===key);if(paid)continue;
   result.push({id:`stripe:${plan.id}:${key}`,date:key,customer:plan.customerName,description:plan.billingType==='installment'?'Cuota Stripe':'Suscripción Stripe',amount:plan.amount,currency:plan.currency.toUpperCase(),source:'stripe',method:'Stripe automático',overdue:key<now,estimated:!plan.nextPaymentAt||key!==toFinanceDateKey(new Date(plan.nextPaymentAt)),url:plan.dashboardUrl});
  }
 }
 return result.sort((a,b)=>a.date.localeCompare(b.date)||a.customer.localeCompare(b.customer));
}
export const paymentMoney=(p:Pick<ScheduledPayment,'amount'|'currency'>)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:p.currency}).format(p.amount);
