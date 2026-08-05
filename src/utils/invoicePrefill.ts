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
