import { authenticatedFetch } from './authenticatedFetch';
import { readApiResponse } from './readApiResponse';
import { invalidateSharedPipelineCache } from '../supabaseClient';
export async function generateReceiptInvoice(transactionId: string) {
 const result = await readApiResponse(await authenticatedFetch('/api/finance/receipt-invoice', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({transactionId})
 }));
 invalidateSharedPipelineCache(['finance_invoices']);
 return result;
}
