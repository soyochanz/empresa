import React, { useRef, useState } from 'react';
import { Plus, LoaderCircle } from 'lucide-react';
import type { ComercialAccount } from '../types';

export default function ManualCommissionForm({ commercial, disabled, onSave, onBusyChange }: {
 key?: string;
 commercial: ComercialAccount;
 disabled: boolean;
 onSave: (account: ComercialAccount) => void | Promise<void>;
 onBusyChange: (busy: boolean) => void;
}) {
 const [open, setOpen] = useState(false);
 const [amount, setAmount] = useState('');
 const [reason, setReason] = useState('');
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 const [error, setError] = useState('');
 const saving = useRef(false);
 const entryId = useRef<string | null>(null);
 const submit = async (event: React.FormEvent) => {
  event.preventDefault();
  if (saving.current || disabled) return;
  const value = Number(amount.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) <= 0) {
   setError('Introduce un importe mayor que cero.'); return;
  }
  if (!reason.trim()) { setError('Indica el concepto de la comisión.'); return; }
  saving.current = true; setBusy(true); onBusyChange(true); setError(''); setMessage('');
  // Retain the ID on retry if persistence succeeded but the finance refresh failed.
  entryId.current ||= `extra_${crypto.randomUUID()}`;
  const extra = { id: entryId.current, amount: Math.round(value * 100) / 100, reason: reason.trim(), date: new Date().toISOString(), status: 'pending' as const };
  try {
   await onSave({ ...commercial, extraCommissions: [extra, ...(commercial.extraCommissions || []).filter(item => item.id !== extra.id)] });
   setMessage(`${extra.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} añadidos a las comisiones de ${commercial.name}, pendientes de liquidar.`);
   entryId.current = null; setAmount(''); setReason(''); setOpen(false);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'No se pudo guardar la comisión. Vuelve a intentarlo.');
  } finally { saving.current = false; setBusy(false); onBusyChange(false); }
 };
 return <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/[0.04] p-3">
  <button type="button" disabled={busy || disabled} onClick={() => { setOpen(!open); setMessage(''); setError(''); }} className="flex w-full items-center justify-center gap-2 text-xs font-bold text-indigo-300 disabled:opacity-50">
   <Plus className="h-4 w-4" /> {open ? 'Cerrar comisión manual' : 'Añadir comisión manual'}
  </button>
  {open && <form onSubmit={submit} className="mt-3 space-y-3">
   <p className="text-[11px] text-slate-400">Añade un importe fijo para {commercial.name}. Se suma a lo disponible para liquidar. El dinero se descuenta al liquidarlo: cash de caja, transferencia de Revolut o pago por Stripe.</p>
   <label className="block text-xs text-slate-300">Importe (€)
    <input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} placeholder="0,00" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" />
   </label>
   <label className="block text-xs text-slate-300">Concepto
    <input required maxLength={300} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} placeholder="Por ejemplo: bonus por captación" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" />
   </label>
   <button type="submit" disabled={busy || disabled} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
    {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} {busy ? 'Guardando…' : 'Guardar comisión pendiente'}
   </button>
  </form>}
  {error && <p role="alert" className="mt-2 text-xs text-rose-400">{error}</p>}
  {message && <p role="status" className="mt-2 text-xs text-emerald-400">{message}</p>}
 </div>;
}
