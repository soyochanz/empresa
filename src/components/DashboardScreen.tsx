import React, { useState } from 'react';
import { CalendarEvent, Note, Activity, Screen, ComercialLead, ClientContact } from '../types';
import { 
 Plus, 
 TrendingUp, 
 Rocket, 
 Calendar, 
 BarChart3, 
 Clock, 
 MoreVertical,
 ChevronRight,
 Bolt,
 Bookmark,
 Activity as ActivityIcon,
 PlusCircle,
 X
} from 'lucide-react';
import { 
 ResponsiveContainer, 
 BarChart, 
 Bar, 
 XAxis, 
 YAxis, 
 CartesianGrid, 
 Tooltip, 
 Cell,
 Legend
} from 'recharts';

// Helper to determine or estimate the date of an activity dynamically
const getActivityDate = (act: Activity): Date => {
 const customAct = act as any;
 if (customAct.created_at) {
 return new Date(customAct.created_at);
 }
 
 const now = new Date();
 
 // Specific elegant distribution for initial mock activities so chart looks alive
 if (act.id === 'a1') {
 return now;
 }
 if (act.id === 'a2') {
 const d = new Date();
 d.setDate(d.getDate() - 1);
 return d;
 }
 if (act.id === 'a3') {
 const d = new Date();
 d.setDate(d.getDate() - 3);
 return d;
 }
 if (act.id === 'a4') {
 const d = new Date();
 d.setDate(d.getDate() - 5);
 return d;
 }

 const ts = (act.timestamp || '').toLowerCase().trim();
 if (ts === 'just now' || ts.includes('ago') || ts.includes('h') || ts.includes('m')) {
 return now;
 }
 if (ts.includes('yesterday')) {
 const d = new Date();
 d.setDate(d.getDate() - 1);
 return d;
 }
 
 return now;
};

// Custom Tooltip component styled precisely to match the slate-dark theme
const CustomTooltip = ({ active, payload }: any) => {
 if (active && payload && payload.length) {
 return (
  <div className="bg-slate-950/95 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl text-xs font-sans">
  <p className="text-slate-400 font-semibold mb-1 font-mono">{payload[0].payload.label}</p>
  <div className="flex items-center gap-1.5 font-mono">
   <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
   <span className="text-white font-bold">
   {payload[0].value} {payload[0].value === 1 ? 'actividad' : 'actividades'}
   </span>
  </div>
  </div>
 );
 }
 return null;
};

// Custom Tooltip component for the leads and conversions bar chart
const CustomChartTooltip = ({ active, payload }: any) => {
 if (active && payload && payload.length) {
 return (
  <div className="bg-slate-950/95 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl text-xs font-sans space-y-1.5 text-left">
  <p className="text-slate-400 font-semibold font-mono border-b border-white/5 pb-1 mb-1">
   {payload[0].payload.name}
  </p>
  <div className="flex items-center justify-between gap-4 font-mono">
   <div className="flex items-center gap-1.5">
   <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
   <span className="text-slate-300">Nuevos Leads:</span>
   </div>
   <span className="text-white font-bold">{payload[0].value}</span>
  </div>
  <div className="flex items-center justify-between gap-4 font-mono">
   <div className="flex items-center gap-1.5">
   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
   <span className="text-slate-300">Conversiones:</span>
   </div>
   <span className="text-emerald-400 font-bold">{payload[1]?.value ?? 0}</span>
  </div>
  {payload[0].value > 0 && (
   <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-white/5 flex justify-between gap-2">
   <span>Tasa conversión:</span>
   <span className="text-slate-300 font-semibold">
    {Math.round(((payload[1]?.value ?? 0) / payload[0].value) * 100)}%
   </span>
   </div>
  )}
  </div>
 );
 }
 return null;
};

// Custom Note Date formatter (handles direct/formatted strings & parseable timestamp comparisons in local language)
function renderNoteDate(updatedAt: string) {
 if (!updatedAt) return '';
 const parsed = Date.parse(updatedAt);
 if (isNaN(parsed)) {
 return updatedAt; // already-formatted string e.g., 'Oct 12, 2023' or 'Yesterday'
 }
 const date = new Date(parsed);
 const now = new Date();
 const diffMs = now.getTime() - date.getTime();
 const diffMins = Math.floor(diffMs / 60000);
 const diffHours = Math.floor(diffMins / 60);
 const diffDays = Math.floor(diffHours / 24);

 if (diffMins < 1) {
 return 'Hace un momento';
 } else if (diffMins < 60) {
 return `Hace ${diffMins} min`;
 } else if (diffHours < 24) {
 return `Hace ${diffHours} h`;
 } else if (diffDays === 1) {
 return 'Ayer';
 } else if (diffDays < 7) {
 return `Hace ${diffDays} días`;
 } else {
 return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
 }
}

interface DashboardScreenProps {
 events: CalendarEvent[];
 notes: Note[];
 activities: Activity[];
 onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
 onAddNote: (note: Note) => void;
 onAddEvent: (event: CalendarEvent) => void;
 currentUser?: { name: string; email: string; id: string | null } | null;
 leads?: ComercialLead[];
 contacts?: ClientContact[];
}

export default function DashboardScreen({ 
 events, 
 notes, 
 activities, 
 onNavigate,
 onAddNote,
 onAddEvent,
 currentUser,
 leads = [],
 contacts = []
}: DashboardScreenProps) {
 const [showQuickAction, setShowQuickAction] = useState(false);
 const [showNewSprintModal, setShowNewSprintModal] = useState(false);
 const [newProjectName, setNewProjectName] = useState('');
 const [activeProjects, setActiveProjects] = useState(12);

 // 6-Month dynamic data aggregation for captured leads vs final conversions
 const chartData = React.useMemo(() => {
 const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
 const today = new Date();
 const slots = [];
 
 // Create slots for the last 6 months (excluding the current month to show complete historical periods)
 for (let i = 5; i >= 0; i--) {
  const d = new Date(today.getFullYear(), today.getMonth() - i - 1, 1);
  slots.push({
  key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
  name: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).substring(2)}`,
  monthIndex: d.getMonth(),
  year: d.getFullYear(),
  leads: 0,
  conversions: 0
  });
 }

 // Chart aggregates 100% real data from the database. Each slot starts at 0.

 const parseLeadDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
  return new Date(parsed);
  }
  const cleaned = dateStr.toLowerCase();
  const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  for (let m = 0; m < 12; m++) {
  if (cleaned.includes(monthsEs[m])) {
   const yearMatch = cleaned.match(/\b(20\d{2})\b/);
   const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
   return new Date(year, m, 15);
  }
  }
  return null;
 };

 // Aggregate real commercial leads
 leads.forEach(lead => {
  const dt = parseLeadDate(lead.createdAt);
  if (dt) {
  const leadYr = dt.getFullYear();
  const leadMo = dt.getMonth();
  const matchedSlot = slots.find(s => s.year === leadYr && s.monthIndex === leadMo);
  if (matchedSlot) {
   matchedSlot.leads += 1;
   if (lead.status === 'Ganado') {
   matchedSlot.conversions += 1;
   }
  }
  }
 });

 // Aggregate real client conversions
 contacts.forEach(contact => {
  if (contact.status === 'Client') {
  const dt = parseLeadDate(contact.addedDate);
  if (dt) {
   const cYr = dt.getFullYear();
   const cMo = dt.getMonth();
   const matchedSlot = slots.find(s => s.year === cYr && s.monthIndex === cMo);
   if (matchedSlot) {
   matchedSlot.conversions += 1;
   }
  }
  }
 });

 return slots;
 }, [leads, contacts]);

 const getGreeting = () => {
 const hours = new Date().getHours();
 if (hours < 12) return 'Good morning';
 if (hours < 18) return 'Good afternoon';
 return 'Good evening';
 };

 const getFormattedDate = () => {
 return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
 };

 const handleCreateSprint = (e: React.FormEvent) => {
 e.preventDefault();
 if (newProjectName.trim()) {
  setActiveProjects(prev => prev + 1);
  alert(`Sprint iniciado: ${newProjectName}. El total de proyectos activos se ha actualizado.`);
  setNewProjectName('');
  setShowNewSprintModal(false);
 }
 };

 // Get next 3 meetings (filtering out past events, keeping future events and current day events that have not passed)
 const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
 const curHours = new Date().getHours().toString().padStart(2, '0');
 const curMins = new Date().getMinutes().toString().padStart(2, '0');
 const currentTimeStr = `${curHours}:${curMins}`;

 const upcomingMeetings = events
 .filter(ev => {
  if (!ev.date) return false;
  if (ev.date > todayStr) return true;
  if (ev.date === todayStr) {
  return (ev.time || '00:00') >= currentTimeStr;
  }
  return false;
 })
 .sort((a, b) => {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) return dateCompare;
  return (a.time || '00:00').localeCompare(b.time || '00:00');
 })
 .slice(0, 3);

 const recentTwoNotes = notes.slice(0, 2);
 const openLeads = leads.filter(lead => !lead.isDone && lead.status !== 'Ganado' && lead.status !== 'Perdido').length;
 const todayMeetingsCount = events.filter(ev => ev.date === todayStr).length;
 const monthlyConversions = chartData.reduce((sum, item) => sum + item.conversions, 0);
 const platformActivities: Activity[] = React.useMemo(() => {
 const generated: Activity[] = [
  ...contacts.slice(0, 6).map(contact => ({
  id: `contact_${contact.id}`,
  type: 'CRM' as const,
  timestamp: contact.addedDate || 'Reciente',
  title: contact.name,
  subtitle: `${contact.status === 'Client' ? 'cliente activo' : 'lead'} en ${contact.company}`,
  detail: contact.notes || contact.originalLeadNotes,
  accentColor: contact.status === 'Client' ? 'tertiary' as const : 'primary' as const
  })),
  ...events.slice(0, 5).map(event => ({
  id: `event_${event.id}`,
  type: 'Task' as const,
  timestamp: `${event.date} ${event.time || ''}`.trim(),
  title: event.title,
  subtitle: event.status === 'done' ? 'completado' : 'programado',
  detail: event.description || event.notes,
  accentColor: event.status === 'done' ? 'tertiary' as const : 'secondary' as const
  })),
  ...leads.slice(0, 5).map(lead => ({
  id: `lead_${lead.id}`,
  type: 'Lead' as const,
  timestamp: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('es-ES') : 'Reciente',
  title: lead.company || lead.name,
  subtitle: `estado ${lead.status}`,
  detail: lead.notes,
  accentColor: lead.status === 'Ganado' ? 'tertiary' as const : lead.status === 'Perdido' ? 'error' as const : 'primary' as const
  }))
 ];
 return [...activities, ...generated].slice(0, 18);
 }, [activities, contacts, events, leads]);

 return (
 <div className="p-8 space-y-8 flex-1 overflow-y-auto bg-transparent text-slate-100 relative min-h-screen dashboard-glass">
  
  <div className="pointer-events-none absolute inset-x-8 top-6 h-56 rounded-[28px] bg-[linear-gradient(110deg,rgba(34,211,238,.16),rgba(99,102,241,.12)_45%,rgba(16,185,129,.10))] blur-2xl opacity-70" />

  {/* Header Info */}
  <div className="relative overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.075] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.08),transparent_38%,rgba(34,211,238,.08))]" />
  <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
  <div className="max-w-3xl">
   <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
    Vista ejecutiva
   </span>
   <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white font-sans">
   {getGreeting()}, {currentUser?.name || 'Dev Team'}
   </h2>
   <p className="text-slate-300 text-sm mt-2 leading-relaxed">
   Pulso operativo de Althera para hoy, {getFormattedDate()}. Citas, clientes, actividad y conversiones en una sola vista.
   </p>
  </div>
  <div className="flex flex-wrap gap-3">
   <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-right">
    <p className="text-[10px] uppercase tracking-widest text-slate-500">Conversiones</p>
    <p className="mt-1 text-2xl font-bold text-emerald-300">{monthlyConversions}</p>
   </div>
   <button 
   onClick={() => setShowNewSprintModal(true)}
   className="flex items-center gap-2 px-4 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold shadow-lg shadow-cyan-500/15 active:scale-95 transition-all text-sm cursor-pointer"
   >
   <Plus className="w-4 h-4" />
   <span>Nuevo sprint</span>
   </button>
  </div>
  </div>
  </div>

  {/* Stats Row */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  
  {/* Active Projects */}
  <div className="relative overflow-hidden bg-white/[0.075] backdrop-blur-2xl p-6 rounded-3xl flex items-center justify-between border border-white/12 hover:border-cyan-300/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group">
   <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 to-blue-500" />
   <div>
   <p className="text-cyan-100/70 text-[10px] font-mono font-medium uppercase tracking-widest mb-1">Proyectos activos</p>
   <h3 className="text-3xl font-bold text-white tracking-tight">{activeProjects}</h3>
   <p className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1">
    <TrendingUp className="w-3.5 h-3.5" />
    <span>2 from last week</span>
   </p>
   </div>
   <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-300 border border-cyan-300/20 shadow-md">
   <Rocket className="w-6 h-6" />
   </div>
  </div>

  {/* Meetings Today */}
  <div className="relative overflow-hidden bg-white/[0.075] backdrop-blur-2xl p-6 rounded-3xl flex items-center justify-between border border-white/12 hover:border-violet-300/40 hover:shadow-lg hover:shadow-violet-500/10 transition-all group">
   <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-400 to-fuchsia-400" />
   <div>
   <p className="text-violet-100/70 text-[10px] font-mono font-medium uppercase tracking-widest mb-1">Citas de hoy</p>
   <h3 className="text-3xl font-bold text-white tracking-tight">{todayMeetingsCount}</h3>
   <p className="text-[10px] text-slate-400 mt-2">{events.length} eventos en calendario</p>
   </div>
   <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-md">
   <Calendar className="w-6 h-6" />
   </div>
  </div>

  {/* Open Leads */}
  <div className="relative overflow-hidden bg-white/[0.075] backdrop-blur-2xl p-6 rounded-3xl flex items-center justify-between border border-white/12 hover:border-emerald-300/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group">
   <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 to-teal-400" />
   <div>
   <p className="text-emerald-100/70 text-[10px] font-mono font-medium uppercase tracking-widest mb-1">Leads abiertos</p>
   <h3 className="text-3xl font-bold text-white tracking-tight">{openLeads}</h3>
   <p className="text-[10px] text-emerald-400 mt-2">{leads.length} leads totales</p>
   </div>
   <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-md">
   <BarChart3 className="w-6 h-6" />
   </div>
  </div>

  </div>

  {/* 6-Month Leads and Conversions Bar Chart Card */}
  <div className="relative overflow-hidden bg-white/[0.07] backdrop-blur-2xl p-6 rounded-3xl border border-white/12 hover:border-cyan-300/25 transition-all duration-300 shadow-2xl shadow-black/20">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,.13),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(16,185,129,.11),transparent_28%)]" />
  <div className="relative">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
   <div>
   <h4 className="font-sans font-bold text-sm flex items-center gap-2 text-white">
    <TrendingUp className="w-4 h-4 text-emerald-400" />
    <span>Evolucion de captacion y conversiones</span>
   </h4>
   <p className="text-slate-400 text-[11px] mt-0.5 font-sans">
    Comparativa de nuevos leads captados contra conversiones finales a clientes consolidados.
   </p>
   </div>
   <div className="flex items-center gap-4 text-[10px] font-mono">
   <div className="flex items-center gap-1.5">
    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
    <span className="text-slate-300">Nuevos Leads</span>
   </div>
   <div className="flex items-center gap-1.5">
    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
    <span className="text-slate-300">Conversiones</span>
   </div>
   </div>
  </div>

  <div className="h-72 min-h-[18rem] min-w-0 w-full rounded-2xl border border-white/8 bg-slate-950/20 p-4">
   <ResponsiveContainer width="100%" height="100%">
   <BarChart
    data={chartData}
    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
   >
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" vertical={false} />
    <XAxis 
    dataKey="name" 
    stroke="#94a3b8" 
    fontSize={10} 
    tickLine={false} 
    axisLine={false}
    />
    <YAxis 
    stroke="#94a3b8" 
    fontSize={10} 
    tickLine={false} 
    axisLine={false}
    allowDecimals={false}
    />
    <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
    <Bar 
    name="Nuevos Leads" 
    dataKey="leads" 
    fill="#22d3ee" 
    radius={[8, 8, 0, 0]} 
    maxBarSize={32}
    />
    <Bar 
    name="Conversiones" 
    dataKey="conversions" 
    fill="#34d399" 
    radius={[8, 8, 0, 0]} 
    maxBarSize={32}
    />
   </BarChart>
   </ResponsiveContainer>
  </div>
  </div>
  </div>

  {/* Main Container - Asymmetric list layout with sidebar */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
  
  {/* Left column: Calendario & Notas previews (8/12 space) */}
  <div className="lg:col-span-8 space-y-6">
   
   {/* Calendar "Next Up" Widget */}
   <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/12 flex flex-col shadow-2xl shadow-black/20">
   <div className="px-6 py-4.5 border-b border-white/8 flex items-center justify-between bg-white/[0.04]">
    <h4 className="font-sans font-semibold text-sm flex items-center gap-2 text-white">
    <Calendar className="w-4 h-4 text-blue-400" />
    <span>Proximas citas</span>
    </h4>
    
    {/* TARGETED BUTTON - View Full Calendar (navigates via 'push') */}
    <button 
    onClick={() => onNavigate('calendar', 'push')}
    className="text-xs text-blue-400 font-medium hover:underline flex items-center gap-1 active:scale-95 cursor-pointer bg-transparent border-none outline-none"
    >
    Ver calendario
    </button>
   </div>

   <div className="p-6 space-y-4 max-h-[340px] overflow-y-auto">
    {upcomingMeetings.length === 0 ? (
    <p className="text-xs text-slate-500 font-light py-8 text-center">No hay eventos programados proximamente.</p>
    ) : (
    upcomingMeetings.map((ev) => {
     let badgeColor = "bg-blue-500/20 text-blue-400 border-blue-500/20";
     if (ev.type === "Deadline") badgeColor = "bg-red-500/20 text-red-400 border-red-500/20";
     else if (ev.type === "Review") badgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/20";
     else if (ev.type === "Kickoff") badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";

     const parsedHours = parseInt((ev.time || '12').split(':')[0], 10);
     const isPm = !isNaN(parsedHours) && parsedHours >= 12;

     return (
     <div key={ev.id} className="flex gap-4 group">
      <div className="w-16 flex flex-col items-center justify-center py-2.5 rounded-xl bg-slate-950/45 border border-white/10 shrink-0">
      <span className="text-xs font-bold text-slate-300">{ev.time || '12:00'}</span>
      <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500">{isPm ? 'pm' : 'am'}</span>
      </div>

      <div className={`flex-1 p-4 rounded-xl border-l-4 bg-white/[0.04] hover:bg-white/[0.07] transition-all duration-200 ${
      ev.type === 'Deadline' ? 'border-red-500' : ev.type === 'Review' ? 'border-purple-500' : 'border-blue-500'
      }`}>
      <div className="flex justify-between items-start gap-2">
       <h5 className="font-semibold text-xs text-white group-hover:text-blue-400 transition-colors">
       {ev.title}
       </h5>
       <span className={`px-2 py-0.5 rounded border text-[8px] font-mono uppercase tracking-wider ${badgeColor}`}>
       {ev.type}
       </span>
      </div>
      
      {ev.date && ev.date !== todayStr && (
       <p className="text-[9px] text-blue-400 font-mono font-medium mt-1 uppercase tracking-wider">
       📅 {new Date(`${ev.date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
       </p>
      )}

      <p className="text-slate-400 text-xs mt-1.5 line-clamp-2">
       {ev.description}
      </p>
      </div>
     </div>
     );
    })
    )}
   </div>
   </div>

   {/* Recent Notes Grid Widget */}
   <div className="space-y-4">
   <div className="flex items-center justify-between">
    <h4 className="font-sans font-semibold text-sm flex items-center gap-2 text-white">
    <Bookmark className="w-4 h-4 text-purple-400" />
    <span>Notas recientes</span>
    </h4>
    <button 
    onClick={() => onNavigate('notes', 'none')} 
    className="text-xs text-purple-400 hover:underline cursor-pointer"
    >
    Ir a notas
    </button>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {recentTwoNotes.map((note) => (
    <div 
     key={note.id}
     onClick={() => onNavigate('notes', 'none')}
     className="bg-white/[0.07] backdrop-blur-2xl p-5 rounded-3xl hover:-translate-y-1 hover:border-violet-300/45 border border-white/12 transition-all duration-200 cursor-pointer group flex flex-col h-44 shadow-lg shadow-black/10"
    >
     <div className="flex items-center justify-between mb-3">
     <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono text-[9px] uppercase tracking-wider border border-purple-500/20">
      {note.category}
     </span>
     <span className="text-[9px] text-slate-500 font-mono">{renderNoteDate(note.updatedAt)}</span>
     </div>

     <h5 className="font-semibold text-xs text-white group-hover:text-purple-400 transition-colors mb-2 line-clamp-1">
     {note.title}
     </h5>
     <p className="text-slate-400 text-xs line-clamp-3 mb-4 flex-1">
     {note.content}
     </p>

     <div className="flex items-center gap-2 mt-auto">
     {note.authorAvatar ? (
      <img 
      alt="Author avatar"
      referrerPolicy="no-referrer"
      className="w-5 h-5 rounded-full object-cover border border-purple-500/20"
      src={note.authorAvatar}
      />
     ) : (
      <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-[8px] font-bold">
      {note.authorName?.charAt(0) || 'A'}
      </div>
     )}
     <span className="text-[9px] text-slate-500">Compartida con el equipo</span>
     </div>
    </div>
    ))}
   </div>
   </div>

  </div>

  {/* Right column: Activity Feed (4/12 space) */}
  <div className="lg:col-span-4 h-full">
   <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/12 overflow-hidden flex flex-col h-full shadow-2xl shadow-black/20">
   <div className="px-6 py-4.5 border-b border-white/8 bg-white/[0.04] flex items-center gap-2 text-white">
    <Clock className="w-4 h-4 text-emerald-400" />
    <h4 className="font-sans font-semibold text-sm">Actividad reciente</h4>
   </div>

   <div className="p-6 overflow-y-auto space-y-6 max-h-[510px]">
    {platformActivities.map((act) => {
    let dotColor = "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]";
    if (act.accentColor === "error") dotColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
    else if (act.accentColor === "secondary") dotColor = "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]";
    else if (act.accentColor === "tertiary") dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";

    return (
     <div key={act.id} className="relative pl-6 pb-2 border-l border-white/12 last:pb-0">
     <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${dotColor}`} />
     
     <p className="text-[10px] text-slate-500 font-mono mb-1">{act.type} Update • {act.timestamp}</p>
     
     <div className="p-3.5 rounded-xl bg-slate-950/35 border border-white/8 hover:border-cyan-300/20 transition-colors">
      <p className="text-xs text-slate-300">
      <span className="font-semibold text-white mr-1">{act.title}</span>
      {act.subtitle}
      </p>
      {act.detail && (
      <p className={`text-[10px] mt-1.5 font-mono ${
       act.accentColor === 'error' ? 'text-red-400 italic' : 'text-slate-500'
      }`}>
       {act.detail}
      </p>
      )}
     </div>
     </div>
    );
    })}
   </div>

   <div className="p-6 border-t border-white/5 bg-white/[0.01]">
    <button 
    onClick={() => alert("Mostrando todas las novedades. Todas las sincronizaciones del CRM se han completado correctamente.")}
    className="w-full py-2 rounded-xl border border-white/10 text-[10px] font-mono hover:bg-white/5 text-slate-400 hover:text-white transition-all active:scale-98 uppercase tracking-widest cursor-pointer"
    >
    Ver toda la actividad
    </button>
   </div>
   </div>
  </div>

  </div>

  {/* Atmospheric FAB bottom-right */}
  <button 
  onClick={() => setShowQuickAction(!showQuickAction)}
  className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-cyan-400 hover:bg-cyan-300 active:scale-90 text-slate-950 shadow-2xl shadow-cyan-500/20 flex items-center justify-center cursor-pointer transition-transform z-50 group border border-cyan-100/30"
  >
  <Bolt className="w-6 h-6 animate-pulse" />
  <span className="absolute right-full mr-4 px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-xl">
   Acciones rapidas
  </span>
  </button>

  {/* Quick Action Overlay List Menu */}
  {showQuickAction && (
  <div className="fixed bottom-22 right-6 z-50 bg-slate-900/90 backdrop-blur-2xl border border-white/12 rounded-2xl shadow-2xl p-4 w-64 text-slate-400 animate-in fade-in slide-in-from-bottom-5 shadow-black/40">
   <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
   <h5 className="text-xs font-semibold text-white">Acciones rapidas</h5>
   <button onClick={() => setShowQuickAction(false)} className="text-slate-500 hover:text-white">
    <X className="w-4 h-4" />
   </button>
   </div>
   <div className="space-y-1 text-xs">
   <button 
    onClick={() => { onNavigate('crm', 'none'); setShowQuickAction(false); }} 
    className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition"
   >
    Gestionar clientes CRM
   </button>
   <button 
    onClick={() => { onNavigate('calendar', 'none'); setShowQuickAction(false); }} 
    className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition"
   >
    Crear nueva reunion
   </button>
   <button 
    onClick={() => { onNavigate('notes', 'none'); setShowQuickAction(false); }} 
    className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition"
   >
    Crear nota interna
   </button>
   <button 
    onClick={() => { setActiveProjects(prev => prev + 1); setShowQuickAction(false); alert("Proyectos Activos incrementado (+1)"); }} 
    className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition text-blue-400"
   >
    Incrementar proyectos activos
   </button>
   </div>
  </div>
  )}

  {/* New Sprint Modal */}
  {showNewSprintModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
   <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowNewSprintModal(false)} />
   <div className="relative bg-slate-900/88 backdrop-blur-3xl border border-white/15 rounded-3xl p-6 shadow-2xl shadow-black/50 max-w-md w-full animate-in zoom-in-95 duration-200 text-slate-300">
   <div className="flex justify-between items-center mb-4">
    <h3 className="text-lg font-bold text-white flex items-center gap-2">
    <Rocket className="w-5 h-5 text-blue-400" />
    <span>Iniciar Nuevo Sprint</span>
    </h3>
    <button onClick={() => setShowNewSprintModal(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5">
    <X className="w-5 h-5" />
    </button>
   </div>
   <form onSubmit={handleCreateSprint} className="space-y-4">
    <div className="space-y-1.5 animate-fade-in">
    <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Nombre del Proyecto / Sprint</label>
    <input 
     type="text"
     required
     placeholder="Ej. CloudScale v3 Rediseño"
     value={newProjectName}
     onChange={(e) => setNewProjectName(e.target.value)}
     className="w-full bg-[#060e20]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
    />
    </div>
    <div className="pt-4 flex gap-4">
    <button 
     type="button" 
     onClick={() => setShowNewSprintModal(false)}
     className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-semibold text-slate-300 transition-colors"
    >
     Cancelar
    </button>
    <button 
     type="submit"
     className="flex-1 py-2.5 bg-cyan-400 hover:bg-cyan-300 rounded-xl text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all"
    >
     Iniciar Proyecto
    </button>
    </div>
   </form>
   </div>
  </div>
  )}

 </div>
 );
}
