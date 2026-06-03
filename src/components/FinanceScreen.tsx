import React, { useState, useEffect } from 'react';
import { FinanceTransaction, Invoice, ClientContact, Screen, InvoiceItem } from '../types';
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
  Download
} from 'lucide-react';

interface FinanceScreenProps {
  contacts: ClientContact[];
  onNavigate?: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
}

const INITIAL_TRANSACTIONS: FinanceTransaction[] = [];

const INITIAL_INVOICES: Invoice[] = [];

export default function FinanceScreen({ contacts, onNavigate }: FinanceScreenProps) {
  // Navigation tabs: 'transactions' | 'recurring' | 'invoices'
  const [activeTab, setActiveTab] = useState<'transactions' | 'recurring' | 'invoices'>('transactions');

  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error' | 'offline'>('syncing');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Transactions local state
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    const saved = localStorage.getItem('agency_finance_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  // Invoices local state
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('agency_finance_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

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
        console.warn('Real-time database fetch error, using local storage fallback:', err);
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

  // Save utility
  useEffect(() => {
    localStorage.setItem('agency_finance_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('agency_finance_invoices', JSON.stringify(invoices));
  }, [invoices]);

  // Filters
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>('All');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');

  // Active list searches
  const [txSearch, setTxSearch] = useState('');
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

  // INVOICE MODAL controls
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [isEditingInv, setIsEditingInv] = useState(false);
  const [editingInvId, setEditingInvId] = useState<string | null>(null);

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

  // Banking defaults matching Revolut and Ibiza specs
  const [paymentDetails, setPaymentDetails] = useState('IE84 REVO 9903 6065 8046 06');
  const [bankBeneficiary, setBankBeneficiary] = useState('Ignacio Martin Gonzalez');
  const [bankSwift, setBankSwift] = useState('REVOIE23');
  const [bankNameAddress, setBankNameAddress] = useState('Revolut Bank UAB, 2 Dublin Landings, North Dock, Dublin 1, D01 V4A3, Ireland');
  const [bankCorrespondentBic, setBankCorrespondentBic] = useState('CHASDEFX');

  // Calculations for transactions
  const totalIncomes = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncomes - totalExpenses;

  // Cálculo de Saldos Consolidado y Pendiente según requerimiento
  const consolidatedIncomes = transactions
    .filter(t => t.type === 'income' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const consolidatedExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const consolidatedBalance = consolidatedIncomes - consolidatedExpenses;

  const pendingIncomes = transactions
    .filter(t => t.type === 'income' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const unpaidInvoicesTotal = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0);

  const pendingBalance = pendingIncomes + unpaidInvoicesTotal - pendingExpenses;

  // Filter transaction categories
  const categories = ['All', ...Array.from(new Set(transactions.map(t => t.category)))];

  // Handler: Add or update transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || isNaN(Number(txAmount)) || Number(txAmount) <= 0) {
      alert('Por favor introduce un importe válido.');
      return;
    }

    const payload: FinanceTransaction = {
      id: isEditingTx && editingTxId ? editingTxId : 'tx_' + Date.now(),
      type: txType,
      category: txCategory.trim() || 'General',
      amount: Math.abs(Number(txAmount)),
      date: txDate || new Date().toISOString().split('T')[0],
      description: txDescription.trim() || `${txType === 'income' ? 'Ingreso' : 'Gasto'} registrado`,
      isRecurring: txIsRecurring,
      recurrencePeriod: txIsRecurring ? txPeriod : undefined,
      status: txStatus
    };

    if (isEditingTx && editingTxId) {
      setTransactions(prev => prev.map(t => t.id === editingTxId ? payload : t));
      db.updateFinanceTransaction(payload).catch(err => console.error('Error updating transaction in DB:', err));
    } else {
      setTransactions(prev => [payload, ...prev]);
      db.insertFinanceTransaction(payload).catch(err => console.error('Error inserting transaction into DB:', err));
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
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      db.deleteFinanceTransaction(id).catch(err => console.error('Error deleting transaction in DB:', err));
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

    const payload: Invoice = {
      id: invoiceId,
      clientId: invClientId || undefined,
      clientName: invClientName,
      clientEmail: invClientEmail,
      date: invDate,
      dueDate: invDueDate,
      status: invStatus,
      items: validItems.map((item, idx) => ({
        id: item.id.startsWith('temp') ? 'item_' + idx + '_' + Date.now() : item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      subtotal,
      taxPercentage: invTaxPercentage,
      taxAmount,
      total,
      notes: invNotes
    };

    if (isEditingInv && editingInvId) {
      setInvoices(prev => prev.map(inv => inv.id === editingInvId ? payload : inv));
      db.updateFinanceInvoice(payload).catch(err => console.error('Error updating invoice in DB:', err));
    } else {
      setInvoices(prev => [payload, ...prev]);
      db.insertFinanceInvoice(payload).catch(err => console.error('Error inserting invoice into DB:', err));

      // Automatically register paid invoices as pending/paid income in finance transaction hub!
      if (invStatus === 'paid') {
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
    }

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

  const resetInvForm = () => {
    setIsEditingInv(false);
    setEditingInvId(null);
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
  };

  // Helper to trigger recurrence manual payment simulation
  const handleProcessRecurring = (tx: FinanceTransaction) => {
    // Generate a new transaction on today's date mimicking this recurrence
    const manualPayment: FinanceTransaction = {
      id: 'tx_' + Date.now() + '_rec',
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      date: new Date().toISOString().split('T')[0],
      description: `${tx.description} (Cargo Procesado)`,
      isRecurring: false,
      status: 'paid'
    };

    setTransactions(prev => [manualPayment, ...prev]);

    const toast = document.getElementById('toast-msg');
    if (toast) {
      toast.innerText = `Pago de ${tx.amount}€ procesado para: "${tx.description}"`;
      toast.classList.remove('opacity-0');
      setTimeout(() => toast.classList.add('opacity-0'), 3000);
    }
  };

  // Print helper for invoice preview
  const handlePrintPreview = () => {
    window.print();
  };

  // Convert a transaction (cobro) directly into a detailed draft / paid invoice
  const handleCreateInvoiceFromTransaction = (tx: FinanceTransaction) => {
    setIsEditingInv(false);
    setEditingInvId(null);
    
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

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.clientName.toLowerCase().includes(invSearch.toLowerCase()) || 
                          inv.id.toLowerCase().includes(invSearch.toLowerCase());
    const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const recurringExpenses = transactions.filter(t => t.type === 'expense' && t.isRecurring);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="finance-module-root">
      
      {/* Toast alert system */}
      <div 
        id="toast-msg" 
        className="fixed bottom-5 right-5 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-xl border border-emerald-400/20 text-xs transition-opacity duration-300 opacity-0 pointer-events-none flex items-center gap-2"
      >
        <Check className="w-4 h-4" />
        <span />
      </div>

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE finance_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON finance_invoices FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON finance_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON finance_invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON finance_invoices FOR DELETE USING (true);`;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Saldo Consolidado */}
        <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-emerald-500/[0.02]">
          <div className="absolute top-5 right-5 bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/10 group-hover:scale-105 transition-transform duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Saldo Consolidado</span>
          <h3 className="text-3px font-black text-white mt-2 tracking-tight font-serif select-all text-3xl">
            {consolidatedBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}<span className="text-emerald-400 text-lg ml-1 font-sans">€</span>
          </h3>
          <p className="text-[10px] text-emerald-400/80 font-mono mt-3 flex items-center gap-1.5 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Fondos liquidados</span>
          </p>
        </div>

        {/* Metric 2: Saldo Pendiente */}
        <div className="bg-[#0b1329]/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl relative overflow-hidden text-left hover:border-amber-500/20 hover:-translate-y-1 transition-all duration-300 group shadow-md hover:shadow-amber-500/[0.02]">
          <div className="absolute top-5 right-5 bg-amber-500/10 rounded-2xl p-3 border border-amber-500/10 group-hover:scale-105 transition-transform duration-300">
            <Clock className="w-5 h-5 text-amber-400" />
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
          <div className="absolute top-5 right-5 bg-blue-500/10 rounded-2xl p-3 border border-blue-500/10 group-hover:scale-105 transition-transform duration-300">
            <ArrowUpRight className="w-5 h-5 text-blue-400" />
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
          <div className="absolute top-5 right-5 bg-rose-500/10 rounded-2xl p-3 border border-rose-500/10 group-hover:scale-105 transition-transform duration-300">
            <ArrowDownLeft className="w-5 h-5 text-rose-400" />
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
            <span>Gastos Recurrentes</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'recurring' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-slate-400'}`}>
              {recurringExpenses.length}
            </span>
          </button>
          <button
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
        </div>

        {/* Dynamic Context Helpers */}
        <span className="text-[11px] font-mono text-slate-500 text-left sm:text-right">
          {activeTab === 'transactions' ? `Mostrando ${filteredTxs.length} registros` : activeTab === 'recurring' ? `${recurringExpenses.length} suscripciones operativas` : `Sincronizadas ${filteredInvoices.length} facturas`}
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
                  {filteredTxs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center text-slate-500 text-xs font-light">
                        No se encontraron registros de transacciones.
                      </td>
                    </tr>
                  ) : (
                    filteredTxs.map(t => {
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

                      return (
                        <tr key={t.id} className="hover:bg-white/[0.01] text-xs transition-colors group">
                          <td className="p-4 text-left">
                            <div className="max-w-xs sm:max-w-md text-left">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block leading-none mb-1 select-all">
                                {t.id}
                              </span>
                              <span className="font-bold text-white text-xs block leading-snug group-hover:text-emerald-400 transition-colors">
                                {t.description}
                              </span>
                              {t.isRecurring && (
                                <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider font-mono text-purple-400 bg-purple-500/10 border border-purple-500/25 px-1.5 py-0.5 rounded-md mt-1.5">
                                  <Repeat className="w-2.5 h-2.5" />
                                  <span>Gasto recurrente ({t.recurrencePeriod})</span>
                                </span>
                              )}
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
                            <span className={`font-mono text-xs font-bold tracking-tight ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-100'}`}>
                              {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </span>
                          </td>
                          <td className="p-4 text-left">
                            {t.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(16,185,129)]" />
                                Liquidado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg text-amber-400">
                                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {t.type === 'income' && (
                                <button
                                  onClick={() => handleCreateInvoiceFromTransaction(t)}
                                  className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Facturar este cobro (Generar y editar factura)"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
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
          </div>
        </div>
      )}

      {/* Tab Content 2: Recurring Expenses List */}
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
              <span>Suscripciones y Gastos Fijos Recurrentes</span>
            </h3>
            <p className="text-slate-400 text-xs font-light mt-1.5 leading-relaxed max-w-3xl relative z-10 font-sans">
              Aquí puedes supervisar los gastos fijos estructurados que se cargan periódicamente. Puedes simular el abono de una nueva cuota instantánea haciendo clic en <strong className="text-purple-300 font-medium">Procesar Cargo</strong> para asentar la fecha actual.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
            {recurringExpenses.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-slate-900/10 rounded-3xl border border-white/5 font-light">
                No tienes gastos recurrentes configurados. Registra una nueva transacción y activa el marcador de recurrencia.
              </div>
            ) : (
              recurringExpenses.map(item => (
                <div 
                  key={item.id} 
                  className="bg-[#0b1329]/20 backdrop-blur-md border border-white/5 p-5 rounded-3xl flex flex-col justify-between hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/[0.02] hover:-translate-y-0.5 transition-all duration-300 text-left relative overflow-hidden group/card"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-xl uppercase tracking-wider font-extrabold">
                        {item.recurrencePeriod === 'mensual' ? 'Mensual' : 'Anual'}
                      </span>
                      <span className="font-bold text-xs font-mono text-white text-right shrink-0">
                        {item.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-white leading-snug group-hover/card:text-purple-300 transition-colors">
                        {item.description}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-wider">
                        {item.category}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">Liquidación</span>
                    <button
                      onClick={() => handleProcessRecurring(item)}
                      className="text-[10px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-extrabold px-3.5 py-2 rounded-xl transition duration-200 cursor-pointer flex items-center gap-1 active:scale-95 shadow-md shadow-purple-500/10"
                    >
                      <span>Procesar Cargo</span>
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
              filteredInvoices.map((inv) => (
                <div 
                  key={inv.id}
                  onClick={() => setPreviewInvoice(inv)}
                  className="bg-[#0b1329]/20 backdrop-blur-md border border-white/5 hover:border-blue-500/30 p-5 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/[0.01] hover:-translate-y-0.5 group cursor-pointer text-left relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-500 font-mono tracking-wider block uppercase">{inv.id}</span>
                        <h4 className="font-bold text-xs text-white leading-snug group-hover:text-blue-400 transition-colors mt-1 truncate">
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
                  </div>

                  {/* Actions drawer */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-1">
                    <span className="text-[9px] font-mono text-slate-500">Haga clic para PDF</span>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {inv.status !== 'paid' && (
                        <button
                          onClick={(e) => handleInvoiceMarkPaid(inv, e)}
                          className="bg-emerald-600/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold py-1.5 px-3 rounded-xl cursor-pointer transition active:scale-95 duration-200"
                          title="Recibir cobro"
                        >
                          Cobrar
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
              ))
            )}
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

              {/* Recurrence Switcher */}
              <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] font-mono text-slate-300 font-bold block uppercase">Establecer Gasto Recurrente</span>
                    <span className="text-[9px] text-slate-500 block">Suscripción fija recurrente</span>
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
                  <div className="pt-2 animate-fade-in space-y-1 block">
                    <label className="text-[8px] uppercase font-mono text-purple-400 font-bold block">Periodo de cobro</label>
                    <select
                      value={txPeriod}
                      onChange={(e) => setTxPeriod(e.target.value as any)}
                      className="w-full bg-slate-950 border border-purple-500/20 rounded-xl py-1 px-2.5 text-xs text-slate-200 cursor-pointer"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                      <option value="yearly">Anual</option>
                    </select>
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
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider block">Líneas de Conceptos Detallados</label>
                  <button
                    type="button"
                    onClick={handleAddInvoiceItem}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 py-1 px-2.5 rounded-lg active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Añadir Concepto</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {invItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5 text-left">
                      <div className="col-span-6 space-y-0.5">
                        <span className="text-[8px] font-mono text-slate-500 uppercase">Descripción del Servicio</span>
                        <input
                          type="text"
                          placeholder="e.g. Horas de Consultores Senior React"
                          value={item.description}
                          onChange={(e) => handleUpdateInvoiceItemField(index, 'description', e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-white/10 rounded-lg py-1 px-2 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2 space-y-0.5">
                        <span className="text-[8px] font-mono text-slate-500 uppercase">Cantidad</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateInvoiceItemField(index, 'quantity', Number(e.target.value))}
                          required
                          className="w-full bg-slate-950 border border-white/10 rounded-lg py-1 px-2 text-xs text-slate-200 font-mono text-center focus:outline-none"
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
            <div className="p-8 bg-neutral-900 text-slate-200 font-sans border border-neutral-800 rounded-2xl m-3 space-y-8 select-text relative">
              
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
                          <td className="p-3 font-medium text-white">{it.description}</td>
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
  );
}
