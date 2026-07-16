import React, { useState, useEffect } from 'react';
import { ClientContact, CalendarEvent, Screen, Invoice, FinanceTransaction, ComercialAccount, InvoiceItem, ComercialLead } from '../types';
import { db } from '../supabaseClient';
import { REGISTERED_USERS, PanelUser } from '../mockData';
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
 BriefcaseBusiness
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
 onAddContact: (contact: ClientContact) => void;
 onUpdateContact?: (contact: ClientContact) => void;
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
 usersList = REGISTERED_USERS,
 onAddProfile,
 onAddEvent,
 comercialesList = [],
 onRefreshFinance
}: CrmScreenProps) {
 const [selectedContactId, setSelectedContactId] = useState<string>('c2'); // default to Marcus Chen
 const selectedContact = contacts.find(c => c.id === selectedContactId) || contacts[0];
 const [showAddModal, setShowAddModal] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');

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

 // Archive tracker state linked to sessionStorage
 const [archivedContactIds, setArchivedContactIds] = useState<string[]>(() => {
 const saved = sessionStorage.getItem('archived_contacts_ids');
 return saved ? JSON.parse(saved) : [];
 });

 // Connected Accounting & Invoice state definitions
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);

 const selectedClientInvoices = React.useMemo(() => {
 if (!selectedContact) return [];
 return invoices.filter(inv => {
  const matchesId = inv.clientId === selectedContact.id;
  const matchesEmail = inv.clientEmail?.toLowerCase() === selectedContact.email?.toLowerCase();
  const matchesName = inv.clientName?.toLowerCase().includes(selectedContact.name?.toLowerCase() || '');
  return matchesId || matchesEmail || matchesName;
 });
 }, [invoices, selectedContact]);

 const selectedClientTransactions = React.useMemo(() => {
 if (!selectedContact) return [];
 return transactions.filter(t => {
  if (t.clientId === selectedContact.id) return true;
  if (selectedClientInvoices.some(inv => inv.id === t.invoiceId)) return true;
  const descLower = t.description.toLowerCase();
  const containsName = descLower.includes(selectedContact.name.toLowerCase());
  const containsCompany = selectedContact.company ? descLower.includes(selectedContact.company.toLowerCase()) : false;
  return containsName || containsCompany;
 });
 }, [transactions, selectedContact, selectedClientInvoices]);

 const selectedPaymentSummary = React.useMemo(() => {
 const saleTransactions = selectedClientTransactions.filter(t => t.type === 'income');
 const paidTransactions = saleTransactions.filter(t => t.status === 'paid');
 const pendingTransactions = saleTransactions.filter(t => t.status === 'pending');
 const latestStripeTx = [...saleTransactions]
  .filter(t => t.stripeCheckoutUrl)
  .sort((a, b) => {
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
 };
 }, [selectedClientTransactions]);

 // Stripe Subscription States
 const [stripeAmount, setStripeAmount] = useState('50');
 const [stripeInterval, setStripeInterval] = useState<'month' | 'year' | 'once'>('month');
 const [stripeLoading, setStripeLoading] = useState(false);
 const [generatedCheckoutUrl, setGeneratedCheckoutUrl] = useState('');
 const [generatedCheckoutSessionId, setGeneratedCheckoutSessionId] = useState('');
 const [stripeCopied, setStripeCopied] = useState(false);
 const [stripeError, setStripeError] = useState('');
 const [stripeEmailInput, setStripeEmailInput] = useState('');
 const [stripeOverview, setStripeOverview] = useState<any>(null);
 const [stripeOverviewLoading, setStripeOverviewLoading] = useState(false);
 const [stripeOverviewError, setStripeOverviewError] = useState('');

 // Automatic Installments Generator States
 const [instTotalAmount, setInstTotalAmount] = useState('');
 const [instCount, setInstCount] = useState<2 | 3>(3);
 const [instConcept, setInstConcept] = useState('Servicios de Desarrollo y Consultoría');
 const [instLoading, setInstLoading] = useState(false);
 const [instError, setInstError] = useState('');
 const [instGeneratedUrl, setInstGeneratedUrl] = useState('');
 const [instCopied, setInstCopied] = useState(false);

 React.useEffect(() => {
 setGeneratedCheckoutUrl('');
 setGeneratedCheckoutSessionId('');
 setStripeCopied(false);
 setStripeError('');
 setStripeOverview(null);
 setStripeOverviewError('');
 setStripeEmailInput(selectedContact?.email || '');

 // Reset and dynamically set automatic installments generator states based on pending payments
 setInstError('');
 setInstGeneratedUrl('');
 setInstCopied(false);

 if (selectedContact) {
  const clientInvoices = invoices.filter(inv => {
  const matchesId = inv.clientId === selectedContact.id;
  const matchesEmail = inv.clientEmail?.toLowerCase() === selectedContact.email?.toLowerCase();
  const matchesName = inv.clientName?.toLowerCase().includes(selectedContact.name?.toLowerCase() || '');
  return matchesId || matchesEmail || matchesName;
  });

  const clientTransactions = transactions.filter(t => {
  if (t.clientId === selectedContact.id) return true;
  const invoiceMatches = clientInvoices.some(inv => inv.id === t.invoiceId);
  if (invoiceMatches) return true;
  const containsName = t.description.toLowerCase().includes(selectedContact.name.toLowerCase());
  const containsCompany = selectedContact.company ? t.description.toLowerCase().includes(selectedContact.company.toLowerCase()) : false;
  return containsName || containsCompany;
  });

  const pendingTxs = clientTransactions.filter(t => t.status === 'pending');
  if (pendingTxs.length > 0) {
  const pendingSum = pendingTxs.reduce((sum, t) => sum + t.amount, 0);
  setInstTotalAmount(pendingSum.toFixed(2));
  setInstCount(pendingTxs.length === 2 ? 2 : 3);
  const cleanDesc = pendingTxs[0].description.split(' - ')[0].split(' (')[0];
  setInstConcept(cleanDesc || 'Servicios de Desarrollo y Consultoría');
  } else {
  setInstTotalAmount('');
  setInstCount(3);
  setInstConcept('Servicios de Desarrollo y Consultoría');
  }
 } else {
  setInstTotalAmount('');
  setInstCount(3);
  setInstConcept('Servicios de Desarrollo y Consultoría');
 }
 }, [selectedContactId, selectedContact, transactions, invoices]);

 const handleLoadStripeOverview = async () => {
 if (!selectedContact) return;
 setStripeOverviewLoading(true);
 setStripeOverviewError('');
 try {
  const response = await fetch('/api/stripe/customer-overview', {
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
 const [activeTxStripeUrl, setActiveTxStripeUrl] = useState<{[txId: string]: string}>({});
 const [txStripeLoading, setTxStripeLoading] = useState<{[txId: string]: boolean}>({});

 const handleGenerateStripeForTx = async (tx: FinanceTransaction) => {
 setTxStripeLoading(prev => ({ ...prev, [tx.id]: true }));
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
   interval: 'once', // Installments are one-off payments
   pendingTxId: tx.id,
   stripePlanId: tx.stripePlanId,
   installmentIndex: tx.stripeInstallmentIndex,
   installments: tx.stripeInstallmentCount?.toString() || '',
   concept: tx.description,
  }),
  });

  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'Error Stripe');
  }
  const updatedTx = { ...tx, stripeCheckoutUrl: data.url, stripeCheckoutSessionId: data.sessionId };
  await db.updateFinanceTransaction(updatedTx);
  setTransactions(prev => prev.map(item => item.id === tx.id ? updatedTx : item));
  setActiveTxStripeUrl(prev => ({ ...prev, [tx.id]: data.url }));
 } catch (err) {
  console.error("Stripe error, using fallback simulated URL", err);
  const simulatedUrl = `${window.location.origin}?stripe_status=success&client_id=${selectedContact?.id || 'c2'}&amount=${tx.amount}&interval=once&pending_tx_id=${tx.id}&stripe_plan_id=${tx.stripePlanId || ''}&installment_index=${tx.stripeInstallmentIndex || ''}&installments=${tx.stripeInstallmentCount || ''}&concept=${encodeURIComponent(tx.description)}&stripe_session_id=cs_test_mock_${tx.id}&simulated=true`;
  const updatedTx = { ...tx, stripeCheckoutUrl: simulatedUrl, stripeCheckoutSessionId: `cs_test_mock_${tx.id}` };
  try {
  await db.updateFinanceTransaction(updatedTx);
  setTransactions(prev => prev.map(item => item.id === tx.id ? updatedTx : item));
  } catch (saveErr) {
  console.error("Could not persist simulated Stripe URL", saveErr);
  }
  setActiveTxStripeUrl(prev => ({ ...prev, [tx.id]: simulatedUrl }));
 } finally {
  setTxStripeLoading(prev => ({ ...prev, [tx.id]: false }));
 }
 };

 // Lead -> Client with Sale conversion states
 const [convertingLead, setConvertingLead] = useState<ClientContact | null>(null);
 const [convSalePrice, setConvSalePrice] = useState(1500);
 const [convInstallments, setConvInstallments] = useState(1);
 const [convPaymentMethod, setConvPaymentMethod] = useState<'cash' | 'transfer' | 'stripe'>('transfer');
 const [convConcept, setConvConcept] = useState('Servicio de Consultoría Althera');
 const [convSelectedComercialId, setConvSelectedComercialId] = useState('');

 // Handle lead to client conversion
 const handleConfirmConvertToClient = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!convertingLead) return;

 // 1. Get chosen commercial
 const matchedCom = (comercialesList || []).find(c => c.id === convSelectedComercialId);
 const assignedEmail = matchedCom ? matchedCom.email : '';
 const commPct = matchedCom?.commissionPercentage ?? 10;

 // 2. Generate the Invoice (Factura) and Transactions (Cobros)
 const invoiceId = 'inv_crm_' + Math.random().toString(36).substring(2, 9);
 const stripePlanId = 'plan_crm_' + Math.random().toString(36).substring(2, 9);
 const pricePerInstallment = Math.round((convSalePrice / convInstallments) * 100) / 100;
 const todayKey = new Date().toISOString().split('T')[0];
 const safeClientEmail = convertingLead.email?.trim() || `${convertingLead.id}@clientes.althera.local`;
 
 // Create Invoice Items
 const invoiceItems: any[] = [];
 const createdTransactions: FinanceTransaction[] = [];
  const firstInstallmentDate = new Date();
  firstInstallmentDate.setHours(0, 0, 0, 0);
 for (let i = 1; i <= convInstallments; i++) {
  const txId = 'tx_crm_' + Math.random().toString(36).substring(2, 9) + '_' + i;
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
  subtotal: convSalePrice,
  taxPercentage: 0,
  taxAmount: 0,
  total: convSalePrice,
  notes: `Venta inicial generada desde CRM. Comercial: ${matchedCom ? matchedCom.name : 'Sin asignar'}. Comisión: ${commPct}%.`,
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
   value: convSalePrice,
   comercialId: matchedCom.id,
   comercialName: matchedCom.name,
   notes: `${existingLead.notes || ''}\n[SOURCE_CONTACT_ID:${convertingLead.id}]`.trim()
   };
   await db.updateComercialLead(updatedLead);
  } else {
   const newLead: ComercialLead = {
   id: 'lead_' + Math.random().toString(36).substring(2, 9),
   comercialId: matchedCom.id,
   comercialName: matchedCom.name,
   name: convertingLead.name,
   company: convertingLead.company || 'Empresa',
   email: convertingLead.email || '',
   phone: convertingLead.phone || '',
   status: 'Ganado',
   value: convSalePrice,
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
 }

 // 3. Update the CRM contact status to 'Client'
 const updatedContact: ClientContact = {
  ...convertingLead,
  status: 'Client',
  assignedUserEmail: assignedEmail || convertingLead.assignedUserEmail,
  contactedByComercialEmail: assignedEmail || convertingLead.contactedByComercialEmail,
  contactedByComercialName: matchedCom ? matchedCom.name : convertingLead.contactedByComercialName,
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

 // Show beautiful toast / alert
 alert(`?Felicidades! Se ha convertido a "${convertingLead.name}" en Cliente.\n\n` +
   ` Venta Registrada: ${convSalePrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\n` +
   ` Forma de pago: ${convPaymentMethod === 'stripe' ? 'Stripe' : convPaymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}\n` +
   ` Cuotas: ${convInstallments} cuota(s)\n` +
   (generatedStripeUrl ? ` Link Stripe: ${generatedStripeUrl}\n` : '') +
   ` Comercial: ${matchedCom ? matchedCom.name : 'Sin asignar'}\n` +
   ` Comisión para el Comercial (${commPct}%): ${(convSalePrice * commPct / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\n` +
   ` Se han generado las Facturas e Ingresos correspondientes.`);
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
  for (let index = 0; index < paymentInstallments; index++) {
   const dueDate = new Date(`${paymentDate}T12:00:00`);
   dueDate.setMonth(dueDate.getMonth() + index);
   await db.insertFinanceTransaction({
   ...newTx,
   id: `${txId}_${index + 1}`,
   amount: index === paymentInstallments - 1 ? Math.round((amt - installmentAmount * index) * 100) / 100 : installmentAmount,
   date: dueDate.toISOString().split('T')[0],
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
    id: 'lead_' + Math.random().toString(36).substring(2, 9),
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
   .filter(inv => {
    const matchesId = inv.clientId === selectedContact.id;
    const matchesEmail = inv.clientEmail?.toLowerCase() === selectedContact.email?.toLowerCase();
    return (matchesId || matchesEmail) && inv.status !== 'paid';
   })
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
   <h1 class="company-title">Ignacio Martin Gonzalez</h1>
   <div class="company-sub">
   Desarrollo de Software & Consultoría Tecnológica<br>
   NIF/CIF: ES45339281Z<br>
   Ibiza, España
   </div>
  </td>
  <td class="invoice-title-block">
   <div class="invoice-label">FACTURA</div>
   <div class="invoice-number">${inv.id}</div>
   <div class="invoice-dates">
   Fecha: ${inv.date}<br>
   Vence: ${inv.dueDate}
   </div>
   <div class="status-badge ${inv.status === 'paid' ? 'status-paid' : 'status-pending'}">
   ${inv.status === 'paid' ? 'PAGADA' : 'PENDIENTE'}
   </div>
  </td>
  </tr>
 </table>

 <div class="stakeholders">
  <div class="stakeholder-column">
  <div class="stakeholder-box">
   <div class="box-title">EMISOR</div>
   <div class="box-name">Ignacio Martin Gonzalez</div>
   <div class="box-detail">
   NIF: ES45339281Z<br>
   Email: mgnacho96@gmail.com<br>
   Dirección: Ibiza, Islas Baleares, España
   </div>
  </div>
  </div>
  <div class="stakeholder-column">
  <div class="stakeholder-box recipient">
   <div class="box-title">CLIENTE</div>
   <div class="box-name">${inv.clientName}</div>
   <div class="box-detail">
   Email: ${inv.clientEmail}<br>
   ID: ${inv.clientId || 'N/A'}<br>
   Dirección: España / Internacional
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
   <td>${item.description}</td>
   <td class="qty">${item.quantity}</td>
   <td class="price">${Number(item.unitPrice).toFixed(2)} ?</td>
   <td class="total">${Number(item.total).toFixed(2)} ?</td>
   </tr>
  `).join('')}
  </tbody>
 </table>

 <div class="totals-block">
  <table class="totals-table">
  <tr>
   <td>Subtotal:</td>
   <td class="value">${Number(inv.subtotal).toFixed(2)} ?</td>
  </tr>
  <tr>
   <td>I.V.A. (${inv.taxPercentage}%):</td>
   <td class="value">${Number(inv.taxAmount).toFixed(2)} ?</td>
  </tr>
  <tr class="grand-total">
   <td>Total Factura:</td>
   <td class="value">${Number(inv.total).toFixed(2)} ?</td>
  </tr>
  </table>
 </div>
 
 <div class="clear"></div>

 <div class="bank-box">
  <div class="bank-title">Datos de Pago de Facturación</div>
  <div class="bank-grid">
  <div>
   <span class="bank-item-title">Beneficiario:</span><br>
   <span class="bank-item-val">Ignacio Martin Gonzalez</span>
  </div>
  <div>
   <span class="bank-item-title">IBAN / Cuenta:</span><br>
   <span class="bank-item-val">IE84 REVO 9903 6065 8046 06</span>
  </div>
  <div>
   <span class="bank-item-title">Banco:</span><br>
   <span class="bank-item-val">Revolut Bank UAB</span>
  </div>
  <div>
   <span class="bank-item-title">Código SWIFT/BIC:</span><br>
   <span class="bank-item-val">REVOIE23</span>
  </div>
  </div>
 </div>

 <div class="footer">
  ¡Gracias por tu confianza y colaboración!<br>
  Esta factura se rige bajo los términos acordados. Ante cualquier duda, escríbeme a mgnacho96@gmail.com
 </div>
 </div>
</body>
</html>`;

 // Trigger file download
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
  toast.innerText = `Descargada factura ${inv.id} correctamente.`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3500);
 }
 };

 const handleCreateStripeCheckout = async (contact: ClientContact) => {
 const targetEmail = stripeEmailInput.trim();
 if (!targetEmail) {
  setStripeError('El cliente debe tener un email registrado para configurar Stripe.');
  return;
 }
 setStripeLoading(true);
 setStripeError('');
 try {
  // If the email is missing or has changed, update the contact in Supabase/db
  if (contact.email !== targetEmail) {
  if (onUpdateContact) {
   onUpdateContact({
   ...contact,
   email: targetEmail
   });
  }
  }

  const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json',
  },
  body: JSON.stringify({
   clientId: contact.id,
   clientName: contact.name,
   clientEmail: targetEmail,
   amount: stripeAmount,
   interval: stripeInterval,
  }),
  });

  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'Error al generar la sesión de Stripe');
  }

  setGeneratedCheckoutUrl(data.url);
  setGeneratedCheckoutSessionId(data.sessionId);
 } catch (err: any) {
  console.error(err);
  const simulatedSessionId = `cs_test_mock_direct_${contact.id}_${Date.now()}`;
  const simulatedUrl = `${window.location.origin}?stripe_status=success&client_id=${contact.id}&amount=${stripeAmount}&interval=${stripeInterval}&stripe_session_id=${simulatedSessionId}&simulated=true`;
  setGeneratedCheckoutUrl(simulatedUrl);
  setGeneratedCheckoutSessionId(simulatedSessionId);
  setStripeError('Backend Stripe no disponible: se ha generado un enlace simulado para pruebas.');
 } finally {
  setStripeLoading(false);
 }
 };

 const handleCreateInstallmentStripeCheckout = async (contact: ClientContact) => {
 const targetEmail = contact.email || stripeEmailInput.trim();
 if (!targetEmail) {
  setInstError('El cliente debe tener un email registrado para configurar Stripe.');
  return;
 }
 
 const total = parseFloat(instTotalAmount);
 if (isNaN(total) || total <= 0) {
  setInstError('El monto total debe ser un número positivo.');
  return;
 }

 setInstLoading(true);
 setInstError('');
 let txForCheckout: FinanceTransaction | null = null;
 try {
  const clientInvoices = invoices.filter(inv => {
  const matchesId = inv.clientId === contact.id;
  const matchesEmail = inv.clientEmail?.toLowerCase() === contact.email?.toLowerCase();
  const matchesName = inv.clientName?.toLowerCase().includes(contact.name?.toLowerCase() || '');
  return matchesId || matchesEmail || matchesName;
  });

  const pendingTxs = transactions
  .filter(t => {
   if (t.type !== 'income' || t.status !== 'pending') return false;
   if (t.clientId === contact.id) return true;
   if (clientInvoices.some(inv => inv.id === t.invoiceId)) return true;
   const descLower = t.description.toLowerCase();
   const containsName = descLower.includes(contact.name.toLowerCase());
   const containsCompany = contact.company ? descLower.includes(contact.company.toLowerCase()) : false;
   return containsName || containsCompany;
  })
  .sort((a, b) => {
   const byInstallment = (a.stripeInstallmentIndex || 999) - (b.stripeInstallmentIndex || 999);
   if (byInstallment !== 0) return byInstallment;
   return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  txForCheckout = pendingTxs[0] || null;
  if (!txForCheckout) {
  setInstError('No hay plazos pendientes para este cliente. Crea primero la venta con sus plazos.');
  return;
  }

  const installmentAmount = txForCheckout.amount.toFixed(2);
  const formattedConcept = txForCheckout.description || `${instConcept} - Plazo ${txForCheckout.stripeInstallmentIndex || 1} de ${txForCheckout.stripeInstallmentCount || instCount}`;

  const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json',
  },
  body: JSON.stringify({
   clientId: contact.id,
   clientName: contact.name,
   clientEmail: targetEmail,
   amount: installmentAmount,
   interval: 'month',
   installments: (txForCheckout.stripeInstallmentCount || instCount).toString(),
   concept: formattedConcept,
   pendingTxId: txForCheckout.id,
   stripePlanId: txForCheckout.stripePlanId,
   installmentIndex: txForCheckout.stripeInstallmentIndex,
  }),
  });

  const data = await readStripeJson(response);
  if (!response.ok) {
  throw new Error(data.error || 'Error al generar el plan de plazos');
  }

  const updatedTx = { ...txForCheckout, stripeCheckoutUrl: data.url, stripeCheckoutSessionId: data.sessionId };
  await db.updateFinanceTransaction(updatedTx);
  setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
  setInstGeneratedUrl(data.url);
 } catch (err: any) {
  console.error(err);
  if (!txForCheckout) {
  setInstError(err?.message || 'No se pudo localizar un plazo pendiente para generar el enlace.');
  return;
  }
  // Fallback simulated link if Stripe is not fully set up
  const installmentAmount = txForCheckout.amount.toFixed(2);
  const formattedConcept = txForCheckout.description || `${instConcept} - Plazo ${txForCheckout.stripeInstallmentIndex || 1} de ${txForCheckout.stripeInstallmentCount || instCount}`;
  const simulatedUrl = `${window.location.origin}?stripe_status=success&client_id=${contact.id}&amount=${installmentAmount}&interval=month&pending_tx_id=${txForCheckout.id}&stripe_plan_id=${txForCheckout.stripePlanId || ''}&installment_index=${txForCheckout.stripeInstallmentIndex || ''}&installments=${txForCheckout.stripeInstallmentCount || instCount}&concept=${encodeURIComponent(formattedConcept)}&stripe_session_id=cs_test_mock_inst_${txForCheckout.id}_${Date.now()}&simulated=true`;
  
  const updatedTx = { ...txForCheckout, stripeCheckoutUrl: simulatedUrl, stripeCheckoutSessionId: `cs_test_mock_inst_${txForCheckout.id}` };
  try {
  await db.updateFinanceTransaction(updatedTx);
  setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
  } catch (saveErr) {
  console.error('Could not persist fallback installment link', saveErr);
  }
  setInstGeneratedUrl(simulatedUrl);
 } finally {
  setInstLoading(false);
 }
 };

 const handleOpenStripePortal = async (stripeCustomerId: string) => {
 setStripeLoading(true);
 setStripeError('');
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
  setStripeError(err?.message || 'No se pudo abrir el portal de facturación.');
 } finally {
  setStripeLoading(false);
 }
 };

 // Drag and drop states for Kanban layout
 const [draggedContactId, setDraggedContactId] = useState<string | null>(null);
 const [draggedOverCol, setDraggedOverCol] = useState<'lead' | 'client' | 'archived' | null>(null);

 const handleDropContact = (contactId: string, targetCol: 'lead' | 'client' | 'archived') => {
 if (!contactId) return;
 const contact = contacts.find(c => c.id === contactId);
 if (!contact) return;

 if (targetCol === 'client' && contact.status === 'Lead') {
  setConvertingLead(contact);
  setConvSalePrice(1500);
  setConvInstallments(1);
  setConvPaymentMethod('transfer');
  setConvConcept('Servicio de Consultoría Althera');
  setConvSelectedComercialId(comercialesList[0]?.id || '');
  setDraggedContactId(null);
  setDraggedOverCol(null);
  return;
 }

 let updatedContact = { ...contact };
 let newArchivedIds = [...archivedContactIds];

 if (targetCol === 'lead') {
  updatedContact.status = 'Lead';
  newArchivedIds = newArchivedIds.filter(id => id !== contactId);
 } else if (targetCol === 'client') {
  updatedContact.status = 'Client';
  newArchivedIds = newArchivedIds.filter(id => id !== contactId);
 } else if (targetCol === 'archived') {
  if (!newArchivedIds.includes(contactId)) {
  newArchivedIds.push(contactId);
  }
 }

 setArchivedContactIds(newArchivedIds);
 sessionStorage.setItem('archived_contacts_ids', JSON.stringify(newArchivedIds));

 if (onUpdateContact) {
  onUpdateContact(updatedContact);
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
    alt={contact.name}
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
    <h4 className="font-bold text-[12px] text-white truncate tracking-tight">{contact.name}</h4>
    {contact.priority && (
    <span className="text-[10px] text-amber-400 select-none">★</span>
    )}
   </div>
   
   <p className="text-[10px] text-slate-400 truncate mt-0.5">{contact.company} <span className="text-slate-500 font-mono text-[9px]">{contact.role || 'Partner'}</span></p>
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

  <div className="mt-2.5 pt-2 border-t border-white/[0.03] flex justify-between items-center text-[8.5px] font-mono text-slate-500">
   <span>Contacto: {contact.lastContacted || 'N/A'}</span>
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

 const toggleArchiveContact = (id: string) => {
 const isCurrentlyArchived = archivedContactIds.includes(id);
 const updated = isCurrentlyArchived ?
  archivedContactIds.filter(item => item !== id)
  : [...archivedContactIds, id];
 setArchivedContactIds(updated);
 sessionStorage.setItem('archived_contacts_ids', JSON.stringify(updated));

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

 const handleAddSubmit = (e: React.FormEvent) => {
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
  onUpdateContact(updatedContact);
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

  onAddContact(generatedContact);
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

  {/* Detailed Side Panel Bio Inspector */}
  <aside className="w-full xl:w-[420px] 2xl:w-[440px] shrink-0 flex flex-col gap-5 min-h-[560px] xl:min-h-0">
  {selectedContact ? (
   <div className="bg-gradient-to-b from-white/[0.065] to-white/[0.025] backdrop-blur-xl rounded-[28px] overflow-hidden flex flex-col h-full border border-white/[0.09] shadow-[0_24px_70px_rgba(0,0,0,.28)]">
   
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
   <div className="px-6 -mt-10 relative z-10 flex flex-col gap-5 pb-6 overflow-y-auto flex-1 scrollbar-thin">
    
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
     <h3 className="text-lg font-bold text-white tracking-tight">{selectedContact.name}</h3>
     <p className="text-xs text-slate-400">{selectedContact.role || 'Partner'} @ {selectedContact.company}</p>
     
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
     <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#7e7e8e]">Mensualidad Stripe</span>
    </div>

    {(() => {
     const visibleCheckoutUrl = generatedCheckoutUrl || instGeneratedUrl || selectedPaymentSummary.checkoutUrl;
     const stripeDashboardUrl = getStripeDashboardUrl(selectedPaymentSummary.checkoutSessionId, selectedPaymentSummary.stripeInvoiceId);
     const hasPaymentInfo = selectedPaymentSummary.totalCount > 0;
     const isSubscribedOrLinked = selectedContact.stripeSubscriptionStatus === 'active' || !!visibleCheckoutUrl || selectedPaymentSummary.paidCount > 0;

     return (
     <div className="bg-slate-950/45 p-3 rounded-xl border border-white/5 space-y-2">
      <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-slate-400">Estado:</span>
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${
       isSubscribedOrLinked ?
        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        : 'bg-slate-855 text-slate-400 border-slate-700'
      }`}>
       {selectedContact.stripeSubscriptionStatus === 'active' ?
       'Activo'
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
       <span className="block text-[11px] font-black text-slate-200">{selectedPaymentSummary.total.toFixed(2)} ?</span>
       </div>
       <div className="bg-black/20 rounded-lg p-2 border border-emerald-500/10">
       <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-mono">Pagado</span>
       <span className="block text-[11px] font-black text-emerald-400">{selectedPaymentSummary.paid.toFixed(2)} ?</span>
       </div>
       <div className="bg-black/20 rounded-lg p-2 border border-amber-500/10">
       <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-mono">Pendiente</span>
       <span className="block text-[11px] font-black text-amber-400">{selectedPaymentSummary.pending.toFixed(2)} ?</span>
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
       <span className="block text-[8px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
       Link de pago guardado
       </span>
       <div className="flex gap-1.5">
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
       </div>
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
      onClick={handleLoadStripeOverview}
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
        <span className="block text-[10px] font-black text-emerald-400">{(stripeOverview.totals?.paidInvoices || 0).toFixed(2)} ?</span>
       </div>
       <div className="bg-black/20 rounded-lg p-2 border border-amber-500/10">
        <span className="block text-[7px] uppercase tracking-widest text-slate-500 font-mono">Abierto</span>
        <span className="block text-[10px] font-black text-amber-400">{(stripeOverview.totals?.openInvoices || 0).toFixed(2)} ?</span>
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
        <span>{sub.amount !== null ? `${sub.amount.toFixed(2)} ? / ${sub.interval || 'periodo'}` : 'Importe no disponible'}</span>
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

    {selectedContact.stripeSubscriptionStatus === 'active' ? (
     <div className="space-y-3">
     <div className="bg-slate-950/45 p-3 rounded-xl border border-white/5 space-y-1.5">
      <div className="flex justify-between text-xs">
      <span className="text-slate-500 text-[10px]">Cuota mensual:</span>
      <span className="font-extrabold text-slate-200">{selectedContact.stripeSubscriptionPrice || '0'} ?</span>
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
    ) : (
     <div className="space-y-3">
     <p className="text-[10px] text-slate-400 leading-normal">
      Configura un plan recurrente para cobrar automáticamente desde la tarjeta/cuenta del cliente.
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

     <div className="grid grid-cols-2 gap-2">
      <div>
      <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1">Importe (?)</label>
      <input
       type="number"
       value={stripeAmount}
       onChange={(e) => setStripeAmount(e.target.value)}
       className="w-full bg-[#07070b] border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition"
       placeholder="50"
      />
      </div>
      <div>
      <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1">Frecuencia</label>
      <select
       value={stripeInterval}
       onChange={(e) => setStripeInterval(e.target.value as any)}
       className="w-full bg-[#07070b] border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none transition"
      >
       <option value="month">Mensual</option>
       <option value="year">Anual</option>
       <option value="once">Pago único</option>
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
      </div>
     )}
     </div>
    )}
    </div>

    {/* Financiación / Generación de Enlace de Plazos (Cobro Automático) */}
    <div className="bg-[#030305] p-4 rounded-2xl border border-white/5 space-y-3.5 text-left w-full shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
    <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
     <CreditCard className="w-4 h-4 text-emerald-400" />
     <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#7e7e8e]">Cobro en Plazos (Stripe Automático)</span>
    </div>

    <div className="space-y-3">
     <p className="text-[10px] text-slate-400 leading-normal">
     Configura un pago financiado en 2 o 3 plazos automáticos. El cliente pagará la primera cuota hoy y los pagos restantes se cobrarán de su tarjeta automáticamente cada mes.
     </p>

     <div>
     <label className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1">
      Monto Pendiente para Generar Link (EUR)
     </label>
     <input
      type="number"
      value={instTotalAmount}
      onChange={(e) => {
      setInstTotalAmount(e.target.value);
      setInstGeneratedUrl('');
      }}
      className="w-full bg-[#07070b] border border-white/5 hover:border-white/10 focus:border-violet-500/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none transition"
      placeholder="Sin pagos pendientes"
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
    const clientInvoices = invoices.filter(inv => {
     const matchesId = inv.clientId === selectedContact.id;
     const matchesEmail = inv.clientEmail?.toLowerCase() === selectedContact.email?.toLowerCase();
     const matchesName = inv.clientName?.toLowerCase().includes(selectedContact.name?.toLowerCase() || '');
     return matchesId || matchesEmail || matchesName;
    });

    const clientTransactions = transactions.filter(t => {
     if (t.clientId === selectedContact.id) return true;
     const invoiceMatches = clientInvoices.some(inv => inv.id === t.invoiceId);
     if (invoiceMatches) return true;
     const containsName = t.description.toLowerCase().includes(selectedContact.name.toLowerCase());
     const containsCompany = selectedContact.company ? t.description.toLowerCase().includes(selectedContact.company.toLowerCase()) : false;
     return containsName || containsCompany;
    });

    const totalPaidFromInvoices = clientInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
    const totalPendingFromInvoices = clientInvoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.total, 0);
    const totalInvoicedFromInvoices = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);

    const totalPaidFromTxs = clientTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const totalPendingFromTxs = clientTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);

    const totalPaid = clientInvoices.length > 0 ? totalPaidFromInvoices : totalPaidFromTxs;
    const totalPending = clientInvoices.length > 0 ? totalPendingFromInvoices : totalPendingFromTxs;
    const totalInvoiced = clientInvoices.length > 0 ? totalInvoicedFromInvoices : (totalPaid + totalPending);

    return (
     <div className="space-y-3.5 border-b border-white/5 pb-5">
     <div className="flex justify-between items-center">
      <h4 className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-extrabold flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>Contabilidad y Facturas</span>
      </h4>
      <button
      onClick={() => {
       sessionStorage.setItem('preselected_client_for_invoice', JSON.stringify({
       id: selectedContact.id,
       name: selectedContact.name,
       email: selectedContact.email
       }));
       if (onNavigate) {
       onNavigate('finanzas', 'push');
       }
      }}
      className="text-[9px] font-mono text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded transition-all cursor-pointer"
      >
      + Nueva Factura
      </button>
     </div>

     <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl border border-white/5 shadow-inner">
      <div className="text-center p-1.5 rounded-lg bg-white/2">
      <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">Facturado</span>
      <span className="text-xs font-mono font-extrabold text-slate-200 block mt-0.5">
       {totalInvoiced.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ?
      </span>
      </div>
      <div className="text-center p-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/5">
      <span className="block text-[8px] font-mono text-emerald-500 uppercase tracking-wider">Cobrado</span>
      <span className="text-xs font-mono font-extrabold text-emerald-400 block mt-0.5">
       {totalPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ?
      </span>
      </div>
      <div className="text-center p-1.5 rounded-lg bg-amber-500/5 border border-amber-500/5">
      <span className="block text-[8px] font-mono text-amber-500 uppercase tracking-wider">Pendiente</span>
      <span className="text-xs font-mono font-extrabold text-amber-400 block mt-0.5">
       {totalPending.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ?
      </span>
      </div>
     </div>

     <div className="space-y-2">
      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide block">Facturas emitidas ({clientInvoices.length})</span>
      {clientInvoices.length === 0 ? (
      <div className="bg-[#030305] p-3.5 rounded-xl border border-white/5 text-center">
       <p className="text-[10px] text-slate-500 font-sans">No hay facturas emitidas para este cliente.</p>
      </div>
      ) : (
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
       {clientInvoices.map(inv => (
       <div key={inv.id} className="bg-[#030305] p-2.5 rounded-xl border border-white/5 flex justify-between items-center hover:border-white/10 transition-colors">
        <div className="space-y-0.5">
        <div className="flex items-center gap-2">
         <span className="text-[10px] font-mono font-bold text-slate-200">{inv.id}</span>
         <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-semibold ${
         inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
         }`}>
         {inv.status === 'paid' ? 'COBRADA' : 'PENDIENTE'}
         </span>
        </div>
        <div className="text-[9px] font-mono text-slate-500">
         Emisión: {inv.date} | Vence: {inv.dueDate}
        </div>
        </div>
        <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono font-bold text-slate-100 pr-1">{inv.total.toFixed(2)} ?</span>
        
        {inv.status !== 'paid' && (
         <button
         onClick={() => handleMarkInvoicePaid(inv)}
         title="Marcar como cobrada"
         className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
         >
         <Check className="w-3.5 h-3.5" />
         </button>
        )}

        <button
         onClick={() => handleDownloadInvoiceHtml(inv)}
         title="Imprimir / Descargar Factura"
         className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg border border-white/5 transition-all cursor-pointer"
        >
         <Download className="w-3.5 h-3.5" />
        </button>
        </div>
       </div>
       ))}
      </div>
      )}
     </div>

     <div className="space-y-2 pt-1">
      <div className="flex justify-between items-center">
      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide block">Historial de Cobros ({clientTransactions.length})</span>
      <button
       onClick={() => {
       setPaymentAmount('');
       setPaymentMethod('transfer');
       setPaymentDate(new Date().toISOString().split('T')[0]);
       setPaymentDesc(`Cobro Cliente: ${selectedContact.name}`);
       setShowAddPaymentModal(true);
       }}
       className="text-[8px] font-mono text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
      >
       <Plus className="w-2.5 h-2.5" /> Registrar Cobro
      </button>
      </div>

      {clientTransactions.length === 0 ? (
      <div className="bg-[#030305] p-3.5 rounded-xl border border-white/5 text-center">
       <p className="text-[10px] text-slate-500 font-sans">No hay cobros registrados para este cliente.</p>
      </div>
      ) : (
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
       {clientTransactions.map(tx => {
       const isPending = tx.status === 'pending' || tx.description.toLowerCase().includes('pendiente');
       const stripeUrl = tx.stripeCheckoutUrl || activeTxStripeUrl[tx.id];
       const stripeDashboardUrl = getStripeDashboardUrl(tx.stripeCheckoutSessionId, tx.stripeInvoiceId);
       const isLoading = txStripeLoading[tx.id];

       return (
        <div key={tx.id} className="bg-slate-950/30 p-3 rounded-xl border border-white/5 flex flex-col gap-2 hover:bg-slate-950/55 transition-all">
        <div className="flex justify-between items-center gap-2">
         <div className="space-y-0.5 max-w-[70%]">
         <p className="text-[10px] text-slate-200 truncate font-semibold flex items-center gap-1.5">
          {tx.description}
          {isPending && (
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[7px] font-extrabold uppercase px-1.5 rounded font-mono">Plazo Pendiente</span>
          )}
         </p>
         <div className="flex items-center gap-2 text-[8px] font-mono text-slate-500">
          <span>Vence: <strong className="text-slate-400">{tx.date}</strong></span>
          <span className="uppercase">{tx.paymentMethod || 'transfer'}</span>
          {tx.invoiceId && (
          <span className="text-emerald-500/80 font-semibold">Factura: {tx.invoiceId}</span>
          )}
         </div>
         </div>

         <div className="flex items-center gap-1.5 shrink-0">
         {/* Amount */}
         <span className={`text-[11px] font-mono font-black ${isPending ? 'text-amber-400' : 'text-emerald-400'}`}>
          {isPending ? '' : '+'}{tx.amount.toFixed(2)} ?
         </span>

         {/* Stripe Button for Pending Installment */}
         {isPending && (
          <button
          type="button"
          disabled={isLoading}
          onClick={() => handleGenerateStripeForTx(tx)}
          className="p-1 bg-violet-600/15 hover:bg-violet-600/30 text-violet-400 border border-violet-500/25 rounded-lg transition-all cursor-pointer flex items-center justify-center"
          title={tx.stripeCheckoutUrl ? 'Regenerar enlace de Stripe para este plazo' : 'Generar enlace de cobro por Stripe para este plazo'}
          >
          {isLoading ? (
           <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
          ) : (
           <CreditCard className="w-3.5 h-3.5 text-violet-400" />
          )}
          </button>
         )}

         {/* Delete Button */}
         {stripeDashboardUrl && (
          <a
          href={stripeDashboardUrl}
          target="_blank"
          rel="noreferrer"
          className="p-1 hover:bg-indigo-500/10 hover:border-indigo-500/20 text-indigo-400 border border-transparent rounded-lg transition-all cursor-pointer"
          title="Ver pago en Stripe"
          >
          <ExternalLink className="w-3.5 h-3.5" />
          </a>
         )}

         <button
          type="button"
          onClick={() => handleDeleteTransaction(tx.id)}
          className="p-1 hover:bg-rose-500/10 hover:border-rose-500/20 text-slate-500 hover:text-rose-400 border border-transparent rounded-lg transition-all cursor-pointer"
          title="Eliminar cobro"
         >
          <Trash2 className="w-3.5 h-3.5" />
         </button>
         </div>
        </div>

        {/* Generated Stripe Link box */}
        {stripeUrl && (
         <div className="bg-[#05050a] border border-violet-500/20 rounded-lg p-2 flex flex-col gap-1.5 text-left transition-all animate-fadeIn">
         <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase">Enlace Stripe Listo!</span>
          <span className="text-[7px] font-mono text-slate-500">Auto-cobro para el vencimiento</span>
         </div>
         <div className="flex items-center gap-1">
          <input
          type="text"
          readOnly
          value={stripeUrl}
          className="bg-[#030305] border border-white/5 text-[9px] text-slate-350 px-2 py-1 rounded focus:outline-none flex-1 font-mono truncate"
          />
          <button
          type="button"
          onClick={() => {
           navigator.clipboard.writeText(stripeUrl);
           const toast = document.getElementById('toast-msg');
           if (toast) {
           toast.innerText = `Éxito: Enlace Stripe copiado al portapapeles!`;
           toast.classList.remove('opacity-0');
           setTimeout(() => toast.classList.add('opacity-0'), 3000);
           }
          }}
          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[9px] text-white font-bold rounded border border-white/5 transition cursor-pointer"
          >
          Copiar
          </button>
          <a
          href={stripeUrl}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-[9px] text-white font-bold rounded transition text-center"
          >
          Pagar
          </a>
         </div>
         </div>
        )}
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
  ) : (
   <div className="flex-1 flex items-center justify-center text-center p-4">
   <p className="text-slate-500 text-xs italic">
    Please select a client contact from the relationship grid to view analytical logs.
   </p>
   </div>
  )}
  </aside>

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
  {showAddModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
   <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm" onClick={() => { resetFormFields(); setShowAddModal(false); }} />
   <div className="relative bg-[#1e293b]/90 backdrop-blur-3xl border border-white/15 rounded-3xl p-6 shadow-2xl shadow-black/50 max-w-md w-full animate-in zoom-in-95 duration-200 text-slate-300">
   
   <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-2">
    <h3 className="text-lg font-bold text-white flex items-center gap-2">
    <UserPlus className="w-5 h-5 text-blue-400" />
    <span>{editingContact ? `Editando contacto: ${editingContact.name}` : 'Crear Nuevo Contacto'}</span>
    </h3>
    <button onClick={() => { resetFormFields(); setShowAddModal(false); }} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5">
    <X className="w-5 h-5" />
    </button>
   </div>

   <form onSubmit={handleAddSubmit} className="space-y-4">
    
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

    <div className="pt-4 flex gap-4">
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
  </div>
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
    <span className="text-xs font-semibold text-slate-200">{selectedContact.name}</span>
    {selectedContact.company && (
     <span className="text-[10px] text-slate-400 block font-sans">{selectedContact.company}</span>
    )}
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
     .filter(inv => {
      const matchesId = inv.clientId === selectedContact.id;
      const matchesEmail = inv.clientEmail?.toLowerCase() === selectedContact.email?.toLowerCase();
      const matchesName = inv.clientName?.toLowerCase().includes(selectedContact.name?.toLowerCase() || '');
      return (matchesId || matchesEmail || matchesName) && inv.status !== 'paid';
     })
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
  {convertingLead && (
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
     <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Importe Total (?)</label>
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
     onChange={(e) => setConvInstallments(Number(e.target.value))}
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
     Se generara un unico link de Stripe. Si hay varias cuotas, Stripe cobrara una mensualidad de {(convSalePrice / Math.max(convInstallments, 1)).toFixed(2)} EUR y la suscripcion se programa para cancelarse al llegar al total.
     </p>
    )}
    </div>

    {convInstallments > 1 && (
    <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 text-[10px] text-amber-300 font-mono space-y-0.5">
     <span className="block font-bold">DISTRIBUCIÓN EN PLAZOS:</span>
     <span> Cuota mensual: {(convSalePrice / convInstallments).toFixed(2)} EUR</span>
     <span className="block"> Total: {convInstallments} cuotas hasta completar {Number(convSalePrice || 0).toFixed(2)} EUR.</span>
    </div>
    )}

    {/* Comercial a asignar */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Comercial de Venta (Comisión)</label>
    <select
     required
     value={convSelectedComercialId}
     onChange={(e) => setConvSelectedComercialId(e.target.value)}
     className="w-full bg-[#030305] text-slate-200 text-xs border border-white/10 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer font-sans"
    >
     <option value="">-- Seleccionar Comercial --</option>
     {(comercialesList || []).map(com => (
     <option key={com.id} value={com.id}>
      {com.name} ({com.email}) - Comisión: {com.commissionPercentage ?? 10}%
     </option>
     ))}
    </select>
    {convSelectedComercialId && (() => {
     const com = (comercialesList || []).find(c => c.id === convSelectedComercialId);
     if (com) {
     const pct = com.commissionPercentage ?? 10;
     const commVal = (convSalePrice * pct) / 100;
     return (
      <p className="text-[10px] text-emerald-400 font-mono mt-1">
      👉 Se asignará una comisión de <strong>{commVal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong> ({pct}%) a <strong>{com.name}</strong> en el balance del comercial.
      </p>
     );
     }
     return null;
    })()}
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
     disabled={!convSelectedComercialId}
     className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-emerald-950/40 transition-all text-center flex items-center justify-center gap-1.5 uppercase tracking-wider"
    >
     <Check className="w-4 h-4" />
     <span>Confirmar Venta 🎯</span>
    </button>
    </div>
   </form>
   </div>
  </div>
  )}

 </div>
 );
}





