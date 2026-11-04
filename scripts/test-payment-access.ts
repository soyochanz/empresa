import assert from 'node:assert/strict';
import express from 'express';
import {adminAuth,stripeAccess,denyServerArtifacts} from '../api/security/access';
const app=express();let effects=0;
const auth=adminAuth(async token=>{
 if(token==='outage')throw Error('offline');
 if(token==='admin')return {id:'admin'};
 if(token==='unconfirmed')return {id:'other',email:'owner@example.test'};
 if(token==='customer')return {id:'customer',email_confirmed_at:'now'};
 return null;
},new Set(['admin']),new Set(['owner@example.test']));
app.use('/api/stripe',stripeAccess(auth));
app.all('/api/stripe/*',(_req,res)=>{effects++;res.json({ok:true});});
app.use(denyServerArtifacts);app.get('*',(_req,res)=>res.send('frontend'));
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const base=`http://127.0.0.1:${(server.address() as any).port}`;
try {
 for(const route of ['create-comercial-transfer','create-connect-account','connect-account-status','create-checkout-session','retrieve-session','cancel-subscription','future-sensitive-route']){
  for(const [token,status] of [['',401],['forged',403],['customer',403],['unconfirmed',403],['outage',503]] as const){
   const before=effects;const r=await fetch(`${base}/api/stripe/${route}`,{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{}});
   assert.equal(r.status,status,route);assert.equal(effects,before,'Unauthorized request reached sensitive operation');
  }
  assert.equal((await fetch(`${base}/api/stripe/${route}`,{method:'POST',headers:{Authorization:'Bearer admin'}})).status,200);
 }
 for(const route of ['webhook','config','payment-status']){
  const allowedMethod=route==='webhook'?'POST':'GET';
  assert.equal((await fetch(`${base}/api/stripe/${route}`,{method:allowedMethod})).status,200);
  assert.equal((await fetch(`${base}/api/stripe/${route}`,{method:'DELETE'})).status,401);
 }
 for(const path of ['/server.cjs','/server.cjs.map','/server.ts','/.env','/assets/source.map'])assert.equal((await fetch(base+path)).status,404);
 assert.equal((await fetch(base+'/assets/main.js')).status,200);
 console.log('PASS: unauthenticated/forged/customer/unconfirmed/outage blocked without side effects; admin allowed; public methods scoped; source artifacts blocked.');
}finally{server.close();}
