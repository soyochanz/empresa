import assert from 'node:assert/strict';
import {buildMonthlyPaymentActivity,buildPaymentSchedule,resolvePaymentClient} from '../src/utils/paymentSchedule';
const now=new Date('2026-11-03T12:00:00');
const contacts:any=[{id:'c',company:'El Negocio',name:'Ana',email:'ana@example.com',avatarUrl:'/logo.png'}];
const plans:any=[{id:'sub1',clientId:'c',stripePlanId:'plan1',customerName:'Nombre legal',status:'active',amount:50,currency:'eur',interval:'month',intervalCount:1,nextPaymentAt:'2026-11-10T12:00:00',paymentCount:1,paymentLimit:null}];
const scheduled=buildPaymentSchedule([],plans,contacts,now)[0];assert.equal(scheduled.customer,'El Negocio');assert.equal(scheduled.person,'Ana');assert.equal(scheduled.logo,'/logo.png');
assert.equal(resolvePaymentClient(contacts,undefined,' ANA@EXAMPLE.COM ')?.id,'c');assert.equal(resolvePaymentClient([...contacts,...contacts],undefined,'ana@example.com'),undefined);
const invoices:any=[{id:'in1',subscriptionId:'sub1',customerName:'Ana',customerEmail:'ana@example.com',date:'2026-11-02T12:00:00',amount:50,currency:'eur',status:'paid',description:'SEO'},{id:'in2',subscriptionId:'sub2',clientId:'c',customerName:'Ana',date:'2026-11-01T12:00:00',amount:50,currency:'eur',status:'failed',description:'Web'},{id:'old',date:'2026-10-31T12:00:00',amount:50,currency:'eur',status:'paid'}];
const tx:any=[{id:'tx1',type:'income',date:'2026-11-02',status:'paid',amount:50,paymentMethod:'stripe',stripeInvoiceId:'in1',clientId:'c'},{id:'manual',type:'income',date:'2026-11-01',status:'paid',amount:75,paymentMethod:'cash',clientId:'c',description:'Servicio'},{id:'pending',type:'income',date:'2026-11-02',status:'pending',amount:80,paymentMethod:'transfer',clientId:'c',description:'Servicio'}];
const activity=buildMonthlyPaymentActivity(tx,invoices,contacts,plans,now);
assert.equal(activity.length,4);assert.equal(activity[0].state,'failed');assert.equal(activity.filter(p=>p.state==='paid').length,2);assert.equal(activity.every(p=>p.date.startsWith('2026-11')),true);assert.equal(activity.find(p=>p.id==='invoice:in1')?.customer,'El Negocio');
assert.equal(buildMonthlyPaymentActivity([{...tx[0],stripeInvoiceId:undefined,stripePlanId:'plan1'}],invoices,contacts,plans,now).length,2);
console.log('Monthly activity: business identity, email resolution, paid/failed/pending, month boundary and Stripe deduplication passed.');

assert.equal(buildMonthlyPaymentActivity([{...tx[1],id:'tx_stripe_payout_123',category:'Transferencia interna'}],[],contacts,plans,now).length,0);

assert.equal(buildMonthlyPaymentActivity([{...tx[1],id:'unlinked',clientId:undefined}],[],contacts,plans,now).length,0);
const expired:any={id:'expired',type:'income',date:'2026-11-02',status:'failed',amount:97,paymentMethod:'stripe',stripeCheckoutSessionId:'cs_expired',clientId:'c',description:'SEO (Enlace de pago caducado)'};
const renewedCandidate=buildMonthlyPaymentActivity([expired],[],contacts,plans,now)[0];
assert.equal(renewedCandidate.renewable,true);
assert.equal(renewedCandidate.sessionId,'cs_expired');
for(const patch of [{status:'paid'},{stripeCheckoutSessionId:undefined},{stripeInvoiceId:'in_failed'},{stripePlanId:'plan1'}]){
 assert.equal(Boolean(buildMonthlyPaymentActivity([{...expired,...patch}],[],contacts,plans,now)[0]?.renewable),false);
}
console.log('Renewal: expired checkout eligible; paid receipts, invoice failures, active subscriptions and missing sessions excluded.');
