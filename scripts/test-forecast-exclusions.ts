import assert from 'node:assert/strict';
import express from 'express';
import {registerForecastExclusions} from '../api/forecastExclusions';
import {adminAuth} from '../api/security/access';
let writes=0;
const app=express();app.use(express.json());
const admin=adminAuth(async token=>token==='admin'?{id:'admin'}:null,new Set(['admin']),new Set());
const db:any={from:()=>({select:()=>({eq:async()=>({data:[],error:null})}),upsert:async()=>{writes++;return {error:null};}})};
registerForecastExclusions(app,db,admin);
const server=app.listen(0);const port=(server.address() as any).port;
try{
 const url=`http://localhost:${port}/api/finance/forecast-exclusions`;
 assert.equal((await fetch(url)).status,401);
 assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'tx:pending:2026-11-18',excluded:true})})).status,401);assert.equal(writes,0);
 assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer admin'},body:JSON.stringify({key:'invalid',excluded:true})})).status,400);assert.equal(writes,0);
 for(const excluded of [true,false])assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer admin'},body:JSON.stringify({key:'tx:pending:2026-11-18',excluded})})).status,200);
 assert.equal(writes,2);console.log('Forecast visibility API: authorization, validation and reversible writes OK');
}finally{server.close();}
