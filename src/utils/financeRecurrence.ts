import { FinanceTransaction } from '../types';

const MAX_OCCURRENCES_PER_CONCEPT = 10_000;

const parseDateKey = (value?: string): Date | null => {
 if (!value) return null;
 const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
 const parsed = match
  ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
  : new Date(value);
 return Number.isFinite(parsed.getTime()) ? parsed : null;
};

export const toFinanceDateKey = (date: Date): string =>
 `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const isFinanceRecurrenceOccurrenceAllowed = (
 transaction: FinanceTransaction,
 occurrenceIndex: number,
 occurrenceDate: Date
): boolean => {
 const count = Number(transaction.recurrenceOccurrenceCount || 0);
 if (count > 0 && occurrenceIndex >= count) return false;
 if (transaction.recurrenceEndDate && toFinanceDateKey(occurrenceDate) > transaction.recurrenceEndDate.slice(0, 10)) return false;
 return true;
};

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

export const getFinanceRecurrenceDate = (
 sourceDate: Date,
 period: FinanceTransaction['recurrencePeriod'] | undefined,
 occurrenceIndex: number
): Date => {
 const normalizedPeriod = period || 'monthly';
 if (normalizedPeriod === 'weekly') {
  const result = new Date(sourceDate);
  result.setDate(sourceDate.getDate() + occurrenceIndex * 7);
  return result;
 }

 if (normalizedPeriod === 'yearly') {
  const year = sourceDate.getFullYear() + occurrenceIndex;
  return new Date(year, sourceDate.getMonth(), Math.min(sourceDate.getDate(), daysInMonth(year, sourceDate.getMonth())), 12);
 }

 const absoluteMonth = sourceDate.getMonth() + occurrenceIndex;
 const year = sourceDate.getFullYear() + Math.floor(absoluteMonth / 12);
 const month = ((absoluteMonth % 12) + 12) % 12;
 return new Date(year, month, Math.min(sourceDate.getDate(), daysInMonth(year, month)), 12);
};

export const getNextFinanceRecurrenceDate = (
 transaction: FinanceTransaction,
 afterDate = new Date()
): Date | null => {
 const sourceDate = parseDateKey(transaction.date);
 if (!sourceDate || !transaction.isRecurring) return null;
 const afterKey = toFinanceDateKey(afterDate);

 for (let index = 0; index < MAX_OCCURRENCES_PER_CONCEPT; index += 1) {
  const occurrence = getFinanceRecurrenceDate(sourceDate, transaction.recurrencePeriod, index);
  if (!isFinanceRecurrenceOccurrenceAllowed(transaction, index, occurrence)) return null;
  if (toFinanceDateKey(occurrence) > afterKey) return occurrence;
 }
 return null;
};

const normalizeLegacyDescription = (description?: string): string =>
 (description || '')
  .replace(/\s*\((Ingreso Procesado|Cargo Procesado|Ingreso recurrente autom[aá]tico|Gasto recurrente autom[aá]tico)\)\s*$/i, '')
  .trim()
  .toLocaleLowerCase('es-ES');

export const getRecurringOccurrenceId = (sourceId: string, scheduledDate: string): string =>
 `${sourceId}__rec__${scheduledDate.replaceAll('-', '')}`;

export const buildDueRecurringTransactions = (
 transactions: FinanceTransaction[],
 throughDate = new Date()
): FinanceTransaction[] => {
 const throughKey = toFinanceDateKey(throughDate);
 const existingIds = new Set(transactions.map(transaction => transaction.id));
 const legacyOccurrences = new Set(
  transactions
   .filter(transaction => !transaction.isRecurring && /\((Ingreso Procesado|Cargo Procesado)\)\s*$/i.test(transaction.description || ''))
   .map(transaction => [
    transaction.type,
    transaction.category,
    String(transaction.date || '').slice(0, 10),
    normalizeLegacyDescription(transaction.description)
   ].join('|'))
 );
 const due: FinanceTransaction[] = [];

 // Stripe-controlled subscriptions are materialized only after a signed paid-invoice webhook.
 for (const source of transactions.filter(transaction => transaction.isRecurring && transaction.paymentMethod !== 'stripe')) {
  const sourceDate = parseDateKey(source.date);
  if (!sourceDate) continue;

  for (let index = 0; index < MAX_OCCURRENCES_PER_CONCEPT; index += 1) {
   const occurrenceDate = getFinanceRecurrenceDate(sourceDate, source.recurrencePeriod, index);
   if (!isFinanceRecurrenceOccurrenceAllowed(source, index, occurrenceDate)) break;
   const scheduledDate = toFinanceDateKey(occurrenceDate);
   if (scheduledDate > throughKey) break;

   const id = getRecurringOccurrenceId(source.id, scheduledDate);
   const legacyKey = [source.type, source.category, scheduledDate, normalizeLegacyDescription(source.description)].join('|');
   if (existingIds.has(id) || legacyOccurrences.has(legacyKey)) continue;

   const isFirstOccurrence = index === 0;
   const amount = Number(isFirstOccurrence
    ? source.firstAmount ?? source.amount
    : source.nextAmount ?? source.amount);
   if (!Number.isFinite(amount) || amount <= 0) continue;

   due.push({
    id,
    type: source.type,
    category: source.category,
    amount: Math.abs(amount),
    date: scheduledDate,
    description: `${source.description} (${source.type === 'income' ? 'Ingreso' : 'Gasto'} recurrente automático)`,
    isRecurring: false,
    status: 'paid',
    paymentMethod: source.paymentMethod,
    clientId: source.clientId,
    stripePlanId: source.stripePlanId,
    invoiceId: isFirstOccurrence ? source.invoiceId : undefined,
    comercialId: source.comercialId,
    comercialEmail: source.comercialEmail,
    isInitialSale: isFirstOccurrence ? source.isInitialSale : false,
    recurrenceSourceId: source.id,
    recurrenceScheduledDate: scheduledDate,
    ownerUserId: source.ownerUserId
   });
   existingIds.add(id);
  }
 }

 return due;
};

export const buildManualRecurringTransaction = (
 source: FinanceTransaction,
 date = new Date()
): FinanceTransaction => {
 const scheduledDate = toFinanceDateKey(date);
 const amount = Math.abs(Number(source.nextAmount ?? source.amount));
 return {
  id: getRecurringOccurrenceId(source.id, scheduledDate),
  type: source.type,
  category: source.category,
  amount,
  date: scheduledDate,
  description: `${source.description} (${source.type === 'income' ? 'Ingreso' : 'Gasto'} recurrente automático)`,
  isRecurring: false,
  status: 'paid',
  paymentMethod: source.paymentMethod,
  clientId: source.clientId,
  stripePlanId: source.stripePlanId,
  comercialId: source.comercialId,
  comercialEmail: source.comercialEmail,
  isInitialSale: false,
  recurrenceSourceId: source.id,
  recurrenceScheduledDate: scheduledDate,
  ownerUserId: source.ownerUserId
 };
};
