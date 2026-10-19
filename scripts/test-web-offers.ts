import assert from 'node:assert/strict';
import express from 'express';
import { registerWebOffers, decodeImage, validDemoUrl } from '../api/webOffers';
import { isPublicEntry } from '../src/utils/publicEntry';
const token='a'.repeat(48);
const row:any={id:'request-1',demo_token:token,plan:'essential',status:'review',demo_url:'https://example.com/demo',email:'customer@example.com',name:'Customer',business_name:'Studio',checkout_generation:0};
let saved:any={};let sessionCreates=0;let checkoutParams:any;let allowLock=true;
function query(){let mode='select';let payload:any;let filters:any[]=[];let single=false;const q:any={select(){return q;},eq(k:any,v:any){filters.push([k,v]);return q;},in(){return q;},or(){return q;},order(){return q;},limit(){return q;},gte(){return q;},maybeSingle(){single=true;return q;},single(){single=true;return q;},insert(p:any){mode='insert';payload=p;return q;},update(p:any){mode='update';payload=p;return q;},then(resolve:any,reject:any){try{let data:any=null;if(filters.some(([k,v])=>k==='demo_token'&&v!==token))data=null;else if(mode==='update'){if(payload.checkout_lock_until&&!allowLock)data=null;else{Object.assign(row,payload);saved={...saved,...payload};data={...row};}}else if(mode==='insert'){saved=payload;data=payload;}else if(filters.some(([k,v])=>k==='email'&&v!==row.email))data=single?null:[];else data=single?{...row}:[{...row}];return Promise.resolve({data,error:null}).then(resolve,reject);}catch(e){return Promise.reject(e).then(resolve,reject);}}};return q;}
const db:any={from:query,auth:{getUser:async(t:string)=>({data:{user:t==='customer'?{email:row.email,email_confirmed_at:'today'}:t==='other'?{email:'other@example.com',email_confirmed_at:'today'}:null},error:null})},storage:{from:()=>({upload:async()=>({error:null}),remove:async()=>({error:null})})}};
const stripe:any={customers:{create:async()=>({id:'cus_test'})},checkout:{sessions:{retrieve:async()=>({status:'open',url:'https://checkout.stripe.com/test'}),create:async(p:any)=>{sessionCreates++;checkoutParams=p;return {id:'cs_test',url:'https://checkout.stripe.com/test'};}}},subscriptions:{retrieve:async()=>({id:'sub_test',status:'active',customer:'cus_test',metadata:{webOfferId:row.id}})}};
const app=express();const handlers=registerWebOffers(app,{db,stripe:()=>stripe,admin:(_req,res)=>res.sendStatus(401),origin:'https://altherasolutions.com'});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));const port=(server.address() as any).port;const base=`http://127.0.0.1:${port}/api/web-offers`;
async function call(path:string,body?:any,auth?:string){return fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body?JSON.stringify(body):undefined});}
try{
 for(const url of ['http://example.com','https://127.0.0.1','https://10.0.0.1','https://user:pass@example.com','https://localhost','https://[::1]'])assert.throws(()=>validDemoUrl(url));
 assert.equal(validDemoUrl('https://example.com/demo'),'https://example.com/demo');
 assert.throws(()=>decodeImage({data:'data:image/png;base64,'+Buffer.from('<svg onload=alert(1)>').toString('base64')}));
 assert.throws(()=>decodeImage({data:'data:image/svg+xml;base64,PHN2Zz4='}));
 assert.equal(isPublicEntry('/webs'),true);assert.equal(isPublicEntry(`/business/${token}`),true);assert.equal(isPublicEntry('/business/account'),true);assert.equal(isPublicEntry('/api/web-offers/account'),false);
 assert.equal((await call('/admin/requests')).status,401);
 assert.equal((await call('/account')).status,401);
 assert.equal((await call('/requests',{plan:'hacked'})).status,400);
 const preview=await (await call(`/demo/${token}`)).json();assert.equal(preview.email,undefined);assert.equal(preview.phone,undefined);assert.equal(preview.stripe_customer_id,undefined);
 assert.equal((await call(`/demo/${'b'.repeat(48)}`)).status,404);
 assert.equal((await call(`/demo/${token}/checkout`,{acceptTerms:false})).status,409);assert.equal(sessionCreates,0);
 allowLock=false;assert.equal((await call(`/demo/${token}/checkout`,{acceptTerms:true})).status,409);assert.equal(sessionCreates,0);allowLock=true;
 assert.equal((await call(`/demo/${token}/checkout`,{acceptTerms:true,amount:1,currency:'eur',plan:'professional'})).status,200);
 assert.equal(checkoutParams.line_items[0].price_data.unit_amount,4900);assert.equal(checkoutParams.line_items[0].price_data.currency,'usd');assert.equal(checkoutParams.mode,'subscription');assert.equal(checkoutParams.line_items[0].price_data.recurring.interval,'month');assert.match(saved.approved_terms,/12 meses/);
 assert.equal((await call(`/demo/${token}/checkout`,{acceptTerms:true})).status,200);assert.equal(sessionCreates,1,'Repeated approval reuses the open session');
 assert.equal((await call('/account/request-1/billing',{},'other')).status,404);
 assert.equal(await handlers.handleEvent({type:'customer.subscription.updated',data:{object:{id:'sub_test',metadata:{webOfferId:row.id}}}} as any),true);assert.equal(row.status,'active');
 assert.equal(await handlers.handleEvent({type:'checkout.session.completed',data:{object:{id:'unrelated',metadata:{}}}} as any),false);
 assert.equal((await call(`/demo/${token}/feedback`,{feedback:'Change the entire website'})).status,409);
 console.log('Web offers verified: authorization, private preview, validated images/URLs, immutable USD prices, consent, checkout reuse/locking, ownership and verified-event routing. No real Stripe calls.');
}finally{server.close();}
