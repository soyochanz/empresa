import type { ClientContact, ComercialAccount, FinanceTransaction } from '../types';
import { getCommissionableGrossAmount } from '../utils/commission';

const money = (amount: number) => amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const dateLabel = (value: string) => {
 const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
 return Number.isFinite(date.getTime()) ? date.toLocaleDateString('es-ES') : 'Sin fecha';
};

export default function CommercialCommissionBreakdown({ transactions, commercial, percentage, contacts }: {
 transactions: FinanceTransaction[];
 commercial: ComercialAccount;
 percentage: number;
 contacts: ClientContact[];
}) {
 const paid = transactions.filter(transaction => transaction.status === 'paid');
 const pending = transactions.filter(transaction => transaction.status === 'pending');
 const extras = commercial.extraCommissions || [];
 const payouts = (commercial.payouts || []).filter(payout => payout.status === 'completed');
 const commission = (transaction: FinanceTransaction) => getCommissionableGrossAmount(transaction) * percentage / 100;
 const generated = paid.reduce((total, transaction) => total + commission(transaction), 0);
 const extraTotal = extras.reduce((total, extra) => total + Number(extra.amount || 0), 0);
 const liquidated = payouts.reduce((total, payout) => total + Number(payout.amount || 0), 0);
 const available = Math.max(0, generated + extraTotal - liquidated);
 const renderPayments = (items: FinanceTransaction[], title: string) => <div className="space-y-2">
  <h5 className="text-xs font-bold text-slate-200">{title} · {money(items.reduce((sum, item) => sum + commission(item), 0))}</h5>
  {items.length === 0 ? <p className="text-xs text-slate-400">No hay movimientos en este apartado.</p> : <div className="overflow-x-auto rounded-xl border border-white/10">
   <table className="w-full min-w-[540px] text-left text-[11px]">
    <thead className="bg-white/[0.04] text-slate-400"><tr><th className="p-3">Cliente / concepto</th><th className="p-3">Fecha</th><th className="p-3 text-right">Bruto</th><th className="p-3 text-right">%</th><th className="p-3 text-right">Comisión</th></tr></thead>
    <tbody>{[...items].sort((a,b) => b.date.localeCompare(a.date)).map(transaction => {
     const contact = contacts.find(item => item.id === transaction.clientId);
     return <tr key={transaction.id} className="border-t border-white/[0.06] text-slate-200">
      <td className="p-3"><p className="font-semibold">{contact?.company || contact?.name || 'Cliente sin vincular'}</p><p className="mt-1 text-slate-400">{transaction.description}</p>{transaction.invoiceId && <p className="mt-1 text-[10px] text-slate-500">Factura {transaction.invoiceId}</p>}</td>
      <td className="whitespace-nowrap p-3 text-slate-400">{dateLabel(transaction.date)}</td><td className="whitespace-nowrap p-3 text-right">{money(getCommissionableGrossAmount(transaction))}</td><td className="p-3 text-right">{percentage}%</td><td className="whitespace-nowrap p-3 text-right font-bold">{money(commission(transaction))}</td>
     </tr>;
    })}</tbody>
   </table>
  </div>}
 </div>;
 return <section className="space-y-5 rounded-2xl border border-indigo-400/20 bg-[#0b0c1e] p-5" aria-label="Desglose de comisiones">
  <div><h4 className="text-sm font-bold text-white">Desglose de comisiones</h4><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{percentage}% sobre el importe bruto, impuestos incluidos. Se aplica el porcentaje actual a las ventas iniciales registradas, también a las anteriores. Las recurrencias no generan comisión automática.</p></div>
  {renderPayments(paid, 'Comisiones por cobros recibidos')}
  {renderPayments(pending, 'Comisiones pendientes de cobro del cliente')}
  <div className="space-y-2"><h5 className="text-xs font-bold text-slate-200">Extras · {money(extraTotal)}</h5>
   {extras.length === 0 && <p className="text-xs text-slate-400">Sin extras registrados.</p>}
   {extras.map(extra => <div key={extra.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 p-3 text-xs"><div><p className="text-slate-200">{extra.reason}</p><p className="mt-1 text-[10px] text-slate-400">{dateLabel(extra.date)}{extra.status === 'paid' ? ' · Marcado como pagado' : ''}</p></div><strong className="whitespace-nowrap text-emerald-400">+{money(extra.amount)}</strong></div>)}
  </div>
  <div className="space-y-2"><h5 className="text-xs font-bold text-slate-200">Liquidaciones realizadas · {money(liquidated)}</h5>
   {payouts.length === 0 && <p className="text-xs text-slate-400">Sin liquidaciones completadas.</p>}
   {payouts.map(payout => <div key={payout.id} className="flex justify-between gap-3 rounded-xl border border-white/10 p-3 text-xs text-slate-200"><span>{dateLabel(payout.date)} · {payout.paymentMethod === 'cash' ? 'Efectivo' : payout.paymentMethod === 'stripe' ? 'Stripe' : payout.paymentMethod === 'transfer' ? 'Transferencia' : payout.paymentMethod === 'card' ? 'Tarjeta' : 'Método no indicado'}</span><strong className="whitespace-nowrap text-rose-400">−{money(payout.amount)}</strong></div>)}
  </div>
  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4"><p className="text-[11px] text-slate-400">Comisiones cobradas {money(generated)} + extras {money(extraTotal)} − liquidaciones {money(liquidated)}</p><p className="mt-2 text-sm font-bold text-emerald-400">Disponible para liquidar: {money(available)}</p><p className="mt-2 text-[10px] text-slate-400">La comisión de las cuotas pendientes se libera al registrar su cobro. Los extras ya incluidos en una liquidación se compensan con esa salida; no se vuelven a pagar.</p></div>
 </section>;
}
