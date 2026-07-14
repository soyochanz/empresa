import React from 'react';
import { CalendarCheck, CheckCircle2, Coins, Handshake, Lightbulb, Medal, ShoppingBag, Trophy } from 'lucide-react';
import { CalendarEvent, ClientContact, ColdCallingLead, ComercialAccount } from '../types';
import { calculateLegacyPoints, LEGACY_RANKS } from '../utils/salesRewards';

interface Props {
  comercial: ComercialAccount;
  comercialesList: ComercialAccount[];
  finTransactions: any[];
  events: CalendarEvent[];
  coldLeads: ColdCallingLead[];
  contacts: ClientContact[];
}

export default function LegacyRankSystem({ comercial, comercialesList, finTransactions, events, coldLeads, contacts }: Props) {
  const legacy = calculateLegacyPoints(comercial, finTransactions, events, coldLeads, contacts);
  const legacyBoard = comercialesList.map(item => ({ comercial: item, result: calculateLegacyPoints(item, finTransactions, events, coldLeads, contacts) })).sort((a, b) => b.result.total - a.result.total);
  const position = legacyBoard.findIndex(row => row.comercial.id === comercial.id) + 1;
  const automatic = [
    { label: 'Cash Collected', detail: `${legacy.cashCollected.toLocaleString('es-ES')} € consolidados × 1`, points: legacy.cashPoints, Icon: Coins },
    { label: 'Agendas', detail: `${legacy.agendas} × 50 PA`, points: legacy.agendaPoints, Icon: CalendarCheck },
    { label: 'Shows', detail: `${legacy.shows} × 75 PA`, points: legacy.showPoints, Icon: CheckCircle2 },
    { label: 'Ventas cerradas', detail: `${legacy.sales} × 250 PA`, points: legacy.salesPoints, Icon: ShoppingBag },
  ];

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.22),transparent_38%),linear-gradient(135deg,#080613,#100b22_55%,#06050b)] p-6 sm:p-8">
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="relative grid items-center gap-6 lg:grid-cols-[260px_1fr_auto]">
        <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
          <div className="absolute inset-5 rounded-full blur-3xl opacity-25" style={{ backgroundColor: legacy.rank.accent }} />
          <img src={legacy.rank.asset} alt={`Insignia ${legacy.rank.name}`} className="relative z-10 h-full w-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,.65)]" />
        </div>
        <div><div className="flex items-center gap-2"><Medal className="h-4 w-4 text-violet-300"/><p className="text-[10px] font-black uppercase tracking-[.3em] text-violet-300">Legado Althera</p></div>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-white">{legacy.rank.name}</h2><p className="mt-1 text-xs text-slate-400">Rango permanente · Posición global #{position}</p>
          <div className="mt-6 max-w-xl"><div className="mb-2 flex justify-between text-[10px] font-bold"><span style={{ color: legacy.rank.accent }}>{legacy.total.toLocaleString('es-ES')} PA</span><span className="text-slate-500">{legacy.nextRank ? `${legacy.nextRank.min.toLocaleString('es-ES')} PA · ${legacy.nextRank.name}` : 'Rango máximo'}</span></div><div className="h-3 overflow-hidden rounded-full border border-white/10 bg-black/50"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${legacy.progress}%`, background: `linear-gradient(90deg,${legacy.rank.accent},#ffffff)` }} /></div>{legacy.nextRank && <p className="mt-2 text-[10px] text-slate-500">Te faltan <strong className="text-white">{legacy.pointsToNext.toLocaleString('es-ES')} PA</strong> para ascender.</p>}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/35 px-7 py-6 text-center backdrop-blur-xl"><Trophy className="mx-auto h-6 w-6 text-amber-300"/><p className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Puntos Althera</p><p className="mt-1 text-4xl font-black text-white">{legacy.total.toLocaleString('es-ES')}</p><p className="text-xs font-bold text-violet-300">PA totales</p></div>
      </div>
    </section>

    <section><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.22em] text-slate-500">Camino de rangos</p><h3 className="mt-1 text-lg font-bold text-white">Tu legado visual</h3></div><div className="grid grid-cols-3 gap-3 lg:grid-cols-6">{LEGACY_RANKS.map(rank => { const active = rank.name === legacy.rank.name; const unlocked = legacy.total >= rank.min; return <div key={rank.name} className={`relative rounded-2xl border p-3 text-center transition ${active ? 'border-violet-400/40 bg-violet-500/10 ring-1 ring-violet-400/20' : unlocked ? 'border-white/10 bg-white/[0.035]' : 'border-white/5 bg-black/20 opacity-40 grayscale'}`}><img src={rank.asset} alt={`Rango ${rank.name}`} className="mx-auto h-24 w-24 object-contain"/><p className="mt-1 text-xs font-black uppercase text-white">{rank.name}</p><p className="mt-1 text-[9px] text-slate-500">{rank.min.toLocaleString('es-ES')} PA{rank.max !== Infinity ? ` · ${rank.max.toLocaleString('es-ES')}` : '+'}</p>{active && <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-violet-300"/>}</div>})}</div></section>

    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-3xl border border-white/7 bg-white/[0.025] p-5"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">PA automáticos</p><p className="mt-1 text-[9px] text-slate-500">Solo se suma Cash Collected. Los importes pending quedan excluidos hasta consolidarse.</p><div className="mt-4 grid grid-cols-2 gap-3">{automatic.map(({ label,detail,points,Icon }) => <div key={label} className="rounded-2xl border border-white/5 bg-black/20 p-4"><Icon className="h-5 w-5 text-emerald-300"/><p className="mt-3 text-xs font-bold text-white">{label}</p><p className="mt-1 text-[9px] text-slate-500">{detail}</p><p className="mt-2 font-mono text-lg font-black text-emerald-300">+{points.toLocaleString('es-ES')} PA</p></div>)}</div></section>
      <section className="rounded-3xl border border-white/7 bg-white/[0.025] p-5"><p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Bonificaciones del equipo</p><p className="mt-1 text-xs text-slate-500">Reconocimientos registrados manualmente por administración.</p><div className="mt-4 space-y-2">{[
        [Handshake,'Ayudar a cerrar una venta','150 PA'],[ShoppingBag,'Completar formación','100 PA'],[Lightbulb,'Mejor idea del mes','300 PA']
      ].map(([Icon,label,value]: any) => <div key={label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3"><Icon className="h-4 w-4 text-amber-300"/><span className="flex-1 text-xs text-slate-300">{label}</span><strong className="text-xs text-amber-300">+{value}</strong></div>)}</div><div className="mt-4 flex items-center justify-between border-t border-white/7 pt-4"><span className="text-xs font-bold text-white">Total manual</span><strong className="font-mono text-lg text-amber-300">+{legacy.manualPoints.toLocaleString('es-ES')} PA</strong></div></section>
    </div>
  </div>;
}
