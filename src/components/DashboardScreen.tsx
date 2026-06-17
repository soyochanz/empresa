import React, { useState } from 'react';
import { CalendarEvent, Note, Activity, Screen } from '../types';
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
  Cell 
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
}

export default function DashboardScreen({ 
  events, 
  notes, 
  activities, 
  onNavigate,
  onAddNote,
  onAddEvent,
  currentUser
}: DashboardScreenProps) {
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [showNewSprintModal, setShowNewSprintModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [activeProjects, setActiveProjects] = useState(12);

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

  return (
    <div className="p-8 space-y-8 flex-1 overflow-y-auto bg-transparent text-slate-100 relative min-h-screen">
      
      {/* Decorative localized glows */}
      <div className="absolute top-0 right-1/4 w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            {getGreeting()}, {currentUser?.name || 'Dev Team'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Here's the pulse of your agency today, {getFormattedDate()}.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowNewSprintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Sprint</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Active Projects */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl flex items-center justify-between border border-white/10 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
          <div>
            <p className="text-slate-400 text-[10px] font-mono font-medium uppercase tracking-widest mb-1">Active Projects</p>
            <h3 className="text-3xl font-bold text-white tracking-tight">{activeProjects}</h3>
            <p className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>2 from last week</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-md">
            <Rocket className="w-6 h-6" />
          </div>
        </div>

        {/* Meetings Today */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl flex items-center justify-between border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all group">
          <div>
            <p className="text-slate-400 text-[10px] font-mono font-medium uppercase tracking-widest mb-1">Meetings Today</p>
            <h3 className="text-3xl font-bold text-white tracking-tight">{events.length}</h3>
            <p className="text-[10px] text-slate-400 mt-2">Next: Cl Sync at 11:00 AM</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-md">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Open Leads */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl flex items-center justify-between border border-white/10 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group">
          <div>
            <p className="text-slate-400 text-[10px] font-mono font-medium uppercase tracking-widest mb-1">Open Leads</p>
            <h3 className="text-3xl font-bold text-white tracking-tight">8</h3>
            <p className="text-[10px] text-emerald-400 mt-2">3 requiring immediate action</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-md">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Container - Asymmetric list layout with sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Calendario & Notas previews (8/12 space) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Calendar "Next Up" Widget */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 flex flex-col shadow-2xl">
            <div className="px-6 py-4.5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h4 className="font-sans font-semibold text-sm flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Next Up</span>
              </h4>
              
              {/* TARGETED BUTTON - View Full Calendar (navigates via 'push') */}
              <button 
                onClick={() => onNavigate('calendar', 'push')}
                className="text-xs text-blue-400 font-medium hover:underline flex items-center gap-1 active:scale-95 cursor-pointer bg-transparent border-none outline-none"
              >
                View Full Calendar
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[340px] overflow-y-auto">
              {upcomingMeetings.length === 0 ? (
                <p className="text-xs text-slate-500 font-light py-8 text-center">No hay eventos programados próximamente.</p>
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
                      <div className="w-16 flex flex-col items-center justify-center py-2.5 rounded-xl bg-slate-950/60 border border-white/5 shrink-0">
                        <span className="text-xs font-bold text-slate-300">{ev.time || '12:00'}</span>
                        <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500">{isPm ? 'pm' : 'am'}</span>
                      </div>

                      <div className={`flex-1 p-4 rounded-xl border-l-4 bg-slate-950/30 hover:bg-white/5 transition-all duration-200 ${
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
                <span>Recent Notes</span>
              </h4>
              <button 
                onClick={() => onNavigate('notes', 'none')} 
                className="text-xs text-purple-400 hover:underline cursor-pointer"
              >
                Go to Notes
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentTwoNotes.map((note) => (
                <div 
                  key={note.id}
                  onClick={() => onNavigate('notes', 'none')}
                  className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl hover:-translate-y-1 hover:border-purple-500/50 border border-white/10 transition-all duration-200 cursor-pointer group flex flex-col h-44 shadow-lg shadow-black/10"
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
                    <span className="text-[9px] text-slate-500">Shared with Dev Team</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Activity Feed (4/12 space) */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden flex flex-col h-full shadow-2xl">
            <div className="px-6 py-4.5 border-b border-white/5 bg-white/[0.02] flex items-center gap-2 text-white">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h4 className="font-sans font-semibold text-sm">Activity Feed</h4>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 max-h-[510px]">
              {activities.map((act) => {
                let dotColor = "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]";
                if (act.accentColor === "error") dotColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
                else if (act.accentColor === "secondary") dotColor = "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]";
                else if (act.accentColor === "tertiary") dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";

                return (
                  <div key={act.id} className="relative pl-6 pb-2 border-l border-white/10 last:pb-0">
                    <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${dotColor}`} />
                    
                    <p className="text-[10px] text-slate-500 font-mono mb-1">{act.type} Update • {act.timestamp}</p>
                    
                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition-colors">
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
                VIEW ALL ACTIVITY
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Atmospheric FAB bottom-right */}
      <button 
        onClick={() => setShowQuickAction(!showQuickAction)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-90 text-white shadow-2xl flex items-center justify-center cursor-pointer transition-transform z-50 group border border-blue-400/20"
      >
        <Bolt className="w-6 h-6 animate-pulse" />
        <span className="absolute right-full mr-4 px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-xl">
          Quick Action (⌘J)
        </span>
      </button>

      {/* Quick Action Overlay List Menu */}
      {showQuickAction && (
        <div className="fixed bottom-22 right-6 z-50 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4 w-60 text-slate-400 animate-in fade-in slide-in-from-bottom-5 shadow-black/40">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
            <h5 className="text-xs font-semibold text-white">Acciones Rápidas</h5>
            <button onClick={() => setShowQuickAction(false)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 text-xs">
            <button 
              onClick={() => { onNavigate('crm', 'none'); setShowQuickAction(false); }} 
              className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition"
            >
              💼 Gestionar Clientes (CRM)
            </button>
            <button 
              onClick={() => { onNavigate('calendar', 'none'); setShowQuickAction(false); }} 
              className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition"
            >
              📅 Crear Nueva Reunión
            </button>
            <button 
              onClick={() => { onNavigate('notes', 'none'); setShowQuickAction(false); }} 
              className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition"
            >
              📝 Crear Nota de Ingeniería
            </button>
            <button 
              onClick={() => { setActiveProjects(prev => prev + 1); setShowQuickAction(false); alert("Proyectos Activos incrementado (+1)"); }} 
              className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition text-blue-400"
            >
              ⚡ Incrementar Proyectos Activos
            </button>
          </div>
        </div>
      )}

      {/* New Sprint Modal */}
      {showNewSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowNewSprintModal(false)} />
          <div className="relative bg-[#1e293b]/90 backdrop-blur-3xl border border-white/15 rounded-3xl p-6 shadow-2xl shadow-black/50 max-w-md w-full animate-in zoom-in-95 duration-200 text-slate-300">
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
                  placeholder="e.g. CloudScale v3 Rediseño"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-[#060e20]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
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
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all"
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
