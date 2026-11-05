export interface StripePaymentDetail {
 chargeId: string;
 intentId: string;
 invoiceId: string;
 sessionId: string;
 transactionId: string;
 method: string;
 status: 'pending' | 'succeeded' | 'failed';
 amount: number;
 currency: string;
 created: number;
}

export function stripeMethodLabel(method?: string) {
 if (!method) return 'Stripe';
 const labels: Record<string,string> = {card:'Tarjeta',sepa_debit:'Domiciliación SEPA',apple_pay:'Apple Pay',google_pay:'Google Pay',link:'Link',customer_balance:'Saldo del cliente',paypal:'PayPal',us_bank_account:'Cuenta bancaria de EE. UU.'};
 return 'Stripe · ' + (labels[method] || method.replaceAll('_',' '));
}

export function indexStripePayments(details: StripePaymentDetail[]) {
 const index = new Map<string,StripePaymentDetail[]>();
 for (const detail of [...details].sort((a,b)=>b.created-a.created)) {
  for (const id of [detail.transactionId,detail.sessionId,detail.invoiceId].filter(Boolean)) {
   const group = index.get(id);
   if (group) group.push(detail);
   else index.set(id,[detail]);
  }
 }
 return index;
}
