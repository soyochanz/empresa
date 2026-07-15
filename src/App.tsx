import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Screen, ClientContact, CalendarEvent, Note, Activity, ComercialAccount, ComercialLead, ColdCallingLead, Invoice, FinanceTransaction } from './types';
import { 
 initialContacts, 
 initialEvents, 
 initialNotes, 
 initialActivities,
 REGISTERED_USERS,
 PanelUser
} from './mockData';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import LandingScreen from './components/LandingScreen';
import DashboardScreen from './components/DashboardScreen';
import CalendarScreen from './components/CalendarScreen';
import CrmScreen from './components/CrmScreen';
import NotesScreen from './components/NotesScreen';
import ProjectsScreen, { INITIAL_PROJECTS, AgencyProject } from './components/ProjectsScreen';
import ContactosScreen from './components/ContactosScreen';
import FinanceScreen from './components/FinanceScreen';
import CitasScreen from './components/CitasScreen';
import ContractsScreen from './components/ContractsScreen';
import ComercialesAccesoScreen from './components/ComercialesAccesoScreen';
import ComercialesPanelScreen from './components/ComercialesPanelScreen';
import ComercialesAdminScreen from './components/ComercialesAdminScreen';
import ColdCallingScreen from './components/ColdCallingScreen';
import DeveloperHubScreen from './components/DeveloperHubScreen';
import MarketingScreen from './components/MarketingScreen';
import DepartmentsScreen from './components/DepartmentsScreen';
import { motion, AnimatePresence } from 'motion/react';
import { db, supabase, checkSupabaseConnection, seedSupabaseDatabase, ConnectionStatus } from './supabaseClient';
import SupabaseInfoModal from './components/SupabaseInfoModal';
import { Bell, X, Calendar as CalendarAtom, Check, Menu, Search, Plus, AlertTriangle, Briefcase } from 'lucide-react';

const PRIVATE_EVENTS_CACHE_KEY = 'althera_commercial_private_events';
const EVENTS_CACHE_KEY = 'althera_events_cache';
const DELETED_CONTACTS_CACHE_KEY = 'althera_deleted_contact_ids';
const WORK_DATA_RESET_VERSION = 'production-start-2026-07-14-v2';

const clearResetWorkDataCachesOnce = () => {
 try {
  if (localStorage.getItem('althera_work_data_reset_version') === WORK_DATA_RESET_VERSION) return;
  localStorage.removeItem('crm_cold_leads');
  localStorage.removeItem('crm_comercial_leads');
  localStorage.removeItem('althera_contacts_cache');
  localStorage.removeItem(EVENTS_CACHE_KEY);

  const cachedAccounts = JSON.parse(localStorage.getItem('crm_comerciales_accounts') || '[]');
  if (Array.isArray(cachedAccounts)) {
   localStorage.setItem('crm_comerciales_accounts', JSON.stringify(cachedAccounts.map(account => ({
    ...account,
    payouts: [],
    extraCommissions: [],
    monthlyPerformance: {},
    legacyBonuses: []
   }))));
  }

  const cachedCurrentComercial = JSON.parse(sessionStorage.getItem('agency_current_comercial') || 'null');
  if (cachedCurrentComercial) {
   sessionStorage.setItem('agency_current_comercial', JSON.stringify({
    ...cachedCurrentComercial,
    payouts: [],
    extraCommissions: [],
    monthlyPerformance: {},
    legacyBonuses: []
   }));
  }

  localStorage.setItem('althera_work_data_reset_version', WORK_DATA_RESET_VERSION);
 } catch (error) {
  console.warn('Could not clear reset work data caches:', error);
 }
};

clearResetWorkDataCachesOnce();

const readDeletedContactIds = (): string[] => {
 try {
  const parsed = JSON.parse(localStorage.getItem(DELETED_CONTACTS_CACHE_KEY) || '[]');
  return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
 } catch { return []; }
};

const writeDeletedContactIds = (ids: string[]) => {
 try { localStorage.setItem(DELETED_CONTACTS_CACHE_KEY, JSON.stringify(Array.from(new Set(ids)))); }
 catch (error) { console.warn('Could not persist deleted CRM contacts:', error); }
};

const rememberDeletedContact = (id: string) => writeDeletedContactIds([...readDeletedContactIds(), id]);
const forgetDeletedContact = (id: string) => writeDeletedContactIds(readDeletedContactIds().filter(item => item !== id));

const getLocalDateKey = (date = new Date()) => {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 const day = String(date.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
};

const isClosingAppointmentEvent = (event: CalendarEvent) =>
 event.id.startsWith('cc_appointment_') ||
 event.alias === 'Cita Cold Calling' ||
 event.linkedContactId?.startsWith('crm_from_');

const getClosingLeadIdFromEvent = (event: CalendarEvent) => {
 if (event.linkedContactId?.startsWith('crm_from_')) return event.linkedContactId.slice('crm_from_'.length);
 if (event.id.startsWith('cc_appointment_')) return event.id.slice('cc_appointment_'.length);
 return undefined;
};

const readEventCache = (): CalendarEvent[] => {
 try {
  const parsed = JSON.parse(localStorage.getItem(EVENTS_CACHE_KEY) || '[]');
  return Array.isArray(parsed) ? parsed : [];
 } catch { return []; }
};
const readPrivateEventCache = (): CalendarEvent[] => {
 try {
  const parsed = JSON.parse(localStorage.getItem(PRIVATE_EVENTS_CACHE_KEY) || '[]');
  return Array.isArray(parsed) ? parsed.filter(event => event?.isPrivate && event?.comercialId) : [];
 } catch { return []; }
};
const writePrivateEventCache = (events: CalendarEvent[]) => {
 try { localStorage.setItem(PRIVATE_EVENTS_CACHE_KEY, JSON.stringify(events.filter(event => event.isPrivate && event.comercialId))); }
 catch (error) { console.warn('Could not persist private commercial calendar cache:', error); }
};
const upsertPrivateEventCache = (event: CalendarEvent) => {
 const cached = readPrivateEventCache();
 writePrivateEventCache([...cached.filter(item => item.id !== event.id), event]);
};

function getScreenFromPath(pathString: string, isLoggedIn: boolean, isComercialLoggedIn: boolean): { screen: Screen; redirectedPath?: string } {
 let path = pathString || '/';
 // Strip trailing slashes to maintain uniform match
 if (path !== '/' && path.endsWith('/')) {
 path = path.slice(0, -1);
 }
 
 if (path === '/' || path === '') {
 return { screen: 'landing' };
 }

 if (path === '/acceso' || path === '/login') {
 if (isLoggedIn) {
  return { screen: 'dashboard', redirectedPath: '/admin/dashboard' };
 }
 return { screen: 'acceso' };
 }
 
 if (path === '/comerciales') {
 if (isComercialLoggedIn) {
  return { screen: 'comerciales_panel', redirectedPath: '/comerciales/panel' };
 }
 return { screen: 'comerciales_acceso', redirectedPath: '/comerciales/acceso' };
 }
 if (path === '/comerciales/acceso') {
 if (isComercialLoggedIn) {
  return { screen: 'comerciales_panel', redirectedPath: '/comerciales/panel' };
 }
 return { screen: 'comerciales_acceso' };
 }
 if (path === '/comerciales/panel') {
 if (!isComercialLoggedIn) {
  return { screen: 'comerciales_acceso', redirectedPath: '/comerciales/acceso' };
 }
 return { screen: 'comerciales_panel' };
 }
 if (path.startsWith('/comerciales/panel/')) {
  if (!isComercialLoggedIn) {
   return { screen: 'comerciales_acceso', redirectedPath: '/comerciales/acceso' };
  }
  return { screen: 'comerciales_panel' };
 }

 // Admin and sub panels
 if (path.startsWith('/admin')) {
 if (!isLoggedIn) {
  return { screen: 'acceso', redirectedPath: '/acceso' };
 }
 
 if (path === '/admin' || path === '/admin/' || path === '/admin/dashboard') {
  return { screen: 'dashboard' };
 }
 if (path === '/admin/calendar') return { screen: 'calendar' };
 if (path === '/admin/crm') return { screen: 'crm' };
 if (path === '/admin/notes') return { screen: 'notes' };
 if (path === '/admin/projects') return { screen: 'projects' };
 if (path === '/admin/finanzas') return { screen: 'finanzas' };
 if (path === '/admin/contactos') return { screen: 'contactos' };
 if (path === '/admin/citas') return { screen: 'citas' };
 if (path === '/admin/contratos') return { screen: 'contratos' };
 if (path === '/admin/comerciales') return { screen: 'comerciales_admin' };
 if (path === '/admin/cold-calling') return { screen: 'cold_calling' };
 if (path === '/admin/dev-hub') return { screen: 'developer_hub' };
 if (path === '/admin/marketing') return { screen: 'marketing' };
 if (path === '/admin/departamentos') return { screen: 'departamentos' };
 
 return { screen: 'dashboard' };
 }

 return { screen: 'landing' };
}

function getPathFromScreen(screen: Screen): string {
 switch (screen) {
 case 'landing': return '/';
 case 'acceso': return '/acceso';
 case 'comerciales_acceso': return '/comerciales/acceso';
 case 'comerciales_panel': return '/comerciales/panel';
 case 'dashboard': return '/admin/dashboard';
 case 'calendar': return '/admin/calendar';
 case 'crm': return '/admin/crm';
 case 'notes': return '/admin/notes';
 case 'projects': return '/admin/projects';
 case 'developer_hub': return '/admin/dev-hub';
 case 'marketing': return '/admin/marketing';
 case 'departamentos': return '/admin/departamentos';
 case 'finanzas': return '/admin/finanzas';
 case 'contactos': return '/admin/contactos';
 case 'citas': return '/admin/citas';
 case 'contratos': return '/admin/contratos';
 case 'comerciales_admin': return '/admin/comerciales';
 case 'cold_calling': return '/admin/cold-calling';
 default: return '/';
 }
}

export default function App() {
 // Screens state
 const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
 const initialPath = window.location.pathname || '/';
 const savedUser = sessionStorage.getItem('agency_user');
 const parsedUser = savedUser ? JSON.parse(savedUser) : null;
 const isLoggedIn = !!parsedUser?.email;
 const savedComercial = sessionStorage.getItem('agency_current_comercial');
 const isComercialLoggedIn = !!savedComercial;

 const { screen } = getScreenFromPath(initialPath, isLoggedIn, isComercialLoggedIn);
 return screen;
 });
 const [transitionType, setTransitionType] = useState<'none' | 'push' | 'push_back'>('none');

 // Track current screen for background persistence
 useEffect(() => {
 sessionStorage.setItem('agency_current_screen', currentScreen);
 }, [currentScreen]);

 // Supabase connection and state synchronization status
 const [supabaseStatus, setSupabaseStatus] = useState<ConnectionStatus & { loading: boolean }>({
 connected: false,
 tablesExist: false,
 loading: true,
 error: undefined
 });
 const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

 // Authentication state
 const [currentUser, setCurrentUser] = useState<{ id: string | null; email: string; name: string } | null>(() => {
 const saved = sessionStorage.getItem('agency_user');
 const parsed = saved ? JSON.parse(saved) : null;
 return parsed?.email ? parsed : null;
 });
 const [authReady, setAuthReady] = useState(false);

 // Persistence Engine Database State (with standard fallback to empty arrays)
 const [contacts, setContacts] = useState<ClientContact[]>(() => {
 try { return JSON.parse(localStorage.getItem('althera_contacts_cache') || '[]'); }
 catch { return []; }
 });

 const [events, setEvents] = useState<CalendarEvent[]>(() => {
  const cachedEvents = readEventCache();
  const ids = new Set(cachedEvents.map(event => event.id));
  return [...cachedEvents, ...readPrivateEventCache().filter(event => !ids.has(event.id))];
 });
 const [focusedAdminClosingLeadId, setFocusedAdminClosingLeadId] = useState<string>();
 const [closingAlertClock, setClosingAlertClock] = useState(() => Date.now());
 const [handledClosingAlertIds, setHandledClosingAlertIds] = useState<string[]>(() => {
  try {
   const parsed = JSON.parse(localStorage.getItem('althera_handled_closing_alerts') || '[]');
   return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
  } catch { return []; }
 });

 useEffect(() => {
  const timer = window.setInterval(() => setClosingAlertClock(Date.now()), 15_000);
  return () => window.clearInterval(timer);
 }, []);

 useEffect(() => {
  try { localStorage.setItem('althera_handled_closing_alerts', JSON.stringify(handledClosingAlertIds)); }
  catch (error) { console.warn('Could not persist closing alert decisions:', error); }
 }, [handledClosingAlertIds]);

 useEffect(() => {
  try { localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(events)); }
  catch (error) { console.warn('Could not cache calendar events:', error); }
 }, [events]);

 const [notes, setNotes] = useState<Note[]>([]);

 const [activities, setActivities] = useState<Activity[]>([]);

 // Global projects state
 const [projects, setProjects] = useState<any[]>(() => {
 try {
  const saved = localStorage.getItem('crm_projects');
  if (saved) {
  const parsed = JSON.parse(saved);
  if (parsed.length >= INITIAL_PROJECTS.length) {
   return parsed;
  }
  }
  localStorage.setItem('crm_projects', JSON.stringify(INITIAL_PROJECTS));
  return INITIAL_PROJECTS;
 } catch {
  return INITIAL_PROJECTS;
 }
 });

 // Dynamic users state
 const [usersList, setUsersList] = useState<PanelUser[]>(REGISTERED_USERS);

 // Comerciales accounts and logged-in state
 const [comercialesList, setComercialesList] = useState<ComercialAccount[]>(() => {
 try {
  const saved = localStorage.getItem('crm_comerciales_accounts');
  if (saved) return JSON.parse(saved);
  
  const defaultComs: ComercialAccount[] = [
  {
   id: 'com_demo',
   name: 'Alfonso Sales',
   email: 'vendedor@agency.com',
   createdAt: new Date().toISOString(),
   iban: 'ES21 0000 0000 0000 0000 0000',
   bic: 'BSANES2X',
   bankName: 'Banco Santander',
   payouts: []
  },
  {
   id: 'com_maria',
   name: 'María Gómez',
   email: 'maria@agency.com',
   createdAt: new Date().toISOString(),
   iban: 'ES21 1111 2222 3333 4444 5555',
   bic: 'BBVAESMM',
   bankName: 'BBVA',
   payouts: []
  },
  {
   id: 'com_javier',
   name: 'Javier Ruiz',
   email: 'javier@agency.com',
   createdAt: new Date().toISOString(),
   iban: 'ES21 9999 8888 7777 6666 5555',
   bic: 'CAIXAESX',
   bankName: 'CaixaBank',
   payouts: []
  }
  ];
  localStorage.setItem('crm_comerciales_accounts', JSON.stringify(defaultComs));
  return defaultComs;
 } catch {
  return [];
 }
 });

 const [leadsList, setLeadsList] = useState<ComercialLead[]>(() => {
 try {
  const saved = localStorage.getItem('crm_comercial_leads');
  if (saved) return JSON.parse(saved);
  return [];
  
  const seedLeads: ComercialLead[] = [
  // Enero 2026
  { id: 'lead_s1', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Alfonso', company: 'SaaS Logistics SL', email: 'contacto@saaslog.com', phone: '654321098', status: 'Ganado', value: 12000, notes: 'Cliente cerrado en campaña de logística.', temperature: 'Caliente', isDone: true, createdAt: '2026-01-15T10:00:00.000Z' },
  { id: 'lead_s2', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Laura', company: 'Inmobiliaria Express', email: 'laura@inmoexp.es', phone: '612345678', status: 'Ganado', value: 6000, notes: 'Proyecto de software de gestión.', temperature: 'Caliente', isDone: true, createdAt: '2026-01-22T14:30:00.000Z' },
  { id: 'lead_s3', comercialId: 'com_maria', comercialName: 'María Gómez', name: 'Alberto', company: 'Consultora HR Nova', email: 'info@hrnova.com', phone: '699887766', status: 'Perdido', value: 8500, notes: 'Presupuesto descartado por costes.', temperature: 'Frío', isDone: true, createdAt: '2026-01-10T09:15:00.000Z' },
  { id: 'lead_s4', comercialId: 'com_javier', comercialName: 'Javier Ruiz', name: 'Patricia', company: 'Fintech Alborán', email: 'p.alboran@fintech.io', phone: '633445566', status: 'Pendiente', value: 15000, notes: 'Interesados en pasarela de pago personalizada.', temperature: 'Templado', isDone: false, createdAt: '2026-01-18T16:00:00.000Z' },
  
  // Febrero 2026
  { id: 'lead_s5', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Jorge', company: 'Clínica Dental Premium', email: 'jorge@dentalpremium.com', phone: '688112233', status: 'Ganado', value: 9500, notes: 'CRM de citas y fichas clínicas.', temperature: 'Caliente', isDone: true, createdAt: '2026-02-12T11:00:00.000Z' },
  { id: 'lead_s6', comercialId: 'com_maria', comercialName: 'María Gómez', name: 'Elena', company: 'E-commerce Calzados', email: 'elena@zapatoshops.es', phone: '622778899', status: 'Ganado', value: 4500, notes: 'Tienda Shopify a medida con headless API.', temperature: 'Caliente', isDone: true, createdAt: '2026-02-18T15:20:00.000Z' },
  { id: 'lead_s7', comercialId: 'com_javier', comercialName: 'Javier Ruiz', name: 'Mario', company: 'Agencia de Viajes Nómada', email: 'nomada@viajes.com', phone: '677443322', status: 'Negociación', value: 11000, notes: 'Ajustando integraciones con Amadeus.', temperature: 'Caliente', isDone: false, createdAt: '2026-02-05T10:30:00.000Z' },
  { id: 'lead_s8', comercialId: 'com_maria', comercialName: 'María Gómez', name: 'Víctor', company: 'Supermercados Hércules', email: 'v.hercules@super.es', phone: '600112233', status: 'Perdido', value: 24000, notes: 'Decidieron desarrollarlo con equipo interno.', temperature: 'Frío', isDone: true, createdAt: '2026-02-25T17:45:00.000Z' },
  
  // Marzo 2026
  { id: 'lead_s9', comercialId: 'com_maria', comercialName: 'María Gómez', name: 'Raúl', company: 'Software Distribuido', email: 'raul@distsoft.io', phone: '611559900', status: 'Ganado', value: 18000, notes: 'Desarrollo de panel de control SaaS.', temperature: 'Caliente', isDone: true, createdAt: '2026-03-08T09:00:00.000Z' },
  { id: 'lead_s10', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Diana', company: 'Gimnasios FitLife', email: 'diana@fitlife.es', phone: '655331122', status: 'Ganado', value: 7500, notes: 'App móvil de entrenamiento integrada.', temperature: 'Caliente', isDone: true, createdAt: '2026-03-14T12:00:00.000Z' },
  { id: 'lead_s11', comercialId: 'com_javier', comercialName: 'Javier Ruiz', name: 'Carlos', company: 'Restauración Madrid Group', email: 'c.restaurantes@madrid.es', phone: '699228811', status: 'Contactado', value: 13000, notes: 'En espera de propuesta de digitalización completa.', temperature: 'Templado', isDone: false, createdAt: '2026-03-21T14:10:00.000Z' },
  { id: 'lead_s12', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Sonia', company: 'Automoción Getafe', email: 'sonia@autogetafe.com', phone: '644889900', status: 'Ganado', value: 16500, notes: 'Intranet de postventa y recambios.', temperature: 'Caliente', isDone: true, createdAt: '2026-03-29T16:30:00.000Z' },
  
  // Abril 2026
  { id: 'lead_s13', comercialId: 'com_javier', comercialName: 'Javier Ruiz', name: 'Francisco', company: 'Despacho Abogados Aranzadi', email: 'f.aranzadi@abogados.com', phone: '600334411', status: 'Ganado', value: 14000, notes: 'Gestor documental con firma digital integrada.', temperature: 'Caliente', isDone: true, createdAt: '2026-04-11T10:15:00.000Z' },
  { id: 'lead_s14', comercialId: 'com_maria', comercialName: 'María Gómez', name: 'Marta', company: 'Energías Renovables Sur', email: 'marta@renosur.es', phone: '622446688', status: 'Perdido', value: 35000, notes: 'Proyecto cancelado por cambio de dirección.', temperature: 'Frío', isDone: true, createdAt: '2026-04-18T13:00:00.000Z' },
  { id: 'lead_s15', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Andrés', company: 'Colegio Mayor Minerva', email: 'andres@minervacm.es', phone: '677112288', status: 'Ganado', value: 10500, notes: 'Web y pasarela de matrículas.', temperature: 'Caliente', isDone: true, createdAt: '2026-04-22T15:00:00.000Z' },
  { id: 'lead_s16', comercialId: 'com_javier', comercialName: 'Javier Ruiz', name: 'Lucas', company: 'Plataforma de Cursos Sapiens', email: 'lucas@sapiens.es', phone: '611990022', status: 'Negociación', value: 8900, notes: 'Enviada propuesta económica final.', temperature: 'Templado', isDone: false, createdAt: '2026-04-27T11:20:00.000Z' },
  
  // Mayo 2026
  { id: 'lead_s17', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Ramón', company: 'Logística Inteligente Express', email: 'ramon@logintel.es', phone: '655887766', status: 'Ganado', value: 22000, notes: 'Panel administrativo de rutas optimizadas por IA.', temperature: 'Caliente', isDone: true, createdAt: '2026-05-04T09:45:00.000Z' },
  { id: 'lead_s18', comercialId: 'com_maria', comercialName: 'María Gómez', name: 'Sofía', company: 'Constructora del Águila', email: 'sofia@delaguila.es', phone: '688992211', status: 'Ganado', value: 45000, notes: 'ERP completo de compras y subcontratas.', temperature: 'Caliente', isDone: true, createdAt: '2026-05-12T14:00:00.000Z' },
  { id: 'lead_s19', comercialId: 'com_javier', comercialName: 'Javier Ruiz', name: 'Isabel', company: 'Laboratorios Biotech SL', email: 'isabel@biotechsl.es', phone: '611223344', status: 'Perdido', value: 19500, notes: 'No respondieron tras dos semanas de seguimiento.', temperature: 'Frío', isDone: true, createdAt: '2026-05-19T16:15:00.000Z' },
  { id: 'lead_s20', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Daniel', company: 'Cadena de Hoteles Sol', email: 'daniel@hotelessol.com', phone: '644556677', status: 'Ganado', value: 30000, notes: 'Portal de reservas multi-idioma integrado.', temperature: 'Caliente', isDone: true, createdAt: '2026-05-26T10:00:00.000Z' },
  
  // Junio 2026
  { id: 'lead_s21', comercialId: 'com_maria', comercialName: 'María Gómez', name: 'Hugo', company: 'Startup AI Analytics', email: 'hugo@aianalytic.io', phone: '677990011', status: 'Ganado', value: 28000, notes: 'Modelado predictivo y visualizador interactivo.', temperature: 'Caliente', isDone: true, createdAt: '2026-06-03T11:30:00.000Z' },
  { id: 'lead_s22', comercialId: 'com_javier', comercialName: 'Javier Ruiz', name: 'Clara', company: 'Inversiones Capital Plus', email: 'clara@capitalplus.es', phone: '622003311', status: 'Negociación', value: 50000, notes: 'Panel financiero avanzado de inversiones.', temperature: 'Caliente', isDone: false, createdAt: '2026-06-10T15:00:00.000Z' },
  { id: 'lead_s23', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Miguel', company: 'Distribuidora de Alimentación', email: 'miguel@distribaliment.es', phone: '655667788', status: 'Ganado', value: 16000, notes: 'App de pedidos y control de existencias.', temperature: 'Caliente', isDone: true, createdAt: '2026-06-18T17:20:00.000Z' },
  { id: 'lead_s24', comercialId: 'com_maria', comercialName: 'María Gómez', name: 'Teresa', company: 'Clínicas Médicas Unificadas', email: 'teresa@clinicasunificadas.com', phone: '688554433', status: 'Ganado', value: 21000, notes: 'Historia clínica digital encriptada.', temperature: 'Caliente', isDone: true, createdAt: '2026-06-25T14:40:00.000Z' },
  
  // Julio 2026
  { id: 'lead_s25', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Lucas', company: 'Software RRHH Nexus', email: 'lucas@nexusrrhh.es', phone: '611002233', status: 'Pendiente', value: 13500, notes: 'Reunión fijada para demo la próxima semana.', temperature: 'Templado', isDone: false, createdAt: '2026-07-02T10:00:00.000Z' },
  { id: 'lead_s26', comercialId: 'com_maria', comercialName: 'María Gómez', name: 'Sandra', company: 'Moda Online Sostenible', email: 'sandra@modasost.com', phone: '633889900', status: 'Contactado', value: 9200, notes: 'Interesados en e-commerce ecológico.', temperature: 'Templado', isDone: false, createdAt: '2026-07-05T13:20:00.000Z' }
  ];
  localStorage.setItem('crm_comercial_leads', JSON.stringify(seedLeads));
  return seedLeads;
 } catch {
  return [];
 }
 });

 const [coldLeads, setColdLeads] = useState<ColdCallingLead[]>(() => {
 try {
  const saved = localStorage.getItem('crm_cold_leads');
  return saved ? JSON.parse(saved) : [];
 } catch {
  return [];
 }
 });

 const [currentComercial, setCurrentComercial] = useState<ComercialAccount | null>(() => {
 const saved = sessionStorage.getItem('agency_current_comercial');
 return saved ? JSON.parse(saved) : null;
 });

 useEffect(() => {
 if (currentComercial) {
  sessionStorage.setItem('agency_current_comercial', JSON.stringify(currentComercial));
 } else {
  sessionStorage.removeItem('agency_current_comercial');
 }
 }, [currentComercial]);

 useEffect(() => {
 try {
  localStorage.setItem('crm_comerciales_accounts', JSON.stringify(comercialesList));
 } catch (e) {
  console.error('Failed to save comercialesList to localStorage:', e);
 }
 }, [comercialesList]);

 useEffect(() => {
 try {
  localStorage.setItem('crm_comercial_leads', JSON.stringify(leadsList));
 } catch (e) {
  console.error('Failed to save leadsList to localStorage:', e);
 }
 }, [leadsList]);

 useEffect(() => {
 try {
  localStorage.setItem('crm_cold_leads', JSON.stringify(coldLeads));
 } catch (e) {
  console.error('Failed to save coldLeads to localStorage:', e);
 }
 }, [coldLeads]);

 // Notifications states
 const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
 const saved = localStorage.getItem('agency_read_notifications');
 return saved ? JSON.parse(saved) : [];
 });
 const [notifyHotLeads, setNotifyHotLeads] = useState<boolean>(() => {
 const saved = localStorage.getItem('agency_notify_hot_leads');
 return saved ? saved === 'true' : true;
 });
 const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
 const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

 useEffect(() => {
 localStorage.setItem('agency_read_notifications', JSON.stringify(readNotificationIds));
 }, [readNotificationIds]);
 useEffect(() => {
 localStorage.setItem('agency_notify_hot_leads', String(notifyHotLeads));
 }, [notifyHotLeads]);

 const mergeUsers = (dbProfiles: any[], activeUser: any) => {
 const list: PanelUser[] = [];
 if (activeUser) {
  list.push({
  id: activeUser.id || 'usr_current',
  name: activeUser.name,
  email: activeUser.email
  });
 }

 if (dbProfiles && dbProfiles.length > 0) {
  dbProfiles.forEach(prof => {
  const exists = list.some(u => u.email.toLowerCase() === prof.email.toLowerCase());
  if (!exists) {
   list.push({
   id: prof.id,
   name: prof.name,
   email: prof.email
   });
  }
  });
 }

 REGISTERED_USERS.forEach(staticUser => {
  const exists = list.some(u => u.email.toLowerCase() === staticUser.email.toLowerCase());
  if (!exists) {
  list.push(staticUser);
  }
 });

 return list;
 };

 const fetchAndSetProfiles = async (activeUser?: any) => {
 try {
  const dbProfiles = await db.getProfiles();
  const merged = mergeUsers(dbProfiles, activeUser || currentUser);
  setUsersList(merged);
 } catch (e) {
  console.warn('Could not fetch profiles from Supabase:', e);
  const merged = mergeUsers([], activeUser || currentUser);
  setUsersList(merged);
 }
 };

 const handleUpsertProfile = async (profileData: { name: string; email: string }) => {
 const id = 'usr_' + Date.now().toString();
 try {
  await db.upsertProfile({ id, name: profileData.name, email: profileData.email });
 } catch (e) {
  console.warn('Could not upsert profile to Supabase:', e);
 }
 
 await fetchAndSetProfiles();
 };

 // Sync users list based on session state changes and register current profile
 useEffect(() => {
 if (currentUser) {
  db.upsertProfile({ id: currentUser.id || 'usr_current', name: currentUser.name, email: currentUser.email }).then(() => {
  fetchAndSetProfiles();
  });
 } else {
  fetchAndSetProfiles();
 }
 }, [currentUser]);

 // Stripe callback check state & effect
 const [stripeSuccessData, setStripeSuccessData] = useState<{
 show: boolean;
 clientName: string;
 amount: string;
 interval: string;
 status: 'success' | 'cancel' | 'error';
 error?: string;
 } | null>(null);

 useEffect(() => {
 const checkStripeCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const stripeStatus = urlParams.get('stripe_status');
  const clientId = urlParams.get('client_id');
  const sessionId = urlParams.get('stripe_session_id');
  const amount = urlParams.get('amount') || '';
  const interval = urlParams.get('interval') || 'month';
  const installmentsStr = urlParams.get('installments') || '';
  const customConcept = urlParams.get('concept') || '';
  const pendingTxId = urlParams.get('pending_tx_id') || '';
  const stripePlanId = urlParams.get('stripe_plan_id') || '';
  const installmentIndexStr = urlParams.get('installment_index') || '';

  if (!stripeStatus) return;

  // Clear search query parameters immediately so they don't persist on refresh
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);

  // Fetch the latest contacts list to make sure we operate on up-to-date data
  let latestContacts: ClientContact[] = [];
  try {
  latestContacts = await db.getContacts();
  setContacts(latestContacts || []);
  } catch (e) {
  console.error("Error loading latest contacts during Stripe callback:", e);
  }

  const client = latestContacts.find(c => c.id === clientId) || contacts.find(c => c.id === clientId);
  const clientName = client ? client.name : 'Cliente';

  if (stripeStatus === 'success' && sessionId && clientId) {
  setStripeSuccessData({
   show: true,
   clientName,
   amount,
   interval,
   status: 'success'
  });

  try {
   // Retrieve Stripe details from backend to get customerId and subscriptionId
   let customerId = 'cus_mock_123';
   let subscriptionId = 'sub_mock_123';
   
   if (sessionId && sessionId.startsWith('cs_test_mock_')) {
   // Simulated mock payment session
   console.log("Processing simulated mock payment...");
   } else {
   const res = await fetch(`/api/stripe/retrieve-session?sessionId=${sessionId}`);
   if (res.ok) {
    const sessionData = await res.json();
    customerId = sessionData.customerId;
    subscriptionId = sessionData.subscriptionId;
   }
   }
   const isSubscription = interval !== 'once';

   if (client) {
   const updatedClient: ClientContact = {
    ...client,
    stripeCustomerId: customerId || client.stripeCustomerId,
    stripeSubscriptionId: isSubscription ? subscriptionId : client.stripeSubscriptionId,
    stripeSubscriptionStatus: isSubscription ? 'active' : (client.stripeSubscriptionStatus || 'none'),
    stripeSubscriptionPrice: isSubscription ? amount : client.stripeSubscriptionPrice,
    stripeSubscriptionInterval: isSubscription ? interval : client.stripeSubscriptionInterval,
   };

   // Update client in database
   await db.updateContact(updatedClient);
   // Refresh local contacts list
   setContacts(prev => prev.map(c => c.id === clientId ? updatedClient : c));

   const allTxsBeforePayment = await db.getFinanceTransactions();
   const todayStr = new Date().toISOString().split('T')[0];
   const baseConcept = customConcept ? decodeURIComponent(customConcept) : (isSubscription
    ? `Mensualidad Stripe Automática - ${client.name}`
    : `Pago Único Stripe - ${client.name}`);

   const amountNumber = Number(amount);
   const clientCompany = (client.company || '').toLowerCase();
   const selectedPendingTx = allTxsBeforePayment.find(tx => tx.id === pendingTxId) ||
    allTxsBeforePayment
    .filter(tx => tx.type === 'income' && tx.status === 'pending')
    .find(tx => {
     const descLower = tx.description?.toLowerCase() || '';
     const belongsToClient = tx.clientId === clientId ||
     descLower.includes(client.name.toLowerCase()) ||
     (!!clientCompany && descLower.includes(clientCompany));
     const samePlan = !stripePlanId || tx.stripePlanId === stripePlanId;
     const sameInstallment = !installmentIndexStr || tx.stripeInstallmentIndex === Number(installmentIndexStr);
     return belongsToClient && samePlan && sameInstallment && Math.abs(Number(tx.amount) - amountNumber) < 0.01;
    });

   let paidTx: FinanceTransaction;
   if (selectedPendingTx) {
    paidTx = {
    ...selectedPendingTx,
    status: 'paid',
    date: todayStr,
    description: selectedPendingTx.description.replace(/\s*\(Pendiente\)/gi, ''),
    paymentMethod: 'transfer',
    stripeCheckoutSessionId: sessionId
    };
    await db.updateFinanceTransaction(paidTx);
   } else {
    const matchedComercial = comercialesList.find(c =>
    c.email.toLowerCase() === (client.contactedByComercialEmail || client.assignedUserEmail || '').toLowerCase()
    );
    paidTx = {
    id: `tx_stripe_${sessionId}`,
    type: 'income',
    category: isSubscription ? 'Mensualidad' : 'Desarrollo',
    amount: amountNumber,
    date: todayStr,
    description: baseConcept,
    isRecurring: isSubscription,
    recurrencePeriod: isSubscription ? (interval === 'year' ? 'yearly' : 'monthly') : undefined,
    status: 'paid',
    paymentMethod: 'transfer',
    clientId,
    stripePlanId: stripePlanId || undefined,
    stripeCheckoutSessionId: sessionId,
    comercialId: matchedComercial?.id,
    comercialEmail: client.contactedByComercialEmail || client.assignedUserEmail,
    isInitialSale: true
    };
    await db.insertFinanceTransaction(paidTx);
   }

   // Handle multi-installment automatic setup
   const numInstallments = parseInt(installmentsStr, 10);
   if (!selectedPendingTx && Number.isFinite(numInstallments) && numInstallments > 1) {
    const decodedConcept = customConcept ? decodeURIComponent(customConcept) : 'Pago';
    const generatedStripePlanId = stripePlanId || `plan_stripe_${sessionId}`;
    const matchedComercial = comercialesList.find(c =>
    c.email.toLowerCase() === (client.contactedByComercialEmail || client.assignedUserEmail || '').toLowerCase()
    );
    const firstPaymentDate = new Date(`${paidTx.date || todayStr}T00:00:00`);
    for (let i = 2; i <= numInstallments; i++) {
    const d = new Date(firstPaymentDate);
    d.setMonth(firstPaymentDate.getMonth() + (i - 1));
    const futureDateStr = d.toISOString().split('T')[0];
    
    // Construct clean name for the installment
    const cleanConcept = decodedConcept.replace(/Plazo \d+ de \d+/, `Plazo ${i} de ${numInstallments}`);
    const instTx: any = {
     id: `tx_stripe_inst_${sessionId}_${i}`,
     type: 'income',
     category: 'Desarrollo',
     amount: Number(amount),
     date: futureDateStr,
     description: `${cleanConcept} (Cobro Automático programado)`,
     isRecurring: false,
     status: 'pending',
     paymentMethod: 'transfer',
     clientId,
     stripePlanId: generatedStripePlanId,
     stripeInstallmentIndex: i,
     stripeInstallmentCount: numInstallments,
     comercialId: matchedComercial?.id,
     comercialEmail: client.contactedByComercialEmail || client.assignedUserEmail,
     isInitialSale: true
    };
    
    await db.insertFinanceTransaction(instTx);
    }
   }

   // Mark only the paid installment in client invoices.
   try {
    const allInvoices = await db.getFinanceInvoices();
    const clientInvoices = allInvoices.filter(inv => 
    inv.clientId === clientId || 
    inv.clientEmail?.toLowerCase() === client.email?.toLowerCase() ||
    inv.clientName?.toLowerCase().includes(client.name.toLowerCase())
    );

    for (const inv of clientInvoices) {
    const hasPaidItem = inv.items.some(item => item.pendingTxId === paidTx.id);
    if (hasPaidItem) {
     const updatedItems = inv.items.map(item => item.pendingTxId === paidTx.id ? ({
     ...item,
     isPending: false,
     paymentMethod: 'transfer' as const
     }) : item);
     const hasPendingItems = updatedItems.some(item => item.isPending);
     const updatedInvoice: Invoice = {
     ...inv,
     status: hasPendingItems ? 'sent' : 'paid',
     items: updatedItems
     };
     await db.updateFinanceInvoice(updatedInvoice);
    }
    }
   } catch (invErr) {
    console.error("Error processing client invoices on Stripe success:", invErr);
   }

   // Refresh financial lists
   const dbTxs = await db.getFinanceTransactions();
   if (dbTxs) setFinTransactions(dbTxs);

   // Add activity log
   const newActivity: Activity = {
    id: `act_stripe_${Date.now()}`,
    type: 'CRM',
    timestamp: 'Hace un momento',
    title: isSubscription ? `Suscripción Activa - ${client.name}` : `Pago Stripe Recibido - ${client.name}`,
    subtitle: isSubscription
    ? `Mensualidad automática configurada por ${amount} € / ${interval === 'year' ? 'año' : 'mes'}`
    : `Pago único procesado con Éxito por un importe de ${amount} €`,
    accentColor: 'secondary'
   };
   await db.insertActivity(newActivity);
   setActivities(prev => [newActivity, ...prev]);
   }
  } catch (err: any) {
   console.error("Error updating subscription status:", err);
   setStripeSuccessData({
   show: true,
   clientName,
   amount,
   interval,
   status: 'error',
   error: err?.message || String(err)
   });
  }
  } else if (stripeStatus === 'cancel') {
  setStripeSuccessData({
   show: true,
   clientName,
   amount,
   interval,
   status: 'cancel'
  });
  }
 };

 // Give some time for initial Supabase hydration to finish
 const timer = setTimeout(() => {
  checkStripeCallback();
 }, 1500);

 return () => clearTimeout(timer);
 }, [contacts.length]);

 // Sync finance transactions to compute upcoming alerts
 const [finTransactions, setFinTransactions] = useState<any[]>([]);

 const handleRefreshFinance = useCallback(async () => {
 try {
  const dbTxs = await db.getFinanceTransactions();
  if (dbTxs) {
  setFinTransactions(dbTxs);
  }
 } catch (e) {
  console.error('Error fetching finance transactions in App.tsx:', e);
 }
 }, []);

 useEffect(() => {
 handleRefreshFinance();
 // Keep checking every 60 seconds for updates, only when tab is visible
 const interval = setInterval(() => {
  if (document.visibilityState === 'visible') {
  handleRefreshFinance();
  }
 }, 60000);
 return () => clearInterval(interval);
 }, [handleRefreshFinance]);

 const financeNotifications = useMemo(() => {
 const list: any[] = [];
 if (!currentUser) return list;

 // Get tomorrow's date representation in local time zone
 const today = new Date();
 today.setHours(0,0,0,0);
 const tomorrow = new Date(today);
 tomorrow.setDate(tomorrow.getDate() + 1);

 const isDateTomorrow = (dateStr: string) => {
  if (!dateStr) return false;
  const tDate = new Date(dateStr);
  tDate.setHours(0,0,0,0);
  return tomorrow.getFullYear() === tDate.getFullYear() &&
    tomorrow.getMonth() === tDate.getMonth() &&
    tomorrow.getDate() === tDate.getDate();
 };

 const isDatePastOrToday = (dateStr: string) => {
  if (!dateStr) return false;
  const tDate = new Date(dateStr);
  tDate.setHours(0,0,0,0);
  return tDate <= today;
 };

 finTransactions.forEach(tx => {
  const isStripeTx = Boolean(tx.stripePlanId || tx.stripeCheckoutSessionId || tx.stripeInvoiceId || String(tx.id || '').includes('stripe'));

  if (tx.type === 'income' && tx.status === 'pending' && isStripeTx && isDatePastOrToday(tx.date)) {
  list.push({
   id: `alert_stripe_overdue_${tx.id}_${tx.date}`,
   type: 'Deadline',
   title: `Pago Stripe pendiente: ${tx.description || 'Cobro sin concepto'}`,
   description: `No consta como liquidado un cobro Stripe de ${Number(tx.amount || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} con vencimiento ${tx.date}. Revisa el cliente y Stripe.`,
   date: tx.date,
   time: 'Stripe'
  });
  }

  // 1. Pending transaction scheduled for tomorrow
  if (tx.status === 'pending') {
  if (isDateTomorrow(tx.date)) {
   list.push({
   id: `alert_pending_${tx.id}`,
   type: 'Deadline', // beautiful red-rose badge e.g. for urgent items
   title: `⚠️ Vencimiento de Importe Pendiente (${tx.type === 'income' ? 'Cobro' : 'Gasto'})`,
   description: `${tx.type === 'income' ? 'Cobro' : 'Pago'} de ${tx.amount.toLocaleString('es-ES')} € planificado para mañana: ${tx.description} (${tx.category})`,
   date: tx.date,
   time: 'Mañana'
   });
  }
  }

  // 2. Or is recurring and scheduled for tomorrow
  if (tx.isRecurring && tx.recurrencePeriod) {
  const base = new Date(tx.date);
  let next = new Date(base);
  // keep adding recurrence period until next is equal or future relative to today
  while (next < today) {
   if (tx.recurrencePeriod === 'weekly') {
   next.setDate(next.getDate() + 7);
   } else if (tx.recurrencePeriod === 'monthly') {
   next.setMonth(next.getMonth() + 1);
   } else if (tx.recurrencePeriod === 'yearly') {
   next.setFullYear(next.getFullYear() + 1);
   } else {
   next.setMonth(next.getMonth() + 1);
   }
  }

  const isOccurTomorrow = tomorrow.getFullYear() === next.getFullYear() &&
        tomorrow.getMonth() === next.getMonth() &&
        tomorrow.getDate() === next.getDate();

  if (isOccurTomorrow) {
   const tomorrowStr = tomorrow.toISOString().split('T')[0];
   list.push({
   id: `alert_recurring_${tx.id}_${tomorrowStr}`,
   type: 'Review', // beautiful purple/pink badge
   title: `🔄 Próximo Importe Recurrente (${tx.type === 'income' ? 'Ingreso' : 'Gasto'})`,
   description: `${tx.type === 'income' ? 'Ingreso' : 'Gasto'} automático de ${tx.amount.toLocaleString('es-ES')} € programado para mañana: ${tx.description}`,
   date: tomorrowStr,
   time: 'Recurrente Mañana'
   });
  }
  }
 });

 contacts
  .filter(c => c.stripeSubscriptionStatus === 'past_due')
  .forEach(c => {
  list.push({
   id: `alert_stripe_past_due_${c.id}_${c.stripeSubscriptionId || 'subscription'}`,
   type: 'Deadline',
   title: `Suscripcion Stripe con impago: ${c.name}`,
   description: `${c.company || c.email} tiene una suscripcion en estado past_due. Revisa el pago, la factura abierta o contacta con el cliente.`,
   date: new Date().toISOString().split('T')[0],
   time: 'Stripe'
  });
  });

 return list;
 }, [finTransactions, contacts, currentUser]);

 const hotLeadsNotifications = useMemo(() => {
 const list: any[] = [];
 if (!currentUser || !notifyHotLeads) return list;

 // From leadsList (Commercial Leads)
 leadsList.forEach(lead => {
  if (lead.temperature === 'Caliente') {
  list.push({
   id: `alert_lead_hot_${lead.id}`,
   type: 'Caliente',
   title: `🔥 Lead Caliente: ${lead.name}`,
   description: `El lead de ${lead.company || 'Sin Empresa'} asignado a ${lead.comercialName} está CALIENTE. Listo para gestión administrativa.`,
   date: lead.createdAt ? lead.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
   time: 'Urgente'
  });
  }
 });

 // From coldLeads (Call Calling Leads)
 coldLeads.forEach(lead => {
  if (lead.temperature === 'Caliente') {
  list.push({
   id: `alert_cold_hot_${lead.id}`,
   type: 'Caliente',
   title: `🔥 Call Calling Caliente: ${lead.businessName}`,
   description: `Lead marcado en caliente por ${lead.assignedToName || 'un comercial'}. Contacto: ${lead.contactPerson || 'Sin registrar'} (Tel: ${lead.phone}).`,
   date: lead.callDate || new Date().toISOString().split('T')[0],
   time: 'Urgente'
  });
  }
 });

 return list;
 }, [leadsList, coldLeads, currentUser, notifyHotLeads]);

 const adminVisibleEvents = useMemo(() => {
  if (!currentUser) return [];
  const adminEmail = currentUser.email.toLowerCase();
  return events.filter(event => {
   if (event.isPrivate && event.comercialId) return false;
   const directEmail = event.assignedUserEmail?.toLowerCase();
   const assignedEmails = (event.assignedUserEmails || []).map(email => email.toLowerCase());
   const hasExplicitAssignment = !!directEmail || assignedEmails.length > 0 || !!event.assignedUserId;

   // Las asignaciones grupales no pertenecen a un admin concreto: forman parte
   // de la agenda general y deben ser visibles también para todos los admins.
   if (
    directEmail === 'todos-admins' || assignedEmails.includes('todos-admins') ||
    directEmail === 'todos-comerciales' || assignedEmails.includes('todos-comerciales') ||
    event.isAllComerciales
   ) return true;
   if (directEmail === adminEmail || assignedEmails.includes(adminEmail)) return true;
   if (event.assignedUserId && currentUser.id && event.assignedUserId === currentUser.id) return true;

   // Los eventos sin destinatario continúan siendo agenda administrativa común.
   return !hasExplicitAssignment;
  });
 }, [events, currentUser]);

 const adminVisibleEventIds = useMemo(() => new Set(adminVisibleEvents.map(event => event.id)), [adminVisibleEvents]);

 const dueClosingAlertEvent = useMemo(() => {
  const todayKey = getLocalDateKey();
  const adminEmail = currentUser?.email.toLowerCase();
  if (!adminEmail) return null;
  return adminVisibleEvents
   .filter(event => isClosingAppointmentEvent(event))
   .filter(event => event.status !== 'done' && event.date === todayKey)
   .filter(event => !handledClosingAlertIds.includes(`${adminEmail}:${event.id}`))
   .filter(event => {
    const dueAt = new Date(`${event.date}T${/^\d{2}:\d{2}/.test(event.time || '') ? event.time : '23:59'}`).getTime();
    return Number.isFinite(dueAt) && dueAt <= closingAlertClock;
   })
   .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0] || null;
 }, [adminVisibleEvents, handledClosingAlertIds, closingAlertClock, currentUser]);

 // Notifications computation
 const userNotifications = useMemo(() => {
  const todayKey = getLocalDateKey();
  const dbNotifications = adminVisibleEvents.filter(e => {
  if (!currentUser) return false;
  if (e.date !== todayKey) return false;
  if (isClosingAppointmentEvent(e)) {
   const dueAt = new Date(`${e.date}T${/^\d{2}:\d{2}/.test(e.time || '') ? e.time : '23:59'}`).getTime();
   return Number.isFinite(dueAt) && dueAt <= closingAlertClock;
  }
  return true;
  });
  const notificationTime = (notification: any) => {
  const rawDate = notification.date || new Date().toISOString().split('T')[0];
  const rawTime = /^\d{2}:\d{2}/.test(notification.time || '') ? notification.time : '23:59';
  const parsed = new Date(`${rawDate}T${rawTime}`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };
  return [...financeNotifications, ...hotLeadsNotifications, ...dbNotifications]
  .sort((a, b) => {
   const unreadDelta = Number(!readNotificationIds.includes(b.id)) - Number(!readNotificationIds.includes(a.id));
   if (unreadDelta !== 0) return unreadDelta;
   return notificationTime(b) - notificationTime(a);
  });
  }, [adminVisibleEvents, financeNotifications, hotLeadsNotifications, currentUser, readNotificationIds, closingAlertClock]);

 const unreadNotifications = useMemo(() => {
 return userNotifications.filter(e => !readNotificationIds.includes(e.id));
 }, [userNotifications, readNotificationIds]);

 const unreadCount = unreadNotifications.length;

 const handleMarkAsRead = (id: string) => {
 setReadNotificationIds(prev => prev.includes(id) ? prev : [...prev, id]);
 };

 const handleMarkAllAsRead = () => {
 const allIds = userNotifications.map(e => e.id);
 setReadNotificationIds(prev => Array.from(new Set([...prev, ...allIds])));
 };

 const syncInFlightRef = useRef<Promise<void> | null>(null);
 const pendingComercialUpdatesRef = useRef<Map<string, ComercialAccount>>(new Map());

 // Verify and hydrate state from Supabase. All independent tables load in parallel,
 // and concurrent auth/mount/interval requests share the same in-flight operation.
 const syncWithSupabase = async (userIdToSync?: string, silent = false) => {
 if (syncInFlightRef.current) return syncInFlightRef.current;
 const operation = (async () => {
  try {
  if (!silent) {
  setSupabaseStatus(prev => ({ ...prev, loading: true }));
  }
  const activeUid = userIdToSync || currentUser?.id;
  // Start data reads immediately. Connection health and payloads travel in parallel,
  // removing a full network round-trip from the first meaningful render.
  const dataPromise = Promise.allSettled([
   db.getColdLeads(),
   db.getComercialLeads(),
   db.getComercialesAccounts(),
   db.getProjects(),
   db.getContacts(),
   db.getEvents(),
   activeUid ? db.getNotes() : Promise.resolve(null),
   activeUid ? db.getActivities() : Promise.resolve(null),
   activeUid ? db.getProfiles() : Promise.resolve(null)
  ]);
  const statusPromise = silent && supabaseStatus.connected && supabaseStatus.tablesExist
   ? Promise.resolve({ connected: true, tablesExist: true })
   : checkSupabaseConnection();
  const [status, results] = await Promise.all([statusPromise, dataPromise]);
  if (!silent) {
  setSupabaseStatus({ ...status, loading: false });
  } else {
  setSupabaseStatus(prev => ({ ...prev, connected: status.connected, tablesExist: status.tablesExist }));
  }

  if (status.connected && status.tablesExist) {
  const value = <T,>(index: number): T | null => results[index].status === 'fulfilled' ? results[index].value as T : null;

  const fetchedCold = value<ColdCallingLead[]>(0);
  const fetchedComercialLeads = value<ComercialLead[]>(1);
  const fetchedComercialAccs = value<ComercialAccount[]>(2);
  const fetchedProjects = value<AgencyProject[]>(3);
  const fetchedContacts = value<ClientContact[]>(4);
  const fetchedEvents = value<CalendarEvent[]>(5);
  const fetchedNotes = value<Note[]>(6);
  const fetchedActivities = value<Activity[]>(7);
  const fetchedProfiles = value<any[]>(8);

  if (fetchedCold) setColdLeads(fetchedCold);
  if (fetchedComercialLeads) setLeadsList(fetchedComercialLeads);
  if (fetchedComercialAccs) {
   const pendingUpdates = Array.from(pendingComercialUpdatesRef.current.values());
   const confirmedDuringSync = new Map<string, ComercialAccount>();
   if (pendingUpdates.length > 0) {
    const retryResults = await Promise.allSettled(pendingUpdates.map(account => db.updateComercialAccount(account, activeUid)));
    retryResults.forEach((result, index) => {
     if (result.status === 'fulfilled') {
      confirmedDuringSync.set(pendingUpdates[index].id, pendingUpdates[index]);
      pendingComercialUpdatesRef.current.delete(pendingUpdates[index].id);
     }
    });
   }
   const mergedComercialAccs = fetchedComercialAccs.map(account =>
    pendingComercialUpdatesRef.current.get(account.id) || confirmedDuringSync.get(account.id) || account
   );
   setComercialesList(mergedComercialAccs);
   setCurrentComercial(current => current
    ? mergedComercialAccs.find(account => account.id === current.id) || current
    : current);
  }
  if (fetchedProjects) setProjects(fetchedProjects);
  if (fetchedContacts) {
   const deletedContactIds = readDeletedContactIds();
   const deletedContactIdSet = new Set(deletedContactIds);
   const contactsStillPendingDeletion = fetchedContacts.filter(contact => deletedContactIdSet.has(contact.id));
   const visibleContacts = fetchedContacts.filter(contact => !deletedContactIdSet.has(contact.id));
   setContacts(visibleContacts);
   localStorage.setItem('althera_contacts_cache', JSON.stringify(visibleContacts));

   if (contactsStillPendingDeletion.length > 0) {
    await Promise.allSettled(contactsStillPendingDeletion.map(contact => db.deleteContact(contact.id, activeUid)));
   } else if (deletedContactIds.length > 0) {
    writeDeletedContactIds([]);
   }
  }
  if (fetchedEvents) {
   const cachedPrivateEvents = readPrivateEventCache();
   const fetchedIds = new Set(fetchedEvents.map(event => event.id));
   const pendingPrivateEvents = cachedPrivateEvents.filter(event => !fetchedIds.has(event.id));
   setEvents([...fetchedEvents, ...pendingPrivateEvents]);
   if (pendingPrivateEvents.length > 0) {
    await Promise.allSettled(pendingPrivateEvents.map(event => db.insertEvent(event, undefined)));
   }
  }
  if (fetchedNotes) setNotes(fetchedNotes);
  if (fetchedActivities) setActivities(fetchedActivities);
  if (fetchedProfiles) setUsersList(mergeUsers(fetchedProfiles, activeUid ? currentUser : undefined));
  }
  } catch (err: any) {
  console.error('Failed to sync state with Supabase:', err);
  if (!silent) {
  setSupabaseStatus(prev => ({ 
   ...prev, 
   loading: false, 
   error: err?.message || 'Database link error' 
  }));
  }
  }
 })();
 syncInFlightRef.current = operation;
 try {
  await operation;
 } finally {
  syncInFlightRef.current = null;
 }
 };

 // Refresh shared data frequently without blocking the currently rendered cache.
 useEffect(() => {
 const refreshVisibleData = () => {
  if (document.visibilityState === 'visible') syncWithSupabase(undefined, true);
 };
 const interval = setInterval(() => {
  refreshVisibleData();
 }, 20000);
 window.addEventListener('focus', refreshVisibleData);
 document.addEventListener('visibilitychange', refreshVisibleData);
 return () => {
  clearInterval(interval);
  window.removeEventListener('focus', refreshVisibleData);
  document.removeEventListener('visibilitychange', refreshVisibleData);
 };
 }, [currentUser, currentComercial]);

 // Router synchronization effect
 useEffect(() => {
 const handlePathChange = () => {
  if (!authReady && !currentUser && window.location.pathname.startsWith('/admin')) return;
  const { screen, redirectedPath } = getScreenFromPath(
  window.location.pathname,
  !!currentUser,
  !!currentComercial
  );
  
  setCurrentScreen(screen);
  
  if (redirectedPath && window.location.pathname !== redirectedPath) {
  window.history.replaceState({}, '', redirectedPath);
  }
 };

 window.addEventListener('popstate', handlePathChange);
 
 // Initial sync
 const initialPath = window.location.pathname || '/';
 if (!authReady && !currentUser && initialPath.startsWith('/admin')) {
  return () => window.removeEventListener('popstate', handlePathChange);
 }
 const { screen, redirectedPath } = getScreenFromPath(initialPath, !!currentUser, !!currentComercial);
 setCurrentScreen(screen);
 if (redirectedPath && window.location.pathname !== redirectedPath) {
  window.history.replaceState({}, '', redirectedPath);
 }

 return () => window.removeEventListener('popstate', handlePathChange);
 }, [currentUser, currentComercial, authReady]);

 // Auth synchronization effect
 useEffect(() => {
 // Check initial active session
 supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
  const u = {
   id: session.user.id,
   email: session.user.email || '',
   name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Agency Member'
  };
  setCurrentUser(u);
  sessionStorage.setItem('agency_user', JSON.stringify(u));
  syncWithSupabase(session.user.id);
  
  // Let the path determine the screen; if they were on /acceso or login, redirect to admin
  const initialPath = window.location.pathname || '';
  if (initialPath === '/acceso' || initialPath === '/login') {
   navigateTo('dashboard', 'none');
  }
  } else {
  const saved = sessionStorage.getItem('agency_user');
  const savedUser = saved ? JSON.parse(saved) : null;
  if (savedUser && savedUser.id === null) {
   // Preserve demo/local session
   setCurrentUser(savedUser);
  } else {
   setCurrentUser(null);
   sessionStorage.removeItem('agency_user');
   
   // If they were on an admin screen but not logged in, redirect to login
   const initialPath = window.location.pathname || '';
   if (initialPath.startsWith('/admin')) {
   navigateTo('acceso', 'none');
   }
  }
  }
 }).finally(() => setAuthReady(true));

 // Listen to real auth state changes
 const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
  const u = {
   id: session.user.id,
   email: session.user.email || '',
   name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Agency Member'
  };
  setCurrentUser(u);
  sessionStorage.setItem('agency_user', JSON.stringify(u));
  syncWithSupabase(session.user.id);
  
  const initialPath = window.location.pathname || '/';
  if (initialPath === '/acceso' || initialPath === '/login') {
   navigateTo('dashboard', 'none');
  }
  } else if (event === 'SIGNED_OUT') {
  setCurrentUser(null);
  sessionStorage.removeItem('agency_user');
  sessionStorage.removeItem('agency_current_screen');
  navigateTo('landing', 'none');
  }
 });

 // Verify general connection health on mount
 checkSupabaseConnection().then(status => {
  setSupabaseStatus({ ...status, loading: false });
  if (status.connected && status.tablesExist) {
  syncWithSupabase();
  }
 });

 return () => {
  subscription.unsubscribe();
 };
 }, []);

 // Synchronize toast showing mechanisms (classList hidden vs opacity-0 / class toggle)
 useEffect(() => {
 const toastElem = document.getElementById('toast-msg');
 if (!toastElem) return;

 const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
  if (mutation.attributeName === 'class') {
   const classes = toastElem.className;
   const hasHidden = classes.includes('hidden');
   const hasOpacity100 = classes.includes('opacity-100');
   const hasOpacity0 = classes.includes('opacity-0');
   
   if (!hasHidden && !hasOpacity100 && hasOpacity0) {
   // hidden was removed by code, but opacity-0 is still there. Convert to opacity-100
   toastElem.classList.remove('opacity-0', 'pointer-events-none');
   toastElem.classList.add('opacity-100');
   } else if (hasHidden && hasOpacity100) {
   // hidden was added, convert opacity back to 0
   toastElem.classList.remove('opacity-100');
   toastElem.classList.add('opacity-0', 'pointer-events-none');
   }
  }
  });
 });

 observer.observe(toastElem, { attributes: true, attributeFilter: ['class'] });
 return () => observer.disconnect();
 }, [currentScreen]);

 // Handle active signIn from login screen
 const handleSignInAndNavigate = (sessionUser?: { id: string | null; email: string; name: string }) => {
 if (sessionUser) {
  setCurrentUser(sessionUser);
  sessionStorage.setItem('agency_user', JSON.stringify(sessionUser));
  
  // Load user templates if it is first-time demo access
  if (!sessionUser.id) {
  setContacts(initialContacts);
  setEvents(initialEvents);
  setNotes(initialNotes);
  setActivities(initialActivities);
  } else {
  // Query server db
  syncWithSupabase(sessionUser.id);
  }
 }
 navigateTo('dashboard', 'push');
 };

 // Handle logging out from the application
 const handleSignOutUser = async () => {
 try {
  if (currentUser?.id) {
  await supabase.auth.signOut();
  }
 } catch (err) {
  console.error('Logout error:', err);
 }
 setCurrentUser(null);
 sessionStorage.removeItem('agency_user');
 navigateTo('acceso', 'push_back');
 };

 // Database Seeder handler scored with user id
 const handleSeedDatabase = async () => {
 try {
  await seedSupabaseDatabase({
  contacts: initialContacts,
  events: initialEvents,
  notes: initialNotes,
  activities: initialActivities
  }, currentUser?.id || undefined);
  // Hydrate state after seeding
  await syncWithSupabase();
 } catch (err: any) {
  console.error('Database seeding failed:', err);
  throw err;
 }
 };

 // Combined dynamic search value for header syncing
 const [globalSearch, setGlobalSearch] = useState('');

 // Main navigation handles with transition controls
 const navigateTo = (target: Screen, transition: 'none' | 'push' | 'push_back') => {
 setTransitionType(transition);
 const targetPath = getPathFromScreen(target);
 if (window.location.pathname !== targetPath) {
  window.history.pushState({}, '', targetPath);
  // Dispatch popstate manually to trigger standard handler
  window.dispatchEvent(new PopStateEvent('popstate'));
 } else {
  setCurrentScreen(target);
 }
 setGlobalSearch(''); // reset search on navigation
 };

 const openClosingCase = (event: CalendarEvent) => {
  const leadId = getClosingLeadIdFromEvent(event);
  if (leadId) setFocusedAdminClosingLeadId(leadId);
  handleMarkAsRead(event.id);
  setIsNotificationsOpen(false);
  navigateTo('cold_calling', 'push');
 };

 const resolveClosingAlert = (event: CalendarEvent, decision: 'accepted' | 'rejected') => {
  const alertKey = `${currentUser?.email.toLowerCase() || 'admin'}:${event.id}`;
  setHandledClosingAlertIds(previous => previous.includes(alertKey) ? previous : [...previous, alertKey]);
  handleMarkAsRead(event.id);
  if (decision === 'accepted') openClosingCase(event);
 };

 // State handles to modify database items dynamically with Optimistic UI updates
 const handleAddContact = async (contact: ClientContact) => {
 const existingContact = contacts.find(c =>
  c.id === contact.id ||
  (!!contact.closingSourceLeadId && c.closingSourceLeadId === contact.closingSourceLeadId) ||
  (!!contact.phone && c.phone === contact.phone && c.company?.toLowerCase() === contact.company?.toLowerCase())
 );
 const alreadyExists = !!existingContact;
 const contactToSave = existingContact ? { ...existingContact, ...contact, id: existingContact.id } : contact;
 forgetDeletedContact(contactToSave.id);

 // 1. Optimistic UI update
 setContacts(prev => prev.some(c => c.id === contactToSave.id) ?
  prev.map(c => c.id === contactToSave.id ? contactToSave : c)
  : [contactToSave, ...prev]
 );
 
 // 2. Add activity locally
 const activity: Activity = {
  id: 'a_' + Date.now(),
  type: 'CRM',
  timestamp: 'Just now',
  title: contactToSave.name,
  subtitle: `added to ${contactToSave.company}`,
  accentColor: 'primary'
 };
 if (!alreadyExists) {
  setActivities(prev => [activity, ...prev]);
 }

 // 3. Persistent Supabase write
 if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
   if (alreadyExists) {
    await db.updateContact(contactToSave, currentUser.id);
   } else {
    await db.insertContact(contactToSave, currentUser.id);
   await db.insertActivity(activity, currentUser.id);
  }
  } catch (err) {
  console.error('Supabase failed to register contact:', err);
  }
 }
 };

 const handleUpdateContact = async (updated: ClientContact) => {
 // Completing a website only resolves the "Falta web" marker. The contact remains
 // active and its development status can be changed again at any time.
 if (updated.devStatus === 'completed') {
  updated.needsWebsite = false;
  updated.websiteReady = true;
 }

 // Repair contacts archived by the previous automatic-completion rule.
 if (updated.devStatus) {
  try {
  const saved = sessionStorage.getItem('archived_contacts_ids');
  const archivedIds: string[] = saved ? JSON.parse(saved) : [];
  sessionStorage.setItem('archived_contacts_ids', JSON.stringify(archivedIds.filter(id => id !== updated.id)));
  } catch (err) {
  console.error('Error restoring completed contact visibility:', err);
  }
 }

 // 2. Optimistic UI update
 setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));

 // 2. Persistent Supabase write
 if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.updateContact(updated, currentUser.id);
  } catch (err) {
  console.error('Supabase failed to update contact:', err);
  }
 }
 };

 const handleAddProject = async (newProj: any) => {
 // 1. Optimistic update
 setProjects(prev => [newProj, ...prev]);

 // 2. Persist to Supabase
 if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.insertProject(newProj, currentUser.id);
  } catch (err) {
  console.error('Supabase failed to register project:', err);
  }
 }
 };

 const handleUpdateProject = async (updatedProj: any) => {
 // 1. Optimistic update
 setProjects(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));

 // 2. Persist to Supabase
 if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.updateProject(updatedProj, currentUser.id);
  } catch (err) {
  console.error('Supabase failed to update project:', err);
  }
 }
 };

 const handleDeleteProject = async (id: string) => {
 // 1. Optimistic update
 setProjects(prev => prev.filter(p => p.id !== id));

 // 2. Persist to Supabase
 if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.deleteProject(id, currentUser.id);
  } catch (err) {
  console.error('Supabase failed to delete project:', err);
  }
 }
 };

 const handleAddColdLead = async (newLead: ColdCallingLead) => {
 setColdLeads(prev => [newLead, ...prev]);
 const activity: Activity = {
  id: 'a_cold_' + Date.now(),
  type: 'Lead',
  timestamp: 'Just now',
  title: newLead.businessName,
  subtitle: `pre-cargado en Call Calling para ${newLead.assignedToName || 'cola sin asignar'}`,
  detail: newLead.notes,
  accentColor: 'primary'
 };
 setActivities(prev => [activity, ...prev]);
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.insertColdLead(newLead, currentUser?.id || undefined);
  if (currentUser?.id) await db.insertActivity(activity, currentUser.id);
  if (currentComercial) await db.addCommercialActivityLog({
   commercial: currentComercial,
   action: 'cold_lead_created',
   entityType: 'cold_calling_lead',
   entityId: newLead.id,
   description: `Creó el negocio ${newLead.businessName} en Call Calling.`,
   metadata: { businessName: newLead.businessName, assignedToEmail: newLead.assignedToEmail }
  });
  } catch (err) {
  console.error('Supabase failed to register cold lead:', err);
  }
 }
 };

 const handleUpdateColdLead = async (updated: ColdCallingLead) => {
 const previous = coldLeads.find(l => l.id === updated.id);
 setColdLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
 if (previous && previous.assignedToEmail !== updated.assignedToEmail) {
  setActivities(prev => [{
  id: 'a_cold_assign_' + Date.now(),
  type: 'Lead',
  timestamp: 'Just now',
  title: updated.businessName,
  subtitle: `asignado a ${updated.assignedToName || 'Sin asignar'}`,
  detail: updated.notes,
  accentColor: 'secondary'
  }, ...prev]);
 }
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.updateColdLead(updated, currentUser?.id || undefined);
  if (currentComercial) {
   const changes: string[] = [];
   if (previous?.callsCount !== updated.callsCount) changes.push(`registró llamada #${updated.callsCount || 0}`);
   if (previous?.callbackScheduled !== updated.callbackScheduled || previous?.callbackDate !== updated.callbackDate || previous?.callbackTime !== updated.callbackTime) changes.push(`actualizó seguimiento a ${updated.callbackScheduled}${updated.callbackDate ? ` (${updated.callbackDate} ${updated.callbackTime || ''})` : ''}`);
   if (previous?.temperature !== updated.temperature) changes.push(`cambió temperatura a ${updated.temperature}`);
   if (previous?.answered !== updated.answered) changes.push(`marcó responde: ${updated.answered}`);
   if (previous?.isDone !== updated.isDone) changes.push(updated.isDone ? 'marcó como hecho' : 'reabrió el negocio');
   if (previous?.archived !== updated.archived) changes.push(updated.archived ? 'archivó el negocio' : 'restauró el negocio');
   await db.addCommercialActivityLog({
    commercial: currentComercial,
    action: 'cold_lead_updated',
    entityType: 'cold_calling_lead',
    entityId: updated.id,
    description: `${updated.businessName}: ${changes.join(', ') || 'actualizó la ficha'}.`,
    metadata: { businessName: updated.businessName, changes, callsCount: updated.callsCount || 0 }
   });
  }
  } catch (err) {
  console.error('Supabase failed to update cold lead:', err);
  }
 }
 };

 const handleDeleteColdLead = async (id: string) => {
 const deletedLead = coldLeads.find(lead => lead.id === id);
 setColdLeads(prev => prev.filter(l => l.id !== id));
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.deleteColdLead(id, currentUser?.id || undefined);
  if (currentComercial && deletedLead) await db.addCommercialActivityLog({
   commercial: currentComercial,
   action: 'cold_lead_deleted',
   entityType: 'cold_calling_lead',
   entityId: id,
   description: `Eliminó ${deletedLead.businessName} de Call Calling.`,
   metadata: { businessName: deletedLead.businessName }
  });
  } catch (err) {
  console.error('Supabase failed to delete cold lead:', err);
  }
 }
 };

 const handleAddComercialLead = async (newLead: ComercialLead) => {
 setLeadsList(prev => [newLead, ...prev]);
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.insertComercialLead(newLead, currentUser?.id || undefined);
  } catch (err) {
  console.error('Supabase failed to register comercial lead:', err);
  }
 }
 };

 const handleUpdateComercialLead = async (updated: ComercialLead) => {
 setLeadsList(prev => prev.map(l => l.id === updated.id ? updated : l));
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.updateComercialLead(updated, currentUser?.id || undefined);
  } catch (err) {
  console.error('Supabase failed to update comercial lead:', err);
  }
 }
 };

 const handleDeleteComercialLead = async (id: string) => {
 setLeadsList(prev => prev.filter(l => l.id !== id));
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.deleteComercialLead(id, currentUser?.id || undefined);
  } catch (err) {
  console.error('Supabase failed to delete comercial lead:', err);
  }
 }
 };

 const handleAddComercialAccount = async (newC: ComercialAccount) => {
 setComercialesList(prev => [...prev, newC]);
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.insertComercialAccount(newC, currentUser?.id || undefined);
  } catch (err) {
  console.error('Supabase failed to register comercial account:', err);
  }
 }
 };

 const handleUpdateComercialAccount = async (updated: ComercialAccount) => {
 pendingComercialUpdatesRef.current.set(updated.id, updated);
 setComercialesList(prev => prev.map(c => c.id === updated.id ? updated : c));
 if (currentComercial && currentComercial.id === updated.id) {
  setCurrentComercial(updated);
 }
 try {
  await db.updateComercialAccount(updated, currentUser?.id || undefined);
 } catch (err) {
  console.error('Supabase failed to update comercial account:', err);
  throw err;
 }
 };

 const handleDeleteComercialAccount = async (id: string) => {
 setComercialesList(prev => prev.filter(c => c.id !== id));
 setLeadsList(prev => prev.filter(l => l.comercialId !== id));
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.deleteComercialAccount(id, currentUser?.id || undefined);
  } catch (err) {
  console.error('Supabase failed to delete comercial account:', err);
  }
 }
 };

 const handleAddEvent = async (event: CalendarEvent) => {
 const isCommercialPrivateEvent = event.isPrivate === true && !!event.comercialId;
 const activity: Activity = {
  id: 'a_' + Date.now(),
  type: 'Task',
  timestamp: 'Just now',
  title: 'Calendar Created',
  subtitle: `for event: ${event.title}`,
  accentColor: 'secondary'
 };

 if (isCommercialPrivateEvent) {
  setEvents(prev => prev.some(item => item.id === event.id) ? prev : [...prev, event]);
  upsertPrivateEventCache(event);
 }

 if (!supabaseStatus.connected || !supabaseStatus.tablesExist) {
  if (isCommercialPrivateEvent) {
   const toast = document.getElementById('toast-msg');
   if (toast) {
    toast.innerText = 'Tarea privada guardada en este dispositivo. Se sincronizará cuando vuelva la conexión.';
    toast.classList.remove('opacity-0');
    setTimeout(() => toast.classList.add('opacity-0'), 3500);
   }
   return;
  }
  console.error('Supabase is required to create shared calendar events.');
  const toast = document.getElementById('toast-msg');
  if (toast) {
  toast.innerText = 'No se pudo crear el evento: Supabase no está conectado.';
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
  }
  throw new Error('Supabase no está conectado.');
 }

 try {
  await db.insertEvent(event, currentUser?.id || undefined);
  if (currentUser?.id) await db.insertActivity(activity, currentUser.id);
  if (!isCommercialPrivateEvent) setEvents(prev => prev.some(item => item.id === event.id) ? prev : [...prev, event]);
  if (currentUser?.id) setActivities(prev => [activity, ...prev]);
 } catch (err) {
  console.error('Supabase failed to register event:', err);
  if (isCommercialPrivateEvent) {
   const toast = document.getElementById('toast-msg');
   if (toast) {
    toast.innerText = 'Tarea privada guardada localmente; sincronización pendiente.';
    toast.classList.remove('opacity-0');
    setTimeout(() => toast.classList.add('opacity-0'), 3500);
   }
   return;
  }
  const toast = document.getElementById('toast-msg');
  if (toast) {
  toast.innerText = 'No se pudo guardar el evento en Supabase. Revisa la tabla events.';
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 4500);
  }
  throw err;
 }
 };

 const handleDeleteEvent = async (id: string) => {
 // 1. Optimistic UI update
 setEvents(prev => prev.filter(ev => ev.id !== id));
 writePrivateEventCache(readPrivateEventCache().filter(event => event.id !== id));

 // 2. Persistent Supabase deletion
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.deleteEvent(id, currentUser?.id || undefined);
  } catch (err) {
  console.error('Supabase failed to delete event:', err);
  }
 }
 };

 const handleUpdateEvent = async (updated: CalendarEvent) => {
 // 1. Optimistic UI update
 setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev));
 if (updated.isPrivate && updated.comercialId) upsertPrivateEventCache(updated);

 // 2. Persistent Supabase update
 if (supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.updateEvent(updated, currentUser?.id || undefined);
  } catch (err) {
  console.error('Supabase failed to update event:', err);
  }
 }
 };

 const handleAddNote = async (note: Note) => {
 // 1. Optimistic UI update
 setNotes(prev => [note, ...prev]);

 // 2. Add activity locally
 const activity: Activity = {
  id: 'a_' + Date.now(),
  type: 'Lead',
  timestamp: 'Just now',
  title: 'New Internal Note',
  subtitle: `published: ${note.title}`,
  accentColor: 'tertiary'
 };
 setActivities(prev => [activity, ...prev]);

 // 3. Persistent Supabase write
 if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.insertNote(note, currentUser.id);
  await db.insertActivity(activity, currentUser.id);
  } catch (err) {
  console.error('Supabase failed to publish note:', err);
  }
 }
 };

 const handleUpdateNote = async (updated: Note) => {
 // 1. Optimistic UI update
 setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));

 // 2. Persistent Supabase update
 if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.updateNote(updated, currentUser.id);
  } catch (err) {
  console.error('Supabase failed to update note:', err);
  }
 }
 };

 const handleDeleteNote = async (id: string) => {
 // 1. Optimistic UI update
 setNotes(prev => prev.filter(n => n.id !== id));

 // 2. Persistent Supabase delete
 if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
  try {
  await db.deleteNote(id, currentUser.id);
  } catch (err) {
  console.error('Supabase failed to delete note:', err);
  }
 }
 };

 const handleDeleteContact = async (id: string) => {
 // 1. Optimistic UI update
 rememberDeletedContact(id);
 setContacts(prev => {
  const nextContacts = prev.filter(c => c.id !== id);
  try { localStorage.setItem('althera_contacts_cache', JSON.stringify(nextContacts)); }
  catch (error) { console.warn('Could not update CRM contact cache after deletion:', error); }
  return nextContacts;
 });

 // 2. Always request the persistent deletion. If the network is unavailable, the
 // tombstone above keeps the contact hidden and the next synchronization retries it.
 try {
  await db.deleteContact(id, currentUser?.id || undefined);
 } catch (err) {
  console.error('Supabase failed to delete contact; deletion queued for retry:', err);
 }
 };

 // Match corresponding search details
 const filteredSearchEvents = events.filter(ev => 
 ev.title.toLowerCase().includes(globalSearch.toLowerCase()) || 
 ev.description.toLowerCase().includes(globalSearch.toLowerCase())
 );

 const filteredSearchNotes = notes.filter(n =>
 n.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
 n.content.toLowerCase().includes(globalSearch.toLowerCase())
 );

 const filteredSearchContacts = contacts.filter(c =>
 c.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
 c.company.toLowerCase().includes(globalSearch.toLowerCase())
 );

 // Animation layout variants definition
 const screenVariants = {
 initial: (type: 'none' | 'push' | 'push_back') => {
  if (type === 'push') return { x: '100%', opacity: 0 };
  if (type === 'push_back') return { x: '-100%', opacity: 0 };
  return { opacity: 0 };
 },
 animate: {
  x: 0,
  opacity: 1,
  transition: { duration: 0.35, ease: 'easeInOut' }
 },
 exit: (type: 'none' | 'push' | 'push_back') => {
  if (type === 'push') return { x: '-100%', opacity: 0 };
  if (type === 'push_back') return { x: '100%', opacity: 0 };
  return { opacity: 0 };
 }
 };

 const screenMeta: Record<string, { title: string; eyebrow: string }> = {
 dashboard: { title: 'Dashboard', eyebrow: 'Centro de mando' },
 calendar: { title: 'Calendario visual', eyebrow: 'Agenda operativa' },
 crm: { title: 'Clientes', eyebrow: 'CRM comercial' },
 notes: { title: 'Notas internas', eyebrow: 'Conocimiento' },
 projects: { title: 'Proyectos', eyebrow: 'Produccion' },
 finanzas: { title: 'Finanzas globales', eyebrow: 'Facturacion' },
 contactos: { title: 'Contactos', eyebrow: 'Landing' },
 citas: { title: 'Control de citas', eyebrow: 'Reservas y reuniones' },
 contratos: { title: 'Contratos y facturas', eyebrow: 'Documentos' },
 comerciales_admin: { title: 'Gestion comerciales', eyebrow: 'Equipo ventas' },
 cold_calling: { title: 'Cold calling', eyebrow: 'Prospeccion' },
 developer_hub: { title: 'Organizacion devs', eyebrow: 'Demos y entregas' },
 marketing: { title: 'Marketing', eyebrow: 'Contenido' },
 departamentos: { title: 'Departamentos', eyebrow: 'Equipo y operaciones' }
 };

 const activeMeta = screenMeta[currentScreen] || { title: 'Althera', eyebrow: 'Admin panel' };

 // Helper screen selector matches
 const renderScreen = (screen: Screen) => {
 switch (screen) {
  case 'dashboard':
  return (
   <DashboardScreen 
   events={globalSearch ? filteredSearchEvents.filter(event => adminVisibleEventIds.has(event.id)) : adminVisibleEvents}
   notes={globalSearch ? filteredSearchNotes : notes}
   activities={activities}
   onNavigate={navigateTo}
   onAddNote={handleAddNote}
   onAddEvent={handleAddEvent}
   currentUser={currentUser}
   leads={leadsList}
   contacts={contacts}
   />
  );
  case 'departamentos':
  return <DepartmentsScreen onNavigate={navigateTo} />;
  case 'calendar':
  return (
   <CalendarScreen 
   events={globalSearch ? filteredSearchEvents.filter(event => adminVisibleEventIds.has(event.id)) : adminVisibleEvents}
   contacts={contacts}
   notes={globalSearch ? filteredSearchNotes : notes}
   onAddEvent={handleAddEvent}
   onDeleteEvent={handleDeleteEvent}
   onUpdateEvent={handleUpdateEvent}
   onNavigate={navigateTo}
   usersList={usersList}
   onAddProfile={handleUpsertProfile}
   comercialesList={comercialesList}
   />
  );
  case 'crm':
  return (
   <CrmScreen 
   contacts={globalSearch ? filteredSearchContacts : contacts}
   events={adminVisibleEvents}
   onAddContact={handleAddContact}
   onUpdateContact={handleUpdateContact}
   onDeleteContact={handleDeleteContact}
   onNavigate={navigateTo}
   usersList={usersList}
   onAddProfile={handleUpsertProfile}
   onAddEvent={handleAddEvent}
   comercialesList={comercialesList}
   onRefreshFinance={handleRefreshFinance}
   />
  );
  case 'notes':
  return (
   <NotesScreen 
   notes={globalSearch ? filteredSearchNotes : notes}
   onAddNote={handleAddNote}
   onUpdateNote={handleUpdateNote}
   onDeleteNote={handleDeleteNote}
   currentUser={currentUser}
   />
  );
  case 'projects':
  return (
   <ProjectsScreen 
   contacts={contacts}
   onNavigate={navigateTo}
   projects={projects}
   onAddProject={handleAddProject}
   onUpdateProject={handleUpdateProject}
   onDeleteProject={handleDeleteProject}
   />
  );
  case 'finanzas':
  return (
   <FinanceScreen 
   contacts={contacts}
   onNavigate={navigateTo}
   comercialesList={comercialesList}
   />
  );
  case 'contactos':
  return (
   <ContactosScreen />
  );
 case 'citas':
 return (
  <CitasScreen
   events={adminVisibleEvents}
   contacts={contacts}
   onAddEvent={handleAddEvent}
   onUpdateEvent={handleUpdateEvent}
   onDeleteEvent={handleDeleteEvent}
   usersList={usersList}
   onAddProfile={handleUpsertProfile}
   comercialesList={comercialesList}
   />
  );
  case 'contratos':
  return (
   <ContractsScreen
   contacts={contacts}
   onNavigate={navigateTo}
   />
  );
  case 'comerciales_admin':
  return (
   <ComercialesAdminScreen
   comercialesList={comercialesList}
   leadsList={leadsList}
   coldLeads={coldLeads}
   finTransactions={finTransactions}
   contacts={contacts}
   events={adminVisibleEvents}
   onAddComercial={handleAddComercialAccount}
   onUpdateComercial={handleUpdateComercialAccount}
   onDeleteComercial={handleDeleteComercialAccount}
   onNavigate={navigateTo}
   />
  );
 case 'cold_calling':
  return (
   <ColdCallingScreen
   coldLeads={coldLeads}
   comercialesList={comercialesList}
   usersList={usersList}
   onAddColdLead={handleAddColdLead}
   onUpdateColdLead={handleUpdateColdLead}
   onDeleteColdLead={handleDeleteColdLead}
   currentUser={currentUser}
   currentComercial={null}
   onNavigate={navigateTo}
   onAddEvent={handleAddEvent}
   onUpdateEvent={handleUpdateEvent}
   onDeleteEvent={handleDeleteEvent}
   events={adminVisibleEvents}
   contacts={contacts}
   onAddContact={handleAddContact}
   onUpdateContact={handleUpdateContact}
   onRefreshFinance={handleRefreshFinance}
   focusClosingLeadId={focusedAdminClosingLeadId}
   />
  );
  case 'developer_hub':
  return (
   <DeveloperHubScreen
   contacts={contacts}
   projects={projects}
   onUpdateContact={handleUpdateContact}
   onAddProject={handleAddProject}
   onNavigate={navigateTo}
   usersList={usersList}
   onAddEvent={handleAddEvent}
   />
  );
  case 'marketing':
  return <MarketingScreen />;
  default:
  return null;
 }
 };

 // Render Landing and Login screens separately to exclude sidebar and header layout boundaries
 if (currentScreen === 'landing') {
 return (
  <AnimatePresence mode="wait">
  <motion.div
   key="landing-view"
   custom={transitionType}
   variants={screenVariants}
   initial="initial"
   animate="animate"
   exit="exit"
   className="w-full h-full min-h-screen"
  >
   <LandingScreen onNavigate={navigateTo} projects={projects} />
  </motion.div>
  </AnimatePresence>
 );
 }

 if (currentScreen === 'acceso') {
 return (
  <AnimatePresence mode="wait">
  <motion.div
   key="login-view"
   custom={transitionType}
   variants={screenVariants}
   initial="initial"
   animate="animate"
   exit="exit"
   className="w-full h-full min-h-screen"
  >
   <LoginScreen 
   onSignIn={handleSignInAndNavigate} 
   onBackToLanding={() => navigateTo('landing', 'push_back')}
   />
  </motion.div>
  </AnimatePresence>
 );
 }

 if (currentScreen === 'comerciales_acceso') {
 return (
  <AnimatePresence mode="wait">
  <motion.div
   key="comerciales-login-view"
   custom={transitionType}
   variants={screenVariants}
   initial="initial"
   animate="animate"
   exit="exit"
   className="w-full h-full min-h-screen animate-fade-in"
  >
   <ComercialesAccesoScreen
   comercialesList={comercialesList}
   onSignInComercial={(com) => {
    setCurrentComercial(com);
    navigateTo('comerciales_panel', 'push');
   }}
   onBackToLanding={() => navigateTo('landing', 'push_back')}
   />
  </motion.div>
  </AnimatePresence>
 );
 }

 if (currentScreen === 'comerciales_panel') {
 return (
  <AnimatePresence mode="wait">
  <motion.div
   key="comerciales-panel-view"
   custom={transitionType}
   variants={screenVariants}
   initial="initial"
   animate="animate"
   exit="exit"
   className="w-full h-full min-h-screen"
  >
   <ComercialesPanelScreen
   comercial={currentComercial || comercialesList[0] || { id: 'com_demo', name: 'Alfonso Sales', email: 'vendedor@agency.com', createdAt: '' }}
   leadsList={leadsList}
   onAddLead={handleAddComercialLead}
   onUpdateLead={handleUpdateComercialLead}
   onDeleteLead={handleDeleteComercialLead}
   onUpdateComercial={handleUpdateComercialAccount}
   onLogout={() => {
    setCurrentComercial(null);
    navigateTo('landing', 'push_back');
   }}
   
   // Cold calling bindings
   coldLeads={coldLeads}
   comercialesList={comercialesList}
   onAddColdLead={handleAddColdLead}
   onUpdateColdLead={handleUpdateColdLead}
   onDeleteColdLead={handleDeleteColdLead}
   events={events.filter(event => !event.isPrivate || !event.comercialId || event.comercialId === currentComercial?.id)}
   onAddEvent={handleAddEvent}
   onUpdateEvent={handleUpdateEvent}
   onDeleteEvent={handleDeleteEvent}
   usersList={usersList}
   finTransactions={finTransactions}
   contacts={contacts}
   onAddContact={handleAddContact}
   />
  </motion.div>
  </AnimatePresence>
 );
 }

 return (
 <div className="admin-shell relative min-h-screen bg-[#071018] text-slate-100 flex font-sans overflow-hidden">
  
  {/* Professional app shell background */}
  <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
  <div className="absolute inset-0 bg-[linear-gradient(120deg,#091521_0%,#0b111d_42%,#111827_100%)]" />
  <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:32px_32px]" />
  <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-sky-500/10 to-transparent" />
  </div>

  {/* Sidebar Navigation */}
  <Sidebar 
  currentScreen={currentScreen} 
  onNavigate={navigateTo} 
  supabaseStatus={supabaseStatus}
  onOpenSupabase={() => setIsSupabaseModalOpen(true)}
  currentUser={currentUser}
  onLogout={handleSignOutUser}
  onOpenNotifications={() => setIsNotificationsOpen(true)}
  unreadCount={unreadCount}
  mobileOpen={mobileSidebarOpen}
  onMobileClose={() => setMobileSidebarOpen(false)}
  />
  {mobileSidebarOpen && <button aria-label="Cerrar menú" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden" />}

  {/* Main Content Pane wrapper */}
  <div className="flex-1 ml-0 lg:ml-[260px] flex flex-col h-screen min-w-0 overflow-hidden">
  <div className="lg:hidden h-16 shrink-0 px-4 flex items-center justify-between border-b border-white/10 bg-[#08111b]/95 backdrop-blur-xl z-30">
   <button onClick={() => setMobileSidebarOpen(true)} className="w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center" aria-label="Abrir menú">
   <Menu className="w-5 h-5" />
   </button>
   <span className="text-xs font-black uppercase tracking-[.2em]">Althera</span>
   <button onClick={() => setIsNotificationsOpen(true)} className="relative w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center" aria-label="Notificaciones">
   <Bell className="w-5 h-5" />
   {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400" />}
   </button>
  </div>

  <header className="hidden lg:flex h-[72px] shrink-0 items-center justify-between gap-6 border-b border-white/10 bg-[#08111b]/80 px-7 backdrop-blur-xl">
   <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">{activeMeta.eyebrow}</p>
    <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-white">{activeMeta.title}</h1>
   </div>
   <div className="flex flex-1 items-center justify-end gap-3">
    <div className="relative w-full max-w-md">
     <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
     <input
      value={globalSearch}
      onChange={(event) => setGlobalSearch(event.target.value)}
      placeholder="Buscar clientes, citas, notas..."
      className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-white/[0.07]"
     />
    </div>
    <button onClick={() => navigateTo('citas', 'none')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/15">
     <Plus className="h-4 w-4" />
     Citas
    </button>
    <button onClick={() => setIsNotificationsOpen(true)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white" aria-label="Notificaciones">
     <Bell className="h-4 w-4" />
     {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-300" />}
    </button>
   </div>
  </header>

  {/* Dynamic Screen viewport frames with slide/none transitions */}
  <div className="flex-1 relative overflow-hidden font-sans">
   <AnimatePresence mode="wait" initial={false}>
   <motion.div
    key={currentScreen}
    custom={transitionType}
    variants={screenVariants}
    initial={transitionType === 'none' ? false : 'initial'}
    animate="animate"
    exit={transitionType === 'none' ? false : 'exit'}
    className="absolute inset-0 w-full h-full flex flex-col admin-workspace"
   >
    {renderScreen(currentScreen)}
   </motion.div>
   </AnimatePresence>
  </div>

  </div>

  {/* Supabase Control Center Integration Overlay */}
  <SupabaseInfoModal
  isOpen={isSupabaseModalOpen}
  onClose={() => setIsSupabaseModalOpen(false)}
  status={supabaseStatus}
  onRefresh={() => syncWithSupabase()}
  onSeed={handleSeedDatabase}
  />

  {/* Dynamic Sliding Notifications Drawer Overlay */}
  <AnimatePresence>
  {isNotificationsOpen && (
   <>
   {/* Backdrop blur spacer */}
   <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={() => setIsNotificationsOpen(false)}
    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 cursor-pointer"
   />
   
   {/* Drawer Sliding Body */}
   <motion.div
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '100%' }}
    transition={{ type: 'spring', damping: 26, stiffness: 220 }}
    className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-slate-900 border-l border-white/10 z-50 shadow-2xl p-6 flex flex-col justify-between"
   >
    <div className="flex flex-col h-full overflow-hidden">
    {/* Header */}
    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5 flex-shrink-0">
     <div className="flex items-center gap-2">
     <Bell className="text-blue-400 w-5 h-5" />
     <h3 className="font-bold text-sm text-white">Notificaciones</h3>
     </div>
     <button 
     onClick={() => setIsNotificationsOpen(false)}
     className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
     >
     <X className="w-5 h-5" />
     </button>
    </div>

    {/* Sub headers action steps */}
    {userNotifications.length > 0 && unreadCount > 0 && (
     <div className="flex items-center justify-between mb-4 flex-shrink-0">
     <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-semibold">
      {unreadCount} pendientes
     </span>
     <button 
      onClick={handleMarkAllAsRead}
      className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer font-bold uppercase tracking-wider"
     >
      Marcar todas como leídas
     </button>
     </div>
    )}

    <label className="mb-4 flex flex-shrink-0 items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
     <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
     Notificar leads calientes
     </span>
     <input
     type="checkbox"
     checked={notifyHotLeads}
     onChange={(e) => setNotifyHotLeads(e.target.checked)}
     className="h-4 w-4 accent-violet-500 cursor-pointer"
     />
    </label>

    {/* Notification Checklist list view wrap */}
    <div className="flex-grow overflow-y-auto space-y-3 pr-1">
     {userNotifications.length === 0 ? (
     <div className="text-center py-16">
      <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
      <Bell className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-slate-400 text-xs font-semibold">No tienes asignaciones de calendario.</p>
      <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto mt-1 leading-relaxed">
      Cuando un colega te asigne un evento del calendario, se listará aquí al instante.
      </p>
     </div>
     ) : (
     userNotifications.map(ev => {
      const isUnread = !readNotificationIds.includes(ev.id);
      return (
      <div 
       key={ev.id} 
       className={`p-3.5 rounded-2xl border transition-all duration-200 ${
       isUnread ?
        'bg-blue-500/5 border-blue-500/25 shadow-lg shadow-blue-500/[0.02]'
        : 'bg-white/[0.01] border-white/5 opacity-75'
       }`}
      >
       <div className="flex items-start justify-between gap-3">
       <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase leading-none ${
         ev.type === 'Meeting' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/10' :
         ev.type === 'Review' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/10' :
         ev.type === 'Deadline' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/10' :
         'bg-slate-800 text-slate-400'
        }`}>
         {ev.type}
        </span>
        {isUnread && (
         <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        )}
        </div>
        <h4 className="font-bold text-xs text-white leading-snug truncate mt-1">
        {ev.title}
        </h4>
        <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
        {ev.description || 'Sin detalles configurados.'}
        </p>
        
        <div className="flex items-center gap-3 text-[9px] text-slate-500 font-mono pt-1">
        <span className="flex items-center gap-1">
         <CalendarAtom className="w-3.5 h-3.5" />
         {ev.date}
        </span>
        <span>{ev.time}</span>
        </div>
        {ev.whatsappUrl && (
        <a
         href={ev.whatsappUrl}
         target="_blank"
         rel="noreferrer"
         onClick={(e) => e.stopPropagation()}
         className="inline-flex items-center justify-center mt-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/25 hover:text-white transition"
        >
         Enviar WhatsApp
        </a>
        )}
        {isClosingAppointmentEvent(ev) && (
        <button
         type="button"
         onClick={() => openClosingCase(ev)}
         className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-black text-amber-300 transition hover:bg-amber-400/20 hover:text-white"
        >
         <Briefcase className="h-3.5 w-3.5" /> Ir al caso de Closing
        </button>
        )}
       </div>
       
       {isUnread && (
        <button
        onClick={() => handleMarkAsRead(ev.id)}
        title="Marcar como leído"
        className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-white rounded-lg transition-all duration-200 flex-shrink-0 cursor-pointer"
        >
        <Check className="w-3.5 h-3.5" />
        </button>
       )}
       </div>
      </div>
      );
     })
     )}
    </div>
    </div>

    {/* Technical footnote */}
    <div className="border-t border-white/5 pt-4 text-center flex-shrink-0 mt-4">
    <p className="text-[9px] font-mono text-amber-500/65">Althera v2.0 Central Notificaciones</p>
    </div>
   </motion.div>
   </>
  )}
  </AnimatePresence>

  {dueClosingAlertEvent && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
   <div role="alertdialog" aria-modal="true" aria-labelledby="closing-alert-title" className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-amber-300/25 bg-[#0a0e14] p-6 shadow-[0_30px_120px_rgba(0,0,0,.8)] sm:p-8">
    <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />
    <div className="relative">
     <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/10"><AlertTriangle className="h-7 w-7 animate-pulse text-amber-300" /></div>
     <p className="mt-6 text-[10px] font-black uppercase tracking-[.28em] text-amber-300">Closing · {dueClosingAlertEvent.time}</p>
     <h2 id="closing-alert-title" className="mt-2 text-3xl font-black tracking-tight text-white">Es la hora de tu cita</h2>
     <p className="mt-2 text-sm leading-6 text-slate-400">Tienes que gestionar <strong className="text-white">{dueClosingAlertEvent.title.replace(/^Cita comercial:\s*/i, '')}</strong>. Puedes abrir directamente la ficha de Closing o descartar este aviso.</p>
     <div className="mt-7 grid grid-cols-2 gap-3">
      <button type="button" onClick={() => resolveClosingAlert(dueClosingAlertEvent, 'rejected')} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-slate-300 transition hover:bg-white/10 hover:text-white">Rechazar aviso</button>
      <button type="button" onClick={() => resolveClosingAlert(dueClosingAlertEvent, 'accepted')} className="rounded-2xl bg-amber-300 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_15px_40px_rgba(252,211,77,.18)] transition hover:bg-amber-200">Aceptar e ir al caso</button>
     </div>
    </div>
   </div>
  </div>
  )}
  
  {/* Stripe Callback Modal Overlay */}
  {stripeSuccessData?.show && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
   <motion.div 
   initial={{ scale: 0.9, opacity: 0 }}
   animate={{ scale: 1, opacity: 1 }}
   className="bg-[#09090f] border border-white/10 p-7 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(139,92,246,0.15)] relative text-center space-y-4"
   >
   <button 
    onClick={() => setStripeSuccessData(null)}
    className="absolute right-4 top-4 text-slate-400 hover:text-white transition cursor-pointer"
   >
    <X className="w-5 h-5" />
   </button>
   
   {stripeSuccessData.status === 'success' ? (
    <>
    <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
     <Check className="w-8 h-8" />
    </div>
    <h3 className="text-xl font-bold text-slate-100 font-sans tracking-tight">
     {stripeSuccessData.interval === 'once' ? '¡Pago Recibido con ÉÉxito!' : '¡Mensualidad Configurada!'}
    </h3>
    <p className="text-xs text-slate-400 font-sans leading-relaxed">
     {stripeSuccessData.interval === 'once' ? (
     <>Se ha registrado y cobrado correctamente el pago único por Stripe para <strong className="text-slate-200">{stripeSuccessData.clientName}</strong>.</>
     ) : (
     <>Se ha activado correctamente el cobro automático por Stripe para <strong className="text-slate-200">{stripeSuccessData.clientName}</strong>. El cliente recibirá su cobro de manera recurrente.</>
     )}
    </p>
    <div className="bg-[#040408] p-4 rounded-2xl border border-white/5 space-y-2.5 text-left font-sans">
     <div className="flex justify-between text-xs">
     <span className="text-slate-500 font-mono uppercase text-[9px] tracking-wider">Importe:</span>
     <span className="font-extrabold text-emerald-400">{stripeSuccessData.amount} €</span>
     </div>
     <div className="flex justify-between text-xs">
     <span className="text-slate-500 font-mono uppercase text-[9px] tracking-wider">Frecuencia:</span>
     <span className="font-bold text-slate-300">
      {stripeSuccessData.interval === 'once' ? 'Pago Único' : stripeSuccessData.interval === 'year' ? 'Anual' : 'Mensual'}
     </span>
     </div>
     <div className="flex justify-between text-xs">
     <span className="text-slate-500 font-mono uppercase text-[9px] tracking-wider">Método de pago:</span>
     <span className="font-medium text-slate-300">Tarjeta o Banco (Procesado por Stripe)</span>
     </div>
    </div>
    <p className="text-[10px] text-slate-500 italic">
     Las transacciones correspondientes se registrarán automáticamente en el historial de finanzas.
    </p>
    <button
     onClick={() => setStripeSuccessData(null)}
     className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
    >
     Confirmar y Continuar
    </button>
    </>
   ) : stripeSuccessData.status === 'cancel' ? (
    <>
    <div className="mx-auto w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center border border-amber-500/30">
     <X className="w-8 h-8" />
    </div>
    <h3 className="text-xl font-bold text-slate-100 tracking-tight">Proceso Cancelado</h3>
    <p className="text-xs text-slate-400 leading-relaxed">
     La configuración de pago para <strong className="text-slate-200">{stripeSuccessData.clientName}</strong> fue cancelada antes de que el cliente ingresara sus datos.
    </p>
    <button
     onClick={() => setStripeSuccessData(null)}
     className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
    >
     Entendido
    </button>
    </>
   ) : (
    <>
    <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center border border-rose-500/30">
     <X className="w-8 h-8" />
    </div>
    <h3 className="text-xl font-bold text-slate-100 tracking-tight font-sans">Error al Procesar</h3>
    <p className="text-xs text-slate-400 leading-relaxed font-sans">
     Ocurrió un problema de verificación o conexión de Stripe.
    </p>
    <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/15 text-left">
     <span className="text-rose-400 font-mono text-[10px] block leading-normal break-all">
     {stripeSuccessData.error || "No se pudo recuperar la información del cliente."}
     </span>
    </div>
    <button
     onClick={() => setStripeSuccessData(null)}
     className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
    >
     Aceptar
    </button>
    </>
   )}
   </motion.div>
  </div>
  )}

  {/* Global Toast Alert System */}
  <div 
  id="toast-msg" 
  className="fixed bottom-6 right-6 z-50 bg-[#09090f]/90 border border-violet-500/30 text-white font-sans text-xs px-5 py-3 rounded-2xl shadow-2xl backdrop-blur flex items-center gap-2 max-w-sm opacity-0 pointer-events-none transition-all duration-300 hidden"
  >
  <Check className="w-4 h-4 text-violet-400" />
  <span />
  </div>

 </div>
 );
}
