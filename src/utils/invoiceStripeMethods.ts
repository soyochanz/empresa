import {authenticatedFetch} from './authenticatedFetch';
import type {Invoice,FinanceTransaction} from '../types';
import type {StripePaymentDetail} from './stripePaymentDetails';
export async function invoiceStripeMethods(invoice:Invoice,transactions:FinanceTransaction[]):Promise<StripePaymentDetail[]>{
 const linked=transactions.filter(t=>t.invoiceId===invoice.id||invoice.items.some(i=>i.id===t.id||i.pendingTxId===t.id));
 if(!linked.some(t=>t.paymentMethod==='stripe')&&!invoice.items.some(i=>i.paymentMethod==='stripe'))return [];
 try{const response=await authenticatedFetch('/api/stripe/finance-overview');if(!response.ok)return [];const data=await response.json();return Array.isArray(data.paymentDetails)?data.paymentDetails:[];}catch{return [];}
}
