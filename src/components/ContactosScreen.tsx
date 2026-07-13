import React, { useState, useEffect } from 'react';
import { db } from '../supabaseClient';
import { InquiryMessage } from '../types';
import { 
 Inbox, 
 Archive, 
 Trash2, 
 Search, 
 Mail, 
 Calendar, 
 Clock, 
 User, 
 MessageSquare, 
 CheckCircle2, 
 FolderPlus,
 RefreshCw,
 AlertCircle,
 FolderOpen
} from 'lucide-react';

export default function ContactosScreen() {
 const [inquiries, setInquiries] = useState<InquiryMessage[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('active');
 const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
 const [deleteId, setDeleteId] = useState<string | null>(null);

 const fetchInquiries = async () => {
 setIsLoading(true);
 try {
  // Try to load from Supabase
  const remote = await db.getInquiries();
  const sorted = remote.sort((a, b) => {
  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  setInquiries(sorted);
  if (sorted.length > 0 && !selectedInquiryId) {
  setSelectedInquiryId(sorted[0].id);
  }
 } catch (err) {
  console.warn("Could not query inquiries from Supabase:", err);
  setInquiries([]);
 } finally {
  setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchInquiries();
 }, []);

 const handleArchive = async (inq: InquiryMessage) => {
 const updatedStatus = !inq.archived;
 const itemToUpdate = { ...inq, archived: updatedStatus };
 
 // 1. Update state
 setInquiries(prev => prev.map(item => item.id === inq.id ? itemToUpdate : item));
 
 // 2. Persist in Supabase
 try {
  await db.updateInquiry(itemToUpdate);
 } catch (err) {
  console.warn("Could not update archived state in Supabase:", err);
 }
 };

 const handleDelete = (id: string) => {
 setDeleteId(id);
 };

 const confirmDelete = async (id: string) => {
 // 1. Update state
 setInquiries(prev => prev.filter(item => item.id !== id));
 if (selectedInquiryId === id) {
  setSelectedInquiryId(null);
 }

 // 2. Persist in Supabase
 try {
  await db.deleteInquiry(id);
 } catch (err) {
  console.warn("Could not delete from Supabase:", err);
 }
 };

 // Filter & search logic
 const filtered = inquiries.filter(item => {
 const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       item.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
       item.message.toLowerCase().includes(searchQuery.toLowerCase());
 
 if (filter === 'active') return matchesSearch && !item.archived;
 if (filter === 'archived') return matchesSearch && item.archived;
 return matchesSearch;
 });

 const selectedInquiry = inquiries.find(item => item.id === selectedInquiryId) || filtered[0] || null;

 return (
 <div className="w-full h-full overflow-y-auto p-8 scrollbar-thin">
  <div className="space-y-6 max-w-7xl mx-auto pb-12">
  
  {/* Page Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
  <div>
   <div className="flex items-center gap-2">
   <span className="text-[10px] uppercase font-mono tracking-widest text-[#10b981] font-semibold bg-[#10b981]/10 px-2.5 py-1 rounded">
    Inbox de Clientes
   </span>
   <span className="text-slate-500">•</span>
   <span className="text-xs text-slate-400 font-sans font-light">Contactos desde la Landing Page</span>
   </div>
   <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1.5">Contactos Recibidos</h2>
   <p className="text-xs text-slate-400 font-light mt-0.5">
   Sincronización directa en Supabase con los formularios enviados por potenciales clientes.
   </p>
  </div>

  <button
   onClick={fetchInquiries}
   disabled={isLoading}
   className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-white/5 shadow cursor-pointer transition"
  >
   <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
   <span>Refrescar Entrada</span>
  </button>
  </div>

  {/* Filters Hub banner card */}
  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4 justify-between backdrop-blur-3xl">
  <div className="flex items-center gap-1.5 w-full md:w-auto">
   <button
   onClick={() => setFilter('active')}
   className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
    filter === 'active' ?
    'bg-blue-500/15 text-blue-400 border border-blue-500/25'
    : 'text-slate-400 hover:text-white hover:bg-white/5'
   }`}
   >
   <Inbox className="w-3.5 h-3.5" />
   <span>Activos ({inquiries.filter(i => !i.archived).length})</span>
   </button>
   <button
   onClick={() => setFilter('archived')}
   className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
    filter === 'archived' ?
    'bg-amber-500/15 text-amber-400 border border-amber-500/25'
    : 'text-slate-400 hover:text-white hover:bg-white/5'
   }`}
   >
   <Archive className="w-3.5 h-3.5" />
   <span>Archivados ({inquiries.filter(i => i.archived).length})</span>
   </button>
   <button
   onClick={() => setFilter('all')}
   className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
    filter === 'all' ?
    'bg-white/10 text-white'
    : 'text-slate-400 hover:text-white hover:bg-white/5'
   }`}
   >
   <span>Todos ({inquiries.length})</span>
   </button>
  </div>

  {/* Search */}
  <div className="relative w-full md:w-80">
   <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
   <input
   type="text"
   placeholder="Buscar por remitente, email o texto..."
   value={searchQuery}
   onChange={(e) => setSearchQuery(e.target.value)}
   className="w-full bg-slate-950 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
   />
  </div>
  </div>

  {selectedInquiryId && selectedInquiry && (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
   
   {/* List items block */}
   <div className="lg:col-span-6 space-y-3 max-h-[600px] overflow-y-auto pr-1">
   {filtered.length === 0 ? (
    <div className="bg-slate-950/60 border border-white/5 text-center p-16 rounded-3xl">
    <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
    <p className="text-slate-400 text-xs font-semibold">No hay contactos en este estado</p>
    <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1">
     Los registros de formularios recibidos aparecerán aquí en tiempo real cuando un usuario rellene la sección inferior de la landing.
    </p>
    </div>
   ) : (
    filtered.map((item) => {
    const isActive = item.id === selectedInquiryId;
    const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES', {
     day: 'numeric',
     month: 'short',
     hour: '2-digit',
     minute: '2-digit'
    }) : 'Recientemente';
    
    return (
     <div
     key={item.id}
     onClick={() => setSelectedInquiryId(item.id)}
     className={`bg-slate-950/40 p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative group overflow-hidden ${
      isActive  ?
      'border-blue-500/40 bg-blue-500/[0.02]'
      : 'border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
     }`}
     >
     {isActive && (
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
     )}
     
     <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">
       {item.name.slice(0, 1).toUpperCase()}
      </div>
      <div>
       <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors leading-none">{item.name}</p>
       <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.email}</p>
      </div>
      </div>
      
      <span className="text-[9px] text-slate-500 font-mono">{formattedDate}</span>
     </div>

     <p className="text-xs text-slate-400 line-clamp-2 mt-1 px-1">
      {item.message || '(Sin mensaje adicional)'}
     </p>

     <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-1.5">
      <div className="flex items-center gap-2">
      {item.archived && (
       <span className="text-[8px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
       Archivado
       </span>
      )}
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
       onClick={(e) => { e.stopPropagation(); handleArchive(item); }}
       className="p-1.5 bg-slate-900 border border-white/10 text-slate-400 hover:text-white rounded hover:bg-amber-600 transition cursor-pointer"
       title={item.archived ? "Mover a la bandeja de activos" : "Archivar contacto"}
      >
       <Archive className="w-3.5 h-3.5" />
      </button>
      <button
       onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
       className="p-1.5 bg-slate-900 border border-white/10 text-slate-400 hover:text-red-400 rounded hover:bg-red-950 transition cursor-pointer"
       title="Eliminar de base de datos"
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

   {/* Detailed Inspector block */}
   <div className="lg:col-span-6">
   <div className="bg-[#050b1d] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 relative sticky top-6">
    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
    
    {/* Header card metadata */}
    <div className="flex items-start justify-between border-b border-white/5 pb-4">
    <div className="flex items-center gap-3">
     <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-black font-mono">
     {selectedInquiry.name.slice(0, 1).toUpperCase()}
     </div>
     <div>
     <h3 className="text-base font-extrabold text-white tracking-tight leading-none">{selectedInquiry.name}</h3>
     <p className="text-[11px] font-mono text-slate-400 mt-1 select-all">{selectedInquiry.email}</p>
     </div>
    </div>

    <div className="text-right">
     <span className="text-[10px] font-mono text-slate-500 block">Fecha y Hora</span>
     <span className="text-[11px] text-slate-300 font-medium">
     {selectedInquiry.created_at ? new Date(selectedInquiry.created_at).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
     }) : 'Ahora'}
     </span>
    </div>
    </div>

    {/* Message text description box */}
    <div className="space-y-1.5 bg-slate-950 border border-white/5 rounded-2xl p-4.5">
    <span className="text-[9px] font-mono text-slate-500 uppercase block font-semibold">Detalle del Mensaje Enviado</span>
    <p className="text-slate-200 text-xs leading-relaxed select-text whitespace-pre-line">
     {selectedInquiry.message || '(Este cliente no incluyó ningún mensaje en los campos del formulario de entrada)'}
    </p>
    </div>

    {/* Metadata / Recommended actions list */}
    <div className="space-y-3">
    <span className="text-[9px] font-mono text-slate-500 uppercase block font-semibold">Acciones Recomendadas</span>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
     
     {/* Action 1 */}
     <a 
     href={`mailto:${selectedInquiry.email}?subject=Contacto recibido - Althera Solutions&body=Hola ${selectedInquiry.name}, gracias por contactar con Althera Solutions...`}
     className="p-3 bg-white/[0.02] border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/[0.02] rounded-xl text-left transition flex items-center gap-3 group select-none cursor-pointer"
     >
     <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/25 flex items-center justify-center border border-amber-500/10">
      <Mail className="w-4 h-4" />
     </div>
     <div>
      <p className="text-xs font-bold text-white leading-none">Responder Correo</p>
      <p className="text-[9px] text-slate-500 mt-1">Enviar email primario</p>
     </div>
     </a>

     {/* Action 2 */}
     <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-left select-none">
     <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
      <p className="text-xs font-bold text-white leading-none">Id del Recibo</p>
     </div>
     <p className="text-[10px] font-mono text-slate-400 mt-2 truncate bg-slate-950 px-2 py-0.5 rounded leading-normal">
      {selectedInquiry.id}
     </p>
     </div>
    </div>
    </div>

    {/* Status footer buttons */}
    <div className="flex items-center justify-between border-t border-white/5 pt-5">
    <button
     onClick={() => handleArchive(selectedInquiry)}
     className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition ${
     selectedInquiry.archived ?
      'bg-amber-600/10 text-amber-400 border border-amber-600/25 hover:bg-amber-600/20'
      : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white'
     }`}
    >
     <Archive className="w-4 h-4" />
     <span>{selectedInquiry.archived ? 'Desarchivar' : 'Archivar en Histórico'}</span>
    </button>

    <button
     onClick={() => handleDelete(selectedInquiry.id)}
     className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/15 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition shadow"
    >
     <Trash2 className="w-4 h-4" />
     <span>Eliminar Contacto</span>
    </button>
    </div>

   </div>
   </div>

  </div>
  )}

  {/* Empty visual representation */}
  {(!selectedInquiryId || inquiries.length === 0) && (
  <div className="bg-slate-950/20 border border-white/5 p-20 text-center rounded-3xl">
   < Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
   <h3 className="font-bold text-white text-sm">No has recibido mensajes todavía</h3>
   <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
   Los datos enviados en la página de inicio se sincronizan por lotes directamente aquí en la sección de Contactos de Landing.
   </p>
  </div>
  )}

  {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE CONTACTO */}
  {deleteId && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
   <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
   <div className="flex items-start gap-3">
    <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
    <Trash2 className="w-6 h-6" />
    </div>
    <div className="space-y-1">
    <h4 className="text-sm font-sans font-bold text-white uppercase tracking-wide">
     ¿Eliminar Contacto?
    </h4>
    <p className="text-xs text-slate-400 leading-relaxed font-sans">
     ¿Estás seguro de que deseas eliminar permanentemente este contacto de la base de datos de forma definitiva? Esta acción es irreversible.
    </p>
    </div>
   </div>
   <div className="flex gap-3 justify-end pt-2">
    <button
    type="button"
    onClick={() => setDeleteId(null)}
    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer font-sans"
    >
    Cancelar
    </button>
    <button
    type="button"
    onClick={() => {
     if (deleteId) {
     confirmDelete(deleteId);
     setDeleteId(null);
     }
    }}
    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition duration-240 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.3)] font-sans"
    >
    Eliminar Registro
    </button>
   </div>
   </div>
  </div>
  )}

  </div>
 </div>
 );
}
