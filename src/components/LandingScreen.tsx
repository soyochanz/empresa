import React, { useState } from 'react';
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
}

export default function LandingScreen({ onNavigate }: LandingScreenProps) {
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // High-fidelity real projects carried out by the digital boutique agency
  const [displayProjects] = useState(() => {
    const saved = localStorage.getItem('agency_projects_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter projects that are marked to show on landing page
          const activeOnLanding = parsed.filter(p => p.showOnLanding !== false);
          if (activeOnLanding.length > 0) {
            return activeOnLanding.map(p => ({
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
      } catch (e) {
        console.error("Error reading projects on landing page", e);
      }
    }
    return [
      {
        title: "NovaSaaS - IA Generativa de Siguiente Generación",
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
  });

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
    <div className="relative min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      
      {/* Dynamic Technological Grid Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-[0.14]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Modern Mesh Glow Orbs - Animate their floating/breathing behavior */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            x: [0, 20, -10, 0],
            y: [0, -30, 15, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[2%] left-[12%] w-[45%] h-[35%] bg-blue-600/15 rounded-full blur-[130px]" 
        />
        <motion.div 
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 40, -20, 0],
            scale: [1, 1.05, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[10%] right-[3%] w-[50%] h-[40%] bg-indigo-500/10 rounded-full blur-[160px]" 
        />
        <motion.div 
          animate={{
            x: [0, 15, -15, 0],
            y: [0, 20, -30, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[45%] left-[30%] w-[35%] h-[30%] bg-purple-600/10 rounded-full blur-[130px]" 
        />
      </div>

      {/* Dynamic Cyber Header - Animated Entrance */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Logo & Branding representing the Software/Web Development Studio */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-black border border-[#D4AF37]/25 flex items-center justify-center p-0.5">
              <img 
                src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" 
                alt="Althera Logo" 
                className="w-7 h-7 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-bold text-lg text-white font-sans tracking-tight uppercase">Althera <span className="gold-gradient-text font-light font-sans lowercase italic">Studio</span></span>
            </div>
          </motion.div>

          {/* Action triggers - Crucial note: Only Access to inside team tools is here */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.03, borderColor: "rgba(212, 175, 55, 0.3)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('acceso', 'push')}
              className="bg-slate-900 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-black/30"
              title="Acceso exclusivo del personal de desarrollo para administrar clientes, calendarios y de notas"
            >
              <Cpu className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>Portal de Equipo (Acceso Interno)</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </motion.button>
          </div>

        </div>
      </motion.header>

      {/* Main content body wrap */}
      <main className="relative z-10 flex-grow max-w-7xl mx-auto px-6 py-12 sm:py-20 flex flex-col gap-28">
        
        {/* HERO SECTION - Proudly representing the development agency, not a SaaS product */}
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
          className="text-center max-w-3.5xl mx-auto flex flex-col items-center gap-6"
        >
          
          {/* Accent micro badge */}
          <motion.div 
            variants={{
              hidden: { scale: 0.8, opacity: 0 },
              visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 100 } }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/[0.03] border border-[#D4AF37]/20 rounded-full text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-500" />
            <span>Código de Élite & Diseño Sofisticado</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            variants={{
              hidden: { y: 30, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
            }}
            className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-none"
          >
            Diseñamos y Programamos <br />
            <span className="bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-600 bg-clip-text text-transparent">
              Experiencias Digitales de Élite
            </span>
          </motion.h1>

          {/* "Que somos" - High precision agency description */}
          <motion.p 
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
            }}
            className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2.5xl font-sans font-light"
          >
            Somos <span className="text-white font-semibold flex-inline items-center gap-1"><span className="text-amber-500">Althera</span> Studio</span>, una boutique de desarrollo tecnológico de alta costura. Nos especializamos en materializar ideas ambiciosas transformándolas en 
            <span className="text-amber-400"> plataformas SaaS</span>, <span className="text-yellow-400">webs corporativas interactivas</span> y <span className="text-amber-300">paneles analíticos de alto rendimiento</span>. Centramos nuestros esfuerzos en construir código robusto estructurado en TypeScript, responsive en su totalidad y diseñado con un refinamiento visual impecable.
          </motion.p>

          {/* Call to action actionables */}
          <motion.div 
            variants={{
              hidden: { y: 15, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.6 } }
            }}
            className="flex flex-col sm:flex-row items-center gap-4 mt-4"
          >
            <motion.a
              whileHover={{ scale: 1.04, y: -2, boxShadow: "0 10px 25px -5px rgba(255, 255, 255, 0.15)" }}
              whileTap={{ scale: 0.98 }}
              href="#proyectos"
              className="w-full sm:w-auto bg-white text-slate-950 text-xs font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explorar Proyectos Llevados a Cabo</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.04, y: -2, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.3)" }}
              whileTap={{ scale: 0.98 }}
              href="#contacto"
              className="w-full sm:w-auto px-6 py-3 border border-white/10 bg-white/[0.02] rounded-xl text-slate-300 hover:text-white transition-all text-xs font-semibold text-center cursor-pointer"
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
                whileHover={{ y: -6, borderColor: "rgba(255, 255, 255, 0.15)", backgroundColor: "rgba(255, 255, 255, 0.04)" }}
                key={idx} 
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 transition-all backdrop-blur-3xl flex flex-col gap-3 group cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-all">
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
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-semibold block">Nuestra Galería de Código</span>
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
                    borderColor: "rgba(255, 255, 255, 0.12)",
                    boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.08)"
                  }}
                  className="group relative bg-[#060c1d] border border-white/5 p-5 sm:p-6 rounded-3xl transition-all duration-300 flex flex-col gap-5 overflow-hidden"
                >
                  
                  {/* High Quality Web Browser Mockup Frame enclosing real website image */}
                  <div className="relative w-full aspect-[16/10] bg-[#0c1328] rounded-2xl overflow-hidden border border-white/5 shadow-2xl flex flex-col">
                    
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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
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
                    <span className="text-[9px] font-mono text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2.5 py-1 rounded-full uppercase leading-none font-semibold">
                      {proj.category}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase leading-none font-semibold">
                      {proj.tag}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-2 flex-grow">
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 tracking-tight transition-colors">
                      {proj.title}
                    </h3>
                    <p className="text-slate-400 text-[12px] leading-relaxed font-light">
                      {proj.description}
                    </p>
                  </div>

                  {/* Tech stack badge alignments */}
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-4">
                    {proj.tech.map((t, tIdx) => (
                      <span key={tIdx} className="text-[9px] font-mono text-slate-500 bg-[#0c1224] border border-white/10 px-2.5 py-1 rounded">
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
          className="bg-slate-950/40 border border-white/5 rounded-3xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden backdrop-blur-3xl"
        >
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Por qué nosotros</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Especialistas en Código Limpio y Rendimiento</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              No creemos en soluciones genéricas ni en plantillas prefabricadas. Analizamos en profundidad los objetivos de tu negocio para diseñar software de excelencia optimizado para dispositivos móviles y motores de búsqueda.
            </p>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Desarrollo reactivo nativo con TypeScript</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Políticas de protección RLS en bases de datos</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Ecosistemas Web optimizados bajo estándares Core Web Vitals</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 bg-slate-900/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-mono text-slate-400">Stack Tecnológico Principal</span>
              <span className="text-[9px] font-mono text-blue-400 uppercase font-bold animate-pulse">100% Controlado</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['TypeScript', 'React / Next.js', 'Tailwind CSS', 'Supabase Cloud', 'PostgreSQL DB', 'D3.js & Motion', 'Node / Express', 'Stripe Payments', 'Vite Bundle Engine'].map((tech, idx) => (
                <motion.div 
                  whileHover={{ scale: 1.05, borderColor: "rgba(59, 130, 246, 0.3)", backgroundColor: "rgba(30, 41, 59, 0.4)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  key={idx} 
                  className="bg-slate-950 border border-white/5 text-[11px] font-mono text-slate-300 p-2.5 rounded-lg flex items-center gap-2 cursor-default"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
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
          className="max-w-2xl mx-auto w-full bg-[#080d22] border border-white/5 rounded-3xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-3xl shadow-xl hover:border-slate-800 transition-all duration-550"
        >
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          
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
                    whileFocus={{ scale: 1.01, borderColor: "rgba(212, 175, 55, 0.4)" }}
                    className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
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
                    whileFocus={{ scale: 1.01, borderColor: "rgba(212, 175, 55, 0.4)" }}
                    className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
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
                  whileFocus={{ scale: 1.01, borderColor: "rgba(212, 175, 55, 0.4)" }}
                  className="w-full bg-[#050505] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all resize-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 10px 20px -10px rgba(212, 175, 55, 0.4)" }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs text-black font-extrabold py-3 px-6 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enviar Solicitud</span>
                <Send className="w-3.5 h-3.5 text-black" />
              </motion.button>
            </form>
          )}

          {/* Explicit note clarify login access rules */}
          <div className="mt-8 border-t border-white/5 pt-5 text-center">
            <p className="text-[10px] text-slate-500 leading-relaxed font-light">
              🔐 <strong className="text-slate-400 font-medium">Nota de Seguridad:</strong> El acceso a nuestro panel de organización, notas, clientes y calendarios es estrictamente privado y exclusivo para el personal de <span className="text-[#D4AF37] font-semibold">Althera</span>. Utilice únicamente el botón de <strong className="text-amber-500 font-mono">Portal de Equipo</strong> ubicado en el encabezado.
            </p>
          </div>

        </motion.section>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 bg-[#050505] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 flex items-center justify-center bg-black rounded p-0.5 border border-amber-500/20">
                <img src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" alt="A" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
              </div>
              <span className="text-[11px] font-semibold text-slate-450">Althera Studio • Tecnología de Alta Costura</span>
            </div>
            {/* Added Acceso a Comerciales button */}
            <button 
              onClick={() => onNavigate('comerciales_acceso', 'push')}
              className="text-[11px] text-amber-500 hover:text-amber-400 font-bold transition duration-200 cursor-pointer p-1.5 px-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 rounded-lg flex items-center gap-1 leading-none"
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
