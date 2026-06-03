import React, { useState } from 'react';
import { CalendarEvent, ClientContact } from '../types';
import { 
  Calendar, 
  Clock, 
  User, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  Edit2, 
  Tag, 
  Search, 
  Filter, 
  AlertCircle,
  CheckCircle,
  FileText,
  Clock3,
  Paintbrush
} from 'lucide-react';

interface CitasScreenProps {
  events: CalendarEvent[];
  contacts: ClientContact[];
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  usersList?: any[];
  onAddProfile?: (profile: { name: string; email: string }) => void;
}

const PRESET_COLORS = [
  { name: 'Dorado Althera', hex: '#D4AF37' },
  { name: 'Bronce Suave', hex: '#CD7F32' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Boreal', hex: '#3B82F6' },
  { name: 'Rubí', hex: '#EF4444' },
  { name: 'Púrpura', hex: '#8B5CF6' }
];

export default function CitasScreen({ 
  events, 
  contacts, 
  onAddEvent, 
  onUpdateEvent, 
  onDeleteEvent,
  usersList = [],
  onAddProfile
}: CitasScreenProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done' | 'postponed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Modal state for quickly scheduling an appointment
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('10:00');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<CalendarEvent['type']>('Meeting');
  const [linkedContactId, setLinkedContactId] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newColor, setNewColor] = useState('#D4AF37');
  const [newAssignedUserEmail, setNewAssignedUserEmail] = useState('');

  // Quick collaborator states
  const [showQuickAddCollab, setShowQuickAddCollab] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');

  // Individual Appointment Editing state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'done' | 'postponed'>('pending');
  const [editAssignedUserEmail, setEditAssignedUserEmail] = useState('');

  // Submit new appointment
  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const matchedContact = contacts.find(c => c.id === linkedContactId);
    const matchedUser = usersList.find(u => u.email === newAssignedUserEmail);

    const generatedEvent: CalendarEvent = {
      id: 'ev_' + Date.now().toString().slice(-6),
      title: newTitle,
      date: newDate,
      time: newTime,
      type: newType,
      description: newDescription,
      linkedContactId: linkedContactId || undefined,
      linkedContactName: matchedContact ? matchedContact.name : undefined,
      status: 'pending',
      color: newColor,
      alias: newAlias.trim() || undefined,
      assignedUserEmail: newAssignedUserEmail || undefined,
      assignedUserId: matchedUser ? matchedUser.id : undefined
    };

    onAddEvent(generatedEvent);
    setShowAddModal(false);
    
    // Reset
    setNewTitle('');
    setNewDescription('');
    setNewAlias('');
    setLinkedContactId('');
    setNewColor('#D4AF37');
    setNewAssignedUserEmail('');
  };

  // Quick edit status or color directly
  const handleUpdateStatus = (event: CalendarEvent, status: 'pending' | 'done' | 'postponed') => {
    onUpdateEvent({
      ...event,
      status
    });
  };

  const handleUpdateColor = (event: CalendarEvent, colorHex: string) => {
    onUpdateEvent({
      ...event,
      color: colorHex
    });
  };

  const handleUpdateAlias = (event: CalendarEvent, aliasValue: string) => {
    onUpdateEvent({
      ...event,
      alias: aliasValue.trim() || undefined
    });
  };

  // Start row inline editor
  const startEditing = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setEditAlias(event.alias || '');
    setEditColor(event.color || '#D4AF37');
    setEditStatus(event.status || 'pending');
    setEditAssignedUserEmail(event.assignedUserEmail || '');
  };

  const saveRowEdit = (event: CalendarEvent) => {
    const matchedUser = usersList.find(u => u.email === editAssignedUserEmail);
    onUpdateEvent({
      ...event,
      alias: editAlias.trim() || undefined,
      color: editColor,
      status: editStatus,
      assignedUserEmail: editAssignedUserEmail || undefined,
      assignedUserId: matchedUser ? matchedUser.id : undefined
    });
    setEditingEventId(null);
  };

  // Filter computation
  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ev.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ev.alias && ev.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (ev.linkedContactName && ev.linkedContactName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || ev.status === statusFilter;
    const matchesType = typeFilter === 'all' || ev.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 p-6">
      
      {/* Intro Header Section */}
      <div className="bg-[#080808] border border-amber-500/10 rounded-3xl p-6 relative overflow-hidden group shadow-2xl">
        <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-amber-500/10 transition-all duration-700" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-3">
              <span className="gold-gradient p-2 rounded-xl text-black font-semibold flex items-center justify-center">
                <Calendar className="w-5 h-5 text-black" />
              </span>
              <span className="gold-gradient-text font-display">Gestión de Citas Althera</span>
            </h2>
            <p className="text-slate-400 text-xs font-light mt-1 max-w-2xl leading-relaxed">
              Administra todas las reservas y reuniones en formato lista. Cambia colores para categorizar visualmente, asigna estados o añade alias personalizados en tiempo real.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition duration-300 flex items-center gap-2 active:scale-95 shadow-[0_4px_15px_rgba(212,175,55,0.2)] mt-2 md:mt-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black stroke-[3px]" />
            <span>Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* Control Filters Toolbar */}
      <div className="bg-black/60 backdrop-blur-md border border-amber-500/10 p-4 rounded-3xl flex flex-col lg:flex-row items-stretch lg:items-center gap-4 justify-between shadow-lg">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, contacto, descripción o alias..."
            className="w-full bg-neutral-950 border border-neutral-850/60 focus:border-amber-500/45 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-light"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[11px]">
            <Search className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`text-[10px] uppercase font-semibold tracking-wider px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-amber-500/10 border-amber-500/40 text-[#D4AF37] shadow-md shadow-amber-500/5'
                : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            Todas
          </button>
          
          <button
            onClick={() => setStatusFilter('pending')}
            className={`text-[10px] uppercase font-semibold tracking-wider px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500/10 border-amber-500/40 text-[#D4AF37] shadow-md shadow-amber-500/5'
                : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            Pendientes
          </button>

          <button
            onClick={() => setStatusFilter('done')}
            className={`text-[10px] uppercase font-semibold tracking-wider px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'done'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5'
                : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            Completadas
          </button>

          <button
            onClick={() => setStatusFilter('postponed')}
            className={`text-[10px] uppercase font-semibold tracking-wider px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'postponed'
                ? 'bg-[#cd7f32]/10 border-[#cd7f32]/30 text-[#cd7f32] shadow-md shadow-amber-900/5'
                : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            Pospuestas
          </button>
        </div>

        {/* Type selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-mono">Tipo:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">Cualquiera</option>
            <option value="Meeting">Reuniones</option>
            <option value="Review">Revisiones</option>
            <option value="Deadline">Entregas</option>
            <option value="Kickoff">Kickoffs</option>
            <option value="Other">Otro</option>
          </select>
        </div>
      </div>

      {/* Main List Table View styled extremely sleek & gold-black luxury */}
      <div className="bg-[#050505] border border-amber-500/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-amber-500/10">
                <th className="py-4.5 px-6">Identificador / Título</th>
                <th className="py-4.5 px-3">Fecha y Hora</th>
                <th className="py-4.5 px-3">Cliente Asignado</th>
                <th className="py-4.5 px-3">Alias / Notas</th>
                <th className="py-4.5 px-3">Color de Control</th>
                <th className="py-4.5 px-3">Asignado a</th>
                <th className="py-4.5 px-3">Estado</th>
                <th className="py-4.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-950">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-xs font-light">
                    No se encontraron citas configuradas que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((item) => {
                  const isEditing = editingEventId === item.id;
                  
                  // Color bullet
                  const currentColor = item.color || '#D4AF37';

                  return (
                    <tr 
                      key={item.id} 
                      className="group/row bg-black/20 hover:bg-amber-500/[0.015] transition-all duration-150 border-b border-neutral-900/40"
                    >
                      {/* Title & Info */}
                      <td className="py-4 px-6 text-left max-w-xs">
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-lg" 
                            style={{ backgroundColor: currentColor, boxShadow: `0 0 10px ${currentColor}33` }} 
                          />
                          <div>
                            <span className="text-[9px] text-slate-500 font-mono block tracking-wider uppercase">
                              {item.id} - {item.type}
                            </span>
                            <span className="text-white text-xs font-semibold block mt-0.5 group-hover/row:text-amber-100 transition-colors">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-light block mt-0.5 line-clamp-1 italic">
                              {item.description || 'Sin descripción'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-3 text-left">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-amber-500/60" />
                            {item.date}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-1 font-mono flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-500/40" />
                            {item.time} ({item.duration || '60m'})
                          </span>
                        </div>
                      </td>

                      {/* Client info */}
                      <td className="py-4 px-3 text-left">
                        {item.linkedContactName ? (
                          <div className="inline-flex items-center gap-1.5 bg-neutral-900/60 border border-neutral-800 px-2.5 py-1 rounded-full text-xs text-slate-200">
                            <User className="w-3 h-3 text-amber-400" />
                            <span>{item.linkedContactName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px] italic font-light">- Sin asignar -</span>
                        )}
                      </td>

                      {/* Alias / Nickname */}
                      <td className="py-4 px-3 text-left">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editAlias}
                            onChange={(e) => setEditAlias(e.target.value)}
                            placeholder="Ej. VIP, Filtro oro..."
                            className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-500 max-w-[130px]"
                          />
                        ) : (
                          <div>
                            {item.alias ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                                <Tag className="w-2.5 h-2.5" />
                                <span>{item.alias}</span>
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs font-light italic">Sin alias</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Color Modifier */}
                      <td className="py-4 px-3 text-left">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1 max-w-[100px]">
                            {PRESET_COLORS.map(c => (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => setEditColor(c.hex)}
                                className={`w-4 h-4 rounded-full border transition-all ${
                                  editColor === c.hex ? 'ring-2 ring-amber-400 scale-125 border-white' : 'border-neutral-800 hover:scale-110'
                                }`}
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentColor }} />
                            <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold">
                              {PRESET_COLORS.find(c => c.hex === currentColor)?.name || 'Personalizado'}
                            </span>
                            <div className="opacity-0 group-hover/row:opacity-100 transition-opacity ml-1 flex gap-1">
                              {PRESET_COLORS.slice(0, 3).map(colorOpt => (
                                <button
                                  key={colorOpt.hex}
                                  onClick={() => handleUpdateColor(item, colorOpt.hex)}
                                  className="w-2.5 h-2.5 rounded-full hover:scale-125 border border-black/50"
                                  style={{ backgroundColor: colorOpt.hex }}
                                  title={colorOpt.name}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Assigned User */}
                      <td className="py-4 px-3 text-left">
                        {isEditing ? (
                          <select
                            value={editAssignedUserEmail}
                            onChange={(e) => setEditAssignedUserEmail(e.target.value)}
                            className="bg-neutral-950 border border-neutral-800 text-xs text-slate-350 rounded-xl px-1.5 py-1 focus:outline-none focus:border-amber-500 max-w-[130px] cursor-pointer"
                          >
                            <option value="">- Sin asignar -</option>
                            {usersList.map(u => (
                              <option key={u.id} value={u.email}>{u.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            {item.assignedUserEmail ? (
                              <div className="inline-flex items-center gap-1.5 bg-blue-950/40 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs text-slate-200">
                                <User className="w-3 h-3 text-blue-400" />
                                <span className="truncate max-w-[85px]">{usersList.find(u => u.email === item.assignedUserEmail)?.name || item.assignedUserEmail}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-[11px] italic font-light">- Sin asignar -</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status select or preview */}
                      <td className="py-4 px-3 text-left">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e: any) => setEditStatus(e.target.value)}
                            className="bg-neutral-950 border border-neutral-800 text-xs text-slate-300 rounded-xl px-2 py-1 focus:outline-none"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="done">Realizada</option>
                            <option value="postponed">Pospuesta</option>
                          </select>
                        ) : (
                          <div>
                            {item.status === 'done' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg cursor-pointer" onClick={() => handleUpdateStatus(item, 'pending')}>
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                Realizada
                              </span>
                            ) : item.status === 'postponed' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#cd7f32] bg-[#cd7f32]/10 border border-[#cd7f32]/20 px-2 py-0.5 rounded-lg cursor-pointer" onClick={() => handleUpdateStatus(item, 'done')}>
                                <Clock3 className="w-3 h-3" />
                                Pospuesta
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg cursor-pointer" onClick={() => handleUpdateStatus(item, 'done')}>
                                <AlertCircle className="w-3 h-3" />
                                Pendiente
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveRowEdit(item)}
                                className="p-1 px-2 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                                OK
                              </button>
                              <button
                                onClick={() => setEditingEventId(null)}
                                className="p-1 px-2 bg-neutral-900 border border-neutral-800 text-slate-400 hover:text-white rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition"
                              >
                                <X className="w-3.5 h-3.5" />
                                Atrás
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(item)}
                                className="p-1.5 bg-neutral-900/60 border border-white/5 text-slate-400 hover:text-[#D4AF37] hover:border-amber-500/30 rounded-xl transition duration-200 cursor-pointer text-xs flex items-center gap-1"
                                title="Editar alias, color o estado"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Detalle</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("¿Estás seguro de que deseas eliminar esta cita de la base de datos?")) {
                                    onDeleteEvent(item.id);
                                  }
                                }}
                                className="p-1.5 text-slate-600 hover:text-rose-450 hover:bg-rose-500/5 rounded-xl cursor-pointer transition"
                                title="Eliminar cita"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {/* QUICK NEW APPOINTMENT FLOATING ACTION DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#0d0d0d] border border-amber-500/30 rounded-3xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 text-slate-350">
            
            <div className="flex justify-between items-center mb-5 border-b border-amber-500/10 pb-3">
              <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Programar Nueva Cita</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Título de la Cita</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej. Revisión de Maqueta Web"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Fecha</label>
                  <input 
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Hora de Inicio</label>
                  <input 
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Vincular a un Cliente</label>
                <select
                  value={linkedContactId}
                  onChange={(e) => setLinkedContactId(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">- Ninguno / Consulta General -</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Asignar a Miembro del Equipo</label>
                  <button 
                    type="button" 
                    onClick={() => setShowQuickAddCollab(!showQuickAddCollab)}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    {showQuickAddCollab ? 'Cancelar' : '+ Crear Miembro'}
                  </button>
                </div>
                
                {showQuickAddCollab ? (
                  <div className="bg-neutral-900 border border-amber-500/20 p-3 rounded-xl space-y-2 mt-1">
                    <input 
                      type="text"
                      placeholder="Nombre del colaborador"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <input 
                        type="email"
                        placeholder="Email (ej. nacho@gmail.com)"
                        value={quickEmail}
                        onChange={(e) => setQuickEmail(e.target.value)}
                        className="flex-1 bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
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
                        className="px-3 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400"
                      >
                        Crear
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={newAssignedUserEmail}
                    onChange={(e) => setNewAssignedUserEmail(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">- Sin asignar -</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Tipo</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Meeting">Meeting / Reunión</option>
                    <option value="Review">Review / Revisión</option>
                    <option value="Deadline">Deadline / Entrega</option>
                    <option value="Kickoff">Kickoff inicial</option>
                    <option value="Other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Alias Personalizado</label>
                  <input 
                    type="text"
                    placeholder="Ej. Prioridad oro, VIP..."
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Color Preset Choice */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold block mb-2">Color del Indicador</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewColor(c.hex)}
                      className={`w-7 h-7 rounded-full border transition-all ${
                        newColor === c.hex ? 'ring-2 ring-amber-400 scale-110 border-white' : 'border-neutral-800 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Notas / Detalles adicionales</label>
                <textarea 
                  rows={2}
                  placeholder="Detalles sobre el contenido o requerimientos de esta sesión..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 placeholder-slate-600 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-300 transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-black font-extrabold rounded-xl text-xs uppercase shadow-lg shadow-amber-500/10 transition-all cursor-pointer text-center hover:brightness-110"
                >
                  Registrar Cita
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
