import assert from 'node:assert/strict';
import {buildPaymentSchedule,buildMonthlyPaymentActivity,buildPaymentMaster,paymentKey,groupPayments,type ScheduledPayment} from '../src/utils/paymentSchedule';
import {adaptBitesPayments} from '../src/utils/bitesPayments';
const today=new Date(2026,10,18,12);
const manual:any={id:'oneoff',type:'income',status:'pending',amount:150,date:'2026-11-20',category:'SEO',description:'SEO',paymentMethod:'transfer'};
const projection=buildPaymentSchedule([manual],[],[],today);
assert.equal(projection.length,1); // unlinked CRM and nonrecurring payments stay visible
const activity=buildMonthlyPaymentActivity([manual],[],[],[],today,true);
let rows=buildPaymentMaster(projection,activity);assert.equal(rows.length,1);assert.equal(rows[0].amount,150);
const key=paymentKey(rows[0]);
rows=buildPaymentMaster(projection,activity,[key]);assert.equal(rows.filter(p=>!p.excluded).length,0);
const receipt={...activity[0],state:'paid' as const};
rows=buildPaymentMaster(projection,[receipt],[key]);assert.equal(rows[0].excluded,false);assert.equal(rows[0].state,'paid');
rows=buildPaymentMaster(projection,[{...activity[0],processing:true}],[key]);assert.equal(rows[0].excluded,false);
assert.equal(buildPaymentMaster(projection,activity,[])[0].excluded,false);
const insta:ScheduledPayment={...receipt,origin:'instaremoveai',id:'i1',transactionId:'i1',customer:'A',currency:'USD'};
const groups=groupPayments([insta,{...insta,id:'i2',transactionId:'i2',customer:'B'},receipt]);assert.equal(groups.length,2);assert.equal(groups.find(g=>g.name==='InstaremoveAI')?.payments.length,2);
const transfer={...manual,id:'internal',category:'Transferencia interna',status:'paid'};
assert.equal(buildMonthlyPaymentActivity([transfer],[],[],[],today,true).length,0);
const old={...manual,status:'paid',date:'2026-09-01'};
assert.equal(buildMonthlyPaymentActivity([old],[],[],[],today,true).length,1);
const bites=adaptBitesPayments({accounts:[{id:'a',stripeSubscriptionId:'sub_b',subscriptionStatus:'active',subscriptionCurrentPeriodEnd:'2026-12-01',name:'B'}],payments:[]},[]);
assert.equal(bites.unpriced,1);assert.equal(bites.plans.length,0); // never invent prices
console.log('Master list: one-off visibility, deduplication, exclusion/restoration, paid and processing protection, product grouping, currency and history OK');
