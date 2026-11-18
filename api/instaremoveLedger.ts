import type Stripe from 'stripe';

export function isInstaremoveSubscription(subscription: Stripe.Subscription) {
 return subscription.metadata?.app === 'instaremoveai';
}

export async function buildInstaremoveReceipt(stripe: Stripe, invoice: Stripe.Invoice, subscription: Stripe.Subscription, paidDate?: string) {
 if (!isInstaremoveSubscription(subscription) || invoice.status !== 'paid' || invoice.amount_paid <= 0) return null;
 let amountEur = invoice.amount_paid / 100;
 if (invoice.currency !== 'eur') {
  const payments = await stripe.invoicePayments.list({ invoice: invoice.id, status: 'paid', limit: 100 }).autoPagingToArray({ limit: 1000 });
  let converted = 0;
  let accounted = 0;
  for (const payment of payments) {
   const intentReference = payment.payment.payment_intent;
   const intent = typeof intentReference === 'string' ? await stripe.paymentIntents.retrieve(intentReference) : intentReference;
   const chargeReference = intent?.latest_charge || payment.payment.charge;
   const charge = typeof chargeReference === 'string' ? await stripe.charges.retrieve(chargeReference) : chargeReference;
   const balanceReference = charge?.balance_transaction;
   const balance = typeof balanceReference === 'string' ? await stripe.balanceTransactions.retrieve(balanceReference) : balanceReference;
   if (!balance || balance.currency !== 'eur' || !balance.exchange_rate || !payment.amount_paid) {
    throw new Error('Conversión a EUR pendiente para la factura InstaremoveAI ' + invoice.id);
   }
   converted += payment.amount_paid * balance.exchange_rate;
   accounted += payment.amount_paid;
  }
  if (accounted !== invoice.amount_paid) throw new Error('Importe pendiente de conciliar en InstaremoveAI ' + invoice.id);
  amountEur = Math.round(converted) / 100;
 }
 const date = paidDate || new Date((invoice.status_transitions.paid_at || invoice.created) * 1000).toISOString().slice(0, 10);
 const customer = invoice.customer_name || invoice.customer_email || 'Suscriptor';
 const concept = invoice.lines.data.map(line => line.description).filter(Boolean).join(' · ') || 'Suscripción';
 const original = invoice.currency !== 'eur' ? ' · ' + (invoice.amount_paid / 100).toFixed(2) + ' ' + invoice.currency.toUpperCase() : '';
 return {
  id: 'tx_stripe_invoice_' + invoice.id,
  user_id: null,
  type: 'income',
  category: 'InstaremoveAI',
  amount: amountEur,
  date,
  description: 'InstaremoveAI · ' + customer + ' · ' + concept + original +
   ' [PM:stripe] [STRIPEINVOICE:' + invoice.id + '] [STRIPEPLAN:' + subscription.id + '] [ISINITIAL:false]',
  isRecurring: false,
  recurrencePeriod: null,
  status: 'paid',
 };
}
