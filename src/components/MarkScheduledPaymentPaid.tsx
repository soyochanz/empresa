import { generateReceiptInvoice } from '../utils/receiptInvoice';
import React, { useRef, useState } from 'react';
import type { FinanceTransaction } from '../types';
import { isStripeManagedTransaction } from '../utils/pendingFinance';
import { db, invalidateSharedPipelineCache } from '../supabaseClient';
import { buildManualRecurringTransaction, findRecurringOccurrence, toFinanceDateKey } from '../utils/financeRecurrence';
import { buildPaymentSchedule, paymentMoney, type ScheduledPayment } from '../utils/paymentSchedule';

export default function MarkScheduledPaymentPaid({ payment, onSaved, onClose }: {
 payment: ScheduledPayment;
 onSaved: () => void;
 onClose: () => void;
}) {
 const [paidDate, setPaidDate] = useState(toFinanceDateKey(new Date()));
 const [method, setMethod] = useState<'transfer' | 'cash' | 'card'>(payment.paymentMethod === 'cash' ? 'cash' : payment.paymentMethod === 'card' ? 'card' : 'transfer');
 const [account, setAccount] = useState<NonNullable<FinanceTransaction['paymentAccount']>>('revolut_pro');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const saving = useRef(false);

 async function save() {
  if (saving.current) return;
  saving.current = true;
  setBusy(true);
  setError('');
  try {
   const paidAt = new Date(paidDate + 'T12:00:00');
   if (!paidDate || !Number.isFinite(paidAt.getTime()) || paidDate > toFinanceDateKey(new Date())) {
    throw new Error('Selecciona la fecha en que recibiste el cobro.');
   }
   invalidateSharedPipelineCache(['finance_transactions']);
   const transactions = await db.getFinanceTransactions();
   const source = transactions.find(tx => tx.id === payment.transactionId);
   if (!source || source.paymentMethod === 'stripe') {
    throw new Error('Actualiza la agenda para revisar este cobro.');
   }
   // Legacy CRM manual templates used a local plan ID unrelated to Stripe.
   const manualSource = source.isRecurring && /^(recurring_service_|recurring_tx_)/.test(source.id)
    && !source.stripeCheckoutSessionId && !source.stripeCheckoutUrl && !source.stripeInvoiceId
    && !source.stripePlanId?.startsWith('sub_')
    ? { ...source, stripePlanId: undefined } : source;
   if (isStripeManagedTransaction(manualSource)) throw new Error('Este cobro está vinculado a Stripe y debe confirmarse desde Stripe.');
   const paymentDetails = { paymentMethod: method, paymentAccount: method === 'cash' ? undefined : account };
   let receiptId = source.id;
   if (source.isRecurring) {
    const contacts = await db.getContacts();
    const scheduled = buildPaymentSchedule(transactions, [], contacts, new Date(), source.type).find(row => row.transactionId === source.id && row.date === payment.date);
    if (!scheduled) throw new Error('Esta cuota ya está cobrada o su planificación ha cambiado.');
    const existing = findRecurringOccurrence(source, payment.date, transactions);
    const receipt = buildManualRecurringTransaction({ ...manualSource, ...paymentDetails }, new Date(payment.date + 'T12:00:00'), paidAt);
    await db.registerManualFinanceRecurrence(receipt, existing);
    receiptId = existing?.id || receipt.id;
   } else {
    await db.registerPendingFinanceTransaction({ ...source, ...paymentDetails, status: 'paid', paidAt: paidAt.toISOString() }, source);
   }
   if (source.type === 'income' && source.clientId) {
    try { await generateReceiptInvoice(receiptId); } catch { window.alert('Cobro registrado. La factura está pendiente de generar; puedes reintentarlo desde Facturas en el CRM.'); }
   }
   onSaved();
   onClose();
  } catch (cause) {
   setError(cause instanceof Error ? cause.message : 'No se pudo registrar el cobro.');
  } finally {
   saving.current = false;
   setBusy(false);
  }
 }

 return <section className="pay-month-history">
  <div className="pay-month-title"><h3>Registrar {payment.direction==='expense'?'pago':'cobro'} · {payment.customer}</h3><button disabled={busy} onClick={onClose}>Cerrar</button></div>
  <p>{payment.description} · {paymentMoney(payment)} · {payment.method}</p>
  <div className="pay-filters">
   <label>Método de pago <select aria-label="Método de pago" value={method} disabled={busy} onChange={event => setMethod(event.target.value as typeof method)}>
    <option value="transfer">Transferencia bancaria</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option>
   </select></label>
   {method !== 'cash' && <label>{payment.direction==='expense'?'Cuenta de origen':'Cuenta receptora'} <select aria-label="Cuenta receptora" value={account} disabled={busy} onChange={event => setAccount(event.target.value as typeof account)}>
    <option value="revolut_pro">Revolut empresa</option><option value="carlos_personal">Cuenta personal de Carlos</option><option value="nacho_personal">Cuenta personal de Nacho</option>
   </select></label>}
  </div>
  <label>Fecha de {payment.direction==='expense'?'pago':'cobro'} <input type="date" value={paidDate} max={toFinanceDateKey(new Date())} onChange={event => setPaidDate(event.target.value)} /></label>
  {error && <p role="alert" className="pay-warning">{error}</p>}
  <div className="pay-toolbar"><button disabled={busy} onClick={() => void save()}>{busy ? 'Registrando…' : payment.direction==='expense'?'Confirmar pago realizado':'Confirmar cobro recibido'}</button></div>
 </section>;
}
