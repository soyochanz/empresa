import React, { useRef, useState } from 'react';
import { db, invalidateSharedPipelineCache } from '../supabaseClient';
import { buildManualRecurringTransaction, findRecurringOccurrence, toFinanceDateKey } from '../utils/financeRecurrence';
import { buildPaymentSchedule, paymentMoney, type ScheduledPayment } from '../utils/paymentSchedule';

export default function MarkScheduledPaymentPaid({ payment, onSaved, onClose }: {
 payment: ScheduledPayment;
 onSaved: () => void;
 onClose: () => void;
}) {
 const [paidDate, setPaidDate] = useState(toFinanceDateKey(new Date()));
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
   if (!source || source.type !== 'income' || source.paymentMethod === 'stripe') {
    throw new Error('Actualiza la agenda para revisar este cobro.');
   }
   if (source.isRecurring) {
    const contacts = await db.getContacts();
    const scheduled = buildPaymentSchedule(transactions, [], contacts).find(row => row.transactionId === source.id && row.date === payment.date);
    if (!scheduled) throw new Error('Esta cuota ya está cobrada o su planificación ha cambiado.');
    const existing = findRecurringOccurrence(source, payment.date, transactions);
    const receipt = buildManualRecurringTransaction(source, new Date(payment.date + 'T12:00:00'), paidAt);
    await db.registerManualFinanceRecurrence(receipt, existing);
   } else {
    await db.registerPendingFinanceTransaction({ ...source, status: 'paid', paidAt: paidAt.toISOString() }, source);
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
  <div className="pay-month-title"><h3>Registrar cobro · {payment.customer}</h3><button disabled={busy} onClick={onClose}>Cerrar</button></div>
  <p>{payment.description} · {paymentMoney(payment)} · {payment.method}</p>
  <label>Fecha de cobro <input type="date" value={paidDate} max={toFinanceDateKey(new Date())} onChange={event => setPaidDate(event.target.value)} /></label>
  {error && <p role="alert" className="pay-warning">{error}</p>}
  <div className="pay-toolbar"><button disabled={busy} onClick={() => void save()}>{busy ? 'Registrando…' : 'Confirmar cobro recibido'}</button></div>
 </section>;
}
