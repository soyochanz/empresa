import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer as RechartsResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowUpRight, CalendarCheck, CircleDollarSign, PhoneCall, Target } from 'lucide-react';
import { CalendarEvent, ColdCallingLead, ComercialAccount, ComercialLead } from '../types';
import { getMonthKey } from '../utils/salesRewards';

interface Props {
  comercial: ComercialAccount;
  leads: ComercialLead[];
  transactions: any[];
  coldLeads: ColdCallingLead[];
  events: CalendarEvent[];
}

const money = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tooltipStyle = { background: '#0a0f16', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 11 };
const ResponsiveContainer = (props: React.ComponentProps<typeof RechartsResponsiveContainer>) => (
  <RechartsResponsiveContainer minWidth={1} minHeight={1} initialDimension={{ width: 640, height: 225 }} {...props} />
);

export default function CommercialAnalyticsDashboard({ comercial, leads, transactions, coldLeads, events }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return { key, label: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '') };
    });
    const mine = (tx: any) => tx.comercialId === comercial.id || tx.comercialEmail?.toLowerCase() === comercial.email.toLowerCase();
    const collected = transactions.filter(tx => mine(tx) && tx.type === 'income' && tx.status === 'paid' && tx.isInitialSale === true);
    const monthly = months.map(month => ({
      month: month.label,
      cash: collected.filter(tx => getMonthKey(tx.date) === month.key).reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
      citas: events.filter(event => getMonthKey(event.date) === month.key && (event.comercialId === comercial.id || event.assignedUserEmail?.toLowerCase() === comercial.email.toLowerCase())).length,
    }));
    const myCold = coldLeads.filter(lead => lead.assignedToEmail?.toLowerCase() === comercial.email.toLowerCase());
    const calls = myCold.reduce((sum, lead) => sum + (lead.callsLog?.length ?? Number(lead.callsCount || 0)), 0);
    const conversations = myCold.reduce((sum, lead) => {
      if (lead.callsLog?.length) {
        return sum + lead.callsLog.filter(log => /Resultado:\s*Responde\b/i.test(log.result || '') && !/No responde/i.test(log.result || '')).length;
      }
      return sum + (lead.contacted === 'Sí' || lead.answered === 'Sí' ? 1 : 0);
    }, 0);
    const won = leads.filter(lead => lead.status === 'Ganado');
    const active = leads.filter(lead => !['Ganado', 'Perdido'].includes(lead.status));
    const totalCash = collected.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    return {
      monthly, calls, conversations, won, active, totalCash,
      funnel: [
        { name: 'Leads', value: leads.length, fill: '#64748b' },
        { name: 'Contactados', value: leads.filter(lead => lead.status !== 'Pendiente').length, fill: '#22d3ee' },
        { name: 'Negociación', value: leads.filter(lead => ['Negociación', 'Ganado'].includes(lead.status)).length, fill: '#a78bfa' },
        { name: 'Ganados', value: won.length, fill: '#a3e635' },
      ],
      activity: [
        { name: 'Llamadas', value: calls || 0, fill: '#a3e635' },
        { name: 'Conversaciones', value: conversations || 0, fill: '#22d3ee' },
        { name: 'Citas', value: events.filter(event => event.comercialId === comercial.id || event.assignedUserEmail?.toLowerCase() === comercial.email.toLowerCase()).length, fill: '#a78bfa' },
      ],
    };
  }, [comercial, leads, transactions, coldLeads, events]);

  const conversion = leads.length ? Math.round((data.won.length / leads.length) * 100) : 0;
  const cards = [
    { label: 'Cash collected', value: money(data.totalCash), detail: 'Solo saldo consolidado', Icon: CircleDollarSign, tone: 'text-lime-300 bg-lime-400/10 border-lime-400/15' },
    { label: 'Pipeline activo', value: data.active.length, detail: `${leads.length} oportunidades totales`, Icon: Target, tone: 'text-violet-300 bg-violet-400/10 border-violet-400/15' },
    { label: 'Conversión', value: `${conversion}%`, detail: `${data.won.length} ventas ganadas`, Icon: ArrowUpRight, tone: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/15' },
    { label: 'Actividad', value: data.calls, detail: `${data.conversations} conversaciones`, Icon: PhoneCall, tone: 'text-amber-300 bg-amber-400/10 border-amber-400/15' },
  ];

  return <section className="space-y-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-lime-300"><Activity className="h-4 w-4"/><span className="text-[9px] font-black uppercase tracking-[.25em]">Datos registrados</span></div><h3 className="mt-1 text-xl font-black text-white">Analítica comercial</h3></div><p className="text-[10px] text-slate-500">Sin estimaciones: operaciones pagadas y actividad guardada</p></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map((card,index) => <motion.article key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .07 }} className="group rounded-2xl border border-white/[0.07] bg-[#0b1017]/90 p-4 shadow-[0_16px_50px_rgba(0,0,0,.2)] transition hover:-translate-y-0.5 hover:border-white/15"><div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${card.tone}`}><card.Icon className="h-4 w-4"/></div><p className="mt-4 text-[9px] font-black uppercase tracking-wider text-slate-500">{card.label}</p><p className="mt-1 text-xl font-black text-white sm:text-2xl">{card.value}</p><p className="mt-1 text-[9px] text-slate-500">{card.detail}</p></motion.article>)}</div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[1.35fr_.8fr_.75fr]">
      <article className="min-h-[300px] rounded-2xl border border-white/[0.07] bg-[#0b1017]/90 p-4 sm:p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-lime-300">Cash performance</p><h4 className="mt-1 text-sm font-bold text-white">Ingresos cobrados · 6 meses</h4></div><div className="text-right"><p className="text-base font-black text-white">{money(data.totalCash)}</p><p className="text-[8px] uppercase tracking-wider text-slate-500">Total consolidado</p></div></div><div className="h-[225px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.monthly} margin={{ left: 4, right: 8 }}><defs><linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a3e635" stopOpacity={.42}/><stop offset="100%" stopColor="#a3e635" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }}/><YAxis axisLine={false} tickLine={false} width={58} domain={[0, 'auto']} tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={(value: number) => `${Number(value).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`}/><Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [money(Number(value)), 'Cash collected']}/><Area type="monotone" dataKey="cash" stroke="#a3e635" strokeWidth={2.5} fill="url(#cashGradient)" animationDuration={1100} activeDot={{ r: 5, fill: '#d9f99d', stroke: '#a3e635' }}/></AreaChart></ResponsiveContainer></div></article>
      <article className="min-h-[300px] rounded-2xl border border-white/[0.07] bg-[#0b1017]/90 p-4 sm:p-5"><p className="text-[9px] font-black uppercase tracking-widest text-violet-300">Sales funnel</p><h4 className="mt-1 text-sm font-bold text-white">Embudo de conversión</h4><div className="mt-4 h-[225px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.funnel} layout="vertical" margin={{ left: 0, right: 10 }}><XAxis type="number" hide/><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={72} tick={{ fill: '#94a3b8', fontSize: 9 }}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="value" radius={[0,8,8,0]} animationDuration={900}>{data.funnel.map(item => <Cell key={item.name} fill={item.fill}/>)}</Bar></BarChart></ResponsiveContainer></div></article>
      <article className="min-h-[300px] rounded-2xl border border-white/[0.07] bg-[#0b1017]/90 p-4 sm:p-5"><p className="text-[9px] font-black uppercase tracking-widest text-cyan-300">Actividad registrada</p><h4 className="mt-1 text-sm font-bold text-white">Desglose acumulado</h4><div className="relative mt-2 h-[180px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.activity} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={5} animationDuration={1200}>{data.activity.map(item => <Cell key={item.name} fill={item.fill}/>)}</Pie><Tooltip contentStyle={tooltipStyle}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black text-white">{data.calls}</span><span className="text-[8px] uppercase text-slate-500">llamadas</span></div></div><div className="grid grid-cols-3 gap-1">{data.activity.map(item => <div key={item.name} className="text-center"><span className="mx-auto block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.fill }}/><p className="mt-1 text-[8px] text-slate-500">{item.name}</p><strong className="text-[10px] text-white">{item.value}</strong></div>)}</div></article>
    </div>
  </section>;
}
