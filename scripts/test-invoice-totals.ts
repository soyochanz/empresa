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
