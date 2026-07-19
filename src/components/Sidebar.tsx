import { ComponentType } from 'react';
import { Bell, BriefcaseBusiness, Building2, CalendarDays, ChevronRight, Code2, FileText, FolderKanban, Home, LayoutDashboard, LogOut, Mail, Megaphone, NotebookPen, PhoneCall, Receipt, Settings, UsersRound, X } from 'lucide-react';
import { Screen } from '../types';

interface SidebarProps {
 currentScreen: Screen;
 onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
 supabaseStatus: { connected: boolean; tablesExist: boolean; loading: boolean };
 onOpenSupabase: () => void;
 currentUser?: { name: string; email: string; id: string | null } | null;
 onLogout?: () => void;
 onOpenNotifications?: () => void;
 unreadCount?: number;
 mobileOpen?: boolean;
 onMobileClose?: () => void;
}

type NavItem = { screen: Screen; label: string; icon: ComponentType<{ className?: string }>; hint?: string };

const groups: { label: string; items: NavItem[] }[] = [
 { label: 'Principal', items: [
  { screen: 'dashboard', label: 'Centro de mando', icon: LayoutDashboard },
  { screen: 'departamentos', label: 'Departamentos', icon: Building2 }
 ]},
 { label: 'Ventas y crecimiento', items: [
  { screen: 'comerciales_admin', label: 'Comerciales', icon: BriefcaseBusiness, hint: 'Equipo' },
  { screen: 'cold_calling', label: 'Cold Calling', icon: PhoneCall, hint: 'Leads' },
  { screen: 'crm', label: 'Clientes y CRM', icon: UsersRound },
  { screen: 'marketing', label: 'Marketing', icon: Megaphone }
 ]},
 { label: 'Producto y tecnología', items: [
  { screen: 'developer_hub', label: 'Dev Section', icon: Code2, hint: 'Demos' },
  { screen: 'projects', label: 'Proyectos', icon: FolderKanban }
 ]},
 { label: 'Operaciones', items: [
  { screen: 'citas', label: 'Control de citas', icon: CalendarDays },
  { screen: 'calendar', label: 'Calendario', icon: CalendarDays },
  { screen: 'contratos', label: 'Contratos y facturas', icon: FileText },
  { screen: 'finanzas', label: 'Finanzas', icon: Receipt },
  { screen: 'contactos', label: 'Contactos web', icon: Mail },
  { screen: 'notes', label: 'Notas internas', icon: NotebookPen }
 ]}
];

const quickAccess: NavItem[] = [
 { screen: 'comerciales_admin', label: 'Comerciales', icon: BriefcaseBusiness },
 { screen: 'cold_calling', label: 'Calling', icon: PhoneCall },
 { screen: 'developer_hub', label: 'Dev', icon: Code2 }
];

export default function Sidebar({ currentScreen, onNavigate, supabaseStatus, onOpenSupabase, currentUser, onLogout, onOpenNotifications, unreadCount = 0, mobileOpen = false, onMobileClose }: SidebarProps) {
 const navigate = (screen: Screen) => { onNavigate(screen, 'none'); onMobileClose?.(); };

 return <aside id="sidebar" className={`fixed inset-y-0 left-0 z-[60] flex w-[min(300px,88vw)] flex-col border-r border-white/[0.07] bg-[#07080b]/95 text-slate-200 shadow-[24px_0_80px_rgba(0,0,0,.38)] backdrop-blur-2xl transition-transform duration-300 lg:z-40 lg:w-[288px] lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
  <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute -left-24 -top-20 h-64 w-64 rounded-full bg-[#d6b96f]/[0.075] blur-[90px]" /><div className="absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-cyan-400/[0.045] blur-[100px]" /><div className="absolute inset-0 opacity-[0.12] althera-grid" /></div>

  <div className="relative flex items-center justify-between border-b border-white/[0.07] px-5 py-5">
   <button onClick={() => navigate('dashboard')} className="group flex min-w-0 items-center gap-3 text-left">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d6b96f]/20 bg-[#d6b96f]/[0.07] p-1.5 shadow-[0_0_30px_rgba(214,185,111,.08)]"><img src="/althera-logo.png" alt="Althera" className="h-full w-full rounded-xl object-cover" /></div>
    <div className="min-w-0"><p className="truncate text-sm font-semibold uppercase tracking-[.2em] text-white">Althera</p><p className="mt-1 truncate text-[8px] uppercase tracking-[.2em] text-[#d6b96f]">Soluciones digitales</p></div>
   </button>
   <div className="flex items-center gap-1">
    <button onClick={onOpenNotifications} className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-400 transition hover:border-[#d6b96f]/20 hover:text-white sm:flex" aria-label="Notificaciones"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#e5cb8b]" />}</button>
    <button onClick={onMobileClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] lg:hidden" aria-label="Cerrar menú"><X className="h-4 w-4" /></button>
   </div>
  </div>

  <div className="relative px-4 pb-3 pt-4">
   <p className="mb-2 px-1 text-[8px] font-semibold uppercase tracking-[.24em] text-white/25">Accesos rápidos</p>
   <div className="grid grid-cols-3 gap-2">{quickAccess.map(item => { const Icon = item.icon; const active = currentScreen === item.screen; return <button key={item.screen} onClick={() => navigate(item.screen)} className={`group flex min-w-0 flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition ${active ? 'border-[#d6b96f]/35 bg-[#d6b96f]/[0.11] text-[#f1d995]' : 'border-white/[0.065] bg-white/[0.025] text-slate-400 hover:border-white/15 hover:bg-white/[0.05] hover:text-white'}`}><Icon className="h-4 w-4" /><span className="truncate text-[9px] font-medium">{item.label}</span></button>; })}</div>
  </div>

  <nav className="relative flex-1 overflow-y-auto px-3 pb-5 pt-1">{groups.map(group => <div key={group.label} className="mt-5 first:mt-2">
   <p className="mb-1.5 px-3 text-[8px] font-semibold uppercase tracking-[.24em] text-white/22">{group.label}</p>
   <div className="space-y-1">{group.items.map(item => { const Icon = item.icon; const active = currentScreen === item.screen; return <button key={item.screen} onClick={() => navigate(item.screen)} className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-[#d6b96f]/25 bg-gradient-to-r from-[#d6b96f]/[0.13] to-cyan-300/[0.035] text-white shadow-[inset_2px_0_0_#d6b96f]' : 'border-transparent text-slate-400 hover:border-white/[0.055] hover:bg-white/[0.035] hover:text-white'}`}>
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${active ? 'border-[#d6b96f]/20 bg-[#d6b96f]/[0.08] text-[#e5cb8b]' : 'border-white/[0.055] bg-white/[0.018] text-slate-500 group-hover:text-cyan-200'}`}><Icon className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.label}</span>{item.hint && <span className="rounded-full border border-white/[0.06] px-2 py-0.5 text-[7px] uppercase tracking-wider text-white/25">{item.hint}</span>}<ChevronRight className={`h-3.5 w-3.5 transition ${active ? 'text-[#d6b96f]' : 'text-white/10 group-hover:translate-x-0.5 group-hover:text-white/35'}`} />
   </button>; })}</div>
  </div>)}</nav>

  <div className="relative border-t border-white/[0.07] bg-black/15 px-3 py-3">
   {currentUser && <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d6b96f]/20 bg-[#d6b96f]/[0.08] text-[10px] font-bold text-[#e5cb8b]">{currentUser.name?.slice(0,2).toUpperCase() || 'AL'}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{currentUser.name}</p><p className="mt-0.5 truncate text-[9px] text-white/30">Administrador Althera</p></div></div>}
   <div className="grid grid-cols-3 gap-1">
    <button onClick={onOpenSupabase} className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-[8px] text-slate-500 transition hover:bg-white/[0.035] hover:text-white"><span className={`h-1.5 w-1.5 rounded-full ${supabaseStatus.connected ? 'bg-emerald-400' : 'bg-amber-300'}`} /><Settings className="h-3.5 w-3.5" />Sistema</button>
    <button onClick={() => navigate('landing')} className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-[8px] text-slate-500 transition hover:bg-white/[0.035] hover:text-white"><Home className="mt-1.5 h-3.5 w-3.5" />Web</button>
    <button onClick={() => onLogout ? onLogout() : onNavigate('acceso','push_back')} className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-[8px] text-slate-500 transition hover:bg-red-500/[0.07] hover:text-red-300"><LogOut className="mt-1.5 h-3.5 w-3.5" />Salir</button>
   </div>
  </div>
 </aside>;
}
