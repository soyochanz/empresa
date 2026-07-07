import React, { useState, useMemo } from 'react';
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
  FileSpreadsheet,
  Phone,
  Video,
  ExternalLink,
  Settings,
  Landmark,
  CreditCard,
  Coins,
  History,
  Lock
} from 'lucide-react';
import { ComercialAccount, ComercialLead, ColdCallingLead, CalendarEvent, ClientContact } from '../types';
import ColdCallingScreen from './ColdCallingScreen';
import DossierModal from './DossierModal';

const safeConfirm = (msg: string): boolean => {
  const isIframe = window.self !== window.top;
  if (isIframe) return true; // Auto-confirm inside sandbox iframe preview
  try {
    return window.confirm(msg);
  } catch (e) {
    return true;
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
  contacts = []
}: ComercialesPanelScreenProps) {
  // Local state
  const [activeView, setActiveView] = useState<'pipeline' | 'cold_calling' | 'settings'>('pipeline');
  const [iban, setIban] = useState(comercial.iban || '');
  const [bic, setBic] = useState(comercial.bic || '');
  const [bankName, setBankName] = useState(comercial.bankName || '');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  React.useEffect(() => {
    if (comercial) {
      setIban(comercial.iban || '');
      setBic(comercial.bic || '');
      setBankName(comercial.bankName || '');
    }
  }, [comercial]);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [leadTemperature, setLeadTemperature] = useState<'Frío' | 'Templado' | 'Caliente'>('Frío');

  // Quick Call Logging states on Dashboard
  const [activeLoggerLeadId, setActiveLoggerLeadId] = useState<string | null>(null);
  const [quickLogNotes, setQuickLogNotes] = useState('');
  const [quickLogResult, setQuickLogResult] = useState('Responde');
  const [quickLogTemp, setQuickLogTemp] = useState<'Frío' | 'Templado' | 'Caliente'>('Templado');
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
    // 1. Map existing leads, force to 'Ganado' if matching contact is 'Client'
    const updated = leadsList
      .map(lead => {
        const matchingContact = contacts.find(c => 
          (lead.email && c.email && lead.email.toLowerCase() === c.email.toLowerCase()) ||
          (lead.name && c.name && lead.name.toLowerCase() === c.name.toLowerCase())
        );
        
        if (matchingContact && matchingContact.status === 'Client') {
          const clientTxs = finTransactions.filter(tx => {
            if (tx.type !== 'income') return false;
            const descLower = tx.description?.toLowerCase() || '';
            const nameLower = matchingContact.name?.toLowerCase() || '';
            const companyLower = matchingContact.company?.toLowerCase() || '';
            return (nameLower && descLower.includes(nameLower)) || (companyLower && descLower.includes(companyLower));
          });
          const totalPaid = clientTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
          return {
            ...lead,
            status: 'Ganado' as const,
            value: lead.value || totalPaid || 1500
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
      if (c.status === 'Client') {
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
            const clientTxs = finTransactions.filter(tx => {
              if (tx.type !== 'income') return false;
              const descLower = tx.description?.toLowerCase() || '';
              const nameLower = c.name?.toLowerCase() || '';
              const companyLower = c.company?.toLowerCase() || '';
              return (nameLower && descLower.includes(nameLower)) || (companyLower && descLower.includes(companyLower));
            });
            const totalPaid = clientTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);

            newLeadsFromClients.push({
              id: 'lead_client_sync_' + c.id,
              comercialId: comercial.id,
              comercialName: comercial.name,
              name: c.name,
              company: c.company || 'Empresa',
              email: c.email || '',
              phone: c.phone || '',
              status: 'Ganado',
              value: totalPaid || (c as any).estimatedValue || 1500,
              notes: 'Importado de Cartera de Clientes CRM',
              createdAt: (c as any).createdAt || new Date().toISOString(),
              temperature: 'Caliente'
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
  const wonLeads = myLeads.filter(l => l.status === 'Ganado');
  const conversionRate = totalLeads ? Math.round((wonLeads.length / totalLeads) * 100) : 0;
  
  // Pipeline value
  const totalPipeline = myLeads.reduce((sum, l) => sum + (l.status !== 'Perdido' ? Number(l.value || 0) : 0), 0);
  const wonRevenue = wonLeads.reduce((sum, l) => sum + Number(l.value || 0), 0);

  // Commission & Benefits calculations for this commercial - Now automatically tiered/escalonated!
  const myInitialTxs = finTransactions.filter(tx => 
    tx.isInitialSale === true && 
    (tx.comercialId === comercial.id || (tx.comercialEmail && tx.comercialEmail.toLowerCase() === comercial.email.toLowerCase()))
  );
  const closuresCount = Math.max(wonLeads.length, myInitialTxs.length);
  const myCommissionPercentage = getTieredCommission(closuresCount);
  const myInitialSalesVolume = myInitialTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const myBenefitsEarned = myInitialSalesVolume * (myCommissionPercentage / 100);

  // Status distributions for chart
  const statusCounts = {
    Pendiente: myLeads.filter(l => l.status === 'Pendiente').length,
    Contactado: myLeads.filter(l => l.status === 'Contactado').length,
    Negociación: myLeads.filter(l => l.status === 'Negociación').length,
    Ganado: myLeads.filter(l => l.status === 'Ganado').length,
    Perdido: myLeads.filter(l => l.status === 'Perdido').length,
  };

  const statusColors: Record<ComercialLead['status'], string> = {
    Pendiente: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    Contactado: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    Negociación: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
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
    <div className="min-h-screen bg-[#030308] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      
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

      {/* HEADER BAR */}
      <header className="relative z-10 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center bg-black rounded-xl border border-violet-500/25 p-1">
            <img 
              src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" 
              alt="Althera Logo" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight uppercase font-display">Althera Sales</h1>
            <p className="text-[10px] text-violet-400 font-mono font-bold uppercase tracking-widest leading-none mt-1">
              Comercial: {comercial.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex text-right flex-col">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold leading-none">Perfil de Ventas</span>
            <span className="text-xs font-semibold text-slate-300 mt-1">{comercial.email}</span>
          </div>
          <button
            onClick={() => setShowDossierModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-bold transition duration-250 cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ver Dossier & PDF</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded-xl text-xs font-semibold hover:text-white transition duration-250 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* VIEWPORT CANVAS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 relative z-10 overflow-y-auto">
        
        {/* WELCOME BANNER WITH ANALYTICS BRIEF */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">¡Hola de nuevo, {comercial.name}!</h2>
            <p className="text-xs text-slate-400 mt-1">Este es tu panel centralizado de carteras de clientes rápidos. Sigue tus objetivos de conversión.</p>
          </div>
        </div>

        {/* VIEW MODE TABS FOR COMERCIAL (CRM vs COLD CALLING vs SETTINGS) */}
        <div className="flex gap-1.5 p-1 bg-[#050510]/80 backdrop-blur-md rounded-2xl border border-white/5 max-w-md">
          <button
            onClick={() => setActiveView('pipeline')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeView === 'pipeline'
                ? 'bg-violet-650/20 text-violet-400 border border-violet-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pipeline CRM</span>
          </button>
          
          <button
            onClick={() => setActiveView('cold_calling')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
              activeView === 'cold_calling'
                ? 'bg-violet-650/20 text-violet-400 border border-violet-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Cold Calling</span>
            {coldLeads.filter(l => !l.archived && l.assignedToEmail.toLowerCase() === comercial.email.toLowerCase() && l.callbackScheduled === 'Llamar más tarde' && l.callbackDate === new Date().toISOString().split('T')[0]).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[9px] text-white font-extrabold flex items-center justify-center rounded-full animate-bounce">
                {coldLeads.filter(l => !l.archived && l.assignedToEmail.toLowerCase() === comercial.email.toLowerCase() && l.callbackScheduled === 'Llamar más tarde' && l.callbackDate === new Date().toISOString().split('T')[0]).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeView === 'settings'
                ? 'bg-violet-650/20 text-violet-400 border border-violet-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Ajustes de Cobro</span>
          </button>
        </div>

        {activeView === 'cold_calling' ? (
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
            />
          </div>
        ) : activeView === 'settings' ? (
          <div className="space-y-6 animate-fade-in font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: BANK SETTINGS FORM */}
              <div className="lg:col-span-5 bg-slate-950/40 border border-white/5 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20 text-violet-400">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Datos de Facturación y Banco</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Configura tu cuenta bancaria de destino para liquidaciones con Stripe.</p>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (onUpdateComercial) {
                    onUpdateComercial({
                      ...comercial,
                      iban: iban.trim(),
                      bic: bic.trim(),
                      bankName: bankName.trim()
                    });
                    setSettingsSuccess(true);
                    setTimeout(() => setSettingsSuccess(false), 3000);
                  }
                }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Código IBAN (Cuenta Bancaria)</label>
                    <input
                      type="text"
                      required
                      disabled={!!comercial.iban}
                      placeholder="ES21 0000 0000 0000 0000 0000"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      className="w-full bg-[#030307] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-900/50 disabled:border-white/5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Código BIC / SWIFT</label>
                      <input
                        type="text"
                        required
                        disabled={!!comercial.iban}
                        placeholder="Ej. ESBRES2X"
                        value={bic}
                        onChange={(e) => setBic(e.target.value)}
                        className="w-full bg-[#030307] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-900/50 disabled:border-white/5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Nombre del Banco</label>
                      <input
                        type="text"
                        required
                        disabled={!!comercial.iban}
                        placeholder="Ej. Santander, BBVA"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-[#030307] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-900/50 disabled:border-white/5"
                      />
                    </div>
                  </div>

                  {comercial.iban && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 font-medium leading-relaxed flex items-start gap-2.5">
                      <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Los datos bancarios solo se pueden configurar una vez para prevenir accesos no autorizados y fraudes en las liquidaciones de Stripe. Este panel está ahora <strong>BLOQUEADO</strong> de forma segura. Si necesitas actualizar tus datos, solicita un cambio formal con administración.</span>
                    </div>
                  )}

                  {settingsSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 font-medium">
                      ✓ Datos bancarios guardados con éxito.
                    </div>
                  )}

                  {comercial.iban ? (
                    <div className="w-full py-2.5 bg-slate-900/80 border border-white/5 text-slate-500 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed select-none">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Configuración de Cobro Bloqueada</span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-violet-500/15"
                    >
                      Guardar Configuración
                    </button>
                  )}
                </form>

                {/* STRIPE INFO CARD */}
                <div className="bg-[#050510]/50 border border-violet-500/10 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">Stripe Direct Payouts</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Tus comisiones acumuladas se liquidan de forma directa a esta cuenta bancaria. Stripe verifica la titularidad del IBAN. El tiempo estimado de transferencia es de 1-3 días laborables.
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: PENDING COMISION & PAYOUTS HISTORY */}
              <div className="lg:col-span-7 space-y-6 text-left">
                
                {/* ACCRUED COMISIONES BOX */}
                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Total Acumulado</span>
                    <span className="text-xl font-mono font-black text-amber-400 block">
                      {myBenefitsEarned.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                    <span className="text-[8px] font-mono text-slate-500 block">Comisión {myCommissionPercentage}% escalonada</span>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/5 md:pl-6">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Total Liquidado</span>
                    <span className="text-xl font-mono font-black text-emerald-400 block">
                      {((comercial.payouts || []).filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                    <span className="text-[8px] font-mono text-slate-500 block">Historial de transferencias Stripe</span>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/5 md:pl-6 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                    <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest block font-bold">Pendiente de Liquidar</span>
                    <span className="text-xl font-mono font-black text-white block">
                      {Math.max(0, myBenefitsEarned - (comercial.payouts || []).filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                    <span className="text-[8px] font-mono text-amber-500/60 block">Listo para enviar a cuenta</span>
                  </div>
                </div>

                {/* TRANSACTION HISTORY TABLE */}
                <div className="bg-[#020205]/40 rounded-2xl border border-white/5 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-amber-400" />
                      <h4 className="font-bold text-white text-xs uppercase font-mono tracking-wider">Historial de Liquidaciones</h4>
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
                        Cuando el administrador liquide tus comisiones acumuladas, aparecerá el registro detallado aquí.
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
                            <th className="p-3">Referencia Stripe / Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                          {[...comercial.payouts].sort((a,b) => b.date.localeCompare(a.date)).map((p) => (
                            <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-3 text-slate-300">
                                {new Date(p.date).toLocaleString('es-ES')}
                              </td>
                              <td className="p-3 font-bold text-emerald-400 text-right font-sans">
                                {p.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                              </td>
                              <td className="p-3 font-sans">
                                <div className="flex flex-col">
                                  <span className="text-white text-[11px] font-bold">{p.bankName || 'Cuenta Bancaria'}</span>
                                  <span className="text-[9px] font-mono text-slate-400">{p.bankAccount}</span>
                                </div>
                              </td>
                              <td className="p-3 font-sans">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] font-mono bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded border border-violet-500/10 w-fit">
                                    {p.stripeTransferId}
                                  </span>
                                  <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                    ● Completado (Stripe)
                                  </span>
                                </div>
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
          </div>
        ) : (
          <>
            {/* METRICS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          
          {/* Total Leads */}
          <div className="bg-white/[0.02] border border-white/5 p-5.5 rounded-2.5xl flex items-center justify-between hover:border-violet-500/20 transition duration-200">
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-mono font-bold tracking-wider mb-1">Leads en Gestión</p>
              <h3 className="text-2xl font-bold text-white font-mono">{totalLeads}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Prospectos asignados</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Users className="w-5 h-5" />
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
            <div className="relative z-10">
              <p className="text-amber-500/70 text-[10px] uppercase font-mono font-bold tracking-wider mb-1">Mis Comisiones</p>
              <h3 className="text-2xl font-bold text-amber-400 font-mono">
                {myBenefitsEarned.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Comisión fijada: <strong className="text-amber-400">{myCommissionPercentage}%</strong>
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
                              isDone 
                                ? 'bg-emerald-950/10 border-emerald-500/20 opacity-75' 
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
                                isDone 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
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
                                  isDone 
                                    ? 'bg-slate-800 text-slate-350 hover:bg-slate-700' 
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
                              isLogging 
                                ? 'bg-violet-950/15 border-violet-500/35 ring-1 ring-violet-500/20' 
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
                                      <option value="Frío">❄️ Frío</option>
                                      <option value="Templado">⚡ Templado</option>
                                      <option value="Caliente">🔥 Caliente</option>
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
                      statusFilter === st
                        ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20'
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

                      {/* Status Selector */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-block relative">
                          <select
                            value={l.status}
                            onChange={(e) => handleUpdateStatus(l.id, e.target.value as any)}
                            disabled={l.id.startsWith('lead_client_sync_')} // auto-synced from CRM active client
                            className={`text-[10px] font-mono px-2 py-1 rounded font-bold border focus:outline-none cursor-pointer bg-slate-950/80 transition ${
                              l.status === 'Ganado' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20' :
                              l.status === 'Perdido' ? 'border-rose-500/30 text-rose-400 bg-rose-950/20' :
                              l.status === 'Negociación' ? 'border-amber-500/30 text-amber-400 bg-amber-950/20' :
                              'border-slate-700 text-slate-350 hover:border-slate-600'
                            }`}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Contactado">Contactado</option>
                            <option value="Negociación">Negociación</option>
                            <option value="Ganado">Ganado</option>
                            <option value="Perdido">Perdido</option>
                          </select>
                          {l.id.startsWith('lead_client_sync_') && (
                            <span className="block text-[8px] text-emerald-400 font-mono mt-1 font-bold">✓ Sincronizado CRM</span>
                          )}
                        </div>
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                        {Number(l.value || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                      </td>

                      {/* Notes / Edit Notes Inline */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex items-center gap-1.5 justify-between">
                          <p className="text-[10px] text-slate-400 truncate flex-1" title={l.notes}>
                            {l.notes || <span className="text-slate-600 italic">Sin comentarios</span>}
                          </p>
                          <button
                            onClick={() => {
                              const newNotes = prompt('Editar notas del prospecto:', l.notes || '');
                              if (newNotes !== null) {
                                onUpdateLead({
                                  ...l,
                                  notes: newNotes.trim()
                                });
                              }
                            }}
                            className="text-[9px] text-violet-400 hover:text-white font-mono bg-violet-500/5 hover:bg-violet-500/20 px-1.5 py-0.5 rounded transition shrink-0"
                          >
                            Editar
                          </button>
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

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#050505] py-6 relative z-10 text-[10px] text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <span>Licencia de Althera Sales CRM activa.</span>
          <span>© {new Date().getFullYear()} Althera Software.</span>
        </div>
      </footer>

      {/* Welcome Dossier & Printable PDF */}
      <DossierModal isOpen={showDossierModal} onClose={() => setShowDossierModal(false)} />

    </div>
  );
}
