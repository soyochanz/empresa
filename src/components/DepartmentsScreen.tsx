import { BarChart3, BriefcaseBusiness, Code2, Megaphone, PhoneCall, TrendingUp, UsersRound } from 'lucide-react';
import { Screen } from '../types';

interface DepartmentsScreenProps {
 onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
}

const departmentGroups = [
 {
  key: 'comercial',
  title: 'Comercial',
  eyebrow: 'Ventas, pipeline y cierre',
  description: 'Operativa comercial completa: prospeccion, closer, equipo comercial y analiticas.',
  accent: 'cyan',
  icon: BriefcaseBusiness,
  items: [
   { title: 'Call Calling y Closer', description: 'Prospectos, citas agendadas y nueva bandeja Closing.', screen: 'cold_calling' as Screen, icon: PhoneCall },
   { title: 'Gestion de comerciales', description: 'Cuentas, comisiones, rendimiento y administracion del equipo.', screen: 'comerciales_admin' as Screen, icon: UsersRound },
   { title: 'Analiticas comerciales', description: 'Metricas de captacion, conversion y estado del funnel.', screen: 'comerciales_admin' as Screen, icon: BarChart3 }
  ]
 },
 {
  key: 'marketing',
  title: 'Marketing',
  eyebrow: 'Contenido y campanas',
  description: 'Area para contenido, demos comerciales, recursos de marca y acciones de captacion.',
  accent: 'pink',
  icon: Megaphone,
  items: [
   { title: 'Marketing hub', description: 'Gestion de campanas, piezas y recursos del departamento.', screen: 'marketing' as Screen, icon: Megaphone },
   { title: 'Captacion', description: 'Acciones y materiales para generar nuevas oportunidades.', screen: 'marketing' as Screen, icon: TrendingUp }
  ]
 },
 {
  key: 'development',
  title: 'Development',
  eyebrow: 'Demos, webs y entrega',
  description: 'Produccion de webs, gestion dev, demos asignadas y seguimiento de entregas.',
  accent: 'violet',
  icon: Code2,
  items: [
   { title: 'Gestion dev', description: 'Clientes pendientes de web, demos, credenciales y checklist tecnico.', screen: 'developer_hub' as Screen, icon: Code2 },
   { title: 'Proyectos', description: 'Portfolio interno y trabajos promovidos a proyecto.', screen: 'projects' as Screen, icon: BriefcaseBusiness }
  ]
 }
];

const accentClasses: Record<string, { panel: string; icon: string; button: string; tag: string }> = {
 cyan: {
  panel: 'border-cyan-400/20 bg-cyan-400/[0.035]',
  icon: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
  button: 'hover:border-cyan-400/30 hover:bg-cyan-400/[0.06]',
  tag: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20'
 },
 pink: {
  panel: 'border-pink-400/20 bg-pink-400/[0.035]',
  icon: 'bg-pink-400/10 text-pink-300 border-pink-400/20',
  button: 'hover:border-pink-400/30 hover:bg-pink-400/[0.06]',
  tag: 'text-pink-300 bg-pink-400/10 border-pink-400/20'
 },
 violet: {
  panel: 'border-violet-400/20 bg-violet-400/[0.035]',
  icon: 'bg-violet-400/10 text-violet-300 border-violet-400/20',
  button: 'hover:border-violet-400/30 hover:bg-violet-400/[0.06]',
  tag: 'text-violet-300 bg-violet-400/10 border-violet-400/20'
 }
};

export default function DepartmentsScreen({ onNavigate }: DepartmentsScreenProps) {
 return (
  <div className="space-y-6">
   <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-7 shadow-2xl shadow-black/20">
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
     <div>
      <p className="text-[10px] uppercase tracking-[0.28em] font-mono font-black text-cyan-300">Departamentos</p>
      <h2 className="text-2xl md:text-3xl font-black text-white mt-2">Centro operativo por areas</h2>
      <p className="text-sm text-slate-400 mt-2 max-w-2xl">
       Comercial, Marketing y Development organizados como modulos de trabajo independientes, con accesos rapidos a sus herramientas.
      </p>
     </div>
     <div className="grid grid-cols-3 gap-2 min-w-[260px]">
      {departmentGroups.map(group => {
       const Icon = group.icon;
       const classes = accentClasses[group.accent];
       return (
        <div key={group.key} className={`rounded-2xl border px-3 py-3 ${classes.panel}`}>
         <Icon className={`w-4 h-4 mb-2 ${classes.tag.split(' ')[0]}`} />
         <p className="text-[10px] font-black text-white">{group.title}</p>
         <p className="text-[8px] uppercase tracking-wider text-slate-500 mt-1">{group.items.length} accesos</p>
        </div>
       );
      })}
     </div>
    </div>
   </section>

   <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
    {departmentGroups.map(group => {
     const Icon = group.icon;
     const classes = accentClasses[group.accent];
     return (
      <section key={group.key} className={`rounded-3xl border p-5 ${classes.panel}`}>
       <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${classes.icon}`}>
         <Icon className="w-5 h-5" />
        </div>
        <div>
         <p className={`inline-flex px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${classes.tag}`}>
          {group.eyebrow}
         </p>
         <h3 className="text-xl font-black text-white mt-2">{group.title}</h3>
         <p className="text-xs text-slate-400 leading-relaxed mt-1">{group.description}</p>
        </div>
       </div>

       <div className="space-y-2.5 mt-5">
        {group.items.map(item => {
         const ItemIcon = item.icon;
         return (
          <button
           key={item.title}
           onClick={() => onNavigate(item.screen, 'none')}
           className={`w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition-all cursor-pointer ${classes.button}`}
          >
           <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300">
             <ItemIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
             <p className="text-sm font-black text-white truncate">{item.title}</p>
             <p className="text-[11px] text-slate-450 leading-snug mt-0.5">{item.description}</p>
            </div>
           </div>
          </button>
         );
        })}
       </div>
      </section>
     );
    })}
   </div>
  </div>
 );
}
