import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClientContact, CalendarEvent, Screen, Invoice, FinanceTransaction, ComercialAccount, InvoiceItem, ComercialLead } from '../types';
import { beginBlockingDatabaseOperation, db } from '../supabaseClient';
import { buildInvoiceHtml, downloadInvoicePdf } from '../utils/invoiceHtml';
import { getNextInvoiceNumber } from '../utils/invoiceNumber';
import { setInvoicePrefill } from '../utils/invoicePrefill';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import { PanelUser } from '../mockData';
import { 
 Plus, 
 Search, 
 Mail, 
 Phone, 
 MessageSquare, 
 MapPin, 
 Calendar, 
 Link as LinkIcon, 
 ChevronRight, 
 Download, 
 X,
 UserPlus,
 Eye,
 EyeOff,
 Github,
 Globe,
 Key,
 Archive,
 Trash2,
 Upload,
 Edit,
 CreditCard,
 ExternalLink,
 Copy,
 Check,
 UsersRound,
 Target,
 TrendingUp,
 BriefcaseBusiness,
 Receipt,
 RefreshCw,
 Clock3
} from 'lucide-react';

export const safeConfirm = (msg: string): boolean => {
 const isIframe = window.self !== window.top;
 if (isIframe) {
 return true; // Auto-confirm inside sandbox iframe preview
 }
 try {
 return window.confirm(msg);
 } catch (e) {
 return true;
 }
};

const toLocalDateKey = (date: Date): string => {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 const day = String(date.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
};

const addMonthsKeepingDay = (baseDate: Date, monthsToAdd: number): Date => {
 const targetYear = baseDate.getFullYear();
 const targetMonth = baseDate.getMonth() + monthsToAdd;
 const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
 return new Date(
  targetYear,
  targetMonth,
  Math.min(baseDate.getDate(), lastDayOfTargetMonth),
  12,
  0,
  0,
 0
 );
};

type ClientChargePlan = 'once' | 'installments_2' | 'installments_3' | 'installments_4' | 'month' | 'year';
type ClientChargeMethod = 'cash' | 'transfer' | 'stripe';

const CLIENT_CHARGE_PLAN_OPTIONS: Array<{ value: ClientChargePlan; label: string }> = [
 { value: 'once', label: 'Pago único' },
 { value: 'installments_2', label: '2 meses' },
 { value: 'installments_3', label: '3 meses' },
 { value: 'installments_4', label: '4 meses' },
 { value: 'month', label: 'Mensual' },
 { value: 'year', label: 'Anual' },
];

const CLIENT_CHARGE_METHOD_OPTIONS: Array<{ value: ClientChargeMethod; label: string }> = [
 { value: 'cash', label: 'Efectivo' },
 { value: 'transfer', label: 'Transferencia' },
 { value: 'stripe', label: 'Stripe' },
];

const getContactBusinessName = (contact: ClientContact): string => {
 const company = (contact.company || '').trim();
 return company && company.toLowerCase() !== 'independent' ? company : contact.name;
};

const getEditableInvoiceConcept = (description: string): string =>
 description
  .replace(/^Cobro Pendiente:\s*/i, '')
  .replace(/^Ingreso Facturado:\s*[^-]+-\s*/i, '')
  .replace(/\s*\((?:Pendiente|Cobrado)\)\s*$/i, '')
  .trim();

const DEFAULT_INVOICE_ISSUER = {
 name: 'Carlos Ronco Meneses',
 taxId: '09104663K',
 address: 'Carrer dels Tamarells 1, 07800 - Ibiza, España',
 brand: 'Althera Solutions',
 email: 'contacto@altherasolutions.com'
};

export const AESTHETIC_COLORS = [
 { val: 'indigo', label: 'Indigo', hex: '#6366f1', activeStyle: 'bg-indigo-500/25 border-indigo-500 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]', badgeStyle: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
 { val: 'emerald', label: 'Esmeralda Sutil', hex: '#10b981', activeStyle: 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]', badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
 { val: 'amber', label: 'Ámbar Cálido', hex: '#f59e0b', activeStyle: 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]', badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
 { val: 'rose', label: 'Rosa Cenizo', hex: '#f43f5e', activeStyle: 'bg-rose-500/25 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]', badgeStyle: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
 { val: 'violet', label: 'Lavanda Violeta', hex: '#8b5cf6', activeStyle: 'bg-violet-500/25 border-violet-500 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]', badgeStyle: 'bg-violet-500/10 text-violet-400 border-violet-500/20' }
];

export const getContactColor = (color: string | undefined): 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' => {
 if (!color) return 'indigo';
 const c = color.toLowerCase();
 if (c === 'red' || c === 'rose') return 'rose';
 if (c === 'yellow' || c === 'amber') return 'amber';
 if (c === 'green' || c === 'emerald') return 'emerald';
 if (c === 'blue' || c === 'indigo') return 'indigo';
 if (c === 'violet' || c === 'purple') return 'violet';
 return 'indigo';
};

const contactHasAssignedWebsite = (contact: ClientContact): boolean => Boolean(
 contact.website?.trim() ||
 contact.customWebsiteUrl?.trim() ||
 contact.demoWebsiteId?.trim()
);

const normalizeClientEmail = (value?: string): string => (value || '').trim().toLowerCase();

const invoiceBelongsToContact = (invoice: Invoice, contact: ClientContact): boolean => {
 if (invoice.clientId) return invoice.clientId === contact.id;
 const invoiceEmail = normalizeClientEmail(invoice.clientEmail);
 const contactEmail = normalizeClientEmail(contact.email);
 return Boolean(invoiceEmail && contactEmail && invoiceEmail === contactEmail);
};

const transactionBelongsToContact = (
 transaction: FinanceTransaction,
 contact: ClientContact,
 clientInvoices: Invoice[]
): boolean => {
 if (transaction.clientId) return transaction.clientId === contact.id;
 if (transaction.invoiceId) return clientInvoices.some(invoice => invoice.id === transaction.invoiceId);
 return false;
};

const isCarlosExcludedFromSalesCommission = (commercial: ComercialAccount): boolean => {
 const normalizedName = commercial.name.trim().toLocaleLowerCase('es-ES');
 const normalizedEmail = commercial.email.trim().toLowerCase();
 return normalizedName.includes('carlos ronco') || normalizedEmail === 'carlosronco14@gmail.com';
};

const readStripeJson = async (response: Response) => {
 const contentType = response.headers.get('content-type') || '';
 if (!contentType.includes('application/json')) {
 throw new Error('La API de Stripe no esta disponible en este servidor. Abre la app con npm run dev/start, no solo como frontend estatico.');
 }
 return response.json();
};

const getStripeDashboardUrl = (sessionId?: string, invoiceId?: string): string | null => {
 if (sessionId && !sessionId.includes('_mock_')) {
 const modePath = sessionId.startsWith('cs_live_') ? '' : '/test';
 return `https://dashboard.stripe.com${modePath}/checkout/sessions/${sessionId}`;
 }
 if (invoiceId) {
 return `https://dashboard.stripe.com/invoices/${invoiceId}`;
 }
 return null;
};

interface CrmScreenProps {
 contacts: ClientContact[];
 events?: CalendarEvent[];
 onAddContact: (contact: ClientContact) => void | Promise<void>;
 onUpdateContact?: (contact: ClientContact) => void | Promise<void>;
 onDeleteContact?: (id: string) => void | Promise<void>;
 onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
 usersList?: PanelUser[];
 onAddProfile?: (profile: { name: string; email: string }) => void;
 onAddEvent?: (event: CalendarEvent) => void;
 comercialesList?: ComercialAccount[];
 onRefreshFinance?: () => void;
}

export default function CrmScreen({ 
 contacts, 
 events = [], 
 onAddContact, 
 onUpdateContact, 
 onDeleteContact,
 onNavigate,
 usersList = [],
 onAddProfile,
 onAddEvent,
 comercialesList = [],
 onRefreshFinance
}: CrmScreenProps) {
 const [selectedContactId, setSelectedContactId] = useState<string>('');
 const selectedContact = contacts.find(c => c.id === selectedContactId);
 const [showAddModal, setShowAddModal] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');

 useEffect(() => {
  if (!selectedContactId && !showAddModal) return;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const closeOnEscape = (event: KeyboardEvent) => {
   if (event.key === 'Escape' && !showAddModal) setSelectedContactId('');
  };
  window.addEventListener('keydown', closeOnEscape);
  return () => {
   document.body.style.overflow = previousOverflow;
   window.removeEventListener('keydown', closeOnEscape);
  };
 }, [selectedContactId, showAddModal]);

 // Dedicated modal state for scheduling in-person meetings (Cita Presencial)
 const [showScheduleModal, setShowScheduleModal] = useState(false);
 const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
 const [scheduleTime, setScheduleTime] = useState('11:05'); // slight difference
 const [scheduleTitle, setScheduleTitle] = useState('');
 const [scheduleDesc, setScheduleDesc] = useState('');
 const [scheduleAssignee, setScheduleAssignee] = useState('unassigned');

 // Quick collaborator states
 const [showQuickAddCollab, setShowQuickAddCollab] = useState(false);
 const [quickName, setQuickName] = useState('');
 const [quickEmail, setQuickEmail] = useState('');
 
 // Tab/filter for Active vs Archived contacts
 const [crmFilter, setCrmFilter] = useState<'active' | 'archived'>('active');

 const archivedContactIds = React.useMemo(
  () => contacts.filter(contact => contact.archived).map(contact => contact.id),
  [contacts]
 );

 // Connected Accounting & Invoice state definitions
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
 const [invoiceConceptEditor, setInvoiceConceptEditor] = useState<Invoice | null>(null);
 const [invoiceConceptDrafts, setInvoiceConceptDrafts] = useState<string[]>([]);
 const [isSavingInvoiceConcepts, setIsSavingInvoiceConcepts] = useState(false);

 const selectedClientInvoices = React.useMemo(() => {
 if (!selectedContact) return [];
 return invoices.filter(inv => invoiceBelongsToContact(inv, selectedContact));
 }, [invoices, selectedContact]);

 const selectedClientTransactions = React.useMemo(() => {
 if (!selectedContact) return [];
 return transactions.filter(t => t.type === 'income' && !t.isRecurring && transactionBelongsToContact(t, selectedContact, selectedClientInvoices));
 }, [transactions, selectedContact, selectedClientInvoices]);

 const selectedPaymentSummary = React.useMemo(() => {
 const saleTransactions = selectedClientTransactions.filter(t => t.type === 'income');
 const paidTransactions = saleTransactions.filter(t => t.status === 'paid');
 const pendingTransactions = saleTransactions.filter(t => t.status === 'pending');
 const stripeTransactionGroups = [...saleTransactions]
  .filter(t => t.stripeCheckoutUrl)
  .reduce<Map<string, FinanceTransaction[]>>((groups, transaction) => {
  const groupKey = transaction.stripeCheckoutSessionId || transaction.id;
  groups.set(groupKey, [...(groups.get(groupKey) || []), transaction]);
  return groups;
  }, new Map());
 const latestStripeTx = [...stripeTransactionGroups.values()]
  .map(group => [...group].sort((a, b) => {
  const installmentDelta = (a.stripeInstallmentIndex ?? Number.MAX_SAFE_INTEGER)
   - (b.stripeInstallmentIndex ?? Number.MAX_SAFE_INTEGER);
  if (installmentDelta !== 0) return installmentDelta;
  const aTime = new Date(a.date).getTime() || 0;
  const bTime = new Date(b.date).getTime() || 0;
  return aTime - bTime;
  })[0])
  .sort((a, b) => {
  const pendingDelta = Number(b.status === 'pending') - Number(a.status === 'pending');
  if (pendingDelta !== 0) return pendingDelta;
  const aTime = new Date(a.date).getTime() || 0;
  const bTime = new Date(b.date).getTime() || 0;
  return bTime - aTime;
  })[0];

 return {
  total: saleTransactions.reduce((sum, t) => sum + t.amount, 0),
  paid: paidTransactions.reduce((sum, t) => sum + t.amount, 0),
  pending: pendingTransactions.reduce((sum, t) => sum + t.amount, 0),
  paidCount: paidTransactions.length,
  pendingCount: pendingTransactions.length,
  totalCount: saleTransactions.length,
  checkoutUrl: latestStripeTx?.stripeCheckoutUrl || '',
  checkoutSessionId: latestStripeTx?.stripeCheckoutSessionId || '',
  stripeInvoiceId: latestStripeTx?.stripeInvoiceId || '',
  checkoutTransaction: latestStripeTx,
 };
 }, [selectedClientTransactions]);

 // Stripe Subscription States
 const [stripeAmount, setStripeAmount] = useState('50');
 const [stripeConcept, setStripeConcept] = useState('Gestión mensual de redes sociales');
 const [chargePlan, setChargePlan] = useState<ClientChargePlan>('once');
 const [chargePaymentMethod, setChargePaymentMethod] = useState<ClientChargeMethod>('stripe');
 const [stripeLoading, setStripeLoading] = useState(false);
 const [generatedCheckoutUrl, setGeneratedCheckoutUrl] = useState('');
 const [generatedCheckoutSessionId, setGeneratedCheckoutSessionId] = useState('');
 const [stripeCopied, setStripeCopied] = useState(false);
 const [stripeError, setStripeError] = useState('');
 const [chargeSuccess, setChargeSuccess] = useState('');
 const [stripeEmailInput, setStripeEmailInput] = useState('');
 const [stripeOverview, setStripeOverview] = useState<any>(null);
 const [stripeOverviewLoading, setStripeOverviewLoading] = useState(false);
 const [stripeOverviewError, setStripeOverviewError] = useState('');
 const stripeInterval: 'month' | 'year' | 'once' = chargePlan === 'month' || chargePlan === 'year' ? chargePlan : 'once';
 const setStripeInterval = (interval: 'month' | 'year' | 'once') => setChargePlan(interval);
 const instTotalAmount = stripeAmount;
 const setInstTotalAmount = setStripeAmount;
 const instCount: 2 | 3 = chargePlan === 'installments_3' ? 3 : 2;
 const setInstCount = (count: 2 | 3) => setChargePlan(`installments_${count}`);
 const instConcept = stripeConcept;
 const setInstConcept = setStripeConcept;
 const instLoading = stripeLoading;
 const instError = stripeError;
 const setInstError = setStripeError;
 const instGeneratedUrl = generatedCheckoutUrl;
 const setInstGeneratedUrl = setGeneratedCheckoutUrl;
 const instCopied = stripeCopied;
 const setInstCopied = setStripeCopied;

 React.useEffect(() => {
 setGeneratedCheckoutUrl('');
 setGeneratedCheckoutSessionId('');
 setStripeCopied(false);
 setStripeError('');
 setChargeSuccess('');
 setStripeOverview(null);
 setStripeOverviewError('');
 setStripeEmailInput(selectedContact?.email || '');

 setChargePlan('once');
 setChargePaymentMethod('stripe');
 }, [selectedContactId, selectedContact?.email]);

 const handleLoadStripeOverview = async () => {
 if (!selectedContact) return;
 setStripeOverviewLoading(true);
 setStripeOverviewError('');
 try {
  const response = await authenticatedFetch('/api/stripe/customer-overview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
   customerId: selectedContact.stripeCustomerId || '',
   subscriptionId: selectedContact.stripeSubscriptionId || '',
   checkoutSessionId: selectedPaymentSummary.checkoutSessionId || generatedCheckoutSessionId || '',
   invoiceId: selectedPaymentSummary.stripeInvoiceId || '',
   email: selectedContact.email || stripeEmailInput || '',
  }),
  });
  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'No se pudo cargar Stripe');
  }
  setStripeOverview(data);
 } catch (err: any) {
  setStripeOverviewError(err?.message || 'No se pudo cargar la informacion de Stripe.');
 } finally {
  setStripeOverviewLoading(false);
 }
 };

 // Dynamic Stripe link generation states for individual pending transactions/installments
 const [txStripeLoading, setTxStripeLoading] = useState<{[txId: string]: boolean}>({});
 const [txStripeError, setTxStripeError] = useState<{[txId: string]: string}>({});
 const [checkoutSessionState, setCheckoutSessionState] = useState<{[txId: string]: {
  status: 'open' | 'complete' | 'expired' | 'unknown';
  paymentStatus: 'paid' | 'unpaid' | 'no_payment_required' | 'unknown';
  mode?: 'payment' | 'subscription' | 'setup';
  expiresAt?: number;
  loading?: boolean;
  error?: string;
 }}>({});

 const inspectCheckoutSession = React.useCallback(async (tx: FinanceTransaction) => {
  if (!tx.stripeCheckoutSessionId || tx.stripeCheckoutSessionId.startsWith('cs_test_mock_')) {
  setCheckoutSessionState(prev => ({
   ...prev,
   [tx.id]: {
   status: 'unknown',
   paymentStatus: 'unknown',
   error: 'Este enlace antiguo no se puede verificar en Stripe.',
   },
  }));
  return;
  }

  setCheckoutSessionState(prev => ({
  ...prev,
  [tx.id]: {
   ...(prev[tx.id] || { status: 'unknown', paymentStatus: 'unknown' }),
   loading: true,
   error: undefined,
  },
  }));

  try {
  const response = await fetch(`/api/stripe/retrieve-session?sessionId=${encodeURIComponent(tx.stripeCheckoutSessionId)}`);
  const data = await readStripeJson(response);
  if (!response.ok) throw new Error(data.error || 'No se pudo comprobar el enlace en Stripe.');

  setCheckoutSessionState(prev => ({
   ...prev,
   [tx.id]: {
   status: data.status || 'unknown',
   paymentStatus: data.paymentStatus || 'unknown',
   mode: data.mode,
   expiresAt: data.expiresAt,
   },
  }));

  if (data.transactionUpdated && data.paymentStatus === 'paid') {
   setTransactions(prev => prev.map(item => item.id === tx.id ? { ...item, status: 'paid' } : item));
  }
  } catch (err: any) {
  setCheckoutSessionState(prev => ({
   ...prev,
   [tx.id]: {
   status: 'unknown',
   paymentStatus: 'unknown',
   error: err?.message || 'No se pudo comprobar el enlace en Stripe.',
   },
  }));
  }
 }, []);

 const pendingStripeSessionKey = React.useMemo(
  () => selectedClientTransactions
  .filter(tx => tx.status === 'pending' && tx.stripeCheckoutSessionId)
  .map(tx => `${tx.id}:${tx.stripeCheckoutSessionId}`)
  .sort()
  .join('|'),
  [selectedClientTransactions]
 );

 React.useEffect(() => {
  const pendingStripeTransactions = selectedClientTransactions.filter(
  tx => tx.status === 'pending' && tx.stripeCheckoutSessionId
  );
  pendingStripeTransactions.forEach(tx => void inspectCheckoutSession(tx));
 }, [pendingStripeSessionKey, inspectCheckoutSession]);

 const handleGenerateStripeForTx = async (tx: FinanceTransaction) => {
 const currentSession = checkoutSessionState[tx.id];
 if (tx.status !== 'pending') return;
 if (tx.stripeCheckoutUrl && currentSession?.status !== 'expired') {
  setTxStripeError(prev => ({ ...prev, [tx.id]: 'El enlace actual sigue activo o todavía no se ha podido confirmar como caducado.' }));
  return;
 }

 setTxStripeLoading(prev => ({ ...prev, [tx.id]: true }));
 setTxStripeError(prev => ({ ...prev, [tx.id]: '' }));
 try {
  const targetEmail = selectedContact?.email || 'cliente@email.com';
  const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json',
  },
  body: JSON.stringify({
   clientId: selectedContact?.id || 'simulated',
   clientName: selectedContact?.name || 'Cliente',
   clientEmail: targetEmail,
   amount: tx.amount.toString(),
   interval: currentSession?.mode === 'subscription' ? 'month' : 'once',
   pendingTxId: tx.id,
   stripePlanId: tx.stripePlanId,
   installmentIndex: tx.stripeInstallmentIndex,
   installments: tx.stripeInstallmentCount?.toString() || '',
   concept: tx.description,
   previousSessionId: tx.stripeCheckoutUrl ? tx.stripeCheckoutSessionId : undefined,
  }),
  });

  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'Error Stripe');
  }
  const relatedTransactions = transactions.filter(item =>
   item.id === tx.id || (
   Boolean(tx.stripeCheckoutSessionId) &&
   item.clientId === tx.clientId &&
   item.stripeCheckoutSessionId === tx.stripeCheckoutSessionId
   )
  );
  const renewedTransactions = relatedTransactions.map(item => ({
   ...item,
   stripeCheckoutUrl: data.url,
   stripeCheckoutSessionId: data.sessionId,
  }));
  await Promise.all(renewedTransactions.map(item => db.updateFinanceTransaction(item)));
  setTransactions(prev => prev.map(item => renewedTransactions.find(renewed => renewed.id === item.id) || item));
  setGeneratedCheckoutUrl(data.url);
  setGeneratedCheckoutSessionId(data.sessionId);
  setCheckoutSessionState(prev => {
  const next = { ...prev };
  renewedTransactions.forEach(item => {
   next[item.id] = {
   status: data.status || 'open',
   paymentStatus: data.paymentStatus || 'unpaid',
   mode: data.mode,
   expiresAt: data.expiresAt,
   };
  });
  return next;
  });
 } catch (err: any) {
  console.error('Stripe checkout generation error', err);
  setTxStripeError(prev => ({
  ...prev,
  [tx.id]: err?.message || 'No se pudo generar el enlace de Stripe.',
  }));
 } finally {
  setTxStripeLoading(prev => ({ ...prev, [tx.id]: false }));
 }
 };

 // Lead -> Client with Sale conversion states
 const [convertingLead, setConvertingLead] = useState<ClientContact | null>(null);
 const [conversionSuccess, setConversionSuccess] = useState<{
  clientName: string;
  total: number;
  baseAmount: number;
  financingExtra: number;
  paymentMethod: 'cash' | 'transfer' | 'stripe';
  installments: number;
  commercialName?: string;
  commissionPercentage?: number;
  commissionAmount?: number;
  stripeUrl?: string;
 } | null>(null);
 const [convSalePrice, setConvSalePrice] = useState(1500);
 const [convInstallments, setConvInstallments] = useState(1);
 const [convFinancingExtra, setConvFinancingExtra] = useState(0);
 const [convPaymentMethod, setConvPaymentMethod] = useState<'cash' | 'transfer' | 'stripe'>('transfer');
 const [convConcept, setConvConcept] = useState('Servicio de Consultoría Althera');
 const [convSelectedComercialId, setConvSelectedComercialId] = useState('');
 const convFinancedTotal = Math.max(0, Number(convSalePrice) || 0) +
  (convInstallments > 1 ? Math.max(0, Number(convFinancingExtra) || 0) : 0);

 const eligibleCommissionCommercials = (comercialesList || []).filter(commercial => {
  if (isCarlosExcludedFromSalesCommission(commercial)) return false;
  const closerEmail = convertingLead?.closerEmail?.trim().toLowerCase();
  const closerName = convertingLead?.closerName?.trim().toLocaleLowerCase('es-ES');
  if (closerEmail && commercial.email.toLowerCase() === closerEmail) return false;
  if (closerName && commercial.name.trim().toLocaleLowerCase('es-ES') === closerName) return false;
  return true;
 });

 const originCommissionCommercial = convertingLead ? eligibleCommissionCommercials.find(commercial => {
  const originEmail = convertingLead.contactedByComercialEmail?.trim().toLowerCase();
  if (originEmail && commercial.email.toLowerCase() === originEmail) return true;
  const originName = convertingLead.contactedByComercialName?.trim().toLocaleLowerCase('es-ES');
  return Boolean(originName && commercial.name.trim().toLocaleLowerCase('es-ES') === originName);
 }) : undefined;

 const effectiveCommissionCommercialId = convSelectedComercialId;

 useEffect(() => {
  if (!convertingLead) {
   setConvSelectedComercialId('');
   return;
  }
  // En leads de Cold Calling la comisión pertenece al caller de origen.
  // assignedUserEmail identifica al closer operativo y nunca debe usarse aquí.
  setConvSelectedComercialId(originCommissionCommercial?.id || '');
 }, [convertingLead?.id, originCommissionCommercial?.id]);

 // Handle lead to client conversion
 const handleConfirmConvertToClient = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!convertingLead) return;
 const finishConversion = beginBlockingDatabaseOperation(`crm-conversion:${convertingLead.id}`, 'convertLeadToClient');
 if (!finishConversion) return;

 try {

 // 1. The commercial is optional. Carlos is never eligible for sales commission.
 const matchedCom = eligibleCommissionCommercials.find(c => c.id === convSelectedComercialId);
 const assignedEmail = matchedCom ? matchedCom.email : '';
 const commPct = matchedCom?.commissionPercentage ?? 0;

 // 2. Generate the Invoice (Factura) and Transactions (Cobros)
 const invoiceId = getNextInvoiceNumber(invoices);
 const stripePlanId = 'plan_crm_' + Math.random().toString(36).substring(2, 9);
 const pricePerInstallment = Math.round((convFinancedTotal / convInstallments) * 100) / 100;
 const invoiceTaxPercentage = convertingLead.taxPercentage ?? 21;
 const invoiceSubtotal = Number((convFinancedTotal / (1 + invoiceTaxPercentage / 100)).toFixed(2));
 const invoiceTaxAmount = Number((convFinancedTotal - invoiceSubtotal).toFixed(2));
 const firstInstallmentDate = new Date();
 firstInstallmentDate.setHours(12, 0, 0, 0);
 const todayKey = toLocalDateKey(firstInstallmentDate);
 const safeClientEmail = convertingLead.email?.trim() || `${convertingLead.id}@clientes.althera.local`;
 
 // Create Invoice Items
 const invoiceItems: any[] = [];
 const createdTransactions: FinanceTransaction[] = [];
 for (let i = 1; i <= convInstallments; i++) {
  const txId = 'tx_crm_' + Math.random().toString(36).substring(2, 9) + '_' + i;
  const installmentDate = addMonthsKeepingDay(firstInstallmentDate, i - 1);
  
  invoiceItems.push({
  id: 'item_' + i + '_' + Date.now(),
  description: `${convConcept} - Plazo ${i} de ${convInstallments}`,
  quantity: 1,
  unitPrice: pricePerInstallment / (1 + invoiceTaxPercentage / 100),
  total: pricePerInstallment / (1 + invoiceTaxPercentage / 100),
  grossAmount: pricePerInstallment,
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
  date: toLocalDateKey(installmentDate),
  description: `${convConcept} - Cuota ${i} de ${convInstallments} (Pendiente)`,
  status: 'pending',
  paymentMethod: convPaymentMethod,
  clientId: convertingLead.id,
  stripePlanId,
  stripeInstallmentIndex: i,
  stripeInstallmentCount: convInstallments,
  invoiceId: invoiceId,
  comercialId: matchedCom?.id,
  comercialEmail: assignedEmail,
  isInitialSale: true
  };

  createdTransactions.push(transaction);
  try {
  await db.insertFinanceTransaction(transaction);
  } catch (err) {
  console.error('Error inserting transaction:', err);
  }
 }

 // Create and Insert Finance Invoice in DB
 const newInvoice: Invoice = {
  id: invoiceId,
  clientId: convertingLead.id,
  clientName: convertingLead.name,
  clientEmail: safeClientEmail,
  date: todayKey,
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'sent',
  items: invoiceItems,
  subtotal: invoiceSubtotal,
  taxPercentage: invoiceTaxPercentage,
  taxAmount: invoiceTaxAmount,
  total: convFinancedTotal,
  notes: `Venta inicial generada desde CRM. Importe base: ${convSalePrice} €. Extra por financiación: ${convInstallments > 1 ? convFinancingExtra : 0} €. Comercial: ${matchedCom ? matchedCom.name : 'Sin asignar'}. ${matchedCom ? `Comisión: ${commPct}%.` : 'Sin comisión comercial.'}`,
  comercialId: matchedCom?.id,
  comercialEmail: assignedEmail,
  isInitialSale: true
 };

 try {
  await db.insertFinanceInvoice(newInvoice);
 } catch (err) {
  console.error('Error inserting invoice:', err);
 }

 let generatedStripeUrl = '';
 let generatedStripeSessionId = '';
 if (convPaymentMethod === 'stripe') {
  const firstTx = createdTransactions[0];
  try {
  const response = await fetch('/api/stripe/create-checkout-session', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
   clientId: convertingLead.id,
   clientName: convertingLead.name,
    clientEmail: safeClientEmail,
   amount: pricePerInstallment.toFixed(2),
   interval: convInstallments > 1 ? 'month' : 'once',
   installments: convInstallments.toString(),
   concept: `${convConcept} - ${convInstallments > 1 ? `${convInstallments} cuotas mensuales` : 'pago unico'}`,
   pendingTxId: firstTx?.id || '',
   stripePlanId,
   installmentIndex: '1',
   }),
  });
  const data = await readStripeJson(response);
  if (!response.ok) throw new Error(data.error || 'No se pudo generar el link de Stripe');

  generatedStripeUrl = data.url;
  generatedStripeSessionId = data.sessionId;

  const updatedTransactions = createdTransactions.map(tx => ({
   ...tx,
   stripeCheckoutUrl: generatedStripeUrl,
   stripeCheckoutSessionId: generatedStripeSessionId,
  }));
  await Promise.all(updatedTransactions.map(tx => db.updateFinanceTransaction(tx)));
  setTransactions(prev => [
   ...updatedTransactions,
   ...prev.filter(tx => !updatedTransactions.some(created => created.id === tx.id))
  ]);
  setGeneratedCheckoutUrl(generatedStripeUrl);
  setGeneratedCheckoutSessionId(generatedStripeSessionId);
  } catch (stripeErr: any) {
  console.error('Error generating Stripe checkout during conversion:', stripeErr);
  alert(`El cliente se ha convertido, pero Stripe no pudo generar el link: ${stripeErr?.message || 'error desconocido'}`);
  }
 }

 // Sync/create ComercialLead for metrics
 if (matchedCom) {
  try {
  const comLeads = await db.getComercialLeads();
  // Find existing lead by email or name
  const existingLead = comLeads.find(l => 
   (l.email && convertingLead.email && l.email.toLowerCase() === convertingLead.email.toLowerCase()) ||
   l.name?.toLowerCase() === convertingLead.name?.toLowerCase()
  );

  if (existingLead) {
   const updatedLead: ComercialLead = {
   ...existingLead,
   status: 'Ganado',
   value: convFinancedTotal,
   comercialId: matchedCom.id,
   comercialName: matchedCom.name,
   notes: `${existingLead.notes || ''}\n[SOURCE_CONTACT_ID:${convertingLead.id}]`.trim()
   };
   await db.updateComercialLead(updatedLead);
  } else {
   const newLead: ComercialLead = {
   id: `lead_from_${convertingLead.id}`,
   comercialId: matchedCom.id,
   comercialName: matchedCom.name,
   name: convertingLead.name,
   company: convertingLead.company || 'Empresa',
   email: convertingLead.email || '',
   phone: convertingLead.phone || '',
   status: 'Ganado',
   value: convFinancedTotal,
   notes: `Creado al convertir desde CRM por ${matchedCom.name}\n[SOURCE_CONTACT_ID:${convertingLead.id}]`,
   createdAt: new Date().toISOString(),
   temperature: 'Caliente',
   isDone: true
   };
   await db.insertComercialLead(newLead);
  }
 } catch (leadErr) {
  console.error('Error syncing ComercialLead in CrmScreen:', leadErr);
 }
 } else {
  try {
   const comLeads = await db.getComercialLeads();
   const existingLead = comLeads.find(lead =>
    lead.notes?.includes(`[SOURCE_CONTACT_ID:${convertingLead.id}]`) ||
    (lead.email && convertingLead.email && lead.email.toLowerCase() === convertingLead.email.toLowerCase()) ||
    lead.name?.toLowerCase() === convertingLead.name?.toLowerCase()
   );
   if (existingLead) {
    await db.updateComercialLead({
     ...existingLead,
     status: 'Pendiente',
     value: 0,
     isDone: false,
     notes: `${existingLead.notes || ''}\n[CIERRE_SIN_COMERCIAL:${convertingLead.id}]`.trim()
    });
   }
  } catch (leadErr) {
   console.error('Error removing commercial attribution in CrmScreen:', leadErr);
  }
 }

 // 3. Update the CRM contact status to 'Client'
 const updatedContact: ClientContact = {
  ...convertingLead,
  status: 'Client',
 // El closer conserva la responsabilidad operativa del contacto; la atribución
 // comercial se almacena exclusivamente en contactedByComercial*.
 assignedUserEmail: convertingLead.assignedUserEmail,
 contactedByComercialEmail: matchedCom?.email || undefined,
 contactedByComercialName: matchedCom?.name || undefined,
  stripeSubscriptionStatus: convPaymentMethod === 'stripe' && convInstallments > 1 ? 'active' : convertingLead.stripeSubscriptionStatus,
  stripeSubscriptionPrice: convPaymentMethod === 'stripe' ? pricePerInstallment.toFixed(2) : convertingLead.stripeSubscriptionPrice,
  stripeSubscriptionInterval: convPaymentMethod === 'stripe' && convInstallments > 1 ? 'month' : convertingLead.stripeSubscriptionInterval
 };

 if (onUpdateContact) {
  await onUpdateContact(updatedContact);
 }

 // Clear state
 setConvertingLead(null);

 // Refresh CRM financials state immediately
 await fetchFinancials();

 // Trigger parent React state refresh so commission is immediately credited to commercial
 if (onRefreshFinance) {
  onRefreshFinance();
 }

 setConversionSuccess({
  clientName: convertingLead.name,
  total: convFinancedTotal,
  baseAmount: convSalePrice,
  financingExtra: convInstallments > 1 ? convFinancingExtra : 0,
  paymentMethod: convPaymentMethod,
  installments: convInstallments,
  commercialName: matchedCom?.name,
  commissionPercentage: matchedCom ? commPct : undefined,
  commissionAmount: matchedCom ? convFinancedTotal * commPct / 100 : undefined,
  stripeUrl: generatedStripeUrl || undefined
 });
 } finally {
  finishConversion();
 }
 };

 // Connected Accounting & Invoice state definitions
 const [loadingFinancials, setLoadingFinancials] = useState(false);
 const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
 const [paymentAmount, setPaymentAmount] = useState('');
 const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'stripe'>('transfer');
 const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
 const [paymentDesc, setPaymentDesc] = useState('');
 const [paymentInvoiceId, setPaymentInvoiceId] = useState('general');
 const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
 const [paymentInstallments, setPaymentInstallments] = useState<1 | 2 | 3>(1);

 const fetchFinancials = async () => {
 setLoadingFinancials(true);
 try {
  const [invList, txList] = await Promise.all([
  db.getFinanceInvoices(),
  db.getFinanceTransactions()
  ]);
  setInvoices(invList || []);
  setTransactions(txList || []);
 } catch (err) {
  console.error('Error fetching financials in CRM screen:', err);
 } finally {
  setLoadingFinancials(false);
 }
 };

 const handleToggleClientTransactionPaid = async (tx: FinanceTransaction) => {
  const nextStatus: FinanceTransaction['status'] = tx.status === 'paid' ? 'pending' : 'paid';
  const updatedTx: FinanceTransaction = { ...tx, status: nextStatus };
  try {
   await db.updateFinanceTransaction(updatedTx);
   setTransactions(current => current.map(item => item.id === tx.id ? updatedTx : item));

   const linkedInvoice = invoices.find(invoice =>
    invoice.id === tx.invoiceId ||
    invoice.items.some(item => item.pendingTxId === tx.id || item.id === tx.id)
   );
   if (linkedInvoice) {
     const updatedItems = linkedInvoice.items.map(item =>
      (item.pendingTxId === tx.id || item.id === tx.id) ? { ...item, isPending: nextStatus !== 'paid' } : item
     );
     const linkedTransactionIds = new Set(
      updatedItems.flatMap(item => [item.pendingTxId, item.id]).filter((id): id is string => Boolean(id))
     );
     const updatedTransactions = transactions.map(item => item.id === tx.id ? updatedTx : item);
     const latestPaidDate = updatedTransactions
      .filter(item => (item.invoiceId === linkedInvoice.id || linkedTransactionIds.has(item.id)) && item.status === 'paid')
      .map(item => item.date)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))[0];
     const hasPendingItems = updatedItems.some(item => item.isPending);
     const updatedInvoice: Invoice = {
      ...linkedInvoice,
      items: updatedItems,
      status: hasPendingItems ? 'sent' : 'paid',
      dueDate: !hasPendingItems && latestPaidDate ? latestPaidDate : linkedInvoice.dueDate
     };
     await db.updateFinanceInvoice(updatedInvoice);
     setInvoices(current => current.map(invoice => invoice.id === updatedInvoice.id ? updatedInvoice : invoice));
   }
  } catch (error) {
   console.error('Error updating installment payment status:', error);
   alert('No se pudo actualizar el estado del pago.');
  }
 };

 const openInvoiceGeneratorForClientPayment = (tx: FinanceTransaction) => {
  if (!selectedContact) return;
  const pendingTransactionIds = selectedClientTransactions
   .filter(item => item.id !== tx.id && item.type === 'income' && item.status === 'pending')
   .map(item => item.id);
  setInvoicePrefill({
   id: selectedContact.id,
   name: selectedContact.company !== 'Independent' ? selectedContact.company : selectedContact.name,
   email: selectedContact.email,
   taxId: selectedContact.taxId || '',
   address: selectedContact.fiscalAddress || selectedContact.location || '',
   currency: selectedContact.currency || 'EUR',
   language: selectedContact.language || 'es',
   taxPercentage: selectedContact.taxPercentage ?? 21,
   transactionIds: [tx.id, ...pendingTransactionIds]
  });
  onNavigate('finanzas', 'push');
 };

 const handleDeleteTransaction = async (txId: string) => {
 if (safeConfirm('¿Estás seguro de que deseas eliminar este cobro?')) {
  try {
  await db.deleteFinanceTransaction(txId);
  setTransactions(prev => prev.filter(t => t.id !== txId));
  if (onRefreshFinance) {
   onRefreshFinance();
  }
  // Show success toast
  const toast = document.getElementById('toast-msg');
  if (toast) {
   toast.innerText = `Éxito: Cobro eliminado correctamente.`;
   toast.classList.remove('opacity-0');
   setTimeout(() => toast.classList.add('opacity-0'), 3500);
  }
  } catch (err) {
  console.error('Error deleting transaction:', err);
  alert('No se pudo eliminar el cobro. Por favor, inténtelo de nuevo.');
  }
 }
 };

 useEffect(() => {
  fetchFinancials();
  const refreshTimer = window.setInterval(fetchFinancials, 15000);
  const refreshWhenVisible = () => {
   if (document.visibilityState === 'visible') fetchFinancials();
  };
  document.addEventListener('visibilitychange', refreshWhenVisible);
  return () => {
   window.clearInterval(refreshTimer);
   document.removeEventListener('visibilitychange', refreshWhenVisible);
  };
 }, []);

 // Update payment descriptions when the client selection changes
 useEffect(() => {
 if (selectedContact) {
  setPaymentDesc(`Cobro Cliente: ${selectedContact.name}${selectedContact.company ? ` - ${selectedContact.company}` : ''}`);
 }
 }, [selectedContactId, selectedContact]);

 const handleMarkInvoicePaid = async (inv: Invoice) => {
 try {
  const updated: Invoice = { ...inv, status: 'paid' };
  
  // Update local invoice state
  setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i));
  
  // Save updated invoice to DB
  await db.updateFinanceInvoice(updated);

  // Register matching paid income transaction if it does not exist
  const alreadyRegistered = transactions.some(t => t.invoiceId === inv.id && t.status === 'paid');
  if (!alreadyRegistered) {
  const autoTx: FinanceTransaction = {
   id: 'tx_auto_' + Date.now(),
   type: 'income',
   category: 'Facturado',
   amount: inv.total,
   date: new Date().toISOString().split('T')[0],
   description: `Pago Factura Autogenerado: ${inv.id} - ${inv.clientName}`,
   isRecurring: false,
   status: 'paid',
   paymentMethod: 'transfer',
   invoiceId: inv.id
  };
  // Update local transaction state
  setTransactions(prev => [autoTx, ...prev]);
  // Insert into DB
  await db.insertFinanceTransaction(autoTx);
  }
  
  // Reload financials
  await fetchFinancials();

  // Show toast
  const toast = document.getElementById('toast-msg');
  if (toast) {
  toast.innerText = `Éxito: Factura ${inv.id} marcada como PAGADA con Éxito e ingresada en cuentas.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
  }
 } catch (err) {
  console.error('Error marking invoice as paid:', err);
  alert('Hubo un error al marcar la factura como pagada.');
 }
 };

 const handleRegisterPayment = async (e: React.FormEvent) => {
 e.preventDefault();
 const amt = Number(paymentAmount);
 if (!amt || amt <= 0) {
  alert('Por favor ingrese un importe válido mayor que cero.');
  return;
 }

 try {
  // 1. Create the payment transaction
  const txId = 'tx_crm_' + Date.now();
  let finalInvoiceId: string | undefined = undefined;

  if (paymentInvoiceId && paymentInvoiceId !== 'general') {
  finalInvoiceId = paymentInvoiceId;
  }

  const newTx: FinanceTransaction = {
  id: txId,
  type: 'income',
  category: 'Facturado',
  amount: amt,
  date: paymentDate,
  description: paymentDesc.trim() || `Cobro Cliente: ${selectedContact.name} - ${selectedContact.company || ''}`,
  isRecurring: false,
  status: paymentStatus,
  paymentMethod: paymentMethod,
  invoiceId: finalInvoiceId,
  clientId: selectedContact.id,
  comercialId: (comercialesList || []).find(c => c.email.toLowerCase() === (selectedContact.contactedByComercialEmail || selectedContact.assignedUserEmail || '').toLowerCase())?.id,
  comercialEmail: selectedContact.contactedByComercialEmail || selectedContact.assignedUserEmail,
  isInitialSale: false
  };

  // Create a manual installment plan when the client agreed to pay in 2 or 3 months.
  if (paymentStatus === 'pending' && paymentInstallments > 1) {
  const installmentAmount = Math.round((amt / paymentInstallments) * 100) / 100;
  const firstPaymentDate = new Date(`${paymentDate}T12:00:00`);
  for (let index = 0; index < paymentInstallments; index++) {
   const dueDate = addMonthsKeepingDay(firstPaymentDate, index);
   await db.insertFinanceTransaction({
   ...newTx,
   id: `${txId}_${index + 1}`,
   amount: index === paymentInstallments - 1 ? Math.round((amt - installmentAmount * index) * 100) / 100 : installmentAmount,
   date: toLocalDateKey(dueDate),
   description: `${newTx.description} Cuota ${index + 1}/${paymentInstallments}`,
   stripeInstallmentIndex: index + 1,
   stripeInstallmentCount: paymentInstallments
   });
  }
  } else {
  await db.insertFinanceTransaction(newTx);
  }

  // Sync/update ComercialLead status to 'Ganado' if this contact is a Client and a payment was registered
  if (selectedContact && selectedContact.status === 'Client') {
  try {
   const comEmail = selectedContact.contactedByComercialEmail || selectedContact.assignedUserEmail;
   const matchedCom = (comercialesList || []).find(c => 
   (comEmail && c.email.toLowerCase() === comEmail.toLowerCase()) ||
   (selectedContact.contactedByComercialName && c.name.toLowerCase() === selectedContact.contactedByComercialName.toLowerCase())
   );

   if (matchedCom) {
   const comLeads = await db.getComercialLeads();
   const existingLead = comLeads.find(l => 
    (l.email && selectedContact.email && l.email.toLowerCase() === selectedContact.email.toLowerCase()) ||
    (l.name && selectedContact.name && l.name.toLowerCase() === selectedContact.name.toLowerCase())
   );

   if (existingLead) {
    const updatedLead: ComercialLead = {
    ...existingLead,
    status: 'Ganado',
    value: existingLead.status === 'Ganado' ? existingLead.value : (existingLead.value || 0) + amt,
    comercialId: matchedCom.id,
    comercialName: matchedCom.name,
    notes: `${existingLead.notes || ''}\n[SOURCE_CONTACT_ID:${selectedContact.id}]`.trim()
    };
    await db.updateComercialLead(updatedLead);
   } else {
    const newLead: ComercialLead = {
    id: `lead_from_${selectedContact.id}`,
    comercialId: matchedCom.id,
    comercialName: matchedCom.name,
    name: selectedContact.name,
    company: selectedContact.company || 'Empresa',
    email: selectedContact.email || '',
    phone: selectedContact.phone || '',
    status: 'Ganado',
    value: amt,
    notes: `Creado automáticamente al registrar un cobro para el cliente por ${matchedCom.name}\n[SOURCE_CONTACT_ID:${selectedContact.id}]`,
    createdAt: new Date().toISOString(),
    temperature: 'Caliente',
    isDone: true
    };
    await db.insertComercialLead(newLead);
   }
   }
  } catch (leadErr) {
   console.error('Error syncing ComercialLead in handleRegisterPayment:', leadErr);
  }
  }

  // 2. If payment is paid, match/settle invoices
  if (paymentStatus === 'paid') {
  if (finalInvoiceId) {
   const targetInvoice = invoices.find(i => i.id === finalInvoiceId);
   if (targetInvoice) {
   const updatedInv: Invoice = { ...targetInvoice, status: 'paid' };
   await db.updateFinanceInvoice(updatedInv);
   }
  } else {
   // 3. Automated payment allocation (Auto-Matching pending invoices!)
   // Find pending invoices of this client and automatically apply this payment to cover them
   const clientPendingInvoices = invoices
   .filter(inv => invoiceBelongsToContact(inv, selectedContact) && inv.status !== 'paid')
   .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

   let remainingPayment = amt;
   for (const pendingInv of clientPendingInvoices) {
   if (remainingPayment >= pendingInv.total) {
    // This payment fully covers this pending invoice!
    const updatedInv: Invoice = { ...pendingInv, status: 'paid' };
    await db.updateFinanceInvoice(updatedInv);
    remainingPayment -= pendingInv.total;
   } else if (remainingPayment > 0) {
    // Partial coverage is marked as paid as well under the simplified flow
    const updatedInv: Invoice = { ...pendingInv, status: 'paid' };
    await db.updateFinanceInvoice(updatedInv);
    break;
   }
   }
  }
  }

  // Reload financials
  await fetchFinancials();

  // Reset form states
  setPaymentAmount('');
  setPaymentInvoiceId('general');
  setShowAddPaymentModal(false);

  // Show toast
  const toast = document.getElementById('toast-msg');
  if (toast) {
  toast.innerText = `Éxito: Pago de ${amt} registrado correctamente y vinculado.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
  }
 } catch (err) {
  console.error('Error registering payment:', err);
  alert('Hubo un error al registrar el pago.');
 }
 };

 const handleEditInvoiceClientFiscal = async (inv: Invoice) => {
  const clientTaxId = window.prompt('CIF / NIF / DNI del cliente:', inv.clientTaxId || '');
  if (clientTaxId === null) return;
  const clientAddress = window.prompt('Dirección fiscal completa del cliente:', inv.clientAddress || '');
  if (clientAddress === null) return;

  const updatedInvoice: Invoice = {
   ...inv,
   clientTaxId: clientTaxId.trim(),
   clientAddress: clientAddress.trim()
  };

  try {
   await db.updateFinanceInvoice(updatedInvoice);
   setInvoices(current => current.map(invoice => invoice.id === inv.id ? updatedInvoice : invoice));
   const toast = document.getElementById('toast-msg');
   if (toast) {
    toast.innerText = `Datos fiscales de la factura ${inv.id} actualizados.`;
    toast.classList.remove('opacity-0');
    setTimeout(() => toast.classList.add('opacity-0'), 3000);
   }
  } catch (error) {
   console.error('Error updating invoice client fiscal data:', error);
   alert('No se pudieron guardar los datos fiscales del cliente.');
  }
 };

 const openInvoiceConceptEditor = (invoice: Invoice) => {
  setInvoiceConceptEditor(invoice);
  setInvoiceConceptDrafts(invoice.items.map(item => getEditableInvoiceConcept(item.description)));
 };

 const handleSaveInvoiceConcepts = async () => {
  if (!invoiceConceptEditor || isSavingInvoiceConcepts) return;
  const concepts = invoiceConceptDrafts.map(value => value.trim());
  if (concepts.some(value => !value)) {
   window.alert('Todos los conceptos deben tener una descripción.');
   return;
  }

  const updatedInvoice: Invoice = {
   ...invoiceConceptEditor,
   items: invoiceConceptEditor.items.map((item, index) => ({
    ...item,
    description: concepts[index]
   }))
  };

  setIsSavingInvoiceConcepts(true);
  try {
   await db.updateFinanceInvoice(updatedInvoice);
   setInvoices(current => current.map(invoice => invoice.id === updatedInvoice.id ? updatedInvoice : invoice));
   setInvoiceConceptEditor(null);
   setInvoiceConceptDrafts([]);
   const toast = document.getElementById('toast-msg');
   if (toast) {
    toast.innerText = `Conceptos de la factura ${updatedInvoice.id} actualizados.`;
    toast.classList.remove('opacity-0');
    setTimeout(() => toast.classList.add('opacity-0'), 3000);
   }
  } catch (error) {
   console.error('Error updating invoice concepts:', error);
   window.alert('No se pudieron guardar los conceptos de la factura.');
  } finally {
   setIsSavingInvoiceConcepts(false);
  }
 };

 const handleDownloadInvoiceHtml = async (inv: Invoice) => {
 const filename = `Factura_${inv.id}_${inv.clientName.replace(/\s+/g, '_')}.pdf`;
 const invoiceTransactionIds = new Set(
  inv.items.flatMap(item => [item.pendingTxId, item.id]).filter((id): id is string => Boolean(id))
 );
 const linkedTransactions = transactions.filter(tx =>
  tx.invoiceId === inv.id || invoiceTransactionIds.has(tx.id)
 );
 const paidTransactions = linkedTransactions.filter(tx => tx.status === 'paid');
 const paidAmount = paidTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
 const isInvoicePaid = inv.status === 'paid' || (
  linkedTransactions.length > 0 &&
  linkedTransactions.every(tx => tx.status === 'paid') &&
  paidAmount + 0.005 >= Number(inv.total || 0)
 );
 const lastPaymentDate = paidTransactions.map(tx => tx.date).filter(Boolean).sort((a, b) => b.localeCompare(a))[0];
 const effectiveDueDate = lastPaymentDate || inv.dueDate;
 const cleanInvoiceConcept = (description: string) =>
  description.replace(/\s*\((?:Pendiente|Cobrado)\)\s*$/i, '').trim();
 
 const legacyHtmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
 <meta charset="UTF-8">
 <title>Factura ${inv.id} - ${inv.clientName}</title>
 <style>
 body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #334155;
  margin: 0;
  padding: 40px;
  line-height: 1.6;
  background-color: #f8fafc;
 }
 .invoice-card {
  max-width: 800px;
  margin: 0 auto;
  background: #ffffff;
  padding: 50px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02);
 }
 .header-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 40px;
 }
 .company-title {
  font-size: 24px;
  font-weight: 850;
  color: #0f172a;
  letter-spacing: -0.025em;
  margin: 0;
 }
 .company-logo {
  display: block;
  width: 150px;
  max-height: 72px;
  object-fit: contain;
  object-position: left center;
  margin-bottom: 12px;
 }
 .company-sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 5px;
  line-height: 1.5;
 }
 .invoice-title-block {
  text-align: right;
 }
 .invoice-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3b82f6;
 }
 .invoice-number {
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
  margin: 2px 0;
 }
 .invoice-dates {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
 }
 .stakeholders {
  display: table;
  width: 100%;
  margin-bottom: 40px;
 }
 .stakeholder-column {
  display: table-cell;
  width: 50%;
  vertical-align: top;
 }
 .stakeholder-box {
  margin-right: 15px;
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
 }
 .stakeholder-box.recipient {
  margin-right: 0;
  margin-left: 15px;
 }
 .box-title {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0 0 6px 0;
  font-weight: bold;
 }
 .box-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
 }
 .box-detail {
  font-size: 11px;
  color: #475569;
  margin: 0;
  line-height: 1.5;
 }
 .items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
 }
 .items-table th {
  background: #f1f5f9;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
  padding: 12px;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
 }
 .items-table td {
  padding: 14px 12px;
  font-size: 12px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
 }
 .items-table td.qty {
  text-align: center;
 }
 .items-table td.price, .items-table td.total {
  text-align: right;
  font-family: monospace;
 }
 .totals-block {
  float: right;
  width: 300px;
  margin-bottom: 40px;
 }
 .totals-table {
  width: 100%;
  border-collapse: collapse;
 }
 .totals-table td {
  padding: 6px 0;
  font-size: 12px;
  color: #64748b;
 }
 .totals-table td.value {
  text-align: right;
  font-family: monospace;
 }
 .totals-table tr.grand-total td {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
 }
 .totals-table tr.grand-total td.value {
  color: #0f172a;
 }
 .clear {
  clear: both;
 }
 .bank-box {
  background: #fffbeb;
  border: 1px dashed #f59e0b;
  border-radius: 12px;
  padding: 20px;
  font-size: 11px;
  color: #5c3e03;
  margin-bottom: 30px;
 }
 .bank-title {
  font-weight: 700;
  font-size: 12px;
  margin: 0 0 12px 0;
  color: #b45309;
  text-transform: uppercase;
  letter-spacing: 0.05em;
 }
 .bank-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
 }
 .bank-item-title {
  color: #92400e;
  font-weight: 600;
 }
 .bank-item-val {
  font-family: monospace;
  font-size: 11px;
  color: #78350f;
 }
 .footer {
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px solid #f1f5f9;
  padding-top: 20px;
  margin-top: 20px;
 }
 .status-badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 9999px;
  margin-top: 10px;
 }
 .status-paid {
  background-color: #dcfce7;
  color: #15803d;
 }
 .status-pending {
  background-color: #fef9c3;
  color: #a16207;
 }
 </style>
</head>
<body>
 <div class="invoice-card">
 <table class="header-table">
  <tr>
  <td>
   <img class="company-logo" src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" alt="Althera Solutions">
   <h1 class="company-title">${inv.issuerBrand || DEFAULT_INVOICE_ISSUER.brand}</h1>
   <div class="company-sub">
   ${inv.issuerName || DEFAULT_INVOICE_ISSUER.name}<br>
   NIF/DNI: ${inv.issuerTaxId || DEFAULT_INVOICE_ISSUER.taxId}<br>
   ${inv.issuerAddress || DEFAULT_INVOICE_ISSUER.address}<br>
   ${inv.issuerEmail || DEFAULT_INVOICE_ISSUER.email}
   </div>
  </td>
  <td class="invoice-title-block">
   <div class="invoice-label">FACTURA</div>
   <div class="invoice-number">${inv.id}</div>
   <div class="invoice-dates">
   Fecha: ${inv.date}<br>
   Vence: ${effectiveDueDate}
   </div>
   <div class="status-badge ${isInvoicePaid ? 'status-paid' : 'status-pending'}">
   ${isInvoicePaid ? 'PAGADA' : 'PENDIENTE'}
   </div>
  </td>
  </tr>
 </table>

 <div class="stakeholders">
  <div class="stakeholder-column">
  <div class="stakeholder-box">
   <div class="box-title">EMISOR</div>
   <div class="box-name">${inv.issuerName || DEFAULT_INVOICE_ISSUER.name}</div>
   <div class="box-detail">
   NIF/DNI: ${inv.issuerTaxId || DEFAULT_INVOICE_ISSUER.taxId}<br>
   ${inv.issuerAddress || DEFAULT_INVOICE_ISSUER.address}<br>
   ${inv.issuerBrand || DEFAULT_INVOICE_ISSUER.brand}<br>
   ${inv.issuerEmail || DEFAULT_INVOICE_ISSUER.email}
   </div>
  </div>
  </div>
  <div class="stakeholder-column">
  <div class="stakeholder-box recipient">
   <div class="box-title">CLIENTE</div>
   <div class="box-name">${inv.clientName}</div>
   <div class="box-detail">
   Email: ${inv.clientEmail}<br>
   CIF/NIF/DNI: ${inv.clientTaxId || 'No indicado'}<br>
   Dirección fiscal: ${inv.clientAddress || 'No indicada'}
   </div>
  </div>
  </div>
 </div>

 <table class="items-table">
  <thead>
  <tr>
   <th>Concepto / Descripción</th>
   <th style="text-align: center; width: 80px;">Cant.</th>
   <th style="text-align: right; width: 120px;">Precio Unit.</th>
   <th style="text-align: right; width: 120px;">Total</th>
  </tr>
  </thead>
  <tbody>
  ${(inv.items || []).map(item => `
   <tr>
   <td>${cleanInvoiceConcept(item.description)}</td>
   <td class="qty">${item.quantity}</td>
   <td class="price">${Number(item.unitPrice).toFixed(2)} €</td>
   <td class="total">${Number(item.total).toFixed(2)} €</td>
   </tr>
  `).join('')}
  </tbody>
 </table>

 <div class="totals-block">
  <table class="totals-table">
  <tr>
   <td>Subtotal:</td>
   <td class="value">${Number(inv.subtotal).toFixed(2)} €</td>
  </tr>
  <tr>
   <td>I.V.A. (${inv.taxPercentage}%):</td>
   <td class="value">${Number(inv.taxAmount).toFixed(2)} €</td>
  </tr>
  <tr class="grand-total">
   <td>Total Factura:</td>
   <td class="value">${Number(inv.total).toFixed(2)} €</td>
  </tr>
  </table>
 </div>
 
 <div class="clear"></div>

 <div class="footer">
  ¡Gracias por tu confianza y colaboración!<br>
  Esta factura se rige bajo los términos acordados. Ante cualquier duda, ponte en contacto con contacto@altherasolutions.com
 </div>
 </div>
</body>
</html>`;
 void legacyHtmlContent;
 const htmlContent = buildInvoiceHtml(inv, {
  isPaid: isInvoicePaid,
  dueDate: effectiveDueDate
 });

 await downloadInvoicePdf(htmlContent, filename);

 // Show toast message
 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = `Descargada factura ${inv.id} correctamente.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
 }
 };

 const handleCreateClientCharge = async (contact: ClientContact) => {
 const targetEmail = stripeEmailInput.trim();
 const isStripe = chargePaymentMethod === 'stripe';
 const isSubscription = chargePlan === 'month' || chargePlan === 'year';
 const installmentCount = chargePlan.startsWith('installments_')
  ? Number(chargePlan.replace('installments_', ''))
  : 1;

 if (isStripe && !targetEmail) {
  setStripeError('Añade un email para generar el enlace de Stripe.');
  return;
 }

 setStripeLoading(true);
 setStripeError('');
 setChargeSuccess('');
 try {
  const amountNumber = Number(stripeAmount);
  const concept = stripeConcept.trim();
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) throw new Error('Introduce un importe válido superior a cero.');
  if (!concept) throw new Error('Introduce el concepto del cobro.');

  if (isStripe && contact.email !== targetEmail && onUpdateContact) {
   onUpdateContact({ ...contact, email: targetEmail });
  }

  const timestamp = Date.now();
  const stripePlanId = `plan_stripe_${Math.random().toString(36).slice(2, 10)}`;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (installmentCount > 1) {
   const regularAmount = Math.round((amountNumber / installmentCount) * 100) / 100;
   let plannedTransactions: FinanceTransaction[] = Array.from({ length: installmentCount }, (_, index) => {
    const installmentAmount = index === installmentCount - 1
     ? Math.round((amountNumber - regularAmount * index) * 100) / 100
     : regularAmount;
    const isPaidNow = !isStripe && index === 0;
    return {
     id: `tx_${chargePaymentMethod}_${timestamp}_${index + 1}_${Math.random().toString(36).slice(2, 7)}`,
     type: 'income',
     category: 'Ventas',
     amount: installmentAmount,
     date: toLocalDateKey(addMonthsKeepingDay(today, index)),
     description: `${concept} - Cuota ${index + 1} de ${installmentCount}${isPaidNow ? '' : ' (Pendiente)'}`,
     status: isPaidNow ? 'paid' : 'pending',
     paymentMethod: chargePaymentMethod,
     clientId: contact.id,
     stripePlanId,
     stripeInstallmentIndex: index + 1,
     stripeInstallmentCount: installmentCount,
    };
   });

   if (isStripe) {
    const firstTransaction = plannedTransactions[0];
    const response = await authenticatedFetch('/api/stripe/create-checkout-session', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
      clientId: contact.id,
      clientName: contact.name,
      clientEmail: targetEmail,
      amount: firstTransaction.amount.toFixed(2),
      interval: 'month',
      installments: String(installmentCount),
      concept: `${concept} - ${installmentCount} cuotas mensuales`,
      pendingTxId: firstTransaction.id,
      stripePlanId,
      installmentIndex: '1',
     }),
    });
    const data = await readStripeJson(response);
    if (!response.ok) throw new Error(data.error || 'No se pudo generar el plan de cuotas.');
    plannedTransactions = plannedTransactions.map(transaction => ({
     ...transaction,
     stripeCheckoutUrl: data.url,
     stripeCheckoutSessionId: data.sessionId,
    }));
    setGeneratedCheckoutUrl(data.url);
    setGeneratedCheckoutSessionId(data.sessionId);
   }

   await Promise.all(plannedTransactions.map(transaction => db.insertFinanceTransaction(transaction)));
   setTransactions(previous => [...plannedTransactions, ...previous]);
   setChargeSuccess(isStripe ? 'Enlace de cuotas listo para compartir.' : `Plan de ${installmentCount} cuotas registrado.`);
   return;
  }

  const txId = `tx_${chargePaymentMethod}_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

  if (isSubscription) {
   const recurringTemplate: FinanceTransaction = {
    id: `recurring_${txId}`,
    type: 'income',
    category: 'Mensualidad',
    amount: amountNumber,
    nextAmount: amountNumber,
    date: toLocalDateKey(today),
    description: concept,
    isRecurring: true,
    recurrencePeriod: chargePlan === 'year' ? 'yearly' : 'monthly',
    status: 'paid',
    paymentMethod: chargePaymentMethod,
    clientId: contact.id,
    stripePlanId,
   };

   if (isStripe) {
    const response = await authenticatedFetch('/api/stripe/create-checkout-session', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
      clientId: contact.id,
      clientName: contact.name,
      clientEmail: targetEmail,
      amount: amountNumber.toFixed(2),
      interval: chargePlan,
      concept,
      pendingTxId: txId,
      stripePlanId,
     }),
    });
    const data = await readStripeJson(response);
    if (!response.ok) throw new Error(data.error || 'No se pudo generar la suscripción.');
    const pendingTransaction: FinanceTransaction = {
     id: txId,
     type: 'income',
     category: 'Mensualidad',
     amount: amountNumber,
     date: toLocalDateKey(today),
     description: `${concept} (Pendiente)`,
     isRecurring: false,
     status: 'pending',
     paymentMethod: 'stripe',
     clientId: contact.id,
     stripePlanId,
     stripeCheckoutUrl: data.url,
     stripeCheckoutSessionId: data.sessionId,
    };
    await Promise.all([db.insertFinanceTransaction(pendingTransaction), db.insertFinanceTransaction(recurringTemplate)]);
    setTransactions(previous => [pendingTransaction, recurringTemplate, ...previous]);
    setGeneratedCheckoutUrl(data.url);
    setGeneratedCheckoutSessionId(data.sessionId);
    setChargeSuccess('Suscripción creada y añadida a ingresos recurrentes.');
   } else {
    await db.insertFinanceTransaction(recurringTemplate);
    const updatedTransactions = [recurringTemplate, ...transactions];
    await db.materializeDueRecurringFinanceTransactions(updatedTransactions);
    setTransactions(await db.getFinanceTransactions());
    setChargeSuccess('Suscripción e ingreso de hoy registrados.');
   }
   return;
  }

  if (isStripe) {
   const response = await authenticatedFetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     clientId: contact.id,
     clientName: contact.name,
     clientEmail: targetEmail,
     amount: amountNumber.toFixed(2),
     interval: 'once',
     concept,
     pendingTxId: txId,
     stripePlanId,
    }),
   });
   const data = await readStripeJson(response);
   if (!response.ok) throw new Error(data.error || 'No se pudo generar el enlace de Stripe.');
   const pendingTransaction: FinanceTransaction = {
    id: txId,
    type: 'income',
    category: 'Ventas',
    amount: amountNumber,
    date: toLocalDateKey(today),
    description: `${concept} (Pendiente)`,
    status: 'pending',
    paymentMethod: 'stripe',
    clientId: contact.id,
    stripePlanId,
    stripeCheckoutUrl: data.url,
    stripeCheckoutSessionId: data.sessionId,
   };
   await db.insertFinanceTransaction(pendingTransaction);
   setTransactions(previous => [pendingTransaction, ...previous]);
   setGeneratedCheckoutUrl(data.url);
   setGeneratedCheckoutSessionId(data.sessionId);
   setChargeSuccess('Enlace de pago listo para compartir.');
  } else {
   const paidTransaction: FinanceTransaction = {
    id: txId,
    type: 'income',
    category: 'Ventas',
    amount: amountNumber,
    date: toLocalDateKey(today),
    description: concept,
    status: 'paid',
    paymentMethod: chargePaymentMethod,
    clientId: contact.id,
   };
   await db.insertFinanceTransaction(paidTransaction);
   setTransactions(previous => [paidTransaction, ...previous]);
   setChargeSuccess('Pago registrado correctamente.');
  }
 } catch (err: any) {
  console.error(err);
  setStripeError(err?.message || 'No se pudo crear el cobro.');
 } finally {
  setStripeLoading(false);
 }
 };

 const handleCreateStripeCheckout = handleCreateClientCharge;
 const handleCreateInstallmentStripeCheckout = handleCreateClientCharge;

 const handleOpenStripePortal = async (stripeCustomerId: string) => {
 setStripeLoading(true);
 setStripeError('');
 try {
  const response = await authenticatedFetch('/api/stripe/create-portal-session', {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json',
  },
  body: JSON.stringify({ stripeCustomerId }),
  });

  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'Error al conectar con el portal de facturación');
  }

  window.open(data.url, '_blank');
 } catch (err: any) {
  console.error(err);
  setStripeError(err?.message || 'No se pudo abrir el portal de facturación.');
 } finally {
  setStripeLoading(false);
 }
 };

 // Drag and drop states for Kanban layout
 const [draggedContactId, setDraggedContactId] = useState<string | null>(null);
 const [draggedOverCol, setDraggedOverCol] = useState<'lead' | 'client' | 'archived' | null>(null);

 const handleDropContact = async (contactId: string, targetCol: 'lead' | 'client' | 'archived') => {
 if (!contactId) return;
 const contact = contacts.find(c => c.id === contactId);
 if (!contact) return;

 if (targetCol === 'client' && contact.status === 'Lead') {
  setConvertingLead(contact);
  setConvSalePrice(1500);
  setConvInstallments(1);
  setConvFinancingExtra(0);
  setConvPaymentMethod('transfer');
  setConvConcept('Servicio de Consultoría Althera');
  setConvSelectedComercialId(comercialesList[0]?.id || '');
  setDraggedContactId(null);
  setDraggedOverCol(null);
  return;
 }

 let updatedContact = { ...contact };
 if (targetCol === 'lead') {
  updatedContact.status = 'Lead';
  updatedContact.archived = false;
 } else if (targetCol === 'client') {
  updatedContact.status = 'Client';
  updatedContact.archived = false;
 } else if (targetCol === 'archived') {
  updatedContact.archived = true;
 }

 try {
  if (onUpdateContact) await onUpdateContact(updatedContact);
 } catch (error: any) {
  alert(`No se movió el cliente. Supabase no confirmó el cambio: ${error?.message || 'error de conexión'}`);
  return;
 }
 
 setSelectedContactId(contactId);

 const toast = document.getElementById('toast-msg');
 if (toast) {
  const colNames = { lead: 'Prospectos (Leads)', client: 'Clientes Activos', archived: 'Archivados' };
  toast.innerText = `Cliente "${contact.name}" movido a ${colNames[targetCol]}.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 2500);
 }
 };

 const renderContactCard = (contact: ClientContact) => {
 const isSelected = contact.id === selectedContactId;
 const contactColor = getContactColor(contact.color);
 const contactInvoices = invoices.filter(invoice => invoiceBelongsToContact(invoice, contact));
 const contactTransactions = transactions.filter(transaction =>
  transaction.type === 'income' && transactionBelongsToContact(transaction, contact, contactInvoices)
 );
 const hasCommercialOrigin = Boolean(contact.contactedByComercialEmail || contact.contactedByComercialName);
 const hasWebsite = contactHasAssignedWebsite(contact);
 const hasPendingBalance = contactTransactions.some(transaction => transaction.status === 'pending')
  || contactInvoices.some(invoice => invoice.status !== 'paid');
 const hasFinancialActivity = contactTransactions.length > 0 || contactInvoices.length > 0;
 const isFullyPaid = hasFinancialActivity && !hasPendingBalance
  && contactTransactions.every(transaction => transaction.status === 'paid');
 const hasRecurrence = contactTransactions.some(transaction => transaction.isRecurring || transaction.recurrenceSourceId)
  || contact.stripeSubscriptionStatus === 'active';
 const hasStripeLink = contactTransactions.some(transaction =>
  transaction.paymentMethod === 'stripe' && Boolean(transaction.stripeCheckoutUrl || transaction.stripeCheckoutSessionId)
 );
 const signalBaseClass = 'grid h-6 w-6 place-items-center rounded-md border transition-colors';
 const signalInactiveClass = 'border-white/[0.045] bg-white/[0.018] text-slate-700';

 let cardBorderClass = 'border-white/[0.065] hover:border-cyan-400/25 bg-gradient-to-br from-white/[0.045] to-white/[0.015] hover:from-white/[0.07] hover:to-cyan-500/[0.025]';
 let dotColor = 'bg-blue-500';

 if (contactColor === 'rose') {
  dotColor = 'bg-rose-500';
  if (isSelected) cardBorderClass = 'border-rose-500/40 bg-rose-950/10 shadow-[0_0_15px_rgba(244,63,94,0.05)]';
 } else if (contactColor === 'emerald') {
  dotColor = 'bg-emerald-500';
  if (isSelected) cardBorderClass = 'border-emerald-500/40 bg-emerald-950/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]';
 } else if (contactColor === 'amber') {
  dotColor = 'bg-amber-500';
  if (isSelected) cardBorderClass = 'border-amber-500/40 bg-amber-950/10 shadow-[0_0_15px_rgba(245,158,11,0.05)]';
 } else if (contactColor === 'violet') {
  dotColor = 'bg-violet-500';
  if (isSelected) cardBorderClass = 'border-violet-500/40 bg-violet-950/10 shadow-[0_0_15px_rgba(139,92,246,0.05)]';
 } else {
  dotColor = 'bg-indigo-500';
  if (isSelected) cardBorderClass = 'border-indigo-500/40 bg-indigo-950/10 shadow-[0_0_15px_rgba(99,102,241,0.05)]';
 }

 return (
  <div
  key={contact.id}
  draggable
  onDragStart={() => setDraggedContactId(contact.id)}
  onDragEnd={() => {
   setDraggedContactId(null);
   setDraggedOverCol(null);
  }}
  onClick={() => setSelectedContactId(contact.id)}
  className={`p-4 rounded-[20px] border transition-all duration-200 cursor-grab active:cursor-grabbing text-left relative overflow-hidden group select-none shadow-[0_10px_28px_rgba(0,0,0,.12)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(0,0,0,.2)] ${cardBorderClass} ${
   isSelected ? 'ring-1 ring-cyan-400/25' : ''
  }`}
  >
  <div className="flex items-start gap-3">
   <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs bg-gradient-to-br from-slate-800 to-slate-900 text-slate-300 border border-white/[0.07] overflow-hidden shrink-0 shadow-inner">
   {contact.avatarUrl ? (
    <img 
    alt={getContactBusinessName(contact)}
    referrerPolicy="no-referrer"
    className="w-full h-full object-cover"
    src={contact.avatarUrl}
    />
   ) : (
    contact.initials
   )}
   </div>

   <div className="flex-1 min-w-0">
   <div className="flex items-center gap-1.5 flex-wrap">
    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
    <h4 className="font-black text-[12px] text-white truncate tracking-tight" title={getContactBusinessName(contact)}>{getContactBusinessName(contact)}</h4>
    {contact.priority && (
    <span className="text-[10px] text-amber-400 select-none">★</span>
    )}
   </div>
   
   <p className="mt-0.5 truncate text-[10px] text-slate-400"><span className="text-slate-300">{contact.name}</span> <span className="font-mono text-[9px] text-slate-500">· {contact.role || 'Contacto'}</span></p>
   <p className="text-[9px] text-slate-505 truncate font-mono mt-1">{contact.email}</p>

   <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
    <span className={`px-1.5 py-0.2 rounded-[4px] text-[7.5px] font-mono font-bold uppercase tracking-wider border ${
    contact.status === 'Client' ?
     'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
     : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
    }`}>
    {contact.status}
    </span>

    {!contactHasAssignedWebsite(contact) && (
    <span className="px-1.5 py-0.2 bg-rose-500/10 text-[7.5px] font-bold text-rose-455 border border-rose-500/15 rounded uppercase tracking-wider font-mono">
     Le Falta Web
    </span>
    )}
   </div>

   {contact.status === 'Lead' && (
    <button
    onClick={(e) => {
     e.stopPropagation();
     setConvertingLead(contact);
     setConvSalePrice(1500);
     setConvInstallments(1);
     setConvFinancingExtra(0);
     setConvPaymentMethod('transfer');
     setConvConcept('Servicio de Consultoría Althera');
     setConvSelectedComercialId(comercialesList[0]?.id || '');
    }}
    className="mt-2.5 w-full py-1 px-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-400 font-bold text-[8.5px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer select-none active:scale-95 uppercase tracking-wider font-mono duration-100"
    >
    <span>Convertir a Cliente 🎯</span>
    </button>
   )}
   </div>
  </div>

  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.04] pt-2">
   <div className="inline-grid grid-cols-6 gap-1 rounded-lg border border-white/[0.04] bg-black/15 p-1" aria-label="Señales del cliente">
    <span className={`${signalBaseClass} ${hasCommercialOrigin ? 'border-amber-400/20 bg-amber-400/10 text-amber-300' : signalInactiveClass}`} title={hasCommercialOrigin ? 'Procede de un comercial' : 'Sin comercial vinculado'}><BriefcaseBusiness className="h-3 w-3" /></span>
    <span className={`${signalBaseClass} ${hasWebsite ? 'border-blue-400/20 bg-blue-400/10 text-blue-300' : signalInactiveClass}`} title={hasWebsite ? 'Web realizada o vinculada' : 'Sin web vinculada'}><Globe className="h-3 w-3" /></span>
    <span className={`${signalBaseClass} ${hasPendingBalance ? 'border-amber-400/20 bg-amber-400/10 text-amber-300' : signalInactiveClass}`} title={hasPendingBalance ? 'Tiene saldo pendiente' : 'Sin saldo pendiente'}><Clock3 className="h-3 w-3" /></span>
    <span className={`${signalBaseClass} ${isFullyPaid ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : signalInactiveClass}`} title={isFullyPaid ? 'Todos los pagos están liquidados' : 'No consta como totalmente pagado'}><Check className="h-3 w-3" /></span>
    <span className={`${signalBaseClass} ${hasRecurrence ? 'border-violet-400/20 bg-violet-400/10 text-violet-300' : signalInactiveClass}`} title={hasRecurrence ? 'Tiene una recurrencia activa' : 'Sin recurrencia'}><RefreshCw className="h-3 w-3" /></span>
    <span className={`${signalBaseClass} ${hasStripeLink ? 'border-[#635bff]/30 bg-[#635bff]/15' : signalInactiveClass}`} title={hasStripeLink ? 'Tiene enlace generado con Stripe' : 'Sin enlace de Stripe'}><img src="/stripe-mark.png" alt="" className={`h-3.5 w-3.5 rounded-[3px] ${hasStripeLink ? '' : 'grayscale opacity-20'}`} /></span>
   </div>
   <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition duration-150">
   <span className="text-[8px] uppercase tracking-widest font-bold">Mover</span>
   <div className="w-1.5 h-2.5 flex flex-col justify-between gap-0.5">
    <div className="h-0.5 bg-slate-400 rounded-full" />
    <div className="h-0.5 bg-slate-400 rounded-full" />
    <div className="h-0.5 bg-slate-400 rounded-full" />
   </div>
   </div>
  </div>
  </div>
 );
 };

 const renderEmptyPlaceholder = (col: 'lead' | 'client' | 'archived') => {
 const titles = { lead: 'Prospectos', client: 'Clientes Activos', archived: 'Archivados' };
 const desc = { 
  lead: 'No hay prospectos. Arrastra un cliente o añade uno nuevo.', 
  client: 'No hay clientes activos en desarrollo o producción.', 
  archived: 'No tienes clientes archivados en tu historial comercial.' 
 };
 return (
  <div className="py-12 border border-dashed border-white/10 bg-white/[0.015] rounded-[22px] flex flex-col items-center justify-center p-6 text-center text-slate-600">
  <span className="text-xl mb-1 opacity-60">📂</span>
  <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-1">Sin {titles[col]}</h4>
  <p className="text-[9px] text-slate-550 max-w-[160px] leading-relaxed">{desc[col]}</p>
  </div>
 );
 };

 const toggleArchiveContact = async (id: string) => {
 const isCurrentlyArchived = archivedContactIds.includes(id);
 const contact = contacts.find(item => item.id === id);
 if (!contact || !onUpdateContact) return;
 try {
  await onUpdateContact({ ...contact, archived: !isCurrentlyArchived });
 } catch (error: any) {
  alert(`No se ${isCurrentlyArchived ? 'desarchivó' : 'archivó'} el cliente. Supabase no confirmó el cambio: ${error?.message || 'error de conexión'}`);
  return;
 }

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = isCurrentlyArchived ? "Cliente desarchivado con Éxito." : "Cliente archivado con Éxito.";
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 2500);
 }
 };

 // Form states and editing tracker
 const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
 const [newName, setNewName] = useState('');
 const [newEmail, setNewEmail] = useState('');
 const [newCompany, setNewCompany] = useState('');
 const [newStatus, setNewStatus] = useState<'Client' | 'Lead'>('Lead');
 const [newRole, setNewRole] = useState('');
 const [newLocation, setNewLocation] = useState('San Francisco, CA');
 const [newTaxId, setNewTaxId] = useState('');
 const [newFiscalAddress, setNewFiscalAddress] = useState('');
 const [newCurrency, setNewCurrency] = useState<NonNullable<ClientContact['currency']>>('EUR');
 const [newLanguage, setNewLanguage] = useState<NonNullable<ClientContact['language']>>('es');
 const [newTaxPercentage, setNewTaxPercentage] = useState(21);
 const [newWebsite, setNewWebsite] = useState('');
 const [newGithubRepo, setNewGithubRepo] = useState('');
 const [newHostingCredentials, setNewHostingCredentials] = useState('');
 const [newPhone, setNewPhone] = useState('');
 const [newLinkedin, setNewLinkedin] = useState('');
 const [newAvatarUrl, setNewAvatarUrl] = useState('');
 const [newAssignedUserEmail, setNewAssignedUserEmail] = useState('');
 const [newColor, setNewColor] = useState('');

 const resetFormFields = () => {
 setNewName('');
 setNewEmail('');
 setNewCompany('');
 setNewStatus('Lead');
 setNewRole('');
 setNewLocation('San Francisco, CA');
 setNewTaxId('');
 setNewFiscalAddress('');
 setNewCurrency('EUR');
 setNewLanguage('es');
 setNewTaxPercentage(21);
 setNewWebsite('');
 setNewGithubRepo('');
 setNewHostingCredentials('');
 setNewPhone('');
 setNewLinkedin('');
 setNewAvatarUrl('');
 setNewAssignedUserEmail('');
 setNewColor('');
 setEditingContact(null);
 };

 // Eye toggle visibility matching target contact ID
 const [showCredsId, setShowCredsId] = useState<string | null>(null);

 const toggleCredsVisibility = (id: string) => {
 setShowCredsId(prev => prev === id ? null : id);
 };

 const handleOpenScheduleMeeting = (contact: ClientContact) => {
 setScheduleDate(new Date().toISOString().split('T')[0]);
 setScheduleTime('11:00');
 setScheduleTitle(`Cita Presencial con ${contact.name}`);
 setScheduleDesc(`Reunión presencial con el cliente en sus oficinas para dar seguimiento al proyecto.`);
 setScheduleAssignee(contact.assignedUserEmail || 'unassigned');
 setShowScheduleModal(true);
 };

 const handleConfirmScheduleMeeting = (e: React.FormEvent) => {
 e.preventDefault();
 if (!onAddEvent || !selectedContact) return;

 const newEvent: CalendarEvent = {
  id: 'evt_' + Math.random().toString(36).substring(2, 9),
  title: scheduleTitle.trim() || `Cita Presencial con ${selectedContact.name}`,
  date: scheduleDate,
  time: scheduleTime,
  type: 'Meeting',
  description: scheduleDesc.trim(),
  linkedContactId: selectedContact.id,
  linkedContactName: selectedContact.name,
  linkedContactIds: [selectedContact.id],
  assignedUserEmail: scheduleAssignee !== 'unassigned' ? scheduleAssignee : undefined,
  color: 'violet',
  status: 'pending'
 };

 onAddEvent(newEvent);
 setShowScheduleModal(false);
 alert(`?Éxito! Se ha agendado una Cita Presencial para el día ${scheduleDate} a las ${scheduleTime} h.`);
 };

 const handleAddSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newName.trim()) return;

 const initials = newName
  .split(' ')
  .filter(Boolean)
  .map(n => n[0])
  .join('')
  .toUpperCase()
  .slice(0, 2);

 const matchedUser = usersList.find(u => u.email === newAssignedUserEmail);

 if (editingContact) {
  const updatedContact: ClientContact = {
  ...editingContact,
  name: newName,
  email: newEmail,
  company: newCompany || 'Independent',
  status: newStatus,
  role: newRole || 'Product Manager',
  location: newLocation,
  taxId: newTaxId || undefined,
  fiscalAddress: newFiscalAddress || newLocation || undefined,
  currency: newCurrency,
  language: newLanguage,
  taxPercentage: newTaxPercentage,
  website: newWebsite || (newCompany ? `${newCompany.toLowerCase().replace(/\s+/g, '')}.io` : ''),
  githubRepo: newGithubRepo,
  hostingCredentials: newHostingCredentials,
  phone: newPhone || undefined,
  linkedin: newLinkedin || undefined,
  avatarUrl: newAvatarUrl || undefined,
  assignedUserEmail: newAssignedUserEmail || undefined,
  assignedUserId: matchedUser ? matchedUser.id : undefined,
  initials: initials || 'N',
  color: newColor || undefined,
  temperature: newColor === 'red' ? 'Caliente' : newColor === 'yellow' ? 'Templado' : 'Frío'
  };

  if (onUpdateContact) {
  try {
   await onUpdateContact(updatedContact);
  } catch (error) {
   console.error('No se pudo guardar la información fiscal del cliente:', error);
   window.alert('No se pudo guardar el cliente en la base de datos. Revisa la conexión e inténtalo de nuevo.');
   return;
  }
  }
  const linkedInvoices = invoices.filter(invoice => invoiceBelongsToContact(invoice, editingContact));
  const updatedInvoices = linkedInvoices.map(invoice => {
   const taxPercentage = updatedContact.taxPercentage ?? invoice.taxPercentage;
   const linkedTransactionIds = new Set(
    invoice.items.flatMap(item => [item.pendingTxId, item.id]).filter((id): id is string => Boolean(id))
   );
   const linkedTransactions = transactions.filter(transaction =>
    transaction.invoiceId === invoice.id || linkedTransactionIds.has(transaction.id)
   );
   const transactionGrossTotal = linkedTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
   const itemGrossTotal = invoice.items.reduce((sum, item) =>
    sum + Number(item.grossAmount ?? item.total * (1 + invoice.taxPercentage / 100)), 0
   );
   const grossTotal = Number((transactionGrossTotal > 0 ? transactionGrossTotal : itemGrossTotal > 0 ? itemGrossTotal : invoice.total).toFixed(2));
   const subtotal = Number((grossTotal / (1 + taxPercentage / 100)).toFixed(2));
   const taxAmount = Number((grossTotal - subtotal).toFixed(2));
   const items = invoice.items.map(item => {
    const linkedTransaction = linkedTransactions.find(transaction => transaction.id === item.pendingTxId || transaction.id === item.id);
    const grossAmount = Number(linkedTransaction?.amount ?? item.grossAmount ?? item.total * (1 + invoice.taxPercentage / 100));
    const netTotal = grossAmount / (1 + taxPercentage / 100);
    return {
     ...item,
     grossAmount,
     unitPrice: netTotal / Math.max(1, Number(item.quantity) || 1),
     total: netTotal
    };
   });
   return {
    ...invoice,
    clientName: updatedContact.name,
    clientEmail: updatedContact.email,
    clientTaxId: updatedContact.taxId,
    clientAddress: updatedContact.fiscalAddress || updatedContact.location,
    currency: updatedContact.currency || invoice.currency || 'EUR',
    language: updatedContact.language || invoice.language || 'es',
    taxPercentage,
    subtotal,
    taxAmount,
    total: grossTotal,
    items
   };
  });
  await Promise.all(updatedInvoices.map(invoice => db.updateFinanceInvoice(invoice)));
  if (updatedInvoices.length > 0) {
   const byId = new Map(updatedInvoices.map(invoice => [invoice.id, invoice]));
   setInvoices(current => current.map(invoice => byId.get(invoice.id) || invoice));
  }
  setSelectedContactId(updatedContact.id);
 } else {
  const generatedContact: ClientContact = {
  id: 'c_' + Date.now().toString().slice(-6),
  name: newName,
  email: newEmail,
  company: newCompany || 'Independent',
  status: newStatus,
  lastContacted: 'Just now',
  role: newRole || 'Product Manager',
  location: newLocation,
  taxId: newTaxId || undefined,
  fiscalAddress: newFiscalAddress || newLocation || undefined,
  currency: newCurrency,
  language: newLanguage,
  taxPercentage: newTaxPercentage,
  addedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  website: newWebsite || (newCompany ? `${newCompany.toLowerCase().replace(/\s+/g, '')}.io` : ''),
  githubRepo: newGithubRepo,
  hostingCredentials: newHostingCredentials,
  phone: newPhone || undefined,
  linkedin: newLinkedin || undefined,
  avatarUrl: newAvatarUrl || undefined,
  assignedUserEmail: newAssignedUserEmail || undefined,
  assignedUserId: matchedUser ? matchedUser.id : undefined,
  initials: initials || 'N',
  color: newColor || undefined,
  temperature: newColor === 'red' ? 'Caliente' : newColor === 'yellow' ? 'Templado' : 'Frío'
  };

  try {
   await onAddContact(generatedContact);
  } catch (error: any) {
   console.error('No se pudo crear el cliente en Supabase:', error);
   window.alert(`No se ha creado el cliente. Supabase no confirmó el guardado: ${error?.message || 'error de conexión'}`);
   return;
  }
  setSelectedContactId(generatedContact.id);
 }

 setShowAddModal(false);
 resetFormFields();

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = editingContact ?
   `Cliente actualizado eÉxitosamente: ${newName}`
   : `Cliente registrado eÉxitosamente: ${newName}`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
 }
 };

 // Filter contacts by search query & archive status
 const searchLower = searchQuery.toLowerCase();
 const searchFilteredContacts = contacts.filter(c => {
 const nameMatch = c.name ? c.name.toLowerCase().includes(searchLower) : false;
 const companyMatch = c.company ? c.company.toLowerCase().includes(searchLower) : false;
 const emailMatch = c.email ? c.email.toLowerCase().includes(searchLower) : false;

 return nameMatch || companyMatch || emailMatch;
 });

 const activeLeads = searchFilteredContacts.filter(c => c.status === 'Lead' && !archivedContactIds.includes(c.id));
 const activeClients = searchFilteredContacts.filter(c => c.status === 'Client' && !archivedContactIds.includes(c.id));
 const archivedContacts = searchFilteredContacts.filter(c => archivedContactIds.includes(c.id));

 const filteredContacts = crmFilter === 'active' ? [...activeLeads, ...activeClients] : archivedContacts;
 const activePortfolio = activeLeads.length + activeClients.length;
 const conversionRate = activePortfolio > 0 ? Math.round((activeClients.length / activePortfolio) * 100) : 0;

 return (
 <div className="flex-1 min-h-[calc(100vh-80px)] xl:h-[calc(100vh-80px)] overflow-y-auto xl:overflow-hidden p-4 sm:p-5 lg:p-6 xl:p-7 flex flex-col xl:flex-row gap-5 xl:gap-6 bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,.07),transparent_30%),radial-gradient(circle_at_100%_20%,rgba(16,185,129,.05),transparent_28%)] text-slate-100">
  
  {/* Contact List Column */}
  <section className="flex-1 flex flex-col gap-4 min-w-0">
  
  {/* Title and Top Search Bar */}
  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end rounded-[26px] border border-white/[0.07] bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-5 shadow-[0_18px_55px_rgba(0,0,0,.18)]">
   <div>
   <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.24em] text-cyan-300"><BriefcaseBusiness className="h-3.5 w-3.5"/>Client intelligence</div>
   <h2 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] text-white font-sans">CRM & Relaciones</h2>
   <p className="text-slate-400 text-xs mt-1.5">Centraliza prospectos, clientes, actividad y contexto comercial.</p>
   </div>
   <div className="flex flex-wrap gap-2">
   <button 
    onClick={() => { resetFormFields(); setShowAddModal(true); }}
    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 hover:bg-cyan-400/15 text-cyan-200 hover:text-white transition-all text-xs font-bold cursor-pointer shadow-[0_8px_24px_rgba(34,211,238,.08)]"
   >
    <UserPlus className="w-4 h-4" />
    <span>Nuevo contacto</span>
   </button>
   <button 
    onClick={() => alert("Exportando registros de clientes. Descarga iniciada perfectamente en formato CSV.")}
    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 bg-black/20 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
   >
    <Download className="w-4.5 h-4.5" />
    <span>Exportar</span>
   </button>
   </div>
  </div>

  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
   <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-cyan-500/[0.11] to-white/[0.018] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(0,0,0,.14)]"><div className="flex items-center justify-between"><span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[.16em] text-slate-500">Cartera activa</span><UsersRound className="h-4 w-4 text-cyan-300"/></div><p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white">{activePortfolio}</p></div>
   <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-blue-500/[0.11] to-white/[0.018] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(0,0,0,.14)]"><div className="flex items-center justify-between"><span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[.16em] text-slate-500">Prospectos</span><Target className="h-4 w-4 text-blue-300"/></div><p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white">{activeLeads.length}</p></div>
   <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-emerald-500/[0.11] to-white/[0.018] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(0,0,0,.14)]"><div className="flex items-center justify-between"><span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[.16em] text-slate-500">Clientes</span><BriefcaseBusiness className="h-4 w-4 text-emerald-300"/></div><p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white">{activeClients.length}</p></div>
   <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-violet-500/[0.11] to-white/[0.018] p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(0,0,0,.14)]"><div className="flex items-center justify-between"><span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[.16em] text-slate-500">Conversión</span><TrendingUp className="h-4 w-4 text-violet-300"/></div><p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white">{conversionRate}%</p></div>
  </div>

  {/* Local Search Input Inside the CRM view with filter tabs */}
  <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-2.5">
   <div className="relative flex-1">
   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
   <input 
    type="text"
    placeholder="Buscar por contacto, empresa o email…"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full bg-[#080c14]/90 border border-white/[0.07] rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-cyan-500/15 focus:border-cyan-400/40 outline-none placeholder:text-slate-600 text-slate-200 transition"
   />
   </div>
   <div className="flex bg-[#080c14]/90 p-1 rounded-xl border border-white/[0.07] self-start sm:self-auto shrink-0">
   <button
    onClick={() => setCrmFilter('active')}
    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
    crmFilter === 'active' ?
     'bg-blue-500/20 text-blue-400'
     : 'text-slate-450 hover:text-slate-200'
    }`}
   >
    Activos ({contacts.filter(c => !archivedContactIds.includes(c.id)).length})
   </button>
   <button
    onClick={() => setCrmFilter('archived')}
    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
    crmFilter === 'archived' ?
     'bg-amber-500/20 text-amber-400'
     : 'text-slate-450 hover:text-slate-200'
    }`}
   >
    Archivados ({contacts.filter(c => archivedContactIds.includes(c.id)).length})
   </button>
   </div>
  </div>

  {/* Kanban Board Container */}
  <div className="flex-1 flex flex-col min-h-0">
   {crmFilter === 'active' ? (
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 xl:overflow-hidden">
    {/* Leads Column */}
    <div 
    className={`flex flex-col bg-gradient-to-b from-blue-500/[0.035] to-white/[0.018] backdrop-blur-md rounded-[26px] border border-white/[0.07] p-4 min-h-[320px] xl:min-h-0 transition-all duration-300 shadow-[0_16px_45px_rgba(0,0,0,.16)] ${
     draggedOverCol === 'lead' ? 'bg-blue-500/[0.03] border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.05)]' : ''
    }`}
    onDragOver={(e) => {
     e.preventDefault();
     if (draggedOverCol !== 'lead') setDraggedOverCol('lead');
    }}
    onDragLeave={() => setDraggedOverCol(null)}
    onDrop={() => handleDropContact(draggedContactId || '', 'lead')}
    >
    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
     <div className="flex items-center gap-2">
     <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
     <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300 font-mono">Prospectos (Leads)</h3>
     </div>
     <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-white/5 text-slate-400 font-bold">
     {activeLeads.length}
     </span>
    </div>
    
    <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800/80">
     {activeLeads.map((contact) => renderContactCard(contact))}
     {activeLeads.length === 0 && renderEmptyPlaceholder('lead')}
    </div>
    </div>

    {/* Clients Column */}
    <div 
    className={`flex flex-col bg-gradient-to-b from-emerald-500/[0.035] to-white/[0.018] backdrop-blur-md rounded-[26px] border border-white/[0.07] p-4 min-h-[320px] xl:min-h-0 transition-all duration-300 shadow-[0_16px_45px_rgba(0,0,0,.16)] ${
     draggedOverCol === 'client' ? 'bg-emerald-500/[0.03] border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : ''
    }`}
    onDragOver={(e) => {
     e.preventDefault();
     if (draggedOverCol !== 'client') setDraggedOverCol('client');
    }}
    onDragLeave={() => setDraggedOverCol(null)}
    onDrop={() => handleDropContact(draggedContactId || '', 'client')}
    >
    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
     <div className="flex items-center gap-2">
     <span className="w-2 h-2 rounded-full bg-emerald-500" />
     <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300 font-mono">Clientes Activos</h3>
     </div>
     <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-white/5 text-slate-400 font-bold">
     {activeClients.length}
     </span>
    </div>
    
    <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800/80">
     {activeClients.map((contact) => renderContactCard(contact))}
     {activeClients.length === 0 && renderEmptyPlaceholder('client')}
    </div>
    </div>
   </div>
   ) : (
   /* Archived Column (Full width when on Archived tab) */
   <div 
    className={`flex flex-col bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/5 p-5 flex-1 min-h-0 transition-all duration-300 ${
    draggedOverCol === 'archived' ? 'bg-amber-500/[0.03] border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : ''
    }`}
    onDragOver={(e) => {
    e.preventDefault();
    if (draggedOverCol !== 'archived') setDraggedOverCol('archived');
    }}
    onDragLeave={() => setDraggedOverCol(null)}
    onDrop={() => handleDropContact(draggedContactId || '', 'archived')}
   >
    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
    <div className="flex items-center gap-2">
     <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
     <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300 font-mono">Histórico Archivados</h3>
    </div>
    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/5 text-slate-400 font-bold">
     {archivedContacts.length}
    </span>
    </div>
    
    <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800/80">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
     {archivedContacts.map((contact) => renderContactCard(contact))}
    </div>
    {archivedContacts.length === 0 && renderEmptyPlaceholder('archived')}
    </div>
   </div>
   )}

   {/* Dynamic Drag Drop Zones for Archiving/Unarchiving when card is being dragged */}
   {draggedContactId && (
   <div className="mt-4 transition-all duration-300">
    {crmFilter === 'active' ? (
    <div 
     className={`border-2 border-dashed rounded-2xl p-4.5 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer ${
     draggedOverCol === 'archived' ?
      'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-lg shadow-amber-500/[0.05] scale-[1.01]'
      : 'bg-amber-950/10 border-amber-500/20 text-amber-400 hover:bg-amber-950/15'
     }`}
     onDragOver={(e) => {
     e.preventDefault();
     if (draggedOverCol !== 'archived') setDraggedOverCol('archived');
     }}
     onDragLeave={() => setDraggedOverCol(null)}
     onDrop={() => handleDropContact(draggedContactId, 'archived')}
    >
     <Archive className="w-4 h-4 text-amber-400" />
     <span className="text-xs font-semibold uppercase tracking-wider font-mono">Arrastrar aqu para ARCHIVAR cliente</span>
    </div>
    ) : (
    <div 
     className={`border-2 border-dashed rounded-2xl p-4.5 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer ${
     draggedOverCol === 'lead' ?
      'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-500/[0.05] scale-[1.01]'
      : 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/15'
     }`}
     onDragOver={(e) => {
     e.preventDefault();
     if (draggedOverCol !== 'lead') setDraggedOverCol('lead');
     }}
     onDragLeave={() => setDraggedOverCol(null)}
     onDrop={() => handleDropContact(draggedContactId, 'lead')}
    >
     <Plus className="w-4 h-4 text-emerald-400" />
     <span className="text-xs font-semibold uppercase tracking-wider font-mono">Arrastrar aqu para DESARCHIVAR y reactivar</span>
    </div>
    )}
   </div>
   )}
  </div>

  </section>

  {/* Complete client inspector rendered as a modal, preserving every existing action. */}
  {selectedContact && createPortal(
   <div className="fixed inset-0 z-[80] flex h-[100dvh] items-start justify-center overflow-hidden p-2 sm:p-4">
   <button type="button" aria-label="Cerrar detalles del cliente" className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-md" onClick={() => setSelectedContactId('')} />
   <aside role="dialog" aria-modal="true" aria-label={`Detalles de ${getContactBusinessName(selectedContact)}`} className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/[0.12] shadow-[0_32px_100px_rgba(0,0,0,.7)]">
   <div className="bg-gradient-to-b from-[#111529] to-[#07090f] backdrop-blur-xl rounded-[28px] overflow-hidden flex flex-col h-full border border-white/[0.05] shadow-[0_28px_80px_rgba(0,0,0,.36)]">
   
   {/* Detail Banner cover */}
   <div className={`relative h-36 border-b border-white/[0.06] transition-all duration-300 ${
    selectedContact.color === 'red' ? 'bg-gradient-to-tr from-red-600/30 via-red-950/20 to-slate-950/20' :
    selectedContact.color === 'green' ? 'bg-gradient-to-tr from-emerald-600/30 via-emerald-950/20 to-slate-950/20' :
    selectedContact.color === 'yellow' ? 'bg-gradient-to-tr from-amber-500/30 via-amber-950/20 to-slate-950/20' :
    selectedContact.color === 'blue' ? 'bg-gradient-to-tr from-blue-600/30 via-blue-950/20 to-slate-950/20' :
    'bg-gradient-to-tr from-blue-500/20 to-purple-500/10'
   }`}>
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
    <div className="absolute top-4 right-4 flex items-center gap-2">
    <button type="button" onClick={() => setSelectedContactId('')} className="p-2 bg-slate-950/60 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/5 transition cursor-pointer" title="Cerrar detalles" aria-label="Cerrar detalles del cliente">
     <X className="w-4 h-4" />
    </button>
    {/* Archive Button */}
    <button 
     onClick={() => toggleArchiveContact(selectedContact.id)}
     className="p-2 bg-slate-950/60 hover:bg-slate-900 hover:text-amber-400 text-slate-300 rounded-xl border border-white/5 transition cursor-pointer"
     title={archivedContactIds.includes(selectedContact.id) ? "Desarchivar Cliente" : "Archivar Cliente"}
    >
     <Archive className="w-4 h-4" />
    </button>

    {/* Delete Button */}
    <button 
     onClick={async () => {
     if (safeConfirm(`¿Eliminar permanentemente a "${selectedContact.name}"? Se borrarán también su cierre comercial y todos sus datos vinculados en Supabase.`)) {
      if (onDeleteContact) {
      await onDeleteContact(selectedContact.id);
      setSelectedContactId('');
      }
     }
     }}
     className="p-2 bg-slate-950/60 hover:bg-slate-900 hover:text-red-450 text-slate-300 rounded-xl border border-white/5 transition cursor-pointer"
     title="Eliminar Cliente"
    >
     <Trash2 className="w-4 h-4" />
    </button>

    <button 
     onClick={() => {
     setEditingContact(selectedContact);
     setNewName(selectedContact.name || '');
     setNewEmail(selectedContact.email || '');
     setNewCompany(selectedContact.company || '');
     setNewStatus(selectedContact.status || 'Lead');
     setNewRole(selectedContact.role || '');
     setNewLocation(selectedContact.location || 'San Francisco, CA');
     setNewTaxId(selectedContact.taxId || '');
     setNewFiscalAddress(selectedContact.fiscalAddress || selectedContact.location || '');
     setNewCurrency(selectedContact.currency || 'EUR');
     setNewLanguage(selectedContact.language || 'es');
     setNewTaxPercentage(selectedContact.taxPercentage ?? 21);
     setNewWebsite(selectedContact.website || '');
     setNewGithubRepo(selectedContact.githubRepo || '');
     setNewHostingCredentials(selectedContact.hostingCredentials || '');
     setNewPhone(selectedContact.phone || '');
     setNewLinkedin(selectedContact.linkedin || '');
     setNewAvatarUrl(selectedContact.avatarUrl || '');
     setNewAssignedUserEmail(selectedContact.assignedUserEmail || '');
     setNewColor(selectedContact.color || '');
     setShowAddModal(true);
     }}
     className="p-2 bg-slate-950/60 hover:bg-slate-900 border border-white/5 text-slate-300 hover:text-blue-400 rounded-xl transition cursor-pointer"
     title="Editar Contacto"
    >
     <Edit className="w-4 h-4" />
    </button>
    </div>
   </div>
   {/* Profile Detail Stack */}
   <div className="px-6 2xl:px-7 -mt-10 relative z-10 flex flex-col gap-5 pb-7 overflow-y-auto flex-1 scrollbar-thin">
    
    {/* Profile Card Center Headshot */}
    <div className="flex flex-col items-center text-center">
    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border-4 border-slate-950/80 shadow-xl flex items-center justify-center">
     {selectedContact.avatarUrl ? (
     <img 
      alt="Headshot" 
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover"
      src={selectedContact.avatarUrl}
     />
     ) : (
     <span className="text-2xl font-bold text-blue-400">{selectedContact.initials}</span>
     )}
    </div>

    <div className="mt-4 flex flex-col items-center">
     <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2 py-0.5 font-mono text-[7px] font-black uppercase tracking-[.16em] text-cyan-300"><BriefcaseBusiness className="h-2.5 w-2.5" /> Negocio</span>
     <h3 className="max-w-full truncate text-lg font-black tracking-tight text-white" title={getContactBusinessName(selectedContact)}>{getContactBusinessName(selectedContact)}</h3>
     <p className="text-xs text-slate-400">{selectedContact.name} · {selectedContact.role || 'Contacto principal'}</p>
     
     {/* Copy Client ID Button */}
     <button 
     onClick={() => {
      navigator.clipboard.writeText(selectedContact.id);
      const toast = document.getElementById('toast-msg');
      if (toast) {
      toast.innerText = `ID de Cliente copiado: ${selectedContact.id}`;
      toast.classList.remove('opacity-0');
      setTimeout(() => toast.classList.add('opacity-0'), 2500);
      }
     }}
     className="mt-2 text-[10px] font-mono text-slate-400 hover:text-blue-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer active:scale-95 duration-100"
     title="Copiar ID de Cliente"
     >
     <span>ID: {selectedContact.id}</span>
     <span className="text-[10px] opacity-70">📋</span>
     </button>

     <div className="flex justify-center gap-1.5 mt-4 items-center">
     <div className="relative">
      <select 
      value={selectedContact.status}
      onChange={(e) => {
       const val = e.target.value as 'Client' | 'Lead';
       if (val === 'Client' && selectedContact.status === 'Lead') {
        setConvertingLead(selectedContact);
        setConvSalePrice(1500);
        setConvInstallments(1);
        setConvFinancingExtra(0);
        setConvPaymentMethod('transfer');
        setConvConcept('Servicio de Consultoría Althera');
        setConvSelectedComercialId(comercialesList[0]?.id || '');
        return;
       }
       if (onUpdateContact) {
       onUpdateContact({
        ...selectedContact,
        status: val
       });
       }
      }}
      className="appearance-none font-bold text-[9px] uppercase tracking-wider bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 pl-2.5 pr-6 py-1 rounded-xl cursor-pointer transition focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
      title="Cambiar estado del contacto"
      >
      <option value="Lead" className="bg-[#0e1628] text-slate-300 font-sans font-medium text-xs">Lead</option>
      <option value="Client" className="bg-[#0e1628] text-slate-300 font-sans font-medium text-xs">Client</option>
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none text-[8px] scale-75">▼</span>
     </div>
     {selectedContact.priority && (
      <span className="px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
      High Priority
      </span>
     )}
     </div>

     {selectedContact.status === 'Lead' && (
     <button
      onClick={() => {
      setConvertingLead(selectedContact);
      setConvSalePrice(1500);
      setConvInstallments(1);
      setConvFinancingExtra(0);
      setConvPaymentMethod('transfer');
      setConvConcept('Servicio de Consultoría Althera');
      setConvSelectedComercialId(comercialesList[0]?.id || '');
      }}
      className="w-full mt-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.3)] active:scale-[0.98] duration-150 uppercase tracking-wider"
     >
      <Check className="w-4 h-4 text-emerald-100" />
      <span>Cerrar Venta / Convertir en Cliente 🎯</span>
     </button>
     )}

     {/* Subtle, Aesthetic Client Color Selector */}
     {(() => {
     const currentColor = getContactColor(selectedContact.color);
     return (
      <div className="mt-4 bg-[#030305] p-3 rounded-2xl border border-white/5 space-y-2.5 text-left w-full">
      <div className="flex justify-between items-center">
       <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold text-[#7e7e8e]">Color / Etiqueta:</span>
       <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase ${
       currentColor === 'indigo' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
       currentColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
       currentColor === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
       currentColor === 'rose' ? 'bg-rose-500/10 text-rose-455 border-rose-500/20' :
       'bg-violet-500/10 text-violet-400 border-violet-500/20'
       }`}>
       {currentColor === 'rose' ? 'ROJO' : currentColor}
       </span>
      </div>
      
      <div className="grid grid-cols-5 gap-1.5">
       {AESTHETIC_COLORS.map(({ val, label, activeStyle }) => {
       const isCurrent = currentColor === val;
       return (
        <button
        key={val}
        type="button"
        onClick={() => {
         if (onUpdateContact) {
         onUpdateContact({
          ...selectedContact,
          color: val
         });
         }
        }}
        className={`py-1.5 px-0.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
         isCurrent ?
          activeStyle
         : 'bg-slate-900/40 border-white/5 text-slate-450 hover:text-slate-200'
        }`}
        title={label}
        >
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: val === 'indigo' ? '#6366f1' : val === 'emerald' ? '#10b981' : val === 'amber' ? '#f59e0b' : val === 'rose' ? '#f43f5e' : '#8b5cf6' }} />
        </button>
       );
       })}
      </div>

      {/* Agendar Cita Presencial Action Button */}
      <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
       <button
       type="button"
       onClick={() => handleOpenScheduleMeeting(selectedContact)}
       className="w-full py-2 px-3.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 text-violet-350 hover:text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(139,92,246,0.05)]"
       >
       <Calendar className="w-3.5 h-3.5 text-violet-400" />
       <span>Agendar Cita Presencial</span>
       </button>
      </div>
      </div>
     );
     })()}
    </div>
    </div>

    {/* Stripe Recurring Payments Auto-billing Engine */}
    <div className="bg-[#030305] p-4 rounded-2xl border border-white/5 space-y-3.5 text-left w-full shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
    <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
     <CreditCard className="w-4 h-4 text-violet-400" />
     <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#7e7e8e]">Stripe del cliente</span>
    </div>

    {(() => {
     const visibleCheckoutUrl = generatedCheckoutUrl || instGeneratedUrl || selectedPaymentSummary.checkoutUrl;
     const visibleCheckoutTransaction = selectedPaymentSummary.checkoutTransaction;
     const visibleCheckoutState = visibleCheckoutTransaction ? checkoutSessionState[visibleCheckoutTransaction.id] : undefined;
     const visibleCheckoutExpired = visibleCheckoutState?.status === 'expired' && visibleCheckoutState.paymentStatus !== 'paid';
     const visibleCheckoutPaid = visibleCheckoutState?.paymentStatus === 'paid';
     const stripeDashboardUrl = getStripeDashboardUrl(selectedPaymentSummary.checkoutSessionId, selectedPaymentSummary.stripeInvoiceId);
     const hasPaymentInfo = selectedPaymentSummary.totalCount > 0;
     const isSubscribedOrLinked = selectedContact.stripeSubscriptionStatus === 'active' || !!visibleCheckoutUrl || selectedPaymentSummary.paidCount > 0;

     return (
     <div className="bg-slate-950/45 p-3 rounded-xl border border-white/5 space-y-2">
      <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-slate-400">Estado:</span>
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${
       visibleCheckoutExpired ?
        'bg-amber-500/10 text-amber-400 border-amber-500/25'
       : isSubscribedOrLinked ?
        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        : 'bg-slate-855 text-slate-400 border-slate-700'
      }`}>
       {visibleCheckoutExpired ? 'Link caducado'
       : visibleCheckoutPaid ? 'Pagado'
       : selectedContact.stripeSubscriptionStatus === 'active' ? 'Activo'
       : visibleCheckoutUrl
        ? 'Link generado'
        : selectedPaymentSummary.paidCount > 0 ?
        'Pagos recibidos'
        : 'Sin suscribir'}
      </span>
      </div>

      {hasPaymentInfo && (
      <div className="grid grid-cols-3 gap-1.5 text-center">
       <div className="bg-black/20 rounded-lg p-2 border border-white/5">
       <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-mono">Total</span>
       <span className="block text-[11px] font-black text-slate-200">{selectedPaymentSummary.total.toFixed(2)} €</span>
       </div>
       <div className="bg-black/20 rounded-lg p-2 border border-emerald-500/10">
       <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-mono">Pagado</span>
       <span className="block text-[11px] font-black text-emerald-400">{selectedPaymentSummary.paid.toFixed(2)} €</span>
       </div>
       <div className="bg-black/20 rounded-lg p-2 border border-amber-500/10">
       <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-mono">Pendiente</span>
       <span className="block text-[11px] font-black text-amber-400">{selectedPaymentSummary.pending.toFixed(2)} €</span>
       </div>
      </div>
      )}

      {hasPaymentInfo && (
      <div className="flex justify-between text-[10px] text-slate-500">
       <span>Cuotas:</span>
       <span className="font-mono text-slate-300">
       {selectedPaymentSummary.paidCount} liquidadas / {selectedPaymentSummary.pendingCount} pendientes
       </span>
      </div>
      )}

      {visibleCheckoutUrl && (
      <div className="space-y-1.5 border-t border-white/5 pt-2">
       <span className={`text-[8px] font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 ${visibleCheckoutExpired ? 'text-amber-400' : 'text-emerald-400'}`}>
       {visibleCheckoutExpired ? <Clock3 className="w-3 h-3" /> : <Check className="w-3 h-3" />}
       {visibleCheckoutExpired ? 'Link de pago caducado' : 'Link de pago guardado'}
       </span>
       {visibleCheckoutExpired && (
       <p className="text-[9px] text-slate-400 leading-snug">Stripe ha confirmado que no fue pagado. Puedes renovarlo sin crear otro concepto ni otro movimiento.</p>
       )}
       <div className="flex gap-1.5">
       {!visibleCheckoutExpired && !visibleCheckoutPaid && (
       <>
       <button
        type="button"
        onClick={() => {
        navigator.clipboard.writeText(visibleCheckoutUrl);
        setStripeCopied(true);
        setTimeout(() => setStripeCopied(false), 2000);
        }}
        className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] rounded-lg text-slate-300 font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
       >
        {stripeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
        <span>{stripeCopied ? 'Copiado' : 'Copiar link'}</span>
       </button>
       <a
        href={visibleCheckoutUrl}
        target="_blank"
        rel="noreferrer"
        className="flex-1 py-1.5 px-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-[10px] rounded-lg text-violet-300 font-semibold flex items-center justify-center gap-1 transition-all text-center"
       >
        <ExternalLink className="w-3 h-3" />
       <span>Abrir link</span>
       </a>
       </>
       )}
       {visibleCheckoutPaid && (
       <span className="w-full py-1.5 px-2 bg-emerald-500/10 border border-emerald-500/20 text-[10px] rounded-lg text-emerald-300 font-semibold text-center">
        Pago confirmado por Stripe
       </span>
       )}
       {visibleCheckoutExpired && visibleCheckoutTransaction && (
       <button
        type="button"
        disabled={txStripeLoading[visibleCheckoutTransaction.id]}
        onClick={() => handleGenerateStripeForTx(visibleCheckoutTransaction)}
        className="w-full py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[10px] rounded-lg text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
       >
        <RefreshCw className={`w-3 h-3 ${txStripeLoading[visibleCheckoutTransaction.id] ? 'animate-spin' : ''}`} />
        <span>Regenerar este enlace</span>
       </button>
       )}
       </div>
       {visibleCheckoutTransaction && txStripeError[visibleCheckoutTransaction.id] && (
       <p className="text-[9px] text-rose-400 bg-rose-500/5 border border-rose-500/15 rounded-lg px-2 py-1.5">{txStripeError[visibleCheckoutTransaction.id]}</p>
       )}
      </div>
      )}

      {stripeDashboardUrl && (
      <a
       href={stripeDashboardUrl}
       target="_blank"
       rel="noreferrer"
       className="w-full py-1.5 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-[10px] rounded-lg text-indigo-300 font-semibold flex items-center justify-center gap-1 transition-all text-center"
      >
       <ExternalLink className="w-3 h-3" />
       <span>Ver cobro en Stripe</span>
      </a>
      )}

      <button
      type="button"
      onClick={() => {
       void handleLoadStripeOverview();
       if (visibleCheckoutTransaction?.stripeCheckoutSessionId) void inspectCheckoutSession(visibleCheckoutTransaction);
      }}
      disabled={stripeOverviewLoading}
      className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 border border-white/5 text-[10px] rounded-lg text-slate-300 font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
      >
      {stripeOverviewLoading ? (
       <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
      ) : (
       <CreditCard className="w-3 h-3" />
      )}
      <span>{stripeOverviewLoading ? 'Consultando Stripe...' : 'Actualizar info de Stripe'}</span>
      </button>

      {stripeOverviewError && (
      <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9px] text-rose-400 leading-normal">
       {stripeOverviewError}
      </div>
      )}

      {stripeOverview && (
      <div className="space-y-2 border-t border-white/5 pt-2">
       <div className="flex items-center justify-between text-[9px] text-slate-500">
       <span>Cliente Stripe</span>
       {stripeOverview.customer?.dashboardUrl && (
        <a href={stripeOverview.customer.dashboardUrl} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200">
        Abrir cliente
        </a>
       )}
       </div>

       <div className="grid grid-cols-3 gap-1.5 text-center">
       <div className="bg-black/20 rounded-lg p-2 border border-white/5">
        <span className="block text-[7px] uppercase tracking-widest text-slate-500 font-mono">Facturas</span>
        <span className="block text-[10px] font-black text-slate-200">{stripeOverview.invoices?.length || 0}</span>
       </div>
       <div className="bg-black/20 rounded-lg p-2 border border-emerald-500/10">
        <span className="block text-[7px] uppercase tracking-widest text-slate-500 font-mono">Cobrado</span>
        <span className="block text-[10px] font-black text-emerald-400">{(stripeOverview.totals?.paidInvoices || 0).toFixed(2)} €</span>
       </div>
       <div className="bg-black/20 rounded-lg p-2 border border-amber-500/10">
        <span className="block text-[7px] uppercase tracking-widest text-slate-500 font-mono">Abierto</span>
        <span className="block text-[10px] font-black text-amber-400">{(stripeOverview.totals?.openInvoices || 0).toFixed(2)} €</span>
       </div>
       </div>

       {(stripeOverview.subscriptions || []).slice(0, 2).map((sub: any) => (
       <div key={sub.id} className="bg-black/20 rounded-lg p-2 border border-white/5 space-y-1">
        <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] text-slate-300 font-bold truncate">{sub.id}</span>
        <span className={`text-[8px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${
         sub.status === 'active' ?
         'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
         : sub.status === 'canceled' ?
          'bg-rose-500/10 text-rose-400 border-rose-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
         {sub.cancelAtPeriodEnd ? 'Cancela al final' : sub.status}
        </span>
        </div>
        <div className="flex justify-between text-[9px] text-slate-500">
         <span>{sub.amount !== null ? `${sub.amount.toFixed(2)} € / ${sub.interval || 'periodo'}` : 'Importe no disponible'}</span>
        {sub.dashboardUrl && (
         <a href={sub.dashboardUrl} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200">
         Ver
         </a>
        )}
        </div>
       </div>
       ))}

       {(stripeOverview.invoices || []).slice(0, 3).map((invoice: any) => (
       <div key={invoice.id} className="flex items-center justify-between gap-2 bg-black/20 rounded-lg p-2 border border-white/5">
        <div className="min-w-0">
        <p className="text-[9px] text-slate-300 font-bold truncate">{invoice.number || invoice.id}</p>
        <p className="text-[8px] text-slate-500">{invoice.status} {invoice.amountPaid.toFixed(2)} pagado</p>
        </div>
        <div className="flex items-center gap-1">
        {invoice.hostedInvoiceUrl && (
         <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-[8px] text-emerald-300 hover:text-emerald-200">
         Factura
         </a>
        )}
        {invoice.dashboardUrl && (
         <a href={invoice.dashboardUrl} target="_blank" rel="noreferrer" className="text-[8px] text-indigo-300 hover:text-indigo-200">
         Stripe
         </a>
        )}
        </div>
       </div>
       ))}
      </div>
      )}
     </div>
     );
    })()}

    {selectedContact.stripeSubscriptionStatus === 'active' && (
     <div className="space-y-3">
     <div className="bg-slate-950/45 p-3 rounded-xl border border-white/5 space-y-1.5">
      <div className="flex justify-between text-xs">
      <span className="text-slate-500 text-[10px]">Cuota mensual:</span>
      <span className="font-extrabold text-slate-200">{selectedContact.stripeSubscriptionPrice || '0'} €</span>
      </div>
      <div className="flex justify-between text-xs">
      <span className="text-slate-500 text-[10px]">Intervalo:</span>
      <span className="font-medium text-slate-300">
       {selectedContact.stripeSubscriptionInterval === 'year' ? 'Anual' : 'Mensual'}
      </span>
      </div>
      {selectedContact.stripeCustomerId && (
      <div className="flex justify-between text-[10px] text-slate-500">
       <span>ID Cliente:</span>
       <span className="font-mono text-[9px] truncate max-w-[120px]" title={selectedContact.stripeCustomerId}>
       {selectedContact.stripeCustomerId}
       </span>
      </div>
      )}
     </div>

     <button
      type="button"
      disabled={stripeLoading}
      onClick={() => handleOpenStripePortal(selectedContact.stripeCustomerId!)}
      className="w-full py-2 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-300 hover:text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
     >
      {stripeLoading ? (
      <span className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      ) : (
      <ExternalLink className="w-3.5 h-3.5" />
      )}
      <span>Portal de Facturación</span>
     </button>
     </div>
    )}

    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#080b12] to-[#030407] p-3.5 shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
     <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
       <span className="grid h-7 w-7 place-items-center rounded-lg border border-violet-400/20 bg-violet-500/10 text-violet-300">
        <CreditCard className="h-3.5 w-3.5" />
       </span>
       <div>
        <h4 className="text-[11px] font-bold text-slate-100">Nuevo cobro</h4>
        <p className="text-[8px] text-slate-500">Modalidad y forma de pago</p>
       </div>
      </div>
      <span className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-slate-400">
       {chargePaymentMethod === 'stripe' ? 'Genera enlace' : 'Registro directo'}
      </span>
     </div>

     <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Modalidad del cobro">
      {CLIENT_CHARGE_PLAN_OPTIONS.map(option => (
       <button
        key={option.value}
        type="button"
        onClick={() => {
         setChargePlan(option.value);
         setGeneratedCheckoutUrl('');
         setStripeError('');
         setChargeSuccess('');
        }}
        className={`min-h-8 rounded-lg border px-1.5 py-1 text-[8.5px] font-bold transition ${chargePlan === option.value
         ? 'border-violet-400/35 bg-violet-500/15 text-violet-200 shadow-[inset_0_0_12px_rgba(139,92,246,0.06)]'
         : 'border-white/[0.06] bg-black/20 text-slate-500 hover:border-white/10 hover:text-slate-300'}`}
       >
        {option.label}
       </button>
      ))}
     </div>

     <div className="mt-2.5 grid grid-cols-3 gap-1.5" role="group" aria-label="Forma de pago">
      {CLIENT_CHARGE_METHOD_OPTIONS.map(option => (
       <button
        key={option.value}
        type="button"
        onClick={() => {
         setChargePaymentMethod(option.value);
         setGeneratedCheckoutUrl('');
         setStripeError('');
         setChargeSuccess('');
        }}
        className={`rounded-lg border px-2 py-1.5 text-[8.5px] font-semibold transition ${chargePaymentMethod === option.value
         ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
         : 'border-white/[0.06] bg-black/20 text-slate-500 hover:text-slate-300'}`}
       >
        {option.label}
       </button>
      ))}
     </div>

     <div className="mt-3 grid grid-cols-[1fr_92px] gap-2">
      <input
       type="text"
       value={stripeConcept}
       onChange={(event) => {
        setStripeConcept(event.target.value);
        setGeneratedCheckoutUrl('');
        setChargeSuccess('');
       }}
       maxLength={180}
       aria-label="Concepto del cobro"
       className="min-w-0 rounded-lg border border-white/[0.07] bg-black/25 px-2.5 py-2 text-[10px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-400/45"
       placeholder="Concepto"
      />
      <div className="relative">
       <input
        type="number"
        min="0.01"
        step="0.01"
        value={stripeAmount}
        onChange={(event) => {
         setStripeAmount(event.target.value);
         setGeneratedCheckoutUrl('');
         setChargeSuccess('');
        }}
        aria-label="Importe en euros"
        className="w-full rounded-lg border border-white/[0.07] bg-black/25 py-2 pl-2.5 pr-6 text-[10px] font-semibold text-slate-100 outline-none transition focus:border-violet-400/45"
        placeholder="0,00"
       />
       <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">€</span>
      </div>
     </div>

     {chargePaymentMethod === 'stripe' ? (
      <div className="mt-2">
       <input
        type="email"
        value={stripeEmailInput}
        onChange={(event) => setStripeEmailInput(event.target.value)}
        aria-label="Email del cliente para Stripe"
        className="w-full rounded-lg border border-white/[0.07] bg-black/25 px-2.5 py-2 text-[10px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-400/45"
        placeholder="Email del cliente para Stripe"
       />
      </div>
     ) : null}

     {chargePlan.startsWith('installments_') ? (
      <div className="mt-2 flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.025] px-2.5 py-2 text-[8.5px] text-slate-500">
       <span>{chargePlan.replace('installments_', '')} cuotas mensuales</span>
       <strong className="font-mono text-slate-300">
        {(Number(stripeAmount || 0) / Number(chargePlan.replace('installments_', ''))).toFixed(2)} € / cuota
       </strong>
      </div>
     ) : null}

     {stripeError ? (
      <p className="mt-2 rounded-lg border border-rose-500/15 bg-rose-500/[0.06] px-2.5 py-2 text-[9px] text-rose-300">{stripeError}</p>
     ) : null}
     {chargeSuccess ? (
      <p className="mt-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-2 text-[9px] text-emerald-300">{chargeSuccess}</p>
     ) : null}

     {generatedCheckoutUrl && chargePaymentMethod === 'stripe' ? (
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5">
       <button
        type="button"
        onClick={() => {
         navigator.clipboard.writeText(generatedCheckoutUrl);
         setStripeCopied(true);
         setTimeout(() => setStripeCopied(false), 2000);
        }}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-[9px] font-semibold text-slate-300 hover:bg-white/[0.07]"
       >
        {stripeCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        {stripeCopied ? 'Copiado' : 'Copiar enlace'}
       </button>
       <a
        href={generatedCheckoutUrl}
        target="_blank"
        rel="noreferrer"
        className="grid h-8 w-9 place-items-center rounded-lg border border-violet-400/20 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
        title="Abrir enlace de Stripe"
       >
        <ExternalLink className="h-3.5 w-3.5" />
       </a>
      </div>
     ) : (
      <button
       type="button"
       disabled={stripeLoading || !stripeConcept.trim() || !stripeAmount.trim() || (chargePaymentMethod === 'stripe' && !stripeEmailInput.trim())}
       onClick={() => handleCreateClientCharge(selectedContact)}
       className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 px-3 py-2 text-[9.5px] font-extrabold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
       {stripeLoading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" /> : <Plus className="h-3 w-3" />}
       {stripeLoading ? 'Procesando…' : chargePaymentMethod === 'stripe' ? 'Generar cobro' : 'Registrar cobro'}
      </button>
     )}
    </div>

     <div className="hidden">
     <div className="pt-3 border-t border-white/5">
      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-violet-300">Crear nuevo cobro</span>
     </div>
     <p className="text-[10px] text-slate-400 leading-normal">
      Elige un pago único o una membresía recurrente. El movimiento quedará vinculado a este cliente desde que se genere el enlace.
     </p>

     <div>
      <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex justify-between">
      <span>Email del Cliente</span>
      {!selectedContact.email && <span className="text-amber-400 font-bold font-sans text-[7.5px] uppercase">Falta en perfil</span>}
      </label>
      <input
      type="email"
      value={stripeEmailInput}
      onChange={(e) => setStripeEmailInput(e.target.value)}
      className="w-full bg-[#07070b] border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition font-sans"
      placeholder="ejemplo@correo.com"
      />
     </div>

     <div>
      <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1">Concepto del cobro</label>
      <input
       type="text"
       value={stripeConcept}
       onChange={(e) => {
        setStripeConcept(e.target.value);
        setGeneratedCheckoutUrl('');
       }}
       maxLength={180}
       className="w-full bg-[#07070b] border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition"
       placeholder="Ej. Gestión mensual de redes sociales"
      />
     </div>

     <div className="grid grid-cols-2 gap-2">
      <div>
      <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1">Importe (€)</label>
      <input
       type="number"
       value={stripeAmount}
       onChange={(e) => {
        setStripeAmount(e.target.value);
        setGeneratedCheckoutUrl('');
       }}
       className="w-full bg-[#07070b] border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition"
       placeholder="50"
      />
      </div>
      <div>
      <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1">Frecuencia</label>
      <select
       value={stripeInterval}
       onChange={(e) => {
        setStripeInterval(e.target.value as 'month' | 'year' | 'once');
        setGeneratedCheckoutUrl('');
       }}
       className="w-full bg-[#07070b] border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none transition"
      >
       <option value="once">Pago único</option>
       <option value="month">Membresía mensual</option>
       <option value="year">Membresía anual</option>
      </select>
      </div>
     </div>

     {stripeError && (
      <p className="text-[9px] text-rose-450 leading-tight bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 text-rose-400">
      {stripeError}
      </p>
     )}

     {!generatedCheckoutUrl ? (
      <button
      type="button"
      disabled={stripeLoading || !stripeEmailInput.trim()}
      onClick={() => handleCreateStripeCheckout(selectedContact)}
      className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_2px_12px_rgba(139,92,246,0.15)]"
      >
      {stripeLoading ? (
       <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
       <CreditCard className="w-3.5 h-3.5" />
      )}
      <span>{stripeLoading ? 'Generando...' : (stripeInterval === 'once' ? 'Generar Enlace de Pago único' : 'Generar Enlace de Suscripción')}</span>
      </button>
     ) : (
      <div className="space-y-2 bg-[#040408] p-2.5 rounded-xl border border-white/5">
      <span className="block text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wide">Enlace de Pago Listo!</span>
      <span className="block text-[9px] text-slate-400 leading-snug">
       {stripeInterval === 'once' ?
        'Envía este enlace seguro al cliente para cobrar de forma segura e inmediata:'
        : 'Envía este enlace seguro al cliente para domiciliar su cobro automático:'}
      </span>
      
      <div className="flex gap-1.5 mt-1">
       <button
       type="button"
       onClick={() => {
        navigator.clipboard.writeText(generatedCheckoutUrl);
        setStripeCopied(true);
        setTimeout(() => setStripeCopied(false), 2000);
       }}
       className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] rounded-lg text-slate-300 font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
       >
       {stripeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
       <span>{stripeCopied ? 'Copiado' : 'Copiar'}</span>
       </button>
       
       <a
       href={generatedCheckoutUrl}
       target="_blank"
       rel="noreferrer"
       className="flex-1 py-1.5 px-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-[10px] rounded-lg text-violet-300 font-semibold flex items-center justify-center gap-1 transition-all text-center"
       >
       <ExternalLink className="w-3 h-3" />
       <span>Abrir</span>
       </a>
      </div>
      <button
       type="button"
       onClick={() => {
        setGeneratedCheckoutUrl('');
        setGeneratedCheckoutSessionId('');
        setStripeError('');
       }}
       className="w-full py-1.5 px-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-[9px] rounded-lg text-slate-400 hover:text-slate-200 transition"
      >
       Crear otro cobro
      </button>
      </div>
     )}
     </div>
    </div>

    {/* Legacy installment form retained only for state compatibility while the unified creator is active. */}
    <div className="hidden">
    <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
     <CreditCard className="w-4 h-4 text-emerald-400" />
     <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#7e7e8e]">Crear cobro en plazos</span>
    </div>

    <div className="space-y-3">
     <p className="text-[10px] text-slate-400 leading-normal">
     Configura un pago financiado en 2 o 3 plazos automáticos. El cliente pagará la primera cuota hoy y los pagos restantes se cobrarán de su tarjeta automáticamente cada mes.
     </p>

     <div>
     <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1">
      Importe total del nuevo cobro (EUR)
     </label>
     <input
      type="number"
      value={instTotalAmount}
      onChange={(e) => {
      setInstTotalAmount(e.target.value);
      setInstGeneratedUrl('');
      }}
      className="w-full bg-[#07070b] border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition"
      placeholder="Ej. 1.200"
     />
     </div>

     <div>
     <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
      Número de Plazos
     </label>
     <div className="grid grid-cols-2 gap-2">
      <button
      type="button"
      onClick={() => {
       setInstCount(2);
       setInstGeneratedUrl('');
      }}
      className={`py-1.5 text-[10px] font-mono font-bold rounded-lg border transition ${
       instCount === 2 ?
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.05)]'
        : 'bg-[#07070b] text-slate-400 border-white/5 hover:border-white/10'
      }`}
      >
      2 Plazos (50% / 50%)
      </button>
      <button
      type="button"
      onClick={() => {
       setInstCount(3);
       setInstGeneratedUrl('');
      }}
      className={`py-1.5 text-[10px] font-mono font-bold rounded-lg border transition ${
       instCount === 3 ?
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.05)]'
        : 'bg-[#07070b] text-slate-400 border-white/5 hover:border-white/10'
      }`}
      >
      3 Plazos (33.3% x 3)
      </button>
     </div>
     </div>

     <div>
     <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1 font-sans">
      Concepto del Cobro
     </label>
     <input
      type="text"
      value={instConcept}
      onChange={(e) => {
      setInstConcept(e.target.value);
      setInstGeneratedUrl('');
      }}
      className="w-full bg-[#07070b] border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition font-sans"
      placeholder="Proyecto Desarrollo Web Althera"
     />
     </div>

     {/* Detalle de Cuotas */}
     {(() => {
     const total = parseFloat(instTotalAmount) || 0;
     const cuota = total > 0 ? (total / instCount).toFixed(2) : '0.00';
     return (
      <div className="bg-[#050508] p-2.5 rounded-xl border border-white/5 space-y-1 font-mono text-[9px] text-slate-400 leading-relaxed">
      <span className="block text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-0.5 font-sans">Plan de Cobros Planificado:</span>
      <div className="flex justify-between border-b border-white/5 pb-1">
       <span> Cuota por Plazo:</span>
       <span className="text-emerald-450 font-extrabold">{cuota} / mes</span>
      </div>
      <div className="flex justify-between pt-0.5">
       <span>1 Pago (Hoy):</span>
       <span className="text-slate-300 font-bold">{cuota} <span className="text-slate-500 text-[8px] font-sans font-normal">(Pendiente hasta pago)</span></span>
      </div>
      <div className="flex justify-between">
       <span>2 Pago (+30 días):</span>
       <span className="text-slate-300 font-bold">{cuota} <span className="text-slate-500 text-[8px] font-sans font-normal">(Pendiente hasta pago)</span></span>
      </div>
      {instCount === 3 && (
       <div className="flex justify-between">
       <span>3 Pago (+60 días):</span>
       <span className="text-slate-300 font-bold">{cuota} <span className="text-slate-500 text-[8px] font-sans font-normal">(Pendiente hasta pago)</span></span>
       </div>
      )}
      </div>
     );
     })()}

     {instError && (
     <p className="text-[9px] text-rose-400 leading-tight bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
      {instError}
     </p>
     )}

     {!instGeneratedUrl ? (
     <button
      type="button"
      disabled={instLoading || !instTotalAmount.trim()}
      onClick={() => handleCreateInstallmentStripeCheckout(selectedContact)}
      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_2px_12px_rgba(16,185,129,0.15)]"
     >
      {instLoading ? (
      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
      <CreditCard className="w-3.5 h-3.5" />
      )}
      <span>{instLoading ? 'Generando...' : 'Generar Suscripción de Plazos'}</span>
     </button>
     ) : (
     <div className="space-y-2 bg-[#040408] p-2.5 rounded-xl border border-white/5">
      <span className="block text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wide">Suscripción de Plazos Lista!</span>
      <p className="text-[9px] text-slate-400 leading-snug">
      Comparte este enlace con el cliente para que configure los pagos automáticos. Al pagar el 1 plazo, las cuotas restantes se cobrarán de forma automática:
      </p>
      
      <div className="flex gap-1.5 mt-1">
      <button
       type="button"
       onClick={() => {
       navigator.clipboard.writeText(instGeneratedUrl);
       setInstCopied(true);
       setTimeout(() => setInstCopied(false), 2000);
       }}
       className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] rounded-lg text-slate-300 font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
      >
       {instCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
       <span>{instCopied ? 'Copiado' : 'Copiar'}</span>
      </button>
      
      <a
       href={instGeneratedUrl}
       target="_blank"
       rel="noreferrer"
       className="flex-1 py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-[10px] rounded-lg text-emerald-300 font-semibold flex items-center justify-center gap-1 transition-all text-center"
      >
       <ExternalLink className="w-3 h-3" />
       <span>Abrir</span>
      </a>
      </div>
      <button
       type="button"
       onClick={() => {
        setInstGeneratedUrl('');
        setInstError('');
       }}
       className="w-full py-1.5 px-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-[9px] rounded-lg text-slate-400 hover:text-slate-200 transition"
      >
       Crear otro cobro en plazos
      </button>
     </div>
     )}
    </div>
    </div>

    {/* Action Buttons Icons Row - REMOVED Chat button as requested */}
    <div className="grid grid-cols-2 gap-3">
    <a 
     href={`mailto:${selectedContact.email}`}
     className="flex flex-col items-center gap-1 py-3 hover:bg-white/10 rounded-xl bg-white/5 border border-white/5 transition group text-center cursor-pointer"
    >
     <Mail className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
     <span className="text-[9px] font-mono text-slate-500">Email Contact</span>
    </a>
    <a 
     href={selectedContact.phone ? `tel:${selectedContact.phone}` : '#'}
     onClick={(e) => {
     if (!selectedContact.phone) {
      e.preventDefault();
      alert("No se ha registrado ningún teléfono para este cliente.");
     }
     }}
     className="flex flex-col items-center gap-1 py-3 hover:bg-white/10 rounded-xl bg-white/5 border border-white/5 transition group text-center cursor-pointer"
    >
     <Phone className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
     <span className="text-[9px] font-mono text-slate-500">{selectedContact.phone ? 'Call Contact' : 'No Phone'}</span>
    </a>
    </div>

    {/* Basic Contact Info Section with detailed dynamic values */}
    <div className="space-y-2 border-b border-white/5 pb-4">
    <h4 className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">Contact Info</h4>
    <div className="bg-slate-950/40 p-4 rounded-xl space-y-3 border border-white/5">
     <div className="flex items-center gap-3">
     <MapPin className="text-slate-500 w-4 h-4 flex-shrink-0" />
     <span className="text-xs text-slate-300">{selectedContact.location || 'Not Specified'}</span>
     </div>
     {(selectedContact.taxId || selectedContact.fiscalAddress || selectedContact.currency || selectedContact.language || selectedContact.taxPercentage !== undefined) && (
     <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-2.5 text-[10px] text-slate-300">
      <span className="block font-mono text-[8px] uppercase tracking-wider text-emerald-400">Datos fiscales</span>
      {selectedContact.taxId && <span className="mt-1 block">CIF/NIF/ID: {selectedContact.taxId}</span>}
      {selectedContact.fiscalAddress && <span className="block">{selectedContact.fiscalAddress}</span>}
      <span className="mt-1 block text-slate-400">
       {selectedContact.currency || 'EUR'} · {selectedContact.language === 'en' ? 'English' : 'Español'} · Impuesto {selectedContact.taxPercentage ?? 21}%
      </span>
     </div>
     )}
     <div className="flex items-center gap-3">
     <Mail className="text-slate-500 w-4 h-4 flex-shrink-0" />
     <span className="text-xs text-slate-300 truncate select-all">{selectedContact.email}</span>
     </div>
     {selectedContact.phone && (
     <div className="flex items-center gap-3">
      <Phone className="text-slate-500 w-4 h-4 flex-shrink-0" />
      <span className="text-xs text-slate-300 truncate select-all">{selectedContact.phone}</span>
     </div>
     )}
     {selectedContact.linkedin && (
     <div className="flex items-center gap-3">
      <LinkIcon className="text-slate-500 w-4 h-4 flex-shrink-0" />
      <a 
      href={selectedContact.linkedin.startsWith('http') ? selectedContact.linkedin : `https://linkedin.com/in/${selectedContact.linkedin}`}
      target="_blank" 
      rel="noreferrer" 
      className="text-xs text-blue-400 hover:underline truncate"
      >
      LinkedIn: {selectedContact.linkedin.replace('https://', '').replace('www.linkedin.com/in/', '')}
      </a>
     </div>
     )}
     <div className="flex items-center gap-3">
     <Calendar className="text-slate-500 w-4 h-4 flex-shrink-0" />
     <span className="text-xs text-slate-300 font-sans">Added: {selectedContact.addedDate || 'May 21, 2026'}</span>
     </div>
    </div>
    </div>

    {/* Módulo de Contabilidad y Facturas de Cliente */}
    {(() => {
    const clientInvoices = invoices.filter(inv => invoiceBelongsToContact(inv, selectedContact));
    const clientTransactions = transactions.filter(t => t.type === 'income' && !t.isRecurring && transactionBelongsToContact(t, selectedContact, clientInvoices));

    const getInvoicePaymentSummary = (invoice: Invoice) => {
     const invoiceTotal = Number(invoice.total || 0);
     if (invoice.status === 'paid') {
      return { paid: invoiceTotal, pending: 0, state: 'paid' as const };
     }
     const invoiceItemTransactionIds = new Set(
      invoice.items.flatMap(item => [item.pendingTxId, item.id]).filter((id): id is string => Boolean(id))
     );
     const linkedTransactions = clientTransactions.filter(
      tx => tx.invoiceId === invoice.id || invoiceItemTransactionIds.has(tx.id)
     );
     let paidAmount = linkedTransactions
      .filter(tx => tx.status === 'paid')
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

     if (linkedTransactions.length === 0 && invoice.items.length > 0) {
      const itemTotal = invoice.items.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const collectedItemTotal = invoice.items
       .filter(item => item.isPending === false)
       .reduce((sum, item) => sum + Number(item.total || 0), 0);
      paidAmount = itemTotal > 0 ? invoiceTotal * (collectedItemTotal / itemTotal) : 0;
     }

     const paid = Math.min(invoiceTotal, Math.max(0, paidAmount));
     const pending = Math.max(0, invoiceTotal - paid);
     const state = pending <= 0.005 ? 'paid' as const : paid > 0.005 ? 'partial' as const : 'pending' as const;
     return { paid, pending, state };
    };

    const totalPaidFromInvoices = clientInvoices.reduce((sum, inv) => sum + getInvoicePaymentSummary(inv).paid, 0);
    const totalPendingFromInvoices = clientInvoices.reduce((sum, inv) => sum + getInvoicePaymentSummary(inv).pending, 0);
    const totalInvoicedFromInvoices = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);

    const totalPaidFromTxs = clientTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const totalPendingFromTxs = clientTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);

    const totalPaid = clientInvoices.length > 0 ? totalPaidFromInvoices : totalPaidFromTxs;
    const totalPending = clientInvoices.length > 0 ? totalPendingFromInvoices : totalPendingFromTxs;
    const totalInvoiced = clientInvoices.length > 0 ? totalInvoicedFromInvoices : (totalPaid + totalPending);

    return (
     <div className="space-y-4 bg-slate-950/35 border border-white/[0.08] rounded-2xl p-4 shadow-[0_14px_35px_rgba(0,0,0,.16)]">
     <div className="flex justify-between items-center">
      <div>
       <h4 className="text-[11px] uppercase tracking-[0.16em] text-slate-100 font-extrabold flex items-center gap-2">
       <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Receipt className="w-3.5 h-3.5 text-emerald-400" /></span>
       <span>Área financiera</span>
       </h4>
       <p className="text-[9px] text-slate-500 mt-1 ml-9">Facturación y cobros vinculados exclusivamente a este cliente</p>
      </div>
      <button
      onClick={() => {
       setInvoicePrefill({
       id: selectedContact.id,
       name: selectedContact.name,
       email: selectedContact.email,
       taxId: selectedContact.taxId || '',
       address: selectedContact.fiscalAddress || selectedContact.location || '',
       currency: selectedContact.currency || 'EUR',
       language: selectedContact.language || 'es',
       taxPercentage: selectedContact.taxPercentage ?? 21
       });
       if (onNavigate) {
       onNavigate('finanzas', 'push');
       }
      }}
      className="text-[9px] font-bold text-emerald-300 hover:text-white border border-emerald-500/30 hover:border-emerald-400/60 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap"
      >
      + Nueva Factura
      </button>
     </div>

     <div className="grid grid-cols-3 gap-2.5">
      <div className="text-left p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">
      <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">Facturado</span>
      <span className="text-xs font-mono font-extrabold text-slate-200 block mt-0.5">
       {totalInvoiced.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
      </span>
      </div>
      <div className="text-left p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
      <span className="block text-[8px] font-mono text-emerald-500 uppercase tracking-wider">Cobrado</span>
      <span className="text-xs font-mono font-extrabold text-emerald-400 block mt-0.5">
       {totalPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
      </span>
      </div>
      <div className="text-left p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
      <span className="block text-[8px] font-mono text-amber-500 uppercase tracking-wider">Pendiente</span>
      <span className="text-xs font-mono font-extrabold text-amber-400 block mt-0.5">
       {totalPending.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
      </span>
      </div>
     </div>

     <div className="space-y-2.5 pt-1 border-t border-white/[0.06]">
      <div className="flex items-center justify-between pt-3">
       <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Facturas emitidas</span>
       <span className="text-[9px] font-mono text-slate-400 bg-white/5 border border-white/5 rounded-full px-2 py-0.5">{clientInvoices.length}</span>
      </div>
      {clientInvoices.length === 0 ? (
      <div className="bg-[#030305] p-3.5 rounded-xl border border-white/5 text-center">
       <p className="text-[10px] text-slate-500 font-sans">No hay facturas emitidas para este cliente.</p>
      </div>
      ) : (
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
       {clientInvoices.map(inv => {
       const paymentSummary = getInvoicePaymentSummary(inv);
       const isEffectivelyPaid = paymentSummary.state === 'paid';
       return (
       <div key={inv.id} className="bg-[#05070c]/85 p-3 rounded-xl border border-white/[0.07] flex justify-between items-center gap-3 hover:border-emerald-500/20 hover:bg-[#070b12] transition-colors">
        <div className="space-y-0.5">
        <div className="flex items-center gap-2">
         <span className="text-[10px] font-mono font-bold text-slate-200">{inv.id}</span>
         <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-semibold ${
         isEffectivelyPaid
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : paymentSummary.state === 'partial'
           ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
           : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
         }`}>
         {isEffectivelyPaid ? 'COBRADA' : paymentSummary.state === 'partial' ? 'PARCIAL' : 'PENDIENTE'}
         </span>
        </div>
        <div className="text-[9px] font-mono text-slate-500">
         Emisión: {inv.date} | Vence: {inv.dueDate}
        </div>
        </div>
        <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono font-bold text-slate-100 pr-1">{inv.total.toFixed(2)} €</span>
        
        {!isEffectivelyPaid && (
         <button
         onClick={() => handleMarkInvoicePaid(inv)}
         title="Marcar como cobrada"
         className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
         >
         <Check className="w-3.5 h-3.5" />
         </button>
        )}

        <button
         onClick={() => handleEditInvoiceClientFiscal(inv)}
         title="Editar datos fiscales del cliente"
         className="p-1 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20 transition-all cursor-pointer"
        >
         <Edit className="w-3.5 h-3.5" />
        </button>

        <button
         onClick={() => openInvoiceConceptEditor(inv)}
         title="Editar conceptos de la factura"
         className="p-1 hover:bg-violet-500/20 text-violet-300 rounded-lg border border-violet-500/20 transition-all cursor-pointer"
        >
         <Receipt className="w-3.5 h-3.5" />
        </button>

        <button
         onClick={() => handleDownloadInvoiceHtml(inv)}
         title="Imprimir / Descargar Factura"
         className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg border border-white/5 transition-all cursor-pointer"
        >
         <Download className="w-3.5 h-3.5" />
        </button>
        </div>
       </div>
       );
       })}
      </div>
      )}
     </div>

     <div className="space-y-2.5 pt-1 border-t border-white/[0.06]">
      <div className="flex justify-between items-center pt-3">
      <div className="flex items-center gap-2">
       <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Cobros del cliente</span>
       <span className="text-[9px] font-mono text-slate-400 bg-white/5 border border-white/5 rounded-full px-2 py-0.5">{clientTransactions.length}</span>
      </div>
      <button
       onClick={() => {
       setPaymentAmount('');
       setPaymentMethod('transfer');
       setPaymentDate(new Date().toISOString().split('T')[0]);
       setPaymentDesc(`Cobro Cliente: ${selectedContact.name}`);
       setShowAddPaymentModal(true);
       }}
       className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition"
      >
       <Plus className="w-2.5 h-2.5" /> Registrar Cobro
      </button>
      </div>

      {clientTransactions.length === 0 ? (
      <div className="bg-[#030305] p-3.5 rounded-xl border border-white/5 text-center">
       <p className="text-[10px] text-slate-500 font-sans">No hay cobros registrados para este cliente.</p>
      </div>
      ) : (
      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
       {clientTransactions.map(tx => {
       const isPending = tx.status === 'pending';
       const stripeDashboardUrl = getStripeDashboardUrl(tx.stripeCheckoutSessionId, tx.stripeInvoiceId);

       return (
        <div key={tx.id} className="rounded-lg border border-white/[0.06] bg-[#05070c]/80 px-2.5 py-2 transition-all hover:border-violet-400/15 hover:bg-[#080b12]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
         <div className="min-w-0 space-y-1">
         <p className="flex min-w-0 items-center gap-1.5 truncate text-[9.5px] font-semibold text-slate-200">
          {tx.description}
          {isPending && (
          <span className="shrink-0 rounded border border-amber-500/15 bg-amber-500/[0.08] px-1 py-0.5 font-mono text-[6.5px] font-bold uppercase text-amber-400">Pendiente</span>
          )}
         </p>
         <div className="flex items-center gap-1.5 truncate font-mono text-[7.5px] text-slate-600">
          <span><strong className="font-medium text-slate-500">{tx.date}</strong></span>
          <span className="text-slate-700">·</span>
          <span className="uppercase">{tx.paymentMethod || 'transfer'}</span>
          {tx.invoiceId && (
          <span className="text-emerald-500/80 font-semibold">Factura: {tx.invoiceId}</span>
          )}
         </div>
         </div>

         <div className="flex shrink-0 items-center gap-1">
         {/* Amount */}
         <span className={`mr-1 text-[10px] font-mono font-black ${isPending ? 'text-amber-400' : 'text-emerald-400'}`}>
          {isPending ? '' : '+'}{tx.amount.toFixed(2)} €
         </span>

         <button
          type="button"
          onClick={() => handleToggleClientTransactionPaid(tx)}
          className={`grid h-6 w-6 place-items-center rounded-md border transition-all cursor-pointer ${isPending ? 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400 hover:bg-emerald-500/15' : 'border-amber-500/15 bg-amber-500/[0.05] text-amber-400 hover:bg-amber-500/10'}`}
          title={isPending ? 'Marcar cuota como pagada' : 'Volver a marcar como pendiente'}
         >
          <Check className="h-3 w-3" />
         </button>

         <button
          type="button"
          onClick={() => openInvoiceGeneratorForClientPayment(tx)}
          className="grid h-6 w-6 place-items-center rounded-md border border-blue-500/15 bg-blue-500/[0.07] text-blue-400 transition-all hover:bg-blue-500/15 hover:text-blue-300"
          title="Generar factura con este pago y los importes pendientes"
         >
          <Receipt className="h-3 w-3" />
         </button>

         {/* Delete Button */}
         {stripeDashboardUrl && (
          <a
          href={stripeDashboardUrl}
          target="_blank"
          rel="noreferrer"
          className="grid h-6 w-6 place-items-center rounded-md border border-transparent text-indigo-400 transition-all hover:border-indigo-500/15 hover:bg-indigo-500/[0.08]"
          title="Ver pago en Stripe"
          >
          <ExternalLink className="h-3 w-3" />
          </a>
         )}

         <button
          type="button"
          onClick={() => handleDeleteTransaction(tx.id)}
          className="grid h-6 w-6 place-items-center rounded-md border border-transparent text-slate-600 transition-all hover:border-rose-500/15 hover:bg-rose-500/[0.07] hover:text-rose-400"
          title="Eliminar cobro"
         >
          <Trash2 className="h-3 w-3" />
         </button>
         </div>
        </div>

        </div>
       );
       })}
      </div>
      )}
     </div>
     </div>
    );
    })()}

    {/* Comercial & Call Notes Section */}
    <div className="space-y-2 border-b border-white/5 pb-4">
    <h4 className="text-[9px] font-mono uppercase tracking-widest text-[#D4AF37] font-bold">Historial de Prospección</h4>
    <div className="bg-[#030306]/40 p-4 rounded-xl space-y-3.5 border border-white/5">
     <div className="flex justify-between items-center text-xs text-slate-300">
     <span className="text-slate-500 font-medium font-sans">Comercial que le contact?:</span>
     <span className="font-semibold text-white bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded text-[10px]">
      {selectedContact.contactedByComercialName || selectedContact.contactedByComercialEmail || 'No registrado en llamada previa'}
     </span>
     </div>

     {selectedContact.contactedByComercialEmail && (
     <div className="flex justify-between items-center text-xs text-slate-350">
      <span className="text-slate-500 text-[10px] font-mono">Email Comercial:</span>
      <span className="text-[10px] font-mono select-all text-slate-400">{selectedContact.contactedByComercialEmail}</span>
     </div>
     )}

     {selectedContact.originalLeadNotes && (
     <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-white/5">
      <p className="text-[10px] font-mono text-slate-505 uppercase tracking-wider font-semibold">Notas de llamada original:</p>
      <p className="text-xs text-slate-300 font-sans leading-relaxed italic pr-2">
      "{selectedContact.originalLeadNotes}"
      </p>
     </div>
     )}

     {/* General CRM Notes Editable Space */}
     <div className="pt-2 border-t border-white/5 space-y-1.5 text-left">
     <label className="text-[10px] font-semibold font-mono text-slate-400 uppercase tracking-widest block">Notas del Cliente (CRM):</label>
     <textarea
      value={selectedContact.notes || ''}
      onChange={(e) => {
      if (onUpdateContact) {
       onUpdateContact({
       ...selectedContact,
       notes: e.target.value
       });
      }
      }}
      placeholder="Escribe notas de seguimiento para este cliente, acuerdos, presupuestos..."
      className="w-full bg-[#030306] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors block leading-relaxed resize-y h-24"
     />
     </div>
    </div>
    </div>

    {/* Assigned User Section */}
    <div className="space-y-2 border-b border-white/5 pb-4">
    <h4 className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">Assigned Panel User</h4>
    <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-3">
     <div className="flex items-center gap-3 min-w-0">
     <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex flex-shrink-0 items-center justify-center font-bold font-mono text-xs border border-blue-500/20">
      {selectedContact.assignedUserEmail ? selectedContact.assignedUserEmail.charAt(0).toUpperCase() : '?'}
     </div>
     <div className="min-w-0">
      <p className="text-xs font-semibold text-white truncate">
      {selectedContact.assignedUserEmail ?
       (usersList.find(u => u.email === selectedContact.assignedUserEmail)?.name || selectedContact.assignedUserEmail)
       : 'Unassigned'}
      </p>
      <p className="text-[10px] text-slate-500 font-mono truncate">
      {selectedContact.assignedUserEmail || 'No user allocated'}
      </p>
     </div>
     </div>
     
     {/* Select allocation dropdown */}
     <div className="flex flex-col gap-1 shrink-0">
     <button 
      type="button" 
      onClick={() => setShowQuickAddCollab(!showQuickAddCollab)}
      className="text-[9px] text-[#D4AF37] hover:underline self-end"
     >
      {showQuickAddCollab ? 'Cancel' : '+ Create User'}
     </button>
     {showQuickAddCollab ? (
      <div className="bg-slate-900 border border-amber-500/10 p-2 rounded-lg space-y-1 text-left w-48">
      <input 
       type="text"
       placeholder="Name"
       value={quickName}
       onChange={(e) => setQuickName(e.target.value)}
       className="w-full bg-slate-950 border border-white/5 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
      />
      <div className="flex gap-1">
       <input 
       type="email"
       placeholder="Email"
       value={quickEmail}
       onChange={(e) => setQuickEmail(e.target.value)}
       className="flex-1 bg-slate-950 border border-white/5 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
       />
       <button
       type="button"
       onClick={() => {
        if (!quickName.trim() || !quickEmail.trim()) return;
        if (onAddProfile) {
        onAddProfile({ name: quickName.trim(), email: quickEmail.trim() });
        if (onUpdateContact) {
         onUpdateContact({
         ...selectedContact,
         assignedUserEmail: quickEmail.trim(),
         });
        }
        setQuickName('');
        setQuickEmail('');
        setShowQuickAddCollab(false);
        }
       }}
       className="px-1.5 bg-[#D4AF37] text-black text-[10px] font-bold rounded"
       >
       Add
       </button>
      </div>
      </div>
     ) : (
      <select
      value={selectedContact.assignedUserEmail || ''}
      onChange={(e) => {
       const val = e.target.value;
       const matched = usersList.find(u => u.email === val);
       if (onUpdateContact) {
       onUpdateContact({
        ...selectedContact,
        assignedUserEmail: val || undefined,
        assignedUserId: matched ? matched.id : undefined
       });
       const toast = document.getElementById('toast-msg');
       if (toast) {
        toast.innerText = `Asignación guardada: ${matched ? matched.name : 'Sin asignar'}`;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 2500);
       }
       }
      }}
      className="bg-slate-900 border border-white/10 text-[10px] rounded-lg py-1 px-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[140px]"
      >
      <option value="">-- Unassigned --</option>
      {usersList.map(u => (
       <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
      ))}
      </select>
     )}
     </div>
    </div>
    </div>

    {/* Client Assets & Credentials toggles */}
    <div className="space-y-2 border-b border-white/5 pb-4">
    <h4 className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">Client Assets & Hosting</h4>
    <div className="bg-[#080d1a] p-4 rounded-xl space-y-3.5 border border-white/5">
     <div className="flex items-center gap-3 min-w-0">
     <Globe className="text-slate-500 w-4 h-4 flex-shrink-0" />
     <span className="text-xs text-slate-400 font-medium">Web:</span>
     {selectedContact.website ? (
      <a 
      href={selectedContact.website.startsWith('http') ? selectedContact.website : `https://${selectedContact.website}`} 
      target="_blank" 
      rel="noreferrer" 
      className="text-xs text-blue-400 hover:underline truncate"
      >
      {selectedContact.website}
      </a>
     ) : (
      <span className="text-xs text-slate-600 italic font-mono">No asignada</span>
     )}
     </div>

     <div className="flex items-center gap-3 min-w-0">
     <Github className="text-slate-500 w-4 h-4 flex-shrink-0" />
     <span className="text-xs text-slate-400 font-medium font-sans">GitHub:</span>
     {selectedContact.githubRepo ? (
      <a 
      href={selectedContact.githubRepo.startsWith('http') ? selectedContact.githubRepo : `https://github.com/${selectedContact.githubRepo}`} 
      target="_blank" 
      rel="noreferrer" 
      className="text-xs text-blue-400 hover:underline truncate font-mono"
      >
      {selectedContact.githubRepo.replace('https://github.com/', '')}
      </a>
     ) : (
      <span className="text-xs text-slate-600 italic font-mono">No asignado</span>
     )}
     </div>

     <div className="pt-2 border-t border-white/5">
     <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
      <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Credenciales Hosting</p>
      <p className="text-xs font-mono text-emerald-400 truncate mt-1 select-all font-semibold select-text">
       {showCredsId === selectedContact.id ?
        (selectedContact.hostingCredentials || 'DemoSecret123!')
       : '?'}
      </p>
      </div>
      <button
      type="button"
      onClick={() => toggleCredsVisibility(selectedContact.id)}
      className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border border-white/5 transition flex items-center justify-center cursor-pointer flex-shrink-0"
      title={showCredsId === selectedContact.id ? "Ocultar" : "Mostrar credenciales de hosting"}
      >
      {showCredsId === selectedContact.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 relative" />}
      </button>
     </div>
     </div>
    </div>
    </div>

    {/* Linked events section with target view link - REAL EVENTS */}
    <div className="space-y-2">
    <div className="flex justify-between items-center">
     <h4 className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">Upcoming Events</h4>

     {/* TARGETED LINK - View Calendar (navigates via 'push') */}
     <span 
     onClick={() => onNavigate('calendar', 'push')}
     className="text-[10px] text-blue-400 cursor-pointer hover:underline inline-block font-medium font-sans"
     >
     View Calendar
     </span>

    </div>

    <div className="space-y-2">
     {(() => {
     const clientEvents = events.filter(e => 
      (e.linkedContactIds && e.linkedContactIds.includes(selectedContact.id)) || 
      e.linkedContactId === selectedContact.id
     );

     if (clientEvents.length === 0) {
      return (
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center text-slate-500 font-sans text-xs italic">
       No hay eventos reales asignados para este cliente.
      </div>
      );
     }

     return clientEvents.map(evt => {
      // format date
      let day = '28';
      let monthName = 'Oct';
      try {
      const dateParts = evt.date.split('-');
      if (dateParts.length === 3) {
       day = dateParts[2];
       const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
       const idx = parseInt(dateParts[1], 10) - 1;
       if (idx >= 0 && idx < 12) monthName = months[idx];
      }
      } catch (e) {}

      return (
      <div key={evt.id} className="bg-blue-500/5 border-l-2 border-blue-500 p-3 flex items-center gap-4 rounded-r-xl border border-y-white/5 border-r-white/5">
       <div className="text-center min-w-[34px]">
       <p className="font-bold text-blue-400 text-xs leading-none">{day}</p>
       <p className="text-[8px] uppercase text-slate-550 mt-1">{monthName}</p>
       </div>
       <div className="min-w-0 flex-1">
       <p className="font-semibold text-xs text-white truncate">{evt.title}</p>
       <p className="text-[10px] text-slate-550 font-sans">{evt.time} {evt.duration ? `(${evt.duration})` : ''}</p>
       {evt.meetingUrl && (
        <a 
        href={evt.meetingUrl} 
        target="_blank" 
        rel="noreferrer" 
        className="text-[9px] text-blue-400 hover:text-blue-300 block hover:underline truncate mt-1"
        >
        Meeting Link ➜
        </a>
       )}
       </div>
      </div>
      );
     });
     })()}
    </div>
    </div>

   </div>
   </div>
   </aside>
   </div>,
   document.body
  )}

  {/* Floating Action Button (FAB) at bottom-right */}
  <button 
  id="addContactFab"
  onClick={() => {
   resetFormFields();
   setShowAddModal(true);
  }}
  className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-90 text-white shadow-2xl flex items-center justify-center cursor-pointer transition-all z-40 group border border-blue-400/20"
  >
  <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
  <span className="absolute right-full mr-4 px-3 py-1.5 rounded bg-slate-950 text-slate-200 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10">
   Add New Contact
  </span>
  </button>

  {/* Dynamic Creation Modal for new contacts */}
  {showAddModal && createPortal(
  <div className="fixed inset-0 z-[100] flex h-[100dvh] items-start justify-center overflow-y-auto overscroll-contain p-2 sm:p-4 md:items-center">
   <div className="fixed inset-0 bg-[#000]/70 backdrop-blur-sm" onClick={() => { resetFormFields(); setShowAddModal(false); }} />
   <div className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111a2c]/95 text-slate-300 shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
   
   <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#111a2c]/95 px-4 py-3.5 sm:px-6 sm:py-4">
    <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-white sm:text-lg">
    <UserPlus className="w-5 h-5 text-blue-400" />
    <span className="truncate">{editingContact ? `Editando contacto: ${editingContact.name}` : 'Crear Nuevo Contacto'}</span>
    </h3>
    <button onClick={() => { resetFormFields(); setShowAddModal(false); }} className="shrink-0 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/5">
    <X className="w-5 h-5" />
    </button>
   </div>

   <form onSubmit={handleAddSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
    
    {/* Contact Name */}
    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Full Name</label>
    <input 
     type="text"
     required
     placeholder="e.g. Liam Foster"
     value={newName}
     onChange={(e) => setNewName(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
    />
    </div>

    {/* Email */}
    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Email Address</label>
    <input 
     type="text"
     placeholder="l.foster@lumina.io (Opcional)"
     value={newEmail}
     onChange={(e) => setNewEmail(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
    />
    </div>

    {/* Company & Role */}
    <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Company</label>
     <input 
     type="text"
     placeholder="e.g. Lumina Digital"
     value={newCompany}
     onChange={(e) => setNewCompany(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
     />
    </div>
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Role</label>
     <input 
     type="text"
     placeholder="e.g. QA Architect"
     value={newRole}
     onChange={(e) => setNewRole(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
     />
    </div>
    </div>

    {/* Status & Location */}
    <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Status</label>
     <select 
     value={newStatus}
     onChange={(e) => setNewStatus(e.target.value as any)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
     >
     <option value="Lead">Lead</option>
     <option value="Client">Client</option>
     </select>
    </div>
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Location</label>
     <input 
     type="text"
     placeholder="e.g. London, UK"
     value={newLocation}
     onChange={(e) => setNewLocation(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
     />
    </div>
    </div>

    <div className="grid grid-cols-1 gap-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-3 sm:grid-cols-2">
     <div className="space-y-1">
      <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">CIF / NIF / ID fiscal</label>
      <input
       type="text"
       value={newTaxId}
       onChange={(e) => setNewTaxId(e.target.value)}
       placeholder="Identificación fiscal"
       className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
      />
     </div>
     <div className="space-y-1">
      <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Dirección fiscal completa</label>
      <input
       type="text"
       value={newFiscalAddress}
       onChange={(e) => setNewFiscalAddress(e.target.value)}
       placeholder="Calle, número, CP, ciudad y país"
       className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
      />
     </div>
     <div className="space-y-1">
      <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Divisa predeterminada</label>
      <select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value as NonNullable<ClientContact['currency']>)} className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100">
       <option value="EUR">EUR — Euro (€)</option><option value="USD">USD — Dólar ($)</option><option value="GBP">GBP — Libra (£)</option><option value="MXN">MXN — Peso mexicano ($)</option><option value="CHF">CHF — Franco suizo</option>
      </select>
     </div>
     <div className="space-y-1">
      <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Idioma de factura</label>
      <select value={newLanguage} onChange={(e) => setNewLanguage(e.target.value as NonNullable<ClientContact['language']>)} className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100">
       <option value="es">Español</option><option value="en">English</option>
      </select>
     </div>
     <div className="space-y-1 sm:col-span-2">
      <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Nivel impositivo predeterminado (%)</label>
      <input type="number" min="0" max="100" step="0.01" value={newTaxPercentage} onChange={(e) => setNewTaxPercentage(Number(e.target.value))} className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100" />
     </div>
    </div>

    {/* Temperature / Color selection */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-405 uppercase tracking-wider font-extrabold text-violet-400">Temperatura de Venta (Cliente)</label>
    <div className="grid grid-cols-3 gap-2 bg-[#060e20] border border-white/10 p-2 rounded-xl">
     {[
     { val: 'blue', label: '❄ Frío', desc: 'Frío / Captura inicial', activeStyle: 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.15)]' },
     { val: 'yellow', label: '⚡ Templado', desc: 'Templado / Interés medio', activeStyle: 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]' },
     { val: 'red', label: '🔥 Caliente', desc: 'Caliente / Compra inminente', activeStyle: 'bg-rose-500/20 border-rose-500 text-rose-450 shadow-[0_0_12px_rgba(244,63,94,0.15)]' }
     ].map(item => {
     const isSelected = newColor === item.val || (!newColor && item.val === 'blue');
     return (
      <button
      key={item.val}
      type="button"
      onClick={() => setNewColor(item.val)}
      className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
       isSelected ?
        item.activeStyle
       : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-300'
      }`}
      title={item.desc}
      >
      <span>{item.label}</span>
      <span className="text-[7.5px] text-slate-500 uppercase font-normal font-mono">
       {item.val === 'blue' ? 'Frío' : item.val === 'yellow' ? 'Templado' : 'Caliente'}
      </span>
      </button>
     );
     })}
    </div>
    </div>

    {/* Website / Client Web */}
    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Client Website (Web)</label>
    <input 
     type="text"
     placeholder="e.g. store.cl, www.clientweb.com"
     value={newWebsite}
     onChange={(e) => setNewWebsite(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
    />
    </div>

    {/* Github Repository */}
    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">GitHub Repo (o ruta)</label>
    <input 
     type="text"
     placeholder="e.g. github.com/client/repo"
     value={newGithubRepo}
     onChange={(e) => setNewGithubRepo(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
    />
    </div>

    {/* Hosting credentials */}
    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Credenciales Hosting</label>
    <input 
     type="text"
     placeholder="e.g. host: cpanel9.hosting.com | u: user | p: pass123"
     value={newHostingCredentials}
     onChange={(e) => setNewHostingCredentials(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
    />
    </div>

    {/* Phone, LinkedIn & Image URL */}
    <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Teléfono / Phone</label>
     <input 
     type="text"
     placeholder="e.g. +56 9 1234 5678"
     value={newPhone}
     onChange={(e) => setNewPhone(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
     />
    </div>
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">LinkedIn URL/User</label>
     <input 
     type="text"
     placeholder="e.g. linkedin.com/in/user"
     value={newLinkedin}
     onChange={(e) => setNewLinkedin(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
     />
    </div>
    </div>

    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Imagen / Avatar de Cliente (URL o Archivo)</label>
    <div className="flex items-center gap-3">
     {newAvatarUrl && (
     <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
      <img 
      src={newAvatarUrl} 
      alt="Previsualización" 
      className="w-full h-full object-cover" 
      referrerPolicy="no-referrer"
      onError={(e) => {
       (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=40px&q=80";
      }}
      />
     </div>
     )}
     <div className="flex-1 flex gap-1.5 min-w-0">
     <input 
      type="text"
      placeholder="https://images.unsplash.com/photo-..."
      value={newAvatarUrl}
      onChange={(e) => setNewAvatarUrl(e.target.value)}
      className="flex-1 bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 min-w-0"
     />
     <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl px-3 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer select-none font-semibold transition shrink-0">
      <Upload className="w-3.5 h-3.5" />
      <span>Subir</span>
      <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
       const file = e.target.files?.[0];
       if (file) {
       if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es demasiado grande. Por favor selecciona una de menos de 5MB.");
        return;
       }
       const reader = new FileReader();
       reader.onloadend = () => {
        if (reader.result && typeof reader.result === 'string') {
        setNewAvatarUrl(reader.result);
        }
       };
       reader.readAsDataURL(file);
       }
      }}
      />
     </label>
     </div>
    </div>
    {newAvatarUrl && newAvatarUrl.startsWith('data:image/') && (
     <span className="text-[9px] font-mono text-emerald-400 block mt-0.5"> Foto cargada desde tu dispositivo.</span>
    )}
    </div>

    {/* Select assigned user */}
    <div className="space-y-1 animate-fade-in">
    <div className="flex justify-between items-center mb-0.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Assign Panel User</label>
     <button 
     type="button" 
     onClick={() => setShowQuickAddCollab(!showQuickAddCollab)}
     className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
     >
     {showQuickAddCollab ? 'Cancel' : '+ Create User'}
     </button>
    </div>
    
    {showQuickAddCollab ? (
     <div className="bg-[#050b18] border border-blue-500/20 p-3 rounded-xl space-y-2 mt-1">
     <input 
      type="text"
      placeholder="Collaborator full name"
      value={quickName}
      onChange={(e) => setQuickName(e.target.value)}
      className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-blue-500"
     />
     <div className="flex gap-2">
      <input 
      type="email"
      placeholder="Email (e.g. mgnacho96@gmail.com)"
      value={quickEmail}
      onChange={(e) => setQuickEmail(e.target.value)}
      className="flex-1 bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-blue-500"
      />
      <button
      type="button"
      onClick={() => {
       if (!quickName.trim() || !quickEmail.trim()) return;
       if (onAddProfile) {
       onAddProfile({ name: quickName.trim(), email: quickEmail.trim() });
       setNewAssignedUserEmail(quickEmail.trim());
       setQuickName('');
       setQuickEmail('');
       setShowQuickAddCollab(false);
       }
      }}
      className="px-3 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition cursor-pointer"
      >
      Create
      </button>
     </div>
     </div>
    ) : (
     <select 
     value={newAssignedUserEmail}
     onChange={(e) => setNewAssignedUserEmail(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
     >
     <option value="">-- No Assignment --</option>
     {usersList.map(u => (
      <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
     ))}
     </select>
    )}
    </div>

    <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t border-white/10 bg-[#111a2c]/95 px-4 pb-1 pt-3 backdrop-blur-xl sm:-mx-6 sm:gap-4 sm:px-6">
    <button 
     type="button" 
     onClick={() => { resetFormFields(); setShowAddModal(false); }}
     className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-300 transition-all cursor-pointer"
    >
     Cancelar
    </button>
    <button 
     type="submit"
     className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
    >
     {editingContact ? 'Guardar Cambios' : 'Guardar Contacto'}
    </button>
    </div>

   </form>
   </div>
  </div>, document.body
  )}

  {/* SCHEDULE MEETING MODAL - ADMIN EXCLUSIVE */}
  {showScheduleModal && selectedContact && (
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
    }}
    className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-955/60 border border-white/5 cursor-pointer transition-colors"
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
     placeholder="Ej. Reunión Semanal de Consultoría"
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
     <option value="unassigned">👥 Sin asignar / General</option>
     {usersList.map(com => (
     <option key={com.id} value={com.email}>{com.name} ({com.email})</option>
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

  {/* Connected payment modal backdrop & form */}
  {showAddPaymentModal && selectedContact && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
   <div className="w-full max-w-md bg-[#0a0a14] border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/20 max-h-[90vh] flex flex-col">
   {/* Header banner cover */}
   <div className="bg-gradient-to-tr from-emerald-600/20 via-emerald-950/20 to-slate-950/10 p-6 border-b border-white/5 relative">
    <h3 className="text-sm font-bold text-white flex items-center gap-2">
    <CreditCard className="w-5 h-5 text-emerald-400" />
    <span>Registrar Cobro / Transacción</span>
    </h3>
    <p className="text-[11px] text-slate-400 mt-1 font-sans">
    Registra un cobro de forma manual. Si el cliente tiene facturas pendientes, se aplicará y marcará la correspondiente como cobrada automáticamente.
    </p>
    <button
    type="button"
    onClick={() => setShowAddPaymentModal(false)}
    className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-955/60 border border-white/5 cursor-pointer transition-colors"
    >
    <X className="w-4 h-4" />
    </button>
   </div>

   {/* Modal Body / Form */}
   <form onSubmit={handleRegisterPayment} className="p-6 overflow-y-auto space-y-4 text-left">
    {/* Client Info */}
    <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1">
    <span className="block text-[8px] font-mono text-slate-500 uppercase">CLIENTE DE CARGO</span>
    <span className="text-xs font-bold text-white">{getContactBusinessName(selectedContact)}</span>
    <span className="block text-[10px] text-slate-400 font-sans">Contacto: {selectedContact.name}</span>
    </div>

    {/* Amount and Date */}
    <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Importe Recibido (?)</label>
     <input
     type="number"
     step="0.01"
     required
     value={paymentAmount}
     onChange={(e) => setPaymentAmount(e.target.value)}
     placeholder="150.00"
     className="w-full bg-[#030305] text-slate-200 text-xs border border-white/10 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
     />
    </div>
    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Fecha del Pago</label>
     <input
     type="date"
     required
     value={paymentDate}
     onChange={(e) => setPaymentDate(e.target.value)}
     className="w-full bg-[#030305] text-slate-200 text-xs border border-white/10 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
     />
    </div>
    </div>

    {/* Payment Method */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Método de Pago</label>
    <div className="grid grid-cols-2 gap-2">
     <button
     type="button"
     onClick={() => setPaymentMethod('transfer')}
     className={`py-2 px-3 text-xs rounded-xl font-medium border transition-all ${
      paymentMethod === 'transfer' ?
       'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
       : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
     }`}
     >
     Transferencia Bancaria
     </button>
     <button
     type="button"
     onClick={() => setPaymentMethod('cash')}
     className={`py-2 px-3 text-xs rounded-xl font-medium border transition-all ${
      paymentMethod === 'cash' ?
       'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
       : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
     }`}
     >
     Efectivo
     </button>
    </div>
    </div>

    {/* Payment Status (Realizado vs Pendiente) */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Estado del Cobro</label>
    <div className="grid grid-cols-2 gap-2">
     <button
     type="button"
     onClick={() => setPaymentStatus('paid')}
     className={`py-2 px-3 text-xs rounded-xl font-medium border transition-all ${
      paymentStatus === 'paid' ?
       'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
       : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
     }`}
     >
     Pagado / Realizado
     </button>
     <button
     type="button"
     onClick={() => setPaymentStatus('pending')}
     className={`py-2 px-3 text-xs rounded-xl font-medium border transition-all ${
      paymentStatus === 'pending' ?
       'bg-amber-500/25 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
       : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
     }`}
     >
     Pendiente (Cobro Pendiente)
     </button>
    </div>
    <p className="text-[9px] text-slate-500 font-sans italic leading-tight mt-1">
     Nota: Para cobrar un nuevo servicio, primero regístralo como "Pendiente". Así aparecerá por defecto en el panel de plazos y links de Stripe.
    </p>
    </div>

    {paymentStatus === 'pending' && (
    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Plan acordado</label>
     <div className="grid grid-cols-3 gap-2">
     {([1, 2, 3] as const).map(count => (
      <button type="button" key={count} onClick={() => setPaymentInstallments(count)} className={`py-2.5 rounded-xl border text-xs font-bold ${paymentInstallments === count ? 'bg-blue-500/20 border-blue-400 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
      {count} {count === 1 ? 'pago' : 'meses'}
      </button>
     ))}
     </div>
     <p className="text-[9px] text-slate-500">Se crearán las cuotas pendientes con vencimiento mensual. La comisión se activa al marcar cada cuota como pagada.</p>
    </div>
    )}

    {/* Invoice to Settle */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Asociar a Factura</label>
    <select
     value={paymentInvoiceId}
     onChange={(e) => setPaymentInvoiceId(e.target.value)}
     className="w-full bg-[#030305] text-slate-200 text-xs border border-white/10 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
    >
     <option value="general">Automático / Saldo General (Auto-completar facturas)</option>
     {invoices
     .filter(inv => invoiceBelongsToContact(inv, selectedContact) && inv.status !== 'paid')
     .map(inv => (
      <option key={inv.id} value={inv.id}>
      {inv.id} - Total: {inv.total.toFixed(2)} ({inv.date})
      </option>
     ))
     }
    </select>
    </div>

    {/* Payment Description */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Concepto / Notas de Pago</label>
    <input
     type="text"
     required
     value={paymentDesc}
     onChange={(e) => setPaymentDesc(e.target.value)}
     placeholder="Cobro de servicios de consultoría"
     className="w-full bg-[#030305] text-slate-200 text-xs border border-white/10 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
    />
    </div>

    {/* Buttons */}
    <div className="flex gap-3 pt-4 border-t border-white/5">
    <button
     type="button"
     onClick={() => setShowAddPaymentModal(false)}
     className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs text-slate-400 font-semibold cursor-pointer transition-all text-center"
    >
     Cancelar
    </button>
    <button
     type="submit"
     className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-emerald-950/40 transition-all text-center flex items-center justify-center gap-1.5"
    >
     <Check className="w-4 h-4" />
     <span>Confirmar Cobro</span>
    </button>
    </div>
   </form>
   </div>
  </div>
  )}

  {/* LEAD TO CLIENT CONVERSION MODAL */}
  {convertingLead && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
   <div className="w-full max-w-lg bg-[#0a0a14] border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/20 max-h-[90vh] flex flex-col">
   {/* Header banner cover */}
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

   {/* Modal Body / Form */}
   <form onSubmit={handleConfirmConvertToClient} className="p-6 overflow-y-auto space-y-4 text-left">
    {/* Lead Info */}
    <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1">
    <span className="block text-[8px] font-mono text-slate-500 uppercase">Lead a Convertir</span>
    <span className="text-xs font-semibold text-slate-200">{convertingLead.name}</span>
    <span className="text-[10px] text-slate-400 block font-sans">
     {convertingLead.company ? `${convertingLead.company} ` : ''}{convertingLead.email}
    </span>
    </div>

    {/* Servicio / Concepto */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Servicio / Concepto de Contrato</label>
    <input
     type="text"
     required
     value={convConcept}
     onChange={(e) => setConvConcept(e.target.value)}
     placeholder="Ej. Servicio de Consultoría Althera"
     className="w-full bg-[#030305] text-slate-200 text-xs border border-white/10 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
    />
    </div>

    {/* Precio y Plazos */}
    <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Importe base (€)</label>
     <input
     type="number"
     min="1"
     required
     value={convSalePrice}
     onChange={(e) => setConvSalePrice(Number(e.target.value))}
     placeholder="Sin pagos pendientes"
     className="w-full bg-[#030305] text-slate-200 text-xs border border-white/10 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
     />
    </div>
    <div className="space-y-1.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Plazos de Pago</label>
     <select
     value={convInstallments}
     onChange={(e) => {
      const installments = Number(e.target.value);
      setConvInstallments(installments);
      if (installments === 1) setConvFinancingExtra(0);
     }}
     className="w-full bg-[#030305] text-slate-200 text-xs border border-white/10 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
     >
     <option value={1}>Pago único (1 plazo)</option>
     <option value={2}>2 plazos mensuales</option>
     <option value={3}>3 plazos mensuales</option>
     <option value={4}>4 plazos mensuales</option>
     <option value={6}>6 plazos mensuales</option>
     <option value={12}>12 plazos mensuales</option>
     </select>
     </div>
     </div>

    {convInstallments > 1 && (
     <div className="space-y-1.5">
      <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Extra por financiación (€)</label>
      <input
       type="number"
       min="0"
       step="0.01"
       value={convFinancingExtra}
       onChange={(e) => setConvFinancingExtra(Math.max(0, Number(e.target.value) || 0))}
       placeholder="Ej. 50"
       className="w-full bg-[#030305] text-slate-200 text-xs border border-amber-400/20 rounded-xl px-3 py-2.5 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
      />
      <p className="text-[9px] text-slate-500">Se suma al importe base y se reparte entre todas las cuotas.</p>
     </div>
    )}

    {/* Cuotas de cálculo informativo */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Pagar con</label>
    <div className="grid grid-cols-3 gap-2">
     {(['cash', 'transfer', 'stripe'] as const).map(method => (
     <button
      key={method}
      type="button"
      onClick={() => setConvPaymentMethod(method)}
      className={`py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all ${
      convPaymentMethod === method
       ? method === 'stripe'
        ? 'bg-violet-500/20 border-violet-400 text-violet-200'
        : method === 'cash'
         ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
         : 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
       : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
      }`}
     >
      {method === 'cash' ? 'Efectivo' : method === 'transfer' ? 'Transferencia' : 'Stripe'}
     </button>
     ))}
    </div>
    {convPaymentMethod === 'stripe' && (
     <p className="text-[9px] text-violet-300 leading-relaxed bg-violet-500/5 border border-violet-500/15 rounded-xl p-2">
     Se generara un unico link de Stripe. Si hay varias cuotas, Stripe cobrara una mensualidad de {(convFinancedTotal / Math.max(convInstallments, 1)).toFixed(2)} EUR y la suscripcion se programa para cancelarse al llegar al total.
     </p>
    )}
    </div>

    {convInstallments > 1 && (
    <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 text-[10px] text-amber-300 font-mono space-y-0.5">
     <span className="block font-bold">DISTRIBUCIÓN EN PLAZOS:</span>
     <span> Importe base: {Number(convSalePrice || 0).toFixed(2)} EUR</span>
     {convFinancingExtra > 0 && <span className="block"> Extra por financiación: {convFinancingExtra.toFixed(2)} EUR</span>}
     <span className="block"> Cuota mensual: {(convFinancedTotal / convInstallments).toFixed(2)} EUR</span>
     <span className="block"> Total: {convInstallments} cuotas hasta completar {convFinancedTotal.toFixed(2)} EUR.</span>
    </div>
    )}

    {/* Comercial a asignar */}
    <div className="space-y-1.5">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Comercial de origen (Comisión)</label>
     {originCommissionCommercial && <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-200">Sugerido automáticamente</span>}
    </div>
    <select
     value={effectiveCommissionCommercialId}
     onChange={(e) => setConvSelectedComercialId(e.target.value)}
     className="w-full bg-[#030305] text-slate-200 text-xs border border-white/10 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer font-sans"
    >
     <option value="">Sin comercial — sin comisión</option>
     {eligibleCommissionCommercials.map(com => (
     <option key={com.id} value={com.id}>
      {com.name} ({com.email}) - Comisión: {com.commissionPercentage ?? 10}%
     </option>
     ))}
    </select>
    {effectiveCommissionCommercialId && (() => {
     const com = (comercialesList || []).find(c => c.id === effectiveCommissionCommercialId);
     if (com) {
     const pct = com.commissionPercentage ?? 10;
     const commVal = (convFinancedTotal * pct) / 100;
     return (
      <p className="text-[10px] text-emerald-400 font-mono mt-1">
      👉 Se asignará una comisión de <strong>{commVal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong> ({pct}%) a <strong>{com.name}</strong> en el balance del comercial.
      </p>
     );
     }
     return null;
    })()}
    {!effectiveCommissionCommercialId && <p className="text-[9px] text-slate-500">Puedes confirmar la venta sin asignar comisión a ningún comercial.</p>}
    {originCommissionCommercial && <p className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] px-3 py-2 text-[9px] leading-4 text-cyan-200/75">Se ha preseleccionado al comercial que captó el lead. Puedes cambiarlo antes de confirmar la venta. Carlos nunca recibe comisión de ventas.</p>}
    </div>

    {/* Buttons */}
    <div className="flex gap-3 pt-4 border-t border-white/5">
    <button
     type="button"
     onClick={() => setConvertingLead(null)}
     className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs text-slate-400 font-semibold cursor-pointer transition-all text-center"
    >
     Cancelar
    </button>
    <button
     type="submit"
     className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-emerald-950/40 transition-all text-center flex items-center justify-center gap-1.5 uppercase tracking-wider"
    >
     <Check className="w-4 h-4" />
     <span>Confirmar Venta 🎯</span>
    </button>
    </div>
   </form>
   </div>
  </div>, document.body
  )}

  {invoiceConceptEditor && (
   <div
    className="fixed inset-0 z-[85] flex items-center justify-center bg-[#02050d]/90 p-4 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-labelledby="invoice-concepts-title"
    onMouseDown={(event) => {
     if (event.currentTarget === event.target && !isSavingInvoiceConcepts) setInvoiceConceptEditor(null);
    }}
   >
    <div className="w-full max-w-xl rounded-3xl border border-violet-400/20 bg-[#0b101b] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
     <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
      <div>
       <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Factura {invoiceConceptEditor.id}</p>
       <h3 id="invoice-concepts-title" className="mt-1 text-lg font-black text-white">Editar conceptos</h3>
       <p className="mt-1 text-[11px] text-slate-400">Estos textos aparecerán en la factura y en el PDF.</p>
      </div>
      <button type="button" onClick={() => setInvoiceConceptEditor(null)} disabled={isSavingInvoiceConcepts} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40">
       <X className="h-4 w-4" />
      </button>
     </div>

     <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
      {invoiceConceptDrafts.map((concept, index) => (
       <label key={invoiceConceptEditor.items[index]?.id || index} className="block space-y-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Concepto {index + 1}</span>
        <textarea
         rows={2}
         value={concept}
         onChange={(event) => setInvoiceConceptDrafts(current => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))}
         className="w-full resize-none rounded-xl border border-white/10 bg-[#060e20] px-3.5 py-3 text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/10"
         placeholder="Descripción que aparecerá en la factura"
        />
       </label>
      ))}
     </div>

     <div className="mt-6 flex gap-3 border-t border-white/[0.07] pt-4">
      <button type="button" onClick={() => setInvoiceConceptEditor(null)} disabled={isSavingInvoiceConcepts} className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-white/5 disabled:opacity-40">Cancelar</button>
      <button type="button" onClick={handleSaveInvoiceConcepts} disabled={isSavingInvoiceConcepts} className="flex-1 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400 disabled:cursor-wait disabled:opacity-60">
       {isSavingInvoiceConcepts ? 'Guardando…' : 'Guardar conceptos'}
      </button>
     </div>
    </div>
   </div>
  )}

  {conversionSuccess && (
  <div
   className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#02050d]/90 p-4 backdrop-blur-md"
   role="dialog"
   aria-modal="true"
   aria-labelledby="conversion-success-title"
   onMouseDown={(event) => {
    if (event.currentTarget === event.target) setConversionSuccess(null);
   }}
  >
   <div className="relative my-auto w-full max-w-[540px] overflow-hidden rounded-[28px] border border-emerald-400/20 bg-[#0b101b] shadow-[0_30px_100px_rgba(0,0,0,0.7),0_0_70px_rgba(16,185,129,0.08)]">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_70%)]" />
    <button
     type="button"
     onClick={() => setConversionSuccess(null)}
     className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
     aria-label="Cerrar"
    >
     <X className="h-4 w-4" />
    </button>

    <div className="relative px-6 pb-6 pt-8 sm:px-8 sm:pb-8">
     <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/25 to-teal-500/10 shadow-[0_0_35px_rgba(16,185,129,0.2)]">
      <Check className="h-8 w-8 text-emerald-300" strokeWidth={2.4} />
     </div>

     <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">Venta registrada</p>
     <h2 id="conversion-success-title" className="pr-10 text-2xl font-black tracking-tight text-white sm:text-[28px]">
      ¡{conversionSuccess.clientName} ya es cliente!
     </h2>
     <p className="mt-2 text-sm leading-6 text-slate-400">
      La conversión se ha completado y toda la información financiera ha quedado registrada.
     </p>

     <div className="my-6 rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.09] to-cyan-400/[0.03] px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/70">Importe de la venta</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-white">
       {conversionSuccess.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
      </p>
      {conversionSuccess.financingExtra > 0 && (
       <p className="mt-1 text-xs text-slate-400">
        Base {conversionSuccess.baseAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} · Extra de financiación {conversionSuccess.financingExtra.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
       </p>
      )}
     </div>

     <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
       <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Forma de pago</p>
       <p className="mt-1.5 text-sm font-bold text-slate-100">
        {conversionSuccess.paymentMethod === 'stripe' ? 'Stripe' : conversionSuccess.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
       </p>
      </div>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
       <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Plan de pago</p>
       <p className="mt-1.5 text-sm font-bold text-slate-100">
        {conversionSuccess.installments} {conversionSuccess.installments === 1 ? 'cuota' : 'cuotas'}
       </p>
      </div>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
       <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Comercial</p>
       <p className="mt-1.5 truncate text-sm font-bold text-slate-100">
        {conversionSuccess.commercialName || 'Sin asignar'}
       </p>
      </div>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
       <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Comisión</p>
       <p className="mt-1.5 text-sm font-bold text-slate-100">
        {conversionSuccess.commissionAmount !== undefined
         ? `${conversionSuccess.commissionAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} (${conversionSuccess.commissionPercentage}%)`
         : 'Sin comisión'}
       </p>
      </div>
     </div>

     {conversionSuccess.stripeUrl && (
      <div className="mt-3 flex gap-2">
       <a
        href={conversionSuccess.stripeUrl}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-4 py-3 text-xs font-bold text-violet-200 transition hover:bg-violet-400/[0.14]"
       >
        Abrir enlace de Stripe
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
       </a>
       <button
        type="button"
        onClick={() => navigator.clipboard.writeText(conversionSuccess.stripeUrl!)}
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white"
        title="Copiar enlace de Stripe"
       >
        <Copy className="h-4 w-4" />
       </button>
      </div>
     )}

     <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
      <Receipt className="h-4 w-4 shrink-0 text-emerald-400" />
      <p className="text-[11px] leading-4 text-slate-400">Factura e ingresos creados correctamente.</p>
     </div>

     <button
      type="button"
      onClick={() => setConversionSuccess(null)}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3.5 text-xs font-black uppercase tracking-[0.14em] text-slate-950 shadow-lg shadow-emerald-950/40 transition hover:from-emerald-400 hover:to-teal-400"
     >
      Cerrar y continuar
      <ChevronRight className="h-4 w-4" />
     </button>
    </div>
   </div>
  </div>
  )}

 </div>
 );
}





