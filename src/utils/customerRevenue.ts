import {buildPaymentMaster,groupPayments,type ScheduledPayment} from './paymentSchedule';
// Use the unfiltered, reconciled history. Never mix currencies or forecast amounts.
export function customerRevenue(rows:ScheduledPayment[]){
 const groups=groupPayments(buildPaymentMaster([],rows).filter(p=>p.state==='paid'&&!p.processing&&p.direction!=='expense'));
 return new Map(groups.map(g=>{
  const totals=new Map<string,number>();
  for(const p of g.payments)totals.set(p.currency,(totals.get(p.currency)||0)+Math.round(p.amount*100));
  return [g.id,[...totals].map(([currency,cents])=>({currency,amount:cents/100}))] as const;
 }));
}
