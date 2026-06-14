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
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingScreenProps {
  onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
  projects?: any[];
}

export default function LandingScreen({ onNavigate, projects }: LandingScreenProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // High-fidelity real projects carried out by the digital boutique agency
  const displayProjects = React.useMemo(() => {
    const rawProjects = (projects && projects.length > 0) ? projects : (() => {
      const saved = localStorage.getItem('agency_projects_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
      return [];
    })();

    if (rawProjects.length > 0) {
      // Filter projects that are marked to show on landing page
      const activeOnLanding = rawProjects.filter((p: any) => p.showOnLanding !== false);
      if (activeOnLanding.length > 0) {
        return activeOnLanding.map((p: any) => ({
          title: p.title,
          category: p.category,
          tag: p.status, // e.g. 'Completed', 'Beta Active'
          description: p.description,
          image: p.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          url: p.url,
          tech: [...(p.tools || []), ...(p.addons || [])].slice(0, 5) // combine tools and addons as tech
        }));
      }
    }

    return [
      {
        title: "NovaAI - IA Generativa de Siguiente Generación",
        category: "SaaS & Web App",
        tag: "Live Website",
        description: "Diseño minimalista premium para una plataforma internacional de inteligencia artificial. Rendimiento 100% en Lighthouse con micro-animaciones SVG, optimización máxima de SEO y pasarelas de pago automatizadas.",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        url: "novasaas.agencyflow.com",
        tech: ["React 19", "Vite", "Framer Motion", "Tailwind CSS"],
        color: "from-blue-500/20 to-indigo-500/20"
      },
      {
        title: "Luxor Estate - Buscador Inmobiliario Ultra-Lux",
        category: "Buscador & Luxury Portal",
        tag: "Live Project",
        description: "E-Commerce inmobiliario de alta gama con filtros reactivos fluidos, integración de mapas Vectoriales en 3D, carga ultra veloz de galerías HD y enrutamiento dinámico de agentes locales.",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
        url: "luxor.agencyflow.com",
        tech: ["Next.js", "Mapbox GL API", "PostgreSQL", "Tailwind"],
        color: "from-purple-500/20 to-pink-500/20"
      },
      {
        title: "VeloCity - E-Commerce de Bicicletas Eléctricas Custom",
        category: "Interactive E-Commerce",
        tag: "Completed",
        description: "Tienda online de lujo con representación interactiva del catálogo de bicicletas customizadas. Permite configurar componentes en tiempo real con recuento dinámico de precios y checkout seguro via Stripe.",
        image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
        url: "velocity.agencyflow.com",
        tech: ["TailwindCSS", "Stripe API", "Three.js Engine"],
        color: "from-emerald-500/20 to-teal-500/20"
      },
      {
        title: "Aether - Visualizador Analítico de Web3",
        category: "Fintech & Data Engine",
        tag: "Active Portal",
        description: "Panel de control criptográfico de alta seguridad que procesa millones de transacciones por segundo. Cuenta con gráficos interactivos construidos en D3.js y sincronización persistente vía WebSockets.",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
        url: "aether.agencyflow.com",
        tech: ["D3.js Core", "WebSockets", "Supabase DB", "Tailwind"],
        color: "from-amber-500/20 to-orange-500/20"
      }
    ];
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
      // 1. Double action: Save directly to Supabase via db helpers
      await db.insertInquiry(newInquiry);
    } catch (err) {
      console.warn("Got error saving inquiry to Supabase. Gracefully falling back to local storage backup:", err);
    } finally {
      // 2. Always persist a backup in localStorage in case Supabase schema is not built or network is spotty
      const localSaved = localStorage.getItem('agency_inquiries_local');
      const list: InquiryMessage[] = localSaved ? JSON.parse(localSaved) : [];
      list.push(newInquiry);
      localStorage.setItem('agency_inquiries_local', JSON.stringify(list));

      // Trigger standard cross-component notification
      window.dispatchEvent(new Event('local_inquiries_updated'));

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
            border-radius: 43% 57% 49% 51% / 46% 54% 46% 54%;
          }
          33% {
            transform: rotate(45deg) scale(1.04);
            border-radius: 52% 48% 58% 42% / 49% 51% 53% 47%;
          }
          66% {
            transform: rotate(115deg) scale(0.96);
            border-radius: 39% 61% 41% 59% / 42% 58% 38% 62%;
          }
          100% {
            transform: rotate(180deg) scale(1);
            border-radius: 43% 57% 49% 51% / 46% 54% 46% 54%;
          }
        }
      `}</style>

      {/* Modern High-Precision 3D Topographic Wave Relief backdrop that animates with window scroll */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        
        {/* Deep organic topographic container */}
        <div className="absolute right-[-10%] top-[-10%] lg:right-[-5%] lg:top-[5%] w-[120%] lg:w-[60%] aspect-square flex items-center justify-center opacity-85 z-0">
          <motion.div
            style={{
              scale: 1 + scrollY * 0.0004,
              rotate: scrollY * 0.04,
              y: scrollY * 0.1,
            }}
            className="relative w-[100%] h-[100%] max-w-[850px] max-h-[850px] transition-transform duration-75 ease"
          >
            {/* Concentric layered wave paths resembling the black topographic wavy landscape of the image */}
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: `${100 - i * 5}%`,
                  height: `${100 - i * 5}%`,
                  borderWidth: '1.5px',
                  borderColor: i % 3 === 0 ? 'rgba(168, 85, 247, 0.22)' : 'rgba(244, 63, 94, 0.08)', // Interactive purple vs rose border lines
                  boxShadow: 'inset 0 0 25px rgba(0,0,0,0.95), 0 0 15px rgba(168, 85, 247, 0.01)',
                  animation: `spinAndWarpTopography ${14 + i * 1.5}s infinite linear alternate`,
                }}
                className="absolute bg-[#020204]/70 backdrop-blur-[0.5px]"
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
                Althera <span className="font-light italic lowercase text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400">studio</span>
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
            Somos <span className="text-white font-semibold flex-inline items-center gap-1"><span className="text-violet-400">Althera</span> Studio</span>, una boutique de desarrollo tecnológico de alta costura. Diseñamos y programamos <span className="text-violet-300">plataformas SaaS de alto flujo</span>, <span className="text-fuchsia-300">sistemas interactivos a medida</span> y <span className="text-rose-300">paneles analíticos soberbios</span>. Centramos cada píxel en escribir código limpio estructurado en TypeScript, adaptativo en su totalidad y diseñado con un refinamiento visual absoluto.
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

        {/* PORTFOLIO / PROJECTS SECTION: "que proyectos hemos llevado a cabo" con imágenes reales */}
        <section id="proyectos" className="space-y-12 scroll-mt-24">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-semibold block">Nuestra Galería de Código</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Proyectos Levados a Cabo</h2>
            </div>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed font-light">
              Desarrollamos soluciones digitales que aúnan estética ultra-moderna y flujos lógicos eficientes bajo estándares de ingeniería excepcionales.
            </p>
          </motion.div>

          {/* Grid list of detailed elite projects with visual browser mockups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {displayProjects.map((proj, idx) => {
              return (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  whileHover={{ 
                    y: -10, 
                    borderColor: "rgba(168, 85, 247, 0.25)",
                    boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.1)"
                  }}
                  className="group relative bg-[#040409]/90 border border-white/5 p-5 sm:p-6 rounded-3xl transition-all duration-300 flex flex-col gap-5 overflow-hidden"
                >
                  
                  {/* High Quality Web Browser Mockup Frame enclosing real website image */}
                  <div className="relative w-full aspect-[16/10] bg-[#07070f] rounded-2xl overflow-hidden border border-white/5 shadow-2xl flex flex-col">
                    
                    {/* Browser Header Bar */}
                    <div className="h-8 bg-slate-950/80 border-b border-white/5 px-4 flex items-center justify-between flex-shrink-0">
                      {/* Left: Window Dots */}
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] opacity-80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] opacity-80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] opacity-80" />
                      </div>
                      
                      {/* Center: Address Bar */}
                      <div className="bg-slate-900 border border-white/5 text-[9px] text-slate-500 font-mono text-center rounded-lg py-0.5 px-6 truncate max-w-[190px] select-none flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 inline-block animate-pulse" />
                        <span>https://{proj.url}</span>
                      </div>
                      
                      {/* Right Layout Item */}
                      <div className="w-12 h-1 px-1 flex justify-end">
                        <ExternalLink className="w-3 h-3 text-slate-600" />
                      </div>
                    </div>

                    {/* Web Preview Screen */}
                    <div className="relative flex-grow overflow-hidden bg-slate-950">
                      <motion.img 
                        src={proj.image} 
                        alt={proj.title}
                        referrerPolicy="no-referrer"
                        whileHover={{ scale: 1.06 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full h-full object-cover object-top filter contrast-[1.05] brightness-[0.9] transition-transform duration-500 ease-out"
                      />
                      {/* Visual Gradient Mesh Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                    </div>

                  </div>

                  {/* Info Meta Row */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] font-mono text-violet-400 bg-violet-500/5 border border-violet-500/10 px-2.5 py-1 rounded-full uppercase leading-none font-semibold">
                      {proj.category}
                    </span>
                    <span className="text-[9px] font-mono text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 px-2 py-0.5 rounded-full uppercase leading-none font-semibold">
                      {proj.tag}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-2 flex-grow">
                    <h3 className="text-base font-bold text-white group-hover:text-violet-400 tracking-tight transition-colors">
                      {proj.title}
                    </h3>
                    <p className="text-slate-400 text-[12px] leading-relaxed font-light">
                      {proj.description}
                    </p>
                  </div>

                  {/* Tech stack badge alignments */}
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-4">
                    {proj.tech.map((t, tIdx) => (
                      <span key={tIdx} className="text-[9px] font-mono text-slate-500 bg-[#070711] border border-white/10 px-2.5 py-1 rounded">
                        {t}
                      </span>
                    ))}
                  </div>

                </motion.div>
              );
            })}
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
                Nuestro personal de ingeniería analizará los requerimientos técnicos y se pondrá en contacto contigo en las próximas 12 horas. ¡Gracias por confiar en Althera Studio!
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
              <span className="text-[11px] font-semibold text-slate-450">Althera Studio • Tecnología de Alta Costura</span>
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
            © {new Date().getFullYear()} Althera Studio. Reservados todos los derechos.
          </p>
        </div>
      </footer>

    </div>
  );
}
