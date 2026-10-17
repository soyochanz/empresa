import React, { useState } from 'react';
import { Copy, ExternalLink, RefreshCw, Link as LinkIcon } from 'lucide-react';
import type { FinanceTransaction } from '../types';

type LinkState = { status: string; paymentStatus: string; url?: string; expiresAt?: number; loading?: boolean; error?: string };
export default function ClientStripeActivity({ transactions, states, overview, loading, error, onRefresh, onInspect }: {
 key?: string; transactions: FinanceTransaction[]; states: Record<string, LinkState>; overview: any; loading: boolean; error: string;
 onRefresh: () => void; onInspect: (tx: FinanceTransaction) => void;
}) {
 const [filter, setFilter] = useState('all');
 const [notice, setNotice] = useState('');
 const links = [...new Map(transactions.filter(tx => tx.stripeCheckoutSessionId || tx.stripeCheckoutUrl).map(tx => [tx.stripeCheckoutSessionId || tx.stripeCheckoutUrl, tx])).values()];
 const status = (tx: FinanceTransaction) => {
  const s = states[tx.id];
  if (s?.status === 'complete' || s?.paymentStatus === 'paid') return 'complete';
  if (s?.status === 'expired' || (s?.expiresAt && s.expiresAt * 1000 < Date.now())) return 'expired';
  if (s?.status === 'open' && !s.error) return 'open';
  return 'unknown';
 };
 const labels: Record<string, string> = { open: 'Activo', expired: 'Caducado', complete: 'Completado', unknown: 'Sin verificar' };
 const refunds = (overview?.payments || []).filter((p: any) => p.amountRefunded > 0);
 return <section className="finance-stripe space-y-4" aria-label="Enlaces y reembolsos de Stripe">
  <header className="flex flex-wrap items-center justify-between gap-3"><div><h4>Enlaces de pago</h4><p>Comprueba el estado antes de compartir un enlace.</p></div><span>{links.length} enlaces</span></header>
  <div className="finance-filters" role="group" aria-label="Filtrar enlaces">
   {['all', 'open', 'expired', 'complete', 'unknown'].map(key => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{key === 'all' ? 'Todos' : labels[key]} <span>{links.filter(tx => key === 'all' || status(tx) === key).length}</span></button>)}
  </div>
  <div className="finance-link-list">
   {links.filter(tx => filter === 'all' || status(tx) === filter).map(tx => {
    const state = states[tx.id]; const kind = status(tx); const url = state?.url || tx.stripeCheckoutUrl;
    return <article key={tx.id} className="finance-activity-card"><div><span className={`finance-status finance-status-${kind}`}>{labels[kind]}</span><h5>{tx.description.replace(/\s*\(Pendiente\)/gi, '')}</h5><p>{tx.date} · {tx.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>{state?.error && <p role="alert">{state.error}</p>}</div><div className="finance-actions">
     <button type="button" disabled={state?.loading} onClick={() => onInspect(tx)}><RefreshCw size={15} />{state?.loading ? 'Comprobando…' : 'Comprobar'}</button>
     {kind === 'open' && url && <><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); setNotice('Enlace copiado'); } catch { setNotice('No se pudo copiar. Abre el enlace y copia la dirección.'); } }}><Copy size={15} />Copiar enlace</button><a href={url} target="_blank" rel="noreferrer"><ExternalLink size={15} />Abrir</a></>}
    </div></article>;
   })}
   {!links.some(tx => filter === 'all' || status(tx) === filter) && <p className="finance-empty"><LinkIcon size={20} />No hay enlaces en este estado.</p>}
  </div>
  <p role="status" aria-live="polite">{notice}</p>
  <header className="flex flex-wrap items-center justify-between gap-3"><div><h4>Reembolsos en Stripe</h4><p>Consulta independiente del registro del CRM. No modifica la bitácora.</p></div><button type="button" disabled={loading} onClick={onRefresh}><RefreshCw size={15} />{loading ? 'Consultando…' : 'Actualizar Stripe'}</button></header>
  {error && <p role="alert">{error}</p>}
  {!overview ? <p className="finance-empty">Actualiza Stripe para consultar los reembolsos de este cliente.</p> : <>
   <p>Última consulta: {new Date(overview.fetchedAt).toLocaleString('es-ES')}. Se revisan los {overview.payments?.length || 0} pagos más recientes.{overview.paymentsHasMore ? ' Hay más pagos anteriores en Stripe.' : ''}</p>
   {refunds.length === 0 ? <p className="finance-empty">No hay reembolsos confirmados en los pagos consultados.</p> : refunds.map((p: any) => <article className="finance-activity-card" key={p.id}><div><span className="finance-status finance-status-expired">{p.amountRefunded >= p.amountReceived ? 'Reembolso total' : 'Reembolso parcial'}</span><h5>{p.description || 'Pago de Stripe'}</h5><p>Reembolsado: {p.amountRefunded.toLocaleString('es-ES', { style: 'currency', currency: p.currency })} · Cobro original: {p.amountReceived.toLocaleString('es-ES', { style: 'currency', currency: p.currency })}</p></div><a href={p.dashboardUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Ver en Stripe</a></article>)}
  </>}
 </section>;
}
