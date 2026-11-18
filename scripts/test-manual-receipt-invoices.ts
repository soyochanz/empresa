import assert from 'node:assert/strict';
import {ensureManualReceiptInvoice,manualReceiptEligible,receiptInvoiceId} from '../api/manualReceiptInvoices';
const tx={id:'receipt-1',type:'income',status:'paid',amount:150,date:'2026-11-07',isRecurring:false,description:'SEO [PM:transfer] [CLIENT:client-1] [PAID_AT:2026-11-18T12:00:00.000Z]'};
assert(manualReceiptEligible(tx));
for(const change of [{status:'pending'},{type:'expense'},{isRecurring:true},{amount:0},{description:tx.description+' [LEDGER_EXCLUDED:true]'},{description:tx.description+' [PM:stripe]'}]) assert(!manualReceiptEligible({...tx,...change}));
assert.equal(receiptInvoiceId(tx),receiptInvoiceId({...tx,amount:200}));
const rows:any[]=[];
const contact={id:'client-1',name:'La Encina',email:'example@example.com',hostingCredentials:'\n\n---METADATA---\ntaxPercentage:0'};
const db:any={from(table:string){
 let predicate=(x:any)=>true, single=false,insert:any;
 const chain:any={select(){return chain},eq(key:string,value:any){const previous=predicate;predicate=x=>previous(x)&&x[key]===value;return chain},
 contains(_key:string,value:string){const item=JSON.parse(value)[0];predicate=x=>x.items?.some((line:any)=>Object.entries(item).every(([k,v])=>line[k]===v));return chain},
 limit(){return chain},maybeSingle(){single=true;return chain},insert(value:any){insert=value;return chain},
 then(resolve:any){if(insert){if(rows.some(x=>x.id===insert.id))return Promise.resolve({error:{code:'23505'}}).then(resolve);rows.push(insert);return Promise.resolve({error:null}).then(resolve)}
 const found=(table==='finance_transactions'?[tx]:table==='contacts'?[contact]:rows).filter(predicate);
 return Promise.resolve({data:single?found[0]||null:found,error:null}).then(resolve)}};
 return chain;
}};
const results=await Promise.all([ensureManualReceiptInvoice(db,tx.id),ensureManualReceiptInvoice(db,tx.id)]);
assert.equal(rows.length,1,'Concurrent requests must create exactly one invoice');
assert.equal(results.filter(x=>x.created).length,1);
assert.equal(rows[0].total,150);assert.equal(rows[0].date,'2026-11-18');
assert.equal(rows[0].items[0].pendingTxId,tx.id);
assert(rows[0].notes.includes('Althera%20Solutions%20-%20F.Z.C'));
assert.equal((await ensureManualReceiptInvoice(db,tx.id)).created,false);
rows.splice(0);rows.push({id:'AL-2026-900',items:[{pendingTxId:tx.id}]});
assert.equal((await ensureManualReceiptInvoice(db,tx.id)).invoiceId,'AL-2026-900','Respect existing historical invoices without a client id');
console.log('Manual receipt invoices: paid-only, issuer, amount, retry and legacy duplicate checks passed.');
