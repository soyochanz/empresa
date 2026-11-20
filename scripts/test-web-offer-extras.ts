import assert from 'node:assert/strict';
import {addonCheckout,addonSubscriptions} from '../api/webOfferAddons';
const row={id:'web1',stripe_customer_id:'cus_usd',stripe_subscription_id:'sub_usd',email:'owner@example.com',business_name:'Example'};
let created:any;let calls=0;let subs:any[]=[];let sessions:any[]=[];let base:any={status:'active'};let overflow=false;
const stripe:any={subscriptions:{retrieve:async()=>base,list:async(p:any)=>{assert.equal(p.customer,'cus_usd');return {data:subs,has_more:overflow};}},checkout:{sessions:{list:async(p:any)=>{assert.equal(p.customer,'cus_usd');return {data:sessions};},create:async(p:any)=>{created=p;calls++;return {id:'cs_extra',url:'https://checkout.stripe.com/test'};}}}};

for(const [id,amount] of [['seo-pro',12000],['hosting-premium',1500]] as const){
 await addonCheckout(stripe,row,id,'https://example.com');assert.equal(created.customer,'cus_usd');assert.equal(created.line_items[0].price_data.currency,'usd');assert.equal(created.line_items[0].price_data.unit_amount,amount);assert.equal(created.line_items[0].price_data.recurring.interval,'month');assert.equal(created.subscription_data.metadata.webOfferAddon,id);
}

await assert.rejects(()=>addonCheckout(stripe,row,'invalid','https://example.com'));
const n=calls;sessions=[{id:'cs_existing',status:'open',url:'https://checkout.stripe.com/existing',metadata:{webOfferId:'web1',webOfferAddon:'seo-pro'}}];assert.deepEqual(await addonCheckout(stripe,row,'seo-pro','https://example.com'),{url:sessions[0].url});assert.equal(calls,n);
subs=[{id:'sub_extra',status:'past_due',metadata:{webOfferId:'web1',webOfferAddon:'seo-pro'}}];await assert.rejects(()=>addonCheckout(stripe,row,'seo-pro','https://example.com'),/ya está contratado/);
subs=[];sessions=[{status:'complete',subscription:'sub_pending',metadata:{webOfferId:'web1',webOfferAddon:'seo-pro'}}];await assert.rejects(()=>addonCheckout(stripe,row,'seo-pro','https://example.com'),/confirmando tu pago/);
base={status:'past_due'};await assert.rejects(()=>addonCheckout(stripe,row,'seo-pro','https://example.com'),/Activa tu plan/);base={status:'active',cancel_at_period_end:true};await assert.rejects(()=>addonCheckout(stripe,row,'seo-pro','https://example.com'),/Activa tu plan/);
subs=[{id:'other',status:'active',metadata:{webOfferId:'other',webOfferAddon:'seo-pro'}}];assert.deepEqual(await addonSubscriptions(stripe,'cus_usd','web1'),[]);
overflow=true;await assert.rejects(()=>addonSubscriptions(stripe,'cus_usd','web1'));
console.log('Extras verified: fixed USD prices, shared customer, reuse, pending-payment protection, project isolation and subscription eligibility. No live Stripe calls.');
