import assert from 'node:assert/strict';
import type { Invoice } from '../src/types';
import { repriceInvoiceTax } from '../src/utils/invoiceTotals';

const invoice: Invoice = {
 id: 'AL-2026-902', clientName: 'Test', clientEmail: '', date: '2026-08-14', dueDate: '2026-09-14',
 status: 'paid', subtotal: 206.61, taxAmount: 43.39, taxPercentage: 21, total: 250,
 items: [0, 1].map(n => ({ id: `line-${n}`, description: 'Monthly service', quantity: 1,
  unitPrice: 250 / 1.21, total: 250 / 1.21, grossAmount: 250,
  pendingTxId: n === 1 ? 'receipt' : undefined })),
};
const fixed = repriceInvoiceTax(invoice, 21);
assert.equal(fixed.total, 500);
assert.equal(fixed.subtotal, 413.22);
assert.equal(fixed.taxAmount, 86.78);
assert.equal(fixed.status, 'paid');
assert.deepEqual(fixed.items.map(i => i.pendingTxId), [undefined, 'receipt']);
assert.deepEqual(repriceInvoiceTax(fixed, 21), fixed);
const exempt = repriceInvoiceTax(invoice, 0);
assert.equal(exempt.total, 500);
assert.equal(exempt.subtotal, 500);
assert.equal(exempt.taxAmount, 0);
assert.equal(exempt.items[0].unitPrice, 250);
const legacy = repriceInvoiceTax({ ...invoice, items: invoice.items.map(i => ({ ...i, grossAmount: undefined, total: 206.61 })) }, 21);
assert.equal(legacy.total, 500);
assert.equal(repriceInvoiceTax({ ...invoice, items: [] }, 0).total, 250);
assert.equal(invoice.total, 250);
console.log('Invoice totals: partial receipt links, fiscal changes, legacy rounding, idempotency and empty lines passed.');

const { assertInvoiceTotals, calculateInvoiceTotals, splitInstallmentAmounts, moneyCents } = await import('../src/utils/invoiceTotals');
assert.throws(() => assertInvoiceTotals(invoice), /no cuadra/);
assert.doesNotThrow(() => assertInvoiceTotals(fixed));
assert.throws(() => assertInvoiceTotals({ ...fixed, taxAmount: 0 }), /no cuadra/);
for (const invalid of [NaN, Infinity, -1]) {
 assert.throws(() => moneyCents(invalid));
 assert.throws(() => calculateInvoiceTotals(fixed.items, invalid));
}
assert.throws(() => calculateInvoiceTotals([{ ...fixed.items[0], quantity: 0 }], 21));
assert.throws(() => calculateInvoiceTotals([{ ...fixed.items[0], unitPrice: 1 }], 21));
assert.throws(() => calculateInvoiceTotals([{ ...fixed.items[0], grossAmount: 100 }], 21));
assert.deepEqual(splitInstallmentAmounts(100, 3), [33.34, 33.33, 33.33]);
for (const tax of [0, 4, 10, 21]) {
 for (let cents = 1; cents < 10000; cents += 37) {
  for (const count of [1, 2, 3, 12]) {
   const amounts = splitInstallmentAmounts(cents / 100, count);
   assert.equal(amounts.reduce((sum, amount) => sum + moneyCents(amount), 0), cents);
   const items = amounts.map((gross, n) => ({ id: String(n), description: 'Test', quantity: 1,
    grossAmount: gross, unitPrice: gross / (1 + tax / 100), total: gross / (1 + tax / 100) }));
   const totals = calculateInvoiceTotals(items, tax);
   assert.equal(moneyCents(totals.total), cents);
   assert.equal(moneyCents(totals.subtotal) + moneyCents(totals.taxAmount), cents);
   assertInvoiceTotals({ ...invoice, items, taxPercentage: tax, ...totals });
  }
 }
}
console.log('Invoice invariants: invalid data rejected; 4,336 tax/installment combinations preserve every cent.');

const fractional = repriceInvoiceTax({ ...fixed, items: [{ ...fixed.items[0], quantity: 0.5, unitPrice: fixed.items[0].total * 2 }] }, 10);
assert.doesNotThrow(() => assertInvoiceTotals(fractional));
