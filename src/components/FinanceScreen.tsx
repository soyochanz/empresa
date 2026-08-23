import React, { useState, useEffect } from 'react';
import { FinanceTransaction, Invoice, ClientContact, Screen, InvoiceItem, ComercialAccount } from '../types';
import { db, invalidateSharedPipelineCache, supabase } from '../supabaseClient';
import { countUniqueInitialSales, getRankableCommercials, getUniqueInitialSales } from '../utils/salesRewards';
import { buildInvoiceHtml, downloadInvoicePdf } from '../utils/invoiceHtml';
import { getNextInvoiceNumber } from '../utils/invoiceNumber';
import { clearInvoicePrefill, peekInvoicePrefill, resolveInvoiceClientData } from '../utils/invoicePrefill';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import {
 buildManualRecurringTransaction,
 getFinanceRecurrenceDate,
 getNextFinanceRecurrenceDate,
 isFinanceRecurrenceOccurrenceAllowed
} from '../utils/financeRecurrence';
import { 
 DollarSign, 
 TrendingUp, 
 TrendingDown, 
 Calendar, 
 Plus, 
 Trash2, 
 Edit, 
 FileText, 
 CheckCircle2, 
 Clock, 
 ArrowUpRight, 
 ArrowDownLeft, 
 Repeat, 
 Printer, 
 User, 
 Mail, 
 X, 
 Check, 
 SlidersHorizontal,
 PlusCircle, 
 Briefcase,
 Download,
 CreditCard,
 Copy,
 ExternalLink,
 ShieldCheck,
 LayoutDashboard,
 Activity,
 CalendarDays,
 FileSpreadsheet,
 RefreshCw,
 Banknote,
 Landmark,
 WalletCards,
 ReceiptText,
 Sparkles,
 Target,
 Trophy
} from 'lucide-react';

type StripeFundAmount = {
 amount: number;
 currency: string;
};

type StripeFunds = {
 available: StripeFundAmount[];
 pending: StripeFundAmount[];
 livemode: boolean;
 fetchedAt: string;
};

type StripeAccountSubscription = {
 id: string;
 customerId: string;
 customerName: string;
 customerEmail: string;
 status: string;
 amount: number;
 currency: string;
 interval: string;
 intervalCount: number;
 billingType: 'subscription' | 'installment';
 installmentCount: number | null;
 paymentLimit: number | null;
 endsAt: string | null;
 paymentCount: number;
 paidAmount: number;
 openAmount: number;
 lastPaidAt: string | null;
 dashboardUrl: string;
};

type StripeAccountPayment = {
 id: string;
 paymentIntentId: string;
 concept: string;
 customerName: string;
 customerEmail: string;
 amount: number;
 refundedAmount: number;
 currency: string;
 paidAt: string;
 status: 'paid' | 'refunded' | 'partially_refunded';
 receiptUrl: string;
 dashboardUrl: string;
};

type StripeFinanceOverview = {
 activeSubscriptions: StripeAccountSubscription[];
 paymentHistory: StripeAccountPayment[];
 totals: {
  activeSubscriptions: number;
  activeInstallmentPlans: number;
  mrr: StripeFundAmount[];
  chargedVolume: StripeFundAmount[];
  successfulPayments: number;
 };
 livemode: boolean;
 trackingStartedAt: string;
 fetchedAt: string;
};

const safeConfirm = (msg: string): boolean => {
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

const getTieredCommission = (closures: number): number => {
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

interface FinanceScreenProps {
 contacts: ClientContact[];
 onNavigate?: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
 comercialesList?: ComercialAccount[];
 onRefreshFinance?: () => void | Promise<void>;
}

const INITIAL_TRANSACTIONS: FinanceTransaction[] = [];

const getFinanceBusinessName = (contact?: ClientContact): string => {
 if (!contact) return '';
 const company = (contact.company || '').trim();
 return company && company.toLowerCase() !== 'independent' ? company : contact.name;
};

const getCleanBillingConcept = (description?: string): string => {
 return (description || '')
 .replace(/^Cobro Pendiente:\s*/i, '')
 .replace(/^Ingreso Facturado:\s*[^-]+-\s*/i, '')
 .replace(/\s*\([^)]*\)\s*-\s*Plazo\s+\d+\s+de\s+\d+/i, '')
 .replace(/\s*-\s*Plazo\s+\d+\s+de\s+\d+/i, '')
 .replace(/\s*\((Pendiente|Cobro Automatico programado|Cobro Automático programado|Ingreso Procesado|Cargo Procesado)\)/gi, '')
 .trim();
};

const getTransactionDisplayConcept = (description?: string): string =>
 getCleanBillingConcept(description)
  .replace(/\s*-?\s*(?:Cuota|Plazo)\s*\d+\s*(?:de|\/)\s*\d+/gi, '')
  .replace(/\s*\((?:Ingreso|Gasto) recurrente (?:autom[aá]tico|Stripe)\)/gi, '')
  .replace(/\s*\((?:Ingreso|Gasto) recurrente\)/gi, '')
  .replace(/\s{2,}/g, ' ')
  .replace(/\s*-\s*$/, '')
  .trim();

const getTransactionInstallment = (transaction: FinanceTransaction): { index: number; total: number } | null => {
 const directIndex = Number(transaction.stripeInstallmentIndex || 0);
 const directTotal = Number(transaction.stripeInstallmentCount || 0);
 if (directIndex > 0 && directTotal > 1) return { index: directIndex, total: directTotal };

 const match = /(?:Cuota|Plazo)\s*(\d+)\s*(?:de|\/)\s*(\d+)/i.exec(transaction.description || '');
 if (!match) return null;
 const index = Number(match[1]);
 const total = Number(match[2]);
 return index > 0 && total > 1 ? { index, total } : null;
};

type TransactionOriginSignalsProps = {
 transaction: FinanceTransaction;
 stripeDashboardUrl: string | null;
};

const TransactionOriginSignals = React.memo(function TransactionOriginSignals({
 transaction,
 stripeDashboardUrl,
}: TransactionOriginSignalsProps) {
 const description = transaction.description || '';
 const hasCommercial = Boolean(transaction.comercialId || transaction.comercialEmail);
 const isRecurring = Boolean(
  transaction.isRecurring ||
  transaction.recurrenceSourceId ||
  /(?:ingreso|gasto) recurrente/i.test(description)
 );
 const isStripe = Boolean(
  transaction.paymentMethod === 'stripe' ||
  transaction.stripeCheckoutSessionId ||
  transaction.stripeInvoiceId ||
  transaction.id.startsWith('tx_stripe_') ||
  transaction.id.startsWith('tx_auto_stripe_')
 );
 const isCash = transaction.paymentMethod === 'cash';
 const isTransfer = transaction.paymentMethod === 'transfer';
 const isCard = transaction.paymentMethod === 'card';
 const baseClass = 'grid h-7 w-7 place-items-center rounded-lg border transition-colors';
 const inactiveClass = 'border-white/[0.05] bg-white/[0.025] text-slate-700';

 const stripeMark = (
  <span
   className={`${baseClass} ${isStripe ? 'border-[#635bff]/35 bg-[#635bff]/15' : inactiveClass}`}
   title={isStripe ? 'Movimiento procesado por Stripe' : 'Sin origen Stripe'}
   aria-label={isStripe ? 'Stripe activo' : 'Stripe inactivo'}
  >
   <img
    src="/stripe-mark.png"
    alt=""
    className={`h-4 w-4 rounded-[4px] transition ${isStripe ? 'opacity-100' : 'grayscale opacity-20'}`}
   />
  </span>
 );

 return (
  <div className="inline-grid grid-cols-6 gap-1 rounded-xl border border-white/[0.05] bg-black/20 p-1" aria-label="Origen del movimiento">
   <span className={`${baseClass} ${hasCommercial ? 'border-amber-400/25 bg-amber-400/10 text-amber-300' : inactiveClass}`} title={hasCommercial ? 'Procede de un comercial' : 'Sin comercial'} aria-label={hasCommercial ? 'Comercial activo' : 'Comercial inactivo'}>
    <Briefcase className="h-3.5 w-3.5" />
   </span>
   <span className={`${baseClass} ${isRecurring ? 'border-violet-400/25 bg-violet-400/10 text-violet-300' : inactiveClass}`} title={isRecurring ? 'Movimiento recurrente' : 'No recurrente'} aria-label={isRecurring ? 'Recurrente activo' : 'Recurrente inactivo'}>
    <Repeat className="h-3.5 w-3.5" />
   </span>
   {isStripe && stripeDashboardUrl ? (
    <a href={stripeDashboardUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} title="Abrir en Stripe">
     {stripeMark}
    </a>
   ) : stripeMark}
   <span className={`${baseClass} ${isCard ? 'border-blue-400/25 bg-blue-400/10 text-blue-300' : inactiveClass}`} title={isCard ? 'Pago con tarjeta' : 'Sin pago con tarjeta'} aria-label={isCard ? 'Tarjeta activa' : 'Tarjeta inactiva'}>
    <CreditCard className="h-3.5 w-3.5" />
   </span>
   <span className={`${baseClass} ${isCash ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : inactiveClass}`} title={isCash ? 'Pago en efectivo' : 'No pagado en efectivo'} aria-label={isCash ? 'Efectivo activo' : 'Efectivo inactivo'}>
    <Banknote className="h-3.5 w-3.5" />
   </span>
   <span className={`${baseClass} ${isTransfer ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300' : inactiveClass}`} title={isTransfer ? 'Pago por transferencia' : 'Sin transferencia'} aria-label={isTransfer ? 'Transferencia activa' : 'Transferencia inactiva'}>
    <Landmark className="h-3.5 w-3.5" />
   </span>
  </div>
 );
});

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

function getNextPaymentDate(startDateStr: string, period?: string): string {
 const nextDate = getNextFinanceRecurrenceDate({
  id: 'preview',
  type: 'income',
  category: '',
  amount: 0,
  date: startDateStr,
  description: '',
  isRecurring: true,
  recurrencePeriod: (period || 'monthly') as FinanceTransaction['recurrencePeriod'],
  status: 'paid'
 });
 if (!nextDate) return 'N/A';
 
 return nextDate.toLocaleDateString('es-ES', { 
 year: 'numeric', 
 month: 'long', 
 day: 'numeric' 
 });
}

const getRecurringLastPaymentDate = (transaction: FinanceTransaction): string | null => {
 if (transaction.recurrenceEndDate) {
  return parseFinanceDate(transaction.recurrenceEndDate)?.toLocaleDateString('es-ES') || transaction.recurrenceEndDate;
 }
 const count = Number(transaction.recurrenceOccurrenceCount || 0);
 const start = parseFinanceDate(transaction.date);
 if (!start || count < 1) return null;
 return getFinanceRecurrenceDate(start, transaction.recurrencePeriod, count - 1).toLocaleDateString('es-ES');
};

const parseFinanceDate = (value?: string): Date | null => {
 if (!value) return null;
 const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
 const parsed = isoDate
  ? new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]), 12)
  : new Date(value);
 return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const getMonthKey = (date: Date): string =>
 `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getFinanceDateKey = (value?: string): string => {
 const parsed = parseFinanceDate(value);
 if (!parsed) return '';
 return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};

const formatStripeFundAmounts = (amounts: StripeFundAmount[] = []): string => {
 if (amounts.length === 0) return '0,00 €';
 return amounts.map(item => new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: item.currency.toUpperCase()
 }).format(item.amount)).join(' · ');
};

const formatStripeCurrency = (amount: number, currency = 'eur'): string => new Intl.NumberFormat('es-ES', {
 style: 'currency',
 currency: currency.toUpperCase(),
}).format(amount);

const formatStripeInterval = (interval: string, intervalCount = 1): string => {
 const names: Record<string, string> = { day: 'día', week: 'semana', month: 'mes', year: 'año' };
 const unit = names[interval] || interval;
 return intervalCount > 1 ? `${intervalCount} ${unit}${unit.endsWith('s') ? '' : 's'}` : unit;
};

const getRecurringIncomeOccurrences = (transaction: FinanceTransaction, monthKey: string): Date[] => {
 const start = parseFinanceDate(transaction.date);
 if (!start || !transaction.isRecurring || transaction.type !== 'income') return [];
 const [year, month] = monthKey.split('-').map(Number);
 const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
 const monthEnd = new Date(year, month, 1, 0, 0, 0, 0);
 const occurrences: Date[] = [];
 for (let index = 0; index < 10_000; index += 1) {
  const occurrence = getFinanceRecurrenceDate(start, transaction.recurrencePeriod, index);
  if (!isFinanceRecurrenceOccurrenceAllowed(transaction, index, occurrence)) break;
  if (occurrence >= monthEnd) break;
  if (occurrence >= monthStart) occurrences.push(occurrence);
 }
 return occurrences;
};

const INITIAL_INVOICES: Invoice[] = [];

const DEFAULT_INVOICE_ISSUER = {
 name: 'Carlos Ronco Meneses',
 taxId: '09104663K',
 address: 'Carrer dels Tamarells 1, 07800 - Ibiza, España',
 brand: 'Althera Solutions',
 email: 'contacto@altherasolutions.com'
};

const isConfirmedStripePayment = (transaction: FinanceTransaction) => {
 const transactionId = String(transaction.id || '').toLowerCase();
 const sessionId = String(transaction.stripeCheckoutSessionId || '').toLowerCase();
 const hasStripeOrigin = transaction.paymentMethod === 'stripe' || transactionId.startsWith('tx_stripe_');
 const hasStripeConfirmation = Boolean(transaction.stripeInvoiceId || transaction.stripeCheckoutSessionId || transactionId.startsWith('tx_stripe_'));
 const isSimulated = sessionId.includes('mock') || transactionId.includes('mock');

 return transaction.type === 'income'
  && transaction.status === 'paid'
  && hasStripeOrigin
  && hasStripeConfirmation
  && !isSimulated;
};

const getInvoiceCardStyles = (color: string | undefined) => {
 switch (color?.toLowerCase()) {
 case 'indigo':
  return {
  bg: 'bg-indigo-950/15 border-indigo-500/15 hover:border-indigo-500/40 hover:shadow-indigo-500/[0.02]',
  accent: 'text-indigo-400',
  badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  dot: 'bg-indigo-400'
  };
 case 'emerald':
  return {
  bg: 'bg-emerald-950/15 border-emerald-500/15 hover:border-emerald-500/40 hover:shadow-emerald-500/[0.02]',
  accent: 'text-emerald-400',
  badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  dot: 'bg-emerald-400'
  };
 case 'amber':
  return {
  bg: 'bg-amber-950/15 border-amber-500/15 hover:border-amber-500/40 hover:shadow-amber-500/[0.02]',
  accent: 'text-amber-400',
  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  dot: 'bg-amber-400'
  };
 case 'rose':
  return {
  bg: 'bg-rose-950/15 border-rose-500/15 hover:border-rose-500/40 hover:shadow-rose-500/[0.02]',
  accent: 'text-rose-400',
  badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  dot: 'bg-rose-400'
  };
 case 'violet':
  return {
  bg: 'bg-violet-950/15 border-violet-500/15 hover:border-violet-500/40 hover:shadow-violet-500/[0.02]',
  accent: 'text-violet-400',
  badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  dot: 'bg-violet-400'
  };
 default:
  return {
  bg: 'bg-[#0b1329]/20 border-white/5 hover:border-blue-500/30 hover:shadow-blue-500/[0.01]',
  accent: 'text-blue-400',
  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  dot: 'bg-blue-400'
  };
 }
};

export default function FinanceScreen({ contacts, onNavigate, comercialesList = [], onRefreshFinance }: FinanceScreenProps) {
 const rankableComercialesList = getRankableCommercials(comercialesList);
 // Navigation tabs: 'transactions' | 'forecast' | 'recurring' | 'invoices' | 'stripe' | 'comerciales'
 const [activeTab, setActiveTab] = useState<'transactions' | 'forecast' | 'recurring' | 'invoices' | 'stripe' | 'comerciales'>('transactions');
 const [forecastMonth, setForecastMonth] = useState(() => {
  const nextMonth = new Date();
  nextMonth.setDate(1);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return getMonthKey(nextMonth);
 });

 // Dynamic Stripe link states for recurring transaction cards
 const [activeRecStripeUrl, setActiveRecStripeUrl] = useState<{[txId: string]: string}>({});
 const [recStripeLoading, setRecStripeLoading] = useState<{[txId: string]: boolean}>({});

 const handleGenerateStripeForRecurring = async (item: FinanceTransaction) => {
 setRecStripeLoading(prev => ({ ...prev, [item.id]: true }));
 try {
  // Find matching contact or default
  const descLower = item.description.toLowerCase();
  const matchedContact = contacts.find(c => 
  descLower.includes(c.name.toLowerCase()) || 
  (c.company && descLower.includes(c.company.toLowerCase()))
  ) || contacts[0];

  const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json',
  },
  body: JSON.stringify({
   clientId: matchedContact?.id || 'simulated',
   clientName: matchedContact?.name || 'Cliente Recurrente',
   clientEmail: matchedContact?.email || 'cliente@recurrente.com',
   amount: item.amount.toString(),
   interval: (item.recurrencePeriod as any) === 'weekly' || (item.recurrencePeriod as any) === 'semanal' ? 'week' : 'month',
   pendingTxId: item.id,
   stripePlanId: item.stripePlanId || `recurring_${item.id}`,
   }),
  });

  const data = await readStripeJson(response);
  if (!response.ok) throw new Error(data.error || 'Stripe Error');
  const updatedItem = { ...item, stripeCheckoutUrl: data.url, stripeCheckoutSessionId: data.sessionId };
  await db.updateFinanceTransaction(updatedItem);
  setTransactions(prev => prev.map(t => t.id === item.id ? updatedItem : t));
  setActiveRecStripeUrl(prev => ({ ...prev, [item.id]: data.url }));
 } catch (err) {
  console.warn("Stripe key missing or error, generating simulated recurring checkout URL", err);
  // Fallback simulated Stripe subscription link
  const descLower = item.description.toLowerCase();
  const matchedContact = contacts.find(c => 
  descLower.includes(c.name.toLowerCase()) || 
  (c.company && descLower.includes(c.company.toLowerCase()))
  ) || contacts[0];

  const period = (item.recurrencePeriod as any) === 'weekly' || (item.recurrencePeriod as any) === 'semanal' ? 'week' : 'month';
  const simulatedUrl = `${window.location.origin}?stripe_status=success&client_id=${matchedContact?.id || 'c2'}&amount=${item.amount}&interval=${period}&stripe_session_id=cs_test_mock_${item.id}&simulated=true`;
  const updatedItem = { ...item, stripeCheckoutUrl: simulatedUrl, stripeCheckoutSessionId: `cs_test_mock_${item.id}` };
  try {
  await db.updateFinanceTransaction(updatedItem);
  setTransactions(prev => prev.map(t => t.id === item.id ? updatedItem : t));
  } catch (saveErr) {
  console.error('Could not persist recurring Stripe URL', saveErr);
  }
  setActiveRecStripeUrl(prev => ({ ...prev, [item.id]: simulatedUrl }));
 } finally {
  setRecStripeLoading(prev => ({ ...prev, [item.id]: false }));
 }
 };

 // Stripe Integration Screen States
 const [stripeClientId, setStripeClientId] = useState('');
 const [stripeGenAmount, setStripeGenAmount] = useState('50');
 const [stripeGenInterval, setStripeGenInterval] = useState<'month' | 'year' | 'once'>('month');
 const [stripeGenLoading, setStripeGenLoading] = useState(false);
 const [stripeGenUrl, setStripeGenUrl] = useState('');
 const [stripeGenCopied, setStripeGenCopied] = useState(false);
 const [stripeGenError, setStripeGenError] = useState('');
 const [stripePortalLoading, setStripePortalLoading] = useState<string | null>(null);
 const [stripeOverviewByClient, setStripeOverviewByClient] = useState<Record<string, any>>({});
 const [stripeOverviewLoading, setStripeOverviewLoading] = useState<string | null>(null);
 const [stripeCancelLoading, setStripeCancelLoading] = useState<string | null>(null);
 const [locallyCanceledSubscriptionIds, setLocallyCanceledSubscriptionIds] = useState<string[]>([]);
 const [stripeOverviewError, setStripeOverviewError] = useState('');

 const handleCreateFinanceStripeCheckout = async () => {
 if (!stripeClientId) {
  setStripeGenError('Por favor selecciona un cliente.');
  return;
 }
 const client = contacts.find(c => c.id === stripeClientId);
 if (!client) {
  setStripeGenError('El cliente seleccionado no existe.');
  return;
 }
 if (!client.email) {
  setStripeGenError('El cliente seleccionado debe tener un email registrado para configurar Stripe.');
  return;
 }
 setStripeGenLoading(true);
 setStripeGenError('');
 setStripeGenUrl('');
 setStripeGenCopied(false);
 try {
  const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json',
  },
  body: JSON.stringify({
   clientId: client.id,
   clientName: client.name,
   clientEmail: client.email,
   amount: stripeGenAmount,
   interval: stripeGenInterval,
  }),
  });

  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'Error al generar la sesión de Stripe');
  }

  setStripeGenUrl(data.url);
 } catch (err: any) {
  console.error(err);
  const simulatedSessionId = `cs_test_mock_finance_${client.id}_${Date.now()}`;
  const simulatedUrl = `${window.location.origin}?stripe_status=success&client_id=${client.id}&amount=${stripeGenAmount}&interval=${stripeGenInterval}&stripe_session_id=${simulatedSessionId}&simulated=true`;
  setStripeGenUrl(simulatedUrl);
  setStripeGenError('Backend Stripe no disponible: se ha generado un enlace simulado para pruebas.');
 } finally {
  setStripeGenLoading(false);
 }
 };

 const handleOpenFinanceStripePortal = async (stripeCustomerId: string, contactId: string) => {
 setStripePortalLoading(contactId);
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
  alert(err?.message || 'No se pudo abrir el portal de facturación.');
 } finally {
  setStripePortalLoading(null);
 }
 };

 const handleLoadFinanceStripeOverview = async (client: ClientContact) => {
 if (stripeOverviewByClient[client.id]) {
  setStripeOverviewByClient(prev => {
  const next = { ...prev };
  delete next[client.id];
  return next;
  });
  return;
 }

 setStripeOverviewLoading(client.id);
 setStripeOverviewError('');
 try {
  const response = await authenticatedFetch('/api/stripe/customer-overview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
   customerId: client.stripeCustomerId || '',
   subscriptionId: client.stripeSubscriptionId || '',
   email: client.email || '',
  }),
  });
  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'No se pudo consultar Stripe');
  }
  setStripeOverviewByClient(prev => ({ ...prev, [client.id]: data }));
 } catch (err: any) {
  setStripeOverviewError(err?.message || 'No se pudo consultar Stripe.');
 } finally {
  setStripeOverviewLoading(null);
 }
 };

 const handleCancelFinanceSubscription = async (client: ClientContact, subscriptionId: string) => {
 const ok = safeConfirm(`¿Seguro que quieres cancelar la suscripción Stripe de ${client.name}? Esta acción detendrá los próximos cobros.`);
 if (!ok) return;

 setStripeCancelLoading(subscriptionId);
 setStripeOverviewError('');
 try {
  const response = await authenticatedFetch('/api/stripe/cancel-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ subscriptionId }),
  });
  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'No se pudo cancelar la suscripción');
  }

  const updatedClient: ClientContact = {
  ...client,
  stripeSubscriptionStatus: 'canceled'
  };
  await db.updateContact(updatedClient);
  setLocallyCanceledSubscriptionIds(prev => prev.includes(subscriptionId) ? prev : [...prev, subscriptionId]);
  setStripeOverviewByClient(prev => {
  const overview = prev[client.id];
  if (!overview) return prev;
  return {
   ...prev,
   [client.id]: {
   ...overview,
   subscriptions: (overview.subscriptions || []).map((sub: any) =>
    sub.id === subscriptionId ? { ...sub, status: data.status || 'canceled', canceledAt: data.canceledAt } : sub
   )
   }
  };
  });
 } catch (err: any) {
  setStripeOverviewError(err?.message || 'No se pudo cancelar la suscripción.');
 } finally {
  setStripeCancelLoading(null);
 }
 };

 const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error' | 'offline'>('syncing');
 const [syncError, setSyncError] = useState<string | null>(null);
 const [showMonthlyCloseReport, setShowMonthlyCloseReport] = useState(false);
 const [analyticsRange, setAnalyticsRange] = useState<'month' | 'all'>('month');
 const [stripeFunds, setStripeFunds] = useState<StripeFunds | null>(null);
 const [stripeFundsLoading, setStripeFundsLoading] = useState(false);
 const [stripeFundsError, setStripeFundsError] = useState('');
 const [stripeFinanceOverview, setStripeFinanceOverview] = useState<StripeFinanceOverview | null>(null);
 const [stripeFinanceLoading, setStripeFinanceLoading] = useState(false);
 const [stripeFinanceError, setStripeFinanceError] = useState('');

 // Transactions local state
 const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);

 // Invoices local state
 const [invoices, setInvoices] = useState<Invoice[]>([]);

 // Fetch real-time Supabase entries on mount
 useEffect(() => {
 let active = true;
 async function fetchDatabaseFinanceData() {
  try {
  setSyncStatus('syncing');
  const [initialTxs, dbInvs] = await Promise.all([
   db.getFinanceTransactions(),
   db.getFinanceInvoices()
  ]);
  let dbTxs = initialTxs;
  try {
   const recurrenceResult = await db.materializeDueRecurringFinanceTransactions(initialTxs);
   if (recurrenceResult.attempted > 0) dbTxs = await db.getFinanceTransactions();
  } catch (recurrenceError) {
   console.warn('Recurring finance materialization failed:', recurrenceError);
  }
  if (active) {
   // Sync state directly from Supabase, even if empty (so it clears any old mock local storage)
   setTransactions(dbTxs || []);
   setInvoices(dbInvs || []);
   setSyncStatus('synced');
   setSyncError(null);
  }
  } catch (err: any) {
  console.warn('Real-time database fetch error:', err);
  if (active) {
   setSyncStatus('error');
   setSyncError(err?.message || String(err));
  }
  }
  }
  fetchDatabaseFinanceData();
  const financeChannel = supabase
   .channel('finance-screen-live-sync')
   .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transactions' }, () => {
    invalidateSharedPipelineCache(['finance_transactions']);
    void fetchDatabaseFinanceData();
   })
   .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_invoices' }, () => {
    invalidateSharedPipelineCache(['finance_invoices']);
    void fetchDatabaseFinanceData();
   })
   .subscribe(status => {
    if (status === 'CHANNEL_ERROR' && active) {
     setSyncStatus('error');
     setSyncError('La sincronización en directo no está disponible; se mantiene la actualización automática.');
    }
   });
  const refreshTimer = window.setInterval(fetchDatabaseFinanceData, 15000);
  const refreshWhenVisible = () => {
   if (document.visibilityState === 'visible') fetchDatabaseFinanceData();
  };
  const refreshWhenInvoiceChanges = () => fetchDatabaseFinanceData();
  document.addEventListener('visibilitychange', refreshWhenVisible);
  window.addEventListener('finance-invoices-updated', refreshWhenInvoiceChanges);
  return () => {
   active = false;
   void supabase.removeChannel(financeChannel);
   window.clearInterval(refreshTimer);
   document.removeEventListener('visibilitychange', refreshWhenVisible);
   window.removeEventListener('finance-invoices-updated', refreshWhenInvoiceChanges);
  };
 }, []);

 const refreshStripeFunds = async () => {
  setStripeFundsLoading(true);
  setStripeFundsError('');
  try {
   const response = await authenticatedFetch('/api/stripe/balance', { cache: 'no-store' });
   const data = await readStripeJson(response);
   if (!response.ok) throw new Error(data.error || 'No se pudieron consultar los fondos de Stripe.');
   setStripeFunds(data);
  } catch (error: any) {
   setStripeFundsError(error?.message || 'No se pudieron consultar los fondos de Stripe.');
  } finally {
   setStripeFundsLoading(false);
  }
 };

 const refreshStripeFinanceOverview = async () => {
 setStripeFinanceLoading(true);
 setStripeFinanceError('');
 try {
  // Reconcile delayed webhooks first. This prevents a successful Stripe charge
  // from remaining visually pending in the local ledger.
  const reconciliation = await authenticatedFetch('/api/stripe/reconcile-finance', { method: 'POST' });
  if (reconciliation.ok) {
   invalidateSharedPipelineCache(['finance_transactions']);
   setTransactions(await db.getFinanceTransactions());
  }
  const response = await authenticatedFetch('/api/stripe/finance-overview', { cache: 'no-store' });
   const data = await readStripeJson(response);
   if (!response.ok) throw new Error(data.error || 'No se pudo consultar la información real de Stripe.');
   setStripeFinanceOverview(data);
  } catch (error: any) {
   setStripeFinanceError(error?.message || 'No se pudo consultar la información real de Stripe.');
  } finally {
   setStripeFinanceLoading(false);
  }
 };

 const handleSetStripeFinalChargeDate = async (subscription: StripeAccountSubscription) => {
  const finalChargeDate = window.prompt('Último cobro de esta suscripción (AAAA-MM-DD):', subscription.endsAt ? subscription.endsAt.slice(0, 10) : '2026-09-14');
  if (!finalChargeDate) return;
  try {
   const response = await authenticatedFetch(`/api/stripe/subscriptions/${subscription.id}/final-charge-date`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finalChargeDate }) });
   const data = await readStripeJson(response);
   if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la suscripción.');
   showToast(`Último cobro programado para el ${new Date(`${finalChargeDate}T12:00:00`).toLocaleDateString('es-ES')}.`);
   await refreshStripeFinanceOverview();
  } catch (error: any) { showToast(error?.message || 'No se pudo actualizar la suscripción.', true); }
 };

 useEffect(() => {
  void refreshStripeFunds();
  const stripeFundsTimer = window.setInterval(refreshStripeFunds, 60000);
  return () => window.clearInterval(stripeFundsTimer);
 }, []);

 useEffect(() => {
  if (activeTab !== 'stripe' && activeTab !== 'recurring' && activeTab !== 'transactions') return;
  void refreshStripeFinanceOverview();
  const stripeOverviewTimer = window.setInterval(refreshStripeFinanceOverview, 60_000);
  return () => window.clearInterval(stripeOverviewTimer);
 }, [activeTab]);

 // Filters
 const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
 const [txCategoryFilter, setTxCategoryFilter] = useState<string>('All');
 const [txDateRangeFilter, setTxDateRangeFilter] = useState<'all' | 'today' | 'week'>('all');
 const [showExportPanel, setShowExportPanel] = useState(false);
 const [exportType, setExportType] = useState<'all' | 'income' | 'expense'>('all');
 const [exportPeriod, setExportPeriod] = useState<'all' | 'month' | 'date'>('all');
 const [exportMonth, setExportMonth] = useState(() => getMonthKey(new Date()));
 const [exportDate, setExportDate] = useState(() => new Date().toISOString().slice(0, 10));
 const [exportLoading, setExportLoading] = useState(false);
 const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');
 const [invoiceDueFilter, setInvoiceDueFilter] = useState<'all' | 'today' | 'week'>('all');
 const [adminMessage, setAdminMessage] = useState('');
 const [adminMessages, setAdminMessages] = useState<{ id: string; text: string; time: string }[]>([]);
 const [revolutOpeningBalance, setRevolutOpeningBalance] = useState(() => {
  const stored = localStorage.getItem('althera-revolut-opening');
  return stored === null || Number(stored) === 0 ? 1345.66 : Number(stored);
 });
 const [financeGoals, setFinanceGoals] = useState(() => {
  try { return JSON.parse(localStorage.getItem('althera-finance-goals') || '{"weekRevenue":0,"monthRevenue":0,"monthWebsites":0,"reward":""}'); }
  catch { return { weekRevenue: 0, monthRevenue: 0, monthWebsites: 0, reward: '' }; }
 });
 useEffect(() => { localStorage.setItem('althera-revolut-opening', String(revolutOpeningBalance)); }, [revolutOpeningBalance]);
 useEffect(() => { localStorage.setItem('althera-finance-goals', JSON.stringify(financeGoals)); }, [financeGoals]);

 // Active list searches
 const [txSearch, setTxSearch] = useState('');
 const [txCurrentPage, setTxCurrentPage] = useState(1);
 const [invSearch, setInvSearch] = useState('');

 // TRANSACTION MODAL controls
 const [isTxModalOpen, setIsTxModalOpen] = useState(false);
 const [isEditingTx, setIsEditingTx] = useState(false);
 const [editingTxId, setEditingTxId] = useState<string | null>(null);

 // Transaction form states
 const [txType, setTxType] = useState<'income' | 'expense'>('income');
 const [txCategory, setTxCategory] = useState('Desarrollo');
 const [txAmount, setTxAmount] = useState('');
 const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
 const [txDescription, setTxDescription] = useState('');
 const [txIsRecurring, setTxIsRecurring] = useState(false);
 const [txPeriod, setTxPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
 const [txStatus, setTxStatus] = useState<'paid' | 'pending'>('paid');
 const [txInvoiceId, setTxInvoiceId] = useState<string>('');
 const [txPaymentMethod, setTxPaymentMethod] = useState<'cash' | 'transfer' | 'card' | undefined>(undefined);
 const [txPaymentAccount, setTxPaymentAccount] = useState<FinanceTransaction['paymentAccount']>(undefined);
 const [txFirstAmount, setTxFirstAmount] = useState('');
 const [txNextAmount, setTxNextAmount] = useState('');
 const [txRecurrenceCount, setTxRecurrenceCount] = useState('');
 const [txRecurrenceEndDate, setTxRecurrenceEndDate] = useState('');

 // INVOICE MODAL controls
 const [isInvModalOpen, setIsInvModalOpen] = useState(false);
 const [isEditingInv, setIsEditingInv] = useState(false);
 const [editingInvId, setEditingInvId] = useState<string | null>(null);
 const [originatingTxId, setOriginatingTxId] = useState<string | null>(null);
 const [selectedTxIdsForInvoice, setSelectedTxIdsForInvoice] = useState<string[]>([]);

 // Invoice view preview modal controls
 const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

 useEffect(() => {
  if (!previewInvoice) return;
  const handlePreviewEscape = (event: KeyboardEvent) => {
   if (event.key === 'Escape') setPreviewInvoice(null);
  };
  document.addEventListener('keydown', handlePreviewEscape);
  return () => document.removeEventListener('keydown', handlePreviewEscape);
 }, [previewInvoice]);

 // Invoice form states
 const [invClientId, setInvClientId] = useState('');
 const [invClientName, setInvClientName] = useState('');
 const [invClientEmail, setInvClientEmail] = useState('');
 const [invClientTaxId, setInvClientTaxId] = useState('');
 const [invClientAddress, setInvClientAddress] = useState('');
 const [invIssuerName, setInvIssuerName] = useState(DEFAULT_INVOICE_ISSUER.name);
 const [invIssuerTaxId, setInvIssuerTaxId] = useState(DEFAULT_INVOICE_ISSUER.taxId);
 const [invIssuerAddress, setInvIssuerAddress] = useState(DEFAULT_INVOICE_ISSUER.address);
 const [invIssuerBrand, setInvIssuerBrand] = useState(DEFAULT_INVOICE_ISSUER.brand);
 const [invIssuerEmail, setInvIssuerEmail] = useState(DEFAULT_INVOICE_ISSUER.email);
 const [invDate, setInvDate] = useState(() => new Date().toISOString().split('T')[0]);
 const [invDueDate, setInvDueDate] = useState(() => {
 const d = new Date();
 d.setDate(d.getDate() + 30);
 return d.toISOString().split('T')[0];
 });
 const [invStatus, setInvStatus] = useState<Invoice['status']>('draft');
 const [invNotes, setInvNotes] = useState('');
 const [invItems, setInvItems] = useState<InvoiceItem[]>([
 { id: 'temp1', description: '', quantity: 1, unitPrice: 0, total: 0 }
 ]);
 const [invTaxPercentage, setInvTaxPercentage] = useState<number>(21);
 const [invAlias, setInvAlias] = useState('');
 const [invColor, setInvColor] = useState('');
 const [invCurrency, setInvCurrency] = useState<NonNullable<Invoice['currency']>>('EUR');
 const [invLanguage, setInvLanguage] = useState<NonNullable<Invoice['language']>>('es');

 // Banking defaults matching Revolut and Ibiza specs
 const [paymentDetails, setPaymentDetails] = useState('IE84 REVO 9903 6065 8046 06');
 const [bankBeneficiary, setBankBeneficiary] = useState('Ignacio Martin Gonzalez');
 const [bankSwift, setBankSwift] = useState('REVOIE23');
 const [bankNameAddress, setBankNameAddress] = useState('Revolut Bank UAB, 2 Dublin Landings, North Dock, Dublin 1, D01 V4A3, Ireland');
 const [bankCorrespondentBic, setBankCorrespondentBic] = useState('CHASDEFX');

 // Check for preselected client from CRM screen to auto-create invoice
 useEffect(() => {
 const client = peekInvoicePrefill();
 if (client) {
  try {
  if (client && client.id) {
   const requestedTransactionIds = Array.isArray(client.transactionIds) ? client.transactionIds.filter(Boolean) : [];
   if (requestedTransactionIds.length > 0 && transactions.length === 0) return;
   const requestedTransactions = requestedTransactionIds
    .map((id: string) => transactions.find(transaction => transaction.id === id))
    .filter(Boolean) as FinanceTransaction[];
   const matchedContact = contacts.find(contact => contact.id === client.id);
   const previousInvoice = invoices.find(invoice =>
    invoice.clientId === client.id ||
    (!!matchedContact?.email && invoice.clientEmail?.toLowerCase() === matchedContact.email.toLowerCase()) ||
    (!!matchedContact?.name && invoice.clientName?.toLowerCase() === matchedContact.name.toLowerCase())
   );
   const taxPercentage = Number(client.taxPercentage ?? matchedContact?.taxPercentage ?? 21);
   setInvClientId(client.id);
   setInvClientName(matchedContact?.fiscalName || client.name || matchedContact?.name || '');
   setInvClientEmail(client.email || matchedContact?.email || previousInvoice?.clientEmail || '');
   setInvClientTaxId(client.taxId || matchedContact?.taxId || previousInvoice?.clientTaxId || '');
   setInvClientAddress(client.address || matchedContact?.fiscalAddress || previousInvoice?.clientAddress || matchedContact?.location || '');
   setInvCurrency(client.currency || matchedContact?.currency || previousInvoice?.currency || 'EUR');
   setInvLanguage(client.language || matchedContact?.language || previousInvoice?.language || 'es');
   setInvTaxPercentage(taxPercentage);
   setInvIssuerName(DEFAULT_INVOICE_ISSUER.name);
   setInvIssuerTaxId(DEFAULT_INVOICE_ISSUER.taxId);
   setInvIssuerAddress(DEFAULT_INVOICE_ISSUER.address);
   setInvIssuerBrand(DEFAULT_INVOICE_ISSUER.brand);
   setInvIssuerEmail(DEFAULT_INVOICE_ISSUER.email);
   setInvDate(new Date().toISOString().split('T')[0]);
   const d = new Date();
   d.setDate(d.getDate() + 15);
   setInvDueDate(d.toISOString().split('T')[0]);
   setInvStatus(requestedTransactions.length > 0 && requestedTransactions.every(tx => tx.status === 'paid') ? 'paid' : 'sent');
   setInvItems(requestedTransactions.length > 0
    ? requestedTransactions.map(tx => {
     const netPrice = Number((tx.amount / (1 + taxPercentage / 100)).toFixed(2));
     return {
      id: `item_${tx.id}`,
      description: tx.description,
      quantity: 1,
      unitPrice: netPrice,
      total: netPrice,
      grossAmount: tx.amount,
      isPending: tx.status !== 'paid',
      pendingTxId: tx.id,
      paymentMethod: tx.paymentMethod || 'transfer'
     };
    })
    : [{ id: 'temp1', description: 'Servicios de consultoría / desarrollo', quantity: 1, unitPrice: 0, total: 0 }]);
   setSelectedTxIdsForInvoice(requestedTransactions.map(tx => tx.id));
   setOriginatingTxId(requestedTransactions[0]?.id || null);
   setIsEditingInv(false);
   setEditingInvId(null);
   setActiveTab('invoices');
   setIsInvModalOpen(true);
   clearInvoicePrefill();
  }
  } catch (err) {
  console.error('Error parsing preselected client for invoice:', err);
  clearInvoicePrefill();
  }
 }
 }, [contacts, transactions, invoices]);

 // Reset pagination on search/filter changes
 useEffect(() => {
 setTxCurrentPage(1);
 }, [txSearch, txTypeFilter, txCategoryFilter]);

 // Helper to discover if a transaction has a matching created invoice
 const getLinkedInvoice = (tx: FinanceTransaction): Invoice | undefined => {
 if (tx.invoiceId) {
  const matchKey = invoices.find(inv => inv.id === tx.invoiceId);
  if (matchKey) return matchKey;
 }
 // Deep fallback search: search invoice list to see if invoice ID matches transaction description, or transaction ID is stored in invoice client notes
 return invoices.find(inv => 
  tx.description.toLowerCase().includes(inv.id.toLowerCase()) || 
  (inv.notes && inv.notes.toLowerCase().includes(tx.id.toLowerCase()))
 );
 };

 const showToast = (message: string, isError: boolean = false) => {
 const toast = document.getElementById('toast-msg');
 if (toast) {
  const span = toast.querySelector('span');
  if (span) {
  span.textContent = message;
  } else {
  toast.innerText = message;
  }
  
  if (isError) {
  toast.classList.add('border-rose-500/50');
  toast.classList.remove('border-violet-500/30', 'border-purple-500/30');
  } else {
  toast.classList.remove('border-rose-500/50');
  toast.classList.add('border-violet-500/30');
  }

  toast.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
  toast.classList.add('opacity-100');
  
  setTimeout(() => {
  toast.classList.add('opacity-0', 'pointer-events-none');
  toast.classList.remove('opacity-100');
  }, 3500);
 }
 };

 const handleExportTransactions = async () => {
  const exportTransactions = ledgerTransactions
   .filter(transaction => exportType === 'all' || transaction.type === exportType)
   .filter(transaction => {
    const dateKey = getTxDateKey(transaction);
    if (exportPeriod === 'month') return dateKey.startsWith(exportMonth);
    if (exportPeriod === 'date') return dateKey === exportDate;
    return true;
   })
   .sort((a, b) => `${b.date}_${b.id}`.localeCompare(`${a.date}_${a.id}`));

  if (exportTransactions.length === 0) {
   showToast('No hay movimientos que coincidan con los filtros de exportación.', true);
   return;
  }

  setExportLoading(true);
  try {
   const ExcelJS = await import('exceljs');
   const workbook = new ExcelJS.Workbook();
   workbook.creator = 'Althera Solutions';
   workbook.company = 'Althera Solutions';
   workbook.created = new Date();
   workbook.modified = new Date();
   workbook.calcProperties.fullCalcOnLoad = true;

   const transactionsSheet = workbook.addWorksheet('Transacciones', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }]
   });
   const summarySheet = workbook.addWorksheet('Resumen', {
    views: [{ showGridLines: false }]
   });

   const typeLabel = exportType === 'income' ? 'Solo ingresos' : exportType === 'expense' ? 'Solo gastos' : 'Todas las transacciones';
   const periodLabel = exportPeriod === 'month'
    ? new Date(`${exportMonth}-01T12:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : exportPeriod === 'date'
     ? new Date(`${exportDate}T12:00:00`).toLocaleDateString('es-ES')
     : 'Todo el histórico';

   summarySheet.mergeCells('A1:D2');
   summarySheet.getCell('A1').value = 'BITÁCORA FINANCIERA · ALTHERA SOLUTIONS';
   summarySheet.getCell('A1').font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
   summarySheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
   summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF071426' } };
   summarySheet.getRow(1).height = 26;
   summarySheet.getRow(2).height = 18;
   summarySheet.getColumn('A').width = 24;
   summarySheet.getColumn('B').width = 24;
   summarySheet.getColumn('C').width = 24;
   summarySheet.getColumn('D').width = 24;

   summarySheet.getCell('A4').value = 'Tipo exportado';
   summarySheet.getCell('B4').value = typeLabel;
   summarySheet.getCell('A5').value = 'Periodo';
   summarySheet.getCell('B5').value = periodLabel;
   summarySheet.getCell('A6').value = 'Generado';
   summarySheet.getCell('B6').value = new Date();
   summarySheet.getCell('B6').numFmt = 'dd/mm/yyyy hh:mm';
   for (let row = 4; row <= 6; row += 1) {
    summarySheet.getCell(row, 1).font = { bold: true, color: { argb: 'FF475569' } };
   }

   const lastTransactionRow = exportTransactions.length + 1;
   const exportedIncomeTotal = exportTransactions
    .filter(transaction => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
   const exportedExpenseTotal = exportTransactions
    .filter(transaction => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
   summarySheet.getCell('A9').value = 'MOVIMIENTOS';
   summarySheet.getCell('B9').value = 'INGRESOS';
   summarySheet.getCell('C9').value = 'GASTOS';
   summarySheet.getCell('D9').value = 'BALANCE NETO';
   summarySheet.getCell('A10').value = { formula: `COUNTA('Transacciones'!A2:A${lastTransactionRow})`, result: exportTransactions.length };
   summarySheet.getCell('B10').value = { formula: `SUMIF('Transacciones'!B2:B${lastTransactionRow},"Ingreso",'Transacciones'!G2:G${lastTransactionRow})`, result: exportedIncomeTotal };
   summarySheet.getCell('C10').value = { formula: `SUMIF('Transacciones'!B2:B${lastTransactionRow},"Gasto",'Transacciones'!G2:G${lastTransactionRow})`, result: exportedExpenseTotal };
   summarySheet.getCell('D10').value = { formula: 'B10-C10', result: exportedIncomeTotal - exportedExpenseTotal };
   summarySheet.getRow(9).eachCell({ includeEmpty: true }, cell => {
    cell.font = { bold: true, color: { argb: 'FFCBD5E1' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10233D' } };
    cell.alignment = { horizontal: 'center' };
   });
   summarySheet.getRow(10).eachCell({ includeEmpty: true }, cell => {
    cell.font = { bold: true, color: { argb: 'FF0F172A' }, size: 16 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    cell.alignment = { horizontal: 'center' };
   });
   summarySheet.getCell('A10').numFmt = '#,##0';
   for (let column = 2; column <= 4; column += 1) summarySheet.getCell(10, column).numFmt = '#,##0.00 [$€-es-ES]';
   for (let row = 9; row <= 10; row += 1) {
    for (let column = 1; column <= 4; column += 1) {
     summarySheet.getCell(row, column).border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    }
   }

   const transactionRows = exportTransactions.map(transaction => {
    const parsedDate = parseFinanceDate(transaction.date);
    const client = contacts.find(contact => contact.id === transaction.clientId);
    return [
     transaction.id,
     transaction.type === 'income' ? 'Ingreso' : 'Gasto',
     transaction.status === 'paid' ? 'Liquidado' : 'Pendiente',
     parsedDate || transaction.date,
     getCleanBillingConcept(transaction.description),
     transaction.category,
     Number(transaction.amount || 0),
     transaction.paymentMethod === 'stripe' ? 'Stripe' : transaction.paymentMethod === 'cash' ? 'Efectivo' : transaction.paymentMethod === 'transfer' ? 'Transferencia' : '',
     transaction.invoiceId || '',
     client?.name || transaction.clientId || '',
     transaction.stripeCheckoutSessionId || transaction.stripeInvoiceId || '',
     transaction.isInitialSale ? 'Sí' : 'No'
    ];
   });

   const transactionHeaders = [
    'ID',
    'Tipo',
    'Estado',
    'Fecha',
    'Concepto',
    'Categoría',
    'Importe (€)',
    'Método de pago',
    'Factura',
    'Cliente',
    'Referencia Stripe',
    'Venta inicial'
   ];
   transactionsSheet.addRow(transactionHeaders);
   transactionsSheet.addRows(transactionRows);
   transactionsSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: transactionRows.length + 1, column: transactionHeaders.length }
   };
   transactionsSheet.columns = [
    { width: 22 }, { width: 13 }, { width: 14 }, { width: 13 },
    { width: 46 }, { width: 22 }, { width: 16 }, { width: 20 },
    { width: 18 }, { width: 28 }, { width: 30 }, { width: 14 }
   ];
   transactionsSheet.getRow(1).height = 24;
   transactionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
   transactionsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
   transactionsSheet.getRow(1).alignment = { vertical: 'middle' };
   for (let rowNumber = 2; rowNumber <= transactionRows.length + 1; rowNumber += 1) {
    const row = transactionsSheet.getRow(rowNumber);
    row.height = 21;
    if (rowNumber % 2 === 0) {
     row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    }
    row.eachCell({ includeEmpty: true }, cell => {
     cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
     cell.alignment = { ...cell.alignment, vertical: 'middle' };
    });
   }
   transactionsSheet.getColumn(4).numFmt = 'dd/mm/yyyy';
   transactionsSheet.getColumn(7).numFmt = '#,##0.00 [$€-es-ES]';
   transactionsSheet.getColumn(7).alignment = { horizontal: 'right' };
   transactionsSheet.getColumn(5).alignment = { wrapText: true, vertical: 'top' };

   const buffer = await workbook.xlsx.writeBuffer();
   const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
   const downloadUrl = URL.createObjectURL(blob);
   const link = document.createElement('a');
   const periodSuffix = exportPeriod === 'month' ? exportMonth : exportPeriod === 'date' ? exportDate : 'historico';
   link.href = downloadUrl;
   link.download = `bitacora_althera_${exportType}_${periodSuffix}.xlsx`;
   document.body.appendChild(link);
   link.click();
   link.remove();
   URL.revokeObjectURL(downloadUrl);
   showToast(`Excel exportado con ${exportTransactions.length} movimientos.`);
  } catch (error) {
   console.error('Excel export error:', error);
   showToast('No se pudo generar el archivo Excel.', true);
  } finally {
   setExportLoading(false);
  }
 };

 // Calculations for transactions
 const ledgerTransactions = transactions.filter(transaction => !transaction.isRecurring);

 const analyticsMonthKey = getMonthKey(new Date());
 const analyticsTransactions = analyticsRange === 'month'
  ? ledgerTransactions.filter(transaction => getFinanceDateKey(transaction.date).startsWith(analyticsMonthKey))
  : ledgerTransactions;

 const totalIncomes = analyticsTransactions
 .filter(t => t.type === 'income')
 .reduce((sum, t) => sum + t.amount, 0);

 const totalExpenses = analyticsTransactions
 .filter(t => t.type === 'expense')
 .reduce((sum, t) => sum + t.amount, 0);

 const commercialSalaries = comercialesList
 .flatMap(com => com.payouts || [])
 .filter(p => p.status === 'completed' && (analyticsRange === 'all' || getFinanceDateKey(p.date).startsWith(analyticsMonthKey)))
 .reduce((sum, p) => sum + p.amount, 0);
 const extraCommissionsAccrued = comercialesList
 .flatMap(com => com.extraCommissions || [])
 .reduce((sum, extra) => sum + Number(extra.amount || 0), 0);

 const netProfit = totalIncomes - totalExpenses - commercialSalaries;

 // Cálculo de Saldos Consolidado y Pendiente según requerimiento
 const consolidatedIncomes = analyticsTransactions
 .filter(t => t.type === 'income' && t.status === 'paid')
 .reduce((sum, t) => sum + t.amount, 0);

 const consolidatedExpenses = analyticsTransactions
 .filter(t => t.type === 'expense' && t.status === 'paid')
 .reduce((sum, t) => sum + t.amount, 0);

 const consolidatedBalance = consolidatedIncomes;
 const netCashBalance = consolidatedIncomes - consolidatedExpenses - commercialSalaries;
 const revolutExpenses = transactions.filter(transaction => transaction.type === 'expense' && transaction.status === 'paid' && transaction.paymentAccount === 'revolut_pro').reduce((sum, transaction) => sum + transaction.amount, 0);
 // This is the reconciled balance shown by Revolut. Existing ledger expenses
 // are already reflected in it; only update the value on the next bank sync.
 const revolutBalance = revolutOpeningBalance;

 const pendingIncomes = analyticsTransactions
 .filter(t => t.type === 'income' && t.status === 'pending')
 .reduce((sum, t) => sum + t.amount, 0);

 const pendingExpenses = analyticsTransactions
 .filter(t => t.type === 'expense' && t.status === 'pending')
 .reduce((sum, t) => sum + t.amount, 0);

 const pendingBalance = pendingIncomes - pendingExpenses;
 const pendingIncomeItems = analyticsTransactions.filter(t => t.type === 'income' && t.status === 'pending');
 const pendingExpenseItems = analyticsTransactions.filter(t => t.type === 'expense' && t.status === 'pending');
 const todayFinanceKey = getFinanceDateKey(new Date().toISOString());
 const overdueCollections = pendingIncomeItems.filter(t => getFinanceDateKey(t.date) && getFinanceDateKey(t.date) < todayFinanceKey);
 const collectionRate = totalIncomes > 0 ? Math.round((consolidatedIncomes / totalIncomes) * 100) : 0;
 const nextCollection = [...pendingIncomeItems]
  .filter(t => getFinanceDateKey(t.date) >= todayFinanceKey)
  .sort((a, b) => a.date.localeCompare(b.date))[0];

 const getClientStripePaymentProgress = (client: ClientContact) => {
 const clientTxs = transactions.filter(tx => tx.clientId === client.id && isConfirmedStripePayment(tx));
 const installmentTxs = clientTxs.filter(tx => tx.stripeInstallmentCount && tx.stripeInstallmentCount > 1);

 if (installmentTxs.length > 0) {
  const totalInstallments = Math.max(...installmentTxs.map(tx => tx.stripeInstallmentCount || 0));
  const paidInstallments = new Set(
  installmentTxs
   .filter(tx => tx.status === 'paid')
   .map(tx => tx.stripeInstallmentIndex || tx.id)
  ).size;

  return `${paidInstallments}/${totalInstallments}`;
 }

 const overview = stripeOverviewByClient[client.id];
 const paidInvoices = overview?.invoices?.filter((inv: any) => inv.status === 'paid' || inv.paid).length || 0;
 const localPaidPayments = clientTxs.filter(tx => tx.type === 'income' && tx.status === 'paid').length;

 return String(Math.max(paidInvoices, localPaidPayments));
 };

 // Stripe-specific calculations for automation
 const activeSubs = contacts.filter(c =>
 c.stripeSubscriptionStatus === 'active' &&
 (!c.stripeSubscriptionId || !locallyCanceledSubscriptionIds.includes(c.stripeSubscriptionId))
 );
 const mrr = activeSubs.reduce((sum, c) => {
 const price = parseFloat(c.stripeSubscriptionPrice || '0');
 if (isNaN(price)) return sum;
 if (c.stripeSubscriptionInterval === 'year') {
  return sum + (price / 12);
 }
 return sum + price;
 }, 0);
 const stripeVolume = transactions
 .filter(isConfirmedStripePayment)
 .reduce((sum, t) => sum + (t.amount || 0), 0);
 const stripeTransactions = transactions.filter(isConfirmedStripePayment);

 const getClientStripeMoneySummary = (client: ClientContact) => {
 const clientTxs = transactions.filter(tx =>
  isConfirmedStripePayment(tx) &&
  tx.clientId === client.id
 );
 const localPaid = clientTxs.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + (tx.amount || 0), 0);
 const overview = stripeOverviewByClient[client.id];
 const stripePaid = overview?.totals?.paidInvoices || 0;
 const stripeOpen = overview?.totals?.openInvoices || 0;
 return {
  paid: Math.max(localPaid, stripePaid),
  open: stripeOpen,
 };
 };

 // Filter transaction categories
 const categories = ['All', ...Array.from(new Set(transactions.map(t => t.category)))];

 // Handler: Add or update transaction
 const handleSaveTransaction = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!txAmount || isNaN(Number(txAmount)) || Number(txAmount) <= 0) {
  alert('Por favor introduce un importe válido.');
  return;
 }

 if (txIsRecurring) {
  if (txFirstAmount && (isNaN(Number(txFirstAmount)) || Number(txFirstAmount) < 0)) {
  alert('Por favor introduce un importe de primer cargo válido.');
  return;
  }
  if (txNextAmount && (isNaN(Number(txNextAmount)) || Number(txNextAmount) < 0)) {
  alert('Por favor introduce un importe de siguientes cargos válido.');
  return;
  }
  if (txRecurrenceCount && (!Number.isInteger(Number(txRecurrenceCount)) || Number(txRecurrenceCount) < 1)) {
   alert('El número de cuotas debe ser un número entero mayor que cero.');
   return;
  }
 }

 const existingTransaction = isEditingTx && editingTxId ? transactions.find(transaction => transaction.id === editingTxId) : undefined;
 const selectedTransactionInvoice = txInvoiceId ? invoices.find(invoice => invoice.id === txInvoiceId) : undefined;
 const selectedInvoiceIsInitialSale = selectedTransactionInvoice
  ? (selectedTransactionInvoice.isInitialSale ?? Boolean(selectedTransactionInvoice.comercialId || selectedTransactionInvoice.comercialEmail))
  : existingTransaction?.isInitialSale;
 const payload: FinanceTransaction = {
  ...existingTransaction,
  id: isEditingTx && editingTxId ? editingTxId : 'tx_' + Date.now(),
  type: txType,
  category: txCategory.trim() || 'General',
  amount: txIsRecurring && txFirstAmount ? Math.abs(Number(txFirstAmount)) : Math.abs(Number(txAmount)),
  date: txDate || new Date().toISOString().split('T')[0],
  description: txDescription.trim() || `${txType === 'income' ? 'Ingreso' : 'Gasto'} registrado`,
  isRecurring: txIsRecurring,
  recurrencePeriod: txIsRecurring ? txPeriod : undefined,
  recurrenceEndDate: txIsRecurring ? (txRecurrenceEndDate || undefined) : undefined,
  recurrenceOccurrenceCount: txIsRecurring && txRecurrenceCount ? Number(txRecurrenceCount) : undefined,
  status: txStatus,
  invoiceId: txInvoiceId || undefined,
  paymentMethod: txPaymentMethod,
  paymentAccount: txPaymentAccount,
  firstAmount: txIsRecurring && txFirstAmount ? Math.abs(Number(txFirstAmount)) : undefined,
  nextAmount: txIsRecurring && txNextAmount ? Math.abs(Number(txNextAmount)) : undefined,
  comercialId: selectedTransactionInvoice?.comercialId || existingTransaction?.comercialId,
  comercialEmail: selectedTransactionInvoice?.comercialEmail || existingTransaction?.comercialEmail,
  isInitialSale: selectedInvoiceIsInitialSale,
 };

 try {
  if (isEditingTx && editingTxId) {
   await db.updateFinanceTransaction(payload);
   const updatedTransactions = transactions.map(t => t.id === editingTxId ? payload : t);
   setTransactions(updatedTransactions);
   if (payload.isRecurring) {
    try {
     const recurrenceResult = await db.materializeDueRecurringFinanceTransactions(updatedTransactions);
     if (recurrenceResult.attempted > 0) setTransactions(await db.getFinanceTransactions());
    } catch (recurrenceError) {
     console.warn('Recurring finance materialization failed after update:', recurrenceError);
    }
   }
   showToast(`Sincronizado: ${payload.type === 'income' ? 'Ingreso' : 'Gasto'} actualizado en Supabase.`);
  } else {
   await db.insertFinanceTransaction(payload);
   const updatedTransactions = [payload, ...transactions];
   setTransactions(updatedTransactions);
   if (payload.isRecurring) {
    try {
     const recurrenceResult = await db.materializeDueRecurringFinanceTransactions(updatedTransactions);
     if (recurrenceResult.attempted > 0) setTransactions(await db.getFinanceTransactions());
    } catch (recurrenceError) {
     console.warn('Recurring finance materialization failed after insert:', recurrenceError);
    }
   }
   showToast(`Sincronizado: ${payload.type === 'income' ? 'Ingreso' : 'Gasto'} guardado en Supabase.`);
  }
 } catch (err: any) {
   console.error('Error inserting transaction into DB:', err);
   showToast(`Error al guardar: ${err.message || 'Error de conexión con Supabase.'}`, true);
  return;
 }

 setIsTxModalOpen(false);
 resetTxForm();
 };

 const handleEditTx = (tx: FinanceTransaction) => {
 setIsEditingTx(true);
 setEditingTxId(tx.id);
 setTxType(tx.type);
 setTxCategory(tx.category);
 setTxAmount(tx.amount.toString());
 setTxDate(tx.date);
 setTxDescription(tx.description);
 setTxIsRecurring(!!tx.isRecurring);
 setTxPeriod(tx.recurrencePeriod || 'monthly');
 setTxStatus(tx.status);
 setTxInvoiceId(tx.invoiceId || '');
 setTxPaymentMethod(tx.paymentMethod);
 setTxPaymentAccount(tx.paymentAccount);
 setTxFirstAmount(tx.firstAmount ? tx.firstAmount.toString() : '');
 setTxNextAmount(tx.nextAmount ? tx.nextAmount.toString() : '');
 setTxRecurrenceCount(tx.recurrenceOccurrenceCount ? tx.recurrenceOccurrenceCount.toString() : '');
 setTxRecurrenceEndDate(tx.recurrenceEndDate || '');
 setIsTxModalOpen(true);
 };

 const handleMakeTransactionRecurring = (tx: FinanceTransaction) => {
  handleEditTx(tx);
  setTxIsRecurring(true);
  setTxFirstAmount(tx.firstAmount ? tx.firstAmount.toString() : tx.amount.toString());
  setTxNextAmount(tx.nextAmount ? tx.nextAmount.toString() : tx.amount.toString());
 };

 const handleDeleteTx = async (id: string) => {
 if (safeConfirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
  try {
   await db.deleteFinanceTransaction(id);
   setTransactions(prev => prev.filter(t => t.id !== id));
    await onRefreshFinance?.();
    showToast('Sincronizado: Transacción eliminada de Supabase.');
  } catch (err: any) {
    console.error('Error deleting transaction in DB:', err);
    showToast('Error al eliminar: ' + (err.message || 'Error de base de datos.'), true);
  }
 }
 };

 const resetTxForm = () => {
 setIsEditingTx(false);
 setEditingTxId(null);
 setTxType('income');
 setTxCategory('Desarrollo');
 setTxAmount('');
 setTxDate(new Date().toISOString().split('T')[0]);
 setTxDescription('');
 setTxIsRecurring(false);
 setTxPeriod('monthly');
 setTxStatus('paid');
 setTxInvoiceId('');
 setTxPaymentMethod(undefined);
 setTxPaymentAccount(undefined);
 setTxFirstAmount('');
 setTxNextAmount('');
 setTxRecurrenceCount('');
 setTxRecurrenceEndDate('');
 };

 // Handler: Invoice items manipulation
 const handleAddInvoiceItem = () => {
 setInvItems(prev => [
  ...prev,
  { id: 'temp_' + Date.now() + '_' + Math.random(), description: '', quantity: 1, unitPrice: 0, total: 0 }
 ]);
 };

 const handleRemoveInvoiceItem = (index: number) => {
 if (invItems.length === 1) return;
 setInvItems(prev => prev.filter((_, i) => i !== index));
 };

 const handleUpdateInvoiceItemField = (index: number, field: keyof InvoiceItem, value: any) => {
 setInvItems(prev => prev.map((item, i) => {
  if (i === index) {
  const updated = { ...item, [field]: value };
  if (field === 'quantity' || field === 'unitPrice') {
   const q = field === 'quantity' ? Number(value) : item.quantity;
   const p = field === 'unitPrice' ? Number(value) : item.unitPrice;
   if (field === 'quantity' && item.grossAmount !== undefined) {
    updated.total = item.grossAmount / (1 + invTaxPercentage / 100);
    updated.unitPrice = updated.total / Math.max(1, q || 1);
   } else {
    updated.total = (q || 0) * (p || 0);
    updated.grossAmount = updated.total * (1 + invTaxPercentage / 100);
   }
  }
  return updated;
  }
  return item;
 }));
 };

 const handleUpdateInvoiceItemGross = (index: number, grossAmount: number) => {
 setInvItems(prev => prev.map((item, i) => {
  if (i !== index) return item;
  const safeGross = Number.isFinite(grossAmount) ? Math.max(0, grossAmount) : 0;
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const netLineTotal = safeGross / (1 + invTaxPercentage / 100);
  return { ...item, grossAmount: safeGross, unitPrice: netLineTotal / quantity, total: netLineTotal };
 }));
 };

 const handleInvoiceTaxChange = (taxPercentage: number) => {
 const safeTax = Number.isFinite(taxPercentage) ? Math.max(0, taxPercentage) : 0;
 setInvTaxPercentage(safeTax);
 setInvItems(prev => prev.map(item => {
  const grossAmount = item.grossAmount ?? item.total * (1 + invTaxPercentage / 100);
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const netLineTotal = grossAmount / (1 + safeTax / 100);
  return { ...item, grossAmount, unitPrice: netLineTotal / quantity, total: netLineTotal };
 }));
 };

 const handleAddPendingTransactionAsInvoiceItem = (tx: FinanceTransaction) => {
 // If the first item is empty, let's replace or add to the list
 setInvItems(prev => {
  const filtered = prev.filter(item => item.description.trim() !== '');
  return [
  ...filtered,
  { 
   id: 'temp_tx_' + tx.id + '_' + Date.now(), 
   description: tx.description, 
   quantity: 1, 
   unitPrice: tx.amount / (1 + invTaxPercentage / 100),
   total: tx.amount / (1 + invTaxPercentage / 100),
   grossAmount: tx.amount
  }
  ];
 });
 // Add to our tracks list to set its invoiceId on save
 if (!selectedTxIdsForInvoice.includes(tx.id)) {
  setSelectedTxIdsForInvoice(prev => [...prev, tx.id]);
 }
 };

 const handleToggleTransactionStatus = async (tx: FinanceTransaction) => {
 const nextStatus = tx.status === 'paid' ? 'pending' : 'paid';
 const updatedTx: FinanceTransaction = { ...tx, status: nextStatus };

 try {
  await db.updateFinanceTransaction(updatedTx);
  setTransactions(prev => prev.map(t => t.id === tx.id ? updatedTx : t));
 } catch (err) {
  console.error('Error toggling transaction status in DB:', err);
  showToast('No se cambió el estado: Supabase no confirmó la operación.', true);
  return;
 }

 // 1. Sync any Invoice Item where pendingTxId === tx.id
 let hasUpdatedAnyInvoice = false;
 const updatedInvoices = invoices.map(inv => {
  const hasMatchingItem = inv.items.some(item => item.pendingTxId === tx.id);
  if (hasMatchingItem) {
  const updatedItems = inv.items.map(item => {
   if (item.pendingTxId === tx.id) {
   // If transaction is now paid, concept is NOT pending (isPending = false)
   // If transaction is now pending, concept IS pending (isPending = true)
   return { ...item, isPending: nextStatus === 'pending' };
   }
   return item;
  });

  // Determine new invoice status
  const allItemsPaid = updatedItems.every(it => !it.isPending);
  let newStatus = inv.status;
  if (allItemsPaid) {
   newStatus = 'paid';
  } else if (inv.status === 'paid') {
   // If it was paid, but now an item is pending, revert invoice status back to 'sent'
   newStatus = 'sent';
  }

  hasUpdatedAnyInvoice = true;
  const updatedInv = { ...inv, items: updatedItems, status: newStatus };
  
  // Also update preview invoice if needed
  if (previewInvoice && previewInvoice.id === inv.id) {
   setPreviewInvoice(updatedInv);
  }

   return updatedInv;
  }
  return inv;
 });

 if (hasUpdatedAnyInvoice) {
  try {
   const changedInvoices = updatedInvoices.filter(updated => {
    const original = invoices.find(invoice => invoice.id === updated.id);
    return original && original !== updated;
   });
   await Promise.all(changedInvoices.map(invoice => db.updateFinanceInvoice(invoice)));
   setInvoices(updatedInvoices);
  } catch (err) {
   console.error('Error updating invoice item status in DB:', err);
   showToast('El movimiento se guardó, pero no se pudo sincronizar la factura relacionada.', true);
  }
 }

 // 2. Also look up general linked invoice by invoiceId
 const linkedInvoice = getLinkedInvoice(tx);
 if (linkedInvoice) {
  // If transaction is now paid and invoice is not paid, let's mark it as paid.
  // If transaction is now pending and invoice is paid, let's revert it to 'sent'.
  let newInvStatus = linkedInvoice.status;
  if (nextStatus === 'paid' && linkedInvoice.status !== 'paid') {
  newInvStatus = 'paid';
  } else if (nextStatus === 'pending' && linkedInvoice.status === 'paid') {
  newInvStatus = 'sent';
  }

  if (newInvStatus !== linkedInvoice.status) {
   const updatedInv: Invoice = { ...linkedInvoice, status: newInvStatus };
   try {
    await db.updateFinanceInvoice(updatedInv);
    setInvoices(prev => prev.map(inv => inv.id === linkedInvoice.id ? updatedInv : inv));
    if (previewInvoice && previewInvoice.id === linkedInvoice.id) setPreviewInvoice(updatedInv);
   } catch (err) {
   console.error('Error updating linked invoice status in DB:', err);
  }
  }
 }

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = `Éxito: Registro marcado como ${nextStatus === 'paid' ? 'COBRADO / LIQUIDADO' : 'PENDIENTE'} con éxito y sincronizado.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
 }
 };

 // Choose existing client contact
 const handleSelectClient = (clientId: string) => {
 setInvClientId(clientId);
 const match = contacts.find(c => c.id === clientId);
 if (match) {
  const previousInvoice = invoices.find(invoice =>
   invoice.clientId === match.id ||
   (!!match.email && invoice.clientEmail?.toLowerCase() === match.email.toLowerCase()) ||
   invoice.clientName?.toLowerCase() === match.name.toLowerCase()
  );
  setInvClientName(match.fiscalName || (match.company !== 'Independent' ? match.company : match.name));
  setInvClientEmail(match.email || previousInvoice?.clientEmail || '');
  setInvClientAddress(match.fiscalAddress || previousInvoice?.clientAddress || match.location || '');
  setInvClientTaxId(match.taxId || previousInvoice?.clientTaxId || '');
  setInvCurrency(match.currency || previousInvoice?.currency || 'EUR');
  setInvLanguage(match.language || previousInvoice?.language || 'es');
  setInvTaxPercentage(match.taxPercentage ?? previousInvoice?.taxPercentage ?? 21);
 }
 };

 // Handler: Add or update invoice
 const handleSaveInvoice = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!invClientName.trim()) {
  alert('Por favor especifica el nombre del cliente.');
  return;
 }

 const validItems = invItems.filter(item => item.description.trim() !== '');
 if (validItems.length === 0) {
  alert('La factura debe tener al menos un concepto de línea válido.');
  return;
 }

 const total = parseFloat(validItems.reduce(
  (sum, item) => sum + (item.grossAmount ?? item.total * (1 + invTaxPercentage / 100)),
  0
 ).toFixed(2));
 const subtotal = parseFloat((total / (1 + invTaxPercentage / 100)).toFixed(2));
 const taxAmount = parseFloat((total - subtotal).toFixed(2));

 const invoiceId = isEditingInv && editingInvId ? editingInvId : getNextInvoiceNumber(invoices);
 const editingInvoice = isEditingInv && editingInvId ? invoices.find(invoice => invoice.id === editingInvId) : undefined;
 const inheritsInitialSaleCommission = editingInvoice
  ? (editingInvoice.isInitialSale ?? Boolean(editingInvoice.comercialId || editingInvoice.comercialEmail))
  : false;

 // New lines added to an existing invoice create their own paid/pending ledger movement.
 // On new invoices, pending lines keep the existing automatic transaction behavior.
 const autoCreatedTxs: FinanceTransaction[] = [];
 const mappedItems = validItems.map((item, idx) => {
  const isItemPending = !!item.isPending;
  let pTxId = item.pendingTxId;
  const savedItemId = item.id.startsWith('temp') ? 'item_' + idx + '_' + Date.now() : item.id;
  const shouldCreateTransaction = !pTxId && (isItemPending || (isEditingInv && item.id.startsWith('temp')));

  if (shouldCreateTransaction) {
  pTxId = `tx_item_${isItemPending ? 'pending' : 'paid'}_` + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6);
  const newTx: FinanceTransaction = {
   id: pTxId,
   type: 'income',
   category: 'Desarrollo',
   amount: item.grossAmount ?? item.total * (1 + invTaxPercentage / 100),
   date: isItemPending ? (invDueDate || invDate) : invDate,
   description: `${isItemPending ? 'Cobro Pendiente' : 'Pago registrado'}: ${item.description} (${invClientName})`,
   isRecurring: false,
   status: isItemPending ? 'pending' : 'paid',
   invoiceId: invoiceId,
   clientId: invClientId || undefined,
   paymentMethod: item.paymentMethod || 'transfer',
   comercialId: editingInvoice?.comercialId,
   comercialEmail: editingInvoice?.comercialEmail,
   isInitialSale: inheritsInitialSaleCommission,
  };
  autoCreatedTxs.push(newTx);
  }

  return {
  id: savedItemId,
  description: item.description,
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  total: item.total,
  grossAmount: item.grossAmount ?? item.total * (1 + invTaxPercentage / 100),
  isPending: isItemPending,
  pendingTxId: pTxId,
  paymentMethod: item.paymentMethod || 'transfer',
  };
 });

 const anyItemPending = mappedItems.some(item => !!item.isPending);
 let calculatedStatus = invStatus;
 if (anyItemPending) {
  if (calculatedStatus === 'paid') {
  calculatedStatus = 'sent'; // Downgrade to sent because some concepts are pending
  }
 } else {
  calculatedStatus = 'paid'; // Autocomplete as paid since no items are pending
 }

 const payload: Invoice = {
  id: invoiceId,
  clientId: invClientId || undefined,
  clientName: invClientName,
  clientEmail: invClientEmail,
  clientTaxId: invClientTaxId,
  clientAddress: invClientAddress,
  issuerName: invIssuerName,
  issuerTaxId: invIssuerTaxId,
  issuerAddress: invIssuerAddress,
  issuerBrand: invIssuerBrand,
  issuerEmail: invIssuerEmail,
  date: invDate,
  dueDate: invDueDate,
  status: calculatedStatus,
  items: mappedItems,
  subtotal,
  taxPercentage: invTaxPercentage,
  taxAmount,
  total,
  notes: invNotes,
  alias: invAlias || undefined,
  color: invColor || undefined
  ,currency: invCurrency
  ,language: invLanguage
 };

 try {
  if (isEditingInv && editingInvId) {
   await db.updateFinanceInvoice(payload);
  } else {
   await db.insertFinanceInvoice(payload);
  }
  const persistedInvoices = await db.getFinanceInvoices();
  setInvoices(persistedInvoices);
  setSyncStatus('synced');
  setSyncError(null);
  window.dispatchEvent(new CustomEvent('finance-invoices-updated', { detail: { invoiceId } }));
 } catch (err: any) {
  console.error('Error saving invoice in Supabase:', err);
  setSyncStatus('error');
  setSyncError(err?.hint || err?.message || 'No se pudo guardar la factura.');
  alert(`No se pudo guardar la factura. ${err?.hint || err?.message || 'Revisa la conexión con la base de datos.'}`);
  return;
 }

 // Insert ledger movements created for new invoice lines.
 if (autoCreatedTxs.length > 0) {
  try {
   await Promise.all(autoCreatedTxs.map(tx => db.insertFinanceTransaction(tx)));
   setTransactions(prev => [...autoCreatedTxs, ...prev]);
  } catch (err: any) {
   console.error('Error inserting invoice item transaction:', err);
   showToast(`La factura se guardó, pero no todos sus cobros: ${err?.message || 'error de Supabase'}`, true);
  }
 }

 // Capture transactions transitioning from pending to paid
 const txsToMarkPaidFromItems: string[] = [];
 if (isEditingInv && editingInvId) {
  const originalInvoice = invoices.find(inv => inv.id === editingInvId);
  if (originalInvoice) {
  originalInvoice.items.forEach(origIt => {
   if (origIt.pendingTxId && origIt.isPending) {
   const nowIt = mappedItems.find(m => m.id === origIt.id);
   if (nowIt && !nowIt.isPending) {
    txsToMarkPaidFromItems.push(origIt.pendingTxId);
   }
   }
  });
  }
 }

 if (txsToMarkPaidFromItems.length > 0) {
  const updatedTransactions = transactions.map(t => txsToMarkPaidFromItems.includes(t.id)
   ? { ...t, status: 'paid' as const }
   : t);
  const changedTransactions = updatedTransactions.filter(t => txsToMarkPaidFromItems.includes(t.id));
  try {
   await Promise.all(changedTransactions.map(tx => db.updateFinanceTransaction(tx)));
   const byId = new Map(changedTransactions.map(tx => [tx.id, tx]));
   setTransactions(previous => previous.map(tx => byId.get(tx.id) || tx));
  } catch (err) {
   console.error('Error marking linked concept tx as paid:', err);
  }
 }

 // Link all chosen pending transactions (including originating transactions) to this invoice
 const txsToLink = [...selectedTxIdsForInvoice];
 if (originatingTxId) {
  txsToLink.push(originatingTxId);
 }

 if (txsToLink.length > 0) {
  const updatedTransactions = transactions.map(t => {
   if (txsToLink.includes(t.id)) {
   const updatedTx: FinanceTransaction = { 
   ...t, 
   invoiceId: invoiceId,
   status: (invStatus === 'paid' ? 'paid' : t.status) as 'paid' | 'pending'
   };
   return updatedTx;
   }
   return t;
  });
  const changedTransactions = updatedTransactions.filter(t => txsToLink.includes(t.id));
  try {
   await Promise.all(changedTransactions.map(tx => db.updateFinanceTransaction(tx)));
   const byId = new Map(changedTransactions.map(tx => [tx.id, tx]));
   setTransactions(previous => previous.map(tx => byId.get(tx.id) || tx));
  } catch (err) {
   console.error('Error updating linked transaction:', err);
  }
 } else if (!isEditingInv && invStatus === 'paid') {
  // Automatically register paid invoices as pending/paid income in finance transaction hub!
  const autoTx: FinanceTransaction = {
  id: 'tx_auto_' + Date.now(),
  type: 'income',
  category: 'Desarrollo',
  amount: total,
  date: invDate,
  description: `Ingreso Facturado: ${invoiceId} - ${invClientName}`,
  isRecurring: false,
  status: 'paid',
  invoiceId: invoiceId
  };
  try {
   await db.insertFinanceTransaction(autoTx);
   setTransactions(prev => [autoTx, ...prev]);
  } catch (err) {
   console.error('Error inserting auto invoice transaction in DB:', err);
  }
 }

 // Reset indicators
 setOriginatingTxId(null);
 setSelectedTxIdsForInvoice([]);

 setIsInvModalOpen(false);
 resetInvForm();
 };

 const handleEditInvoice = (inv: Invoice, e: React.MouseEvent) => {
 e.stopPropagation();
 setIsEditingInv(true);
 setEditingInvId(inv.id);
 setInvClientId(inv.clientId || '');
 setInvClientName(inv.clientName);
 setInvClientEmail(inv.clientEmail);
 setInvClientTaxId(inv.clientTaxId || '');
 setInvClientAddress(inv.clientAddress || '');
 setInvIssuerName(inv.issuerName || DEFAULT_INVOICE_ISSUER.name);
 setInvIssuerTaxId(inv.issuerTaxId || DEFAULT_INVOICE_ISSUER.taxId);
 setInvIssuerAddress(inv.issuerAddress || DEFAULT_INVOICE_ISSUER.address);
 setInvIssuerBrand(inv.issuerBrand || DEFAULT_INVOICE_ISSUER.brand);
 setInvIssuerEmail(inv.issuerEmail || DEFAULT_INVOICE_ISSUER.email);
 setInvDate(inv.date);
 setInvDueDate(inv.dueDate);
 setInvStatus(inv.status);
 setInvNotes(inv.notes || '');
 setInvTaxPercentage(inv.taxPercentage);
 setInvItems(inv.items.map(it => ({ ...it })));
 setInvAlias(inv.alias || '');
 setInvColor(inv.color || '');
 setInvCurrency(inv.currency || 'EUR');
 setInvLanguage(inv.language || 'es');
 setIsInvModalOpen(true);
 };

 const handleDeleteInvoice = async (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 if (confirm('¿Estás seguro de que deseas eliminar esta factura?')) {
  try {
   await db.deleteFinanceInvoice(id);
   setInvoices(prev => prev.filter(i => i.id !== id));
  } catch (err: any) {
   console.error('Error deleting invoice from DB:', err);
   showToast(`No se eliminó la factura: ${err?.message || 'Supabase no confirmó la operación'}`, true);
  }
 }
 };

 const handleInvoiceMarkPaid = async (inv: Invoice, e: React.MouseEvent) => {
 e.stopPropagation();
 
 // Update status to paid
 const updated: Invoice = { ...inv, status: 'paid' };
 try {
  await db.updateFinanceInvoice(updated);
  setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i));
 } catch (err: any) {
  console.error('Error marking invoice paid in DB:', err);
  showToast(`No se marcó como pagada: ${err?.message || 'Supabase no confirmó la operación'}`, true);
  return;
 }

 // Register a paid income in transactions if not already exists
 const alreadyRegistered = transactions.some(t => t.invoiceId === inv.id);
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
  invoiceId: inv.id
  };
  try {
   await db.insertFinanceTransaction(autoTx);
   setTransactions(prev => [autoTx, ...prev]);
  } catch (err: any) {
   console.error('Error inserting mark-paid auto transaction in DB:', err);
   showToast(`La factura quedó pagada, pero el ingreso no se creó: ${err?.message || 'error de Supabase'}`, true);
   return;
  }
 }
 
 // Show toast message
 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = `Factura ${inv.id} marcada como PAGADA con éxito e ingresada en cuentas.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
 }
 };

 const handleToggleConceptPaid = async (inv: Invoice, itemId: string, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();

 // Map updated items
 const updatedItems = inv.items.map(item => {
  if (item.id === itemId) {
  return { ...item, isPending: !item.isPending };
  }
  return item;
 });

 // Check if all items are paid now
 const allItemsPaid = updatedItems.every(it => !it.isPending);
 
 // Update invoice status based on items status
 const newStatus = allItemsPaid ? 'paid' : (inv.status === 'draft' ? 'draft' : 'sent');

 const updatedInv: Invoice = {
  ...inv,
  items: updatedItems,
  status: newStatus
 };

 try {
  await db.updateFinanceInvoice(updatedInv);
  setInvoices(prev => prev.map(i => i.id === inv.id ? updatedInv : i));
  if (previewInvoice && previewInvoice.id === inv.id) setPreviewInvoice(updatedInv);
 } catch (err) {
  console.error('Error updating invoice item status in DB:', err);
  showToast('No se cambió el concepto: Supabase no confirmó la operación.', true);
  return;
 }

 // Now look for any linked transactions matching the toggled item
 const toggledItem = inv.items.find(it => it.id === itemId);
 if (toggledItem?.pendingTxId) {
  const txToUpdate = transactions.find(t => t.id === toggledItem.pendingTxId);
  if (txToUpdate) {
  const nextPending = !toggledItem.isPending; // Toggled state: if it was pending, it is now not pending (false)
  const updatedTx: FinanceTransaction = {
   ...txToUpdate,
   status: nextPending ? 'pending' : 'paid'
  };

  try {
   await db.updateFinanceTransaction(updatedTx);
   setTransactions(prev => prev.map(t => t.id === txToUpdate.id ? updatedTx : t));
  } catch (err) {
   console.error('Error updating item-linked transaction status in DB:', err);
  }
  }
 }

 // Also: if all items are now paid, we should mark any other main pending transaction linked to this invoice as paid
 if (allItemsPaid) {
  const mainPendingTx = transactions.find(t => t.invoiceId === inv.id && t.status === 'pending');
  if (mainPendingTx) {
  const updatedMainTx: FinanceTransaction = {
   ...mainPendingTx,
   status: 'paid'
  };
  try {
   await db.updateFinanceTransaction(updatedMainTx);
   setTransactions(prev => prev.map(t => t.id === mainPendingTx.id ? updatedMainTx : t));
  } catch (err) {
   console.error('Error updating main transaction status in DB:', err);
  }
  }
 } else {
  // If we are transitioning from paid to non-paid (e.g. marking a concept as pending again), we should revert main transaction of this invoice back to pending if it exists!
  if (inv.status === 'paid' && newStatus !== 'paid') {
  const mainPaidTx = transactions.find(t => t.invoiceId === inv.id && t.status === 'paid');
  if (mainPaidTx) {
   const updatedMainTx: FinanceTransaction = {
   ...mainPaidTx,
   status: 'pending'
   };
   try {
    await db.updateFinanceTransaction(updatedMainTx);
    setTransactions(prev => prev.map(t => t.id === mainPaidTx.id ? updatedMainTx : t));
   } catch (err) {
   console.error('Error reverting main transaction status to pending in DB:', err);
   }
  }
  }
 }

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = allItemsPaid  ?
  `Éxito: Se han cobrado todos los conceptos. Factura ${inv.id} cobrada y consolidada con éxito.`
  : `Éxito: Se ha actualizado el estado de cobro del concepto.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
 }
 };

 const handleMarkAllConceptsPaid = async (inv: Invoice, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();

 // Map all items to not pending
 const updatedItems = inv.items.map(item => ({ ...item, isPending: false }));

 const updatedInv: Invoice = {
  ...inv,
  items: updatedItems,
  status: 'paid'
 };

 try {
  await db.updateFinanceInvoice(updatedInv);
  setInvoices(prev => prev.map(i => i.id === inv.id ? updatedInv : i));
  if (previewInvoice && previewInvoice.id === inv.id) setPreviewInvoice(updatedInv);
 } catch (err) {
  console.error('Error updating invoice status to paid in DB:', err);
  showToast('No se marcó la factura como pagada: Supabase no confirmó la operación.', true);
  return;
 }

 // Update all matching pending transactions linked to this invoice to paid
 const linkedTxIds = inv.items.map(it => it.pendingTxId).filter(Boolean) as string[];
 
 // Also include any other general transaction linked to this invoice
 const allLinkedTxs = transactions.filter(t => t.invoiceId === inv.id || linkedTxIds.includes(t.id));

 if (allLinkedTxs.length > 0) {
  const updatedTxs = transactions.map(t => {
  const isLinkedObj = t.invoiceId === inv.id || linkedTxIds.includes(t.id);
   if (isLinkedObj && t.status !== 'paid') {
   return { ...t, status: 'paid' as const };
  }
  return t;
  });
  try {
   const changed = updatedTxs.filter(updated => {
    const original = transactions.find(transaction => transaction.id === updated.id);
    return original && original.status !== updated.status;
   });
   await Promise.all(changed.map(tx => db.updateFinanceTransaction(tx)));
   const byId = new Map(changed.map(tx => [tx.id, tx]));
   setTransactions(previous => previous.map(tx => byId.get(tx.id) || tx));
  } catch (err) {
   console.error('Error updating transaction in handleMarkAllConceptsPaid:', err);
   showToast('La factura se guardó, pero no todos los movimientos relacionados pudieron actualizarse.', true);
  }
 } else {
  // If none existed, create a consolidated auto receipt like the original handleInvoiceMarkPaid
  const autoTx: FinanceTransaction = {
  id: 'tx_auto_' + Date.now(),
  type: 'income',
  category: 'Facturado',
  amount: inv.total,
  date: new Date().toISOString().split('T')[0],
  description: `Pago Factura Autogenerado: ${inv.id} - ${inv.clientName}`,
  isRecurring: false,
  status: 'paid',
  invoiceId: inv.id
  };
  try {
   await db.insertFinanceTransaction(autoTx);
   setTransactions(prev => [autoTx, ...prev]);
  } catch (err) {
  console.error('Error inserting auto invoice transaction:', err);
  }
 }

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = `Factura cobrada y todos sus conceptos marcados como PAGADOS con éxito.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
 }
 };

 const resetInvForm = () => {
 setIsEditingInv(false);
 setEditingInvId(null);
 setOriginatingTxId(null);
 setSelectedTxIdsForInvoice([]);
 setInvClientId('');
 setInvClientName('');
 setInvClientEmail('');
 setInvClientTaxId('');
 setInvClientAddress('');
 setInvIssuerName(DEFAULT_INVOICE_ISSUER.name);
 setInvIssuerTaxId(DEFAULT_INVOICE_ISSUER.taxId);
 setInvIssuerAddress(DEFAULT_INVOICE_ISSUER.address);
 setInvIssuerBrand(DEFAULT_INVOICE_ISSUER.brand);
 setInvIssuerEmail(DEFAULT_INVOICE_ISSUER.email);
 setInvDate(new Date().toISOString().split('T')[0]);
 const d = new Date();
 d.setDate(d.getDate() + 30);
 setInvDueDate(d.toISOString().split('T')[0]);
 setInvStatus('draft');
 setInvNotes('');
 setInvTaxPercentage(21);
 setInvItems([{ id: 'temp1', description: '', quantity: 1, unitPrice: 0, total: 0 }]);
 setInvAlias('');
 setInvColor('');
 setInvCurrency('EUR');
 setInvLanguage('es');
 };

 // Helper to trigger recurrence manual payment simulation
const handleProcessRecurring = async (tx: FinanceTransaction) => {
 const manualPayment = buildManualRecurringTransaction(tx);
 const chargeAmount = manualPayment.amount;
 const isIncome = tx.type === 'income';
 if (transactions.some(transaction => transaction.id === manualPayment.id)) {
  showToast('Ese concepto recurrente ya tiene un movimiento registrado hoy.', true);
  return;
 }

 try {
  await db.insertFinanceTransaction(manualPayment);
  setTransactions(prev => [manualPayment, ...prev]);
 } catch (err: any) {
  if (err?.code === '23505') {
   showToast('Ese concepto recurrente ya tiene un movimiento registrado hoy.', true);
   return;
  }
  console.error('Error inserting transaction into DB:', err);
  showToast(`No se procesó el movimiento: ${err?.message || 'Supabase no confirmó la operación'}`, true);
  return;
 }

 const toast = document.getElementById('toast-msg');
 if (toast) {
  const text = isIncome ?
  `Ingreso de ${chargeAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€ procesado para: "${tx.description}"`
  : `Pago de ${chargeAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€ procesado para: "${tx.description}"`;
  
  const span = toast.querySelector('span');
  if (span) {
  span.textContent = text;
  } else {
  toast.innerText = text;
  }
  toast.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
  toast.classList.add('opacity-100');
  setTimeout(() => {
  toast.classList.add('opacity-0', 'pointer-events-none');
  toast.classList.remove('opacity-100');
  }, 3500);
 }
 };

 // Print helper for invoice preview
 const handlePrintPreview = () => {
 if (!previewInvoice) {
  window.print();
  return;
 }

 const invoiceTransactionIds = new Set(
  previewInvoice.items.flatMap(item => [item.pendingTxId, item.id]).filter((id): id is string => Boolean(id))
 );
 const linkedTransactions = transactions.filter(tx =>
  tx.invoiceId === previewInvoice.id || invoiceTransactionIds.has(tx.id)
 );
 const paidTransactions = linkedTransactions.filter(tx => tx.status === 'paid');
 const paidAmount = paidTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
 const isPaid = previewInvoice.status === 'paid' || (
  linkedTransactions.length > 0 &&
  linkedTransactions.every(tx => tx.status === 'paid') &&
  paidAmount + 0.005 >= Number(previewInvoice.total || 0)
 );
 const dueDate = paidTransactions.map(tx => tx.date).filter(Boolean).sort((a, b) => b.localeCompare(a))[0] || previewInvoice.dueDate;
 const html = buildInvoiceHtml(resolveInvoiceClientData(previewInvoice, contacts), {
  isPaid,
  dueDate,
  bank: {
   beneficiary: bankBeneficiary,
   iban: paymentDetails,
   swift: bankSwift,
   correspondentBic: bankCorrespondentBic,
   nameAddress: bankNameAddress
  }
 });
 const printWindow = window.open('', '_blank');
 if (!printWindow) {
  alert('El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.');
  return;
 }
 printWindow.document.open();
 printWindow.document.write(html);
 printWindow.document.close();
 printWindow.addEventListener('load', () => {
  printWindow.focus();
  printWindow.print();
 }, { once: true });
 };

 // Convert a transaction (cobro) directly into a detailed draft / paid invoice
 const handleCreateInvoiceFromTransaction = (tx: FinanceTransaction) => {
 setIsEditingInv(false);
 setEditingInvId(null);
 setOriginatingTxId(tx.id);
 setInvIssuerName(DEFAULT_INVOICE_ISSUER.name);
 setInvIssuerTaxId(DEFAULT_INVOICE_ISSUER.taxId);
 setInvIssuerAddress(DEFAULT_INVOICE_ISSUER.address);
 setInvIssuerBrand(DEFAULT_INVOICE_ISSUER.brand);
 setInvIssuerEmail(DEFAULT_INVOICE_ISSUER.email);
 
 // Find client in contacts list if possible
 const matchedContact = contacts.find(c => c.id === tx.clientId);
 const relatedTransactions = [
  tx,
  ...transactions.filter(candidate =>
   candidate.id !== tx.id &&
   candidate.type === 'income' &&
   candidate.status === 'pending' &&
   Boolean(matchedContact?.id) &&
   candidate.clientId === matchedContact?.id
  )
 ];
 const matchedTaxPercentage = matchedContact?.taxPercentage ?? 21;
 
 if (matchedContact) {
  setInvClientId(matchedContact.id);
  setInvClientName(matchedContact.fiscalName || matchedContact.name);
  setInvClientEmail(matchedContact.email);
  setInvClientAddress(matchedContact.fiscalAddress || matchedContact.location || '');
  setInvClientTaxId(matchedContact.taxId || '');
  setInvCurrency(matchedContact.currency || 'EUR');
  setInvLanguage(matchedContact.language || 'es');
  setInvTaxPercentage(matchedTaxPercentage);
 } else {
  setInvClientId('');
  setInvClientName(tx.description || 'Cliente de Facturación');
  setInvClientEmail('');
  setInvClientAddress('');
  setInvClientTaxId('');
 }
 
 setInvDate(tx.date || new Date().toISOString().split('T')[0]);
 // Payment term: 15 days after issue date
 const issueDate = tx.date ? new Date(tx.date) : new Date();
 issueDate.setDate(issueDate.getDate() + 15);
 setInvDueDate(issueDate.toISOString().split('T')[0]);
 
 // Default to paid/sent depending on transaction status
 setInvStatus(relatedTransactions.some(item => item.status === 'pending') ? 'sent' : 'paid');
 setInvNotes(`Factura correspondiente al cobro registrado el ${tx.date}.\nForma de pago: Transferencia Bancaria.`);
 setInvTaxPercentage(matchedTaxPercentage);
 
 // Calculate net values using the client's configured tax level.
 setInvItems(relatedTransactions.map((item, index) => {
  const basePrice = parseFloat((item.amount / (1 + matchedTaxPercentage / 100)).toFixed(2));
  return {
   id: `item_auto_${item.id}_${index}`,
   description: item.description || 'Servicios profesionales prestados',
   quantity: 1,
   unitPrice: basePrice,
   total: basePrice,
   grossAmount: item.amount,
   isPending: item.status === 'pending',
   pendingTxId: item.id,
   paymentMethod: item.paymentMethod || 'transfer'
  };
 }));
 setSelectedTxIdsForInvoice(relatedTransactions.map(item => item.id));
 
 // Force direct navigation / tab switch to 'invoices' to avoid confusion and let them edit it!
 setActiveTab('invoices');
 setIsInvModalOpen(true);
 
 // Toast notification
 const toast = document.getElementById('toast-msg');
 if (toast) {
  const label = toast.querySelector('span');
  if (label) {
  label.textContent = `Prefactura completada para: ${tx.description}. ¡Revisa y edita los detalles!`;
  } else {
  toast.innerText = `Prefactura completada para: ${tx.description}. ¡Revisa y edita los detalles!`;
  }
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 4500);
 }
 };

 // Compile and trigger a local file download of the Invoice represented in clean self-contained HTML
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
 const effectiveDueDate = paidTransactions.map(tx => tx.date).filter(Boolean).sort((a, b) => b.localeCompare(a))[0] || inv.dueDate;
 
 const legacyHtmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
 <meta charset="UTF-8">
 <title>Factura ${inv.id} - ${inv.clientName}</title>
 <style>
 body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #262626;
  margin: 0;
  padding: 40px;
  line-height: 1.6;
  background-color: #f5f5f4;
 }
 .invoice-card {
  max-width: 794px;
  margin: 0 auto;
  background: #ffffff;
  padding: 50px;
  border: 1px solid #e7e5e4;
  box-shadow: 0 18px 50px rgba(28,25,23,0.08);
 }
 .header-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 40px;
 }
 .company-title {
  font-size: 18px;
  font-weight: 850;
  color: #171717;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
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
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #171717;
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
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 14px;
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
  background: #ffffff;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8a7031;
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
  background: #fafafa;
  border: 1px dashed #d6d3d1;
  border-radius: 12px;
  padding: 20px;
  font-size: 11px;
  color: #525252;
  margin-bottom: 30px;
 }
 .bank-title {
  font-weight: 700;
  font-size: 12px;
  margin: 0 0 12px 0;
  color: #8a7031;
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
  font-weight: bold;
  color: #1e1b4b;
  font-family: monospace;
 }
 .notes-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  font-size: 11px;
  color: #475569;
  margin-bottom: 40px;
 }
 .notes-title {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  color: #1e293b;
 }
 .footer {
  text-align: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
  font-size: 9px;
  color: #94a3b8;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.5;
 }
 </style>
</head>
<body>
 <div class="invoice-card">
 <table class="header-table">
  <tr>
  <td style="vertical-align: top;">
   <h1 class="company-title">${inv.issuerBrand || DEFAULT_INVOICE_ISSUER.brand}</h1>
   <div class="company-sub">
   ${inv.issuerName || DEFAULT_INVOICE_ISSUER.name}<br>
   NIF/DNI: ${inv.issuerTaxId || DEFAULT_INVOICE_ISSUER.taxId}<br>
   ${inv.issuerAddress || DEFAULT_INVOICE_ISSUER.address}
   <br>${inv.issuerEmail || DEFAULT_INVOICE_ISSUER.email}
   </div>
  </td>
  <td class="invoice-title-block" style="vertical-align: top;">
   <span class="invoice-label">Factura</span>
   <div class="invoice-number">${inv.id}</div>
   <div class="invoice-dates">
   Fecha de Emisión: ${inv.date}<br>
   Fecha de Vence: ${inv.dueDate}
   </div>
  </td>
  </tr>
 </table>

 <div class="stakeholders">
  <div class="stakeholder-column">
  <div class="stakeholder-box">
   <div class="box-title">Emisor (Proveedor)</div>
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
   <div class="box-title">Cliente (Receptor)</div>
    <div class="box-name">${inv.clientName}</div>
    <div class="box-detail">
    CIF/NIF/DNI: ${inv.clientTaxId || 'No indicado'}<br>
    Dirección fiscal: ${inv.clientAddress || 'No indicada'}<br>
    Email: ${inv.clientEmail}<br>
   ID Cliente CRM: ${inv.clientId || 'Inscripción Directa'}
   </div>
  </div>
  </div>
 </div>

 <table class="items-table">
  <thead>
  <tr>
   <th>Descripción del Servicio</th>
   <th style="text-align: center; width: 60px;">Cant.</th>
   <th style="text-align: right; width: 120px;">Precio Unit.</th>
   <th style="text-align: right; width: 120px;">Total</th>
  </tr>
  </thead>
  <tbody>
  ${inv.items.map(it => `
   <tr>
   <td><strong>${it.description}</strong></td>
   <td class="qty">${it.quantity}</td>
   <td class="price">${it.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
   <td class="total">${it.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
   </tr>
  `).join('')}
  </tbody>
 </table>

 <div class="totals-block">
  <table class="totals-table">
  <tr>
   <td>Subtotal Neto</td>
   <td class="value">${inv.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
  </tr>
  <tr>
   <td>IVA (${inv.taxPercentage}%)</td>
   <td class="value">${inv.taxAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
  </tr>
  <tr class="grand-total">
   <td>TOTAL FACTURA</td>
   <td class="value">${inv.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
  </tr>
  </table>
 </div>
 <div class="clear"></div>

 ${inv.notes ? `
  <div class="notes-box">
  <div class="notes-title">Notas de Facturación</div>
  <p style="margin: 0; white-space: pre-wrap;">${inv.notes}</p>
  </div>
 ` : ''}

 </div>
</body>
</html>`;
 void legacyHtmlContent;
 const htmlContent = buildInvoiceHtml(resolveInvoiceClientData(inv, contacts), {
  isPaid: isInvoicePaid,
  dueDate: effectiveDueDate,
  bank: {
   beneficiary: bankBeneficiary,
   iban: paymentDetails,
   swift: bankSwift,
   correspondentBic: bankCorrespondentBic,
   nameAddress: bankNameAddress
  }
 });

 await downloadInvoicePdf(htmlContent, filename);

 // Show toast message
 const toast = document.getElementById('toast-msg');
 if (toast) {
  const label = toast.querySelector('span');
  if (label) label.textContent = `Descargada factura ${inv.id} correctamente.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
 }
 };

 const getDueRangeKeys = () => {
 const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
 };
 const today = new Date();
 const todayKey = toDateKey(today);
 const weekStart = new Date(today);
 const dayOfWeek = today.getDay() || 7;
 weekStart.setDate(today.getDate() - (dayOfWeek - 1));
 const weekEnd = new Date(today);
 weekEnd.setDate(today.getDate() + (7 - dayOfWeek));
 const weekStartKey = toDateKey(weekStart);
 const weekEndKey = toDateKey(weekEnd);
 return { todayKey, weekStartKey, weekEndKey };
 };

 const getTxDateKey = (tx: FinanceTransaction): string => {
 return getFinanceDateKey(tx.date);
 };

 const matchesTxDateRange = (tx: FinanceTransaction, range: 'all' | 'today' | 'week'): boolean => {
 if (range === 'all') return true;
 const dateKey = getTxDateKey(tx);
 if (!dateKey) return false;
 const { todayKey, weekStartKey, weekEndKey } = getDueRangeKeys();
 return range === 'today'
  ? dateKey === todayKey
  : dateKey >= weekStartKey && dateKey <= weekEndKey;
 };

 // Transaction selection and calculations
 const filteredTxs = ledgerTransactions.filter(t => {
 const matchesSearch = t.description.toLowerCase().includes(txSearch.toLowerCase()) || 
       t.category.toLowerCase().includes(txSearch.toLowerCase()) ||
       t.id.toLowerCase().includes(txSearch.toLowerCase());
 const matchesType = txTypeFilter === 'all' || t.type === txTypeFilter;
 const matchesCategory = txCategoryFilter === 'All' || t.category === txCategoryFilter;
 const matchesDateRange = matchesTxDateRange(t, txDateRangeFilter);
 return matchesSearch && matchesType && matchesCategory && matchesDateRange;
 });

 // Pagination for transactions
 const txItemsPerPage = 10;
 const totalTxPages = Math.ceil(filteredTxs.length / txItemsPerPage);
 const safeCurrentPage = Math.min(txCurrentPage, Math.max(1, totalTxPages));
 const currentTxs = filteredTxs.slice((safeCurrentPage - 1) * txItemsPerPage, safeCurrentPage * txItemsPerPage);

 const getInvoicePendingDates = (inv: Invoice): string[] => ([
 inv.dueDate,
 ...transactions
 .filter(tx => tx.invoiceId === inv.id && tx.status === 'pending')
 .map(tx => tx.date)
 ]).filter(Boolean);

 const isInvoiceCollectable = (inv: Invoice): boolean => {
 const hasPendingItems = inv.items.some(item => item.isPending);
 return inv.status === 'sent' || inv.status === 'overdue' || (inv.status !== 'paid' && hasPendingItems);
 };

 const matchesInvoiceDueRange = (inv: Invoice, range: 'all' | 'today' | 'week'): boolean => {
 if (range === 'all') return true;
 if (!isInvoiceCollectable(inv)) return false;
 const { todayKey, weekEndKey } = getDueRangeKeys();
 const pendingDates = getInvoicePendingDates(inv);
 return range === 'today'
  ? pendingDates.some(date => date === todayKey)
  : pendingDates.some(date => date >= todayKey && date <= weekEndKey);
 };

 const invoicesDueToday = invoices.filter(inv => matchesInvoiceDueRange(inv, 'today'));
 const invoicesDueThisWeek = invoices.filter(inv => matchesInvoiceDueRange(inv, 'week'));
 const incomeTxsToday = ledgerTransactions.filter(tx => tx.type === 'income' && matchesTxDateRange(tx, 'today'));
 const incomeTxsThisWeek = ledgerTransactions.filter(tx => tx.type === 'income' && matchesTxDateRange(tx, 'week'));

 const showTransactionIncomeRange = (range: 'today' | 'week') => {
 setActiveTab('transactions');
 setTxTypeFilter('income');
 setTxDateRangeFilter(range);
 setTxCurrentPage(1);
 window.setTimeout(() => {
  document.getElementById('finance-transactions-log')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }, 80);
 };

 const showInvoiceDueRange = (range: 'today' | 'week') => {
 setActiveTab('invoices');
 setInvoiceStatusFilter('all');
 setInvoiceDueFilter(range);
 window.setTimeout(() => {
  document.getElementById('invoice-admin-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }, 80);
 };

 const filteredInvoices = invoices.filter(inv => {
 const searchLower = invSearch.toLowerCase();
 const matchesSearch = inv.clientName.toLowerCase().includes(searchLower) || 
       inv.id.toLowerCase().includes(searchLower) ||
       (inv.notes && inv.notes.toLowerCase().includes(searchLower)) ||
       inv.date.includes(searchLower) ||
       inv.total.toString().includes(searchLower) ||
       inv.items.some(item => item.description.toLowerCase().includes(searchLower));
 const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
 const matchesDue = matchesInvoiceDueRange(inv, invoiceDueFilter);
 return matchesSearch && matchesStatus && matchesDue;
 });

 const recurringExpenses = transactions.filter(t => !!t.isRecurring);
 const manualRecurring = recurringExpenses.filter(transaction => transaction.paymentMethod !== 'stripe');
 const stripePlans = stripeFinanceOverview?.activeSubscriptions ?? [];
 const stripeSubscriptions = stripePlans.filter(plan => plan.billingType === 'subscription');
 const stripeInstallments = stripePlans.filter(plan => plan.billingType === 'installment');
 const forecastMonths = Array.from({ length: 12 }, (_, index) => {
  const monthDate = new Date();
  monthDate.setDate(1);
  monthDate.setHours(12, 0, 0, 0);
  // Start with the current month so the forecast answers "what is still due
  // this month" before showing the following months.
  monthDate.setMonth(monthDate.getMonth() + index);
  const key = getMonthKey(monthDate);
  const pendingItems = transactions.filter(transaction =>
   transaction.type === 'income'
   && transaction.status === 'pending'
   && !transaction.isRecurring
   && (() => {
    const transactionDate = parseFinanceDate(transaction.date);
    return transactionDate ? getMonthKey(transactionDate) === key : false;
   })()
  );
  const recurringItems = transactions
   .filter(transaction => transaction.type === 'income' && transaction.isRecurring)
   .flatMap(transaction => getRecurringIncomeOccurrences(transaction, key).map(date => ({
    transaction,
    date,
    amount: Number(transaction.nextAmount ?? transaction.amount ?? 0)
   })));
  const pendingTotal = pendingItems.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const recurringTotal = recurringItems.reduce((sum, item) => sum + item.amount, 0);
  return {
   key,
   label: monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
   shortLabel: monthDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', ''),
   pendingItems,
   recurringItems,
   pendingTotal,
   recurringTotal,
   total: pendingTotal + recurringTotal
  };
 });
 const selectedForecast = forecastMonths.find(month => month.key === forecastMonth) || forecastMonths[0];

 return (
 <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin @container" id="finance-module-root">
  <div className="space-y-6 max-w-7xl mx-auto pb-12">
  
  {/* Page Header */}
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4">
  <div className="text-left">
   <div className="flex flex-wrap items-center gap-2.5">
   <div>
    <span className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">Administración · Tesorería</span>
    <h2 className="mt-0.5 text-2xl font-black tracking-tight text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text">
     Control de caja
    </h2>
   </div>
   
   {/* Sync status indicator */}
   {syncStatus === 'syncing' ? (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide animate-pulse">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
    Sincronizando
    </span>
   ) : syncStatus === 'synced' ? (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgb(16,185,129)]" />
    Activo
    </span>
   ) : (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-mono font-bold bg-rose-500/10 text-rose-450 border border-rose-500/20 uppercase tracking-wide">
    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
    Sin conexión
    </span>
   )}
   </div>
  </div>

  <div className="flex flex-wrap items-center justify-start md:justify-end gap-1.5">
   <button
   onClick={() => showTransactionIncomeRange('today')}
   className="h-8 bg-cyan-500/10 hover:bg-cyan-500/15 active:scale-95 text-[9px] text-cyan-200 font-bold px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-cyan-400/20"
   >
   <Calendar className="w-3.5 h-3.5" />
   <span>Hoy</span>
   <span className="rounded bg-cyan-300/10 px-1.5 py-0.5 text-[8px] text-cyan-100">{incomeTxsToday.length}</span>
   </button>
   <button
   onClick={() => showTransactionIncomeRange('week')}
   className="h-8 bg-violet-500/10 hover:bg-violet-500/15 active:scale-95 text-[9px] text-violet-200 font-bold px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-violet-400/20"
   >
   <Clock className="w-3.5 h-3.5" />
   <span>Semana</span>
   <span className="rounded bg-violet-300/10 px-1.5 py-0.5 text-[8px] text-violet-100">{incomeTxsThisWeek.length}</span>
   </button>
   <button
   onClick={() => setShowMonthlyCloseReport(true)}
   className="h-8 bg-amber-400/90 hover:bg-amber-300 active:scale-95 text-[9px] text-slate-950 font-extrabold px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-amber-300/20"
   >
   <Activity className="w-3.5 h-3.5" />
   <span>Cierre</span>
   </button>
   {activeTab === 'transactions' && (
   <button
    onClick={() => {
    resetTxForm();
    setIsTxModalOpen(true);
    }}
    id="btn-new-tx"
    className="h-8 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-[9px] text-slate-950 font-extrabold px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-400/20"
   >
    <Plus className="w-3.5 h-3.5 stroke-[3]" />
    <span>Registrar movimiento</span>
   </button>
   )}

   {activeTab === 'invoices' && (
   <button
    onClick={() => {
    resetInvForm();
    setIsInvModalOpen(true);
    }}
    id="btn-new-invoice"
    className="h-8 bg-blue-600 hover:bg-blue-500 active:scale-95 text-[9px] text-white font-extrabold px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-blue-400/20"
   >
    <Plus className="w-3.5 h-3.5 stroke-[3]" />
    <span>Factura</span>
   </button>
   )}
  </div>
  </div>

  {/* Cashflow command center: make the two primary jobs unmistakable. */}
  <section className="finance-command-center relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.11] via-[#0b1329]/75 to-violet-400/[0.06] p-4 sm:p-5">
   <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
   <div className="relative grid gap-4 xl:grid-cols-[1.05fr_1.25fr_0.9fr]">
    <div className="flex flex-col justify-between">
     <div>
      <div className="flex items-center gap-2 text-cyan-200">
       <Sparkles className="h-4 w-4" />
       <span className="text-[9px] font-black uppercase tracking-[.2em]">Tu día financiero</span>
      </div>
      <h3 className="mt-2 text-lg font-black text-white">Cobros, pagos y decisiones claras.</h3>
      <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-slate-400">Registra una operación en segundos y prioriza lo que realmente mueve la caja.</p>
     </div>
     <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={() => { resetTxForm(); setTxType('income'); setTxCategory('Facturado'); setTxStatus('paid'); setIsTxModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-[11px] font-black text-slate-950 transition hover:bg-emerald-300">
       <ArrowUpRight className="h-4 w-4" /> Registrar cobro
      </button>
      <button type="button" onClick={() => { resetTxForm(); setTxType('expense'); setTxStatus('paid'); setIsTxModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/[0.09] px-4 py-2.5 text-[11px] font-black text-rose-200 transition hover:bg-rose-400/[0.15]">
       <ArrowDownLeft className="h-4 w-4" /> Registrar pago
      </button>
     </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
     <button type="button" onClick={() => { setActiveTab('transactions'); setTxTypeFilter('income'); setTxDateRangeFilter('all'); setTxCurrentPage(1); }} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300/30">
      <div className="flex items-center justify-between"><Clock className="h-4 w-4 text-amber-300" /><span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[8px] font-black text-amber-200">ACCIÓN</span></div>
      <strong className="mt-4 block text-2xl font-black text-white">{pendingIncomes.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</strong>
      <span className="mt-1 block text-[10px] font-bold text-amber-200">por cobrar · {pendingIncomeItems.length} operaciones</span>
     </button>
     <button type="button" onClick={() => { setActiveTab('transactions'); setTxTypeFilter('expense'); setTxDateRangeFilter('all'); setTxCurrentPage(1); }} className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.06] p-4 text-left transition hover:-translate-y-0.5 hover:border-rose-300/30">
      <div className="flex items-center justify-between"><WalletCards className="h-4 w-4 text-rose-300" /><span className="text-[8px] font-black uppercase tracking-wider text-rose-200">salidas</span></div>
      <strong className="mt-4 block text-2xl font-black text-white">{pendingExpenses.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</strong>
      <span className="mt-1 block text-[10px] font-bold text-rose-200">por pagar · {pendingExpenseItems.length} operaciones</span>
     </button>
     <button type="button" onClick={() => setActiveTab('forecast')} className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.06] p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-300/30">
      <div className="flex items-center justify-between"><ReceiptText className="h-4 w-4 text-violet-300" /><span className="text-[8px] font-black uppercase tracking-wider text-violet-200">próximo</span></div>
      <strong className="mt-4 block truncate text-sm font-black text-white">{nextCollection ? getTransactionDisplayConcept(nextCollection.description) : 'Sin cobros próximos'}</strong>
      <span className="mt-1 block text-[10px] font-bold text-violet-200">{nextCollection ? `${nextCollection.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € · ${parseFinanceDate(nextCollection.date)?.toLocaleDateString('es-ES')}` : 'Crea una previsión para empezar'}</span>
     </button>
    </div>

    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
     <div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Salud de cobro</span><span className="text-sm font-black text-emerald-300">{collectionRate}%</span></div>
     <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all" style={{ width: `${collectionRate}%` }} /></div>
     <p className="mt-3 text-[10px] leading-relaxed text-slate-400">{overdueCollections.length > 0 ? `${overdueCollections.length} cobro${overdueCollections.length === 1 ? '' : 's'} vencido${overdueCollections.length === 1 ? '' : 's'} requieren seguimiento.` : 'No tienes cobros vencidos registrados.'}</p>
     <button type="button" onClick={() => { setActiveTab('invoices'); setInvoiceStatusFilter('sent'); }} className="mt-3 text-[10px] font-black text-cyan-300 transition hover:text-cyan-100">Abrir seguimiento de facturas →</button>
    </div>
   </div>
  </section>

  {syncStatus === 'error' && (
  <div className="bg-gradient-to-r from-rose-500/5 to-amber-500/20 border border-rose-500/20 p-5 rounded-3xl text-left space-y-3 relative overflow-hidden">
   <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
   <div className="flex flex-col md:flex-row md:items-start gap-3 justify-between relative z-10">
   <div className="flex items-start gap-3.5">
    <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-450 mt-0.5 border border-rose-500/20">
    <SlidersHorizontal className="w-5 h-5" />
    </div>
    <div className="space-y-1">
    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
     <span>Modo Local: Tablas no encontradas en tu Supabase</span>
    </h4>
    <p className="text-xs text-slate-300 leading-relaxed font-light">
     Para habilitar la persistencia multiusuario real, copia el script SQL preparado a continuación de forma directa e insértalo en el <span className="font-semibold text-white">SQL Editor</span> de Supabase. El sistema sincronizará automáticamente todos los datos.
    </p>
    </div>
   </div>
   <button
    onClick={() => {
    const sql = `-- Copia y pega esto en tu consola SQL de Supabase para habilitar las finanzas reales:

CREATE TABLE IF NOT EXISTS finance_transactions (
 id TEXT PRIMARY KEY,
 user_id TEXT,
 type TEXT NOT NULL,
 category TEXT NOT NULL,
 amount NUMERIC NOT NULL,
 date TEXT NOT NULL,
 description TEXT,
 "isRecurring" BOOLEAN DEFAULT false,
 "recurrencePeriod" TEXT,
 status TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON finance_transactions FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON finance_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON finance_transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON finance_transactions FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS finance_invoices (
 id TEXT PRIMARY KEY,
 user_id TEXT,
 "clientId" TEXT,
 "clientName" TEXT,
 "clientEmail" TEXT,
 date TEXT NOT NULL,
 "dueDate" TEXT NOT NULL,
 status TEXT,
 items JSONB,
 subtotal NUMERIC,
 "taxPercentage" NUMERIC,
 "taxAmount" NUMERIC,
 total NUMERIC,
 notes TEXT,
 alias TEXT,
 color TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE finance_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON finance_invoices FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON finance_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON finance_invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON finance_invoices FOR DELETE USING (true);

-- Si la tabla ya existía, añadimos las nuevas columnas alias y color
ALTER TABLE finance_invoices ADD COLUMN IF NOT EXISTS alias TEXT;
ALTER TABLE finance_invoices ADD COLUMN IF NOT EXISTS color TEXT;`;
    navigator.clipboard.writeText(sql);
    const toast = document.getElementById('toast-msg');
    if (toast) {
     const label = toast.querySelector('span');
     if (label) label.textContent = '¡Script SQL Copiado al portapapeles!';
     toast.className = toast.className.replace('opacity-0 pointer-events-none', 'opacity-100');
     setTimeout(() => {
     toast.className = toast.className.replace('opacity-100', 'opacity-0 pointer-events-none');
     }, 3000);
    }
    }}
    className="bg-white/10 hover:bg-white/20 text-white text-xs py-2 px-4 rounded-xl border border-white/10 transition-all font-bold cursor-pointer active:scale-95 flex-shrink-0 flex items-center justify-center gap-1.5"
   >
    <span>Copiar Script SQL</span>
   </button>
   </div>
  </div>
  )}

  {/* Analytics scope and live Stripe funds */}
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
   <section className="rounded-3xl border border-white/5 bg-[#0b1329]/30 p-4 sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
     <div>
      <span className="text-[9px] font-black uppercase tracking-[.2em] text-slate-500">Periodo de analíticas</span>
      <h3 className="mt-1 text-sm font-bold text-white">Vista financiera superior</h3>
      <p className="mt-1 text-[10px] text-slate-500">Los seis indicadores se recalculan con el periodo elegido.</p>
     </div>
     <div className="flex rounded-2xl border border-white/10 bg-black/25 p-1">
      <button
       type="button"
       onClick={() => setAnalyticsRange('month')}
       className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${analyticsRange === 'month' ? 'bg-cyan-400/15 text-cyan-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
      >
       Este mes
      </button>
      <button
       type="button"
       onClick={() => setAnalyticsRange('all')}
       className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${analyticsRange === 'all' ? 'bg-cyan-400/15 text-cyan-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
      >
       Todo
      </button>
     </div>
    </div>
   </section>

   <section className="relative overflow-hidden rounded-3xl border border-indigo-300/15 bg-gradient-to-br from-indigo-400/[0.09] via-[#0b1329]/70 to-cyan-400/[0.04] p-4 sm:p-5">
    <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-indigo-400/10 blur-3xl" />
    <div className="relative flex items-start justify-between gap-3">
     <div className="flex items-center gap-3">
      <div className="rounded-2xl border border-indigo-300/15 bg-indigo-400/10 p-2"><img src="/stripe-mark.png" alt="Stripe" className="h-6 w-6 rounded-md" /></div>
      <div>
       <span className="text-[9px] font-black uppercase tracking-[.2em] text-indigo-300">Fondos Stripe</span>
       <p className="mt-0.5 text-[9px] text-slate-500">Saldo real de la cuenta {stripeFunds?.livemode ? 'live' : 'test'}</p>
      </div>
     </div>
     <button type="button" onClick={() => void refreshStripeFunds()} disabled={stripeFundsLoading} className="rounded-xl border border-white/10 bg-black/20 p-2 text-slate-400 transition hover:text-white disabled:opacity-50" title="Actualizar fondos de Stripe">
      <RefreshCw className={`h-3.5 w-3.5 ${stripeFundsLoading ? 'animate-spin' : ''}`} />
     </button>
    </div>
    <div className="relative mt-4 grid grid-cols-2 gap-3">
     <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.06] p-3">
      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-300">Disponible</span>
      <strong className="mt-1 block text-lg font-black text-white">{stripeFundsLoading && !stripeFunds ? '...' : formatStripeFundAmounts(stripeFunds?.available)}</strong>
     </div>
     <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.06] p-3">
      <span className="text-[8px] font-black uppercase tracking-wider text-amber-300">Pendiente</span>
      <strong className="mt-1 block text-lg font-black text-white">{stripeFundsLoading && !stripeFunds ? '...' : formatStripeFundAmounts(stripeFunds?.pending)}</strong>
     </div>
    </div>
    {stripeFundsError && <p className="relative mt-2 text-[9px] text-rose-300">{stripeFundsError}</p>}
   </section>
  </div>

  <div className="grid gap-4 lg:grid-cols-2">
   <section className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.08] to-[#0b1329]/60 p-5"><div className="flex items-center justify-between"><div><span className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Tesorería · Revolut Pro</span><h3 className="mt-1 text-sm font-bold text-white">Saldo de empresa</h3></div><Landmark className="h-5 w-5 text-cyan-300" /></div><strong className={`mt-4 block text-3xl font-black ${revolutBalance >= 0 ? 'text-white' : 'text-rose-300'}`}>{revolutBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong><p className="mt-1 text-[10px] text-slate-500">Saldo conciliado actual. Incluye los gastos ya registrados ({revolutExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € con Revolut Pro).</p><label className="mt-4 block text-[8px] font-black uppercase tracking-wider text-slate-500">Saldo actual importado<input type="number" value={revolutOpeningBalance || ''} onChange={event => setRevolutOpeningBalance(Number(event.target.value) || 0)} placeholder="0,00" className="mt-1 block w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none" /></label></section>
   <section className="rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.08] to-[#0b1329]/60 p-5"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-amber-300" /><div><span className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Objetivos y recompensa</span><h3 className="mt-1 text-sm font-bold text-white">Incentivo de administración</h3></div></div><div className="mt-4 grid grid-cols-3 gap-2"><label className="text-[8px] text-slate-500">Semana €<input type="number" value={financeGoals.weekRevenue || ''} onChange={event => setFinanceGoals({ ...financeGoals, weekRevenue: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-xs text-white" /></label><label className="text-[8px] text-slate-500">Mes €<input type="number" value={financeGoals.monthRevenue || ''} onChange={event => setFinanceGoals({ ...financeGoals, monthRevenue: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-xs text-white" /></label><label className="text-[8px] text-slate-500">Webs/mes<input type="number" value={financeGoals.monthWebsites || ''} onChange={event => setFinanceGoals({ ...financeGoals, monthWebsites: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-xs text-white" /></label></div><label className="mt-2 block text-[8px] text-slate-500">Recompensa<input value={financeGoals.reward || ''} onChange={event => setFinanceGoals({ ...financeGoals, reward: event.target.value })} placeholder="Ej. sueldo fundadores: 500 € → 1.000 €" className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" /></label></section>
  </div>

  {/* Financial Bento Scoreboard Metrics */}
  <div className="finance-metric-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5">
  
  {/* Metric 1: Saldo Consolidado */}
  <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-emerald-500/[0.02]">
   <div className="absolute top-4 right-4 bg-emerald-500/10 rounded-xl p-2 border border-emerald-500/10 group-hover:scale-105 transition-transform duration-300">
   <CheckCircle2 className="w-4 h-4 text-emerald-400" />
   </div>
   <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500" />
   <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Cobrado en caja</span>
   <h3 className="text-3xl font-black text-white mt-2 tracking-normal font-sans select-all">
   {consolidatedBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-emerald-400 text-lg ml-1 font-sans">€</span>
   </h3>
   <p className="text-[10px] text-emerald-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
   <TrendingUp className="w-3.5 h-3.5" />
   <span>Ingresos ya liquidados</span>
   </p>
  </div>

  {/* Metric 2: Saldo Pendiente */}
  <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-amber-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-amber-500/[0.02]">
   <div className="absolute top-4 right-4 bg-amber-500/10 rounded-xl p-2 border border-amber-500/10 group-hover:scale-105 transition-transform duration-300">
   <Clock className="w-4 h-4 text-amber-400" />
   </div>
   <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-500" />
   <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Pendiente neto</span>
   <h3 className="text-3xl font-black text-white mt-2 tracking-normal font-sans select-all">
   {pendingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-amber-400 text-lg ml-1 font-sans">€</span>
   </h3>
   <p className="text-[10px] text-amber-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
   <Repeat className="w-3.5 h-3.5 animate-pulse" />
   <span>Cobros menos pagos pendientes</span>
   </p>
  </div>

  {/* Metric 3: Ingresos Totales */}
  <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-blue-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-blue-500/[0.02]">
   <div className="absolute top-4 right-4 bg-blue-500/10 rounded-xl p-2 border border-blue-500/10 group-hover:scale-105 transition-transform duration-300">
   <ArrowUpRight className="w-4 h-4 text-blue-400" />
   </div>
   <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-500" />
   <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Ingresos registrados</span>
   <h3 className="text-3xl font-black text-white mt-2 tracking-normal font-sans select-all">
   {totalIncomes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-blue-450 text-lg ml-1 font-sans">€</span>
   </h3>
   <p className="text-[10px] text-blue-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
   <DollarSign className="w-3.5 h-3.5" />
   <span>Cobrados y por cobrar</span>
   </p>
  </div>

  {/* Metric 4: Gastos Totales */}
  <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-rose-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-rose-500/[0.02]">
   <div className="absolute top-4 right-4 bg-rose-500/10 rounded-xl p-2 border border-rose-500/10 group-hover:scale-105 transition-transform duration-300">
   <ArrowDownLeft className="w-4 h-4 text-rose-400" />
   </div>
   <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-500" />
   <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Pagos registrados</span>
   <h3 className="text-3xl font-black text-white mt-2 tracking-normal font-sans select-all">
   {totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-rose-400 text-lg ml-1 font-sans">€</span>
   </h3>
   <p className="text-[10px] text-rose-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
   <TrendingDown className="w-3.5 h-3.5" />
   <span>Liquidados y pendientes</span>
   </p>
  </div>

  {/* Metric 5: Sueldos Comerciales */}
  <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-violet-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-violet-500/[0.02]">
   <div className="absolute top-4 right-4 bg-violet-500/10 rounded-xl p-2 border border-violet-500/10 group-hover:scale-105 transition-transform duration-300">
   <Briefcase className="w-4 h-4 text-violet-400" />
   </div>
   <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all duration-500" />
   <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Sueldos Comerciales</span>
   <h3 className="text-3xl font-black text-white mt-2 tracking-normal font-sans select-all">
   {commercialSalaries.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-violet-400 text-lg ml-1 font-sans">€</span>
   </h3>
   <p className="text-[10px] text-violet-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
   <CreditCard className="w-3.5 h-3.5" />
   <span>Comisiones liquidadas</span>
   </p>
  </div>

  {/* Metric 6: Saldo Neto */}
  <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-cyan-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-cyan-500/[0.02]">
   <div className="absolute top-4 right-4 bg-cyan-500/10 rounded-xl p-2 border border-cyan-500/10 group-hover:scale-105 transition-transform duration-300">
   <ShieldCheck className="w-4 h-4 text-cyan-400" />
   </div>
   <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all duration-500" />
   <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Caja neta</span>
   <h3 className="text-3xl font-black text-white mt-2 tracking-normal font-sans select-all">
   {netCashBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-cyan-400 text-lg ml-1 font-sans">€</span>
   </h3>
   <p className="text-[10px] text-cyan-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
   <DollarSign className="w-3.5 h-3.5" />
   <span>Ingresos - gastos - sueldos</span>
   </p>
  </div>

  </div>

  {/* Navigation Inside Finance Module - Modern Pillow Tab Controls */}
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-2 pt-2">
  <div className="bg-[#0b1329]/60 p-1 border border-white/5 rounded-2xl flex flex-wrap gap-1">
   <button
   onClick={() => setActiveTab('transactions')}
   className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer ${
    activeTab === 'transactions'  ?
    'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/5' 
    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
   }`}
   >
   Actividad
   </button>
   <button
   onClick={() => setActiveTab('recurring')}
   className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 ${
    activeTab === 'recurring'  ?
    'bg-purple-500/10 border border-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/5' 
    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
   }`}
   >
   <span>Planes y recurrencias</span>
   <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'recurring' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-slate-400'}`}>
    {stripePlans.length + manualRecurring.length}
   </span>
   </button>
   <button
   onClick={() => setActiveTab('forecast')}
   className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 ${
    activeTab === 'forecast'
    ? 'bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 shadow-sm shadow-cyan-500/5'
    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
   }`}
   >
   <CalendarDays className="w-3.5 h-3.5" />
   <span>Previsión</span>
   </button>
   <button
   onClick={() => setActiveTab('invoices')}
   className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 ${
    activeTab === 'invoices'  ?
    'bg-blue-500/10 border border-blue-500/20 text-blue-300 shadow-sm shadow-blue-500/5' 
    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
   }`}
   >
   <LayoutDashboard className="w-3.5 h-3.5" />
   <span>Facturas</span>
   <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'invoices' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400'}`}>
    {invoices.length}
   </span>
   </button>
   <button
   onClick={() => setActiveTab('stripe')}
   className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 ${
    activeTab === 'stripe'  ?
    'bg-[#00f2fe]/10 border border-[#00f2fe]/20 text-[#00f2fe] shadow-sm shadow-[#00f2fe]/5' 
    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
   }`}
   >
   <img src="/stripe-mark.png" alt="" className="h-4 w-4 rounded-[4px]" />
   <span>Stripe</span>
   </button>
   <button
   onClick={() => setActiveTab('comerciales')}
   className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 ${
    activeTab === 'comerciales'  ?
    'bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/5' 
    : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
   }`}
   >
   <User className="w-3.5 h-3.5" />
   <span>Equipo</span>
   </button>
  </div>

  {/* Dynamic Context Helpers */}
  <span className="text-[11px] font-mono text-slate-500 text-left sm:text-right">
   {activeTab === 'transactions'  ?
   `${filteredTxs.length} movimientos visibles` 
   : activeTab === 'forecast' ?
    `${selectedForecast?.total.toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '0,00'} € previstos`
   : activeTab === 'recurring'  ?
    `${stripePlans.length} planes Stripe · ${manualRecurring.length} manuales` 
    : activeTab === 'stripe' ?
    `Pasarela Stripe Integrada & Activa`
    : `${comercialesList.length} representantes comerciales`}
  </span>
  </div>

  {/* Monthly income forecast */}
  {activeTab === 'forecast' && selectedForecast && (
  <div className="space-y-5">
   <section className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.08] via-[#08111d]/80 to-emerald-400/[0.04] p-5 sm:p-6">
    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
     <div>
      <span className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">Planificación de cobros</span>
      <h3 className="mt-1 text-xl font-black capitalize text-white">{selectedForecast.label}</h3>
      <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-400">Suma los ingresos pendientes cuya fecha cae en el mes y las próximas cuotas de los conceptos recurrentes de ingresos.</p>
     </div>
     <div className="rounded-2xl border border-cyan-300/15 bg-black/25 px-5 py-3 text-right">
      <span className="block text-[8px] font-black uppercase tracking-widest text-cyan-300">Cobro total previsto</span>
      <strong className="mt-1 block text-3xl font-black text-white">{selectedForecast.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong>
     </div>
    </div>
    <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
     <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.055] p-4"><span className="text-[8px] font-black uppercase tracking-wider text-amber-300">Pendientes del mes</span><strong className="mt-2 block text-xl text-white">{selectedForecast.pendingTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong><small className="mt-1 block text-[9px] text-slate-500">{selectedForecast.pendingItems.length} cobro{selectedForecast.pendingItems.length === 1 ? '' : 's'} pendiente{selectedForecast.pendingItems.length === 1 ? '' : 's'}</small></div>
     <div className="rounded-2xl border border-violet-300/10 bg-violet-300/[0.055] p-4"><span className="text-[8px] font-black uppercase tracking-wider text-violet-300">Ingresos recurrentes</span><strong className="mt-2 block text-xl text-white">{selectedForecast.recurringTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong><small className="mt-1 block text-[9px] text-slate-500">{selectedForecast.recurringItems.length} cuota{selectedForecast.recurringItems.length === 1 ? '' : 's'} prevista{selectedForecast.recurringItems.length === 1 ? '' : 's'}</small></div>
     <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.055] p-4"><span className="text-[8px] font-black uppercase tracking-wider text-emerald-300">Peso recurrente</span><strong className="mt-2 block text-xl text-white">{selectedForecast.total > 0 ? Math.round(selectedForecast.recurringTotal / selectedForecast.total * 100) : 0}%</strong><small className="mt-1 block text-[9px] text-slate-500">del cobro previsto para el mes</small></div>
    </div>
   </section>

   <section className="rounded-3xl border border-white/[0.06] bg-[#0b1329]/25 p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-3"><div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Próximos 12 meses</span><h4 className="mt-1 text-sm font-bold text-white">Selecciona un mes para ver el desglose</h4></div><CalendarDays className="h-5 w-5 text-cyan-300" /></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
     {forecastMonths.map((month, index) => (
      <button key={month.key} type="button" onClick={() => setForecastMonth(month.key)} className={`rounded-2xl border p-3 text-left transition ${forecastMonth === month.key ? 'border-cyan-300/35 bg-cyan-300/10 shadow-lg shadow-cyan-400/5' : 'border-white/[0.06] bg-black/20 hover:border-white/15 hover:bg-white/[0.025]'}`}>
       <span className={`block text-[8px] font-black uppercase tracking-wider ${forecastMonth === month.key ? 'text-cyan-300' : 'text-slate-500'}`}>{index === 0 ? 'Este mes' : month.shortLabel}</span>
       <strong className="mt-2 block text-sm text-white">{month.total.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €</strong>
       <span className="mt-1 block text-[8px] text-slate-600">{month.pendingItems.length + month.recurringItems.length} movimientos</span>
      </button>
     ))}
    </div>
   </section>

   <div className="grid gap-5 xl:grid-cols-2">
    <section className="overflow-hidden rounded-3xl border border-amber-300/10 bg-[#0b1329]/20">
     <div className="border-b border-white/[0.06] p-4"><span className="text-[9px] font-black uppercase tracking-widest text-amber-300">Pendientes con fecha en el mes</span><h4 className="mt-1 text-sm font-bold text-white">{selectedForecast.pendingItems.length} cobros · {selectedForecast.pendingTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</h4></div>
     {selectedForecast.pendingItems.length === 0 ? <div className="p-10 text-center text-xs text-slate-500">No hay ingresos pendientes fechados para este mes.</div> : <div className="divide-y divide-white/[0.05]">{selectedForecast.pendingItems.sort((a, b) => a.date.localeCompare(b.date)).map(transaction => <div key={transaction.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{getCleanBillingConcept(transaction.description)}</p><p className="mt-1 font-mono text-[9px] text-slate-500">{parseFinanceDate(transaction.date)?.toLocaleDateString('es-ES')} · {transaction.category}</p></div><strong className="shrink-0 font-mono text-sm text-amber-300">{Number(transaction.amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>)}</div>}
    </section>
    <section className="overflow-hidden rounded-3xl border border-violet-300/10 bg-[#0b1329]/20">
     <div className="border-b border-white/[0.06] p-4"><span className="text-[9px] font-black uppercase tracking-widest text-violet-300">Cuotas recurrentes previstas</span><h4 className="mt-1 text-sm font-bold text-white">{selectedForecast.recurringItems.length} cuotas · {selectedForecast.recurringTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</h4></div>
     {selectedForecast.recurringItems.length === 0 ? <div className="p-10 text-center text-xs text-slate-500">No hay ingresos recurrentes previstos para este mes.</div> : <div className="divide-y divide-white/[0.05]">{selectedForecast.recurringItems.sort((a, b) => a.date.getTime() - b.date.getTime()).map((item, index) => <div key={`${item.transaction.id}_${item.date.toISOString()}_${index}`} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{getCleanBillingConcept(item.transaction.description)}</p><p className="mt-1 font-mono text-[9px] text-slate-500">{item.date.toLocaleDateString('es-ES')} · {item.transaction.recurrencePeriod === 'weekly' ? 'Semanal' : item.transaction.recurrencePeriod === 'yearly' ? 'Anual' : 'Mensual'}</p></div><strong className="shrink-0 font-mono text-sm text-violet-300">{item.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>)}</div>}
    </section>
   </div>
  </div>
  )}

  {/* Tab Content 1: Transactions list */}
  {activeTab === 'transactions' && (
  <div className="space-y-4">
   {/* Filtering bar */}
   <div className="bg-[#0b1329]/20 backdrop-blur-md border border-white/5 p-4 rounded-3xl flex flex-col lg:flex-row items-stretch lg:items-center gap-4 justify-between">
   <div className="flex flex-wrap items-center gap-2">
     <button
     onClick={() => {
      setTxTypeFilter('all');
      setTxDateRangeFilter('all');
      setTxCurrentPage(1);
     }}
    className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
     txTypeFilter === 'all' ?
     'bg-white/10 border-white/20 text-white shadow-md'
     : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
    >
    Todos
    </button>
     <button
     onClick={() => {
      setTxTypeFilter('income');
      setTxDateRangeFilter('all');
      setTxCurrentPage(1);
     }}
    className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
     txTypeFilter === 'income' ?
     'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5'
     : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
    >
    Ingresos
    </button>
     <button
     onClick={() => {
      setTxTypeFilter('expense');
      setTxDateRangeFilter('all');
      setTxCurrentPage(1);
     }}
    className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
     txTypeFilter === 'expense' ?
     'bg-rose-500/10 border-rose-500/30 text-rose-455 shadow-md shadow-rose-500/5'
     : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
    >
    Gastos
    </button>

    <div className="h-5 w-px bg-white/10 mx-2 hidden sm:block" />

    <div className="flex items-center gap-2">
    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
    <select
     value={txCategoryFilter}
     onChange={(e) => setTxCategoryFilter(e.target.value)}
     className="bg-slate-950 border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
    >
     {categories.map(cat => (
     <option key={cat} value={cat}>
      {cat === 'All' ? 'Todas las Categorías' : cat}
     </option>
     ))}
    </select>
    </div>
   </div>

   <div className="relative w-full lg:w-80">
    <input
    type="text"
    value={txSearch}
    onChange={(e) => setTxSearch(e.target.value)}
    placeholder="Buscar concepto o categoría..."
    className="w-full bg-slate-950 border border-white/10 text-xs rounded-xl pl-3 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-light"
    />
    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[10px]">
    🔍
    </div>
   </div>
   </div>

   <div className="flex justify-end">
    <button
     type="button"
     onClick={() => setShowExportPanel(previous => !previous)}
     className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-400/15"
    >
     <FileSpreadsheet className="h-4 w-4" />
     Exportar Excel
    </button>
   </div>

   {showExportPanel && (
    <section className="rounded-3xl border border-emerald-300/15 bg-gradient-to-br from-emerald-300/[0.07] via-[#0b1329]/70 to-cyan-300/[0.03] p-4 sm:p-5">
     <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
       <span className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">Exportación profesional</span>
       <h3 className="mt-1 text-sm font-bold text-white">Descargar bitácora en Excel</h3>
       <p className="mt-1 text-[10px] text-slate-500">Incluye resumen, totales, filtros, columnas ordenadas y referencias de factura y Stripe.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[170px_170px_180px_auto]">
       <label className="block">
        <span className="mb-1 block text-[8px] font-black uppercase tracking-wider text-slate-500">Movimientos</span>
        <select value={exportType} onChange={event => setExportType(event.target.value as typeof exportType)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400/40">
         <option value="all">Todos</option>
         <option value="income">Solo ingresos</option>
         <option value="expense">Solo gastos</option>
        </select>
       </label>
       <label className="block">
        <span className="mb-1 block text-[8px] font-black uppercase tracking-wider text-slate-500">Periodo</span>
        <select value={exportPeriod} onChange={event => setExportPeriod(event.target.value as typeof exportPeriod)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400/40">
         <option value="all">Todo</option>
         <option value="month">Un mes</option>
         <option value="date">Fecha concreta</option>
        </select>
       </label>
       {exportPeriod === 'month' ? (
        <label className="block">
         <span className="mb-1 block text-[8px] font-black uppercase tracking-wider text-slate-500">Mes</span>
         <input type="month" value={exportMonth} onChange={event => setExportMonth(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400/40" />
        </label>
       ) : exportPeriod === 'date' ? (
        <label className="block">
         <span className="mb-1 block text-[8px] font-black uppercase tracking-wider text-slate-500">Fecha</span>
         <input type="date" value={exportDate} onChange={event => setExportDate(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400/40" />
        </label>
       ) : <div className="hidden xl:block" />}
       <button type="button" onClick={() => void handleExportTransactions()} disabled={exportLoading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60">
        {exportLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {exportLoading ? 'Generando...' : 'Descargar .xlsx'}
       </button>
      </div>
     </div>
    </section>
   )}

    {txDateRangeFilter !== 'all' && (
    <div id="finance-transactions-log" className="bg-cyan-500/5 border border-cyan-400/20 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
     <div className="flex items-center gap-2 text-xs text-cyan-100">
     {txDateRangeFilter === 'today' ? <Calendar className="w-4 h-4 text-cyan-300" /> : <Clock className="w-4 h-4 text-violet-300" />}
     <span className="font-bold">
      Mostrando ingresos de {txDateRangeFilter === 'today' ? 'hoy' : 'esta semana'} en la bitácora de transacciones
     </span>
     <span className="text-[10px] font-mono text-slate-400">
      {filteredTxs.length} registros
     </span>
     </div>
     <button
     type="button"
     onClick={() => {
      setTxDateRangeFilter('all');
      setTxCurrentPage(1);
     }}
     className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-slate-300 font-bold uppercase tracking-wider"
     >
     Limpiar filtro
     </button>
    </div>
    )}

    {/* Table list */}
    <div id={txDateRangeFilter === 'all' ? 'finance-transactions-log' : undefined} className="bg-[#0b1329]/10 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-xl">
   <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] bg-black/10 px-4 py-2.5">
    <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">Código visual</span>
    <div className="flex flex-wrap items-center gap-2.5 text-[8px] font-semibold text-slate-500" aria-label="Leyenda de señales de transacción">
     <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3 text-amber-300" /> Comercial</span>
     <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3 text-violet-300" /> Recurrente</span>
     <span className="inline-flex items-center gap-1"><img src="/stripe-mark.png" alt="" className="h-3 w-3 rounded-[3px]" /> Stripe</span>
     <span className="inline-flex items-center gap-1"><Banknote className="h-3 w-3 text-emerald-300" /> Efectivo</span>
     <span className="inline-flex items-center gap-1"><Landmark className="h-3 w-3 text-cyan-300" /> Transferencia</span>
    </div>
   </div>
   <div className="overflow-x-auto font-sans">
    <table className="w-full text-left border-collapse">
    <thead>
     <tr className="border-b border-white/5 bg-[#0b1329]/40 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
     <th className="p-3 font-bold">Operación</th>
     <th className="p-3 font-bold">Señales</th>
     <th className="p-3 font-bold">Categoría</th>
     <th className="p-3 font-bold">Fecha</th>
     <th className="p-3 font-bold">Importe</th>
     <th className="p-3 font-bold">Estado</th>
     <th className="p-3 font-bold text-right">Acciones</th>
     </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
     {currentTxs.length === 0 ? (
     <tr>
      <td colSpan={7} className="p-16 text-center text-slate-500 text-xs font-light">
      No se encontraron registros de transacciones.
      </td>
     </tr>
     ) : (
     currentTxs.map(t => {
      // Custom aesthetic colors for categories
      const catColors: Record<string, string> = {
      'Desarrollo': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'Consultoría': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'Infraestructura': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Software Herramientas': 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      'Dominios': 'bg-slate-500/10 text-slate-300 border-slate-500/20',
      'Marketing': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'Facturado': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      };
      const tagStyle = catColors[t.category] || 'bg-white/5 text-slate-300 border-white/10';
      const linkedInv = getLinkedInvoice(t);
      const stripeDashboardUrl = getStripeDashboardUrl(t.stripeCheckoutSessionId, t.stripeInvoiceId);
      const installment = getTransactionInstallment(t);
      const transactionDescription = (t.description || '').toLocaleLowerCase('es');
      const transactionClient = contacts.find(contact => contact.id === t.clientId)
       || contacts.find(contact => contact.id === linkedInv?.clientId)
       || contacts.find(contact => {
        const company = (contact.company || '').trim().toLocaleLowerCase('es');
        return company.length > 2 && company !== 'independent' && transactionDescription.includes(company);
       });
      const businessName = getFinanceBusinessName(transactionClient) || linkedInv?.clientName || '';

      return (
      <tr 
       key={t.id} 
       className={`text-xs transition-colors group relative ${
       linkedInv  ?
        'bg-blue-500/[0.035] hover:bg-blue-500/[0.065] border-l-2 border-l-blue-500/70'
        : 'hover:bg-white/[0.018]'
       }`}
      >
       <td className="p-3 text-left align-middle">
       <div className="max-w-xs sm:max-w-md text-left">
        <span className="mb-1 block font-mono text-[7.5px] uppercase leading-none tracking-wider text-slate-600 select-all">
        {t.id}
        </span>
        {businessName && (
         <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-cyan-400/15 bg-gradient-to-r from-cyan-400/[0.09] to-blue-400/[0.04] px-2 py-1 text-[9.5px] font-black leading-none text-cyan-100 shadow-[inset_0_1px_rgba(255,255,255,.03)]" title={`Negocio: ${businessName}`}>
          <Briefcase className="h-3 w-3 shrink-0 text-cyan-300" />
          <span className="truncate">{businessName}</span>
         </span>
        )}
        <span className={`${businessName ? 'mt-2 text-[12px] font-extrabold text-white' : 'text-[12px] font-extrabold text-white'} block leading-snug tracking-tight transition-colors group-hover:text-emerald-300`}>
         {getTransactionDisplayConcept(t.description)}
        </span>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {installment ? (
         <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/[0.08] px-1.5 py-0.5 font-mono text-[7.5px] font-black uppercase tracking-wide text-amber-300">
          <span className="grid h-3.5 min-w-3.5 place-items-center rounded bg-amber-300/10 px-0.5">{installment.index}</span>
          Cuota {installment.index}/{installment.total}
         </span>
        ) : null}
        {linkedInv && (
         <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/15 bg-blue-500/[0.07] px-1.5 py-0.5 font-mono text-[7.5px] font-bold text-blue-300">
         <FileText className="h-2.5 w-2.5" />
         <span>{linkedInv.id}</span>
         <span className={`w-1.5 h-1.5 rounded-full ${linkedInv.status === 'paid' ? 'bg-emerald-400' : 'bg-amber-400'}`} title={linkedInv.status === 'paid' ? 'Factura Pagada' : 'Factura Pendiente / Borrador'} />
         </span>
        )}
        </div>
       </div>
       </td>
       <td className="p-3 align-middle">
        <TransactionOriginSignals transaction={t} stripeDashboardUrl={stripeDashboardUrl} />
       </td>
       <td className="p-3 text-left align-middle">
       <span className={`text-[8px] font-mono border px-2 py-0.5 rounded-md uppercase tracking-wider font-bold ${tagStyle}`}>
        {t.category}
       </span>
       </td>
       <td className="p-3 text-left align-middle font-mono text-[9px] text-slate-400">
       {t.date}
       </td>
       <td className="p-3 text-left align-middle">
       <span className={`font-mono text-[11px] font-black tracking-tight ${linkedInv ? 'text-blue-400' : t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
        {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
       </span>
       </td>
       <td className="p-3 text-left align-middle">
       {t.status === 'paid' ? (
       <button
        onClick={() => handleToggleTransactionStatus(t)}
        className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 font-mono text-[8px] font-black uppercase tracking-wide text-emerald-300 transition hover:border-amber-400/20 hover:bg-amber-400/[0.07] hover:text-amber-300"
        title="Haga clic para revertir / desmarcar de Bitácora (cambiará a Pendiente)"
        >
        <CheckCircle2 className="h-3 w-3" />
        <span>Liquidado</span>
        </button>
       ) : (
        <div className="flex items-center gap-1.5">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-2.5 font-mono text-[8px] font-black uppercase tracking-wide text-amber-300">
         <Clock className="h-3 w-3" />
         Pendiente
        </span>
        <button
         onClick={() => handleToggleTransactionStatus(t)}
         className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 text-[8px] font-black uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-400/[0.15]"
         title={t.type === 'income' ? 'Marcar como cobrado y sincronizar facturas/conceptos' : 'Marcar como pagado'}
        >
         <Check className="h-3 w-3" />
         <span>{t.type === 'income' ? 'Cobrar' : 'Pagar'}</span>
        </button>
        </div>
       )}
       </td>
       <td className="p-3 text-right align-middle">
       <div className="inline-flex items-center justify-end gap-1 rounded-xl border border-white/[0.05] bg-black/20 p-1">
        {linkedInv ? (
        <button
         onClick={() => setPreviewInvoice(linkedInv)}
         className="grid h-7 w-7 place-items-center rounded-lg border border-blue-400/10 bg-blue-400/[0.06] text-blue-300 transition hover:border-blue-400/20 hover:bg-blue-400/[0.12]"
         title={`Ver Factura Vinculada (${linkedInv.id})`}
        >
         <FileText className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
        ) : (
        t.type === 'income' && (
         <button
         onClick={() => handleCreateInvoiceFromTransaction(t)}
         className="grid h-7 w-7 place-items-center rounded-lg border border-amber-400/10 bg-amber-400/[0.05] text-amber-300 transition hover:border-amber-400/20 hover:bg-amber-400/[0.11]"
         title="Facturar este cobro (Generar y editar factura)"
         >
         <FileText className="h-3.5 w-3.5" />
         </button>
        )
        )}
        <button
        onClick={() => handleEditTx(t)}
        className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-slate-400 transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
        title="Editar transacción"
        >
        <Edit className="h-3.5 w-3.5" />
        </button>
        {!t.isRecurring && (
        <button
         onClick={() => handleMakeTransactionRecurring(t)}
         className="grid h-7 w-7 place-items-center rounded-lg border border-violet-400/15 bg-violet-400/[0.06] text-violet-300 transition hover:border-violet-400/30 hover:bg-violet-400/[0.13]"
         title={`Convertir este ${t.type === 'income' ? 'cobro' : 'pago'} en recurrencia`}
        >
         <Repeat className="h-3.5 w-3.5" />
        </button>
        )}
        <button
        onClick={() => handleDeleteTx(t.id)}
        className="grid h-7 w-7 place-items-center rounded-lg border border-rose-400/10 bg-rose-400/[0.035] text-slate-500 transition hover:border-rose-400/20 hover:bg-rose-400/[0.09] hover:text-rose-300"
        title="Eliminar registro"
        >
        <Trash2 className="h-3.5 w-3.5" />
        </button>
       </div>
       </td>
      </tr>
      );
     })
     )}
    </tbody>
    </table>
   </div>

   {/* Pagination Controls */}
   {totalTxPages > 1 && (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t border-white/5 bg-[#0b1329]/15 text-xs">
    <span className="text-slate-400 font-sans">
     Mostrando registros <strong className="text-slate-200">{(safeCurrentPage - 1) * txItemsPerPage + 1}</strong> - <strong className="text-slate-200">{Math.min(safeCurrentPage * txItemsPerPage, filteredTxs.length)}</strong> de <strong className="text-slate-300 font-bold">{filteredTxs.length}</strong>
    </span>
    <div className="flex items-center gap-1.5 font-mono">
     <button
     onClick={() => {
      setTxCurrentPage(prev => Math.max(1, prev - 1));
      document.getElementById('finance-module-root')?.scrollTo({ top: 0, behavior: 'smooth' });
     }}
     disabled={safeCurrentPage === 1}
     className="px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none text-[11px] font-bold"
     >
     ← Anterior
     </button>
     {Array.from({ length: totalTxPages }, (_, i) => i + 1).map(pageNum => (
     <button
      key={pageNum}
      onClick={() => {
      setTxCurrentPage(pageNum);
      document.getElementById('finance-module-root')?.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className={`w-7 h-7 flex items-center justify-center rounded-xl font-bold text-[11px] transition cursor-pointer border ${
      pageNum === safeCurrentPage ?
       'bg-purple-600/10 text-purple-400 border-purple-500/30'
       : 'bg-transparent border-transparent hover:border-white/5 hover:bg-white/[0.02] text-slate-400 hover:text-slate-200'
      }`}
     >
      {pageNum}
     </button>
     ))}
     <button
     onClick={() => {
      setTxCurrentPage(prev => Math.min(totalTxPages, prev + 1));
      document.getElementById('finance-module-root')?.scrollTo({ top: 0, behavior: 'smooth' });
     }}
     disabled={safeCurrentPage === totalTxPages}
     className="px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none text-[11px] font-bold"
     >
     Siguiente →
     </button>
    </div>
    </div>
   )}
   </div>
  </div>
  )}

  {/* Tab Content 2: plans and non-Stripe recurrences */}
  {activeTab === 'recurring' && (
   <div className="space-y-5">
    <section className="relative overflow-hidden rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-400/[0.1] via-[#0b1329]/75 to-cyan-400/[0.04] p-5 sm:p-6">
     <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />
     <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
       <span className="text-[9px] font-black uppercase tracking-[.22em] text-violet-300">Cobros programados</span>
       <h3 className="mt-1 text-xl font-black text-white">Planes y recurrencias</h3>
       <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-400">Stripe se lee automáticamente y separa las suscripciones de los pagos fraccionados. Las recurrencias manuales se registran por efectivo o transferencia, sin mezclarlas con la pasarela.</p>
      </div>
      <div className="flex flex-wrap gap-2">
       <button type="button" onClick={() => { resetTxForm(); setTxIsRecurring(true); setTxPaymentMethod('transfer'); setIsTxModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.1] px-3.5 py-2.5 text-[10px] font-black text-cyan-200 transition hover:bg-cyan-300/[0.17]"><Landmark className="h-4 w-4" /> Añadir transferencia</button>
       <button type="button" onClick={() => { resetTxForm(); setTxIsRecurring(true); setTxPaymentMethod('cash'); setIsTxModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.1] px-3.5 py-2.5 text-[10px] font-black text-emerald-200 transition hover:bg-emerald-300/[0.17]"><Banknote className="h-4 w-4" /> Añadir efectivo</button>
      </div>
     </div>
     <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.07] p-4"><span className="text-[8px] font-black uppercase tracking-wider text-violet-300">Suscripciones Stripe</span><strong className="mt-1 block text-2xl text-white">{stripeSubscriptions.length}</strong><span className="text-[9px] text-slate-500">cobro automático recurrente</span></div>
      <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] p-4"><span className="text-[8px] font-black uppercase tracking-wider text-amber-300">Pagos fraccionados</span><strong className="mt-1 block text-2xl text-white">{stripeInstallments.length}</strong><span className="text-[9px] text-slate-500">planes con cuotas pendientes</span></div>
      <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] p-4"><span className="text-[8px] font-black uppercase tracking-wider text-cyan-300">Recurrencias manuales</span><strong className="mt-1 block text-2xl text-white">{manualRecurring.length}</strong><span className="text-[9px] text-slate-500">efectivo o transferencia</span></div>
     </div>
    </section>

    <section className="rounded-3xl border border-white/[0.06] bg-[#0b1329]/25 p-4 sm:p-5">
     <div className="mb-4 flex items-center justify-between gap-3"><div><span className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Stripe · sincronizado</span><h4 className="mt-1 text-sm font-bold text-white">Suscripciones recurrentes</h4></div><button type="button" onClick={() => void refreshStripeFinanceOverview()} disabled={stripeFinanceLoading} className="rounded-xl border border-white/10 bg-black/20 p-2 text-slate-400 hover:text-white"><RefreshCw className={`h-4 w-4 ${stripeFinanceLoading ? 'animate-spin' : ''}`} /></button></div>
     {stripeFinanceError ? <p className="mb-3 text-[10px] text-rose-300">{stripeFinanceError}</p> : null}
     <div className="grid gap-3 lg:grid-cols-2">
      {stripeFinanceLoading && !stripeFinanceOverview ? <div className="col-span-full py-10 text-center text-xs text-slate-500"><RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin" />Consultando Stripe…</div> : stripeSubscriptions.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">No hay suscripciones recurrentes activas en Stripe.</div> : stripeSubscriptions.map(plan => <article key={plan.id} className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.045] p-4 transition hover:border-violet-300/30"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/[0.1] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-violet-200">{plan.paymentLimit ? `${plan.paymentLimit} cobros · temporal` : 'Suscripción'}</span><h5 className="mt-3 truncate text-sm font-black text-white">{plan.customerName}</h5><p className="mt-1 truncate text-[10px] text-slate-500">{plan.customerEmail || 'Cliente Stripe'}</p></div><strong className="shrink-0 text-right font-mono text-sm text-white">{formatStripeCurrency(plan.amount, plan.currency)}<small className="block text-[8px] font-normal text-violet-300">/ {formatStripeInterval(plan.interval, plan.intervalCount)}</small></strong></div><div className="mt-4 flex items-center justify-between border-t border-violet-300/10 pt-3 text-[9px]"><span className="text-slate-400">{plan.paymentCount}/{plan.paymentLimit || '∞'} cobrados · {plan.paymentLimit ? `último pago ${plan.endsAt ? new Date(plan.endsAt).toLocaleDateString('es-ES') : 'programado'}` : `último ${plan.lastPaidAt ? new Date(plan.lastPaidAt).toLocaleDateString('es-ES') : 'sin pagos'}`}</span><span className="flex items-center gap-3"><button type="button" onClick={() => void handleSetStripeFinalChargeDate(plan)} className="font-black text-amber-300 hover:text-amber-100">Definir último cobro</button><a href={plan.dashboardUrl} target="_blank" rel="noreferrer" className="font-black text-violet-300 hover:text-violet-100">Ver Stripe →</a></span></div></article>)}
     </div>
    </section>

    <section className="rounded-3xl border border-amber-300/12 bg-[#0b1329]/25 p-4 sm:p-5"><div className="mb-4"><span className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Stripe · financiación</span><h4 className="mt-1 text-sm font-bold text-white">Pagos split / fraccionados</h4><p className="mt-1 text-[10px] text-slate-500">Planes con un número limitado de cuotas; no se tratan como una suscripción abierta.</p></div><div className="grid gap-3 lg:grid-cols-2">{stripeInstallments.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">No hay pagos fraccionados activos.</div> : stripeInstallments.map(plan => <article key={plan.id} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.045] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/[0.1] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-amber-200">{plan.installmentCount || '?'} cuotas</span><h5 className="mt-3 truncate text-sm font-black text-white">{plan.customerName}</h5><p className="mt-1 text-[10px] text-amber-200">{plan.paymentCount}/{plan.paymentLimit || plan.installmentCount || '?'} cobradas · quedan {formatStripeCurrency(plan.openAmount, plan.currency)}</p>{plan.endsAt && <p className="mt-1 text-[9px] text-slate-500">Última cuota: {new Date(plan.endsAt).toLocaleDateString('es-ES')}</p>}</div><strong className="shrink-0 font-mono text-sm text-white">{formatStripeCurrency(plan.amount, plan.currency)}</strong></div><div className="mt-4 flex justify-end border-t border-amber-300/10 pt-3"><a href={plan.dashboardUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black text-amber-300 hover:text-amber-100">Abrir plan en Stripe →</a></div></article>)}</div></section>

    <section className="rounded-3xl border border-cyan-300/12 bg-[#0b1329]/25 p-4 sm:p-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Fuera de Stripe</span><h4 className="mt-1 text-sm font-bold text-white">Recurrencias manuales</h4><p className="mt-1 text-[10px] text-slate-500">Movimientos periódicos pagados por transferencia o efectivo.</p></div><button type="button" onClick={() => { resetTxForm(); setTxIsRecurring(true); setIsTxModalOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[10px] font-black text-slate-950"><Plus className="h-4 w-4" /> Nueva recurrencia</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{manualRecurring.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">Añade una recurrencia manual para controlar los cobros y pagos no procesados por Stripe.</div> : manualRecurring.map(item => <article key={item.id} className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.04] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${item.paymentMethod === 'cash' ? 'border-emerald-300/20 bg-emerald-300/[0.1] text-emerald-200' : 'border-cyan-300/20 bg-cyan-300/[0.1] text-cyan-200'}`}>{item.paymentMethod === 'cash' ? <Banknote className="h-3 w-3" /> : <Landmark className="h-3 w-3" />}{item.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}</span><h5 className="mt-3 truncate text-sm font-black text-white">{getTransactionDisplayConcept(item.description)}</h5><p className="mt-1 text-[10px] text-slate-500">{item.type === 'income' ? 'Cobro' : 'Pago'} · {item.recurrencePeriod === 'weekly' ? 'semanal' : item.recurrencePeriod === 'yearly' ? 'anual' : 'mensual'}</p></div><strong className={item.type === 'income' ? 'font-mono text-sm text-emerald-300' : 'font-mono text-sm text-rose-300'}>{item.type === 'income' ? '+' : '-'}{(item.nextAmount ?? item.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div><div className="mt-4 flex items-center justify-between border-t border-cyan-300/10 pt-3"><span className="text-[9px] text-slate-400">{getRecurringLastPaymentDate(item) ? `Último pago: ${getRecurringLastPaymentDate(item)}` : `Próxima: ${getNextPaymentDate(item.date, item.recurrencePeriod)}`}</span><div className="flex gap-2"><button type="button" onClick={() => handleEditTx(item)} className="text-[9px] font-black text-cyan-300">Editar</button><button type="button" onClick={() => handleProcessRecurring(item)} className="text-[9px] font-black text-white">Registrar hoy</button></div></div></article>)}</div></section>
   </div>
  )}

  {/* Legacy recurrent-card implementation retained temporarily but no longer rendered. */}
  {false && activeTab === 'recurring' && (
  <div className="space-y-5">
   <div className="bg-[#120e25]/30 backdrop-blur-md border border-purple-500/10 p-5 rounded-3xl text-left relative overflow-hidden group">
   <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none group-hover:bg-purple-500/10 transition-colors duration-500" />
   <h3 className="text-white text-sm font-bold flex items-center gap-2 relative z-10 font-sans tracking-tight">
    <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
    </span>
    <Repeat className="w-4 h-4 text-purple-450" />
    <span>Suscripciones e Ingresos/Gastos Recurrentes</span>
   </h3>
   <p className="text-slate-400 text-xs font-light mt-1.5 leading-relaxed max-w-3xl relative z-10 font-sans">
    Cada vencimiento genera automáticamente un movimiento positivo o negativo en su fecha programada y queda reflejado en la bitácora. El botón manual permite registrar hoy una cuota adicional sin duplicar otra del mismo concepto y fecha.
   </p>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
   {recurringExpenses.length === 0 ? (
    <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-slate-900/10 rounded-3xl border border-white/5 font-light">
    No tienes conceptos recurrentes configurados. Registra una nueva transacción (ingreso o gasto) y activa el marcador de recurrencia.
    </div>
   ) : (
    recurringExpenses.map(item => (
    <div 
     key={item.id} 
     className="bg-[#0b1329]/20 backdrop-blur-md border border-white/5 p-5 rounded-3xl flex flex-col justify-between hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/[0.02] hover:-translate-y-0.5 transition-all duration-300 text-left relative overflow-hidden group/card"
    >
     <div className="space-y-3">
     <div className="flex justify-between items-start gap-2">
      <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-xl uppercase tracking-wider font-extrabold">
       {item.recurrencePeriod === 'weekly' || item.recurrencePeriod === 'semanal'  ?
       'Semanal' 
       : item.recurrencePeriod === 'yearly' || item.recurrencePeriod === 'anual'  ?
        'Anual' 
        : 'Mensual'}
      </span>
      <span className={`text-[9px] font-mono border px-2 py-0.5 rounded-xl uppercase tracking-wider font-bold ${
       item.type === 'income'  ?
       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
       : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      }`}>
       {item.type === 'income' ? 'Ingreso' : 'Gasto'}
      </span>
      {item.recurrenceOccurrenceCount && (
       <span className="rounded-xl border border-amber-400/20 bg-amber-400/[0.08] px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-amber-300">
        {item.recurrenceOccurrenceCount} cobros · fin {item.recurrenceEndDate || 'programado'}
       </span>
      )}
      </div>
      <div className="text-right shrink-0">
      {item.firstAmount !== undefined || item.nextAmount !== undefined ? (
       <div className="space-y-0.5">
       <div className="text-[10px] text-slate-400 font-mono">
        1º: <span className="font-bold text-white">{((item.firstAmount !== undefined ? item.firstAmount : item.amount)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
       </div>
       <div className="text-[10px] text-purple-400 font-mono">
        Próx: <span className="font-bold text-purple-300">{(item.nextAmount ?? item.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
       </div>
       </div>
      ) : (
       <span className="font-bold text-xs font-mono text-white">
       {item.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
       </span>
      )}
      </div>
     </div>

     <div>
      <h4 className="font-bold text-xs text-white leading-snug group-hover/card:text-purple-300 transition-colors">
      {item.description}
      </h4>
      <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-wider">
      {item.category}
      </p>
     </div>

     <div className="pt-2 flex items-center gap-1.5 text-[10px] text-purple-300 font-mono bg-purple-500/5 px-2.5 py-1.5 rounded-xl border border-purple-500/10">
      <Calendar className="w-3.5 h-3.5 text-purple-400" />
      <span>{item.type === 'income' ? 'Siguiente ingreso' : 'Siguiente cargo'}: <strong className="text-white">{getNextPaymentDate(item.date, item.recurrencePeriod)}</strong></span>
     </div>

     {/* Generated Stripe Link box for subscription */}
     {activeRecStripeUrl[item.id] && (
      <div className="bg-[#05050a]/90 border border-violet-500/30 rounded-xl p-2.5 flex flex-col gap-2 text-left transition-all animate-fadeIn mt-2">
      <div className="flex items-center justify-between">
       <span className="text-[8px] font-mono text-emerald-400 font-extrabold uppercase">Suscripción Stripe Lista</span>
       <span className="text-[7px] font-mono text-slate-500">Cobro automático mensual</span>
      </div>
      <div className="flex items-center gap-1.5">
       <input
       type="text"
       readOnly
       value={activeRecStripeUrl[item.id]}
       className="bg-[#030305] border border-white/5 text-[9px] text-slate-350 px-2.5 py-1 rounded focus:outline-none flex-1 font-mono truncate"
       />
       <button
       type="button"
       onClick={() => {
        navigator.clipboard.writeText(activeRecStripeUrl[item.id]);
        const toast = document.getElementById('toast-msg');
        if (toast) {
        toast.innerText = `Éxito: ¡Enlace de suscripción Stripe copiado!`;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 3000);
        }
       }}
       className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[9px] text-white font-bold rounded border border-white/5 transition cursor-pointer shrink-0"
       >
       Copiar
       </button>
       <a
       href={activeRecStripeUrl[item.id]}
       target="_blank"
       rel="noreferrer"
       className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-[9px] text-white font-bold rounded transition text-center shrink-0"
       >
       Pagar
       </a>
      </div>
      </div>
     )}
     </div>

     <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-1.5">
     <div className="flex items-center gap-1">
      <button
      onClick={() => handleEditTx(item)}
      className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl transition duration-200 cursor-pointer"
      title={item.type === 'income' ? 'Editar ingreso recurrente' : 'Editar cargo recurrente'}
      >
      <Edit className="w-3.5 h-3.5" />
      </button>

      {/* Generate Stripe Subscription Link button */}
      {item.type === 'income' && (
      <button
       disabled={recStripeLoading[item.id]}
       onClick={() => handleGenerateStripeForRecurring(item)}
       className="p-1.5 bg-violet-600/15 hover:bg-violet-600/30 text-violet-400 border border-violet-500/20 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center"
       title="Generar Link de Stripe para que el cliente rellene su tarjeta y se cobre cada mes"
      >
       {recStripeLoading[item.id] ? (
       <span className="w-3.5 h-3.5 border border-violet-400 border-t-transparent rounded-full animate-spin" />
       ) : (
       <CreditCard className="w-3.5 h-3.5" />
       )}
      </button>
      )}

      <button
      onClick={() => handleDeleteTx(item.id)}
      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition duration-200 cursor-pointer"
      title={item.type === 'income' ? 'Eliminar ingreso recurrente' : 'Eliminar cargo recurrente'}
      >
      <Trash2 className="w-3.5 h-3.5" />
      </button>
     </div>
     <button
      onClick={() => handleProcessRecurring(item)}
      className="text-[10px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-extrabold px-3.5 py-2 rounded-xl transition duration-200 cursor-pointer flex items-center gap-1 active:scale-95 shadow-md shadow-purple-500/10"
     >
      <span>Registrar hoy</span>
      <ArrowUpRight className="w-3 h-3" />
     </button>
     </div>
    </div>
    ))
   )}
   </div>
  </div>
  )}

  {/* Tab Content 3: Invoices Screen */}
  {activeTab === 'invoices' && (
  <div className="space-y-5">
   <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-5">
   <aside className="bg-[#080b16]/90 border border-white/7 rounded-3xl p-3 h-fit xl:sticky xl:top-3">
    <div className="p-3 border-b border-white/5 mb-2">
    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-blue-400">Admin panel</span>
    <h3 className="text-sm font-black text-white mt-1">Control de facturación</h3>
    </div>
    <nav className="flex xl:flex-col gap-1 overflow-x-auto pb-1 xl:pb-0">
    <button onClick={() => document.getElementById('invoice-admin-overview')?.scrollIntoView({ behavior: 'smooth' })} className="shrink-0 flex items-center gap-2 rounded-xl bg-blue-600 text-white px-3 py-2.5 text-[11px] font-bold">
     <LayoutDashboard className="w-3.5 h-3.5" /> Overview
    </button>
    <button onClick={() => { setInvoiceStatusFilter('all'); document.getElementById('invoice-admin-list')?.scrollIntoView({ behavior: 'smooth' }); }} className="shrink-0 flex items-center gap-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 px-3 py-2.5 text-[11px] font-bold">
     <FileText className="w-3.5 h-3.5" /> Facturas
    </button>
    <button onClick={() => { setInvoiceStatusFilter('sent'); document.getElementById('invoice-admin-list')?.scrollIntoView({ behavior: 'smooth' }); }} className="shrink-0 flex items-center gap-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 px-3 py-2.5 text-[11px] font-bold">
     <Clock className="w-3.5 h-3.5" /> Pendientes
    </button>
    <button onClick={() => { setInvoiceStatusFilter('paid'); document.getElementById('invoice-admin-list')?.scrollIntoView({ behavior: 'smooth' }); }} className="shrink-0 flex items-center gap-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 px-3 py-2.5 text-[11px] font-bold">
     <CheckCircle2 className="w-3.5 h-3.5" /> Cobradas
    </button>
    </nav>
    <button onClick={() => { resetInvForm(); setIsInvModalOpen(true); }} className="mt-3 w-full rounded-xl bg-white text-slate-950 px-3 py-2.5 text-[11px] font-black flex items-center justify-center gap-2 active:scale-95 transition">
    <Plus className="w-3.5 h-3.5" /> Nueva factura
    </button>
   </aside>

   <div id="invoice-admin-overview" className="space-y-5 min-w-0">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
    <div>
     <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-slate-500">Estado global</span>
     <h3 className="text-2xl font-black text-white">Centro de operaciones</h3>
     <p className="text-xs text-slate-400 mt-1">Control en tiempo real de clientes, facturas y cobros.</p>
    </div>
    <span className="inline-flex self-start sm:self-auto items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-mono text-emerald-400">
     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sistema operativo
    </span>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {[
     { label: 'Clientes', value: contacts.length, note: 'registrados', icon: User, color: 'text-violet-400' },
     { label: 'Facturas', value: invoices.length, note: 'totales', icon: FileText, color: 'text-blue-400' },
     { label: 'Pendientes', value: invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length, note: 'por cobrar', icon: Clock, color: 'text-amber-400' },
     { label: 'Cobradas', value: invoices.filter(inv => inv.status === 'paid').length, note: 'completadas', icon: CheckCircle2, color: 'text-emerald-400' }
    ].map(metric => (
     <button key={metric.label} onClick={() => { if (metric.label === 'Pendientes') setInvoiceStatusFilter('sent'); else if (metric.label === 'Cobradas') setInvoiceStatusFilter('paid'); else setInvoiceStatusFilter('all'); document.getElementById('invoice-admin-list')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-left bg-[#0b1329]/35 hover:bg-[#0b1329]/60 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition group">
     <div className="flex items-center justify-between">
      <metric.icon className={`w-4 h-4 ${metric.color}`} />
      <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition" />
     </div>
     <span className="block text-[9px] uppercase font-mono text-slate-500 mt-5">{metric.label}</span>
     <strong className="text-2xl text-white">{metric.value}</strong>
     <span className="text-[9px] text-slate-500 ml-1">{metric.note}</span>
     </button>
     ))}
     </div>

     <section className="rounded-3xl border border-amber-400/15 bg-amber-500/[0.035] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
       <div>
        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-amber-400">Cobros por facturar</span>
        <h4 className="mt-1 text-base font-black text-white">Importes pendientes de clientes</h4>
        <p className="mt-1 text-[10px] text-slate-500">Genera la factura con el pago seleccionado y todas las cuotas pendientes del mismo cliente.</p>
       </div>
       <strong className="font-mono text-lg text-amber-300">
        {ledgerTransactions.filter(tx => tx.type === 'income' && tx.status === 'pending').reduce((sum, tx) => sum + tx.amount, 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
       </strong>
      </div>

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
       {ledgerTransactions.filter(tx => tx.type === 'income' && tx.status === 'pending').length === 0 ? (
        <p className="rounded-2xl border border-white/5 bg-black/15 p-4 text-center text-[10px] text-slate-500">No hay importes pendientes.</p>
       ) : ledgerTransactions.filter(tx => tx.type === 'income' && tx.status === 'pending').map(tx => {
        const client = contacts.find(contact => contact.id === tx.clientId);
        return (
         <div key={tx.id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
           <p className="truncate text-xs font-bold text-white">{client?.company || client?.name || tx.description}</p>
           <p className="mt-1 truncate text-[9px] text-slate-500">{tx.description} · Vence {tx.date}</p>
          </div>
          <span className="font-mono text-sm font-black text-amber-300">{tx.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
          <button
           type="button"
           onClick={() => handleCreateInvoiceFromTransaction(tx)}
           className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black text-blue-300 transition hover:bg-blue-500/20 hover:text-white"
          >
           Generar factura
          </button>
         </div>
        );
       })}
      </div>
     </section>

     <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,.75fr)] gap-4">
    <div className="bg-[#080b16]/70 border border-white/5 rounded-3xl p-5 min-h-[300px]">
     <div className="flex items-center justify-between">
     <div>
      <h4 className="text-base font-black text-white">Pulso financiero</h4>
      <span className="text-[9px] font-mono text-slate-500 uppercase">Ingresos y gastos · últimos 12 días</span>
     </div>
     <div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-wider">
      <span className="inline-flex items-center gap-1 text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Ingresos</span>
      <span className="inline-flex items-center gap-1 text-rose-300"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" />Gastos</span>
     </div>
     </div>
     {(() => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const dailyData = Array.from({ length: 12 }, (_, index) => {
       const date = new Date(today);
       date.setDate(today.getDate() - (11 - index));
       const key = getFinanceDateKey(date.toISOString());
       const dayTransactions = transactions.filter(transaction => !transaction.isRecurring && getFinanceDateKey(transaction.date) === key);
       return {
        key,
        date,
        income: dayTransactions.filter(transaction => transaction.type === 'income').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
        expense: dayTransactions.filter(transaction => transaction.type === 'expense').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
       };
      });
      const maximum = Math.max(1, ...dailyData.flatMap(day => [day.income, day.expense]));

      return (
       <div className="mt-7">
        <div className="flex h-44 items-end gap-1.5 border-b border-white/10 px-1.5">
         {dailyData.map(day => (
          <div key={day.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
           <div className="flex h-[calc(100%-18px)] items-end justify-center gap-0.5">
            <div title={`${day.date.toLocaleDateString('es-ES')}: ingresos ${day.income.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`} className="w-[42%] max-w-5 rounded-t bg-gradient-to-t from-emerald-600 to-cyan-300 transition-all group-hover:brightness-125" style={{ height: day.income > 0 ? `${Math.max(5, (day.income / maximum) * 100)}%` : '0%' }} />
            <div title={`${day.date.toLocaleDateString('es-ES')}: gastos ${day.expense.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`} className="w-[42%] max-w-5 rounded-t bg-gradient-to-t from-rose-700 to-rose-400 transition-all group-hover:brightness-125" style={{ height: day.expense > 0 ? `${Math.max(5, (day.expense / maximum) * 100)}%` : '0%' }} />
           </div>
           <span className="mt-1 block truncate text-center font-mono text-[7px] text-slate-600 group-hover:text-slate-400">{day.date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>
          </div>
         ))}
        </div>
       </div>
      );
     })()}
    </div>

    <div className="bg-[#080b16]/70 border border-white/5 rounded-3xl p-5 flex flex-col">
     <div className="flex items-center gap-2">
     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
     <h4 className="text-base font-black text-white">Ops Stream</h4>
     </div>
     <div className="mt-5 space-y-4 flex-1">
     {[...adminMessages, ...invoices.slice(0, 4).map(inv => ({ id: inv.id, text: `${inv.clientName} · ${inv.status === 'paid' ? 'factura cobrada' : 'factura actualizada'}`, time: inv.date }))].slice(0, 5).map((event, index) => (
      <div key={`${event.id}-${index}`} className="flex gap-3">
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${index === 0 ? 'bg-violet-500' : 'bg-blue-500'}`} />
      <div className="min-w-0"><p className="text-[11px] text-slate-200 truncate">{event.text}</p><span className="text-[9px] font-mono text-slate-600">{event.time}</span></div>
      </div>
     ))}
     {!adminMessages.length && !invoices.length && <p className="text-[10px] text-slate-600">Sin actividad reciente.</p>}
     </div>
     <div className="mt-5 pt-4 border-t border-white/5 flex gap-2">
     <input value={adminMessage} onChange={event => setAdminMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && adminMessage.trim()) { setAdminMessages(current => [{ id: String(Date.now()), text: adminMessage.trim(), time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }, ...current]); setAdminMessage(''); } }} placeholder="Nota administrativa…" className="min-w-0 flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-violet-500" />
     <button onClick={() => { if (!adminMessage.trim()) return; setAdminMessages(current => [{ id: String(Date.now()), text: adminMessage.trim(), time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }, ...current]); setAdminMessage(''); }} className="p-2 rounded-xl bg-violet-600 text-white"><ArrowUpRight className="w-4 h-4" /></button>
     </div>
    </div>
    </div>
   </div>
   </div>

   {/* Top filter and search for invoices */}
   <div id="invoice-admin-list" className="bg-[#0b1329]/20 backdrop-blur-md border border-white/5 p-4 rounded-3xl flex flex-col lg:flex-row items-stretch lg:items-center gap-4 justify-between scroll-mt-5">
   <div className="flex flex-wrap items-center gap-2">
    <button
    onClick={() => setInvoiceStatusFilter('all')}
    className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
     invoiceStatusFilter === 'all' ?
     'bg-white/10 border-white/20 text-white shadow-md'
     : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
    >
    Todas
    </button>
    <button
    onClick={() => setInvoiceStatusFilter('draft')}
    className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
     invoiceStatusFilter === 'draft' ?
     'bg-slate-700/20 border-white/10 text-slate-350 shadow-md'
     : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
    >
    Borradores
    </button>
    <button
    onClick={() => setInvoiceStatusFilter('sent')}
    className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
     invoiceStatusFilter === 'sent' ?
     'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-md shadow-blue-500/5'
     : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
    >
    Enviadas
    </button>
    <button
    onClick={() => setInvoiceStatusFilter('paid')}
    className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
     invoiceStatusFilter === 'paid' ?
     'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5'
     : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
    >
    Pagadas
    </button>
    <button
    onClick={() => setInvoiceDueFilter(invoiceDueFilter === 'today' ? 'all' : 'today')}
    className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
     invoiceDueFilter === 'today' ?
      'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-md shadow-amber-500/5'
     : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
    >
    Cobran hoy
    </button>
    <button
    onClick={() => setInvoiceDueFilter(invoiceDueFilter === 'week' ? 'all' : 'week')}
    className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
     invoiceDueFilter === 'week' ?
      'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-md shadow-cyan-500/5'
     : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
    >
    Cobran esta semana
    </button>
   </div>

   <div className="relative w-full lg:w-80">
    <input
    type="text"
    value={invSearch}
    onChange={(e) => setInvSearch(e.target.value)}
    placeholder="Buscar por cliente o código..."
    className="w-full bg-slate-950 border border-white/10 text-xs rounded-xl pl-3 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-light"
    />
    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[10px]">
    🔍
    </div>
   </div>
   </div>

   {/* Large layout bento or grid of Invoices */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
   {filteredInvoices.length === 0 ? (
    <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-slate-900/10 rounded-3xl border border-white/5 font-light">
    No se encontraron facturas registradas.
    </div>
   ) : (
    filteredInvoices.map((inv) => {
    const cardStyles = getInvoiceCardStyles(inv.color);
    const pendingItems = inv.items.filter(item => item.isPending);
    const isFullyPaid = inv.status === 'paid' || pendingItems.length === 0;
    return (
     <div 
     key={inv.id}
     onClick={() => setPreviewInvoice(inv)}
     className={`${cardStyles.bg} backdrop-blur-md p-5 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 group cursor-pointer text-left relative overflow-hidden`}
     >
     <div className="space-y-4">
      <div className="flex justify-between items-start gap-2">
      <div className="min-w-0 flex-1">
       <div className="flex items-center gap-1.5 flex-wrap">
       <span className="text-[9px] text-slate-500 font-mono tracking-wider block uppercase">{inv.id}</span>
       {inv.alias && (
        <span className="px-1.5 py-0.2 bg-white/5 text-[8px] font-bold text-slate-350 border border-white/10 rounded uppercase tracking-wider font-mono">
        {inv.alias}
        </span>
       )}
       </div>
       <h4 className={`font-bold text-xs text-white leading-snug group-hover:${cardStyles.accent} transition-colors mt-1 truncate`}>
       {inv.clientName}
       </h4>
      </div>
      
      {/* Status Badges */}
      {inv.status === 'paid' ? (
      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-lg shrink-0">
       <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(16,185,129)]" />
       Pagada
      </span>
      ) : inv.status === 'sent' ? (
      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2.5 py-0.5 rounded-lg shrink-0">
       <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
       Enviada
      </span>
      ) : (
      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-slate-400 bg-slate-700/20 border border-white/10 px-2.5 py-0.5 rounded-lg shrink-0">
       Borrador
      </span>
      )}
     </div>

     <div className="flex justify-between text-slate-400 text-[9px] font-mono border-t border-b border-white/[0.03] py-2">
      <span>Emisión: {inv.date}</span>
      <span>Vence: {inv.dueDate}</span>
     </div>

     <div className="pt-1 flex items-center justify-between">
      <span className="text-[10px] text-slate-500 font-light">{inv.items.length} conceptos detallados</span>
      <span className="text-sm font-bold text-white font-mono">{inv.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
     </div>

     {/* Concept-by-concept interactive list inside card */}
     {!isFullyPaid && <div className="mt-3 pt-2 border-t border-white/[0.03] space-y-1.5" onClick={e => e.stopPropagation()}>
      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Conceptos (Clic para cobrar/pendiente)</span>
      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
      {inv.items.map((it) => (
       <div 
       key={it.id} 
       onClick={(e) => handleToggleConceptPaid(inv, it.id, e)}
       className={`flex items-center justify-between p-1.5 rounded-xl text-xs transition-all border group/item cursor-pointer select-none ${
        it.isPending  ?
        'bg-amber-500/[0.02] border-amber-500/10 hover:border-amber-500/30 text-slate-350 hover:bg-amber-500/[0.04]' 
        : 'bg-emerald-500/[0.01] border-emerald-500/5 hover:border-emerald-500/15 text-slate-400 hover:bg-emerald-500/[0.02]'
       }`}
       >
       <div className="flex items-center gap-1.5 min-w-0 pr-1.5">
        {/* Checkbox status indicator */}
        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
        it.isPending ?
         'border-amber-500/30 bg-amber-500/5 group-hover/item:border-amber-400'
         : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
        }`}>
        {!it.isPending && (
         <span className="text-[8px] font-bold">✓</span>
        )}
        </div>
        <span className={`truncate text-[10px] leading-tight ${!it.isPending ? 'line-through text-slate-500' : 'font-medium text-slate-200'}`}>
        {getCleanBillingConcept(it.description)}
        </span>
       </div>
       <div className="flex items-center gap-1 shrink-0">
        <span className="font-mono text-[9px] text-slate-400">
        {it.total.toLocaleString('es-ES')}€
        </span>
        {it.isPending ? (
        <span className="text-[7px] uppercase font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 rounded text-amber-400">
         Pte
        </span>
        ) : (
        <span className="text-[7px] uppercase font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded text-emerald-400">
         Cobrado
        </span>
        )}
       </div>
       </div>
      ))}
      </div>
     </div>}
     </div>

     {/* Actions drawer */}
     <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-1">
     <span className="text-[9px] font-mono text-slate-500">{isFullyPaid ? 'Factura final lista' : `${pendingItems.length} importes pendientes`}</span>
     <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      {!isFullyPaid && (
      <button
       onClick={(e) => handleMarkAllConceptsPaid(inv, e)}
       className="bg-emerald-600/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold py-1.5 px-3 rounded-xl cursor-pointer transition active:scale-95 duration-200"
       title="Cobrar todos los conceptos de la factura"
      >
       Cobrar Todo
      </button>
      )}
      {isFullyPaid && (
      <button
       onClick={(e) => {
       e.stopPropagation();
       setPreviewInvoice(inv);
       setTimeout(handlePrintPreview, 0);
       }}
       className="bg-emerald-600/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold py-1.5 px-3 rounded-xl cursor-pointer transition active:scale-95 duration-200"
      >
       Imprimir factura
      </button>
      )}
      <button
      onClick={(e) => handleEditInvoice(inv, e)}
      className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 text-[9px] font-extrabold py-1.5 px-3 rounded-xl cursor-pointer transition duration-200"
      >
      Editar
      </button>
      <button
      onClick={(e) => handleDeleteInvoice(inv.id, e)}
      className="p-1.5 text-slate-550 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg cursor-pointer transition duration-200"
      title="Eliminar factura"
      >
      <Trash2 className="w-3.5 h-3.5" />
      </button>
     </div>
     </div>

    </div>
    );
    })
   )}
   </div>
  </div>
  )}

  {/* Tab Content 4: Pasarela Stripe Integration */}
  {activeTab === 'stripe' && (
  <div className="space-y-6 text-left">
   <div className="flex flex-col gap-3 rounded-2xl border border-[#635bff]/20 bg-[#635bff]/[0.055] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
     <img src="/stripe-mark.png" alt="Stripe" className="h-8 w-8 rounded-lg shadow-[0_0_22px_rgba(99,91,255,0.25)]" />
     <div>
      <div className="flex items-center gap-2">
       <h2 className="text-sm font-black text-white">Stripe</h2>
       <span className={`rounded-full border px-2 py-0.5 font-mono text-[7px] font-black uppercase tracking-wider ${stripeFinanceOverview?.livemode ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>
        {stripeFinanceOverview?.livemode ? 'Datos reales' : 'Modo prueba'}
       </span>
      </div>
      <p className="text-[9px] text-slate-400">Suscripciones y cobros consultados directamente en Stripe · pagos contabilizados desde el 31/07/2026.</p>
     </div>
    </div>
    <button type="button" onClick={() => void Promise.all([refreshStripeFinanceOverview(), refreshStripeFunds()])} disabled={stripeFinanceLoading || stripeFundsLoading} className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-[9px] font-bold text-slate-300 transition hover:border-[#635bff]/30 hover:text-white disabled:opacity-50">
     <RefreshCw className={`h-3.5 w-3.5 ${stripeFinanceLoading || stripeFundsLoading ? 'animate-spin' : ''}`} />
     Actualizar desde Stripe
    </button>
   </div>
   {stripeFinanceError && <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-[10px] text-rose-300">{stripeFinanceError}</div>}
   {/* Stripe Metric Banner */}
   <div className="finance-metric-grid finance-metric-grid-wide grid grid-cols-1 sm:grid-cols-3 gap-5">
   <div className="bg-gradient-to-br from-violet-600/10 to-purple-600/5 backdrop-blur-md border border-violet-500/20 p-5 rounded-3xl relative overflow-hidden">
    <div className="absolute top-5 right-5 bg-violet-500/10 rounded-2xl p-3 border border-violet-500/20">
    <Repeat className="w-5 h-5 text-violet-400 animate-pulse" />
    </div>
    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Suscripciones Activas</span>
    <h3 className="text-3xl font-black text-white mt-2 font-mono">
    {stripeFinanceLoading && !stripeFinanceOverview ? '...' : stripeFinanceOverview?.totals.activeSubscriptions ?? 0}
    </h3>
    <p className="text-[10px] text-violet-300 font-mono mt-3">
    Cobros recurrentes autogestionados
    </p>
   </div>

   <div className="bg-gradient-to-br from-cyan-600/10 to-teal-600/5 backdrop-blur-md border border-cyan-500/20 p-5 rounded-3xl relative overflow-hidden">
    <div className="absolute top-5 right-5 bg-cyan-500/10 rounded-2xl p-3 border border-cyan-500/20">
    <TrendingUp className="w-5 h-5 text-cyan-400" />
    </div>
    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">MRR Recurrente de Stripe</span>
    <h3 className="text-3xl font-black text-white mt-2 font-mono">
    {stripeFinanceLoading && !stripeFinanceOverview ? '...' : formatStripeFundAmounts(stripeFinanceOverview?.totals.mrr)}
    </h3>
    <p className="text-[10px] text-cyan-300 font-mono mt-3">
    Solo suscripciones activas de Stripe
    </p>
   </div>

   <div className="bg-gradient-to-br from-emerald-600/10 to-green-600/5 backdrop-blur-md border border-emerald-500/20 p-5 rounded-3xl relative overflow-hidden">
    <div className="absolute top-5 right-5 bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/20">
    <ShieldCheck className="w-5 h-5 text-emerald-400" />
    </div>
    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Volumen Cobrado desde 31/07</span>
    <h3 className="text-3xl font-black text-white mt-2 font-mono">
    {stripeFinanceLoading && !stripeFinanceOverview ? '...' : formatStripeFundAmounts(stripeFinanceOverview?.totals.chargedVolume)}
    </h3>
    <p className="text-[10px] text-emerald-300 font-mono mt-3">
    {stripeFinanceOverview?.totals.successfulPayments ?? 0} pagos confirmados por Stripe
    </p>
   </div>
   </div>

   <section className="grid grid-cols-1 gap-3 rounded-2xl border border-[#635bff]/15 bg-[#635bff]/[0.035] p-3 sm:grid-cols-2">
    <div className="flex items-center justify-between rounded-xl border border-emerald-400/15 bg-emerald-400/[0.055] px-4 py-3">
     <div>
      <span className="block font-mono text-[8px] font-black uppercase tracking-[.16em] text-emerald-300">Disponible en Stripe</span>
      <strong className="mt-1 block text-lg font-black text-white">{stripeFundsLoading && !stripeFunds ? '...' : formatStripeFundAmounts(stripeFunds?.available)}</strong>
     </div>
     <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/15 bg-emerald-400/10"><CheckCircle2 className="h-4 w-4 text-emerald-300" /></span>
    </div>
    <div className="flex items-center justify-between rounded-xl border border-amber-400/15 bg-amber-400/[0.055] px-4 py-3">
     <div>
      <span className="block font-mono text-[8px] font-black uppercase tracking-[.16em] text-amber-300">Pendiente · procesándose</span>
      <strong className="mt-1 block text-lg font-black text-white">{stripeFundsLoading && !stripeFunds ? '...' : formatStripeFundAmounts(stripeFunds?.pending)}</strong>
     </div>
     <span className="grid h-8 w-8 place-items-center rounded-lg border border-amber-400/15 bg-amber-400/10"><Clock className="h-4 w-4 text-amber-300" /></span>
    </div>
    {stripeFundsError && <p className="text-[9px] text-rose-300 sm:col-span-2">{stripeFundsError}</p>}
   </section>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
   {/* Left Panel: Generator */}
   <div className="lg:col-span-5 space-y-6">
    <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-4">
    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
     <CreditCard className="w-5 h-5 text-violet-400" />
     <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Generador Rápido de Cobros</h3>
    </div>

    <div className="space-y-4 text-xs">
     <div>
     <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Cliente Contacto</label>
     <select
      value={stripeClientId}
      onChange={(e) => {
      setStripeClientId(e.target.value);
      setStripeGenUrl('');
      setStripeGenError('');
      }}
      className="w-full bg-[#07070b]/90 border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition"
     >
      <option value="">-- Selecciona un cliente --</option>
      {contacts
      .filter(c => c.email)
      .map(c => (
       <option key={c.id} value={c.id}>
       {c.name} ({c.email})
       </option>
      ))
      }
     </select>
     </div>

     <div className="grid grid-cols-2 gap-3">
     <div>
      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Importe (€)</label>
      <input
      type="number"
      value={stripeGenAmount}
      onChange={(e) => {
       setStripeGenAmount(e.target.value);
       setStripeGenUrl('');
      }}
      className="w-full bg-[#07070b]/90 border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition"
      placeholder="50"
      />
     </div>
     <div>
      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Frecuencia</label>
      <select
      value={stripeGenInterval}
      onChange={(e) => {
       setStripeGenInterval(e.target.value as any);
       setStripeGenUrl('');
      }}
      className="w-full bg-[#07070b]/90 border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition"
      >
      <option value="month">Mensual (Suscripción)</option>
      <option value="year">Anual (Suscripción)</option>
      <option value="once">Pago Único (Normal)</option>
      </select>
     </div>
     </div>

     {stripeGenError && (
     <p className="text-[10px] text-rose-400 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 leading-relaxed text-left">
      {stripeGenError}
     </p>
     )}

     {!stripeGenUrl ? (
     <button
      type="button"
      disabled={stripeGenLoading || !stripeClientId}
      onClick={handleCreateFinanceStripeCheckout}
      className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_2px_12px_rgba(139,92,246,0.15)] mt-2"
     >
      {stripeGenLoading ? (
      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
      <CreditCard className="w-4 h-4" />
      )}
      <span>
      {stripeGenLoading  ?
       'Generando Enlace...' 
       : stripeGenInterval === 'once'  ?
       'Generar Enlace de Pago Único' 
       : 'Generar Enlace de Suscripción'}
      </span>
     </button>
     ) : (
     <div className="space-y-3 bg-[#040408]/60 p-4 rounded-xl border border-white/5 mt-2">
      <span className="block text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wide">¡Enlace de Pago Listo!</span>
      <p className="text-[10px] text-slate-400 leading-relaxed text-left">
      {stripeGenInterval === 'once'  ?
       'Envía este enlace de pago único para que el cliente liquide el cobro de forma inmediata:' 
       : 'Envía este enlace seguro de suscripción para domiciliar el cobro recurrente del cliente:'}
      </p>
      
      <div className="flex gap-2 pt-1">
      <button
       type="button"
       onClick={() => {
       navigator.clipboard.writeText(stripeGenUrl);
       setStripeGenCopied(true);
       setTimeout(() => setStripeGenCopied(false), 2000);
       }}
       className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 text-xs rounded-lg text-slate-350 font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
       {stripeGenCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
       <span>{stripeGenCopied ? '¡Copiado!' : 'Copiar Enlace'}</span>
      </button>
      
      <a
       href={stripeGenUrl}
       target="_blank"
       rel="noreferrer"
       className="flex-1 py-2 px-3 bg-violet-600/25 hover:bg-violet-600/35 border border-violet-500/25 text-xs rounded-lg text-violet-300 font-bold flex items-center justify-center gap-1.5 transition-all text-center"
      >
       <ExternalLink className="w-3.5 h-3.5" />
       <span>Abrir Enlace</span>
      </a>
      </div>
     </div>
     )}
    </div>
    </div>
   </div>

   {/* Right Panel: Active Subscriptions list */}
   <div className="lg:col-span-7 space-y-6">
    <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-4">
    <div className="flex items-center justify-between border-b border-white/5 pb-3">
     <div className="flex items-center gap-2">
     <Repeat className="w-5 h-5 text-violet-400" />
     <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Planes activos en Stripe</h3>
     </div>
     <span className="text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-mono font-bold">
     {stripeFinanceOverview?.totals.activeSubscriptions ?? 0} suscripciones · {stripeFinanceOverview?.totals.activeInstallmentPlans ?? 0} financiaciones
     </span>
    </div>

    <div className="space-y-3 max-h-[295px] overflow-y-auto pr-1">
     {stripeFinanceLoading && !stripeFinanceOverview ? (
     <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
      <RefreshCw className="h-4 w-4 animate-spin" /> Consultando Stripe...
     </div>
     ) : (stripeFinanceOverview?.activeSubscriptions.length ?? 0) === 0 ? (
     <div className="text-center py-12 text-slate-500 text-xs font-light">
      No hay suscripciones activas en la cuenta de Stripe.
     </div>
     ) : (
     stripeFinanceOverview!.activeSubscriptions.map(subscription => (
      <div key={subscription.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-4 bg-[#07070b]/45 rounded-2xl border border-white/5 hover:border-violet-500/20 transition group">
      <div className="space-y-1 text-left min-w-0">
       <h4 className="text-xs font-bold text-white group-hover:text-violet-400 transition truncate">{subscription.customerName}</h4>
       <p className="text-[10px] text-slate-400 font-mono truncate">{subscription.customerEmail || 'Sin email en Stripe'}</p>
       <div className="flex flex-wrap items-center gap-2 pt-1">
       <span className="text-[8px] font-mono text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-extrabold flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgb(52,211,153)]" />
        {subscription.status}
       </span>
       <span className="text-[8px] font-mono text-slate-500 truncate">
        ID: {subscription.id}
       </span>
       <span className="text-[8px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/15 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-extrabold">
        Pagos: {subscription.paymentCount}
       </span>
       <span className={`text-[8px] font-mono border px-1.5 py-0.5 rounded-md uppercase tracking-wider font-extrabold ${subscription.billingType === 'installment' ? 'border-amber-400/15 bg-amber-400/[0.07] text-amber-300' : 'border-violet-400/15 bg-violet-400/[0.07] text-violet-300'}`}>
        {subscription.billingType === 'installment' ? `Financiación · ${subscription.installmentCount || '?'} cuotas` : 'Suscripción recurrente'}
       </span>
       </div>
       <div className="mt-2 flex flex-wrap gap-2 font-mono text-[8px]">
        <span className="rounded-md border border-emerald-400/10 bg-emerald-400/[0.05] px-2 py-1 text-emerald-300">Cobrado {formatStripeCurrency(subscription.paidAmount, subscription.currency)}</span>
        <span className="rounded-md border border-amber-400/10 bg-amber-400/[0.05] px-2 py-1 text-amber-300">Abierto {formatStripeCurrency(subscription.openAmount, subscription.currency)}</span>
        {subscription.lastPaidAt && <span className="px-1 py-1 text-slate-500">Último pago {new Date(subscription.lastPaidAt).toLocaleDateString('es-ES')}</span>}
       </div>
      </div>

      <div className="text-left md:text-right shrink-0 space-y-2">
       <span className="block text-xs font-black font-mono text-white leading-none">
       {formatStripeCurrency(subscription.amount, subscription.currency)} <span className="text-[9px] text-slate-500 font-light">/ {formatStripeInterval(subscription.interval, subscription.intervalCount)}</span>
       </span>
       <div className="flex flex-wrap gap-1.5 md:justify-end">
       {subscription.customerId && (
       <button
        type="button"
        disabled={stripePortalLoading === subscription.id}
        onClick={() => handleOpenFinanceStripePortal(subscription.customerId, subscription.id)}
        className="inline-flex items-center gap-1 py-1 px-2.5 bg-white/5 hover:bg-white/10 text-[9px] rounded-lg text-slate-350 font-bold border border-white/5 transition cursor-pointer"
       >
        {stripePortalLoading === subscription.id ? (
        <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
        <ExternalLink className="w-2.5 h-2.5" />
        )}
        <span>Portal</span>
       </button>
       )}
       <a href={subscription.dashboardUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[#635bff]/20 bg-[#635bff]/10 px-2.5 py-1 text-[9px] font-bold text-violet-300 transition hover:bg-[#635bff]/20">
        <img src="/stripe-mark.png" alt="" className="h-3 w-3 rounded-[3px]" /> Ver en Stripe
       </a>
       </div>
      </div>
      </div>
     ))
     )}
    </div>
    </div>
   </div>
   </div>

   {/* Bottom Section: Payment Logs */}
   <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-4">
   <div className="flex items-center justify-between border-b border-white/5 pb-3">
    <div className="flex items-center gap-2">
    <img src="/stripe-mark.png" alt="" className="h-5 w-5 rounded-[5px]" />
    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Registro Histórico de Pagos Stripe</h3>
    </div>
    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
    {stripeFinanceOverview?.paymentHistory.length ?? 0} cobros reales
    </span>
   </div>

   <div className="overflow-x-auto">
    <table className="w-full text-xs">
    <thead>
     <tr className="border-b border-white/5 text-[9px] font-mono uppercase tracking-widest text-slate-500">
     <th className="p-3 text-left font-bold">ID Transacción</th>
     <th className="p-3 text-left font-bold">Concepto / Cliente</th>
     <th className="p-3 text-left font-bold">Fecha de Pago</th>
     <th className="p-3 text-left font-bold">Importe</th>
     <th className="p-3 text-right font-bold">Estado de Sincronización</th>
     </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
     {stripeFinanceLoading && !stripeFinanceOverview ? (
     <tr><td colSpan={5} className="p-12 text-center text-slate-500 text-xs"><RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin" />Consultando pagos...</td></tr>
     ) : (stripeFinanceOverview?.paymentHistory.length ?? 0) === 0 ? (
     <tr>
      <td colSpan={5} className="p-12 text-center text-slate-500 text-xs font-light">
      Stripe no ha devuelto cobros pagados para esta cuenta.
      </td>
     </tr>
     ) : (
     stripeFinanceOverview!.paymentHistory.map(payment => (
      <tr key={payment.id} className="hover:bg-white/[0.01] transition-colors">
       <td className="p-3 font-mono text-[9px] text-slate-400 select-all">{payment.id}</td>
       <td className="p-3 text-left">
       <span className="font-bold text-white">{payment.concept}</span>
       <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{payment.customerName}{payment.customerEmail ? ` · ${payment.customerEmail}` : ''}</span>
       </td>
       <td className="p-3 text-slate-350">{new Date(payment.paidAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
       <td className="p-3 font-mono font-bold text-emerald-450">
       {formatStripeCurrency(payment.amount, payment.currency)}
       {payment.refundedAmount > 0 && <span className="block text-[8px] font-normal text-rose-300">Reembolsado {formatStripeCurrency(payment.refundedAmount, payment.currency)}</span>}
       </td>
       <td className="p-3 text-right">
       <div className="inline-flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[8px] font-bold ${payment.status === 'paid' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'}`}>
         <ShieldCheck className="h-3 w-3" />{payment.status === 'paid' ? 'Cobrado' : payment.status === 'refunded' ? 'Reembolsado' : 'Reembolso parcial'}
        </span>
        <a href={payment.dashboardUrl} target="_blank" rel="noreferrer" className="grid h-7 w-7 place-items-center rounded-lg border border-[#635bff]/20 bg-[#635bff]/10 text-violet-300 transition hover:bg-[#635bff]/20" title="Abrir pago en Stripe"><ExternalLink className="h-3 w-3" /></a>
       </div>
       </td>
      </tr>
     ))
     )}
    </tbody>
    </table>
   </div>
   </div>
  </div>
  )}

  {/* Tab Content 5: Comerciales Performance & Finance Tracking */}
  {activeTab === 'comerciales' && (
  <div className="space-y-6 text-left">
   {/* Key Metrics across commercials */}
   <div className="finance-metric-grid finance-metric-grid-wide grid grid-cols-1 sm:grid-cols-3 gap-5">
   {/* Total Sales Volume */}
   {(() => {
    const totalVentasComerciales = rankableComercialesList.reduce((sum, com) => {
    const txs = ledgerTransactions.filter(tx =>
     tx.isInitialSale === true && 
     (tx.comercialId === com.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === com.email.toLowerCase()))
    );
    return sum + txs.reduce((s, t) => s + (t.amount || 0), 0);
    }, 0);

    const totalComisionesDevengadas = rankableComercialesList.reduce((sum, com) => {
    const txs = ledgerTransactions.filter(tx =>
     tx.isInitialSale === true && 
     (tx.comercialId === com.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === com.email.toLowerCase()))
    );
    const paidTxs = txs.filter(tx => tx.status === 'paid');
    const volume = paidTxs.reduce((s, t) => s + (t.amount || 0), 0);
    
    const clientsCount = contacts.filter(c => 
     c.status === 'Client' && 
     (c.contactedByComercialEmail && c.contactedByComercialEmail.toLowerCase() === com.email.toLowerCase())
    ).length;
    const closures = Math.max(clientsCount, countUniqueInitialSales(txs));
    const pct = getTieredCommission(closures);
    
    const extras = (com.extraCommissions || []).reduce((extraSum, extra) => extraSum + Number(extra.amount || 0), 0);
    return sum + (volume * (pct / 100)) + extras;
    }, 0);

    const avgComm = rankableComercialesList.length
    ? Math.round(rankableComercialesList.reduce((sum, com) => {
     const txs = ledgerTransactions.filter(tx =>
      tx.isInitialSale === true && 
      (tx.comercialId === com.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === com.email.toLowerCase()))
     );
     const clientsCount = contacts.filter(c => 
      c.status === 'Client' && 
      (c.contactedByComercialEmail && c.contactedByComercialEmail.toLowerCase() === com.email.toLowerCase())
     ).length;
     const closures = Math.max(clientsCount, countUniqueInitialSales(txs));
     return sum + getTieredCommission(closures);
     }, 0) / rankableComercialesList.length)
    : 10;

    return (
    <>
     <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden">
     <div className="absolute top-5 right-5 bg-blue-500/10 rounded-2xl p-3 border border-blue-500/10">
      <TrendingUp className="w-5 h-5 text-blue-400" />
     </div>
     <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Volumen Ventas Iniciales</span>
     <h3 className="text-3xl font-black text-white mt-2 font-mono">
      {totalVentasComerciales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-blue-400 text-lg ml-1 font-sans">€</span>
     </h3>
     <p className="text-[10px] text-slate-400 font-mono mt-3">
      Suma de primeros pagos registrados
     </p>
     </div>

     <div className="bg-[#0b1329]/30 backdrop-blur-md border border-amber-500/10 p-5 rounded-3xl relative overflow-hidden shadow-lg shadow-amber-500/5">
     <div className="absolute top-5 right-5 bg-amber-500/10 rounded-2xl p-3 border border-amber-500/20">
      <DollarSign className="w-5 h-5 text-amber-400" />
     </div>
     <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Comisiones Acumuladas</span>
     <h3 className="text-3xl font-black text-amber-400 mt-2 font-mono">
      {totalComisionesDevengadas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-amber-400 text-lg ml-1 font-sans">€</span>
     </h3>
     <p className="text-[10px] text-amber-500/70 font-mono mt-3">
      Devengadas del total vendido inicial
     </p>
     </div>

     <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden">
     <div className="absolute top-5 right-5 bg-purple-500/10 rounded-2xl p-3 border border-purple-500/10">
      <Repeat className="w-5 h-5 text-purple-450" />
     </div>
     <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Comisión Media Pactada</span>
     <h3 className="text-3xl font-black text-white mt-2 font-mono">
      {avgComm}%
     </h3>
     <p className="text-[10px] text-slate-400 font-mono mt-3">
      Promedio de comerciales activos
     </p>
     </div>
    </>
    );
   })()}
   </div>

   {/* Table List of Salespeople with their metrics */}
   <div className="bg-[#0b1329]/10 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-xl">
   <div className="p-6 border-b border-white/5 text-left">
    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Liquidaciones y Comisiones por Comercial</h4>
    <p className="text-[10px] text-slate-500 mt-1">Beneficios devengados calculados sobre la primera venta de clientes asignados que provienen de llamadas frías</p>
   </div>
   
   <div className="overflow-x-auto font-sans">
    <table className="w-full text-left border-collapse">
    <thead>
     <tr className="border-b border-white/5 bg-[#0b1329]/40 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
     <th className="p-4 font-bold">Comercial / Email</th>
     <th className="p-4 font-bold">% Comisión</th>
     <th className="p-4 font-bold">Clientes Cerrados</th>
     <th className="p-4 font-bold">Ventas Vinculadas</th>
     <th className="p-4 font-bold text-right">Beneficio Devengado</th>
     </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
     {rankableComercialesList.length === 0 ? (
     <tr>
      <td colSpan={5} className="p-16 text-center text-slate-500 text-xs font-light">
      No hay comerciales autorizados registrados.
      </td>
     </tr>
     ) : (
     rankableComercialesList.map(com => {
      const txs = ledgerTransactions.filter(tx =>
      tx.isInitialSale === true && 
      (tx.comercialId === com.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === com.email.toLowerCase()))
      );
      const volume = txs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const paidTxs = txs.filter(tx => tx.status === 'paid');
      const paidVolume = paidTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
      const clientsCount = contacts.filter(c => 
      c.status === 'Client' && 
      (c.contactedByComercialEmail && c.contactedByComercialEmail.toLowerCase() === com.email.toLowerCase())
      ).length;
      
      const closures = Math.max(clientsCount, countUniqueInitialSales(txs));
      const pct = getTieredCommission(closures);
      const extras = (com.extraCommissions || []).reduce((sum, extra) => sum + Number(extra.amount || 0), 0);
      const benefits = (paidVolume * (pct / 100)) + extras;

      return (
      <tr key={com.id} className="text-xs hover:bg-white/[0.01] transition-colors">
       <td className="p-4 text-left">
       <div>
        <span className="font-bold text-white block">{com.name}</span>
        <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{com.email}</span>
       </div>
       </td>
       <td className="p-4 text-left font-mono">
       <div className="flex items-center gap-1.5">
        <span className="font-bold text-amber-400">{pct}%</span>
       </div>
       </td>
       <td className="p-4 text-left font-mono">
       <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-slate-300">
        {clientsCount} {clientsCount === 1 ? 'cliente' : 'clientes'}
       </span>
       </td>
       <td className="p-4 text-left font-mono">
       <div className="text-slate-300 font-semibold">
        {paidVolume.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
       </div>
       <div className="text-[9px] text-slate-500">
        de {volume.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} adjudicado
       </div>
       </td>
       <td className="p-4 text-right font-mono text-amber-400 font-bold text-sm">
       <div>{benefits.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
       {volume > paidVolume && (
        <div className="text-[9px] text-slate-500 font-medium">
        + {((volume - paidVolume) * (pct / 100)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} pendiente
        </div>
       )}
       {extras > 0 && (
        <div className="text-[9px] text-cyan-300 font-medium">
        + {extras.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} extra
        </div>
       )}
       </td>
      </tr>
      );
     })
     )}
    </tbody>
    </table>
   </div>
   </div>

   {/* Audit Trail: Initial sales records */}
   <div className="bg-[#0b1329]/10 backdrop-blur-md border border-white/5 rounded-3xl p-6 space-y-4">
   <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest text-left">Bitácora de Ventas Iniciales (Vincular Comisiones)</h4>
   
   <div className="overflow-x-auto text-xs">
    <table className="w-full">
    <thead>
     <tr className="border-b border-white/5 text-[9px] font-mono uppercase tracking-widest text-slate-500 text-left">
     <th className="p-3">Concepto Venta</th>
     <th className="p-3">Comercial Asignado</th>
     <th className="p-3">Fecha</th>
     <th className="p-3">Importe</th>
     <th className="p-3 text-right">Comisión (%)</th>
     </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
     {(() => {
     const initialTxs = getUniqueInitialSales(ledgerTransactions);
     if (initialTxs.length === 0) {
      return (
      <tr>
       <td colSpan={5} className="p-8 text-center text-slate-500 text-xs font-light">
       No se han asentado ventas iniciales en la bitácora todavía. Al registrar ventas provenientes de cold calling, aparecerán aquí automáticamente.
       </td>
      </tr>
      );
     }
     return initialTxs.map(t => {
      // Find commercial
      const assignedCom = comercialesList.find(com => 
      com.id === t.comercialId || (t.comercialEmail && com.email.toLowerCase() === t.comercialEmail.toLowerCase())
      );
      const comName = assignedCom ? assignedCom.name : (t.comercialEmail || 'N/A');
      
      let commPct = 10;
      if (assignedCom) {
      const comTxs = ledgerTransactions.filter(tx =>
       tx.isInitialSale === true && 
       (tx.comercialId === assignedCom.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === assignedCom.email.toLowerCase()))
      );
      const clientsCount = contacts.filter(c => 
       c.status === 'Client' && 
       (c.contactedByComercialEmail && c.contactedByComercialEmail.toLowerCase() === assignedCom.email.toLowerCase())
      ).length;
      const closures = Math.max(clientsCount, countUniqueInitialSales(comTxs));
      commPct = getTieredCommission(closures);
      }
      
      const isPaid = t.status === 'paid';
      const commVal = isPaid ? (t.amount * (commPct / 100)) : 0;
      const potentialComm = t.amount * (commPct / 100);

      return (
      <tr key={t.id} className="hover:bg-white/[0.01] transition-colors text-left">
       <td className="p-3">
       <span className="font-bold text-white block">{t.description}</span>
       <span className="text-[9px] font-mono text-slate-500 select-all">{t.id}</span>
       </td>
       <td className="p-3">
       <span className="text-slate-300 font-medium">{comName}</span>
       </td>
       <td className="p-3 text-slate-400 font-mono">{t.date}</td>
       <td className="p-3 font-mono font-bold text-emerald-400">
       <div>{t.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
       <span className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded mt-0.5 inline-block uppercase tracking-wider ${
        isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
       }`}>
        {isPaid ? 'Cobrado' : 'Pendiente'}
       </span>
       </td>
       <td className="p-3 text-right font-mono">
       {isPaid ? (
        <>
        <span className="text-emerald-400 font-bold block">{commVal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
        <span className="text-[9px] text-slate-500 block">Basado en {commPct}% (Pagado)</span>
        </>
       ) : (
        <>
        <span className="text-slate-500 font-bold block">{commVal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
        <span className="text-[9px] text-amber-500/70 block">Pendiente ({potentialComm.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} al cobrar)</span>
        </>
       )}
       </td>
      </tr>
      );
     });
     })()}
    </tbody>
    </table>
   </div>
   </div>

  </div>
  )}

  {showMonthlyCloseReport && (() => {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const monthTxs = ledgerTransactions.filter(tx => (tx.date || '').startsWith(currentMonth));
  const prevTxs = ledgerTransactions.filter(tx => (tx.date || '').startsWith(prev));
  const monthIncome = monthTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const monthExpenses = monthTxs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const prevIncome = prevTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const growth = prevIncome ? Math.round(((monthIncome - prevIncome) / prevIncome) * 100) : 100;
  const monthClients = contacts.filter(c => c.status === 'Client' && (c.addedDate || '').includes(String(now.getFullYear()))).length;
  return (
   <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
   <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-amber-500/20 bg-[#050508] p-6 shadow-2xl relative">
    <button onClick={() => setShowMonthlyCloseReport(false)} className="absolute right-4 top-4 text-slate-400 hover:text-white">
    <X className="w-5 h-5" />
    </button>
    <div className="space-y-6">
    <div>
     <span className="text-[10px] uppercase tracking-[0.28em] text-amber-300 font-mono font-black">Cierre de mes · prueba</span>
     <h2 className="text-3xl font-black text-white mt-2">Reporte financiero mensual</h2>
     <p className="text-xs text-slate-400 mt-2">El dia 1 se mostrara este cierre con resumen animado, detalle operativo y comparativa historica.</p>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
     {[
     ['Ingresos', monthIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 'text-emerald-300'],
     ['Gastos', monthExpenses.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 'text-rose-300'],
     ['Neto', (monthIncome - monthExpenses - commercialSalaries).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 'text-cyan-300'],
     ['Comisiones', (commercialSalaries + extraCommissionsAccrued).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 'text-amber-300'],
     ['Crecimiento', `${growth >= 0 ? '+' : ''}${growth}%`, growth >= 0 ? 'text-emerald-300' : 'text-rose-300']
     ].map(([label, value, color]) => (
     <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="text-[9px] uppercase font-mono text-slate-500">{label}</span>
      <div className={`mt-2 text-xl font-black ${color}`}>{value}</div>
     </div>
     ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
     <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
     <h3 className="text-sm font-black text-white mb-4">Desglose detallado</h3>
     <div className="space-y-2 text-xs">
      {monthTxs.slice(0, 10).map(tx => (
      <div key={tx.id} className="flex justify-between gap-3 border-b border-white/5 pb-2">
       <span className="text-slate-300 truncate">{tx.description}</span>
       <span className={tx.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}>{Number(tx.amount || 0).toLocaleString('es-ES')} EUR</span>
      </div>
      ))}
      {!monthTxs.length && <p className="text-slate-500">Sin movimientos este mes.</p>}
     </div>
     </div>
     <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
     <h3 className="text-sm font-black text-white mb-4">Lectura ejecutiva</h3>
     <p className="text-xs text-slate-300 leading-relaxed">
      Este mes registra {monthTxs.length} movimientos, {monthClients} clientes activos detectados y una variacion de ingresos del {growth >= 0 ? '+' : ''}{growth}% frente al mes anterior.
      Las comisiones extra asignadas suman {extraCommissionsAccrued.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} y quedan integradas en el control financiero.
     </p>
     <div className="mt-5 h-3 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-300" style={{ width: `${Math.min(100, Math.max(8, growth + 50))}%` }} />
     </div>
     </div>
    </div>
    </div>
   </div>
   </div>
  );
  })()}

  {/* MODAL WINDOW 1: ADD/EDIT FINANCE TRANSACTION */}
  {isTxModalOpen && (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
   <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-left">
   <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
   
   <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
    <h3 className="font-bold text-sm text-white flex items-center gap-2">
    <DollarSign className="w-4 h-4 text-emerald-400" />
    <span>{isEditingTx ? 'Modificar Registro' : 'Registrar Nueva Transacción'}</span>
    </h3>
    <button 
    onClick={() => setIsTxModalOpen(false)}
    className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg cursor-pointer transition"
    >
    <X className="w-4 h-4" />
    </button>
   </div>

   <form onSubmit={handleSaveTransaction} className="p-5 space-y-4">
    
    {/* Type Switcher */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Tipo de Flujo</label>
    <div className="grid grid-cols-2 gap-2">
     <button
     type="button"
     onClick={() => setTxType('income')}
     className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
      txType === 'income' ?
      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
     }`}
     >
     Ingreso (+)
     </button>
     <button
     type="button"
     onClick={() => setTxType('expense')}
     className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
      txType === 'expense' ?
      'bg-rose-500/10 border-rose-500/30 text-rose-400'
      : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
     }`}
     >
     Gasto (-)
     </button>
    </div>
    </div>

    {/* Amount Input */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Importe (€)</label>
    <div className="relative">
     <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 text-xs font-mono">
     EUR
     </div>
     <input
     type="number"
     step="0.01"
     min="0"
     placeholder="0.00"
     value={txAmount}
     onChange={(e) => setTxAmount(e.target.value)}
     required
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-12 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left font-mono"
     />
    </div>
    </div>

    {/* Concept description */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Concepto / Nombre</label>
    <input
     type="text"
     placeholder="e.g. Pago de Servidores o Licencia Canva"
     value={txDescription}
     onChange={(e) => setTxDescription(e.target.value)}
     required
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
    </div>

    {/* Categoría & Fecha */}
    <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Categoría</label>
     <select
     value={txCategory}
     onChange={(e) => setTxCategory(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none cursor-pointer"
     >
     <option value="Desarrollo">💻 Desarrollo</option><option value="Consultoría">🤝 Consultoría</option><option value="Infraestructura">🏗️ Infraestructura</option><option value="Software Herramientas">⚙️ Software y herramientas</option><option value="Dominios">🌐 Dominios</option><option value="Marketing">📣 Marketing</option><option value="Salarios">👥 Salarios</option><option value="Gasolina y combustible">⛽ Gasolina y combustible</option><option value="Restaurantes y comidas">🍽️ Restaurantes y comidas</option><option value="Viajes y transporte">✈️ Viajes y transporte</option><option value="Alojamiento">🏨 Alojamiento</option><option value="Alquiler de vehículo">🚗 Alquiler de vehículo</option><option value="Formación">🎓 Formación</option><option value="Servicios profesionales">📋 Servicios profesionales</option><option value="Suscripciones">🔁 Suscripciones</option><option value="Comisiones bancarias">🏦 Comisiones bancarias</option><option value="Impuestos">🧾 Impuestos</option><option value="Material y suministros">📦 Material y suministros</option><option value="Otros gastos">••• Otros gastos</option><option value="Oficina">🏢 Oficina</option><option value="Facturado">💶 Facturado</option>
     </select>
    </div>

    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Fecha de Cargo</label>
     <input
     type="date"
     value={txDate}
     onChange={(e) => setTxDate(e.target.value)}
     required
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-slate-100 focus:outline-none font-mono"
     />
    </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
     <div className="space-y-1">
      <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Divisa</label>
      <select
       value={invCurrency}
       onChange={(e) => setInvCurrency(e.target.value as NonNullable<Invoice['currency']>)}
       className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-100"
      >
       <option value="EUR">EUR — Euro (€)</option>
       <option value="USD">USD — Dólar ($)</option>
       <option value="GBP">GBP — Libra (£)</option>
       <option value="MXN">MXN — Peso mexicano ($)</option>
       <option value="CHF">CHF — Franco suizo (CHF)</option>
      </select>
     </div>
     <div className="space-y-1">
      <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Idioma de la factura</label>
      <select
       value={invLanguage}
       onChange={(e) => setInvLanguage(e.target.value as NonNullable<Invoice['language']>)}
       className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-100"
      >
       <option value="es">Español</option>
       <option value="en">English</option>
      </select>
     </div>
    </div>

    {/* Status input */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Estado del Cargo</label>
    <select
     value={txStatus}
     onChange={(e) => setTxStatus(e.target.value as any)}
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none cursor-pointer"
    >
     <option value="paid">Realizado / Consolidado</option>
     <option value="pending">Pendiente / Por Pagar</option>
    </select>
    </div>

    {/* Método de Pago input */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Método de Pago</label>
    <div className="grid grid-cols-4 gap-2">
     <button
     type="button"
     onClick={() => setTxPaymentMethod(undefined)}
     className={`py-1.5 text-[11px] font-medium rounded-xl border transition cursor-pointer ${
      txPaymentMethod === undefined ?
      'bg-slate-700/30 border-slate-500 text-slate-300'
      : 'bg-transparent border-white/5 text-slate-500 hover:bg-white/5'
     }`}
     >
     Ninguno
     </button>
     <button
     type="button"
     onClick={() => setTxPaymentMethod('cash')}
     className={`py-1.5 text-[11px] font-medium rounded-xl border transition cursor-pointer flex items-center justify-center gap-1 ${
      txPaymentMethod === 'cash' ?
      'bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-sm'
      : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
     }`}
     >
     <span>💸 Efectivo</span>
     </button>
     <button
     type="button"
     onClick={() => setTxPaymentMethod('transfer')}
     className={`py-1.5 text-[11px] font-medium rounded-xl border transition cursor-pointer flex items-center justify-center gap-1 ${
      txPaymentMethod === 'transfer' ?
      'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-sm'
      : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
     }`}
     >
     <span>🏦 Transferencia</span>
     </button>
     <button type="button" onClick={() => setTxPaymentMethod('card')} className={`py-1.5 text-[11px] font-medium rounded-xl border transition cursor-pointer flex items-center justify-center gap-1 ${txPaymentMethod === 'card' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 shadow-sm' : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'}`}>
      <CreditCard className="h-3.5 w-3.5" /><span>Tarjeta</span>
     </button>
    </div>
    </div>

    {txType === 'expense' && (
    <div className="space-y-1 rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.035] p-3">
     <label className="text-[9px] uppercase font-mono text-cyan-300 font-bold block">¿Con qué cuenta se pagó?</label>
     <select value={txPaymentAccount || ''} onChange={event => setTxPaymentAccount((event.target.value || undefined) as FinanceTransaction['paymentAccount'])} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none">
      <option value="">Sin asignar</option><option value="revolut_pro">Revolut Pro · Empresa</option><option value="carlos_personal">Tarjeta personal · Carlos</option><option value="nacho_personal">Tarjeta personal · Nacho</option>
     </select>
     <p className="mt-1 text-[9px] text-slate-500">Sólo los pagos con Revolut Pro reducen el saldo empresarial.</p>
    </div>
    )}

    {/* Vincular a Factura */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Vincular a Factura (Opcional)</label>
    <select
     value={txInvoiceId}
     onChange={(e) => setTxInvoiceId(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none cursor-pointer"
    >
     <option value="">-- Sin Vincular / General --</option>
     {invoices.map((inv) => (
     <option key={inv.id} value={inv.id}>
      {inv.id} - {inv.clientName} ({inv.total.toLocaleString('es-ES')} €)
     </option>
     ))}
    </select>
    </div>

    {/* Recurrence Switcher */}
    <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl space-y-2 mt-2">
    <div className="flex items-center justify-between">
     <div className="text-left">
     <span className="text-[10px] font-mono text-slate-300 font-bold block uppercase">
      Crear recurrencia manual
     </span>
     <span className="text-[9px] text-slate-500 block">
      Para efectivo o transferencia. Los planes Stripe se sincronizan automáticamente.
     </span>
     </div>
     <button
     type="button"
     onClick={() => setTxIsRecurring(!txIsRecurring)}
     className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${
      txIsRecurring ? 'bg-purple-600' : 'bg-slate-750'
     }`}
     >
     <div
      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
      txIsRecurring ? 'translate-x-4.5' : 'translate-x-0'
      }`}
     />
     </button>
    </div>

    {txIsRecurring && (
     <div className="pt-2 animate-fade-in space-y-3 block">
     <div className="block">
      <label className="text-[8px] uppercase font-mono text-purple-400 font-bold block mb-1">
      Frecuencia
      </label>
      <select
      value={txPeriod}
      onChange={(e) => setTxPeriod(e.target.value as any)}
      className="w-full bg-slate-950 border border-purple-500/20 rounded-xl py-2 px-3 text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-purple-500"
      >
      <option value="weekly">Semanal</option>
      <option value="monthly">Mensual</option>
      <option value="yearly">Anual</option>
     </select>
     </div>

     <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.04] p-3">
      <div className="mb-2"><span className="text-[8px] font-black uppercase tracking-wider text-violet-300">Duración del plan</span><p className="mt-0.5 text-[9px] text-slate-500">Déjalo vacío si continúa indefinidamente. Puedes fijar cuotas, fecha final o ambas.</p></div>
      <div className="grid grid-cols-2 gap-2">
       <label className="block"><span className="mb-1 block text-[8px] font-mono font-bold uppercase text-slate-500">Nº de cuotas</span><input type="number" min="1" step="1" value={txRecurrenceCount} onChange={event => setTxRecurrenceCount(event.target.value)} placeholder="Sin límite" className="w-full rounded-xl border border-violet-500/20 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-violet-400" /></label>
       <label className="block"><span className="mb-1 block text-[8px] font-mono font-bold uppercase text-slate-500">Último pago</span><input type="date" value={txRecurrenceEndDate} onChange={event => setTxRecurrenceEndDate(event.target.value)} className="w-full rounded-xl border border-violet-500/20 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-violet-400" /></label>
      </div>
     </div>

     <div className="grid grid-cols-2 gap-2">
      <div className="block">
      <label className="text-[8px] uppercase font-mono text-purple-400 font-bold block mb-1">
       {txType === 'income' ? 'Primer Ingreso Recibido (€)' : 'Primero Costó / Costará (€)'}
      </label>
      <input
       type="number"
       placeholder={txAmount || "0.00"}
       value={txFirstAmount}
       onChange={(e) => setTxFirstAmount(e.target.value)}
       className="w-full bg-slate-950 border border-purple-500/20 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500"
      />
      </div>
      <div className="block">
      <label className="text-[8px] uppercase font-mono text-purple-400 font-bold block mb-1">
       {txType === 'income' ? 'Siguientes Ingresos (€)' : 'Siguientes Próximos (€)'}
      </label>
      <input
       type="number"
       placeholder={txAmount || "0.00"}
       value={txNextAmount}
       onChange={(e) => setTxNextAmount(e.target.value)}
       className="w-full bg-slate-950 border border-purple-500/20 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500"
      />
      </div>
     </div>
     <span className="text-[8px] text-slate-500 block leading-tight font-sans">
      {txType === 'income'  ?
      '* El ingreso inicial tendrá el importe del primero. Al pulsar "Procesar Ingreso" para los siguientes vencimientos, se asentará el importe de los próximos.'
      : '* El cargo inicial tendrá el precio del primero. Al pulsar "Procesar Cargo" para los siguientes vencimientos, se asentará el precio de los próximos.'
      }
     </span>
     </div>
    )}
    </div>

    {/* Actions submit block */}
    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
    <button
     type="button"
     onClick={() => setIsTxModalOpen(false)}
     className="bg-white/5 hover:bg-white/10 text-slate-400 text-xs py-2 px-4 rounded-xl cursor-pointer"
    >
     Cancelar
    </button>
    <button
     type="submit"
     className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs py-2 px-5 rounded-xl cursor-pointer flex items-center gap-1 active:scale-95"
    >
     <Check className="w-3.5 h-3.5" />
     <span>{isEditingTx ? 'Guardar Cambios' : 'Registrar'}</span>
    </button>
    </div>

   </form>
   </div>
  </div>
  )}

  {/* MODAL WINDOW 2: CREATE / EDIT INVOICE (FACTURA) */}
  {isInvModalOpen && (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
   <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl my-8 overflow-hidden shadow-2xl relative text-left">
   <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
   
   <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
    <h3 className="font-bold text-sm text-white flex items-center gap-2">
    <FileText className="w-4 h-4 text-blue-400" />
    <span>{isEditingInv ? `Modificar Factura ${editingInvId}` : 'Generar Nueva Factura de Cliente'}</span>
    </h3>
    <button 
    onClick={() => setIsInvModalOpen(false)}
    className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg cursor-pointer transition"
    >
    <X className="w-4 h-4" />
    </button>
   </div>

   <form onSubmit={handleSaveInvoice} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
    
    <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.035] p-4">
     <div className="mb-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">Datos fiscales del emisor</p>
      <p className="mt-1 text-[10px] text-slate-500">Estos datos aparecerán en esta factura y puedes modificarlos antes de guardarla.</p>
     </div>
     <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="space-y-1">
       <label className="block text-[9px] font-mono font-semibold uppercase text-slate-400">Nombre o razón social</label>
       <input
        type="text"
        value={invIssuerName}
        onChange={(e) => setInvIssuerName(e.target.value)}
        required
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
       />
      </div>
      <div className="space-y-1">
       <label className="block text-[9px] font-mono font-semibold uppercase text-slate-400">DNI / NIF / CIF</label>
       <input
        type="text"
        value={invIssuerTaxId}
        onChange={(e) => setInvIssuerTaxId(e.target.value)}
        required
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
       />
      </div>
      <div className="space-y-1">
       <label className="block text-[9px] font-mono font-semibold uppercase text-slate-400">Nombre comercial</label>
       <input
        type="text"
        value={invIssuerBrand}
        onChange={(e) => setInvIssuerBrand(e.target.value)}
        required
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
       />
      </div>
      <div className="space-y-1">
       <label className="block text-[9px] font-mono font-semibold uppercase text-slate-400">Email de administración</label>
       <input
        type="email"
        value={invIssuerEmail}
        onChange={(e) => setInvIssuerEmail(e.target.value)}
        required
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
       />
      </div>
      <div className="space-y-1">
       <label className="block text-[9px] font-mono font-semibold uppercase text-slate-400">Dirección fiscal</label>
       <input
        type="text"
        value={invIssuerAddress}
        onChange={(e) => setInvIssuerAddress(e.target.value)}
        required
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
       />
      </div>
     </div>
    </div>

    {/* Client select block */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Asociar Cliente CRM (Opcional)</label>
     <select
     value={invClientId}
     onChange={(e) => handleSelectClient(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-100 cursor-pointer focus:outline-none"
     >
     <option value="">-- Escribir cliente manual --</option>
     {contacts.map(c => (
      <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
     ))}
     </select>
    </div>

    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Email de Envío</label>
     <input
     type="email"
     placeholder="email@empresa.com"
     value={invClientEmail}
     onChange={(e) => setInvClientEmail(e.target.value)}
     required
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
     />
    </div>

    <div className="space-y-1 md:col-span-2">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Nombre Cliente / Razón Social</label>
     <input
     type="text"
     placeholder="e.g. NovaSaaS Corp"
     value={invClientName}
     onChange={(e) => setInvClientName(e.target.value)}
     required
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
     />
    </div>

    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">CIF / NIF / DNI</label>
     <input
      type="text"
      placeholder="Identificación fiscal"
      value={invClientTaxId}
      onChange={(e) => setInvClientTaxId(e.target.value)}
      required
      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
     />
    </div>

    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Dirección fiscal</label>
     <input
      type="text"
      placeholder="Calle, número, CP, ciudad y país"
      value={invClientAddress}
      onChange={(e) => setInvClientAddress(e.target.value)}
      required
      className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
     />
    </div>
    </div>

    {/* Alias & Color selection */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-white/5 py-3">
    <div className="space-y-1 text-left">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">🏷️ Alias del Elemento (Opcional)</label>
     <input
     type="text"
     placeholder="e.g. Proyecto Web, Mantenimiento"
     value={invAlias}
     onChange={(e) => setInvAlias(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
     />
    </div>

    <div className="space-y-1 text-left">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">🎨 Color del Elemento Entero</label>
     <div className="flex items-center gap-2.5 py-1.5">
     {[
      { name: 'Predeterminado', value: '', class: 'bg-blue-600' },
      { name: 'Indigo', value: 'indigo', class: 'bg-indigo-600' },
      { name: 'Emerald', value: 'emerald', class: 'bg-emerald-600' },
      { name: 'Amber', value: 'amber', class: 'bg-amber-600' },
      { name: 'Rose', value: 'rose', class: 'bg-rose-600' },
      { name: 'Violet', value: 'violet', class: 'bg-violet-600' },
     ].map((col) => (
      <button
      key={col.name}
      type="button"
      onClick={() => setInvColor(col.value)}
      className={`w-5 h-5 rounded-full transition-all relative cursor-pointer ${col.class} ${
       invColor === col.value  ?
       'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' 
       : 'opacity-70 hover:opacity-100 hover:scale-105'
      }`}
      title={col.name}
      >
      {invColor === col.value && (
       <span className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-bold">✓</span>
      )}
      </button>
     ))}
     </div>
    </div>
    </div>

    {/* Invoice Dates & Tax */}
    <div className="grid grid-cols-3 gap-3">
    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Fecha de Emisión</label>
     <input
     type="date"
     value={invDate}
     onChange={(e) => setInvDate(e.target.value)}
     required
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-[11px] text-slate-100 font-mono focus:outline-none"
     />
    </div>

    <div className="space-y-1">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Fecha Vencimiento</label>
     <input
     type="date"
     value={invDueDate}
     onChange={(e) => setInvDueDate(e.target.value)}
     required
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-[11px] text-slate-100 font-mono focus:outline-none"
     />
    </div>

    <div className="space-y-1 border-left border-white/5">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Impuesto / IVA (%)</label>
     <input
     type="number"
     min="0"
     max="100"
     value={invTaxPercentage}
     onChange={(e) => handleInvoiceTaxChange(Number(e.target.value))}
     required
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-slate-100 focus:outline-none font-mono text-left"
     />
    </div>
    </div>

    {/* Status input */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Estado Inicial</label>
    <select
     value={invStatus}
     onChange={(e) => setInvStatus(e.target.value as any)}
     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none cursor-pointer"
    >
     <option value="draft">Borrador</option>
     <option value="sent">Enviada al Cliente</option>
     <option value="paid">Pagada / Consolidada</option>
    </select>
    </div>

    {/* CONCEPT DETAILS (DYNAMIC INVOICEITEMS) */}
    <div className="space-y-2 border-t border-white/5 pt-4">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
     <label className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider block">Líneas de Conceptos Detallados</label>
     <div className="flex flex-wrap items-center gap-2">
     {/* Add pending transactions selector dropdown */}
     {transactions.filter(t => t.status === 'pending' && t.type === 'income' && !selectedTxIdsForInvoice.includes(t.id)).length > 0 && (
      <select
      onChange={(e) => {
       const txId = e.target.value;
       if (txId) {
       const tx = transactions.find(t => t.id === txId);
       if (tx) {
        handleAddPendingTransactionAsInvoiceItem(tx);
       }
       e.target.value = ''; // Reset select
       }
      }}
      className="text-[10px] uppercase font-mono font-bold bg-slate-950 border border-amber-500/30 text-amber-300 py-1.5 px-3 rounded-xl cursor-pointer max-w-[200px] hover:border-amber-400 focus:outline-none transition-all"
      >
      <option value="">📂 Cobros Pendientes...</option>
      {transactions
       .filter(t => t.status === 'pending' && t.type === 'income' && !selectedTxIdsForInvoice.includes(t.id))
       .map(t => (
       <option key={t.id} value={t.id}>
        {t.amount.toLocaleString('es-ES')}€ - {t.description.substring(0, 15)}...
       </option>
       ))
      }
      </select>
     )}

     <button
      type="button"
      onClick={handleAddInvoiceItem}
      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 py-1.5 px-3 rounded-lg active:scale-95"
     >
      <PlusCircle className="w-3.5 h-3.5" />
      <span>Añadir Concepto</span>
     </button>
     </div>
    </div>

    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
     {invItems.map((item, index) => (
     <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5 text-left">
      <div className="col-span-4 space-y-0.5">
      <span className="text-[8px] font-mono text-slate-500 uppercase">Descripción</span>
      <input
       type="text"
       placeholder="e.g. Consultoría"
       value={item.description}
       onChange={(e) => handleUpdateInvoiceItemField(index, 'description', e.target.value)}
       required
       className="w-full bg-slate-950 border border-white/10 rounded-lg py-1 px-2 text-xs text-slate-200 focus:outline-none"
      />
      </div>

      <div className="col-span-1 space-y-0.5">
      <span className="text-[8px] font-mono text-slate-500 uppercase text-center block">Cant.</span>
      <input
       type="number"
       min="1"
       value={item.quantity}
       onChange={(e) => handleUpdateInvoiceItemField(index, 'quantity', Number(e.target.value))}
       required
       className="w-full bg-slate-950 border border-white/10 rounded-lg py-1 px-1 text-xs text-slate-200 font-mono text-center focus:outline-none"
      />
      </div>

      <div className="col-span-2 space-y-0.5">
      <span className="text-[8px] font-mono text-emerald-400 uppercase">Importe total</span>
      <input
       type="number"
       min="0"
       step="0.01"
       inputMode="decimal"
       value={Number((item.grossAmount ?? item.total * (1 + invTaxPercentage / 100)).toFixed(2))}
       onChange={(e) => handleUpdateInvoiceItemGross(index, Number(e.target.value))}
       required
       className="w-full bg-slate-950 border border-white/10 rounded-lg py-1 px-2 text-xs text-slate-200 font-mono text-left focus:outline-none"
      />
      </div>

      <div className="col-span-2 space-y-0.5">
      <span className="text-[8px] font-mono text-slate-500 uppercase">Método Pago</span>
      <select
       value={item.paymentMethod || 'transfer'}
       onChange={(e) => handleUpdateInvoiceItemField(index, 'paymentMethod', e.target.value as any)}
       className="w-full bg-slate-950 border border-white/10 rounded-lg py-1 px-1.5 text-[11px] text-slate-200 focus:outline-none cursor-pointer"
      >
       <option value="transfer">🏦 Trsf.</option>
       <option value="cash">💸 Cash</option>
      </select>
      </div>

      <div className="col-span-1 space-y-0.5 flex flex-col items-center justify-center">
      <span className="text-[8px] font-mono text-slate-500 uppercase text-center font-bold tracking-tight">Pend.</span>
      <label className="relative inline-flex items-center cursor-pointer mt-1">
       <input
       type="checkbox"
       checked={!!item.isPending}
       onChange={(e) => handleUpdateInvoiceItemField(index, 'isPending', e.target.checked)}
       className="sr-only peer"
       />
       <div className="w-7 h-4 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 after:border-slate-400 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500/30 peer-checked:after:bg-amber-400 border border-white/10"></div>
      </label>
      </div>

      {/* Display of total row and remove action button */}
      <div className="col-span-2 text-right pt-4 flex items-center justify-end gap-1">
      <span className="font-mono text-[10px] font-bold text-slate-400 mr-1 leading-none" title="Base imponible calculada">
       Base {item.total.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €
      </span>
      <button
       type="button"
       onClick={() => handleRemoveInvoiceItem(index)}
       className="text-slate-500 hover:text-rose-450 p-1 hover:bg-white/5 rounded transition cursor-pointer"
       title="Eliminar línea"
      >
       <Trash2 className="w-3.5 h-3.5" />
      </button>
      </div>
     </div>
     ))}
    </div>
    </div>

    {/* Editable Bank Details Section */}
    <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 space-y-3.5 text-left bg-white/[0.01]">
    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-semibold block">Datos Bancarios para Transferencia (Revolut)</span>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     <div className="space-y-1 text-left">
     <label className="text-[9px] font-mono text-slate-400 block font-semibold uppercase">Beneficiario</label>
     <input
      type="text"
      value={bankBeneficiary}
      onChange={(e) => setBankBeneficiary(e.target.value)}
      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
     />
     </div>

     <div className="space-y-1 text-left">
     <label className="text-[9px] font-mono text-slate-400 block font-semibold uppercase">IBAN Euro</label>
     <input
      type="text"
      value={paymentDetails}
      onChange={(e) => setPaymentDetails(e.target.value)}
      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
     />
     </div>

     <div className="space-y-1 text-left">
     <label className="text-[9px] font-mono text-slate-400 block font-semibold uppercase">Código BIC/SWIFT</label>
     <input
      type="text"
      value={bankSwift}
      onChange={(e) => setBankSwift(e.target.value)}
      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
     />
     </div>

     <div className="space-y-1 text-left">
     <label className="text-[9px] font-mono text-slate-400 block font-semibold uppercase">BIC Banco Corresponsal</label>
     <input
      type="text"
      value={bankCorrespondentBic}
      onChange={(e) => setBankCorrespondentBic(e.target.value)}
      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
     />
     </div>

     <div className="sm:col-span-2 space-y-1 text-left">
     <label className="text-[9px] font-mono text-slate-400 block font-semibold uppercase">Nombre y Dirección del Banco emisor</label>
     <input
      type="text"
      value={bankNameAddress}
      onChange={(e) => setBankNameAddress(e.target.value)}
      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
     />
     </div>
    </div>
    </div>

    {/* Notes block */}
    <div className="space-y-1">
    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Notas de Factura / Condiciones Pago</label>
    <textarea
     placeholder="e.g. Transferencia Bancaria al número ES45 1234... Gracias por su colaboración."
     rows={2}
     value={invNotes}
     onChange={(e) => setInvNotes(e.target.value)}
     className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
    />
    </div>

    {/* Action save block */}
    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
    <button
     type="button"
     onClick={() => setIsInvModalOpen(false)}
     className="bg-white/5 hover:bg-white/10 text-slate-400 text-xs py-2 px-4 rounded-xl cursor-pointer"
    >
     Cancelar
    </button>
    <button
     type="submit"
     className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer flex items-center gap-1 active:scale-95"
    >
     <Check className="w-3.5 h-3.5" />
     <span>{isEditingInv ? 'Modificar Factura' : 'Generar PDF & Guardar'}</span>
    </button>
    </div>

   </form>
   </div>
  </div>
  )}

  {/* MODAL WINDOW 3: DETAILED INVOICE LOOKUP PREVIEW (COSMIC PRINT COMD) */}
  {previewInvoice && (
  <div
   className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/90 p-0 backdrop-blur-md sm:p-4"
   onMouseDown={(event) => {
    if (event.currentTarget === event.target) setPreviewInvoice(null);
   }}
  >
   <div className="relative my-0 w-full max-w-5xl overflow-visible rounded-none border border-white/10 bg-slate-900 text-left shadow-2xl sm:my-4 sm:rounded-3xl">
   
   {/* Action Bar inside view modal */}
   <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 rounded-t-none border-b border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur-xl print:hidden sm:rounded-t-3xl sm:p-4">
    <div className="flex min-w-0 items-center gap-2">
    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded">PDF FACTURA</span>
    <span className="text-slate-500">•</span>
    <span className="truncate text-xs font-light text-slate-400">{previewInvoice.id}</span>
    </div>
    <div className="flex flex-wrap items-center justify-end gap-2">
    <button
     onClick={() => handleDownloadInvoiceHtml(previewInvoice)}
     className="hidden cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-500 sm:flex"
     title="Descargar factura en PDF"
    >
     <Download className="w-3.5 h-3.5" />
     <span>Descargar Factura (PDF)</span>
    </button>
    <button
     onClick={handlePrintPreview}
     className="hidden cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/10 md:flex"
    >
     <Printer className="w-3.5 h-3.5" />
     <span>Imprimir / PDF</span>
    </button>
    <button 
     onClick={() => setPreviewInvoice(null)}
     className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-400/20 hover:text-white"
     aria-label="Cerrar visualización de la factura"
     title="Cerrar (Esc)"
    >
    <X className="w-4 h-4" />
    <span>Cerrar</span>
    </button>
    </div>
   </div>

   {/* Canonical invoice preview: the same shared template used by HTML download and printing. */}
   {(() => {
    const invoiceTransactionIds = new Set(
     previewInvoice.items.flatMap(item => [item.pendingTxId, item.id]).filter((id): id is string => Boolean(id))
    );
    const linkedTransactions = transactions.filter(tx =>
     tx.invoiceId === previewInvoice.id || invoiceTransactionIds.has(tx.id)
    );
    const paidTransactions = linkedTransactions.filter(tx => tx.status === 'paid');
    const paidAmount = paidTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const isPaid = previewInvoice.status === 'paid' || (
     linkedTransactions.length > 0 &&
     linkedTransactions.every(tx => tx.status === 'paid') &&
     paidAmount + 0.005 >= Number(previewInvoice.total || 0)
    );
    const dueDate = paidTransactions.map(tx => tx.date).filter(Boolean).sort((a, b) => b.localeCompare(a))[0] || previewInvoice.dueDate;
    return (
     <iframe
      title={`Vista previa de factura ${previewInvoice.id}`}
      srcDoc={buildInvoiceHtml(resolveInvoiceClientData(previewInvoice, contacts), {
       isPaid,
       dueDate,
       bank: {
        beneficiary: bankBeneficiary,
        iban: paymentDetails,
        swift: bankSwift,
        correspondentBic: bankCorrespondentBic,
        nameAddress: bankNameAddress
       }
      })}
      className="m-3 mx-auto block h-[1180px] w-[calc(100%-1.5rem)] max-w-[900px] rounded-3xl border border-amber-500/10 bg-white shadow-2xl"
     />
    );
   })()}

    <div id="invoice-modal-print-area" className="hidden">
     <div className="flex flex-col items-center justify-center border-b border-neutral-200 bg-white pb-8 text-center">
      <img
       src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png"
       alt="Althera Solutions"
       className="mb-3 h-16 w-auto bg-transparent object-contain"
       referrerPolicy="no-referrer"
      />
      <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#8a7031]">Creamos soluciones. Impulsamos resultados.</span>
     </div>

     <div className="grid grid-cols-1 gap-8 border-b border-neutral-200 bg-white pb-6 font-sans sm:grid-cols-2">
      <div className="space-y-4">
       <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a7031]">Prestador(es) del servicio</h3>
       <div className="border-l-2 border-[#D4AF37]/50 pl-2 text-left">
        <p className="text-[11px] font-bold text-slate-900">{previewInvoice.issuerName || DEFAULT_INVOICE_ISSUER.name}</p>
        <p className="mt-0.5 text-[10px] leading-normal text-slate-500">
         CIF/NIF/DNI: {previewInvoice.issuerTaxId || DEFAULT_INVOICE_ISSUER.taxId}<br />
         {previewInvoice.issuerAddress || DEFAULT_INVOICE_ISSUER.address}<br />
         {previewInvoice.issuerEmail || DEFAULT_INVOICE_ISSUER.email}
        </p>
       </div>
      </div>
      <div className="text-left sm:text-right">
       <h2 className="text-xl font-bold uppercase tracking-wider text-neutral-950">Factura</h2>
       <p className="mt-1 font-mono text-[11px] font-bold text-amber-600">Nº {previewInvoice.id}</p>
       <p className="mt-2 text-[10px] text-slate-500">
        <strong>Fecha Emisión:</strong> {previewInvoice.date}<br />
        <strong>Vencimiento:</strong> {previewInvoice.dueDate}<br />
        <strong>Método de Pago:</strong> {
         previewInvoice.items.some(item => item.paymentMethod === 'cash')
          ? 'Efectivo (Cash)'
          : previewInvoice.items.some(item => item.paymentMethod === 'stripe')
           ? 'Stripe'
           : 'Transferencia Bancaria'
        }
       </p>
      </div>
     </div>

     <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 font-sans text-neutral-800 sm:grid-cols-2">
      <div>
       <h4 className="mt-1 text-xs font-bold text-neutral-950">{previewInvoice.clientName}</h4>
       <span className="mt-0.5 block font-mono text-[10px] text-neutral-500">{previewInvoice.clientTaxId || 'CIF/NIF/DNI no indicado'}</span>
      </div>
      <div className="text-[10px] leading-relaxed text-neutral-600 sm:pt-4 sm:text-right">
       <span>{previewInvoice.clientAddress || 'Dirección fiscal no indicada'}</span><br />
       <span className="font-mono text-neutral-500">{previewInvoice.clientEmail}</span>
      </div>
     </div>

     <div className="pt-2 font-sans">
      <table className="w-full border-collapse text-left text-xs">
       <thead>
        <tr className="border-b border-neutral-300 text-[9px] font-bold uppercase tracking-wider text-[#8a7031]">
         <th className="px-1 py-2">Concepto / Servicio Técnico Requerido</th>
         <th className="w-16 px-2 py-2 text-center">Cant.</th>
         <th className="w-24 px-3 py-2 text-right">Precio</th>
         <th className="w-24 px-1 py-2 text-right">Total</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-neutral-200">
        {previewInvoice.items.map((item, idx) => (
         <tr key={item.id || idx} className="text-neutral-800">
          <td className="px-1 py-3 leading-relaxed">
           <span className="flex flex-wrap items-center gap-1.5 font-semibold text-neutral-900">
            <span>{getCleanBillingConcept(item.description)}</span>
            {item.isPending ? (
             <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-extrabold uppercase leading-none tracking-[0.09em] text-amber-800 shadow-sm">
              <span className="h-1 w-1 rounded-full bg-amber-500 ring-2 ring-amber-100" />
              Pendiente
             </span>
            ) : (
             <span className="rounded border border-emerald-200 bg-emerald-100 px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-emerald-800">Cobrado</span>
            )}
            {item.paymentMethod && (
             <span className={`rounded border px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-wider ${
              item.paymentMethod === 'cash'
               ? 'border-purple-200 bg-purple-100 text-purple-800'
               : item.paymentMethod === 'stripe'
                ? 'border-indigo-200 bg-indigo-100 text-indigo-800'
                : 'border-cyan-200 bg-cyan-100 text-cyan-800'
             }`}>
              {item.paymentMethod === 'cash' ? 'Efectivo' : item.paymentMethod === 'stripe' ? 'Stripe' : 'Trsf.'}
             </span>
            )}
           </span>
          </td>
          <td className="px-2 py-3 text-center font-mono">{item.quantity}</td>
          <td className="px-3 py-3 text-right font-mono">{item.unitPrice.toFixed(2)} €</td>
          <td className="px-1 py-3 text-right font-mono font-bold text-neutral-950">{item.total.toFixed(2)} €</td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>

     <div className="flex justify-end border-t border-neutral-300 pt-4 font-sans">
      <div className="w-64 space-y-1.5 text-right text-xs">
       <div className="flex justify-between text-slate-500">
        <span>Subtotal:</span>
        <span className="font-mono">{previewInvoice.subtotal.toFixed(2)} €</span>
       </div>
       <div className="flex justify-between text-slate-500">
        <span>IVA ({previewInvoice.taxPercentage}%):</span>
        <span className="font-mono">{previewInvoice.taxAmount.toFixed(2)} €</span>
       </div>
       <div className="flex justify-between border-t border-neutral-200 pt-2 text-sm font-bold text-neutral-950">
        <span>Total facturado:</span>
        <span className="font-mono text-amber-700">{previewInvoice.total.toFixed(2)} €</span>
       </div>
       {previewInvoice.items.some(item => item.isPending) && (
        <div className="flex justify-between text-sm font-extrabold text-amber-800">
         <span>Por pagar (Pendiente):</span>
         <span className="font-mono text-amber-700">
          {previewInvoice.items.filter(item => item.isPending).reduce((sum, item) => sum + item.total, 0).toFixed(2)} €
         </span>
        </div>
       )}
      </div>
     </div>

    </div>

    {/* OPERACIONES DE FINANZAS VINCULADAS: fuera del documento A4 */}
    <div className="m-3 mx-auto max-w-[900px] space-y-3 rounded-xl border border-blue-500/15 bg-neutral-950/50 p-4 text-left print:hidden">
    <div className="flex justify-between items-center border-b border-neutral-850 pb-2">
     <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px] select-none font-mono">
     Operaciones de Finanzas Vinculadas (Pagos y Cobros)
     </span>
     <button
     onClick={() => {
      resetTxForm();
      setTxInvoiceId(previewInvoice.id);
      setTxType('income');
      setTxCategory('Facturado');
      setTxDescription(`Pago Factura ${previewInvoice.id}`);
      setTxAmount(previewInvoice.total.toString());
      setIsTxModalOpen(true);
     }}
     className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-mono text-[9px] px-2 py-1 rounded transition flex items-center gap-1.5 cursor-pointer font-bold border-none"
     >
     <Plus className="w-2.5 h-2.5" />
     <span>Registrar Pago / Cobro</span>
     </button>
    </div>

    {/* Filter list of transactions that have matching invoiceId */}
    {(() => {
     const linkedTxs = transactions.filter(t => t.invoiceId === previewInvoice.id);
     if (linkedTxs.length === 0) {
     return (
      <p className="text-[10px] text-slate-500 font-mono italic">
      No hay pagos ni cobros asociados a esta factura todavía. Haz clic en "Registrar Pago / Cobro" para asociar transacciones.
      </p>
     );
     }

     return (
     <div className="space-y-1.5 divide-y divide-neutral-850/50 max-h-48 overflow-y-auto pr-1">
      {linkedTxs.map((tx, idx) => (
      <div key={tx.id} className={`flex justify-between items-center pt-1.5 ${idx === 0 ? '' : 'border-t border-neutral-850/40'}`}>
       <div className="text-[10px] font-mono">
       <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className="text-slate-300 font-bold">{tx.description}</span>
        <span className={`text-[8px] uppercase px-1 rounded font-bold ${tx.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
        {tx.status === 'paid' ? 'Realizado' : 'Pendiente'}
        </span>
       </div>
       <div className="text-[9px] text-slate-500 flex gap-2">
        <span>Fecha: {tx.date}</span>
        <span>•</span>
        <span>Categoría: {tx.category}</span>
       </div>
       </div>
       <span className={`text-xs font-mono font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
       {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
       </span>
      </div>
      ))}
     </div>
     );
    })()}
    </div>

    {/* View modal close button footer */}
   <div className="sticky bottom-0 z-30 flex items-center justify-end border-t border-white/10 bg-slate-900/95 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl print:hidden sm:rounded-b-3xl">
    <button
    onClick={() => setPreviewInvoice(null)}
    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-6 rounded-xl cursor-pointer"
    >
    Cerrar Visualización
    </button>
   </div>

   </div>
  </div>
  )}

  </div>
 </div>
 );
}

