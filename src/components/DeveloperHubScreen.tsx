import React, { useEffect, useState } from 'react';
import { Screen, ClientContact, CalendarEvent } from '../types';
import { AgencyProject } from './ProjectsScreen';
import { 
 Code,
 CheckCircle2,
 ListTodo,
 ArrowRight,
 ExternalLink,
 Sparkles,
 Laptop,
 Search,
 Briefcase,
 Calendar,
 Layers,
 Clock,
 User,
 Plus,
 Trash2,
 X,
 Settings,
 HelpCircle,
 FileCode,
 Flame,
 Globe,
 PlusCircle,
 TrendingUp,
 Cpu,
 Layers2,
 Copy,
 Palette,
 Image
} from 'lucide-react';
import DemoSitesCatalog from './DemoSitesCatalog';
import { db } from '../supabaseClient';
import { DemoWebsiteConfig, DemoWebsiteTemplate, parseDemoWebsiteConfig, TEMPLATE_BANNERS, TEMPLATE_DEFAULTS, TEMPLATE_VARIANTS, HEADER_STYLES, HEADER_BACKGROUNDS } from './WebsitePreviewScreen';

interface DeveloperHubScreenProps {
 contacts: ClientContact[];
 projects: AgencyProject[];
 onUpdateContact: (updated: ClientContact) => void;
 onAddProject: (newProj: AgencyProject) => void;
 onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
 usersList?: { name: string; email: string }[];
 onAddEvent?: (event: CalendarEvent) => void;
}

interface ChecklistItem {
 id: string;
 text: string;
 done: boolean;
}

const DEFAULT_DEV_LIST = [
 'Por Asignar'
];

const PRESET_STACK_TILES = [
 'React 19',
 'Next.js 15',
 'Vite',
 'Superbase DB',
 'PostgreSQL',
 'Tailwind CSS',
 'Gemini API',
 'Framer Motion',
 'Stripe Payments',
 'GraphQL',
 'REST API',
 'Node.js',
 'Twilio SMS Service'
];

export default function DeveloperHubScreen({
 contacts,
 projects,
 onUpdateContact,
 onAddProject,
 onNavigate,
 usersList = [],
 onAddEvent
}: DeveloperHubScreenProps) {
 const [searchQuery, setSearchQuery] = useState('');
 const [filterStatus, setFilterStatus] = useState<string>('All');
 const [filterCrmType, setFilterCrmType] = useState<string>('All');
 
 // Selected contact for side detail panel
 const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
 
 // Quick adds
 const [newChecklistText, setNewChecklistText] = useState('');
 const [newCustomTech, setNewCustomTech] = useState('');
 const [copiedWebsiteLink, setCopiedWebsiteLink] = useState(false);
 const [demoSites, setDemoSites] = useState<any[]>([]);

 useEffect(() => {
 let cancelled = false;
 db.getDemoSites()
  .then(items => {
  if (!cancelled) setDemoSites(items);
  })
  .catch(err => console.error('No se pudieron cargar demos desde Supabase:', err));
 return () => { cancelled = true; };
 }, []);

 // Find the selected contact
 const selectedContact = contacts.find(c => c.id === selectedContactId) || null;
 const devList = [
 ...usersList.map(user => user.name || user.email).filter(Boolean),
 ...DEFAULT_DEV_LIST
 ];

 // Process checklist helper
 const getParsedChecklist = (contact: ClientContact): ChecklistItem[] => {
 if (!contact.devChecklist) {
  // Provide standard initial tasks if empty
  return [
  { id: 't1', text: 'Establecer contacto inicial y requisitos', done: contact.status === 'Client' },
  { id: 't2', text: 'Diseño de Mockup Inicial en Figma', done: false },
  { id: 't3', text: 'Maquetación e Interfaz Frontend', done: false },
  { id: 't4', text: 'Configurar Backend / Conectores de base de datos', done: false },
  { id: 't5', text: 'Pruebas y Control de Calidad (QA)', done: false },
  { id: 't6', text: 'Despliegue y Entrega de Llaves', done: false }
  ];
 }
 try {
  return JSON.parse(contact.devChecklist);
 } catch (e) {
  return [];
 }
 };

 const handleToggleCheckitem = (contact: ClientContact, itemId: string) => {
 const list = getParsedChecklist(contact);
 const updated = list.map(item => item.id === itemId ? { ...item, done: !item.done } : item);
 onUpdateContact({
  ...contact,
  devChecklist: JSON.stringify(updated)
 });
 };

 const handleAddCheckitem = (contact: ClientContact, text: string) => {
 if (!text.trim()) return;
 const list = getParsedChecklist(contact);
 const updated = [
  ...list,
  { id: 't_' + Date.now().toString().slice(-4), text: text.trim(), done: false }
 ];
 onUpdateContact({
  ...contact,
  devChecklist: JSON.stringify(updated)
 });
 setNewChecklistText('');
 };

 const handleDeleteCheckitem = (contact: ClientContact, itemId: string) => {
 const list = getParsedChecklist(contact);
 const updated = list.filter(item => item.id !== itemId);
 onUpdateContact({
  ...contact,
  devChecklist: JSON.stringify(updated)
 });
 };

 const handleUpdateDevNotes = (contact: ClientContact, text: string) => {
 onUpdateContact({
  ...contact,
  devNotes: text
 });
 };

 const handleUpdateDevStatus = (contact: ClientContact, status: ClientContact['devStatus']) => {
 const wasCompleted = contact.devStatus === 'completed';
 const isCompleted = status === 'completed';
 onUpdateContact({
  ...contact,
  devStatus: status,
  needsWebsite: isCompleted ? false : contact.needsWebsite,
  websiteReady: isCompleted ? true : contact.websiteReady,
  devCompletedAt: isCompleted ? (wasCompleted ? contact.devCompletedAt || new Date().toISOString() : new Date().toISOString()) : undefined
 });
 };

 const handleUpdateDevAssigned = (contact: ClientContact, developer: string) => {
 onUpdateContact({
  ...contact,
  devAssignedTo: developer
 });
 };

 const handleUpdateDevDeadline = (contact: ClientContact, date: string) => {
 onUpdateContact({
  ...contact,
  devDeadline: date
 });
 };

 const handleToggleTech = (contact: ClientContact, tech: string) => {
 const currentStack = contact.devTechStack || [];
 let updated: string[];
 if (currentStack.includes(tech)) {
  updated = currentStack.filter(t => t !== tech);
 } else {
  updated = [...currentStack, tech];
 }
 onUpdateContact({
  ...contact,
  devTechStack: updated
 });
 };

 const handleAddCustomTech = (contact: ClientContact) => {
 if (!newCustomTech.trim()) return;
 const currentStack = contact.devTechStack || [];
 if (!currentStack.includes(newCustomTech.trim())) {
  onUpdateContact({
  ...contact,
  devTechStack: [...currentStack, newCustomTech.trim()]
  });
 }
 setNewCustomTech('');
 };

 const updateDemoWebsite = (contact: ClientContact, patch: Partial<DemoWebsiteConfig>) => {
 const current = parseDemoWebsiteConfig(contact);
 onUpdateContact({ ...contact, devWebsiteConfig: JSON.stringify({ ...current, ...patch }) });
 };
 const handleSelectWebsiteTemplate = (contact: ClientContact, template: DemoWebsiteTemplate) => updateDemoWebsite(contact, { ...TEMPLATE_DEFAULTS[template], template, bannerUrl: TEMPLATE_BANNERS[template] });
 const getAssignedDemoUrl = (contact: ClientContact) => demoSites.find(site => site.id === contact.demoWebsiteId)?.publicUrl || '';
 const getWebsiteShareUrl = (contact: ClientContact) => contact.customWebsiteUrl || contact.website || getAssignedDemoUrl(contact);
 const hasAssignedWebsite = (contact: ClientContact) => !!(
 contact.website?.trim() ||
 contact.customWebsiteUrl?.trim() ||
 getAssignedDemoUrl(contact).trim()
 );
 const buildWhatsAppUrl = (contact: ClientContact) => {
 const digits = (contact.phone || '').replace(/\D/g, '');
 if (!digits) return undefined;
 const normalized = digits.startsWith('34') ? digits : `34${digits}`;
 const url = getWebsiteShareUrl(contact);
 const message = `Hola ${contact.name}, tu web ya está lista: ${url}. Revísala y dime si quieres que ajustemos algún detalle.`;
 return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
 };
 const handleMarkWebsiteReady = (contact: ClientContact) => {
 const updated: ClientContact = {
  ...contact,
  needsWebsite: false,
  websiteReady: true,
  devStatus: 'completed',
  devCompletedAt: contact.devCompletedAt || new Date().toISOString()
 };
 onUpdateContact(updated);
};


 // Generate automated stack blueprint recommendation
 const handleApplyAIPreset = (contact: ClientContact, type: 'saas' | 'ecommerce' | 'corporate' | 'mobile') => {
 let stack: string[] = [];
 let notes = '';
 let list: ChecklistItem[] = [];

 if (type === 'saas') {
  stack = ['React 19', 'Next.js 15', 'Tailwind CSS', 'Superbase DB', 'Gemini API', 'Stripe Payments'];
  notes = `Especificaciones para plataforma SaaS:\n- Creación de panel centralizado (responsive)\n- Pasarela de cobros mensuales con Stripe Webhooks\n- Panel de consumo para créditos Gemini AI\n- Autenticación multifactor con Supabase Auth.`;
  list = [
  { id: '1', text: 'Maquetar Dashboard interactivo', done: false },
  { id: '2', text: 'Conectar API de Gemini para procesamiento inteligente', done: false },
  { id: '3', text: 'Definir base de datos relacional y RLS', done: false },
  { id: '4', text: 'Flujos de checkout y planes de suscripción', done: false },
  { id: '5', text: 'Probar performance final en Lighthouse (>95%)', done: false }
  ];
 } else if (type === 'ecommerce') {
  stack = ['Next.js 15', 'Tailwind CSS', 'PostgreSQL', 'Stripe Payments', 'Twilio SMS Service'];
  notes = `Especificaciones de E-Commerce Premium:\n- Carrito flotante de alto rendimiento\n- Buscador instantáneo con filtros avanzados\n- Notificaciones automáticas de pedidos listos vía SMS\n- Facturación automática en PDF al pagar.`;
  list = [
  { id: '1', text: 'Configurar catálogo de productos y stock', done: false },
  { id: '2', text: 'Pasarela de pagos Stripe Checkout V4', done: false },
  { id: '3', text: 'Integración CMS para manejo de inventario', done: false },
  { id: '4', text: 'Diseño de plantillas de email transaccionales', done: false },
  { id: '5', text: 'Optimización SEO y meta-etiquetas de producto', done: false }
  ];
 } else if (type === 'corporate') {
  stack = ['Vite', 'React 19', 'Framer Motion', 'Tailwind CSS', 'REST API'];
  notes = `Especificaciones para Web Corporativa Premium:\n- Animaciones de scroll ultrasuaves (Framer Motion)\n- Formulario de contacto inteligente integrado al CRM con reCAPTCHA\n- Velocidad de carga inmediata e indexación de palabras clave corporativas.`;
  list = [
  { id: '1', text: 'Definir paleta de colores y tipografía de marca', done: false },
  { id: '2', text: 'Desarrollar vistas principales (Home, Servs, Contacto)', done: false },
  { id: '3', text: 'Conectar formulario con API CRM de Althera', done: false },
  { id: '4', text: 'Certificado SSL y configuración de CDN global', done: false }
  ];
 } else {
  stack = ['React Native', 'TypeScript Native', 'Superbase DB', 'REST API'];
  notes = `Especificaciones para Aplicación Móvil iOS / Android:\n- Soporte offline con base de datos local pre-cargada\n- Push Notifications integradas con FCM\n- Publicación en Apple App Store y Google Play.`;
  list = [
  { id: '1', text: 'Configuración inicial de entornos iOS & Android', done: false },
  { id: '2', text: 'Maquetación de pantallas con React Native Paper', done: false },
  { id: '3', text: 'Sincronización en segundo plano con base de datos remota', done: false },
  { id: '4', text: 'Compilación beta y pruebas TestFlight/Google Play Console', done: false }
  ];
 }

 onUpdateContact({
  ...contact,
  devTechStack: stack,
  devNotes: (contact.devNotes ? contact.devNotes + '\n\n' + notes : notes),
  devChecklist: JSON.stringify(list)
 });

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = `Blueprint IA cargado correctamente para ${contact.company}`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
 }
 };

 // Convert ticket into finished agency project portfolio!
 const handlePromoteToPortfolio = (contact: ClientContact) => {
 const list = getParsedChecklist(contact);
 const completedTasks = list.filter(t => t.done).length;
 
 // Create project
 const newProj: AgencyProject = {
  id: 'p_' + Date.now().toString().slice(-5),
  title: `Sitio Web Oficial de ${contact.company}`,
  category: contact.status === 'Client' ? 'Producción Oficial' : 'Prototipo MVP',
  clientName: contact.name,
  clientContactId: contact.id,
  description: contact.devNotes || `Plataforma digital interactiva desarrollada para ${contact.name} (${contact.company}).`,
  detailText: `Proyecto lanzado con las siguientes tecnologías: ${(contact.devTechStack || []).join(', ') || 'React, Tailwind'}. Checklist de desarrollo completado al ${Math.round((completedTasks / (list.length || 1)) * 100)}%`,
  performanceScore: 98,
  seoScore: 99,
  image: contact.avatarUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  url: contact.customWebsiteUrl || contact.website || `${contact.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.althera.dev`,
  tools: contact.devTechStack && contact.devTechStack.length > 0 ? contact.devTechStack : ['React 19', 'Tailwind CSS', 'Vite'],
  addons: ['Supabase Integration', 'SEO Core Suite'],
  status: 'Completed',
  showOnLanding: true
 };

 onAddProject(newProj);
 
 // Update contact status to "deployed"
 onUpdateContact({
  ...contact,
  devStatus: 'completed',
  devCompletedAt: new Date().toISOString()
 });

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = `¡Espectacular! Proyecto publicado en el portafolio público para ${contact.company}`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
 }
 };
 // Completed work remains visible and editable; completion never archives a client.
 const devHubContacts = contacts;

 const filteredDevWorks = devHubContacts.filter(contact => {
 const query = searchQuery.toLowerCase();
 const matchesSearch = 
  contact.name.toLowerCase().includes(query) ||
  contact.company.toLowerCase().includes(query) ||
  (contact.devAssignedTo || '').toLowerCase().includes(query) ||
  (contact.role || '').toLowerCase().includes(query);

 const matchStatus = 
  filterStatus === 'All' || 
  (filterStatus === 'backlog' && (!contact.devStatus || contact.devStatus === 'backlog')) ||
  contact.devStatus === filterStatus;

 const matchCrmType =
  filterCrmType === 'All' ||
  contact.status === filterCrmType;

 return matchesSearch && matchStatus && matchCrmType;
 });

 // KPI Calculations based on eligible DevOps contacts
 const totalTickets = devHubContacts.length;
 const backlogCount = devHubContacts.filter(c => !c.devStatus || c.devStatus === 'backlog').length;
 const inDevCount = devHubContacts.filter(c => c.devStatus === 'development').length;
 const inDesignCount = devHubContacts.filter(c => c.devStatus === 'design').length;
 const completedDevCount = devHubContacts.filter(c => c.devStatus === 'completed' || c.devStatus === 'deployed').length;

 return (
 <div className="p-8 space-y-8 flex-1 overflow-y-auto bg-transparent text-slate-100 relative min-h-screen">
  
  {/* Decorative Blur Ambient Glow */}
  <div className="absolute top-0 right-1/3 w-[30%] h-[30%] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
  <div className="absolute bottom-1/4 left-1/4 w-[25%] h-[25%] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

  {/* Header section */}
  <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/5 pb-6 gap-4">
  <div>
   <div className="flex items-center gap-2">
   <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-widest font-bold">
    Área de Producción
   </span>
   <span className="text-slate-550">•</span>
   <span className="text-slate-400 text-xs font-mono">Workspace: Developer Hub</span>
   </div>
   <h2 className="text-2xl font-bold tracking-tight text-white font-sans uppercase mt-1">
   Organización de Developers
   </h2>
   <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-4xl">
   Cada cliente o lead en tu CRM representa un sitio web o aplicación que debe ser maquetada. Supervisa asignaciones, tecnologías utilizadas, estados de entrega y listas de tareas de desarrollo.
   </p>
  </div>
  <div className="flex gap-2">
   <button
   onClick={() => onNavigate('crm', 'none')}
   className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-slate-200 border border-white/10 hover:border-white/20 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition"
   >
   <Layers className="w-4 h-4 text-slate-400" />
   Ver CRM Principal
   </button>
   <button
   onClick={() => onNavigate('projects', 'none')}
   className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-500/10 transition"
   >
   <Laptop className="w-4 h-4" />
   Portafolio de Proyectos
   </button>
  </div>
  </div>

  {/* Bento Stats Panels */}
  <DemoSitesCatalog />

  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
  
  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between relative shadow-sm">
   <div className="flex items-center justify-between">
   <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Clientes Totales (CRM)</span>
   <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
    <Briefcase className="w-3.5 h-3.5 text-blue-400" />
   </div>
   </div>
   <div className="mt-4">
   <h3 className="text-2xl font-bold text-white tracking-tight leading-none">{totalTickets}</h3>
   <p className="text-[10px] text-slate-500 mt-1">Todos requieren web</p>
   </div>
  </div>

  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between relative shadow-sm">
   <div className="flex items-center justify-between">
   <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-semibold">Sin Iniciar (Cola)</span>
   <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
    <Clock className="w-3.5 h-3.5 text-amber-400" />
   </div>
   </div>
   <div className="mt-4">
   <h3 className="text-2xl font-bold text-white tracking-tight leading-none">{backlogCount}</h3>
   <p className="text-[10px] text-amber-500/80 mt-1">Esperando maquetación</p>
   </div>
  </div>

  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between relative shadow-sm">
   <div className="flex items-center justify-between">
   <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider font-semibold">Fase de Diseño</span>
   <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
    <Layers2 className="w-3.5 h-3.5 text-teal-400" />
   </div>
   </div>
   <div className="mt-4">
   <h3 className="text-2xl font-bold text-white tracking-tight leading-none">{inDesignCount}</h3>
   <p className="text-[10px] text-teal-500/80 mt-1">UI/UX Figma o estructura</p>
   </div>
  </div>

  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between relative shadow-sm">
   <div className="flex items-center justify-between">
   <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider font-semibold">En Desarrollo</span>
   <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
    <Code className="w-3.5 h-3.5 text-purple-400" />
   </div>
   </div>
   <div className="mt-4">
   <h3 className="text-2xl font-bold text-white tracking-tight leading-none">{inDevCount}</h3>
   <p className="text-[10px] text-purple-500/80 mt-1">Escribiendo código activo</p>
   </div>
  </div>

  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 col-span-2 lg:col-span-1 flex flex-col justify-between relative shadow-sm">
   <div className="flex items-center justify-between">
   <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">Desplegados / Completos</span>
   <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
   </div>
   </div>
   <div className="mt-4">
   <h3 className="text-2xl font-bold text-emerald-400 tracking-tight leading-none">{completedDevCount}</h3>
   <p className="text-[10px] text-emerald-500/80 mt-1">Listos y entregados</p>
   </div>
  </div>

  </div>

  {/* Main split dashboard (Left list, Right properties panel) */}
  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
  
  {/* Left column: Filters & Tasks/Projects list (col-7/8) */}
  <div className="xl:col-span-7 space-y-6">
   
   {/* Controls Bar */}
   <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
   
   {/* Search Input */}
   <div className="relative min-w-[200px] flex-1">
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
    <Search className="w-4 h-4" />
    </span>
    <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Buscar cliente, developer, rol de contacto..."
    className="w-full bg-black/40 border border-white/10 hover:border-white/15 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/35 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs placeholder-slate-500 transition"
    />
   </div>

   {/* Dev Flow Filter */}
   <div className="flex gap-2">
    <select
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-violet-500"
    >
    <option value="All">Todos los Estados Dev</option>
    <option value="backlog">Sin Iniciar (Backlog)</option>
    <option value="design">Fase Diseño</option>
    <option value="development">En Desarrollo</option>
    <option value="testing">Fase Pruebas (QA)</option>
    <option value="deployed">Desplegado</option>
    <option value="completed">Completado</option>
    </select>

    {/* Status Lead vs Client Filter */}
    <select
    value={filterCrmType}
    onChange={(e) => setFilterCrmType(e.target.value)}
    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-violet-500"
    >
    <option value="All">Fase Comercial: Todos</option>
    <option value="Lead">Clientes Potenciales (Leads)</option>
    <option value="Client">Clientes Firmados</option>
    </select>
   </div>

   </div>

   {/* Dynamic Staggered Task List */}
   {filteredDevWorks.length === 0 ? (
   <div className="bg-white/[0.01] border border-dashed border-white/5 px-6 py-12 rounded-2xl text-center space-y-4">
    <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
    <p className="text-xs text-slate-400">No se encontraron requerimientos de desarrollo con los filtros actuales.</p>
    <button 
    onClick={() => { setSearchQuery(''); setFilterStatus('All'); setFilterCrmType('All'); }}
    className="text-[11px] text-violet-400 hover:underline font-mono"
    >
    Limpiar filtros y ver todos
    </button>
   </div>
   ) : (
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {filteredDevWorks.map((contact) => {
    const list = getParsedChecklist(contact);
    const total = list.length;
    const done = list.filter(i => i.done).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    
    const isSelected = selectedContactId === contact.id;

    let stateBadgeColor = 'bg-slate-500/10 text-slate-400 border border-slate-550/15';
    let stateText = 'Sin Iniciar';
    if (contact.devStatus === 'design') {
     stateBadgeColor = 'bg-teal-500/15 text-teal-400 border border-teal-500/20';
     stateText = 'Fase de Diseño';
    } else if (contact.devStatus === 'development') {
     stateBadgeColor = 'bg-purple-500/15 text-purple-400 border border-purple-550/20 animate-pulse';
     stateText = 'En Desarrollo';
    } else if (contact.devStatus === 'testing') {
     stateBadgeColor = 'bg-amber-500/15 text-amber-400 border border-amber-550/20';
     stateText = 'Pruebas / QA';
    } else if (contact.devStatus === 'deployed') {
     stateBadgeColor = 'bg-indigo-500/15 text-indigo-400 border border-indigo-550/20';
     stateText = '¡Desplegado!';
    } else if (contact.devStatus === 'completed') {
     stateBadgeColor = 'bg-emerald-500/15 text-emerald-400 border border-emerald-550/20';
     stateText = 'Completado';
    }

    return (
     <div
     key={contact.id}
     onClick={() => setSelectedContactId(contact.id)}
     className={`p-5 rounded-2xl transition-all duration-300 text-left cursor-pointer border relative flex flex-col justify-between h-[230px] group ${
      isSelected  ?
      'bg-violet-950/[0.12] border-violet-500/40 shadow-xl shadow-black/40 shadow-[inset_0_1px_3px_rgba(139,92,246,0.1)]' 
      : 'bg-white/[0.01] hover:bg-white/[0.025] border-white/5 hover:border-white/10'
     }`}
     >
     
     {/* Upper Line Info */}
     <div>
      <div className="flex items-center justify-between gap-2.5">
      <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${stateBadgeColor}`}>
       {stateText}
      </span>
      
      {/* CRM Badge */}
      <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono ${
       contact.status === 'Client'  ?
       'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
       : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      }`}>
       CRM: {contact.status}
      </span>
      {contact.needsWebsite && !contact.websiteReady && (
      <span className="px-2 py-0.5 rounded-full text-[8px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/25">
       Falta web
      </span>
      )}
      </div>

      {/* Client brand / Company */}
      <div className="flex items-center gap-3 mt-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
       contact.status === 'Client' ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/15 text-blue-400'
      }`}>
       {contact.initials || contact.company.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
       <h4 className="text-sm font-bold text-slate-100 truncate group-hover:text-violet-300 transition-colors">
       {contact.company}
       </h4>
       <p className="text-[10px] text-slate-450 truncate">
       {contact.name} • {contact.role || 'CEO / Representante'}
       </p>
      </div>
      </div>

      {/* Web/App Requirements Detail */}
      <p className="text-[10px] text-slate-400 mt-2.5 line-clamp-2 italic leading-relaxed">
      {contact.notes ? `"${contact.notes.substring(0, 100)}"` : 'Sin especificaciones comerciales previas. Haz click en la barra derecha para autogenerar stack y tareas.'}
      </p>
     </div>

     {/* Lower Info Line (Developer statistics, task progress, etc) */}
     <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5">
      
      {/* Tech stack mini visual pills */}
      <div className="flex flex-wrap gap-1 max-h-[22px] overflow-hidden">
      {(contact.devTechStack || []).slice(0, 3).map((t, idx) => (
       <span key={idx} className="bg-neutral-900 border border-white/10 text-slate-300 rounded text-[8px] font-mono px-1.5 py-0.5">
       {t}
       </span>
      ))}
      {(contact.devTechStack || []).length > 3 && (
       <span className="text-[8px] text-slate-450 font-mono self-center ml-0.5">
       +{contact.devTechStack!.length - 3}
       </span>
      )}
      {(!contact.devTechStack || contact.devTechStack.length === 0) && (
       <span className="text-[8px] text-slate-500 font-mono">Sin tecnologías definidas</span>
      )}
      </div>

      {/* Developer Assigned & Tasks Checklist bar */}
      <div className="flex items-center justify-between text-[9px] text-slate-450">
      <div className="flex items-center gap-1.5 truncate">
       <User className="w-3 h-3 text-slate-500" />
       <span className="truncate">
       Dev: <strong className="text-slate-300">{contact.devAssignedTo || 'Por Asignar'}</strong>
       </span>
      </div>
      <div className="flex items-center gap-2 text-right">
       <span className="font-mono">{pct}% ({done}/{total})</span>
       <div className="w-14 bg-neutral-900 h-1 rounded-full overflow-hidden border border-white/5">
       <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
       </div>
      </div>
      </div>

     </div>

     </div>
    );
    })}
   </div>
   )}

  </div>

  {/* Right column: Edit Details / Work Panel for selected ticket (col-5) */}
  <div className="xl:col-span-5">
   {selectedContact ? (
   <div className="bg-white/[0.015] border border-white/5 rounded-3xl p-6 space-y-6 relative text-left">
    
    {/* Header inside Panel */}
    <div className="flex items-start justify-between border-b border-white/5 pb-4.5">
    <div>
     <div className="flex items-center gap-2">
     <h3 className="text-base font-bold text-white tracking-tight">
      {selectedContact.company}
     </h3>
     <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
      selectedContact.status === 'Client'  ?
      'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
     }`}>
      {selectedContact.status}
     </span>
     </div>
     <p className="text-[10px] text-slate-400 mt-0.5">
     Cliente CRM: {selectedContact.name} • ID: <span className="font-mono text-slate-500">{selectedContact.id}</span>
     </p>
    </div>
    <button
     onClick={() => setSelectedContactId(null)}
     className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition cursor-pointer"
    >
     <X className="w-4 h-4" />
    </button>
    </div>

    {/* Developer Assignment & Delivery Date Form */}
    <div className="grid grid-cols-2 gap-4">
    
    {/* Developer Dropdown */}
    <div className="space-y-1.5 text-left">
     <label className="text-[10px] uppercase tracking-wider font-bold text-slate-450 font-mono block">
     Developer Asignado
     </label>
     <select
     value={selectedContact.devAssignedTo || 'Por Asignar'}
     onChange={(e) => handleUpdateDevAssigned(selectedContact, e.target.value)}
     className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
     >
     {devList.map((dev, idx) => (
      <option key={idx} value={dev} className="bg-neutral-950 text-slate-300">{dev}</option>
     ))}
     </select>
    </div>

    {/* Deadlines */}
    <div className="space-y-1.5 text-left">
     <label className="text-[10px] uppercase tracking-wider font-bold text-slate-450 font-mono block">
     Fecha de Entrega
     </label>
     <div className="relative">
     <input
      type="date"
      value={selectedContact.devDeadline || ''}
      onChange={(e) => handleUpdateDevDeadline(selectedContact, e.target.value)}
      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
     />
     </div>
    </div>

    </div>

    {/* Current Development Phase */}
    <div className="space-y-2">
    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-450 font-mono block">
     Fase de Desarrollo Web
    </label>
    <div className="grid grid-cols-3 gap-1.5">
     {[
     { key: 'backlog', label: 'Backlog 💤' },
     { key: 'design', label: 'Diseño UI 🎨' },
     { key: 'development', label: 'Código 💻' },
     { key: 'testing', label: 'QA / Test 🧪' },
     { key: 'deployed', label: 'Desplegado 🚀' },
     { key: 'completed', label: 'Completado ✅' }
     ].map((st) => {
     const active = (selectedContact.devStatus || 'backlog') === st.key;
     return (
      <button
      key={st.key}
      onClick={() => handleUpdateDevStatus(selectedContact, st.key as any)}
      className={`py-2 rounded-xl text-[9px] font-semibold border transition cursor-pointer ${
       active  ?
       'bg-violet-500/15 border-violet-500/40 text-violet-400' 
       : 'bg-black/20 border-white/5 text-slate-450 hover:text-slate-300 hover:bg-white/5'
      }`}
      >
      {st.label}
      </button>
     );
     })}
    </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-black/20 border border-white/5 rounded-2xl">
    <select
     value={selectedContact.demoWebsiteId || ''}
     onChange={(e) => {
     const demoId = e.target.value || undefined;
     const demoUrl = demoSites.find(site => site.id === demoId)?.publicUrl || selectedContact.customWebsiteUrl || selectedContact.website || '';
     onUpdateContact({ ...selectedContact, demoWebsiteId: demoId, website: demoUrl });
     }}
     className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500"
    >
     <option value="">Sin demo asignada</option>
     {demoSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
    </select>
    <input
     value={selectedContact.customWebsiteUrl || selectedContact.website || ''}
     onChange={(e) => onUpdateContact({ ...selectedContact, customWebsiteUrl: e.target.value, website: e.target.value })}
     placeholder="URL personalizada del cliente..."
     className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-500"
    />
    <input
     value={selectedContact.websiteType || ''}
     onChange={(e) => onUpdateContact({ ...selectedContact, websiteType: e.target.value })}
     placeholder="Tipo de web: corporativa, ecommerce, app..."
     className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-violet-500"
    />
    <input
     value={selectedContact.companyEmailCredentials || ''}
     onChange={(e) => onUpdateContact({ ...selectedContact, companyEmailCredentials: e.target.value })}
     placeholder="Email empresa y credenciales..."
     className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-violet-500"
    />
    <textarea
     value={selectedContact.websiteCredentials || ''}
     onChange={(e) => onUpdateContact({ ...selectedContact, websiteCredentials: e.target.value })}
     placeholder="Credenciales de la web / admin / CMS..."
     rows={2}
     className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-violet-500"
    />
    <textarea
     value={[selectedContact.supabaseCredentials, selectedContact.platformCredentials].filter(Boolean).join('\n')}
     onChange={(e) => onUpdateContact({ ...selectedContact, platformCredentials: e.target.value })}
     placeholder="Supabase, Render y otras plataformas con credenciales..."
     rows={2}
     className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-violet-500"
    />
    {selectedContact.needsWebsite && !selectedContact.websiteReady && !hasAssignedWebsite(selectedContact) && (
     <div className="md:col-span-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] font-bold text-amber-300">
     Le falta web
     </div>
    )}
    {selectedContact.closingStatus === 'Cerrado' && (
     <div className="md:col-span-2 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
     <div>
      <p className="text-[10px] uppercase tracking-wider font-mono font-bold text-cyan-300">Cliente cerrado desde Closing</p>
      <p className="text-xs text-slate-300 mt-1">
      {selectedContact.websiteReady ? 'Web completada y lista para enviar.' : 'Pendiente de preparar o asignar web.'}
      </p>
     </div>
     <div className="flex flex-wrap gap-2">
      {!selectedContact.websiteReady && (
      <button
       onClick={() => handleMarkWebsiteReady(selectedContact)}
       disabled={!hasAssignedWebsite(selectedContact)}
       className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-black text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
      >
       Marcar web lista
      </button>
      )}
      {selectedContact.websiteReady && buildWhatsAppUrl(selectedContact) && (
      <a
       href={buildWhatsAppUrl(selectedContact)}
       target="_blank"
       rel="noreferrer"
       className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-black text-emerald-300 hover:bg-emerald-500/25"
      >
       Enviar WhatsApp al cliente
      </a>
      )}
     </div>
     </div>
    )}
    </div>

    {/* Legacy generator removed: demos are now managed in the global Vercel catalog. */}
    {false && (() => {
    const websiteConfig = parseDemoWebsiteConfig(selectedContact);
    const shareUrl = getWebsiteShareUrl(selectedContact);
    const editUrl = `${shareUrl}?edit=1`;
    return (
     <div className="p-4 bg-emerald-500/[0.035] border border-emerald-500/10 rounded-2xl space-y-4">
     <div className="flex items-start justify-between gap-3">
      <div>
      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
       <Globe className="w-3.5 h-3.5" />
       <span>Generador de Web Demo</span>
      </div>
      <p className="text-[9px] text-slate-500 leading-relaxed mt-1">
       Asocia una plantilla al cliente, elige un diseño y edítalo en tiempo real antes de compartirlo.
      </p>
      </div>
      <a
      href={editUrl}
      target="_blank"
      rel="noreferrer"
      className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-[9px] rounded-lg text-emerald-300 font-bold flex items-center gap-1 transition"
      >
      <ExternalLink className="w-3 h-3" />
      Editar
      </a>
     </div>

     <div className="grid grid-cols-3 gap-1.5">
      {TEMPLATE_VARIANTS.map(item => {
      const active = websiteConfig.variant === item.key;
      return (
       <button
       key={item.key}
       type="button"
       title={item.description}
       onClick={() => updateDemoWebsite(selectedContact, { variant: item.key })}
       className={`py-2 rounded-xl text-[8px] font-bold border transition cursor-pointer ${
        active ?
        'bg-cyan-500/15 border-cyan-500/35 text-cyan-300'
        : 'bg-black/25 border-white/5 text-slate-450 hover:text-slate-200 hover:bg-white/5'
       }`}
       >
       {item.label}
       </button>
      );
      })}
     </div>

     <div className="space-y-2">
      <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono block">
      Menú superior
      </label>
      <div className="grid grid-cols-3 gap-1.5">
      {HEADER_STYLES.map(item => {
       const active = websiteConfig.headerStyle === item.key;
       return (
       <button
        key={item.key}
        type="button"
        title={item.description}
        onClick={() => updateDemoWebsite(selectedContact, { headerStyle: item.key })}
        className={`py-2 rounded-xl text-[8px] font-bold border transition cursor-pointer ${
        active ?
         'bg-blue-500/15 border-blue-500/35 text-blue-300'
         : 'bg-black/25 border-white/5 text-slate-450 hover:text-slate-200 hover:bg-white/5'
        }`}
       >
        {item.label}
       </button>
       );
      })}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
      {HEADER_BACKGROUNDS.map(item => {
       const active = websiteConfig.headerBackground === item.key;
       return (
       <button
        key={item.key}
        type="button"
        title={item.description}
        onClick={() => updateDemoWebsite(selectedContact, { headerBackground: item.key })}
        className={`py-2 rounded-xl text-[8px] font-bold border transition cursor-pointer ${
        active ?
         'bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-300'
         : 'bg-black/25 border-white/5 text-slate-450 hover:text-slate-200 hover:bg-white/5'
        }`}
       >
        {item.label}
       </button>
       );
      })}
      </div>
      <button
      type="button"
      onClick={() => updateDemoWebsite(selectedContact, { headerSticky: !websiteConfig.headerSticky })}
      className={`w-full py-2 rounded-xl text-[9px] font-bold border transition cursor-pointer ${
       websiteConfig.headerSticky ?
       'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
       : 'bg-black/25 border-white/5 text-slate-450 hover:text-slate-200 hover:bg-white/5'
      }`}
      >
      Menú sticky: {websiteConfig.headerSticky ? 'Activado' : 'Desactivado'}
      </button>
     </div>

     <div className="grid grid-cols-3 gap-1.5">
      {[
      { key: 'peluqueria' as const, label: 'Peluqueria' },
      { key: 'restaurante' as const, label: 'Restaurante' },
      { key: 'mantenimiento' as const, label: 'Mantenimiento' }
      ].map(item => {
      const active = websiteConfig.template === item.key;
      return (
       <button
       key={item.key}
       type="button"
       onClick={() => handleSelectWebsiteTemplate(selectedContact, item.key)}
       className={`py-2 rounded-xl text-[9px] font-bold border transition cursor-pointer ${
        active ?
        'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
        : 'bg-black/25 border-white/5 text-slate-450 hover:text-slate-200 hover:bg-white/5'
       }`}
       >
       {item.label}
       </button>
      );
      })}
     </div>

     <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
      <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono block">Nombre web</label>
      <input
       value={websiteConfig.businessName}
       onChange={(e) => updateDemoWebsite(selectedContact, { businessName: e.target.value })}
       className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500"
      />
      </div>
      <div className="space-y-1.5">
      <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono flex items-center gap-1">
       <Palette className="w-3 h-3" />
       Color
      </label>
      <input
       type="color"
       value={websiteConfig.brandColor}
       onChange={(e) => updateDemoWebsite(selectedContact, { brandColor: e.target.value })}
       className="w-full h-[34px] bg-black/40 border border-white/10 rounded-xl px-2 py-1 cursor-pointer"
      />
      </div>
     </div>

     <div className="space-y-2">
      <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono flex items-center gap-1">
      <Image className="w-3 h-3" />
      Logo y banner
      </label>
      <input
      value={websiteConfig.logoUrl}
      onChange={(e) => updateDemoWebsite(selectedContact, { logoUrl: e.target.value })}
      placeholder="URL del logo..."
      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500"
      />
      <input
      value={websiteConfig.bannerUrl}
      onChange={(e) => updateDemoWebsite(selectedContact, { bannerUrl: e.target.value })}
      placeholder="URL del banner..."
      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500"
      />
     </div>

     <div className="space-y-2">
      <input
      value={websiteConfig.address}
      onChange={(e) => updateDemoWebsite(selectedContact, { address: e.target.value })}
      placeholder="Direccion del negocio..."
      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500"
      />
      <input
      value={websiteConfig.phone}
      onChange={(e) => updateDemoWebsite(selectedContact, { phone: e.target.value })}
      placeholder="Telefono de contacto..."
      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500"
      />
     </div>

     <textarea
      value={websiteConfig.headline}
      onChange={(e) => updateDemoWebsite(selectedContact, { headline: e.target.value })}
      rows={2}
      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500"
     />
     <textarea
      value={websiteConfig.subtitle}
      onChange={(e) => updateDemoWebsite(selectedContact, { subtitle: e.target.value })}
      rows={2}
      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500"
     />

     <div className="flex gap-2">
      <input
      value={shareUrl}
      readOnly
      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-400 font-mono"
      />
      <button
      type="button"
      onClick={() => {
       navigator.clipboard.writeText(shareUrl);
       setCopiedWebsiteLink(true);
       setTimeout(() => setCopiedWebsiteLink(false), 2000);
      }}
      className="px-3 py-2 bg-neutral-900 border border-white/10 hover:bg-neutral-800 rounded-xl text-[10px] font-bold text-slate-200 flex items-center gap-1.5"
      >
      <Copy className="w-3.5 h-3.5" />
      {copiedWebsiteLink ? 'Copiado' : 'Copiar'}
      </button>
     </div>
     </div>
    );
    })()}

    {/* AI Auto-Stack Blueprint suggestions */}
    <div className="p-4 bg-violet-600/[0.04] border border-violet-500/10 rounded-2xl space-y-2.5">
    <div className="flex items-center gap-1.5 text-xs text-violet-400 font-bold">
     <Sparkles className="w-3.5 h-3.5 text-violet-400" />
     <span>Autocargar Stack y Tareas (IA Blueprints)</span>
    </div>
    <p className="text-[9px] text-slate-500 leading-relaxed">
     ¿Quieres maquetar rápido? Carga un kit tecnológico inicial y un plan de acción para el developer de inmediato:
    </p>
    <div className="grid grid-cols-4 gap-1.5">
     <button
     onClick={() => handleApplyAIPreset(selectedContact, 'saas')}
     className="py-1 bg-violet-950/20 hover:bg-violet-950/40 text-[9px] border border-violet-500/15 rounded text-violet-300 hover:text-white transition"
     title="Cargar preset SaaS Inteligente"
     >
     SaaS 🤖
     </button>
     <button
     onClick={() => handleApplyAIPreset(selectedContact, 'ecommerce')}
     className="py-1 bg-violet-950/20 hover:bg-violet-950/40 text-[9px] border border-violet-500/15 rounded text-violet-300 hover:text-white transition"
     title="Cargar preset Comercio Online"
     >
     E-Comm 🛒
     </button>
     <button
     onClick={() => handleApplyAIPreset(selectedContact, 'corporate')}
     className="py-1 bg-violet-950/20 hover:bg-violet-950/40 text-[9px] border border-violet-500/15 rounded text-violet-300 hover:text-white transition"
     title="Cargar preset Landing Corporativa"
     >
     Corporativo 🏢
     </button>
     <button
     onClick={() => handleApplyAIPreset(selectedContact, 'mobile')}
     className="py-1 bg-violet-950/20 hover:bg-violet-950/40 text-[9px] border border-violet-500/15 rounded text-violet-300 hover:text-white transition"
     title="Cargar preset App Movil"
     >
     Móvil 📱
     </button>
    </div>
    </div>

    {/* Tech Stack Selection */}
    <div className="space-y-2">
    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-450 font-mono block">
     Tecnologías Planificadas
    </label>
    <div className="flex flex-wrap gap-1">
     {PRESET_STACK_TILES.map((t) => {
     const isSelected = (selectedContact.devTechStack || []).includes(t);
     return (
      <button
      key={t}
      onClick={() => handleToggleTech(selectedContact, t)}
      className={`text-[8px] px-2 py-1 rounded transition border cursor-pointer font-mono ${
       isSelected ?
       'bg-amber-500/15 text-amber-300 border-amber-500/35'
       : 'bg-black/35 border-white/5 text-slate-400 hover:text-slate-200'
      }`}
      >
      {t}
      </button>
     );
     })}
    </div>

    {/* Custom Tech Add */}
    <div className="flex gap-1.5 mt-2">
     <input
     type="text"
     value={newCustomTech}
     onChange={(e) => setNewCustomTech(e.target.value)}
     placeholder="Añadir tecnología personalizada..."
     className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-200 pl-3 flex-1 focus:outline-none focus:border-violet-500"
     onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTech(selectedContact)}
     />
     <button
     type="button"
     onClick={() => handleAddCustomTech(selectedContact)}
     className="px-2.5 py-1 bg-neutral-900 border border-white/10 rounded-lg text-[10px] font-bold text-slate-350 hover:text-white hover:bg-neutral-800 transition"
     >
     Añadir
     </button>
    </div>
    </div>

    {/* Developer Technical Notes */}
    <div className="space-y-1.5 text-left">
    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-450 font-mono block">
     Bitácora de Desarrolladores (Anotaciones Técnicas)
    </label>
    <textarea
     value={selectedContact.devNotes || ''}
     onChange={(e) => handleUpdateDevNotes(selectedContact, e.target.value)}
     placeholder="Aquí puedes almacenar requerimientos, credenciales del repo, enlaces a prototipos en Figma o notas internas..."
     rows={4}
     className="w-full bg-black/40 border border-white/10 hover:border-white/15 focus:border-violet-500 focus:outline-none text-xs text-slate-300 px-3 py-2 rounded-xl transition"
    />
    </div>

    {/* Development Tasks Checklist */}
    <div className="space-y-3">
    <div className="flex items-center justify-between">
     <label className="text-[10px] uppercase tracking-wider font-bold text-slate-450 font-mono flex items-center gap-1.5">
     <ListTodo className="w-3.5 h-3.5 text-slate-400" />
     Lista de Tareas ({getParsedChecklist(selectedContact).filter(t => t.done).length} / {getParsedChecklist(selectedContact).length})
     </label>
    </div>

    {/* Tasks loop */}
    <div className="bg-black/25 border border-white/5 rounded-xl divide-y divide-white/5 max-h-[200px] overflow-y-auto p-1 text-xs">
     {getParsedChecklist(selectedContact).map((item) => (
     <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.015] transition">
      <button
      type="button"
      onClick={() => handleToggleCheckitem(selectedContact, item.id)}
      className="flex items-center gap-2.5 flex-1 cursor-pointer text-left"
      >
      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[9px] ${
       item.done  ?
       'bg-violet-500/20 border-violet-500 text-violet-400' 
       : 'border-white/20 hover:border-white/30 text-transparent'
      }`}>
       ✓
      </span>
      <span className={`text-xs ${item.done ? 'line-through text-slate-500' : 'text-slate-350'}`}>
       {item.text}
      </span>
      </button>
      <button
      type="button"
      onClick={() => handleDeleteCheckitem(selectedContact, item.id)}
      className="text-slate-500 hover:text-rose-400 transition"
      >
      <Trash2 className="w-3.5 h-3.5" />
      </button>
     </div>
     ))}

     {getParsedChecklist(selectedContact).length === 0 && (
     <p className="text-[10px] text-slate-500 text-center py-4">No hay tareas creadas para este desarrollo.</p>
     )}
    </div>

    {/* Quick Add Form Task */}
    <div className="flex gap-2">
     <input
     type="text"
     value={newChecklistText}
     onChange={(e) => setNewChecklistText(e.target.value)}
     placeholder="Nueva tarea (ej. 'Subir a producción')..."
     className="flex-grow bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 pl-4"
     onKeyDown={(e) => e.key === 'Enter' && handleAddCheckitem(selectedContact, newChecklistText)}
     />
     <button
     type="button"
     onClick={() => handleAddCheckitem(selectedContact, newChecklistText)}
     className="p-2 bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-violet-400 hover:text-violet-300 rounded-xl transition cursor-pointer"
     >
     <Plus className="w-5 h-5" />
     </button>
    </div>

    </div>

    {/* Save development info */}
    <div className="pt-4 border-t border-white/5">
    <button
     type="button"
     onClick={() => onUpdateContact(selectedContact)}
     className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/10"
    >
     <CheckCircle2 className="w-4 h-4" />
     Guardar info de desarrollo
    </button>
    <p className="text-[9px] text-slate-500 text-center mt-1.5 leading-normal">
     Guarda demo, URL, credenciales, tareas y estado interno del cliente.
    </p>
    </div>

   </div>
   ) : (
   <div className="bg-white/[0.01] border border-dashed border-white/5 py-24 rounded-3xl text-center space-y-4">
    <Code className="w-12 h-12 text-slate-600 mx-auto" />
    <div className="space-y-1">
    <h4 className="text-sm font-bold text-slate-350">Selecciona un cliente de la lista</h4>
    <p className="text-xs text-slate-500 max-w-xs mx-auto">
     Podrás ver sus requerimientos, añadir tareas personalizadas, asignar developers e iniciar la publicación hacia el portafolio público.
    </p>
    </div>
   </div>
   )}
  </div>

  </div>

 </div>
 );
}
