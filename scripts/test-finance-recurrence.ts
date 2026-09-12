import assert from 'node:assert/strict';
import type { FinanceTransaction } from '../src/types.ts';
import {
 buildDueRecurringTransactions, buildManualRecurringTransaction,
 findRecurringOccurrence, getPendingManualRecurrences,
 getRecurringOccurrenceId, isRecurringOccurrenceRepresented, toFinanceDateKey,
} from '../src/utils/financeRecurrence.ts';

const today = new Date(2026, 8, 12, 12);
const source = (patch: Partial<FinanceTransaction> = {}): FinanceTransaction => ({
 id: 'maria', type: 'income', category: 'Consultoría', amount: 170,
 date: '2026-07-03', description: 'Gestion RRSS Maria', isRecurring: true,
 recurrencePeriod: 'monthly', paymentMethod: 'cash', status: 'paid', ...patch,
});
for (const paymentMethod of ['cash', 'transfer'] as const) {
 for (const type of ['income', 'expense'] as const) {
  assert.deepEqual(buildDueRecurringTransactions([source({ paymentMethod, type })], today), []);
 }
}
assert.equal(buildDueRecurringTransactions([source({ paymentMethod: 'card' })], today).length, 2);
assert.deepEqual(buildDueRecurringTransactions([source({ paymentMethod: 'stripe' })], today), []);

// The screenshot: September's pending row is reused and counted only once.
const maria = source();
const august = buildManualRecurringTransaction(maria, new Date(2026, 7, 3, 12), today);
const september = { ...buildManualRecurringTransaction(maria, new Date(2026, 8, 3, 12), today), status: 'pending' as const };
const ledger = [maria, august, september];
const due = getPendingManualRecurrences(maria, ledger, today);
assert.equal(due.length, 1);
assert.equal(due[0].existing?.id, september.id);
assert.equal(toFinanceDateKey(due[0].date), '2026-09-03');
assert.equal(isRecurringOccurrenceRepresented(maria, '2026-09-03', ledger), true);
assert.equal(isRecurringOccurrenceRepresented(maria, '2026-10-03', ledger), false);
const registered = { ...september, status: 'paid' as const };
assert.deepEqual(getPendingManualRecurrences(maria, [maria, august, registered], today), []);
assert.equal(isRecurringOccurrenceRepresented(maria, '2026-09-03', [registered]), true);
// ID belongs to the scheduled cycle, even when paid late or from another tab.
const latePayment = buildManualRecurringTransaction(maria, due[0].date, new Date(2026, 8, 15));
assert.equal(latePayment.id, september.id);
assert.equal(latePayment.recurrenceScheduledDate, '2026-09-03');
assert.equal(latePayment.date, '2026-09-03');
assert.equal(latePayment.paidAt, new Date(2026, 8, 15).toISOString());

// New templates start pending, including the first due instalment.
const fresh = source({ status: 'pending', date: '2026-09-01', firstAmount: 90, nextAmount: 170, paymentMethod: 'transfer', paymentAccount: 'revolut_pro' });
const initialDue = getPendingManualRecurrences(fresh, [fresh], today);
assert.equal(initialDue.length, 1);
const firstPayment = buildManualRecurringTransaction(fresh, initialDue[0].date, today);
assert.equal(firstPayment.amount, 90);
assert.equal(firstPayment.paymentAccount, 'revolut_pro');
assert.equal(firstPayment.id, getRecurringOccurrenceId(fresh.id, '2026-09-01'));
assert.equal(getPendingManualRecurrences(fresh, [fresh, firstPayment], today).length, 0);
assert.equal(isRecurringOccurrenceRepresented(fresh, '2026-09-01', [fresh, firstPayment]), true);
assert.equal(buildManualRecurringTransaction(fresh, new Date(2026, 9, 1), today).amount, 170);
assert.deepEqual(getPendingManualRecurrences(source({ date: '2026-10-01', status: 'pending' }), [], today), []);

// Calendar boundaries, finite plans and expenses obey the same manual workflow.
const capped = source({ date: '2026-01-31', status: 'pending', recurrenceOccurrenceCount: 3, type: 'expense' });
assert.deepEqual(getPendingManualRecurrences(capped, [], today).map(item => toFinanceDateKey(item.date)), ['2026-01-31', '2026-02-28', '2026-03-31']);
const ended = source({ date: '2026-08-31', status: 'pending', recurrencePeriod: 'weekly', recurrenceEndDate: '2026-09-07' });
assert.deepEqual(getPendingManualRecurrences(ended, [], today).map(item => toFinanceDateKey(item.date)), ['2026-08-31', '2026-09-07']);
assert.equal(buildManualRecurringTransaction(capped, new Date(2026, 0, 31), today).type, 'expense');
assert.throws(() => buildManualRecurringTransaction(source({ paymentMethod: 'stripe' })), /Solo/);
assert.throws(() => buildManualRecurringTransaction(source({ amount: 0 })), /importe/);

// Legacy manually registered rows remain linked without matching unrelated clients.
const legacy = { ...september, id: 'legacy', recurrenceSourceId: undefined, recurrenceScheduledDate: undefined, status: 'paid' as const };
assert.equal(findRecurringOccurrence(maria, '2026-09-03', [legacy])?.id, 'legacy');
assert.equal(findRecurringOccurrence(maria, '2026-09-03', [{ ...legacy, clientId: 'another-client' }]), undefined);
assert.equal(isRecurringOccurrenceRepresented(maria, '2026-09-03', [{ ...september, status: 'failed' }]), false);
console.log('Recurrencias: registro manual de efectivo/transferencia, deduplicación mensual, fechas programadas, importes y límites verificados.');
