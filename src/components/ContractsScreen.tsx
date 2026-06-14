import { useState, useRef, useEffect } from 'react';
import { ClientContact } from '../types';
import { db } from '../supabaseClient';
import { 
  FileText, 
  Receipt, 
  Printer, 
  Users, 
  User, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw, 
  Download, 
  Calendar, 
  MapPin, 
  Layers, 
  Info,
  DollarSign,
  Search,
  Save,
  Link,
  ExternalLink
} from 'lucide-react';

interface ContractsScreenProps {
  contacts: ClientContact[];
  onNavigate: (target: any, transition: any) => void;
}

// Preset Invoice sample item
interface FacturaItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function ContractsScreen({ contacts, onNavigate }: ContractsScreenProps) {
  const [activeTab, setActiveTab] = useState<'contract' | 'invoice'>('contract');

  // --- DATABASE PERSISTENCE FOR CONTRACTS ---
  const [savedContracts, setSavedContracts] = useState<any[]>([]);
  const [selectedContractIdInDb, setSelectedContractIdInDb] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [contractSearchText, setContractSearchText] = useState('');

  useEffect(() => {
    let active = true;
    async function loadSaved() {
      try {
        const list = await db.getContractsAlthera();
        if (active) {
          setSavedContracts(list);
        }
      } catch (err) {
        console.error('Error load contracts:', err);
      }
    }
    loadSaved();
    return () => {
      active = false;
    };
  }, []);

  const handleLoadContract = (id: string) => {
    setSelectedContractIdInDb(id);
    if (!id) {
      setSelectedContactId('');
      return;
    }
    const contract = savedContracts.find(c => c.id === id);
    if (contract) {
      setClientName(contract.clientName || '');
      setClientDni(contract.clientDni || '');
      setClientAddress(contract.clientAddress || '');
      setClientPhone(contract.clientPhone || '');
      setClientEmail(contract.clientEmail || '');
      setPrestador1Name(contract.prestador1Name || 'D. Carlos Ronco');
      setPrestador1Dni(contract.prestador1Dni || '09104663K');
      setPrestador2Name(contract.prestador2Name || 'D. Ignacio Martin Gonzalez');
      setPrestador2Dni(contract.prestador2Dni || '75931136V');
      setDeliveryDays(contract.deliveryDays || '20');
      setCourtCity(contract.courtCity || 'Ibiza');
      setSigningCity(contract.signingCity || 'Ibiza');
      setSigningDay(contract.signingDay || '');
      setSigningMonth(contract.signingMonth || '');
      setSigningYear(contract.signingYear || '');
      setPriceSingle(Number(contract.priceSingle) || 950);
      setFin3Total(Number(contract.fin3Total) || 960);
      setFin3Cuota(Number(contract.fin3Cuota) || 320);
      setFin3Coste(Number(contract.fin3Coste) || 10);
      setFin4Total(Number(contract.fin4Total) || 1000);
      setFin4Cuota(Number(contract.fin4Cuota) || 250);
      setFin4Coste(Number(contract.fin4Coste) || 50);
      setSelectedModality(contract.selectedModality || 'single');
      setSelectedContactId(contract.selectedContactId || '');
    }
  };

  const handleSaveToDb = async () => {
    try {
      const contractObj = {
        id: selectedContractIdInDb || 'cnt_' + Date.now().toString().slice(-6),
        clientName,
        clientDni,
        clientAddress,
        clientPhone,
        clientEmail,
        prestador1Name,
        prestador1Dni,
        prestador2Name,
        prestador2Dni,
        deliveryDays,
        courtCity,
        signingCity,
        signingDay,
        signingMonth,
        signingYear,
        priceSingle,
        fin3Total,
        fin3Cuota,
        fin3Coste,
        fin4Total,
        fin4Cuota,
        fin4Coste,
        selectedModality,
        selectedContactId: selectedContactId || null
      };

      if (selectedContractIdInDb) {
        await db.updateContractAlthera(contractObj);
        setSaveMessage('Contrato actualizado con éxito en la base de datos.');
      } else {
        await db.insertContractAlthera(contractObj);
        setSaveMessage('Contrato guardado con éxito en la base de datos.');
      }
      
      const updated = await db.getContractsAlthera();
      setSavedContracts(updated);
      setSelectedContractIdInDb(contractObj.id);
      
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.error('Error saving contract to DB:', err);
      setSaveMessage('Error al guardar el contrato en base de datos.');
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  const handleDeleteContract = async () => {
    if (!selectedContractIdInDb) return;
    try {
      await db.deleteContractAlthera(selectedContractIdInDb);
      const updated = await db.getContractsAlthera();
      setSavedContracts(updated);
      setSelectedContractIdInDb('');
      setSelectedContactId('');
      setSaveMessage('Contrato eliminado correctamente.');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.error('Error deleting contract:', err);
      setSaveMessage('No se pudo eliminar el contrato.');
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  const handleSaveInvoiceToDb = async () => {
    if (!invoiceClientName.trim()) {
      setSaveMessage('Error: Por favor especifica el nombre del cliente.');
      setTimeout(() => setSaveMessage(null), 4000);
      return;
    }
    
    try {
      const validItems = invoiceItems.filter(item => item.description.trim() !== '');

      const linkedTransactions = allTransactions.filter(t => linkedTxIds.includes(t.id));
      const linkedTxsMapped = linkedTransactions.map(tx => {
        const netPrice = tx.amount / (1 + taxPercentage / 100);
        return {
          id: tx.id,
          description: `${tx.description} (${tx.status === 'pending' || tx.status === 'draft' ? 'Pendiente' : 'Cobrado'})`,
          quantity: 1,
          unitPrice: netPrice,
          total: netPrice
        };
      });

      const finalItems = [
        ...validItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice
        })),
        ...linkedTxsMapped
      ];

      const invoicePayload: any = {
        id: invoiceNumber,
        clientId: invoiceClientId || undefined,
        clientName: invoiceClientName,
        clientEmail: invoiceClientEmail,
        date: invoiceDate,
        dueDate: showDueDate ? invoiceDueDate : invoiceDate,
        status: 'draft',
        items: finalItems,
        subtotal: subtotal,
        taxPercentage: taxPercentage,
        taxAmount: taxAmount,
        total: total,
        notes: `Creado desde el Generador de Contratos de Althera. Método de pago: ${
          paymentMethod === 'transferencia' ? 'Transferencia Bancaria' :
          paymentMethod === 'bizum' ? 'Bizum' :
          paymentMethod === 'cash' ? 'Efectivo (Cash)' :
          'Ingreso Bancario'
        }`
      };

      // Try inserting into Supabase
      const existingInvoices = await db.getFinanceInvoices();
      const exists = existingInvoices.some((inv: any) => inv.id === invoiceNumber);

      if (exists) {
        await db.updateFinanceInvoice(invoicePayload);
      } else {
        await db.insertFinanceInvoice(invoicePayload);
      }

      // Synchronize associated transactions
      const updatedTxs = allTransactions.map(t => {
        if (linkedTxIds.includes(t.id)) {
          return { ...t, invoiceId: invoiceNumber };
        } else if (t.invoiceId === invoiceNumber) {
          return { ...t, invoiceId: null };
        }
        return t;
      });

      // Update in database safely
      for (const tx of updatedTxs) {
        const originalTx = allTransactions.find(ot => ot.id === tx.id);
        if (originalTx && originalTx.invoiceId !== tx.invoiceId) {
          try {
            await db.updateFinanceTransaction(tx);
          } catch (txErr) {
            console.error(`Error updating transaction ${tx.id} in DB:`, txErr);
          }
        }
      }

      setAllTransactions(updatedTxs);
      localStorage.setItem('agency_finance_transactions', JSON.stringify(updatedTxs));

      // Also ensure localStorage is perfectly synchronized for real-time responsiveness
      const savedInvoicesRaw = localStorage.getItem('agency_finance_invoices');
      let savedInvoices = savedInvoicesRaw ? JSON.parse(savedInvoicesRaw) : [];
      const index = savedInvoices.findIndex((inv: any) => inv.id === invoiceNumber);
      if (index >= 0) {
        savedInvoices[index] = invoicePayload;
      } else {
        savedInvoices = [invoicePayload, ...savedInvoices];
      }
      localStorage.setItem('agency_finance_invoices', JSON.stringify(savedInvoices));

      setSaveMessage('Factura y transacciones vinculadas guardadas con éxito.');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.error('Error saving invoice to DB:', err);
      // Local-only save fallback
      const validItems = invoiceItems.filter(item => item.description.trim() !== '');
      const linkedTransactions = allTransactions.filter(t => linkedTxIds.includes(t.id));
      const linkedTxsMapped = linkedTransactions.map(tx => {
        const netPrice = tx.amount / (1 + taxPercentage / 100);
        return {
          id: tx.id,
          description: `${tx.description} (${tx.status === 'pending' || tx.status === 'draft' ? 'Pendiente' : 'Cobrado'})`,
          quantity: 1,
          unitPrice: netPrice,
          total: netPrice
        };
      });

      const finalItems = [
        ...validItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice
        })),
        ...linkedTxsMapped
      ];

      const invoicePayload: any = {
        id: invoiceNumber,
        clientId: invoiceClientId || undefined,
        clientName: invoiceClientName,
        clientEmail: invoiceClientEmail,
        date: invoiceDate,
        dueDate: showDueDate ? invoiceDueDate : invoiceDate,
        status: 'draft',
        items: finalItems,
        subtotal: subtotal,
        taxPercentage: taxPercentage,
        taxAmount: taxAmount,
        total: total,
        notes: `Creado desde el Generador de Contratos de Althera. Método de pago: ${
          paymentMethod === 'transferencia' ? 'Transferencia Bancaria' :
          paymentMethod === 'bizum' ? 'Bizum' :
          paymentMethod === 'cash' ? 'Efectivo (Cash)' :
          'Ingreso Bancario'
        }`
      };
      
      const savedInvoicesRaw = localStorage.getItem('agency_finance_invoices');
      let savedInvoices = savedInvoicesRaw ? JSON.parse(savedInvoicesRaw) : [];
      const index = savedInvoices.findIndex((inv: any) => inv.id === invoiceNumber);
      if (index >= 0) {
        savedInvoices[index] = invoicePayload;
      } else {
        savedInvoices = [invoicePayload, ...savedInvoices];
      }
      localStorage.setItem('agency_finance_invoices', JSON.stringify(savedInvoices));

      const updatedTxs = allTransactions.map(t => {
        if (linkedTxIds.includes(t.id)) {
          return { ...t, invoiceId: invoiceNumber };
        } else if (t.invoiceId === invoiceNumber) {
          return { ...t, invoiceId: null };
        }
        return t;
      });
      setAllTransactions(updatedTxs);
      localStorage.setItem('agency_finance_transactions', JSON.stringify(updatedTxs));
      
      setSaveMessage('Guardado localmente con éxito.');
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  // --- CONTRACT STATE ---
  const [selectedContactId, setSelectedContactId] = useState('');
  
  // Real-time editable parameters for Contract
  const [clientName, setClientName] = useState('D./Dña. Ignacio Martin');
  const [clientDni, setClientDni] = useState('45678912A');
  const [clientAddress, setClientAddress] = useState('Avenida de los Rosales, Nº 45, Ibiza');
  const [clientPhone, setClientPhone] = useState('+34 612 345 678');
  const [clientEmail, setClientEmail] = useState('contacto@cliente.com');
  
  // Prestadores can be customized too
  const [prestador1Name, setPrestador1Name] = useState('D. Carlos Ronco');
  const [prestador1Dni, setPrestador1Dni] = useState('09104663K');
  const [prestador2Name, setPrestador2Name] = useState('D. Ignacio Martin Gonzalez');
  const [prestador2Dni, setPrestador2Dni] = useState('75931136V');

  // Specific Web service terms
  const [deliveryDays, setDeliveryDays] = useState('20');
  const [courtCity, setCourtCity] = useState('Ibiza');
  const [signingCity, setSigningCity] = useState('Ibiza');
  
  // Custom Date
  const [signingDay, setSigningDay] = useState(new Date().getDate().toString());
  const [signingMonth, setSigningMonth] = useState('Junio');
  const [signingYear, setSigningYear] = useState('2026');

  // Prices
  const [priceSingle, setPriceSingle] = useState(950);
  const [fin3Total, setFin3Total] = useState(960);
  const [fin3Cuota, setFin3Cuota] = useState(320);
  const [fin3Coste, setFin3Coste] = useState(10);

  const [fin4Total, setFin4Total] = useState(1000);
  const [fin4Cuota, setFin4Cuota] = useState(250);
  const [fin4Coste, setFin4Coste] = useState(50);

  const [selectedModality, setSelectedModality] = useState<'single' | 'fin3' | 'fin4'>('single');
  const [includeDefaultSignatures, setIncludeDefaultSignatures] = useState(true);

  // Auto Calculations when base price changes
  const handleBasePriceChange = (val: number) => {
    setPriceSingle(val);
    setFin3Total(val + 10);
    setFin3Cuota(Math.round((val + 10) / 3));
    
    setFin4Total(val + 50);
    setFin4Cuota(Math.round((val + 50) / 4));
  };

  // Pre-fill fields from CRM selection
  useEffect(() => {
    if (selectedContactId) {
      const contact = contacts.find(c => c.id === selectedContactId);
      if (contact) {
        setClientName(contact.name || 'D./Dña. Ignacio Martin');
        setClientDni(contact.id || 'N/A');
        setClientAddress(contact.location || 'Ibiza');
        setClientPhone(contact.phone || '');
        setClientEmail(contact.email || '');
      }
    }
  }, [selectedContactId]);


  // --- INVOICE STATE ---
  const [invoiceNumber, setInvoiceNumber] = useState(`AL-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [taxPercentage, setTaxPercentage] = useState(21);
  const [paymentDetails, setPaymentDetails] = useState('IE84 REVO 9903 6065 8046 06');
  const [bankBeneficiary, setBankBeneficiary] = useState('Ignacio Martin Gonzalez');
  const [bankSwift, setBankSwift] = useState('REVOIE23');
  const [bankNameAddress, setBankNameAddress] = useState('Revolut Bank UAB, 2 Dublin Landings, North Dock, Dublin 1, D01 V4A3, Ireland');
  const [bankCorrespondentBic, setBankCorrespondentBic] = useState('CHASDEFX');

  // --- SERVICE PROVIDER (EMISOR) STATE ---
  const [showProviderInfo, setShowProviderInfo] = useState(true);
  const [providers, setProviders] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('agency_invoice_providers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading providers:', e);
    }
    return [
      {
        id: '1',
        name: 'Althera Solutions S.L.',
        cif: 'B-18974534',
        address: 'Avenida de España, Nº 10, 1ºA',
        postalCodeCity: '07800 - Ibiza, España',
        email: 'administracion@althera.io',
        isActive: true,
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('agency_invoice_providers', JSON.stringify(providers));
  }, [providers]);

  // --- SHOW PAYMENT INFO STATE ---
  const [showPaymentInfo, setShowPaymentInfo] = useState(true);

  // --- SHOW DUE DATE STATE ---
  const [showDueDate, setShowDueDate] = useState(true);

  // --- PAYMENT METHOD STATE ---
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bizum' | 'ingreso_bancario' | 'transferencia'>('transferencia');

  // Selected client for invoice prefill
  const [invoiceClientId, setInvoiceClientId] = useState('');
  const [invoiceClientName, setInvoiceClientName] = useState('Ignacio Martin Solutions');
  const [invoiceClientDni, setInvoiceClientDni] = useState('B18765432');
  const [invoiceClientAddress, setInvoiceClientAddress] = useState('Camino de Ronda 120, Ibiza');
  const [invoiceClientEmail, setInvoiceClientEmail] = useState('facturacion@ignacio.com');

  useEffect(() => {
    if (invoiceClientId) {
      const contact = contacts.find(c => c.id === invoiceClientId);
      if (contact) {
        setInvoiceClientName(contact.company !== 'Independent' ? contact.company : contact.name);
        setInvoiceClientDni('DNI/CIF: ' + (contact.hostingCredentials?.split('\n')[0] || 'M-451290'));
        setInvoiceClientAddress(contact.location || 'Camino de Ronda 120, Ibiza');
        setInvoiceClientEmail(contact.email || '');
      }
    }
  }, [invoiceClientId]);

  // --- TRANSACTIONS LINKING SYSTEM ---
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [linkedTxIds, setLinkedTxIds] = useState<string[]>([]);
  const [txIdInputText, setTxIdInputText] = useState('');
  const [selectedTxToLink, setSelectedTxToLink] = useState('');

  // Synchronize/load transactions for linking
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const list = await db.getFinanceTransactions();
        if (list && list.length > 0) {
          setAllTransactions(list);
          const matchedTxIds = list.filter((t: any) => t.invoiceId === invoiceNumber).map((t: any) => t.id);
          setLinkedTxIds(matchedTxIds);
        } else {
          const localSaved = localStorage.getItem('agency_finance_transactions');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            setAllTransactions(parsed);
            const matchedTxIds = parsed.filter((t: any) => t.invoiceId === invoiceNumber).map((t: any) => t.id);
            setLinkedTxIds(matchedTxIds);
          }
        }
      } catch (err) {
        console.error('Error fetching transactions in invoice generator:', err);
        const localSaved = localStorage.getItem('agency_finance_transactions');
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          setAllTransactions(parsed);
          const matchedTxIds = parsed.filter((t: any) => t.invoiceId === invoiceNumber).map((t: any) => t.id);
          setLinkedTxIds(matchedTxIds);
        }
      }
    };
    fetchTransactions();
  }, [invoiceNumber]);

  const handleLinkTransactionById = (txId: string) => {
    const cleanId = txId.trim();
    if (!cleanId) return;
    
    if (linkedTxIds.includes(cleanId)) {
      setSaveMessage('La transacción ya está vinculada a esta factura.');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    // See if transaction exists in current list
    const found = allTransactions.find(t => t.id === cleanId);
    if (!found) {
      // It's fine if it's not found locally, let's allow it but warn.
      setLinkedTxIds(prev => [...prev, cleanId]);
      const placeholderTx = {
        id: cleanId,
        description: `Transacción #${cleanId} (ID manual)`,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        category: 'Varios',
        status: 'pending',
        invoiceId: invoiceNumber
      };
      setAllTransactions(prev => [...prev, placeholderTx]);
      setSaveMessage('ID de transacción vinculado con éxito.');
      setTimeout(() => setSaveMessage(null), 3500);
    } else {
      setLinkedTxIds(prev => [...prev, cleanId]);
      setSaveMessage('Transacción vinculada con éxito.');
      setTimeout(() => setSaveMessage(null), 3000);
    }
    
    setTxIdInputText('');
  };

  const handleUnlinkTransaction = (txId: string) => {
    setLinkedTxIds(prev => prev.filter(id => id !== txId));
  };

  const [invoiceItems, setInvoiceItems] = useState<FacturaItem[]>([
    { id: '1', description: 'Diseño UX/UI de Plataforma Althera y Maquetación Web', quantity: 1, unitPrice: 450 },
    { id: '2', description: 'Desarrollo Frontend React & Backend Módulo CRM de Reservas', quantity: 1, unitPrice: 500 }
  ]);

  const handleAddInvoiceItem = () => {
    setInvoiceItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        description: 'Nuevo concepto de servicio web',
        quantity: 1,
        unitPrice: 150
      }
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof FacturaItem, val: any) => {
    setInvoiceItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: val
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setInvoiceItems(prev => prev.filter(item => item.id !== id));
  };

  // Calc Totals
  const linkedTransactions = allTransactions.filter(t => linkedTxIds.includes(t.id));
  const linkedSubtotalContribution = linkedTransactions.reduce((acc, t) => {
    // Backcalculate net price before tax as transaction amount is VAT-inclusive
    const netAmount = t.amount / (1 + taxPercentage / 100);
    return acc + netAmount;
  }, 0);

  const subtotal = invoiceItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0) + linkedSubtotalContribution;
  const taxAmount = (subtotal * taxPercentage) / 100;
  const total = subtotal + taxAmount;

  // Calculate pending transactions
  const totalPendingTransactionsAmount = linkedTransactions
    .filter(t => t.status === 'pending' || t.status === 'draft')
    .reduce((acc, t) => acc + t.amount, 0);

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Standalone HTML Download Trigger
  const handleDownloadHTML = () => {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;
    
    // Exact mapping of styles for stand-alone fidelity and perfect print formatting
    const rawHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>\${activeTab === 'contract' ? 'Contrato_Althera' : 'Factura_Althera_' + invoiceNumber}</title>
  <style>
    /* Reset margins and establish font family */
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: Georgia, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* Perfect A4 styling dimensions for viewing & printing */
    .a4-container {
      width: 210mm;
      min-height: 297mm;
      padding: 2.5cm 1.5cm;
      margin: 20px auto;
      background-color: white;
      box-sizing: border-box;
      position: relative;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
    }

    /* Standard Utility styling rules used inside the contract/invoice element */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .border-b { border-bottom: 2px solid #f3f3f3; }
    .border-b-2 { border-bottom: 2px solid #cdcdcd; }
    .border-t { border-top: 2px solid #f3f3f3; }
    .border-t-2 { border-top: 2px solid #cdcdcd; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mb-10 { margin-bottom: 2.5rem; }
    .mr-2 { margin-right: 0.5rem; }
    .mr-8 { margin-right: 2rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }
    .pb-2 { padding-bottom: 0.5rem; }
    .pb-4 { padding-bottom: 1rem; }
    .pb-8 { padding-bottom: 2rem; }
    .pt-4 { padding-top: 1rem; }
    .pl-4 { padding-left: 1rem; }
    .gap-1 { gap: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-4 { gap: 1rem; }
    .gap-8 { gap: 2rem; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-base { font-size: 1rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-3xl { font-size: 1.875rem; }
    .font-sans { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
    .font-serif { font-family: Georgia, Cambria, "Times New Roman", Times, serif; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-light { font-weight: 300; }
    .leading-relaxed { line-height: 1.7; }
    .leading-loose { line-height: 2; }
    .text-neutral-500 { color: #737373; }
    .text-neutral-700 { color: #404040; }
    .text-neutral-900 { color: #171717; }
    .text-amber-600 { color: #d97706; }
    .bg-neutral-50 { background-color: #fafafa; }
    .bg-neutral-100 { background-color: #f5f5f5; }
    .w-full { width: 100%; }
    .h-2 { height: 0.5rem; }
    .rounded-full { border-radius: 9999px; }
    .bg-amber-500 { background-color: #f59e0b; }
    .bg-amber-600 { background-color: #d97706; }
    .align-top { vertical-align: top; }
    .p-2 { padding: 0.5rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .border-collapse { border-collapse: collapse; }
    .border { border: 1px solid #e5e7eb; }
    .border-neutral-200 { border-color: #e5e7eb; }

    /* Custom print configurations so right-click -> print matches perfectly */
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff !important;
      }
      .a4-container {
        width: 210mm !important;
        height: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        page-break-inside: avoid;
      }
      @page {
        size: A4;
        margin: 1.8cm 1.5cm;
      }
    }
  </style>
</head>
<body>
  <div class="a4-container">
    \${printArea.innerHTML}
  </div>
</body>
</html>`;

    // Package down as client-side download link
    const blob = new Blob([rawHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeTab === 'contract' ? 'Contrato_Althera.html' : 'Factura_Althera_' + invoiceNumber + '.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto scrollbar-thin">
      
      {/* Intro Header Section */}
      <div className="bg-[#050505] border border-amber-500/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-[-30%] right-[-10%] w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white font-sans flex items-center gap-2">
              <span className="gold-gradient p-2 rounded-xl text-black font-semibold flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </span>
              <span className="gold-gradient-text font-display">Documentación Legal y Financiera</span>
            </h2>
            <p className="text-slate-400 text-xs font-light mt-1 max-w-2xl leading-relaxed">
              Genera al instante contratos de prestación de servicios web y facturas para tus clientes. Modifica valores en tiempo real, vincula fichas del CRM y exporta directamente en formato impreso o guardado como PDF con el logo oficial de <span className="text-[#D4AF37] font-semibold">Althera</span>.
            </p>
          </div>
          
          {/* Tab Selector */}
          <div className="flex bg-neutral-950 border border-neutral-850 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('contract')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'contract'
                  ? 'bg-amber-500/10 text-[#D4AF37] border border-amber-500/20 shadow-md shadow-amber-500/5'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Contrato Althera
            </button>
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer ${
                activeTab === 'invoice'
                  ? 'bg-amber-500/10 text-[#D4AF37] border border-amber-500/20 shadow-md shadow-amber-500/5'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Facturas PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COMPONENT: Interactive Customization Form Panels (5 cols) */}
        <div className="xl:col-span-5 bg-black/60 border border-amber-500/10 p-5 rounded-3xl space-y-6 shadow-xl relative backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#D4AF37] font-bold">
              <Layers className="w-4 h-4" />
              <span>Controles de Personalización</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Standalone HTML Download Button */}
              <button
                onClick={handleDownloadHTML}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-amber-500/10 hover:border-amber-500/30 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                title="Descargar código HTML responsivo optimizado para impresión"
              >
                <Download className="w-3.5 h-3.5 text-amber-500" />
                <span>Descargar HTML</span>
              </button>

              {/* Direct Print Button */}
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-amber-500/20 hover:border-amber-500/40 text-[#D4AF37] text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>

          {activeTab === 'contract' ? (
            /* --- CONTRACT FORM --- */
            <div className="space-y-4 font-sans text-left">
              
              {/* Contratos Guardados en Base de Datos */}
              <div className="bg-[#0c0c0c] border border-amber-500/10 p-3 rounded-2xl space-y-2.5">
                <label className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Contrato de Althera (BD)
                </label>
                
                {/* Search Bar for Contract ID / Client Name */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-3.5 h-3.5 font-bold" />
                  <input
                    type="text"
                    value={contractSearchText}
                    onChange={(e) => setContractSearchText(e.target.value)}
                    placeholder="Buscar contrato por ID o cliente..."
                    className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 placeholder:text-neutral-500"
                  />
                  {contractSearchText && (
                    <button 
                      type="button"
                      onClick={() => setContractSearchText('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedContractIdInDb}
                    onChange={(e) => handleLoadContract(e.target.value)}
                    className="flex-1 bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- {contractSearchText ? `Resultados (${savedContracts.filter(c => {
                      const term = contractSearchText.trim().toLowerCase();
                      const matchId = (c.id || '').toLowerCase().includes(term);
                      const matchName = (c.clientName || '').toLowerCase().includes(term);
                      return matchId || matchName;
                    }).length})` : 'Crear Nuevo Contrato'} --</option>
                    {savedContracts.filter(c => {
                      const term = contractSearchText.trim().toLowerCase();
                      if (!term) return true;
                      const matchId = (c.id || '').toLowerCase().includes(term);
                      const matchName = (c.clientName || '').toLowerCase().includes(term);
                      return matchId || matchName;
                    }).map(c => (
                      <option key={c.id} value={c.id}>
                        [{c.id}] {c.clientName ? c.clientName.replace('D./Dña. ', '') : 'Sin nombre'} ({c.selectedModality === 'single' ? 'Único' : c.selectedModality === 'fin3' ? '3 pl.' : '4 pl.'})
                      </option>
                    ))}
                  </select>
                  {selectedContractIdInDb && (
                    <button
                      onClick={handleDeleteContract}
                      title="Eliminar de la Base de Datos"
                      type="button"
                      className="aspect-square bg-red-950/30 border border-red-500/30 text-red-400 p-2 rounded-xl hover:bg-red-900/40 transition cursor-pointer flex items-center justify-center animate-fade-in"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveToDb}
                    type="button"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-neutral-950 font-bold text-[11px] py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedContractIdInDb ? 'Guardar Cambios' : 'Guardar en Base de Datos'}
                  </button>
                  
                  {selectedContractIdInDb && (
                    <button
                      onClick={() => {
                        setSelectedContractIdInDb('');
                        setSelectedContactId('');
                        setClientName('D./Dña. Ignacio Martin');
                        setClientDni('45678912A');
                        setClientAddress('Avenida de los Rosales, Nº 45, Ibiza');
                        setClientPhone('+34 612 345 678');
                        setClientEmail('contacto@cliente.com');
                        setSigningDay(new Date().getDate().toString());
                        setSigningMonth('Junio');
                        setSigningYear('2026');
                        setPriceSingle(950);
                        setFin3Total(960);
                        setFin3Cuota(320);
                        setFin4Total(1000);
                        setFin4Cuota(250);
                        setSelectedModality('single');
                      }}
                      type="button"
                      className="bg-neutral-900 border border-neutral-800 text-slate-300 text-[10px] py-1.5 px-2.5 rounded-xl hover:bg-neutral-850 hover:text-white transition cursor-pointer"
                    >
                      Nuevo
                    </button>
                  )}
                </div>

                {saveMessage && (
                  <p className={`text-[10px] text-center font-semibold mt-1 animate-fade-in ${saveMessage.includes('con éxito') || saveMessage.includes('correctamente') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {saveMessage}
                  </p>
                )}
              </div>
              
              {/* Optional CRM Link Pre-fill */}
              <div className="bg-[#0c0c0c] border border-amber-500/10 p-3 rounded-2xl">
                <label className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5" /> Pre-llenar desde Cliente CRM
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">- Selecciona un contacto del CRM -</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-500 font-light mt-1.5">
                  Selecciona a cualquier cliente registrado para rellenar sus campos legales automáticamente en el borrador de abajo.
                </p>
              </div>

              {/* Client Info Fieldset */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200">Datos Legales del Cliente</h4>
                
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Nombre Completo del Cliente: D./Dña.</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">DNI / CIF o Pasaporte</label>
                    <input
                      type="text"
                      value={clientDni}
                      onChange={(e) => setClientDni(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Domicilio Fiscal o Residencia</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Project Price Configuration */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-200">Condiciones Económicas y Precios</h4>
                
                <div>
                  <label className="text-[9px] font-mono text-[#D4AF37] block mb-1 flex justify-between">
                    <span>Precio Base (Pago Único) €</span>
                    <span>Genera calculos para cuotas</span>
                  </label>
                  <input
                    type="number"
                    value={priceSingle}
                    onChange={(e) => handleBasePriceChange(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-[#D4AF37]/20 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-900 space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold block text-slate-400">Modalidad de Pago seleccionada:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedModality('single')}
                      className={`py-2 px-1 text-[10px] font-mono rounded-xl border text-center transition ${
                        selectedModality === 'single' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-black border-transparent text-slate-500'
                      }`}
                    >
                      Pago Único
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModality('fin3')}
                      className={`py-2 px-1 text-[10px] font-mono rounded-xl border text-center transition ${
                        selectedModality === 'fin3' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-black border-transparent text-slate-500'
                      }`}
                    >
                      3 Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModality('fin4')}
                      className={`py-2 px-1 text-[10px] font-mono rounded-xl border text-center transition ${
                        selectedModality === 'fin4' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-black border-transparent text-slate-500'
                      }`}
                    >
                      4 Meses
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-2">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">Plazo de entrega (Días hábiles)</label>
                    <input
                      type="text"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">Tribunales / Sede Judicial</label>
                    <input
                      type="text"
                      value={courtCity}
                      onChange={(e) => setCourtCity(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Date and Location block */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-200">Lugar y Fecha de Firma</h4>
                
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Firmado en (Ciudad)</label>
                  <input
                    type="text"
                    value={signingCity}
                    onChange={(e) => setSigningCity(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">Día</label>
                    <input
                      type="text"
                      value={signingDay}
                      onChange={(e) => setSigningDay(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">Mes</label>
                    <input
                      type="text"
                      value={signingMonth}
                      onChange={(e) => setSigningMonth(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">Año</label>
                    <input
                      type="text"
                      value={signingYear}
                      onChange={(e) => setSigningYear(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Customize Prestadores */}
              <div className="bg-[#080808] border border-neutral-900 p-3 rounded-2xl space-y-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Prestadores Asociados (Althera)</span>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={prestador1Name}
                      onChange={(e) => setPrestador1Name(e.target.value)}
                      placeholder="Socio 1 Name"
                      className="bg-black border border-neutral-900 rounded-lg p-2 text-[10px] text-slate-300 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={prestador1Dni}
                      onChange={(e) => setPrestador1Dni(e.target.value)}
                      placeholder="Socio 1 DNI"
                      className="bg-black border border-neutral-900 rounded-lg p-2 text-[10px] text-slate-300 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={prestador2Name}
                      onChange={(e) => setPrestador2Name(e.target.value)}
                      placeholder="Socio 2 Name"
                      className="bg-black border border-neutral-900 rounded-lg p-2 text-[10px] text-slate-300 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={prestador2Dni}
                      onChange={(e) => setPrestador2Dni(e.target.value)}
                      placeholder="Socio 2 DNI"
                      className="bg-black border border-neutral-900 rounded-lg p-2 text-[10px] text-slate-300 focus:outline-none"
                    />
                  </div>
                  
                  {/* Default Signature Toggle Selection with Golden Accent */}
                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                    <input
                      type="checkbox"
                      id="includeDefaultSignatures"
                      checked={includeDefaultSignatures}
                      onChange={(e) => setIncludeDefaultSignatures(e.target.checked)}
                      className="accent-amber-500 rounded border-neutral-800 bg-black cursor-pointer w-3.5 h-3.5"
                    />
                    <label htmlFor="includeDefaultSignatures" className="text-[10px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer select-none transition">
                      Incluir firmas por defecto (Carlos e Ignacio)
                    </label>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* --- INVOICE FORM --- */
            <div className="space-y-4 font-sans text-left">
              
              {/* Client Sync Option for Invoices */}
              <div className="bg-[#0c0c0c] border border-amber-500/10 p-3 rounded-2xl">
                <label className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5" /> Vincular a CRM de Althera
                </label>
                <select
                  value={invoiceClientId}
                  onChange={(e) => setInvoiceClientId(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">- Seleccionar Cliente CRM -</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.company !== 'Independent' ? c.company : c.name}</option>
                  ))}
                </select>
              </div>

              {/* Cliente Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200">Detalles del Destinatario de Factura</h4>
                
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Nombre Comercial / Cliente</label>
                  <input
                    type="text"
                    value={invoiceClientName}
                    onChange={(e) => setInvoiceClientName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">CIF / DNI Cliente</label>
                    <input
                      type="text"
                      value={invoiceClientDni}
                      onChange={(e) => setInvoiceClientDni(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">Email Cliente</label>
                    <input
                      type="email"
                      value={invoiceClientEmail}
                      onChange={(e) => setInvoiceClientEmail(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Dirección Fiscal Cliente</label>
                  <input
                    type="text"
                    value={invoiceClientAddress}
                    onChange={(e) => setInvoiceClientAddress(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              {/* Invoice Numbers & Date */}
              <div className="grid grid-cols-2 gap-3 border-t border-neutral-900 pt-3">
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Número de Factura</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">IVA Aplicado (%)</label>
                  <select
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100"
                  >
                    <option value={21}>21% IVA General</option>
                    <option value={10}>10% IVA Reducido</option>
                    <option value={4}>4% IVA Superreducido</option>
                    <option value={0}>0% IVA Exento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Vencimiento</label>
                  <input
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono text-slate-400 block mb-1">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-slate-100"
                >
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="bizum">Bizum</option>
                  <option value="cash">Efectivo (Cash)</option>
                  <option value="ingreso_bancario">Ingreso Bancario</option>
                </select>
              </div>

              {/* Invoice Concept Items Line Items manager */}
              <div className="border-t border-neutral-900 pt-3 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Conceptos Facturados</span>
                  <div className="flex items-center gap-1.5">
                    {invoiceItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setInvoiceItems([])}
                        className="px-2 py-1 text-[10px] font-mono bg-red-950/20 hover:bg-red-950/45 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        title="Eliminar todos los conceptos de la lista"
                      >
                        <Trash2 className="w-3 h-3" />
                        Vaciar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddInvoiceItem}
                      className="px-2.5 py-1 text-[10px] font-mono bg-neutral-950 hover:bg-neutral-900 border border-amber-500/30 text-amber-400 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Añadir Línea
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {invoiceItems.length === 0 && (
                    <div className="text-center py-5 px-3 bg-neutral-950 border border-dashed border-neutral-850 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-mono italic">No hay conceptos de factura cargados manualmente.</p>
                    </div>
                  )}
                  {invoiceItems.map((item, idx) => (
                    <div key={item.id} className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-900 space-y-2 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-amber-500/70 font-semibold uppercase">Línea de Concepto #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                        placeholder="Descripción"
                        className="w-full bg-black border border-neutral-900 rounded-lg p-1.5 text-xs text-slate-350"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-mono text-slate-500">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                            className="w-full bg-black border border-neutral-900 rounded-lg p-1.5 text-xs text-center text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-mono text-slate-500">Precio Unitario (€)</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                            className="w-full bg-black border border-neutral-900 rounded-lg p-1.5 text-xs text-center text-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment info notes */}
              <div className="space-y-3.5 border-t border-white/5 pt-3.5 mt-2">
                <span className="text-[10px] font-mono text-amber-500/85 uppercase tracking-wider font-semibold">Datos Bancarios de Transferencia</span>
                <div>
                  <label className="text-[8px] font-mono text-slate-500 block mb-1">Beneficiario</label>
                  <input
                    type="text"
                    value={bankBeneficiary}
                    onChange={(e) => setBankBeneficiary(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-mono text-slate-500 block mb-1">IBAN de Ingreso</label>
                  <input
                    type="text"
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-slate-105 select-all font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-mono text-slate-500 block mb-1">BIC / SWIFT</label>
                    <input
                      type="text"
                      value={bankSwift}
                      onChange={(e) => setBankSwift(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-slate-500 block mb-1">BIC Banco Corresponsal</label>
                    <input
                      type="text"
                      value={bankCorrespondentBic}
                      onChange={(e) => setBankCorrespondentBic(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-mono text-slate-500 block mb-1">Nombre y Dirección del Banco</label>
                  <textarea
                    rows={2}
                    value={bankNameAddress}
                    onChange={(e) => setBankNameAddress(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-slate-100 resize-none"
                  />
                </div>
              </div>

              {/* Ajustes de Visibilidad de Factura */}
              <div className="space-y-3.5 border-t border-white/5 pt-3.5 mt-2">
                <span className="text-[10px] font-mono text-amber-500/85 uppercase tracking-wider font-semibold">Visibilidad de Secciones</span>
                
                <div className="flex flex-col gap-2 bg-[#0c0c0c] border border-neutral-900 rounded-xl p-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showProviderInfo} 
                      onChange={(e) => setShowProviderInfo(e.target.checked)}
                      className="rounded border-neutral-800 bg-neutral-950 text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                    />
                    <span>Mostrar Prestador del Servicio</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer mt-1">
                    <input 
                      type="checkbox" 
                      checked={showPaymentInfo} 
                      onChange={(e) => setShowPaymentInfo(e.target.checked)}
                      className="rounded border-neutral-800 bg-neutral-950 text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                    />
                    <span>Mostrar Información de Pago</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer mt-1">
                    <input 
                      type="checkbox" 
                      checked={showDueDate} 
                      onChange={(e) => setShowDueDate(e.target.checked)}
                      className="rounded border-neutral-800 bg-neutral-950 text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                    />
                    <span>Mostrar Fecha de Vencimiento</span>
                  </label>
                </div>
              </div>

              {/* Información del Prestador de Servicio */}
              {showProviderInfo && (
                <div className="space-y-4 border-t border-white/5 pt-3.5 mt-2 transition-all">
                  <div className="flex justify-between items-center text-left">
                    <span className="text-[10px] font-mono text-amber-500/85 uppercase tracking-wider font-semibold">Editar Prestadores del Servicio ({providers.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newProvider = {
                          id: Math.random().toString(36).substring(2, 9),
                          name: 'Nuevo Prestador / Socio',
                          cif: 'DNI o CIF',
                          address: 'Dirección Fiscal',
                          postalCodeCity: 'CP - Ciudad, País',
                          email: 'email@althera.io',
                          isActive: true
                        };
                        setProviders(prev => [...prev, newProvider]);
                      }}
                      className="px-2.5 py-1 text-[9px] font-mono bg-neutral-950 hover:bg-neutral-900 border border-amber-500/30 text-amber-400 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Añadir Prestador
                    </button>
                  </div>
                  
                  {providers.length === 0 ? (
                    <div className="text-center py-4 bg-neutral-950 border border-dashed border-neutral-850 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-mono italic">No hay ningún prestador configurado. Añade al menos uno.</p>
                    </div>
                  ) : (
                    <div className="max-h-[320px] overflow-y-auto space-y-3.5 pr-1">
                      {providers.map((p) => (
                        <div key={p.id} className="p-3 bg-[#0c0c0c] border border-neutral-900 rounded-xl space-y-2.5 relative text-left">
                          <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                            <label className="flex items-center gap-1.5 text-[10px] font-medium text-slate-200 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={p.isActive} 
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setProviders(prev => prev.map(item => item.id === p.id ? { ...item, isActive: val } : item));
                                }}
                                className="rounded border-neutral-800 bg-neutral-950 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                              />
                              <span className="font-bold">Socio Activo en Factura</span>
                            </label>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setProviders(prev => prev.filter(item => item.id !== p.id));
                              }}
                              className="text-slate-500 hover:text-red-400 transition cursor-pointer border-none p-1"
                              title="Eliminar Prestador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="text-[8px] font-mono text-slate-500 block mb-0.5">Nombre / Razón Social Prestador</label>
                              <input
                                type="text"
                                value={p.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProviders(prev => prev.map(item => item.id === p.id ? { ...item, name: val } : item));
                                }}
                                className="w-full bg-neutral-950 border border-neutral-850 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[8px] font-mono text-slate-500 block mb-0.5">CIF / NIF / DNI</label>
                                <input
                                  type="text"
                                  value={p.cif}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setProviders(prev => prev.map(item => item.id === p.id ? { ...item, cif: val } : item));
                                  }}
                                  className="w-full bg-neutral-950 border border-neutral-850 rounded-lg px-2.5 py-1 text-xs text-[#b8b8b8]"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] font-mono text-slate-500 block mb-0.5">Email Administración</label>
                                <input
                                  type="email"
                                  value={p.email}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setProviders(prev => prev.map(item => item.id === p.id ? { ...item, email: val } : item));
                                  }}
                                  className="w-full bg-neutral-950 border border-neutral-850 rounded-lg px-2.5 py-1 text-xs text-[#c1c1c1]"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[8px] font-mono text-slate-500 block mb-0.5">Dirección Fiscal</label>
                              <input
                                type="text"
                                value={p.address}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProviders(prev => prev.map(item => item.id === p.id ? { ...item, address: val } : item));
                                }}
                                className="w-full bg-neutral-950 border border-neutral-850 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                              />
                            </div>

                            <div>
                              <label className="text-[8px] font-mono text-slate-500 block mb-0.5">Código Postal y Ciudad</label>
                              <input
                                type="text"
                                value={p.postalCodeCity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProviders(prev => prev.map(item => item.id === p.id ? { ...item, postalCodeCity: val } : item));
                                }}
                                className="w-full bg-neutral-950 border border-neutral-850 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VINCULACIÓN DE TRANSACCIONES */}
              <div className="space-y-3.5 border-t border-white/5 pt-3.5 mt-2">
                <div className="flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-mono text-amber-500/85 uppercase tracking-wider font-semibold">Vincular Transacciones a Factura</span>
                </div>
                
                <div className="bg-[#0c0c0c] border border-neutral-900 rounded-xl p-3.5 space-y-3 text-left">
                  
                  {/* Select menu from actual database transactions */}
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">Buscar y Seleccionar de Finanzas</label>
                    <select
                      value={selectedTxToLink}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTxToLink(val);
                        if (val) {
                          handleLinkTransactionById(val);
                          setSelectedTxToLink('');
                        }
                      }}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-slate-100 cursor-pointer"
                    >
                      <option value="">-- Seleccionar de la lista --</option>
                      {allTransactions
                        .filter(t => !linkedTxIds.includes(t.id))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.description.substring(0, 30)}... ({t.amount.toLocaleString('es-ES')} €) - ID: {t.id}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Manual entry of transaction ID - EXACTLY request matches! */}
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">O Introduce el ID de Transacción manualmente</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={txIdInputText}
                        onChange={(e) => setTxIdInputText(e.target.value)}
                        placeholder="Pegar ID p. ej. tx_..."
                        className="flex-1 bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-slate-101 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleLinkTransactionById(txIdInputText)}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 border-none"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Vincular</span>
                      </button>
                    </div>
                  </div>

                  {/* Display Currently Linked Transactions */}
                  <div className="pt-2 border-t border-neutral-850/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Transacciones Vinculadas ({linkedTxIds.length})</span>
                      {linkedTxIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setLinkedTxIds([])}
                          className="px-1.5 py-0.5 text-[8px] font-mono bg-red-950/20 hover:bg-red-950/45 border border-red-500/20 text-red-400 rounded transition cursor-pointer font-bold uppercase"
                          title="Desvincular todas las transacciones vinculadas"
                        >
                          Desvincular Todas
                        </button>
                      )}
                    </div>
                    {linkedTxIds.length === 0 ? (
                      <p className="text-[10px] text-slate-600 font-mono italic">Ninguna transacción vinculada aún.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {linkedTxIds.map(id => {
                          const tx = allTransactions.find(t => t.id === id) || {
                            id,
                            description: `Transacción manual #${id}`,
                            amount: 0,
                            date: '',
                            type: 'income',
                            status: 'pending'
                          };
                          return (
                            <div key={id} className="flex justify-between items-center bg-neutral-950 px-2.5 py-2 rounded-lg border border-neutral-850/40 text-[11px] font-mono">
                              <div className="truncate flex-1 mr-2 text-left">
                                <div className="text-slate-100 font-bold truncate text-[11px]">{tx.description}</div>
                                <div className="text-[9px] text-slate-500 flex gap-1 items-center font-mono uppercase mt-0.5">
                                  <span className="text-slate-400 select-all font-bold">{id}</span>
                                  <span>•</span>
                                  <span className={tx.type === 'income' ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
                                    {tx.type === 'income' ? '+' : '-'}{tx.amount} €
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUnlinkTransaction(id)}
                                className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-all cursor-pointer border-none"
                                title="Desvincular Transacción"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Botón Guardar Factura */}
              <div className="pt-4 mt-4 border-t border-neutral-900 space-y-2">
                <button
                  type="button"
                  onClick={handleSaveInvoiceToDb}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-slate-950 py-2.5 px-5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95 border-none"
                >
                  <Save className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <span>Guardar Factura</span>
                </button>
                {saveMessage && (
                  <p className={`text-[10px] text-center font-semibold mt-1.5 animate-fade-in ${saveMessage.includes('con éxito') || saveMessage.includes('correctamente') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {saveMessage}
                  </p>
                )}
              </div>

            </div>
          )}
        </div>

        {/* RIGHT COMPONENT: Authentic A4 Print Preview Pane with custom framing (7 cols) */}
        <div className="xl:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-2 font-mono">
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider">
              <Info className="w-3.5 h-3.5 text-amber-500" />
              <span>Vista de Impresión A4 de Althera</span>
            </span>
            <span className="text-[10px] text-slate-500 italic">Pre visualizado a escala real</span>
          </div>

          {/* Standard A4 Paper Wrapper. It has custom printing styling with print-area selectors */}
          <div 
            id="print-area" 
            className="w-full bg-white text-neutral-900 font-serif p-8 md:p-14 min-h-[1120px] rounded-3xl shadow-2xl relative border border-amber-500/10 text-left select-all"
            style={{ fontFamily: 'Georgia, serif', lineHeight: '1.6' }}
          >
            {/* Header: Centered Logo representing Althera Solutions */}
            <div className="flex flex-col items-center justify-center mb-10 border-b border-neutral-200 pb-8 text-center bg-white">
              <img 
                src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" 
                alt="Althera Brand Header Logo" 
                className="h-16 w-auto object-contain mb-3 bg-transparent"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] tracking-widest uppercase font-sans font-bold text-[#8a7031]">CREAMOS SOLUCIONES. IMPULSAMOS RESULTADOS.</span>
            </div>

            {activeTab === 'contract' ? (
              /* ==================== CONTRACT HTML SHEET ==================== */
              <div className="space-y-6 text-xs text-justify text-neutral-800 tracking-normal leading-relaxed">
                
                {/* Contract Title */}
                <h3 className="text-center font-bold text-sm uppercase tracking-wide text-neutral-950 font-sans mb-2">
                  CONTRATO DE PRESTACIÓN DE SERVICIOS DE DESARROLLO WEB
                </h3>
                <div className="text-center text-[10px] font-mono text-neutral-550 mb-6 uppercase tracking-wider">
                  CÓDIGO DE REGISTRO: <span className="font-bold text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">{selectedContractIdInDb || 'BORRADOR_PENDIENTE'}</span>
                </div>

                {/* Reunidos Statement info */}
                <p>
                  <strong className="font-sans font-semibold text-neutral-950">REUNIDOS</strong> De una parte: 
                  <strong> {prestador1Name}</strong>, con DNI nº <strong>{prestador1Dni}</strong> y 
                  <strong> {prestador2Name}</strong>, con DNI nº <strong>{prestador2Dni}</strong>, actuando conjuntamente como prestadores de servicios, en adelante, <strong className="font-sans">“LOS PRESTADORES”</strong>.
                </p>
                
                <p>
                  Y de otra parte: 
                  <strong> {clientName || '_______________'}</strong>, con DNI/CIF nº 
                  <strong> {clientDni || '_______________'}</strong>, con domicilio en 
                  <strong> {clientAddress || '_______________'}</strong>, Teléfono: 
                  <strong> {clientPhone || '_______________'}</strong>, Correo electrónico: 
                  <strong> {clientEmail || '_______________'}</strong>, en adelante, <strong className="font-sans">“EL CLIENTE”</strong>.
                </p>

                {/* Objeto */}
                <div>
                  <h4 className="font-sans font-bold text-neutral-950 uppercase tracking-wide text-[11px] mb-2">
                    1. OBJETO DEL CONTRATO
                  </h4>
                  <p>
                    LOS PRESTADORES se comprometen a desarrollar para EL CLIENTE una página web profesional que incluirá las siguientes características en su entrega final:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Diseño y desarrollo de interfaz web a medida.</li>
                    <li>Adaptación inteligente a todo tipo de dispositivos móviles (Responsividad).</li>
                    <li>Sistema de reservas / citas integrado y panel autogestionable.</li>
                    <li>Configuración de SEO básico inicial para indexado rápido.</li>
                    <li>1 mes de soporte de posicionamiento web gratuito.</li>
                  </ul>
                </div>

                {/* Precios */}
                <div>
                  <h4 className="font-sans font-bold text-neutral-950 uppercase tracking-wide text-[11px] mb-2">
                    2. PRECIO Y FORMAS DE PAGO
                  </h4>
                  <p>
                    El precio del servicio de desarrollo web pactado asciende a <strong>{priceSingle} €</strong> mediante pago único. Con el fin de facilitar la financiación y el correcto acceso tecnológico de EL CLIENTE, se ofrecen opcionalmente las siguientes modalidades de abono diferido:
                  </p>

                  <div className="mt-3 pl-4 space-y-2 border-l-2 border-[#D4AF37] font-sans text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full border border-black flex items-center justify-center font-bold text-[8px] bg-neutral-100">
                        {selectedModality === 'single' ? '✓' : ''}
                      </span>
                      <span>
                        <strong>OPCIÓN A – PAGO ÚNICO:</strong> Importe total de <strong>{priceSingle} €</strong> en un único abono al formalizar la firma.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full border border-black flex items-center justify-center font-bold text-[8px] bg-neutral-100">
                        {selectedModality === 'fin3' ? '✓' : ''}
                      </span>
                      <span>
                        <strong>OPCIÓN B – FINANCIACIÓN A 3 MESES:</strong> Importe total financiado de <strong>{fin3Total} €</strong> devengados en 3 cuotas mensuales de <strong>{fin3Cuota} €</strong> (Coste de financiación acumulado: {fin3Coste} €).
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full border border-black flex items-center justify-center font-bold text-[8px] bg-neutral-100">
                        {selectedModality === 'fin4' ? '✓' : ''}
                      </span>
                      <span>
                        <strong>OPCIÓN C – FINANCIACIÓN A 4 MESES:</strong> Importe total financiado de <strong>{fin4Total} €</strong> devengados en 4 cuotas mensuales de <strong>{fin4Cuota} €</strong> (Coste de financiación acumulado: {fin4Coste} €).
                      </span>
                    </div>
                  </div>

                  <p className="mt-3">
                    <strong className="font-sans">Modalidad formalmente elegida por EL CLIENTE: </strong> 
                    <span className="bg-neutral-100 px-2.5 py-0.5 rounded border border-neutral-300 font-sans font-bold">
                      {selectedModality === 'single' && 'Opción A - Pago único de ' + priceSingle + ' €'}
                      {selectedModality === 'fin3' && 'Opción B - Financiación 3 meses de ' + fin3Total + ' €'}
                      {selectedModality === 'fin4' && 'Opción C - Financiación 4 meses de ' + fin4Total + ' €'}
                    </span>
                  </p>
                </div>

                {/* Inicio de los trabajos */}
                <div>
                  <h4 className="font-sans font-bold text-neutral-950 uppercase tracking-wide text-[11px] mb-1">
                    3. INICIO DE LOS TRABAJOS
                  </h4>
                  <p>
                    Los trabajos técnicos requeridos no comenzarán formalmente hasta que EL CLIENTE haya abonado la primera cuota o el importe de pago único correspondiente a la modalidad de adquisición seleccionada en la cláusula segunda. El abono efectivo inicial ratifica la conformidad absoluta con los términos expuestos en este instrumento.
                  </p>
                </div>

                {/* Clausulado extra */}
                <div>
                  <h4 className="font-sans font-bold text-neutral-950 uppercase tracking-wide text-[11px] mb-1">
                    4. COMPROMISO DE PAGO Y DEUDA
                  </h4>
                  <p>
                    EL CLIENTE reconoce de forma líquida, exigible e incondicional adeudar el total correspondiente de las cuotas indicadas. La cancelación unilateral de los trabajos iniciados por decisión ajena a LOS PRESTADORES no extingue ni aminora la obligación contractual de pago total pendiente correspondiente.
                  </p>
                </div>

                <div>
                  <h4 className="font-sans font-bold text-neutral-950 uppercase tracking-wide text-[11px] mb-1">
                    5. IMPAGOS Y COBROS
                  </h4>
                  <p>
                    En caso de incurrir en retraso superior a 7 días hábiles sobre los plazos pactados en cualquiera de las cuotas mensuales, LOS PRESTADORES quedan facultados de pleno derecho para suspender temporalmente el hosting, servicio técnico y trabajos concurrentes asociados hasta el abono completo del devengo.
                  </p>
                </div>

                {/* Entrega */}
                <div>
                  <h4 className="font-sans font-bold text-neutral-950 uppercase tracking-wide text-[11px] mb-1">
                    6. PLAZO DE ENTREGA
                  </h4>
                  <p>
                    El plazo de entrega estimado del proyecto final será de <strong>{deliveryDays} días hábiles</strong>, computables a partir del día hábil posterior a la recepción de toda la información corporativa, accesos iniciales y materiales requeridos por parte de EL CLIENTE.
                  </p>
                </div>

                {/* Servicios adicionales */}
                <div>
                  <h4 className="font-sans font-bold text-neutral-950 uppercase tracking-wide text-[11px] mb-1">
                    7. SERVICIOS Y CUOTAS ADICIONALES
                  </h4>
                  <p>
                    EL CLIENTE podrá encomendar trabajos opcionales y de soporte post-lanzamiento tales como posicionamiento SEO periódico, marketing en Facebook Ads, mantenimiento preventivo de código, agentes o integraciones de Inteligencia Artificial avanzadas y automatizaciones. Estos servicios dispondrán de una tarifa de abono mensual estándar de <strong>97 €/mes</strong>, salvo estipulaciones específicas suscritas por separado.
                  </p>
                </div>

                {/* Tribunales */}
                <div>
                  <h4 className="font-sans font-bold text-neutral-950 uppercase tracking-wide text-[11px] mb-1">
                    8. RESOLUCIÓN DE CONFLICTOS
                  </h4>
                  <p>
                    Para dirimir cualquier controversia o discrepancia derivada del cumplimiento, ejecución o interpretación de este documento, las partes contratantes se someten formalmente a la exclusiva jurisdicción de los Juzgados y Tribunales de la ciudad de <strong>{courtCity}</strong>, renunciando de común acuerdo a cualquier fuero local propio alternativo que pudiera corresponderles.
                  </p>
                </div>

                {/* Firma date block */}
                <p className="pt-2 text-right">
                  En <strong>{signingCity}</strong>, a <strong>{signingDay}</strong> de <strong>{signingMonth}</strong> de <strong>{signingYear}</strong>.
                </p>

                {/* Signature Board blocks */}
                <div className="pt-8 grid grid-cols-2 gap-12 font-sans bg-white">
                  
                  {/* Contractors layout */}
                  <div className="space-y-6">
                    <p className="font-bold border-b border-neutral-300 pb-1 text-[10px] text-neutral-500 uppercase tracking-wider block">
                      LOS PRESTADORES (Althera)
                    </p>
                    <div className="space-y-4">
                      <div className="relative">
                        <p className="font-semibold text-neutral-900 text-xs">D. Carlos Ronco Meneses</p>
                        <p className="text-[10px] text-neutral-500">DNI: {prestador1Dni}</p>
                        <div className="h-14 mt-1 relative border-b border-dotted border-neutral-400 max-w-[200px]">
                          {includeDefaultSignatures && (
                            <div className="absolute bottom-2.5 left-1 pointer-events-none select-none">
                              <span 
                                style={{ fontFamily: '"Mr De Haviland", cursive' }}
                                className="font-signature1 text-[52px] text-[#1d3e6d] inline-block transform -rotate-3 leading-none drop-shadow-sm whitespace-nowrap"
                              >
                                Carlos Ronco
                              </span>
                              <span className="block text-[6px] text-neutral-400 font-mono tracking-tight mt-1.5 pl-1">
                                Firmado digitalmente • Althera ID: CR-0910
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="relative mt-2">
                        <p className="font-semibold text-neutral-900 text-xs">D. Ignacio Martin Gonzalez</p>
                        <p className="text-[10px] text-neutral-500">DNI: {prestador2Dni}</p>
                        <div className="h-14 mt-1 relative border-b border-dotted border-neutral-400 max-w-[200px]">
                          {includeDefaultSignatures && (
                            <div className="absolute bottom-2.5 left-1 pointer-events-none select-none">
                              <span 
                                style={{ fontFamily: '"Herr Von Muellerhoff", cursive' }}
                                className="font-signature2 text-[58px] text-[#1a3861] inline-block transform rotate-2 leading-none drop-shadow-sm whitespace-nowrap"
                              >
                                I. Martin Gonzalez
                              </span>
                              <span className="block text-[6px] text-neutral-400 font-mono tracking-tight mt-1.5 pl-1">
                                Firmado digitalmente • Althera ID: IM-7593
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client Layout */}
                  <div className="space-y-6">
                    <p className="font-bold border-b border-neutral-300 pb-1 text-[10px] text-neutral-500 uppercase tracking-wider block">
                      EL CLIENTE
                    </p>
                    <div>
                      <p className="font-semibold text-neutral-900 text-xs">{clientName || '_________________________'}</p>
                      <p className="text-[10px] text-neutral-500">DNI/CIF: {clientDni || '_____________________'}</p>
                      <div className="mt-8 border border-neutral-200 bg-neutral-50/50 p-6 text-center text-[10px] text-neutral-400 rounded-xl border-dashed">
                        <span>Espacio reservado para firma manuscrita / certificado digital</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              /* ==================== INVOICE HTML SHEET ==================== */
              <div className="space-y-6 text-xs text-neutral-800 tracking-normal leading-relaxed">
                
                {/* Meta data and Company Info (Top Split) */}
                <div className="grid grid-cols-2 gap-8 font-sans border-b border-neutral-200 pb-6 bg-white">
                  <div>
                    {showProviderInfo ? (
                      <div className="space-y-4">
                        <h3 className="font-sans font-bold text-xs text-[#8a7031] uppercase tracking-wider">PRESTADOR(ES) DEL SERVICIO</h3>
                        <div className="grid grid-cols-1 gap-3.5">
                          {providers.filter(p => p.isActive).map((p) => (
                            <div key={p.id} className="text-left border-l-2 border-[#D4AF37]/50 pl-2">
                              <p className="font-bold text-slate-900 text-[11px]">{p.name}</p>
                              <p className="text-slate-500 text-[10px] mt-0.5 leading-normal">
                                <span>CIF/NIF/DNI: {p.cif}</span><br />
                                <span>{p.address}</span><br />
                                <span>{p.postalCodeCity}</span><br />
                                <span>{p.email}</span>
                              </p>
                            </div>
                          ))}
                          {providers.filter(p => p.isActive).length === 0 && (
                            <p className="text-[10px] text-slate-400 italic font-mono">No hay prestadores activos seleccionados.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-[80px]"></div>
                    )}
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold uppercase tracking-wider text-neutral-950">FACTURA</h2>
                    <p className="text-[11px] font-mono text-amber-600 font-bold mt-1">Nº {invoiceNumber}</p>
                    <p className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                      <span><strong>Fecha Emisión:</strong> {invoiceDate}</span>
                      {showDueDate && (
                        <>
                          <br />
                          <span><strong>Vencimiento:</strong> {invoiceDueDate}</span>
                        </>
                      )}
                      <br />
                      <span><strong>Método de Pago:</strong> {
                        paymentMethod === 'transferencia' ? 'Transferencia Bancaria' :
                        paymentMethod === 'bizum' ? 'Bizum' :
                        paymentMethod === 'cash' ? 'Efectivo (Cash)' :
                        'Ingreso Bancario'
                      }</span>
                    </p>
                  </div>
                </div>

                {/* Client info on Invoice */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-150 grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-neutral-850">
                  <div>
                    <h4 className="font-bold text-neutral-950 text-xs mt-1">{invoiceClientName}</h4>
                    <span className="text-[10px] block mt-0.5 font-mono text-neutral-500">{invoiceClientDni}</span>
                  </div>
                  <div className="md:text-right md:pt-4 text-[10px] text-neutral-600 leading-relaxed">
                    <span>{invoiceClientAddress}</span><br />
                    <span className="font-mono text-neutral-500">{invoiceClientEmail}</span>
                  </div>
                </div>

                {/* Invoice Items Table and Total */}
                <div className="pt-2 font-sans">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-300 font-bold uppercase text-[9px] text-[#8a7031] tracking-wider">
                        <th className="py-2 px-1">Concepto / Servicio Técnico Requerido</th>
                        <th className="py-2 px-2 text-center w-16">Cant.</th>
                        <th className="py-2 px-3 text-right w-24">Precio</th>
                        <th className="py-2 px-1 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {invoiceItems.map((item) => (
                        <tr key={item.id} className="text-neutral-800">
                          <td className="py-3 px-1 leading-relaxed">
                            <span className="font-semibold text-neutral-900">{item.description}</span>
                          </td>
                          <td className="py-3 px-2 text-center font-mono">{item.quantity}</td>
                          <td className="py-3 px-3 text-right font-mono">{item.unitPrice.toFixed(2)} €</td>
                          <td className="py-3 px-1 text-right font-bold font-mono text-neutral-950">{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                        </tr>
                      ))}
                      {linkedTransactions.map((tx) => {
                        const netPrice = tx.amount / (1 + taxPercentage / 100);
                        return (
                          <tr key={tx.id} className="text-neutral-805 bg-amber-500/5 font-sans">
                            <td className="py-3 px-1 leading-relaxed">
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-neutral-900 flex items-center gap-1.5 flex-wrap">
                                  <span>{tx.description}</span>
                                  <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-extrabold tracking-wider ${
                                    tx.status === 'pending' || tx.status === 'draft'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    {tx.status === 'pending' || tx.status === 'draft' ? 'Pendiente' : 'Cobrado'}
                                  </span>
                                </span>
                                <span className="text-[9px] text-neutral-400 font-mono">Transacción Vinculada - ID: {tx.id}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center font-mono">1</td>
                            <td className="py-3 px-3 text-right font-mono">{netPrice.toFixed(2)} €</td>
                            <td className="py-3 px-1 text-right font-bold font-mono text-neutral-950">{netPrice.toFixed(2)} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Calculation breakdown */}
                <div className="pt-4 border-t border-neutral-300 flex justify-end font-sans">
                  <div className="w-64 space-y-1.5 text-right font-sans text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-mono">{subtotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>IVA ({taxPercentage}%):</span>
                      <span className="font-mono">{taxAmount.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutral-950 text-sm border-t border-neutral-200 pt-2">
                      <span>TOTAL FACTURADO:</span>
                      <span className="font-mono text-amber-700">{total.toFixed(2)} €</span>
                    </div>
                    {totalPendingTransactionsAmount > 0 && (
                      <div className="flex justify-between font-extrabold text-amber-800 text-sm">
                        <span>POR PAGAR (Pendiente):</span>
                        <span className="font-mono text-amber-700">{totalPendingTransactionsAmount.toFixed(2)} €</span>
                      </div>
                    )}
                  </div>
                </div>



                {/* Bottom Legal disclaimer & payment */}
                {showPaymentInfo && (
                  <div className="bg-neutral-50 rounded-xl p-4 border border-dashed border-neutral-200 text-[10px] text-neutral-500 font-sans space-y-2 mt-6">
                    <p className="font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1 border-b border-neutral-200 pb-1">
                      <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                      <span>Instrucciones de Pago (Transferencia Bancaria SEPA/SWIFT)</span>
                    </p>
                    <p className="text-[9px] leading-snug">
                      Rogamos efectúen el ingreso por transferencia por el importe total indicado a la cuenta de Revolut facilitada a continuación, indicando el número de factura <strong>{invoiceNumber}</strong> como referencia:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 bg-white border border-neutral-150 rounded-xl p-3 text-[9.5px]">
                      <div>
                        <span className="text-neutral-400">Beneficiario:</span><br />
                        <strong className="text-neutral-800 font-semibold">{bankBeneficiary}</strong>
                      </div>
                      <div>
                        <span className="text-neutral-400">IBAN Euro:</span><br />
                        <strong className="text-neutral-800 font-mono select-all font-semibold">{paymentDetails}</strong>
                      </div>
                      <div>
                        <span className="text-neutral-400">Código BIC/SWIFT:</span><br />
                        <strong className="text-neutral-800 font-mono font-semibold">{bankSwift}</strong>
                      </div>
                      <div>
                        <span className="text-neutral-400">BIC del Banco Corresponsal:</span><br />
                        <strong className="text-neutral-800 font-mono font-semibold">{bankCorrespondentBic}</strong>
                      </div>
                      <div className="md:col-span-2 border-t border-neutral-100 pt-1.5 mt-1">
                        <span className="text-neutral-400">Nombre y Dirección del Banco:</span><br />
                        <span className="text-neutral-700">{bankNameAddress}</span>
                      </div>
                    </div>

                    <p className="pt-1.5 text-[9px] italic border-t border-neutral-200 mt-2">
                      Althera Solutions, S.L. inscrita en el Registro Mercantil de Ibiza, Tomo 1450, Folio 120, Hoja IB-45600. Condición de vencimiento a 15 días tras emisión del servicio.
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
