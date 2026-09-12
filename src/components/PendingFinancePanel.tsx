import { useState } from 'react';
import type { FinanceTransaction } from '../types';
import type { PendingFinanceItem } from '../utils/pendingFinance';

type PaymentMethod = 'cash' | 'transfer' | 'card';

export default function PendingFinancePanel({ items, month, onMonthChange, registering, onRegister }: {
 items: PendingFinanceItem[];
 month: string;
 onMonthChange: (month: string) => void;
 registering: Set<string>;
 onRegister: (item: PendingFinanceItem, method: PaymentMethod, account?: FinanceTransaction['paymentAccount']) => void;
}) {
 const [methods, setMethods] = useState<Record<string, PaymentMethod>>({});
 const [accounts, setAccounts] = useState<Record<string, string>>({});
 return <section className="space-y-4 p-5" aria-label="Transacciones pendientes del mes">
  <div className="flex flex-wrap items-end justify-between gap-3">
   <label className="text-xs text-slate-300">Mes
    <input type="month" value={month} onChange={event => onMonthChange(event.target.value)} className="mt-1 block rounded-xl border border-white/10 bg-slate-950 p-2 text-sm text-white" />
   </label>
   <p className="text-xs text-amber-300">{items.length} pendiente{items.length === 1 ? '' : 's'}</p>
  </div>
  <p className="text-xs text-slate-400">Cuotas, cobros y pagos del mes. Selecciona cómo se ha pagado y pulsa Registrar. Los pagos de Stripe se gestionan aparte.</p>
  <div className="max-h-[55vh] space-y-3 overflow-y-auto">
   {items.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">No hay pagos pendientes fuera de Stripe para este mes.</p>}
   {items.map(item => {
    const tx = item.transaction;
    const method = methods[item.id] || (['cash', 'transfer', 'card'].includes(tx.paymentMethod || '') ? tx.paymentMethod as PaymentMethod : undefined);
    const account = accounts[item.id] ?? tx.paymentAccount ?? '';
    const busy = registering.size > 0;
    return <article key={item.id} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
     <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h4 className="break-words text-sm font-bold text-white">{tx.description}</h4>
       <p className="mt-1 text-xs text-slate-400">{tx.date.slice(0, 10).split('-').reverse().join('/')} · {tx.type === 'income' ? 'Por cobrar' : 'Por pagar'}{item.source || tx.recurrenceSourceId ? ' · Cuota recurrente' : ''}</p>
      </div>
      <strong className={`shrink-0 text-sm ${tx.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>{tx.type === 'income' ? '+' : '−'}{tx.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong>
     </div>
     <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[130px] flex-1 text-xs text-slate-400">Método de pago
       <select aria-label={`Método de pago: ${tx.description}`} value={method || ''} disabled={busy} onChange={event => setMethods(prev => ({ ...prev, [item.id]: event.target.value as PaymentMethod }))} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-xs text-white">
        <option value="" disabled>Selecciona un método</option><option value="cash">Efectivo</option><option value="transfer">Transferencia bancaria</option><option value="card">Tarjeta (fuera de Stripe)</option>
       </select>
      </label>
      {method && method !== 'cash' && <label className="min-w-[130px] flex-1 text-xs text-slate-400">Cuenta
       <select value={account} disabled={busy} onChange={event => setAccounts(prev => ({ ...prev, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-xs text-white">
        <option value="">Sin especificar</option><option value="revolut_pro">Revolut Pro</option><option value="carlos_personal">Carlos personal</option><option value="nacho_personal">Nacho personal</option>
       </select>
      </label>}
      <button type="button" disabled={busy || !method} onClick={() => method && onRegister(item, method, method === 'cash' ? undefined : account as FinanceTransaction['paymentAccount'] || undefined)} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{registering.has(item.id) ? 'Registrando…' : 'Registrar'}</button>
     </div>
    </article>;
   })}
  </div>
 </section>;
}
