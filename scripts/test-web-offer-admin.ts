import assert from 'node:assert/strict';
import express from 'express';
import { registerWebOffers } from '../api/webOffers';
let stripeStatus='expired';let stripePaid=false;let stripeSubscription:any=null;let expireError=false;let expires=0;let stripeRace=false;
let row:any; let tickets:any[]=[]; let removed:string[]=[]; let race=false;
function reset(){row={id:'test',status:'requested',demo_url:null,checkout_session_id:null,stripe_subscription_id:null,checkout_lock_until:null,assets:[{path:'test/logo.png'}]};tickets=[];removed=[];race=false;stripeStatus='expired';stripePaid=false;stripeSubscription=null;expireError=false;expires=0;stripeRace=false;}
const db:any={from(table:string){let mode='select',patch:any;const filters:((r:any)=>boolean)[]=[];let single=false;
 const q:any={select(){return q},eq(k:string,v:any){filters.push(r=>r[k]===v);return q},in(k:string,v:any[]){filters.push(r=>v.includes(r[k]));return q},is(k:string,v:any){filters.push(r=>(r[k]??null)===v);return q},or(){filters.push(r=>!r.checkout_lock_until||new Date(r.checkout_lock_until)<new Date());return q},limit(){return q},maybeSingle(){single=true;return q},update(p:any){mode='update';patch=p;return q},delete(){mode='delete';return q},then(resolve:any,reject:any){return Promise.resolve().then(()=>{if(race&&mode!=='select')row.checkout_lock_until=new Date(Date.now()+60000).toISOString();let data:any=table==='web_offer_tickets'?tickets:(row&&filters.every(f=>f(row))?[row]:[]);if(mode==='update'&&data.length)Object.assign(row,patch);if(mode==='delete'&&data.length)row=null;return {data:single?data[0]||null:data,error:null}}).then(resolve,reject)}};return q},storage:{from:()=>({remove:async(p:string[])=>{removed=p;return {error:null}}})}};
const app=express();registerWebOffers(app,{db,stripe:()=>({checkout:{sessions:{retrieve:async()=>({id:'cs_test',status:stripeStatus,payment_status:stripePaid?'paid':'unpaid',subscription:stripeSubscription}),expire:async()=>{expires++;if(expireError)throw Error('Stripe unavailable');if(stripeRace){row.stripe_subscription_id='sub_race';row.status='active';}return {id:'cs_test',status:'expired',payment_status:'unpaid',subscription:null}}}}} as any),admin:(req,res,next)=>req.headers.authorization==='admin'?next():res.sendStatus(401),origin:'https://example.com'});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}/api/web-offers/admin/requests/test`;
const call=(method:string,body:any,auth=true)=>fetch(base,{method,headers:{'Content-Type':'application/json',...(auth?{authorization:'admin'}:{})},body:JSON.stringify(body)});
try{
 reset();assert.equal((await call('DELETE',{confirm:true},false)).status,401);assert.equal((await call('PATCH',{status:'designing'},false)).status,401);
 assert.equal((await call('PATCH',{status:'active'})).status,400);assert.equal(row.status,'requested');
 assert.equal((await call('PATCH',{status:'review'})).status,400);
 assert.equal((await call('PATCH',{status:'designing'})).status,200);assert.equal(row.status,'designing');
 assert.equal((await call('PATCH',{demoUrl:'https://example.com'})).status,200);assert.equal(row.status,'review');
 assert.equal((await call('PATCH',{status:'changes'})).status,200);
 assert.equal((await call('PATCH',{status:'requested'})).status,200);
 for(const protection of [{status:'active'},{status:'past_due'},{status:'canceled'},{stripe_subscription_id:'sub_test'},{checkout_lock_until:new Date(Date.now()+60000).toISOString()}]){reset();Object.assign(row,protection);assert.equal((await call('DELETE',{confirm:true})).status,409);assert.equal((await call('PATCH',{status:'designing'})).status,409);assert.ok(row);assert.equal(removed.length,0);}
 for(const initial of ['expired','open']){
 reset();row.status='approved';row.checkout_session_id='cs_test';row.checkout_generation=4;stripeStatus=initial;
 assert.equal((await call('PATCH',{status:'designing'})).status,200);assert.equal(row.status,'designing');assert.equal(row.checkout_session_id,null);assert.equal(row.checkout_generation,5);assert.equal(row.checkout_lock_until,null);assert.equal(expires,initial==='open'?1:0);
 reset();row.status='approved';row.checkout_session_id='cs_test';stripeStatus=initial;
 assert.equal((await call('DELETE',{confirm:true})).status,200);assert.equal(row,null);
 }
 for(const state of ['complete','paid','subscription','expire_error','race']){
 reset();row.status='approved';row.checkout_session_id='cs_test';stripeStatus=state==='complete'?'complete':'open';stripePaid=state==='paid';stripeSubscription=state==='subscription'?'sub_test':null;expireError=state==='expire_error';stripeRace=state==='race';
 assert.equal((await call('DELETE',{confirm:true})).status,409);assert.ok(row);assert.equal(row.checkout_session_id,'cs_test');assert.equal(row.checkout_lock_until,null);assert.equal(removed.length,0);
 }
 reset();race=true;assert.equal((await call('DELETE',{confirm:true})).status,409);assert.ok(row);
 reset();tickets=[{id:'ticket'}];assert.equal((await call('DELETE',{confirm:true})).status,409);assert.ok(row);
 reset();assert.equal((await call('DELETE',{})).status,400);assert.ok(row);
 assert.equal((await call('DELETE',{confirm:true})).status,200);assert.equal(row,null);assert.deepEqual(removed,['test/logo.png']);
 assert.equal((await call('DELETE',{confirm:true})).status,404);
 console.log('Admin request controls verified: authorization, state validation, demo requirement, Stripe and concurrent checkout protection, ticket history, explicit deletion and asset cleanup.');
}finally{server.close()}
