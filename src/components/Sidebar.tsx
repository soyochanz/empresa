import { Screen } from '../types';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  HelpCircle, 
  LogOut,
  Terminal,
  Bell,
  Settings,
  Briefcase,
  Mail,
  Receipt
} from 'lucide-react';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
  supabaseStatus: { connected: boolean; tablesExist: boolean; loading: boolean };
  onOpenSupabase: () => void;
  currentUser?: { name: string; email: string; id: string | null } | null;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

export default function Sidebar({ 
  currentScreen, 
  onNavigate, 
  supabaseStatus, 
  onOpenSupabase,
  currentUser,
  onLogout,
  onOpenNotifications,
  unreadCount
}: SidebarProps) {
  return (
    <aside id="sidebar" className="fixed left-0 top-0 bottom-0 flex flex-col py-6 w-[260px] bg-white/5 backdrop-blur-2xl border-r border-white/10 z-40 text-slate-200 shadow-2xl shadow-black/40">
      
      {/* Brand Header */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/5">
            <Terminal className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight text-white font-sans">AgencyFlow</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Dev Team v1.0</p>
          </div>
        </div>
      </div>

      {/* Main Navigation - MUST be wrapped in <nav> for xpath targeting */}
      <nav className="flex-1 px-4 space-y-2">
        
        {/* Dashboard */}
        <button
          onClick={() => onNavigate('dashboard', 'none')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
            currentScreen === 'dashboard'
              ? 'bg-white/10 text-white border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
            currentScreen === 'dashboard' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
          }`} />
          <span className="font-sans text-sm">Dashboard</span>
        </button>

        {/* Calendar */}
        <button
          onClick={() => onNavigate('calendar', 'none')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
            currentScreen === 'calendar'
              ? 'bg-white/10 text-white border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Calendar className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
            currentScreen === 'calendar' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
          }`} />
          <span className="font-sans text-sm">Calendar</span>
        </button>

        {/* CRM */}
        <button
          onClick={() => onNavigate('crm', 'none')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
            currentScreen === 'crm'
              ? 'bg-white/10 text-white border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Users className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
            currentScreen === 'crm' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
          }`} />
          <span className="font-sans text-sm">CRM</span>
        </button>

        {/* Contactos de Landing */}
        <button
          onClick={() => onNavigate('contactos', 'none')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
            currentScreen === 'contactos'
              ? 'bg-white/10 text-white border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Mail className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
            currentScreen === 'contactos' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
          }`} />
          <span className="font-sans text-sm flex items-center justify-between w-full">
            <span>Contactos</span>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-md font-mono font-bold">Landing</span>
          </span>
        </button>

        {/* Notes */}
        <button
          onClick={() => onNavigate('notes', 'none')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
            currentScreen === 'notes'
              ? 'bg-white/10 text-white border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <FileText className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
            currentScreen === 'notes' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
          }`} />
          <span className="font-sans text-sm">Notes</span>
        </button>

        {/* Projects */}
        <button
          onClick={() => onNavigate('projects', 'none')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
            currentScreen === 'projects'
              ? 'bg-white/10 text-white border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Briefcase className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
            currentScreen === 'projects' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
          }`} />
          <span className="font-sans text-sm">Proyectos</span>
        </button>

        {/* Finanzas (Ingresos, Gastos, Gastos Recurrentes, Facturas) */}
        <button
          onClick={() => onNavigate('finanzas', 'none')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
            currentScreen === 'finanzas'
              ? 'bg-white/10 text-white border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Receipt className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
            currentScreen === 'finanzas' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
          }`} />
          <span className="font-sans text-sm flex items-center justify-between w-full">
            <span>Finanzas</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md font-mono font-bold">Plan</span>
          </span>
        </button>

      </nav>

      {/* Support & Logout Section */}
      <div className="px-4 pt-4 border-t border-white/10 space-y-2">
        {/* Supabase connection status check widget */}
        <button
          onClick={onOpenSupabase}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/25 transition-all duration-200 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              {supabaseStatus.loading ? (
                <span className="animate-spin rounded-full h-2 w-2 border border-t-transparent border-emerald-400"></span>
              ) : supabaseStatus.connected && supabaseStatus.tablesExist ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : supabaseStatus.connected && !supabaseStatus.tablesExist ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-duration-1000"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="font-sans text-xs font-semibold text-emerald-400/90">Supabase Sync</span>
          </div>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
            supabaseStatus.loading 
              ? 'bg-slate-500/10 text-slate-400 animate-pulse' 
              : supabaseStatus.connected && supabaseStatus.tablesExist 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : supabaseStatus.connected 
                  ? 'bg-amber-500/10 text-amber-400 animate-pulse' 
                  : 'bg-rose-500/10 text-rose-400'
          }`}>
            {supabaseStatus.loading ? '...' : supabaseStatus.connected && supabaseStatus.tablesExist ? 'Active' : 'Missing'}
          </span>
        </button>

        {currentUser && (
          <div className="mx-1 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center font-bold text-xs text-blue-400">
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AG'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate leading-snug">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
                {currentUser.id ? 'Real Account' : 'Demo Account'}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onOpenNotifications}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-slate-400" />
            <span className="font-sans text-sm">Notifications</span>
          </div>
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            const el = document.getElementById('toast-msg');
            if (el) {
              el.innerText = "Portal Config - AgencyFlow v1.0 • Multi-Tenant CRM Engine Active";
              el.classList.remove('opacity-0');
              setTimeout(() => el.classList.add('opacity-0'), 3000);
            } else {
              alert("Portal Config - AgencyFlow v1.0");
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 text-left cursor-pointer"
        >
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="font-sans text-sm">Configuration</span>
        </button>

        <button
          onClick={() => {
            const el = document.getElementById('toast-msg');
            if (el) {
              el.innerText = "Support Channel: WhatsApp / mgnacho96@gmail.com";
              el.classList.remove('opacity-0');
              setTimeout(() => el.classList.add('opacity-0'), 3000);
            } else {
              alert("Soporte Técnico de AgencyFlow: mgnacho96@gmail.com");
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 text-left"
        >
          <HelpCircle className="w-5 h-5 text-slate-400" />
          <span className="font-sans text-sm">Support</span>
        </button>

        {/* Logout - Must resolve to push_back transition */}
        <button
          onClick={() => {
            if (onLogout) {
              onLogout();
            } else {
              onNavigate('acceso', 'push_back');
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-left cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-slate-400" />
          <span className="font-sans text-sm">Logout</span>
        </button>
      </div>

    </aside>
  );
}
