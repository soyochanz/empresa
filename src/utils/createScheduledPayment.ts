import type {ClientContact, FinanceTransaction} from '../types';
import {toFinanceDateKey} from './financeRecurrence';
export interface PaymentDraft {clientId:string;concept:string;amount:string;date:string;method:'stripe'|'transfer'|'cash';period:'monthly'|'yearly'|'weekly';count:string;scheduled:boolean}
export function prepareScheduledPayment(d:PaymentDraft,contacts:ClientContact[],id:string,now=new Date()){
 const client=contacts.find(c=>c.id===d.clientId);
 if(!client)throw Error('Selecciona un cliente del CRM.');
 const amount=Number(d.amount);
 if(!Number.isFinite(amount)||amount<=0||amount>1000000||Math.abs(amount*100-Math.round(amount*100))>0.000001)throw Error('Introduce un importe positivo con un máximo de dos decimales.');
 if(!d.concept.trim()||d.concept.trim().length>180)throw Error('Introduce un concepto de hasta 180 caracteres.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(Date.parse(d.date))||new Date(d.date).toISOString().slice(0,10)!==d.date)throw Error('Introduce una fecha válida.');
 const count=d.count?Number(d.count):undefined;
 if(count!==undefined&&(!Number.isInteger(count)||count<1||count>120))throw Error('El número de cuotas debe estar entre 1 y 120.');
 if(d.method==='stripe'&&!client.email?.trim())throw Error('Añade primero un email al cliente en el CRM.');
 if(d.method==='stripe'&&d.period==='weekly')throw Error('Stripe admite aquí recurrencias mensuales o anuales.');
 if(d.method==='stripe'&&d.scheduled&&Date.parse(d.date+'T12:00:00Z')<now.getTime()+48*3600000)throw Error('El primer cargo Stripe debe programarse con al menos 48 horas de antelación.');
 const transaction:FinanceTransaction={id,type:'income',category:'Mensualidad',description:d.concept.trim(),amount,date:d.method==='stripe'&&!d.scheduled?toFinanceDateKey(now):d.date,isRecurring:d.method!=='stripe',recurrencePeriod:d.period,recurrenceOccurrenceCount:count,status:'pending',paymentMethod:d.method,clientId:client.id,isInitialSale:false,stripePlanId:d.method==='stripe'?`agenda_${id}`:undefined};
 const checkout=d.method==='stripe'?{agendaRequestId:id,clientId:client.id,clientName:client.company||client.name,clientEmail:client.email.trim(),amount:amount.toFixed(2),interval:d.period==='yearly'?'year':'month',billingType:'subscription',recurrenceCount:count?String(count):'',concept:transaction.description,pendingTxId:id,stripePlanId:transaction.stripePlanId,firstPaymentDate:d.scheduled?d.date:''}:undefined;
 return {transaction,checkout};
}
