import React, { useMemo } from 'react';
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer as RechartsResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BarChart3, CheckCircle2, PhoneCall, Target, Users } from 'lucide-react';
import { ClientContact, ColdCallingLead, ComercialAccount, ComercialLead } from '../types';

interface Props {
 comerciales: ComercialAccount[];
 coldLeads: ColdCallingLead[];
 crmLeads: ComercialLead[];
 contacts: ClientContact[];
}

const COLORS = ['#a3e635', '#22d3ee', '#a78bfa', '#f59e0b', '#fb7185', '#34d399', '#60a5fa', '#f472b6'];
const ResponsiveContainer = (props: React.ComponentProps<typeof RechartsResponsiveContainer>) => (
 <RechartsResponsiveContainer minWidth={1} minHeight={1} initialDimension={{ width: 920, height: 280 }} {...props} />
);
const monthKey = (value?: string) => {
 if (!value) return '';
 const isoMatch = value.match(/^(\d{4})-(\d{2})/);
 if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;
 const parsed = new Date(value);
 return Number.isFinite(parsed.getTime()) ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}` : '';
};
const normalized = (value?: string) => (value || '').trim().toLowerCase();
const wasAttempted = (lead: ColdCallingLead) =>
 Number(lead.callsCount || 0) > 0 || (lead.callsLog?.length || 0) > 0;
const wasAnswered = (lead: ColdCallingLead) =>
 lead.answered === 'Sí'
 || (lead.callsLog || []).some(log => /Resultado:\s*Responde\b/i.test(log.result || '') && !/No responde/i.test(log.result || ''));

export default function AdminCommercialEvolution({ comerciales, coldLeads, crmLeads, contacts }: Props) {
 const { rows, evolution } = useMemo(() => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
   const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
   return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
   };
  });

  const performanceRows = comerciales.map(comercial => {
   const email = normalized(comercial.email);
   const assigned = coldLeads.filter(lead => !lead.archived && normalized(lead.assignedToEmail) === email);
   const historical = coldLeads.filter(lead =>
    normalized(lead.assignedToEmail) === email
    || normalized(lead.closingOriginComercialEmail) === email
    || (lead.assignmentHistory || []).some(record => normalized(record.commercialEmail) === email)
   );
   const historicalIds = new Set(historical.map(lead => lead.id));
   const contacted = historical.filter(wasAttempted);
   const answered = contacted.filter(wasAnswered);
   const closerLeadIds = new Set([
    ...historical.filter(lead => lead.callbackScheduled === 'Sí').map(lead => lead.id),
    ...contacts
     .filter(contact => contact.closingSourceLeadId && historicalIds.has(contact.closingSourceLeadId))
     .map(contact => contact.closingSourceLeadId as string)
   ]);
   const won = new Set(contacts
    .filter(contact => contact.status === 'Client' && contact.closingSourceLeadId && historicalIds.has(contact.closingSourceLeadId))
    .map(contact => contact.closingSourceLeadId as string)).size;
   const lost = crmLeads.filter(lead => lead.comercialId === comercial.id && lead.status === 'Perdido').length;
   const calls = assigned.reduce((sum, lead) => sum + Math.max(lead.callsLog?.length || 0, Number(lead.callsCount || 0)), 0);
   return {
    comercial,
    assigned: assigned.length,
    historical: historical.length,
    contacted: contacted.length,
    answered: answered.length,
    closer: closerLeadIds.size,
    won,
    lost,
    calls,
    contactRate: historical.length ? Math.round((contacted.length / historical.length) * 100) : 0,
    answerRate: contacted.length ? Math.round((answered.length / contacted.length) * 100) : 0,
    closerRate: answered.length ? Math.round((closerLeadIds.size / answered.length) * 100) : 0,
   };
  });

  const chart = months.map(month => {
   const point: Record<string, string | number> = { month: month.label };
   comerciales.forEach(comercial => {
    const email = normalized(comercial.email);
    const workedLeadIds = new Set<string>();
    coldLeads
     .filter(lead =>
      normalized(lead.assignedToEmail) === email
      || normalized(lead.closingOriginComercialEmail) === email
      || (lead.assignmentHistory || []).some(record => normalized(record.commercialEmail) === email)
     )
     .forEach(lead => {
      const hasMonthlyCall = (lead.callsLog || []).some(log => monthKey(log.date) === month.key);
      const fallbackActivity = monthKey(lead.callDate || lead.createdAt) === month.key
       && (wasAttempted(lead) || lead.callbackScheduled === 'Sí');
      if (hasMonthlyCall || fallbackActivity) workedLeadIds.add(lead.id);
     });
    point[comercial.id] = workedLeadIds.size;
   });
   return point;
  });
  return { rows: performanceRows, evolution: chart };
 }, [comerciales, coldLeads, crmLeads, contacts]);

 return (
  <section className="rounded-3xl border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(34,211,238,.055),rgba(124,58,237,.04),rgba(0,0,0,.18))] p-5 sm:p-6">
   <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
     <div className="flex items-center gap-2 text-cyan-300"><BarChart3 className="h-4 w-4" /><span className="text-[9px] font-black uppercase tracking-[.24em]">Rendimiento operativo</span></div>
     <h3 className="mt-1 text-xl font-black text-white">Embudo actual por comercial</h3>
     <p className="mt-1 text-[10px] text-slate-500">Distingue cartera actual y acumulado histórico; el trabajo realizado nunca desaparece al archivar o reasignar.</p>
    </div>
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-[9px] text-slate-500"><Target className="h-3.5 w-3.5 text-lime-300" />Actualizado con los datos guardados</div>
   </div>

   <div className="mt-5 overflow-x-auto">
    <table className="w-full min-w-[900px] text-left">
     <thead><tr className="border-b border-white/[0.07] text-[8px] font-black uppercase tracking-wider text-slate-600">
      <th className="px-3 py-3">Comercial</th><th className="px-3 py-3 text-center">Asignados ahora</th><th className="px-3 py-3 text-center">Histórico total</th><th className="px-3 py-3 text-center">Contactados</th><th className="px-3 py-3 text-center">Contestan</th><th className="px-3 py-3 text-center">Al closer</th><th className="px-3 py-3 text-center">Cerrados</th><th className="px-3 py-3 text-center">Perdidos CRM</th><th className="px-3 py-3 text-center">Llamadas</th><th className="px-3 py-3">Conversión operativa</th>
     </tr></thead>
     <tbody className="divide-y divide-white/[0.05]">{rows.map((row, index) => (
      <tr key={row.comercial.id} className="transition hover:bg-white/[0.025]">
       <td className="px-3 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black text-slate-950" style={{ backgroundColor: COLORS[index % COLORS.length] }}>{row.comercial.name.slice(0, 2).toUpperCase()}</span><div><p className="text-xs font-bold text-white">{row.comercial.name}</p><p className="text-[8px] text-slate-600">{row.comercial.email}</p></div></div></td>
       <td className="px-3 py-4 text-center"><strong className="text-sm text-white">{row.assigned}</strong></td>
       <td className="px-3 py-4 text-center"><strong className="text-sm text-slate-200">{row.historical}</strong></td>
       <td className="px-3 py-4 text-center"><strong className="text-sm text-cyan-300">{row.contacted}</strong><span className="ml-1 text-[8px] text-slate-600">({row.contactRate}%)</span></td>
       <td className="px-3 py-4 text-center"><strong className="text-sm text-blue-300">{row.answered}</strong><span className="ml-1 text-[8px] text-slate-600">({row.answerRate}%)</span></td>
       <td className="px-3 py-4 text-center"><strong className="text-sm text-violet-300">{row.closer}</strong><span className="ml-1 text-[8px] text-slate-600">({row.closerRate}%)</span></td>
       <td className="px-3 py-4 text-center text-sm font-black text-lime-300">{row.won}</td>
       <td className="px-3 py-4 text-center text-sm font-black text-rose-300">{row.lost}</td>
       <td className="px-3 py-4 text-center text-sm font-black text-amber-300">{row.calls}</td>
       <td className="px-3 py-4"><div className="flex items-center gap-2 text-[8px] text-slate-500"><Users className="h-3 w-3" />{row.historical}<ArrowRight className="h-3 w-3" /><PhoneCall className="h-3 w-3 text-cyan-300" />{row.contacted}<ArrowRight className="h-3 w-3" /><span className="text-blue-300">{row.answered}</span><ArrowRight className="h-3 w-3" /><CheckCircle2 className="h-3 w-3 text-violet-300" />{row.closer}</div></td>
      </tr>
     ))}</tbody>
    </table>
   </div>

   <article className="mt-6 rounded-2xl border border-white/[0.07] bg-[#080d14]/75 p-4 sm:p-5">
    <div><p className="text-[9px] font-black uppercase tracking-widest text-lime-300">Evolución comparativa · 6 meses</p><h4 className="mt-1 text-sm font-bold text-white">Leads trabajados por comercial</h4><p className="mt-1 text-[9px] text-slate-500">Un lead cuenta una vez por mes cuando registra llamada, contacto o paso al closer.</p></div>
    <div className="mt-4 h-[280px]">
     <ResponsiveContainer width="100%" height="100%">
      <LineChart data={evolution} margin={{ top: 8, right: 14, left: -16, bottom: 4 }}>
       <CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false} />
       <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
       <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
       <Tooltip contentStyle={{ background: '#080d14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 10 }} />
       <Legend wrapperStyle={{ fontSize: 9, paddingTop: 12 }} />
       {comerciales.map((comercial, index) => <Line key={comercial.id} type="monotone" dataKey={comercial.id} name={comercial.name} stroke={COLORS[index % COLORS.length]} strokeWidth={2.4} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
      </LineChart>
     </ResponsiveContainer>
    </div>
   </article>
  </section>
 );
}
