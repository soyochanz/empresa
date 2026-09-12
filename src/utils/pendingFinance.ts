import type { FinanceTransaction } from '../types';
import { buildManualRecurringTransaction, getPendingManualRecurrences, isManualFinanceRecurrence, toFinanceDateKey } from './financeRecurrence';

export const isStripeManagedTransaction = (transaction: FinanceTransaction): boolean => Boolean(
 transaction.paymentMethod === 'stripe' || transaction.stripePlanId || transaction.stripeInvoiceId
 || transaction.stripeCheckoutSessionId || transaction.stripeCheckoutUrl
 || /^(tx_stripe_|tx_auto_stripe_)/.test(transaction.id)
);

export interface PendingFinanceItem {
 id: string;
 transaction: FinanceTransaction;
 existing?: FinanceTransaction;
 source?: FinanceTransaction;
}

// Include the entire selected month, including instalments not yet due today.
export function getMonthlyPendingFinance(transactions: FinanceTransaction[], month: string): PendingFinanceItem[] {
 if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
 const [year, monthNumber] = month.split('-').map(Number);
 const through = new Date(year, monthNumber, 0, 12);
 const items = new Map<string, PendingFinanceItem>();
 const stripeSourceIds = new Set(transactions.filter(isStripeManagedTransaction).map(transaction => transaction.id));
 for (const transaction of transactions) {
  if (transaction.isRecurring || transaction.status !== 'pending' || isStripeManagedTransaction(transaction)
   || stripeSourceIds.has(transaction.recurrenceSourceId || '') || transaction.date.slice(0, 7) !== month) continue;
  items.set(transaction.id, { id: transaction.id, transaction, existing: transaction });
 }
 for (const source of transactions.filter(transaction => isManualFinanceRecurrence(transaction) && !isStripeManagedTransaction(transaction))) {
  for (const due of getPendingManualRecurrences(source, transactions, through)) {
   if (toFinanceDateKey(due.date).slice(0, 7) !== month || due.existing?.status === 'failed') continue;
   if (due.existing && isStripeManagedTransaction(due.existing)) continue;
   const amount = toFinanceDateKey(due.date) === source.date.slice(0, 10) ? source.firstAmount ?? source.amount : source.nextAmount ?? source.amount;
   if (!due.existing && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) continue;
   const transaction = due.existing || { ...buildManualRecurringTransaction(source, due.date), status: 'pending' as const, paidAt: undefined };
   items.set(transaction.id, { id: transaction.id, transaction, existing: due.existing, source });
  }
 }
 return [...items.values()].sort((a, b) => a.transaction.date.localeCompare(b.transaction.date) || a.id.localeCompare(b.id));
}
