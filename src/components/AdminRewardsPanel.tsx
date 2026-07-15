import React, { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Handshake, Lightbulb, Plus, Save, ShieldCheck, Sparkles, Trash2, Trophy } from 'lucide-react';
import { CalendarEvent, ClientContact, ColdCallingLead, ComercialAccount, LegacyBonusType, MonthlyPerformanceReview } from '../types';
import { buildLegacyPointLedger, buildSalesRewards, calculateLegacyPoints } from '../utils/salesRewards';

interface Props {
  comercialesList: ComercialAccount[];
  finTransactions: any[];
  events: CalendarEvent[];
  coldLeads: ColdCallingLead[];
  contacts: ClientContact[];
  onUpdateComercial: (account: ComercialAccount) => void | Promise<void>;
}

const FACTORS: Array<[keyof MonthlyPerformanceReview, string]> = [
  ['punctuality', 'Puntualidad'], ['meetingAttendance', 'Asistencia a reuniones'],
  ['processCompliance', 'Seguir procesos'], ['attitude', 'Actitud'],
  ['communication', 'Comunicación'], ['taskCompletion', 'Cumplimiento de tareas'],
];

export default function AdminRewardsPanel({ comercialesList, finTransactions, events, coldLeads, contacts, onUpdateComercial }: Props) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedId, setSelectedId] = useState(comercialesList[0]?.id || '');
  const selected = comercialesList.find(item => item.id === selectedId);
  const emptyReview: MonthlyPerformanceReview = { month, showRate: 0, professionalism: 0, effectiveHours: 0 };
  const [draft, setDraft] = useState<MonthlyPerformanceReview>(emptyReview);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [bonusType, setBonusType] = useState<LegacyBonusType>('sale_assist');
  const [bonusQuantity, setBonusQuantity] = useState(1);
  const [bonusNote, setBonusNote] = useState('');

  useEffect(() => {
    setDraft(selected?.monthlyPerformance?.[month] || { ...emptyReview, month });
    setSaved(false);
    setSaveError('');
  }, [selectedId, month]);

  useEffect(() => {
    if (!selectedId && comercialesList[0]?.id) setSelectedId(comercialesList[0].id);
  }, [comercialesList, selectedId]);

  const rows = buildSalesRewards(comercialesList, finTransactions, events, coldLeads, month);
  const winner = rows.find(row => row.eligible);
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError('');
    try {
      await onUpdateComercial({ ...selected, monthlyPerformance: { ...(selected.monthlyPerformance || {}), [month]: { ...draft, month, updatedAt: new Date().toISOString() } } });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error('Could not save monthly commercial review:', error);
      setSaveError('No se pudo confirmar el guardado. Se volverá a intentar automáticamente.');
    } finally {
      setSaving(false);
    }
  };
  const updateNumber = (key: keyof MonthlyPerformanceReview, value: number) => setDraft(current => ({ ...current, [key]: value }));
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
  const ledgerStyles = {
    cash: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300',
    agenda: 'border-violet-400/20 bg-violet-400/[0.06] text-violet-300',
    show: 'border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300',
    sale: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300',
    manual: 'border-fuchsia-400/20 bg-fuchsia-400/[0.06] text-fuchsia-300',
  } as const;

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-r from-amber-500/10 via-violet-500/5 to-transparent p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-amber-300"><Trophy className="h-5 w-5"/><span className="text-[10px] font-black uppercase tracking-[.25em]">Althera Rewards</span></div><h3 className="mt-2 text-2xl font-black text-white">Cierre y valoración mensual</h3><p className="mt-1 text-xs text-slate-400">Introduce Show Rate y profesionalidad el último día del mes. El score y el ranking se recalculan al instante.</p></div>
        <input type="month" value={month} onChange={event => setMonth(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-400/50"/></div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <section className="rounded-3xl border border-white/7 bg-white/[0.025] p-5"><label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Comercial a valorar</label><select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none">{comercialesList.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <div className="mt-5 grid grid-cols-2 gap-3"><label className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4"><span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-cyan-300"><Sparkles className="h-4 w-4"/>Show Rate</span><div className="mt-3 flex items-end gap-1"><input type="number" min="0" max="100" value={draft.showRate} onChange={event => updateNumber('showRate', Math.min(100, Math.max(0, Number(event.target.value))))} className="w-full bg-transparent text-3xl font-black text-white outline-none"/><span className="pb-1 text-slate-500">%</span></div></label>
          <label className={`rounded-2xl border p-4 ${draft.professionalism >= 8 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}><span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-300"><ShieldCheck className="h-4 w-4"/>Profesionalidad</span><div className="mt-3 flex items-end gap-1"><input type="number" min="0" max="10" step="0.1" value={draft.professionalism} onChange={event => updateNumber('professionalism', Math.min(10, Math.max(0, Number(event.target.value))))} className="w-full bg-transparent text-3xl font-black text-white outline-none"/><span className="pb-1 text-slate-500">/10</span></div></label></div>
        <label className="mt-3 block rounded-2xl border border-white/7 bg-black/20 p-4"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Horas efectivas del mes</span><input type="number" min="0" step="0.5" value={draft.effectiveHours || 0} onChange={event => updateNumber('effectiveHours', Math.max(0, Number(event.target.value)))} className="mt-2 w-full bg-transparent text-xl font-black text-white outline-none"/></label>
        <div className="mt-5 border-t border-white/7 pt-5"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Detalle de profesionalidad</p><div className="mt-3 grid grid-cols-2 gap-2">{FACTORS.map(([key,label]) => <label key={key} className="rounded-xl border border-white/5 bg-black/20 p-3"><span className="block text-[9px] text-slate-400">{label}</span><input type="number" min="0" max="10" step="0.5" value={Number(draft[key] || 0)} onChange={event => updateNumber(key, Math.min(10, Math.max(0, Number(event.target.value))))} className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none"/></label>)}</div></div>
        {saveError && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-300">{saveError}</p>}
        <button onClick={save} disabled={!selected || saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-40"><Save className="h-4 w-4"/>{saving ? 'Guardando…' : saved ? 'Valoración guardada' : 'Guardar valoración mensual'}</button>
      </section>

      <section className="rounded-3xl border border-white/7 bg-white/[0.025] p-5"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-violet-300">Resultado provisional</p><h4 className="mt-1 text-lg font-bold text-white">Ranking de recompensas</h4></div><BarChart3 className="h-6 w-6 text-violet-300"/></div>
        <div className="mt-5 space-y-2">{rows.map((row,index) => <div key={row.comercial.id} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3"><span className="text-center text-lg">{['🥇','🥈','🥉'][index] || `#${index+1}`}</span><div><p className="text-xs font-bold text-white">{row.comercial.name}</p><p className="mt-0.5 text-[9px] text-slate-500">{row.cashCollected.toLocaleString('es-ES')} € · {row.appointments} citas · SR {row.showRate}% · PRO {row.professionalism}/10</p>{!row.eligible && <p className="mt-1 text-[9px] font-bold text-rose-300">No elegible para MVP (&lt;8 profesionalidad)</p>}</div><div className="text-right"><p className="font-mono text-lg font-black text-amber-300">{row.score}</p>{row.cashPrize > 0 && <p className="text-[9px] font-bold text-emerald-300">Premio {row.cashPrize} €</p>}</div></div>)}</div>
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-4"><p className="text-[9px] font-black uppercase tracking-widest text-amber-300">MVP provisional del mes</p><p className="mt-1 text-xl font-black text-white">{winner?.comercial.name || 'Sin candidato elegible'}</p><div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400"><CalendarDays className="h-4 w-4"/>Se anuncia en el Daily del último día del mes.</div></div>
      </section>
    </div>

    <section className="rounded-3xl border border-violet-400/20 bg-[linear-gradient(135deg,rgba(124,58,237,.12),rgba(0,0,0,.18))] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-violet-300"><Handshake className="h-5 w-5"/><span className="text-[10px] font-black uppercase tracking-[.22em]">Gestión manual de PA</span></div><h4 className="mt-2 text-xl font-black text-white">Bonificaciones de Legado</h4><p className="mt-1 text-xs text-slate-400">Solo estas tres acciones requieren validación manual. Cash, agendas, shows y ventas se calculan automáticamente.</p></div>{selectedLegacy && <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-right"><p className="text-[9px] uppercase tracking-widest text-slate-500">PA de {selected?.name}</p><p className="text-2xl font-black text-violet-300">{selectedLegacy.total.toLocaleString('es-ES')} PA</p></div>}</div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-2xl border border-white/7 bg-black/20 p-4"><div className="grid gap-3 sm:grid-cols-[1fr_90px]"><label><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Acción reconocida</span><select value={bonusType} onChange={event => setBonusType(event.target.value as LegacyBonusType)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-xs font-bold text-white outline-none">{Object.entries(bonusConfig).map(([value,config]) => <option key={value} value={value}>{config.label} (+{config.points} PA)</option>)}</select></label><label><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Cantidad</span><input type="number" min="1" value={bonusQuantity} onChange={event => setBonusQuantity(Math.max(1, Number(event.target.value)))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-xs font-bold text-white outline-none"/></label></div><label className="mt-3 block"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Nota / motivo</span><input value={bonusNote} onChange={event => setBonusNote(event.target.value)} placeholder="Ej. Apoyo en el cierre de Cliente X" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-xs text-white outline-none placeholder:text-slate-600"/></label><button onClick={addLegacyBonus} disabled={!selected} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-xs font-black text-white transition hover:bg-violet-400 disabled:opacity-40"><Plus className="h-4 w-4"/>Añadir +{bonusConfig[bonusType].points * bonusQuantity} PA</button></div>
        <div className="rounded-2xl border border-white/7 bg-black/20 p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Registro completo de PA</p><p className="mt-1 text-[10px] text-slate-500">Cada punto muestra su origen y si fue automático o manual.</p></div><Lightbulb className="h-4 w-4 text-amber-300"/></div><div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">{!selectedLedger.length ? <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">Este comercial todavía no ha generado PA.</p> : selectedLedger.map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-white">{item.label}</p><span className={`rounded-md border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${ledgerStyles[item.category]}`}>{item.automatic ? 'Automático' : 'Manual'}</span></div><p className="mt-1 truncate text-[9px] text-slate-500">{item.date || 'Sin fecha'} · {item.detail}</p></div><strong className="whitespace-nowrap text-xs text-violet-300">+{item.points.toLocaleString('es-ES')} PA</strong>{!item.automatic && <button onClick={() => deleteLegacyBonus(item.id)} aria-label="Eliminar bonificación" className="rounded-lg p-2 text-slate-600 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button>}</div>)}</div></div>
      </div>
    </section>
  </div>;
}
