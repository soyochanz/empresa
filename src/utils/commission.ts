import { ClientContact, FinanceTransaction, Invoice } from '../types';

export const isAutomaticCommissionEligible = (transaction: FinanceTransaction): boolean => {
 if (transaction.isInitialSale !== true || transaction.isRecurring || transaction.recurrenceSourceId) return false;
 // A combined service may mention recurrence in its concept. Metadata and the
 // accounting category, rather than free text, determine which leg commissions.
 return !/(?:mensualidad|suscripci[oó]n|recurrente|renovaci[oó]n)/i.test(transaction.category || '');
};

export const getCommissionableGrossAmount = (
 transaction: FinanceTransaction,
 invoices: Invoice[] = [],
 contacts: ClientContact[] = [],
): number => {
 // FinanceTransaction.amount is the full amount collected, including taxes.
 const grossAmount = Number(transaction.amount || 0);
 return Number.isFinite(grossAmount) ? Math.max(0, grossAmount) : 0;
};

export const getCommissionableGrossVolume = (
 transactions: FinanceTransaction[],
 invoices: Invoice[] = [],
 contacts: ClientContact[] = [],
): number => transactions.reduce(
 (total, transaction) => total + getCommissionableGrossAmount(transaction, invoices, contacts),
 0,
);

export const getAutomaticCommissionableGrossVolume = (
 transactions: FinanceTransaction[],
 invoices: Invoice[] = [],
 contacts: ClientContact[] = [],
): number => getCommissionableGrossVolume(
 transactions.filter(isAutomaticCommissionEligible),
 invoices,
 contacts,
);

export const getSalesCommission = (transaction: FinanceTransaction, percentage: number): number => {
 if (!isAutomaticCommissionEligible(transaction)) return 0;
 if (transaction.commissionFixedAmount !== undefined && Number.isFinite(transaction.commissionFixedAmount)) return Math.max(0, transaction.commissionFixedAmount);
 return getCommissionableGrossAmount(transaction) * percentage / 100;
};
export const getSalesCommissionTotal = (transactions: FinanceTransaction[], percentage: number): number =>
 transactions.reduce((sum, transaction) => sum + getSalesCommission(transaction, percentage), 0);
