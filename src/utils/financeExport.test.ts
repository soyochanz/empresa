import assert from 'node:assert/strict';
import { matchesExportSource, exportTotals, createMovementPdf } from './financeExport';
import type { FinanceTransaction } from '../types';
import { CASH_OPENING_BALANCE, CASH_OPENING_ISO, isCashAfterOpening } from './cashOpening';

const tx = (patch: Partial<FinanceTransaction> = {}): FinanceTransaction => ({ id: 'test', type: 'income', status: 'paid', amount: 100, category: 'Ventas', description: 'Prueba', date: '2026-09-09', ...patch });
assert.equal(CASH_OPENING_BALANCE, 670);
assert.equal(isCashAfterOpening(tx({ date: '2026-08-30', createdAt: CASH_OPENING_ISO })), true);
assert.equal(isCashAfterOpening(tx({ date: '2026-08-30', createdAt: '2026-08-30T13:05:07.970Z' })), false);
assert.equal(isCashAfterOpening(tx({ date: '2026-08-29', createdAt: '2026-09-09T12:00:00Z' })), false);
assert.equal(isCashAfterOpening(tx({ date: '2026-08-29', paidAt: '2026-09-01T12:00:00Z' })), true);
for (const source of ['cash', 'all'] as const) {
 assert.equal(matchesExportSource(tx({ paymentMethod: 'cash', date: '2026-08-29' }), source), false);
 assert.equal(matchesExportSource(tx({ paymentMethod: 'cash', date: '2026-08-31' }), source), true);
}
assert.equal(matchesExportSource(tx({ paymentMethod: 'transfer', date: '2026-08-29' }), 'all'), true);
assert.equal(matchesExportSource(tx({ paymentMethod: 'card' }), 'card'), true);
assert.equal(matchesExportSource(tx({ paymentMethod: 'card' }), 'revolut_pro'), true);
assert.equal(matchesExportSource(tx({ paymentMethod: 'card', paymentAccount: 'carlos_personal' }), 'revolut_pro'), false);
assert.equal(matchesExportSource(tx({ type: 'expense', paymentMethod: 'stripe' }), 'stripe'), true);
assert.equal(matchesExportSource(tx({ isRecurring: true, paymentMethod: 'stripe' }), 'stripe'), false);
assert.equal(matchesExportSource(tx({ type: 'expense', paymentMethod: 'transfer' }), 'revolut_pro'), false);
assert.deepEqual(exportTotals([tx(), tx({ type: 'expense', amount: 25 }), tx({ status: 'pending', amount: 80 }), tx({ type: 'expense', status: 'pending', amount: 30 }), tx({ status: 'failed', amount: 500 })]), { income: 100, expense: 25, net: 75, pendingIncome: 80, pendingExpense: 30, failed: 1 });
const rows = Array.from({ length: 150 }, (_, i) => ['09/09/2026', `Movimiento ${i} · Factura AL-2026-${i}`, 'Ingreso', 'Cobrado', 'Tarjeta / Revolut Pro', '+100,00 €']);
rows[80][1] = 'Descripción extensa '.repeat(300);
const pdf = await createMovementPdf('Tarjetas', 'Todo el histórico', exportTotals([tx()]), rows);
assert.ok(pdf.getNumberOfPages() > 3);
const output = pdf.output();
assert.ok(output.includes('Movimiento 149'), 'Final movement must survive pagination');
assert.equal((output.match(/Concepto \/ cliente \/ factura/g) || []).length, pdf.getNumberOfPages(), 'Repeat table headers on every page');
console.log('Finance export: source filters, paid/pending totals and multi-page PDF passed.');
