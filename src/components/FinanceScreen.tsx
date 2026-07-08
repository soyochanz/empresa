import React, { useState, useEffect } from 'react';
import { FinanceTransaction, Invoice, ClientContact, Screen, InvoiceItem, ComercialAccount } from '../types';
import { db } from '../supabaseClient';
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
  ShieldCheck
} from 'lucide-react';

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
}

const INITIAL_TRANSACTIONS: FinanceTransaction[] = [];

const getCleanBillingConcept = (description?: string): string => {
  return (description || '')
    .replace(/^Cobro Pendiente:\s*/i, '')
    .replace(/^Ingreso Facturado:\s*[^-]+-\s*/i, '')
    .replace(/\s*\([^)]*\)\s*-\s*Plazo\s+\d+\s+de\s+\d+/i, '')
    .replace(/\s*-\s*Plazo\s+\d+\s+de\s+\d+/i, '')
    .replace(/\s*\((Pendiente|Cobro Automatico programado|Cobro AutomÃ¡tico programado|Ingreso Procesado|Cargo Procesado)\)/gi, '')
    .trim();
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

function getNextPaymentDate(startDateStr: string, period?: string): string {
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return 'N/A';
  
  const today = new Date();
  let nextDate = new Date(start);
  
  const normalizedPeriod = period?.toLowerCase() || 'monthly';
  
  const incrementDate = (dateToInc: Date) => {
    if (normalizedPeriod === 'weekly' || normalizedPeriod === 'semanal') {
      dateToInc.setDate(dateToInc.getDate() + 7);
    } else if (normalizedPeriod === 'yearly' || normalizedPeriod === 'anual') {
      dateToInc.setFullYear(dateToInc.getFullYear() + 1);
    } else { // default to monthly / mensual
      dateToInc.setMonth(dateToInc.getMonth() + 1);
    }
  };

  // Find the next recurrence date in the future
  incrementDate(nextDate);
  while (nextDate < today) {
    incrementDate(nextDate);
  }
  
  return nextDate.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

const INITIAL_INVOICES: Invoice[] = [];

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

export default function FinanceScreen({ contacts, onNavigate, comercialesList = [] }: FinanceScreenProps) {
  // Navigation tabs: 'transactions' | 'recurring' | 'invoices' | 'stripe' | 'comerciales'
  const [activeTab, setActiveTab] = useState<'transactions' | 'recurring' | 'invoices' | 'stripe' | 'comerciales'>('transactions');

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
      const response = await fetch('/api/stripe/create-portal-session', {
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
      const response = await fetch('/api/stripe/customer-overview', {
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
      const response = await fetch('/api/stripe/cancel-subscription', {
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
        const dbTxs = await db.getFinanceTransactions();
        const dbInvs = await db.getFinanceInvoices();
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
    return () => {
      active = false;
    };
  }, []);

  // Filters
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>('All');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');

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
  const [txPaymentMethod, setTxPaymentMethod] = useState<'cash' | 'transfer' | undefined>(undefined);
  const [txFirstAmount, setTxFirstAmount] = useState('');
  const [txNextAmount, setTxNextAmount] = useState('');

  // INVOICE MODAL controls
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [isEditingInv, setIsEditingInv] = useState(false);
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [originatingTxId, setOriginatingTxId] = useState<string | null>(null);
  const [selectedTxIdsForInvoice, setSelectedTxIdsForInvoice] = useState<string[]>([]);

  // Invoice view preview modal controls
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Invoice form states
  const [invClientId, setInvClientId] = useState('');
  const [invClientName, setInvClientName] = useState('');
  const [invClientEmail, setInvClientEmail] = useState('');
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

  // Banking defaults matching Revolut and Ibiza specs
  const [paymentDetails, setPaymentDetails] = useState('IE84 REVO 9903 6065 8046 06');
  const [bankBeneficiary, setBankBeneficiary] = useState('Ignacio Martin Gonzalez');
  const [bankSwift, setBankSwift] = useState('REVOIE23');
  const [bankNameAddress, setBankNameAddress] = useState('Revolut Bank UAB, 2 Dublin Landings, North Dock, Dublin 1, D01 V4A3, Ireland');
  const [bankCorrespondentBic, setBankCorrespondentBic] = useState('CHASDEFX');

  // Check for preselected client from CRM screen to auto-create invoice
  useEffect(() => {
    const preselectedStr = sessionStorage.getItem('preselected_client_for_invoice');
    if (preselectedStr) {
      try {
        const client = JSON.parse(preselectedStr);
        if (client && client.id) {
          setInvClientId(client.id);
          setInvClientName(client.name || '');
          setInvClientEmail(client.email || '');
          setInvDate(new Date().toISOString().split('T')[0]);
          const d = new Date();
          d.setDate(d.getDate() + 15);
          setInvDueDate(d.toISOString().split('T')[0]);
          setInvStatus('sent'); // default to sent (pending)
          setInvItems([{ id: 'temp1', description: 'Servicios de consultoría / desarrollo', quantity: 1, unitPrice: 0, total: 0 }]);
          setIsEditingInv(false);
          setEditingInvId(null);
          setIsInvModalOpen(true);
        }
      } catch (err) {
        console.error('Error parsing preselected client for invoice:', err);
      } finally {
        sessionStorage.removeItem('preselected_client_for_invoice');
      }
    }
  }, [contacts]);

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

  // Calculations for transactions
  const totalIncomes = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const commercialSalaries = comercialesList
    .flatMap(com => com.payouts || [])
    .filter(p => p.status === 'completed' && p.stripeConnectAccountId && p.stripeTransferId?.startsWith('tr_'))
    .reduce((sum, p) => sum + p.amount, 0);

  const netProfit = totalIncomes - totalExpenses - commercialSalaries;

  // Cálculo de Saldos Consolidado y Pendiente según requerimiento
  const consolidatedIncomes = transactions
    .filter(t => t.type === 'income' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const consolidatedExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const consolidatedBalance = consolidatedIncomes;
  const netCashBalance = consolidatedIncomes - consolidatedExpenses - commercialSalaries;

  const pendingIncomes = transactions
    .filter(t => t.type === 'income' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingBalance = pendingIncomes - pendingExpenses;

  const getClientStripePaymentProgress = (client: ClientContact) => {
    const clientTxs = transactions.filter(tx => tx.clientId === client.id);
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
    .filter(t => t.type === 'income' && t.status === 'paid' && (t.stripePlanId || t.stripeCheckoutSessionId || t.stripeInvoiceId || t.id?.includes('stripe')))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const stripeTransactions = transactions.filter(t =>
    t.type === 'income' &&
    (t.stripePlanId || t.stripeCheckoutSessionId || t.stripeInvoiceId || t.id?.includes('stripe'))
  );

  const getClientStripeMoneySummary = (client: ClientContact) => {
    const clientTxs = transactions.filter(tx =>
      tx.type === 'income' &&
      (tx.clientId === client.id || tx.stripePlanId || tx.stripeCheckoutSessionId || tx.stripeInvoiceId) &&
      (
        tx.clientId === client.id ||
        (tx.description || '').toLowerCase().includes(client.name.toLowerCase()) ||
        (client.email && (tx.description || '').toLowerCase().includes(client.email.toLowerCase()))
      )
    );
    const localPaid = clientTxs.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const localOpen = clientTxs.filter(tx => tx.status === 'pending').reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const overview = stripeOverviewByClient[client.id];
    const stripePaid = overview?.totals?.paidInvoices || 0;
    const stripeOpen = overview?.totals?.openInvoices || 0;
    return {
      paid: Math.max(localPaid, stripePaid),
      open: Math.max(localOpen, stripeOpen),
    };
  };

  // Filter transaction categories
  const categories = ['All', ...Array.from(new Set(transactions.map(t => t.category)))];

  // Handler: Add or update transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
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
    }

    const payload: FinanceTransaction = {
      id: isEditingTx && editingTxId ? editingTxId : 'tx_' + Date.now(),
      type: txType,
      category: txCategory.trim() || 'General',
      amount: txIsRecurring && txFirstAmount ? Math.abs(Number(txFirstAmount)) : Math.abs(Number(txAmount)),
      date: txDate || new Date().toISOString().split('T')[0],
      description: txDescription.trim() || `${txType === 'income' ? 'Ingreso' : 'Gasto'} registrado`,
      isRecurring: txIsRecurring,
      recurrencePeriod: txIsRecurring ? txPeriod : undefined,
      status: txStatus,
      invoiceId: txInvoiceId || undefined,
      paymentMethod: txPaymentMethod,
      firstAmount: txIsRecurring && txFirstAmount ? Math.abs(Number(txFirstAmount)) : undefined,
      nextAmount: txIsRecurring && txNextAmount ? Math.abs(Number(txNextAmount)) : undefined
    };

    if (isEditingTx && editingTxId) {
      const oldTransactions = [...transactions];
      setTransactions(prev => prev.map(t => t.id === editingTxId ? payload : t));
      db.updateFinanceTransaction(payload)
        .then(() => {
          showToast(`Sincronizado: ${payload.type === 'income' ? 'Ingreso' : 'Gasto'} actualizado en Supabase.`);
        })
        .catch(err => {
          console.error('Error updating transaction in DB:', err);
          showToast(`Error al guardar: ${err.message || 'Error de conexión con Supabase.'}`, true);
          // Revert local state
          setTransactions(oldTransactions);
        });
    } else {
      const oldTransactions = [...transactions];
      setTransactions(prev => [payload, ...prev]);
      db.insertFinanceTransaction(payload)
        .then(() => {
          showToast(`Sincronizado: ${payload.type === 'income' ? 'Ingreso' : 'Gasto'} guardado en Supabase.`);
        })
        .catch(err => {
          console.error('Error inserting transaction into DB:', err);
          showToast(`Error al guardar: ${err.message || 'Error de conexión con Supabase.'}`, true);
          // Revert local state
          setTransactions(oldTransactions);
        });
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
    setTxFirstAmount(tx.firstAmount ? tx.firstAmount.toString() : '');
    setTxNextAmount(tx.nextAmount ? tx.nextAmount.toString() : '');
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = (id: string) => {
    if (safeConfirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
      const oldTransactions = [...transactions];
      setTransactions(prev => prev.filter(t => t.id !== id));
      db.deleteFinanceTransaction(id)
        .then(() => {
          showToast('Sincronizado: Transacción eliminada de Supabase.');
        })
        .catch(err => {
          console.error('Error deleting transaction in DB:', err);
          showToast('Error al eliminar: ' + (err.message || 'Error de base de datos.'), true);
          setTransactions(oldTransactions);
        });
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
    setTxFirstAmount('');
    setTxNextAmount('');
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
          updated.total = (q || 0) * (p || 0);
        }
        return updated;
      }
      return item;
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
          unitPrice: tx.amount, 
          total: tx.amount 
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

    // Update transactions list locally
    setTransactions(prev => prev.map(t => t.id === tx.id ? updatedTx : t));

    // Update transaction on DB
    try {
      await db.updateFinanceTransaction(updatedTx);
    } catch (err) {
      console.error('Error toggling transaction status in DB:', err);
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

        // Persist to DB
        db.updateFinanceInvoice(updatedInv).catch(err => console.error('Error updating invoice item status in DB:', err));
        return updatedInv;
      }
      return inv;
    });

    if (hasUpdatedAnyInvoice) {
      setInvoices(updatedInvoices);
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
        setInvoices(prev => prev.map(inv => inv.id === linkedInvoice.id ? updatedInv : inv));
        if (previewInvoice && previewInvoice.id === linkedInvoice.id) {
          setPreviewInvoice(updatedInv);
        }
        try {
          await db.updateFinanceInvoice(updatedInv);
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
      setInvClientName(match.name);
      setInvClientEmail(match.email);
    }
  };

  // Handler: Add or update invoice
  const handleSaveInvoice = (e: React.FormEvent) => {
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

    const subtotal = validItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = parseFloat((subtotal * (invTaxPercentage / 100)).toFixed(2));
    const total = parseFloat((subtotal + taxAmount).toFixed(2));

    const invoiceId = isEditingInv && editingInvId ? editingInvId : 'FAC-' + new Date().getFullYear() + '-' + String(invoices.length + 1).padStart(3, '0');

    // Create automatic pending transactions for custom invoice items with isPending === true
    const autoCreatedTxs: FinanceTransaction[] = [];
    const mappedItems = validItems.map((item, idx) => {
      const isItemPending = !!item.isPending;
      let pTxId = item.pendingTxId;
      const savedItemId = item.id.startsWith('temp') ? 'item_' + idx + '_' + Date.now() : item.id;

      if (isItemPending && !pTxId) {
        // Generate new pending transaction structure
        pTxId = 'tx_item_pending_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6);
        const newTx: FinanceTransaction = {
          id: pTxId,
          type: 'income',
          category: 'Desarrollo',
          amount: item.total,
          date: invDueDate || invDate, // Will raise deadline notice nicely around due date
          description: `Cobro Pendiente: ${item.description} (${invClientName})`,
          isRecurring: false,
          status: 'pending',
          invoiceId: invoiceId
        };
        autoCreatedTxs.push(newTx);
      }

      return {
        id: savedItemId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        isPending: isItemPending,
        pendingTxId: pTxId
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
    };

    if (isEditingInv && editingInvId) {
      setInvoices(prev => prev.map(inv => inv.id === editingInvId ? payload : inv));
      db.updateFinanceInvoice(payload).catch(err => console.error('Error updating invoice in DB:', err));
    } else {
      setInvoices(prev => [payload, ...prev]);
      db.insertFinanceInvoice(payload).catch(err => console.error('Error inserting invoice into DB:', err));
    }

    // Insert any auto-created pending transactions
    if (autoCreatedTxs.length > 0) {
      setTransactions(prev => [...autoCreatedTxs, ...prev]);
      autoCreatedTxs.forEach(tx => {
        db.insertFinanceTransaction(tx).catch(err => console.error('Error inserting item-pending transaction:', err));
      });
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
      setTransactions(prev => prev.map(t => {
        if (txsToMarkPaidFromItems.includes(t.id)) {
          const updated = { ...t, status: 'paid' as const };
          db.updateFinanceTransaction(updated).catch(err => console.error('Error marking linked concept tx as paid:', err));
          return updated;
        }
        return t;
      }));
    }

    // Link all chosen pending transactions (including originating transactions) to this invoice
    const txsToLink = [...selectedTxIdsForInvoice];
    if (originatingTxId) {
      txsToLink.push(originatingTxId);
    }

    if (txsToLink.length > 0) {
      setTransactions(prev => prev.map(t => {
        if (txsToLink.includes(t.id)) {
          const updatedTx: FinanceTransaction = { 
            ...t, 
            invoiceId: invoiceId,
            status: (invStatus === 'paid' ? 'paid' : t.status) as 'paid' | 'pending'
          };
          db.updateFinanceTransaction(updatedTx).catch(err => console.error('Error updating linked transaction:', err));
          return updatedTx;
        }
        return t;
      }));
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
      setTransactions(prev => [autoTx, ...prev]);
      db.insertFinanceTransaction(autoTx).catch(err => console.error('Error inserting auto invoice transaction in DB:', err));
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
    setInvDate(inv.date);
    setInvDueDate(inv.dueDate);
    setInvStatus(inv.status);
    setInvNotes(inv.notes || '');
    setInvTaxPercentage(inv.taxPercentage);
    setInvItems(inv.items.map(it => ({ ...it })));
    setInvAlias(inv.alias || '');
    setInvColor(inv.color || '');
    setIsInvModalOpen(true);
  };

  const handleDeleteInvoice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar esta factura?')) {
      setInvoices(prev => prev.filter(i => i.id !== id));
      db.deleteFinanceInvoice(id).catch(err => console.error('Error deleting invoice from DB:', err));
    }
  };

  const handleInvoiceMarkPaid = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Update status to paid
    const updated: Invoice = { ...inv, status: 'paid' };
    setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i));
    db.updateFinanceInvoice(updated).catch(err => console.error('Error marking invoice paid in DB:', err));

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
      setTransactions(prev => [autoTx, ...prev]);
      db.insertFinanceTransaction(autoTx).catch(err => console.error('Error inserting mark-paid auto transaction in DB:', err));
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

    // Update local state
    setInvoices(prev => prev.map(i => i.id === inv.id ? updatedInv : i));
    if (previewInvoice && previewInvoice.id === inv.id) {
      setPreviewInvoice(updatedInv);
    }

    // Persist to DB
    try {
      await db.updateFinanceInvoice(updatedInv);
    } catch (err) {
      console.error('Error updating invoice item status in DB:', err);
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

        setTransactions(prev => prev.map(t => t.id === txToUpdate.id ? updatedTx : t));
        try {
          await db.updateFinanceTransaction(updatedTx);
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
        setTransactions(prev => prev.map(t => t.id === mainPendingTx.id ? updatedMainTx : t));
        try {
          await db.updateFinanceTransaction(updatedMainTx);
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
          setTransactions(prev => prev.map(t => t.id === mainPaidTx.id ? updatedMainTx : t));
          try {
            await db.updateFinanceTransaction(updatedMainTx);
          } catch (err) {
            console.error('Error reverting main transaction status to pending in DB:', err);
          }
        }
      }
    }

    const toast = document.getElementById('toast-msg');
    if (toast) {
      toast.innerText = allItemsPaid 
        ? `Éxito: Se han cobrado todos los conceptos. Factura ${inv.id} cobrada y consolidada con éxito.`
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

    // Update invoices local state
    setInvoices(prev => prev.map(i => i.id === inv.id ? updatedInv : i));
    if (previewInvoice && previewInvoice.id === inv.id) {
      setPreviewInvoice(updatedInv);
    }

    // Persist to DB
    try {
      await db.updateFinanceInvoice(updatedInv);
    } catch (err) {
      console.error('Error updating invoice status to paid in DB:', err);
    }

    // Update all matching pending transactions linked to this invoice to paid
    const linkedTxIds = inv.items.map(it => it.pendingTxId).filter(Boolean) as string[];
    
    // Also include any other general transaction linked to this invoice
    const allLinkedTxs = transactions.filter(t => t.invoiceId === inv.id || linkedTxIds.includes(t.id));

    if (allLinkedTxs.length > 0) {
      const updatedTxs = transactions.map(t => {
        const isLinkedObj = t.invoiceId === inv.id || linkedTxIds.includes(t.id);
        if (isLinkedObj && t.status !== 'paid') {
          const updated = { ...t, status: 'paid' as const };
          db.updateFinanceTransaction(updated).catch(err => console.error('Error updating transaction in handleMarkAllConceptsPaid:', err));
          return updated;
        }
        return t;
      });
      setTransactions(updatedTxs);
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
      setTransactions(prev => [autoTx, ...prev]);
      try {
        await db.insertFinanceTransaction(autoTx);
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
  };

  // Helper to trigger recurrence manual payment simulation
  const handleProcessRecurring = (tx: FinanceTransaction) => {
    // Generate a new transaction on today's date mimicking this recurrence
    const chargeAmount = tx.nextAmount ?? tx.amount;
    const isIncome = tx.type === 'income';
    const manualPayment: FinanceTransaction = {
      id: 'tx_' + Date.now() + '_rec',
      type: tx.type,
      category: tx.category,
      amount: chargeAmount,
      date: new Date().toISOString().split('T')[0],
      description: isIncome ? `${tx.description} (Ingreso Procesado)` : `${tx.description} (Cargo Procesado)`,
      isRecurring: false,
      status: 'paid'
    };

    setTransactions(prev => [manualPayment, ...prev]);
    db.insertFinanceTransaction(manualPayment).catch(err => console.error('Error inserting transaction into DB:', err));

    const toast = document.getElementById('toast-msg');
    if (toast) {
      const text = isIncome
        ? `Ingreso de ${chargeAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€ procesado para: "${tx.description}"`
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
    const printArea = document.getElementById('invoice-modal-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    // Create temporary wrapper that will be the only visible child with tailwind/parent styles
    const tempWrapper = document.createElement('div');
    tempWrapper.id = 'temp-print-wrapper';
    tempWrapper.className = 'p-8 bg-white text-slate-900 font-sans border-none rounded-none m-0 space-y-8 select-text';
    tempWrapper.innerHTML = printArea.innerHTML;
    
    document.body.classList.add('is-printing');
    document.body.appendChild(tempWrapper);

    setTimeout(() => {
      window.print();
      document.body.classList.remove('is-printing');
      const attached = document.getElementById('temp-print-wrapper');
      if (attached) {
        document.body.removeChild(attached);
      }
    }, 150);
  };

  // Convert a transaction (cobro) directly into a detailed draft / paid invoice
  const handleCreateInvoiceFromTransaction = (tx: FinanceTransaction) => {
    setIsEditingInv(false);
    setEditingInvId(null);
    setOriginatingTxId(tx.id);
    
    // Find client in contacts list if possible
    const matchedContact = contacts.find(c => 
      tx.description.toLowerCase().includes(c.name.toLowerCase()) || 
      tx.description.toLowerCase().includes(c.company.toLowerCase())
    );
    
    if (matchedContact) {
      setInvClientId(matchedContact.id);
      setInvClientName(matchedContact.company !== 'Independent' ? matchedContact.company : matchedContact.name);
      setInvClientEmail(matchedContact.email);
    } else {
      setInvClientId('');
      setInvClientName(tx.description || 'Cliente de Facturación');
      setInvClientEmail('');
    }
    
    setInvDate(tx.date || new Date().toISOString().split('T')[0]);
    // Payment term: 15 days after issue date
    const issueDate = tx.date ? new Date(tx.date) : new Date();
    issueDate.setDate(issueDate.getDate() + 15);
    setInvDueDate(issueDate.toISOString().split('T')[0]);
    
    // Default to paid/sent depending on transaction status
    setInvStatus(tx.status === 'paid' ? 'paid' : 'draft');
    setInvNotes(`Factura correspondiente al cobro registrado el ${tx.date}.\nForma de pago: Transferencia Bancaria.`);
    setInvTaxPercentage(21);
    
    // Calculate values (assuming amount includes 21% VAT)
    const basePrice = parseFloat((tx.amount / 1.21).toFixed(2));
    
    setInvItems([
      { 
        id: 'item_auto_' + Date.now(), 
        description: tx.description || 'Servicios profesionales prestados', 
        quantity: 1, 
        unitPrice: basePrice, 
        total: basePrice 
      }
    ]);
    
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
  const handleDownloadInvoiceHtml = (inv: Invoice) => {
    const filename = `Factura_${inv.id}_${inv.clientName.replace(/\s+/g, '_')}.html`;
    
    const htmlContent = `<!DOCTYPE html>
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
          <h1 class="company-title">ALTHERA SOLUTIONS S.L.</h1>
          <div class="company-sub">
            CIF: B-18974534<br>
            Avenida de España, Nº 10, 1ºA<br>
            07800 - Ibiza, España<br>
            Inscrita en el Registro Mercantil de Ibiza (Tomo 1450, Folio 120, Hoja IB-45600)
          </div>
        </td>
        <td class="invoice-title-block" style="vertical-align: top;">
          <span class="invoice-label">Factura Simplificada</span>
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
          <div class="box-name">Althera Solutions S.L.</div>
          <div class="box-detail">
            Email: administracion@althera.io<br>
            Soporte: info@althera.io
          </div>
        </div>
      </div>
      <div class="stakeholder-column">
        <div class="stakeholder-box recipient">
          <div class="box-title">Cliente (Receptor)</div>
          <div class="box-name">${inv.clientName}</div>
          <div class="box-detail">
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

    <div class="bank-box">
      <div class="bank-title">Instrucciones de Pago (Transferencia Bancaria SEPA/SWIFT)</div>
      <div class="bank-grid">
        <div>
          <span class="bank-item-title">Beneficiario:</span><br>
          <span class="bank-item-val">${bankBeneficiary}</span>
        </div>
        <div>
          <span class="bank-item-title">IBAN Euro:</span><br>
          <span class="bank-item-val">${paymentDetails}</span>
        </div>
        <div>
          <span class="bank-item-title">Código BIC/SWIFT:</span><br>
          <span class="bank-item-val">${bankSwift}</span>
        </div>
        <div>
          <span class="bank-item-title">BIC Corresponsal:</span><br>
          <span class="bank-item-val">${bankCorrespondentBic}</span>
        </div>
        <div style="grid-column: span 2;">
          <span class="bank-item-title">Nombre y Dirección del Banco:</span><br>
          <span class="bank-item-val" style="font-family: inherit;">${bankNameAddress}</span>
        </div>
      </div>
    </div>

    ${inv.notes ? `
      <div class="notes-box">
        <div class="notes-title">Notas de Facturación</div>
        <p style="margin: 0; white-space: pre-wrap;">${inv.notes}</p>
      </div>
    ` : ''}

    <div class="footer">
      Althera Solutions, S.L. — Avenida de España, Nº 10, 1ºA, 07800 - Ibiza, España. Condición de vencimiento a 15 días tras emisión. ¡Gracias por confiar en Althera!
    </div>
  </div>
</body>
</html>`;

    // Dynamic clean download anchor trigger
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show toast message
    const toast = document.getElementById('toast-msg');
    if (toast) {
      const label = toast.querySelector('span');
      if (label) label.textContent = `Descargada factura ${inv.id} correctamente.`;
      toast.classList.remove('opacity-0');
      setTimeout(() => toast.classList.add('opacity-0'), 3500);
    }
  };

  // Transaction selection and calculations
  const filteredTxs = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(txSearch.toLowerCase()) || 
                          t.category.toLowerCase().includes(txSearch.toLowerCase()) ||
                          t.id.toLowerCase().includes(txSearch.toLowerCase());
    const matchesType = txTypeFilter === 'all' || t.type === txTypeFilter;
    const matchesCategory = txCategoryFilter === 'All' || t.category === txCategoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Pagination for transactions
  const txItemsPerPage = 10;
  const totalTxPages = Math.ceil(filteredTxs.length / txItemsPerPage);
  const safeCurrentPage = Math.min(txCurrentPage, Math.max(1, totalTxPages));
  const currentTxs = filteredTxs.slice((safeCurrentPage - 1) * txItemsPerPage, safeCurrentPage * txItemsPerPage);

  const filteredInvoices = invoices.filter(inv => {
    const searchLower = invSearch.toLowerCase();
    const matchesSearch = inv.clientName.toLowerCase().includes(searchLower) || 
                          inv.id.toLowerCase().includes(searchLower) ||
                          (inv.notes && inv.notes.toLowerCase().includes(searchLower)) ||
                          inv.date.includes(searchLower) ||
                          inv.total.toString().includes(searchLower) ||
                          inv.items.some(item => item.description.toLowerCase().includes(searchLower));
    const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const recurringExpenses = transactions.filter(t => !!t.isRecurring);

  return (
    <div className="w-full h-full overflow-y-auto p-8 scrollbar-thin @container" id="finance-module-root">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
        <div className="space-y-1.5 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#00f2fe] font-black bg-[#00f2fe]/10 border border-[#00f2fe]/20 px-2 py-0.5 rounded-lg">
              Módulo Directivo
            </span>
            <span className="text-slate-600 font-mono text-xs">•</span>
            <span className="text-xs text-slate-400 font-sans font-light tracking-wide">Control Financiero & Facturación en tiempo real</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h2 className="text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Cuentas y Finanzas
            </h2>
            
            {/* Sync status indicator */}
            {syncStatus === 'syncing' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Sincronizando con la nube
              </span>
            ) : syncStatus === 'synced' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgb(16,185,129)]" />
                Supabase Activo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-450 border border-rose-500/20 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Sin conexión a DB
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-light mt-0.5 max-w-2xl">
            Control de cobros estructurado, pasarela de facturación pro-forma para clientes y panel analítico de ingresos, egresos y suscripciones operativas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'transactions' && (
            <button
              onClick={() => {
                resetTxForm();
                setIsTxModalOpen(true);
              }}
              id="btn-new-tx"
              className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-xs text-slate-950 font-extrabold py-2.5 px-5 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/15 cursor-pointer flex items-center gap-1.5 border border-emerald-400/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Registrar Transacción</span>
            </button>
          )}

          {activeTab === 'invoices' && (
            <button
              onClick={() => {
                resetInvForm();
                setIsInvModalOpen(true);
              }}
              id="btn-new-invoice"
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs text-white font-extrabold py-2.5 px-5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/15 cursor-pointer flex items-center gap-1.5 border border-blue-400/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Generar Factura</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Financial Bento Scoreboard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5">
        
        {/* Metric 1: Saldo Consolidado */}
        <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-emerald-500/[0.02]">
          <div className="absolute top-4 right-4 bg-emerald-500/10 rounded-xl p-2 border border-emerald-500/10 group-hover:scale-105 transition-transform duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Saldo Consolidado</span>
          <h3 className="text-3px font-black text-white mt-2 tracking-tight font-serif select-all text-3xl">
            {consolidatedBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-emerald-400 text-lg ml-1 font-sans">€</span>
          </h3>
          <p className="text-[10px] text-emerald-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cobrado bruto</span>
          </p>
        </div>

        {/* Metric 2: Saldo Pendiente */}
        <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-amber-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-amber-500/[0.02]">
          <div className="absolute top-4 right-4 bg-amber-500/10 rounded-xl p-2 border border-amber-500/10 group-hover:scale-105 transition-transform duration-300">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-500" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Saldo Pendiente</span>
          <h3 className="text-3px font-black text-white mt-2 tracking-tight font-serif select-all text-3xl">
            {pendingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-amber-400 text-lg ml-1 font-sans">€</span>
          </h3>
          <p className="text-[10px] text-amber-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
            <Repeat className="w-3.5 h-3.5 animate-pulse" />
            <span>Por cobrar o procesar</span>
          </p>
        </div>

        {/* Metric 3: Ingresos Totales */}
        <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-blue-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-blue-500/[0.02]">
          <div className="absolute top-4 right-4 bg-blue-500/10 rounded-xl p-2 border border-blue-500/10 group-hover:scale-105 transition-transform duration-300">
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-500" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Ingresos Totales</span>
          <h3 className="text-3px font-black text-white mt-2 tracking-tight font-serif select-all text-3xl">
            {totalIncomes.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-blue-450 text-lg ml-1 font-sans">€</span>
          </h3>
          <p className="text-[10px] text-blue-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Volumen total facturado</span>
          </p>
        </div>

        {/* Metric 4: Gastos Totales */}
        <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-rose-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-rose-500/[0.02]">
          <div className="absolute top-4 right-4 bg-rose-500/10 rounded-xl p-2 border border-rose-500/10 group-hover:scale-105 transition-transform duration-300">
            <ArrowDownLeft className="w-4 h-4 text-rose-400" />
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-500" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Gastos Totales</span>
          <h3 className="text-3px font-black text-white mt-2 tracking-tight font-serif select-all text-3xl">
            {totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-rose-400 text-lg ml-1 font-sans">€</span>
          </h3>
          <p className="text-[10px] text-rose-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Fijos y variables registrados</span>
          </p>
        </div>

        {/* Metric 5: Sueldos Comerciales */}
        <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-violet-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-violet-500/[0.02]">
          <div className="absolute top-4 right-4 bg-violet-500/10 rounded-xl p-2 border border-violet-500/10 group-hover:scale-105 transition-transform duration-300">
            <Briefcase className="w-4 h-4 text-violet-400" />
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all duration-500" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Sueldos Comerciales</span>
          <h3 className="text-3px font-black text-white mt-2 tracking-tight font-serif select-all text-3xl">
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
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Saldo Neto</span>
          <h3 className="text-3px font-black text-white mt-2 tracking-tight font-serif select-all text-3xl">
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
              activeTab === 'transactions' 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/5' 
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            Bitácora de Transacciones
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 ${
              activeTab === 'recurring' 
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/5' 
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <span>Conceptos Recurrentes</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'recurring' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-slate-400'}`}>
              {recurringExpenses.length}
            </span>
          </button>
          <button
            hidden
            onClick={() => setActiveTab('invoices')}
            className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 ${
              activeTab === 'invoices' 
                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300 shadow-sm shadow-blue-500/5' 
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <span>Facturación y Cobros</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'invoices' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400'}`}>
              {invoices.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('stripe')}
            className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 ${
              activeTab === 'stripe' 
                ? 'bg-[#00f2fe]/10 border border-[#00f2fe]/20 text-[#00f2fe] shadow-sm shadow-[#00f2fe]/5' 
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pasarela Stripe</span>
          </button>
          <button
            onClick={() => setActiveTab('comerciales')}
            className={`text-xs font-bold transition-all px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 ${
              activeTab === 'comerciales' 
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/5' 
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Comerciales</span>
          </button>
        </div>

        {/* Dynamic Context Helpers */}
        <span className="text-[11px] font-mono text-slate-500 text-left sm:text-right">
          {activeTab === 'transactions' 
            ? `Mostrando ${filteredTxs.length} registros` 
            : activeTab === 'recurring' 
              ? `${recurringExpenses.length} suscripciones operativas` 
              : activeTab === 'stripe'
                ? `Pasarela Stripe Integrada & Activa`
                : `${comercialesList.length} representantes comerciales`}
        </span>
      </div>

      {/* Tab Content 1: Transactions list */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filtering bar */}
          <div className="bg-[#0b1329]/20 backdrop-blur-md border border-white/5 p-4 rounded-3xl flex flex-col lg:flex-row items-stretch lg:items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTxTypeFilter('all')}
                className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                  txTypeFilter === 'all'
                    ? 'bg-white/10 border-white/20 text-white shadow-md'
                    : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTxTypeFilter('income')}
                className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                  txTypeFilter === 'income'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5'
                    : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setTxTypeFilter('expense')}
                className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                  txTypeFilter === 'expense'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-455 shadow-md shadow-rose-500/5'
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

          {/* Table list */}
          <div className="bg-[#0b1329]/10 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-[#0b1329]/40 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    <th className="p-4 font-bold">Detalles de Operación</th>
                    <th className="p-4 font-bold">Categorización</th>
                    <th className="p-4 font-bold">Fecha</th>
                    <th className="p-4 font-bold">Importe</th>
                    <th className="p-4 font-bold">Estado Real</th>
                    <th className="p-4 font-bold text-right">Controles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentTxs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center text-slate-500 text-xs font-light">
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

                      return (
                        <tr 
                          key={t.id} 
                          className={`text-xs transition-colors group relative ${
                            linkedInv 
                              ? 'bg-blue-500/5 hover:bg-blue-500/10 border-l border-l-blue-500' 
                              : 'hover:bg-white/[0.01]'
                          }`}
                        >
                          <td className="p-4 text-left">
                            <div className="max-w-xs sm:max-w-md text-left">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block leading-none mb-1 select-all">
                                {t.id}
                              </span>
                              <span className="font-bold text-white text-xs block leading-snug group-hover:text-emerald-400 transition-colors">
                                {getCleanBillingConcept(t.description)}
                              </span>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {linkedInv && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg shadow-sm">
                                    <FileText className="w-3 h-3 text-blue-400" />
                                    <span>Con Factura: {linkedInv.id}</span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${linkedInv.status === 'paid' ? 'bg-emerald-400' : 'bg-amber-400'}`} title={linkedInv.status === 'paid' ? 'Factura Pagada' : 'Factura Pendiente / Borrador'} />
                                  </span>
                                )}
                                {t.isRecurring && (
                                  <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider font-mono text-purple-400 bg-purple-500/10 border border-purple-500/25 px-1.5 py-0.5 rounded-md">
                                    <Repeat className="w-2.5 h-2.5" />
                                    <span>{t.type === 'income' ? 'Ingreso' : 'Gasto'} recurrente ({t.recurrencePeriod})</span>
                                  </span>
                                )}
                                {t.id && (t.id.startsWith('tx_stripe_') || t.id.startsWith('tx_auto_stripe_')) && (
                                  <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-md">
                                    <CreditCard className="w-2.5 h-2.5" />
                                    <span>Procesado por Stripe</span>
                                  </span>
                                )}
                                {stripeDashboardUrl && (
                                  <a
                                    href={stripeDashboardUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider font-mono text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-1.5 py-0.5 rounded-md"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Ver pago en Stripe"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    <span>Ver en Stripe</span>
                                  </a>
                                )}
                                {t.paymentMethod && (
                                  <span className={`inline-flex items-center gap-1 text-[8px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-md select-none ${
                                    t.paymentMethod === 'cash' 
                                      ? 'bg-purple-500/10 border border-purple-500/25 text-purple-300' 
                                      : 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-300'
                                  }`}>
                                    {t.paymentMethod === 'cash' ? '💸 Efectivo / Cash' : '🏦 Transferencia'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-left">
                            <span className={`text-[9px] font-mono border px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${tagStyle}`}>
                                {t.category}
                            </span>
                          </td>
                          <td className="p-4 text-left text-slate-400 font-mono">
                            {t.date}
                          </td>
                          <td className="p-4 text-left">
                            <span className={`font-mono text-xs font-bold tracking-tight ${linkedInv ? 'text-blue-400' : t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </span>
                          </td>
                          <td className="p-4 text-left">
                            {t.status === 'paid' ? (
                              <button
                                onClick={() => handleToggleTransactionStatus(t)}
                                className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 px-2 py-0.5 rounded-lg transition-all cursor-pointer group"
                                title="Haga clic para revertir / desmarcar de Bitácora (cambiará a Pendiente)"
                              >
                                <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(16,185,129)]" />
                                <span className="group-hover:hidden">Liquidado</span>
                                <span className="hidden group-hover:inline text-emerald-300">↩ Pendiente</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg text-amber-400">
                                  <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                                  Pendiente
                                </span>
                                <button
                                  onClick={() => handleToggleTransactionStatus(t)}
                                  className="text-[9px] font-sans font-extrabold bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 px-2 py-1 rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-0.5 leading-none"
                                  title="Marcar como Liquidado y sincronizar facturas/conceptos"
                                >
                                  <span>💵 Cobrar</span>
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {linkedInv ? (
                                <button
                                  onClick={() => setPreviewInvoice(linkedInv)}
                                  className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                  title={`Ver Factura Vinculada (${linkedInv.id})`}
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />
                                </button>
                              ) : (
                                t.type === 'income' && (
                                  <button
                                    onClick={() => handleCreateInvoiceFromTransaction(t)}
                                    className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Facturar este cobro (Generar y editar factura)"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                              <button
                                onClick={() => handleEditTx(t)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition transition-colors duration-250"
                                title="Editar transacción"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(t.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition transition-colors duration-250"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
                        pageNum === safeCurrentPage
                          ? 'bg-purple-600/10 text-purple-400 border-purple-500/30'
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

      {/* Tab Content 2: Recurring Expenses/Incomes List */}
      {activeTab === 'recurring' && (
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
              Aquí puedes supervisar los ingresos y gastos recurrentes estructurados que se procesan periódicamente. Puedes simular el abono o cobro de una nueva cuota instantánea haciendo clic en <strong className="text-purple-300 font-medium">Procesar Ingreso / Cargo</strong> para asentar la fecha actual.
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
                          {item.recurrencePeriod === 'weekly' || item.recurrencePeriod === 'semanal' 
                            ? 'Semanal' 
                            : item.recurrencePeriod === 'yearly' || item.recurrencePeriod === 'anual' 
                              ? 'Anual' 
                              : 'Mensual'}
                        </span>
                        <span className={`text-[9px] font-mono border px-2 py-0.5 rounded-xl uppercase tracking-wider font-bold ${
                          item.type === 'income' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {item.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
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
                      <span>{item.type === 'income' ? 'Procesar Ingreso' : 'Procesar Cargo'}</span>
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
          {/* Top filter and search for invoices */}
          <div className="bg-[#0b1329]/20 backdrop-blur-md border border-white/5 p-4 rounded-3xl flex flex-col lg:flex-row items-stretch lg:items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setInvoiceStatusFilter('all')}
                className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                  invoiceStatusFilter === 'all'
                    ? 'bg-white/10 border-white/20 text-white shadow-md'
                    : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setInvoiceStatusFilter('draft')}
                className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                  invoiceStatusFilter === 'draft'
                    ? 'bg-slate-700/20 border-white/10 text-slate-350 shadow-md'
                    : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Borradores
              </button>
              <button
                onClick={() => setInvoiceStatusFilter('sent')}
                className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                  invoiceStatusFilter === 'sent'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-md shadow-blue-500/5'
                    : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Enviadas
              </button>
              <button
                onClick={() => setInvoiceStatusFilter('paid')}
                className={`text-[10px] uppercase font-mono tracking-wider font-extrabold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                  invoiceStatusFilter === 'paid'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5'
                    : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Pagadas
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
                    <div className="mt-3 pt-2 border-t border-white/[0.03] space-y-1.5" onClick={e => e.stopPropagation()}>
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Conceptos (Clic para cobrar/pendiente)</span>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {inv.items.map((it) => (
                          <div 
                            key={it.id} 
                            onClick={(e) => handleToggleConceptPaid(inv, it.id, e)}
                            className={`flex items-center justify-between p-1.5 rounded-xl text-xs transition-all border group/item cursor-pointer select-none ${
                              it.isPending 
                                ? 'bg-amber-500/[0.02] border-amber-500/10 hover:border-amber-500/30 text-slate-350 hover:bg-amber-500/[0.04]' 
                                : 'bg-emerald-500/[0.01] border-emerald-500/5 hover:border-emerald-500/15 text-slate-400 hover:bg-emerald-500/[0.02]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-1.5">
                              {/* Checkbox status indicator */}
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                                it.isPending
                                  ? 'border-amber-500/30 bg-amber-500/5 group-hover/item:border-amber-400'
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
                    </div>
                  </div>

                  {/* Actions drawer */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-1">
                    <span className="text-[9px] font-mono text-slate-500">Haga clic para PDF</span>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {inv.status !== 'paid' && (
                        <button
                          onClick={(e) => handleMarkAllConceptsPaid(inv, e)}
                          className="bg-emerald-600/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold py-1.5 px-3 rounded-xl cursor-pointer transition active:scale-95 duration-200"
                          title="Cobrar todos los conceptos de la factura"
                        >
                          Cobrar Todo
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
          {/* Stripe Metric Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-violet-600/10 to-purple-600/5 backdrop-blur-md border border-violet-500/20 p-5 rounded-3xl relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-violet-500/10 rounded-2xl p-3 border border-violet-500/20">
                <Repeat className="w-5 h-5 text-violet-400 animate-pulse" />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Suscripciones Activas</span>
              <h3 className="text-3xl font-black text-white mt-2 font-mono">
                {activeSubs.length}
              </h3>
              <p className="text-[10px] text-violet-300 font-mono mt-3">
                Cobros recurrentes autogestionados
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-600/10 to-teal-600/5 backdrop-blur-md border border-cyan-500/20 p-5 rounded-3xl relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-cyan-500/10 rounded-2xl p-3 border border-cyan-500/20">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">MRR Estimado (Stripe)</span>
              <h3 className="text-3xl font-black text-white mt-2 font-mono">
                {mrr.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-cyan-400 text-lg ml-1 font-sans">€</span>
              </h3>
              <p className="text-[10px] text-cyan-300 font-mono mt-3">
                Ingresos recurrentes mensuales
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-600/10 to-green-600/5 backdrop-blur-md border border-emerald-500/20 p-5 rounded-3xl relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Volumen Cobrado</span>
              <h3 className="text-3xl font-black text-white mt-2 font-mono">
                {stripeVolume.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-emerald-400 text-lg ml-1 font-sans">€</span>
              </h3>
              <p className="text-[10px] text-emerald-300 font-mono mt-3">
                Liquidaciones registradas automáticamente
              </p>
            </div>
          </div>

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
                        {stripeGenLoading 
                          ? 'Generando Enlace...' 
                          : stripeGenInterval === 'once' 
                            ? 'Generar Enlace de Pago Único' 
                            : 'Generar Enlace de Suscripción'}
                      </span>
                    </button>
                  ) : (
                    <div className="space-y-3 bg-[#040408]/60 p-4 rounded-xl border border-white/5 mt-2">
                      <span className="block text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wide">¡Enlace de Pago Listo!</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed text-left">
                        {stripeGenInterval === 'once' 
                          ? 'Envía este enlace de pago único para que el cliente liquide el cobro de forma inmediata:' 
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
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Suscripciones Activas</h3>
                  </div>
                  <span className="text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-mono font-bold">
                    {activeSubs.length} Clientes
                  </span>
                </div>

                <div className="space-y-3 max-h-[295px] overflow-y-auto pr-1">
                  {activeSubs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs font-light">
                      No hay clientes con suscripciones activas registradas en Stripe.
                    </div>
                  ) : (
                    activeSubs.map(c => (
                      <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-4 bg-[#07070b]/45 rounded-2xl border border-white/5 hover:border-violet-500/20 transition group">
                        <div className="space-y-1 text-left min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-violet-400 transition truncate">{c.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{c.email}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[8px] font-mono text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-extrabold flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgb(52,211,153)]" />
                              Activo
                            </span>
                            <span className="text-[8px] font-mono text-slate-500 truncate">
                              ID: {c.stripeCustomerId}
                            </span>
                            <span className="text-[8px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/15 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-extrabold">
                              Pagos: {getClientStripePaymentProgress(c)}
                            </span>
                          </div>
                        </div>

                        <div className="text-left md:text-right shrink-0 space-y-1.5">
                          <span className="block text-xs font-black font-mono text-white leading-none">
                            {c.stripeSubscriptionPrice} € <span className="text-[9px] text-slate-500 font-light">/ {c.stripeSubscriptionInterval === 'year' ? 'año' : 'mes'}</span>
                          </span>
                          {c.stripeCustomerId && (
                            <button
                              type="button"
                              disabled={stripePortalLoading === c.id}
                              onClick={() => handleOpenFinanceStripePortal(c.stripeCustomerId!, c.id)}
                              className="inline-flex items-center gap-1 py-1 px-2.5 bg-white/5 hover:bg-white/10 text-[9px] rounded-lg text-slate-350 font-bold border border-white/5 transition cursor-pointer"
                            >
                              {stripePortalLoading === c.id ? (
                                <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ExternalLink className="w-2.5 h-2.5" />
                              )}
                              <span>Portal</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={stripeOverviewLoading === c.id}
                            onClick={() => handleLoadFinanceStripeOverview(c)}
                            className="mt-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 border border-white/5 rounded-lg text-[9px] text-slate-300 font-bold inline-flex items-center gap-1.5"
                          >
                            {stripeOverviewLoading === c.id ? (
                              <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CreditCard className="w-3 h-3" />
                            )}
                            <span>{stripeOverviewByClient[c.id] ? 'Ocultar info' : 'Info Stripe'}</span>
                          </button>
                        </div>
                        {stripeOverviewByClient[c.id] && (
                          <div className="md:col-span-2 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
                            <div className="bg-cyan-500/5 rounded-lg p-2 border border-cyan-500/10">
                              <span className="block text-[7px] text-slate-500 uppercase font-mono">Pagos</span>
                              <span className="text-[11px] text-cyan-300 font-black">{getClientStripePaymentProgress(c)}</span>
                            </div>
                            <div className="bg-black/20 rounded-lg p-2 border border-emerald-500/10">
                              <span className="block text-[7px] text-slate-500 uppercase font-mono">Cobrado</span>
                              <span className="text-[11px] text-emerald-400 font-black">{getClientStripeMoneySummary(c).paid.toFixed(2)} €</span>
                            </div>
                            <div className="bg-black/20 rounded-lg p-2 border border-amber-500/10">
                              <span className="block text-[7px] text-slate-500 uppercase font-mono">Abierto</span>
                              <span className="text-[11px] text-amber-400 font-black">{getClientStripeMoneySummary(c).open.toFixed(2)} €</span>
                            </div>
                            <div className="col-span-3 space-y-1.5 text-left">
                              {(stripeOverviewByClient[c.id].subscriptions || []).slice(0, 1).map((sub: any) => (
                                <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 text-[9px] bg-black/20 border border-white/5 rounded-lg p-2">
                                  <span className="text-slate-300 truncate">{sub.id}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={sub.status === 'active' ? 'text-emerald-400' : sub.status === 'canceled' ? 'text-rose-400' : 'text-amber-400'}>
                                      {sub.cancelAtPeriodEnd ? 'cancela al final' : sub.status}
                                    </span>
                                    {sub.status !== 'canceled' && (
                                      <button
                                        type="button"
                                        disabled={stripeCancelLoading === sub.id}
                                        onClick={() => handleCancelFinanceSubscription(c, sub.id)}
                                        className="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold disabled:opacity-50"
                                      >
                                        {stripeCancelLoading === sub.id ? 'Cancelando...' : 'Cancelar'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {(stripeOverviewByClient[c.id].invoices || []).slice(0, 2).map((inv: any) => (
                                <div key={inv.id} className="flex justify-between gap-2 text-[9px] bg-black/20 border border-white/5 rounded-lg p-2">
                                  <span className="text-slate-300 truncate">{inv.number || inv.id}</span>
                                  <a href={inv.hostedInvoiceUrl || inv.dashboardUrl} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200">
                                    {inv.status} · {inv.amountPaid.toFixed(2)} €
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {stripeOverviewError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400">
                    {stripeOverviewError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Payment Logs */}
          <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Registro Histórico de Pagos Stripe</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {stripeTransactions.length} Cobros Sincronizados
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
                  {stripeTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500 text-xs font-light">
                        Aún no se han procesado cobros automáticos a través de la pasarela Stripe.
                      </td>
                    </tr>
                  ) : (
                    stripeTransactions.map(t => {
                      const isPaid = t.status === 'paid';
                      return (
                        <tr key={t.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-3 font-mono text-[9px] text-slate-400 select-all">{t.id}</td>
                          <td className="p-3 text-left">
                            <span className="font-bold text-white">{t.description}</span>
                            <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{t.category}</span>
                          </td>
                          <td className="p-3 text-slate-350">{t.date}</td>
                          <td className={`p-3 font-mono font-bold ${isPaid ? 'text-emerald-450' : 'text-amber-400'}`}>
                            {t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </td>
                          <td className="p-3 text-right">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg select-none border ${
                              isPaid
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            }`}>
                              <ShieldCheck className={`w-3 h-3 ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`} />
                              <span>{isPaid ? 'Cobrado en Stripe' : 'Pendiente de cobro'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Total Sales Volume */}
            {(() => {
              const totalVentasComerciales = comercialesList.reduce((sum, com) => {
                const txs = transactions.filter(tx => 
                  tx.isInitialSale === true && 
                  (tx.comercialId === com.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === com.email.toLowerCase()))
                );
                return sum + txs.reduce((s, t) => s + (t.amount || 0), 0);
              }, 0);

              const totalComisionesDevengadas = comercialesList.reduce((sum, com) => {
                const txs = transactions.filter(tx => 
                  tx.isInitialSale === true && 
                  (tx.comercialId === com.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === com.email.toLowerCase()))
                );
                const paidTxs = txs.filter(tx => tx.status === 'paid');
                const volume = paidTxs.reduce((s, t) => s + (t.amount || 0), 0);
                
                const clientsCount = contacts.filter(c => 
                  c.status === 'Client' && 
                  (c.contactedByComercialEmail && c.contactedByComercialEmail.toLowerCase() === com.email.toLowerCase())
                ).length;
                const closures = Math.max(clientsCount, txs.length);
                const pct = getTieredCommission(closures);
                
                return sum + (volume * (pct / 100));
              }, 0);

              const avgComm = comercialesList.length 
                ? Math.round(comercialesList.reduce((sum, com) => {
                    const txs = transactions.filter(tx => 
                      tx.isInitialSale === true && 
                      (tx.comercialId === com.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === com.email.toLowerCase()))
                    );
                    const clientsCount = contacts.filter(c => 
                      c.status === 'Client' && 
                      (c.contactedByComercialEmail && c.contactedByComercialEmail.toLowerCase() === com.email.toLowerCase())
                    ).length;
                    const closures = Math.max(clientsCount, txs.length);
                    return sum + getTieredCommission(closures);
                  }, 0) / comercialesList.length)
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
                  {comercialesList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-16 text-center text-slate-500 text-xs font-light">
                        No hay comerciales autorizados registrados.
                      </td>
                    </tr>
                  ) : (
                    comercialesList.map(com => {
                      const txs = transactions.filter(tx => 
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
                      
                      const closures = Math.max(clientsCount, txs.length);
                      const pct = getTieredCommission(closures);
                      const benefits = paidVolume * (pct / 100);

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
                              <span className="text-[7px] font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold uppercase tracking-wider">Escalonada</span>
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
                    const initialTxs = transactions.filter(t => t.isInitialSale === true);
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
                        const comTxs = transactions.filter(tx => 
                          tx.isInitialSale === true && 
                          (tx.comercialId === assignedCom.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === assignedCom.email.toLowerCase()))
                        );
                        const clientsCount = contacts.filter(c => 
                          c.status === 'Client' && 
                          (c.contactedByComercialEmail && c.contactedByComercialEmail.toLowerCase() === assignedCom.email.toLowerCase())
                        ).length;
                        const closures = Math.max(clientsCount, comTxs.length);
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
                      txType === 'income'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    Ingreso (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('expense')}
                    className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      txType === 'expense'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
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
                    <option value="Desarrollo">Desarrollo</option>
                    <option value="Consultoría">Consultoría</option>
                    <option value="Infraestructura">Infraestructura</option>
                    <option value="Software Herramientas">Software Herramientas</option>
                    <option value="Dominios">Dominios</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Oficina">Oficina</option>
                    <option value="Facturado">Facturado</option>
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
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxPaymentMethod(undefined)}
                    className={`py-1.5 text-[11px] font-medium rounded-xl border transition cursor-pointer ${
                      txPaymentMethod === undefined
                        ? 'bg-slate-700/30 border-slate-500 text-slate-300'
                        : 'bg-transparent border-white/5 text-slate-500 hover:bg-white/5'
                    }`}
                  >
                    Ninguno
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxPaymentMethod('cash')}
                    className={`py-1.5 text-[11px] font-medium rounded-xl border transition cursor-pointer flex items-center justify-center gap-1 ${
                      txPaymentMethod === 'cash'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-sm'
                        : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <span>💸 Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxPaymentMethod('transfer')}
                    className={`py-1.5 text-[11px] font-medium rounded-xl border transition cursor-pointer flex items-center justify-center gap-1 ${
                      txPaymentMethod === 'transfer'
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-sm'
                        : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <span>🏦 Transferencia</span>
                  </button>
                </div>
              </div>

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
                      {txType === 'income' ? 'Establecer Ingreso Recurrente' : 'Establecer Gasto Recurrente'}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {txType === 'income' ? 'Ingreso recurrente estructurado' : 'Suscripción fija recurrente'}
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
                        {txType === 'income' ? 'Periodo de ingreso' : 'Periodo de cobro/pago'}
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
                      {txType === 'income' 
                        ? '* El ingreso inicial tendrá el importe del primero. Al pulsar "Procesar Ingreso" para los siguientes vencimientos, se asentará el importe de los próximos.'
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
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl relative text-left">
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
                          invColor === col.value 
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' 
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
                    onChange={(e) => setInvTaxPercentage(Number(e.target.value))}
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
                        <span className="text-[8px] font-mono text-slate-500 uppercase">Precio Unit.</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateInvoiceItemField(index, 'unitPrice', Number(e.target.value))}
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
                        <span className="font-mono text-xs font-bold text-white mr-1 leading-none">
                          {item.total.toLocaleString('es-ES')} €
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
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl relative text-left">
            
            {/* Action Bar inside view modal */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01] print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded">PDF FACTURA</span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-400 font-light">{previewInvoice.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadInvoiceHtml(previewInvoice)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Descargar Factura local (.html)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Factura (HTML)</span>
                </button>
                <button
                  onClick={handlePrintPreview}
                  className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button 
                  onClick={() => setPreviewInvoice(null)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Frame Box Container */}
            <div id="invoice-modal-print-area" className="p-8 bg-neutral-900 text-slate-200 font-sans border border-neutral-800 rounded-2xl m-3 space-y-8 select-text relative">
              
              {/* Logo & ID Banner Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-neutral-800">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="h-5.5 w-5.5 rounded bg-blue-600 flex items-center justify-center text-slate-950 uppercase font-bold text-[10px]">
                      A
                    </span>
                    <span className="text-sm font-black text-white tracking-widest font-mono uppercase">ALTHERA SOLUTIONS</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal font-mono font-medium block">
                    Avenida de España, Nº 10, 1ºA<br />
                    Althera Solutions S.L. — CIF B-18974534<br />
                    07800 - Ibiza, España
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs uppercase font-mono font-bold tracking-widest text-blue-400">FACTURA SIMPLIFICADA</span>
                  <h3 className="text-lg font-black text-white font-mono mt-1">{previewInvoice.id}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Emisión: {previewInvoice.date}<br />
                    Vence: {previewInvoice.dueDate}
                  </p>
                </div>
              </div>

              {/* Stakeholders Client metadata info block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-left">
                <div className="space-y-1 bg-neutral-950/40 p-3 rounded-xl border border-neutral-850">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">EMISOR (PROVEEDOR)</span>
                  <h4 className="font-bold text-xs text-white">Althera Solutions S.L.</h4>
                  <p className="text-slate-400 leading-normal text-[11px]">
                    Email: admin@althera.io<br />
                    Soporte: +34 910 123 456
                  </p>
                </div>

                <div className="space-y-1 bg-neutral-950/40 p-3 rounded-xl border border-neutral-850">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">CLIENTE (RECEPTOR)</span>
                  <h4 className="font-bold text-xs text-white">{previewInvoice.clientName}</h4>
                  <p className="text-slate-400 leading-normal text-[11px]">
                    Email: {previewInvoice.clientEmail}<br />
                    ID Cliente CRM: {previewInvoice.clientId || 'Inscripción Directa'}
                  </p>
                </div>
              </div>

              {/* Items List inside PDF preview */}
              <div className="space-y-2 text-left">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold mb-1">Conceptos en Factura</span>
                <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/30">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-850 bg-neutral-950/50 font-mono text-slate-500 text-[10px]">
                        <th className="p-3 font-semibold uppercase">Descripción</th>
                        <th className="p-3 font-semibold uppercase text-center w-16">Cant.</th>
                        <th className="p-3 font-semibold uppercase text-right w-24">Precio Unit.</th>
                        <th className="p-3 font-semibold uppercase text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {previewInvoice.items.map((it, idx) => (
                        <tr key={it.id || idx} className="text-[11px] text-slate-300">
                          <td className="p-3 font-medium text-white">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 flex-wrap">
                              <span>{getCleanBillingConcept(it.description)}</span>
                              {it.isPending ? (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 rounded text-amber-400 select-none leading-none">
                                  <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                                  Pendiente
                                </span>
                              ) : it.pendingTxId ? (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded text-emerald-400 select-none leading-none">
                                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                  Cobrado
                                </span>
                              ) : null}
                              {it.paymentMethod && (
                                <span className={`inline-flex items-center gap-0.5 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded select-none leading-none uppercase ${
                                  it.paymentMethod === 'cash' 
                                    ? 'bg-purple-500/10 border border-purple-500/25 text-purple-300' 
                                    : 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-300'
                                }`}>
                                  {it.paymentMethod === 'cash' ? '💸 Efectivo / Cash' : '🏦 Trsf.'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">{it.quantity}</td>
                          <td className="p-3 text-right font-mono">{it.unitPrice.toLocaleString('es-ES')} €</td>
                          <td className="p-3 text-right font-mono text-white text-xs font-semibold">{it.total.toLocaleString('es-ES')} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Subtotal, tax rate, and final total calc box block */}
              <div className="flex flex-col items-end gap-1.5 text-xs text-right pt-2">
                <div className="w-full sm:w-64 space-y-1.5 border-t border-neutral-800 pt-4">
                  <div className="flex justify-between text-slate-400 font-mono">
                    <span>Subtotal Neto</span>
                    <span>{previewInvoice.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                  </div>
                  <div className="flex justify-between text-slate-400 font-mono">
                    <span>IVA ({previewInvoice.taxPercentage}%)</span>
                    <span>{previewInvoice.taxAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-1.5 border-t border-neutral-850 font-serif">
                    <span>TOTAL FACTURA</span>
                    <span>{previewInvoice.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                  </div>
                </div>
              </div>

              {/* Instructions regarding payment / banking (Revolut) */}
              <div className="bg-neutral-950/50 border border-amber-500/15 rounded-xl p-4 text-[10px] text-left space-y-2 text-slate-300">
                <span className="font-bold text-amber-400 uppercase tracking-wider block border-b border-neutral-850 pb-1 select-none font-mono">
                  Instrucciones de Pago (Transferencia Bancaria SEPA/SWIFT)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 font-mono">
                  <div>
                    <span className="text-slate-500">Beneficiario:</span><br />
                    <strong className="text-white select-all">{bankBeneficiary}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">IBAN Euro:</span><br />
                    <strong className="text-white select-all">{paymentDetails}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Código BIC/SWIFT:</span><br />
                    <strong className="text-white select-all">{bankSwift}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">BIC Corresponsal:</span><br />
                    <strong className="text-white select-all">{bankCorrespondentBic}</strong>
                  </div>
                  <div className="sm:col-span-2 pt-1 border-t border-neutral-850">
                    <span className="text-slate-500">Nombre y Dirección del Banco:</span><br />
                    <span className="text-slate-400">{bankNameAddress}</span>
                  </div>
                </div>
              </div>

              {/* Conditions / notes of print preview */}
              {previewInvoice.notes && (
                <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-850 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold mb-1">Notas del emisor</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-light">{previewInvoice.notes}</p>
                </div>
              )}

              {/* OPERACIONES DE FINANZAS VINCULADAS */}
              <div className="bg-neutral-950/50 border border-blue-500/15 rounded-xl p-4 text-left space-y-3">
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

              {/* Watermark of authenticity */}
              <div className="text-center pt-6 border-t border-neutral-850">
                <p className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
                  Facturación Electrónica Sincronizada — Prototipo Althera v2.5
                </p>
              </div>

            </div>

            {/* View modal close button footer */}
            <div className="p-4 border-t border-white/5 flex justify-end items-center bg-white/[0.01] print:hidden">
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

