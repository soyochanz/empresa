import type { FinanceTransaction } from '../types';

export const CASH_OPENING_BALANCE = 670;
export const CASH_OPENING_ISO = '2026-08-30T13:05:07.971Z';
export const CASH_OPENING_AT = Date.parse(CASH_OPENING_ISO);
export const CASH_OPENING_DATE = '2026-08-30';

// Use the payment date for settled charges. Recording an old movement today
// does not make it a movement after the opening balance.
export function isCashAfterOpening(transaction: FinanceTransaction): boolean {
 const paidAt = Date.parse(transaction.paidAt || '');
 if (transaction.status === 'paid' && Number.isFinite(paidAt)) return paidAt >= CASH_OPENING_AT;
 const date = (transaction.date || '').slice(0, 10);
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
 if (date !== CASH_OPENING_DATE) return date > CASH_OPENING_DATE;
 const datedTime = transaction.date.includes('T') ? Date.parse(transaction.date) : NaN;
 if (Number.isFinite(datedTime)) return datedTime >= CASH_OPENING_AT;
 const createdAt = Date.parse(transaction.createdAt || '');
 if (Number.isFinite(createdAt)) return createdAt >= CASH_OPENING_AT;
 const timestamp = transaction.id.match(/(?:^|_)(1\d{12})(?:_|$)/)?.[1];
 return Boolean(timestamp && Number(timestamp) >= CASH_OPENING_AT);
}
