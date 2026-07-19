import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface PortalAccessScreenProps {
 onAdmin: () => void;
 onCommercial: () => void;
 onBack: () => void;
}

const options = [
 { key: 'admin', eyebrow: 'Gestión central', title: 'Administración', text: 'CRM, proyectos, finanzas, equipo, desarrollo y operaciones desde el centro de mando de Althera.', icon: ShieldCheck, accent: 'gold' },
 { key: 'commercial', eyebrow: 'Sales workspace', title: 'Comercial', text: 'Leads, Cold Calling, agenda, seguimiento de oportunidades y rendimiento comercial en un espacio dedicado.', icon: BriefcaseBusiness, accent: 'cyan' }
] as const;

export default function PortalAccessScreen({ onAdmin, onCommercial, onBack }: PortalAccessScreenProps) {
 return <main className="relative min-h-screen overflow-hidden bg-[#050608] px-5 py-8 text-white sm:px-8 lg:px-12">
  <div className="pointer-events-none absolute inset-0"><div className="absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full bg-[#d6b96f]/10 blur-[160px]" /><div className="absolute -bottom-48 -right-32 h-[680px] w-[680px] rounded-full bg-cyan-400/[0.08] blur-[170px]" /><div className="absolute inset-0 opacity-35 althera-grid" /></div>
  <header className="relative z-10 mx-auto flex max-w-[1480px] items-center justify-between">
   <button onClick={onBack} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2.5 text-[10px] uppercase tracking-[.18em] text-white/55 transition hover:border-white/20 hover:text-white"><ArrowLeft className="h-4 w-4" />Volver</button>
   <div className="flex items-center gap-3"><img src="/althera-logo.png" alt="Althera" className="h-10 w-10 rounded-xl object-cover" /><div className="hidden text-right sm:block"><p className="text-xs font-semibold uppercase tracking-[.2em]">Althera</p><p className="mt-1 text-[8px] uppercase tracking-[.2em] text-[#d6b96f]">Soluciones digitales</p></div></div>
  </header>

  <section className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] max-w-[1380px] flex-col justify-center py-16">
   <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} className="text-center"><div className="inline-flex items-center gap-2 rounded-full border border-[#d6b96f]/15 bg-[#d6b96f]/[0.055] px-4 py-2 text-[9px] uppercase tracking-[.22em] text-[#e5cb8b]"><LockKeyhole className="h-3.5 w-3.5" />Área privada</div><h1 className="mx-auto mt-7 max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-7xl lg:text-8xl">Elige tu espacio de trabajo.</h1><p className="mx-auto mt-6 max-w-xl text-sm font-light leading-6 text-white/42">Dos entornos especializados, conectados por una misma visión y diseñados para trabajar con claridad.</p></motion.div>

   <div className="mt-14 grid gap-5 lg:grid-cols-2">{options.map((option,index) => { const Icon=option.icon; const isGold=option.accent==='gold'; return <motion.button key={option.key} initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:.15+index*.1 }} onClick={option.key==='admin'?onAdmin:onCommercial} className={`group relative min-h-[350px] overflow-hidden rounded-[34px] border p-7 text-left transition duration-500 hover:-translate-y-1 sm:p-10 ${isGold?'border-[#d6b96f]/18 bg-[radial-gradient(circle_at_80%_15%,rgba(214,185,111,.17),transparent_34%),linear-gradient(145deg,#11100d,#08090c_65%)] hover:border-[#d6b96f]/40':'border-cyan-300/15 bg-[radial-gradient(circle_at_80%_15%,rgba(99,213,242,.16),transparent_34%),linear-gradient(145deg,#0a1115,#08090c_65%)] hover:border-cyan-300/35'}`}>
    <div className="absolute inset-0 opacity-25 althera-grid" /><div className="relative flex h-full flex-col justify-between"><div className="flex items-start justify-between"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${isGold?'border-[#d6b96f]/20 bg-[#d6b96f]/10 text-[#e5cb8b]':'border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200'}`}><Icon className="h-6 w-6" /></span><ArrowUpRight className="h-6 w-6 text-white/20 transition duration-300 group-hover:rotate-6 group-hover:text-white" /></div><div className="mt-16"><p className={`text-[9px] font-semibold uppercase tracking-[.25em] ${isGold?'text-[#d6b96f]':'text-cyan-300'}`}>{option.eyebrow}</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">{option.title}</h2><p className="mt-5 max-w-lg text-sm font-light leading-6 text-white/42 transition group-hover:text-white/58">{option.text}</p></div></div>
   </motion.button>; })}</div>
   <p className="mt-8 flex items-center justify-center gap-2 text-center text-[9px] uppercase tracking-[.2em] text-white/20"><Sparkles className="h-3 w-3" />Acceso seguro · Ecosistema Althera</p>
  </section>
 </main>;
}
