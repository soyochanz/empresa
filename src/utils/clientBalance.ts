import type {FinanceTransaction,Invoice} from '../types';
import {reconcileInvoicePayments} from './invoiceAttachment';
// Recurrence templates are schedules, not unpaid receipts. A failed checkout stays
// payable unless a confirmed receipt explicitly covers the same invoice/cycle.
export function isOpenClientCharge(tx:FinanceTransaction,transactions:FinanceTransaction[],invoices:Invoice[]=[],today=new Date().toLocaleDateString('sv-SE')) {
 if(tx.type!=='income'||tx.isRecurring||tx.status==='paid'||tx.date.slice(0,10)>today)return false;
 const invoice=invoices.find(inv=>inv.id===tx.invoiceId||inv.items.some(i=>i.pendingTxId===tx.id||i.id===tx.id));
 if(invoice&&reconcileInvoicePayments(invoice,transactions).status==='paid')return false;
 // A unique replacement receipt for an expired checkout on the same due date.
 if(tx.status==='failed'&&tx.paymentMethod==='stripe'&&/enlace.*caducado/i.test(tx.description)&&tx.clientId){
  const service=(text:string)=>/\bseo\b/i.test(text)?'seo':text.toLowerCase().replace(/\([^)]*\)/g,'').trim();
  const same=(row:FinanceTransaction)=>row.clientId===tx.clientId&&row.date.slice(0,10)===tx.date.slice(0,10)&&Math.abs(row.amount-tx.amount)<.005&&service(row.description)===service(tx.description)&&!row.isRecurring;
  const open=transactions.filter(row=>same(row)&&row.status!=='paid');
  const receipts=transactions.filter(row=>same(row)&&row.status==='paid');
  if(open.length===1&&receipts.length===1)return false;
 }
 return true;
}
export function clientHasBalance(transactions:FinanceTransaction[],invoices:Invoice[]) {
 return transactions.some(t=>isOpenClientCharge(t,transactions,invoices))||invoices.some(i=>i.status!=='draft'&&reconcileInvoicePayments(i,transactions).status!=='paid');
}
