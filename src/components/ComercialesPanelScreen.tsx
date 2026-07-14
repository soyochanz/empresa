import React, { useState, useMemo, useEffect } from 'react';
import { 
 Users, 
 TrendingUp, 
 DollarSign, 
 PlusCircle, 
 Search, 
 Trash2, 
 Edit3, 
 ChevronDown, 
 Filter, 
 LogOut,
 Calendar,
 Layers,
 Inbox,
 Clock,
 Briefcase,
 TrendingDown,
 CheckCircle,
 Phone,
 Video,
 ExternalLink,
 Settings,
 CreditCard,
 Coins,
 History,
 RefreshCw,
 Award,
 Trophy,
 Snowflake,
 Lock,
 Eye,
 EyeOff,
 GraduationCap
 ,Camera
 ,Upload
} from 'lucide-react';
import { ComercialAccount, ComercialLead, ColdCallingLead, CalendarEvent, ClientContact } from '../types';
import ColdCallingScreen from './ColdCallingScreen';
import DossierModal from './DossierModal';
import { calculateLegacyPoints } from '../utils/salesRewards';
import CommercialAnalyticsDashboard from './CommercialAnalyticsDashboard';
import CommercialTrainingCenter from './CommercialTrainingCenter';
import CommercialCalendarWorkspace from './CommercialCalendarWorkspace';

const safeConfirm = (msg: string): boolean => {
 const isIframe = window.self !== window.top;
 if (isIframe) return true; // Auto-confirm inside sandbox iframe preview
 try {
 return window.confirm(msg);
 } catch (e) {
 return true;
 }
};

const STRIPE_CONNECT_TEMPORARILY_DISABLED = true;
type CommercialView = 'pipeline' | 'calendar' | 'cold_calling' | 'rewards' | 'training' | 'settings';
const COMMERCIAL_VIEW_PATHS: Record<CommercialView, string> = {
 pipeline: '/comerciales/panel',
 calendar: '/comerciales/panel/calendario',
 cold_calling: '/comerciales/panel/cold-calling',
 rewards: '/comerciales/panel/recompensas',
 training: '/comerciales/panel/formacion',
 settings: '/comerciales/panel/ajustes',
};
const getCommercialViewFromPath = (path: string): CommercialView => {
 const normalized = path.replace(/\/+$/, '');
 const match = (Object.entries(COMMERCIAL_VIEW_PATHS) as Array<[CommercialView, string]>).find(([, route]) => route === normalized);
 return match?.[0] || 'pipeline';
};
const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_MAX_PIXELS = 24_000_000;
const PROFILE_IMAGE_SIZE = 384;

const inspectSafeRaster = (bytes: Uint8Array): { mime: 'image/png' | 'image/jpeg'; width: number; height: number } => {
 const isPng = bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value);
 if (isPng) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { mime: 'image/png', width: view.getUint32(16), height: view.getUint32(20) };
 }

 const isJpeg = bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
 if (isJpeg) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  const startOfFrame = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  while (offset + 8 < bytes.length) {
   if (bytes[offset] !== 0xff) { offset += 1; continue; }
   while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
   const marker = bytes[offset++];
   if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
   if (offset + 2 > bytes.length) break;
   const segmentLength = view.getUint16(offset);
   if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
   if (startOfFrame.has(marker) && segmentLength >= 7) {
    return { mime: 'image/jpeg', height: view.getUint16(offset + 3), width: view.getUint16(offset + 5) };
   }
   offset += segmentLength;
  }
 }
 throw new Error('El archivo no es un JPEG o PNG válido.');
};

const sanitizeProfileImage = async (file: File): Promise<string> => {
 if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Solo se permiten imágenes JPEG o PNG.');
 if (file.size <= 0 || file.size > PROFILE_IMAGE_MAX_BYTES) throw new Error('La imagen debe ocupar menos de 5 MB.');
 const bytes = new Uint8Array(await file.arrayBuffer());
 const inspected = inspectSafeRaster(bytes);
 if (!inspected.width || !inspected.height || inspected.width > 8192 || inspected.height > 8192 || inspected.width * inspected.height > PROFILE_IMAGE_MAX_PIXELS) {
  throw new Error('La imagen supera el límite seguro de dimensiones.');
 }
 const bitmap = await createImageBitmap(new Blob([bytes], { type: inspected.mime }));
 try {
  if (bitmap.width !== inspected.width || bitmap.height !== inspected.height) throw new Error('La estructura interna de la imagen no es coherente.');
  const canvas = document.createElement('canvas');
  canvas.width = PROFILE_IMAGE_SIZE;
  canvas.height = PROFILE_IMAGE_SIZE;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('No se pudo procesar la imagen.');
  context.fillStyle = '#0b1017';
  context.fillRect(0, 0, PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE);
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - sourceSize) / 2;
  const sourceY = (bitmap.height - sourceSize) / 2;
  context.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE);
  const output = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo optimizar la imagen.')), 'image/webp', 0.82));
  if (output.type !== 'image/webp' || output.size > 300_000) throw new Error('No se pudo generar una versión optimizada segura.');
  return await new Promise<string>((resolve, reject) => {
   const reader = new FileReader();
   reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer la imagen optimizada.'));
   reader.onerror = () => reject(new Error('No se pudo leer la imagen optimizada.'));
   reader.readAsDataURL(output);
  });
 } finally {
  bitmap.close();
 }
};

export const getTieredCommission = (closures: number): number => {
 if (closures <= 0) return 10;
 if (closures >= 1 && closures <= 3) return 10;
 if (closures >= 4 && closures <= 6) return 11;
 if (closures >= 7 && closures <= 9) return 12;
 if (closures >= 10 && closures <= 12) return 13.5;
 if (closures >= 13 && closures <= 14) return 15;
 if (closures >= 15 && closures <= 16) return 16;
 if (closures === 17) return 17;
 return 18; // 18 o más
};

const COMMISSION_TIERS = [
 { name: 'Etapa 1', min: 0, max: 3, pct: 10 },
 { name: 'Etapa 2', min: 4, max: 6, pct: 11 },
 { name: 'Etapa 3', min: 7, max: 9, pct: 12 },
 { name: 'Etapa 4', min: 10, max: 12, pct: 13.5 },
 { name: 'Etapa 5', min: 13, max: 14, pct: 15 },
 { name: 'Etapa 6', min: 15, max: 16, pct: 16 },
 { name: 'Etapa 7', min: 17, max: 17, pct: 17 },
 { name: 'Etapa Elite', min: 18, max: Infinity, pct: 18 }
];

const getCommissionTierInfo = (closures: number) => {
 const normalizedClosures = Math.max(closures, 0);
 const currentIndex = COMMISSION_TIERS.findIndex(t => normalizedClosures >= t.min && normalizedClosures <= t.max);
 const current = COMMISSION_TIERS[currentIndex >= 0 ? currentIndex : 0];
 const next = COMMISSION_TIERS[currentIndex + 1];
 const progress = next ? Math.min(98, Math.max(0, (normalizedClosures / next.min) * 100)) : 100;
 return {
 current,
 next,
 progress,
 missingToNext: next ? Math.max(0, next.min - closures) : 0
 };
};

interface ComercialesPanelScreenProps {
 comercial: ComercialAccount;
 leadsList: ComercialLead[];
 onAddLead: (lead: ComercialLead) => void;
 onUpdateLead: (lead: ComercialLead) => void;
 onDeleteLead: (id: string) => void;
 onUpdateComercial?: (updated: ComercialAccount) => void;
 onLogout: () => void;
 
 // Cold Calling integrations
 coldLeads: ColdCallingLead[];
 comercialesList: ComercialAccount[];
 onAddColdLead: (lead: ColdCallingLead) => void;
 onUpdateColdLead: (lead: ColdCallingLead) => void;
 onDeleteColdLead: (id: string) => void;

 events: CalendarEvent[];
 onAddEvent: (event: CalendarEvent) => void;
 onUpdateEvent: (event: CalendarEvent) => void;
 onDeleteEvent: (id: string) => void;
 usersList: any[];
 finTransactions?: any[];
 contacts?: ClientContact[];
 onAddContact?: (contact: ClientContact) => void;
}

export default function ComercialesPanelScreen({
 comercial,
 leadsList,
 onAddLead,
 onUpdateLead,
 onDeleteLead,
 onUpdateComercial,
 onLogout,
 
 // Cold Calling integrations
 coldLeads,
 comercialesList,
 onAddColdLead,
 onUpdateColdLead,
 onDeleteColdLead,
 
 events,
 onAddEvent,
 onUpdateEvent,
 onDeleteEvent,
 usersList,
 finTransactions = [],
 contacts = [],
 onAddContact
}: ComercialesPanelScreenProps) {
 // Local state
 const [activeView, setActiveView] = useState<CommercialView>(() => getCommercialViewFromPath(window.location.pathname));
 const navigateCommercialView = (view: CommercialView) => {
  setActiveView(view);
  const nextPath = COMMERCIAL_VIEW_PATHS[view];
  if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath);
 };

 useEffect(() => {
  const restoreViewFromPath = () => setActiveView(getCommercialViewFromPath(window.location.pathname));
  window.addEventListener('popstate', restoreViewFromPath);
  return () => window.removeEventListener('popstate', restoreViewFromPath);
 }, []);
 const [showMonthlyRecap, setShowMonthlyRecap] = useState(false);
 const [recapStep, setRecapStep] = useState(0);
 const [stripeConnectLoading, setStripeConnectLoading] = useState(false);
 const [stripeConnectError, setStripeConnectError] = useState('');
 const [bankDraft, setBankDraft] = useState({ bankName: comercial.bankName || '', iban: comercial.iban || '', bic: comercial.bic || '' });
 const [passwordDraft, setPasswordDraft] = useState({ current: '', next: '', confirm: '' });
 const [showPasswords, setShowPasswords] = useState(false);
 const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
 const [avatarProcessing, setAvatarProcessing] = useState(false);
 const [avatarFeedback, setAvatarFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
 
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('todos');
 const [showAddModal, setShowAddModal] = useState(false);
 const [showDossierModal, setShowDossierModal] = useState(false);
 const [leadTemperature, setLeadTemperature] = useState<'Frío' | 'Templado' | 'Caliente'>('Frío');

 // Quick Call Logging states on Dashboard
 const [activeLoggerLeadId, setActiveLoggerLeadId] = useState<string | null>(null);
 const [quickLogNotes, setQuickLogNotes] = useState('');
 const [quickLogResult, setQuickLogResult] = useState('Responde');

 const readStripeJson = async (response: Response) => {
 const contentType = response.headers.get('content-type') || '';
 if (!contentType.includes('application/json')) {
  throw new Error('La API de Stripe no esta disponible. Abre la app desde el servidor Node, no solo como frontend estatico.');
 }
 return response.json();
 };

 const handleConnectStripe = async () => {
 if (STRIPE_CONNECT_TEMPORARILY_DISABLED) return;
 if (!onUpdateComercial) return;
 setStripeConnectLoading(true);
 setStripeConnectError('');
 try {
  const response = await fetch('/api/stripe/create-connect-account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
   comercialId: comercial.id,
   comercialName: comercial.name,
   comercialEmail: comercial.email,
   existingAccountId: comercial.stripeConnectAccountId || '',
  }),
  });
  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'No se pudo conectar con Stripe');
  }
  onUpdateComercial({
  ...comercial,
  stripeConnectAccountId: data.accountId,
  stripeOnboardingCompleted: data.onboardingCompleted,
  stripePayoutsEnabled: data.payoutsEnabled,
  stripeChargesEnabled: data.chargesEnabled,
  });
  window.open(data.url, '_blank', 'noopener,noreferrer');
 } catch (err: any) {
  setStripeConnectError(err?.message || 'No se pudo iniciar Stripe Connect.');
 } finally {
  setStripeConnectLoading(false);
 }
 };

 const handleRefreshStripeStatus = async () => {
 if (STRIPE_CONNECT_TEMPORARILY_DISABLED) return;
 if (!onUpdateComercial || !comercial.stripeConnectAccountId) return;
 setStripeConnectLoading(true);
 setStripeConnectError('');
 try {
  const response = await fetch('/api/stripe/connect-account-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stripeConnectAccountId: comercial.stripeConnectAccountId }),
  });
  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'No se pudo actualizar Stripe');
  }
  onUpdateComercial({
  ...comercial,
  stripeOnboardingCompleted: data.onboardingCompleted,
  stripePayoutsEnabled: data.payoutsEnabled,
  stripeChargesEnabled: data.chargesEnabled,
  });
 } catch (err: any) {
  setStripeConnectError(err?.message || 'No se pudo actualizar el estado de Stripe.');
 } finally {
  setStripeConnectLoading(false);
 }
 };
 const [quickLogTemp, setQuickLogTemp] = useState<'Frío' | 'Templado' | 'Caliente'>('Templado');
 const handleChangePassword = (event: React.FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 setPasswordFeedback(null);

 if (!onUpdateComercial) {
  setPasswordFeedback({ type: 'error', text: 'No se pudo guardar el cambio. Vuelve a intentarlo en unos segundos.' });
  return;
 }

 if (passwordDraft.current !== (comercial.password || '')) {
  setPasswordFeedback({ type: 'error', text: 'La contrasena actual no es correcta.' });
  return;
 }

 if (passwordDraft.next.trim().length < 6) {
  setPasswordFeedback({ type: 'error', text: 'La nueva contrasena debe tener al menos 6 caracteres.' });
  return;
 }

 if (passwordDraft.next !== passwordDraft.confirm) {
  setPasswordFeedback({ type: 'error', text: 'La nueva contrasena y la confirmacion no coinciden.' });
  return;
 }

 if (passwordDraft.next === passwordDraft.current) {
  setPasswordFeedback({ type: 'error', text: 'La nueva contrasena debe ser distinta a la actual.' });
  return;
 }

 onUpdateComercial({ ...comercial, password: passwordDraft.next });
 setPasswordDraft({ current: '', next: '', confirm: '' });
 setPasswordFeedback({ type: 'success', text: 'Contrasena actualizada correctamente.' });
 };

 const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || !onUpdateComercial) return;
  setAvatarProcessing(true);
  setAvatarFeedback(null);
  try {
   const avatarUrl = await sanitizeProfileImage(file);
   onUpdateComercial({ ...comercial, avatarUrl });
   setAvatarFeedback({ type: 'success', text: 'Imagen validada, optimizada y guardada correctamente.' });
  } catch (error: any) {
   setAvatarFeedback({ type: 'error', text: error?.message || 'La imagen no ha superado la validación de seguridad.' });
  } finally {
   setAvatarProcessing(false);
  }
 };

 const [quickLogScheduled, setQuickLogScheduled] = useState<string>('Llamada hecha');
 const [quickLogCallbackDate, setQuickLogCallbackDate] = useState('');
 const [quickLogCallbackTime, setQuickLogCallbackTime] = useState('10:00');

 const handleSaveQuickCallLog = (lead: ColdCallingLead) => {
 if (quickLogScheduled === 'Llamar más tarde' && !quickLogCallbackDate) {
  alert('Por favor indica una fecha para posponer la llamada.');
  return;
 }

 const currentNotes = quickLogNotes.trim() || 'Llamada realizada (Dashboard rápido).';
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
  result: `Resultado: ${quickLogResult} | Agendada: ${quickLogScheduled}`
 };

 const updatedLogs = [newLogItem, ...(lead.callsLog || [])];

 const updatedLead: ColdCallingLead = {
  ...lead,
  contacted: quickLogResult === 'No responde' ? 'No' : 'Sí',
  answered: quickLogResult === 'No responde' ? 'No' : 'Sí',
  temperature: quickLogTemp,
  callbackScheduled: quickLogScheduled === 'Llamar más tarde' ? 'Llamar más tarde' : 'No',
  callbackDate: quickLogScheduled === 'Llamar más tarde' ? quickLogCallbackDate : undefined,
  callbackTime: quickLogScheduled === 'Llamar más tarde' ? quickLogCallbackTime : undefined,
  notes: currentNotes,
  callDate: new Date().toISOString().split('T')[0],
  callsCount: updatedLogs.length,
  callsLog: updatedLogs
 };

 onUpdateColdLead(updatedLead);
 setActiveLoggerLeadId(null);
 setQuickLogNotes('');
 setQuickLogResult('Responde');
 };

 // Form state
 const [leadName, setLeadName] = useState('');
 const [leadCompany, setLeadCompany] = useState('');
 const [leadEmail, setLeadEmail] = useState('');
 const [leadPhone, setLeadPhone] = useState('');
 const [leadStatus, setLeadStatus] = useState<ComercialLead['status']>('Pendiente');
 const [leadValue, setLeadValue] = useState('');
 const [leadNotes, setLeadNotes] = useState('');

 // Dynamic calculation: If a lead belongs to a client contact with status === 'Client', we count it as 'Ganado'. Also append converted client contacts.
 const mappedLeadsList = useMemo(() => {
 const getAdminSaleTotal = (contact: ClientContact): number => {
  const nameLower = contact.name?.toLowerCase() || '';
  const companyLower = contact.company?.toLowerCase() || '';
  const emailLower = contact.email?.toLowerCase() || '';

  const saleTxs = finTransactions.filter(tx => {
  if (tx.type !== 'income' || tx.isInitialSale !== true) return false;
  if (tx.clientId === contact.id) return true;
  const descLower = tx.description?.toLowerCase() || '';
  return (!!nameLower && descLower.includes(nameLower)) ||
   (!!companyLower && descLower.includes(companyLower)) ||
   (!!emailLower && tx.comercialEmail?.toLowerCase() === emailLower);
  });

  return saleTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
 };

 // 1. Map existing leads, force to 'Ganado' if matching contact is 'Client'
 const updated = leadsList
  .map(lead => {
  const matchingContact = contacts.find(c => 
   (lead.email && c.email && lead.email.toLowerCase() === c.email.toLowerCase()) ||
   (lead.name && c.name && lead.name.toLowerCase() === c.name.toLowerCase())
  );
  
  if (matchingContact && matchingContact.status === 'Client') {
   const adminSaleTotal = getAdminSaleTotal(matchingContact);
   return {
   ...lead,
   status: 'Ganado' as const,
   value: adminSaleTotal || lead.value || 0
   };
  }
  return lead;
  })
  .filter(lead => {
  // If a lead has status 'Ganado', we only keep it if a matching 'Client' actually exists in the contacts list.
  // This ensures deleting a client or removing their client status instantly removes them from commercial stats.
  if (lead.status === 'Ganado') {
   return contacts.some(c => 
   c.status === 'Client' && 
   ((lead.email && c.email && lead.email.toLowerCase() === c.email.toLowerCase()) ||
    (lead.name && c.name && lead.name.toLowerCase() === c.name.toLowerCase()))
   );
  }
  return true;
  });

 // 2. Find client contacts associated with the current commercial that are NOT already in leadsList
 const newLeadsFromClients: ComercialLead[] = [];
 contacts.forEach(c => {
  if (c.status === 'Client' || c.status === 'Lead') {
  // Check if this client is associated with the commercial
  const isAssociated = 
   (c.contactedByComercialEmail && c.contactedByComercialEmail.toLowerCase() === comercial.email.toLowerCase()) ||
   (c.contactedByComercialName && c.contactedByComercialName.toLowerCase() === comercial.name.toLowerCase()) ||
   (c.assignedUserEmail && c.assignedUserEmail.toLowerCase() === comercial.email.toLowerCase());

  if (isAssociated) {
   // Check if already represented in updated leads list
   const alreadyExists = updated.some(l => 
   (l.email && c.email && l.email.toLowerCase() === c.email.toLowerCase()) ||
   (l.name && c.name && l.name.toLowerCase() === c.name.toLowerCase())
   );

   if (!alreadyExists) {
   const adminSaleTotal = getAdminSaleTotal(c);

   newLeadsFromClients.push({
    id: 'lead_client_sync_' + c.id,
    comercialId: comercial.id,
    comercialName: comercial.name,
    name: c.name,
    company: c.company || 'Empresa',
    email: c.email || '',
    phone: c.phone || '',
    status: c.status === 'Client' ? 'Ganado' : 'Pendiente',
    value: adminSaleTotal || (c as any).estimatedValue || 0,
    notes: c.status === 'Client' ? 'Importado de Cartera de Clientes CRM' : 'Importado de Prospectos (Leads) CRM',
    createdAt: (c as any).createdAt || new Date().toISOString(),
    temperature: c.temperature || 'Caliente'
   });
   }
  }
  }
 });

 return [...updated, ...newLeadsFromClients];
 }, [leadsList, contacts, finTransactions, comercial]);

 // Filtering leads belonging to THIS commercial
 const myLeads = mappedLeadsList.filter(l => l.comercialId === comercial.id);

 // Compute stats
 const totalLeads = myLeads.length;
 const activeLeads = myLeads.filter(l => l.status !== 'Ganado' && l.status !== 'Perdido');
 const wonLeads = myLeads.filter(l => l.status === 'Ganado');
 const conversionRate = totalLeads ? Math.round((wonLeads.length / totalLeads) * 100) : 0;
 const postponedColdLeads = coldLeads.filter(l => 
 !l.archived &&
 l.assignedToEmail?.toLowerCase() === comercial.email.toLowerCase() &&
 l.callbackScheduled === 'Llamar más tarde'
 );
 
 // Pipeline value
 const totalPipeline = myLeads.reduce((sum, l) => sum + (l.status !== 'Perdido' ? Number(l.value || 0) : 0), 0);
 const wonRevenue = wonLeads.reduce((sum, l) => sum + Number(l.value || 0), 0);

 // Commission & Benefits calculations for this commercial - Now automatically tiered/escalonated!
 const myInitialTxs = finTransactions.filter(tx => 
 tx.isInitialSale === true && 
 (tx.comercialId === comercial.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === comercial.email.toLowerCase()))
 );
 const myInitialTxsPaid = myInitialTxs.filter(tx => tx.status === 'paid');
 const myCommissionPercentage = comercial.commissionPercentage ?? getTieredCommission(Math.max(wonLeads.length, myInitialTxs.length));
 const myClosuresForTier = Math.max(wonLeads.length, myInitialTxs.length);
 const myTierInfo = getCommissionTierInfo(myClosuresForTier);
 const myInitialSalesVolume = myInitialTxsPaid.reduce((sum, tx) => sum + (tx.amount || 0), 0);
 const myTotalSalesVolume = myInitialTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
 const myBenefitsEarned = myInitialSalesVolume * (myCommissionPercentage / 100);
 const myExtraCommissions = (comercial.extraCommissions || []).reduce((sum, extra) => sum + Number(extra.amount || 0), 0);
 const myBenefitsEarnedWithExtras = myBenefitsEarned + myExtraCommissions;
 const myBenefitsPotential = (myTotalSalesVolume * (myCommissionPercentage / 100)) + myExtraCommissions;
 const myBenefitsPendingOnClientPayment = Math.max(0, myBenefitsPotential - myBenefitsEarnedWithExtras);
 const myBenefitsPaidOut = (comercial.payouts || [])
 .filter(p => p.status === 'completed')
 .reduce((sum, p) => sum + p.amount, 0);
 const myBenefitsReadyToPayout = Math.max(0, myBenefitsEarnedWithExtras - myBenefitsPaidOut);
 const myColdCallsCount = coldLeads
 .filter(l => l.assignedToEmail?.toLowerCase() === comercial.email.toLowerCase())
 .reduce((sum, l) => sum + (l.callsCount || 0), 0);
 const liveComercial = comercialesList.find(item => item.id === comercial.id) || comercial;
 const myLegacy = calculateLegacyPoints(liveComercial, finTransactions, events, coldLeads, contacts);
 const recapSlides = [
 {
  label: 'Recap mensual Althera',
  title: `${comercial.name}, este mes tuvo tu firma`,
  body: 'Gracias de parte de Althera por tu compromiso y dedicación. Tu constancia sostiene el crecimiento de la plataforma.',
  value: wonRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  caption: 'generados en ventas',
  Icon: Award,
  gradient: 'from-amber-400 via-orange-500 to-rose-500'
 },
 {
  label: 'Actividad comercial',
  title: `Hiciste ${myColdCallsCount} llamadas y mantuviste el ritmo`,
  body: 'Cada llamada suma información, confianza y oportunidades para el siguiente cierre.',
  value: myColdCallsCount,
  caption: 'llamadas registradas',
  Icon: Phone,
  gradient: 'from-cyan-300 via-blue-500 to-violet-500'
 },
 {
  label: 'Clientes conseguidos',
  title: `${wonLeads.length} clientes entraron por tu trabajo`,
  body: `Tu conversión del mes fue del ${conversionRate}%. Sigue afinando el seguimiento: ahí es donde se ganan los detalles.`,
  value: wonLeads.length,
  caption: 'clientes ganados',
  Icon: Users,
  gradient: 'from-emerald-300 via-teal-500 to-cyan-500'
 },
 {
  label: 'Nivel y progreso',
  title: `Estás en ${myTierInfo.current.name}`,
  body: myTierInfo.next ? `Te faltan ${myTierInfo.missingToNext} cierres para subir al ${myTierInfo.next.pct}%.` : 'Has llegado al nivel máximo. Ahora toca sostenerlo y convertirlo en hábito.',
  value: `${Math.round(myTierInfo.progress)}%`,
  caption: 'hacia el siguiente tier',
  Icon: TrendingUp,
  gradient: 'from-violet-300 via-fuchsia-500 to-amber-400'
 },
 {
  label: 'Comisiones',
  title: 'Tu esfuerzo ya tiene recompensa asignada',
  body: myExtraCommissions > 0 ? 'Además de tus comisiones normales, tienes extras añadidos este mes.' : 'Tus comisiones siguen calculándose con el sistema actual, con precisión sobre los pagos cobrados.',
  value: myBenefitsReadyToPayout.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
  caption: 'listo para liquidar',
  Icon: DollarSign,
  gradient: 'from-lime-300 via-emerald-500 to-sky-500'
 }
 ];
 const activeRecapSlide = recapSlides[recapStep % recapSlides.length];

 useEffect(() => {
 if (!showMonthlyRecap) return;
 setRecapStep(0);
 const timer = window.setInterval(() => {
  setRecapStep(step => (step + 1) % recapSlides.length);
 }, 4800);
 return () => window.clearInterval(timer);
 }, [showMonthlyRecap, recapSlides.length]);

 // Status distributions for chart
 const statusCounts = {
 Pendiente: myLeads.filter(l => l.status === 'Pendiente').length,
 Contactado: myLeads.filter(l => l.status === 'Contactado').length,
 'Negociación': myLeads.filter(l => l.status === 'Negociación').length,
 Ganado: myLeads.filter(l => l.status === 'Ganado').length,
 Perdido: myLeads.filter(l => l.status === 'Perdido').length,
 };

 const statusColors: Record<ComercialLead['status'], string> = {
 Pendiente: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
 Contactado: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
 'Negociación': 'bg-amber-500/10 text-amber-300 border-amber-500/20',
 Ganado: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
 Perdido: 'bg-rose-500/10 text-rose-300 border-rose-500/20'
 };

 const handleCreateLead = (e: React.FormEvent) => {
 e.preventDefault();
 if (!leadName.trim() || !leadCompany.trim()) {
  alert('Por favor introduce al menos el nombre del contacto y su empresa/organización.');
  return;
 }

 const valNum = parseFloat(leadValue) || 0;

 const newLead: ComercialLead = {
  id: 'lead_' + Math.random().toString(36).substring(2, 11),
  comercialId: comercial.id,
  comercialName: comercial.name,
  name: leadName.trim(),
  company: leadCompany.trim(),
  email: leadEmail.trim() || 'sincorreo@comercial.com',
  phone: leadPhone.trim() || 'Sin teléfono',
  status: leadStatus,
  value: valNum,
  notes: leadNotes.trim(),
  temperature: leadTemperature,
  createdAt: new Date().toISOString()
 };

 onAddLead(newLead);
 
 // reset form
 setLeadName('');
 setLeadCompany('');
 setLeadEmail('');
 setLeadPhone('');
 setLeadStatus('Pendiente');
 setLeadValue('');
 setLeadNotes('');
 setLeadTemperature('Frío');
 setShowAddModal(false);
 };

 const handleUpdateStatus = (id: string, newStats: ComercialLead['status']) => {
 const lead = myLeads.find(l => l.id === id);
 if (lead) {
  onUpdateLead({
  ...lead,
  status: newStats
  });
 }
 };

 // Filter & Search computation
 const filteredLeads = myLeads.filter(lead => {
 const matchesSearch = 
  lead.name.toLowerCase().includes(search.toLowerCase()) ||
  lead.company.toLowerCase().includes(search.toLowerCase()) ||
  (lead.notes && lead.notes.toLowerCase().includes(search.toLowerCase()));
 
 const matchesFilter = statusFilter === 'todos' || lead.status === statusFilter;
 return matchesSearch && matchesFilter;
 });

 return (
 <div className="h-screen bg-[#030308] text-slate-100 flex flex-col font-sans relative overflow-hidden">
  <style>{`@keyframes tierFlow { 0% { background-position: 0% 50%; } 100% { background-position: 220% 50%; } }`}</style>
  
  {/* Elegant glassmorphism and modern gradient overlays */}
  <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />
  <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-blue-600/5 blur-[160px] pointer-events-none" />
  <div className="absolute top-[40%] left-[30%] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.03] blur-[140px] pointer-events-none" />

  {/* Official Althera Large Transparent Watermark Background */}
  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
  <img 
   src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" 
   alt="Althera Watermark Logo" 
   className="w-[680px] h-[680px] object-contain max-w-[90vw] animate-pulse"
   style={{ animationDuration: '12s' }}
   referrerPolicy="no-referrer"
  />
  </div>

  {/* DESKTOP APP SIDEBAR */}
  <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.07] bg-[#080b10]/95 px-4 py-5 backdrop-blur-2xl lg:flex">
   <div className="flex items-center gap-3 px-2">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-lime-400/20 bg-lime-400/10"><img src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" alt="Althera" className="h-8 w-8 object-contain" /></div>
    <div><p className="text-sm font-black tracking-[.12em] text-white">ALTHERA</p><p className="text-[8px] font-bold uppercase tracking-[.22em] text-lime-300">Sales workspace</p></div>
   </div>
   <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="flex items-center gap-3">{comercial.avatarUrl ? <img src={comercial.avatarUrl} alt={`Perfil de ${comercial.name}`} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-300 to-emerald-500 text-xs font-black text-slate-950">{comercial.name.slice(0,2).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-xs font-bold text-white">{comercial.name}</p><p className="truncate text-[9px] text-slate-500">{comercial.email}</p></div></div><div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3"><span className="text-[9px] text-slate-500">Legado {myLegacy.rank.name}</span><strong className="text-[10px] text-violet-300">{myLegacy.total.toLocaleString('es-ES')} PA</strong></div></div>
   <p className="mb-2 mt-8 px-3 text-[8px] font-black uppercase tracking-[.24em] text-slate-600">Workspace</p>
   <nav className="space-y-1">{[
    { id: 'pipeline', label: 'Overview', Icon: Layers },
    { id: 'calendar', label: 'Calendario', Icon: Calendar },
    { id: 'rewards', label: 'Rewards & Legado', Icon: Trophy },
    { id: 'cold_calling', label: 'Cold Calling', Icon: Snowflake },
    { id: 'training', label: 'Formación', Icon: GraduationCap },
    { id: 'settings', label: 'Ajustes', Icon: Settings },
   ].map(item => <button key={item.id} onClick={() => navigateCommercialView(item.id as CommercialView)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold transition ${activeView === item.id ? 'bg-lime-300 text-slate-950 shadow-[0_10px_25px_rgba(163,230,53,.14)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><item.Icon className="h-4 w-4"/><span>{item.label}</span>{activeView === item.id && <ChevronDown className="ml-auto h-3 w-3 -rotate-90"/>}</button>)}</nav>
   <div className="mt-auto rounded-2xl border border-white/[0.07] bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-4"><p className="text-[8px] font-black uppercase tracking-widest text-violet-300">Comisión actual</p><p className="mt-1 text-2xl font-black text-white">{myCommissionPercentage}%</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-lime-300" style={{ width: `${myTierInfo.progress}%` }}/></div></div>
   <button onClick={onLogout} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-rose-400/15 bg-rose-500/[0.06] px-3 py-3 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15 hover:text-white"><LogOut className="h-4 w-4"/><span>Cerrar sesión</span></button>
  </aside>

  {/* VIEWPORT CANVAS */}
  <main className="relative z-10 min-h-0 w-full flex-1 space-y-6 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-28 lg:ml-64 lg:w-[calc(100%_-_16rem)] lg:p-7 xl:p-9">
  
  {/* WELCOME BANNER WITH ANALYTICS BRIEF */}
  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-4">
   <div>
   <h2 className="text-2xl font-bold tracking-tight text-white">¡Hola de nuevo, {comercial.name}!</h2>
   <p className="text-xs text-slate-400 mt-1">Este es tu panel centralizado de carteras de clientes rápidos. Sigue tus objetivos de conversión.</p>
   </div>
  </div>

  <div className="bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-cyan-500/10 border border-amber-500/15 rounded-2xl p-5 overflow-hidden relative">
   <div className="absolute right-3 top-2 sm:right-5 sm:top-3 h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center">
   <div className="absolute inset-3 rounded-full blur-2xl opacity-25" style={{ backgroundColor: myLegacy.rank.accent }} />
   <img src={myLegacy.rank.asset} alt={`Rango ${myLegacy.rank.name}`} className="relative h-full w-full object-contain drop-shadow-xl" />
   </div>
   <div className="pr-24 sm:pr-28">
   <div className="flex flex-wrap items-center gap-2">
    <span className="text-[9px] uppercase tracking-[0.22em] text-amber-300 font-mono font-black">Nivel comercial</span>
    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-200 text-[10px] font-mono font-black">
    {myTierInfo.current.name}
    </span>
    <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/20 text-violet-200 text-[10px] font-mono font-black">
    Legado {myLegacy.rank.name} · {myLegacy.total.toLocaleString('es-ES')} PA
    </span>
   </div>
   <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
    <div>
    <p className="text-3xl font-black text-white font-mono leading-none">{myCommissionPercentage}%</p>
    <p className="text-xs text-slate-400 mt-2">
     {myClosuresForTier} {myClosuresForTier === 1 ? 'cierre validado' : 'cierres validados'} este periodo.
     {myTierInfo.next ? ` Te faltan ${myTierInfo.missingToNext} para subir a ${myTierInfo.next.pct}%.` : ' Estas en el nivel maximo.'}
    </p>
    </div>
    <div className="md:w-80">
    <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1.5">
     <span>{myTierInfo.current.min} cierres</span>
     <span>{myTierInfo.next ? `${myTierInfo.next.min} cierres` : 'Elite'}</span>
    </div>
    <div className="h-2.5 bg-black/30 rounded-full overflow-hidden border border-white/5">
     <div
     className="h-full rounded-full bg-[linear-gradient(110deg,#fbbf24_0%,#fef08a_35%,#67e8f9_70%,#fbbf24_100%)] bg-[length:220%_100%] animate-[tierFlow_2.8s_linear_infinite] transition-[width] duration-700"
     style={{ width: `${myTierInfo.progress}%` }}
     />
    </div>
    </div>
   </div>
   </div>
  </div>

  {/* VIEW MODE TABS FOR COMERCIAL (CRM vs COLD CALLING vs SETTINGS) */}
  <div className="fixed bottom-3 left-3 right-3 z-50 grid grid-cols-6 gap-1 rounded-2xl border border-white/10 bg-[#090d13]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:hidden">
   <button
   onClick={() => navigateCommercialView('pipeline')}
   className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
    activeView === 'pipeline' ?
     'bg-violet-650/20 text-violet-400 border border-violet-500/30'
     : 'text-slate-400 hover:text-white'
   }`}
   >
   <Layers className="w-3.5 h-3.5" />
   <span>Pipeline CRM</span>
   </button>

   <button
   onClick={() => navigateCommercialView('calendar')}
   className={`flex-1 py-2 px-0.5 rounded-xl text-[8px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
    activeView === 'calendar' ? 'bg-lime-300 text-slate-950' : 'text-slate-400 hover:text-white'
   }`}
   >
   <Calendar className="w-3.5 h-3.5" />
   <span>Agenda</span>
   </button>

   <button
   onClick={() => navigateCommercialView('training')}
   className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
    activeView === 'training' ? 'bg-lime-300 text-slate-950' : 'text-slate-400 hover:text-white'
   }`}
   >
   <GraduationCap className="w-3.5 h-3.5" />
   <span>Formación</span>
   </button>

   <button
   onClick={() => navigateCommercialView('rewards')}
   className={`py-2 px-1 rounded-xl text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
    activeView === 'rewards' ?
     'bg-amber-500/15 text-amber-300 border border-amber-400/30 shadow-[0_0_18px_rgba(251,191,36,0.08)]'
     : 'text-slate-400 hover:text-amber-300 hover:bg-amber-950/20'
   }`}
   >
   <Trophy className="w-3.5 h-3.5" />
   <span>Recompensas</span>
   </button>
   
   <button
   onClick={() => navigateCommercialView('cold_calling')}
   className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer relative ${
    activeView === 'cold_calling' ?
     'bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 shadow-[0_0_18px_rgba(34,211,238,0.08)]'
     : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/20'
   }`}
   >
   <Snowflake className="w-3.5 h-3.5" />
   <span>Cold Calling</span>
   {coldLeads.filter(l => !l.archived && l.assignedToEmail.toLowerCase() === comercial.email.toLowerCase() && l.callbackScheduled === 'Llamar más tarde' && l.callbackDate === new Date().toISOString().split('T')[0]).length > 0 && (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[9px] text-white font-extrabold flex items-center justify-center rounded-full animate-bounce">
    {coldLeads.filter(l => !l.archived && l.assignedToEmail.toLowerCase() === comercial.email.toLowerCase() && l.callbackScheduled === 'Llamar más tarde' && l.callbackDate === new Date().toISOString().split('T')[0]).length}
    </span>
   )}
   </button>

   <button
   onClick={() => navigateCommercialView('settings')}
   className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
    activeView === 'settings' ?
     'bg-violet-650/20 text-violet-400 border border-violet-500/30'
     : 'text-slate-400 hover:text-white'
   }`}
   >
   <Settings className="w-3.5 h-3.5" />
    <span>Ajustes</span>
   </button>
  </div>

  {activeView === 'calendar' ? (
   <CommercialCalendarWorkspace comercial={comercial} events={events} coldLeads={coldLeads} onAddEvent={onAddEvent} onUpdateEvent={onUpdateEvent} onDeleteEvent={onDeleteEvent} />
  ) : activeView === 'cold_calling' ? (
   <div className="bg-[#020205]/40 rounded-3xl border border-white/5 overflow-hidden">
   <ColdCallingScreen
    coldLeads={coldLeads}
    comercialesList={comercialesList}
    onAddColdLead={onAddColdLead}
    onUpdateColdLead={onUpdateColdLead}
    onDeleteColdLead={onDeleteColdLead}
    currentComercial={comercial}
    events={events}
    onAddEvent={onAddEvent}
    onUpdateEvent={onUpdateEvent}
    onDeleteEvent={onDeleteEvent}
    usersList={usersList}
    onAddContact={onAddContact}
   />
   </div>
  ) : activeView === 'rewards' ? (
   <section className="relative min-h-[70vh] overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#080b10] p-5 sm:p-8">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden blur-xl opacity-50">
     <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-violet-500/20" />
     <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-lime-400/10" />
     <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 sm:p-8">
      {[0,1,2,3].map(item => <div key={item} className="h-28 rounded-2xl border border-white/10 bg-white/[0.06]" />)}
     </div>
     <div className="mx-5 mt-5 h-64 rounded-3xl border border-white/10 bg-gradient-to-r from-violet-500/10 to-amber-400/10 sm:mx-8" />
    </div>
    <div className="absolute inset-0 bg-black/45 backdrop-blur-md" />
    <div className="relative z-10 flex min-h-[62vh] items-center justify-center text-center">
     <div className="max-w-md">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-lime-300/25 bg-lime-300/10 shadow-[0_0_55px_rgba(163,230,53,.12)]"><Lock className="h-8 w-8 text-lime-300" /></div>
      <p className="mt-7 text-[10px] font-black uppercase tracking-[.35em] text-lime-300">Althera Rewards</p>
      <h2 className="mt-3 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">Coming soon</h2>
      <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-slate-400">Estamos preparando la nueva experiencia de recompensas, rangos y reconocimientos del equipo comercial.</p>
      <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-300"><Trophy className="h-3.5 w-3.5 text-amber-300"/>Acceso temporalmente bloqueado</div>
     </div>
    </div>
   </section>
  ) : activeView === 'training' ? (
   <CommercialTrainingCenter onOpenDocumentation={() => setShowDossierModal(true)} />
  ) : activeView === 'settings' ? (
   <div className="space-y-6 animate-fade-in font-sans">
   <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-[#0b1017] p-4 lg:hidden"><div><p className="text-xs font-bold text-white">{comercial.name}</p><p className="mt-0.5 text-[9px] text-slate-500">{comercial.email}</p></div><button onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-300"><LogOut className="h-3.5 w-3.5"/>Cerrar sesión</button></div>
   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <section className="lg:col-span-5 rounded-2xl border border-white/5 bg-slate-950/40 p-6">
     <div className="flex items-start gap-4">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-lime-300 to-emerald-500">
       {comercial.avatarUrl ? <img src={comercial.avatarUrl} alt={`Perfil de ${comercial.name}`} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-black text-slate-950">{comercial.name.slice(0,2).toUpperCase()}</div>}
       {avatarProcessing && <div className="absolute inset-0 flex items-center justify-center bg-black/70"><RefreshCw className="h-6 w-6 animate-spin text-lime-300" /></div>}
      </div>
      <div className="min-w-0 flex-1">
       <div className="flex items-center gap-2"><Camera className="h-4 w-4 text-lime-300"/><h3 className="text-sm font-bold text-white">Imagen de perfil</h3></div>
       <p className="mt-2 text-[10px] leading-4 text-slate-400">JPEG o PNG, máximo 5 MB. Se recorta, optimiza y regenera como WebP seguro.</p>
       <label className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-lime-300 px-3 py-2 text-[10px] font-black text-slate-950 transition hover:bg-lime-200 ${avatarProcessing ? 'pointer-events-none opacity-50' : ''}`}>
        <Upload className="h-3.5 w-3.5" />{avatarProcessing ? 'Analizando...' : 'Subir imagen'}
        <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="hidden" disabled={avatarProcessing} onChange={handleAvatarUpload} />
       </label>
       {comercial.avatarUrl && <button type="button" disabled={avatarProcessing} onClick={() => { onUpdateComercial?.({ ...comercial, avatarUrl: undefined }); setAvatarFeedback({ type: 'success', text: 'Imagen de perfil eliminada.' }); }} className="ml-2 inline-flex items-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-300"><Trash2 className="h-3.5 w-3.5"/>Eliminar</button>}
      </div>
     </div>
     {avatarFeedback && <div className={`mt-4 rounded-xl border p-3 text-[10px] font-bold ${avatarFeedback.type === 'success' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-400/20 bg-rose-500/10 text-rose-300'}`}>{avatarFeedback.text}</div>}
     <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.06] p-3 text-[9px] leading-4 text-cyan-200">El archivo original nunca se guarda. Se comprueba su firma binaria y se conserva exclusivamente una imagen nueva generada a partir de los píxeles.</div>
    </section>
    
    {/* LEFT COLUMN: STRIPE CONNECT SETTINGS */}
    <div className="lg:col-span-5 bg-slate-950/40 border border-white/5 rounded-2xl p-6 space-y-6">
    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
     <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
     <CreditCard className="w-5 h-5" />
     </div>
     <div>
     <h3 className="font-bold text-white text-sm">Cobros con Stripe Connect</h3>
     <p className="text-[10px] text-slate-400 mt-0.5">Conecta tu cuenta de cobró de forma segura. Althera no almacena datos bancarios.</p>
     </div>
    </div>

    {/* STRIPE INFO CARD */}
    <div className="bg-[#050510]/50 border border-violet-500/10 rounded-xl p-4 space-y-2.5">
     {STRIPE_CONNECT_TEMPORARILY_DISABLED && (
      <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-[10px] leading-normal text-amber-200">
       <strong className="block font-black uppercase tracking-wider">Stripe Connect · Próximamente</strong>
       La conexión está temporalmente desactivada. No se realizará ninguna configuración ni redirección a Stripe.
      </div>
     )}
     <div className="flex items-center gap-2">
     <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
     <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">Stripe Direct Payouts</span>
     </div>
     {comercial.stripeConnectAccountId ? (
     <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-indigo-500/10 border border-emerald-500/20 rounded-2xl text-[10px] text-emerald-300 space-y-3 shadow-lg shadow-emerald-950/10">
      <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
       <span className="block text-[8px] uppercase tracking-[0.22em] text-emerald-400/70 font-mono font-black">Cuenta conectada</span>
       <p className="font-mono break-all text-emerald-200 mt-1">{comercial.stripeConnectAccountId}</p>
      </div>
      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] uppercase font-mono font-black ${comercial.stripeOnboardingCompleted && comercial.stripePayoutsEnabled ? 'bg-emerald-500/15 border-emerald-400/25 text-emerald-200' : 'bg-amber-500/10 border-amber-400/25 text-amber-200'}`}>
       {comercial.stripeOnboardingCompleted && comercial.stripePayoutsEnabled ? 'Lista para cobrar' : 'Pendiente'}
      </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
      <span className={`rounded-xl border px-2 py-2 ${comercial.stripeOnboardingCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
       {comercial.stripeOnboardingCompleted ? 'Identidad verificada' : 'Falta identidad'}
      </span>
      <span className={`rounded-xl border px-2 py-2 ${comercial.stripePayoutsEnabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
       {comercial.stripePayoutsEnabled ? 'Cuenta de cobró activa' : 'Cuenta de cobró pendiente'}
      </span>
      </div>
      <button
      type="button"
      onClick={handleRefreshStripeStatus}
      disabled={STRIPE_CONNECT_TEMPORARILY_DISABLED || stripeConnectLoading}
      className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-white/5 rounded-lg text-[10px] text-slate-300 font-bold flex items-center justify-center gap-1.5"
      >
      <RefreshCw className={`w-3 h-3 ${stripeConnectLoading ? 'animate-spin' : ''}`} />
      <span>Actualizar estado Stripe</span>
      </button>
      {(!comercial.stripeOnboardingCompleted || !comercial.stripePayoutsEnabled) && (
      <button
       type="button"
       onClick={handleConnectStripe}
       disabled={STRIPE_CONNECT_TEMPORARILY_DISABLED || stripeConnectLoading}
       className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/20 rounded-lg text-[10px] text-white font-bold flex items-center justify-center gap-1.5"
      >
       {stripeConnectLoading ? (
       <RefreshCw className="w-3 h-3 animate-spin" />
       ) : (
       <ExternalLink className="w-3 h-3" />
       )}
       <span>{STRIPE_CONNECT_TEMPORARILY_DISABLED ? 'Conexión temporalmente desactivada' : 'Continuar configuración Stripe'}</span>
      </button>
      )}
     </div>
     ) : (
     <button
      type="button"
      onClick={handleConnectStripe}
      disabled={STRIPE_CONNECT_TEMPORARILY_DISABLED || stripeConnectLoading}
      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-1.5"
     >
      {stripeConnectLoading ? (
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
      <CreditCard className="w-3.5 h-3.5" />
      )}
      <span>{STRIPE_CONNECT_TEMPORARILY_DISABLED ? 'Stripe Connect temporalmente desactivado' : stripeConnectLoading ? 'Abriendo Stripe...' : 'Conectar con Stripe Connect'}</span>
     </button>
     )}
     {stripeConnectError && (
     <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 leading-normal">
      {stripeConnectError}
     </div>
     )}
     <p className="text-[10px] text-slate-400 leading-normal">
     Tus comisiones acumuladas se liquidan de forma directa mediante Stripe Connect. Stripe verifica identidad, datos fiscales y cuenta de cobró fuera de Althera.
     </p>
    </div>
    </div>

    <div className="lg:col-span-5 bg-slate-950/40 border border-white/5 rounded-2xl p-6 space-y-4">
    <div>
     <h3 className="font-bold text-white text-sm">Datos bancarios para transferencias</h3>
     <p className="text-[10px] text-slate-400 mt-1">La administración podrá usarlos para liquidarte fuera de Stripe.</p>
    </div>
    {[
     ['Banco', 'bankName'],
     ['IBAN', 'iban'],
     ['BIC / SWIFT', 'bic']
    ].map(([label, key]) => (
     <label key={key} className="block space-y-1.5">
     <span className="text-[9px] uppercase font-mono text-slate-500 font-bold">{label}</span>
     <input value={bankDraft[key as keyof typeof bankDraft]} onChange={e => setBankDraft(prev => ({ ...prev, [key]: e.target.value }))} className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500" />
     </label>
    ))}
     <button type="button" onClick={() => onUpdateComercial?.({ ...comercial, ...bankDraft })} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black">
      Guardar datos bancarios
     </button>
     </div>

     <form onSubmit={handleChangePassword} className="lg:col-span-5 bg-slate-950/40 border border-white/5 rounded-2xl p-6 space-y-4">
     <div className="flex items-start justify-between gap-3">
      <div>
      <h3 className="font-bold text-white text-sm">Seguridad de la cuenta</h3>
      <p className="text-[10px] text-slate-400 mt-1">Cambia tu contrasena de acceso al panel comercial.</p>
      </div>
      <div className="p-2 bg-violet-500/10 rounded-xl text-violet-300 border border-violet-500/20">
      <Lock className="w-4 h-4" />
      </div>
     </div>
     {[
      ['Contrasena actual', 'current', 'current-password'],
      ['Nueva contrasena', 'next', 'new-password'],
      ['Confirmar nueva contrasena', 'confirm', 'new-password']
     ].map(([label, key, autoComplete]) => (
      <label key={key} className="block space-y-1.5">
      <span className="text-[9px] uppercase font-mono text-slate-500 font-bold">{label}</span>
      <input
       type={showPasswords ? 'text' : 'password'}
       autoComplete={autoComplete}
       value={passwordDraft[key as keyof typeof passwordDraft]}
       onChange={e => {
       setPasswordDraft(prev => ({ ...prev, [key]: e.target.value }));
       setPasswordFeedback(null);
       }}
       className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-violet-500"
      />
      </label>
     ))}
     <button
      type="button"
      onClick={() => setShowPasswords(prev => !prev)}
      className="w-full py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-violet-500/40 text-[10px] font-bold flex items-center justify-center gap-1.5"
     >
      {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      <span>{showPasswords ? 'Ocultar contrasenas' : 'Mostrar contrasenas'}</span>
     </button>
     {passwordFeedback && (
      <div className={`p-3 rounded-xl border text-[10px] font-bold ${passwordFeedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
      {passwordFeedback.text}
      </div>
     )}
     <button type="submit" className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black">
      Cambiar contrasena
     </button>
     </form>

     {/* RIGHT COLUMN: PENDING COMISION & PAYOUTS HISTORY */}
    <div className="lg:col-span-7 space-y-6 text-left">
    
    {/* ACCRUED COMISIONES BOX */}
    <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
     <div className="space-y-1">
     <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Total Acumulado</span>
     <span className="text-xl font-mono font-black text-amber-400 block">
      {myBenefitsEarnedWithExtras.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
     </span>
     <span className="text-[8px] font-mono text-slate-500 block">Comisión fijada {myCommissionPercentage}% sobre pagos cobrados</span>
     </div>

     <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/5 md:pl-6">
     <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Total Liquidado</span>
     <span className="text-xl font-mono font-black text-emerald-400 block">
      {myBenefitsPaidOut.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
     </span>
     <span className="text-[8px] font-mono text-slate-500 block">Historial de liquidaciones registradas</span>
     </div>

     <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/5 md:pl-6 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
     <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest block font-bold">Pendiente de Liquidar</span>
     <span className="text-xl font-mono font-black text-white block">
      {myBenefitsReadyToPayout.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
     </span>
     <span className="text-[8px] font-mono text-amber-500/60 block">Listo para enviar a cuenta</span>
     </div>

     <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/5 md:pl-6 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
     <span className="text-[9px] font-mono text-blue-300 uppercase tracking-widest block font-bold">Pendiente al Cobrar</span>
     <span className="text-xl font-mono font-black text-blue-300 block">
      {myBenefitsPendingOnClientPayment.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
     </span>
     <span className="text-[8px] font-mono text-blue-400/70 block">Se activara cuando pague el cliente</span>
     </div>
    </div>
    {/* TRANSACTION HISTORY TABLE */}
    <div className="bg-[#020205]/40 rounded-2xl border border-white/5 p-6 space-y-4">
     <div className="flex items-center justify-between">
     <div className="flex items-center gap-2">
      <History className="w-4 h-4 text-amber-400" />
      <h4 className="font-bold text-white text-xs uppercase font-mono tracking-wider">Historial de Liquidaciónes</h4>
     </div>
     <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/10 uppercase">
      {(comercial.payouts || []).length} transferencias
     </span>
     </div>

     {(!comercial.payouts || comercial.payouts.length === 0) ? (
     <div className="text-center py-12 border border-dashed border-white/5 rounded-xl">
      <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2" />
      <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">No hay transferencias registradas</p>
      <p className="text-[9px] text-slate-500 max-w-xs mx-auto mt-1 leading-normal font-sans">
      Cuando el administrador liquide tus comisiones acumuladas, aparecer el registro detallado aquí.
      </p>
     </div>
     ) : (
     <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-left border-collapse">
      <thead>
       <tr className="bg-white/[0.02] text-[9px] uppercase font-mono text-slate-400 border-b border-white/5 font-extrabold">
       <th className="p-3">Fecha y Hora</th>
       <th className="p-3 text-right">Importe Liquidado</th>
       <th className="p-3">Destino</th>
       <th className="p-3">Referencia / Estado</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-white/5 font-mono text-[11px]">
       {[...comercial.payouts].sort((a,b) => b.date.localeCompare(a.date)).map((p) => {
        const method = p.paymentMethod || (p.stripeTransferId?.startsWith('tr_') ? 'stripe' : 'transfer');
       const methodLabel = method === 'stripe' ? 'Stripe' : method === 'cash' ? 'Cash' : 'Transferencia';
       return (
       <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
        <td className="p-3 text-slate-300">
        {new Date(p.date).toLocaleString('es-ES')}
        </td>
        <td className="p-3 font-bold text-emerald-400 text-right font-sans">
        {p.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </td>
        <td className="p-3 font-sans">
        <div className="flex flex-col">
         <span className="text-white text-[11px] font-bold">{method === 'cash' ? 'Cash' : (p.bankName || 'Cuenta bancaria')}</span>
         <span className="text-[9px] font-mono text-slate-400">{p.bankAccount}</span>
        </div>
        </td>
        <td className="p-3 font-sans">
        <div className="flex flex-col gap-1">
         {p.stripeTransferId && (
         <span className="text-[9px] font-mono bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded border border-violet-500/10 w-fit">
          {p.stripeTransferId}
         </span>
         )}
         <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
         Completado ({methodLabel})
         </span>
        </div>
        </td>
       </tr>
       )})}
      </tbody>
      </table>
     </div>
     )}

    </div>

    </div>

   </div>
   </div>
  ) : (
   <>
   <CommercialAnalyticsDashboard comercial={comercial} leads={myLeads} transactions={finTransactions} coldLeads={coldLeads} events={events} />

   {/* METRICS ROW */}
   <div className="hidden grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
   
   {/* Total Leads */}
   <div className="bg-white/[0.02] border border-white/5 p-5.5 rounded-2.5xl flex items-center justify-between hover:border-violet-500/20 transition duration-200">
   <div>
    <p className="text-slate-500 text-[10px] uppercase font-mono font-bold tracking-wider mb-1">Leads Activos</p>
    <h3 className="text-2xl font-bold text-white font-mono">{activeLeads.length}</h3>
    <p className="text-[10px] text-slate-400 mt-1">En gestion actualmente</p>
   </div>
    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
     <Users className="w-5 h-5" />
    </div>
    </div>

    {/* Postponed Leads */}
    <div className="bg-white/[0.02] border border-white/5 p-5.5 rounded-2.5xl flex items-center justify-between hover:border-amber-500/20 transition duration-200">
    <div>
     <p className="text-slate-500 text-[10px] uppercase font-mono font-bold tracking-wider mb-1">Leads Pospuestos</p>
     <h3 className="text-2xl font-bold text-amber-300 font-mono">{postponedColdLeads.length}</h3>
     <p className="text-[10px] text-slate-400 mt-1">Pendientes de retomar</p>
    </div>
    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
     <Clock className="w-5 h-5" />
    </div>
    </div>

    {/* Won Ratio */}
   <div className="bg-white/[0.02] border border-white/5 p-5.5 rounded-2.5xl flex items-center justify-between hover:border-blue-500/20 transition duration-200">
   <div>
    <p className="text-slate-500 text-[10px] uppercase font-mono font-bold tracking-wider mb-1">Tasa de Cierre</p>
    <h3 className="text-2xl font-bold text-white font-mono">{conversionRate}%</h3>
    <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-bold">
    <CheckCircle className="w-3 h-3" />
    {wonLeads.length} leads ganados
    </p>
   </div>
   <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
    <TrendingUp className="w-5 h-5" />
   </div>
   </div>

   {/* Won Volume */}
   <div className="bg-white/[0.02] border border-white/5 p-5.5 rounded-2.5xl flex items-center justify-between hover:border-violet-500/20 transition duration-200">
   <div>
    <p className="text-slate-500 text-[10px] uppercase font-mono font-bold tracking-wider mb-1">Facturado Cerrado</p>
    <h3 className="text-2xl font-bold text-violet-400 font-mono">
    {wonRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
    </h3>
    <p className="text-[10px] text-slate-450 mt-1">Facturado real en firme</p>
   </div>
   <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
    <DollarSign className="w-5 h-5" />
   </div>
   </div>

   {/* Active Pipeline */}
   <div className="bg-white/[0.02] border border-white/5 p-5.5 rounded-2.5xl flex items-center justify-between hover:border-violet-500/20 transition duration-200">
   <div>
    <p className="text-slate-500 text-[10px] uppercase font-mono font-bold tracking-wider mb-1">Pipeline Activo</p>
    <h3 className="text-2xl font-bold text-blue-400 font-mono">
    {totalPipeline.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
    </h3>
    <p className="text-[10px] text-slate-450 mt-1">Excluye leads perdidos</p>
   </div>
   <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
    <Layers className="w-5 h-5" />
   </div>
   </div>

   {/* Commission & Benefits (New) */}
   <div className="bg-amber-500/[0.02] border border-amber-500/10 p-5.5 rounded-2.5xl flex items-center justify-between hover:border-amber-500/30 transition duration-200 shadow-lg shadow-amber-500/5 relative overflow-hidden group">
   <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none translate-x-12 -translate-y-12" />
   <div className="relative z-10 text-left">
    <p className="text-amber-500/70 text-[10px] uppercase font-mono font-bold tracking-wider mb-1">Mis Comisiónes Listas para Cobrar</p>
    <h3 className="text-2xl font-bold text-amber-400 font-mono">
    {myBenefitsReadyToPayout.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
    </h3>
    <p className="text-[10px] text-slate-400 mt-1">
    Comisión fijada: <strong className="text-amber-400">{myCommissionPercentage}%</strong> | <span className="text-blue-300">{myBenefitsPendingOnClientPayment.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} pendiente al cobrar</span>
    </p>
   </div>
   <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 relative z-10">
    <TrendingUp className="w-5 h-5 text-amber-400" />
   </div>
   </div>

  </div>



  {/* AGENDA & TAREAS DE HOY (TODAY'S DASHBOARD AND AGENDA) */}
  {(() => {
   const TODAY = new Date().toISOString().split('T')[0];
   const myEvents = events.filter(e => e.comercialId === comercial.id || (e.assignedUserEmail && e.assignedUserEmail.toLowerCase() === comercial.email.toLowerCase()));
   const todayEvents = myEvents.filter(e => e.date === TODAY);
   
   const todayCallbacks = coldLeads.filter(l => 
   !l.archived && 
   l.assignedToEmail.toLowerCase() === comercial.email.toLowerCase() && 
   l.callbackScheduled === 'Llamar más tarde' && 
   l.callbackDate === TODAY
   );

   const formattedDate = new Date().toLocaleDateString('es-ES', {
   weekday: 'long',
   day: 'numeric',
   month: 'long',
   year: 'numeric'
   });

   return (
   <div className="bg-white/[0.03] border border-white/10 rounded-2.5xl p-6 text-left space-y-6">
    
    {/* Dashboard Section Header */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-4">
    <div>
     <div className="flex items-center gap-2">
     <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse shadow-[0_0_12px_rgba(139,92,246,0.6)]" />
     <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Agenda & Tareas de Hoy</h3>
     </div>
     <p className="text-xs text-slate-400 mt-1">Reuniones de calendario, citas y llamadas de Cold Calling programadas para hoy.</p>
    </div>

    <div className="px-4 py-2 bg-violet-600/10 border border-violet-500/20 rounded-xl">
     <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest block leading-none">Fecha de Hoy</span>
     <span className="text-xs font-bold text-slate-200 mt-1 inline-block capitalize">{formattedDate}</span>
    </div>
    </div>

    {/* TWO COLUMN GRID */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
    
    {/* COLUMN 1: REUNIONES & CITAS (EVENTS) */}
    <div className="space-y-4">
     <div className="flex justify-between items-center">
     <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
      <Calendar className="w-4 h-4 text-violet-400" />
      <span>Citas y Reuniones ({todayEvents.length})</span>
     </h4>
     </div>

     {todayEvents.length === 0 ? (
     <div className="text-center py-10 bg-black/20 border border-white/5 rounded-2xl p-4">
      <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40" />
      <p className="text-slate-450 text-xs font-semibold">No tienes reuniones agendadas para hoy.</p>
      <p className="text-[10px] text-slate-550 mt-1 max-w-[280px] mx-auto">Tus reuniones de Google Meet o Zoom asignadas aparecerán aquí.</p>
     </div>
     ) : (
     <div className="space-y-3">
      {todayEvents.map(ev => {
      const isDone = ev.status === 'done';
      return (
       <div 
       key={ev.id} 
       className={`p-4 rounded-2xl border transition-all ${
        isDone ?
         'bg-emerald-950/10 border-emerald-500/20 opacity-75'
         : 'bg-[#030306]/65 border-white/5 hover:border-violet-500/20 shadow-md'
       }`}
       >
       <div className="flex justify-between items-start gap-3">
        <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
         <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color || '#8b5cf6' }} />
         <h5 className={`font-bold text-xs uppercase tracking-tight text-white ${isDone ? 'line-through text-slate-500' : ''}`}>
         {ev.title}
         </h5>
         <span className="text-[9px] font-mono font-bold text-violet-400 bg-violet-950/30 px-2 py-0.5 rounded border border-violet-500/10">
         {ev.time || 'Todo el día'}
         </span>
         {ev.isPrivate && (
         <span className="text-[8px] font-mono font-bold bg-rose-500/10 text-rose-400 px-1.5 rounded uppercase">
          Privado
         </span>
         )}
        </div>
        <p className="text-[11px] text-slate-400 leading-normal">{ev.notes || ev.description || 'Sin descripción.'}</p>
        {ev.linkedContactName && (
         <p className="text-[10px] text-slate-500 font-medium">Asociado a: <span className="text-violet-400 font-semibold">{ev.linkedContactName}</span></p>
        )}
        </div>

        <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold font-mono uppercase shrink-0 ${
        isDone ?
         'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
         : 'bg-amber-500/10 text-amber-450 border border-amber-500/20'
        }`}>
        {isDone ? 'Completado' : 'Pendiente'}
        </span>
       </div>

       <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/5">
        {ev.meetingUrl && !isDone && (
        <a 
         href={ev.meetingUrl.startsWith('http') ? ev.meetingUrl : `https://${ev.meetingUrl}`}
         target="_blank"
         rel="noopener noreferrer"
         className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
         <Video className="w-3 h-3" />
         <span>Videollamada</span>
        </a>
        )}

        <button
        onClick={() => {
         onUpdateEvent({
         ...ev,
         status: isDone ? 'pending' : 'done'
         });
        }}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
         isDone ?
          'bg-slate-800 text-slate-350 hover:bg-slate-700'
          : 'bg-emerald-650 hover:bg-emerald-600 text-white'
        }`}
        >
        {isDone ? 'Marcar Pendiente' : 'Marcar Completado'}
        </button>
       </div>
       </div>
      );
      })}
     </div>
     )}
    </div>

    {/* COLUMN 2: COLD CALLING CALLBACKS (PHONE CALLS) */}
    <div className="space-y-4">
     <div className="flex justify-between items-center">
     <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
      <Phone className="w-4 h-4 text-amber-400" />
      <span>Llamadas de Seguimiento ({todayCallbacks.length})</span>
     </h4>
     </div>

     {todayCallbacks.length === 0 ? (
     <div className="text-center py-10 bg-black/20 border border-white/5 rounded-2xl p-4">
      <Phone className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40" />
      <p className="text-slate-450 text-xs font-semibold">No tienes llamadas programadas para hoy.</p>
      <p className="text-[10px] text-slate-550 mt-1 max-w-[280px] mx-auto">Programa recordatorios de Cold Calling y los verás organizados aquí.</p>
     </div>
     ) : (
     <div className="space-y-3">
      {todayCallbacks.map(lead => {
      const isLogging = activeLoggerLeadId === lead.id;
      return (
       <div 
       key={lead.id} 
       className={`p-4 rounded-2xl border transition-all ${
        isLogging ?
         'bg-violet-950/15 border-violet-500/35 ring-1 ring-violet-500/20'
         : 'bg-[#030306]/65 border-white/5 hover:border-violet-500/20 shadow-md'
       }`}
       >
       <div className="flex justify-between items-start gap-3 text-left">
        <div className="space-y-1">
        <h5 className="font-bold text-xs uppercase tracking-tight text-white">{lead.businessName}</h5>
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400">
         <span>Dueño: <strong className="text-slate-200">{lead.contactPerson || 'Sin especificar'}</strong></span>
         <span className="text-slate-600">•</span>
         <span className="text-amber-400 font-bold">{lead.phone}</span>
        </div>
        {lead.callbackTime && (
         <p className="text-[10px] font-mono text-amber-500 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 w-fit mt-1">
         Hora de contacto: {lead.callbackTime}
         </p>
        )}
        <p className="text-[10px] text-slate-500 italic mt-1.5 leading-normal">
         Última nota: {lead.notes || 'Ninguna registrada.'}
        </p>
        </div>

        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
        lead.temperature === 'Caliente' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
        lead.temperature === 'Templado' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
        'bg-sky-500/15 text-sky-400 border border-sky-500/20'
        }`}>
        {lead.temperature || 'Frío'}
        </span>
       </div>

       {/* INLINE QUICK CALL LOGGER FORM */}
       {isLogging ? (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3 text-left bg-[#050510]/60 p-3 rounded-xl">
        <p className="text-[10px] uppercase font-mono font-bold text-violet-400">Registrar resultado de llamada</p>
        
        <div className="grid grid-cols-2 gap-2">
         <div className="space-y-1">
         <label className="text-[8px] font-mono text-slate-400 uppercase font-bold">Resultado</label>
         <select
          value={quickLogResult}
          onChange={(e) => setQuickLogResult(e.target.value)}
          className="w-full bg-slate-955 border border-white/5 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
         >
          <option value="Responde">Responde / Conversación</option>
          <option value="No responde">No responde / Apagado</option>
          <option value="Reunión agendada">Cita / Reunión agendada</option>
          <option value="Interesado pero no hoy">Interesado (Posponer)</option>
         </select>
         </div>

         <div className="space-y-1">
         <label className="text-[8px] font-mono text-slate-400 uppercase font-bold">Temperatura</label>
         <select
          value={quickLogTemp}
          onChange={(e) => setQuickLogTemp(e.target.value as any)}
          className="w-full bg-slate-955 border border-white/5 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
         >
          <option value="Frío">Frío</option>
          <option value="Templado">Templado</option>
          <option value="Caliente">Caliente</option>
         </select>
         </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
         <div className="space-y-1">
         <label className="text-[8px] font-mono text-slate-400 uppercase font-bold">Nueva Acción</label>
         <select
          value={quickLogScheduled}
          onChange={(e) => setQuickLogScheduled(e.target.value)}
          className="w-full bg-slate-955 border border-white/5 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-violet-500"
         >
          <option value="Llamada hecha">Llamada Hecha (Completar)</option>
          <option value="Llamar más tarde">Volver a posponer hoy/mañana</option>
         </select>
         </div>

         {quickLogScheduled === 'Llamar más tarde' && (
         <div className="space-y-1">
          <label className="text-[8px] font-mono text-slate-400 uppercase font-bold">Nueva Fecha</label>
          <input
          type="date"
          value={quickLogCallbackDate}
          onChange={(e) => setQuickLogCallbackDate(e.target.value)}
          className="w-full bg-slate-955 border border-white/5 rounded-lg px-2 py-0.5 text-[10px] text-white focus:outline-none focus:border-violet-500"
          />
         </div>
         )}
        </div>

        <div className="space-y-1">
         <label className="text-[8px] font-mono text-slate-400 uppercase font-bold">Notas de la conversación</label>
         <textarea
         rows={2}
         placeholder="Anota el resultado, objeciones o acuerdos..."
         value={quickLogNotes}
         onChange={(e) => setQuickLogNotes(e.target.value)}
         className="w-full bg-slate-955 border border-white/5 focus:border-violet-500 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none transition resize-none"
         />
        </div>

        <div className="flex gap-2 justify-end pt-1">
         <button
         type="button"
         onClick={() => {
          setActiveLoggerLeadId(null);
          setQuickLogNotes('');
         }}
         className="text-[9px] font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded hover:bg-slate-700 cursor-pointer"
         >
         Cancelar
         </button>
         <button
         type="button"
         onClick={() => handleSaveQuickCallLog(lead)}
         className="text-[9px] font-bold bg-violet-650 text-white px-3 py-1 rounded hover:bg-violet-600 shadow-md shadow-violet-500/10 cursor-pointer"
         >
         Guardar Llamada
         </button>
        </div>
        </div>
       ) : (
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/5">
        <button
         onClick={() => {
         if (safeConfirm(`¿Marcar la llamada de ${lead.businessName} como completada sin anotaciones adicionales?`)) {
          const updatedLead: ColdCallingLead = {
          ...lead,
          callbackScheduled: 'No',
          answered: 'Sí',
          contacted: 'Sí',
          notes: 'Llamada realizada y completada desde el Dashboard de Hoy.'
          };
          onUpdateColdLead(updatedLead);
         }
         }}
         className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition cursor-pointer"
         title="Marcar hecha rápidamente"
        >
         Marcar Hecha
        </button>

        <button
         onClick={() => {
         setActiveLoggerLeadId(lead.id);
         setQuickLogNotes('');
         setQuickLogResult('Responde');
         setQuickLogTemp(lead.temperature || 'Templado');
         setQuickLogScheduled('Llamada hecha');
         setQuickLogCallbackDate(TODAY);
         }}
         className="px-3 py-1.5 bg-violet-650 hover:bg-violet-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition cursor-pointer"
        >
         <Phone className="w-3 h-3 text-white" />
         <span>Registrar Llamada</span>
        </button>
        </div>
       )}
       </div>
      );
      })}
     </div>
     )}
    </div>

    </div>

   </div>
   );
  })()}

  {/* CARTERA DE CLIENTES & OPORTUNIDADES PIPELINE FOR THIS REPRESENTATIVE */}
  <div className="bg-white/[0.03] border border-white/10 rounded-2.5xl p-6 text-left space-y-6">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
   <div>
    <div className="flex items-center gap-2">
    <Briefcase className="w-5 h-5 text-amber-500 animate-pulse" />
    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Cartera de Clientes & Oportunidades ({filteredLeads.length})</h3>
    </div>
    <p className="text-xs text-slate-400 mt-1">Todos tus leads asignados, prospectos en negociación y clientes convertidos.</p>
   </div>

   {/* SEARCH AND FILTER TOOLS */}
   <div className="flex flex-wrap items-center gap-3">
    {/* Search */}
    <div className="relative">
    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
    <input
     type="text"
     placeholder="Buscar por contacto o empresa..."
     value={search}
     onChange={(e) => setSearch(e.target.value)}
     className="bg-[#050505] border border-white/5 focus:border-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none w-56 font-sans transition-all"
    />
    </div>

    {/* Status Filter */}
    <div className="flex items-center gap-1.5 bg-[#050505] p-1 border border-white/5 rounded-xl">
    {['todos', 'Pendiente', 'Contactado', 'Negociación', 'Ganado', 'Perdido'].map((st) => (
     <button
     key={st}
     onClick={() => setStatusFilter(st)}
     className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
      statusFilter === st ?
       'bg-violet-600/20 text-violet-400 border border-violet-500/20'
       : 'text-slate-450 hover:text-white'
     }`}
     >
     {st === 'todos' ? 'Todos' : st}
     </button>
    ))}
    </div>
   </div>
   </div>

   {filteredLeads.length === 0 ? (
   <div className="text-center py-12 bg-black/25 rounded-2xl border border-white/5 text-slate-500 text-xs">
    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
    <span>No se encontraron leads con los filtros actuales.</span>
   </div>
   ) : (
   <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
    <table className="w-full text-left text-xs text-slate-300">
    <thead>
     <tr className="border-b border-white/5 bg-white/[0.01] text-slate-500 uppercase font-mono text-[9px] tracking-wider">
     <th className="px-4 py-3">Contacto / Empresa</th>
     <th className="px-4 py-3 text-center">Interés</th>
     <th className="px-4 py-3 text-center">Estado / Progreso</th>
     <th className="px-4 py-3 text-right">Valor Estimado</th>
     <th className="px-4 py-3">Última Nota / Comentario</th>
     </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
     {filteredLeads.map((l) => (
     <tr key={l.id} className="hover:bg-white/[0.01] transition-colors">
      {/* Name / Contact */}
      <td className="px-4 py-3.5">
      <div className="flex items-center gap-2">
       <div>
       <p className="font-bold text-white text-xs">{l.name}</p>
       <p className="text-[10px] text-slate-500 mt-0.5">{l.company || 'Sin Empresa'}</p>
       </div>
      </div>
      </td>

      {/* Temperature */}
      <td className="px-4 py-3.5 text-center">
      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
       l.temperature === 'Caliente' ? 'bg-rose-500/10 text-rose-400' :
       l.temperature === 'Templado' ? 'bg-amber-500/10 text-amber-400' :
       'bg-blue-500/10 text-blue-400'
      }`}>
       {l.temperature || 'Frío'}
      </span>
      </td>

      {/* Status Badge (Read-only for Commercial) */}
      <td className="px-4 py-3.5 text-center">
      <div className="inline-block">
       <span className={`text-[10px] font-mono px-2.5 py-1 rounded font-bold border ${
       l.status === 'Ganado' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20' :
       l.status === 'Perdido' ? 'border-rose-500/30 text-rose-400 bg-rose-950/20' :
       l.status === 'Negociación' ? 'border-amber-500/30 text-amber-400 bg-amber-950/20' :
       'border-slate-700 text-slate-350 bg-slate-900/60'
       }`}>
       {l.status}
       </span>
      </div>
      </td>

      {/* Value */}
      <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
      {Number(l.value || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
      </td>

      {/* Notes (Read-only for Commercial) */}
      <td className="px-4 py-3.5 max-w-xs">
      <div className="flex items-center gap-1.5 justify-between">
       <p className="text-[10px] text-slate-400 truncate flex-1" title={l.notes}>
       {l.notes || <span className="text-slate-600 italic">Sin comentarios</span>}
       </p>
      </div>
      </td>
     </tr>
     ))}
    </tbody>
    </table>
   </div>
   )}
  </div>

   </>
  )}

  <footer className="border-t border-white/5 bg-[#050505]/80 py-5 text-[10px] text-slate-500 mt-10 rounded-2xl">
   <div className="flex flex-col sm:flex-row gap-2 justify-between items-center px-4">
   <span>Licencia de Althera Sales CRM activa.</span>
   <span> {new Date().getFullYear()} Althera Software.</span>
   </div>
  </footer>

  </main>

  {false && showMonthlyRecap && (
  <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
   <div className="w-full max-w-4xl min-h-[560px] rounded-[2rem] border border-white/10 bg-[#040407] shadow-2xl relative overflow-hidden">
   <div className={`absolute inset-0 opacity-30 bg-gradient-to-br ${activeRecapSlide.gradient}`} />
   <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,.22),transparent_22%),radial-gradient(circle_at_78%_80%,rgba(255,255,255,.14),transparent_25%)] animate-pulse" />
   <button onClick={() => setShowMonthlyRecap(false)} className="absolute right-5 top-5 z-20 text-slate-300 hover:text-white">
    X
   </button>

   <div className="relative z-10 p-6 md:p-8 min-h-[560px] flex flex-col">
    <div className="grid grid-cols-5 gap-2 mb-8">
    {recapSlides.map((slide, index) => (
     <button
     key={slide.label}
     type="button"
     onClick={() => setRecapStep(index)}
     className={`h-1.5 rounded-full transition-all ${index <= recapStep ? 'bg-white' : 'bg-white/20'}`}
     aria-label={`Ver pantalla ${index + 1}`}
     />
    ))}
    </div>

    <div className="flex-1 grid lg:grid-cols-[1fr_0.9fr] gap-8 items-center">
    <div className="space-y-6">
     <span className="inline-flex text-[10px] uppercase tracking-[0.32em] text-white/70 font-mono font-black">
     {activeRecapSlide.label}
     </span>
     <div className="space-y-4">
     <h2 className="text-4xl md:text-6xl font-black text-white leading-[0.95]">
      {activeRecapSlide.title}
     </h2>
     <p className="text-base md:text-lg text-white/80 max-w-xl leading-relaxed">
      {activeRecapSlide.body}
     </p>
     </div>

     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
     {[
      ['Ventas', wonRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })],
      ['Llamadas', myColdCallsCount],
      ['Clientes', wonLeads.length],
      ['Tier', myTierInfo.current.name]
     ].map(([label, value]) => (
      <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <span className="text-[9px] uppercase font-mono text-white/45">{label}</span>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
      </div>
     ))}
     </div>
    </div>

    <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6 min-h-[360px] flex flex-col items-center justify-center text-center overflow-hidden">
     <div className={`w-36 h-36 rounded-[2rem] bg-gradient-to-br ${activeRecapSlide.gradient} flex items-center justify-center shadow-2xl mb-8 animate-[pulse_2.4s_ease-in-out_infinite]`}>
     <activeRecapSlide.Icon className="w-16 h-16 text-white" />
     </div>
     <div className="text-6xl font-black text-white tracking-tight">{activeRecapSlide.value}</div>
     <div className="mt-2 text-xs uppercase tracking-[0.24em] text-white/55 font-mono">{activeRecapSlide.caption}</div>
     <div className="mt-8 w-full">
     <div className="flex justify-between text-[10px] font-mono text-white/55 mb-2">
      <span>Progreso tier</span>
      <span>{Math.round(myTierInfo.progress)}%</span>
     </div>
     <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${activeRecapSlide.gradient}`} style={{ width: `${myTierInfo.progress}%` }} />
     </div>
     </div>
    </div>
    </div>

    <div className="mt-8 flex items-center justify-between gap-4">
    <button
     type="button"
     onClick={() => setRecapStep(step => (step - 1 + recapSlides.length) % recapSlides.length)}
     className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white hover:bg-white/10"
    >
     Anterior
    </button>
    <p className="text-[11px] text-white/55 text-center">
     Althera agradece tu compromiso y dedicación. Vamos a por el siguiente mes.
    </p>
    <button
     type="button"
     onClick={() => setRecapStep(step => (step + 1) % recapSlides.length)}
     className="px-4 py-2 rounded-xl border border-white/10 bg-white text-xs font-bold text-black hover:bg-white/90"
    >
     Siguiente
    </button>
    </div>
   </div>
   </div>
  </div>
  )}

  {/* Welcome Dossier & Printable PDF */}
  <DossierModal isOpen={showDossierModal} onClose={() => setShowDossierModal(false)} />

 </div>
 );
}



