import { Invoice } from '../types';

export const getNextInvoiceNumber = (invoices: Pick<Invoice, 'id'>[], year = new Date().getFullYear()): string => {
 const pattern = new RegExp(`^(?:AL|FAC)-${year}-(\\d+)$`, 'i');
 const highest = invoices.reduce((max, invoice) => {
  const match = String(invoice.id || '').match(pattern);
  return match ? Math.max(max, Number(match[1]) || 0) : max;
 }, 0);
 return `AL-${year}-${String(highest + 1).padStart(3, '0')}`;
};
