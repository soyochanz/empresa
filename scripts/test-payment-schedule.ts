import assert from 'node:assert/strict';
import {buildMonthlyPaymentActivity,buildPaymentSchedule} from '../src/utils/paymentSchedule';
const today=new Date(2026,10,3,12);
const contacts:any=[{id:'client',name:'Ana',company:'Negocio'}];
const source:any={clientId:'client',id:'manual',type:'income',category:'SEO',description:'SEO mensual',date:'2026-10-31',amount:80,firstAmount:40,nextAmount:80,isRecurring:true,status:'paid',paymentMethod:'transfer',recurrenceOccurrenceCount:3};
let rows=buildPaymentSchedule([source],[],contacts,today);
assert.deepEqual(rows.map(r=>r.date),['2026-11-30','2026-12-31']);assert.equal(rows[0].amount,80);
const paid:any={...source,id:'paid',isRecurring:false,recurrenceSourceId:'manual',recurrenceScheduledDate:'2026-11-30',date:'2026-12-01',status:'paid'};
assert.equal(buildPaymentSchedule([source,paid],[],contacts,today).length,1);
const pending={...paid,status:'pending',amount:65};rows=buildPaymentSchedule([source,pending],[],contacts,today);assert.equal(rows.length,2);assert.equal(rows[0].amount,65);
rows=buildPaymentSchedule([{...source,date:'2026-09-03',recurrenceOccurrenceCount:2}],[],contacts,today);assert.equal(rows[0].overdue,true);
assert.equal(buildPaymentSchedule([{...source,paymentMethod:'stripe'}],[],contacts,today).length,0);
const stripe:any={id:'sub',customerName:'Stripe client',amount:49,currency:'usd',status:'active',interval:'month',intervalCount:1,nextPaymentAt:'2026-11-05T12:00:00',lastPaidAt:null,paymentLimit:2,paymentCount:0,endsAt:null};
rows=buildPaymentSchedule([], [stripe],contacts,today);assert.equal(rows.length,2);assert.equal(rows[0].currency,'USD');assert.equal(rows[0].estimated,false);assert.equal(rows[1].estimated,true);
assert.equal(buildPaymentSchedule([],[{...stripe,status:'canceled'}],contacts,today).length,0);
assert.equal(buildPaymentSchedule([],[{...stripe,cancelAt:'2026-12-01T00:00:00Z'}],contacts,today).length,1);
assert.equal(buildPaymentSchedule([{...paid,stripePlanId:'sub',date:'2026-11-05',recurrenceScheduledDate:undefined}],[stripe],contacts,today).length,1);
console.log('Payment schedule: manual cycles, overdue, end-of-month, paid deduplication, Stripe cancellation, installment limits and USD preserved.');

assert.equal(buildPaymentSchedule([{...source,clientId:undefined}],[],contacts,today).length,0);

const checkout = {...source,id:'agenda_open',status:'pending',date:'2026-11-03',isRecurring:false,paymentMethod:'stripe',stripeCheckoutSessionId:'cs_open'};
assert.equal(buildPaymentSchedule([checkout],[],contacts,today)[0].renewable,true);
for(const status of ['pending','failed','paid']){
 const [row]=buildMonthlyPaymentActivity([{...checkout,status}],[],contacts,[],today);
 assert.equal(row.renewable,status!=='paid');
}
assert.equal(buildPaymentSchedule([{...checkout,stripeInvoiceId:'in_existing'}],[],contacts,today)[0].renewable,false);

const debit={id:'in_sepa',transactionId:checkout.id,clientId:'client',customerName:'Negocio',description:'SEO',date:'2026-10-31T12:00:00Z',amount:80,currency:'eur',status:'pending' as const,processing:true,method:'sepa_debit'};
const [processing,...duplicates]=buildMonthlyPaymentActivity([checkout],[debit],contacts,[],today);
assert.equal(processing.method,'Stripe · Domiciliación SEPA');
assert.equal(processing.processing,true);
assert.equal(processing.overdue,false);
assert.equal(duplicates.length,0);
assert.equal(buildMonthlyPaymentActivity([],[{...debit,date:'2026-11-03',method:'card',processing:false,status:'paid'}],contacts,[],today)[0].method,'Stripe · Tarjeta');
