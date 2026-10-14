import type { Invoice, InvoiceItem } from '../types';

export function moneyCents(value: number): number {
 if (!Number.isFinite(value) || value < 0) throw new Error('El importe debe ser un número válido y no negativo.');
 const cents = Math.round((value + Number.EPSILON) * 100);
 if (!Number.isSafeInteger(cents)) throw new Error('El importe supera el límite permitido.');
 return cents;
}

export function splitInstallmentAmounts(total: number, count: number): number[] {
 if (!Number.isInteger(count) || count < 1 || count > 1200) throw new Error('El número de cuotas no es válido.');
 const cents = moneyCents(total);
 const base = Math.floor(cents / count);
 const remainder = cents % count;
 return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

export function calculateInvoiceTotals(items: InvoiceItem[], taxPercentage: number, emptyTotal = 0) {
 if (!Number.isFinite(taxPercentage) || taxPercentage < 0 || taxPercentage > 100) throw new Error('El IVA debe estar entre 0 y 100.');
 const factor = 1 + taxPercentage / 100;
 const cents = items.length ? items.reduce((sum, item) => {
  if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('La cantidad de cada concepto debe ser mayor que cero.');
  moneyCents(item.unitPrice);
  moneyCents(item.total);
  if (Math.abs(moneyCents(item.unitPrice * item.quantity) - moneyCents(item.total)) > 1) {
   throw new Error('El precio y la cantidad no coinciden con el importe del concepto.');
  }
  if (item.grossAmount !== undefined && Math.abs(moneyCents(item.grossAmount) - moneyCents(item.total * factor)) > 1) {
   throw new Error('La base y el IVA no coinciden con el importe del concepto.');
  }
  return sum + moneyCents(item.grossAmount ?? item.total * factor);
 }, 0) : moneyCents(emptyTotal);
 if (!Number.isSafeInteger(cents)) throw new Error('El total supera el límite permitido.');
 const netCents = Math.round(cents / factor);
 return { total: cents / 100, subtotal: netCents / 100, taxAmount: (cents - netCents) / 100 };
}

// Reject inconsistent invoices at persistence/export boundaries rather than publishing wrong totals.
export function assertInvoiceTotals(invoice: Invoice): void {
 const expected = calculateInvoiceTotals(invoice.items, invoice.taxPercentage, invoice.total);
 for (const key of ['total', 'subtotal', 'taxAmount'] as const) {
  if (moneyCents(invoice[key]) !== moneyCents(expected[key])) {
   throw new Error(`La factura ${invoice.id} no cuadra: revisa sus conceptos y vuelve a guardarla. Total esperado: ${expected.total.toFixed(2)}.`);
  }
 }
}

// Fiscal edits preserve every billed line, including lines without a linked receipt.
// Receipts represent collection, not the value of the invoice.
export function repriceInvoiceTax(invoice: Invoice, taxPercentage: number): Invoice {
 calculateInvoiceTotals(invoice.items, invoice.taxPercentage, invoice.total);
 const factor = 1 + taxPercentage / 100;
 const items = invoice.items.map(item => {
  const grossAmount = Number((item.grossAmount ?? item.total * (1 + invoice.taxPercentage / 100)).toFixed(2));
  const total = grossAmount / factor;
  return { ...item, grossAmount, total, unitPrice: total / item.quantity };
 });
 const totals = calculateInvoiceTotals(items, taxPercentage, invoice.total);
 return { ...invoice, items, ...totals, taxPercentage };
}
