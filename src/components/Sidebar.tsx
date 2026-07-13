import { Screen } from '../types';
import { 
 LayoutDashboard, 
 Calendar, 
 Users, 
 FileText, 
 LogOut,
 Settings,
 Mail,
 Receipt,
 Home,
 Building2
 ,X
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
 mobileOpen?: boolean;
 onMobileClose?: () => void;
}

export default function Sidebar({ 
 currentScreen, 
 onNavigate, 
 supabaseStatus, 
 onOpenSupabase,
 currentUser,
 onLogout,
 onOpenNotifications,
 unreadCount,
 mobileOpen = false,
 onMobileClose
}: SidebarProps) {
 const navigate = (target: Screen, transition: 'none' | 'push' | 'push_back' = 'none') => {
 onNavigate(target, transition);
 onMobileClose?.();
 };
 return (
 <aside id="sidebar" className={`fixed left-0 top-0 bottom-0 flex flex-col w-[min(280px,86vw)] lg:w-[260px] bg-[#07111b]/95 border-r border-white/10 z-[60] lg:z-40 text-slate-200 shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
  
  {/* Brand Header */}
  <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
  <div className="flex items-center gap-3">
   <div className="w-10 h-10 flex items-center justify-center bg-white/[0.04] rounded-lg border border-white/10 p-1">
   <img 
    src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" 
    alt="Althera Logo" 
    className="w-8 h-8 object-contain"
    referrerPolicy="no-referrer"
   />
   </div>
   <div>
   <h1 className="font-semibold text-base tracking-tight text-white uppercase">Althera</h1>
   <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Admin OS</p>
   </div>
  </div>
  <button onClick={onMobileClose} className="lg:hidden w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center" aria-label="Cerrar menú">
   <X className="w-5 h-5" />
  </button>
  </div>

  {/* Main Navigation - MUST be wrapped in <nav> for xpath targeting */}
  <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
  
  {/* Dashboard */}
  <button
   onClick={() => navigate('dashboard')}
   className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
   currentScreen === 'dashboard' ?
    'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20 shadow-[inset_3px_0_0_rgba(34,211,238,0.8)] font-semibold'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
   }`}
  >
   <LayoutDashboard className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
   currentScreen === 'dashboard' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
   }`} />
   <span className="font-sans text-sm">Dashboard</span>
  </button>

  {/* Departamentos */}
  <button
   onClick={() => navigate('departamentos')}
   className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
   currentScreen === 'departamentos' ?
    'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20 shadow-[inset_3px_0_0_rgba(34,211,238,0.8)] font-semibold'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
   }`}
  >
   <Building2 className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
   currentScreen === 'departamentos' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
   }`} />
   <span className="font-sans text-sm">Departamentos</span>
  </button>

  {/* Control de Citas (Formato Lista) */}
  <button
   onClick={() => onNavigate('citas', 'none')}
   className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
   currentScreen === 'citas' ?
    'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20 shadow-[inset_3px_0_0_rgba(34,211,238,0.8)] font-semibold'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
   }`}
  >
   <Calendar className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
   currentScreen === 'citas' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
   }`} />
   <span className="font-sans text-sm">Control de Citas</span>
  </button>

  {/* Calendario Visual */}
  <button
   onClick={() => onNavigate('calendar', 'none')}
   className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
   currentScreen === 'calendar' ?
    'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20 shadow-[inset_3px_0_0_rgba(34,211,238,0.8)] font-semibold'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
   }`}
  >
   <Calendar className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
   currentScreen === 'calendar' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
   }`} />
   <span className="font-sans text-sm">Calendario Visual</span>
  </button>

  {/* CRM */}
  <button
   onClick={() => onNavigate('crm', 'none')}
   className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
   currentScreen === 'crm' ?
    'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20 shadow-[inset_3px_0_0_rgba(34,211,238,0.8)] font-semibold'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
   }`}
  >
   <Users className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
   currentScreen === 'crm' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
   }`} />
   <span className="font-sans text-sm">Clientes</span>
  </button>

  {/* Contratos e Invoices */}
  <button
   onClick={() => onNavigate('contratos', 'none')}
   className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
   currentScreen === 'contratos' ?
    'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20 shadow-[inset_3px_0_0_rgba(34,211,238,0.8)] font-semibold'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
   }`}
  >
   <FileText className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
   currentScreen === 'contratos' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
   }`} />
   <span className="font-sans text-sm">Contratos y Facturas</span>
  </button>

  {/* Contactos de Landing */}
  <button
   onClick={() => onNavigate('contactos', 'none')}
   className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
   currentScreen === 'contactos' ?
    'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20 shadow-[inset_3px_0_0_rgba(34,211,238,0.8)] font-semibold'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
   }`}
  >
   <Mail className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
   currentScreen === 'contactos' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
   }`} />
   <span className="font-sans text-sm">Contactos</span>
  </button>

  {/* Notes */}
  <button
   onClick={() => onNavigate('notes', 'none')}
   className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
   currentScreen === 'notes' ?
    'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20 shadow-[inset_3px_0_0_rgba(34,211,238,0.8)] font-semibold'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
   }`}
  >
   <FileText className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
   currentScreen === 'notes' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
   }`} />
   <span className="font-sans text-sm">Notas Internas</span>
  </button>


  {/* Finanzas (Ingresos, Gastos, Gastos Recurrentes, Facturas) */}
  <button
   onClick={() => onNavigate('finanzas', 'none')}
   className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
   currentScreen === 'finanzas' ?
    'bg-cyan-400/10 text-cyan-100 border border-cyan-400/20 shadow-[inset_3px_0_0_rgba(34,211,238,0.8)] font-semibold'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
   }`}
  >
   <Receipt className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 ${
   currentScreen === 'finanzas' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
   }`} />
   <span className="font-sans text-sm">Finanzas Globales</span>
  </button>


  </nav>

  {/* Support & Logout Section */}
  <div className="px-4 pt-4 border-t border-white/10 space-y-2">

  {currentUser && (
   <div className="mx-1 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
   <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center font-bold text-xs text-blue-400">
    {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AG'}
   </div>
   <div className="min-w-0 flex-1">
    <p className="text-xs font-bold text-slate-200 truncate leading-snug">{currentUser.name}</p>
    <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
    Cuenta Althera
    </p>
   </div>
   </div>
  )}

  <button
   onClick={() => onNavigate('landing', 'none')}
   className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 text-left cursor-pointer"
  >
   <Home className="w-5 h-5 text-slate-400" />
   <span className="font-sans text-sm">Ir al Home</span>
  </button>

   <button
   onClick={() => {
   const el = document.getElementById('toast-msg');
   if (el) {
    el.innerText = "Portal Config - Althera v1.0 • Multi-Tenant CRM Engine Active";
    el.classList.remove('opacity-0');
    setTimeout(() => el.classList.add('opacity-0'), 3000);
   } else {
    alert("Portal Config - Althera v1.0");
   }
   }}
   className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 text-left cursor-pointer"
  >
   <Settings className="w-5 h-5 text-slate-400" />
   <span className="font-sans text-sm">Configuration</span>
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
