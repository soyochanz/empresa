import type { FinanceTransaction, Invoice } from '../types';

export function attachChargeToInvoice(invoice: Invoice, transaction: FinanceTransaction): Invoice {
 if (transaction.type !== 'income' || transaction.isRecurring) throw new Error('Selecciona un cobro individual.');
 if (transaction.invoiceId && transaction.invoiceId !== invoice.id) throw new Error('El cargo ya pertenece a otra factura.');
 if (invoice.clientId && transaction.clientId && invoice.clientId !== transaction.clientId) throw new Error('El cargo y la factura deben ser del mismo cliente.');
 if (invoice.items.some(item => item.pendingTxId === transaction.id || item.id === transaction.id)) return invoice;
 if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) throw new Error('El importe del cargo no es válido.');
 const tax = invoice.taxPercentage ?? 21;
 const net = Number((transaction.amount / (1 + tax / 100)).toFixed(2));
 const items = [...invoice.items, {
  id: `item_charge_${transaction.id}`, pendingTxId: transaction.id,
  description: transaction.description, quantity: 1, unitPrice: net, total: net,
  grossAmount: transaction.amount, isPending: transaction.status !== 'paid', paymentMethod: transaction.paymentMethod,
 }];
 const total = Number((Number(invoice.total) + transaction.amount).toFixed(2));
 const subtotal = Number((total / (1 + tax / 100)).toFixed(2));
 return { ...invoice, items, total, subtotal, taxAmount: Number((total - subtotal).toFixed(2)),
  status: transaction.status !== 'paid' ? (invoice.status === 'draft' ? 'draft' : 'sent') : invoice.status,
 };
}

export function acknowledgeHistoricalPayment(transaction: FinanceTransaction): FinanceTransaction {
 return { ...transaction, status: 'paid', excludedFromLedger: true,
  description: transaction.description.replace(/\s*\(Pendiente\)/gi, '').trim(),
 };
}

// Invoice payment status is independent of whether a receipt counts in the ledger.
export function reconcileInvoicePayments(invoice: Invoice, transactions: FinanceTransaction[]): Invoice {
 const itemIds = new Set(invoice.items.flatMap(item => [item.pendingTxId, item.id]).filter(Boolean));
 const linked = transactions.filter(tx => !tx.isRecurring && tx.type === 'income' &&
  (tx.invoiceId === invoice.id || itemIds.has(tx.id)));
 if (!linked.length) return invoice;
 const paidTotal = linked.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + tx.amount, 0);
 const fullyPaid = linked.every(tx => tx.status === 'paid') && paidTotal + 0.005 >= invoice.total;
 const items = invoice.items.map(item => {
  const tx = linked.find(row => row.id === item.pendingTxId || row.id === item.id);
  if (!tx && !fullyPaid) return item;
  return { ...item, isPending: tx ? tx.status !== 'paid' : false,
   paymentMethod: tx?.paymentMethod || item.paymentMethod };
 });
 const hasUnpaid = linked.some(tx => tx.status !== 'paid') || items.some(item => item.isPending);
 return { ...invoice, items, status: fullyPaid ? 'paid' : hasUnpaid && invoice.status === 'paid' ? 'sent' : invoice.status };
}
