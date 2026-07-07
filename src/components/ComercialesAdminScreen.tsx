import React, { useState, useMemo } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Check, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Activity, 
  CheckCircle, 
  BarChart3, 
  Target, 
  Briefcase, 
  Percent, 
  ChevronRight, 
  Calendar, 
  Users, 
  PieChart, 
  ArrowRight,
  XCircle,
  AlertCircle,
  PhoneCall,
  Layers,
  Sparkles,
  FileText,
  History,
  CreditCard,
  Coins,
  Clock,
  Globe,
  RefreshCw
} from 'lucide-react';
import { ComercialAccount, ComercialLead, ColdCallingLead, ClientContact, Screen } from '../types';
import DossierModal from './DossierModal';

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

interface ComercialesAdminScreenProps {
  comercialesList: ComercialAccount[];
  leadsList: ComercialLead[];
  coldLeads?: ColdCallingLead[];
  finTransactions?: any[];
  contacts?: ClientContact[];
  onAddComercial: (comercial: ComercialAccount) => void;
  onUpdateComercial: (account: ComercialAccount) => void;
  onDeleteComercial: (id: string) => void;
  onNavigate?: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
}

type TabType = 'general' | 'individual' | 'gestion';

export default function ComercialesAdminScreen({
  comercialesList,
  leadsList,
  coldLeads = [],
  finTransactions = [],
  contacts = [],
  onAddComercial,
  onUpdateComercial,
  onDeleteComercial,
  onNavigate
}: ComercialesAdminScreenProps) {
  // Tab control
  const [activeTab, setActiveTab] = useState<TabType>('general');
  
  // Selection state for individual salesperson view
  const [selectedComercialId, setSelectedComercialId] = useState<string>(
    comercialesList[0]?.id || ''
  );

  // Form states for adding new commercial
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [stripePayoutLoading, setStripePayoutLoading] = useState(false);
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false);

  // Dialog modal custom implementation to avoid sandboxed iframe native blockings
  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  const triggerAlert = (title: string, message: string) => {
    setCustomDialog({
      isOpen: true,
      type: 'alert',
      title,
      message
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomDialog({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm
    });
  };

  const readStripeJson = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('La API de Stripe no esta disponible. Abre la app desde el servidor Node, no solo como frontend estatico.');
    }
    return response.json();
  };

  const handleConnectComercialStripe = async (comercial: ComercialAccount) => {
    setStripeConnectLoading(true);
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
        throw new Error(data.error || 'No se pudo crear la cuenta Connect');
      }
      onUpdateComercial({
        ...comercial,
        stripeConnectAccountId: data.accountId,
        stripeOnboardingCompleted: data.onboardingCompleted,
        stripePayoutsEnabled: data.payoutsEnabled,
        stripeChargesEnabled: data.chargesEnabled,
      });
      window.open(data.url, '_blank', 'noopener,noreferrer');
      triggerAlert(
        'Onboarding de Stripe abierto',
        'Completa la configuracion de Stripe Connect del comercial. Cuando Stripe active la capacidad de transfers, podras liquidar comisiones reales.'
      );
    } catch (err: any) {
      triggerAlert('Error Stripe Connect', err?.message || 'No se pudo iniciar la conexion con Stripe.');
    } finally {
      setStripeConnectLoading(false);
    }
  };

  const handleLiquidateComercialStripe = async (comercial: ComercialAccount, amount: number) => {
    setStripePayoutLoading(true);
    try {
      const response = await fetch('/api/stripe/create-comercial-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comercialId: comercial.id,
          comercialName: comercial.name,
          amount,
          stripeConnectAccountId: comercial.stripeConnectAccountId,
        }),
      });
      const data = await readStripeJson(response);
      if (!response.ok) {
        throw new Error(data.error || 'Stripe no pudo crear la transferencia');
      }

      const newPayout = {
        id: `pay_${Date.now()}`,
        comercialId: comercial.id,
        amount,
        date: new Date().toISOString(),
        status: 'completed' as const,
        bankAccount: comercial.iban || '',
        bankName: comercial.bankName,
        stripeTransferId: data.transferId,
        stripeConnectAccountId: comercial.stripeConnectAccountId
      };

      onUpdateComercial({
        ...comercial,
        payouts: [...(comercial.payouts || []), newPayout]
      });

      triggerAlert(
        'Transferencia Stripe creada',
        `Stripe ha creado la transferencia ${data.transferId} por ${amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}. El ingreso en banco depende del calendario de payouts de la cuenta conectada.`
      );
    } catch (err: any) {
      triggerAlert('Stripe no ha liquidado', err?.message || 'No se pudo crear la transferencia real en Stripe.');
    } finally {
      setStripePayoutLoading(false);
    }
  };

  // Auto-select first commercial if list changes and none selected
  React.useEffect(() => {
    if (comercialesList.length > 0 && (!selectedComercialId || !comercialesList.some(c => c.id === selectedComercialId))) {
      setSelectedComercialId(comercialesList[0].id);
    }
  }, [comercialesList, selectedComercialId]);

  // Form submit handler
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccess(false);

    const emailTrim = email.trim().toLowerCase();
    
    if (!name.trim()) {
      setErrorMsg('El nombre es requerido.');
      return;
    }
    if (!emailTrim) {
      setErrorMsg('El email es requerido.');
      return;
    }
    if (password.length < 5) {
      setErrorMsg('La contraseña debe tener al menos 5 caracteres.');
      return;
    }
    const alreadyExists = comercialesList.some(c => c.email.toLowerCase() === emailTrim);
    if (alreadyExists) {
      setErrorMsg('Ya existe un comercial registrado con este correo electrónico.');
      return;
    }

    const newComercial: ComercialAccount = {
      id: 'com_' + Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      email: emailTrim,
      password: password,
      phone: phone.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onAddComercial(newComercial);
    setSuccess(true);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');

    // If it's the first commercial created, select it
    if (comercialesList.length === 0) {
      setSelectedComercialId(newComercial.id);
    }

    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

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

    // 2. Find client contacts associated with ANY commercial that are NOT already in leadsList
    const newLeadsFromClients: ComercialLead[] = [];
    contacts.forEach(c => {
      if (c.status === 'Client' || c.status === 'Lead') {
        // Find which commercial this client belongs to
        const comEmail = c.contactedByComercialEmail || c.assignedUserEmail;
        const comName = c.contactedByComercialName;
        
        const matchedCom = (comercialesList || []).find(com => 
          (comEmail && com.email.toLowerCase() === comEmail.toLowerCase()) ||
          (comName && com.name.toLowerCase() === comName.toLowerCase())
        );

        if (matchedCom) {
          // Check if already represented in updated leads list
          const alreadyExists = updated.some(l => 
            (l.email && c.email && l.email.toLowerCase() === c.email.toLowerCase()) ||
            (l.name && c.name && l.name.toLowerCase() === c.name.toLowerCase())
          );

          if (!alreadyExists) {
            const adminSaleTotal = getAdminSaleTotal(c);

            newLeadsFromClients.push({
              id: 'lead_client_sync_' + c.id,
              comercialId: matchedCom.id,
              comercialName: matchedCom.name,
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
  }, [leadsList, contacts, finTransactions, comercialesList]);

  // --- COMPUTE GLOBAL METRICS ---
  const totalCRMLeads = mappedLeadsList.length;
  const wonLeads = mappedLeadsList.filter(l => l.status === 'Ganado');
  const totalVolumeWon = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
  
  const activeLeads = mappedLeadsList.filter(l => ['Pendiente', 'Contactado', 'Negociación'].includes(l.status));
  const activeValue = activeLeads.reduce((sum, l) => sum + (l.value || 0), 0);

  const lostLeads = mappedLeadsList.filter(l => l.status === 'Perdido');
  const globalConversionRate = totalCRMLeads > 0 
    ? Math.round((wonLeads.length / totalCRMLeads) * 100) 
    : 0;

  // Status Distribution
  const statusCounts = {
    Pendiente: mappedLeadsList.filter(l => l.status === 'Pendiente').length,
    Contactado: mappedLeadsList.filter(l => l.status === 'Contactado').length,
    Negociación: mappedLeadsList.filter(l => l.status === 'Negociación').length,
    Ganado: wonLeads.length,
    Perdido: lostLeads.length
  };

  // Temperature Distribution
  const tempCounts = {
    Caliente: mappedLeadsList.filter(l => l.temperature === 'Caliente').length,
    Templado: mappedLeadsList.filter(l => l.temperature === 'Templado').length,
    Frío: mappedLeadsList.filter(l => l.temperature === 'Frío').length,
    SinAsignar: mappedLeadsList.filter(l => !l.temperature).length
  };

  // Cold Calling Stats
  const totalColdLeads = coldLeads.length;
  const coldLeadsAssigned = coldLeads.filter(l => l.assignedToEmail !== 'unassigned').length;
  const totalCallsLogged = coldLeads.reduce((sum, l) => sum + (l.callsCount || 0), 0);
  const coldContacted = coldLeads.filter(l => l.contacted === 'Sí').length;
  const coldContactRate = totalColdLeads > 0 ? Math.round((coldContacted / totalColdLeads) * 100) : 0;

  // Leaderboard of representatives
  const leaderBoard = comercialesList.map(c => {
    const comLeads = mappedLeadsList.filter(l => l.comercialId === c.id);
    const comWon = comLeads.filter(l => l.status === 'Ganado');
    const comWonVol = comWon.reduce((sum, l) => sum + (l.value || 0), 0);
    const comConv = comLeads.length > 0 ? Math.round((comWon.length / comLeads.length) * 100) : 0;
    
    // Cold calling assignments
    const comColdLeads = coldLeads.filter(l => l.assignedToEmail?.toLowerCase() === c.email.toLowerCase());
    const comCallsCount = comColdLeads.reduce((sum, l) => sum + (l.callsCount || 0), 0);

    return {
      comercial: c,
      totalLeads: comLeads.length,
      wonLeads: comWon.length,
      wonVolume: comWonVol,
      conversionRate: comConv,
      coldLeadsCount: comColdLeads.length,
      callsCount: comCallsCount
    };
  }).sort((a, b) => b.wonVolume - a.wonVolume);

  // --- COMPUTE INDIVIDUAL METRICS FOR SELECTED COMERCIAL ---
  const currentComercial = comercialesList.find(c => c.id === selectedComercialId);
  
  const individualLeads = currentComercial 
    ? mappedLeadsList.filter(l => l.comercialId === currentComercial.id) 
    : [];
  
  const indWon = individualLeads.filter(l => l.status === 'Ganado');
  const indLost = individualLeads.filter(l => l.status === 'Perdido');
  const indActive = individualLeads.filter(l => ['Pendiente', 'Contactado', 'Negociación'].includes(l.status));
  
  const indWonVolume = indWon.reduce((sum, l) => sum + (l.value || 0), 0);
  const indActiveVolume = indActive.reduce((sum, l) => sum + (l.value || 0), 0);

  // Computed commission & benefits - Now automatically tiered/escalonated!
  const indInitialTxs = currentComercial ? finTransactions.filter(tx => 
    tx.isInitialSale === true && 
    (tx.comercialId === currentComercial.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === currentComercial.email.toLowerCase()))
  ) : [];
  const indInitialTxsPaid = indInitialTxs.filter(tx => tx.status === 'paid');
  const indInitialSalesVolume = indInitialTxsPaid.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const indCommissionPercentage = currentComercial ? (currentComercial.commissionPercentage ?? getTieredCommission(Math.max(indWon.length, indInitialTxs.length))) : 10;
  const indBenefitsEarned = indInitialSalesVolume * (indCommissionPercentage / 100);
  
  const indConversionRate = individualLeads.length > 0 
    ? Math.round((indWon.length / individualLeads.length) * 100) 
    : 0;

  const indAverageDeal = indWon.length > 0 
    ? Math.round(indWonVolume / indWon.length) 
    : individualLeads.length > 0 
      ? Math.round(individualLeads.reduce((sum, l) => sum + (l.value || 0), 0) / individualLeads.length)
      : 0;

  // Individual status distribution
  const indStatusCounts = {
    Pendiente: individualLeads.filter(l => l.status === 'Pendiente').length,
    Contactado: individualLeads.filter(l => l.status === 'Contactado').length,
    Negociación: individualLeads.filter(l => l.status === 'Negociación').length,
    Ganado: indWon.length,
    Perdido: indLost.length
  };

  // Individual temperature distribution
  const indTempCounts = {
    Caliente: individualLeads.filter(l => l.temperature === 'Caliente').length,
    Templado: individualLeads.filter(l => l.temperature === 'Templado').length,
    Frío: individualLeads.filter(l => l.temperature === 'Frío').length,
  };

  // Individual Cold Calling Stats
  const indColdLeads = currentComercial 
    ? coldLeads.filter(l => l.assignedToEmail?.toLowerCase() === currentComercial.email.toLowerCase())
    : [];
  const indColdCallsLogged = indColdLeads.reduce((sum, l) => sum + (l.callsCount || 0), 0);
  const indColdContacted = indColdLeads.filter(l => l.contacted === 'Sí').length;
  const indColdCallback = indColdLeads.filter(l => l.callbackScheduled === 'Sí').length;

  return (
    <div className="p-8 space-y-8 flex-1 overflow-y-auto bg-transparent text-slate-100 relative min-h-screen">
      
      {/* Glow ambient background elements */}
      <div className="absolute top-0 right-1/4 w-[35%] h-[35%] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans uppercase flex items-center gap-2.5">
            <Layers className="text-amber-500 w-6 h-6" />
            <span>Métricas & Rendimiento Comercial</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-light">
            Supervisa el embudo de ventas global, analiza el rendimiento individual de tus vendedores y gestiona los accesos del equipo.
          </p>
          <div className="flex gap-2 items-center mt-2.5">
            <button
              id="admin-view-onboarding-dossier"
              onClick={() => setShowDossierModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <FileText className="w-3.5 h-3.5" />
              Ver Dossier Onboarding (PDF)
            </button>
            <button
              id="admin-view-landing-page"
              onClick={() => onNavigate && onNavigate('landing', 'none')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-violet-500/15"
            >
              <Globe className="w-3.5 h-3.5" />
              Ver Landing Page
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-white/10 select-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Métricas Generales
          </button>
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'individual'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Métricas Individuales
          </button>
          <button
            onClick={() => setActiveTab('gestion')}
            className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'gestion'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Gestión de Cuentas
          </button>
        </div>
      </div>

      {/* TAB 1: GENERAL METRICS */}
      {activeTab === 'general' && (
        <div className="space-y-8 animate-fade-in">
          {/* TOP KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Volumen Ganado Total</span>
                  <p className="text-2xl font-mono font-extrabold text-amber-400">
                    {totalVolumeWon.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 font-mono flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>De {wonLeads.length} leads marcados como Ganados</span>
              </p>
            </div>

            <div className="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Leads en Embudo (CRM)</span>
                  <p className="text-2xl font-mono font-extrabold text-white">
                    {totalCRMLeads}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Target className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 font-mono flex items-center justify-between">
                <span>Activos en curso: <strong className="text-blue-400">{activeLeads.length}</strong></span>
                <span>({activeValue.toLocaleString('es-ES')} €)</span>
              </p>
            </div>

            <div className="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Tasa Conversión Global</span>
                  <p className="text-2xl font-mono font-extrabold text-emerald-400">
                    {globalConversionRate}%
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${globalConversionRate}%` }} />
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Actividad Puerta Fría</span>
                  <p className="text-2xl font-mono font-extrabold text-violet-400">
                    {totalCallsLogged}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 font-mono flex items-center justify-between">
                <span>Leads asignados: <strong className="text-violet-400">{coldLeadsAssigned}</strong></span>
                <span>Contacto: <strong>{coldContactRate}%</strong></span>
              </p>
            </div>

          </div>

          {/* Leaderboard & Pipeline Breakdown Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Sales leaderboard */}
            <div className="lg:col-span-7 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl relative">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
              
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Award className="text-amber-500 w-4.5 h-4.5" />
                  <span>Ranking de Comerciales</span>
                </h3>
                <span className="text-[9px] font-mono text-slate-500 uppercase">Ordenado por volumen ganado</span>
              </div>

              {leaderBoard.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No hay comerciales registrados para construir el ranking.
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderBoard.map((item, index) => (
                    <div 
                      key={item.comercial.id} 
                      onClick={() => {
                        setSelectedComercialId(item.comercial.id);
                        setActiveTab('individual');
                      }}
                      className="bg-[#04040a] border border-white/5 hover:border-amber-500/30 p-3 rounded-xl flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Position Badge */}
                        <div className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${
                          index === 0 ? 'bg-amber-500 text-slate-950' :
                          index === 1 ? 'bg-slate-300 text-slate-950' :
                          index === 2 ? 'bg-amber-800 text-amber-100' :
                          'bg-slate-900 text-slate-400 border border-white/5'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs group-hover:text-amber-300 transition-colors">{item.comercial.name}</span>
                            {index === 0 && (
                              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                            )}
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 block">{item.comercial.email}</span>
                        </div>
                      </div>

                      {/* Summary Metrics inline */}
                      <div className="flex items-center gap-8 text-right">
                        <div className="hidden sm:block">
                          <span className="block text-[8px] font-mono text-slate-500 uppercase">Eficiencia</span>
                          <span className="text-[11px] font-mono font-bold text-emerald-400">{item.conversionRate}% Conv.</span>
                        </div>
                        <div className="hidden sm:block">
                          <span className="block text-[8px] font-mono text-slate-500 uppercase">Embudo (Leads)</span>
                          <span className="text-[11px] font-mono font-bold text-slate-300">{item.totalLeads} gestionados</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-mono text-slate-500 uppercase">Volumen Cerrado</span>
                          <span className="text-xs font-mono font-extrabold text-amber-400">
                            {item.wonVolume.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visual metrics panel: Status & Temperature charts */}
            <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl space-y-6">
              
              {/* Funnel Distribution Bar */}
              <div>
                <h3 className="font-bold text-xs text-white mb-3.5 flex items-center gap-2">
                  <BarChart3 className="text-blue-400 w-4 h-4" />
                  <span>Distribución del Embudo (Estados)</span>
                </h3>
                
                <div className="space-y-3 font-sans">
                  {Object.entries(statusCounts).map(([status, count]) => {
                    const pct = totalCRMLeads > 0 ? Math.round((count / totalCRMLeads) * 100) : 0;
                    let colorClass = 'bg-slate-500';
                    let textClass = 'text-slate-400';
                    if (status === 'Ganado') { colorClass = 'bg-emerald-500'; textClass = 'text-emerald-400'; }
                    if (status === 'Perdido') { colorClass = 'bg-rose-500'; textClass = 'text-rose-400'; }
                    if (status === 'Negociación') { colorClass = 'bg-amber-500'; textClass = 'text-amber-400'; }
                    if (status === 'Contactado') { colorClass = 'bg-blue-500'; textClass = 'text-blue-400'; }

                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className={`font-bold ${textClass}`}>{status}</span>
                          <span className="text-slate-400">{count} leads ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Temperature block */}
              <div className="pt-4 border-t border-white/5">
                <h3 className="font-bold text-xs text-white mb-3 flex items-center gap-2">
                  <Activity className="text-amber-400 w-4 h-4" />
                  <span>Interés / Temperatura del Lead</span>
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center">
                    <span className="block text-[8px] font-mono text-rose-400 font-bold uppercase">Caliente</span>
                    <span className="text-sm font-mono font-extrabold text-white block mt-0.5">{tempCounts.Caliente}</span>
                    <span className="text-[8px] text-slate-500 font-mono block">Seguimiento prioritario</span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-center">
                    <span className="block text-[8px] font-mono text-amber-400 font-bold uppercase">Templado</span>
                    <span className="text-sm font-mono font-extrabold text-white block mt-0.5">{tempCounts.Templado}</span>
                    <span className="text-[8px] text-slate-500 font-mono block">En negociación</span>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-center">
                    <span className="block text-[8px] font-mono text-blue-400 font-bold uppercase">Frío</span>
                    <span className="text-sm font-mono font-extrabold text-white block mt-0.5">{tempCounts.Frío}</span>
                    <span className="text-[8px] text-slate-500 font-mono block">Prospección inicial</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB 2: INDIVIDUAL SALESPERSON DETAILED METRICS */}
      {activeTab === 'individual' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Salesperson Selector */}
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[9px] font-mono text-slate-500 uppercase font-bold">Seleccionar Representante para Análisis</span>
                <p className="text-xs text-slate-400 mt-0.5 font-light">Explora las tasas de conversión, volumen de ventas y leads de un comercial específico.</p>
              </div>
            </div>

            <select
              value={selectedComercialId}
              onChange={(e) => setSelectedComercialId(e.target.value)}
              className="bg-[#05050a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-amber-500 outline-none cursor-pointer max-w-xs font-mono font-bold"
            >
              {comercialesList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          {comercialesList.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.01] border border-white/5 rounded-2xl">
              <ShieldAlert className="w-12 h-12 text-amber-500/40 mx-auto mb-3" />
              <p className="text-slate-400 text-xs font-semibold">No hay comerciales disponibles para inspeccionar.</p>
              <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 leading-normal">
                Ve a la pestaña "Gestión de Cuentas" para añadir representantes de ventas.
              </p>
            </div>
          ) : !currentComercial ? (
            <div className="text-center py-20 text-slate-500 text-xs">
              Por favor selecciona un comercial válido.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Profile Card & KPI Block */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Visual Avatar Card */}
                <div className="bg-gradient-to-tr from-slate-950/60 via-slate-950/30 to-[#10101f]/30 border border-white/5 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl text-center">
                  <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-xl mx-auto shadow-lg">
                    {currentComercial.name.slice(0, 2).toUpperCase()}
                  </div>

                  <h3 className="font-bold text-base text-white mt-4">{currentComercial.name}</h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">{currentComercial.email}</p>
                  
                  {currentComercial.phone && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1">{currentComercial.phone}</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-white/5 text-left space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-500">Miembro desde:</span>
                      <span className="text-slate-300">
                        {currentComercial.createdAt ? new Date(currentComercial.createdAt).toLocaleDateString('es-ES') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-500">ID de Sistema:</span>
                      <span className="text-slate-400 font-mono">{currentComercial.id}</span>
                    </div>
                  </div>
                </div>

                {/* Performance stats column */}
                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold">KPIs Clave de Venta</h4>
                  
                  <div className="space-y-3.5">
                    <div className="bg-[#030307] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-[8px] font-mono text-slate-500 uppercase block">Volumen Cerrado (Ganado)</span>
                        <span className="text-base font-mono font-black text-amber-400 mt-0.5 block">
                          {indWonVolume.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                        {indWon.length} Cerrados
                      </span>
                    </div>

                    <div className="bg-[#030307] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-[8px] font-mono text-slate-500 uppercase block">Tasa de Conversión</span>
                        <span className="text-base font-mono font-black text-emerald-400 mt-0.5 block">
                          {indConversionRate}%
                        </span>
                      </div>
                      <div className="w-12 bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${indConversionRate}%` }} />
                      </div>
                    </div>

                    <div className="bg-[#030307] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-[8px] font-mono text-slate-500 uppercase block">Ticket Promedio Estimado</span>
                        <span className="text-base font-mono font-black text-slate-200 mt-0.5 block">
                          {indAverageDeal.toLocaleString('es-ES')} €
                        </span>
                      </div>
                      <span className="p-1 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="bg-[#030307] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-[8px] font-mono text-slate-500 uppercase block">Pipeline Activo en Trámite</span>
                        <span className="text-base font-mono font-black text-blue-400 mt-0.5 block">
                          {indActiveVolume.toLocaleString('es-ES')} €
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                        {indActive.length} Leads
                      </span>
                    </div>

                    <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 flex justify-between items-center">
                      <div>
                        <span className="text-[8px] font-mono text-amber-500/70 uppercase block">Porcentaje de Comisión</span>
                        <span className="text-base font-mono font-black text-amber-400 mt-0.5 block">
                          {indCommissionPercentage}%
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                        Ajustable
                      </span>
                    </div>

                    <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 flex justify-between items-center">
                      <div>
                        <span className="text-[8px] font-mono text-emerald-400/70 uppercase block">Beneficios Ganados (Comisión)</span>
                        <span className="text-base font-mono font-black text-emerald-400 mt-0.5 block">
                          {indBenefitsEarned.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                        De {indInitialSalesVolume.toLocaleString('es-ES')} € cobrados
                      </span>
                    </div>
                  </div>

                </div>

                {/* STRIPE PAYOUT CARD FOR ADMIN */}
                <div className="bg-[#0b0c1e] border-2 border-indigo-500/20 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Liquidación Stripe Direct</h4>
                      <p className="text-[9px] text-slate-400">Procesa pagos de comisiones pendientes</p>
                    </div>
                  </div>

                  {(() => {
                    const indPaidCommissions = (currentComercial.payouts || []).filter(p => p.status === 'completed' && p.stripeConnectAccountId).reduce((sum, p) => sum + p.amount, 0);
                    const indPendingCommission = Math.max(0, indBenefitsEarned - indPaidCommissions);

                    return (
                      <>
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-sans">Comisiones ganadas:</span>
                            <span className="font-mono text-slate-200 font-bold">{indBenefitsEarned.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-sans">Ya liquidadas:</span>
                            <span className="font-mono text-emerald-400 font-bold">{indPaidCommissions.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                            <span className="text-white font-sans font-bold">Pendiente actual:</span>
                            <span className="font-mono text-amber-400 text-sm font-black">{indPendingCommission.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                          </div>
                        </div>

                        {/* DESTINATION BANK ACC INFO */}
                        <div className="bg-slate-950/50 p-3.5 rounded-xl border border-white/5 space-y-2 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Cuenta de Destino</span>
                          </div>
                          {currentComercial.iban ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-white font-bold font-sans">
                                <span className="text-[11px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/15">
                                  {currentComercial.bankName}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-300 font-semibold tracking-wider">
                                {currentComercial.iban}
                              </p>
                              {currentComercial.bic && (
                                <p className="text-[9px] font-mono text-slate-500">
                                  BIC/SWIFT: {currentComercial.bic}
                                </p>
                              )}
                              {currentComercial.stripeConnectAccountId && (
                                <p className="text-[9px] font-mono text-emerald-400">
                                  Stripe Connect: {currentComercial.stripeConnectAccountId}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 leading-normal font-sans">
                              ⚠️ El comercial no ha configurado sus datos bancarios todavía. Solicítale que los rellene para poder liquidar.
                            </div>
                          )}
                        </div>

                        {!currentComercial.stripeConnectAccountId && (
                          <button
                            type="button"
                            onClick={() => handleConnectComercialStripe(currentComercial)}
                            disabled={stripeConnectLoading}
                            className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md font-sans bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/25 cursor-pointer"
                          >
                            {stripeConnectLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CreditCard className="w-4 h-4" />
                            )}
                            <span>Conectar comercial con Stripe</span>
                          </button>
                        )}

                        {/* LIQUIDATE BUTTON */}
                        <button
                          onClick={() => {
                            if (indPendingCommission <= 0) {
                              triggerAlert('Operación no permitida', 'No hay comisiones pendientes de liquidar para este comercial.');
                              return;
                            }
                            if (false && !currentComercial.iban) {
                              triggerAlert('Datos incompletos', 'No se puede procesar el pago porque el comercial no ha registrado sus datos bancarios todavía.');
                              return;
                            }
                            if (!currentComercial.stripeConnectAccountId || !currentComercial.stripePayoutsEnabled) {
                              triggerAlert('Stripe Connect pendiente', 'No se puede liquidar con Stripe hasta conectar y activar la cuenta Stripe Connect del comercial.');
                              return;
                            }
                            triggerConfirm(
                              'Confirmar Liquidación',
                              `¿Confirmas que deseas transferir ${indPendingCommission.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} a la cuenta de ${currentComercial.name} utilizando Stripe Direct?`,
                              () => {
                                handleLiquidateComercialStripe(currentComercial, indPendingCommission);
                                return;
                                const newPayout = {
                                  id: `pay_${Date.now()}`,
                                  comercialId: currentComercial.id,
                                  amount: indPendingCommission,
                                  date: new Date().toISOString(),
                                  status: 'completed' as const,
                                  bankAccount: currentComercial.iban,
                                  bankName: currentComercial.bankName,
                                  stripeTransferId: `manual_${Date.now()}`
                                };

                                onUpdateComercial({
                                  ...currentComercial,
                                  payouts: [...(currentComercial.payouts || []), newPayout]
                                });
                                
                                triggerAlert(
                                  'Liquidación Exitosa',
                                  `¡Liquidación realizada con éxito!\nSe ha enviado la transferencia de ${indPendingCommission.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} a la cuenta de ${currentComercial.name} a través de Stripe Direct.\nSu saldo pendiente ahora es de 0,00 €.`
                                );
                              }
                            );
                          }}
                          disabled={stripePayoutLoading || indPendingCommission <= 0 || !currentComercial.stripeConnectAccountId || !currentComercial.stripePayoutsEnabled}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md font-sans ${
                            stripePayoutLoading || indPendingCommission <= 0 || !currentComercial.stripeConnectAccountId || !currentComercial.stripePayoutsEnabled
                              ? 'bg-slate-900 text-slate-600 border border-white/5 cursor-not-allowed shadow-none'
                              : 'bg-[#635bff] hover:bg-[#5b52eb] text-white cursor-pointer active:scale-95 shadow-[#635bff]/25'
                          }`}
                        >
                          {stripePayoutLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                          <span>{stripePayoutLoading ? 'Creando transferencia...' : `Liquidar ${indPendingCommission.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} con Stripe`}</span>
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* HISTORIAL DE LIQUIDACIONES DE ESTE COMERCIAL */}
                <div className="bg-[#020205]/40 border border-white/5 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Historial del Comercial</h4>
                    </div>
                    <span className="text-[9px] font-mono bg-white/5 text-slate-400 px-2 py-0.5 rounded font-bold">
                      {(currentComercial.payouts || []).length} transferencias
                    </span>
                  </div>

                  {(!currentComercial.payouts || currentComercial.payouts.length === 0) ? (
                    <p className="text-[10px] text-slate-500 italic font-sans py-2">
                      No hay registros de liquidaciones Stripe previas para este comercial.
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {[...currentComercial.payouts].sort((a,b) => b.date.localeCompare(a.date)).map((p) => (
                        <div key={p.id} className="bg-[#040409] p-3 rounded-xl border border-white/5 flex flex-col gap-1.5 text-left">
                          <div className="flex justify-between items-center font-sans">
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(p.date).toLocaleString('es-ES')}
                            </span>
                            <span className="text-[11px] font-mono font-black text-emerald-400">
                              {p.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-end text-[9px] font-mono">
                            <div className="text-slate-500 font-sans">
                              <span className="text-slate-400 font-semibold">{p.bankName}</span> • {p.bankAccount}
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold text-[8px] uppercase">
                              ✓ Stripe {p.stripeTransferId}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* CRM Funnel, Temperatures, Cold calling and CRM leads lists */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Visual statistics pipeline & Cold calling grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Funnel distribution bar chart */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3.5">
                    <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-emerald-400" />
                      <span>Embudo de Ventas Individual</span>
                    </h4>

                    <div className="space-y-3 font-sans">
                      {Object.entries(indStatusCounts).map(([status, count]) => {
                        const pct = individualLeads.length > 0 ? Math.round((count / individualLeads.length) * 100) : 0;
                        let colorClass = 'bg-slate-500';
                        let textClass = 'text-slate-400';
                        if (status === 'Ganado') { colorClass = 'bg-emerald-500'; textClass = 'text-emerald-400'; }
                        if (status === 'Perdido') { colorClass = 'bg-rose-500'; textClass = 'text-rose-400'; }
                        if (status === 'Negociación') { colorClass = 'bg-amber-500'; textClass = 'text-amber-400'; }
                        if (status === 'Contactado') { colorClass = 'bg-blue-500'; textClass = 'text-blue-400'; }

                        return (
                          <div key={status} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className={`font-bold ${textClass}`}>{status}</span>
                              <span className="text-slate-400">{count} leads ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cold calling & Temperature */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                    <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-violet-400" />
                      <span>Rendimiento en Puerta Fría</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 text-center">
                        <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Asignados</span>
                        <span className="text-lg font-mono font-extrabold text-white block mt-0.5">{indColdLeads.length}</span>
                        <span className="text-[8px] text-slate-500 font-mono block">Negocios asignados</span>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 text-center">
                        <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Llamadas Realizadas</span>
                        <span className="text-lg font-mono font-extrabold text-white block mt-0.5">{indColdCallsLogged}</span>
                        <span className="text-[8px] text-slate-500 font-mono block">Intentos/Seguimientos</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400">Tasa de Contacto:</span>
                        <span className="font-bold text-slate-200">
                          {indColdLeads.length > 0 ? Math.round((indColdContacted / indColdLeads.length) * 100) : 0}% 
                          ({indColdContacted} exitosos)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400">Citas/Callbacks Agendadas:</span>
                        <span className="font-bold text-violet-400">{indColdCallback} agendadas</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* CRM Leads Table of this specific representative */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                  <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-500" />
                    <span>Cartera de Clientes & Oportunidades ({individualLeads.length})</span>
                  </h4>

                  {individualLeads.length === 0 ? (
                    <div className="text-center py-10 bg-[#020205] rounded-xl border border-white/5 text-slate-500 text-xs">
                      Este comercial no tiene leads asociados en su embudo.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-350">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-500 uppercase font-mono text-[9px]">
                            <th className="pb-2">Contacto / Empresa</th>
                            <th className="pb-2 text-center">Interés</th>
                            <th className="pb-2 text-center">Estado</th>
                            <th className="pb-2 text-right">Valor Estimado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {individualLeads.map(l => (
                            <tr key={l.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-2.5">
                                <p className="font-bold text-white text-xs">{l.name}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{l.company || 'Sin Empresa'}</p>
                              </td>
                              <td className="py-2.5 text-center">
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                  l.temperature === 'Caliente' ? 'bg-rose-500/10 text-rose-400' :
                                  l.temperature === 'Templado' ? 'bg-amber-500/10 text-amber-400' :
                                  'bg-blue-500/10 text-blue-400'
                                }`}>
                                  {l.temperature || 'Frío'}
                                </span>
                              </td>
                              <td className="py-2.5 text-center">
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold ${
                                  l.status === 'Ganado' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                  l.status === 'Perdido' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                                  l.status === 'Negociación' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                  'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold text-white">
                                {l.value ? `${l.value.toLocaleString('es-ES')} €` : '0.00 €'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 3: MANAGEMENT (AUTHORIZED ACCOUNTS TABLE + CREATION FORM) */}
      {activeTab === 'gestion' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          
          {/* Left Side: Create account form */}
          <div className="lg:col-span-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
            <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <User className="text-amber-500 w-4 h-4" />
              <span>Registrar Representante</span>
            </h3>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs mb-4 text-left">
                {errorMsg}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs mb-4 text-left flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>¡Comercial registrado con éxito!</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Fuentes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="email"
                    required
                    placeholder="comercial@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Contraseña de Acceso</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    required
                    placeholder="Contraseña del comercial"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Teléfono (Opcional)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="+34 600 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-6"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>Registrar Comercial</span>
              </button>
            </form>
          </div>

          {/* Right Side: List of commercials with revoke button */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="font-bold text-sm text-white mb-4 text-left">Representantes Autorizados</h3>

              {comercialesList.length === 0 ? (
                <div className="text-center py-14 bg-black/20 border border-white/5 rounded-2xl p-6">
                  <ShieldAlert className="w-10 h-10 text-amber-500/40 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-semibold">No hay comerciales registrados.</p>
                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 leading-normal">
                    Utiliza el panel lateral izquierdo para registrar una cuenta con email y contraseña.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-350">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 uppercase font-mono font-bold tracking-wider text-[10px]">
                        <th className="pb-3 pl-2">Comercial</th>
                        <th className="pb-3">Contacto / Teléfono</th>
                        <th className="pb-3 text-center">Leads</th>
                        <th className="pb-3 text-right">Volumen</th>
                        <th className="pb-3 text-center">% Comisión</th>
                        <th className="pb-3 text-right">Beneficios</th>
                        <th className="pb-3 pr-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans">
                      {comercialesList.map(c => {
                        const summary = leaderBoard.find(item => item.comercial.id === c.id) || { totalLeads: 0, wonVolume: 0, wonLeads: 0 };
                        
                        // Calculate commissions & benefits - Now automatically tiered/escalonated!
                        const initialTxsForC = finTransactions.filter(tx => 
                          tx.isInitialSale === true && 
                          (tx.comercialId === c.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === c.email.toLowerCase()))
                        );
                        const initialSalesVolTotal = initialTxsForC.reduce((sum, tx) => sum + (tx.amount || 0), 0);
                        const initialSalesVol = initialTxsForC.filter(tx => tx.status === 'paid').reduce((sum, tx) => sum + (tx.amount || 0), 0);
                        const wonLeadsCount = (summary as any).wonLeads || 0;
                        const closuresForC = Math.max(wonLeadsCount, initialTxsForC.length);
                        const commissionPct = getTieredCommission(closuresForC);
                        const benefitsEarned = initialSalesVol * (commissionPct / 100);

                        return (
                          <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                            <td className="py-4 pl-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center font-bold text-amber-400 text-[11px]">
                                  {c.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-white text-xs">{c.name}</p>
                                  <p className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase tracking-wide">
                                    Contraseña: <strong className="text-slate-400">{c.password}</strong>
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <p className="font-medium text-slate-300">{c.email}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{c.phone || 'Sin número'}</p>
                            </td>
                            <td className="py-4 text-center">
                              <span className="font-mono font-bold text-slate-200">{summary.totalLeads}</span>
                            </td>
                            <td className="py-4 text-right">
                              <span className="font-mono font-bold text-amber-400">
                                {summary.wonVolume.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                              </span>
                            </td>
                            <td className="py-4 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-amber-400 text-xs">{commissionPct}%</span>
                                  <span className="text-[7px] font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold uppercase tracking-widest border border-amber-500/10">Escalonada</span>
                                </div>
                                <span className="text-[8px] font-mono text-slate-500 mt-0.5">({closuresForC} {closuresForC === 1 ? 'cierre' : 'cierres'})</span>
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <div>
                                <span className="font-mono font-bold text-emerald-400">
                                  {benefitsEarned.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
                                </span>
                                <span className="block text-[8px] font-mono text-slate-500">De {initialSalesVol.toLocaleString('es-ES')} € cobrado</span>
                                {initialSalesVolTotal > initialSalesVol && (
                                  <span className="block text-[8px] font-mono text-slate-600">({initialSalesVolTotal.toLocaleString('es-ES')} € total)</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 text-right pr-2">
                              <button
                                onClick={() => {
                                  triggerConfirm(
                                    'Revocar Acceso',
                                    `¿Estás seguro de que deseas revocar el acceso y eliminar definitivamente la cuenta del comercial ${c.name}? Esta acción no se puede deshacer.`,
                                    () => {
                                      onDeleteComercial(c.id);
                                    }
                                  );
                                }}
                                className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all group-hover:scale-105 cursor-pointer"
                                title="Revocar acceso"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Onboarding Welcome Dossier & Printable PDF */}
      <DossierModal isOpen={showDossierModal} onClose={() => setShowDossierModal(false)} />

      {/* Custom Alert/Confirm dialog to replace native modal window blocks */}
      {customDialog && customDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">{customDialog.title}</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-sans whitespace-pre-line">{customDialog.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 border-t border-white/5 pt-4">
              {customDialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => setCustomDialog(prev => prev ? { ...prev, isOpen: false } : null)}
                  className="px-4 py-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-transparent hover:border-white/5"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (customDialog.type === 'confirm' && customDialog.onConfirm) {
                    customDialog.onConfirm();
                  }
                  setCustomDialog(null);
                }}
                className="px-4.5 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold rounded-lg text-xs transition-all shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 cursor-pointer"
              >
                {customDialog.type === 'confirm' ? 'Confirmar' : 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
