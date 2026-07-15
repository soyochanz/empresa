import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Award, Banknote, CalendarDays, Clock3, MessageCircle, PhoneCall, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { CalendarEvent, ColdCallingLead, ComercialAccount, CommercialPresence, CommercialWorkSession, FinanceTransaction } from '../types';
import { buildSalesRewards } from '../utils/salesRewards';
import { db } from '../supabaseClient';

interface Props {
  comercial: ComercialAccount;
  comercialesList: ComercialAccount[];
  finTransactions: FinanceTransaction[] | any[];
  events: CalendarEvent[];
  coldLeads: ColdCallingLead[];
}

type KpiTrend = { direction: 'up' | 'down'; changedAt: number };
const TREND_DURATION_MS = 24 * 60 * 60 * 1000;

function useRecentKpiTrends(storageKey: string, values: Record<string, number>) {
  const [trends, setTrends] = useState<Record<string, KpiTrend>>({});

  useEffect(() => {
    const now = Date.now();
    let previous: { values?: Record<string, number>; trends?: Record<string, KpiTrend> } | null = null;
    try { previous = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { previous = null; }
    const nextTrends: Record<string, KpiTrend> = {};
    Object.keys(values).forEach(key => {
      const oldTrend = previous?.trends?.[key];
      const previousValue = previous?.values?.[key];
      if (typeof previousValue === 'number' && previousValue !== values[key]) {
        nextTrends[key] = { direction: values[key] > previousValue ? 'up' : 'down', changedAt: now };
      } else if (oldTrend && now - oldTrend.changedAt < TREND_DURATION_MS) {
        nextTrends[key] = oldTrend;
      }
    });
    localStorage.setItem(storageKey, JSON.stringify({ values, trends: nextTrends, checkedAt: now }));
    setTrends(nextTrends);
  }, [storageKey, values.cash, values.appointments, values.showRate, values.professionalism]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTrends(current => Object.fromEntries((Object.entries(current) as Array<[string, KpiTrend]>).filter(([, trend]) => now - trend.changedAt < TREND_DURATION_MS)));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return trends;
}

export default function SalesRewardsScreen({ comercial, comercialesList, finTransactions, events, coldLeads }: Props) {
  const liveComercial = comercialesList.find(item => item.id === comercial.id) || comercial;
  const month = new Date().toISOString().slice(0, 7);
  const [workSessions, setWorkSessions] = useState<CommercialWorkSession[]>([]);
  const [presence, setPresence] = useState<CommercialPresence | null>(null);
  const [activityNow, setActivityNow] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    const monthStart = new Date(`${month}-01T00:00:00`);
    const loadActivity = async () => {
      try {
        const [sessions, currentPresence] = await Promise.all([
          db.getCommercialWorkSessions(monthStart.toISOString(), liveComercial.id),
          db.getCommercialPresenceById(liveComercial.id),
        ]);
        if (!mounted) return;
        setWorkSessions(sessions);
        setPresence(currentPresence);
        setActivityNow(Date.now());
      } catch (error) {
        console.error('Could not load commercial reward activity:', error);
      }
    };
    void loadActivity();
    const refresh = window.setInterval(loadActivity, 30_000);
    const clock = window.setInterval(() => setActivityNow(Date.now()), 60_000);
    return () => {
      mounted = false;
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [liveComercial.id, month]);

  const activity = { workSessions, presence: presence ? [presence] : [], now: activityNow };
  const rows = buildSalesRewards(comercialesList, finTransactions, events, coldLeads, month, activity);
  const me = rows.find(row => row.comercial.id === liveComercial.id) || rows[0];
  const mvp = rows[0]?.eligible ? rows[0] : undefined;
  const previousMonthDate = new Date(`${month}-01T12:00:00`);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const previousRows = buildSalesRewards(comercialesList, finTransactions, events, coldLeads, previousMonth);
  const previousScores = new Map(previousRows.map(row => [row.comercial.id, row.score]));
  const topCash = [...rows].sort((a, b) => b.cashCollected - a.cashCollected)[0];
  const topAppointments = [...rows].sort((a, b) => b.appointments - a.appointments)[0];
  const topEvolution = [...rows]
    .map(row => ({ row, delta: Math.round((row.score - (previousScores.get(row.comercial.id) || 0)) * 10) / 10 }))
    .sort((a, b) => b.delta - a.delta)[0];
  const myPosition = rows.findIndex(row => row.comercial.id === liveComercial.id) + 1;
  const monthLabel = new Date(`${month}-02`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const kpiValues = {
    cash: Number(me?.cashCollected || 0), appointments: Number(me?.appointments || 0),
    showRate: Number(me?.showRate || 0), professionalism: Number(me?.professionalism || 0),
  };
  const recentTrends = useRecentKpiTrends(`althera_kpi_trends_${liveComercial.id}_${month}`, kpiValues);
  if (!me) return <div className="p-10 text-center text-slate-400">Todavía no hay datos de recompensas.</div>;

  const kpis = [
    { id: 'cash', label: 'Cash Collected', value: `${me.cashCollected.toLocaleString('es-ES')} €`, Icon: Banknote, style: 'bg-emerald-500/10 text-emerald-300' },
    { id: 'appointments', label: 'Citas agendadas', value: me.appointments, Icon: CalendarDays, style: 'bg-violet-500/10 text-violet-300' },
    { id: 'showRate', label: 'Show Rate', value: `${me.showRate}%`, Icon: Sparkles, style: 'bg-cyan-500/10 text-cyan-300' },
    { id: 'professionalism', label: 'Profesionalidad', value: `${me.professionalism}/10`, Icon: ShieldCheck, style: me.eligible ? 'bg-amber-500/10 text-amber-300' : 'bg-rose-500/10 text-rose-300' },
  ];

  return <div className="space-y-6 animate-fade-in">
    <section className="relative overflow-hidden rounded-[28px] border border-amber-400/20 bg-gradient-to-br from-amber-500/15 via-violet-500/10 to-cyan-500/5 p-6 sm:p-8">
      <Trophy className="absolute -right-5 -bottom-8 h-40 w-40 text-amber-300/[0.07]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-amber-300">Althera Rewards · {monthLabel}</p>
          <h2 className="mt-2 text-3xl font-black text-white">Tu carrera hacia el MVP</h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">El resultado combina Cash Collected (50%), citas (20%), Show Rate (15%) y profesionalidad (15%). El saldo pending no participa hasta consolidarse como cobrado.</p></div>
        <div className="rounded-2xl border border-white/10 bg-black/25 px-6 py-4 text-center backdrop-blur-xl"><p className="text-[9px] uppercase tracking-widest text-slate-500">Score mensual</p><p className="text-4xl font-black text-amber-300">{me.score}</p><p className="text-[10px] text-slate-400">Posición #{myPosition}</p></div>
      </div>
    </section>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(({ id, label, value, Icon, style }) => { const trend = recentTrends[id]; return <div key={label} className="relative rounded-2xl border border-white/7 bg-white/[0.025] p-4">
      {trend && <div title="Cambio registrado durante las últimas 24 horas" className={`absolute right-3 top-3 flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${trend.direction === 'up' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/20 bg-rose-400/10 text-rose-300'}`}>{trend.direction === 'up' ? <ArrowUp className="h-3 w-3"/> : <ArrowDown className="h-3 w-3"/>}{trend.direction === 'up' ? 'Sube' : 'Baja'}</div>}
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${style}`}><Icon className="h-5 w-5" /></div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>})}</div>

    {!me.eligible && <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] p-4"><ShieldCheck className="mt-0.5 h-5 w-5 text-rose-300"/><div><p className="text-sm font-bold text-white">Elegibilidad MVP bloqueada</p><p className="mt-1 text-xs text-slate-400">Se necesita una profesionalidad mínima de 8/10. Tu puntuación actual es {me.professionalism}/10.</p></div></div>}

    <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
      <section className="rounded-3xl border border-white/7 bg-white/[0.025] p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Clasificación mensual</p><h3 className="mt-1 text-lg font-bold text-white">Leaderboard Althera</h3></div><Award className="h-6 w-6 text-amber-300"/></div>
        <div className="space-y-2">{rows.map((row, index) => <div key={row.comercial.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${row.comercial.id === comercial.id ? 'border-violet-400/30 bg-violet-500/10' : 'border-white/5 bg-black/20'}`}><span className="w-7 text-center text-lg">{['🥇','🥈','🥉'][index] || `#${index + 1}`}</span><div className="flex-1 min-w-0"><p className="truncate text-xs font-bold text-white">{row.comercial.name}</p><p className="text-[9px] text-slate-500">{row.cashCollected.toLocaleString('es-ES')} € · {row.appointments} citas</p></div><div className="text-right"><p className="font-mono text-sm font-black text-amber-300">{row.score}</p>{row.cashPrize > 0 && <p className="text-[9px] font-bold text-emerald-300">+{row.cashPrize} €</p>}</div></div>)}</div>
      </section>
      <div className="space-y-4"><section className="rounded-3xl border border-amber-400/20 bg-amber-500/[0.07] p-5"><Trophy className="h-7 w-7 text-amber-300"/><p className="mt-4 text-[9px] font-black uppercase tracking-widest text-amber-300">MVP provisional</p><h3 className="mt-1 text-xl font-black text-white">{mvp?.comercial.name || 'Pendiente'}</h3><p className="mt-2 text-xs text-slate-400">Solo participan perfiles con profesionalidad ≥ 8/10.</p></section>
        <section className="rounded-3xl border border-white/7 bg-white/[0.025] p-5"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Actividad</p><div className="mt-4 space-y-3">{[[PhoneCall,'Llamadas contactadas',me.calls],[MessageCircle,'Conversaciones',me.conversations],[Clock3,'Horas Available',`${me.effectiveHours} h`]].map(([Icon,label,value]: any) => <div key={label} className="flex items-center gap-3"><Icon className="h-4 w-4 text-slate-400"/><span className="flex-1 text-xs text-slate-400">{label}</span><strong className="text-sm text-white">{value}</strong></div>)}</div></section>
      </div>
    </div>
    <section className="rounded-2xl border border-white/7 bg-black/20 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reconocimientos automáticos del Daily · último día de mes</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
      ['🏆','MVP del Mes',mvp?.comercial.name || 'Sin candidato',mvp ? `#${rows.findIndex(row => row.comercial.id === mvp.comercial.id) + 1} del ranking MVP` : 'Profesionalidad mínima: 8/10'],
      ['💰','Top Cash',topCash?.cashCollected ? topCash.comercial.name : 'Pendiente',topCash?.cashCollected ? `${topCash.cashCollected.toLocaleString('es-ES')} €` : 'Sin cash consolidado'],
      ['📅','Top Agendas',topAppointments?.appointments ? topAppointments.comercial.name : 'Pendiente',topAppointments?.appointments ? `${topAppointments.appointments} citas` : 'Sin citas registradas'],
      ['🚀','Mayor Evolución',topEvolution?.delta > 0 ? topEvolution.row.comercial.name : 'Pendiente',topEvolution?.delta > 0 ? `+${topEvolution.delta} puntos vs. mes anterior` : 'Sin mejora positiva'],
    ].map(([emoji,label,name,detail]) => <div key={label} className="rounded-xl border border-white/5 bg-white/[0.025] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{emoji} {label}</p><p className="mt-2 truncate text-xs font-bold text-white">{name}</p><p className="mt-1 text-[9px] text-slate-500">{detail}</p></div>)}</div></section>
  </div>;
}
