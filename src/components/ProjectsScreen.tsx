import React, { useState } from 'react';
import { Screen, ClientContact, PartnerCompany } from '../types';
import { 
 Plus, 
 Search, 
 ExternalLink, 
 Layers, 
 Cpu, 
 FolderPlus, 
 TrendingUp, 
 ShieldCheck, 
 Code, 
 Info, 
 Edit3, 
 Trash2, 
 Sparkles, 
 Laptop, 
 AlertCircle, 
 Check, 
 Globe, 
 Link, 
 Layers2, 
 Gauge, 
 X,
 Eye,
 Settings,
 Upload
} from 'lucide-react';

export interface AgencyProject {
 id: string;
 title: string;
 category: string;
 clientName: string;
 clientContactId?: string; // Links back to CRM contact
 description: string;
 detailText?: string;
 performanceScore: number; // e.g. 98
 seoScore: number; // e.g. 100
 image: string;
 url: string;
 tools: string[]; // e.g. ['React 19', 'Vite', 'Tailwind', 'Next.js']
 addons: string[]; // e.g. ['Stripe', 'Mapbox API', 'Three.js Core']
 status: 'In Development' | 'Completed' | 'Beta Active';
 showOnLanding?: boolean;
}

interface ProjectsScreenProps {
 contacts: ClientContact[];
 onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
 projects: AgencyProject[];
 onAddProject: (newProj: AgencyProject) => void;
 onUpdateProject: (updatedProj: AgencyProject) => void;
 onDeleteProject: (id: string) => void;
 partners: PartnerCompany[];
 onUpsertPartner: (partner: PartnerCompany) => void;
 onDeletePartner: (id: string) => void;
}

export const INITIAL_PROJECTS: AgencyProject[] = [
 {
 id: 'p1',
 title: "NovaAI - IA Generativa de Siguiente Generación",
 category: "SaaS",
 clientName: "Marcus Chen",
 clientContactId: "c2", // Marcus Chen CRM ID
 description: "Diseño minimalista premium para una plataforma de aprendizaje y síntesis inteligente. Rendimiento del 100% verificado en Lighthouse.",
 detailText: "Integra generación de imágenes mediante modelos por lotes, pasarela de pago recurrente mediante suscripciones y panel de consumo para créditos de API.",
 performanceScore: 99,
 seoScore: 100,
 image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
 url: "novasaas.agencyflow.com",
 tools: ["React 19", "Vite", "Framer Motion", "Tailwind CSS"],
 addons: ["Gemini API Proxy", "Stripe Subscription Billing", "Resend Transactional Mailer"],
 status: "Completed",
 showOnLanding: true
 },
 {
 id: 'p2',
 title: "Luxor Estate - Buscador Inmobiliario Ultra-Lux",
 category: "Luxury Portals",
 clientName: "Sarah Miller",
 clientContactId: "c1", // Sarah Miller CRM ID
 description: "Portal premium inmobiliario con visualización de mapas fluidos interactivos e indexado dinámico SEO.",
 detailText: "Implementa mapas vectoriales interactivos con agrupamiento de pines por proximidad geográfica, vistas urbanas de realidad aumentada simulada y alertas de ofertas vía SMS.",
 performanceScore: 97,
 seoScore: 98,
 image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
 url: "luxor.agencyflow.com",
 tools: ["Next.js", "PostgreSQL Core", "Tailwind CSS"],
 addons: ["Mapbox Vector GL API", "Supabase Storage Rules", "Twilio Notify Engine"],
 status: "Beta Active",
 showOnLanding: true
 },
 {
 id: 'p3',
 title: "VeloCity - Configurador Custom de Bicicletas Eléctricas",
 category: "E-Commerce",
 clientName: "David Lee",
 clientContactId: "c3", // David Lee CRM ID
 description: "E-commerce de lujo con visualizadores de bicicletas customizadas en tiempo real que optimiza conversiones.",
 detailText: "Módulo interactivo que permite al cliente modificar la amortiguación, llantas y cuadro de la bicicleta con actualización dinámica en el importe final.",
 performanceScore: 94,
 seoScore: 95,
 image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
 url: "velocity.agencyflow.com",
 tools: ["TailwindCSS", "Three.js Canvas", "Vite bundle"],
 addons: ["Stripe Checkout V4", "Dampening Mechanics Physics Framework", "Mailgun SMS Integration"],
 status: "Completed",
 showOnLanding: true
 },
 {
 id: 'p4',
 title: "Aether - Web3 Token Analytics Engine",
 category: "Fintech",
 clientName: "Stratus Corp Ltd",
 description: "Visualizador analítico financiero de alta velocidad con refresco instantáneo por canales socket.",
 detailText: "Dibuja gráficos polares complejos e históricos de transacciones globales minando datos alternativos de la cadena mediante conectores WebSockets.",
 performanceScore: 96,
 seoScore: 93,
 image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
 url: "aether.agencyflow.com",
 tools: ["D3.js Visualization Engine", "TypeScript Native", "WebSockets"],
 addons: ["Real-time Crypstats WebSockets", "Secure RLS Row Level Policy", "Auth0 OAuth Integration"],
 status: "In Development",
 showOnLanding: true
 },
 {
 id: 'p5',
 title: "Apex Logistics - Monitor de Flotas en Tiempo Real",
 category: "SaaS",
 clientName: "Carlos Alcaraz",
 description: "Plataforma premium para el rastreo y despacho inteligente de cargamentos aéreos y terrestres.",
 detailText: "Optimiza rutas logísticas usando algoritmos avanzados, integra telemetría satelital y automatiza el estado de entrega en la cadena de distribución global.",
 performanceScore: 98,
 seoScore: 99,
 image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
 url: "apex.agencyflow.com",
 tools: ["React", "TypeScript", "Tailwind CSS"],
 addons: ["Routes API Optimization", "Firebase Telemetry Backend", "Core Web Vitals Engine"],
 status: "Completed",
 showOnLanding: true
 },
 {
 id: 'p6',
 title: "Chronos Haute Horlogerie - Atelier Boutique",
 category: "Luxury Portals",
 clientName: "Elise Laurent",
 description: "Expositor digital boutique inmersivo para firmas de alta relojería suiza con configurador interactivo.",
 detailText: "Diseño con tipografía serif sofisticada, galerías 3D de alta definición, transiciones fluidas de scroll y sistema privado para reserva de citas en tienda física.",
 performanceScore: 100,
 seoScore: 100,
 image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
 url: "chronos.agencyflow.com",
 tools: ["Vite", "Motion Layout", "Tailwind CSS"],
 addons: ["3D Render Engine", "Resend Booking System", "Stripe Private Deposit"],
 status: "Completed",
 showOnLanding: true
 },
 {
 id: 'p7',
 title: "L'Atelier Organics - Headless E-Commerce",
 category: "E-Commerce",
 clientName: "Sophia Dubois",
 description: "Tienda online premium con carga instantánea y pasarela simplificada optimizada para conversiones móviles.",
 detailText: "Buscador instantáneo integrado con autocompletado inteligente, carrito persistente reactivo, compras seguras en un clic y diseño visual minimalista de alta calidad.",
 performanceScore: 99,
 seoScore: 99,
 image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
 url: "latelier.agencyflow.com",
 tools: ["React", "TypeScript", "Tailwind CSS"],
 addons: ["Shopify Headless Storefront API", "Stripe Checkout", "Resend SMS Notifications"],
 status: "Completed",
 showOnLanding: true
 },
 {
 id: 'p8',
 title: "Krypton Analytics - Panel de Control Cloud SRE",
 category: "SaaS",
 clientName: "SRE Team Leader",
 description: "Monitor inteligente de infraestructuras multinube con alertas predictivas impulsadas por aprendizaje automático.",
 detailText: "Dibuja mapas de dependencias de servicios con métricas avanzadas de latencia y uso de recursos, permitiendo configurar alertas instantáneas automáticas.",
 performanceScore: 97,
 seoScore: 96,
 image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
 url: "krypton.agencyflow.com",
 tools: ["React", "TypeScript", "Tailwind CSS"],
 addons: ["Metrics API Connector", "Gemini Alert Classifier", "Socket.io Streams"],
 status: "Beta Active",
 showOnLanding: true
 }
];

export default function ProjectsScreen({
 contacts,
 onNavigate,
 projects,
 onAddProject,
 onUpdateProject,
 onDeleteProject,
 partners,
 onUpsertPartner,
 onDeletePartner
}: ProjectsScreenProps) {
 // Search and filter states
 const [selectedCategory, setSelectedCategory] = useState<string>('All');
 const [searchQuery, setSearchQuery] = useState<string>('');
 
 // Selected project for detailed side/modal viewing
 const [selectedProjectId, setSelectedProjectId] = useState<string>('p1');
 
 // Add/Edit project state modal
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [isEditMode, setIsEditMode] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);

 // Form controls
 const [formTitle, setFormTitle] = useState('');
 const [formCategory, setFormCategory] = useState('SaaS');
 const [formClientContactId, setFormClientContactId] = useState('');
 const [formDescription, setFormDescription] = useState('');
 const [formDetailText, setFormDetailText] = useState('');
 const [formPerfScore, setFormPerfScore] = useState<number>(98);
 const [formSeoScore, setFormSeoScore] = useState<number>(99);
 const [formImage, setFormImage] = useState('');
 const [formUrl, setFormUrl] = useState('');
 const [formToolsMsg, setFormToolsMsg] = useState('React 19, Vite, Tailwind CSS');
 const [formAddonsMsg, setFormAddonsMsg] = useState('Stripe Payment, Framer Motion');
 const [formStatus, setFormStatus] = useState<'In Development' | 'Completed' | 'Beta Active'>('Completed');
 const [formShowOnLanding, setFormShowOnLanding] = useState<boolean>(true);
 const [partnerName, setPartnerName] = useState('');
 const [partnerLogo, setPartnerLogo] = useState('');
 const [partnerWebsite, setPartnerWebsite] = useState('');
 const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);

 const categories = ['All', 'SaaS', 'Luxury Portals', 'E-Commerce', 'Fintech'];

 const resetPartnerForm = () => {
  setPartnerName('');
  setPartnerLogo('');
  setPartnerWebsite('');
  setEditingPartnerId(null);
 };

 const handleSavePartner = (event: React.FormEvent) => {
  event.preventDefault();
  if (!partnerName.trim() || !partnerLogo.trim()) return;
  onUpsertPartner({
   id: editingPartnerId || `partner_${Date.now().toString(36)}`,
   name: partnerName.trim(),
   logoUrl: partnerLogo.trim(),
   website: partnerWebsite.trim() || undefined,
   created_at: new Date().toISOString()
  });
  resetPartnerForm();
 };

 const handleEditPartner = (partner: PartnerCompany) => {
  setEditingPartnerId(partner.id);
  setPartnerName(partner.name);
  setPartnerLogo(partner.logoUrl);
  setPartnerWebsite(partner.website || '');
 };

 const handlePartnerLogoUpload = (file?: File) => {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
   window.alert('El logo no puede superar los 2 MB. Usa preferiblemente SVG, PNG o WebP.');
   return;
  }
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' && setPartnerLogo(reader.result);
  reader.readAsDataURL(file);
 };

 const filteredProjects = projects.filter(project => {
 const matchesCategory = selectedCategory === 'All' || project.category.toLowerCase().includes(selectedCategory.toLowerCase());
 const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
       project.tools.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
       project.addons.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
 return matchesCategory && matchesSearch;
 });

 const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];

 const toggleShowOnLanding = (id: string, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 const match = projects.find(p => p.id === id);
 if (match) {
  const currentVal = match.showOnLanding !== false;
  onUpdateProject({ ...match, showOnLanding: !currentVal });
 }
 };

 const handleOpenAddModal = () => {
 setIsEditMode(false);
 setEditingId(null);
 setFormTitle('');
 setFormCategory('SaaS');
 setFormClientContactId('');
 setFormDescription('');
 setFormDetailText('');
 setFormPerfScore(95);
 setFormSeoScore(96);
 setFormImage('https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80');
 setFormUrl('demo.agencyflow.com');
 setFormToolsMsg('React, Tailwind');
 setFormAddonsMsg('OAuth, Stripe');
 setFormStatus('In Development');
 setFormShowOnLanding(true);
 setIsAddModalOpen(true);
 };

 const handleOpenEditModal = (proj: AgencyProject) => {
 setIsEditMode(true);
 setEditingId(proj.id);
 setFormTitle(proj.title);
 setFormCategory(proj.category);
 setFormClientContactId(proj.clientContactId || '');
 setFormDescription(proj.description || '');
 setFormDetailText(proj.detailText || '');
 setFormPerfScore(proj.performanceScore);
 setFormSeoScore(proj.seoScore);
 setFormImage(proj.image);
 setFormUrl(proj.url);
 setFormToolsMsg(proj.tools.join(', '));
 setFormAddonsMsg(proj.addons.join(', '));
 setFormStatus(proj.status);
 setFormShowOnLanding(proj.showOnLanding !== false);
 setIsAddModalOpen(true);
 };

 const handleSaveProject = (e: React.FormEvent) => {
 e.preventDefault();
 if (!formTitle.trim()) return;

 // Resolve client name
 let clientName = "Cliente Directo";
 if (formClientContactId) {
  const match = contacts.find(c => c.id === formClientContactId);
  if (match) clientName = match.name;
 }

 const tArr = formToolsMsg.split(',').map(s => s.trim()).filter(Boolean);
 const aArr = formAddonsMsg.split(',').map(s => s.trim()).filter(Boolean);

 if (isEditMode && editingId) {
  const match = projects.find(p => p.id === editingId);
  if (match) {
  const updated = {
   ...match,
   title: formTitle,
   category: formCategory,
   clientName,
   clientContactId: formClientContactId || undefined,
   description: formDescription,
   detailText: formDetailText,
   performanceScore: Number(formPerfScore) || 90,
   seoScore: Number(formSeoScore) || 90,
   image: formImage || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
   url: formUrl || 'live.agencyflow.com',
   tools: tArr,
   addons: aArr,
   status: formStatus,
   showOnLanding: formShowOnLanding
  };
  onUpdateProject(updated);
  }
 } else {
  const newProj: AgencyProject = {
  id: 'p_' + Date.now().toString().slice(-5),
  title: formTitle,
  category: formCategory,
  clientName,
  clientContactId: formClientContactId || undefined,
  description: formDescription,
  detailText: formDetailText,
  performanceScore: Number(formPerfScore) || 90,
  seoScore: Number(formSeoScore) || 90,
  image: formImage || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  url: formUrl || 'demo.agencyflow.com',
  tools: tArr,
  addons: aArr,
  status: formStatus,
  showOnLanding: formShowOnLanding
  };
  onAddProject(newProj);
  setSelectedProjectId(newProj.id);
 }

 setIsAddModalOpen(false);
 
 // Toast trigger
 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = isEditMode ? "Proyecto modificado correctamente." : "Nuevo prototipo registrado correctamente.";
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
 }
 };

 const handleDeleteProject = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 if (!window.confirm("¿Seguro que deseas eliminar el registro de este proyecto de la bitácora interna?")) return;
 onDeleteProject(id);
 const filtered = projects.filter(p => p.id !== id);
 if (selectedProjectId === id && filtered.length > 0) {
  setSelectedProjectId(filtered[0].id);
 }

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = "Proyecto removido.";
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
 }
 };

 return (
 <div className="w-full h-full overflow-y-auto p-8 scrollbar-thin">
  <div className="space-y-6 max-w-7xl mx-auto pb-12">
  
  {/* Page Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
  <div>
   <div className="flex items-center gap-2">
   <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded">Bitácora Técnica</span>
   <span className="text-slate-500">•</span>
   <span className="text-xs text-slate-400 font-sans font-light">Gestión de Prototipos de Clientes</span>
   </div>
   <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1">Bitácora de Proyectos</h2>
   <p className="text-xs text-slate-400 font-light mt-0.5">Controla y edita los prototipos reales creados por la agencia, integrando su stack y addons.</p>
  </div>

  <button
   onClick={handleOpenAddModal}
   className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2"
  >
   <FolderPlus className="w-4 h-4" />
   <span>Registrar Nuevo Proyecto</span>
  </button>
  </div>

  <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
   <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
     <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Landing · Prueba social</p>
     <h3 className="mt-1 text-lg font-bold text-white">Empresas que han trabajado con nosotros</h3>
     <p className="mt-1 text-xs text-slate-400">Estos logos aparecen automáticamente en el carrusel de la web pública.</p>
    </div>
    <span className="text-[10px] uppercase tracking-widest text-slate-500">{partners.length} empresas</span>
   </div>

   <form onSubmit={handleSavePartner} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.3fr_1.2fr_auto]">
    <input value={partnerName} onChange={event => setPartnerName(event.target.value)} required placeholder="Nombre de la empresa" className="rounded-xl border border-white/10 bg-[#060c1c] px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-amber-300/50" />
    <div className="flex min-w-0 gap-2">
     <input value={partnerLogo} onChange={event => setPartnerLogo(event.target.value)} required placeholder="URL del logo o sube un archivo" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#060c1c] px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-amber-300/50" />
     <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700">
      <Upload className="h-3.5 w-3.5" /> Subir
      <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="hidden" onChange={event => handlePartnerLogoUpload(event.target.files?.[0])} />
     </label>
    </div>
    <input value={partnerWebsite} onChange={event => setPartnerWebsite(event.target.value)} placeholder="Web opcional · https://..." className="rounded-xl border border-white/10 bg-[#060c1c] px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-amber-300/50" />
    <div className="flex gap-2">
     {editingPartnerId && <button type="button" onClick={resetPartnerForm} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:text-white">Cancelar</button>}
     <button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-200"><Plus className="h-4 w-4" />{editingPartnerId ? 'Guardar' : 'Añadir'}</button>
    </div>
   </form>

   <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {partners.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-xs text-slate-500">Todavía no hay empresas. Añade la primera con su logo.</div> : partners.map(partner => (
     <div key={partner.id} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-3.5">
      <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] p-2"><img src={partner.logoUrl} alt={partner.name} className="max-h-full max-w-full object-contain grayscale" /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{partner.name}</p><p className="mt-1 truncate text-[10px] text-slate-500">{partner.website || 'Sin enlace'}</p></div>
      <div className="flex gap-1 opacity-70 transition group-hover:opacity-100">
       <button type="button" onClick={() => handleEditPartner(partner)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label={`Editar ${partner.name}`}><Edit3 className="h-4 w-4" /></button>
       <button type="button" onClick={() => window.confirm(`¿Eliminar ${partner.name} del carrusel?`) && onDeletePartner(partner.id)} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400" aria-label={`Eliminar ${partner.name}`}><Trash2 className="h-4 w-4" /></button>
      </div>
     </div>
    ))}
   </div>
  </section>

  {/* Main Filter & Search Hub */}
  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4 justify-between backdrop-blur-2xl">
  {/* Category triggers */}
  <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
   {categories.map((cat) => (
   <button
    key={cat}
    onClick={() => setSelectedCategory(cat)}
    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer ${
    selectedCategory === cat ?
     'bg-blue-500/15 text-blue-400 border border-blue-500/25'
     : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
    }`}
   >
    {cat === 'All' ? 'Todos' : cat}
   </button>
   ))}
  </div>

  {/* Search input field */}
  <div className="relative w-full md:w-80">
   <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
   <input
   type="text"
   placeholder="Buscar por stack, addon o tecnologías..."
   value={searchQuery}
   onChange={(e) => setSearchQuery(e.target.value)}
   className="w-full bg-slate-950 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/15 transition-all"
   />
   {searchQuery && (
   <button 
    onClick={() => setSearchQuery('')}
    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-white"
   >
    Clear
   </button>
   )}
  </div>
  </div>

  {/* Responsive splits */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
  
  {/* LEFT COLUMN: Project Mockup list */}
  <div className="lg:col-span-7 space-y-4">
   {filteredProjects.length === 0 ? (
   <div className="bg-white/[0.01] border border-white/5 p-16 text-center rounded-3xl">
    <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
    <Layers className="w-6 h-6 text-slate-400" />
    </div>
    <p className="text-slate-400 text-xs font-semibold">No se encontraron proyectos</p>
    <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-1">Prueba reajustando la búsqueda o registra un nuevo proyecto desde el panel superior.</p>
   </div>
   ) : (
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {filteredProjects.map((proj) => {
    const isActive = proj.id === selectedProjectId;
    return (
     <div
     key={proj.id}
     onClick={() => setSelectedProjectId(proj.id)}
     className={`group bg-slate-950/60 border rounded-3xl p-4.5 transition-all duration-300 cursor-pointer flex flex-col gap-4 relative overflow-hidden ${
      isActive  ?
      'border-blue-500/40 bg-blue-500/[0.02] shadow-xl shadow-blue-500/[0.01]' 
      : 'border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
     }`}
     >
     
     {/* Visual Browser preview framework enclosed */}
     <div className="relative aspect-[16/10] bg-[#0c1223] rounded-2xl overflow-hidden border border-white/5 shadow-inner">
      {/* Browser header simulator */}
      <div className="h-6 bg-slate-950 border-b border-white/5 px-2 flex items-center justify-between select-none">
      <div className="flex items-center gap-1">
       <span className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
       <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70" />
       <span className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
      </div>
      <span className="text-[8px] font-mono text-slate-600 truncate max-w-[120px]">{proj.url}</span>
      <div className="w-4" />
      </div>
      <img 
      src={proj.image} 
      alt={proj.title} 
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover object-top filter group-hover:scale-[1.03] transition duration-500"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/50 to-transparent p-2">
      <span className={`text-[8px] font-mono font-semibold px-2 py-0.5 rounded float-right ${
       proj.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10' :
       proj.status === 'Beta Active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/10' :
       'bg-amber-500/20 text-amber-400 border border-amber-500/10'
      }`}>
       {proj.status}
      </span>
      </div>
     </div>

     {/* Meta info */}
     <div className="space-y-1.5">
      <div className="flex items-center justify-between">
      <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider">{proj.category}</span>
      <button
       onClick={(e) => {
       e.stopPropagation();
       toggleShowOnLanding(proj.id);
       }}
       className={`text-[8px] font-mono font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
       proj.showOnLanding !== false ?
        'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 shadow-sm shadow-blue-500/10'
        : 'bg-slate-800/40 text-slate-500 border-white/5 hover:bg-slate-800 hover:text-slate-300'
       }`}
       title={proj.showOnLanding !== false ? 'Mostrar en landing: ACTIVO (Haz clic para ocultarlo)' : 'Mostrar en landing: OCULTO (Haz clic para mostrarlo)'}
      >
       👁️ {proj.showOnLanding !== false ? 'En Landing' : 'Oculto'}
      </button>
      </div>
      <h3 className="font-bold text-xs text-white group-hover:text-blue-400 transition-colors leading-snug truncate">
      {proj.title}
      </h3>
      <p className="text-slate-400 text-[10.5px] leading-normal line-clamp-2">
      {proj.description}
      </p>
     </div>

     {/* Tool badges snippet */}
     <div className="flex flex-wrap gap-1 mt-auto pt-1.5 border-t border-white/5">
      {proj.tools.slice(0, 3).map((t, i) => (
      <span key={i} className="text-[8px] font-mono text-slate-500 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded">
       {t}
      </span>
      ))}
      {proj.tools.length > 3 && (
      <span className="text-[8px] font-mono text-slate-600">+{proj.tools.length - 3}</span>
      )}
     </div>

     {/* Floating controls */}
     <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button 
      onClick={(e) => { e.stopPropagation(); handleOpenEditModal(proj); }}
      className="p-1 bg-slate-900 border border-white/10 rounded hover:bg-blue-600 text-slate-400 hover:text-white transition cursor-pointer"
      title="Modificar registro de proyecto"
      >
      <Edit3 className="w-3.5 h-3.5" />
      </button>
      <button 
      onClick={(e) => handleDeleteProject(proj.id, e)}
      className="p-1 bg-slate-900 border border-white/10 rounded hover:bg-red-600 text-slate-400 hover:text-white transition cursor-pointer"
      title="Eliminar registro"
      >
      <Trash2 className="w-3.5 h-3.5" />
      </button>
     </div>

     </div>
    );
    })}
   </div>
   )}
  </div>

  {/* RIGHT COLUMN: Project detailed inspector panel */}
  <div className="lg:col-span-5">
   {activeProject ? (
   <div className="bg-[#050b1d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative sticky top-6">
    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
    
    {/* Image Banner mockup header */}
    <div className="relative aspect-[16/9] w-full bg-slate-950 flex-shrink-0">
    <img 
     src={activeProject.image} 
     alt={activeProject.title} 
     referrerPolicy="no-referrer"
     className="w-full h-full object-cover"
    />
    
    {/* Floating metrics badge bar overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-[#050b1d] via-[#050b1d]/40 to-black/30 flex flex-col justify-between p-4">
     
     {/* Performance Indicators */}
     <div className="flex items-center justify-between w-full">
     <span className="text-[10px] font-mono text-white bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-1 rounded">
      Url: {activeProject.url}
     </span>
     <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
      activeProject.status === 'Completed' ? 'bg-emerald-500 text-white' :
      activeProject.status === 'Beta Active' ? 'bg-blue-500 text-white' :
      'bg-amber-500 text-white'
     }`}>
      {activeProject.status}
     </span>
     </div>

     {/* Lighthouse Scores indicators */}
     <div className="flex items-center gap-3">
     {/* Performance */}
     <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-emerald-500/25 py-1 px-2.5 rounded-lg">
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <div className="text-left leading-none">
      <p className="text-[8px] font-mono text-slate-400 uppercase">Performance</p>
      <p className="text-xs font-mono font-bold text-white">{activeProject.performanceScore}%</p>
      </div>
     </div>
     {/* SEO */}
     <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-emerald-500/25 py-1 px-2.5 rounded-lg">
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <div className="text-left leading-none">
      <p className="text-[8px] font-mono text-slate-400 uppercase">SEO Rank</p>
      <p className="text-xs font-mono font-bold text-white">{activeProject.seoScore}%</p>
      </div>
     </div>
     </div>

    </div>
    </div>

    {/* Detailed Technical Content Inspector body */}
    <div className="p-6 space-y-5">
    
    {/* Header overview */}
    <div>
     <div className="flex items-center justify-between">
     <span className="text-[10px] font-mono uppercase tracking-widest text-[#6366f1] font-semibold">{activeProject.category}</span>
     <button 
      onClick={() => handleOpenEditModal(activeProject)}
      className="text-[10px] font-mono text-blue-400 hover:text-white flex items-center gap-1 cursor-pointer"
     >
      <Edit3 className="w-3 h-3" />
      <span>Modificar Ficha</span>
     </button>
     </div>
     <h3 className="text-lg font-extrabold text-white tracking-tight mt-1 leading-snug">{activeProject.title}</h3>
     <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
     <span className="font-semibold text-slate-300">Cliente Asociado:</span>
     <span>{activeProject.clientName}</span>
     </div>

     {/* Landing page dynamic status bar with toggle action */}
     <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl flex items-center justify-between mt-3 text-left">
     <div className="flex items-center gap-2 min-w-0">
      <span className="relative flex h-2 w-2 shrink-0">
      {activeProject.showOnLanding !== false ? (
       <>
       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
       <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
       </>
      ) : (
       <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
      )}
      </span>
      <span className="text-[10px] text-slate-400 font-sans font-medium leading-none truncate">
      {activeProject.showOnLanding !== false ? 'Mostrando en Landing Page' : 'Oculto de Landing Page'}
      </span>
     </div>
     <button
      onClick={() => toggleShowOnLanding(activeProject.id)}
      className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-xl transition cursor-pointer shrink-0 border ${
      activeProject.showOnLanding !== false  ?
       'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/30' 
       : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
      }`}
     >
      {activeProject.showOnLanding !== false ? 'Ocultar' : 'Mostrar'}
     </button>
     </div>
    </div>

    {/* Conceptual Detail text description */}
    <div className="space-y-1 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
     <span className="text-[8px] font-mono text-slate-500 uppercase block font-semibold">Descripción del Prototipo</span>
     <p className="text-slate-300 text-xs leading-relaxed">
     {activeProject.description}
     </p>
     {activeProject.detailText && (
     <p className="text-slate-400 text-[11px] leading-relaxed border-t border-white/5 pt-3 mt-2 font-light italic">
      {activeProject.detailText}
     </p>
     )}
    </div>

    {/* Herramientas Principales */}
    <div className="space-y-2">
     <div className="flex items-center gap-1">
     <Code className="w-4 h-4 text-blue-400" />
     <span className="text-[10px] text-slate-300 uppercase tracking-wider font-mono font-bold">Herramientas & Stack</span>
     </div>
     <div className="flex flex-wrap gap-1.5">
     {activeProject.tools.map((t, idx) => (
      <span key={idx} className="text-[10px] font-mono text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
      {t}
      </span>
     ))}
     </div>
    </div>

    {/* Addons y APIs Complementarias */}
    <div className="space-y-2">
     <div className="flex items-center gap-1">
     <Layers2 className="w-4 h-4 text-indigo-400" />
     <span className="text-[10px] text-slate-300 uppercase tracking-wider font-mono font-bold">Addons & Integraciones</span>
     </div>
     <div className="flex flex-wrap gap-1.5">
     {activeProject.addons.map((a, idx) => (
      <span key={idx} className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
      {a}
      </span>
     ))}
     </div>
    </div>

    {/* Additional Sandbox simulated action button */}
    <div className="space-y-3 pt-3 border-t border-white/5">
     <a 
     href={`https://${activeProject.url}`} 
     target="_blank" 
     rel="noopener noreferrer"
     className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold py-2.5 px-4 rounded-xl text-white transition-all text-center block cursor-pointer flex items-center justify-center gap-2"
     >
     <ExternalLink className="w-4 h-4 text-blue-400" />
     <span>Abrir Demo en Pestaña</span>
     </a>
    </div>

    </div>

   </div>
   ) : (
   <div className="bg-slate-950/40 border border-white/5 text-center p-12 rounded-3xl">
    <p className="text-slate-500 text-xs">Selecciona un proyecto de la lista para ver su inspector técnico detallado.</p>
   </div>
   )}
  </div>

  </div>

  {/* EDIT/ADD PROJECT FORM INTERACT-MODAL OVERLAY */}
  {isAddModalOpen && (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
   
   <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
   <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
   
   {/* Header control */}
   <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-slate-950/30">
    <div className="flex items-center gap-2">
    <Settings className="w-5 h-5 text-blue-400" />
    <h3 className="font-bold text-sm text-white">{isEditMode ? 'Modificar Ficha de Proyecto' : 'Registrar Nuevo Proyecto'}</h3>
    </div>
    <button 
    onClick={() => setIsAddModalOpen(false)}
    className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition cursor-pointer"
    >
    <X className="w-5 h-5" />
    </button>
   </div>

   {/* Scrollable Form Body */}
   <form onSubmit={handleSaveProject} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* Title */}
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Nombre del Proyecto *</label>
     <input
     type="text"
     required
     placeholder="Ej. NovaSaaS Client Dashboard"
     value={formTitle}
     onChange={(e) => setFormTitle(e.target.value)}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
     />
    </div>

    {/* Category */}
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Categoría</label>
     <select
     value={formCategory}
     onChange={(e) => setFormCategory(e.target.value)}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
     >
     <option value="SaaS">SaaS Platform</option>
     <option value="Luxury Portals">Luxury Portals</option>
     <option value="E-Commerce">E-Commerce</option>
     <option value="Fintech">Fintech / Web3</option>
     <option value="Landing Page">Landing Page</option>
     </select>
    </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* Client contacts dropdown linking to state CRM! */}
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Cliente del CRM Asociado</label>
     <select
     value={formClientContactId}
     onChange={(e) => setFormClientContactId(e.target.value)}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
     >
     <option value="">-- Ninguno (Cliente Directo) --</option>
     {contacts.map(c => (
      <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
     ))}
     </select>
    </div>

    {/* Subdomain URL */}
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Subdominio Demo</label>
     <input
     type="text"
     required
     placeholder="ejemplo.agencyflow.com"
     value={formUrl}
     onChange={(e) => setFormUrl(e.target.value)}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
     />
    </div>
    </div>

    {/* Description */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Descripción Rápida</label>
    <input
     type="text"
     required
     placeholder="Pequeño resumen del prototipo web..."
     value={formDescription}
     onChange={(e) => setFormDescription(e.target.value)}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
    />
    </div>

    {/* Informacion Adicional */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Detalle e Información Adicional</label>
    <textarea
     rows={2}
     placeholder="Detalles sobre lógica, autenticación o APIs utilizadas..."
     value={formDetailText}
     onChange={(e) => setFormDetailText(e.target.value)}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
    />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* Image */}
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Imagen de Portada (URL o Archivo)</label>
     <div className="flex items-center gap-3">
     {formImage && (
      <div className="w-10 h-10 rounded-lg border border-white/10 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
      <img 
       src={formImage} 
       alt="Previsualización" 
       className="w-full h-full object-cover" 
       referrerPolicy="no-referrer"
       onError={(e) => {
       // If load fails, we can display a fallback placeholder
       (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=40px&q=80";
       }}
      />
      </div>
     )}
     <div className="flex-1 flex gap-1.5 min-w-0">
      <input
      type="text"
      placeholder="https://images.unsplash.com/..."
      value={formImage}
      onChange={(e) => setFormImage(e.target.value)}
      className="flex-1 bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 min-w-0"
      />
      <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl px-3 py-2 text-xs flex items-center gap-1.5 cursor-pointer select-none font-semibold transition shrink-0">
      <Upload className="w-3.5 h-3.5" />
      <span>Subir</span>
      <input
       type="file"
       accept="image/*"
       className="hidden"
       onChange={(e) => {
       const file = e.target.files?.[0];
       if (file) {
        // Let's validate maximum sizing for performance (e.g. 5MB)
        if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es demasiado grande. Por favor selecciona una de menos de 5MB.");
        return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
        if (reader.result && typeof reader.result === 'string') {
         setFormImage(reader.result);
        }
        };
        reader.readAsDataURL(file);
       }
       }}
      />
      </label>
     </div>
     </div>
     {formImage && formImage.startsWith('data:image/') && (
     <span className="text-[9px] font-mono text-emerald-400 block mt-0.5">✓ Imagen de dispositivo cargada con éxito.</span>
     )}
    </div>

    {/* Status */}
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Estado de Entrega</label>
     <select
     value={formStatus}
     onChange={(e) => setFormStatus(e.target.value as any)}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
     >
     <option value="Completed">Completed (Entregado)</option>
     <option value="Beta Active">Beta Active (En Pruebas)</option>
     <option value="In Development">In Development (En Desarrollo)</option>
     </select>
    </div>
    </div>

    {/* Tools list */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Herramientas en Stack (Separar por comas)</label>
    <input
     type="text"
     placeholder="React 19, TypeScript, Tailwind, D3.js"
     value={formToolsMsg}
     onChange={(e) => setFormToolsMsg(e.target.value)}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
    />
    </div>

    {/* Addons list */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Addons y APIs Utilizados (Separar por comas)</label>
    <input
     type="text"
     placeholder="Stripe, Mapbox Native, WebSockets, Supabase Storage"
     value={formAddonsMsg}
     onChange={(e) => setFormAddonsMsg(e.target.value)}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
    />
    </div>

    <div className="grid grid-cols-2 gap-4">
    {/* Performance */}
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Rendimiento (Lighthouse) %</label>
     <input
     type="number"
     min={50}
     max={100}
     value={formPerfScore}
     onChange={(e) => setFormPerfScore(Number(e.target.value))}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
     />
    </div>

    {/* SEO */}
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">SEO Rank %</label>
     <input
     type="number"
     min={50}
     max={100}
     value={formSeoScore}
     onChange={(e) => setFormSeoScore(Number(e.target.value))}
     className="w-full bg-[#060c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
     />
    </div>
    </div>

    {/* Show on landing page toggle */}
    <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
    <div className="space-y-0.5 max-w-[80%] text-left">
     <label className="text-[10px] uppercase font-mono text-slate-300 font-bold block">Mostrar en el Landing Page</label>
     <span className="text-[9px] text-slate-500 leading-normal block">Si se activa, este proyecto aparecerá públicamente en el portafolio de la landing page.</span>
    </div>
    <button
     type="button"
     onClick={() => setFormShowOnLanding(!formShowOnLanding)}
     className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
     formShowOnLanding ? 'bg-blue-600' : 'bg-slate-850'
     }`}
    >
     <div
     className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
      formShowOnLanding ? 'translate-x-5' : 'translate-x-0'
     }`}
     />
    </button>
    </div>

    {/* Submit triggers */}
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
    <button
     type="button"
     onClick={() => setIsAddModalOpen(false)}
     className="px-4 py-2 border border-white/10 rounded-xl text-xs text-slate-400 hover:text-white transition hover:bg-white/5 cursor-pointer"
    >
     Cancelar
    </button>
    <button
     type="submit"
     className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
    >
     <Check className="w-4 h-4" />
     <span>{isEditMode ? 'Guardar Cambios' : 'Registrar Proyecto'}</span>
    </button>
    </div>

   </form>

   </div>

  </div>
  )}

  </div>
 </div>
 );
}
