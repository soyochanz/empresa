import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDownRight, ArrowRight, BarChart3, Blocks, Check, ExternalLink, Facebook, Gem, Globe2, Instagram, Layers3, Megaphone, Menu, MessageCircle, Send, Share2, Sparkles, Target, Video, X, Zap } from 'lucide-react';
import { InquiryMessage, PartnerCompany, Screen } from '../types';
import { db } from '../supabaseClient';
import ModernBackgroundPaths from '../../components/ui/modern-background-paths';
import LogoLoop, { LogoLoopItem } from './LogoLoop';
import BorderGlow from './BorderGlow';

interface LandingScreenProps {
  onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
  projects?: any[];
  partners?: PartnerCompany[];
}

const services = [
  { number: '01', title: 'Producto digital', text: 'Plataformas SaaS, portales y herramientas internas que convierten procesos complejos en experiencias simples.', icon: Blocks },
  { number: '02', title: 'Web de alto impacto', text: 'Dirección de arte, diseño UX/UI y desarrollo a medida para marcas que no quieren parecerse a ninguna otra.', icon: Gem },
  { number: '03', title: 'Sistemas escalables', text: 'Arquitecturas cloud seguras, automatizaciones e integraciones preparadas para crecer con tu negocio.', icon: Layers3 },
];

const socialServices = [
  { title: 'Gestión de redes', text: 'Planificamos, publicamos y cuidamos la presencia diaria de tu marca.', icon: Instagram, color: 'text-fuchsia-300' },
  { title: 'Meta Ads', text: 'Campañas en Instagram y Facebook diseñadas para atraer, convertir y escalar.', icon: Target, color: 'text-cyan-300' },
  { title: 'Contenido creativo', text: 'Piezas visuales, vídeo corto y conceptos que detienen el scroll.', icon: Video, color: 'text-[#e5cb8b]' },
  { title: 'Community', text: 'Conversación, respuesta y comunidad para convertir audiencia en confianza.', icon: MessageCircle, color: 'text-violet-300' },
  { title: 'Estrategia social', text: 'Posicionamiento, calendario editorial y tono de voz alineados con el negocio.', icon: Share2, color: 'text-emerald-300' },
  { title: 'Analítica y mejora', text: 'Medimos lo que funciona y optimizamos cada campaña con datos reales.', icon: BarChart3, color: 'text-sky-300' },
];

const process = [
  ['Inmersión', 'Entendemos el negocio, la ambición y el problema real.'],
  ['Dirección', 'Definimos concepto, sistema visual y arquitectura.'],
  ['Construcción', 'Diseñamos y desarrollamos con ciclos de validación.'],
  ['Evolución', 'Medimos, optimizamos y acompañamos el crecimiento.'],
];

const fallbackProjects = [
  { id: 'althera-platform', title: 'Althera OS', category: 'Plataforma operativa', description: 'Un ecosistema empresarial que reúne CRM, finanzas, equipo y analítica en un solo lugar.', image: '', accent: 'from-[#f4d899]/30 via-[#785c2c]/10 to-transparent' },
  { id: 'kapsely', title: 'Kapsely', category: 'Aplicación social · iOS', description: 'Cápsulas digitales para guardar, compartir y revivir los momentos que importan.', image: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/3b/d4/7c/3bd47c7c-db8c-9413-ea40-40940dc34cc5/Placeholder.mill/600x600bb-75.webp', accent: 'from-[#b86fff]/30 via-[#5945a7]/10 to-transparent' },
];

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

export default function LandingScreen({ onNavigate, projects, partners = [] }: LandingScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const displayProjects = useMemo(() => {
    const visible = (projects || []).filter((project: any) => project.showOnLanding !== false).slice(0, 8);
    if (!visible.length) return fallbackProjects;
    return visible.map((project: any, index: number) => ({
      id: project.id || `project-${index}`,
      title: project.title || 'Proyecto Althera',
      category: project.category || project.status || 'Producto digital',
      description: project.description || project.detailText || 'Diseño y desarrollo de una experiencia digital a medida.',
      image: project.image || '', url: project.url,
      accent: index % 2 === 0 ? 'from-[#f4d899]/30 via-[#785c2c]/10 to-transparent' : 'from-[#99e7ff]/20 via-[#3c5f79]/10 to-transparent',
    }));
  }, [projects]);

  const collaborationBrands = useMemo(() => {
    const names = displayProjects.map((project: any) => String(project.title || '').split(' - ')[0].trim()).filter(Boolean);
    return names.length ? names : ['Althera', 'Kapsely', 'Walk&Rock', 'Libélulas'];
  }, [displayProjects]);

  const partnerLogos = useMemo<LogoLoopItem[]>(() => {
    if (partners.length) return partners.map(partner => ({ src: partner.logoUrl, alt: partner.name, title: partner.name, href: partner.website || undefined }));
    return collaborationBrands.map(brand => ({ node: <span>{brand}</span>, title: brand }));
  }, [collaborationBrands, partners]);

  const submitInquiry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || sending) return;
    setSending(true);
    const inquiry: InquiryMessage = { id: `inq_${Date.now().toString().slice(-8)}`, name: name.trim(), email: email.trim(), message: message.trim(), archived: false, created_at: new Date().toISOString() };
    try { await db.insertInquiry(inquiry); }
    catch (error) { console.warn('No se pudo guardar la solicitud en Supabase:', error); }
    finally { setSending(false); setSent(true); setName(''); setEmail(''); setMessage(''); }
  };

  const goTo = (hash: string) => {
    setMenuOpen(false);
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="althera-landing min-h-screen overflow-hidden bg-[#050608] font-sans text-[#f5f2eb] selection:bg-[#e3c785] selection:text-black">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.045] althera-noise" />

      <header className="fixed inset-x-3 top-3 z-50 rounded-2xl border border-white/[0.09] bg-[#07090d]/80 shadow-[0_18px_60px_rgba(0,0,0,.38)] backdrop-blur-2xl sm:inset-x-5 lg:inset-x-8">
        <div className="flex h-[76px] w-full items-center justify-between px-5 sm:px-8 lg:px-12">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex items-center gap-3" aria-label="Volver al inicio">
            <img src="/althera-logo.png" alt="Althera" className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10 transition group-hover:ring-[#e5cb8b]/40" />
            <div className="text-left leading-none"><span className="block text-[15px] font-semibold uppercase tracking-[0.28em] text-white">Althera</span><span className="mt-1 block text-[8px] uppercase tracking-[0.28em] text-[#d7bc7c]">Soluciones digitales</span></div>
          </button>
          <nav className="hidden items-center gap-7 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55 xl:flex">
            <button onClick={() => goTo('#althera')} className="transition hover:text-white">Althera</button>
            <button onClick={() => goTo('#servicios')} className="transition hover:text-white">Servicios</button>
            <button onClick={() => goTo('#social')} className="transition hover:text-white">Social</button>
            <button onClick={() => goTo('#proyectos')} className="transition hover:text-white">Proyectos</button>
            <button onClick={() => goTo('#apps')} className="transition hover:text-white">Apps</button>
            <button onClick={() => goTo('#estudio')} className="transition hover:text-white">Estudio</button>
          </nav>
          <div className="hidden items-center gap-3 xl:flex">
            <button onClick={() => onNavigate('portal', 'push')} className="px-4 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45 transition hover:text-white">Área privada</button>
            <button onClick={() => goTo('#contacto')} className="group flex items-center gap-2 rounded-full border border-[#e5cb8b]/35 bg-[#e5cb8b] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#11100d] transition hover:bg-[#f4dda5]">Empezar proyecto <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-full border border-white/10 p-2.5 xl:hidden" aria-label="Abrir menú">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
        {menuOpen && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-white/10 bg-[#08090c] px-5 py-6 md:hidden"><div className="flex flex-col gap-5 text-left text-sm uppercase tracking-[0.16em] text-white/70"><button onClick={() => goTo('#althera')} className="text-left">Althera</button><button onClick={() => goTo('#servicios')} className="text-left">Servicios</button><button onClick={() => goTo('#social')} className="text-left">Social</button><button onClick={() => goTo('#proyectos')} className="text-left">Proyectos</button><button onClick={() => goTo('#estudio')} className="text-left">Estudio</button><button onClick={() => goTo('#contacto')} className="text-left text-[#e5cb8b]">Empezar proyecto</button><button onClick={() => onNavigate('portal', 'push')} className="text-left text-white/40">Área privada</button></div></motion.div>}
      </header>

      <main className="relative z-10">
        <ModernBackgroundPaths
          title="Tu negocio merece"
          subtitle="Althera transforma ideas ambiciosas en productos digitales extraordinarios. Estrategia, diseño y código en un único estudio."
          primaryLabel="Cuéntanos tu idea"
          secondaryLabel="Ver nuestro trabajo"
          onPrimary={() => goTo('#contacto')}
          onSecondary={() => goTo('#proyectos')}
        />

        <div className="relative overflow-hidden border-y border-white/[0.07] bg-[#0b0c10] py-4"><div className="althera-marquee flex min-w-max items-center gap-8 text-[10px] uppercase tracking-[0.28em] text-white/30">{[...Array(2)].flatMap((_, group) => ['Web experiences', 'SaaS platforms', 'Brand systems', 'Cloud architecture', 'Digital products'].map((label, index) => <React.Fragment key={`${group}-${index}`}><span>{label}</span><Sparkles className="h-3 w-3 text-[#d6b96f]" /></React.Fragment>))}</div></div>

        <section id="althera" className="relative w-full overflow-hidden px-6 py-24 sm:px-10 lg:px-16 lg:py-36">
          <div className="absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-[#d6b96f]/[0.07] blur-[150px]" /><div className="absolute -left-56 bottom-0 h-[480px] w-[480px] rounded-full bg-cyan-400/[0.055] blur-[150px]" />
          <div className="relative grid items-center gap-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-24">
            <motion.div {...reveal}><p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#d6b96f]">Qué es Althera Solutions</p><h2 className="mt-6 max-w-4xl text-5xl font-medium leading-[.96] tracking-[-.055em] text-white sm:text-7xl">El socio digital que convierte ambición en <span className="bg-gradient-to-r from-[#f0d99d] to-[#75dfff] bg-clip-text text-transparent">crecimiento real.</span></h2><p className="mt-8 max-w-2xl text-base font-light leading-7 text-white/48">Althera Solutions es un estudio integral de estrategia, diseño, tecnología y crecimiento. Trabajamos junto a empresas que quieren evolucionar, creando desde su identidad y presencia digital hasta las herramientas que hacen avanzar su negocio.</p><p className="mt-5 max-w-2xl text-sm font-light leading-6 text-white/34">No somos un proveedor aislado. Nos convertimos en una extensión del equipo para pensar, construir, lanzar y mejorar soluciones que tengan impacto.</p></motion.div>
            <motion.div {...reveal} className="relative min-h-[520px] overflow-hidden rounded-[38px] border border-white/[0.09] bg-[radial-gradient(circle_at_50%_38%,rgba(214,185,111,.14),transparent_28%),linear-gradient(145deg,#0d0e12,#07080b)] p-8 shadow-[0_45px_120px_rgba(0,0,0,.4)] sm:p-10"><div className="absolute inset-0 opacity-30 althera-grid" /><div className="relative flex h-full min-h-[440px] flex-col justify-between"><div className="flex items-start justify-between"><img src="/althera-logo.png" alt="Althera Solutions" className="h-24 w-24 rounded-[28px] object-cover shadow-[0_20px_70px_rgba(214,185,111,.18)]" /><span className="rounded-full border border-[#d6b96f]/15 bg-[#d6b96f]/[0.06] px-3 py-2 text-[8px] uppercase tracking-[.2em] text-[#e5cb8b]">Digital growth partner</span></div><div><p className="max-w-md text-3xl font-medium leading-tight tracking-[-.04em] text-white">Una visión. Un equipo. Todo lo necesario para avanzar.</p><div className="mt-9 grid grid-cols-2 gap-3">{[['Estrategia',Sparkles],['Diseño',Gem],['Tecnología',Layers3],['Crecimiento',Zap]].map(([label,Icon]:any) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs text-white/55"><Icon className="h-4 w-4 text-[#d6b96f]" />{label}</div>)}</div></div></div></motion.div>
          </div>
        </section>

        <section id="servicios" className="relative w-full border-y border-white/[0.06] bg-[#0a0c11]/80 px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
          <motion.div {...reveal} className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20"><div><p className="mb-5 text-[10px] font-medium uppercase tracking-[0.3em] text-[#d6b96f]">Lo que hacemos</p><h2 className="max-w-xl text-4xl font-light leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl">De la primera idea al producto que todos quieren usar.</h2></div><p className="max-w-xl self-end text-base font-light leading-7 text-white/45 lg:ml-auto">No entregamos plantillas. Construimos sistemas digitales con una identidad propia, una lógica sólida y una ejecución obsesiva.</p></motion.div>
          <div className="mt-16 grid gap-4 lg:grid-cols-3">{services.map((service, index) => { const Icon = service.icon; return <motion.div key={service.number} {...reveal} transition={{ ...reveal.transition, delay: index * 0.1 }} className="h-full"><BorderGlow className="group h-full transition duration-500 hover:-translate-y-1" edgeSensitivity={24} glowColor="42 58 70" backgroundColor="#0b0c10" borderRadius={26} glowRadius={36} glowIntensity={.9} coneSpread={22} colors={['#d6b96f', '#63d5f2', '#f1d995']} fillOpacity={.32}><article className="relative h-full overflow-hidden px-7 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,.045)] lg:px-8 lg:py-10"><div className="absolute inset-0 bg-gradient-to-br from-[#d8bd7b]/[0.07] to-[#5bd8ff]/[0.035] opacity-0 transition duration-500 group-hover:opacity-100" /><div className="relative"><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-white/25">/{service.number}</span><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d8bd7b]/15 bg-[#d8bd7b]/[0.07]"><Icon className="h-5 w-5 text-[#d8bd7b]" /></span></div><h3 className="mt-14 text-2xl font-semibold tracking-[-0.025em] text-white">{service.title}</h3><p className="mt-4 max-w-sm text-sm font-light leading-6 text-white/43">{service.text}</p><ArrowDownRight className="mt-9 h-5 w-5 text-white/25 transition group-hover:translate-x-1 group-hover:translate-y-1 group-hover:text-[#d8bd7b]" /></div></article></BorderGlow></motion.div>; })}</div>
        </section>

        <section id="social" className="relative w-full overflow-hidden border-b border-white/[0.06] bg-[#07080b] px-6 py-24 sm:px-10 lg:px-16 lg:py-36">
          <div className="absolute -right-40 -top-40 h-[650px] w-[650px] rounded-full bg-fuchsia-500/[0.09] blur-[170px]" /><div className="absolute -bottom-60 left-1/4 h-[560px] w-[560px] rounded-full bg-cyan-400/[0.07] blur-[170px]" />
          <div className="relative"><motion.div {...reveal} className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-end"><div><div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/15 bg-fuchsia-300/[0.055] px-4 py-2 text-[9px] uppercase tracking-[.22em] text-fuchsia-200"><Instagram className="h-3.5 w-3.5" /><Facebook className="h-3.5 w-3.5" />Social & performance</div><h2 className="mt-7 max-w-3xl text-5xl font-medium leading-[.95] tracking-[-.055em] text-white sm:text-7xl">Tu marca también debe ganar en el feed.</h2></div><div className="lg:pb-2"><p className="max-w-xl text-base font-light leading-7 text-white/45">Creamos una presencia social coherente, atractiva y preparada para vender. Estrategia, contenido, comunidad y publicidad trabajando como un único sistema.</p><button onClick={() => goTo('#contacto')} className="group mt-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-6 py-3 text-xs font-semibold text-white transition hover:border-[#d6b96f]/30 hover:bg-[#d6b96f]/[0.07]">Haz crecer tu marca <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button></div></motion.div>
            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{socialServices.map((service,index) => { const Icon=service.icon; return <motion.article key={service.title} {...reveal} transition={{...reveal.transition,delay:(index%3)*.08}} className="group relative min-h-[260px] overflow-hidden rounded-[28px] border border-white/[0.075] bg-white/[0.025] p-7 transition duration-500 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.04]"><div className="absolute inset-0 bg-gradient-to-br from-fuchsia-400/[0.035] via-transparent to-cyan-300/[0.035] opacity-0 transition group-hover:opacity-100" /><div className="relative flex h-full flex-col"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/25 ${service.color}`}><Icon className="h-5 w-5" /></div><p className="mt-auto pt-12 text-[9px] uppercase tracking-[.2em] text-white/20">0{index+1}</p><h3 className="mt-2 text-xl font-semibold tracking-[-.025em] text-white">{service.title}</h3><p className="mt-3 text-xs font-light leading-5 text-white/38">{service.text}</p></div></motion.article>; })}</div>
          </div>
        </section>

        <section id="proyectos" className="w-full px-6 py-24 sm:px-10 lg:px-16 lg:py-32"><div className="w-full">
          <motion.div {...reveal} className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="mb-5 text-[10px] font-medium uppercase tracking-[0.3em] text-[#d6b96f]">Trabajo seleccionado</p><h2 className="text-4xl font-light tracking-[-0.045em] text-white sm:text-6xl">Hecho para destacar.</h2></div><p className="max-w-sm text-sm font-light leading-6 text-white/38">Una selección de productos y experiencias concebidas para mover negocios hacia delante.</p></motion.div>
          <div className="mt-16 grid auto-rows-[390px] gap-5 md:grid-cols-2 lg:grid-cols-12">
            {displayProjects.map((project: any, index: number) => (
              <motion.article
                key={project.id}
                {...reveal}
                whileHover={{ y: -8 }}
                transition={{ ...reveal.transition, delay: (index % 3) * 0.08 }}
                className={`${index === 0 ? 'lg:col-span-7' : index === 1 ? 'lg:col-span-5' : 'lg:col-span-6'} group relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[#07080a] shadow-[0_24px_80px_rgba(0,0,0,.35)]`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${project.accent}`} />
                {project.image ? (
                  <img src={project.image} alt={project.title} className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-700 group-hover:scale-[1.06] group-hover:opacity-90" referrerPolicy="no-referrer" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"><img src="/althera-logo.png" alt="" className="w-[32%] rounded-[24%] object-contain opacity-90 transition duration-700 group-hover:scale-110" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9">
                  <div className="flex items-end justify-between gap-5">
                    <div><p className="text-[9px] uppercase tracking-[0.25em] text-[#e4cb8b]">{project.category}</p><h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{project.title}</h3><p className="mt-3 max-w-xl translate-y-3 text-sm leading-6 text-white/0 transition duration-500 group-hover:translate-y-0 group-hover:text-white/65">{project.description}</p></div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/30 backdrop-blur-xl transition group-hover:rotate-12 group-hover:bg-white group-hover:text-black"><ExternalLink className="h-4 w-4" /></div>
                  </div>
                </div>
                <div className="absolute left-6 top-6 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/60 backdrop-blur-xl">Proyecto 0{index + 1}</div>
              </motion.article>
            ))}
          </div>
        </div></section>

        <section id="colaboraciones" className="relative w-full overflow-hidden border-y border-white/[0.06] bg-[#07080b] py-24 lg:py-32">
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[70%] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[100px]" />
          <motion.div {...reveal} className="relative px-6 text-center sm:px-10 lg:px-16">
            <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[#d6b96f]">Ecosistema Althera</p>
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-medium tracking-[-0.045em] text-white sm:text-6xl">Empresas con las que colaboramos.</h2>
            <p className="mx-auto mt-5 max-w-xl text-sm font-light leading-6 text-white/38">Marcas y equipos que han confiado en nosotros para construir su próxima experiencia digital.</p>
          </motion.div>

          <div className="relative mt-16 border-y border-white/[0.055] bg-white/[0.012] py-8 sm:py-11">
            <LogoLoop logos={partnerLogos} speed={66} hoverSpeed={12} logoHeight={58} gap={96} fadeOut fadeOutColor="#07080b" scaleOnHover />
          </div>
        </section>

        <section id="apps" className="relative min-h-screen w-full overflow-hidden border-y border-white/[0.06] bg-[#08090d] px-6 py-24 sm:px-10 lg:flex lg:items-center lg:px-16">
          <div className="absolute -right-40 top-1/4 h-[620px] w-[620px] rounded-full bg-fuchsia-500/15 blur-[150px]" />
          <div className="absolute -left-40 bottom-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[150px]" />
          <div className="relative grid w-full items-center gap-16 lg:grid-cols-[0.8fr_1.2fr]">
            <motion.div {...reveal} className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.07] px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-fuchsia-200"><span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_12px_#f0abfc]" />Apps by Althera</div>
              <h2 className="max-w-2xl text-5xl font-semibold leading-[0.92] tracking-[-0.055em] text-white sm:text-7xl lg:text-8xl">Ideas que viven en tu bolsillo.</h2>
              <p className="mt-7 max-w-xl text-base font-light leading-7 text-white/48">Diseñamos y desarrollamos aplicaciones nativas con una experiencia visual precisa, rápida y memorable.</p>
              <div className="mt-10 flex flex-wrap gap-3 text-[9px] uppercase tracking-[0.18em] text-white/45"><span className="rounded-full border border-white/10 px-4 py-2">Product design</span><span className="rounded-full border border-white/10 px-4 py-2">iOS</span><span className="rounded-full border border-white/10 px-4 py-2">Cloud</span></div>
            </motion.div>

            <motion.div {...reveal} className="group relative min-h-[620px] overflow-hidden rounded-[36px] border border-white/[0.1] bg-[radial-gradient(circle_at_70%_20%,rgba(217,70,239,.28),transparent_38%),linear-gradient(145deg,#171126,#090a10_60%)] p-7 shadow-[0_50px_140px_rgba(0,0,0,.48)] sm:p-10">
              <div className="absolute inset-0 althera-grid opacity-25" />
              <div className="absolute right-[-24%] top-[8%] h-[74%] w-[80%] rotate-[7deg] rounded-[54px] border border-white/15 bg-black/70 p-3 opacity-45 shadow-[0_35px_90px_rgba(0,0,0,.7)] transition duration-700 group-hover:rotate-[3deg] group-hover:scale-[1.02] sm:right-[-5%] sm:w-[58%] sm:opacity-100">
                <div className="h-full w-full overflow-hidden rounded-[44px] bg-gradient-to-b from-[#27163d] to-[#090a10]"><img src="https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/3b/d4/7c/3bd47c7c-db8c-9413-ea40-40940dc34cc5/Placeholder.mill/600x600bb-75.webp" alt="Kapsely" className="h-full w-full object-cover opacity-80" referrerPolicy="no-referrer" /></div>
              </div>
              <div className="relative z-10 flex h-full min-h-[550px] max-w-[82%] flex-col justify-between sm:max-w-[55%]">
                <div><img src="https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/3b/d4/7c/3bd47c7c-db8c-9413-ea40-40940dc34cc5/Placeholder.mill/200x200bb-75.webp" alt="Icono de Kapsely" className="h-24 w-24 rounded-[24px] object-cover shadow-[0_20px_60px_rgba(192,80,255,.35)]" referrerPolicy="no-referrer" /><p className="mt-8 text-[9px] uppercase tracking-[0.24em] text-fuchsia-200">Disponible ahora</p><h3 className="mt-3 text-5xl font-semibold tracking-[-0.05em] text-white">Kapsely</h3><p className="mt-3 text-sm font-medium text-violet-200">The future of sharing.</p><p className="mt-5 text-sm font-light leading-6 text-white/45">Crea cápsulas digitales, comparte momentos y conserva recuerdos con las personas que importan.</p></div>
                <a href="https://apps.apple.com/es/app/kapsely/id6759984193" target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-3 rounded-2xl border border-white/15 bg-black px-5 py-3 text-white shadow-xl transition hover:-translate-y-1 hover:border-white/35" aria-label="Descargar Kapsely en el App Store"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current"><path d="M16.37 1.43c0 1.14-.42 2.1-1.25 2.87-.9.83-1.87 1.31-2.92 1.24-.12-1.1.32-2.28 1.06-3.03.83-.86 2.23-1.51 3.11-1.08ZM20.77 17.35c-.46 1.04-.68 1.5-1.27 2.42-.83 1.27-2 2.86-3.45 2.87-1.29.01-1.62-.84-3.37-.83-1.75.01-2.12.85-3.4.84-1.45-.01-2.56-1.45-3.39-2.72-2.32-3.55-2.57-7.72-1.14-9.94 1.02-1.58 2.62-2.5 4.13-2.5 1.54 0 2.5.85 3.77.85 1.23 0 1.98-.85 3.76-.85 1.35 0 2.78.74 3.8 2.01-3.34 1.83-2.8 6.6.56 7.85Z" /></svg><span className="text-left"><span className="block text-[8px] leading-none">Descárgala en el</span><span className="mt-1 block text-lg font-medium leading-none">App Store</span></span></a>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="estudio" className="relative w-full overflow-hidden border-y border-white/[0.06] px-6 py-24 sm:px-10 lg:px-16 lg:py-32"><div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9275bf]/10 blur-[160px]" /><div className="relative w-full">
          <motion.div {...reveal} className="grid items-start gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-28"><div><p className="mb-6 text-[10px] font-medium uppercase tracking-[0.3em] text-[#d6b96f]">El estudio</p><h2 className="text-[clamp(2.8rem,5.7vw,6.5rem)] font-medium leading-[0.95] tracking-[-0.055em] text-white">Tecnología de alta costura para ideas <span className="bg-gradient-to-r from-[#f0d99d] to-[#75dfff] bg-clip-text font-display font-medium text-transparent">sin límites.</span></h2></div><div className="lg:pt-16"><p className="text-lg font-light leading-8 text-white/52">Somos un estudio independiente de estrategia, diseño y desarrollo. Unimos sensibilidad creativa y rigor técnico para crear productos que se sienten inevitables.</p><div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-8"><div><p className="text-4xl font-light text-white">360°</p><p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-white/30">Visión integral</p></div><div><p className="text-4xl font-light text-white">1:1</p><p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-white/30">Trato directo</p></div></div></div></motion.div>
          <div className="mt-20 grid gap-4 md:grid-cols-4">{process.map(([title, text], index) => <motion.div key={title} {...reveal} transition={{ ...reveal.transition, delay: index * 0.08 }} className="rounded-[22px] border border-white/[0.075] bg-[#080a0e]/85 p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.05)] sm:p-8"><span className="font-mono text-[9px] text-[#d6b96f]">0{index + 1}</span><h3 className="mt-12 text-lg font-semibold text-white">{title}</h3><p className="mt-3 text-xs font-light leading-5 text-white/38">{text}</p></motion.div>)}</div>
        </div></section>

        <section id="contacto" className="w-full px-6 py-10 sm:px-10 lg:px-16"><div className="relative w-full overflow-hidden rounded-[32px] border border-[#ddc481]/20 bg-[#0d0e11] px-6 py-14 sm:px-10 lg:px-16 lg:py-24"><div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#d2b56d]/15 blur-[100px]" /><div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-[#4f6fa2]/12 blur-[110px]" /><div className="relative grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
          <motion.div {...reveal}><p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#d6b96f]">Tu próximo movimiento</p><h2 className="mt-6 text-5xl font-light leading-[0.95] tracking-[-0.05em] text-white sm:text-7xl">Hagamos algo extraordinario.</h2><p className="mt-7 max-w-md text-sm font-light leading-6 text-white/43">Cuéntanos qué quieres construir, mejorar o transformar. Nosotros encontraremos la forma de hacerlo real.</p><div className="mt-12 space-y-3 text-xs text-white/45"><p className="flex items-center gap-3"><Globe2 className="h-4 w-4 text-[#d6b96f]" /> Ibiza · Trabajamos en remoto</p><p className="flex items-center gap-3"><Zap className="h-4 w-4 text-[#d6b96f]" /> Respuesta habitual en 24 horas</p></div></motion.div>
          <motion.form {...reveal} onSubmit={submitInquiry} className="space-y-5">{sent ? <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-[#d6b96f]/20 bg-[#d6b96f]/[0.055] px-8 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d6b96f]/30 bg-[#d6b96f]/10"><Check className="h-6 w-6 text-[#e3ca8e]" /></div><h3 className="mt-6 text-2xl font-light">Mensaje recibido.</h3><p className="mt-3 max-w-sm text-sm font-light leading-6 text-white/42">Gracias por pensar en Althera. Revisaremos tu idea y nos pondremos en contacto contigo muy pronto.</p><button type="button" onClick={() => setSent(false)} className="mt-7 text-[10px] uppercase tracking-[0.2em] text-[#d6b96f]">Enviar otro mensaje</button></div> : <><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-white/35">Nombre</span><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="althera-input" /></label><label className="block"><span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-white/35">Email</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hola@empresa.com" className="althera-input" /></label></div><label className="block"><span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-white/35">¿Qué tienes en mente?</span><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Háblanos del proyecto, los objetivos y el momento en el que estás..." className="althera-input resize-none leading-6" /></label><button disabled={sending} type="submit" className="group mt-4 flex w-full items-center justify-center gap-3 rounded-full bg-[#e5cb8b] px-7 py-4 text-xs font-semibold text-[#11100d] transition hover:bg-[#f2dda8] disabled:opacity-50 sm:w-auto">{sending ? 'Enviando…' : 'Enviar propuesta'} <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></button></>}</motion.form>
        </div></div></section>
      </main>

      <footer className="relative z-10 mx-auto max-w-[1480px] px-5 py-12 sm:px-8 lg:px-12"><div className="flex flex-col gap-8 border-t border-white/[0.08] pt-8 sm:flex-row sm:items-end sm:justify-between"><div className="flex items-center gap-4"><img src="/althera-logo.png" alt="Althera" className="h-12 w-12 rounded-xl object-cover opacity-90" /><div><p className="text-sm font-semibold uppercase tracking-[0.24em]">Althera</p><p className="mt-1 text-[8px] uppercase tracking-[0.28em] text-white/28">Althera, soluciones digitales · Ibiza</p></div></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-[9px] uppercase tracking-[0.18em] text-white/30"><button onClick={() => onNavigate('portal', 'push')} className="transition hover:text-white">Área privada</button><span>© {new Date().getFullYear()} Althera Solutions</span></div></div></footer>

      <style>{`
        .althera-landing h1,.althera-landing h2,.althera-landing h3{font-family:"Space Grotesk",sans-serif}.althera-noise{background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E")}.althera-grid{background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:56px 56px;mask-image:linear-gradient(to bottom,transparent,black 20%,black 70%,transparent)}.althera-hero-video{filter:contrast(1.55) brightness(.82) saturate(1.08);-webkit-mask-image:radial-gradient(ellipse 70% 72% at 50% 49%,#000 52%,rgba(0,0,0,.95) 64%,transparent 91%);mask-image:radial-gradient(ellipse 70% 72% at 50% 49%,#000 52%,rgba(0,0,0,.95) 64%,transparent 91%)}.althera-marquee{width:max-content;animation:altheraMarquee 28s linear infinite}.althera-input{width:100%;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.035);padding:14px 16px;font-size:14px;color:#fff;outline:none;transition:border-color .2s,background .2s,box-shadow .2s}.althera-input::placeholder{color:rgba(255,255,255,.2)}.althera-input:focus{border-color:rgba(214,185,111,.5);background:rgba(255,255,255,.05);box-shadow:0 0 0 4px rgba(214,185,111,.06)}@keyframes altheraMarquee{to{transform:translateX(-50%)}}@media(max-width:1279px){.althera-landing header>div.border-t{display:block!important}}@media(prefers-reduced-motion:reduce){.althera-marquee{animation:none}}
      `}</style>
    </div>
  );
}
