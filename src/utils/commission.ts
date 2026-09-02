import { ClientContact, FinanceTransaction, Invoice } from '../types';

const DEFAULT_TAX_PERCENTAGE = 21;

export const isAutomaticCommissionEligible = (transaction: FinanceTransaction): boolean => {
 if (transaction.isInitialSale !== true || transaction.isRecurring || transaction.recurrenceSourceId) return false;
 // A combined service may mention recurrence in its concept. Metadata and the
 // accounting category, rather than free text, determine which leg commissions.
 return !/(?:mensualidad|suscripci[oó]n|recurrente|renovaci[oó]n)/i.test(transaction.category || '');
};

export const getCommissionableNetAmount = (
 transaction: FinanceTransaction,
 invoices: Invoice[] = [],
 contacts: ClientContact[] = [],
): number => {
 const grossAmount = Math.max(0, Number(transaction.amount || 0));
 const linkedInvoice = invoices.find(invoice =>
  invoice.id === transaction.invoiceId ||
  (invoice.items || []).some(item => item.pendingTxId === transaction.id || item.id === transaction.id)
 );

 // Using the invoice ratio preserves its exact rounding and supports any VAT rate.
 const invoiceTotal = Number(linkedInvoice?.total || 0);
 const invoiceSubtotal = Number(linkedInvoice?.subtotal || 0);
 if (invoiceTotal > 0 && invoiceSubtotal >= 0) {
  return grossAmount * invoiceSubtotal / invoiceTotal;
 }

 const linkedContact = contacts.find(contact => contact.id === transaction.clientId);
 const configuredTax = Number(linkedInvoice?.taxPercentage ?? linkedContact?.taxPercentage ?? DEFAULT_TAX_PERCENTAGE);
 const taxPercentage = Number.isFinite(configuredTax) && configuredTax >= 0 ? configuredTax : DEFAULT_TAX_PERCENTAGE;
 return grossAmount / (1 + taxPercentage / 100);
};

export const getCommissionableNetVolume = (
 transactions: FinanceTransaction[],
 invoices: Invoice[] = [],
 contacts: ClientContact[] = [],
): number => transactions.reduce(
 (total, transaction) => total + getCommissionableNetAmount(transaction, invoices, contacts),
 0,
);

export const getAutomaticCommissionableNetVolume = (
 transactions: FinanceTransaction[],
 invoices: Invoice[] = [],
 contacts: ClientContact[] = [],
): number => getCommissionableNetVolume(
 transactions.filter(isAutomaticCommissionEligible),
 invoices,
 contacts,
);
