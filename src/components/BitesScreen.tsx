import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
 ArrowUpRight,
 Building2,
 CheckCircle2,
 CircleDollarSign,
 CreditCard,
 LoaderCircle,
 RefreshCw,
 Search,
 ShieldCheck,
 Sparkles,
 TriangleAlert,
 UserRoundCheck,
 UsersRound,
 WalletCards,
} from 'lucide-react';
import { authenticatedFetch } from '../utils/authenticatedFetch';

type BitesAccount = {
 id: string;
 username: string | null;
 name: string | null;
 email: string | null;
 plan: string | null;
 subscriptionStatus: string | null;
 trialEndsAt: string | null;
 accessType: string | null;
 accessEndsAt: string | null;
 stripeCustomerId: string | null;
 stripeSubscriptionId: string | null;
 subscriptionStartedAt: string | null;
 subscriptionCurrentPeriodEnd: string | null;
 subscriptionCancelAtPeriodEnd: boolean;
 subscriptionCancelAt: string | null;
 pendingPlan: string | null;
 restaurantCount: number;
};

type BitesPayment = {
 id: string;
 account_id: string;
 accountName: string;
 accountEmail: string | null;
 status: string;
 description: string | null;
 amount_due_cents: number;
 amount_paid_cents: number;
 currency: string;
 paid_at: string | null;
 created_at: string;
 hosted_invoice_url: string | null;
 invoice_pdf_url: string | null;
};

type BitesUser = {
 id: string;
 email: string | null;
 name: string | null;
 username: string | null;
 createdAt: string;
 lastSignInAt: string | null;
 confirmedAt: string | null;
 plan: string | null;
 subscriptionStatus: string | null;
 accessType: string | null;
};

type BitesRestaurant = {
 id: string;
 name: string;
 username: string;
 country: string | null;
 isOpen: boolean | null;
 ownerUserId: string | null;
 moderationStatus: string;
};

type BitesData = {
 generatedAt: string;
 accounts: BitesAccount[];
 payments: BitesPayment[];
 users: BitesUser[];
 restaurants: BitesRestaurant[];
};

type View = 'overview' | 'subscriptions' | 'payments' | 'users';

const planLabels: Record<string, string> = { start: 'Start', grow: 'Grow', scale: 'Scale' };
const statusLabels: Record<string, string> = {
 active: 'Activa', trialing: 'Prueba', paid: 'Pagado', failed: 'Fallido', past_due: 'Pendiente',
 canceled: 'Cancelada', cancelled: 'Cancelada', open: 'Pendiente', void: 'Anulado', draft: 'Borrador',
 complimentary: 'Cortesía', lifetime_free: 'Vitalicio', trial: 'Prueba', none: 'Sin acceso',
};

const formatMoney = (cents: number, currency = 'eur') => new Intl.NumberFormat('es-ES', {
 style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 2,
}).format((Number(cents) || 0) / 100);

const formatDate = (value?: string | null, includeTime = false) => {
 if (!value) return '—';
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return '—';
 return new Intl.DateTimeFormat('es-ES', includeTime
  ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  : { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const statusTone = (status?: string | null) => {
 const value = (status || '').toLowerCase();
 if (['active', 'paid', 'lifetime_free'].includes(value)) return 'border-lime-400/20 bg-lime-400/[.08] text-lime-300';
 if (['trial', 'trialing', 'complimentary', 'open', 'draft'].includes(value)) return 'border-amber-300/20 bg-amber-300/[.08] text-amber-200';
 if (['failed', 'past_due', 'canceled', 'cancelled'].includes(value)) return 'border-red-400/20 bg-red-400/[.08] text-red-300';
 return 'border-white/10 bg-white/[.045] text-slate-300';
};

export default function BitesScreen() {
 const [data, setData] = useState<BitesData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [errorCode, setErrorCode] = useState('');
 const [view, setView] = useState<View>('overview');
 const [query, setQuery] = useState('');

 const load = useCallback(async () => {
  setLoading(true);
  setError('');
  setErrorCode('');
  try {
   const response = await authenticatedFetch('/api/bites/overview');
   const payload = await response.json();
   if (!response.ok) {
    setErrorCode(payload.code || 'BITES_REQUEST_FAILED');
    throw new Error(payload.error || 'No se pudo cargar Bites.');
   }
   setData(payload);
  } catch (requestError) {
   setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar Bites.');
  } finally {
   setLoading(false);
  }
 }, []);

 useEffect(() => { void load(); }, [load]);

 const metrics = useMemo(() => {
  const payments = data?.payments || [];
  const accounts = data?.accounts || [];
  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getTime();
  const paid = payments.filter((payment) => payment.status === 'paid');
  return {
   users: data?.users.length || 0,
   restaurants: data?.restaurants.length || 0,
   active: accounts.filter((account) => account.subscriptionStatus === 'active' || ['lifetime_free', 'complimentary'].includes(account.accessType || '')).length,
   trials: accounts.filter((account) => account.subscriptionStatus === 'trialing' || account.accessType === 'trial').length,
   mrr: paid.filter((payment) => new Date(payment.paid_at || payment.created_at).getTime() >= monthStart)
    .reduce((total, payment) => total + payment.amount_paid_cents, 0),
   collected: paid.reduce((total, payment) => total + payment.amount_paid_cents, 0),
  };
 }, [data]);

 const revenueMonths = useMemo(() => {
  const months = Array.from({ length: 6 }, (_, index) => {
   const date = new Date();
   date.setDate(1);
   date.setMonth(date.getMonth() - (5 - index));
   return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString('es-ES', { month: 'short' }), value: 0 };
  });
  (data?.payments || []).filter((payment) => payment.status === 'paid').forEach((payment) => {
   const date = new Date(payment.paid_at || payment.created_at);
   const target = months.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
   if (target) target.value += payment.amount_paid_cents;
  });
  return months;
 }, [data]);

 const maxMonth = Math.max(1, ...revenueMonths.map((month) => month.value));
 const normalizedQuery = query.trim().toLocaleLowerCase('es-ES');
 const accounts = (data?.accounts || []).filter((account) => !normalizedQuery || [account.name, account.email, account.username, account.plan, account.subscriptionStatus]
  .some((value) => String(value || '').toLocaleLowerCase('es-ES').includes(normalizedQuery)));
 const payments = (data?.payments || []).filter((payment) => !normalizedQuery || [payment.accountName, payment.accountEmail, payment.description, payment.status]
  .some((value) => String(value || '').toLocaleLowerCase('es-ES').includes(normalizedQuery)));
 const users = (data?.users || []).filter((user) => !normalizedQuery || [user.name, user.email, user.username, user.plan]
  .some((value) => String(value || '').toLocaleLowerCase('es-ES').includes(normalizedQuery)));

 return <div className="relative h-full overflow-y-auto bg-[#f4f6f1] text-[#11180f]">
  <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_85%_10%,rgba(138,195,57,.16),transparent_34%),linear-gradient(180deg,#fbfcf8_0%,transparent_100%)]" />
  <div className="relative mx-auto max-w-[1600px] px-4 py-5 sm:px-7 sm:py-7 xl:px-10">
   <section className="overflow-hidden rounded-[30px] border border-black/[.07] bg-[#10160e] text-white shadow-[0_22px_80px_rgba(29,44,22,.16)]">
    <div className="relative flex flex-col gap-7 overflow-hidden px-6 py-7 sm:px-9 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-9">
     <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#8bc53f]/25 blur-[90px]" />
     <div className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
     <div className="relative flex items-center gap-5">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white p-2 shadow-[0_14px_40px_rgba(0,0,0,.3)] sm:h-24 sm:w-24"><img src="/bites-logo.png" alt="Bites" className="h-full w-full object-contain" /></div>
      <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#a9d76c]"><Sparkles className="h-3.5 w-3.5" />Inteligencia de negocio</div><h2 className="text-3xl font-black tracking-[-.05em] sm:text-4xl">Bites control.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/55">Suscripciones, cobros y clientes de la plataforma en una única vista operativa.</p></div>
     </div>
     <div className="relative flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.055] px-4 py-3 text-xs text-white/65"><ShieldCheck className="h-4 w-4 text-[#a9d76c]" /><span><b className="block text-[10px] uppercase tracking-wider text-white">Conexión aislada</b>Servidor · solo lectura</span></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#8bc53f] px-4 text-xs font-black text-[#10160e] transition hover:bg-[#a4d45d] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
     </div>
    </div>
   </section>

   <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-black/[.07] bg-white/85 p-2 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between">
    <div className="grid grid-cols-2 gap-1 sm:flex">{([
     ['overview', 'Resumen'], ['subscriptions', 'Suscripciones'], ['payments', 'Pagos'], ['users', 'Usuarios'],
    ] as [View, string][]).map(([key, label]) => <button key={key} onClick={() => setView(key)} className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${view === key ? 'bg-[#10160e] text-white shadow-md' : 'text-slate-500 hover:bg-black/[.035] hover:text-black'}`}>{label}</button>)}</div>
    {view !== 'overview' && <label className="relative block min-w-0 md:w-80"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en Bites..." className="h-11 w-full rounded-xl border border-black/[.08] bg-[#f6f7f3] pl-10 pr-3 text-sm outline-none focus:border-[#8bc53f]" /></label>}
   </div>

   {loading && !data ? <LoadingState /> : error ? <ErrorState message={error} configurationMissing={errorCode === 'BITES_CONNECTION_NOT_CONFIGURED'} onRetry={() => void load()} /> : data ? <>
    {view === 'overview' && <Overview metrics={metrics} months={revenueMonths} maxMonth={maxMonth} accounts={data.accounts} payments={data.payments} generatedAt={data.generatedAt} />}
    {view === 'subscriptions' && <SubscriptionsTable accounts={accounts} />}
    {view === 'payments' && <PaymentsTable payments={payments} />}
    {view === 'users' && <UsersTable users={users} />}
   </> : null}
  </div>
 </div>;
}

function LoadingState() {
 return <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-[28px] border border-black/[.07] bg-white"><div className="flex flex-col items-center gap-3 text-sm text-slate-500"><LoaderCircle className="h-7 w-7 animate-spin text-[#79ad32]" />Consultando Bites de forma segura…</div></div>;
}

function ErrorState({ message, configurationMissing, onRetry }: { message: string; configurationMissing: boolean; onRetry: () => void }) {
 return <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-[28px] border border-black/[.07] bg-white p-6"><div className="max-w-xl text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><TriangleAlert className="h-6 w-6" /></span><h3 className="mt-5 text-xl font-black">{configurationMissing ? 'Falta conectar Bites' : 'Bites no está disponible'}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>{configurationMissing && <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">Añade en el servidor la URL del proyecto y una clave secreta de Bites. La clave nunca se envía al navegador.</p>}<button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#10160e] px-4 py-3 text-xs font-bold text-white"><RefreshCw className="h-4 w-4" />Reintentar</button></div></div>;
}

function Overview({ metrics, months, maxMonth, accounts, payments, generatedAt }: { metrics: { users: number; restaurants: number; active: number; trials: number; mrr: number; collected: number }; months: { key: string; label: string; value: number }[]; maxMonth: number; accounts: BitesAccount[]; payments: BitesPayment[]; generatedAt: string }) {
 const cards = [
  { label: 'Usuarios registrados', value: metrics.users.toLocaleString('es-ES'), note: `${metrics.restaurants} restaurantes`, icon: UsersRound, accent: 'bg-[#182116] text-[#b8df83]' },
  { label: 'Suscripciones activas', value: metrics.active.toLocaleString('es-ES'), note: `${metrics.trials} en prueba`, icon: UserRoundCheck, accent: 'bg-lime-100 text-lime-700' },
  { label: 'Cobrado este mes', value: formatMoney(metrics.mrr), note: 'Pagos confirmados', icon: CircleDollarSign, accent: 'bg-emerald-100 text-emerald-700' },
  { label: 'Cobrado histórico', value: formatMoney(metrics.collected), note: `${payments.filter((item) => item.status === 'paid').length} movimientos`, icon: WalletCards, accent: 'bg-sky-100 text-sky-700' },
 ];
 return <div className="mt-5 space-y-5">
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => { const Icon = card.icon; return <article key={card.label} className="rounded-[24px] border border-black/[.07] bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{card.label}</p><p className="mt-3 text-3xl font-black tracking-[-.04em] text-[#11180f]">{card.value}</p><p className="mt-2 text-xs text-slate-400">{card.note}</p></div><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.accent}`}><Icon className="h-5 w-5" /></span></div></article>; })}</div>
  <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
   <article className="rounded-[26px] border border-black/[.07] bg-white p-6 shadow-sm"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#79ad32]">Ingresos</p><h3 className="mt-1 text-xl font-black">Últimos 6 meses</h3></div><p className="text-xs text-slate-400">Solo cobros pagados</p></div><div className="mt-8 flex h-52 items-end gap-3 sm:gap-5">{months.map((month) => <div key={month.key} className="flex h-full flex-1 flex-col justify-end gap-2"><span className="text-center text-[9px] font-bold text-slate-400">{month.value ? formatMoney(month.value).replace(',00', '') : '—'}</span><div className="relative h-36 overflow-hidden rounded-xl bg-[#eef1e9]"><div style={{ height: `${Math.max(month.value ? 8 : 0, (month.value / maxMonth) * 100)}%` }} className="absolute inset-x-0 bottom-0 rounded-xl bg-gradient-to-t from-[#6da129] to-[#a8d56c]" /></div><span className="text-center text-[10px] font-bold uppercase text-slate-400">{month.label}</span></div>)}</div></article>
   <article className="rounded-[26px] border border-black/[.07] bg-white p-6 shadow-sm"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#79ad32]">Actividad reciente</p><h3 className="mt-1 text-xl font-black">Últimos cobros</h3></div><div className="mt-5 space-y-2">{payments.slice(0, 5).map((payment) => <div key={payment.id} className="flex items-center gap-3 rounded-2xl border border-black/[.055] bg-[#f8f9f6] p-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#79ad32] shadow-sm"><CreditCard className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{payment.accountName}</p><p className="mt-1 truncate text-[10px] text-slate-400">{formatDate(payment.paid_at || payment.created_at)}</p></div><div className="text-right"><p className="text-xs font-black">{formatMoney(payment.status === 'paid' ? payment.amount_paid_cents : payment.amount_due_cents, payment.currency)}</p><Status value={payment.status} /></div></div>)}{!payments.length && <Empty label="Aún no hay pagos registrados." />}</div><p className="mt-4 text-right text-[9px] text-slate-300">Actualizado {formatDate(generatedAt, true)}</p></article>
  </div>
  <article className="rounded-[26px] border border-black/[.07] bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#79ad32]">Cartera</p><h3 className="mt-1 text-xl font-black">Estado de suscripciones</h3></div><span className="text-xs text-slate-400">{accounts.length} cuentas</span></div><div className="grid gap-3 md:grid-cols-3">{['start', 'grow', 'scale'].map((plan) => { const count = accounts.filter((account) => account.plan === plan).length; const percent = accounts.length ? Math.round((count / accounts.length) * 100) : 0; return <div key={plan} className="rounded-2xl bg-[#f5f7f1] p-4"><div className="flex items-center justify-between"><span className="text-xs font-black">{planLabels[plan]}</span><span className="text-sm font-black">{count}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[#86bd3e]" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-[10px] text-slate-400">{percent}% de las cuentas</p></div>; })}</div></article>
 </div>;
}

function SubscriptionsTable({ accounts }: { accounts: BitesAccount[] }) {
 return <TableShell title="Suscripciones" caption={`${accounts.length} cuentas encontradas`} icon={CreditCard}>{accounts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead><tr className="border-b border-black/[.06] text-[9px] uppercase tracking-[.13em] text-slate-400"><th className="px-5 py-4">Cuenta</th><th className="px-4 py-4">Plan</th><th className="px-4 py-4">Estado</th><th className="px-4 py-4">Restaurantes</th><th className="px-4 py-4">Inicio</th><th className="px-4 py-4">Próxima fecha</th><th className="px-5 py-4">Stripe</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.id} className="border-b border-black/[.045] text-xs last:border-0 hover:bg-[#f8f9f6]"><td className="px-5 py-4"><p className="font-bold">{account.name || account.username || 'Cuenta Bites'}</p><p className="mt-1 text-[10px] text-slate-400">{account.email || account.username || account.id}</p></td><td className="px-4 py-4 font-black">{planLabels[account.plan || ''] || account.plan || '—'}{account.pendingPlan && <p className="mt-1 text-[9px] text-amber-600">→ {planLabels[account.pendingPlan] || account.pendingPlan}</p>}</td><td className="px-4 py-4"><Status value={account.subscriptionStatus || account.accessType} />{account.subscriptionCancelAtPeriodEnd && <p className="mt-1 text-[9px] text-red-500">Cancelación programada</p>}</td><td className="px-4 py-4"><span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-[#79ad32]" />{account.restaurantCount}</span></td><td className="px-4 py-4 text-slate-500">{formatDate(account.subscriptionStartedAt)}</td><td className="px-4 py-4 text-slate-500">{formatDate(account.subscriptionCancelAt || account.subscriptionCurrentPeriodEnd || account.accessEndsAt || account.trialEndsAt)}</td><td className="px-5 py-4">{account.stripeSubscriptionId ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Vinculada</span> : <span className="text-[10px] text-slate-400">Sin vínculo</span>}</td></tr>)}</tbody></table></div> : <Empty label="No hay suscripciones que coincidan." />}</TableShell>;
}

function PaymentsTable({ payments }: { payments: BitesPayment[] }) {
 return <TableShell title="Pagos e ingresos" caption={`${payments.length} movimientos encontrados`} icon={CircleDollarSign}>{payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead><tr className="border-b border-black/[.06] text-[9px] uppercase tracking-[.13em] text-slate-400"><th className="px-5 py-4">Cuenta</th><th className="px-4 py-4">Concepto</th><th className="px-4 py-4">Fecha</th><th className="px-4 py-4">Estado</th><th className="px-4 py-4 text-right">Importe</th><th className="px-5 py-4 text-right">Documento</th></tr></thead><tbody>{payments.map((payment) => { const documentUrl = payment.hosted_invoice_url || payment.invoice_pdf_url; return <tr key={payment.id} className="border-b border-black/[.045] text-xs last:border-0 hover:bg-[#f8f9f6]"><td className="px-5 py-4"><p className="font-bold">{payment.accountName}</p><p className="mt-1 text-[10px] text-slate-400">{payment.accountEmail || payment.account_id}</p></td><td className="px-4 py-4 text-slate-500">{payment.description || 'Suscripción Bites'}</td><td className="px-4 py-4 text-slate-500">{formatDate(payment.paid_at || payment.created_at)}</td><td className="px-4 py-4"><Status value={payment.status} /></td><td className="px-4 py-4 text-right font-black">{formatMoney(payment.status === 'paid' ? payment.amount_paid_cents : payment.amount_due_cents, payment.currency)}</td><td className="px-5 py-4 text-right">{documentUrl ? <a href={documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-[#679627] hover:underline">Factura <ArrowUpRight className="h-3.5 w-3.5" /></a> : <span className="text-[10px] text-slate-400">No disponible</span>}</td></tr>; })}</tbody></table></div> : <Empty label="No hay pagos que coincidan." />}</TableShell>;
}

function UsersTable({ users }: { users: BitesUser[] }) {
 return <TableShell title="Usuarios registrados" caption={`${users.length} usuarios encontrados`} icon={UsersRound}>{users.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-black/[.06] text-[9px] uppercase tracking-[.13em] text-slate-400"><th className="px-5 py-4">Usuario</th><th className="px-4 py-4">Plan</th><th className="px-4 py-4">Acceso</th><th className="px-4 py-4">Registro</th><th className="px-4 py-4">Último acceso</th><th className="px-5 py-4">Verificación</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-black/[.045] text-xs last:border-0 hover:bg-[#f8f9f6]"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9f2dd] text-[10px] font-black text-[#5d8825]">{(user.name || user.email || 'BI').slice(0, 2).toUpperCase()}</span><div><p className="font-bold">{user.name || user.username || 'Usuario Bites'}</p><p className="mt-1 text-[10px] text-slate-400">{user.email || user.id}</p></div></div></td><td className="px-4 py-4 font-bold">{planLabels[user.plan || ''] || user.plan || '—'}</td><td className="px-4 py-4"><Status value={user.subscriptionStatus || user.accessType} /></td><td className="px-4 py-4 text-slate-500">{formatDate(user.createdAt)}</td><td className="px-4 py-4 text-slate-500">{formatDate(user.lastSignInAt, true)}</td><td className="px-5 py-4">{user.confirmedAt ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Confirmado</span> : <span className="text-[10px] text-amber-600">Pendiente</span>}</td></tr>)}</tbody></table></div> : <Empty label="No hay usuarios que coincidan." />}</TableShell>;
}

function TableShell({ title, caption, icon: Icon, children }: { title: string; caption: string; icon: typeof CreditCard; children: ReactNode }) {
 return <article className="mt-5 overflow-hidden rounded-[26px] border border-black/[.07] bg-white shadow-sm"><header className="flex items-center gap-4 border-b border-black/[.06] px-5 py-5 sm:px-6"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9f2dd] text-[#679627]"><Icon className="h-5 w-5" /></span><div><h3 className="text-lg font-black">{title}</h3><p className="mt-1 text-[10px] text-slate-400">{caption}</p></div></header>{children}</article>;
}

function Status({ value }: { value?: string | null }) {
 const normalized = (value || 'none').toLowerCase();
 return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black ${statusTone(normalized)}`}>{statusLabels[normalized] || value || 'Sin estado'}</span>;
}

function Empty({ label }: { label: string }) {
 return <div className="flex min-h-32 items-center justify-center p-6 text-sm text-slate-400">{label}</div>;
}
