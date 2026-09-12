import assert from 'node:assert/strict';
import type { FinanceTransaction } from '../src/types.ts';
import { getMonthlyPendingFinance, isStripeManagedTransaction } from '../src/utils/pendingFinance.ts';

const tx = (patch: Partial<FinanceTransaction> = {}): FinanceTransaction => ({
 id: 'pending', type: 'income', category: 'Ventas', amount: 170,
 date: '2026-09-30', description: 'Cuota 3 de 3', status: 'pending', paymentMethod: 'transfer', ...patch,
});
const source = tx({ id: 'source', date: '2026-07-03', isRecurring: true, status: 'paid', recurrencePeriod: 'monthly', paymentMethod: 'cash' });
const existing = tx({ id: 'source__rec__20260903', date: '2026-09-03', recurrenceSourceId: 'source', recurrenceScheduledDate: '2026-09-03' });
const fixtures = [source, existing, tx(), tx({ id: 'expense', type: 'expense', paymentMethod: 'card' }),
 tx({ id: 'old', date: '2026-08-01' }), tx({ id: 'paid', status: 'paid' }), tx({ id: 'failed', status: 'failed' }),
 tx({ id: 'stripe', paymentMethod: 'stripe' }), tx({ id: 'checkout', stripeCheckoutSessionId: 'cs_real' }),
 tx({ id: 'stripe-invoice', stripeInvoiceId: 'in_real' }), tx({ id: 'stripe-sub', stripePlanId: 'sub_real' })];
const september = getMonthlyPendingFinance(fixtures, '2026-09');
assert.deepEqual(september.map(item => item.id), [existing.id, 'expense', 'pending']);
assert.equal(september[0].existing?.id, existing.id);
assert.equal(september[0].source?.id, source.id);
assert.equal(september.some(item => item.transaction.type === 'expense'), true);
assert.equal(getMonthlyPendingFinance(fixtures.map(item => item.id === existing.id ? { ...item, status: 'paid' as const } : item), '2026-09').length, 2);
const projected = getMonthlyPendingFinance([source], '2026-09');
assert.equal(projected.length, 1);
assert.equal(projected[0].transaction.status, 'pending');
assert.equal(projected[0].transaction.date, '2026-09-03');
assert.equal(projected[0].existing, undefined);
assert.equal(getMonthlyPendingFinance([source], '2026-10')[0].transaction.date, '2026-10-03');
assert.deepEqual(getMonthlyPendingFinance(fixtures, ''), []);
assert.deepEqual(getMonthlyPendingFinance([tx({ isRecurring: true, amount: 0 })], '2026-09'), []);
assert.equal(isStripeManagedTransaction(tx({ id: 'tx_stripe_123' })), true);
assert.equal(isStripeManagedTransaction(tx({ paymentMethod: 'card' })), false);
const stripeSource = { ...source, paymentMethod: 'stripe' as const };
assert.deepEqual(getMonthlyPendingFinance([stripeSource, existing], '2026-09'), []);
console.log('Pendientes: mes completo, cuotas e ingresos/gastos, ausencia de duplicados y exclusión de Stripe verificados.');
