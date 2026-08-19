import { ClientContact, Invoice } from '../types';

export type InvoicePrefill = {
 id: string;
 name?: string;
 email?: string;
 taxId?: string;
 address?: string;
 currency?: string;
 language?: string;
 taxPercentage?: number;
 transactionIds?: string[];
};

let pendingInvoicePrefill: InvoicePrefill | null = null;

export const setInvoicePrefill = (prefill: InvoicePrefill) => {
 pendingInvoicePrefill = prefill;
};

export const peekInvoicePrefill = () => pendingInvoicePrefill;

export const clearInvoicePrefill = () => {
 pendingInvoicePrefill = null;
};

const normalizeEmail = (value?: string) => (value || '').trim().toLowerCase();

export const resolveInvoiceClientData = (invoice: Invoice, contacts: ClientContact[]): Invoice => {
 const contact = contacts.find(candidate => {
  if (invoice.clientId) return candidate.id === invoice.clientId;
  const invoiceEmail = normalizeEmail(invoice.clientEmail);
  return Boolean(invoiceEmail && invoiceEmail === normalizeEmail(candidate.email));
 });

 if (!contact) return invoice;

 return {
  ...invoice,
  clientName: invoice.clientName || contact.name,
  clientEmail: invoice.clientEmail || contact.email,
  clientTaxId: invoice.clientTaxId || contact.taxId,
  clientAddress: invoice.clientAddress || contact.fiscalAddress || contact.location,
  currency: invoice.currency || contact.currency,
  language: invoice.language || contact.language,
 };
};
