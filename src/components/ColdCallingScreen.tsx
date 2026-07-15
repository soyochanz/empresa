import React, { useEffect, useState } from 'react';
import { 
 Users, 
 Phone, 
 Calendar, 
 Clock, 
 PlusCircle, 
 Trash2, 
 Edit3, 
 CheckCircle2, 
 XCircle, 
 Archive, 
 Check, 
 Search, 
 Filter, 
 Flame, 
 Zap, 
 Snowflake,
 ClipboardList,
 AlertCircle,
 HelpCircle,
 TrendingUp,
 UserPlus,
 RefreshCw,
 FolderMinus,
 Briefcase,
 List,
 Grid,
 X,
 ChevronLeft,
 ChevronRight,
 Video,
 Upload,
 MapPin,
 MessageCircle,
 Save
 ,Folder
 ,FolderPlus
 ,History
} from 'lucide-react';
import { ColdCallingLead, ColdCallingProspectGroup, ComercialAccount, ClientContact, CalendarEvent, Invoice, InvoiceItem, FinanceTransaction, ComercialLead } from '../types';
import { db } from '../supabaseClient';

const HOURLY_SLOTS = [
 '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const formatCallbackDate = (date?: string) => {
 if (!date) return 'SIN FECHA';
 const [year, month, day] = date.split('-').map(Number);
 if (!year || !month || !day) return date;
 const monthName = new Intl.DateTimeFormat('es-ES', { month: 'short' })
  .format(new Date(year, month - 1, day))
  .replace('.', '')
  .toUpperCase();
 return `${String(day).padStart(2, '0')} ${monthName} ${year}`;
};

const getCallbackTimestamp = (lead: ColdCallingLead) => {
 if (!lead.callbackDate) return Number.POSITIVE_INFINITY;
 const time = /^\d{2}:\d{2}/.test(lead.callbackTime || '') ? lead.callbackTime : '00:00';
 const timestamp = new Date(`${lead.callbackDate}T${time}`).getTime();
 return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

const isOwnWebsite = (website?: string) => {
 if (!website?.trim()) return false;
 try {
 const hostname = new URL(website.startsWith('http') ? website : `https://${website}`).hostname
  .toLowerCase()
  .replace(/^www\./, '');
 return ![
  'facebook.com',
  'fb.com',
  'instagram.com'
 ].some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
 } catch {
 return false;
 }
};

interface ColdCallingScreenProps {
 coldLeads: ColdCallingLead[];
 comercialesList: ComercialAccount[];
 usersList?: { id: string; name: string; email: string }[];
 onAddColdLead: (lead: ColdCallingLead) => void | Promise<void>;
 onUpdateColdLead: (lead: ColdCallingLead) => void | Promise<void>;
 onDeleteColdLead: (id: string) => void | Promise<void>;
 currentUser?: { name: string; email: string; id: string | null } | null; // present if Admin
 currentComercial?: ComercialAccount | null; // present if Comercial
 onNavigate?: (target: any, transition: any) => void;
 contacts?: ClientContact[];
 onAddContact?: (contact: ClientContact) => void;
 onUpdateContact?: (contact: ClientContact) => void;
 onAddEvent?: (event: CalendarEvent) => void;
 events?: CalendarEvent[];
 onUpdateEvent?: (event: CalendarEvent) => void;
 onDeleteEvent?: (id: string) => void;
 onRefreshFinance?: () => void;
 focusLeadId?: string;
 focusClosingLeadId?: string;
}

export default function ColdCallingScreen({
 coldLeads,
 comercialesList,
 usersList,
 onAddColdLead,
 onUpdateColdLead,
 onDeleteColdLead,
 currentUser,
 currentComercial,
 onNavigate,
 contacts = [],
 onAddContact,
 onUpdateContact,
 onAddEvent,
 events = [],
 onUpdateEvent,
 onDeleteEvent,
 onRefreshFinance,
 focusLeadId,
 focusClosingLeadId
}: ColdCallingScreenProps) {
 
 // Combine comerciales and admins (usersList) for assignment
 const allAssignees = [
 ...comercialesList.map(c => ({ id: c.id, name: c.name, email: c.email, role: 'Comercial' })),
 ...(usersList || []).map(u => ({ id: u.id, name: u.name, email: u.email, role: 'Admin' }))
 ];
 const findAdminByName = (name: string) => (usersList || []).find(user =>
 (user.name || '').toLowerCase().includes(name.toLowerCase()) ||
 (user.email || '').toLowerCase().includes(name.toLowerCase())
 );
const carlosAdmin = findAdminByName('carlos');
const nachoAdmin = findAdminByName('nacho');
 const activeCloser = currentUser || carlosAdmin;
 const buildWhatsAppUrl = (phone?: string, message?: string) => {
 const digits = (phone || '').replace(/\D/g, '');
 if (!digits) return undefined;
 const normalized = digits.startsWith('34') ? digits : `34${digits}`;
 return `https://wa.me/${normalized}?text=${encodeURIComponent(message || '')}`;
 };

 // Determine role
 const isAdmin = !!currentUser;
 const comercialEmail = currentComercial?.email || '';

 // Active view tab inside Cold Calling Screen
 const [activeTab, setActiveTab] = useState<'leads' | 'tasks' | 'closing' | 'metrics'>('leads');
 const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
 const [searchQuery, setSearchQuery] = useState('');
 const [tempFilter, setTempFilter] = useState<'Todos' | 'Frío' | 'Templado' | 'Caliente'>('Todos');
 const [assignedFilter, setAssignedFilter] = useState<string>('todos');
 const [showArchived, setShowArchived] = useState(false);
 const [showPostponed, setShowPostponed] = useState(false);
 const [showOnlySelf, setShowOnlySelf] = useState(false);
 const [filterNow, setFilterNow] = useState(() => Date.now());
 const [prospectGroups, setProspectGroups] = useState<ColdCallingProspectGroup[]>([]);
 const [groupFilter, setGroupFilter] = useState('all');
 const [showGroupsModal, setShowGroupsModal] = useState(false);
 const [newGroupName, setNewGroupName] = useState('');
 const [newGroupColor, setNewGroupColor] = useState('#8B5CF6');
 const [groupBusy, setGroupBusy] = useState(false);
 const [groupError, setGroupError] = useState('');

 useEffect(() => {
  const refreshTime = () => setFilterNow(Date.now());
  const timer = window.setInterval(refreshTime, 30_000);
  document.addEventListener('visibilitychange', refreshTime);
  return () => {
   window.clearInterval(timer);
   document.removeEventListener('visibilitychange', refreshTime);
  };
 }, []);

 useEffect(() => {
  if (!currentComercial) {
   setProspectGroups([]);
   return;
  }
  let cancelled = false;
  db.getColdCallingGroups(currentComercial.email)
   .then(groups => { if (!cancelled) setProspectGroups(groups); })
   .catch(error => { if (!cancelled) setGroupError(error?.message || 'No se pudieron cargar los grupos.'); });
  return () => { cancelled = true; };
 }, [currentComercial?.id, currentComercial?.email]);

 // Task calendar date state
 const [selectedTaskDate, setSelectedTaskDate] = useState<string>(() => {
 return new Date().toISOString().split('T')[0];
 });

 // Mini-calendar month and year view state
 const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());

 // Task creation state (only for current comercial, as private tasks)
 const [showAddTaskModal, setShowAddTaskModal] = useState(false);
 const [taskTitle, setTaskTitle] = useState('');
 const [taskTime, setTaskTime] = useState('10:00');
 const [taskDate, setTaskDate] = useState(() => new Date().toISOString().split('T')[0]);
 const [taskNotes, setTaskNotes] = useState('');
 const [taskColor, setTaskColor] = useState('#8B5CF6'); // Violeta por defecto
 const [taskMeetingUrl, setTaskMeetingUrl] = useState('');

 // Editing state for private tasks
 const [editingPrivateTaskId, setEditingPrivateTaskId] = useState<string | null>(null);
 const [editTaskTitle, setEditTaskTitle] = useState('');
 const [editTaskTime, setEditTaskTime] = useState('');
 const [editTaskNotes, setEditTaskNotes] = useState('');
 const [editTaskMeetingUrl, setEditTaskMeetingUrl] = useState('');

 // Timeline Hour/List view switcher state
 const [hourViewMode, setHourViewMode] = useState<'list' | 'hours'>('hours');
 const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'day'>('month');

 // Modals state
 const [showAddModal, setShowAddModal] = useState(false);
 const [showImportModal, setShowImportModal] = useState(false);
 const [importingCsv, setImportingCsv] = useState(false);
 const [csvFileName, setCsvFileName] = useState('');
 const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
 const [csvSkippedNoPhone, setCsvSkippedNoPhone] = useState(0);
 const [csvError, setCsvError] = useState('');
 const [selectedLeadForCall, setSelectedLeadForCall] = useState<ColdCallingLead | null>(null);
 const [appointmentAccessConfirmed, setAppointmentAccessConfirmed] = useState(false);
 const [showAppointmentConfirm, setShowAppointmentConfirm] = useState(false);
 const [pendingAppointmentSubmit, setPendingAppointmentSubmit] = useState(false);
 const [closingDrafts, setClosingDrafts] = useState<Record<string, {
 name?: string;
 company?: string;
 phone?: string;
 email?: string;
 status?: ClientContact['closingStatus'];
 answered?: boolean;
 date?: string;
 time?: string;
 notes?: string;
 socials?: string;
 mapsUrl?: string;
 website?: string;
 }>>({});
 const [showClosedClosingLeads, setShowClosedClosingLeads] = useState(false);
 const [closingScope, setClosingScope] = useState<'today' | 'all'>('today');
 const [expandedClosingLeadId, setExpandedClosingLeadId] = useState<string | null>(null);
 const [postponingClosingLead, setPostponingClosingLead] = useState<ColdCallingLead | null>(null);
 const [postponeClosingDate, setPostponeClosingDate] = useState(() => new Date().toISOString().split('T')[0]);
 const [postponeClosingTime, setPostponeClosingTime] = useState('');
 const [deleteConfirmLeadId, setDeleteConfirmLeadId] = useState<string | null>(null);
 const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
 const [bulkAssigneeEmail, setBulkAssigneeEmail] = useState('unassigned');
 const [bulkActionRunning, setBulkActionRunning] = useState(false);

 // Dedicated modal state for scheduling in-person meetings (Cita Presencial)
 const [showScheduleModal, setShowScheduleModal] = useState(false);
 const [schedulingLead, setSchedulingLead] = useState<ColdCallingLead | null>(null);
 const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
 const [scheduleTime, setScheduleTime] = useState('11:00');
 const [scheduleTitle, setScheduleTitle] = useState('');
 const [scheduleDesc, setScheduleDesc] = useState('');
 const [scheduleAssignee, setScheduleAssignee] = useState('unassigned');

 // Conversion state and form fields
 const [convertingLead, setConvertingLead] = useState<ColdCallingLead | null>(null);
 const [convType, setConvType] = useState<'Client' | 'Lead'>('Client');
 const [convName, setConvName] = useState('');
 const [convCompany, setConvCompany] = useState('');
 const [convEmail, setConvEmail] = useState('');
 const [convPhone, setConvPhone] = useState('');
 const [convSalePrice, setConvSalePrice] = useState(1500);
 const [convInstallments, setConvInstallments] = useState(1);
 const [convPaymentMethod, setConvPaymentMethod] = useState<'cash' | 'transfer' | 'stripe'>('transfer');
 const [convConcept, setConvConcept] = useState('Servicio de Consultoría Althera');

 const normalizeTime = (time?: string) => {
 const [hours = '00', minutes = '00'] = (time || '').split(':');
 return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
 };

 const closerCalendarEvents = React.useMemo(() => {
  if (!carlosAdmin) return events;
  const closerEmail = carlosAdmin.email.toLowerCase();
  return events.filter(event => {
   const assignedEmails = (event.assignedUserEmails || []).map(email => email.toLowerCase());
   return event.assignedUserEmail?.toLowerCase() === closerEmail ||
    assignedEmails.includes(closerEmail) ||
    (!!event.assignedUserId && event.assignedUserId === carlosAdmin.id);
  });
 }, [events, carlosAdmin?.id, carlosAdmin?.email]);

 const getSlotConflict = (date: string, time: string) => {
 const targetStart = new Date(`${date}T${normalizeTime(time)}`).getTime();
 const targetEnd = targetStart + 60 * 60 * 1000;
 return closerCalendarEvents.find(event => {
  if (event.date !== date || event.status === 'done') return false;
  const eventStart = new Date(`${event.date}T${normalizeTime(event.time)}`).getTime();
  const rawDuration = event.duration || '60m';
  const durationMinutes = rawDuration.endsWith('h')
   ? Math.max(1, Number.parseFloat(rawDuration) * 60)
   : Math.max(1, Number.parseInt(rawDuration, 10) || 60);
  const eventEnd = eventStart + durationMinutes * 60 * 1000;
  return Number.isFinite(eventStart) && targetStart < eventEnd && targetEnd > eventStart;
 });
 };

 const isSlotBusy = (date: string, time: string) => !!getSlotConflict(date, time);


 const buildLeadContactFromColdLead = (lead: ColdCallingLead, notes: string): ClientContact => {
 const cleanName = callContactPerson.trim() || (lead.contactPerson && lead.contactPerson !== 'Sin especificar' ? lead.contactPerson : lead.businessName);
 const initials = cleanName
  .split(' ')
  .map(n => n[0])
  .join('')
  .slice(0, 2)
  .toUpperCase() || 'LD';

 return {
  id: `crm_from_${lead.id}`,
  name: cleanName,
  company: lead.businessName,
  status: 'Lead',
  lastContacted: 'Justo ahora (Cita agendada desde Cold Calling)',
  email: '',
  phone: lead.phone,
  addedDate: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
  initials,
  color: lead.temperature === 'Caliente' ? 'rose' : lead.temperature === 'Templado' ? 'amber' : 'indigo',
  temperature: callTemperature as any,
  assignedUserId: carlosAdmin?.id,
  assignedUserEmail: carlosAdmin?.email || (lead.assignedToEmail !== 'unassigned' ? lead.assignedToEmail : undefined),
  contactedByComercialEmail: lead.assignedToEmail !== 'unassigned' ? lead.assignedToEmail : undefined,
  contactedByComercialName: lead.assignedToName && lead.assignedToName !== 'Sin asignar' ? lead.assignedToName : undefined,
  originalLeadNotes: lead.notes || undefined,
  closingSourceLeadId: lead.id,
  closerName: carlosAdmin?.name || 'Carlos',
  closerEmail: carlosAdmin?.email,
  closingStatus: 'Pendiente',
  needsWebsite: false,
  websiteReady: false,
  googleMapsUrl: lead.mapsUrl,
  website: lead.website,
  notes: [
  `[Cita agendada] ${callCallbackDate} ${callCallbackTime || ''}`.trim(),
  notes,
  lead.notes ? `[Nota previa] ${lead.notes}` : ''
  ].filter(Boolean).join('\n'),
  callsLog: lead.callsLog || []
 };
 };

 // Trigger conversion settings modal
 const handleConvertToClient = (lead: ColdCallingLead) => {
 const cleanName = lead.contactPerson && lead.contactPerson !== 'Sin especificar' ? lead.contactPerson : lead.businessName;
 const defaultEmail = lead.contactPerson && lead.contactPerson !== 'Sin especificar'  ?
  `${lead.contactPerson.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`
  : `info@${lead.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

 setConvertingLead(lead);
 setConvType('Client');
 setConvName(cleanName);
 setConvCompany(lead.businessName);
 setConvEmail(defaultEmail);
 setConvPhone(lead.phone);
 setConvSalePrice(1500);
 setConvInstallments(1);
 setConvPaymentMethod('transfer');
 setConvConcept('Servicio de Consultoría Althera');
 };

 const handleOpenClosingConversion = (lead: ColdCallingLead) => {
 const draft = getClosingDraft(lead);
 const cleanName = draft.name?.trim() || lead.contactPerson || lead.businessName;
 const defaultEmail = draft.email?.trim() || `${lead.id}@clientes.althera.local`;
 setConvertingLead({
  ...lead,
  businessName: draft.company?.trim() || lead.businessName,
  contactPerson: cleanName,
  phone: draft.phone?.trim() || lead.phone,
  notes: [lead.notes, draft.notes ? `[Closing] ${draft.notes}` : ''].filter(Boolean).join('\n'),
  website: draft.website?.trim() || lead.website,
  mapsUrl: draft.mapsUrl?.trim() || lead.mapsUrl
 });
 setConvType('Client');
 setConvName(cleanName);
 setConvCompany(draft.company?.trim() || lead.businessName);
 setConvEmail(defaultEmail);
 setConvPhone(draft.phone?.trim() || lead.phone);
 setConvSalePrice(1500);
 setConvInstallments(1);
 setConvPaymentMethod('transfer');
 setConvConcept('Servicio web Althera');
 };

 const handleConfirmConvertToClient = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!convertingLead || !onAddContact) return;

 const subtleColor = convertingLead.temperature === 'Caliente' ? 'rose' : convertingLead.temperature === 'Templado' ? 'amber' : 'indigo';

 // 1. Create the new client contact
 const newContact: ClientContact = {
  id: 'c_' + Date.now(),
  name: convName.trim(),
  company: convCompany.trim(),
  status: convType,
  lastContacted: 'Justo ahora (Convertido de prospecto)',
  email: convEmail.trim(),
  phone: convPhone.trim(),
  addedDate: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
  initials: convName.trim()
  .split(' ')
  .map(n => n[0])
  .join('')
  .slice(0, 2)
  .toUpperCase() || 'CLI',
  color: subtleColor,
  temperature: convertingLead.temperature || 'Caliente',
  assignedUserEmail: convertingLead.assignedToEmail !== 'unassigned' ? convertingLead.assignedToEmail : undefined,
  contactedByComercialEmail: convertingLead.assignedToEmail !== 'unassigned' ? convertingLead.assignedToEmail : undefined,
  contactedByComercialName: convertingLead.assignedToName && convertingLead.assignedToName !== 'Sin asignar' ? convertingLead.assignedToName : undefined,
  originalLeadNotes: convertingLead.notes || undefined,
  notes: convertingLead.notes ? `[Historial de llamada] ${convertingLead.notes}` : undefined,
  callsLog: convertingLead.callsLog || []
 };

 onAddContact(newContact);

 // 2. Archive the cold lead
 onUpdateColdLead({
  ...convertingLead,
  archived: true
 });

 // 3. Find associated commercial account to resolve commission percentage
 const assignedEmail = convertingLead.assignedToEmail || '';
 const matchedCom = comercialesList.find(c => c.email.toLowerCase() === assignedEmail.toLowerCase());
 const commPct = matchedCom?.commissionPercentage ?? 10; // defaults to 10% if not set

 if (convType === 'Client') {
  // 4. Generate the Invoice (Factura) and Transactions (Cobros) - only for Client
  const invoiceId = 'inv_cc_' + Math.random().toString(36).substring(2, 9);
  const stripePlanId = 'plan_cc_' + Math.random().toString(36).substring(2, 9);
 const pricePerInstallment = Math.round((convSalePrice / convInstallments) * 100) / 100;
  const todayKey = new Date().toISOString().split('T')[0];
  const safeClientEmail = convEmail.trim() || `${newContact.id}@clientes.althera.local`;
  
  // Create Invoice Items
  const invoiceItems: InvoiceItem[] = [];
  const firstInstallmentDate = new Date();
  firstInstallmentDate.setHours(0, 0, 0, 0);
  for (let i = 1; i <= convInstallments; i++) {
  const txId = 'tx_cc_' + Math.random().toString(36).substring(2, 9) + '_' + i;
  const installmentDate = new Date(firstInstallmentDate);
  installmentDate.setMonth(firstInstallmentDate.getMonth() + (i - 1));
  
  invoiceItems.push({
   id: 'item_' + i + '_' + Date.now(),
   description: `${convConcept} - Plazo ${i} de ${convInstallments}`,
   quantity: 1,
   unitPrice: pricePerInstallment,
   total: pricePerInstallment,
   isPending: true,
   pendingTxId: txId,
    paymentMethod: convPaymentMethod
  });

  // Insert matching FinanceTransaction in DB
  const transaction: FinanceTransaction = {
   id: txId,
   type: 'income',
   category: 'Ventas',
   amount: pricePerInstallment,
    date: todayKey,
   description: `${convConcept} - Plazo ${i} de ${convInstallments} (Pendiente)`,
   status: 'pending',
    paymentMethod: convPaymentMethod,
   clientId: newContact.id,
   stripePlanId,
   stripeInstallmentIndex: i,
   stripeInstallmentCount: convInstallments,
   invoiceId: invoiceId,
   comercialId: matchedCom?.id,
   comercialEmail: assignedEmail,
   isInitialSale: true
  };

  try {
   await db.insertFinanceTransaction(transaction);
  } catch (err) {
   console.error('Error inserting transaction:', err);
  }
  }

  // Create and Insert Finance Invoice in DB
  const newInvoice: Invoice = {
  id: invoiceId,
  clientId: newContact.id,
  clientName: convName.trim(),
  clientEmail: safeClientEmail,
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'sent',
  items: invoiceItems,
  subtotal: convSalePrice,
  taxPercentage: 0,
  taxAmount: 0,
  total: convSalePrice,
  notes: `Venta inicial generada automáticamente desde Cold Calling. Comercial: ${convertingLead.assignedToName || 'Sin asignar'}. Comisión: ${commPct}%.`,
  comercialId: matchedCom?.id,
  comercialEmail: assignedEmail,
  isInitialSale: true
  };

  try {
   await db.insertFinanceInvoice(newInvoice);
  } catch (err) {
   console.error('Error inserting invoice:', err);
  }

  if (convPaymentMethod === 'stripe') {
   try {
   const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
    clientId: newContact.id,
    clientName: convName.trim(),
    clientEmail: safeClientEmail,
    amount: pricePerInstallment.toFixed(2),
    interval: convInstallments > 1 ? 'month' : 'once',
    installments: String(convInstallments),
    concept: `${convConcept} - ${convInstallments > 1 ? `${convInstallments} cuotas mensuales` : 'pago unico'}`,
    pendingTxId: invoiceItems[0]?.pendingTxId || '',
    stripePlanId,
    installmentIndex: '1',
    }),
   });
   const data = await response.json();
   if (!response.ok) throw new Error(data.error || 'No se pudo generar el link de Stripe');
   alert(`Link Stripe generado:\n${data.url}`);
   } catch (err: any) {
   alert(`El cliente se ha convertido, pero Stripe no pudo generar el link: ${err?.message || 'error desconocido'}`);
   }
  }
 }

 // Sync/create ComercialLead for metrics
 if (matchedCom) {
  try {
  const comLeads = await db.getComercialLeads();
  // Find existing lead by email or name
  const existingLead = comLeads.find(l => 
   (l.email && convEmail && l.email.toLowerCase() === convEmail.trim().toLowerCase()) ||
   l.name?.toLowerCase() === convName.trim().toLowerCase()
  );

  if (existingLead) {
   const updatedLead: ComercialLead = {
   ...existingLead,
   status: convType === 'Client' ? 'Ganado' : 'Pendiente',
   value: convType === 'Client' ? convSalePrice : 0,
   comercialId: matchedCom.id,
   comercialName: matchedCom.name,
   temperature: convertingLead.temperature || 'Caliente'
   };
   await db.updateComercialLead(updatedLead);
  } else {
   const newLead: ComercialLead = {
   id: 'lead_' + Math.random().toString(36).substring(2, 9),
   comercialId: matchedCom.id,
   comercialName: matchedCom.name,
   name: convName.trim(),
   company: convCompany.trim() || 'Empresa',
   email: convEmail.trim() || '',
   phone: convPhone.trim() || '',
   status: convType === 'Client' ? 'Ganado' : 'Pendiente',
   value: convType === 'Client' ? convSalePrice : 0,
   notes: `Creado al convertir desde Cold Calling por ${matchedCom.name}`,
   createdAt: new Date().toISOString(),
   temperature: convertingLead.temperature || 'Caliente',
   isDone: convType === 'Client'
   };
   await db.insertComercialLead(newLead);
  }
  } catch (leadErr) {
  console.error('Error syncing ComercialLead in ColdCallingScreen:', leadErr);
  }
 }

 if (onRefreshFinance) {
  onRefreshFinance();
 }

 if (convType === 'Client') {
  alert(`¡Felicidades! Se ha convertido a "${convCompany}" en Cliente.\n\n` +
   `• Venta Registrada: ${convSalePrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\n` +
   `• Plazos de Pago: ${convInstallments} plazo(s)\n` +
   `• Comisión para el Comercial (${commPct}%): ${(convSalePrice * commPct / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\n` +
   `• Se ha generado la Factura e Ingresos en Finanzas Globales.`);
 } else {
  alert(`¡Perfecto! Se ha traspasado a "${convCompany}" como Prospecto (Lead) en el CRM.\n\n` +
   `• El comercial conservará la asignación de este Lead, pero ya no podrá contactarlo desde su panel de captación fría (Cold Calling).\n` +
   `• Ya está disponible en la columna de Prospectos (Leads) del CRM para su seguimiento.`);
 }

 setConvertingLead(null);
 if (onNavigate) {
  onNavigate('crm', 'push');
 }
 if (onNavigate) {
  onNavigate('crm', 'push');
 }
 };

 const handleOpenScheduleMeeting = (lead: ColdCallingLead) => {
 setSchedulingLead(lead);
 setScheduleDate(new Date().toISOString().split('T')[0]);
 setScheduleTime('11:00');
 setScheduleTitle(`Cita Presencial: ${lead.businessName}`);
 setScheduleDesc(`Reunión presencial de prospección comercial con el dueño o encargado del negocio.`);
 setScheduleAssignee(lead.assignedToEmail || 'unassigned');
 setShowScheduleModal(true);
 };

 const handleConfirmScheduleMeeting = (e: React.FormEvent) => {
 e.preventDefault();
 if (!onAddEvent || !schedulingLead) return;

 const newEvent: CalendarEvent = {
  id: 'evt_' + Math.random().toString(36).substring(2, 9),
  title: scheduleTitle.trim() || `Cita Presencial: ${schedulingLead.businessName}`,
  date: scheduleDate,
  time: scheduleTime,
  type: 'Meeting',
  description: scheduleDesc.trim(),
  linkedContactName: schedulingLead.businessName,
  assignedUserEmail: scheduleAssignee !== 'unassigned' ? scheduleAssignee : undefined,
  color: 'violet',
  status: 'pending'
 };

 onAddEvent(newEvent);
 setShowScheduleModal(false);
 setSchedulingLead(null);
 alert(`¡Éxito! Se ha agendado una Cita Presencial para el día ${scheduleDate} a las ${scheduleTime} h.`);
 };

 // New Lead form state (Admin exclusive)
 const [newBusinessName, setNewBusinessName] = useState('');
 const [newContactPerson, setNewContactPerson] = useState('');
 const [newPhone, setNewPhone] = useState('');
 const [newCallDate, setNewCallDate] = useState(() => new Date().toISOString().split('T')[0]);
 const [newAssignedEmail, setNewAssignedEmail] = useState('unassigned');
 const [newNotes, setNewNotes] = useState('');
 const [newDemoWebsiteId, setNewDemoWebsiteId] = useState('');
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

 const parseCsv = (text: string) => {
 const rows: string[][] = [];
 let row: string[] = [];
 let cell = '';
 let quoted = false;
 for (let i = 0; i < text.length; i++) {
  const char = text[i];
  if (char === '"') {
  if (quoted && text[i + 1] === '"') {
   cell += '"';
   i++;
  } else {
   quoted = !quoted;
  }
  } else if (char === ',' && !quoted) {
  row.push(cell.trim());
  cell = '';
  } else if ((char === '\n' || char === '\r') && !quoted) {
  if (char === '\r' && text[i + 1] === '\n') i++;
  row.push(cell.trim());
  if (row.some(value => value !== '')) rows.push(row);
  row = [];
  cell = '';
  } else {
  cell += char;
  }
 }
 row.push(cell.trim());
 if (row.some(value => value !== '')) rows.push(row);
 if (quoted) throw new Error('El CSV contiene una comilla sin cerrar.');
 if (rows.length < 2) throw new Error('El CSV no contiene filas de datos.');

 const headers = rows[0].map((header, index) =>
  (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim()
 );
 const requiredHeaders = ['name', 'phone', 'hasWebsite', 'website', 'mapsUrl'];
 const missing = requiredHeaders.filter(header => !headers.includes(header));
 if (missing.length) throw new Error(`Faltan columnas: ${missing.join(', ')}`);

 return rows.slice(1).map(values =>
  headers.reduce<Record<string, string>>((result, header, index) => {
  result[header] = values[index]?.trim() || '';
  return result;
  }, {})
 );
 };

 const handleCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 setCsvError('');
 setCsvRows([]);
 setCsvSkippedNoPhone(0);
 setCsvFileName(file?.name || '');
 if (!file) return;
 try {
  const parsedRows = parseCsv(await file.text());
  const validRows = parsedRows.filter(row => row.phone?.trim());
  setCsvSkippedNoPhone(parsedRows.length - validRows.length);
  setCsvRows(validRows);
 } catch (error) {
  setCsvError(error instanceof Error ? error.message : 'No se pudo leer el CSV.');
 } finally {
  event.target.value = '';
 }
 };

 const handleImportCsv = async () => {
 if (!csvRows.length) return;
 setImportingCsv(true);
 setCsvError('');
 try {
  const now = new Date().toISOString();
  for (const [index, row] of csvRows.entries()) {
  const hasWebsite =
   ['true', '1', 'yes', 'sí', 'si'].includes(row.hasWebsite.trim().toLowerCase()) &&
   isOwnWebsite(row.website);
  await onAddColdLead({
   id: `cold_csv_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
   businessName: row.name || 'Sin nombre',
   contactPerson: 'Sin especificar',
   phone: row.phone || '',
   callDate: now.slice(0, 10),
   contacted: 'No',
   isOwner: 'No',
   answered: 'No',
   temperature: 'Frío',
   callbackScheduled: 'No',
   notes: 'Importado desde CSV.',
   assignedToEmail: 'unassigned',
   assignedToName: 'Sin asignar',
   archived: false,
   createdAt: now,
   hasWebsite,
   website: row.website || undefined,
   mapsUrl: row.mapsUrl || undefined
  });
  }
  const importedCount = csvRows.length;
  const skippedCount = csvSkippedNoPhone;
  setShowImportModal(false);
  setCsvRows([]);
  setCsvSkippedNoPhone(0);
  setCsvFileName('');
  alert(`Se han importado ${importedCount} prospectos correctamente.${skippedCount ? `\nNo se han importado ${skippedCount} negocios porque no tenían teléfono.` : ''}`);
 } catch (error) {
  setCsvError(error instanceof Error ? error.message : 'La importación no pudo completarse.');
 } finally {
  setImportingCsv(false);
 }
 };

 // Call Logging form state (For Comerciales working the lead)
 const [callContacted, setCallContacted] = useState<'Sí' | 'No'>('Sí');
 const [callContactPerson, setCallContactPerson] = useState('');
 const [callIsOwner, setCallIsOwner] = useState<'Sí' | 'No'>('Sí');
 const [callAnswered, setCallAnswered] = useState<'Sí' | 'No'>('Sí');
 const [callTemperature, setCallTemperature] = useState<'Frío' | 'Templado' | 'Caliente'>('Caliente');
 const [callScheduled, setCallScheduled] = useState<'Sí' | 'No' | 'Llamar más tarde'>('No');
 const [callCallbackDate, setCallCallbackDate] = useState('');
 const [callCallbackTime, setCallCallbackTime] = useState('');
 const [callNotes, setCallNotes] = useState('');
 const [callCallsCount, setCallCallsCount] = useState<number>(0);
 const [expandedLeadLogs, setExpandedLeadLogs] = useState<Record<string, boolean>>({});

 // Inline Log actions states
 const [editingLogId, setEditingLogId] = useState<string | null>(null);
 const [editingLogNotes, setEditingLogNotes] = useState<string>('');
 const [editingLogResult, setEditingLogResult] = useState<string>('');
 const [editingLogDate, setEditingLogDate] = useState<string>('');

 const [showAddLogInline, setShowAddLogInline] = useState<boolean>(false);
 const [newInlineLogNotes, setNewInlineLogNotes] = useState<string>('');
 const [newInlineLogResult, setNewInlineLogResult] = useState<string>('Llamada realizada');
 const [newInlineLogDate, setNewInlineLogDate] = useState<string>('');

 // Inline Handlers
 const handleAddInlineLog = (leadId: string) => {
 if (!selectedLeadForCall) return;
 if (!newInlineLogNotes.trim()) {
  alert('Por favor escribe las notas para la llamada.');
  return;
 }

 const dateStr = newInlineLogDate || new Date().toLocaleDateString('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
 });

 const newLogItem = {
  id: 'log_' + Math.random().toString(36).substring(2, 9),
  date: dateStr,
  notes: newInlineLogNotes.trim(),
  result: newInlineLogResult.trim()
 };

 const updatedLogs = [newLogItem, ...(selectedLeadForCall.callsLog || [])];
 const updatedLead = {
  ...selectedLeadForCall,
  callsLog: updatedLogs,
  callsCount: updatedLogs.length,
  callDate: new Date().toISOString().split('T')[0]
 };

 onUpdateColdLead(updatedLead);

 setSelectedLeadForCall(updatedLead);

 // Reset Form
 setNewInlineLogNotes('');
 setNewInlineLogResult('Llamada realizada');
 setNewInlineLogDate('');
 setShowAddLogInline(false);
 };

 const handleSaveEditLog = () => {
 if (!selectedLeadForCall || !editingLogId) return;

 const updatedLogs = (selectedLeadForCall.callsLog || []).map((log: any, idx: number) => {
  const logId = log.id || `log_${idx}`;
  if (logId === editingLogId) {
  return {
   ...log,
   notes: editingLogNotes.trim(),
   result: editingLogResult.trim(),
   date: editingLogDate.trim()
  };
  }
  return log;
 });

 const updatedLead = {
  ...selectedLeadForCall,
  callsLog: updatedLogs,
  callsCount: updatedLogs.length
 };

 onUpdateColdLead(updatedLead);

 setSelectedLeadForCall(updatedLead);
 setEditingLogId(null);
 };

 const handleDeleteLogItem = (logIdToDelete: string) => {
 if (!selectedLeadForCall) return;
 if (!confirm('¿Estás seguro de que deseas eliminar este registro de llamada?')) return;

 const updatedLogs = (selectedLeadForCall.callsLog || []).filter((log: any, idx: number) => {
  const logId = log.id || `log_${idx}`;
  return logId !== logIdToDelete;
 });

 const updatedLead = {
  ...selectedLeadForCall,
  callsLog: updatedLogs,
  callsCount: updatedLogs.length
 };

 onUpdateColdLead(updatedLead);

 setSelectedLeadForCall(updatedLead);
 };

 // Generic states for Inline Log Operations in Lead List & Grid
 const [inlineEditingLeadId, setInlineEditingLeadId] = useState<string | null>(null);
 const [inlineEditingLogId, setInlineEditingLogId] = useState<string | null>(null);
 const [inlineEditingLogNotes, setInlineEditingLogNotes] = useState<string>('');
 const [inlineEditingLogResult, setInlineEditingLogResult] = useState<string>('');
 const [inlineEditingLogDate, setInlineEditingLogDate] = useState<string>('');

 const [inlineAddingLeadId, setInlineAddingLeadId] = useState<string | null>(null);
 const [inlineAddingLogNotes, setInlineAddingLogNotes] = useState<string>('');
 const [inlineAddingLogResult, setInlineAddingLogResult] = useState<string>('Llamada realizada');
 const [inlineAddingLogDate, setInlineAddingLogDate] = useState<string>('');

 const updateLeadCallsLog = (lead: ColdCallingLead, updatedLogs: any[]) => {
 const updatedLead: ColdCallingLead = {
  ...lead,
  callsLog: updatedLogs,
  callsCount: updatedLogs.length,
  callDate: updatedLogs.length > 0 ? new Date().toISOString().split('T')[0] : undefined
 };

 onUpdateColdLead(updatedLead);


 // If this is also the active lead in the resolver modal, sync it
 if (selectedLeadForCall && selectedLeadForCall.id === lead.id) {
  setSelectedLeadForCall(updatedLead);
 }
 };

 const handleAddInlineLogGeneric = (lead: ColdCallingLead) => {
 if (!inlineAddingLogNotes.trim()) {
  alert('Por favor escribe las notas para la llamada.');
  return;
 }

 const dateStr = inlineAddingLogDate || new Date().toLocaleDateString('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
 });

 const newLogItem = {
  id: 'log_' + Math.random().toString(36).substring(2, 9),
  date: dateStr,
  notes: inlineAddingLogNotes.trim(),
  result: inlineAddingLogResult.trim()
 };

 const updatedLogs = [newLogItem, ...(lead.callsLog || [])];
 updateLeadCallsLog(lead, updatedLogs);

 // Reset inline adding state
 setInlineAddingLeadId(null);
 setInlineAddingLogNotes('');
 setInlineAddingLogResult('Llamada realizada');
 setInlineAddingLogDate('');
 };

 const handleSaveEditLogGeneric = (lead: ColdCallingLead) => {
 if (!inlineEditingLogId) return;

 const updatedLogs = (lead.callsLog || []).map((log: any, idx: number) => {
  const logId = log.id || `log_${idx}`;
  if (logId === inlineEditingLogId) {
  return {
   ...log,
   notes: inlineEditingLogNotes.trim(),
   result: inlineEditingLogResult.trim(),
   date: inlineEditingLogDate.trim()
  };
  }
  return log;
 });

 updateLeadCallsLog(lead, updatedLogs);

 // Reset inline editing state
 setInlineEditingLeadId(null);
 setInlineEditingLogId(null);
 setInlineEditingLogNotes('');
 setInlineEditingLogResult('');
 setInlineEditingLogDate('');
 };

 const handleDeleteLogItemGeneric = (lead: ColdCallingLead, logIdToDelete: string) => {
 if (!confirm('¿Estás seguro de que deseas eliminar este registro de llamada?')) return;

 const updatedLogs = (lead.callsLog || []).filter((log: any, idx: number) => {
  const logId = log.id || `log_${idx}`;
  return logId !== logIdToDelete;
 });

 updateLeadCallsLog(lead, updatedLogs);
 };

 // Filtering leads based on permissions and filters
 const visibleLeads = coldLeads.filter(lead => {
 const myEmail = (currentUser?.email || currentComercial?.email || '').toLowerCase();
 
 // Strict requirement: a commercial can ONLY see their own cold calling leads!
 if (currentComercial && lead.assignedToEmail.toLowerCase() !== myEmail) {
  return false;
 }

 // Show only self assigned filter if enabled for admins
 if (showOnlySelf && lead.assignedToEmail.toLowerCase() !== myEmail) {
  return false;
 }

 // List modes: active, postponed, archived.
 const isPostponed = lead.callbackScheduled === 'Llamar más tarde';
 const isPostponedDue = isPostponed && getCallbackTimestamp(lead) <= filterNow;
 const isAppointment = lead.callbackScheduled === 'Sí';
 if (showArchived) {
  if (!lead.archived && !isAppointment) return false;
 } else if (showPostponed) {
  if (lead.archived || !isPostponed || isPostponedDue) return false;
 } else {
  if (lead.archived || (isPostponed && !isPostponedDue) || isAppointment) return false;
 }

 // Fast search filter
 const matchesSearch = 
  lead.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
  lead.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
  lead.phone.includes(searchQuery) ||
  (lead.website || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
  (lead.mapsUrl || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
  lead.notes.toLowerCase().includes(searchQuery.toLowerCase());

 // Temperature filter
 const matchesTemp = tempFilter === 'Todos' || lead.temperature === tempFilter;

 // Assigned search filter (for Admin)
 let matchesAssigned = true;
 if (isAdmin && assignedFilter !== 'todos') {
  matchesAssigned = lead.assignedToEmail === assignedFilter;
 }

 const matchesGroup = !currentComercial || groupFilter === 'all' ||
  (groupFilter === 'ungrouped' ? !lead.prospectGroupId : lead.prospectGroupId === groupFilter);

 return matchesSearch && matchesTemp && matchesAssigned && matchesGroup;
 }).sort((a, b) => {
 const aCallback = getCallbackTimestamp(a);
 const bCallback = getCallbackTimestamp(b);
 if (!showPostponed) {
  const aDue = a.callbackScheduled === 'Llamar más tarde' && aCallback <= filterNow;
  const bDue = b.callbackScheduled === 'Llamar más tarde' && bCallback <= filterNow;
  if (aDue !== bDue) return aDue ? -1 : 1;
 }
 if (!Number.isFinite(aCallback) && !Number.isFinite(bCallback)) return 0;
 return aCallback - bCallback;
 });

 const visibleLeadIds = visibleLeads.map(lead => lead.id);
 const allVisibleSelected = visibleLeadIds.length > 0 && visibleLeadIds.every(id => selectedLeadIds.includes(id));
 const toggleLeadSelection = (id: string) => setSelectedLeadIds(current =>
 current.includes(id) ? current.filter(item => item !== id) : [...current, id]
 );
 const toggleAllVisible = () => setSelectedLeadIds(current =>
 allVisibleSelected ?
  current.filter(id => !visibleLeadIds.includes(id))
  : Array.from(new Set([...current, ...visibleLeadIds]))
 );
 const handleBulkAssign = async () => {
 const selected = coldLeads.filter(lead => selectedLeadIds.includes(lead.id));
 if (!selected.length) return;
 const assignee = allAssignees.find(item => item.email === bulkAssigneeEmail);
 setBulkActionRunning(true);
 try {
  await Promise.all(selected.map(lead => onUpdateColdLead({
  ...lead,
  assignedToEmail: bulkAssigneeEmail,
  assignedToName: assignee?.name || 'Sin asignar'
  })));
  setSelectedLeadIds([]);
 } finally {
  setBulkActionRunning(false);
 }
 };
 const handleBulkDelete = async () => {
 if (!selectedLeadIds.length || !confirm(`¿Eliminar definitivamente ${selectedLeadIds.length} prospectos?`)) return;
 setBulkActionRunning(true);
 try {
  await Promise.all(selectedLeadIds.map(id => onDeleteColdLead(id)));
  setSelectedLeadIds([]);
 } finally {
  setBulkActionRunning(false);
 }
 };

 // Calculate Metrics based on current filter preferences (All vs Solo Míos)
 const relevantLeads = coldLeads.filter(l => {
 if (l.archived) return false;
 
 const myEmail = (currentUser?.email || currentComercial?.email || '').toLowerCase();
 if (currentComercial && l.assignedToEmail.toLowerCase() !== myEmail) {
  return false;
 }
 if (showOnlySelf && l.assignedToEmail.toLowerCase() !== myEmail) {
  return false;
 }
 
 return true;
 });

 const totalCount = relevantLeads.length;
 const answeredCount = relevantLeads.filter(l => l.answered === 'Sí').length;
 const contactedCount = relevantLeads.filter(l => l.contacted === 'Sí').length;
 const ownerCount = relevantLeads.filter(l => l.isOwner === 'Sí').length;

 const answerRate = totalCount ? Math.round((answeredCount / totalCount) * 100) : 0;
 const contactRate = totalCount ? Math.round((contactedCount / totalCount) * 100) : 0;
 const ownerDecisionRate = contactedCount ? Math.round((ownerCount / contactedCount) * 100) : 0;

 const hotCount = relevantLeads.filter(l => l.temperature === 'Caliente').length;
 const warmCount = relevantLeads.filter(l => l.temperature === 'Templado').length;
 const coldCount = relevantLeads.filter(l => l.temperature === 'Frío').length;

 const agendadasCount = relevantLeads.filter(l => l.callbackScheduled === 'Sí' || l.callbackScheduled === 'Llamar más tarde').length;

 // Handle Create Lead (Admin only)
 const handleCreateLead = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newBusinessName.trim() || !newPhone.trim()) {
  alert('Por favor introduce el Nombre del Negocio y su Teléfono.');
  return;
 }

 const matchedComercial = allAssignees.find(c => c.email === newAssignedEmail);

 const newLead: ColdCallingLead = {
  id: 'cold_' + Math.random().toString(36).substring(2, 9),
  businessName: newBusinessName.trim(),
  contactPerson: newContactPerson.trim() || 'Sin especificar',
  phone: newPhone.trim(),
  callDate: newCallDate,
  contacted: 'No',
  isOwner: 'No',
  answered: 'No',
  temperature: 'Frío',
  callbackScheduled: 'No',
  notes: newNotes.trim() || 'Anotaciones de precarga.',
  assignedToEmail: newAssignedEmail,
  assignedToName: matchedComercial ? matchedComercial.name : 'Sin asignar',
  archived: false,
  createdAt: new Date().toISOString(),
  demoWebsiteId: newDemoWebsiteId || undefined
 };

 onAddColdLead(newLead);
 
 // Reset Form
 setNewBusinessName('');
 setNewContactPerson('');
 setNewPhone('');
 setNewCallDate(new Date().toISOString().split('T')[0]);
 setNewAssignedEmail('unassigned');
 setNewNotes('');
 setNewDemoWebsiteId('');
 setShowAddModal(false);
 };

 // Open Call Logging Modal
 const handleOpenCallLog = (lead: ColdCallingLead) => {
 setSelectedLeadForCall(lead);
 setCallContacted(lead.contacted);
 setCallContactPerson(lead.contactPerson || '');
 setCallIsOwner(lead.isOwner);
 setCallAnswered(lead.answered);
 setCallTemperature(lead.temperature);
 setCallScheduled(lead.callbackScheduled);
 setCallCallbackDate(lead.callbackDate || '');
 setCallCallbackTime(lead.callbackTime || '');
 setCallNotes(''); // Clear call notes for the new call being registered
 setCallCallsCount(lead.callsCount || 0);
 setAppointmentAccessConfirmed(lead.callbackScheduled === 'Sí');

 // Reset inline actions states
 setEditingLogId(null);
 setShowAddLogInline(false);
 if (currentComercial) {
  void db.addCommercialActivityLog({
   commercial: currentComercial,
   action: 'cold_lead_opened',
   entityType: 'cold_calling_lead',
   entityId: lead.id,
   description: `Abrió la ficha de llamada de ${lead.businessName}.`,
   metadata: { businessName: lead.businessName, phone: lead.phone }
  }).catch(error => console.error('Could not log lead opening:', error));
 }
 };

 useEffect(() => {
  if (!focusLeadId) return;
  const lead = coldLeads.find(item => item.id === focusLeadId);
  if (lead) {
   setActiveTab('leads');
   handleOpenCallLog(lead);
  }
 }, [focusLeadId]);

 useEffect(() => {
  if (!focusClosingLeadId) return;
  const lead = coldLeads.find(item => item.id === focusClosingLeadId);
  if (!lead) return;
  setActiveTab('closing');
  setClosingScope('all');
  setShowClosedClosingLeads(true);
  setExpandedClosingLeadId(lead.id);
 }, [focusClosingLeadId, coldLeads]);

 // Submit Logger Update
 const handleSaveCallLog = (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedLeadForCall) return;

 if (callScheduled === 'Llamar más tarde' && !callCallbackDate) {
  alert('Por favor indica una fecha en el calendario para posponer la llamada.');
  return;
 }

 if (callScheduled === 'Sí' && (!callCallbackDate || !callCallbackTime)) {
  alert('Para marcar una cita agendada tienes que indicar fecha y hora.');
  return;
 }

 if (callScheduled === 'Sí' && isSlotBusy(callCallbackDate, callCallbackTime)) {
  alert('Esa hora ya tiene una cita asignada. Elige otra franja disponible.');
  return;
 }

 if (callScheduled === 'Sí' && !appointmentAccessConfirmed) {
  setPendingAppointmentSubmit(true);
  setShowAppointmentConfirm(true);
  return;
 }

 const currentNotes = callNotes.trim() || 'Llamada realizada.';
 const newLogItem = {
  id: 'log_' + Math.random().toString(36).substring(2, 9),
  date: new Date().toLocaleDateString('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
  }),
  notes: currentNotes,
  result: `Contactado: ${callContacted} | Dueño: ${callIsOwner} | Responde: ${callAnswered} | Agendada: ${callScheduled}`
 };

 const existingLogs = selectedLeadForCall.callsLog || [];
 const updatedLogs = [newLogItem, ...existingLogs];

 const shouldSendToClosing = callScheduled === 'Sí';
 const closerAssigneeEmail = carlosAdmin?.email || selectedLeadForCall.assignedToEmail;
 const closerAssigneeName = carlosAdmin?.name || 'Carlos';

 const updatedLead: ColdCallingLead = {
  ...selectedLeadForCall,
  contacted: callContacted,
  contactPerson: callContactPerson.trim() || selectedLeadForCall.contactPerson,
  isOwner: callIsOwner,
  answered: callAnswered,
  temperature: callTemperature,
  callbackScheduled: callScheduled,
  callbackDate: (callScheduled === 'Llamar más tarde' || callScheduled === 'Sí') ? callCallbackDate : undefined,
  callbackTime: (callScheduled === 'Llamar más tarde' || callScheduled === 'Sí') ? callCallbackTime : undefined,
  archived: shouldSendToClosing ? true : selectedLeadForCall.archived,
  assignedToEmail: shouldSendToClosing ? closerAssigneeEmail : selectedLeadForCall.assignedToEmail,
  assignedToName: shouldSendToClosing ? closerAssigneeName : selectedLeadForCall.assignedToName,
  closingOriginComercialEmail: shouldSendToClosing ? selectedLeadForCall.assignedToEmail : selectedLeadForCall.closingOriginComercialEmail,
  closingOriginComercialName: shouldSendToClosing ? selectedLeadForCall.assignedToName : selectedLeadForCall.closingOriginComercialName,
  notes: currentNotes,
  callDate: new Date().toISOString().split('T')[0],
  callsCount: updatedLogs.length,
  callsLog: updatedLogs
 };

 onUpdateColdLead(updatedLead);

 if (callScheduled === 'Sí') {
  const crmLead = buildLeadContactFromColdLead({
  ...updatedLead,
  assignedToEmail: selectedLeadForCall.assignedToEmail,
  assignedToName: selectedLeadForCall.assignedToName
  }, currentNotes);
  onAddContact?.(crmLead);

  const adminAppointment: CalendarEvent = {
  id: `cc_appointment_${selectedLeadForCall.id}`,
  title: `Cita comercial: ${selectedLeadForCall.businessName}`,
  date: callCallbackDate,
  time: callCallbackTime,
  duration: '45m',
  type: 'Meeting',
  description: [
   `Cita agendada desde Call Calling por ${selectedLeadForCall.assignedToName || 'comercial sin asignar'}.`,
   `Teléfono: ${selectedLeadForCall.phone}`,
   `Contacto: ${callContactPerson.trim() || selectedLeadForCall.contactPerson || 'Sin especificar'}`,
   currentNotes
  ].filter(Boolean).join('\n'),
  linkedContactId: crmLead.id,
  linkedContactName: crmLead.name,
  linkedContactIds: [crmLead.id],
  assignedUserId: carlosAdmin?.id,
  assignedUserEmail: carlosAdmin?.email || 'todos-admins',
  assignedUserEmails: carlosAdmin?.email ? [carlosAdmin.email] : ['todos-admins'],
  status: 'pending',
  color: '#F59E0B',
  alias: 'Cita Cold Calling',
  isAdminNotification: !carlosAdmin,
  comercialId: comercialesList.find(c => c.email.toLowerCase() === (selectedLeadForCall.assignedToEmail || '').toLowerCase())?.id,
  notes: currentNotes
  };

  onAddEvent?.(adminAppointment);
 }

 setSelectedLeadForCall(null);
 };

 // Archive / Unarchive toggle
 const handleToggleArchive = (lead: ColdCallingLead) => {
 onUpdateColdLead({
  ...lead,
  archived: !lead.archived
 });
 };

 const handleCreateProspectGroup = async (event: React.FormEvent) => {
  event.preventDefault();
  if (!currentComercial || !newGroupName.trim() || groupBusy) return;
  setGroupBusy(true);
  setGroupError('');
  const group: ColdCallingProspectGroup = {
   id: `cc_group_${currentComercial.id}_${Date.now()}`,
   ownerCommercialId: currentComercial.id,
   ownerEmail: currentComercial.email,
   ownerName: currentComercial.name,
   name: newGroupName.trim().slice(0, 60),
   color: newGroupColor,
   createdAt: new Date().toISOString()
  };
  try {
   await db.insertColdCallingGroup(group);
   setProspectGroups(current => [...current, group]);
   setNewGroupName('');
   await db.addCommercialActivityLog({
    commercial: currentComercial,
    action: 'prospect_group_created',
    entityType: 'prospect_group',
    entityId: group.id,
    description: `Creó el grupo de prospectos “${group.name}”.`,
    metadata: { groupName: group.name, color: group.color }
   });
  } catch (error: any) {
   setGroupError(error?.message || 'No se pudo crear el grupo.');
  } finally {
   setGroupBusy(false);
  }
 };

 const handleDeleteProspectGroup = async (group: ColdCallingProspectGroup) => {
  if (!currentComercial || groupBusy || !confirm(`¿Eliminar el grupo “${group.name}”? Los prospectos no se eliminarán.`)) return;
  setGroupBusy(true);
  setGroupError('');
  try {
   await db.deleteColdCallingGroup(group.id, currentComercial.email);
   setProspectGroups(current => current.filter(item => item.id !== group.id));
   if (groupFilter === group.id) setGroupFilter('all');
   await Promise.all(coldLeads
    .filter(lead => lead.prospectGroupId === group.id)
    .map(lead => onUpdateColdLead({ ...lead, prospectGroupId: undefined })));
   await db.addCommercialActivityLog({
    commercial: currentComercial,
    action: 'prospect_group_deleted',
    entityType: 'prospect_group',
    entityId: group.id,
    description: `Eliminó el grupo de prospectos “${group.name}”.`,
    metadata: { groupName: group.name }
   });
  } catch (error: any) {
   setGroupError(error?.message || 'No se pudo eliminar el grupo.');
  } finally {
   setGroupBusy(false);
  }
 };

 const assignLeadToGroup = async (lead: ColdCallingLead, groupId: string) => {
  if (!currentComercial) return;
  const nextGroupId = groupId || undefined;
  await onUpdateColdLead({ ...lead, prospectGroupId: nextGroupId });
  const group = prospectGroups.find(item => item.id === nextGroupId);
  void db.addCommercialActivityLog({
   commercial: currentComercial,
   action: 'prospect_group_assigned',
   entityType: 'cold_calling_lead',
   entityId: lead.id,
   description: group ? `Añadió ${lead.businessName} al grupo “${group.name}”.` : `Quitó ${lead.businessName} de su grupo.`,
   metadata: { leadId: lead.id, groupId: nextGroupId || null, groupName: group?.name || null }
  }).catch(error => console.error('Could not log prospect group assignment:', error));
 };

 // Calendar tasks query: matching callbackScheduled === 'Llamar más tarde' and callbackDate matches
 const dayCallbackLeads = coldLeads.filter(lead => {
 if (lead.archived) return false;
 if (!isAdmin && lead.assignedToEmail.toLowerCase() !== comercialEmail.toLowerCase()) return false;
 return lead.callbackScheduled === 'Llamar más tarde' && lead.callbackDate === selectedTaskDate;
 });

 // This focused dashboard intentionally excludes general calendar events.
 // It is the production queue for postponed client callbacks only.
 const myEvents: CalendarEvent[] = [];
 const dayEvents: CalendarEvent[] = [];

 const todayTaskDate = new Date().toISOString().split('T')[0];
 const todayCallbackLeads = coldLeads.filter(lead => {
 if (lead.archived) return false;
 if (!isAdmin && lead.assignedToEmail.toLowerCase() !== comercialEmail.toLowerCase()) return false;
 return lead.callbackScheduled === 'Llamar más tarde' && lead.callbackDate === todayTaskDate;
 });
 const todayTaskNotificationsCount = todayCallbackLeads.length;

 // Add a private task/event (commercials can only add private ones)
 const handleCreatePrivateTask = (e: React.FormEvent) => {
 e.preventDefault();
 if (!taskTitle.trim() || !onAddEvent) return;

 const newEvent: CalendarEvent = {
  id: 'evt_' + Math.random().toString(36).substring(2, 11),
  title: taskTitle.trim(),
  date: taskDate,
  time: taskTime,
  type: 'Meeting',
  color: taskColor,
  notes: taskNotes.trim() || 'Tarea privada de seguimiento.',
  comercialId: currentComercial?.id || undefined,
  isPrivate: true,
  meetingUrl: taskMeetingUrl.trim() || undefined,
  assignedUserEmail: currentComercial?.email || undefined,
  status: 'pending'
 };

 onAddEvent(newEvent);
 
 // Reset Form
 setTaskTitle('');
 setTaskNotes('');
 setTaskMeetingUrl('');
 setShowAddTaskModal(false);
 alert('¡Éxito! Tu tarea privada ha sido agendada.');
 };

 const closingLeads = React.useMemo(() => {
 const seen = new Set<string>();
 return coldLeads
  .filter(lead => {
   if (currentUser) {
    return lead.callbackScheduled === 'Sí' &&
     lead.assignedToEmail?.toLowerCase() === currentUser.email.toLowerCase();
   }
   if (!currentComercial) return lead.callbackScheduled === 'Sí';
   // Para el caller, el origen de la cita es el dato estable. El closer puede
   // modificar su estado posteriormente sin hacer desaparecer el seguimiento.
   return lead.closingOriginComercialEmail?.toLowerCase() === currentComercial.email.toLowerCase() ||
    lead.closingOriginComercialName?.toLowerCase() === currentComercial.name.toLowerCase();
  })
  .filter(lead => {
   const key = lead.id || `${lead.businessName}-${lead.phone}`;
   if (seen.has(key)) return false;
   seen.add(key);
   return true;
  })
  .sort((a, b) => `${a.callbackDate || ''}${a.callbackTime || ''}`.localeCompare(`${b.callbackDate || ''}${b.callbackTime || ''}`));
 }, [coldLeads, currentComercial, currentUser]);

 const getClosingContact = (lead: ColdCallingLead) => contacts.find(contact =>
 contact.closingSourceLeadId === lead.id || contact.id === `crm_from_${lead.id}`
 );

 const getClosingDraft = (lead: ColdCallingLead) => {
 const contact = getClosingContact(lead);
 return {
  name: contact?.name || lead.contactPerson || lead.businessName,
  company: contact?.company || lead.businessName,
  phone: contact?.phone || lead.phone,
  email: contact?.email || '',
  status: contact?.closingStatus || 'Pendiente',
  answered: contact?.closingAnswered,
  date: lead.callbackDate || '',
  time: lead.callbackTime || '',
  notes: contact?.closingNotes || '',
  socials: contact?.closingSocials || contact?.linkedin || '',
  mapsUrl: contact?.googleMapsUrl || lead.mapsUrl || '',
  website: contact?.website || lead.website || '',
  ...(closingDrafts[lead.id] || {})
 };
 };

 const todayClosingKey = new Date().toISOString().split('T')[0];
 const isClosingReadOnly = !!currentComercial;
 const openClosingLeads = closingLeads.filter(lead => {
 if (isClosingReadOnly) return true;
 const contact = getClosingContact(lead);
 const status = closingDrafts[lead.id]?.status || contact?.closingStatus || 'Pendiente';
 return showClosedClosingLeads || status !== 'Cerrado';
 });
 const visibleClosingLeads = isClosingReadOnly
  ? openClosingLeads
  : openClosingLeads.filter(lead => closingScope === 'all' || lead.callbackDate === todayClosingKey);
 const todayClosingCount = openClosingLeads.filter(lead => lead.callbackDate === todayClosingKey).length;

 const updateClosingDraft = (leadId: string, patch: Partial<ReturnType<typeof getClosingDraft>>) => {
 setClosingDrafts(prev => ({ ...prev, [leadId]: { ...(prev[leadId] || {}), ...patch } }));
 };

 const saveClosingLead = (
  lead: ColdCallingLead,
  forcedStatus?: ClientContact['closingStatus'],
  draftPatch?: Partial<ReturnType<typeof getClosingDraft>>
 ) => {
 if (!onUpdateContact) {
  alert('No hay conexiÃ³n de actualizaciÃ³n CRM disponible para guardar Closing.');
  return;
 }
 const draft = { ...getClosingDraft(lead), ...(draftPatch || {}) };
 const status = forcedStatus || draft.status || 'Pendiente';
 if (draft.date && draft.time && (draft.date !== lead.callbackDate || draft.time !== lead.callbackTime)) {
  if (isSlotBusy(draft.date, draft.time)) {
  alert('Esa hora ya estÃ¡ ocupada en calendario. Elige otra franja.');
  return;
  }
  onUpdateColdLead({ ...lead, callbackDate: draft.date, callbackTime: draft.time });
  const originalAppointment = events.find(event =>
   event.id === `cc_appointment_${lead.id}` || event.linkedContactId === `crm_from_${lead.id}`
  );
  const rescheduledAppointment: CalendarEvent = {
  ...(originalAppointment || {}),
  id: originalAppointment?.id || `cc_reschedule_${lead.id}_${Date.now()}`,
  title: `Cita reagendada: ${draft.company}`,
  date: draft.date,
  time: draft.time,
  duration: '45m',
  type: 'Meeting',
  description: `Reagenda desde Closing para ${draft.company}. TelÃ©fono: ${draft.phone}`,
  linkedContactId: `crm_from_${lead.id}`,
  linkedContactName: draft.name,
  assignedUserId: activeCloser?.id || undefined,
  assignedUserEmail: activeCloser?.email || 'todos-admins',
  status: 'pending',
  color: '#38BDF8',
  alias: 'Closing Reagendado',
  isAdminNotification: !activeCloser
  };
  if (originalAppointment && onUpdateEvent) onUpdateEvent(rescheduledAppointment);
  else onAddEvent?.(rescheduledAppointment);
 }

 const existing = getClosingContact(lead);
 const base = existing || buildLeadContactFromColdLead(lead, lead.notes || 'Lead creado desde Closing.');
 const updatedContact: ClientContact = {
  ...base,
  name: draft.name?.trim() || base.name,
  company: draft.company?.trim() || base.company,
  email: draft.email?.trim() || base.email,
  phone: draft.phone?.trim() || base.phone,
  website: draft.website?.trim() || base.website,
  customWebsiteUrl: draft.website?.trim() || base.customWebsiteUrl,
  closingStatus: status,
  closingAnswered: draft.answered,
  closingNotes: draft.notes?.trim() || undefined,
  closingSocials: draft.socials?.trim() || undefined,
  googleMapsUrl: draft.mapsUrl?.trim() || undefined,
  status: status === 'Cerrado' ? 'Client' : 'Lead',
  needsWebsite: status === 'Cerrado',
  websiteReady: status === 'Cerrado' ? false : base.websiteReady,
  devStatus: status === 'Cerrado' ? 'backlog' : base.devStatus,
  closerName: activeCloser?.name || base.closerName || 'Carlos',
  closerEmail: activeCloser?.email || base.closerEmail,
  closingSourceLeadId: lead.id,
  lastContacted: status === 'Cerrado' ? 'Justo ahora (Closing cerrado)' : 'Justo ahora (Closing actualizado)',
  notes: [base.notes, draft.notes ? `[Closing] ${draft.notes}` : ''].filter(Boolean).join('\n')
 };

 if (existing) onUpdateContact(updatedContact);
 else onAddContact?.(updatedContact);

 if (status === 'Cerrado') {
  onAddEvent?.({
  id: `web_needed_${updatedContact.id}_${Date.now()}`,
  title: `Web pendiente: ${updatedContact.company}`,
  date: todayKey,
  time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  duration: '15m',
  type: 'Deadline',
  description: `Nacho, este cliente se ha cerrado desde Closing y necesita web. Cliente: ${updatedContact.name}. TelÃ©fono: ${updatedContact.phone || 'Sin telÃ©fono'}.`,
  linkedContactId: updatedContact.id,
  linkedContactName: updatedContact.name,
  linkedContactIds: [updatedContact.id],
  assignedUserId: nachoAdmin?.id,
  assignedUserEmail: nachoAdmin?.email || 'todos-admins',
  assignedUserEmails: nachoAdmin?.email ? [nachoAdmin.email] : ['todos-admins'],
  status: 'pending',
  color: '#F59E0B',
  alias: 'Falta Web',
  isAdminNotification: !nachoAdmin,
  notes: draft.notes
  });
 }
 };

 const postponeClosingLead = (lead: ColdCallingLead) => {
  setPostponingClosingLead(lead);
  setPostponeClosingDate(lead.callbackDate || new Date().toISOString().split('T')[0]);
  setPostponeClosingTime('');
 };

 const confirmPostponeClosingLead = () => {
  if (!postponingClosingLead || !postponeClosingDate || !postponeClosingTime) return;
  if (postponeClosingDate === postponingClosingLead.callbackDate && postponeClosingTime === postponingClosingLead.callbackTime) {
   alert('Selecciona una fecha u hora diferente antes de posponer.');
   return;
  }
  const conflict = getSlotConflict(postponeClosingDate, postponeClosingTime);
  if (conflict) {
   alert(`La franja ${postponeClosingTime} está ocupada por “${conflict.title}”.`);
   return;
  }
  updateClosingDraft(postponingClosingLead.id, { date: postponeClosingDate, time: postponeClosingTime });
  saveClosingLead(postponingClosingLead, 'Pendiente', { date: postponeClosingDate, time: postponeClosingTime });
  setPostponingClosingLead(null);
 };

 // Update a private task/event
 const handleUpdatePrivateTaskSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingPrivateTaskId || !onUpdateEvent) return;

 const existingEvent = events.find(ev => ev.id === editingPrivateTaskId);
 if (existingEvent) {
  onUpdateEvent({
  ...existingEvent,
  title: editTaskTitle.trim(),
  time: editTaskTime,
  notes: editTaskNotes.trim(),
  meetingUrl: editTaskMeetingUrl.trim() || undefined
  });
  setEditingPrivateTaskId(null);
  alert('¡Tarea actualizada con éxito!');
 }
 };

 // Delete a private task/event
 const handleDeletePrivateTask = (id: string) => {
 if (!onDeleteEvent) return;
 if (confirm('¿Estás seguro de que deseas eliminar esta tarea privada de tu calendario?')) {
  onDeleteEvent(id);
 }
 };

 return (
 <div className={`p-6 md:p-8 space-y-6 text-left h-full overflow-y-auto font-sans relative`}>
  
  {/* Decorative localized glows */}
  <div className="absolute top-[5%] right-[10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
  <div className="absolute bottom-[5%] left-[5%] w-[40%] h-[40%] rounded-full bg-rose-600/5 blur-[130px] pointer-events-none" />

  {/* Screen Title Banner */}
  {isAdmin && (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-4 relative z-10">
  <div>
   <div className="flex items-center gap-2 mb-1.5">
   <span className="text-[10px] bg-violet-500/15 text-violet-400 font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-violet-500/25">
    Módulo de Ventas
   </span>
   <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-full">
    {isAdmin ? 'Modo: Administrador 👑' : 'Modo: Comercial 📞'}
   </span>
   </div>
   <h2 className="text-2xl font-bold tracking-tight text-white uppercase font-display flex items-center gap-2">
   Seguimiento y Métricas Cold Calling
   </h2>
   <p className="text-xs text-slate-400 mt-1 max-w-xl">
   Gestiona la lista de futuros clientes, completa las métricas de contacto cara al dueño y programa rellamadas calendadas del día.
   </p>
  </div>
  
  {/* Actions for Admin */}
  {isAdmin && (
   <div className="flex flex-wrap gap-2">
   <button
    onClick={() => setShowImportModal(true)}
    className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 rounded-xl font-bold transition text-xs cursor-pointer active:scale-95"
   >
    <Upload className="w-4 h-4 text-cyan-400" />
    <span>Importar CSV</span>
   </button>
   <button
    onClick={() => setShowAddModal(true)}
    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition duration-200 text-xs shadow-lg shadow-violet-500/15 cursor-pointer active:scale-95"
   >
    <PlusCircle className="w-4 h-4 text-white" />
    <span>Pre-cargar Lead</span>
   </button>
   </div>
  )}
  </div>
  )}

  {/* THREE MODULE SECTIONS TAB CONTROLLERS */}
  <div className="flex gap-1.5 p-1 bg-[#050508]/80 backdrop-blur-md rounded-xl border border-white/5 max-w-2xl relative z-10">
  <button
   onClick={() => setActiveTab('leads')}
   className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
   activeTab === 'leads' ?
    'bg-violet-600 text-white shadow-md'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
   }`}
  >
   <Phone className="w-3.5 h-3.5" />
   <span>Listado de Prospectos</span>
  </button>

  <button
   onClick={() => setActiveTab('closing')}
   className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
   activeTab === 'closing' ?
    'bg-cyan-600 text-white shadow-md'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
   }`}
  >
   <Briefcase className="w-3.5 h-3.5" />
   <span>Closing</span>
   {closingLeads.length > 0 && (
   <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-cyan-500 text-[9px] text-white font-extrabold flex items-center justify-center rounded-full">
    {closingLeads.length}
   </span>
   )}
  </button>

  <button
   onClick={() => setActiveTab('tasks')}
   className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
   activeTab === 'tasks' ?
    'bg-violet-600 text-white shadow-md'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
   }`}
  >
   <Calendar className="w-3.5 h-3.5" />
   <span>Dashboard de Tareas</span>
    {todayTaskNotificationsCount > 0 && (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[9px] text-white font-extrabold flex items-center justify-center rounded-full animate-bounce">
     {todayTaskNotificationsCount}
    </span>
    )}
  </button>

  <button
   onClick={() => setActiveTab('metrics')}
   className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
   activeTab === 'metrics' ?
    'bg-violet-600 text-white shadow-md'
    : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
   }`}
  >
   <TrendingUp className="w-3.5 h-3.5" />
   <span>Métricas</span>
  </button>
  </div>

  {/* METRICS ROW (SUMMARY PRE-HEADER) */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
  <div className="bg-[#030306] border border-white/5 p-4 rounded-2xl flex flex-col text-left">
   <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">Total Prospectos</span>
   <span className="text-xl font-bold font-mono text-white mt-1">{totalCount}</span>
  </div>
  <div className="bg-[#030306] border border-white/5 p-4 rounded-2xl flex flex-col text-left">
   <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">Responde / Contacto</span>
   <span className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-baseline gap-1.5">
   {answerRate}% <span className="text-[10px] text-slate-400 font-normal">({answeredCount})</span>
   </span>
  </div>
  <div className="bg-[#030306] border border-white/5 p-4 rounded-2xl flex flex-col text-left">
   <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">¿Era el dueño?</span>
   <span className="text-xl font-bold font-mono text-violet-400 mt-1 flex items-baseline gap-1.5">
   {ownerDecisionRate}% <span className="text-[10px] text-slate-400 font-normal">({ownerCount})</span>
   </span>
  </div>
  <div className="bg-[#030306] border border-white/5 p-4 rounded-2xl flex flex-col text-left">
   <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">Llamar Hoy / Pendientes</span>
    <span className="text-xl font-bold font-mono text-amber-500 mt-1">{todayTaskNotificationsCount} hoy</span>
  </div>
  </div>

  {/* TAB 1: LISTADO DE PROSPECTOS */}
  {activeTab === 'leads' && (
  <div className="space-y-4 relative z-10">
   
   {/* SEARCH & FILTERS CONTROLS */}
   <div className="bg-[#030306]/80 backdrop-blur-md rounded-2xl border border-white/5 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
   
   {/* Search Input */}
   <div className="relative w-full md:w-80">
    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
    <Search className="w-4 h-4" />
    </span>
    <input
    type="text"
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    placeholder="Buscar negocio, dueño, teléfono, notas..."
    className="w-full bg-slate-950/80 border border-white/5 text-xs text-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:border-violet-500 focus:outline-none transition-all placeholder:text-slate-500"
    />
   </div>

   {/* Quick Filter Pill Buttons */}
   <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
    
    {/* View Mode Toggle (List vs Grid) */}
    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/5">
    <button
     onClick={() => setViewMode('list')}
     className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
     viewMode === 'list' ?
      'bg-violet-650/30 text-violet-400 border border-violet-500/30 shadow-[0_0_8px_rgba(139,92,246,0.15)]'
      : 'text-slate-400 hover:text-white hover:bg-white/[0.01] border border-transparent'
     }`}
     title="Vista de Lista"
    >
     <List className="w-3.5 h-3.5" />
     <span className="text-[10px] uppercase font-mono px-0.5">Lista</span>
    </button>
    <button
     onClick={() => setViewMode('grid')}
     className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
     viewMode === 'grid' ?
      'bg-violet-650/30 text-violet-400 border border-violet-500/30 shadow-[0_0_8px_rgba(139,92,246,0.15)]'
      : 'text-slate-400 hover:text-white hover:bg-white/[0.01] border border-transparent'
     }`}
     title="Vista de Cuadrícula"
    >
     <Grid className="w-3.5 h-3.5" />
     <span className="text-[10px] uppercase font-mono px-0.5">Mosaico</span>
    </button>
    </div>
    
    {/* Temperature Selector badges */}
    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5">
    {(['Todos', 'Frío', 'Templado', 'Caliente'] as const).map(opt => {
     return (
     <button
      key={opt}
      onClick={() => setTempFilter(opt)}
      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
      tempFilter === opt ?
       'bg-violet-600/20 text-violet-400 border border-violet-500/30'
       : 'text-slate-400 hover:text-white hover:bg-white/[0.01]'
      }`}
     >
      {opt}
     </button>
     );
    })}
    </div>

    {/* Assignments Selector (Admin Exclusive) */}
    {isAdmin && (
    <div className="flex items-center gap-1">
     <span className="text-[10px] font-mono text-slate-500 uppercase">Asignado:</span>
     <select
     value={assignedFilter}
     onChange={(e) => setAssignedFilter(e.target.value)}
     className="bg-slate-950 border border-white/5 text-[11px] text-slate-300 px-3 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-violet-500 text-left font-sans"
     >
     <option value="todos">Todos</option>
     <option value="unassigned">Sin asignar</option>
     {allAssignees.map(com => (
      <option key={com.id} value={com.email}>{com.name} ({com.role})</option>
     ))}
     </select>
    </div>
    )}

    {currentComercial && (
    <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-950 p-1">
     <select value={groupFilter} onChange={event => setGroupFilter(event.target.value)} className="max-w-[170px] bg-transparent px-2 py-1 text-[10px] font-bold text-slate-300 outline-none">
      <option value="all">Todos los grupos</option>
      <option value="ungrouped">Sin grupo</option>
      {prospectGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
     </select>
     <button type="button" onClick={() => setShowGroupsModal(true)} className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-violet-300 transition hover:bg-violet-500/20" title="Crear y gestionar grupos internos"><FolderPlus className="h-3.5 w-3.5"/>Grupos</button>
    </div>
    )}

    {/* Solo mis asignados toggle */}
    {!currentComercial && (
    <button
     onClick={() => setShowOnlySelf(!showOnlySelf)}
     className={`p-2 rounded-xl border font-bold transition-all flex items-center justify-center gap-1 bg-slate-950 cursor-pointer ${
     showOnlySelf  ?
      'border-violet-500 text-violet-400 bg-violet-600/5 shadow-[0_0_8px_rgba(139,92,246,0.15)]' 
      : 'border-white/5 text-slate-400 hover:text-white'
     }`}
     title="Mostrar solo los asignados a ti"
    >
     <Users className="w-3.5 h-3.5 text-violet-400" />
     <span className="text-[10px] uppercase font-mono tracking-wider">Solo Míos</span>
    </button>
    )}

    {/* Archived toggle */}
    <button
    onClick={() => {
     const next = !showPostponed;
     setShowPostponed(next);
     if (next) setShowArchived(false);
    }}
    className={`p-2 rounded-xl border font-bold transition-all flex items-center justify-center gap-1 bg-slate-950 cursor-pointer ${
     showPostponed ?
      'border-amber-500 text-amber-300 bg-amber-600/5'
     : 'border-white/5 text-slate-400 hover:text-white'
    }`}
    title="Ver llamadas pospuestas"
    >
    <Clock className="w-3.5 h-3.5" />
    <span className="text-[10px] uppercase font-mono tracking-wider">Pospuestos</span>
    </button>

    <button
    onClick={() => {
     const next = !showArchived;
     setShowArchived(next);
     if (next) setShowPostponed(false);
    }}
    className={`p-2 rounded-xl border font-bold transition-all flex items-center justify-center gap-1 bg-slate-950 cursor-pointer ${
     showArchived  ?
     'border-violet-500 text-violet-400 bg-violet-600/5' 
     : 'border-white/5 text-slate-400 hover:text-white'
    }`}
    title="Ver Leads Archivados"
    >
    <Archive className="w-3.5 h-3.5" />
    <span className="text-[10px] uppercase font-mono tracking-wider">Archivados</span>
    </button>

   </div>

   </div>

   {isAdmin && (
   <div className="bg-[#050508]/90 border border-violet-500/20 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
    <div className="flex items-center gap-3">
    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
     <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="accent-violet-500 w-4 h-4" />
     Seleccionar visibles
    </label>
    <span className="text-[10px] font-mono text-violet-400">{selectedLeadIds.length} seleccionados</span>
    </div>
    <div className="flex flex-wrap items-center gap-2">
    <select value={bulkAssigneeEmail} onChange={event => setBulkAssigneeEmail(event.target.value)} disabled={bulkActionRunning} className="bg-slate-950 border border-white/10 text-xs text-slate-300 px-3 py-2 rounded-xl outline-none focus:border-violet-500">
     <option value="unassigned">Sin asignar</option>
     {allAssignees.map(assignee => <option key={assignee.id} value={assignee.email}>{assignee.name} ({assignee.role})</option>)}
    </select>
    <button onClick={handleBulkAssign} disabled={!selectedLeadIds.length || bulkActionRunning} className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold">
     Asignar selección
    </button>
    <button onClick={handleBulkDelete} disabled={!selectedLeadIds.length || bulkActionRunning} className="px-3 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 border border-rose-500/25 disabled:opacity-40 text-rose-400 text-xs font-bold flex items-center gap-1.5">
     <Trash2 className="w-3.5 h-3.5" /> Eliminar
    </button>
    </div>
   </div>
   )}

   {/* LEADS LIST / CARDS CONTAINER */}
   {visibleLeads.length === 0 ? (
   <div className="text-center py-16 bg-[#030306]/40 rounded-2.5xl border border-white/5">
    <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
    <ClipboardList className="w-5 h-5 text-slate-400" />
    </div>
    <p className="text-slate-400 text-xs font-semibold">No se encontraron prospectos de cold calling.</p>
    <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto mt-1 leading-relaxed">
    Prueba ajustando los filtros de búsqueda o temperatura, o crea un nuevo prospecto de llamada desde la cabecera.
    </p>
   </div>
   ) : viewMode === 'list' ? (
   /* LIST VIEW (DEFAULT) */
   <div className="bg-[#030306]/60 border border-white/5 rounded-2.5xl overflow-hidden divide-y divide-white/5">
    
    {/* TABLE HEADER (hidden on mobile) */}
    <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3.5 bg-slate-950/80 text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold items-center">
    <div className="col-span-1">Posición</div>
    <div className="col-span-2">Nombre</div>
    <div className="col-span-2">Teléfono</div>
    <div className="col-span-1 text-center">Tiene web</div>
    <div className="col-span-2">Website / Maps</div>
    <div className="col-span-2 text-center">Asignado a</div>
    <div className="col-span-2 text-right">Acciones</div>
    </div>

    {/* LIST ROWS */}
    {visibleLeads.map(lead => {
    
    // Styling corresponding to visual temperature
    let tempBadge = '';
    let bgStyle = '';
    if (lead.temperature === 'Caliente') {
     tempBadge = 'bg-rose-500/10 text-rose-455 border border-rose-550/25';
     bgStyle = 'bg-gradient-to-r from-rose-950/15 via-[#030306]/40 to-transparent hover:from-rose-950/25 border-l-2 border-l-rose-500';
    } else if (lead.temperature === 'Templado') {
     tempBadge = 'bg-amber-500/10 text-amber-455 border border-amber-550/25';
     bgStyle = 'bg-gradient-to-r from-amber-950/15 via-[#030306]/40 to-transparent hover:from-amber-950/25 border-l-2 border-l-amber-500';
    } else {
     tempBadge = 'bg-sky-500/10 text-sky-455 border border-sky-550/25';
     bgStyle = 'bg-gradient-to-r from-sky-950/15 via-[#030306]/40 to-transparent hover:from-sky-950/25 border-l-2 border-l-sky-550';
    }
    const isAdminLockedAppointment = lead.archived && lead.callbackScheduled === 'Sí';
    const lockedForComercial = !isAdmin && isAdminLockedAppointment;
    const callbackIsDue = lead.callbackScheduled === 'Llamar más tarde' && getCallbackTimestamp(lead) <= filterNow;

    return (
     <div 
     key={lead.id}
     className={`grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-5 py-4 sm:px-6 items-center text-left transition duration-200 ${bgStyle} ${lead.archived ? 'opacity-65 border-dashed border-red-500/10' : ''}`}
     >
     <div className="col-span-1 flex items-center gap-2">
      {isAdmin && <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} className="accent-violet-500 w-4 h-4 shrink-0" />}
      <span className="text-xs font-mono font-bold text-slate-300">—</span>
     </div>

     {/* Business Column */}
     <div className="col-span-2 space-y-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
      <button
       onClick={(e) => {
       e.stopPropagation();
       onUpdateColdLead({
        ...lead,
        isDone: !lead.isDone
       });
       }}
       className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ${
       lead.isDone  ?
        'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' 
        : 'border-white/10 text-transparent hover:border-white/30 hover:bg-white/[0.02]'
       }`}
       title={lead.isDone ? "Marcar como pendiente" : "Marcar como hecho (llamado)"}
      >
       <Check className="w-3.5 h-3.5 stroke-[3px]" />
      </button>
      <h4 className={`font-bold text-xs sm:text-sm text-white transition-all ${lead.isDone ? 'line-through text-slate-500' : ''}`}>{lead.businessName}</h4>
      {lead.archived && (
       <span className="text-[8px] bg-amber-500/10 text-amber-450 border border-amber-500/20 font-bold px-1.5 py-0.5 rounded uppercase">Archivado</span>
      )}
      {lead.callbackScheduled === 'Llamar más tarde' && lead.callbackDate && (
       <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide shadow-lg ${callbackIsDue ? 'border-rose-300/35 bg-rose-400/15 text-rose-100 shadow-rose-500/10' : 'border-amber-300/30 bg-amber-400/15 text-amber-200 shadow-amber-500/10'}`}>
       <Calendar className={`h-3.5 w-3.5 ${callbackIsDue ? 'text-rose-300' : 'text-amber-300'}`} />
       <span className={callbackIsDue ? 'text-rose-300' : 'text-amber-300/70'}>{callbackIsDue ? 'Llamar ahora' : 'Próxima'}</span>
       <span className="text-white">{formatCallbackDate(lead.callbackDate)}</span>
       {lead.callbackTime && <span className={callbackIsDue ? 'text-rose-300' : 'text-amber-300'}>· {lead.callbackTime}</span>}
       </span>
      )}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono flex-wrap">
      <span>ID Pág: {lead.id}</span>
      {lead.callDate && <span>• Última: {lead.callDate}</span>}
      <button
       onClick={() => setExpandedLeadLogs(prev => ({ ...prev, [lead.id]: !prev[lead.id] }))}
       className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition cursor-pointer select-none font-bold ${
       expandedLeadLogs[lead.id] ?
        'bg-violet-500/25 text-violet-300 border border-violet-500/30'
        : 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400'
       }`}
       title="Click para ver historial de llamadas"
      >
       {lead.callsCount || 0} {lead.callsCount === 1 ? 'llamada' : 'llamadas'}
      </button>
      </div>
      {currentComercial && (
      <label className="mt-2 flex max-w-full items-center gap-1.5 rounded-lg border border-white/5 bg-black/25 px-2 py-1">
       <Folder className="h-3 w-3 shrink-0" style={{ color: prospectGroups.find(group => group.id === lead.prospectGroupId)?.color || '#64748B' }} />
       <select value={lead.prospectGroupId || ''} onChange={event => void assignLeadToGroup(lead, event.target.value)} className="min-w-0 flex-1 bg-transparent text-[9px] font-bold text-slate-300 outline-none">
        <option value="">Sin grupo</option>
        {prospectGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
       </select>
      </label>
      )}
      {isAdmin && (
      <select value={lead.demoWebsiteId || ''} onChange={e => onUpdateColdLead({ ...lead, demoWebsiteId: e.target.value || undefined })} className="mt-2 max-w-full bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 rounded-lg px-2 py-1 text-[9px] outline-none">
       <option value="">Asignar web demo...</option>
       {demoSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select>
      )}
     </div>

     {/* Phone Link Column */}
     <div className="col-span-2">
      <a 
      href={`tel:${lead.phone}`}
      className="inline-flex items-center gap-2 bg-[#05050c] border border-white/5 py-1.5 px-3 rounded-xl text-xs text-violet-400 font-mono font-bold hover:text-white hover:border-violet-500/30 hover:bg-violet-950/20 transition shadow-sm"
      >
      <Phone className="w-3.5 h-3.5" />
      <span>{lead.phone}</span>
      </a>
     </div>

     <div className="col-span-1 lg:text-center">
      <span className={`inline-flex text-[10px] font-bold px-2 py-1 rounded-full border ${(lead.hasWebsite !== false && isOwnWebsite(lead.website)) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-white/10 text-slate-500'}`}>
      {(lead.hasWebsite !== false && isOwnWebsite(lead.website)) ? 'Si' : 'No'}
      </span>
     </div>

     <div className="col-span-2 min-w-0 space-y-1">
      {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="block truncate text-[10px] text-cyan-400 hover:underline" title={lead.website}>{lead.website}</a> : <span className="text-[10px] text-slate-600">Sin website</span>}
      {lead.mapsUrl ? <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className="block truncate text-[10px] text-violet-400 hover:underline" title={lead.mapsUrl}>Abrir en Maps</a> : <span className="block text-[10px] text-slate-600">Sin Maps</span>}
     </div>

     {/* Assignee Column (Clickable dropdown for admin) */}
     <div className="col-span-2 lg:text-center flex items-center gap-2 lg:justify-center overflow-hidden min-w-0 w-full">
      <span className="lg:hidden text-[10px] font-mono text-slate-500 uppercase shrink-0">Responsable:</span>
      {isAdmin ? (
      <select
       value={lead.assignedToEmail || 'unassigned'}
       onChange={(e) => {
       const email = e.target.value;
       const matched = allAssignees.find(c => c.email === email);
       onUpdateColdLead({
        ...lead,
        assignedToEmail: email,
        assignedToName: matched ? matched.name : 'Sin asignar'
       });
       }}
       className="text-[10px] bg-[#020205] border border-violet-500/25 text-violet-300 px-2 py-1.5 rounded-xl font-mono cursor-pointer focus:outline-none hover:border-violet-400 focus:border-violet-500 transition font-sans w-full max-w-[130px] truncate"
      >
       <option value="unassigned">Sin asignar</option>
       {allAssignees.map(com => (
       <option key={com.id} value={com.email}>{com.name} ({com.role})</option>
       ))}
      </select>
      ) : (
      <span className="text-[11px] bg-slate-900 border border-white/5 text-slate-300 px-2.5 py-1 rounded-lg font-sans w-full max-w-[130px] truncate block text-center" title={lead.assignedToName || 'Sin asignar'}>
       {lead.assignedToName || 'Sin asignar'}
      </span>
      )}
     </div>

     {/* Action Column */}
     <div className="col-span-2 text-right flex items-center lg:justify-end justify-between gap-1.5 mt-2 lg:mt-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
      {lockedForComercial ? (
      <span className="ml-auto inline-flex items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
       Cita enviada a admins
      </span>
      ) : (
      <>
       {(() => {
       const site = demoSites.find(item => item.id === lead.demoWebsiteId);
       return site ? <>
        <a href={site.publicUrl} target="_blank" rel="noreferrer" className="py-1.5 px-2 bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-[10px] font-bold rounded-xl whitespace-nowrap">Ver web</a>
        {isAdmin && site.adminUrl && <a href={site.adminUrl} target="_blank" rel="noreferrer" className="py-1.5 px-2 bg-fuchsia-500/10 border border-fuchsia-400/20 text-fuchsia-300 text-[10px] font-bold rounded-xl whitespace-nowrap">Panel admin</a>}
       </> : null;
       })()}
       <button
       onClick={() => handleOpenCallLog(lead)}
       className="py-1.5 px-3 bg-violet-600/10 hover:bg-violet-600/30 border border-violet-500/20 text-violet-305 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
       title="Registrar llamada / Formulario"
       >
       <ClipboardList className="w-3.5 h-3.5 text-violet-400" />
       <span>Resolver</span>
       </button>

       {currentComercial && (
       <button onClick={() => handleToggleArchive(lead)} className={`p-1.5 rounded-lg border transition-all ${lead.archived ? 'bg-amber-500/15 border-amber-400/30 text-amber-300 hover:bg-amber-500/25' : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-amber-400/25 hover:text-amber-300'}`} title={lead.archived ? 'Desarchivar prospecto' : 'Archivar prospecto'}>
        <Archive className="h-3.5 w-3.5" />
       </button>
       )}

       {isAdmin && (
       <div className="flex items-center gap-1">
        <button
        onClick={() => handleConvertToClient(lead)}
        className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:text-white transition-all cursor-pointer"
        title="Convertir en Cliente (Pasar a CRM)"
        >
        <UserPlus className="w-3.5 h-3.5" />
        </button>

        <button
        onClick={() => handleOpenScheduleMeeting(lead)}
        className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 hover:text-white transition-all cursor-pointer"
        title="Agendar Cita Presencial en Calendario"
        >
        <Calendar className="w-3.5 h-3.5" />
        </button>

        <button
        onClick={() => handleToggleArchive(lead)}
        className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
         lead.archived  ?
          'bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-slate-900' 
         : 'bg-slate-900/60 border-white/5 text-slate-450 hover:text-white hover:border-slate-500/30'
        }`}
        title={lead.archived ? 'Desarchivar' : 'Archivar'}
        >
        <Archive className="w-3.5 h-3.5" />
        </button>
        
        <button
        onClick={() => {
         setDeleteConfirmLeadId(lead.id);
        }}
        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:text-white hover:bg-rose-550 transition-colors cursor-pointer"
        title="Eliminar"
        >
        <Trash2 className="w-3.5 h-3.5" />
        </button>
       </div>
       )}
      </>
      )}
     </div>

     {/* EXPANDABLE CALL HISTORY TIMELINE BOX */}
     {expandedLeadLogs[lead.id] && (
      <div className="col-span-1 lg:col-span-12 mt-2 p-4 bg-slate-950/65 border border-white/5 rounded-2xl space-y-3">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
       <span className="font-mono text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
       📞 Historial de Llamadas de {lead.businessName}
       </span>
       <div className="flex items-center gap-2">
       <button
        type="button"
        onClick={() => {
        if (inlineAddingLeadId === lead.id) {
         setInlineAddingLeadId(null);
        } else {
         setInlineAddingLeadId(lead.id);
         setInlineAddingLogNotes('');
         setInlineAddingLogResult('Llamada realizada');
         setInlineAddingLogDate(new Date().toLocaleDateString('es-ES', {
         day: '2-digit',
         month: '2-digit',
         year: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
         }));
        }
        }}
        className="text-[9px] bg-violet-600 hover:bg-violet-500 text-white font-bold px-2 py-0.5 rounded transition cursor-pointer select-none"
       >
        {inlineAddingLeadId === lead.id ? '✕ Cancelar' : '+ Registrar Llamada'}
       </button>
       <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
        {lead.callsLog?.length || 0} llamadas en total
       </span>
       </div>
      </div>

      {inlineAddingLeadId === lead.id && (
       <div className="bg-violet-950/20 border border-violet-500/30 rounded-xl p-3 space-y-2 text-left max-w-md">
       <span className="text-[9px] font-mono font-bold text-violet-300 uppercase tracking-wider">
        Registrar Llamada Manual
       </span>
       
       <div className="space-y-1">
        <label className="text-[8px] text-slate-450 font-bold uppercase font-mono">Fecha / Hora</label>
        <input
        type="text"
        value={inlineAddingLogDate}
        onChange={e => setInlineAddingLogDate(e.target.value)}
        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
        placeholder="Ej. DD/MM/AAAA HH:MM"
        />
       </div>

       <div className="space-y-1">
        <label className="text-[8px] text-slate-450 font-bold uppercase font-mono">Notas de la llamada</label>
        <textarea
        rows={2}
        value={inlineAddingLogNotes}
        onChange={e => setInlineAddingLogNotes(e.target.value)}
        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500 resize-none"
        placeholder="Escribe comentarios de esta llamada..."
        />
       </div>

       <div className="space-y-1">
        <label className="text-[8px] text-slate-450 font-bold uppercase font-mono">Resultado</label>
        <input
        type="text"
        value={inlineAddingLogResult}
        onChange={e => setInlineAddingLogResult(e.target.value)}
        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
        placeholder="Ej. Contactado: Sí | Responde: Sí"
        />
       </div>

       <button
        type="button"
        onClick={() => handleAddInlineLogGeneric(lead)}
        className="w-full text-center py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-[10px] transition cursor-pointer mt-1"
       >
        Guardar en Historial
       </button>
       </div>
      )}

      {(!lead.callsLog || lead.callsLog.length === 0) ? (
       <p className="text-[11px] text-slate-500 italic text-center py-2">No hay llamadas registradas anteriormente en el historial.</p>
      ) : (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-white/5">
       {lead.callsLog.map((log: any, idx: number) => {
        const logId = log.id || `log_${idx}`;
        const isEditing = inlineEditingLeadId === lead.id && inlineEditingLogId === logId;
        return (
        <div key={logId} className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-2 relative group">
         {isEditing ? (
         <div className="space-y-2 text-left">
          <div className="space-y-1">
          <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Fecha / Hora</label>
          <input
           type="text"
           value={inlineEditingLogDate}
           onChange={e => setInlineEditingLogDate(e.target.value)}
           className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
          />
          </div>

          <div className="space-y-1">
          <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Notas de la llamada</label>
          <textarea
           rows={2}
           value={inlineEditingLogNotes}
           onChange={e => setInlineEditingLogNotes(e.target.value)}
           className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500 resize-none"
          />
          </div>

          <div className="space-y-1">
          <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Resultado</label>
          <input
           type="text"
           value={inlineEditingLogResult}
           onChange={e => setInlineEditingLogResult(e.target.value)}
           className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
          />
          </div>

          <div className="flex gap-2 justify-end pt-1">
          <button
           type="button"
           onClick={() => {
           setInlineEditingLeadId(null);
           setInlineEditingLogId(null);
           }}
           className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded hover:bg-slate-700 cursor-pointer"
          >
           Cancelar
          </button>
          <button
           type="button"
           onClick={() => handleSaveEditLogGeneric(lead)}
           className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold hover:bg-emerald-500 cursor-pointer"
          >
           Guardar
          </button>
          </div>
         </div>
         ) : (
         <>
          <div className="flex justify-between items-center">
          <span className="text-[10px] text-violet-400 font-mono font-bold">{log.date}</span>
          <div className="flex items-center gap-1.5 opacity-65 group-hover:opacity-100 transition-opacity">
           <button
           type="button"
           onClick={() => {
            setInlineEditingLeadId(lead.id);
            setInlineEditingLogId(logId);
            setInlineEditingLogNotes(log.notes);
            setInlineEditingLogResult(log.result || '');
            setInlineEditingLogDate(log.date);
           }}
           className="text-violet-400 hover:text-violet-300 font-bold p-1 rounded hover:bg-violet-500/10 transition cursor-pointer flex items-center justify-center"
           title="Editar registro"
           >
           <Edit3 className="w-3.5 h-3.5" />
           </button>
           <button
           type="button"
           onClick={() => handleDeleteLogItemGeneric(lead, logId)}
           className="text-rose-400 hover:text-rose-300 font-bold p-1 rounded hover:bg-rose-500/10 transition cursor-pointer flex items-center justify-center"
           title="Borrar registro"
           >
           <Trash2 className="w-3.5 h-3.5" />
           </button>
           <span className="text-[8px] bg-white/5 text-slate-400 font-mono px-1.5 py-0.5 rounded">
           #{lead.callsLog.length - idx}
           </span>
          </div>
          </div>
          <p className="text-[11px] text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
          {log.notes}
          </p>
          <div className="text-[9px] bg-white/[0.02] border border-white/5 p-1.5 rounded-lg text-slate-450 font-mono leading-tight">
          {log.result}
          </div>
         </>
         )}
        </div>
        );
       })}
       </div>
      )}
      </div>
     )}

     </div>
    );
    })}
   </div>
   ) : (
   /* GRID VIEW (MOSAICO) */
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
   {visibleLeads.map(lead => {
    
    // Styling corresponding to visual temperature (Aesthetic colors)
    let tempBadge = '';
    let bgStyle = '';
    if (lead.temperature === 'Caliente') {
     tempBadge = 'bg-rose-500/10 text-rose-400 border border-rose-550/25 shadow-[0_0_12px_rgba(244,63,94,0.15)]';
     bgStyle = 'bg-gradient-to-br from-[#1c0c16]/75 via-[#030306]/95 to-[#0c0409]/95 border-rose-500/25 hover:border-rose-500/45 shadow-lg shadow-rose-950/10';
    } else if (lead.temperature === 'Templado') {
     tempBadge = 'bg-amber-500/10 text-amber-400 border border-amber-550/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]';
     bgStyle = 'bg-gradient-to-br from-[#1c140c]/75 via-[#030306]/95 to-[#0c0804]/95 border-amber-500/20 hover:border-amber-500/40 shadow-lg shadow-amber-950/10';
    } else {
     tempBadge = 'bg-sky-500/10 text-sky-455 border border-sky-550/25 shadow-[0_0_12px_rgba(14,165,233,0.15)]';
     bgStyle = 'bg-gradient-to-br from-[#0c141c]/75 via-[#030306]/95 to-[#04080c]/95 border-sky-500/15 hover:border-sky-500/35 shadow-lg shadow-sky-950/10';
    }
    const callbackIsDue = lead.callbackScheduled === 'Llamar más tarde' && getCallbackTimestamp(lead) <= filterNow;
    const isAdminLockedAppointment = lead.archived && lead.callbackScheduled === 'Sí';
    const lockedForComercial = !isAdmin && isAdminLockedAppointment;

    return (
     <div 
     key={lead.id} 
     className={`border ${lead.archived ? 'border-dashed border-red-500/20' : 'border-white/5'} ${bgStyle} p-5 rounded-2.5xl transition-all duration-200 flex flex-col justify-between text-left`}
     >
     <div>
      {/* Badge Temperature & Assignee */}
      <div className="flex justify-between items-start gap-2 mb-3">
      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${tempBadge} flex items-center gap-1`}>
       {lead.temperature === 'Caliente' ? <Flame className="w-3 h-3 text-rose-455 fill-rose-500 animate-pulse" /> : 
       lead.temperature === 'Templado' ? <Zap className="w-3 h-3 text-amber-400" /> : 
       <Snowflake className="w-3 h-3 text-sky-450" />}
       {lead.temperature}
      </span>

      {isAdmin ? (
       <select
       value={lead.assignedToEmail || 'unassigned'}
       onChange={(e) => {
        const email = e.target.value;
        const matched = allAssignees.find(c => c.email === email);
        onUpdateColdLead({
        ...lead,
        assignedToEmail: email,
        assignedToName: matched ? matched.name : 'Sin asignar'
        });
       }}
       className="text-[9px] bg-[#020205] border border-violet-500/30 text-violet-300 px-2 py-0.5 rounded-md font-mono max-w-[130px] cursor-pointer focus:outline-none hover:border-violet-400 transition"
       >
       <option value="unassigned">Sin asignar</option>
       {allAssignees.map(com => (
        <option key={com.id} value={com.email}>{com.name} ({com.role})</option>
       ))}
       </select>
      ) : (
       <span className="text-[9px] bg-slate-900 border border-white/5 text-slate-400 px-2 py-0.5 rounded-md font-mono max-w-[120px] truncate" title={lead.assignedToEmail}>
       {lead.assignedToName || 'Sin asignar'}
       </span>
      )}
      </div>

      {currentComercial && (
      <label className="mb-3 flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
       <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: prospectGroups.find(group => group.id === lead.prospectGroupId)?.color || '#64748B' }} />
       <select value={lead.prospectGroupId || ''} onChange={event => void assignLeadToGroup(lead, event.target.value)} className="min-w-0 flex-1 bg-transparent text-[10px] font-bold text-slate-300 outline-none">
        <option value="">Sin grupo</option>
        {prospectGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
       </select>
      </label>
      )}

      {/* Business & Contact Name */}
      <div className="flex items-center justify-between gap-2 mt-1 mb-1">
      <div className="flex items-center gap-2 truncate">
       <button
       onClick={(e) => {
        e.stopPropagation();
        onUpdateColdLead({
        ...lead,
        isDone: !lead.isDone
        });
       }}
       className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ${
        lead.isDone  ?
        'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' 
        : 'border-white/10 text-transparent hover:border-white/30 hover:bg-white/[0.02]'
       }`}
       title={lead.isDone ? "Marcar como pendiente" : "Marcar como hecho (llamado)"}
       >
       <Check className="w-3 h-3 stroke-[3px]" />
       </button>
       <h3 className={`text-sm font-bold text-white line-clamp-1 ${lead.isDone ? 'line-through text-slate-500' : ''}`} title={lead.businessName}>{lead.businessName}</h3>
      </div>
      <button
       onClick={() => setExpandedLeadLogs(prev => ({ ...prev, [lead.id]: !prev[lead.id] }))}
       className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded transition cursor-pointer select-none font-bold flex-shrink-0 ${
       expandedLeadLogs[lead.id] ?
        'bg-violet-500/25 text-violet-300 border border-violet-500/30 font-extrabold'
        : 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400'
       }`}
       title="Click para ver historial de llamadas"
      >
       📞 {lead.callsCount || 0}
      </button>
      </div>
      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
      <span className="text-slate-500 text-xs font-mono">👨‍💼</span>
      <span className="font-semibold text-slate-305">{lead.contactPerson}</span>
      </div>

      {/* Phone Display and Quick action */}
      <a 
      href={`tel:${lead.phone}`}
      className="mt-3 inline-flex items-center gap-2 bg-[#050508] border border-white/5 px-3 py-1.5 rounded-xl text-xs text-violet-400 font-mono font-bold hover:text-white hover:border-violet-500/30 transition shadow-sm w-full"
      >
      <Phone className="w-3.5 h-3.5 text-violet-400" />
      <span>{lead.phone}</span>
      </a>

      {/* CALL FORM LOGICAL STATUS MATRIX */}
      <div className="grid grid-cols-3 gap-1.5 mt-3.5 pt-3.5 border-t border-white/5">
      <div className="text-center bg-slate-950/40 p-1.5 rounded-xl border border-white/5 flex flex-col justify-center">
       <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none">Contact</span>
       <span className={`text-[10px] font-bold mt-1 ${lead.contacted === 'Sí' ? 'text-emerald-450' : 'text-slate-505'}`}>
       {lead.contacted === 'Sí' ? '✔️ Sí' : '❌ No'}
       </span>
      </div>
      <div className="text-center bg-slate-950/40 p-1.5 rounded-xl border border-white/5 flex flex-col justify-center">
       <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none">¿Dueño?</span>
       <span className={`text-[10px] font-bold mt-1 ${lead.isOwner === 'Sí' ? 'text-violet-400' : 'text-slate-505'}`}>
       {lead.isOwner === 'Sí' ? '✔️ Sí' : '❌ No'}
       </span>
      </div>
      <div className="text-center bg-slate-950/40 p-1.5 rounded-xl border border-white/5 flex flex-col justify-center">
       <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none">Responde</span>
       <span className={`text-[10px] font-bold mt-1 ${lead.answered === 'Sí' ? 'text-sky-400' : 'text-slate-505'}`}>
       {lead.answered === 'Sí' ? '✔️ Sí' : '❌ No'}
       </span>
      </div>
      </div>

      {/* Postponed callback status details */}
      {lead.callbackScheduled === 'Llamar más tarde' && lead.callbackDate && (
      <div className={`mt-3 flex items-center justify-between rounded-xl border p-3 text-left shadow-[inset_0_1px_rgba(255,255,255,.03)] ${callbackIsDue ? 'border-rose-300/30 bg-rose-400/[0.09]' : 'border-amber-300/25 bg-amber-400/[0.08]'}`}>
       <div className={`flex items-center gap-2.5 ${callbackIsDue ? 'text-rose-300' : 'text-amber-300'}`}>
       <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${callbackIsDue ? 'border-rose-300/25 bg-rose-300/10' : 'border-amber-300/20 bg-amber-300/10'}`}><Clock className="h-4 w-4" /></div>
       <div className="leading-snug">
        <p className={`text-[8px] font-black uppercase tracking-[.18em] ${callbackIsDue ? 'text-rose-300' : 'text-amber-300/70'}`}>{callbackIsDue ? 'Llamar ahora' : 'Próxima llamada'}</p>
        <p className="mt-0.5 text-sm font-black tracking-wide text-white">{formatCallbackDate(lead.callbackDate)} <span className={callbackIsDue ? 'text-rose-300' : 'text-amber-300'}>· {lead.callbackTime || 'Sin hora'}</span></p>
       </div>
       </div>
       <span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${callbackIsDue ? 'border-rose-300/20 bg-rose-300/10 text-rose-300' : 'border-amber-300/15 bg-amber-300/10 text-amber-300'}`}>{callbackIsDue ? 'Vencida' : 'Pospuesta'}</span>
      </div>
      )}

      {/* Notes Box */}
      <p className="text-[11px] text-slate-450 italic line-clamp-2 mt-3.5 bg-slate-950/25 p-2 rounded-xl text-left border border-white/[0.02]" title={lead.notes}>
      " {lead.notes || 'Sin valoraciones iniciales.'} "
      </p>
     </div>

     {/* ACTIONS ROW */}
     <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-white/5">
      {lockedForComercial ? (
      <span className="w-full inline-flex items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
       Cita enviada a admins
      </span>
      ) : (
      <>
       <button
       onClick={() => handleOpenCallLog(lead)}
       className="flex-1 py-1.5 px-3 bg-violet-600/10 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
       >
       <ClipboardList className="w-3.5 h-3.5" />
       <span>Formulario / Registrar Llamada</span>
       </button>

       {currentComercial && (
       <button onClick={() => handleToggleArchive(lead)} className={`p-1.5 rounded-lg border transition-all ${lead.archived ? 'bg-amber-500/15 border-amber-400/30 text-amber-300 hover:bg-amber-500/25' : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-amber-400/25 hover:text-amber-300'}`} title={lead.archived ? 'Desarchivar prospecto' : 'Archivar prospecto'}>
        <Archive className="h-3.5 w-3.5" />
       </button>
       )}

       {/* Admin Controls */}
       {isAdmin && (
       <div className="flex items-center gap-1.5">
        <button
        onClick={() => handleConvertToClient(lead)}
        className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:text-white transition-all cursor-pointer"
        title="Convertir en Cliente (Pasar a CRM)"
        >
        <UserPlus className="w-3.5 h-3.5" />
        </button>

        <button
        onClick={() => handleOpenScheduleMeeting(lead)}
        className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 hover:text-white transition-all cursor-pointer"
        title="Agendar Cita Presencial en Calendario"
        >
        <Calendar className="w-3.5 h-3.5" />
        </button>

        <button
        onClick={() => handleToggleArchive(lead)}
        className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
         lead.archived  ?
          'bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-slate-900' 
         : 'bg-slate-900/60 border-white/5 text-slate-450 hover:text-white hover:border-slate-500/30'
        }`}
        title={lead.archived ? 'Desarchivar' : 'Archivar prospecto'}
        >
        <Archive className="w-3.5 h-3.5" />
        </button>
        
        <button
        onClick={() => {
         setDeleteConfirmLeadId(lead.id);
        }}
        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:text-white hover:bg-rose-550 transition-colors cursor-pointer"
        title="Eliminar de por vida"
        >
        <Trash2 className="w-3.5 h-3.5" />
        </button>
       </div>
       )}
      </>
      )}
     </div>

     {/* EXPANDABLE GRID CALL HISTORY TIMELINE BOX */}
     {expandedLeadLogs[lead.id] && (
      <div className="mt-4 p-3 bg-slate-950/65 border border-white/5 rounded-2xl space-y-3">
      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
       <span className="font-mono text-[9px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
       📞 Historial de Llamadas
       </span>
       <div className="flex items-center gap-1.5">
       <button
        type="button"
        onClick={() => {
        if (inlineAddingLeadId === lead.id) {
         setInlineAddingLeadId(null);
        } else {
         setInlineAddingLeadId(lead.id);
         setInlineAddingLogNotes('');
         setInlineAddingLogResult('Llamada realizada');
         setInlineAddingLogDate(new Date().toLocaleDateString('es-ES', {
         day: '2-digit',
         month: '2-digit',
         year: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
         }));
        }
        }}
        className="text-[8px] bg-violet-600 hover:bg-violet-500 text-white font-bold px-1.5 py-0.5 rounded transition cursor-pointer select-none"
       >
        {inlineAddingLeadId === lead.id ? '✕ Cancelar' : '+ Registrar'}
       </button>
       <span className="text-[9px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full font-mono font-bold">
        {lead.callsLog?.length || 0} llamadas
       </span>
       </div>
      </div>

      {inlineAddingLeadId === lead.id && (
       <div className="bg-violet-950/20 border border-violet-500/30 rounded-xl p-3 space-y-2 text-left">
       <span className="text-[9px] font-mono font-bold text-violet-300 uppercase tracking-wider">
        Registrar Llamada Manual
       </span>
       
       <div className="space-y-1">
        <label className="text-[8px] text-slate-450 font-bold uppercase font-mono">Fecha / Hora</label>
        <input
        type="text"
        value={inlineAddingLogDate}
        onChange={e => setInlineAddingLogDate(e.target.value)}
        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
        placeholder="Ej. DD/MM/AAAA HH:MM"
        />
       </div>

       <div className="space-y-1">
        <label className="text-[8px] text-slate-450 font-bold uppercase font-mono">Notas de la llamada</label>
        <textarea
        rows={2}
        value={inlineAddingLogNotes}
        onChange={e => setInlineAddingLogNotes(e.target.value)}
        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500 resize-none"
        placeholder="Escribe comentarios de esta llamada..."
        />
       </div>

       <div className="space-y-1">
        <label className="text-[8px] text-slate-450 font-bold uppercase font-mono">Resultado</label>
        <input
        type="text"
        value={inlineAddingLogResult}
        onChange={e => setInlineAddingLogResult(e.target.value)}
        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
        placeholder="Ej. Contactado: Sí | Responde: Sí"
        />
       </div>

       <button
        type="button"
        onClick={() => handleAddInlineLogGeneric(lead)}
        className="w-full text-center py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-[10px] transition cursor-pointer mt-1"
       >
        Guardar en Historial
       </button>
       </div>
      )}

      {(!lead.callsLog || lead.callsLog.length === 0) ? (
       <p className="text-[10px] text-slate-500 italic text-center py-1">No hay llamadas registradas.</p>
      ) : (
       <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-white/5">
       {lead.callsLog.map((log: any, idx: number) => {
        const logId = log.id || `log_${idx}`;
        const isEditing = inlineEditingLeadId === lead.id && inlineEditingLogId === logId;
        return (
        <div key={logId} className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5 space-y-1 relative group">
         {isEditing ? (
         <div className="space-y-2 text-left">
          <div className="space-y-1">
          <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Fecha / Hora</label>
          <input
           type="text"
           value={inlineEditingLogDate}
           onChange={e => setInlineEditingLogDate(e.target.value)}
           className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
          />
          </div>

          <div className="space-y-1">
          <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Notas de la llamada</label>
          <textarea
           rows={2}
           value={inlineEditingLogNotes}
           onChange={e => setInlineEditingLogNotes(e.target.value)}
           className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500 resize-none"
          />
          </div>

          <div className="space-y-1">
          <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Resultado</label>
          <input
           type="text"
           value={inlineEditingLogResult}
           onChange={e => setInlineEditingLogResult(e.target.value)}
           className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
          />
          </div>

          <div className="flex gap-2 justify-end pt-1">
          <button
           type="button"
           onClick={() => {
           setInlineEditingLeadId(null);
           setInlineEditingLogId(null);
           }}
           className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded hover:bg-slate-700 cursor-pointer"
          >
           Cancelar
          </button>
          <button
           type="button"
           onClick={() => handleSaveEditLogGeneric(lead)}
           className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold hover:bg-emerald-500 cursor-pointer"
          >
           Guardar
          </button>
          </div>
         </div>
         ) : (
         <>
          <div className="flex justify-between items-center">
          <span className="text-[9px] text-violet-400 font-mono font-bold">{log.date}</span>
          <div className="flex items-center gap-1.5 opacity-65 group-hover:opacity-100 transition-opacity">
           <button
           type="button"
           onClick={() => {
            setInlineEditingLeadId(lead.id);
            setInlineEditingLogId(logId);
            setInlineEditingLogNotes(log.notes);
            setInlineEditingLogResult(log.result || '');
            setInlineEditingLogDate(log.date);
           }}
           className="text-violet-400 hover:text-violet-350 font-bold p-1 rounded hover:bg-violet-500/10 transition cursor-pointer flex items-center justify-center"
           title="Editar registro"
           >
           <Edit3 className="w-3 h-3" />
           </button>
           <button
           type="button"
           onClick={() => handleDeleteLogItemGeneric(lead, logId)}
           className="text-rose-450 hover:text-rose-350 font-bold p-1 rounded hover:bg-rose-500/10 transition cursor-pointer flex items-center justify-center"
           title="Borrar registro"
           >
           <Trash2 className="w-3 h-3" />
           </button>
           <span className="text-[8px] bg-white/5 text-slate-450 font-mono px-1 py-0.5 rounded">
           #{lead.callsLog.length - idx}
           </span>
          </div>
          </div>
          <p className="text-[10px] text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
          {log.notes}
          </p>
          <div className="text-[8px] bg-white/[0.02] border border-white/5 p-1 rounded text-slate-500 font-mono leading-tight">
          {log.result}
          </div>
         </>
         )}
        </div>
        );
       })}
       </div>
      )}
      </div>
     )}

     </div>
    );
    })}
   </div>
   )}

  </div>
  )}

    {/* TAB 2: DASHBOARD DE TAREAS Y CALENDARIO PERSONAL */}
  {activeTab === 'tasks' && (
  <div className="space-y-6 relative z-10 text-slate-300">
   
   {/* Quick Header */}
   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
   <div>
    <h2 className="text-lg font-bold text-white flex items-center gap-2">
    <Calendar className="w-5 h-5 text-violet-400" />
    <span>Citas pospuestas con clientes</span>
    </h2>
    <p className="text-xs text-slate-400 mt-1">
    Agenda operativa dedicada exclusivamente a seguimientos de clientes marcados como "Llamar más tarde".
    </p>
   </div>

   <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-[10px] font-bold text-amber-300">
    Solo citas pospuestas · El calendario completo está en Calendario
   </div>
   </div>

   {/* VIEW SELECTOR SEGMENTED CONTROL */}
   <div className="flex justify-between items-center bg-[#030306]/85 border border-white/5 p-4 rounded-2.5xl flex-wrap gap-4 relative z-10">
   <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 select-none shrink-0">
    <button
    type="button"
    onClick={() => setCalendarViewMode('month')}
    className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
     calendarViewMode === 'month' ?
     'bg-violet-600 text-white shadow'
     : 'text-slate-400 hover:text-white'
    }`}
    >
    <Calendar className="w-3.5 h-3.5" />
    <span>Vista Mensual</span>
    </button>
    <button
    type="button"
    onClick={() => setCalendarViewMode('day')}
    className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
     calendarViewMode === 'day' ?
     'bg-violet-600 text-white shadow'
     : 'text-slate-400 hover:text-white'
    }`}
    >
    <Clock className="w-3.5 h-3.5" />
    <span>Vista del Día (Agenda)</span>
    </button>
   </div>

   <div className="text-right">
    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Fecha seleccionada</span>
    <p className="text-xs font-bold text-violet-400 uppercase font-mono mt-0.5">
    {new Date(selectedTaskDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
    </p>
   </div>
   </div>

   {/* MAIN GRID DASHBOARD */}
   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
   
   {/* LEFT SIDE: INTERACTIVE MONTHLY MINI-CALENDAR */}
   <div className={`lg:col-span-12 w-full ${calendarViewMode === 'month' ? 'block' : 'hidden'} bg-black/60 backdrop-blur-md border border-white/5 p-6 rounded-2.5xl space-y-4 animate-fade-in`}>
    <div className="flex justify-between items-center pb-2 border-b border-white/5">
    <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
     {calendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
    </h3>
    <div className="flex items-center gap-1">
     <button
     onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
     className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
     title="Mes Anterior"
     >
     <ChevronLeft className="w-4 h-4" />
     </button>
     <button
     onClick={() => setCalendarDate(new Date())}
     className="px-2 py-0.5 text-[9px] font-mono text-violet-400 hover:text-white hover:bg-white/5 rounded border border-violet-500/10 transition"
     title="Ir a Hoy"
     >
     Hoy
     </button>
     <button
     onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
     className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
     title="Mes Siguiente"
     >
     <ChevronRight className="w-4 h-4" />
     </button>
    </div>
    </div>

    {/* Weekly Headers */}
    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-bold text-slate-500 uppercase">
    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
     <div key={i}>{day}</div>
    ))}
    </div>

    {/* Days Grid */}
    <div className="grid grid-cols-7 gap-1 text-center">
    {(() => {
     const yr = calendarDate.getFullYear();
     const mn = calendarDate.getMonth();

     const daysInMonth = new Date(yr, mn + 1, 0).getDate();
     const firstDayIndex = new Date(yr, mn, 1).getDay(); // Sunday = 0
     const prevMonthDays = new Date(yr, mn, 0).getDate();

     const cells = [];
     // Prev month padding
     for (let i = firstDayIndex - 1; i >= 0; i--) {
     const dayNum = prevMonthDays - i;
     const prevM = mn === 0 ? 12 : mn;
     const prevY = mn === 0 ? yr - 1 : yr;
     const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
     cells.push({ day: dayNum, isCurrentMonth: false, dateStr: dStr });
     }
     // Current month days
     for (let i = 1; i <= daysInMonth; i++) {
     const dStr = `${yr}-${String(mn + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
     cells.push({ day: i, isCurrentMonth: true, dateStr: dStr });
     }
     // Next month padding to make 42 cells
     const nextNeeded = 42 - cells.length;
     for (let i = 1; i <= nextNeeded; i++) {
     const nextM = mn === 11 ? 1 : mn + 2;
     const nextY = mn === 11 ? yr + 1 : yr;
     const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
     cells.push({ day: i, isCurrentMonth: false, dateStr: dStr });
     }

     return cells.map((cell, idx) => {
     const isSelected = cell.dateStr === selectedTaskDate;
     const isToday = cell.dateStr === new Date().toISOString().split('T')[0];
     
     // Indicators
     const hasCallbacks = coldLeads.some(l => 
      !l.archived && 
      l.assignedToEmail.toLowerCase() === comercialEmail.toLowerCase() && 
      l.callbackScheduled === 'Llamar más tarde' && 
      l.callbackDate === cell.dateStr
     );

     const dayEvs = myEvents.filter(ev => ev.date === cell.dateStr);
     const dayCbs = coldLeads.filter(l => 
      !l.archived && 
      l.assignedToEmail.toLowerCase() === comercialEmail.toLowerCase() && 
      l.callbackScheduled === 'Llamar más tarde' && 
      l.callbackDate === cell.dateStr
     );
     const totalItems = dayEvs.length + dayCbs.length;

     return (
      <button
      key={idx}
      type="button"
      onClick={() => {
       setSelectedTaskDate(cell.dateStr);
       setTaskDate(cell.dateStr);
       setCalendarViewMode('day');
      }}
      className={`min-h-[70px] sm:min-h-[100px] p-2 relative rounded-2xl flex flex-col items-stretch justify-between cursor-pointer transition select-none text-left border ${
       cell.isCurrentMonth 
        ? isSelected
        ?
        'bg-violet-650/15 border-violet-500 text-white shadow-md shadow-violet-500/5'
        : 'bg-black/40 hover:bg-white/[0.02] border-white/5 text-slate-100'
       : 'bg-black/[0.15] border-white/5 text-slate-600 hover:bg-white/[0.01]'
      } ${
       isToday && !isSelected ? 'border-amber-500/40 bg-amber-500/[0.01]' : ''
      }`}
      >
      <div className="flex justify-between items-center">
       <span className={`text-xs font-mono font-bold ${
       isToday ? 'w-5 h-5 flex items-center justify-center bg-amber-500 text-black rounded-full font-black' : isSelected ? 'text-violet-400' : ''
       }`}>
       {cell.day}
       </span>
       
       {totalItems > 0 && (
       <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 shrink-0 hidden sm:inline-block">
        {totalItems}
       </span>
       )}
      </div>
      
      {/* Display item names on larger screens */}
      <div className="hidden sm:flex flex-col gap-1 mt-1.5 overflow-hidden max-h-[50px]">
       {dayEvs.slice(0, 2).map(ev => (
       <div key={ev.id} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-650/20 text-violet-300 font-sans truncate font-medium flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ev.color || '#8B5CF6' }} />
        <span className="truncate">{ev.title}</span>
       </div>
       ))}
       {dayCbs.slice(0, 1).map(l => (
       <div key={l.id} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-sans truncate font-medium flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        <span className="truncate">{l.businessName}</span>
       </div>
       ))}
       {totalItems > 3 && (
       <div className="text-[8px] font-mono text-slate-500 pl-1">
        + {totalItems - 3} más
       </div>
       )}
      </div>

      {/* Tiny mobile indicators */}
      <div className="flex sm:hidden gap-1 justify-center mt-1">
       {dayEvs.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
       {dayCbs.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
      </div>
      </button>
     );
     });
    })()}
    </div>

    {/* Legends */}
    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-3 border-t border-white/5">
    <span className="flex items-center gap-1">
     <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
     <span>Cita pospuesta con cliente</span>
    </span>
    <span className="flex items-center gap-1">
     <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-amber-500/20 animate-pulse" />
     <span>Hoy</span>
    </span>
    </div>
   </div>

   {/* RIGHT SIDE: VIEW MODE TOGGLE & TASK TIMELINE */}
   <div className={`lg:col-span-12 w-full ${calendarViewMode === 'day' ? 'block' : 'hidden'} space-y-4 text-left animate-fade-in`}>
    
    {/* Toolbar */}
    <div className="bg-[#030306]/85 border border-white/5 p-4 rounded-2.5xl flex flex-col sm:flex-row justify-between items-center gap-3">
    <div className="text-left">
     <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Fecha en pantalla</span>
     <h4 className="text-sm font-bold text-white uppercase font-sans tracking-tight mt-0.5">
     {new Date(selectedTaskDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
     </h4>
    </div>

    <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 select-none shrink-0">
     <button
     onClick={() => setHourViewMode('hours')}
     className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
      hourViewMode === 'hours' ?
      'bg-violet-600 text-white shadow'
      : 'text-slate-400 hover:text-white'
     }`}
     >
     Por Horas
     </button>
     <button
     onClick={() => setHourViewMode('list')}
     className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
      hourViewMode === 'list' ?
      'bg-violet-600 text-white shadow'
      : 'text-slate-400 hover:text-white'
     }`}
     >
     Resumen
     </button>
    </div>
    </div>

    {/* LIST VIEW OPTION */}
    {hourViewMode === 'list' && (
    <div className="space-y-4">
     {/* General meetings belong to the main commercial calendar. */}
     {dayEvents.length > 0 && <div className="space-y-2">
     <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-violet-400">Reuniones y Eventos ({dayEvents.length})</h4>
     {dayEvents.length === 0 ? (
      <p className="text-[11px] text-slate-550 bg-white/[0.01] border border-white/5 rounded-xl p-4 italic text-center">
      Sin reuniones agendadas para este día.
      </p>
     ) : (
      <div className="space-y-2">
      {dayEvents.map(ev => {
       const isCreatedByMe = ev.comercialId === currentComercial?.id;
       return (
       <div 
        key={ev.id} 
        className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-violet-500/20 transition"
       >
        <div className="space-y-1 text-left">
        <div className="flex items-center gap-2">
         <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ev.color || '#8B5CF6' }} />
         <h5 className="font-bold text-xs text-white uppercase">{ev.title}</h5>
         <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
         {ev.time || 'Todo el día'}
         </span>
         {ev.isPrivate && (
         <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold px-1 rounded uppercase">
          Privado
         </span>
         )}
        </div>
        <p className="text-[11px] text-slate-400">{ev.notes || ev.description}</p>
        {ev.linkedContactName && (
         <p className="text-[10px] text-violet-400">Cliente asociado: {ev.linkedContactName}</p>
        )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {ev.meetingUrl && (
         <a 
         href={ev.meetingUrl.startsWith('http') ? ev.meetingUrl : `https://${ev.meetingUrl}`}
         target="_blank"
         rel="noopener noreferrer"
         className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition"
         >
         <Video className="w-3 h-3" />
         <span>Unirse</span>
         </a>
        )}

        {isCreatedByMe && (
         <>
         <button
          onClick={() => {
          setEditingPrivateTaskId(ev.id);
          setEditTaskTitle(ev.title);
          setEditTaskTime(ev.time || '10:00');
          setEditTaskNotes(ev.notes || '');
          setEditTaskMeetingUrl(ev.meetingUrl || '');
          }}
          className="p-1.5 bg-white/5 border border-white/15 text-slate-400 hover:text-white rounded-lg transition"
          title="Editar Tarea"
         >
          <Edit3 className="w-3 h-3" />
         </button>
         <button
          onClick={() => handleDeletePrivateTask(ev.id)}
          className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition"
          title="Eliminar Tarea"
         >
          <Trash2 className="w-3 h-3" />
         </button>
         </>
        )}
        </div>
       </div>
       );
      })}
      </div>
     )}
     </div>}

     {/* Cold Calling Callbacks */}
     <div className="space-y-2">
     <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">Llamadas Cold Calling Programadas ({dayCallbackLeads.length})</h4>
     {dayCallbackLeads.length === 0 ? (
      <p className="text-[11px] text-slate-550 bg-white/[0.01] border border-white/5 rounded-xl p-4 italic text-center">
      Sin llamadas de seguimiento agendadas.
      </p>
     ) : (
      <div className="space-y-2">
      {dayCallbackLeads.map(lead => (
       <div 
       key={lead.id} 
       className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-amber-500/20 transition"
       >
       <div className="space-y-1 text-left">
        <div className="flex items-center gap-2">
        <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <h5 className="font-bold text-xs text-white uppercase">{lead.businessName}</h5>
        <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
         {lead.callbackTime || 'Cualquier hora'}
        </span>
        </div>
        <p className="text-[11px] text-slate-400">Persona de contacto: <span className="text-slate-300 font-semibold">{lead.contactPerson}</span></p>
        <p className="text-[10px] text-slate-500 italic">Notas: "{lead.notes}"</p>
       </div>

       <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <a 
        href={`tel:${lead.phone}`}
        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white text-[10px] font-mono font-bold rounded-lg flex items-center gap-1 transition"
        >
        <span>📞 {lead.phone}</span>
        </a>
        <button
        onClick={() => handleOpenCallLog(lead)}
        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold rounded-lg transition"
        >
        Registrar Llamada
        </button>
       </div>
       </div>
      ))}
      </div>
     )}
     </div>
    </div>
    )}

    {/* VERTICAL HOURLY TIMELINE VIEW */}
    {hourViewMode === 'hours' && (
    <div className="bg-black/60 border border-white/5 rounded-2.5xl p-5 space-y-3.5 relative">
     
     {/* Render hourly slots */}
     {HOURLY_SLOTS.map(slot => {
     const slotHourInt = parseInt(slot.split(':')[0]);
     
     // Filter events falling in this hour (e.g. 10:30 goes into 10:00)
     const slotEvents = dayEvents.filter(ev => {
      if (!ev.time) return false;
      const evHour = parseInt(ev.time.split(':')[0]);
      return evHour === slotHourInt;
     });

     // Filter callbacks falling in this hour
     const slotCallbacks = dayCallbackLeads.filter(lead => {
      if (!lead.callbackTime) return false;
      const cbHour = parseInt(lead.callbackTime.split(':')[0]);
      return cbHour === slotHourInt;
     });

     const hasContent = slotEvents.length > 0 || slotCallbacks.length > 0;

     return (
      <div key={slot} className="grid grid-cols-12 gap-3.5 items-start border-l border-white/5 pl-4 relative group">
      
      {/* Timeline dot indicator */}
      <div className="absolute left-[-5.5px] top-[7px] w-2.5 h-2.5 rounded-full bg-slate-800 group-hover:bg-violet-500 transition-colors border border-[#0d0d0d]" />

      {/* Hour */}
      <div className="col-span-2 text-left">
       <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-violet-400 transition">
       {slot}
       </span>
      </div>

      {/* Contents or empty slot fast addition */}
      <div className="col-span-10 space-y-2">
       {hasContent ? (
       <>
        {/* Events cards */}
        {slotEvents.map(ev => {
        const isCreatedByMe = ev.comercialId === currentComercial?.id;
        return (
         <div 
         key={ev.id} 
         className="bg-neutral-900/90 border-l-4 border-l-violet-500 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md hover:border-violet-500/40 transition"
         style={{ borderLeftColor: ev.color || '#8B5CF6' }}
         >
         <div className="text-left space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
          <h5 className="font-bold text-[11px] text-white uppercase tracking-tight">{ev.title}</h5>
          <span className="text-[8px] bg-white/5 font-mono text-slate-350 px-1 py-0.2 rounded">
           {ev.time}
          </span>
          {ev.isPrivate && (
           <span className="text-[8px] bg-rose-500/10 text-rose-450 font-extrabold uppercase px-1 rounded">
           Privado
           </span>
          )}
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">{ev.notes || ev.description}</p>
          {ev.linkedContactName && (
          <span className="text-[9px] font-semibold text-violet-400 block">👥 {ev.linkedContactName}</span>
          )}
         </div>

         <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0">
          {ev.meetingUrl && (
          <a 
           href={ev.meetingUrl.startsWith('http') ? ev.meetingUrl : `https://${ev.meetingUrl}`}
           target="_blank"
           rel="noopener noreferrer"
           className="px-2.5 py-1.5 bg-violet-650 hover:bg-violet-550 text-white text-[9px] font-bold rounded-lg flex items-center gap-1 transition"
          >
           <Video className="w-3 h-3 text-white" />
           <span>Unirse</span>
          </a>
          )}

          {isCreatedByMe && (
          <>
           <button
           onClick={() => {
            setEditingPrivateTaskId(ev.id);
            setEditTaskTitle(ev.title);
            setEditTaskTime(ev.time || '10:00');
            setEditTaskNotes(ev.notes || '');
            setEditTaskMeetingUrl(ev.meetingUrl || '');
           }}
           className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-md border border-white/5 transition"
           title="Editar Tarea"
           >
           <Edit3 className="w-3 h-3" />
           </button>
           <button
           onClick={() => handleDeletePrivateTask(ev.id)}
           className="p-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-md border border-red-500/20 transition"
           title="Eliminar Tarea"
           >
           <Trash2 className="w-3 h-3" />
           </button>
          </>
          )}
         </div>
         </div>
        );
        })}

        {/* Callbacks cards */}
        {slotCallbacks.map(lead => (
        <div 
         key={lead.id} 
         className="bg-[#0e0c03] border-l-4 border-l-amber-500 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md hover:border-amber-500/40 transition"
        >
         <div className="text-left space-y-1">
         <div className="flex items-center gap-1.5 flex-wrap">
          <Phone className="w-3 h-3 text-amber-400 shrink-0" />
          <h5 className="font-bold text-[11px] text-white uppercase tracking-tight">{lead.businessName}</h5>
          <span className="text-[8px] bg-amber-500/10 font-mono text-amber-400 px-1 py-0.2 rounded">
          {lead.callbackTime}
          </span>
         </div>
         <p className="text-[10px] text-slate-400 leading-tight">Persona de contacto: <span className="font-semibold text-slate-200">{lead.contactPerson}</span></p>
         <p className="text-[9px] text-slate-500 italic leading-none">Notas: "{lead.notes}"</p>
         </div>

         <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0">
         <a 
          href={`tel:${lead.phone}`}
          className="px-2.5 py-1.5 bg-black border border-white/5 text-white text-[9px] font-mono font-bold rounded-lg flex items-center transition"
         >
          <span>📞 {lead.phone}</span>
         </a>
         <button
          onClick={() => handleOpenCallLog(lead)}
          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-450 text-slate-950 text-[9px] font-bold rounded-lg transition"
         >
          Llamar
         </button>
         </div>
        </div>
        ))}
       </>
       ) : (
       <div className="w-full rounded-xl border border-dashed border-white/5 bg-white/[0.01] px-3 py-2 text-left text-[10px] text-slate-700">
        Sin cita pospuesta a las {slot}
       </div>
       )}
      </div>

      </div>
     );
     })}
    </div>
    )}

   </div>
   </div>

   {/* ADD PRIVATE TASK MODAL WINDOW */}
   {showAddTaskModal && (
   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div className="absolute inset-0" onClick={() => setShowAddTaskModal(false)} />
    <div className="relative bg-[#0d0d0d] border border-violet-500/30 rounded-3xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 text-slate-300">
    
    <div className="flex justify-between items-center mb-5 border-b border-violet-500/15 pb-3">
     <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
     <Calendar className="w-4 h-4 text-violet-400" />
     <span>Añadir Tarea / Compromiso Privado</span>
     </h3>
     <button onClick={() => setShowAddTaskModal(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5">
     <X className="w-5 h-5" />
     </button>
    </div>

    <form onSubmit={handleCreatePrivateTask} className="space-y-4 text-left">
     <div>
     <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Título de la Tarea</label>
     <input 
      type="text"
      placeholder="Ej. Llamar al Gerente de Alimentos de VIP"
      value={taskTitle}
      onChange={(e) => setTaskTitle(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
     />
     </div>

     <div className="grid grid-cols-2 gap-4">
     <div>
      <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Fecha</label>
      <input 
      type="date"
      required
      value={taskDate}
      onChange={(e) => setTaskDate(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
      />
     </div>
     <div>
      <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Hora de Inicio</label>
      <input 
      type="time"
      required
      value={taskTime}
      onChange={(e) => setTaskTime(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
      />
     </div>
     </div>

     <div>
     <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Enlace de Videollamada (Opcional)</label>
     <input 
      type="text"
      placeholder="Ej. google.com/meet/abc-defg-hij"
      value={taskMeetingUrl}
      onChange={(e) => setTaskMeetingUrl(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500 font-mono"
     />
     </div>

     <div>
     <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold block mb-1.5">Color del Indicador</label>
     <div className="flex gap-2">
      {[
      { hex: '#8B5CF6', name: 'Violeta' },
      { hex: '#10B981', name: 'Esmeralda' },
      { hex: '#F59E0B', name: 'Ámbar' },
      { hex: '#EF4444', name: 'Coral' },
      { hex: '#3B82F6', name: 'Zafiro' }
      ].map(c => (
      <button
       key={c.hex}
       type="button"
       onClick={() => setTaskColor(c.hex)}
       className={`w-6 h-6 rounded-full border transition-all ${
       taskColor === c.hex ? 'ring-2 ring-violet-500 scale-110 border-white' : 'border-neutral-800 hover:scale-105'
       }`}
       style={{ backgroundColor: c.hex }}
       title={c.name}
      />
      ))}
     </div>
     </div>

     <div>
     <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Notas / Detalles</label>
     <textarea 
      rows={2}
      placeholder="Agrega descripciones breves sobre esta tarea..."
      value={taskNotes}
      onChange={(e) => setTaskNotes(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500 resize-none"
     />
     </div>

     <div className="flex gap-3 pt-3">
     <button
      type="button"
      onClick={() => setShowAddTaskModal(false)}
      className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-slate-300 font-bold rounded-xl text-xs border border-white/5 transition"
     >
      Cancelar
     </button>
     <button
      type="submit"
      className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition"
     >
      Agendar Tarea
     </button>
     </div>
    </form>
    </div>
   </div>
   )}

   {/* EDIT PRIVATE TASK MODAL WINDOW */}
   {editingPrivateTaskId && (
   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div className="absolute inset-0" onClick={() => setEditingPrivateTaskId(null)} />
    <div className="relative bg-[#0d0d0d] border border-violet-500/30 rounded-3xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 text-slate-300">
    
    <div className="flex justify-between items-center mb-5 border-b border-violet-500/15 pb-3">
     <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
     <Edit3 className="w-4 h-4 text-violet-400" />
     <span>Editar Tarea Privada</span>
     </h3>
     <button onClick={() => setEditingPrivateTaskId(null)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5">
     <X className="w-5 h-5" />
     </button>
    </div>

    <form onSubmit={handleUpdatePrivateTaskSubmit} className="space-y-4 text-left">
     <div>
     <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Título de la Tarea</label>
     <input 
      type="text"
      required
      placeholder="Ej. Revisión de propuesta comercial"
      value={editTaskTitle}
      onChange={(e) => setEditTaskTitle(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
     />
     </div>

     <div>
     <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Hora de Inicio</label>
     <input 
      type="time"
      required
      value={editTaskTime}
      onChange={(e) => setEditTaskTime(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
     />
     </div>

     <div>
     <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Enlace de Videollamada</label>
     <input 
      type="text"
      placeholder="Ej. google.com/meet/abc-defg-hij"
      value={editTaskMeetingUrl}
      onChange={(e) => setEditTaskMeetingUrl(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500 font-mono"
     />
     </div>

     <div>
     <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Notas / Detalles</label>
     <textarea 
      rows={2}
      placeholder="Agrega descripciones breves sobre esta tarea..."
      value={editTaskNotes}
      onChange={(e) => setEditTaskNotes(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500 resize-none"
     />
     </div>

     <div className="flex gap-3 pt-3">
     <button
      type="button"
      onClick={() => setEditingPrivateTaskId(null)}
      className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-slate-300 font-bold rounded-xl text-xs border border-white/5 transition"
     >
      Cancelar
     </button>
     <button
      type="submit"
      className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition"
     >
      Guardar Cambios
     </button>
     </div>
    </form>
    </div>
   </div>
   )}

  </div>
  )}

  {/* TAB 3: GRAPHICS & STATS (MÉTRICAS COLD CALLING) */}
  {activeTab === 'closing' && (
  <div className="space-y-5">
   <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.035] p-5 flex items-center justify-between gap-4">
    <div>
     <p className="text-[10px] uppercase tracking-[0.24em] font-mono font-bold text-cyan-300">Closing Pipeline</p>
     <h3 className="text-xl font-black text-white mt-1">Citas pasadas a closer</h3>
     <p className="text-xs text-slate-400 mt-1">{isClosingReadOnly ? 'Seguimiento de todas las citas que has generado. La gestión corresponde al closer.' : 'Clientes potenciales generados desde Call Calling y asignados a Carlos.'}</p>
    </div>
    {isClosingReadOnly ? (
     <div className="shrink-0 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-200">
      Solo lectura · {closingLeads.length} {closingLeads.length === 1 ? 'cita' : 'citas'}
     </div>
    ) : (
    <div className="flex flex-col items-end gap-2">
     <div className="flex rounded-xl border border-white/10 bg-black/25 p-1">
      <button type="button" onClick={() => setClosingScope('today')} className={`rounded-lg px-3 py-2 text-[10px] font-black transition ${closingScope === 'today' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>Hoy ({todayClosingCount})</button>
      <button type="button" onClick={() => setClosingScope('all')} className={`rounded-lg px-3 py-2 text-[10px] font-black transition ${closingScope === 'all' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>Ver todas ({openClosingLeads.length})</button>
     </div>
     <button type="button" onClick={() => setShowClosedClosingLeads(prev => !prev)} className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-[9px] font-bold text-slate-400 hover:text-white">
      {showClosedClosingLeads ? 'Ocultar cerradas' : 'Incluir cerradas'}
     </button>
    </div>
    )}
   </div>

   {visibleClosingLeads.length === 0 ? (
   <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-12 text-center">
    <Briefcase className="w-10 h-10 text-slate-500 mx-auto mb-3" />
    <p className="text-sm font-bold text-slate-200">{closingLeads.length === 0 ? 'Aún no hay citas para closing.' : closingScope === 'today' ? 'No hay llamadas previstas para hoy.' : 'No hay citas que coincidan con el filtro.'}</p>
    <p className="text-xs text-slate-500 mt-1">{closingLeads.length === 0 ? (isClosingReadOnly ? 'Cuando agendes una cita quedará registrada aquí para que puedas seguir su evolución.' : 'Cuando un caller marque una cita agendada aparecerá aquí.') : closingScope === 'today' ? 'Pulsa Ver todas para consultar próximas citas y citas sin fecha.' : 'Prueba a incluir también las citas cerradas.'}</p>
   </div>
   ) : (
   <div className="space-y-3">
    {visibleClosingLeads.map(lead => {
    const draft = getClosingDraft(lead);
    const contact = getClosingContact(lead);
    const status = draft.status || 'Pendiente';
    const statusClass = status === 'Cerrado' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : status === 'Perdido' ? 'bg-rose-500/15 text-rose-300 border-rose-500/25' : 'bg-amber-500/15 text-amber-300 border-amber-500/25';
    return (
     <div key={lead.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 shadow-xl shadow-black/15 space-y-4">
     <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
      <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
       <span className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${statusClass}`}>{status}</span>
       <span className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[9px] text-cyan-300 font-mono">{activeCloser?.name || 'Closer'} closer</span>
      </div>
      <h4 className="text-lg font-black text-white mt-2 truncate">{draft.company}</h4>
      <p className="text-xs text-slate-400 truncate">{draft.name} Â· {draft.phone}</p>
      </div>
      <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
       <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-right font-mono"><p className="text-[11px] font-black text-white">{formatCallbackDate(lead.callbackDate)}</p><p className="mt-0.5 text-[10px] font-bold text-cyan-300">{lead.callbackTime || 'Sin hora'}</p></div>
       {!isClosingReadOnly && <a href={`tel:${(draft.phone || '').replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-300 hover:bg-emerald-500/20"><Phone className="h-3.5 w-3.5"/>Llamar</a>}
       <button type="button" onClick={() => setExpandedClosingLeadId(current => current === lead.id ? null : lead.id)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-white/10">{expandedClosingLeadId === lead.id ? 'Cerrar ficha' : 'Ver ficha'}</button>
      </div>
     </div>

      {expandedClosingLeadId === lead.id && <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
       <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/35 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
         <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">¿El cliente ha contestado?</p>
          <p className="mt-1 text-[10px] text-slate-500">Solo una cita agendada marcada como Sí por el closer cuenta como Show.</p>
         </div>
         <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={isClosingReadOnly} onClick={() => updateClosingDraft(lead.id, { answered: true })} className={`rounded-xl border px-4 py-2 text-[10px] font-black transition disabled:cursor-not-allowed ${draft.answered === true ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-slate-400'}`}>Sí</button>
          <button type="button" disabled={isClosingReadOnly} onClick={() => updateClosingDraft(lead.id, { answered: false })} className={`rounded-xl border px-4 py-2 text-[10px] font-black transition disabled:cursor-not-allowed ${draft.answered === false ? 'border-rose-400/40 bg-rose-500/20 text-rose-200' : 'border-white/10 bg-white/[0.03] text-slate-400'}`}>No</button>
         </div>
        </div>
       </div>
       <input readOnly={isClosingReadOnly} value={draft.name} onChange={(e) => updateClosingDraft(lead.id, { name: e.target.value })} placeholder="Persona de contacto" className="bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 read-only:opacity-70" />
       <input readOnly={isClosingReadOnly} value={draft.company} onChange={(e) => updateClosingDraft(lead.id, { company: e.target.value })} placeholder="Empresa" className="bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 read-only:opacity-70" />
       <input readOnly={isClosingReadOnly} value={draft.phone} onChange={(e) => updateClosingDraft(lead.id, { phone: e.target.value })} placeholder="TelÃ©fono" className="bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 read-only:opacity-70" />
       <input readOnly={isClosingReadOnly} value={draft.email} onChange={(e) => updateClosingDraft(lead.id, { email: e.target.value })} placeholder="Email" className="bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 read-only:opacity-70" />
       <input readOnly type="date" value={draft.date} className="bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none read-only:opacity-70" title="Usa Posponer cita para cambiar la fecha" />
       <select disabled value={draft.time} className="bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-70" title="Usa Posponer cita para cambiar la hora">
       <option value="">Sin hora</option>
       {HOURLY_SLOTS.map(slot => {
       const busy = draft.date && isSlotBusy(draft.date, slot) && !(draft.date === lead.callbackDate && slot === lead.callbackTime);
       return <option key={slot} value={slot} disabled={!!busy}>{slot}{busy ? ' - ocupado' : ''}</option>;
       })}
      </select>
       <input readOnly={isClosingReadOnly} value={draft.socials} onChange={(e) => updateClosingDraft(lead.id, { socials: e.target.value })} placeholder="Redes sociales" className="bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-400 read-only:opacity-70" />
       <input readOnly={isClosingReadOnly} value={draft.mapsUrl} onChange={(e) => updateClosingDraft(lead.id, { mapsUrl: e.target.value })} placeholder="URL Google Maps" className="bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-400 read-only:opacity-70" />
       <input readOnly={isClosingReadOnly} value={draft.website} onChange={(e) => updateClosingDraft(lead.id, { website: e.target.value })} placeholder="Web actual o futura" className="md:col-span-2 bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 read-only:opacity-70" />
       <textarea readOnly={isClosingReadOnly} value={draft.notes} onChange={(e) => updateClosingDraft(lead.id, { notes: e.target.value })} placeholder="Notas del closer, objeciones, presupuesto, prÃ³ximos pasos..." rows={3} className="md:col-span-2 bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 read-only:opacity-70" />
      </div>

      {!isClosingReadOnly && (
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
      <div className="flex flex-wrap gap-2">
      {draft.mapsUrl && <a href={draft.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white"><MapPin className="w-3.5 h-3.5" /> Maps</a>}
      {buildWhatsAppUrl(draft.phone, `Hola ${draft.name}, te escribo de Althera sobre tu cita.`) && <a href={buildWhatsAppUrl(draft.phone, `Hola ${draft.name}, te escribo de Althera sobre tu cita.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-300 hover:text-white"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>}
      {draft.phone && <a href={`tel:${draft.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-300 hover:text-white"><Phone className="w-3.5 h-3.5" /> Llamar</a>}
      </div>
      <div className="flex flex-wrap gap-2">
      <button onClick={() => postponeClosingLead(lead)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-300 hover:bg-amber-500/20"><Clock className="w-3.5 h-3.5"/>Posponer cita</button>
      <button onClick={() => saveClosingLead(lead, 'Perdido')} className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-300 hover:bg-rose-500/20">Perdido</button>
      <button onClick={() => saveClosingLead(lead, 'Pendiente')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-500/10 border border-white/10 text-[10px] font-black text-slate-200 hover:bg-white/10"><Save className="w-3.5 h-3.5" /> Guardar</button>
      <button onClick={() => { saveClosingLead(lead, 'Cerrado'); handleOpenClosingConversion(lead); }} className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-black text-emerald-300 hover:bg-emerald-500/25">Cerrado + pedir web</button>
      </div>
     </div>
      )}
     {contact?.needsWebsite && !contact.websiteReady && (
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[10px] font-bold text-amber-300">Marcado en Gestión Dev como falta web.</div>
     )}
     </>}
     </div>
    );
    })}
   </div>
   )}
  </div>
  )}

  {activeTab === 'metrics' && (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 text-left">
   
   {/* Answer Metrics and Funnels */}
   <div className="lg:col-span-8 space-y-6">
   <div className="bg-[#030306]/85 border border-white/5 p-6 rounded-2.5xl">
    {/* Frio widget */}
    
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    
    <div className="bg-slate-950/40 p-4 border border-white/5 rounded-2xl">
     <div className="flex justify-between items-center">
     <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Tasa de Respuesta</span>
     <span className="w-2 h-2 rounded-full bg-emerald-500" />
     </div>
     <h4 className="text-3xl font-bold font-mono text-white mt-1.5">{answerRate}%</h4>
     <p className="text-[10px] text-slate-500 mt-1">Negocios que descolgaron ({answeredCount} de {totalCount})</p>
    </div>

    <div className="bg-slate-950/40 p-4 border border-white/5 rounded-2xl">
     <div className="flex justify-between items-center">
     <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Tasa de Contacto</span>
     <span className="w-2 h-2 rounded-full bg-violet-500" />
     </div>
     <h4 className="text-3xl font-bold font-mono text-white mt-1.5">{contactRate}%</h4>
     <p className="text-[10px] text-slate-500 mt-1">Desean hablar / Información ({contactedCount} de {totalCount})</p>
    </div>

    <div className="bg-slate-950/40 p-4 border border-white/5 rounded-2xl">
     <div className="flex justify-between items-center">
     <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Filtro Dueño Superado</span>
     <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
     </div>
     <h4 className="text-3xl font-bold font-mono text-white mt-1.5">{ownerDecisionRate}%</h4>
     <p className="text-[10px] text-slate-500 mt-1">Llegamos a hablar con el dueño ({ownerCount} de {contactedCount})</p>
    </div>

    </div>

    {/* Graphical distribution of call response rates */}
    <div className="space-y-4">
    <h4 className="text-xs font-semibold uppercase font-mono text-slate-400 tracking-wider">Embudo de Contactabilidad Directa:</h4>
    
    {/* Stage 1 */}
    <div className="space-y-1">
     <div className="flex justify-between text-xs font-semibold">
     <span>1. Base Total de Clientes Potenciales</span>
     <span>{totalCount} leads (100%)</span>
     </div>
     <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
     <div className="h-full bg-violet-600 rounded-full w-full" />
     </div>
    </div>

    {/* Stage 2 */}
    <div className="space-y-1">
     <div className="flex justify-between text-xs font-semibold">
     <span>2. Descolgaron Teléfono (Tasa Respuesta)</span>
     <span>{answeredCount} leads ({answerRate}%)</span>
     </div>
     <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${answerRate}%` }} />
     </div>
    </div>

    {/* Stage 3 */}
    <div className="space-y-1">
     <div className="flex justify-between text-xs font-semibold">
     <span>3. Charla cara al Dueño / Decisor Escuchó</span>
     <span>{ownerCount} leads (Calculado: {ownerCount ? Math.round((ownerCount / totalCount) * 100) : 0}%)</span>
     </div>
     <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
     <div className="h-full bg-rose-500 rounded-full" style={{ width: `${totalCount ? Math.round((ownerCount / totalCount) * 100) : 0}%` }} />
     </div>
    </div>
    </div>

   </div>
   </div>

   {/* Temperature visual donut percentages */}
   <div className="lg:col-span-4 bg-[#030306]/85 border border-white/5 p-6 rounded-2.5xl space-y-6">
   <h3 className="text-sm font-semibold text-white">Temperaturas Registradas (Muestreo)</h3>
   
   <div className="space-y-4">
    
    {/* Caliente widget */}
    <div className="border border-rose-500/20 bg-rose-500/5 rounded-2xl p-4 flex justify-between items-center">
    <div>
     <h4 className="text-sm font-extrabold text-rose-455 uppercase tracking-wide flex items-center gap-1">
     <Flame className="w-4 h-4 fill-rose-500 animate-pulse" />
     Caliente
     </h4>
     <p className="text-[10px] text-slate-400 mt-0.5">Cierres inminentes o citas de venta formadas</p>
    </div>
    <div className="text-right">
     <div className="text-lg font-bold font-mono text-white">{hotCount}</div>
     <div className="text-[9px] text-slate-500 font-mono font-bold">
     {totalCount ? Math.round((hotCount / totalCount) * 100) : 0}%
     </div>
    </div>
    </div>

    {/* Templado widget */}
    <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 flex justify-between items-center">
    <div>
     <h4 className="text-sm font-extrabold text-amber-455 uppercase tracking-wide flex items-center gap-1">
     <Zap className="w-4 h-4" />
     Templado
     </h4>
     <p className="text-[10px] text-slate-400 mt-0.5">Interés medio, pidieron dossier o correo de presentación</p>
    </div>
    <div className="text-right">
     <div className="text-lg font-bold font-mono text-white">{warmCount}</div>
     <div className="text-[9px] text-slate-500 font-mono font-bold">
     {totalCount ? Math.round((warmCount / totalCount) * 100) : 0}%
     </div>
    </div>
    </div>

    {/* Frio widget */}
    <div className="border border-sky-500/20 bg-sky-500/5 rounded-2xl p-4 flex justify-between items-center">
    <div>
     <h4 className="text-sm font-extrabold text-sky-400 uppercase tracking-wide flex items-center gap-1">
     <Snowflake className="w-4 h-4" />
     Frio
     </h4>
     <p className="text-[10px] text-slate-400 mt-0.5">Leads iniciales cargados o llamadas sin interes claro</p>
    </div>
    <div className="text-right">
     <div className="text-lg font-bold font-mono text-white">{coldCount}</div>
     <div className="text-[9px] text-slate-500 font-mono font-bold">
     {totalCount ? Math.round((coldCount / totalCount) * 100) : 0}%
     </div>
    </div>
    </div>

   </div>

   <div className="bg-slate-950 p-4 border border-white/5 rounded-2xl space-y-1.5">
    <div className="flex justify-between text-[10px] text-slate-400">
    <span>Agendadas a Cita Comercial:</span>
    <span className="font-mono font-bold text-violet-400">{agendadasCount} agendadas</span>
    </div>
    <div className="flex justify-between text-[10px] text-slate-400">
    <span>Total de Llamadas Exitosas:</span>
    <span className="font-mono font-bold text-emerald-400">{contactedCount} exitosas</span>
    </div>
   </div>

   </div>

  </div>
  )}

  {showGroupsModal && currentComercial && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl">
   <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-violet-300/20 bg-[#090d14] shadow-2xl shadow-black/70">
    <div className="flex items-start justify-between border-b border-white/[0.07] bg-gradient-to-r from-violet-500/10 to-cyan-400/[0.04] p-6">
     <div><p className="text-[9px] font-black uppercase tracking-[.25em] text-violet-300">Organización privada</p><h3 className="mt-2 text-2xl font-black text-white">Grupos de prospectos</h3><p className="mt-1 text-[11px] text-slate-500">Solo organizan tu espacio de Call Calling. Archivar o eliminar un grupo no elimina prospectos.</p></div>
     <button type="button" onClick={() => setShowGroupsModal(false)} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 hover:text-white"><X className="h-4 w-4"/></button>
    </div>
    <form onSubmit={handleCreateProspectGroup} className="border-b border-white/[0.06] p-5 sm:p-6">
     <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Nuevo grupo</label>
     <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      <input value={newGroupName} onChange={event => setNewGroupName(event.target.value)} maxLength={60} placeholder="Ej. Restaurantes Madrid" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs font-bold text-white outline-none placeholder:text-slate-600 focus:border-violet-400" />
      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1.5">{['#8B5CF6','#06B6D4','#84CC16','#F59E0B','#F43F5E'].map(color => <button key={color} type="button" onClick={() => setNewGroupColor(color)} className={`h-7 w-7 rounded-lg transition ${newGroupColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#090d14]' : 'opacity-60 hover:opacity-100'}`} style={{ backgroundColor: color }} aria-label={`Color ${color}`}/>)}</div>
      <button type="submit" disabled={!newGroupName.trim() || groupBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-xs font-black text-white transition hover:bg-violet-400 disabled:opacity-40"><FolderPlus className="h-4 w-4"/>Crear</button>
     </div>
     {groupError && <p className="mt-2 text-[10px] text-rose-400">{groupError}</p>}
    </form>
    <div className="max-h-[390px] space-y-2 overflow-y-auto p-5 sm:p-6">
     {prospectGroups.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center"><Folder className="mx-auto h-7 w-7 text-slate-700"/><p className="mt-2 text-xs text-slate-500">Todavía no has creado grupos.</p></div> : prospectGroups.map(group => {
      const count = coldLeads.filter(lead => lead.prospectGroupId === group.id).length;
      return <div key={group.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${group.color}20`, color: group.color }}><Folder className="h-4 w-4"/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{group.name}</p><p className="mt-0.5 text-[9px] text-slate-500">{count} {count === 1 ? 'prospecto' : 'prospectos'}</p></div><button type="button" disabled={groupBusy} onClick={() => void handleDeleteProspectGroup(group)} className="rounded-xl border border-rose-400/15 bg-rose-500/[0.06] p-2 text-rose-400 transition hover:bg-rose-500/15" title="Eliminar grupo"><Trash2 className="h-3.5 w-3.5"/></button></div>;
     })}
    </div>
   </div>
  </div>
  )}

  {/* MODAL 1: PRE-CARGAR NUEVO LEAD DE COLD CALLING (ADMIN EXCLUSIVE) */}
  {showImportModal && isAdmin && (
  <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
   <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 text-left shadow-2xl">
   <div className="flex justify-between items-center border-b border-white/5 pb-3">
    <div>
    <h3 className="font-bold text-sm text-white uppercase flex items-center gap-2">
     <Upload className="w-4 h-4 text-cyan-400" />
     Importar prospectos CSV
    </h3>
    <p className="text-[10px] text-slate-400 mt-1">Las filas se crearán sin asignar y listas para gestionar.</p>
    </div>
    <button onClick={() => setShowImportModal(false)} disabled={importingCsv} className="text-slate-400 hover:text-white p-1">
    <X className="w-5 h-5" />
    </button>
   </div>

   <label className="mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 p-7 cursor-pointer hover:bg-cyan-500/10 transition">
    <Upload className="w-7 h-7 text-cyan-400" />
    <span className="text-xs font-bold text-white">{csvFileName || 'Seleccionar archivo .csv'}</span>
    <span className="text-[10px] text-slate-500">name, phone, hasWebsite, website, mapsUrl</span>
    <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} className="hidden" />
   </label>

   {csvError && <p className="mt-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">{csvError}</p>}
   {csvRows.length > 0 && (
    <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
    <p className="text-xs font-bold text-emerald-400">{csvRows.length} filas listas para importar</p>
    <p className="text-[10px] text-slate-400 mt-1">Ejemplo: {csvRows[0].name || 'Sin nombre'} · {csvRows[0].phone || 'Sin teléfono'}</p>
    </div>
   )}

   {csvSkippedNoPhone > 0 && (
    <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
    <p className="text-xs font-bold text-amber-300">
     {csvSkippedNoPhone} negocios no se importaran porque no tienen telefono.
    </p>
    </div>
   )}

   <div className="flex justify-end gap-2 mt-5">
    <button onClick={() => setShowImportModal(false)} disabled={importingCsv} className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white">
    Cancelar
    </button>
    <button onClick={handleImportCsv} disabled={!csvRows.length || importingCsv} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold">
    {importingCsv ? 'Importando…' : `Importar ${csvRows.length || ''}`}
    </button>
   </div>
   </div>
  </div>
  )}

  {showAddModal && isAdmin && (
  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
   <div className="bg-slate-900 border border-white/10 rounded-2.5xl max-w-lg w-full p-6 text-left relative overflow-hidden animate-scale-in">
   
   <div className="flex justify-between items-center border-b border-white/5 pb-3">
    <h3 className="font-bold text-sm text-white uppercase font-display flex items-center gap-2">
    <UserPlus className="w-5 h-5 text-violet-400" />
    Pre-Cargar Lead de Futuro Cliente
    </h3>
    <button 
    onClick={() => setShowAddModal(false)}
    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
    >
    <XCircle className="w-5 h-5" />
    </button>
   </div>

   <form onSubmit={handleCreateLead} className="space-y-4 mt-4 font-sans">
    
    <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1.5 col-span-2">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
     NOMBRE DE NEGOCIO <span className="text-red-500">*</span>
     </label>
     <input
     type="text"
     required
     placeholder="Ej. Clínica Dental Sanz / Restaurante El Coto"
     value={newBusinessName}
     onChange={e => setNewBusinessName(e.target.value)}
     className="w-full bg-[#050508] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600"
     />
    </div>

    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
     DUEÑO / NOMBRE CON QUIEN HABLAR
     </label>
     <input
     type="text"
     placeholder="Ej. Dr. Francisco Sanz / Laura Gomez"
     value={newContactPerson}
     onChange={e => setNewContactPerson(e.target.value)}
     className="w-full bg-[#050508] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600"
     />
    </div>

    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
     TELÉFONO <span className="text-red-500">*</span>
     </label>
     <input
     type="text"
     required
     placeholder="Ej. +34 600 111 222"
     value={newPhone}
     onChange={e => setNewPhone(e.target.value)}
     className="w-full bg-[#050508] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600"
     />
    </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
     FECHA DE CARGA / LLAMADA
     </label>
     <input
     type="date"
     required
     value={newCallDate}
     onChange={e => setNewCallDate(e.target.value)}
     className="w-full bg-[#050508] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all"
     />
    </div>

    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold text-violet-400">
     ASIGNAR A COMERCIAL
     </label>
     <select
     value={newAssignedEmail}
     onChange={e => setNewAssignedEmail(e.target.value)}
     className="w-full bg-[#050508] border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all cursor-pointer font-sans"
     >
     <option value="unassigned">Dejar sin asignar (Guardar en cola)</option>
     {allAssignees.map(com => (
      <option key={com.id} value={com.email}>{com.name} ({com.role})</option>
     ))}
     </select>
    </div>
    </div>

    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
     NOTAS DE PRE-CARGA / NECESIDADES DEL FUTURO CLIENTE
    </label>
    <textarea
     rows={3}
     placeholder="Detalles extras del prospecto, observaciones extraídas de Google Maps, etc..."
     value={newNotes}
     onChange={e => setNewNotes(e.target.value)}
     className="w-full bg-[#050508] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all resize-none placeholder:text-slate-600"
    />
    </div>

    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">Web demo para mostrar</label>
    <select value={newDemoWebsiteId} onChange={e => setNewDemoWebsiteId(e.target.value)} className="w-full bg-[#050508] border border-cyan-500/20 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
     <option value="">Sin demo asignada</option>
     {demoSites.map(site => <option key={site.id} value={site.id}>{site.name} · {site.businessType || 'General'}</option>)}
    </select>
    </div>

    <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
    <button
     type="button"
     onClick={() => setShowAddModal(false)}
     className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-205 rounded-xl text-xs font-semibold cursor-pointer"
    >
     Cancelar
    </button>
    <button
     type="submit"
     className="px-5.5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition duration-240 cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.3)]"
    >
     Guardar en Listado
    </button>
    </div>

  </form>

   {showAppointmentConfirm && (
   <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-violet-300/20 bg-slate-900/95 shadow-2xl shadow-black/60">
    <div className="bg-gradient-to-r from-violet-500/18 via-cyan-500/12 to-emerald-500/12 px-6 py-5 border-b border-white/10">
     <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
     Transferencia de lead
     </span>
     <h3 className="mt-3 text-lg font-bold text-white">Confirmar cita agendada</h3>
     <p className="mt-2 text-sm leading-relaxed text-slate-300">
     Al marcar esta cita como agendada, este cliente pasara al flujo de administracion para gestionarse desde CRM, Citas y Calendario.
     </p>
    </div>
    <div className="space-y-3 px-6 py-5 text-sm text-slate-300">
     <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
     <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Cliente</p>
     <p className="mt-1 font-bold text-white">{selectedLeadForCall.businessName}</p>
     </div>
     <div className="grid grid-cols-2 gap-3">
     <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/8 p-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-200/70">Fecha</p>
      <p className="mt-1 font-bold text-cyan-100">{callCallbackDate || 'Sin fecha'}</p>
     </div>
     <div className="rounded-2xl border border-violet-300/15 bg-violet-300/8 p-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-violet-200/70">Hora</p>
      <p className="mt-1 font-bold text-violet-100">{callCallbackTime || 'Sin hora'}</p>
     </div>
     </div>
    </div>
    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-white/10 px-6 py-4">
     <button
     type="button"
     onClick={() => {
      setShowAppointmentConfirm(false);
      setPendingAppointmentSubmit(false);
     }}
     className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[0.08] hover:text-white"
     >
     Cancelar
     </button>
     <button
     type="button"
     onClick={() => {
      setAppointmentAccessConfirmed(true);
      setCallScheduled('Sí');
      setShowAppointmentConfirm(false);
      const shouldSubmit = pendingAppointmentSubmit;
      setPendingAppointmentSubmit(false);
      if (shouldSubmit) {
      window.setTimeout(() => document.getElementById('cold-call-resolver-submit')?.click(), 0);
      }
     }}
     className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-cyan-500/15"
     >
     Aceptar y transferir
     </button>
    </div>
    </div>
   </div>
   )}

   </div>
  </div>
  )}

  {/* MODAL 2: FORMULARIO DE TRABAJO INDIVIDUAL (CALL QUESTIONNAIRE FOR SUCCESS METRICS) */}
  {selectedLeadForCall && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020407]/88 p-2 backdrop-blur-2xl sm:p-5">
   <div className="relative flex max-h-[94vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[30px] border border-white/[0.09] bg-[#080c12]/98 text-left shadow-[0_40px_140px_rgba(0,0,0,.82)] animate-scale-in">
   <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(163,230,53,.09),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(139,92,246,.12),transparent_30%)]" />
   <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-300/60 to-transparent" />
   
   <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/[0.07] bg-white/[0.018] px-5 py-4 sm:px-7 sm:py-5">
    <div className="flex min-w-0 items-center gap-3.5 text-left">
    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-300 sm:flex"><Phone className="h-5 w-5" /></div>
    <div className="min-w-0">
     <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-violet-400/15 bg-violet-400/10 px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-[.16em] text-violet-300">Lead · {selectedLeadForCall.id}</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 font-mono text-[8px] font-bold text-slate-400"><Phone className="h-2.5 w-2.5" />{selectedLeadForCall.phone}</span>
     </div>
     <h3 className="mt-2 truncate text-lg font-black tracking-tight text-white sm:text-xl">{selectedLeadForCall.businessName}</h3>
     <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Registro operativo de llamada</p>
    </div>
    </div>
    <button 
    onClick={() => setSelectedLeadForCall(null)}
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-500 transition hover:border-rose-400/25 hover:bg-rose-500/10 hover:text-rose-300"
    aria-label="Cerrar formulario"
    >
    <X className="h-4 w-4" />
    </button>
   </div>

   <form onSubmit={handleSaveCallLog} noValidate className="relative z-10 flex-1 space-y-5 overflow-y-auto p-4 font-sans sm:p-6 lg:p-7">
    
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
    
    {/* LEFT COLUMN: FORM (7 cols) */}
    <div className="space-y-5 lg:col-span-7">
     
     {/* Questionnaire Form Grid */}
     <div className="grid grid-cols-1 gap-3 rounded-3xl border border-white/[0.07] bg-white/[0.018] p-4 sm:grid-cols-2 sm:p-5">
     
     {/* Contactado (Sí/No) */}
     <div className="space-y-2.5">
      <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[.16em] font-black">
      ¿CONTACTADO? (SI/NO)
      </label>
      <div className="grid grid-cols-2 gap-2">
      {['Sí', 'No'].map(v => {
       const active = callContacted === v;
       return (
       <button
        key={v}
        type="button"
        onClick={() => setCallContacted(v as any)}
        className={`min-h-10 rounded-xl border text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
        active  ?
         'bg-violet-500/20 border-violet-400/70 text-violet-200 shadow-[0_8px_24px_rgba(139,92,246,.12)]'
         : 'bg-black/35 border-white/[0.07] text-slate-500 hover:border-white/15 hover:text-slate-300'
        }`}
       >
        {v === 'Sí' ? '✔️ Sí' : '❌ No'}
       </button>
       );
      })}
      </div>
     </div>

     {/* Responde (Sí/No) */}
     <div className="space-y-2.5">
      <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[.16em] font-black">
      ¿RESPONDE AL TELÉFONO?
      </label>
      <div className="grid grid-cols-2 gap-2">
      {['Sí', 'No'].map(v => {
       const active = callAnswered === v;
       return (
       <button
        key={v}
        type="button"
        onClick={() => setCallAnswered(v as any)}
        className={`min-h-10 rounded-xl border text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
        active  ?
         'bg-cyan-400/15 border-cyan-300/60 text-cyan-200 shadow-[0_8px_24px_rgba(34,211,238,.10)]'
         : 'bg-black/35 border-white/[0.07] text-slate-500 hover:border-white/15 hover:text-slate-300'
        }`}
       >
        {v === 'Sí' ? '✔️ Sí' : '❌ No'}
       </button>
       );
      })}
      </div>
     </div>

     {/* ¿Era el dueño? (Sí/No) */}
     <div className="space-y-2.5">
      <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[.16em] font-black">
      ¿HABLAMOS CON EL DUEÑO / DECISOR?
      </label>
      <div className="grid grid-cols-2 gap-2">
      {['Sí', 'No'].map(v => {
       const active = callIsOwner === v;
       return (
       <button
        key={v}
        type="button"
        onClick={() => setCallIsOwner(v as any)}
        className={`min-h-10 rounded-xl border text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
        active  ?
         'bg-amber-400/15 border-amber-300/60 text-amber-200 shadow-[0_8px_24px_rgba(251,191,36,.10)]'
         : 'bg-black/35 border-white/[0.07] text-slate-500 hover:border-white/15 hover:text-slate-300'
        }`}
       >
        {v === 'Sí' ? '👑 Sí, el dueño' : '❌ No'}
       </button>
       );
      })}
      </div>
     </div>

     {/* Temperatura */}
     <div className="space-y-2.5">
      <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[.16em] font-black">
      TEMPERATURA (VENTAS)
      </label>
      <div className="grid grid-cols-3 gap-1.5">
      {(['Frío', 'Templado', 'Caliente'] as const).map(val => {
       const active = callTemperature === val;
       let styles = '';
       if (val === 'Caliente') styles = active ? 'bg-rose-400/20 border-rose-300/70 text-rose-200 shadow-[0_8px_22px_rgba(251,113,133,.10)]' : 'bg-black/35 border-white/[0.07] text-slate-500 hover:text-rose-300';
       else if (val === 'Templado') styles = active ? 'bg-amber-400/20 border-amber-300/70 text-amber-200 shadow-[0_8px_22px_rgba(251,191,36,.10)]' : 'bg-black/35 border-white/[0.07] text-slate-500 hover:text-amber-300';
       else styles = active ? 'bg-cyan-400/15 border-cyan-300/70 text-cyan-200 shadow-[0_8px_22px_rgba(34,211,238,.10)]' : 'bg-black/35 border-white/[0.07] text-slate-500 hover:text-cyan-300';
       
       return (
       <button
        key={val}
        type="button"
        onClick={() => setCallTemperature(val as any)}
        className={`min-h-10 rounded-xl border text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${styles}`}
       >
        {val}
       </button>
       );
      })}
      </div>
     </div>

     </div>

     {/* AGENDADA (SI / NO / LLAMAR MAS TARDE) */}
     <div className="space-y-2.5 rounded-3xl border border-white/[0.07] bg-white/[0.018] p-4 sm:p-5">
     <label className="text-[9px] font-mono text-amber-300/70 uppercase tracking-[.16em] font-black">
      ¿CITA AGENDADA / POSTERGACIÓN?
     </label>
     <div className="grid grid-cols-3 gap-2">
      {[
      { val: 'Sí', label: '📅 Sí, Cita Agendada', isAppointment: true },
      { val: 'No', label: '❌ No', isAppointment: false },
      { val: 'Llamar más tarde', label: '⏳ Llamar más tarde', isAppointment: false }
      ].map(item => {
      const active = callScheduled === item.val;
      return (
       <button
       key={item.val}
       type="button"
       onClick={() => {
        if (item.isAppointment) {
        setCallScheduled('Sí');
        return;
        }
        if (!item.isAppointment) setAppointmentAccessConfirmed(false);
        setCallScheduled(item.val as any);
       }}
       className={`min-h-11 rounded-xl border px-2 text-[10px] font-black transition-all cursor-pointer flex items-center justify-center leading-tight ${
        active  ?
        'bg-lime-300 border-lime-200 text-slate-950 shadow-[0_10px_28px_rgba(163,230,53,.14)]'
        : 'bg-black/35 border-white/[0.07] text-slate-500 hover:border-white/15 hover:text-slate-200'
       }`}
       >
       {item.label}
       </button>
      );
      })}
     </div>
     </div>

     {/* LLAMAR MAS TARDE FIELDS */}
     {(callScheduled === 'Llamar más tarde' || callScheduled === 'Sí') && (
     <div className="space-y-4 rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-400/[0.07] to-transparent p-4 text-left shadow-[inset_0_1px_rgba(255,255,255,.03)] animation-fade-in sm:p-5">
      <div className="flex items-center gap-2 text-light">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10"><Clock className="h-4 w-4 text-amber-300" /></div>
      <span className="text-[10px] font-mono font-black text-amber-300 uppercase tracking-[.14em]">
       {callScheduled === 'Sí' ? 'Fecha y hora de la cita comercial' : 'Calendario de llamada de retorno'}
      </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1">
       <label className="text-[9px] uppercase text-slate-400 font-bold font-mono">FECHA (CALENDARIO)</label>
       <input
       type="date"
       required
       value={callCallbackDate}
       onChange={e => {
        setCallCallbackDate(e.target.value);
        if (callScheduled === 'Sí' && isSlotBusy(e.target.value, callCallbackTime)) {
        setCallCallbackTime('');
        return;
        }
       }}
       className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-bold text-white outline-none transition focus:border-amber-300/60 cursor-pointer"
       />
      </div>
      <div className="space-y-1">
       <label className="text-[9px] uppercase text-slate-400 font-bold font-mono">{callScheduled === 'Sí' ? 'HORA CITA' : 'HORA RELLAMADA'}</label>
       {callScheduled === 'Sí' ? (
       <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {HOURLY_SLOTS.map(slot => {
        const conflict = getSlotConflict(callCallbackDate, slot);
        const busy = !!conflict;
        const selected = callCallbackTime === slot;
        return (
         <button
         key={slot}
         type="button"
         disabled={busy}
         title={busy ? `Ocupada: ${conflict?.title || 'cita existente'}` : `Disponible ${slot}`}
         onClick={() => {
          setCallCallbackTime(slot);
         }}
         className={`rounded-xl border px-2 py-2 text-[10px] font-black transition-all ${
          busy
          ? 'cursor-not-allowed border-rose-500/30 bg-rose-500/15 text-rose-300 opacity-75'
          : selected
           ? 'border-violet-300 bg-violet-500/30 text-white shadow-lg shadow-violet-500/10'
           : 'border-emerald-400/20 bg-emerald-400/8 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/14'
         }`}
         >
         {slot}
         </button>
        );
        })}
       </div>
       ) : (
       <input
       type="time"
       value={callCallbackTime}
       onChange={e => setCallCallbackTime(e.target.value)}
       className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-bold text-white outline-none transition focus:border-amber-300/60 cursor-pointer"
       />
       )}
       {callScheduled === 'Sí' && (
       <p className="text-[9px] text-slate-500 leading-relaxed">
        Verde disponible, violeta seleccionado, rojo ocupado por otra cita del calendario.
       </p>
       )}
      </div>
      </div>
     </div>
     )}

     {/* PERSONA CONTACTADA (FREE TEXT INPUT WRITER) */}
     <div className="space-y-2.5 rounded-2xl border border-violet-400/15 bg-violet-400/[0.045] p-4 text-left">
     <label className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-[.16em] text-violet-300/80">
      <span>👨‍💼 PERSONA CON QUIEN HABLÉ / DUEÑO O CONTACTO</span>
     </label>
     <input
      type="text"
      placeholder="Nombre de la persona contactada"
      value={callContactPerson}
      onChange={e => setCallContactPerson(e.target.value)}
      className="h-11 w-full rounded-xl border border-white/[0.09] bg-black/40 px-3.5 text-xs font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/50 font-sans"
     />
     </div>

     {/* NOTES */}
     <div className="space-y-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
     <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[.16em] font-black">
      NOTAS DE SEGUIMIENTO (QUÉ COMENTÓ EL CLIENTE)
     </label>
     <textarea
      rows={3}
      placeholder="Escribe aquí las objeciones, respuestas del dueño, dossier enviado, o detalles a tener en cuenta para la rellamada..."
      value={callNotes}
      onChange={e => setCallNotes(e.target.value)}
      className="w-full resize-none rounded-xl border border-white/[0.09] bg-black/40 px-3.5 py-3 text-xs leading-5 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/50"
     />
     </div>

    </div>

    {/* RIGHT COLUMN: CALL HISTORY TIMELINE BOX (5 cols) */}
    <div className="flex max-h-[650px] flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-[#05080d]/85 shadow-[inset_0_1px_rgba(255,255,255,.025)] lg:sticky lg:top-0 lg:col-span-5">
     <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.018] px-4 py-4 sm:px-5">
     <span className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[.15em] text-slate-300">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-400/10 text-violet-300"><History className="h-3.5 w-3.5" /></span>Historial
     </span>
     <div className="flex items-center gap-2">
      <button
      type="button"
      onClick={() => {
       setShowAddLogInline(!showAddLogInline);
       // Initialize default date
       setNewInlineLogDate(new Date().toLocaleDateString('es-ES', {
       day: '2-digit',
       month: '2-digit',
       year: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
       }));
      }}
      className="rounded-lg border border-violet-300/20 bg-violet-400/10 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-violet-300 transition hover:bg-violet-400/20 cursor-pointer select-none"
      >
      {showAddLogInline ? '✕ Cancelar' : '+ Añadir'}
      </button>
      <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-1 font-mono text-[8px] font-black text-slate-400">
      {selectedLeadForCall.callsCount || 0} previas
      </span>
     </div>
     </div>

     <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs scrollbar-thin scrollbar-thumb-white/5 sm:p-4">
     {showAddLogInline && (
      <div className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-4 text-left">
      <span className="text-[9px] font-mono font-bold text-violet-300 uppercase tracking-wider">
       Registrar Llamada Manual
      </span>
      
      <div className="space-y-1">
       <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Fecha / Hora</label>
       <input
       type="text"
       value={newInlineLogDate}
       onChange={e => setNewInlineLogDate(e.target.value)}
       className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
       placeholder="Ej. DD/MM/AAAA HH:MM"
       />
      </div>

      <div className="space-y-1">
       <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Notas de la llamada</label>
       <textarea
       rows={2}
       value={newInlineLogNotes}
       onChange={e => setNewInlineLogNotes(e.target.value)}
       className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500 resize-none"
       placeholder="Escribe comentarios de esta llamada..."
       />
      </div>

      <div className="space-y-1">
       <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Resultado</label>
       <input
       type="text"
       value={newInlineLogResult}
       onChange={e => setNewInlineLogResult(e.target.value)}
       className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
       placeholder="Ej. Contactado: Sí | Responde: Sí"
       />
      </div>

      <button
       type="button"
       onClick={() => handleAddInlineLog(selectedLeadForCall.id)}
       className="w-full text-center py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-[10px] transition cursor-pointer mt-1"
      >
       Guardar en Historial
      </button>
      </div>
     )}

     {(!selectedLeadForCall.callsLog || selectedLeadForCall.callsLog.length === 0) ? (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-16">
      <span className="text-2xl mb-2">📭</span>
      <p className="text-[11px] font-sans">No hay llamadas registradas anteriormente.</p>
      <p className="text-[9px] text-slate-600 mt-1">Este nuevo registro se guardará en el historial al enviar.</p>
      </div>
     ) : (
      selectedLeadForCall.callsLog.map((log: any, idx: number) => {
      const logId = log.id || `log_${idx}`;
      const isEditing = editingLogId === logId;
      return (
       <div key={logId} className="group relative space-y-2.5 rounded-2xl border border-white/[0.065] bg-white/[0.022] p-4 text-left transition hover:border-violet-300/15 hover:bg-violet-400/[0.025]">
       
       {isEditing ? (
        <div className="space-y-2">
        <div className="space-y-1">
         <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Fecha / Hora</label>
         <input
         type="text"
         value={editingLogDate}
         onChange={e => setEditingLogDate(e.target.value)}
         className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
         />
        </div>

        <div className="space-y-1">
         <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Notas de la llamada</label>
         <textarea
         rows={2}
         value={editingLogNotes}
         onChange={e => setEditingLogNotes(e.target.value)}
         className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500 resize-none"
         />
        </div>

        <div className="space-y-1">
         <label className="text-[8px] text-slate-400 font-bold uppercase font-mono">Resultado</label>
         <input
         type="text"
         value={editingLogResult}
         onChange={e => setEditingLogResult(e.target.value)}
         className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
         />
        </div>

        <div className="flex gap-2 justify-end pt-1">
         <button
         type="button"
         onClick={() => setEditingLogId(null)}
         className="text-[9px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded hover:bg-slate-700 cursor-pointer"
         >
         Cancelar
         </button>
         <button
         type="button"
         onClick={handleSaveEditLog}
         className="text-[9px] bg-emerald-600 text-white px-2.5 py-1 rounded font-bold hover:bg-emerald-500 cursor-pointer"
         >
         Guardar
         </button>
        </div>
        </div>
       ) : (
        <>
        <div className="flex justify-between items-center">
         <span className="font-mono text-[9px] font-black tracking-wide text-violet-300">{log.date}</span>
         <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
         <button
          type="button"
          onClick={() => {
          setEditingLogId(logId);
          setEditingLogNotes(log.notes);
          setEditingLogResult(log.result || '');
          setEditingLogDate(log.date);
          }}
          className="text-violet-400 hover:text-violet-300 font-bold p-1 rounded hover:bg-violet-500/10 transition cursor-pointer flex items-center justify-center"
          title="Editar registro"
         >
          <Edit3 className="w-3 h-3" />
         </button>
         <button
          type="button"
          onClick={() => handleDeleteLogItem(logId)}
          className="text-rose-400 hover:text-rose-300 font-bold p-1 rounded hover:bg-rose-500/10 transition cursor-pointer flex items-center justify-center"
          title="Borrar registro"
         >
          <Trash2 className="w-3 h-3" />
         </button>
         <span className="text-[8px] bg-white/5 text-slate-400 font-mono px-1.5 py-0.5 rounded">
          #{(selectedLeadForCall.callsLog?.length || 0) - idx}
         </span>
         </div>
        </div>
        <p className="whitespace-pre-wrap font-sans text-[11px] font-medium leading-5 text-slate-300">
         {log.notes}
        </p>
        <div className="rounded-xl border border-white/[0.05] bg-black/25 p-2 font-mono text-[8px] leading-4 text-slate-500">
         {log.result}
        </div>
        </>
       )}

       </div>
      );
      })
     )}
     </div>
    </div>

    </div>

    {/* ACTION COMMANDS */}
    <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-3 border-t border-white/[0.07] bg-[#080c12]/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:-mb-6 sm:px-6 lg:-mx-7 lg:-mb-7 lg:px-7">
    <button
     type="button"
     onClick={() => setSelectedLeadForCall(null)}
     className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 transition hover:bg-white/[0.07] hover:text-white cursor-pointer"
    >
     Cerrar
    </button>
    <button
     type="submit"
     id="cold-call-resolver-submit"
     className="rounded-xl bg-lime-300 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-[0_12px_32px_rgba(163,230,53,.16)] transition hover:bg-lime-200 cursor-pointer"
    >
     Registrar Formulario
    </button>
    </div>

   </form>

   {showAppointmentConfirm && (
   <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-violet-300/20 bg-slate-900/95 shadow-2xl shadow-black/60">
    <div className="bg-gradient-to-r from-violet-500/18 via-cyan-500/12 to-emerald-500/12 px-6 py-5 border-b border-white/10">
     <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
     Transferencia de lead
     </span>
     <h3 className="mt-3 text-lg font-bold text-white">Confirmar cita agendada</h3>
     <p className="mt-2 text-sm leading-relaxed text-slate-300">
     Al marcar esta cita como agendada, este cliente pasara al flujo de administracion para gestionarse desde CRM, Citas y Calendario.
     </p>
    </div>
    <div className="space-y-3 px-6 py-5 text-sm text-slate-300">
     <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
     <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Cliente</p>
     <p className="mt-1 font-bold text-white">{selectedLeadForCall.businessName}</p>
     </div>
     <div className="grid grid-cols-2 gap-3">
     <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/8 p-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-200/70">Fecha</p>
      <p className="mt-1 font-bold text-cyan-100">{callCallbackDate || 'Sin fecha'}</p>
     </div>
     <div className="rounded-2xl border border-violet-300/15 bg-violet-300/8 p-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-violet-200/70">Hora</p>
      <p className="mt-1 font-bold text-violet-100">{callCallbackTime || 'Sin hora'}</p>
     </div>
     </div>
    </div>
    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-white/10 px-6 py-4">
     <button
     type="button"
     onClick={() => {
      setShowAppointmentConfirm(false);
      setPendingAppointmentSubmit(false);
     }}
     className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[0.08] hover:text-white"
     >
     Cancelar
     </button>
     <button
     type="button"
     onClick={() => {
      setAppointmentAccessConfirmed(true);
      setCallScheduled('Sí');
      setShowAppointmentConfirm(false);
      const shouldSubmit = pendingAppointmentSubmit;
      setPendingAppointmentSubmit(false);
      if (shouldSubmit) {
      window.setTimeout(() => document.getElementById('cold-call-resolver-submit')?.click(), 0);
      }
     }}
     className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-cyan-500/15"
     >
     Aceptar y transferir
     </button>
    </div>
    </div>
   </div>
   )}

   </div>
  </div>
  )}

  {/* SCHEDULE MEETING MODAL - ADMIN EXCLUSIVE */}
  {showScheduleModal && schedulingLead && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
   <div className="w-full max-w-lg bg-[#0a0a14] border border-violet-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-violet-950/20 max-h-[90vh] flex flex-col">
   {/* Header banner cover */}
   <div className="bg-gradient-to-tr from-violet-600/20 via-violet-950/20 to-slate-950/10 p-6 border-b border-white/5 relative">
    <h3 className="text-sm font-bold text-white flex items-center gap-2">
    <Calendar className="w-5 h-5 text-violet-400" />
    <span>Agendar Cita Presencial</span>
    </h3>
    <p className="text-[11px] text-slate-400 mt-1 font-sans">
    Crea una cita presencial que se sincronizará automáticamente con el Calendario de la empresa.
    </p>
    <button
    type="button"
    onClick={() => {
     setShowScheduleModal(false);
     setSchedulingLead(null);
    }}
    className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-950/60 border border-white/5 cursor-pointer transition-colors"
    >
    <X className="w-4 h-4" />
    </button>
   </div>

   {/* Modal Body / Form */}
   <form onSubmit={handleConfirmScheduleMeeting} className="p-6 overflow-y-auto space-y-4 text-left">
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
     Asunto / Título de la Cita
    </label>
    <input
     type="text"
     required
     value={scheduleTitle}
     onChange={e => setScheduleTitle(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600"
     placeholder="Ej. Visita Inicial y Presentación de Portafolio"
    />
    </div>

    <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
     Fecha de la reunión
     </label>
     <input
     type="date"
     required
     value={scheduleDate}
     onChange={e => setScheduleDate(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all cursor-pointer"
     />
    </div>
    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
     Hora
     </label>
     <input
     type="time"
     required
     value={scheduleTime}
     onChange={e => setScheduleTime(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all cursor-pointer"
     />
    </div>
    </div>

    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
     Responsable Asignado
    </label>
    <select
     value={scheduleAssignee}
     onChange={e => setScheduleAssignee(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all cursor-pointer font-sans"
    >
     <option value="unassigned">Sin asignar</option>
     {allAssignees.map(com => (
     <option key={com.id} value={com.email}>{com.name} ({com.role})</option>
     ))}
    </select>
    </div>

    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
     Notas / Dirección o Indicaciones
    </label>
    <textarea
     rows={3}
     value={scheduleDesc}
     onChange={e => setScheduleDesc(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all resize-none placeholder:text-slate-600"
     placeholder="Instrucciones sobre la visita, dirección del local, temas a tratar..."
     required
    />
    </div>

    {/* Action commands footer */}
    <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
    <button
     type="button"
     onClick={() => {
     setShowScheduleModal(false);
     setSchedulingLead(null);
     }}
     className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
    >
     Cancelar
    </button>
    <button
     type="submit"
     className="px-5.5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition duration-240 cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.3)]"
    >
     Agendar Cita Presencial
    </button>
    </div>
   </form>
   </div>
  </div>
  )}

  {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
  {deleteConfirmLeadId && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
   <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
   <div className="flex items-start gap-3">
    <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
    <AlertCircle className="w-6 h-6" />
    </div>
    <div className="space-y-1">
    <h4 className="text-sm font-sans font-bold text-white uppercase tracking-wide">
     ¿Eliminar Prospecto?
    </h4>
    <p className="text-xs text-slate-400 leading-relaxed font-sans">
     ¿Seguro que deseas eliminar definitivamente este lead de cold calling? Esta acción es irreversible y se borrarán todos sus registros de por vida.
    </p>
    </div>
   </div>
   <div className="flex gap-3 justify-end pt-2">
    <button
    type="button"
    onClick={() => setDeleteConfirmLeadId(null)}
    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer font-sans"
    >
    Cancelar
    </button>
    <button
    type="button"
    onClick={() => {
     if (deleteConfirmLeadId) {
     onDeleteColdLead(deleteConfirmLeadId);
     setDeleteConfirmLeadId(null);
     }
    }}
    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition duration-240 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.3)] font-sans"
    >
    Eliminar Registro
    </button>
   </div>
   </div>
  </div>
  )}

  {postponingClosingLead && (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xl">
   <div className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-amber-300/20 bg-[#080c12] shadow-[0_35px_140px_rgba(0,0,0,.8)]">
    <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] bg-gradient-to-r from-amber-400/[0.09] to-transparent p-6 sm:p-7">
     <div>
      <div className="flex items-center gap-2 text-amber-300"><Clock className="h-4 w-4"/><span className="font-mono text-[9px] font-black uppercase tracking-[.24em]">Agenda del closer</span></div>
      <h3 className="mt-2 text-2xl font-black text-white">Posponer cita</h3>
      <p className="mt-1 text-xs text-slate-400">Selecciona una nueva fecha para <strong className="text-slate-200">{postponingClosingLead.businessName}</strong>. Las horas ocupadas de Carlos aparecen en rojo.</p>
     </div>
     <button type="button" onClick={() => setPostponingClosingLead(null)} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4"/></button>
    </div>

    <div className="space-y-6 p-6 sm:p-7">
     <label className="block">
      <span className="mb-2 flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[.18em] text-slate-500"><Calendar className="h-3.5 w-3.5 text-amber-300"/>Nueva fecha</span>
      <input type="date" min={new Date().toISOString().split('T')[0]} value={postponeClosingDate} onChange={event => { setPostponeClosingDate(event.target.value); setPostponeClosingTime(''); }} className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white outline-none transition focus:border-amber-300/50"/>
     </label>

     <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
       <span className="font-mono text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Franja horaria</span>
       <div className="flex items-center gap-3 text-[9px] font-bold"><span className="flex items-center gap-1.5 text-emerald-300"><i className="h-2 w-2 rounded-full bg-emerald-400"/>Disponible</span><span className="flex items-center gap-1.5 text-rose-300"><i className="h-2 w-2 rounded-full bg-rose-400"/>Ocupada</span></div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
       {HOURLY_SLOTS.map(slot => {
        const conflict = postponeClosingDate ? getSlotConflict(postponeClosingDate, slot) : undefined;
        const busy = !!conflict;
        const selected = postponeClosingTime === slot;
        return (
         <button key={slot} type="button" disabled={busy || !postponeClosingDate} onClick={() => setPostponeClosingTime(slot)} title={busy ? `Ocupada: ${conflict?.title}` : `Disponible: ${slot}`} className={`min-h-12 rounded-2xl border px-2 py-2 text-[11px] font-black transition ${busy ? 'cursor-not-allowed border-rose-400/30 bg-rose-500/15 text-rose-300' : selected ? 'border-amber-200 bg-amber-300 text-slate-950 shadow-[0_10px_28px_rgba(252,211,77,.16)]' : 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/[0.12]'}`}>
          <span className="block">{slot}</span>
          <span className="mt-0.5 block truncate text-[7px] uppercase tracking-wider opacity-70">{busy ? 'Ocupada' : selected ? 'Elegida' : 'Libre'}</span>
         </button>
        );
       })}
      </div>
     </div>

     <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:justify-end">
      <button type="button" onClick={() => setPostponingClosingLead(null)} className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.07] hover:text-white">Cancelar</button>
      <button type="button" disabled={!postponeClosingDate || !postponeClosingTime} onClick={confirmPostponeClosingLead} className="rounded-2xl bg-amber-300 px-5 py-3 text-xs font-black text-slate-950 shadow-[0_14px_36px_rgba(252,211,77,.16)] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35">Confirmar nueva cita</button>
     </div>
    </div>
   </div>
  </div>
  )}

  {/* CONVERT TO CLIENT MODAL & FINANCIAL PLANNER */}
  {convertingLead && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
   <div className="w-full max-w-lg bg-[#0a0a14] border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/20 max-h-[90vh] flex flex-col my-8 text-left">
   <div className="bg-gradient-to-tr from-emerald-600/20 via-emerald-950/20 to-slate-950/10 p-6 border-b border-white/5 relative">
    <h3 className="text-sm font-bold text-white flex items-center gap-2">
    <Check className="w-5 h-5 text-emerald-400" />
    <span>Cerrar Venta / Convertir Lead en Cliente 🎯</span>
    </h3>
    <p className="text-[11px] text-slate-400 mt-1 font-sans">
    Asocia el servicio principal, precio y número de plazos. La comisión solo se calculará para esta venta principal, no para servicios futuros.
    </p>
    <button
    type="button"
    onClick={() => setConvertingLead(null)}
    className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-955/60 border border-white/5 cursor-pointer transition-colors"
    >
    <X className="w-4 h-4" />
    </button>
   </div>

   <form onSubmit={handleConfirmConvertToClient} className="p-6 overflow-y-auto space-y-4">
    <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1">
    <span className="block text-[8px] font-mono text-slate-500 uppercase">Lead a convertir</span>
    <span className="text-xs font-semibold text-slate-200">{convCompany || 'Sin especificar'}</span>
    <span className="text-[10px] text-slate-400 block font-sans">{convName} {convEmail ? `• ${convEmail}` : ''}</span>
    </div>

    {/* Client Info Grid */}
    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Información del Cliente</span>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     <div>
     <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Persona de Contacto</label>
     <input
      type="text"
      required
      value={convName}
      onChange={(e) => setConvName(e.target.value)}
      className="w-full bg-slate-900 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white"
     />
     </div>
     <div>
     <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Nombre Comercial / Empresa</label>
     <input
      type="text"
      required
      value={convCompany}
      onChange={(e) => setConvCompany(e.target.value)}
      className="w-full bg-slate-900 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white"
     />
     </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     <div>
     <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Email del Cliente</label>
     <input
      type="email"
      required
      value={convEmail}
      onChange={(e) => setConvEmail(e.target.value)}
      className="w-full bg-slate-900 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white"
     />
     </div>
     <div>
     <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Teléfono</label>
     <input
      type="text"
      required
      value={convPhone}
      onChange={(e) => setConvPhone(e.target.value)}
      className="w-full bg-slate-900 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white"
     />
     </div>
    </div>
    </div>

    {/* Financial Terms Panel - ONLY FOR CLIENT */}
    {convType === 'Client' && (
    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
     <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Condiciones Económicas de la Venta</span>

     <div>
     <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Concepto de Facturación</label>
     <input
      type="text"
      required={convType === 'Client'}
      value={convConcept}
      onChange={(e) => setConvConcept(e.target.value)}
      className="w-full bg-slate-900 border border-white/10 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white"
     />
     </div>

     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     <div>
      <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Importe del Contrato (EUR)</label>
      <div className="relative">
      <input
       type="number"
       min="1"
       required={convType === 'Client'}
       value={convSalePrice}
       onChange={(e) => setConvSalePrice(Number(e.target.value))}
       className="w-full bg-slate-900 border border-white/10 focus:border-emerald-500 rounded-xl pl-3 pr-7 py-2 text-xs text-white font-mono"
      />
      <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-mono">€</span>
      </div>
     </div>
     <div>
      <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">Fraccionar en Plazos (Mensual)</label>
      <input
      type="number"
      min="1"
      max="12"
      required={convType === 'Client'}
      value={convInstallments}
      onChange={(e) => setConvInstallments(Number(e.target.value))}
      className="w-full bg-slate-900 border border-white/10 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono"
      />
     </div>
     </div>
    </div>
    )}

    {/* Calculated Results Preview or Assignment Information */}
    {(() => {
    const assignedEmail = convertingLead.assignedToEmail || '';
    const matchedCom = comercialesList.find(c => c.email.toLowerCase() === assignedEmail.toLowerCase());
    const commPct = matchedCom?.commissionPercentage ?? 10;
    const totalComm = (convSalePrice * commPct) / 100;
    const installmentAmount = Math.round((convSalePrice / convInstallments) * 100) / 100;

    if (convType === 'Client') {
     return (
     <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl space-y-3 font-sans">
      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">Plan de Cobros y Liquidaciones</span>
      
      <div className="grid grid-cols-2 gap-4 text-xs">
      <div>
       <span className="text-slate-400 text-[10px]">Primer Cobro (Hoy):</span>
       <p className="font-mono text-white font-bold mt-0.5">{installmentAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
      </div>
      <div>
       <span className="text-slate-400 text-[10px]">Cuotas Pendientes:</span>
       <p className="font-mono text-slate-300 mt-0.5">
       {convInstallments > 1  ?
        `${convInstallments - 1} de ${installmentAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} / mes`
        : 'Ninguna (Pago Único)'
       }
       </p>
      </div>
      </div>

      <div className="border-t border-white/5 pt-2 flex justify-between items-center text-xs">
      <div>
       <span className="text-[10px] text-slate-400">Comercial Asignado:</span>
       <p className="font-semibold text-slate-200">{convertingLead.assignedToName || 'N/A'} ({assignedEmail || 'Sin email'})</p>
      </div>
      <div className="text-right">
       <span className="text-[10px] text-slate-400">Comisión Devengada ({commPct}%):</span>
       <p className="font-mono font-bold text-amber-400 text-sm mt-0.5">
       {totalComm.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
       </p>
      </div>
      </div>
     </div>
     );
    } else {
     return (
     <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl space-y-2.5 font-sans">
      <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest block">Asignación de Autoría</span>
      <div className="text-xs space-y-1">
      <p className="text-slate-300 leading-relaxed">
       El comercial <strong className="text-white">{convertingLead.assignedToName || 'N/A'}</strong> figurará permanentemente como el autor / asignado de este Lead.
      </p>
      <p className="text-slate-400 text-[10.5px] leading-relaxed">
       Si en el futuro la administración de la agencia cierra un contrato con este cliente, la venta le será atribuida automáticamente para el cobro de sus comisiones.
      </p>
      </div>
     </div>
     );
    }
    })()}

    <div className="flex gap-3 justify-end pt-2">
    <button
     type="button"
     onClick={() => setConvertingLead(null)}
     className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
    >
     Cancelar
    </button>
    <button
     type="submit"
     className={`px-5.5 py-2 text-white font-bold rounded-xl text-xs transition duration-240 cursor-pointer flex items-center gap-1.5 ${
     convType === 'Client' ?
      'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
      : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
     }`}
    >
     <CheckCircle2 className="w-3.5 h-3.5" />
     {convType === 'Client' ? 'Confirmar y Activar Cliente' : 'Confirmar y Traspasar como Lead'}
    </button>
    </div>
   </form>
   </div>
  </div>
  )}

 </div>
 );
}
