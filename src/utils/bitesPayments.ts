import type {AgendaInvoice,PaymentPlan} from './paymentSchedule';
export function adaptBitesPayments(data:any, stripePlans:PaymentPlan[]){
 const accounts=Array.isArray(data?.accounts)?data.accounts:[];
 const payments=Array.isArray(data?.payments)?data.payments:[];
 const plans:PaymentPlan[]=[],invoices:AgendaInvoice[]=[];
 let unpriced=0;
 for(const p of payments){
  if(!['paid','open','uncollectible','failed'].includes(p.status))continue;
  const account=accounts.find((a:any)=>a.id===p.account_id);
  invoices.push({id:p.stripe_invoice_id||`bites_${p.id}`,origin:'bites',subscriptionId:account?.stripeSubscriptionId||undefined,customerName:p.accountName||account?.name||'Suscriptor Bites',customerEmail:p.accountEmail||account?.email,description:p.description||'Suscripción Bites',amount:Number(p.status==='paid'?p.amount_paid_cents:p.amount_due_cents)/100,currency:p.currency||'EUR',date:p.paid_at||p.created_at,status:p.status==='paid'?'paid':p.status==='open'?'pending':'failed',url:p.hosted_invoice_url||p.invoice_pdf_url||undefined});
 }
 for(const a of accounts){
  if(!['active','trialing','past_due'].includes(a.subscriptionStatus)||!a.stripeSubscriptionId)continue;
  const existing=stripePlans.find(p=>p.id===a.stripeSubscriptionId);
  if(existing){existing.origin='bites';continue;}
  // Use the recorded billing period and amount, never a guessed plan price.
  const last=[...payments].filter((p:any)=>p.account_id===a.id&&p.status==='paid'&&p.period_start&&p.period_end&&p.amount_paid_cents>0).sort((x:any,y:any)=>String(y.period_end).localeCompare(String(x.period_end)))[0];
  const days=last?(Date.parse(last.period_end)-Date.parse(last.period_start))/86400000:0;
  if(!last||!a.subscriptionCurrentPeriodEnd||!((days>=27&&days<=32)||(days>=364&&days<=367))){unpriced++;continue;}
  plans.push({estimatedAmount:true,id:a.stripeSubscriptionId,origin:'bites',customerName:a.name||a.email||'Suscriptor Bites',customerEmail:a.email,concept:`Bites · ${a.plan||'Suscripción'}`,status:a.subscriptionStatus,amount:Number(last.amount_paid_cents)/100,currency:last.currency,interval:days>100?'year':'month',intervalCount:1,nextPaymentAt:a.subscriptionCurrentPeriodEnd,lastPaidAt:last.paid_at,endsAt:a.subscriptionCancelAtPeriodEnd?a.subscriptionCurrentPeriodEnd:null,cancelAt:a.subscriptionCancelAt, paymentLimit:null,paymentCount:0});
 }
 return {plans,invoices,unpriced};
}
