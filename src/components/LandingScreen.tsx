import React, { useState, useEffect } from 'react';
import { Screen, InquiryMessage } from '../types';
import { db } from '../supabaseClient';
import { 
  Terminal, 
  ArrowRight, 
  Cpu, 
  Layers, 
  Database, 
  Users, 
  Calendar, 
  FileText, 
  Sparkles, 
  Code, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Laptop,
  Globe,
  Mail,
  MessageSquare,
  Send,
  CheckCircle,
  ExternalLink,
  X,
  Monitor,
  Smartphone,
  Zap
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';

interface LandingScreenProps {
  onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
  projects?: any[];
}

export default function LandingScreen({ onNavigate, projects }: LandingScreenProps) {
  const { scrollY } = useScroll();
  const topoScale = useTransform(scrollY, [0, 1000], [1, 1.4]);
  const topoRotate = useTransform(scrollY, [0, 1000], [0, 40]);
  const topoYTranslate = useTransform(scrollY, [0, 1000], [0, 100]);

  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Advanced Interactive Portfolio States
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Interactive Digital Lab States
  const [labTab, setLabTab] = useState<'invoice' | 'dashboard'>('invoice');
  
  // 1. Invoice Generator Lab States
  const [invoiceClient, setInvoiceClient] = useState('Cliente Corporativo S.L.');
  const [invoiceItem, setInvoiceItem] = useState('Consultoría en Arquitectura Cloud & React');
  const [invoiceRate, setInvoiceRate] = useState(85);
  const [invoiceHours, setInvoiceHours] = useState(40);
  const [invoiceIsGenerating, setInvoiceIsGenerating] = useState(false);
  const [invoicePdfPreview, setInvoicePdfPreview] = useState(false);

  // 2. Mini Admin Dashboard Lab States
  const [adminTimeframe, setAdminTimeframe] = useState<'7d' | '30d' | '12m'>('7d');
  const [adminMetricTab, setAdminMetricTab] = useState<'sales' | 'visits' | 'signups'>('sales');

  // Ultra-Responsive Adaptive Showcase States
  const [showcaseWebsite, setShowcaseWebsite] = useState<'luxury-store' | 'tech-saas' | 'architects'>('luxury-store');
  const [showcaseViewport, setShowcaseViewport] = useState<'desktop' | 'mobile'>('desktop');

  // High-fidelity real projects carried out by the digital boutique agency
  const displayProjects = React.useMemo(() => {
    const rawProjects = (projects && projects.length > 0) ? projects : [];

    if (rawProjects.length > 0) {
      // Filter projects that are marked to show on landing page
      const activeOnLanding = rawProjects.filter((p: any) => p.showOnLanding !== false);
      if (activeOnLanding.length > 0) {
        return activeOnLanding.map((p: any) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          tag: p.status || 'Completed', // e.g. 'Completed', 'Beta Active'
          description: p.description,
          detailText: p.detailText || "Diseño minimalista premium de alto nivel y lógica eficiente de extremo a extremo.",
          performanceScore: p.performanceScore || 98,
          seoScore: p.seoScore || 100,
          image: p.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          url: p.url || "demo.agencyflow.com",
          tech: [...(p.tools || []), ...(p.addons || [])].slice(0, 5), // combine tools and addons as tech
          tools: p.tools || ['React', 'TypeScript'],
          addons: p.addons || ['Tailwind CSS']
        }));
      }
    }

    return [];
  }, [projects]);

  const CAPABILITIES = [
    {
      title: "Ingeniería Frontend de Precisión",
      description: "Escribimos interfaces fluidas con React, TypeScript y Tailwind CSS enfocadas en ofrecer tiempos de carga por debajo del segundo y SEO impecable.",
      icon: Code
    },
    {
      title: "Arquitectura Cloud de Alta Disponibilidad",
      description: "Desplegamos microservicios escalables, bases de datos PostgreSQL y control de accesos Row Level Security (RLS) que blindan tu negocio.",
      icon: ShieldCheck
    },
    {
      title: "Diseño de Interacción Excepcional",
      description: "Establecemos jerarquías visuales refinadas, combinaciones tipográficas de impacto y micro-experiencias estéticas que enamoran a tus usuarios.",
      icon: Sparkles
    }
  ];

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryEmail.trim()) return;

    const newInquiry: InquiryMessage = {
      id: 'inq_' + Date.now().toString().slice(-7),
      name: inquiryName.trim(),
      email: inquiryEmail.trim(),
      message: inquiryMessage.trim(),
      archived: false,
      created_at: new Date().toISOString()
    };

    try {
      // Save directly to Supabase via db helpers
      await db.insertInquiry(newInquiry);
      setIsSubmitted(true);
      setTimeout(() => {
        setInquiryName('');
        setInquiryEmail('');
        setInquiryMessage('');
      }, 4000);
    } catch (err) {
      console.warn("Got error saving inquiry to Supabase:", err);
      // Still show thank you state to keep client happy
      setIsSubmitted(true);
      setTimeout(() => {
        setInquiryName('');
        setInquiryEmail('');
        setInquiryMessage('');
      }, 4000);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#020204] text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      
      {/* Self-contained topographic animation styling */}
      <style>{`
        @keyframes spinAndWarpTopography {
          0% {
            transform: rotate(0deg) scale(1);
          }
          100% {
            transform: rotate(180deg) scale(1.06);
          }
        }
      `}</style>

      {/* Modern High-Precision 3D Topographic Wave Relief backdrop that animates with window scroll */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        
        {/* Deep organic topographic container */}
        <div className="absolute right-[-10%] top-[-10%] lg:right-[-5%] lg:top-[5%] w-[120%] lg:w-[60%] aspect-square flex items-center justify-center opacity-85 z-0">
          <motion.div
            style={{
              scale: topoScale,
              rotate: topoRotate,
              y: topoYTranslate,
            }}
            className="relative w-[100%] h-[100%] max-w-[850px] max-h-[850px] transition-transform duration-75 ease"
          >
            {/* Concentric layered wave paths resembling the black topographic wavy landscape of the image */}
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: `${100 - i * 14}%`,
                  height: `${100 - i * 14}%`,
                  borderWidth: '1.5px',
                  borderColor: i % 3 === 0 ? 'rgba(168, 85, 247, 0.22)' : 'rgba(244, 63, 94, 0.08)', // Interactive purple vs rose border lines
                  boxShadow: 'inset 0 0 25px rgba(0,0,0,0.95), 0 0 15px rgba(168, 85, 247, 0.01)',
                  animation: `spinAndWarpTopography ${14 + i * 2}s infinite linear alternate`,
                  borderRadius: '50%',
                }}
                className="absolute bg-[#020204]/70"
              />
            ))}

            {/* Core cosmic radiant orb inside the topography center */}
            <div className="absolute w-[20%] h-[20%] rounded-full bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-rose-500 blur-3xl opacity-45 animate-pulse" />
          </motion.div>
        </div>

        {/* Ambient background grid with subtle contrast adjustment */}
        <div 
          className="absolute inset-0 opacity-[0.09]" 
          style={{
            backgroundImage: `linear-gradient(to right, rgba(168, 85, 247, 0.15) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(168, 85, 247, 0.15) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Dynamic mesh glow bottom background orb */}
        <motion.div 
          animate={{
            x: [0, -30, 15, 0],
            y: [0, 45, -20, 0],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[-15%] left-[5%] w-[45%] h-[40%] bg-violet-600/10 rounded-full blur-[140px]" 
        />
      </div>

      {/* Dynamic Cyber Header - Animated Entrance with Cosmic Violet-Rose details */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Logo & Branding - Modern, elegant display pairing matching DigitalPro aesthetics */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => onNavigate('landing', 'none')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-black border border-violet-500/25 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
              <img 
                src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" 
                alt="Althera Logo" 
                className="w-full h-full object-contain filter brightness-[1.1]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white font-sans tracking-wide uppercase">
                Althera <span className="font-light italic lowercase text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400">solutions</span>
              </span>
            </div>
          </motion.div>

          {/* Action triggers - Team exclusive portal access */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ 
                scale: 1.03, 
                borderColor: "rgba(168, 85, 247, 0.4)",
                boxShadow: "0 0 15px rgba(139, 92, 246, 0.2)"
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('acceso', 'push')}
              className="bg-slate-950 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-black/80"
              title="Acceso exclusivo del personal de desarrollo para administrar clientes, calendarios y de notas"
            >
              <Cpu className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span>Portal de Equipo (Acceso Interno)</span>
              <ArrowRight className="w-3 h-3 text-slate-450" />
            </motion.button>
          </div>

        </div>
      </motion.header>

      {/* Main content body wrap */}
      <main className="relative z-10 flex-grow max-w-7xl mx-auto px-6 py-12 sm:py-20 flex flex-col gap-28">
        
        {/* HERO SECTION - Proudly representing the development agency with Organic Topographic elements */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.15
              }
            }
          }}
          className="text-left lg:text-left max-w-3.5xl mr-auto flex flex-col items-start gap-7 pt-6 sm:pt-16 pb-4 relative z-10"
        >
          
          {/* Accent micro badge with violet-rose styling */}
          <motion.div 
            variants={{
              hidden: { scale: 0.8, opacity: 0 },
              visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 100 } }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-black/60 border border-violet-500/20 rounded-full text-[10px] font-mono text-slate-300 uppercase tracking-widest font-semibold shadow-[0_0_15px_rgba(139,92,246,0.05)]"
          >
            <Cpu className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>Código de Élite & Topografía Digital</span>
          </motion.div>
 
          {/* Main Title - Stacked, high densitity uppercase white layout matching DigitalPro style */}
          <motion.h1 
            variants={{
              hidden: { y: 30, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
            }}
            className="text-4xl sm:text-7xl font-black text-white tracking-tighter leading-[0.9] uppercase"
          >
            Ingeniería de Élite <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-400 to-rose-500">
              Soluciones Digitales
            </span>
          </motion.h1>

          {/* "Que somos" - High precision agency description */}
          <motion.p 
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
            }}
            className="text-slate-400 text-sm sm:text-[15px] leading-relaxed max-w-2.5xl font-sans font-light"
          >
            Somos <span className="text-white font-semibold flex-inline items-center gap-1"><span className="text-violet-400">Althera</span> Solutions</span>, una boutique de desarrollo tecnológico de alta costura. Diseñamos y programamos <span className="text-violet-300">plataformas SaaS de alto flujo</span>, <span className="text-fuchsia-300">sistemas interactivos a medida</span> y <span className="text-rose-300">paneles analíticos soberbios</span>. Centramos cada píxel en escribir código limpio estructurado en TypeScript, adaptativo en su totalidad y diseñado con un refinamiento visual absoluto.
          </motion.p>

          {/* Call to action actionables */}
          <motion.div 
            variants={{
              hidden: { y: 15, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.6 } }
            }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-2"
          >
            <motion.a
              whileHover={{ 
                scale: 1.04, 
                y: -2, 
                boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.3)" 
              }}
              whileTap={{ scale: 0.98 }}
              href="#proyectos"
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 text-white text-xs font-bold px-7 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Explorar Proyectos Llevados a Cabo</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </motion.a>
            <motion.a
              whileHover={{ 
                scale: 1.04, 
                y: -2, 
                backgroundColor: "rgba(168,85,247,0.08)", 
                borderColor: "rgba(168,85,247,0.35)" 
              }}
              whileTap={{ scale: 0.98 }}
              href="#contacto"
              className="w-full sm:w-auto px-7 py-3.5 border border-white/10 bg-[#020204]/40 rounded-xl text-slate-350 hover:text-white transition-all text-xs font-bold text-center cursor-pointer backdrop-blur-sm"
            >
              Hablemos de tu Proyecto
            </motion.a>
          </motion.div>

        </motion.section>

        {/* CORE CAPABILITIES CHECK */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CAPABILITIES.map((cap, idx) => {
            const IconComp = cap.icon;
            return (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -6, borderColor: "rgba(168, 85, 247, 0.35)", backgroundColor: "rgba(168, 85, 247, 0.04)" }}
                key={idx} 
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 transition-all backdrop-blur-3xl flex flex-col gap-3 group cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all">
                  <IconComp className="w-5 h-5 font-bold" />
                </div>
                <h3 className="text-sm font-semibold text-white tracking-tight">{cap.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-light">{cap.description}</p>
              </motion.div>
            );
          })}
        </section>

        {/* PORTFOLIO / PROJECTS SECTION: Rediseñado con Filtros, Animaciones y Modal de Detalles Interactivos */}
        <section id="proyectos" className="space-y-12 scroll-mt-24 font-sans">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/5 pb-8"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
                <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-semibold block">Nuestra Galería de Código</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Proyectos Llevados a Cabo</h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed font-light">
                Desarrollamos soluciones digitales a medida que aúnan estética ultra-moderna y flujos lógicos eficientes bajo estándares de ingeniería excepcionales.
              </p>
            </div>

            {/* Filter Tabs with sliding active background */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#040409]/80 border border-white/5 rounded-2xl self-start lg:self-end">
              {['Todos', 'SaaS', 'Luxury Portals', 'E-Commerce'].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`relative px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeFilterBg"
                        className="absolute inset-0 bg-violet-650/25 border border-violet-500/30 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{cat}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Grid list of detailed elite projects with visual browser mockups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {displayProjects.length === 0 ? (
              <div className="col-span-1 md:col-span-2 text-center py-16 bg-white/[0.01] border border-white/5 rounded-3xl p-8 space-y-2">
                <span className="text-violet-400 font-mono text-[10px] uppercase tracking-wider block font-semibold">Galería en Actualización</span>
                <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed font-light">
                  Estamos documentando nuestros últimos proyectos llevados a cabo. Muy pronto publicaremos fichas interactivas aquí.
                </p>
              </div>
            ) : (
              displayProjects
                .filter(p => selectedCategory === 'Todos' || p.category === selectedCategory)
                .map((proj, idx) => {
                  return (
                    <motion.div 
                      key={proj.title} 
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      whileHover={{ 
                        y: -8, 
                        borderColor: "rgba(168, 85, 247, 0.2)",
                        boxShadow: "0 20px 40px -15px rgba(168, 85, 247, 0.15)"
                      }}
                      onClick={() => setSelectedProject(proj)}
                      className="group relative bg-[#040409]/90 border border-white/5 p-5 sm:p-6 rounded-3xl transition-all duration-300 flex flex-col gap-5 overflow-hidden cursor-pointer"
                    >
                      {/* Gradient Ambient Glow Mesh inside card */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-500/10 transition-all duration-500" />
                      
                      {/* High Quality Web Browser Mockup Frame enclosing real website image */}
                      <div className="relative w-full aspect-[16/10] bg-[#07070f] rounded-2xl overflow-hidden border border-white/5 shadow-2xl flex flex-col">
                        {/* Browser Header Bar */}
                        <div className="h-8 bg-slate-950/80 border-b border-white/5 px-4 flex items-center justify-between flex-shrink-0">
                          {/* Left: Window Dots */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/90" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/90" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/90" />
                          </div>
                          
                          {/* Center: Address Bar */}
                          <div className="bg-slate-900 border border-white/5 text-[9px] text-slate-500 font-mono text-center rounded-lg py-0.5 px-6 truncate max-w-[210px] select-none flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block animate-pulse" />
                            <span>https://{proj.url}</span>
                          </div>
                          
                          {/* Right Layout Item */}
                          <div className="w-12 h-1 px-1 flex justify-end">
                            <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-violet-400 transition-colors" />
                          </div>
                        </div>

                        {/* Web Preview Screen */}
                        <div className="relative flex-grow overflow-hidden bg-slate-950">
                          <motion.img 
                            src={proj.image} 
                            alt={proj.title}
                            referrerPolicy="no-referrer"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.5 }}
                            className="w-full h-full object-cover object-top filter contrast-[1.03] brightness-[0.95]"
                          />
                          {/* Visual Gradient Mesh Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                        </div>
                      </div>

                      {/* Info Meta Row */}
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">
                          {proj.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                            {proj.tag}
                          </span>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="space-y-2 flex-grow">
                        <h3 className="text-base font-bold text-white group-hover:text-violet-400 tracking-tight transition-colors flex items-center gap-2">
                          <span>{proj.title}</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-violet-400" />
                        </h3>
                        <p className="text-slate-400 text-[12px] leading-relaxed font-light line-clamp-2">
                          {proj.description}
                        </p>
                      </div>

                      {/* Tech stack badge alignments */}
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-4">
                        {proj.tech.map((t: string, tIdx: number) => (
                          <span key={tIdx} className="text-[9px] font-mono text-slate-400 bg-[#070711] border border-white/5 px-2.5 py-1 rounded">
                            {t}
                          </span>
                        ))}
                        <span className="text-[9px] font-mono text-violet-400 ml-auto font-bold group-hover:underline">Ficha Técnica →</span>
                      </div>
                    </motion.div>
                  );
                })
            )}
          </div>

          {/* SPECTACULAR INTERACTIVE OVERLAY MODAL */}
          <AnimatePresence>
            {selectedProject && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
                {/* Backdrop Blur */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedProject(null)}
                  className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-zoom-out"
                />

                {/* Modal Window Container */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="relative w-full max-w-4xl bg-[#030308] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col lg:flex-row max-h-[90vh] lg:max-h-[85vh]"
                >
                  {/* LEFT PANEL: Live Interactive Device Mockup (Simulates Desktop vs Mobile) */}
                  <div className="w-full lg:w-3/5 bg-slate-950/60 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5">
                    
                    {/* Device Simulator Toggle Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Simulador de Entorno</span>
                      </div>

                      <div className="flex items-center gap-1 p-0.5 bg-[#040409] border border-white/5 rounded-xl">
                        <button
                          onClick={() => setSelectedDevice('desktop')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            selectedDevice === 'desktop' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-white'
                          }`}
                          title="Vista de Escritorio"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedDevice('mobile')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            selectedDevice === 'mobile' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-white'
                          }`}
                          title="Vista de Móvil"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Frame Simulator Viewport Canvas */}
                    <div className="flex-grow flex items-center justify-center p-4">
                      <motion.div 
                        layout
                        animate={{ 
                          width: selectedDevice === 'desktop' ? '100%' : '260px',
                          height: selectedDevice === 'desktop' ? '100%' : '440px',
                          aspectRatio: selectedDevice === 'desktop' ? '16/10' : '9/16'
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className="relative bg-[#07070f] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col w-full"
                      >
                        {/* Browser Header inside modal simulator (only for desktop) */}
                        {selectedDevice === 'desktop' && (
                          <div className="h-7 bg-slate-950 border-b border-white/5 px-3.5 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500/80" />
                              <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                              <span className="w-2 h-2 rounded-full bg-green-500/80" />
                            </div>
                            <div className="bg-slate-900 text-[8px] text-slate-400 font-mono text-center rounded py-0.5 px-4 truncate max-w-[140px] select-none">
                              {selectedProject.url}
                            </div>
                            <div className="w-4" />
                          </div>
                        )}

                        {/* Mobile notch simulator (only for mobile) */}
                        {selectedDevice === 'mobile' && (
                          <div className="h-6 bg-slate-950 flex items-center justify-center relative flex-shrink-0 border-b border-white/5">
                            <div className="w-16 h-3 bg-slate-900 rounded-full flex items-center justify-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                              <span className="w-5 h-1 bg-slate-950 rounded-full" />
                            </div>
                          </div>
                        )}

                        {/* Simulated Canvas Image Web Content */}
                        <div className="relative flex-grow overflow-hidden bg-slate-950">
                          <img 
                            src={selectedProject.image} 
                            alt={selectedProject.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Lighthouse Performance Score Indicator */}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-[#050510] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 block font-bold uppercase">Rendimiento (Core Vitals)</span>
                          <span className="text-[10px] font-mono text-emerald-400 mt-0.5 block font-semibold">Carga en &lt; 0.8s</span>
                        </div>
                        <div className="relative w-11 h-11 flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="22" cy="22" r="18" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                            <circle cx="22" cy="22" r="18" fill="transparent" stroke="#10b981" strokeWidth="3" 
                              strokeDasharray={`${2 * Math.PI * 18}`}
                              strokeDashoffset={`${2 * Math.PI * 18 * (1 - selectedProject.performanceScore / 100)}`}
                            />
                          </svg>
                          <span className="text-[10px] font-mono text-emerald-400 font-extrabold">{selectedProject.performanceScore}</span>
                        </div>
                      </div>

                      <div className="bg-[#050510] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 block font-bold uppercase">Optimización SEO</span>
                          <span className="text-[10px] font-mono text-indigo-400 mt-0.5 block font-semibold">Semántica Perfecta</span>
                        </div>
                        <div className="relative w-11 h-11 flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="22" cy="22" r="18" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                            <circle cx="22" cy="22" r="18" fill="transparent" stroke="#6366f1" strokeWidth="3" 
                              strokeDasharray={`${2 * Math.PI * 18}`}
                              strokeDashoffset={`${2 * Math.PI * 18 * (1 - selectedProject.seoScore / 100)}`}
                            />
                          </svg>
                          <span className="text-[10px] font-mono text-indigo-400 font-extrabold">{selectedProject.seoScore}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT PANEL: Specifications, Core Tools, and Integration Badges */}
                  <div className="w-full lg:w-2/5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
                    
                    {/* Header Details */}
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">
                          {selectedProject.category}
                        </span>
                        
                        <button 
                          onClick={() => setSelectedProject(null)}
                          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                          {selectedProject.title}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Estatus: {selectedProject.tag}</span>
                        </p>
                      </div>

                      <p className="text-slate-300 text-xs leading-relaxed font-light">
                        {selectedProject.detailText}
                      </p>

                      {/* Technical stack lists */}
                      <div className="space-y-4 pt-2">
                        {/* Core Technologies */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Tecnologías Core</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedProject.tools.map((t: string) => (
                              <span key={t} className="text-[10px] font-mono text-violet-300 bg-violet-500/5 border border-violet-500/10 px-2.5 py-1 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Integration Addons */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Integraciones & Sistemas</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedProject.addons.map((a: string) => (
                              <span key={a} className="text-[10px] font-mono text-fuchsia-300 bg-fuchsia-500/5 border border-fuchsia-500/10 px-2.5 py-1 rounded">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-6 mt-6 border-t border-white/5 flex gap-3">
                      <button
                        onClick={() => setSelectedProject(null)}
                        className="flex-1 py-2.5 bg-slate-900 border border-white/5 text-slate-300 font-bold rounded-xl text-xs hover:text-white transition-all cursor-pointer"
                      >
                        Cerrar Ficha
                      </button>
                      
                      <a
                        href={`https://${selectedProject.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-violet-500/15"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver Demo Real</span>
                      </a>
                    </div>

                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </section>

        {/* INTERACTIVE LAB: "Prueba Nuestro Código" */}
        <section className="space-y-12 scroll-mt-24 font-sans border-t border-white/5 pt-16">
          {/* Header */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest font-bold block">EXPERIENCIA LIVE</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Laboratorio de Código Interactivo</h2>
            <p className="text-slate-450 text-xs sm:text-sm leading-relaxed font-light">
              Experimenta de primera mano la agilidad y el acabado premium de nuestros desarrollos antes de iniciar tu proyecto. Modifica valores en tiempo real.
            </p>

            {/* Switch Tabs */}
            <div className="inline-flex items-center gap-1.5 p-1 bg-[#040409]/90 border border-white/5 rounded-xl mt-4">
              <button
                onClick={() => setLabTab('invoice')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  labTab === 'invoice' 
                    ? 'bg-violet-605/25 border border-violet-500/30 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generador de Facturas</span>
              </button>
              <button
                onClick={() => setLabTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  labTab === 'dashboard' 
                    ? 'bg-violet-605/25 border border-violet-500/30 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Mini Panel de Control</span>
              </button>
            </div>
          </div>

          {/* Interactive lab sandbox box */}
          <div className="bg-[#030307]/80 border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-3xl">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-605/5 rounded-full blur-[120px] pointer-events-none" />
            
            {labTab === 'invoice' ? (
              /* INVOICE GENERATOR LIVE SANDBOX */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left controls panel */}
                <div className="lg:col-span-5 space-y-4 bg-black/30 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <span className="text-[11px] font-mono text-slate-300 font-bold uppercase">Consola de Control</span>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 block font-bold uppercase">Cliente</label>
                      <input 
                        type="text" 
                        value={invoiceClient}
                        onChange={(e) => { setInvoiceClient(e.target.value); setInvoicePdfPreview(false); }}
                        className="w-full bg-[#020204] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500/30 font-sans"
                        placeholder="Escribe el nombre del cliente"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 block font-bold uppercase">Concepto del Servicio</label>
                      <input 
                        type="text" 
                        value={invoiceItem}
                        onChange={(e) => { setInvoiceItem(e.target.value); setInvoicePdfPreview(false); }}
                        className="w-full bg-[#020204] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500/30 font-sans"
                        placeholder="Escribe el servicio"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400 block font-bold uppercase">Tarifa por Hora (€)</label>
                        <input 
                          type="number" 
                          value={invoiceRate}
                          onChange={(e) => { setInvoiceRate(Math.max(1, Number(e.target.value))); setInvoicePdfPreview(false); }}
                          className="w-full bg-[#020204] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500/30 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400 block font-bold uppercase">Horas Invertidas</label>
                        <input 
                          type="number" 
                          value={invoiceHours}
                          onChange={(e) => { setInvoiceHours(Math.max(1, Number(e.target.value))); setInvoicePdfPreview(false); }}
                          className="w-full bg-[#020204] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500/30 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setInvoiceIsGenerating(true);
                      setTimeout(() => {
                        setInvoiceIsGenerating(false);
                        setInvoicePdfPreview(true);
                      }, 1000);
                    }}
                    disabled={invoiceIsGenerating}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-violet-500/15"
                  >
                    {invoiceIsGenerating ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
                        <span>Compilando Estilos PDF...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Generar Vista Previa Premium</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Interactive Result PDF Mockup */}
                <div className="lg:col-span-7 bg-[#05050e] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative min-h-[350px]">
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[8px] font-mono text-emerald-400 uppercase font-bold tracking-wider">Lógica Activa</span>
                  </div>

                  {invoicePdfPreview ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6 flex-grow flex flex-col justify-between"
                    >
                      {/* PDF Header Mock */}
                      <div className="flex justify-between items-start border-b border-white/5 pb-4 text-left">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-2.5 h-2.5 bg-violet-500 rounded" />
                            <span className="text-xs font-extrabold text-white uppercase tracking-wider">Althera Solutions</span>
                          </div>
                          <p className="text-[9px] font-mono text-slate-500">CIF: B-07492463 • Ibiza, España</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest font-bold bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/15">Factura Proforma</span>
                          <p className="text-[10px] font-mono text-slate-300 mt-1.5">#{(invoiceClient.length * 1234 + 100000)}</p>
                        </div>
                      </div>

                      {/* PDF Info Row */}
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div>
                          <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">Facturar a:</span>
                          <p className="text-xs font-bold text-white mt-1">{invoiceClient || 'Cliente Corporativo S.L.'}</p>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5">contacto@{invoiceClient.toLowerCase().replace(/[^a-z0-9]/g, '') || 'cliente'}.com</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">Fecha de Emisión:</span>
                          <p className="text-xs text-slate-300 mt-1">{new Date().toLocaleDateString('es-ES')}</p>
                          <p className="text-[9px] font-mono text-slate-500 mt-0.5">Vencimiento: 15 días netos</p>
                        </div>
                      </div>

                      {/* PDF Table Item */}
                      <div className="border border-white/5 rounded-xl overflow-hidden bg-black/40">
                        <div className="grid grid-cols-12 bg-white/5 p-2 text-[9px] font-mono text-slate-400 uppercase font-bold border-b border-white/5">
                          <div className="col-span-6 text-left">Descripción del Servicio</div>
                          <div className="col-span-2 text-center">Horas</div>
                          <div className="col-span-2 text-right">Tarifa</div>
                          <div className="col-span-2 text-right">Subtotal</div>
                        </div>
                        <div className="grid grid-cols-12 p-3 text-xs text-slate-200">
                          <div className="col-span-6 text-left font-medium text-white truncate">{invoiceItem || 'Consultoría Tecnológica'}</div>
                          <div className="col-span-2 text-center font-mono text-slate-300">{invoiceHours}h</div>
                          <div className="col-span-2 text-right font-mono text-slate-300">{invoiceRate}€</div>
                          <div className="col-span-2 text-right font-mono text-slate-100 font-semibold">{(invoiceHours * invoiceRate).toLocaleString()}€</div>
                        </div>
                      </div>

                      {/* PDF Total block */}
                      <div className="flex justify-end pt-2">
                        <div className="w-52 space-y-1.5 border-t border-white/5 pt-2 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Base Imponible:</span>
                            <span className="font-mono text-slate-200">{(invoiceHours * invoiceRate).toLocaleString()}€</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Impuestos (21% IVA):</span>
                            <span className="font-mono text-slate-200">{Math.round(invoiceHours * invoiceRate * 0.21).toLocaleString()}€</span>
                          </div>
                          <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-extrabold text-white">
                            <span>Total Facturado:</span>
                            <span className="font-mono text-violet-400">{Math.round(invoiceHours * invoiceRate * 1.21).toLocaleString()}€</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[8px] font-mono text-slate-600 text-center border-t border-white/5 pt-3">
                        Documento proforma generado dinámicamente con estándares de maquetación vectorial para Althera.
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center space-y-3 p-8">
                      <div className="w-12 h-12 rounded-full bg-violet-500/5 border border-violet-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-white font-bold">Generador Listo para Renderizar</p>
                        <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                          Modifica los campos del panel de control izquierdo y presiona el botón para compilar la factura interactiva.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* MINI ADMIN DASHBOARD LIVE SANDBOX */
              <div className="space-y-6">
                {/* Dashboard Controls Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-bold">Dashboard Virtual</span>
                    <div className="flex gap-1.5 p-0.5 bg-black border border-white/5 rounded-xl">
                      {(['7d', '30d', '12m'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setAdminTimeframe(t)}
                          className={`px-2.5 py-1 text-[9px] font-mono rounded-lg transition-all cursor-pointer ${
                            adminTimeframe === t ? 'bg-violet-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {t === '7d' ? '7 Días' : t === '30d' ? '30 Días' : '12 Meses'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {(['sales', 'visits', 'signups'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setAdminMetricTab(m)}
                        className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer text-center ${
                          adminMetricTab === m 
                            ? 'bg-violet-655/15 border border-violet-500/20 text-violet-300' 
                            : 'bg-black/40 border border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m === 'sales' ? 'Facturación' : m === 'visits' ? 'Tráfico Web' : 'Conversiones'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dashboard Body Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1 */}
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-4.5 space-y-2 text-left">
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider block">Métrica Principal</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-white">
                        {adminMetricTab === 'sales' 
                          ? (adminTimeframe === '7d' ? '12.450 €' : adminTimeframe === '30d' ? '54.210 €' : '620.400 €')
                          : adminMetricTab === 'visits'
                          ? (adminTimeframe === '7d' ? '8.410' : adminTimeframe === '30d' ? '36.800' : '482.000')
                          : (adminTimeframe === '7d' ? '142' : adminTimeframe === '30d' ? '642' : '7.850')
                        }
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">+18.4%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: adminTimeframe === '7d' ? '40%' : adminTimeframe === '30d' ? '70%' : '100%' }}
                        className="h-full bg-violet-500" 
                      />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-4.5 space-y-2 text-left">
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider block">Tasa de Conversión</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-white">
                        {adminMetricTab === 'sales' ? '4.85%' : adminMetricTab === 'visits' ? '6.12%' : '8.24%'}
                      </span>
                      <span className="text-[9px] font-mono text-indigo-400 font-bold">+2.1%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: adminMetricTab === 'sales' ? '60%' : '80%' }}
                        className="h-full bg-indigo-500" 
                      />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-4.5 space-y-2 text-left">
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider block">Eficiencia Servidor</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-white">99.98%</span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">Estable</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-full" />
                    </div>
                  </div>
                </div>

                {/* Dashboard Chart Mock & Log Lines */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-8 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Curva de Rendimiento Sincronizada</span>
                      <span>{adminTimeframe === '7d' ? 'Lun - Dom' : adminTimeframe === '30d' ? 'Semana 1 - Semana 4' : 'Ene - Dic'}</span>
                    </div>
                    
                    {/* Fake Chart Lines using bars */}
                    <div className="h-28 flex items-end justify-between gap-2.5 pt-4">
                      {(adminTimeframe === '7d' ? [40, 55, 45, 75, 60, 95, 80] : [35, 45, 50, 65, 55, 70, 75, 85, 90, 80, 95, 100]).map((val, idx) => (
                        <div key={idx} className="flex-grow flex flex-col items-center gap-1.5 h-full justify-end group">
                          <span className="text-[8px] font-mono text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">{val}%</span>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${val}%` }}
                            transition={{ type: "spring", stiffness: 100, damping: 15, delay: idx * 0.02 }}
                            className="w-full rounded-t-lg bg-gradient-to-t from-violet-650/40 to-violet-500 group-hover:from-violet-500 group-hover:to-fuchsia-400 transition-all duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Left mini table logs */}
                  <div className="lg:col-span-4 space-y-3 text-left">
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block tracking-wider">Últimos Eventos</span>
                    <div className="space-y-2 text-[11px] font-mono max-h-[120px] overflow-y-auto">
                      <div className="flex justify-between text-slate-350 p-1.5 bg-[#050510] border border-white/5 rounded">
                        <span>📥 Nuevo lead CRM</span>
                        <span className="text-slate-500">Hace 2m</span>
                      </div>
                      <div className="flex justify-between text-slate-350 p-1.5 bg-[#050510] border border-white/5 rounded">
                        <span>💰 Cobro de 1.450€</span>
                        <span className="text-slate-500">Hace 15m</span>
                      </div>
                      <div className="flex justify-between text-slate-350 p-1.5 bg-[#050510] border border-white/5 rounded">
                        <span>🚀 Compilación OK</span>
                        <span className="text-slate-500">Hace 1h</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>


        {/* SECTION 2: ADAPTIVE SHOWCASE (Ficha Técnica de Adaptabilidad Ultra-Responsive) */}
        <section className="space-y-12 scroll-mt-24 font-sans border-t border-white/5 pt-16">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-bold block">INGENIERÍA FLUIDA</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Estudio de Adaptabilidad Web</h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed font-light">
                Comprueba cómo adaptamos un único código fuente a cualquier pantalla, garantizando una estética de lujo y flujos legibles tanto en móviles como en ordenadores de sobremesa.
              </p>
            </div>

            {/* Showcase Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#040409]/90 border border-white/5 rounded-2xl self-start">
              {[
                { id: 'luxury-store', label: 'E-Commerce de Lujo' },
                { id: 'tech-saas', label: 'Plataforma SaaS AI' },
                { id: 'architects', label: 'Estudio Arquitectura' }
              ].map((site) => {
                const isActive = showcaseWebsite === site.id;
                return (
                  <button
                    key={site.id}
                    onClick={() => setShowcaseWebsite(site.id as any)}
                    className={`relative px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeShowcaseBg"
                        className="absolute inset-0 bg-violet-650/25 border border-violet-500/30 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{site.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Dual Mockup Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#020204]/60 border border-white/5 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
            
            {/* Ambient glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-605/5 rounded-full blur-[160px] pointer-events-none" />

            {/* Left Specs explanation */}
            <div className="lg:col-span-4 space-y-6 text-left">
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest font-bold">Anatomía del Layout</div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {showcaseWebsite === 'luxury-store' && 'Aura Cosmetics Web'}
                  {showcaseWebsite === 'tech-saas' && 'Zephyr Intelligence Engine'}
                  {showcaseWebsite === 'architects' && 'Atrium Studio Minimal'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  {showcaseWebsite === 'luxury-store' && 'Un portal de venta exclusivo con cuadrículas fluidas, animaciones refinadas de desplazamiento y pasarela de pago Stripe acoplada de forma invisible.'}
                  {showcaseWebsite === 'tech-saas' && 'Una interfaz oscura futurista con gráficos vectoriales interactivos, paneles laterales plegables para optimizar espacio y tasas de refresco de 60fps.'}
                  {showcaseWebsite === 'architects' && 'Diseño centrado en la fotografía editorial de gran formato, tipografía con amplio tracking de lujo y transiciones líquidas entre obras.'}
                </p>
              </div>

              <div className="space-y-3.5 border-t border-white/5 pt-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Soporte Multi-Gesto</span>
                    <span className="text-[10px] text-slate-450 block leading-relaxed">Navegación por deslizamiento (swipes) optimizada para pulgares.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Imágenes WebP Fluidas</span>
                    <span className="text-[10px] text-slate-450 block leading-relaxed">Carga perezosa y resolución adaptativa según densidad de píxeles (retina).</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Código Semántico Accesible</span>
                    <span className="text-[10px] text-slate-450 block leading-relaxed">Uso estricto de etiquetas HTML5 y directrices ARIA para lectores de pantalla.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Side-by-side Dual Device Mockup Frame */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              
              {/* Desktop Device (Mockup 8 columns) */}
              <div className="md:col-span-8 space-y-2">
                <div className="flex items-center justify-between px-2 text-[9px] font-mono text-slate-500">
                  <span>ORDENADOR DE SOBREMESA (Desktop)</span>
                  <span className="text-violet-400">1920 x 1080px</span>
                </div>
                
                <div className="bg-[#05050f] border border-white/10 rounded-2xl overflow-hidden aspect-[16/10] shadow-2xl flex flex-col">
                  {/* Browser Header */}
                  <div className="h-6.5 bg-slate-950 border-b border-white/5 px-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                    </div>
                    <div className="bg-slate-900 text-[8px] text-slate-400 font-mono text-center rounded py-0.5 px-4 truncate max-w-[150px] select-none">
                      {showcaseWebsite === 'luxury-store' && 'aura.agencyflow.com'}
                      {showcaseWebsite === 'tech-saas' && 'zephyr.agencyflow.com'}
                      {showcaseWebsite === 'architects' && 'atrium.agencyflow.com'}
                    </div>
                    <div className="w-12" />
                  </div>

                  {/* Browser content */}
                  <div className="flex-grow bg-slate-950 relative overflow-hidden p-4 flex flex-col justify-between">
                    {showcaseWebsite === 'luxury-store' && (
                      <div className="h-full flex flex-col justify-between">
                        <div className="flex justify-between items-center text-[10px] text-white font-bold tracking-wider">
                          <span>AURA COSMETICS</span>
                          <div className="flex gap-2 text-slate-400 font-normal"><span>SHOP</span><span>ABOUT</span><span>BAG (0)</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 my-auto">
                          <div className="space-y-2 text-left self-center">
                            <h4 className="text-sm font-extrabold text-white leading-tight">Esencia Orgánica Pura</h4>
                            <p className="text-[9px] text-slate-400 leading-relaxed">Cuidado premium de la piel con ingredientes mediterráneos recolectados a mano.</p>
                            <button className="px-2.5 py-1 bg-white text-[9px] text-slate-950 font-bold rounded">Comprar Colección</button>
                          </div>
                          <div className="aspect-square rounded-lg overflow-hidden bg-slate-900 border border-white/5">
                            <img src="https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=400&q=80" alt="Cosmético" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </div>
                    )}

                    {showcaseWebsite === 'tech-saas' && (
                      <div className="h-full flex flex-col justify-between">
                        <div className="flex justify-between items-center text-[10px] text-white font-mono font-bold">
                          <span>// ZEPHYR.AI</span>
                          <span className="text-[9px] text-violet-400 font-bold">STATUS: ACTIVE</span>
                        </div>
                        <div className="grid grid-cols-12 gap-4 my-auto items-center">
                          <div className="col-span-7 space-y-2 text-left">
                            <span className="text-[8px] bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded text-violet-400 font-mono font-bold">MODEL v3.5-PRO</span>
                            <h4 className="text-sm font-extrabold text-white leading-tight">Optimización Predictiva en Tiempo Real</h4>
                            <p className="text-[9px] text-slate-400 leading-relaxed">Escala la eficiencia de tu infraestructura con modelos matemáticos avanzados de aprendizaje continuo.</p>
                          </div>
                          <div className="col-span-5 bg-black/40 border border-white/5 p-2 rounded-lg space-y-1.5 font-mono text-[8px] text-slate-400 text-left">
                            <div className="flex justify-between"><span>Latencia</span><span className="text-emerald-400 font-bold">4.2ms</span></div>
                            <div className="flex justify-between"><span>CPU</span><span className="text-violet-400 font-bold">22.4%</span></div>
                            <div className="flex justify-between"><span>Uso de RAM</span><span className="text-indigo-400 font-bold">1.8GB</span></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {showcaseWebsite === 'architects' && (
                      <div className="h-full flex flex-col justify-between">
                        <div className="flex justify-between items-center text-[10px] text-white uppercase tracking-widest font-semibold">
                          <span>Atrium Studio</span>
                          <span className="text-slate-500 font-light">Estepona // Ibiza</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 my-auto">
                          {[
                            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80',
                            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80',
                            'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=300&q=80'
                          ].map((url, i) => (
                            <div key={i} className="aspect-[4/3] rounded overflow-hidden bg-slate-900 border border-white/5 relative group">
                              <img src={url} alt="Villa" referrerPolicy="no-referrer" className="w-full h-full object-cover filter brightness-75 group-hover:brightness-100 transition-all" />
                              <span className="absolute bottom-1.5 left-1.5 text-[8px] text-white font-mono tracking-wider">PROYECTO 0{i+1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Device (Mockup 4 columns) */}
              <div className="md:col-span-4 space-y-2">
                <div className="flex items-center justify-between px-2 text-[9px] font-mono text-slate-500">
                  <span>MÓVIL (Mobile)</span>
                  <span className="text-violet-400">390 x 844px</span>
                </div>

                <div className="bg-[#05050f] border border-white/15 rounded-[2.5rem] p-2 aspect-[9/19] max-w-[200px] mx-auto shadow-2xl flex flex-col relative overflow-hidden">
                  {/* Speaker and Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-slate-950 rounded-full flex items-center justify-center gap-1.5 z-20">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                    <span className="w-4 h-1 bg-slate-800 rounded-full" />
                  </div>

                  {/* Screen viewport */}
                  <div className="flex-grow bg-slate-950 rounded-[2rem] overflow-hidden p-3 pt-6 flex flex-col justify-between relative">
                    {showcaseWebsite === 'luxury-store' && (
                      <div className="h-full flex flex-col justify-between">
                        <div className="flex justify-between items-center text-[8px] text-white font-bold tracking-wider">
                          <span>AURA</span>
                          <span className="text-slate-500 font-normal">☰ Menu</span>
                        </div>
                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-900 border border-white/5 my-2">
                          <img src="https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=250&q=80" alt="Cosmético" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <h4 className="text-[10px] font-extrabold text-white leading-tight">Esencia Orgánica</h4>
                          <p className="text-[8px] text-slate-400 leading-relaxed">Cuidado premium de la piel con ingredientes recolectados a mano.</p>
                          <button className="w-full py-1 bg-white text-[8px] text-slate-950 font-bold rounded">Comprar</button>
                        </div>
                      </div>
                    )}

                    {showcaseWebsite === 'tech-saas' && (
                      <div className="h-full flex flex-col justify-between">
                        <div className="flex justify-between items-center text-[8px] text-white font-mono">
                          <span>// ZEPHYR</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="space-y-1.5 text-left my-2">
                          <span className="text-[7px] bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded text-violet-400 font-mono">v3.5</span>
                          <h4 className="text-[10px] font-extrabold text-white leading-tight">Optimización Predictiva</h4>
                          <p className="text-[8px] text-slate-400 leading-relaxed">Modelos matemáticos dinámicos de aprendizaje continuo.</p>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-2 rounded-lg space-y-1.5 font-mono text-[7px] text-slate-400 text-left">
                          <div className="flex justify-between"><span>Latencia</span><span className="text-emerald-400 font-bold">4.2ms</span></div>
                          <div className="flex justify-between"><span>Uso CPU</span><span className="text-violet-400 font-bold">22.4%</span></div>
                        </div>
                      </div>
                    )}

                    {showcaseWebsite === 'architects' && (
                      <div className="h-full flex flex-col justify-between text-left">
                        <div className="flex justify-between items-center text-[8px] text-white uppercase tracking-widest font-semibold">
                          <span>Atrium</span>
                          <span className="text-slate-500">☰</span>
                        </div>
                        <div className="space-y-2 my-2">
                          <div className="aspect-[16/10] rounded overflow-hidden bg-slate-900 border border-white/5 relative">
                            <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=250&q=80" alt="Villa" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 text-[7px] text-white font-mono">CASA IBIZA</span>
                          </div>
                          <div className="aspect-[16/10] rounded overflow-hidden bg-slate-900 border border-white/5 relative">
                            <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=250&q=80" alt="Villa" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 text-[7px] text-white font-mono">VILLA ESTEPONA</span>
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-500 text-center font-mono">Deslizar para ver más</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* DETAILED SERVICES BLOCK */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="bg-black/40 border border-white/5 rounded-3xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden backdrop-blur-3xl"
        >
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-bold">Por qué nosotros</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Especialistas en Código Limpio y Rendimiento</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              No creemos en soluciones genéricas ni en plantillas prefabricadas. Analizamos en profundidad los objetivos de tu negocio para diseñar software de excelencia optimizado para dispositivos móviles y motores de búsqueda.
            </p>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
                <span>Desarrollo reactivo nativo con TypeScript</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
                <span>Políticas de protección RLS en bases de datos</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
                <span>Ecosistemas Web optimizados bajo estándares Core Web Vitals</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 bg-[#040409]/80 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-mono text-slate-400">Stack Tecnológico Principal</span>
              <span className="text-[9px] font-mono text-fuchsia-400 uppercase font-bold animate-pulse">100% Controlado</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['TypeScript', 'React / Next.js', 'Tailwind CSS', 'Supabase Cloud', 'PostgreSQL DB', 'D3.js & Motion', 'Node / Express', 'Stripe Payments', 'Vite Bundle Engine'].map((tech, idx) => (
                <motion.div 
                  whileHover={{ scale: 1.05, borderColor: "rgba(168, 85, 247, 0.35)", backgroundColor: "rgba(168, 85, 247, 0.05)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  key={idx} 
                  className="bg-black/45 border border-white/5 text-[11px] font-mono text-slate-350 p-2.5 rounded-lg flex items-center gap-2 cursor-default"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  <span>{tech}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* BOTTOM REAL INQUIRY FORM FOR CLIENTS - "Hablemos de tu Proyecto" */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          id="contacto" 
          className="max-w-2xl mx-auto w-full bg-[#050508] border border-white/5 rounded-3xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-3xl shadow-2xl hover:border-violet-900/45 transition-all duration-550"
        >
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
          
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Hablemos de tu Proyecto</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              Cuéntanos qué tienes en mente e impulsaremos tu presencia tecnológica con estándares sobresalientes.
            </p>
          </div>

          {isSubmitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-white">¡Solicitud Enviada con Éxito!</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Nuestro personal de ingeniería analizará los requerimientos técnicos y se pondrá en contacto contigo en las próximas 12 horas. ¡Gracias por confiar en Althera Solutions!
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-semibold">Tu Nombre</label>
                  <motion.input 
                    type="text" 
                    required
                    placeholder="Ej. Juan Pérez"
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    whileFocus={{ scale: 1.01, borderColor: "rgba(168, 85, 247, 0.45)" }}
                    className="w-full bg-[#020204] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-semibold">Correo Electrónico</label>
                  <motion.input 
                    type="email" 
                    required
                    placeholder="juan@empresa.com"
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
                    whileFocus={{ scale: 1.01, borderColor: "rgba(168, 85, 247, 0.45)" }}
                    className="w-full bg-[#020204] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-semibold">Cuéntanos sobre los requerimientos</label>
                <motion.textarea 
                  rows={4}
                  placeholder="Detalla tu idea o necesidades tecnológicas (ej. Web Corporativa, Panel de Administración, etc.)"
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  whileFocus={{ scale: 1.01, borderColor: "rgba(168, 85, 247, 0.45)" }}
                  className="w-full bg-[#020204] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-700 focus:outline-none transition-all resize-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 10px 20px -10px rgba(168, 85, 247, 0.4)" }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-xs text-white font-extrabold py-3 px-6 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enviar Solicitud</span>
                <Send className="w-3.5 h-3.5 text-white" />
              </motion.button>
            </form>
          )}

          {/* Explicit note clarify login access rules */}
          <div className="mt-8 border-t border-white/5 pt-5 text-center">
            <p className="text-[10px] text-slate-500 leading-relaxed font-light">
              🔐 <strong className="text-slate-450 font-medium">Nota de Seguridad:</strong> El acceso a nuestro panel de organización, notas, clientes y calendarios es estrictamente privado y exclusivo para el personal de <span className="text-violet-400 font-semibold font-sans">Althera</span>. Utilice únicamente el botón de <strong className="text-violet-400 font-mono">Portal de Equipo</strong> ubicado en el encabezado.
            </p>
          </div>

        </motion.section>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 bg-[#050505] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 flex items-center justify-center bg-black rounded p-0.5 border border-violet-500/20">
                <img src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" alt="A" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
              </div>
              <span className="text-[11px] font-semibold text-slate-450">Althera Solutions • Tecnología de Alta Costura</span>
            </div>
            {/* Added Acceso a Comerciales button */}
            <button 
              onClick={() => onNavigate('comerciales_acceso', 'push')}
              className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 font-bold transition duration-200 cursor-pointer p-1.5 px-3 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 border border-fuchsia-500/15 rounded-lg flex items-center gap-1 leading-none"
            >
              💼 <span>Acceso a Comerciales</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            © {new Date().getFullYear()} Althera Solutions. Reservados todos los derechos.
          </p>
        </div>
      </footer>

    </div>
  );
}
