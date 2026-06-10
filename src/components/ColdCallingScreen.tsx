import { useState } from 'react';
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
  Briefcase
} from 'lucide-react';
import { ColdCallingLead, ComercialAccount } from '../types';

interface ColdCallingScreenProps {
  coldLeads: ColdCallingLead[];
  comercialesList: ComercialAccount[];
  onAddColdLead: (lead: ColdCallingLead) => void;
  onUpdateColdLead: (lead: ColdCallingLead) => void;
  onDeleteColdLead: (id: string) => void;
  currentUser?: { name: string; email: string; id: string | null } | null; // present if Admin
  currentComercial?: ComercialAccount | null; // present if Comercial
  onNavigate?: (target: any, transition: any) => void;
}

export default function ColdCallingScreen({
  coldLeads,
  comercialesList,
  onAddColdLead,
  onUpdateColdLead,
  onDeleteColdLead,
  currentUser,
  currentComercial,
  onNavigate
}: ColdCallingScreenProps) {
  
  // Determine role
  const isAdmin = !!currentUser;
  const comercialEmail = currentComercial?.email || '';

  // Active view tab inside Cold Calling Screen
  const [activeTab, setActiveTab] = useState<'leads' | 'tasks' | 'metrics'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [tempFilter, setTempFilter] = useState<'Todos' | 'Frío' | 'Templado' | 'Caliente'>('Todos');
  const [assignedFilter, setAssignedFilter] = useState<string>('todos');
  const [showArchived, setShowArchived] = useState(false);

  // Task calendar date state
  const [selectedTaskDate, setSelectedTaskDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<ColdCallingLead | null>(null);

  // New Lead form state (Admin exclusive)
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCallDate, setNewCallDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newAssignedEmail, setNewAssignedEmail] = useState('unassigned');
  const [newNotes, setNewNotes] = useState('');

  // Call Logging form state (For Comerciales working the lead)
  const [callContacted, setCallContacted] = useState<'Sí' | 'No'>('Sí');
  const [callIsOwner, setCallIsOwner] = useState<'Sí' | 'No'>('Sí');
  const [callAnswered, setCallAnswered] = useState<'Sí' | 'No'>('Sí');
  const [callTemperature, setCallTemperature] = useState<'Frío' | 'Templado' | 'Caliente'>('Frío');
  const [callScheduled, setCallScheduled] = useState<'Sí' | 'No' | 'Llamar más tarde'>('No');
  const [callCallbackDate, setCallCallbackDate] = useState('');
  const [callCallbackTime, setCallCallbackTime] = useState('');
  const [callNotes, setCallNotes] = useState('');

  // Filtering leads based on permissions and filters
  const visibleLeads = coldLeads.filter(lead => {
    // Permission scope: Comercial only sees assigned, Admin sees all
    if (!isAdmin && lead.assignedToEmail.toLowerCase() !== comercialEmail.toLowerCase()) {
      return false;
    }

    // Archived filter
    if (lead.archived && !showArchived) return false;
    if (!lead.archived && showArchived) return false;

    // Fast search filter
    const matchesSearch = 
      lead.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.notes.toLowerCase().includes(searchQuery.toLowerCase());

    // Temperature filter
    const matchesTemp = tempFilter === 'Todos' || lead.temperature === tempFilter;

    // Assigned search filter (for Admin)
    let matchesAssigned = true;
    if (isAdmin && assignedFilter !== 'todos') {
      matchesAssigned = lead.assignedToEmail === assignedFilter;
    }

    return matchesSearch && matchesTemp && matchesAssigned;
  });

  // Calculate Metrics
  const relevantLeads = isAdmin 
    ? coldLeads.filter(l => !l.archived)
    : coldLeads.filter(l => !l.archived && l.assignedToEmail.toLowerCase() === comercialEmail.toLowerCase());

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

    const matchedComercial = comercialesList.find(c => c.email === newAssignedEmail);

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
      createdAt: new Date().toISOString()
    };

    onAddColdLead(newLead);
    
    // Reset Form
    setNewBusinessName('');
    setNewContactPerson('');
    setNewPhone('');
    setNewCallDate(new Date().toISOString().split('T')[0]);
    setNewAssignedEmail('unassigned');
    setNewNotes('');
    setShowAddModal(false);
  };

  // Open Call Logging Modal
  const handleOpenCallLog = (lead: ColdCallingLead) => {
    setSelectedLeadForCall(lead);
    setCallContacted(lead.contacted);
    setCallIsOwner(lead.isOwner);
    setCallAnswered(lead.answered);
    setCallTemperature(lead.temperature);
    setCallScheduled(lead.callbackScheduled);
    setCallCallbackDate(lead.callbackDate || '');
    setCallCallbackTime(lead.callbackTime || '');
    setCallNotes(lead.notes);
  };

  // Submit Logger Update
  const handleSaveCallLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForCall) return;

    if (callScheduled === 'Llamar más tarde' && !callCallbackDate) {
      alert('Por favor indica una fecha en el calendario para posponer la llamada.');
      return;
    }

    const updatedLead: ColdCallingLead = {
      ...selectedLeadForCall,
      contacted: callContacted,
      isOwner: callIsOwner,
      answered: callAnswered,
      temperature: callTemperature,
      callbackScheduled: callScheduled,
      callbackDate: callScheduled === 'Llamar más tarde' ? callCallbackDate : undefined,
      callbackTime: callScheduled === 'Llamar más tarde' ? callCallbackTime : undefined,
      notes: callNotes.trim(),
      callDate: new Date().toISOString().split('T')[0] // Set call date to today
    };

    onUpdateColdLead(updatedLead);
    setSelectedLeadForCall(null);
  };

  // Archive / Unarchive toggle
  const handleToggleArchive = (lead: ColdCallingLead) => {
    onUpdateColdLead({
      ...lead,
      archived: !lead.archived
    });
  };

  // Calendar tasks query: matching callbackScheduled === 'Llamar más tarde' and callbackDate matches
  const dayCallbackLeads = coldLeads.filter(lead => {
    if (lead.archived) return false;
    if (!isAdmin && lead.assignedToEmail.toLowerCase() !== comercialEmail.toLowerCase()) return false;
    return lead.callbackScheduled === 'Llamar más tarde' && lead.callbackDate === selectedTaskDate;
  });

  return (
    <div className={`p-6 md:p-8 space-y-6 text-left h-full overflow-y-auto font-sans relative`}>
      
      {/* Decorative localized glows */}
      <div className="absolute top-[5%] right-[10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[5%] left-[5%] w-[40%] h-[40%] rounded-full bg-rose-600/5 blur-[130px] pointer-events-none" />

      {/* Screen Title Banner */}
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
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition duration-200 text-xs shadow-lg shadow-violet-500/15 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Pre-cargar Lead</span>
          </button>
        )}
      </div>

      {/* THREE MODULE SECTIONS TAB CONTROLLERS */}
      <div className="flex gap-1.5 p-1 bg-[#050508]/80 backdrop-blur-md rounded-xl border border-white/5 max-w-lg relative z-10">
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'leads'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Listado de Prospectos</span>
        </button>
        
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'tasks'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Dashboard de Tareas</span>
          {dayCallbackLeads.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[9px] text-white font-extrabold flex items-center justify-center rounded-full animate-bounce">
              {dayCallbackLeads.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'metrics'
              ? 'bg-violet-600 text-white shadow-md'
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
          <span className="text-xl font-bold font-mono text-amber-500 mt-1">{dayCallbackLeads.length} citas</span>
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
              
              {/* Temperature Selector badges */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5">
                {(['Todos', 'Frío', 'Templado', 'Caliente'] as const).map(opt => {
                  return (
                    <button
                      key={opt}
                      onClick={() => setTempFilter(opt)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        tempFilter === opt
                          ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.01]'
                      }`}
                    >
                      {opt === 'Caliente' ? '🔥' : opt === 'Templado' ? '⚡' : opt === 'Frío' ? '❄️' : ''} {opt}
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
                    {comercialesList.map(com => (
                      <option key={com.id} value={com.email}>{com.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Archived toggle */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`p-2 rounded-xl border font-bold transition-all flex items-center justify-center gap-1 bg-slate-950 cursor-pointer ${
                  showArchived 
                    ? 'border-violet-500 text-violet-400 bg-violet-600/5' 
                    : 'border-white/5 text-slate-400 hover:text-white'
                }`}
                title="Ver Leads Archivados"
              >
                <Archive className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-mono tracking-wider">Archivados</span>
              </button>

            </div>

          </div>

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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleLeads.map(lead => {
                
                // Styling corresponding to visual temperature
                let tempBadge = '';
                let cardGlow = '';
                if (lead.temperature === 'Caliente') {
                  tempBadge = 'bg-rose-500/10 text-rose-400 border border-rose-550/25 shadow-[0_0_12px_rgba(244,63,94,0.15)]';
                  cardGlow = 'hover:border-rose-500/20';
                } else if (lead.temperature === 'Templado') {
                  tempBadge = 'bg-amber-500/10 text-amber-400 border border-amber-550/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]';
                  cardGlow = 'hover:border-amber-500/20';
                } else {
                  tempBadge = 'bg-sky-500/10 text-sky-400 border border-sky-550/25 shadow-[0_0_12px_rgba(14,165,233,0.15)]';
                  cardGlow = 'hover:border-sky-500/20';
                }

                return (
                  <div 
                    key={lead.id} 
                    className={`bg-white/[0.01] border ${lead.archived ? 'border-dashed border-red-500/20' : 'border-white/5'} ${cardGlow} p-5 rounded-2.5xl transition-all duration-200 flex flex-col justify-between text-left`}
                  >
                    <div>
                      {/* Badge Temperature & Assignee */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${tempBadge} flex items-center gap-1`}>
                          {lead.temperature === 'Caliente' ? <Flame className="w-3 h-3 text-rose-400 fill-rose-400 animate-pulse" /> : 
                           lead.temperature === 'Templado' ? <Zap className="w-3 h-3 text-amber-400" /> : 
                           <Snowflake className="w-3 h-3 text-sky-400" />}
                          {lead.temperature === 'Caliente' ? '🔥 Caliente' : lead.temperature === 'Templado' ? '⚡ Templado' : '❄️ Frío'}
                        </span>

                        <span className="text-[9px] bg-slate-900 border border-white/5 text-slate-400 px-2 py-0.5 rounded-md font-mono max-w-[120px] truncate" title={lead.assignedToEmail}>
                          👤 {lead.assignedToName || 'Sin asignar'}
                        </span>
                      </div>

                      {/* Business & Contact Name */}
                      <h3 className="text-sm font-bold text-white line-clamp-1">{lead.businessName}</h3>
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
                        <div className="mt-3 bg-amber-500/5 border border-amber-500/10 rounded-xl p-2 flex items-center justify-between text-left">
                          <div className="flex items-center gap-1.5 text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            <div className="text-[10px] leading-snug">
                              <p className="font-bold uppercase tracking-wider font-mono">Próxima llamada:</p>
                              <p className="text-slate-300">{lead.callbackDate} • {lead.callbackTime || 'Sin hora'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded uppercase font-bold font-mono">POSTPONED</span>
                        </div>
                      )}

                      {/* Notes Box */}
                      <p className="text-[11px] text-slate-450 italic line-clamp-2 mt-3.5 bg-slate-950/25 p-2 rounded-xl text-left border border-white/[0.02]" title={lead.notes}>
                        " {lead.notes || 'Sin valoraciones iniciales.'} "
                      </p>
                    </div>

                    {/* ACTIONS ROW */}
                    <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-white/5">
                      <button
                        onClick={() => handleOpenCallLog(lead)}
                        className="flex-1 py-1.5 px-3 bg-violet-600/10 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Formulario / Registrar Llamada</span>
                      </button>

                      {/* Admin Controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleArchive(lead)}
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                              lead.archived 
                                ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-slate-900' 
                                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:border-slate-500/30'
                            }`}
                            title={lead.archived ? 'Desarchivar' : 'Archivar prospecto'}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => {
                              if (confirm('¿Seguro que deseas eliminar definitivamente este lead de cold calling?')) {
                                onDeleteColdLead(lead.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:text-white hover:bg-rose-550 transition-colors cursor-pointer"
                            title="Eliminar de por vida"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: DASHBOARD DE TAREAS SEGÚN DÍA EN CALENDARIO */}
      {activeTab === 'tasks' && (
        <div className="space-y-6 relative z-10">
          
          <div className="bg-[#030306]/85 border border-white/5 p-6 rounded-2.5xl text-left">
            <h3 className="text-sm font-semibold text-white">Selector de Calendario de Tareas</h3>
            <p className="text-xs text-slate-400 mt-1">Escoge una fecha para listar de forma predictiva las citas pospuestas y tareas de Cold Calling programadas para dicho día.</p>
            
            {/* Calendar Picker wrapper */}
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-white/5 max-w-md">
              <span className="text-xs text-slate-400 font-mono uppercase">Fecha Seleccionada:</span>
              <input
                type="date"
                value={selectedTaskDate}
                onChange={e => setSelectedTaskDate(e.target.value)}
                className="bg-[#050510] text-sm text-white select-none border border-white/10 px-3 py-1.5 rounded-xl focus:border-violet-500 focus:outline-none transition-all w-full cursor-pointer"
              />
            </div>

            {/* Quick date navigators */}
            <div className="flex gap-2 mt-3.5">
              {[
                { label: 'Ayer', val: () => {
                  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0];
                }},
                { label: 'Hoy (Actual)', val: () => new Date().toISOString().split('T')[0] },
                { label: 'Mañana', val: () => {
                  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
                }}
              ].map(item => {
                const calculatedDate = item.val();
                const isActive = calculatedDate === selectedTaskDate;
                return (
                  <button
                    key={item.label}
                    onClick={() => setSelectedTaskDate(calculatedDate)}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-violet-600 border-violet-500 text-white shadow-md' 
                        : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TASKS LIST MATCHING CALENDAR DAY */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-400">
                Llamadas pospuestas para el {selectedTaskDate} ({dayCallbackLeads.length})
              </h3>
              <span className="text-[10px] text-slate-500 uppercase">Filtros Activos</span>
            </div>

            {dayCallbackLeads.length === 0 ? (
              <div className="text-center py-16 bg-[#030306]/40 rounded-2.5xl border border-white/5">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto mb-3 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-slate-200 text-xs font-semibold">¡Día libre de tareas agendadas!</p>
                <p className="text-[10px] text-slate-550 max-w-[280px] mx-auto mt-1 leading-relaxed">
                  No hay llamadas pospuestas que expiren en esta fecha asignada. Los vendedores pueden seguir picando frío.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayCallbackLeads.map(lead => {
                  return (
                    <div 
                      key={lead.id} 
                      className="bg-gradient-to-r from-violet-600/[0.03] to-[#030306] border border-white/5 py-4 px-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-violet-500/20 transition duration-200"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0 mt-0.5">
                          <Clock className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="text-left space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-white uppercase tracking-tight">{lead.businessName}</h4>
                            <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold px-1.5 py-0.5 rounded">
                              {lead.callbackTime || 'Cualquier hora '} 🕒
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">Hablar con: <span className="font-semibold text-slate-200">{lead.contactPerson}</span> • Asignado a: <span className="text-violet-400">{lead.assignedToName || lead.assignedToEmail}</span></p>
                          <p className="text-[10px] text-slate-500 italic">Notas previas: "{lead.notes}"</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <a 
                          href={`tel:${lead.phone}`}
                          className="px-3.5 py-2 bg-slate-950 border border-white/5 text-xs text-slate-200 font-mono font-bold rounded-xl hover:text-white hover:bg-slate-900 transition flex items-center gap-2"
                        >
                          <Phone className="w-3.5 h-3.5 text-violet-400" />
                          <span>Llamar: {lead.phone}</span>
                        </a>

                        <button
                          onClick={() => handleOpenCallLog(lead)}
                          className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl select-none transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>Resolver / Registrar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: GRAPHICS & STATS (MÉTRICAS COLD CALLING) */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 text-left">
          
          {/* Answer Metrics and Funnels */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#030306]/85 border border-white/5 p-6 rounded-2.5xl">
              <h3 className="text-sm font-semibold text-white mb-4">Métricas de Rendimiento del Barrido de Frío</h3>
              
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
                    🔥 Caliente
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
                    ⚡ Templado
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

              {/* Frío widget */}
              <div className="border border-sky-500/20 bg-sky-500/5 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-extrabold text-sky-400 uppercase tracking-wide flex items-center gap-1">
                    <Snowflake className="w-4 h-4" />
                    ❄️ Frío
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Leads iniciales cargados o llamadas sin interés claro</p>
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

      {/* MODAL 1: PRE-CARGAR NUEVO LEAD DE COLD CALLING (ADMIN EXCLUSIVE) */}
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
                    placeholder="Ej. Dr. Francisco Sanz / Laura Gómez"
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
                    {comercialesList.map(com => (
                      <option key={com.id} value={com.email}>{com.name} ({com.email})</option>
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

          </div>
        </div>
      )}

      {/* MODAL 2: FORMULARIO DE TRABAJO INDIVIDUAL (CALL QUESTIONNAIRE FOR SUCCESS METRICS) */}
      {selectedLeadForCall && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2.5xl max-w-xl w-full p-6 text-left relative overflow-hidden animate-scale-in">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="text-left">
                <span className="text-[9px] font-mono font-bold bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded uppercase">
                  Lead: {selectedLeadForCall.id}
                </span>
                <h3 className="font-bold text-sm text-white uppercase mt-1 leading-tight">
                  Formulario: {selectedLeadForCall.businessName}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLeadForCall(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCallLog} className="space-y-4 mt-4 font-sans">
              
              {/* Questionnaire Form Grid */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Contactado (Sí/No) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
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
                          className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            active 
                              ? 'bg-violet-600/25 border-violet-500 text-violet-300 font-extrabold' 
                              : 'bg-slate-950 border-white/5 text-slate-400'
                          }`}
                        >
                          {v === 'Sí' ? '✔️ Sí' : '❌ No'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Responde (Sí/No) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
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
                          className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            active 
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-extrabold' 
                              : 'bg-slate-950 border-white/5 text-slate-400'
                          }`}
                        >
                          {v === 'Sí' ? '✔️ Sí' : '❌ No'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ¿Era el dueño? (Sí/No) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
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
                          className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            active 
                              ? 'bg-rose-500/15 border-rose-500 text-rose-350' 
                              : 'bg-slate-950 border-white/5 text-slate-400'
                          }`}
                        >
                          {v === 'Sí' ? '👑 Sí, el dueño' : '❌ No'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Temperatura */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-rose-455 uppercase tracking-widest font-bold">
                    TEMPERATURA (VENTAS)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Frío', 'Templado', 'Caliente'].map(val => {
                      const active = callTemperature === val;
                      let styles = '';
                      if (val === 'Caliente') styles = active ? 'bg-rose-500/25 border-rose-500 text-rose-300' : 'bg-slate-950 border-white/5 text-slate-400';
                      else if (val === 'Templado') styles = active ? 'bg-amber-500/25 border-amber-500 text-amber-300' : 'bg-slate-950 border-white/5 text-slate-400';
                      else styles = active ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-slate-950 border-white/5 text-slate-400';
                      
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCallTemperature(val as any)}
                          className={`py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${styles}`}
                        >
                          {val === 'Caliente' ? '🔥' : val === 'Templado' ? '⚡' : '❄️'} {val}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* AGENDADA (SI / NO / LLAMAR MAS TARDE) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold text-amber-450">
                  ¿CITA AGENDADA / POSTERGACIÓN?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'Sí', label: '📅 Sí, Cita Agendada' },
                    { val: 'No', label: '❌ No' },
                    { val: 'Llamar más tarde', label: '⏳ Llamar más tarde (Poner fecha)' }
                  ].map(item => {
                    const active = callScheduled === item.val;
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setCallScheduled(item.val as any)}
                        className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center leading-tight ${
                          active 
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                            : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LLAMAR MAS TARDE FIELDS */}
              {callScheduled === 'Llamar más tarde' && (
                <div className="p-4 bg-amber-500/5 rounded-2.5xl border border-amber-500/20 space-y-3 animation-fade-in text-left">
                  <div className="flex items-center gap-1 text-light">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                      Calendario de Llamada de Retorno
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400 font-bold font-mono">FECHA (CALENDARIO)</label>
                      <input
                        type="date"
                        required
                        value={callCallbackDate}
                        onChange={e => setCallCallbackDate(e.target.value)}
                        className="w-full bg-[#050510] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400 font-bold font-mono">HORA RELLAMADA</label>
                      <input
                        type="time"
                        value={callCallbackTime}
                        onChange={e => setCallCallbackTime(e.target.value)}
                        className="w-full bg-[#050510] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* NOTES */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                  NOTAS DE SEGUIMIENTO (QUÉ COMENTÓ EL CLIENTE)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Escribe aquí las objeciones, respuestas del dueño, dossier enviado, o detalles a tener en cuenta para la rellamada..."
                  value={callNotes}
                  onChange={e => setCallNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all resize-none placeholder:text-slate-600"
                />
              </div>

              {/* ACTION COMMANDS */}
              <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedLeadForCall(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-205 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-5.5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition duration-240 cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                >
                  Registrar Formulario
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
