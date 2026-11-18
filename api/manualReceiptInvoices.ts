import type { Express, RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { DEFAULT_INVOICE_ISSUER as issuer } from '../src/utils/invoiceIssuer';

export const receiptTag = (description: string, key: string) => [...String(description || '').matchAll(new RegExp('\\[' + key + ':([^\\]]+)\\]', 'g'))].at(-1)?.[1] || '';
function metadata(raw: string, key: string) {
 const line = (String(raw || '').split('\n\n---METADATA---')[1] || '').split('\n').find(l => l.startsWith(key + ':'));
 try { return decodeURIComponent(line?.slice(key.length + 1).trim() || ''); } catch { return ''; }
}
export function manualReceiptEligible(tx: any) {
 return tx?.type === 'income' && tx.status === 'paid' && !tx.isRecurring && Number(tx.amount) > 0
  && ['cash', 'card', 'transfer'].includes(receiptTag(tx.description, 'PM'))
  && !!receiptTag(tx.description, 'CLIENT') && !receiptTag(tx.description, 'STRIPEINVOICE')
  && receiptTag(tx.description, 'LEDGER_EXCLUDED') !== 'true';
}
// Separate automatic-receipt series: deterministic identity makes concurrent retries safe,
// including requests served by different instances during a deployment.
export const receiptInvoiceId = (tx: any) => {
 const date = (receiptTag(tx.description, 'PAID_AT') || tx.date).slice(0, 10);
 return 'AL-' + date.slice(0, 4) + '-R' + createHash('sha256').update(tx.id).digest('hex').slice(0, 16).toUpperCase();
};
export async function ensureManualReceiptInvoice(db: SupabaseClient, transactionId: string) {
 const { data: tx, error } = await db.from('finance_transactions').select('*').eq('id', transactionId).maybeSingle();
 if (error) throw error;
 if (!manualReceiptEligible(tx)) return { created: false, reason: 'not_confirmed_manual_receipt' };
 const id = receiptInvoiceId(tx);
 const lookup = await Promise.all([
  db.from('finance_invoices').select('id').eq('id', id).maybeSingle(),
  db.from('finance_invoices').select('id').contains('items', JSON.stringify([{pendingTxId: tx.id}])).limit(1),
  db.from('finance_invoices').select('id').contains('items', JSON.stringify([{id: tx.id}])).limit(1),
  receiptTag(tx.description, 'INV') ? db.from('finance_invoices').select('id').eq('id', receiptTag(tx.description, 'INV')).maybeSingle() : Promise.resolve({data:null,error:null}),
 ]);
 for (const result of lookup) if (result.error) throw result.error;
 const existing = lookup.map(result => Array.isArray(result.data) ? result.data[0] : result.data).find(Boolean);
 if (existing) return { created: false, invoiceId: existing.id };
 const { data: contact, error: contactError } = await db.from('contacts').select('id,name,email,location,hostingCredentials').eq('id', receiptTag(tx.description, 'CLIENT')).maybeSingle();
 if (contactError) throw contactError;
 if (!contact) throw new Error('No se encuentra el cliente del cobro.');
 const rawTax = metadata(contact.hostingCredentials, 'taxPercentage');
 const taxPercentage = rawTax !== '' && Number.isFinite(Number(rawTax)) && Number(rawTax) >= 0 ? Number(rawTax) : 21;
 const total = Math.round(Number(tx.amount) * 100) / 100;
 const subtotal = Math.round(total / (1 + taxPercentage / 100) * 100) / 100;
 const date = (receiptTag(tx.description, 'PAID_AT') || tx.date).slice(0, 10);
 const tags: Record<string, string> = {
  ISSUER_NAME: issuer.name, ISSUER_TAX_ID: issuer.taxId, ISSUER_ADDRESS: issuer.address, ISSUER_BRAND: issuer.brand, ISSUER_EMAIL: issuer.email,
  CLIENT_TAX_ID: metadata(contact.hostingCredentials, 'taxId'),
  CLIENT_ADDRESS: metadata(contact.hostingCredentials, 'fiscalAddress') || contact.location || '',
  INVOICE_CURRENCY: 'EUR', INVOICE_LANGUAGE: 'es',
 };
 const payload = {
  id, user_id: tx.user_id || null, clientId: contact.id,
  clientName: metadata(contact.hostingCredentials, 'fiscalName') || contact.name,
  clientEmail: contact.email || '', date, dueDate: date, status: 'paid',
  subtotal, taxPercentage, taxAmount: Math.round((total - subtotal) * 100) / 100, total,
  items: [{ id: 'receipt_' + tx.id, pendingTxId: tx.id, description: tx.description.replace(/\s*\[[A-Z_]+:[^\]]*\]/g, '').replace(/^Cobro Pendiente:\s*/i, '').trim(), quantity: 1, unitPrice: subtotal, total: subtotal, grossAmount: total, isPending: false, paymentMethod: receiptTag(tx.description, 'PM') }],
  notes: 'Factura automática de cobro confirmado. Serie R.\n' + Object.entries(tags).filter(([,v]) => v).map(([k,v]) => '[' + k + ':' + encodeURIComponent(v) + ']').join('\n'),
 };
 const { error: insertError } = await db.from('finance_invoices').insert(payload);
 if (insertError && insertError.code !== '23505') throw insertError;
 return { created: !insertError, invoiceId: id };
}
export function registerManualReceiptInvoices(app: Express, db: SupabaseClient, admin: RequestHandler) {
 app.post('/api/finance/receipt-invoice', admin, async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (typeof req.body?.transactionId !== 'string' || req.body.transactionId.length > 200) return void res.status(400).json({error:'Selecciona un cobro.'});
  try { res.json(await ensureManualReceiptInvoice(db, req.body.transactionId)); }
  catch (error) { console.error('Receipt invoice failed:', error instanceof Error ? error.message : 'database error'); res.status(503).json({error:'El cobro está guardado, pero su factura no se ha podido generar. Reinténtalo desde el CRM.'}); }
 });
}
