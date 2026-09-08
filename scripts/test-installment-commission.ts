import assert from 'node:assert/strict';
import type {FinanceTransaction} from '../src/types';
import {getAutomaticCommissionableGrossVolume, getCommissionableGrossAmount} from '../src/utils/commission';
const base:FinanceTransaction={id:'first',description:'Cuota de prueba',type:'income',category:'Ventas',amount:825,date:'2026-09-08',status:'pending',isInitialSale:true,comercialId:'commercial'};
const history:FinanceTransaction[]=[{...base,id:'previous-1',amount:756.19,status:'paid'},{...base,id:'previous-2',amount:756.19,status:'paid'}];
const transactions=[...history,base,{...base,id:'second',date:'2026-10-08'}];
const paidOut=getAutomaticCommissionableGrossVolume(history)*0.1;
const calculate=(items:FinanceTransaction[])=>({ready:Math.round(Math.max(0,getAutomaticCommissionableGrossVolume(items.filter(t=>t.status==='paid'))*0.1-paidOut)*100)/100,pending:Math.round(getAutomaticCommissionableGrossVolume(items.filter(t=>t.status==='pending'))*0.1*100)/100});
assert.deepEqual(calculate(transactions),{ready:0,pending:165});
const collected=transactions.map(t=>t.id==='first'?{...t,status:'paid' as const}:t);
assert.deepEqual(calculate(collected),{ready:82.5,pending:82.5});
assert.deepEqual(calculate(collected.map(t=>t.id==='first'?{...t,status:'pending' as const}:t)),{ready:0,pending:165});
console.log('Cuotas: cobro parcial libera 82,50 €, mantiene 82,50 € pendientes y respeta liquidaciones anteriores.');

assert.equal(getCommissionableGrossAmount(base, [{id:'invoice',total:825,subtotal:681.82,taxPercentage:21,items:[{id:'first'}]} as any]),825);
assert.equal(getAutomaticCommissionableGrossVolume([{...base,isRecurring:true}]),0);
assert.equal(getCommissionableGrossAmount({...base,amount:NaN}),0);
