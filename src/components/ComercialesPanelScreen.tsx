import React, { useState } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';
import { ComercialAccount, ComercialLead } from '../types';

interface ComercialesPanelScreenProps {
  comercial: ComercialAccount;
  leadsList: ComercialLead[];
  onAddLead: (lead: ComercialLead) => void;
  onUpdateLead: (lead: ComercialLead) => void;
  onDeleteLead: (id: string) => void;
  onLogout: () => void;
}

export default function ComercialesPanelScreen({
  comercial,
  leadsList,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onLogout
}: ComercialesPanelScreenProps) {
  // Local state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [leadTemperature, setLeadTemperature] = useState<'Frío' | 'Templado' | 'Caliente'>('Frío');

  // Form state
  const [leadName, setLeadName] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadStatus, setLeadStatus] = useState<ComercialLead['status']>('Pendiente');
  const [leadValue, setLeadValue] = useState('');
  const [leadNotes, setLeadNotes] = useState('');

  // Filtering leads belonging to THIS commercial
  const myLeads = leadsList.filter(l => l.comercialId === comercial.id);

  // Compute stats
  const totalLeads = myLeads.length;
  const wonLeads = myLeads.filter(l => l.status === 'Ganado');
  const conversionRate = totalLeads ? Math.round((wonLeads.length / totalLeads) * 100) : 0;
  
  // Pipeline value
  const totalPipeline = myLeads.reduce((sum, l) => sum + (l.status !== 'Perdido' ? Number(l.value || 0) : 0), 0);
  const wonRevenue = wonLeads.reduce((sum, l) => sum + Number(l.value || 0), 0);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Decorative localized glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/5 blur-[130px] pointer-events-none" />

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
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition duration-200 text-xs shadow-lg shadow-amber-500/5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Registrar Lead</span>
          </button>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
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

        </div>

        {/* ANALYTICS CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Status Distribution Custom SVG premium chart */}
          <div className="lg:col-span-7 bg-white/[0.02] border border-white/5 p-6 rounded-2.5xl text-left">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-4">Pipeline Distribution Analytics</h3>
            
            <div className="space-y-4">
              {Object.entries(statusCounts).map(([status, count]) => {
                const percentage = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
                
                // Colors
                let barColor = 'bg-slate-500';
                if (status === 'Contactado') barColor = 'bg-blue-500';
                if (status === 'Negociación') barColor = 'bg-amber-500';
                if (status === 'Ganado') barColor = 'bg-emerald-500';
                if (status === 'Perdido') barColor = 'bg-rose-500';

                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${barColor}`} />
                        <span className="font-semibold text-slate-300">{status}</span>
                      </div>
                      <span className="font-mono text-slate-400">
                        {count} {count === 1 ? 'lead' : 'leads'} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${barColor} rounded-full transition-all duration-700`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick insights card */}
          <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 p-6 rounded-2.5xl text-left flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Información de Rendimiento</h3>
              
              <div className="space-y-4 pt-1">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Éxito Comercial</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                      Has cerrado con éxito {wonLeads.length} leads comerciales, generando valor por {wonRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Negociación Activa</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                      Tienes {statusCounts.Negociación} prospectos en fase de negociación crítica. Mantén el contacto recurrente para optimizar su tasa de conversión.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>Rendimiento Actualizado</span>
              <span>Althera CRM Ventas v1.2</span>
            </div>
          </div>

        </div>

        {/* LEADS SYSTEM DATA TABLE */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2.5xl p-6 text-left space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Cartera de Leads del Comercial</h3>
              <p className="text-xs text-slate-500 mt-1">Busca, filtra, edita estados e ingresa notas de seguimiento de tus leads.</p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtro rápido..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-[#050505] text-xs text-white pl-9 pr-4 py-2 rounded-xl border border-white/5 focus:border-violet-500 focus:outline-none transition-all w-44"
                />
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-1.5 bg-[#050505] p-1 rounded-xl border border-white/5">
                {['todos', 'Pendiente', 'Contactado', 'Negociación', 'Ganado', 'Perdido'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setStatusFilter(opt)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      statusFilter === opt
                        ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                        : 'text-slate-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    {opt === 'todos' ? 'Todos' : opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="text-center py-16 bg-black/20 border border-white/5 rounded-2.5xl p-6">
              <Inbox className="w-10 h-10 text-slate-500/30 mx-auto mb-3" />
              <p className="text-slate-400 text-xs font-semibold">No se encontraron leads.</p>
              <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto mt-1 leading-normal">
                No hay resultados que coincidan con estos criterios. ¡Prueba a crear un lead con el botón superior!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-350">
                <thead>
                  <tr className="border-b border-white/5 text-slate-440 uppercase font-mono font-bold tracking-wider text-[10px] pb-3">
                    <th className="pb-3 pl-2">Contacto</th>
                    <th className="pb-3">Empresa</th>
                    <th className="pb-3">Valor (€)</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Canal de Contacto</th>
                    <th className="pb-3 pr-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-xs">{lead.name}</p>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            lead.temperature === 'Caliente' ? 'bg-rose-500/15 text-rose-400 border border-rose-550/20' :
                            lead.temperature === 'Templado' ? 'bg-amber-500/15 text-amber-400 border border-amber-550/20' :
                            'bg-sky-500/15 text-sky-400 border border-sky-550/20'
                          }`}>
                            {lead.temperature === 'Caliente' ? 'Caliente 🔥' : lead.temperature === 'Templado' ? 'Templado ⚡' : 'Frío ❄️'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] truncate" title={lead.notes}>
                          {lead.notes || 'Sin anotaciones de seguimiento.'}
                        </p>
                      </td>
                      <td className="py-4 font-semibold text-slate-300">
                        {lead.company}
                      </td>
                      <td className="py-4 font-mono font-bold text-amber-500">
                        {(lead.value || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateStatus(lead.id, e.target.value as ComercialLead['status'])}
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border focus:outline-none cursor-pointer ${
                              lead.status === 'Pendiente' ? 'bg-slate-500/10 text-slate-300 border-slate-500/25' :
                              lead.status === 'Contactado' ? 'bg-blue-500/10 text-blue-300 border-blue-500/25' :
                              lead.status === 'Negociación' ? 'bg-amber-500/10 text-amber-300 border-amber-500/25' :
                              lead.status === 'Ganado' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' :
                              'bg-rose-500/10 text-rose-300 border-rose-500/25'
                            }`}
                          >
                            <option value="Pendiente" className="bg-slate-900 text-slate-300">Pendiente</option>
                            <option value="Contactado" className="bg-slate-900 text-blue-300">Contactado</option>
                            <option value="Negociación" className="bg-slate-900 text-amber-300">Negociación</option>
                            <option value="Ganado" className="bg-slate-900 text-emerald-300">Ganado</option>
                            <option value="Perdido" className="bg-slate-900 text-rose-300">Perdido</option>
                          </select>

                          <select
                            value={lead.temperature || 'Frío'}
                            onChange={(e) => {
                              onUpdateLead({
                                ...lead,
                                temperature: e.target.value as 'Frío' | 'Templado' | 'Caliente'
                              });
                            }}
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border focus:outline-none cursor-pointer ${
                              (lead.temperature || 'Frío') === 'Caliente' ? 'bg-rose-500/10 text-rose-455 border-rose-500/25' :
                              (lead.temperature || 'Frío') === 'Templado' ? 'bg-amber-500/10 text-amber-455 border-amber-500/25' :
                              'bg-sky-500/10 text-sky-455 border-sky-500/25'
                            }`}
                          >
                            <option value="Frío" className="bg-slate-900 text-sky-300">❄️ Frío</option>
                            <option value="Templado" className="bg-slate-900 text-amber-300">⚡ Templado</option>
                            <option value="Caliente" className="bg-slate-900 text-rose-300">🔥 Caliente</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="font-semibold text-slate-300">{lead.email}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{lead.phone}</p>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button
                          onClick={() => {
                            if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el lead de ${lead.name}?`)) {
                              onDeleteLead(lead.id);
                            }
                          }}
                          className="text-slate-500 hover:text-red-450 p-1.5 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          title="Eliminar Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#050505] py-6 relative z-10 text-[10px] text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <span>Licencia de Althera Sales CRM activa.</span>
          <span>© {new Date().getFullYear()} Althera Software.</span>
        </div>
      </footer>

      {/* CREATE LEAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090f23] border border-white/10 rounded-3xl p-6 max-w-md w-full relative text-left shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Registrar Nuevo Prospecto (Lead)</h3>
            <p className="text-xs text-slate-400 mb-6">Completa los datos de tu cliente para incorporarlo a tu cartera.</p>

            <form onSubmit={handleCreateLead} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Nombre del Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Laura Gómez"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Empresa / Entidad</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Nova Soluciones"
                    value={leadCompany}
                    onChange={(e) => setLeadCompany(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Email de Contacto</label>
                  <input
                    type="email"
                    placeholder="laura@nova.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Teléfono Móvil</label>
                  <input
                    type="text"
                    placeholder="+34 600 000 000"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Valor Estimado (€)</label>
                  <input
                    type="number"
                    placeholder="Ej. 1200"
                    value={leadValue}
                    onChange={(e) => setLeadValue(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Estado Inicial</label>
                  <select
                    value={leadStatus}
                    onChange={(e) => setLeadStatus(e.target.value as any)}
                    className="w-full bg-[#050505] border border-white/5 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Contactado">Contactado</option>
                    <option value="Negociación">Negociación</option>
                    <option value="Ganado">Ganado</option>
                    <option value="Perdido">Perdido</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-405 font-extrabold text-violet-400">Temperatura del Prospecto</label>
                <div className="grid grid-cols-3 gap-2 bg-[#050505] p-2 border border-white/10 rounded-xl">
                  {[
                    { val: 'Frío', label: '❄️ Frío', activeStyle: 'bg-sky-500/20 border-sky-550 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.15)]' },
                    { val: 'Templado', label: '⚡ Templado', activeStyle: 'bg-amber-500/20 border-amber-550 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]' },
                    { val: 'Caliente', label: '🔥 Caliente', activeStyle: 'bg-rose-500/20 border-rose-550 text-rose-450 shadow-[0_0_10px_rgba(244,63,94,0.15)]' }
                  ].map(item => {
                    const isSelected = leadTemperature === item.val;
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setLeadTemperature(item.val as any)}
                        className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                          isSelected 
                            ? item.activeStyle
                            : 'bg-transparent border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Notas o Comentarios</label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre las necesidades del cliente..."
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full bg-[#050505] border border-white/5 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.35)] font-sans border border-violet-500/20"
                >
                  Confirmar Registro
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
