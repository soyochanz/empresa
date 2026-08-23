import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Screen, ClientContact, CalendarEvent, Note, Activity, ComercialAccount, ComercialLead, ColdCallingLead, Invoice, FinanceTransaction, PartnerCompany } from './types';
import { PanelUser } from './mockData';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import LandingScreen from './components/LandingScreen';
import PortalAccessScreen from './components/PortalAccessScreen';
import DashboardScreen from './components/DashboardScreen';
import CalendarScreen from './components/CalendarScreen';
import CrmScreen from './components/CrmScreen';
import NotesScreen from './components/NotesScreen';
import ProjectsScreen, { AgencyProject } from './components/ProjectsScreen';
import ContactosScreen from './components/ContactosScreen';
import FinanceScreen from './components/FinanceScreen';
import CitasScreen from './components/CitasScreen';
import ContractsScreen from './components/ContractsScreen';
import ComercialesAccesoScreen from './components/ComercialesAccesoScreen';
import ComercialesPanelScreen from './components/ComercialesPanelScreen';
import ComercialesAdminScreen from './components/ComercialesAdminScreen';
import ColdCallingScreen from './components/ColdCallingScreen';
import DeveloperHubScreen from './components/DeveloperHubScreen';
import ActivityLogScreen from './components/ActivityLogScreen';
import MarketingScreen from './components/MarketingScreen';
import DepartmentsScreen from './components/DepartmentsScreen';
import BitesScreen from './components/BitesScreen';
import { motion, AnimatePresence } from 'motion/react';
import { db, supabase, checkSupabaseConnection, ConnectionStatus, invalidateSharedPipelineCache } from './supabaseClient';
import { Bell, X, Calendar as CalendarAtom, Check, Menu, Search, Plus, AlertTriangle, Briefcase, BriefcaseBusiness, Code2, PhoneCall } from 'lucide-react';
import { installAuditTracking, recordAuditEvent, setAuditContext } from './utils/auditLog';
import { isAuthorizedAdminUser } from './utils/adminAuth';
import { getNextFinanceRecurrenceDate } from './utils/financeRecurrence';

const BUSINESS_CACHE_KEYS = [
 'crm_cold_leads',
 'crm_comercial_leads',
 'crm_comerciales_accounts',
 'crm_projects',
 'althera_contacts_cache',
 'althera_events_cache',
 'althera_commercial_private_events',
 'althera_deleted_contact_ids',
 'althera_landing_partners',
 'althera_audit_pending_v1',
 'althera_handled_closing_alerts',
 'agency_read_notifications'
];

// Business records must only come from Supabase. Purge legacy browser copies on
// every boot so an old failed write can never reappear as a valid record.
try {
 BUSINESS_CACHE_KEYS.forEach(key => localStorage.removeItem(key));
} catch (error) {
 console.warn('Could not purge legacy business caches:', error);
}

const normalizeClientIdentity = (value?: string) => (value || '').trim().toLocaleLowerCase('es-ES');
const isCommercialLeadLinkedToContact = (lead: ComercialLead, contact: ClientContact) => {
 const sourceMarkerMatch = lead.notes?.includes(`[SOURCE_CONTACT_ID:${contact.id}]`) ||
  (!!contact.closingSourceLeadId && lead.notes?.includes(`[SOURCE_COLD_LEAD_ID:${contact.closingSourceLeadId}]`));
 const contactEmail = normalizeClientIdentity(contact.email);
 const emailMatch = !!contactEmail && normalizeClientIdentity(lead.email) === contactEmail;
 const nameMatch = normalizeClientIdentity(lead.name) === normalizeClientIdentity(contact.name);
 const companyMatch = normalizeClientIdentity(lead.company) === normalizeClientIdentity(contact.company);
 return !!sourceMarkerMatch || emailMatch || (nameMatch && companyMatch);
};

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

function getScreenFromPath(pathString: string, isLoggedIn: boolean, isComercialLoggedIn: boolean): { screen: Screen; redirectedPath?: string } {
 let path = pathString || '/';
 // Strip trailing slashes to maintain uniform match
 if (path !== '/' && path.endsWith('/')) {
 path = path.slice(0, -1);
 }
 
 if (path === '/' || path === '') {
 return { screen: 'landing' };
 }

 if (path === '/portal' || path === '/area-privada') {
 return { screen: 'portal' };
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
 if (path === '/admin/activity-log') return { screen: 'activity_log' };
 if (path === '/admin/marketing') return { screen: 'marketing' };
 if (path === '/admin/departamentos') return { screen: 'departamentos' };
 if (path === '/admin/bites') return { screen: 'bites' };
 
 return { screen: 'dashboard' };
 }

 return { screen: 'landing' };
}

function getPathFromScreen(screen: Screen): string {
 switch (screen) {
 case 'landing': return '/';
 case 'portal': return '/portal';
 case 'acceso': return '/acceso';
 case 'comerciales_acceso': return '/comerciales/acceso';
 case 'comerciales_panel': return '/comerciales/panel';
 case 'dashboard': return '/admin/dashboard';
 case 'calendar': return '/admin/calendar';
 case 'crm': return '/admin/crm';
 case 'notes': return '/admin/notes';
 case 'projects': return '/admin/projects';
 case 'developer_hub': return '/admin/dev-hub';
 case 'activity_log': return '/admin/activity-log';
 case 'marketing': return '/admin/marketing';
 case 'departamentos': return '/admin/departamentos';
 case 'bites': return '/admin/bites';
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
 const [septemberGoalDismissed, setSeptemberGoalDismissed] = useState(() => localStorage.getItem('althera-september-goal-dismissed') === 'true');
 // Screens state
 const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
 const initialPath = window.location.pathname || '/';
 const savedComercial = sessionStorage.getItem('agency_current_comercial');
 const isComercialLoggedIn = !!savedComercial;

 // Never trust a browser-stored profile to unlock an admin route. The verified
 // Supabase session will restore the exact route once Auth is ready.
 const { screen } = getScreenFromPath(initialPath, false, isComercialLoggedIn);
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

 // Authentication state
 const [currentUser, setCurrentUser] = useState<{ id: string | null; email: string; name: string } | null>(null);
 const [authReady, setAuthReady] = useState(false);

 // Persistence Engine Database State (with standard fallback to empty arrays)
 const [contacts, setContacts] = useState<ClientContact[]>([]);

 const [events, setEvents] = useState<CalendarEvent[]>([]);
 const [focusedAdminClosingLeadId, setFocusedAdminClosingLeadId] = useState<string>();
 const [closingAlertClock, setClosingAlertClock] = useState(() => Date.now());
 const [handledClosingAlertIds, setHandledClosingAlertIds] = useState<string[]>([]);

 useEffect(() => {
  const timer = window.setInterval(() => setClosingAlertClock(Date.now()), 15_000);
  return () => window.clearInterval(timer);
 }, []);

 const [notes, setNotes] = useState<Note[]>([]);

 const [activities, setActivities] = useState<Activity[]>([]);

 // Global projects state
 const [projects, setProjects] = useState<any[]>([]);

 const [partners, setPartners] = useState<PartnerCompany[]>([]);

 useEffect(() => {
  let active = true;
  db.getPartners().then(items => { if (active) setPartners(items); }).catch(error => console.warn('No se pudieron cargar las empresas colaboradoras:', error));
  return () => { active = false; };
 }, []);

 // Dynamic users state
 const [usersList, setUsersList] = useState<PanelUser[]>([]);

 // Comerciales accounts and logged-in state
 const [comercialesList, setComercialesList] = useState<ComercialAccount[]>([]);

 const [leadsList, setLeadsList] = useState<ComercialLead[]>([]);

 const [coldLeads, setColdLeads] = useState<ColdCallingLead[]>([]);

 const [currentComercial, setCurrentComercial] = useState<ComercialAccount | null>(() => {
 const saved = sessionStorage.getItem('agency_current_comercial');
 if (!saved) return null;
 try {
  const parsed = JSON.parse(saved);
  return parsed?.id && parsed?.email
   ? { id: parsed.id, email: parsed.email, name: parsed.name || parsed.email, createdAt: parsed.createdAt || '' } as ComercialAccount
   : null;
 } catch { return null; }
 });

 useEffect(() => {
 if (currentComercial) {
  // Keep only the minimum session identity. Commercial, payout and lead data are
  // always hydrated again from Supabase and are never persisted in the browser.
  sessionStorage.setItem('agency_current_comercial', JSON.stringify({
   id: currentComercial.id,
   email: currentComercial.email,
   name: currentComercial.name,
   createdAt: currentComercial.createdAt
  }));
 } else {
  sessionStorage.removeItem('agency_current_comercial');
 }
 }, [currentComercial]);

 useEffect(() => installAuditTracking(), []);

 useEffect(() => {
  const actor = currentUser || currentComercial;
  setAuditContext(actor ? {
   enabled: true,
   actorType: 'user',
   actorId: actor.id || actor.email,
   actorName: actor.name,
   actorEmail: actor.email.toLowerCase(),
   screen: currentScreen
  } : {
   enabled: false,
   actorType: 'system',
   actorId: undefined,
   actorName: 'Sistema Althera',
   actorEmail: undefined,
   screen: currentScreen
  });

  if (!actor) return;
  recordAuditEvent({
   source: 'navigation',
   action: 'screen_view',
   description: `Pantalla abierta: ${currentScreen}`,
   screen: currentScreen,
   metadata: { path: window.location.pathname }
  });

  const sessionKey = `althera_audit_session:${actor.id || actor.email}`;
  if (!sessionStorage.getItem(sessionKey)) {
   sessionStorage.setItem(sessionKey, new Date().toISOString());
   recordAuditEvent({ source: 'auth', action: 'session_start', description: `Sesión iniciada por ${actor.name}`, screen: currentScreen, dedupe: false });
  }
 }, [currentUser, currentComercial, currentScreen]);

 const lastLoggedConnectionState = useRef<string>();
 useEffect(() => {
  if ((!currentUser && !currentComercial) || supabaseStatus.loading) return;
  const state = `${supabaseStatus.connected}:${supabaseStatus.tablesExist}`;
  if (lastLoggedConnectionState.current === state) return;
  lastLoggedConnectionState.current = state;
  recordAuditEvent({
   actorType: 'system',
   source: 'data',
   action: supabaseStatus.connected && supabaseStatus.tablesExist ? 'data_connection_ready' : 'data_connection_warning',
   description: supabaseStatus.connected && supabaseStatus.tablesExist ? 'La sincronización de datos está operativa.' : 'La sincronización de datos requiere atención.',
   severity: supabaseStatus.connected && supabaseStatus.tablesExist ? 'info' : 'warning',
   metadata: { connected: supabaseStatus.connected, tablesReady: supabaseStatus.tablesExist },
   dedupe: false
  });
 }, [currentUser, currentComercial, supabaseStatus.loading, supabaseStatus.connected, supabaseStatus.tablesExist]);

 // Notifications states
 const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
 const [notifyHotLeads, setNotifyHotLeads] = useState<boolean>(() => {
 const saved = localStorage.getItem('agency_notify_hot_leads');
 return saved ? saved === 'true' : true;
 });
 const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
 const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
  throw e;
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
  firstPaymentDate?: string;
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
  try {
   // Retrieve Stripe details from backend to get customerId and subscriptionId
   let customerId = 'cus_mock_123';
    let subscriptionId = 'sub_mock_123';
    let paymentConfirmed = sessionId.startsWith('cs_test_mock_');
    let scheduledFirstPaymentDate = '';
    let scheduledSetupConfirmed = false;
   
   if (sessionId && sessionId.startsWith('cs_test_mock_')) {
   // Simulated mock payment session
   console.log("Processing simulated mock payment...");
   } else {
   const res = await fetch(`/api/stripe/retrieve-session?sessionId=${sessionId}`);
   const sessionData = await res.json();
   if (!res.ok) throw new Error(sessionData.error || 'No se pudo verificar el pago con Stripe.');
    customerId = sessionData.customerId;
    subscriptionId = sessionData.subscriptionId;
    scheduledFirstPaymentDate = sessionData.firstPaymentDate || '';
    paymentConfirmed = sessionData.paymentStatus === 'paid';
    scheduledSetupConfirmed = sessionData.paymentStatus === 'no_payment_required' && Boolean(scheduledFirstPaymentDate);
    }
    if (!paymentConfirmed && !scheduledSetupConfirmed) throw new Error('Stripe todavía no ha confirmado este pago.');

   setStripeSuccessData({
    show: true,
    clientName,
     amount,
     interval,
     firstPaymentDate: scheduledFirstPaymentDate || undefined,
     status: 'success'
   });

    const isSubscription = interval !== 'once';
    const hasStripeSubscription = isSubscription || Boolean(scheduledFirstPaymentDate);

   if (client) {
   const updatedClient: ClientContact = {
     ...client,
     stripeCustomerId: customerId || client.stripeCustomerId,
     stripeSubscriptionId: hasStripeSubscription ? subscriptionId : client.stripeSubscriptionId,
     stripeSubscriptionStatus: hasStripeSubscription ? 'active' : (client.stripeSubscriptionStatus || 'none'),
     stripeSubscriptionPrice: hasStripeSubscription ? amount : client.stripeSubscriptionPrice,
     stripeSubscriptionInterval: hasStripeSubscription ? (interval === 'once' ? 'month' : interval) : client.stripeSubscriptionInterval,
   };

   // Update client in database
    await db.updateContact(updatedClient);
   // Refresh local contacts list
    setContacts(prev => prev.map(c => c.id === clientId ? updatedClient : c));

    if (scheduledFirstPaymentDate) {
     const scheduledActivity: Activity = {
      id: `act_stripe_scheduled_${Date.now()}`,
      type: 'CRM',
      timestamp: 'Hace un momento',
      title: `Cobro programado - ${client.name}`,
      subtitle: `Tarjeta guardada; primer cobro de ${amount} € previsto para el ${new Date(`${scheduledFirstPaymentDate}T12:00:00`).toLocaleDateString('es-ES')}`,
      accentColor: 'secondary'
     };
     await db.insertActivity(scheduledActivity);
     setActivities(prev => [scheduledActivity, ...prev]);
     return;
    }

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
    paymentMethod: 'stripe',
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
    paymentMethod: 'stripe',
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
     paymentMethod: 'stripe',
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
    const normalizedClientEmail = (client.email || '').trim().toLowerCase();
    const clientInvoices = allInvoices.filter(inv => {
     if (inv.clientId) return inv.clientId === clientId;
     const invoiceEmail = (inv.clientEmail || '').trim().toLowerCase();
     return Boolean(invoiceEmail && normalizedClientEmail && invoiceEmail === normalizedClientEmail);
    });

    for (const inv of clientInvoices) {
    const hasPaidItem = inv.items.some(item => item.pendingTxId === paidTx.id);
    if (hasPaidItem) {
     const updatedItems = inv.items.map(item => item.pendingTxId === paidTx.id ? ({
     ...item,
     isPending: false,
     paymentMethod: 'stripe' as const
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

 useEffect(() => {
  const channel = supabase.channel('app-finance-transactions-sync')
   .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transactions' }, () => {
    invalidateSharedPipelineCache(['finance_transactions']);
    void handleRefreshFinance();
   })
   .subscribe();
  return () => { void supabase.removeChannel(channel); };
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
  const stripeTxId = String(tx.id || '').toLowerCase();
  const stripeSessionId = String(tx.stripeCheckoutSessionId || '').toLowerCase();
  const isStripeTx = (
   tx.paymentMethod === 'stripe'
   || stripeTxId.startsWith('tx_stripe_')
  ) && Boolean(
   tx.stripeCheckoutSessionId
   || tx.stripeInvoiceId
   || stripeTxId.startsWith('tx_stripe_')
  ) && !stripeSessionId.includes('mock') && !stripeTxId.includes('mock');

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
  const next = getNextFinanceRecurrenceDate(tx, today);

  const isOccurTomorrow = Boolean(next) && tomorrow.getFullYear() === next!.getFullYear() &&
        tomorrow.getMonth() === next!.getMonth() &&
        tomorrow.getDate() === next!.getDate();

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

 const configuredCloser = useMemo(() => usersList.find(user => {
  const identity = `${user.name || ''} ${user.email || ''}`.toLowerCase();
  return identity.includes('carlos') || identity.includes('closer');
 }), [usersList]);
 const currentUserIdentity = `${currentUser?.name || ''} ${currentUser?.email || ''}`.toLowerCase();
 const currentUserIsCloser = Boolean(currentUser && (
  currentUserIdentity.includes('carlos') || currentUserIdentity.includes('closer') ||
  (configuredCloser && (
   currentUser.email.toLowerCase() === configuredCloser.email.toLowerCase() ||
   (!!currentUser.id && currentUser.id === configuredCloser.id)
  ))
 ));

 const adminVisibleEvents = useMemo(() => {
  if (!currentUser) return [];
  const adminEmail = currentUser.email.toLowerCase();
  return events.filter(event => {
   if (event.isPrivate && event.comercialId) return false;
   const directEmail = event.assignedUserEmail?.toLowerCase();
   const assignedEmails = (event.assignedUserEmails || []).map(email => email.toLowerCase());
   const hasExplicitAssignment = !!directEmail || assignedEmails.length > 0 || !!event.assignedUserId;

   // El closer trabaja con una agenda personal: no debe heredar eventos generales,
   // sin asignar o destinados a otros administradores.
   if (currentUserIsCloser) {
    return directEmail === adminEmail || assignedEmails.includes(adminEmail) ||
     Boolean(event.assignedUserId && currentUser.id && event.assignedUserId === currentUser.id);
   }

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
 }, [events, currentUser, currentUserIsCloser]);

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
  // Las entregas asignadas a Dev deben avisarse en el momento de su creación,
  // aunque su fecha de calendario sea la futura cita con el closer.
  const isImmediateDevAssignment = e.isAdminNotification && (
   e.alias === 'Lead Dev desde Cold Calling' || e.id.startsWith('dev_intake_')
  );
  if (e.date !== todayKey && !isImmediateDevAssignment) return false;
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
 const syncUserIdRef = useRef<string | undefined>();

 // Verify and hydrate state from Supabase. All independent tables load in parallel,
 // and concurrent auth/mount/interval requests share the same in-flight operation.
 const syncWithSupabase = async (userIdToSync?: string, silent = false) => {
 const requestedUid = userIdToSync || currentUser?.id || undefined;
 if (syncInFlightRef.current) {
  const inFlightUid = syncUserIdRef.current;
  await syncInFlightRef.current;
  // A generic public hydration may have started just before Auth resolved. Run
  // one cached follow-up so user-scoped notes, activities and profiles are not skipped.
  if (requestedUid && requestedUid !== inFlightUid) {
   return syncWithSupabase(requestedUid, silent);
  }
  return;
 }
 syncUserIdRef.current = requestedUid;
 const operation = (async () => {
  try {
  if (!silent) {
  setSupabaseStatus(prev => ({ ...prev, loading: true }));
  }
  const activeUid = requestedUid;
  const load = async <T,>(label: string, request: () => Promise<T>, apply: (data: T) => void) => {
   try {
    const data = await request();
    apply(data);
    return data;
   } catch (error) {
    console.warn(`No se pudo cargar ${label} desde Supabase:`, error);
    throw error;
   }
  };

  // Each table paints as soon as it arrives. A slow optional table no longer holds
  // the entire application behind one Promise.all barrier.
  const dataPromise = Promise.allSettled([
   load('cold calling', () => db.getColdLeads(), setColdLeads),
   load('leads comerciales', () => db.getComercialLeads(), setLeadsList),
   load('cuentas comerciales', () => db.getComercialesAccounts(), fetched => {
    setComercialesList(fetched);
    setCurrentComercial(current => current
     ? fetched.find(account => account.id === current.id) || current
     : current);
   }),
   load('proyectos', () => db.getProjects(), setProjects),
   load('contactos', () => db.getContacts(), setContacts),
   load('eventos', () => db.getEvents(), setEvents),
   ...(activeUid ? [
    load('notas', () => db.getNotes(), setNotes),
    load('actividades', () => db.getActivities(), setActivities),
    load('perfiles', () => db.getProfiles(), fetched => setUsersList(mergeUsers(fetched, currentUser)))
   ] : [])
  ]);
  const statusPromise = (silent && supabaseStatus.connected && supabaseStatus.tablesExist
   ? Promise.resolve({ connected: true, tablesExist: true })
   : checkSupabaseConnection()).then(status => {
    if (!silent) {
     setSupabaseStatus({ ...status, loading: false });
    } else {
     setSupabaseStatus(prev => ({ ...prev, connected: status.connected, tablesExist: status.tablesExist }));
    }
    return status;
   });
  await Promise.all([statusPromise, dataPromise]);
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
  syncUserIdRef.current = undefined;
 }
 };

 // Refresh shared data frequently without blocking the currently rendered cache.
 useEffect(() => {
 if (!currentUser && !currentComercial) return;
 const refreshVisibleData = () => {
  if (document.visibilityState === 'visible') syncWithSupabase(undefined, true);
 };
 const interval = setInterval(() => {
  refreshVisibleData();
 }, 60000);
 window.addEventListener('focus', refreshVisibleData);
 document.addEventListener('visibilitychange', refreshVisibleData);
 return () => {
  clearInterval(interval);
  window.removeEventListener('focus', refreshVisibleData);
  document.removeEventListener('visibilitychange', refreshVisibleData);
 };
 }, [currentUser, currentComercial]);

 useEffect(() => {
  if (!currentUser && !currentComercial) return;
  const refreshSharedPipeline = (table: string) => {
   invalidateSharedPipelineCache([table]);
   void syncWithSupabase(undefined, true);
  };
  const channel = supabase.channel('shared-caller-closer-pipeline')
   .on('postgres_changes', { event: '*', schema: 'public', table: 'cold_calling_leads' }, () => refreshSharedPipeline('cold_calling_leads'))
   .on('postgres_changes', { event: '*', schema: 'public', table: 'comercial_leads' }, () => refreshSharedPipeline('comercial_leads'))
   .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => refreshSharedPipeline('contacts'))
   .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => refreshSharedPipeline('events'))
   .subscribe();
  return () => { void supabase.removeChannel(channel); };
 }, [currentUser?.id, currentComercial?.id]);

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
 let active = true;

 const clearAdminSession = () => {
  setCurrentUser(null);
  sessionStorage.removeItem('agency_user');
 };

 const applyAdminSession = (user: { id: string; email?: string | null; user_metadata?: Record<string, any> }) => {
  if (!isAuthorizedAdminUser(user)) return false;
  const verifiedUser = {
  id: user.id,
  email: user.email || '',
  name: user.user_metadata?.name || user.email?.split('@')[0] || 'Agency Member'
  };
  setCurrentUser(verifiedUser);
  sessionStorage.setItem('agency_user', JSON.stringify(verifiedUser));
  void syncWithSupabase(user.id);
  return true;
 };

 const restoreAdminSession = async () => {
  try {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
   clearAdminSession();
   return;
  }

  // getUser validates the stored access token against Supabase Auth instead of
  // trusting browser storage as authorization.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !applyAdminSession(user)) {
   clearAdminSession();
   await supabase.auth.signOut({ scope: 'local' });
   return;
  }

  const currentPath = window.location.pathname || '';
  if (currentPath === '/acceso' || currentPath === '/login') {
   navigateTo('dashboard', 'none');
  }
  } catch (error) {
  console.warn('No se pudo validar la sesión administrativa guardada.');
  clearAdminSession();
  } finally {
  if (active) setAuthReady(true);
  }
 };

 void restoreAdminSession();

 // Listen to real auth state changes
 const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION') return;
  if (session?.user && isAuthorizedAdminUser(session.user)) {
  applyAdminSession(session.user);
  const currentPath = window.location.pathname || '/';
  if (currentPath === '/acceso' || currentPath === '/login') navigateTo('dashboard', 'none');
  } else if (event === 'SIGNED_OUT' || session?.user) {
  clearAdminSession();
  sessionStorage.removeItem('agency_current_screen');
  if (window.location.pathname.startsWith('/admin')) navigateTo('acceso', 'none');
  }
 });

 // Health and payload hydration begin together. In-flight deduplication ensures
 // auth callbacks and this mount path share one set of requests.
 void checkSupabaseConnection().then(status => {
  setSupabaseStatus({ ...status, loading: false });
 });

 return () => {
  active = false;
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
  
  // Business data is always hydrated from Supabase, including legacy admin sessions.
  syncWithSupabase(sessionUser.id || undefined);
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

 // Business mutations are reflected in React state only after Supabase confirms them.
 const handleAddContact = async (contact: ClientContact) => {
 const existingContact = contacts.find(c =>
  c.id === contact.id ||
  (!!contact.closingSourceLeadId && c.closingSourceLeadId === contact.closingSourceLeadId) ||
  (!!contact.phone && c.phone === contact.phone && c.company?.toLowerCase() === contact.company?.toLowerCase())
 );
 const alreadyExists = !!existingContact;
 const contactToSave = existingContact ? { ...existingContact, ...contact, id: existingContact.id } : contact;
 
 // 2. Add activity locally
 const activity: Activity = {
  id: 'a_' + Date.now(),
  type: 'CRM',
  timestamp: 'Just now',
  title: contactToSave.name,
  subtitle: `added to ${contactToSave.company}`,
  accentColor: 'primary'
 };
 try {
 if (alreadyExists) {
  await db.updateContact(contactToSave, currentUser?.id || undefined);
 } else {
  await db.insertContact(contactToSave, currentUser?.id || undefined);
 }
 setContacts(prev => prev.some(c => c.id === contactToSave.id)
  ? prev.map(c => c.id === contactToSave.id ? contactToSave : c)
  : [contactToSave, ...prev]);
 if (!alreadyExists) {
  void db.insertActivity(activity, currentUser?.id || undefined)
   .then(() => setActivities(prev => [activity, ...prev]))
   .catch(error => console.warn('No se pudo registrar la actividad del cliente:', error));
 }
 } catch (err) {
   console.error('Supabase failed to register contact:', err);
   throw err;
 }
 };

 const handleUpdateContact = async (updated: ClientContact) => {
 const previousContact = contacts.find(contact => contact.id === updated.id);
 const isWebsiteReady = updated.websiteReady === true || updated.devStatus === 'completed';
 const shouldNotifyCarlos = isWebsiteReady && !previousContact?.webReadyNotifiedAt;

 // Completing a website only resolves the "Falta web" marker. The contact remains
 // active and its development status can be changed again at any time.
 if (updated.devStatus === 'completed') {
  updated.needsWebsite = false;
  updated.websiteReady = true;
 }

 try {
   const persistedContact = await db.updateContact(updated, currentUser?.id || undefined);
   updated = persistedContact;
   setContacts(prev => prev.map(c => c.id === persistedContact.id ? persistedContact : c));

  if (shouldNotifyCarlos) {
   const carlosAdmin = usersList.find(user =>
    (user.name || '').toLowerCase().includes('carlos') ||
    (user.email || '').toLowerCase().includes('carlos')
   );
   const targetEmail = carlosAdmin?.email || updated.closerEmail || 'todos-admins';
   const websiteUrl = updated.customWebsiteUrl || updated.website || 'pendiente de revisar';
   const phoneDigits = (updated.phone || '').replace(/\D/g, '');
   const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits.startsWith('34') ? phoneDigits : `34${phoneDigits}`}?text=${encodeURIComponent(`Hola ${updated.name}, tu web ya está lista: ${websiteUrl}.`)}`
    : undefined;
   const notification: CalendarEvent = {
    id: `web_ready_${updated.id}`,
    title: `Web lista: ${updated.company}`,
    date: getLocalDateKey(),
    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    duration: '10m',
    type: 'Review',
    description: `Carlos, el lead ${updated.company} ya tiene una página web asociada. URL: ${websiteUrl}.`,
    linkedContactId: updated.id,
    linkedContactName: updated.name,
    linkedContactIds: [updated.id],
    assignedUserId: carlosAdmin?.id,
    assignedUserEmail: targetEmail,
    assignedUserEmails: [targetEmail],
    status: 'pending',
    color: '#10B981',
    alias: 'Web lista',
    isAdminNotification: targetEmail === 'todos-admins',
    whatsappUrl
   };

   await db.upsertEvent(notification, currentUser?.id || undefined);
   setEvents(previous => previous.some(event => event.id === notification.id)
    ? previous.map(event => event.id === notification.id ? notification : event)
    : [...previous, notification]);

   updated = { ...updated, webReadyNotifiedAt: new Date().toISOString() };
   await db.updateContact(updated, currentUser?.id || undefined);
   setContacts(previous => previous.map(contact => contact.id === updated.id ? updated : contact));
  }
 } catch (err) {
   console.error('Supabase failed to update contact:', err);
   throw err;
 }
 };

 const handleAddProject = async (newProj: any) => {
 try {
  await db.insertProject(newProj, currentUser?.id || undefined);
  setProjects(prev => [newProj, ...prev]);
 } catch (err) {
   console.error('Supabase failed to register project:', err);
  throw err;
 }
 };

 const handleUpdateProject = async (updatedProj: any) => {
 try {
  await db.updateProject(updatedProj, currentUser?.id || undefined);
  setProjects(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));
 } catch (err) {
   console.error('Supabase failed to update project:', err);
  throw err;
 }
 };

 const handleDeleteProject = async (id: string) => {
 try {
  await db.deleteProject(id, currentUser?.id || undefined);
  setProjects(prev => prev.filter(p => p.id !== id));
 } catch (err) {
   console.error('Supabase failed to delete project:', err);
  throw err;
 }
 };

 const handleUpsertPartner = async (partner: PartnerCompany) => {
 await db.upsertPartner(partner);
 setPartners(previous => [...previous.filter(item => item.id !== partner.id), partner]);
 };

 const handleDeletePartner = async (id: string) => {
 await db.deletePartner(id);
 setPartners(previous => previous.filter(item => item.id !== id));
 };

 const handleAddColdLead = async (newLead: ColdCallingLead) => {
 const activity: Activity = {
  id: 'a_cold_' + Date.now(),
  type: 'Lead',
  timestamp: 'Just now',
  title: newLead.businessName,
  subtitle: `pre-cargado en Call Calling para ${newLead.assignedToName || 'cola sin asignar'}`,
  detail: newLead.notes,
  accentColor: 'primary'
 };
 try {
   await db.insertColdLead(newLead, currentUser?.id || undefined);
   setColdLeads(prev => [newLead, ...prev]);
   void db.insertActivity(activity, currentUser?.id || undefined)
    .then(() => setActivities(prev => [activity, ...prev]))
    .catch(error => console.warn('No se pudo registrar la actividad del lead:', error));
   if (currentComercial) void db.addCommercialActivityLog({
    commercial: currentComercial,
   action: 'cold_lead_created',
   entityType: 'cold_calling_lead',
   entityId: newLead.id,
   description: `Creó el negocio ${newLead.businessName} en Call Calling.`,
   metadata: { businessName: newLead.businessName, assignedToEmail: newLead.assignedToEmail }
   }).catch(error => console.warn('No se pudo registrar el historial comercial del lead:', error));
 } catch (err) {
   console.error('Supabase failed to register cold lead:', err);
  throw err;
 }
 };

 const handleUpdateColdLead = async (updated: ColdCallingLead) => {
 const previous = coldLeads.find(l => l.id === updated.id);
 const assignmentActivity: Activity | null = previous && previous.assignedToEmail !== updated.assignedToEmail ? {
   id: 'a_cold_assign_' + Date.now(),
  type: 'Lead',
  timestamp: 'Just now',
  title: updated.businessName,
  subtitle: `asignado a ${updated.assignedToName || 'Sin asignar'}`,
  detail: updated.notes,
  accentColor: 'secondary'
  } : null;
 try {
   await db.updateColdLead(updated, currentUser?.id || undefined);
   setColdLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
   if (assignmentActivity) void db.insertActivity(assignmentActivity, currentUser?.id || undefined)
    .then(() => setActivities(prev => [assignmentActivity, ...prev]))
    .catch(error => console.warn('No se pudo registrar la actividad de asignación:', error));
  if (currentComercial) {
   const changes: string[] = [];
   if (previous?.callsCount !== updated.callsCount) changes.push(`registró llamada #${updated.callsCount || 0}`);
   if (previous?.callbackScheduled !== updated.callbackScheduled || previous?.callbackDate !== updated.callbackDate || previous?.callbackTime !== updated.callbackTime) changes.push(`actualizó seguimiento a ${updated.callbackScheduled}${updated.callbackDate ? ` (${updated.callbackDate} ${updated.callbackTime || ''})` : ''}`);
   if (previous?.temperature !== updated.temperature) changes.push(`cambió temperatura a ${updated.temperature}`);
   if (previous?.answered !== updated.answered) changes.push(`marcó responde: ${updated.answered}`);
   if (previous?.isDone !== updated.isDone) changes.push(updated.isDone ? 'marcó como hecho' : 'reabrió el negocio');
   if (previous?.archived !== updated.archived) changes.push(updated.archived ? 'archivó el negocio' : 'restauró el negocio');
   void db.addCommercialActivityLog({
    commercial: currentComercial,
    action: 'cold_lead_updated',
    entityType: 'cold_calling_lead',
    entityId: updated.id,
    description: `${updated.businessName}: ${changes.join(', ') || 'actualizó la ficha'}.`,
    metadata: { businessName: updated.businessName, changes, callsCount: updated.callsCount || 0 }
   }).catch(error => console.warn('No se pudo registrar el historial de actualización del lead:', error));
  }
 } catch (err) {
   console.error('Supabase failed to update cold lead:', err);
  throw err;
 }
 };

 const handleBulkAssignColdLeads = async (
  leadIds: string[],
  assignee: { email: string; name: string }
 ): Promise<number> => {
  const assignedIds = await db.bulkAssignColdLeads(leadIds, assignee.email, assignee.name);

  const assignedIdSet = new Set(assignedIds);
  const assignmentTimestamp = new Date().toISOString();
  const historicallyAssignedLeads = coldLeads
   .filter(lead => assignedIdSet.has(lead.id) && (!lead.assignedToEmail || lead.assignedToEmail === 'unassigned'))
   .map(lead => ({
    ...lead,
    assignedToEmail: assignee.email,
    assignedToName: assignee.name,
    assignmentHistory: [
     ...(lead.assignmentHistory || []),
     ...((lead.assignmentHistory || []).some(item => item.commercialEmail.toLowerCase() === assignee.email.toLowerCase())
      ? []
      : [{ commercialEmail: assignee.email, commercialName: assignee.name, assignedAt: assignmentTimestamp }])
    ]
   }));
  const assignedLeadById = new Map(historicallyAssignedLeads.map(lead => [lead.id, lead]));
  setColdLeads(previous => previous.map(lead => assignedLeadById.get(lead.id) || lead));
  for (let index = 0; index < historicallyAssignedLeads.length; index += 25) {
   const results = await Promise.allSettled(historicallyAssignedLeads.slice(index, index + 25).map(lead => db.updateColdLead(lead)));
   if (results.some(result => result.status === 'rejected')) console.warn('Algunos historiales de asignación no se pudieron ampliar, aunque la asignación principal sí quedó guardada.');
  }

  if (assignedIds.length > 0) {
   const activity: Activity = {
    id: 'a_cold_bulk_assign_' + Date.now(),
    type: 'Lead',
    timestamp: 'Just now',
    title: `${assignedIds.length} leads asignados`,
    subtitle: `asignación masiva a ${assignee.name}`,
    detail: `Se asignaron ${assignedIds.length} leads sin comercial a ${assignee.email}.`,
    accentColor: 'secondary'
   };
   void db.insertActivity(activity, currentUser?.id || undefined)
    .then(() => setActivities(previous => [activity, ...previous]))
    .catch(error => console.warn('No se pudo registrar la actividad de asignación:', error));
  }

  return assignedIds.length;
 };

 const handleDeleteColdLead = async (id: string) => {
  const deletedLead = coldLeads.find(lead => lead.id === id);
  const linkedContact = contacts.find(contact => contact.closingSourceLeadId === id || contact.id === `crm_from_${id}`);
  const relatedEvents = events.filter(event =>
   event.id === `cc_appointment_${id}` ||
   event.id.startsWith(`cc_reschedule_${id}_`) ||
   event.linkedContactId === `crm_from_${id}` ||
   (!!linkedContact && (event.linkedContactId === linkedContact.id || (event.linkedContactIds || []).includes(linkedContact.id)))
  );
  try {
   if (linkedContact) {
    await db.deleteClientData(linkedContact, currentUser?.id || undefined);
    await handleRefreshFinance();
   } else {
    const results = await Promise.allSettled([
     ...relatedEvents.map(event => db.deleteEvent(event.id, currentUser?.id || undefined)),
     db.deleteColdLead(id, currentUser?.id || undefined),
    ]);
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failure) throw failure.reason;
   }
   setColdLeads(prev => prev.filter(l => l.id !== id));
   setEvents(previous => previous.filter(event => !relatedEvents.some(related => related.id === event.id)));
   if (currentComercial && deletedLead) void db.addCommercialActivityLog({
   commercial: currentComercial,
   action: 'cold_lead_deleted',
   entityType: 'cold_calling_lead',
   entityId: id,
   description: `Eliminó ${deletedLead.businessName} de Call Calling.`,
    metadata: { businessName: deletedLead.businessName }
   }).catch(error => console.warn('No se pudo registrar el historial de eliminación del lead:', error));
   if (linkedContact) {
    setContacts(previous => previous.filter(contact => contact.id !== linkedContact.id));
    setLeadsList(previous => previous.filter(lead => !isCommercialLeadLinkedToContact(lead, linkedContact)));
    setProjects(previous => previous.filter(project => project.clientContactId !== linkedContact.id));
    setFinTransactions(previous => previous.filter(transaction => transaction.clientId !== linkedContact.id));
   }
  } catch (err) {
   console.error('Supabase failed to delete the shared caller/closer lead:', err);
   throw err;
  }
 };

 const handleAddComercialLead = async (newLead: ComercialLead) => {
 try {
   await db.insertComercialLead(newLead, currentUser?.id || undefined);
  setLeadsList(prev => [newLead, ...prev]);
 } catch (err) {
   console.error('Supabase failed to register comercial lead:', err);
  throw err;
 }
 };

 const handleUpdateComercialLead = async (updated: ComercialLead) => {
 try {
   await db.updateComercialLead(updated, currentUser?.id || undefined);
  setLeadsList(prev => prev.map(l => l.id === updated.id ? updated : l));
 } catch (err) {
   console.error('Supabase failed to update comercial lead:', err);
  throw err;
 }
 };

 const handleDeleteComercialLead = async (id: string) => {
 try {
   await db.deleteComercialLead(id, currentUser?.id || undefined);
  setLeadsList(prev => prev.filter(l => l.id !== id));
 } catch (err) {
   console.error('Supabase failed to delete comercial lead:', err);
  throw err;
 }
 };

 const handleAddComercialAccount = async (newC: ComercialAccount) => {
 try {
   await db.insertComercialAccount(newC, currentUser?.id || undefined);
  setComercialesList(prev => [...prev, newC]);
 } catch (err) {
   console.error('Supabase failed to register comercial account:', err);
  throw err;
 }
 };

 const handleUpdateComercialAccount = async (updated: ComercialAccount) => {
 try {
  await db.updateComercialAccount(updated, currentUser?.id || undefined);
  setComercialesList(prev => prev.map(c => c.id === updated.id ? updated : c));
  if (currentComercial && currentComercial.id === updated.id) setCurrentComercial(updated);
 } catch (err) {
  console.error('Supabase failed to update comercial account:', err);
  throw err;
 }
 };

 const handleDeleteComercialAccount = async (id: string) => {
 try {
   await db.deleteComercialAccount(id, currentUser?.id || undefined);
  setComercialesList(prev => prev.filter(c => c.id !== id));
  setLeadsList(prev => prev.filter(l => l.comercialId !== id));
 } catch (err) {
   console.error('Supabase failed to delete comercial account:', err);
  throw err;
 }
 };

 const handleAddEvent = async (event: CalendarEvent) => {
 const activity: Activity = {
  id: 'a_' + Date.now(),
  type: 'Task',
  timestamp: 'Just now',
  title: 'Calendar Created',
  subtitle: `for event: ${event.title}`,
  accentColor: 'secondary'
 };

 try {
  const isAutomatedFlowEvent = event.id.startsWith('cc_appointment_') ||
   event.id.startsWith('dev_intake_') || event.id.startsWith('web_ready_');
  if (isAutomatedFlowEvent) await db.upsertEvent(event, currentUser?.id || undefined);
  else await db.insertEvent(event, currentUser?.id || undefined);
  setEvents(prev => prev.some(item => item.id === event.id) ? prev : [...prev, event]);
  void db.insertActivity(activity, currentUser?.id || undefined)
   .then(() => setActivities(prev => [activity, ...prev]))
   .catch(error => console.warn('No se pudo registrar la actividad del evento:', error));
 } catch (err) {
  console.error('Supabase failed to register event:', err);
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
 try {
   await db.deleteEvent(id, currentUser?.id || undefined);
  setEvents(prev => prev.filter(ev => ev.id !== id));
 } catch (err) {
   console.error('Supabase failed to delete event:', err);
  throw err;
 }
 };

 const handleUpdateEvent = async (updated: CalendarEvent) => {
 try {
   await db.updateEvent(updated, currentUser?.id || undefined);
  setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev));
 } catch (err) {
   console.error('Supabase failed to update event:', err);
  throw err;
 }
 };

 const handleAddNote = async (note: Note) => {
 const activity: Activity = {
  id: 'a_' + Date.now(),
  type: 'Lead',
  timestamp: 'Just now',
  title: 'New Internal Note',
  subtitle: `published: ${note.title}`,
  accentColor: 'tertiary'
 };
 try {
  await db.insertNote(note, currentUser?.id || undefined);
  setNotes(prev => [note, ...prev]);
  void db.insertActivity(activity, currentUser?.id || undefined)
   .then(() => setActivities(prev => [activity, ...prev]))
   .catch(error => console.warn('No se pudo registrar la actividad de la nota:', error));
 } catch (err) {
   console.error('Supabase failed to publish note:', err);
  throw err;
 }
 };

 const handleUpdateNote = async (updated: Note) => {
 try {
  await db.updateNote(updated, currentUser?.id || undefined);
  setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
 } catch (err) {
   console.error('Supabase failed to update note:', err);
  throw err;
 }
 };

 const handleDeleteNote = async (id: string) => {
 try {
  await db.deleteNote(id, currentUser?.id || undefined);
  setNotes(prev => prev.filter(n => n.id !== id));
 } catch (err) {
   console.error('Supabase failed to delete note:', err);
  throw err;
 }
 };

 const handleDeleteContact = async (id: string) => {
 const contactToDelete = contacts.find(contact => contact.id === id);
 try {
   if (contactToDelete) await db.deleteClientData(contactToDelete, currentUser?.id || undefined);
   else await db.deleteContact(id, currentUser?.id || undefined);
   await handleRefreshFinance();
   setContacts(prev => prev.filter(c => c.id !== id));
   if (contactToDelete) {
    setLeadsList(previous => previous.filter(lead => !isCommercialLeadLinkedToContact(lead, contactToDelete)));
    setColdLeads(previous => previous.filter(lead => lead.id !== contactToDelete.closingSourceLeadId));
    setEvents(previous => previous.filter(event => event.linkedContactId !== id && !(event.linkedContactIds || []).includes(id)));
    setProjects(previous => previous.filter(project => project.clientContactId !== id));
    setFinTransactions(previous => previous.filter(transaction => transaction.clientId !== id));
   }
  } catch (err) {
   console.error('Supabase failed to delete the client cascade:', err);
   throw err;
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
 activity_log: { title: 'Registro de actividad', eyebrow: 'Producto y tecnologia' },
 marketing: { title: 'Marketing', eyebrow: 'Contenido' },
 departamentos: { title: 'Departamentos', eyebrow: 'Equipo y operaciones' },
 bites: { title: 'Bites', eyebrow: 'SaaS · suscripciones y clientes' }
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
  case 'bites':
  return <BitesScreen />;
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
   onUpdateComercial={handleUpdateComercialAccount}
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
   partners={partners}
   onUpsertPartner={handleUpsertPartner}
   onDeletePartner={handleDeletePartner}
   />
  );
  case 'finanzas':
  return (
   <FinanceScreen 
   contacts={contacts}
   onNavigate={navigateTo}
   comercialesList={comercialesList}
   onRefreshFinance={handleRefreshFinance}
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
   events={events}
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
   onBulkAssignColdLeads={handleBulkAssignColdLeads}
   onDeleteColdLead={handleDeleteColdLead}
   currentUser={currentUser}
   currentComercial={null}
   onNavigate={navigateTo}
   onAddEvent={handleAddEvent}
   onUpdateEvent={handleUpdateEvent}
    onDeleteEvent={handleDeleteEvent}
    events={adminVisibleEvents}
    allEvents={events}
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
  case 'activity_log':
  return <ActivityLogScreen />;
  case 'marketing':
  return <MarketingScreen />;
  default:
  return null;
 }
 };

 // Render Landing and Login screens separately to exclude sidebar and header layout boundaries
 if (!authReady && window.location.pathname.startsWith('/admin')) {
 return (
  <div className="min-h-screen w-full bg-[#020204] flex items-center justify-center text-slate-300">
  <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
   <div className="w-7 h-7 rounded-full border-2 border-amber-400/25 border-t-amber-400 animate-spin" />
   <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Validando sesión segura</span>
  </div>
  </div>
 );
 }

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
   <LandingScreen onNavigate={navigateTo} projects={projects} partners={partners} />
  </motion.div>
  </AnimatePresence>
 );
 }

 if (currentScreen === 'portal') {
 return (
  <AnimatePresence mode="wait">
   <motion.div key="portal-access-view" custom={transitionType} variants={screenVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen w-full">
    <PortalAccessScreen onAdmin={() => navigateTo('acceso','push')} onCommercial={() => navigateTo('comerciales_acceso','push')} onBack={() => navigateTo('landing','push_back')} />
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
 <div className="admin-shell relative min-h-screen bg-[#050608] text-slate-100 flex font-sans overflow-hidden">
  
  {/* Professional app shell background */}
  <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(214,185,111,.09),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(99,213,242,.065),transparent_30%),linear-gradient(135deg,#050608_0%,#08090d_48%,#06080b_100%)]" />
  <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:38px_38px]" />
  <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-[#d6b96f]/[0.035] to-transparent" />
  </div>

  {/* Sidebar Navigation */}
  <Sidebar 
  currentScreen={currentScreen} 
  onNavigate={navigateTo} 
  currentUser={currentUser}
  onLogout={handleSignOutUser}
  onOpenNotifications={() => setIsNotificationsOpen(true)}
  unreadCount={unreadCount}
  mobileOpen={mobileSidebarOpen}
  onMobileClose={() => setMobileSidebarOpen(false)}
  />
  {mobileSidebarOpen && <button aria-label="Cerrar menú" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden" />}

  {/* Main Content Pane wrapper */}
  <div className="flex-1 ml-0 lg:ml-[288px] flex flex-col h-screen min-w-0 overflow-hidden">
  <div className="lg:hidden h-16 shrink-0 px-4 flex items-center justify-between border-b border-white/[0.07] bg-[#07080b]/95 backdrop-blur-xl z-30">
   <button onClick={() => setMobileSidebarOpen(true)} className="w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center" aria-label="Abrir menú">
   <Menu className="w-5 h-5" />
   </button>
   <span className="text-xs font-black uppercase tracking-[.2em]">Althera</span>
   <button onClick={() => setIsNotificationsOpen(true)} className="relative w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center" aria-label="Notificaciones">
   <Bell className="w-5 h-5" />
   {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400" />}
   </button>
  </div>

  <header className="hidden lg:flex h-[78px] shrink-0 items-center justify-between gap-6 border-b border-white/[0.07] bg-[#07080b]/75 px-7 backdrop-blur-xl">
   <div className="min-w-0">
    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#d6b96f]">{activeMeta.eyebrow}</p>
    <h1 className="mt-1 truncate text-xl font-semibold tracking-[-.02em] text-white">{activeMeta.title}</h1>
   </div>
   <div className="flex flex-1 items-center justify-end gap-3">
    <div className="relative w-full max-w-md">
     <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
     <input
      value={globalSearch}
      onChange={(event) => setGlobalSearch(event.target.value)}
      placeholder="Buscar clientes, citas, notas..."
      className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.028] pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-[#d6b96f]/35 focus:bg-white/[0.045]"
     />
    </div>
    <div className="hidden items-center gap-2 rounded-2xl border border-white/[0.065] bg-white/[0.018] p-1.5 xl:flex">
     <button onClick={() => navigateTo('comerciales_admin','none')} className="inline-flex h-8 items-center gap-2 rounded-xl px-2.5 text-[10px] font-semibold text-white/55 transition hover:bg-[#d6b96f]/10 hover:text-[#e5cb8b]"><BriefcaseBusiness className="h-3.5 w-3.5" />Comerciales</button>
     <button onClick={() => navigateTo('cold_calling','none')} className="inline-flex h-8 items-center gap-2 rounded-xl px-2.5 text-[10px] font-semibold text-white/55 transition hover:bg-[#d6b96f]/10 hover:text-[#e5cb8b]"><PhoneCall className="h-3.5 w-3.5" />Calling</button>
     <button onClick={() => navigateTo('developer_hub','none')} className="inline-flex h-8 items-center gap-2 rounded-xl px-2.5 text-[10px] font-semibold text-white/55 transition hover:bg-cyan-300/[0.08] hover:text-cyan-200"><Code2 className="h-3.5 w-3.5" />Dev</button>
    </div>
    <button onClick={() => navigateTo('citas', 'none')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d6b96f]/20 bg-[#d6b96f]/[0.08] px-3 text-xs font-bold text-[#ead49c] transition hover:bg-[#d6b96f]/[0.13]"><Plus className="h-4 w-4" />Cita</button>
    <button onClick={() => setIsNotificationsOpen(true)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.028] text-slate-400 transition hover:border-white/15 hover:text-white" aria-label="Notificaciones">
     <Bell className="h-4 w-4" />
     {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-300" />}
    </button>
   </div>
  </header>

  {!septemberGoalDismissed && (
   <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-gradient-to-r from-amber-300/[0.13] to-violet-300/[0.07] px-4 py-2.5 text-xs shadow-lg shadow-amber-950/20 lg:mx-7">
    <div><span className="font-black text-amber-200">Objetivo septiembre · Carlos y Nacho</span><span className="ml-2 text-slate-300">3 Bites Menus + 5 webs = sueldo de 1.300 € cada uno.</span></div>
    <button type="button" onClick={() => { localStorage.setItem('althera-september-goal-dismissed', 'true'); setSeptemberGoalDismissed(true); }} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Cerrar objetivo"><X className="h-4 w-4" /></button>
   </div>
  )}

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
    {unreadNotifications.length > 0 && (
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
     {unreadNotifications.length === 0 ? (
     <div className="text-center py-16">
      <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
      <Bell className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-slate-400 text-xs font-semibold">Todo revisado.</p>
      <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto mt-1 leading-relaxed">
      Las nuevas notificaciones asignadas a ti aparecerán aquí.
      </p>
     </div>
     ) : (
     unreadNotifications.map(ev => {
      const isUnread = true;
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
      {stripeSuccessData.firstPaymentDate ? '¡Cobro programado!' : stripeSuccessData.interval === 'once' ? '¡Pago recibido con éxito!' : '¡Mensualidad configurada!'}
    </h3>
    <p className="text-xs text-slate-400 font-sans leading-relaxed">
      {stripeSuccessData.firstPaymentDate ? (
      <>La tarjeta de <strong className="text-slate-200">{stripeSuccessData.clientName}</strong> ha quedado registrada. No se ha realizado ningún cargo hoy.</>
      ) : stripeSuccessData.interval === 'once' ? (
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
      {stripeSuccessData.firstPaymentDate && (
       <div className="flex justify-between text-xs">
        <span className="text-slate-500 font-mono uppercase text-[9px] tracking-wider">Primer cobro:</span>
        <span className="font-bold text-violet-300">{new Date(`${stripeSuccessData.firstPaymentDate}T12:00:00`).toLocaleDateString('es-ES')}</span>
       </div>
      )}
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
      {stripeSuccessData.firstPaymentDate ? 'La transacción se marcará como pagada únicamente cuando Stripe confirme el cargo en la fecha programada.' : 'Las transacciones correspondientes se registrarán automáticamente en el historial de finanzas.'}
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
