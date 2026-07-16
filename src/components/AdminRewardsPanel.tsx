import React, { useEffect, useState } from 'react';
import { Award, Banknote, BarChart3, CalendarCheck, CalendarDays, CheckCircle2, Coins, GraduationCap, Handshake, Lightbulb, Plus, Save, ShieldCheck, ShoppingBag, Sparkles, Trash2, TrendingUp, Trophy } from 'lucide-react';
import { CalendarEvent, ClientContact, ColdCallingLead, ComercialAccount, CommercialPresence, CommercialWorkSession, LegacyBonusType, MonthlyPerformanceReview } from '../types';
import { buildLegacyPointLedger, buildSalesRewards, calculateKpiBreakdown, calculateLegacyPoints, calculateProfessionalismScore, LEGACY_RANKS, MVP_APPOINTMENTS_REFERENCE, MVP_CASH_REFERENCE, PROFESSIONALISM_FACTORS } from '../utils/salesRewards';

interface Props {
  comercialesList: ComercialAccount[];
  finTransactions: any[];
  events: CalendarEvent[];
  coldLeads: ColdCallingLead[];
  contacts: ClientContact[];
  workSessions: CommercialWorkSession[];
  commercialPresence: CommercialPresence[];
  activityNow: number;
  onUpdateComercial: (account: ComercialAccount) => void | Promise<void>;
}

const FACTORS: Array<[keyof MonthlyPerformanceReview, string]> = [
  ['punctuality', 'Puntualidad'], ['meetingAttendance', 'Asistencia a reuniones'],
  ['processCompliance', 'Seguir procesos'], ['attitude', 'Actitud'],
  ['communication', 'Comunicación'], ['taskCompletion', 'Cumplimiento de tareas'],
];

export default function AdminRewardsPanel({ comercialesList, finTransactions, events, coldLeads, contacts, workSessions, commercialPresence, activityNow, onUpdateComercial }: Props) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedId, setSelectedId] = useState(comercialesList[0]?.id || '');
  const selected = comercialesList.find(item => item.id === selectedId);
  const emptyReview: MonthlyPerformanceReview = { month, showRate: 0, professionalism: 0 };
  const [draft, setDraft] = useState<MonthlyPerformanceReview>(emptyReview);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [bonusType, setBonusType] = useState<LegacyBonusType>('sale_assist');
  const [bonusQuantity, setBonusQuantity] = useState(1);
  const [bonusNote, setBonusNote] = useState('');

  useEffect(() => {
    const review = selected?.monthlyPerformance?.[month] || { ...emptyReview, month };
    setDraft({ ...review, professionalism: calculateProfessionalismScore(review) });
    setSaved(false);
    setSaveError('');
  }, [selectedId, month]);

  useEffect(() => {
    if (!selectedId && comercialesList[0]?.id) setSelectedId(comercialesList[0].id);
  }, [comercialesList, selectedId]);

  const rows = buildSalesRewards(comercialesList, finTransactions, events, coldLeads, month, contacts, { workSessions, presence: commercialPresence, now: activityNow });
  const winner = rows[0]?.eligible ? rows[0] : undefined;
  const selectedReward = rows.find(row => row.comercial.id === selectedId);
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError('');
    try {
      const { effectiveHours: _legacyEffectiveHours, ...automaticDraft } = draft;
      await onUpdateComercial({ ...selected, monthlyPerformance: { ...(selected.monthlyPerformance || {}), [month]: { ...automaticDraft, professionalism: calculateProfessionalismScore(automaticDraft), month, updatedAt: new Date().toISOString() } } });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error('Could not save monthly commercial review:', error);
      setSaveError('No se pudo confirmar el guardado. Se volverá a intentar automáticamente.');
    } finally {
      setSaving(false);
    }
  };
  const updateNumber = (key: keyof MonthlyPerformanceReview, value: number) => setDraft(current => {
    const next = { ...current, [key]: value };
    return PROFESSIONALISM_FACTORS.includes(key as typeof PROFESSIONALISM_FACTORS[number])
      ? { ...next, professionalism: calculateProfessionalismScore(next) }
      : next;
  });
  const professionalismPoints = PROFESSIONALISM_FACTORS.reduce((sum, key) => sum + Number(draft[key] || 0), 0);
  const bonusConfig: Record<LegacyBonusType, { label: string; points: number }> = {
    sale_assist: { label: 'Ayudar a cerrar una venta', points: 150 },
    training: { label: 'Completar formación', points: 100 },
    monthly_idea: { label: 'Mejor idea del mes', points: 300 },
  };
  const addLegacyBonus = () => {
    if (!selected || bonusQuantity < 1) return;
    const config = bonusConfig[bonusType];
    onUpdateComercial({ ...selected, legacyBonuses: [...(selected.legacyBonuses || []), { id: `legacy_${Date.now()}`, type: bonusType, quantity: bonusQuantity, points: config.points * bonusQuantity, date: new Date().toISOString().slice(0, 10), note: bonusNote.trim() || undefined, createdAt: new Date().toISOString() }] });
    setBonusQuantity(1); setBonusNote('');
  };
  const deleteLegacyBonus = (id: string) => {
    if (!selected) return;
    onUpdateComercial({ ...selected, legacyBonuses: (selected.legacyBonuses || []).filter(item => item.id !== id) });
  };
  const selectedLegacy = selected ? calculateLegacyPoints(selected, finTransactions, events, coldLeads, contacts) : null;
  const selectedLedger = selected ? buildLegacyPointLedger(selected, finTransactions, events, coldLeads, contacts) : [];
  const legacyProgressRows = comercialesList
    .map(comercial => ({ comercial, legacy: calculateLegacyPoints(comercial, finTransactions, events, coldLeads, contacts) }))
    .sort((a, b) => b.legacy.total - a.legacy.total);
  const selectedKpiBreakdown = selectedReward ? calculateKpiBreakdown(selectedReward) : null;
  const selectedKpiLedger = selectedReward && selectedKpiBreakdown ? [
    { label: 'Cash Collected', points: selectedKpiBreakdown.cash, rule: '+1 / 100 €', detail: `${selectedReward.cashCollected.toLocaleString('es-ES')} € cobrados · 1 punto por cada 100 €`, Icon: Banknote, style: 'text-emerald-300 border-emerald-400/15 bg-emerald-400/[0.05]' },
    { label: 'Citas agendadas', points: selectedKpiBreakdown.appointments, rule: '+20 / cita', detail: `${selectedReward.appointments} citas × 20 puntos = ${selectedKpiBreakdown.appointments} puntos`, Icon: CalendarCheck, style: 'text-violet-300 border-violet-400/15 bg-violet-400/[0.05]' },
    { label: 'Shows confirmados', points: selectedKpiBreakdown.shows, rule: '+15 / show', detail: `${selectedReward.shows} presentados de ${selectedReward.appointments} citas (${selectedReward.showRate}%) × 15 puntos`, Icon: Sparkles, style: 'text-cyan-300 border-cyan-400/15 bg-cyan-400/[0.05]' },
    { label: 'Profesionalidad', points: selectedKpiBreakdown.professionalism, rule: '+1,5 / nivel', detail: `${selectedReward.professionalism}/10 según los seis criterios mensuales × 1,5 puntos`, Icon: ShieldCheck, style: 'text-amber-300 border-amber-400/15 bg-amber-400/[0.05]' },
  ] : [];
  const paGuide = [
    { label: 'Cash cobrado', points: '1 PA / 1 €', detail: 'Solo venta inicial pagada y consolidada.', Icon: Coins },
    { label: 'Cita agendada', points: '+50 PA', detail: 'Para el comercial que originó la cita.', Icon: CalendarCheck },
    { label: 'Show confirmado', points: '+75 PA', detail: 'Cuando el closer confirma que contestó.', Icon: CheckCircle2 },
    { label: 'Venta cobrada', points: '+250 PA', detail: 'Una vez por cada venta inicial única.', Icon: ShoppingBag },
    { label: 'Ayuda en cierre', points: '+150 PA', detail: 'Validación manual del administrador.', Icon: Handshake },
    { label: 'Formación', points: '+100 PA', detail: 'Por completar formación reconocida.', Icon: GraduationCap },
    { label: 'Idea del mes', points: '+300 PA', detail: 'Para la propuesta elegida del mes.', Icon: Lightbulb },
  ];
  const ledgerStyles = {
    cash: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300',
    agenda: 'border-violet-400/20 bg-violet-400/[0.06] text-violet-300',
    show: 'border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300',
    sale: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300',
    manual: 'border-fuchsia-400/20 bg-fuchsia-400/[0.06] text-fuchsia-300',
  } as const;

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-r from-amber-500/10 via-violet-500/5 to-transparent p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-amber-300"><Trophy className="h-5 w-5"/><span className="text-[10px] font-black uppercase tracking-[.25em]">Althera Rewards</span></div><h3 className="mt-2 text-2xl font-black text-white">Cierre y valoración mensual</h3><p className="mt-1 text-xs text-slate-400">El Show Rate se calcula con las asistencias confirmadas por el closer. Valora los seis criterios de profesionalidad; el score y el ranking se recalculan automáticamente.</p></div>
        <input type="month" value={month} onChange={event => setMonth(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-400/50"/></div>
    </section>

    <section className="rounded-3xl border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(6,182,212,.08),rgba(124,58,237,.06),rgba(0,0,0,.2))] p-5 sm:p-6">
      <div><div className="flex items-center gap-2 text-cyan-300"><Lightbulb className="h-5 w-5"/><span className="text-[10px] font-black uppercase tracking-[.22em]">Guía de puntuación</span></div><h4 className="mt-2 text-xl font-black text-white">Qué suma PA y cómo se elige el MVP</h4><p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-400">El score MVP es un índice abierto con dos decimales: 100 es solo la referencia, no el máximo. Mantiene Cash 50%, Citas 20%, Show Rate 15% y Profesionalidad 15%, y puede superar 100.</p></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-violet-400/15 bg-black/20 p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-violet-300">Puntos Althera</p><h5 className="mt-1 text-sm font-black text-white">Cómo se consiguen PA</h5></div><Award className="h-5 w-5 text-violet-300"/></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{paGuide.map(({ label, points, detail, Icon }) => <div key={label} className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300"/><div><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-bold text-white">{label}</p><strong className="text-[9px] text-violet-300">{points}</strong></div><p className="mt-1 text-[8px] leading-relaxed text-slate-500">{detail}</p></div></div>)}</div></div>
        <div className="rounded-2xl border border-amber-400/15 bg-black/20 p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-amber-300">Score MVP · sin máximo</p><h5 className="mt-1 text-sm font-black text-white">Importancia de cada referencia</h5></div><BarChart3 className="h-5 w-5 text-amber-300"/></div><div className="mt-4 space-y-2">{[
          ['Cash Collected','50%','Cash ÷ 10.000 € de referencia × 50; por encima sigue sumando'],
          ['Citas agendadas','20%','Citas ÷ 5 de referencia × 20; cada cita adicional sigue sumando'],
          ['Show Rate','15%','Porcentaje de Show Rate ÷ 100 × 15'],
          ['Profesionalidad','15%','Valoración de profesionalidad ÷ 10 × 15'],
        ].map(([label, points, formula]) => <div key={label} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3"><div><p className="text-[10px] font-bold text-white">{label}</p><p className="mt-1 text-[8px] text-slate-500">{formula}</p></div><strong className="text-[9px] text-amber-300">{points}</strong></div>)}</div><p className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[0.05] px-3 py-2 text-[9px] text-slate-400">Para ser elegible como MVP se necesita una profesionalidad mínima de <strong className="text-white">8/10</strong>.</p></div>
      </div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <section className="rounded-3xl border border-white/7 bg-white/[0.025] p-5"><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Comercial a valorar</label><select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none">{comercialesList.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4"><span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-cyan-300"><Sparkles className="h-4 w-4"/>Show Rate automático</span><div className="mt-3 flex items-end gap-1"><strong className="text-3xl font-black text-white">{selectedReward?.showRate || 0}</strong><span className="pb-1 text-slate-500">%</span></div><p className="mt-1 text-[9px] text-slate-500">{selectedReward?.shows || 0} presentados de {selectedReward?.appointments || 0} citas</p></div>
          <div className={`rounded-2xl border p-4 ${draft.professionalism >= 8 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}><span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-300"><ShieldCheck className="h-4 w-4"/>Profesionalidad automática</span><div className="mt-3 flex items-end gap-1"><strong className="text-3xl font-black text-white">{draft.professionalism}</strong><span className="pb-1 text-slate-500">/10</span></div><p className="mt-1 text-[9px] text-slate-500">{professionalismPoints}/60 puntos en los criterios</p></div></div>
        <div className="mt-3 rounded-2xl border border-lime-300/15 bg-lime-300/[0.05] p-4"><span className="text-[9px] font-black uppercase tracking-wider text-lime-300">Horas Available del mes · automático</span><p className="mt-2 text-xl font-black text-white">{selectedReward?.effectiveHours || 0} h</p></div>
        <div className="mt-5 border-t border-white/7 pt-5"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Detalle de profesionalidad</p><div className="mt-3 grid grid-cols-2 gap-2">{FACTORS.map(([key,label]) => <label key={key} className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="block text-[9px] text-slate-400">{label}</span><input type="number" min="0" max="10" step="0.5" value={Number(draft[key] || 0)} onChange={event => updateNumber(key, Math.min(10, Math.max(0, Number(event.target.value))))} className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none"/></label>)}</div></div>
        {saveError && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-300">{saveError}</p>}
        <button onClick={save} disabled={!selected || saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-40"><Save className="h-4 w-4"/>{saving ? 'Guardando…' : saved ? 'Valoración guardada' : 'Guardar valoración mensual'}</button>
      </section>

      <section className="rounded-3xl border border-white/7 bg-white/[0.025] p-5"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-violet-300">Resultado provisional</p><h4 className="mt-1 text-lg font-bold text-white">Ranking de recompensas</h4></div><BarChart3 className="h-6 w-6 text-violet-300"/></div>
        <div className="mt-5 space-y-2">{rows.map((row,index) => <div key={row.comercial.id} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3"><span className="text-center text-lg">{['🥇','🥈','🥉'][index] || `#${index+1}`}</span><div><p className="text-xs font-bold text-white">{row.comercial.name}</p><p className="mt-0.5 text-[9px] text-slate-500">{row.cashCollected.toLocaleString('es-ES')} € · {row.appointments} citas · SR {row.showRate}% · PRO {row.professionalism}/10</p>{!row.eligible && <p className="mt-1 text-[9px] font-bold text-rose-300">No elegible para MVP (&lt;8 profesionalidad)</p>}</div><div className="text-right"><p className="font-mono text-lg font-black text-amber-300">{row.score.toFixed(2)}</p>{row.cashPrize > 0 && <p className="text-[9px] font-bold text-emerald-300">Premio {row.cashPrize} €</p>}</div></div>)}</div>
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-4"><p className="text-[9px] font-black uppercase tracking-widest text-amber-300">MVP provisional del mes</p><p className="mt-1 text-xl font-black text-white">{winner?.comercial.name || 'Sin candidato elegible'}</p><div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400"><CalendarDays className="h-4 w-4"/>Se anuncia en el Daily del último día del mes.</div></div>
      </section>
    </div>

    <section className="rounded-3xl border border-amber-400/15 bg-white/[0.025] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-amber-300"><BarChart3 className="h-5 w-5"/><span className="text-[10px] font-black uppercase tracking-[.22em]">Registro de puntos KPI</span></div><h4 className="mt-2 text-xl font-black text-white">Justificación mensual de {selected?.name || 'comercial'}</h4><p className="mt-1 text-xs text-slate-400">Referencias del índice: {MVP_CASH_REFERENCE.toLocaleString('es-ES')} € de cash y {MVP_APPOINTMENTS_REFERENCE} citas. Superarlas aumenta el score por encima de 100.</p></div><div className="flex gap-2"><div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] px-4 py-3 text-right"><p className="text-[8px] uppercase tracking-widest text-slate-500">Puntos acumulados</p><strong className="text-2xl text-violet-200">{selectedReward?.kpiPoints ?? 0}</strong></div><div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-right"><p className="text-[8px] uppercase tracking-widest text-slate-500">Score MVP · abierto</p><strong className="text-2xl text-amber-300">{selectedReward?.score?.toFixed(2) ?? '0.00'}</strong></div></div></div>
      {!selectedKpiLedger.length ? <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">Este comercial no participa en el ranking KPI del mes seleccionado.</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{selectedKpiLedger.map(({ label, points, rule, detail, Icon, style }) => { const share = selectedReward?.kpiPoints ? Math.round((points / selectedReward.kpiPoints) * 100) : 0; return <article key={label} className={`rounded-2xl border p-4 ${style}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><Icon className="h-5 w-5"/><h5 className="text-xs font-black text-white">{label}</h5></div><div className="text-right"><strong className="block font-mono text-sm">+{points}</strong><span className="text-[8px] opacity-70">{rule}</span></div></div><p className="mt-3 text-[9px] leading-relaxed text-slate-400">{detail}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-current" style={{ width: `${share}%` }}/></div><p className="mt-1.5 text-[8px] text-slate-600">{share}% de los puntos de actividad</p></article>; })}</div>}
    </section>

    <section className="rounded-3xl border border-violet-400/20 bg-[linear-gradient(135deg,rgba(124,58,237,.1),rgba(0,0,0,.18))] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-violet-300"><TrendingUp className="h-5 w-5"/><span className="text-[10px] font-black uppercase tracking-[.22em]">Progreso de Legado</span></div><h4 className="mt-2 text-xl font-black text-white">Todos los comerciales</h4><p className="mt-1 text-xs text-slate-400">PA acumulados, rango actual y distancia hasta el siguiente nivel.</p></div><Award className="hidden h-8 w-8 text-violet-300 sm:block"/></div>
      {!legacyProgressRows.length ? <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">No hay comerciales registrados.</p> : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">{legacyProgressRows.map(({ comercial, legacy }, index) => (
          <article key={comercial.id} className="rounded-2xl border border-white/7 bg-black/25 p-4">
            <div className="flex items-center gap-4">
              <img src={legacy.rank.asset} alt={`Rango ${legacy.rank.name}`} className="h-16 w-16 shrink-0 object-contain"/>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="text-[9px] text-slate-600">#{index + 1}</span><h5 className="truncate text-sm font-black text-white">{comercial.name}</h5><span className="rounded-md border border-white/10 px-2 py-0.5 text-[8px] font-black uppercase" style={{ color: legacy.rank.accent }}>{legacy.rank.name}</span></div>
                <div className="mt-2 flex items-end justify-between gap-3"><strong className="font-mono text-lg text-violet-200">{legacy.total.toLocaleString('es-ES')} PA</strong><span className="text-right text-[8px] text-slate-500">{legacy.nextRank ? `${legacy.pointsToNext.toLocaleString('es-ES')} PA para ${legacy.nextRank.name}` : 'Rango máximo'}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full border border-white/10 bg-black/50"><div className="h-full rounded-full" style={{ width: `${legacy.progress}%`, background: `linear-gradient(90deg,${legacy.rank.accent},#a78bfa)` }}/></div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1 text-center">{[['Cash',legacy.cashPoints],['Citas',legacy.agendaPoints],['Shows',legacy.showPoints],['Ventas',legacy.salesPoints],['Manual',legacy.manualPoints]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white/[0.025] px-1 py-1.5"><span className="block text-[7px] uppercase text-slate-600">{label}</span><strong className="text-[8px] text-slate-300">{Number(value).toLocaleString('es-ES')}</strong></div>)}</div>
          </article>
        ))}</div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">{LEGACY_RANKS.map(rank => <span key={rank.name} className="rounded-lg border border-white/7 bg-black/20 px-2.5 py-1.5 text-[8px] text-slate-500"><strong style={{ color: rank.accent }}>{rank.name}</strong> · {rank.min.toLocaleString('es-ES')} PA{rank.max === Infinity ? '+' : ''}</span>)}</div>
    </section>

    <section className="rounded-3xl border border-violet-400/20 bg-[linear-gradient(135deg,rgba(124,58,237,.12),rgba(0,0,0,.18))] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-violet-300"><Handshake className="h-5 w-5"/><span className="text-[10px] font-black uppercase tracking-[.22em]">Gestión manual de PA</span></div><h4 className="mt-2 text-xl font-black text-white">Bonificaciones de Legado</h4><p className="mt-1 text-xs text-slate-400">Solo estas tres acciones requieren validación manual. Cash, agendas, shows y ventas se calculan automáticamente.</p></div>{selectedLegacy && <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-right"><p className="text-[9px] uppercase tracking-widest text-slate-500">PA de {selected?.name}</p><p className="text-2xl font-black text-violet-300">{selectedLegacy.total.toLocaleString('es-ES')} PA</p></div>}</div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-2xl border border-white/7 bg-black/20 p-4"><div className="grid gap-3 sm:grid-cols-[1fr_90px]"><label><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Acción reconocida</span><select value={bonusType} onChange={event => setBonusType(event.target.value as LegacyBonusType)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-xs font-bold text-white outline-none">{Object.entries(bonusConfig).map(([value,config]) => <option key={value} value={value}>{config.label} (+{config.points} PA)</option>)}</select></label><label><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Cantidad</span><input type="number" min="1" value={bonusQuantity} onChange={event => setBonusQuantity(Math.max(1, Number(event.target.value)))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-xs font-bold text-white outline-none"/></label></div><label className="mt-3 block"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Nota / motivo</span><input value={bonusNote} onChange={event => setBonusNote(event.target.value)} placeholder="Ej. Apoyo en el cierre de Cliente X" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-xs text-white outline-none placeholder:text-slate-600"/></label><button onClick={addLegacyBonus} disabled={!selected} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-xs font-black text-white transition hover:bg-violet-400 disabled:opacity-40"><Plus className="h-4 w-4"/>Añadir +{bonusConfig[bonusType].points * bonusQuantity} PA</button></div>
        <div className="rounded-2xl border border-white/7 bg-black/20 p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Registro completo de PA</p><p className="mt-1 text-[10px] text-slate-500">Cada punto muestra su origen y si fue automático o manual.</p></div><Lightbulb className="h-4 w-4 text-amber-300"/></div><div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">{!selectedLedger.length ? <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">Este comercial todavía no ha generado PA.</p> : selectedLedger.map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-white">{item.label}</p><span className={`rounded-md border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${ledgerStyles[item.category]}`}>{item.automatic ? 'Automático' : 'Manual'}</span></div><p className="mt-1 truncate text-[9px] text-slate-500">{item.date || 'Sin fecha'} · {item.detail}</p></div><strong className="whitespace-nowrap text-xs text-violet-300">+{item.points.toLocaleString('es-ES')} PA</strong>{!item.automatic && <button onClick={() => deleteLegacyBonus(item.id)} aria-label="Eliminar bonificación" className="rounded-lg p-2 text-slate-600 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button>}</div>)}</div></div>
      </div>
    </section>
  </div>;
}
