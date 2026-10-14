import type { Invoice } from '../types';

// Fiscal edits preserve every billed line, including lines without a linked receipt.
// Receipts represent collection, not the value of the invoice.
export function repriceInvoiceTax(invoice: Invoice, taxPercentage: number): Invoice {
 const factor = 1 + taxPercentage / 100;
 const items = invoice.items.map(item => {
  const grossAmount = Number((item.grossAmount ?? item.total * (1 + invoice.taxPercentage / 100)).toFixed(2));
  const total = grossAmount / factor;
  return { ...item, grossAmount, total, unitPrice: total / Math.max(1, Number(item.quantity) || 1) };
 });
 const total = items.length ? Number(items.reduce((sum, item) => sum + item.grossAmount, 0).toFixed(2)) : invoice.total;
 const subtotal = Number((total / factor).toFixed(2));
 return { ...invoice, items, total, subtotal, taxPercentage, taxAmount: Number((total - subtotal).toFixed(2)) };
}
