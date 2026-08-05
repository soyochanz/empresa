import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, ChevronLeft, ChevronRight, CircleUserRound, Database, Filter, Loader2, MonitorCog, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { AuditActorType, AuditLog, AuditLogActor, AuditSource } from '../types';
import { flushAuditLogs, getAuditActors, getAuditLogs } from '../utils/auditLog';

const PAGE_SIZE = 25;

const sourceLabels: Record<AuditSource, string> = {
 ui: 'Interfaz',
 navigation: 'Navegación',
 auth: 'Acceso',
 data: 'Datos',
 system: 'Sistema'
};

const severityClasses = {
 info: 'border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300',
 warning: 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300',
 error: 'border-red-400/20 bg-red-400/[0.07] text-red-300'
};

const formatDate = (value: string) => new Intl.DateTimeFormat('es-ES', {
 day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
}).format(new Date(value));

const pageWindow = (current: number, total: number) => {
 const start = Math.max(1, Math.min(current - 2, total - 4));
 return Array.from({ length: Math.min(5, total) }, (_, index) => start + index);
};

export default function ActivityLogScreen() {
 const [logs, setLogs] = useState<AuditLog[]>([]);
 const [actors, setActors] = useState<AuditLogActor[]>([]);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [searchDraft, setSearchDraft] = useState('');
 const [search, setSearch] = useState('');
 const [actorType, setActorType] = useState<AuditActorType | 'all'>('all');
 const [actorEmail, setActorEmail] = useState('');
 const [source, setSource] = useState<AuditSource | 'all'>('all');
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);
 const [localOnly, setLocalOnly] = useState(false);
 const [error, setError] = useState('');
 const requestId = useRef(0);

 useEffect(() => {
  const timer = window.setTimeout(() => {
   setSearch(searchDraft.trim());
   setPage(1);
  }, 350);
  return () => window.clearTimeout(timer);
 }, [searchDraft]);

 const loadLogs = useCallback(async (manual = false) => {
  const currentRequest = ++requestId.current;
  manual ? setRefreshing(true) : setLoading(true);
  setError('');
  try {
   if (manual) await flushAuditLogs();
   const result = await getAuditLogs({ page, pageSize: PAGE_SIZE, search, actorType, actorEmail, source });
   if (currentRequest !== requestId.current) return;
   setLogs(result.logs);
   setTotal(result.total);
   setLocalOnly(result.localOnly);
  } catch (loadError: any) {
   if (currentRequest !== requestId.current) return;
   setError(loadError?.message || 'No se pudo cargar el registro de actividad.');
  } finally {
   if (currentRequest === requestId.current) {
    setLoading(false);
    setRefreshing(false);
   }
  }
 }, [page, search, actorType, actorEmail, source]);

 useEffect(() => { void loadLogs(); }, [loadLogs]);
 useEffect(() => {
  void flushAuditLogs().finally(() => getAuditActors().then(setActors).catch(() => setActors([])));
 }, []);

 const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
 const visiblePages = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);
 const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0;
 const lastResult = Math.min(page * PAGE_SIZE, total);

 useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

 return (
  <div className="space-y-5" data-audit-ignore>
   <section className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-[#070b10]/90 p-5 shadow-2xl shadow-black/25 sm:p-7">
    <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-[90px]" />
    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
     <div>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300"><Activity className="h-4 w-4" />Producto y tecnología</div>
      <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Registro total de Althera</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Trazabilidad de navegación, acciones, sesiones, datos y eventos automáticos, sin guardar contraseñas ni contenido de formularios.</p>
     </div>
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3"><p className="text-[9px] uppercase tracking-wider text-slate-500">Coincidencias</p><p className="mt-1 text-xl font-black text-white">{total.toLocaleString('es-ES')}</p></div>
      <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3"><p className="text-[9px] uppercase tracking-wider text-slate-500">Por página</p><p className="mt-1 text-xl font-black text-white">{PAGE_SIZE}</p></div>
      <div className="col-span-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] px-4 py-3 sm:col-span-1"><p className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" />Captura ligera</p><p className="mt-1 text-xs font-bold text-white">Eventos agrupados</p></div>
     </div>
    </div>
   </section>

   <section className="rounded-3xl border border-white/[0.08] bg-white/[0.022] p-4 sm:p-5">
    <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.3fr)_repeat(3,minmax(150px,.6fr))_auto]">
     <label className="relative block">
      <span className="sr-only">Buscar en el registro</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Buscar acción, usuario, pantalla…" className="h-11 w-full rounded-xl border border-white/[0.09] bg-black/25 pl-10 pr-3 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-4 focus:ring-cyan-400/[0.06]" />
     </label>
     <label className="relative">
      <span className="sr-only">Filtrar por tipo de actor</span>
      <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
      <select value={actorType} onChange={event => { setActorType(event.target.value as AuditActorType | 'all'); setActorEmail(''); setPage(1); }} className="h-11 w-full appearance-none rounded-xl border border-white/[0.09] bg-[#090c11] pl-9 pr-3 text-xs text-slate-300 outline-none focus:border-cyan-400/40">
       <option value="all">Usuario y sistema</option><option value="user">Solo usuarios</option><option value="system">Solo sistema</option>
      </select>
     </label>
     <label>
      <span className="sr-only">Filtrar por usuario</span>
      <select value={actorEmail} disabled={actorType === 'system'} onChange={event => { setActorEmail(event.target.value); setActorType(event.target.value ? 'user' : actorType); setPage(1); }} className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#090c11] px-3 text-xs text-slate-300 outline-none disabled:cursor-not-allowed disabled:opacity-40 focus:border-cyan-400/40">
       <option value="">Todos los usuarios</option>{actors.map(actor => <option key={actor.email || actor.id || actor.name} value={actor.email || ''}>{actor.name}{actor.email ? ` · ${actor.email}` : ''}</option>)}
      </select>
     </label>
     <label>
      <span className="sr-only">Filtrar por origen</span>
      <select value={source} onChange={event => { setSource(event.target.value as AuditSource | 'all'); setPage(1); }} className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#090c11] px-3 text-xs text-slate-300 outline-none focus:border-cyan-400/40">
       <option value="all">Todos los orígenes</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
     </label>
     <button onClick={() => void loadLogs(true)} disabled={refreshing} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-4 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/[0.12] disabled:opacity-50" aria-label="Actualizar registro"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Actualizar</button>
    </div>
    {localOnly && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.045] px-3 py-2.5 text-[11px] text-amber-200/80"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Mostrando eventos pendientes de este dispositivo. Se sincronizarán automáticamente cuando la tabla de auditoría esté disponible.</div>}
   </section>

   <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#070a0f]/80">
    <div className="hidden grid-cols-[175px_minmax(180px,.8fr)_110px_minmax(280px,1.5fr)_110px] gap-4 border-b border-white/[0.07] bg-white/[0.02] px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 lg:grid"><span>Fecha</span><span>Actor</span><span>Origen</span><span>Evento</span><span>Pantalla</span></div>
    {loading ? <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" />Cargando actividad…</div> : error ? <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><AlertTriangle className="h-7 w-7 text-red-300" /><p className="mt-3 text-sm font-bold text-white">No se pudo cargar el registro</p><p className="mt-1 max-w-lg text-xs text-slate-500">{error}</p></div> : logs.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><Database className="h-8 w-8 text-slate-600" /><p className="mt-3 text-sm font-bold text-white">No hay eventos para estos filtros</p><p className="mt-1 text-xs text-slate-500">Prueba otra búsqueda o elimina alguno de los filtros.</p></div> : <div className="divide-y divide-white/[0.055]">
     {logs.map(log => {
      const EventIcon = log.actorType === 'system' ? MonitorCog : CircleUserRound;
      return <article key={log.id} className="grid gap-3 px-4 py-4 transition hover:bg-white/[0.018] sm:px-5 lg:grid-cols-[175px_minmax(180px,.8fr)_110px_minmax(280px,1.5fr)_110px] lg:items-start lg:gap-4">
       <div className="text-[11px] font-medium text-slate-400 lg:pt-1">{formatDate(log.createdAt)}</div>
       <div className="flex min-w-0 items-start gap-2.5"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${severityClasses[log.severity]}`}><EventIcon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs font-black text-white">{log.actorName}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{log.actorEmail || (log.actorType === 'system' ? 'Automático' : 'Sin email')}</p></div></div>
       <div><span className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[9px] font-bold text-slate-400">{sourceLabels[log.source] || log.source}</span></div>
       <div className="min-w-0"><p className="text-xs font-black text-white">{log.description}</p><div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-wider text-slate-600"><span>{log.action.replaceAll('_', ' ')}</span>{log.entityType && <><span>·</span><span>{log.entityType}</span></>}</div>{Object.keys(log.metadata).length > 0 && <details className="mt-2"><summary className="cursor-pointer text-[10px] font-bold text-cyan-400/70">Ver contexto</summary><pre className="mt-2 max-h-36 overflow-auto rounded-xl border border-white/[0.06] bg-black/30 p-3 text-[9px] leading-4 text-slate-500">{JSON.stringify(log.metadata, null, 2)}</pre></details>}</div>
       <div className="text-[10px] font-bold text-slate-500 lg:pt-1">{log.screen || 'Global'}</div>
      </article>;
     })}
    </div>}

    <div className="flex flex-col gap-3 border-t border-white/[0.07] bg-black/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
     <p className="text-[10px] text-slate-500">Mostrando <span className="font-bold text-slate-300">{firstResult}–{lastResult}</span> de <span className="font-bold text-slate-300">{total.toLocaleString('es-ES')}</span></p>
     <nav className="flex items-center gap-1" aria-label="Paginación del registro">
      <button onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page === 1} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.04] disabled:opacity-25" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button>
      {visiblePages.map(value => <button key={value} onClick={() => setPage(value)} className={`h-9 min-w-9 rounded-xl border px-2 text-[11px] font-black transition ${value === page ? 'border-cyan-400/30 bg-cyan-400/[0.1] text-cyan-300' : 'border-white/[0.07] text-slate-500 hover:bg-white/[0.04] hover:text-white'}`} aria-current={value === page ? 'page' : undefined}>{value}</button>)}
      <button onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.04] disabled:opacity-25" aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></button>
     </nav>
    </div>
   </section>
  </div>
 );
}
