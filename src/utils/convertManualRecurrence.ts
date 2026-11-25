import type {FinanceTransaction} from '../types';
import {toFinanceDateKey} from './financeRecurrence';
export function convertManualRecurrence(source:FinanceTransaction,date:string,count:string,now=new Date(),period:FinanceTransaction['recurrencePeriod']='monthly'):FinanceTransaction {
 if(source.paymentMethod==='stripe'||source.isRecurring||source.recurrenceSourceId)throw Error('Solo puedes convertir un cobro manual que no sea recurrente.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<toFinanceDateKey(now))throw Error('Elige el primer vencimiento desde hoy.');
 const months=count?Number(count):undefined;
 if(months!==undefined&&(!Number.isInteger(months)||months<1||months>120))throw Error('Elige entre 1 y 120 pagos o sin límite.');
 return {...source,id:source.status==='paid'?`${source.id}_recurring`:source.id,date,status:'pending',paidAt:undefined,isRecurring:true,recurrencePeriod:period,recurrenceOccurrenceCount:months,recurrenceEndDate:undefined,firstAmount:source.amount,nextAmount:source.amount,invoiceId:source.status==='paid'?undefined:source.invoiceId,excludedFromLedger:false,isInitialSale:false,stripePlanId:undefined,stripeCheckoutUrl:undefined,stripeCheckoutSessionId:undefined,stripeInvoiceId:undefined};
}
