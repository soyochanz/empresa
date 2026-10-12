import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight, ArrowRight, Check, Globe2, Menu, X, Search, Target, Code2, Sparkles, Plus } from 'lucide-react';
import { InquiryMessage, PartnerCompany, Screen } from '../types';
import { db } from '../supabaseClient';
import { trackWebsiteEvent } from '../utils/webAnalytics';
import './LandingScreen.css';

interface LandingScreenProps {
  onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
  projects?: any[];
  partners?: PartnerCompany[];
}
const services = [
  { title: 'Una web que vende.', label: 'Diseño y desarrollo web', icon: Globe2, text: 'Tu mejor comercial, disponible siempre. Una web rápida, fácil de usar y diseñada para convertir visitas en consultas.', items: ['Diseño a medida', 'Experiencia móvil', 'Optimización de conversión'] },
  { title: 'Que te encuentren.', label: 'Posicionamiento SEO', icon: Search, text: 'Aparece cuando tus clientes buscan lo que ofreces. SEO técnico, contenido útil y estrategia local con una base sólida.', items: ['Auditoría y estrategia', 'SEO local y contenidos', 'Seguimiento y mejora'] },
  { title: 'Anuncios con dirección.', label: 'Meta Ads · Instagram y Facebook', icon: Target, text: 'Campañas orientadas al rendimiento: conectamos estrategia, audiencias, creatividad y medición para optimizar tu inversión.', items: ['Estrategia de captación', 'Creatividades y pruebas', 'Análisis de conversiones'] },
  { title: 'Tu idea, hecha producto.', label: 'Apps, software y automatización', icon: Code2, text: 'Creamos herramientas que resuelven problemas reales. Desde tu propia plataforma hasta los procesos que tu equipo necesita simplificar.', items: ['Aplicaciones y SaaS', 'Integraciones', 'Automatización de procesos'] },
];
const stages = [
  ['Te escuchamos.', 'Entendemos tu negocio, a tus clientes y lo que quieres conseguir.'],
  ['Trazamos el plan.', 'Una propuesta clara: alcance, prioridades y próximos pasos.'],
  ['Lo hacemos realidad.', 'Diseñamos, construimos y lanzamos contigo en cada etapa.'],
  ['Seguimos mejorando.', 'Medimos lo que importa y ajustamos para avanzar.'],
];
const safeUrl = (value?: string) => {
  if (!value?.trim()) return undefined;
  try { const url = new URL(value.startsWith('/') ? value : /^https?:\/\//i.test(value) ? value : `https://${value}`, window.location.origin); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
};
function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string; key?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={{ duration: .65, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}
export default function LandingScreen({ onNavigate, projects, partners = [] }: LandingScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [interest, setInterest] = useState('Web y diseño');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const hero = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] });
  const parallax = useTransform(scrollYProgress, [0, 1], [0, 110]);
  useEffect(() => { trackWebsiteEvent('page_view'); }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, []);
  const work = useMemo(() => (projects || []).filter(project => project.showOnLanding !== false).slice(0, 6), [projects]);
  const submitInquiry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim() || sending) return;
    setSending(true); setError('');
    const inquiry: InquiryMessage = { id: `inq_${crypto.randomUUID()}`, name: name.trim(), email: email.trim(), message: `[${interest}] ${message.trim()}`, archived: false, created_at: new Date().toISOString() };
    try { await db.insertInquiry(inquiry); setSent(true); setName(''); setEmail(''); setMessage(''); }
    catch { setError('No hemos podido enviar tu mensaje. Inténtalo de nuevo o escríbenos a contact@altherasolutions.com.'); }
    finally { setSending(false); }
  };
  const closeMenu = () => setMenuOpen(false);
  return <div className="althera-landing landing-v2">
    <a className="lp-skip" href="#contenido">Saltar al contenido</a>
    <header className="lp-header">
      <a className="lp-brand" href="#inicio" onClick={closeMenu}><img src="/althera-logo-transparent.png" alt="" /><span>althera<span className="lp-brand-sub">SOLUTIONS</span></span></a>
      <nav aria-label="Navegación principal" className="lp-desktop-nav"><a href="#servicios">Servicios</a><a href="#proyectos">Proyectos</a><a href="#estudio">Así trabajamos</a></nav>
      <a className="lp-button lp-small lp-header-cta" href="#contacto">Hablemos <ArrowUpRight size={17} /></a>
      <button className="lp-menu-toggle" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="lp-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      {menuOpen && <nav id="lp-mobile-nav" className="lp-mobile-nav" aria-label="Navegación móvil">{[['Servicios', '#servicios'], ['Proyectos', '#proyectos'], ['Así trabajamos', '#estudio'], ['Hablemos', '#contacto']].map(([label, href]) => <a key={href} href={href} onClick={closeMenu}>{label}<ArrowUpRight size={20} /></a>)}</nav>}
    </header>
    <main id="contenido">
      <section id="inicio" ref={hero} className="lp-hero lp-wrap">
        <Reveal className="lp-hero-copy"><p className="lp-eyebrow"><span className="lp-dot" /> ESTRATEGIA. DISEÑO. CRECIMIENTO.</p><h1>Tu próximo<br />cliente empieza<br /><em>aquí.</em></h1><p className="lp-intro">Hacemos que te encuentren, te elijan y vuelvan.<br className="lp-desktop-break" /> Web, SEO y publicidad digital conectados con un objetivo: hacer crecer tu negocio.</p><div className="lp-actions"><a className="lp-button" href="#contacto">Hablemos de tu negocio <ArrowUpRight size={20} /></a><a className="lp-text-link" href="#proyectos">Explora nuestros proyectos <ArrowRight size={17} /></a></div><p className="lp-hero-note">Un equipo. De la estrategia al lanzamiento.</p></Reveal>
        <motion.div style={{ y: reduced ? 0 : parallax }} className="lp-hero-art" aria-hidden="true"><div className="lp-orbit lp-orbit-one" /><div className="lp-orbit lp-orbit-two" /><div className="lp-orbit lp-orbit-three" /><div className="lp-art-center"><img src="/althera-logo-transparent.png" alt="" /></div><span className="lp-art-label lp-art-top"><span /> Diseño que conecta</span><span className="lp-art-label lp-art-bottom"><ArrowUpRight size={19} /> Estrategia que mueve</span><span className="lp-art-caption">IDEAS → IMPACTO</span><div className="lp-art-cross">+</div></motion.div>
        <div className="lp-hero-bottom"><span>TECNOLOGÍA CON PROPÓSITO.</span><a href="#servicios">Descubre lo que podemos hacer <span>↓</span></a></div>
      </section>
      <section id="servicios" className="lp-light lp-section"><div className="lp-wrap"><Reveal className="lp-section-heading"><div><p className="lp-eyebrow">01 / LO QUE HACEMOS</p><h2>Menos complicaciones.<br /><span>Más oportunidades.</span></h2></div><p>No necesitas hacerlo todo. Necesitas que lo importante funcione. Elegimos contigo las acciones que tienen sentido para tu negocio.</p></Reveal><div className="lp-services">{services.map((service, index) => <Reveal key={service.title}><article className="lp-service"><div className="lp-service-top"><service.icon size={27} strokeWidth={1.4} /><span>0{index + 1}</span></div><p className="lp-service-label">{service.label}</p><h3>{service.title}</h3><p>{service.text}</p><ul>{service.items.map(item => <li key={item}><Plus size={13} />{item}</li>)}</ul><a href="#contacto" className="lp-service-link" aria-label={`Hablemos de ${service.label}`}>Lo quiero para mi negocio <ArrowUpRight size={19} /></a></article></Reveal>)}</div><Reveal className="lp-social-note"><span><Sparkles size={22} /> También cuidamos tu marca en redes.</span><p>Estrategia de contenido, creatividad y gestión de redes sociales para una presencia coherente.</p><a href="#contacto" aria-label="Consultar gestión de redes sociales"><ArrowUpRight /></a></Reveal></div></section>
      <section id="proyectos" className="lp-section lp-work"><div className="lp-wrap"><Reveal className="lp-section-heading"><div><p className="lp-eyebrow">02 / HECHO POR ALTHERA</p><h2>Las ideas están bien.<br /><span>Hacerlas realidad, mejor.</span></h2></div><p>También construimos nuestros propios productos. La misma atención al diseño y al detalle que ponemos en cada proyecto de cliente.</p></Reveal>
        <div className="lp-products"><Reveal className="lp-product lp-product-bites"><div className="lp-product-visual lp-bites-visual"><img src="/bites-logo.png" alt="Bites" /><div className="lp-menu-preview" aria-hidden="true"><span>LA CARTA, A TU MANERA</span><div><i /><div><b>Para compartir</b><small>Descubre nuestros platos</small></div><ArrowUpRight size={20} /></div><div><i /><div><b>El plato que te apetece</b><small>Todo empieza con un vistazo</small></div><ArrowUpRight size={20} /></div><p>Una experiencia digital en cada mesa.</p></div></div><div className="lp-product-copy"><p className="lp-eyebrow">HOSTELERÍA / PRODUCTO DIGITAL</p><h3>Bites<span>La carta tiene una nueva forma.</span></h3><p>Cartas digitales para restaurantes. Una forma sencilla de presentar lo que hace especial a cada local.</p><a className="lp-text-link" href="#contacto" onClick={() => setInterest('Bites')}>Quiero conocer Bites <ArrowUpRight size={19} /></a></div></Reveal>
        <Reveal className="lp-product lp-product-insta"><div className="lp-product-visual lp-insta-visual"><span className="lp-insta-wordmark"><Sparkles size={28} /> InstaRemove<span>AI</span></span><div className="lp-file-stack" aria-hidden="true"><div className="lp-file-back" /><div className="lp-file-front"><Sparkles size={45} strokeWidth={1} /><span>Tu contenido.<br /><b>Listo para compartir.</b></span><span className="lp-file-chip"><Check size={12} /> Menos metadatos</span></div></div></div><div className="lp-product-copy"><p className="lp-eyebrow">HERRAMIENTAS / CONTENIDO DIGITAL</p><h3>InstaRemoveAI<span>Un paso menos antes de publicar.</span></h3><p>Prepara tus imágenes y elimina información de IA incrustada en los archivos antes de compartirlos en Instagram.</p><a className="lp-text-link" href="https://instaremoveai.com/" target="_blank" rel="noopener noreferrer">Explorar la herramienta <ArrowUpRight size={19} /></a></div></Reveal></div>
        {work.length > 0 && <div className="lp-client-projects">{work.map(project => <Reveal key={project.id}><article className="lp-client-project">{project.image && <img src={project.image} alt={`Proyecto ${project.title}`} loading="lazy" />}<div><p className="lp-eyebrow">{project.category || 'DISEÑO Y DESARROLLO'}</p><h3>{project.title}</h3><p>{project.description || project.detailText}</p>{safeUrl(project.url) && <a className="lp-text-link" href={safeUrl(project.url)} target="_blank" rel="noopener noreferrer">Ver proyecto <ArrowUpRight size={18} /></a>}</div></article></Reveal>)}</div>}
        <Reveal className="lp-platform lp-kapsely"><div className="lp-kapsely-icon" aria-hidden="true">K</div><div><p className="lp-eyebrow">APPS / IOS</p><h3>Kapsely</h3><p>Cápsulas digitales para guardar, compartir y revivir los momentos que importan. Otra idea de Althera que ya puedes llevar contigo.</p></div><a href="https://apps.apple.com/es/app/kapsely/id6759984193" target="_blank" rel="noopener noreferrer" className="lp-text-link">Descubrir en App Store <ArrowUpRight size={20} /></a></Reveal>
        <Reveal className="lp-platform"><div className="lp-platform-mark"><img src="/althera-logo-transparent.png" alt="" /></div><div><p className="lp-eyebrow">DETRÁS DE NUESTRO DÍA A DÍA</p><h3>Althera OS</h3><p>Nuestro propio sistema para conectar CRM, finanzas, equipo y analítica. Construimos la tecnología que también usamos.</p></div><a href="#contacto" className="lp-text-link">Crea tu propia herramienta <ArrowUpRight size={20} /></a></Reveal>
        {partners.length > 0 && <div className="lp-partners"><p className="lp-eyebrow">MARCAS CON LAS QUE COLABORAMOS</p><div>{partners.map(partner => <img key={partner.id} src={partner.logoUrl} alt={partner.name} loading="lazy" />)}</div></div>}
      </div></section>
      <section id="estudio" className="lp-light lp-section"><div className="lp-wrap"><Reveal className="lp-section-heading"><div><p className="lp-eyebrow">03 / CERCA DE TU NEGOCIO</p><h2>Un buen proyecto<br />empieza <span>escuchando.</span></h2></div><p>Althera une estrategia, diseño y tecnología. Hablamos claro, cuidamos los detalles y trabajamos contigo para convertir una necesidad en una solución útil.</p></Reveal><div className="lp-stages">{stages.map(([title, text], index) => <Reveal key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></Reveal>)}</div></div></section>
      <section id="contacto" className="lp-section lp-contact"><div className="lp-wrap lp-contact-grid"><Reveal><p className="lp-eyebrow">EL SIGUIENTE PASO</p><h2>¿Qué hacemos<br /><em>crecer juntos?</em></h2><p>Cuéntanos dónde estás y dónde quieres llegar. Empezamos con una conversación, sin compromiso.</p><a className="lp-contact-email" href="mailto:contact@altherasolutions.com">contact@altherasolutions.com <ArrowUpRight size={18} /></a></Reveal><Reveal>{sent ? <div className="lp-success" role="status"><Check size={36} /><h3>Ya tenemos tu mensaje.</h3><p>Gracias por contarnos tu idea. Te contactaremos en el correo que nos has indicado.</p><button className="lp-text-link" onClick={() => setSent(false)}>Enviar otro mensaje <ArrowRight size={18} /></button></div> : <form onSubmit={submitInquiry} className="lp-form"><div className="lp-form-row"><label>Tu nombre<input required autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="¿Cómo te llamas?" /></label><label>Email de contacto<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="hola@tuempresa.com" /></label></div><label>¿En qué podemos ayudarte?<select value={interest} onChange={event => setInterest(event.target.value)}>{['Web y diseño', 'SEO y posicionamiento', 'Campañas Meta Ads', 'Redes sociales', 'Apps y automatización', 'Bites', 'Tengo otra idea'].map(option => <option key={option}>{option}</option>)}</select></label><label>Cuéntanos un poco más<textarea required rows={3} value={message} onChange={event => setMessage(event.target.value)} placeholder="Tu negocio, tu idea o ese reto que quieres resolver…" /></label><p className="lp-form-note">Usaremos estos datos para atender tu consulta. Puedes escribirnos al correo de contacto para solicitar su eliminación.</p>{error && <p role="alert" className="lp-form-error">{error}</p>}<button className="lp-button" disabled={sending}>{sending ? 'Enviando…' : 'Empecemos la conversación'}<ArrowUpRight size={20} /></button></form>}</Reveal></div></section>
    </main>
    <footer className="lp-footer"><div className="lp-wrap"><div className="lp-footer-top"><a href="#inicio" className="lp-brand"><img src="/althera-logo-transparent.png" alt="" /><span>althera<span className="lp-brand-sub">SOLUTIONS</span></span></a><p>Buenas ideas.<br />Mejores posibilidades.</p><button onClick={() => onNavigate('portal', 'push')}>Área privada <ArrowUpRight size={15} /></button></div><div className="lp-footer-bottom"><p>© {new Date().getFullYear()} Althera Solutions - F.Z.C<br /><span>Licencia y registro n.º 58295 · Ajman Free Zone, Emiratos Árabes Unidos</span><br /><span>Office - C1 - 1F - SF3035 · Ajman Free Zone C1 Building</span></p><a href="mailto:contact@altherasolutions.com">contact@altherasolutions.com</a><a href="#inicio">Volver arriba ↑</a></div></div></footer>
  </div>;
}
