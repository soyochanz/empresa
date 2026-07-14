import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Plus, Trash2, Video } from 'lucide-react';
import { CalendarEvent, ColdCallingLead, ComercialAccount } from '../types';

interface Props {
  comercial: ComercialAccount;
  events: CalendarEvent[];
  coldLeads: ColdCallingLead[];
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const isoLocal = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CommercialCalendarWorkspace({ comercial, events, coldLeads, onAddEvent, onUpdateEvent, onDeleteEvent }: Props) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(isoLocal(today));
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');

  const myEvents = useMemo(() => {
    const comercialEmail = comercial.email.toLowerCase();
    const assignedEvents = events.filter(event => {
      const assignedEmails = (event.assignedUserEmails || []).map(email => email.toLowerCase());
      return event.comercialId === comercial.id ||
        event.assignedUserEmail?.toLowerCase() === comercialEmail ||
        assignedEmails.includes(comercialEmail) ||
        event.isAllComerciales === true ||
        event.assignedUserEmail?.toLowerCase() === 'todos-comerciales' ||
        assignedEmails.includes('todos-comerciales');
    });
    const eventIds = new Set(assignedEvents.map(event => event.id));
    const postponedClientCalls: CalendarEvent[] = coldLeads
      .filter(lead => !lead.archived && lead.callbackScheduled === 'Llamar más tarde' && !!lead.callbackDate && (
        lead.assignedToEmail?.toLowerCase() === comercialEmail ||
        lead.closingOriginComercialEmail?.toLowerCase() === comercialEmail
      ))
      .map(lead => ({
        id: `cold_callback_${lead.id}`,
        title: `Seguimiento: ${lead.businessName}`,
        date: lead.callbackDate!,
        time: lead.callbackTime || '',
        type: 'Other',
        description: [lead.contactPerson ? `Contacto: ${lead.contactPerson}` : '', lead.phone ? `Teléfono: ${lead.phone}` : '', lead.notes].filter(Boolean).join('\n'),
        linkedContactName: lead.businessName,
        assignedUserEmail: comercial.email,
        comercialId: comercial.id,
        status: 'pending',
        color: '#f59e0b',
        alias: 'Cita pospuesta con cliente',
      }));
    return [...assignedEvents, ...postponedClientCalls.filter(event => !eventIds.has(event.id))];
  }, [events, coldLeads, comercial]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = isoLocal(date);
      return { date, key, currentMonth: date.getMonth() === month, events: myEvents.filter(event => event.date === key) };
    });
  }, [cursor, myEvents]);

  const selectedEvents = myEvents.filter(event => event.date === selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const monthLabel = cursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const selectedLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const createEvent = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onAddEvent({
      id: `evt_com_${Date.now()}`,
      title: title.trim(), date: selectedDate, time, type: meetingUrl.trim() ? 'Meeting' : 'Other',
      notes: notes.trim(), description: notes.trim(), meetingUrl: meetingUrl.trim() || undefined,
      comercialId: comercial.id, assignedUserEmail: comercial.email, status: 'pending', isPrivate: true, color: '#a3e635',
    });
    setTitle(''); setNotes(''); setMeetingUrl(''); setShowCreate(false);
  };

  return <div className="space-y-5 animate-fade-in">
    <section className="flex flex-col gap-4 rounded-3xl border border-white/[0.07] bg-[radial-gradient(circle_at_80%_20%,rgba(163,230,53,.1),transparent_30%),#0b1017] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><div className="flex items-center gap-2 text-lime-300"><CalendarDays className="h-4 w-4"/><span className="text-[9px] font-black uppercase tracking-[.24em]">Workspace personal</span></div><h2 className="mt-2 text-2xl font-black text-white">Calendario de producción</h2><p className="mt-1 text-[10px] text-slate-400">Organiza reuniones, seguimientos y tareas privadas desde tu panel.</p></div><button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-xs font-black text-slate-950 shadow-lg shadow-lime-400/10 transition hover:bg-lime-200"><Plus className="h-4 w-4"/>Nueva tarea</button></section>

    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b1017]/95"><div className="flex items-center justify-between border-b border-white/[0.06] p-4 sm:p-5"><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white"><ChevronLeft className="h-4 w-4"/></button><div className="text-center"><p className="text-sm font-black capitalize text-white">{monthLabel}</p><button onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(isoLocal(today)); }} className="mt-1 text-[9px] font-bold text-lime-300">Volver a hoy</button></div><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white"><ChevronRight className="h-4 w-4"/></button></div>
        <div className="grid grid-cols-7 border-b border-white/[0.05] bg-black/15">{WEEKDAYS.map(day => <div key={day} className="py-3 text-center text-[8px] font-black uppercase tracking-wider text-slate-600">{day}</div>)}</div>
        <div className="grid grid-cols-7">{cells.map(cell => { const selected = selectedDate === cell.key; const isToday = isoLocal(today) === cell.key; return <button key={cell.key} onClick={() => setSelectedDate(cell.key)} className={`relative min-h-20 border-b border-r border-white/[0.045] p-1.5 text-left transition sm:min-h-28 sm:p-2 ${!cell.currentMonth ? 'bg-black/20 opacity-35' : 'hover:bg-white/[0.025]'} ${selected ? 'bg-lime-400/[0.07] ring-1 ring-inset ring-lime-300/30' : ''}`}><span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${isToday ? 'bg-lime-300 text-slate-950' : 'text-slate-400'}`}>{cell.date.getDate()}</span><div className="mt-1 space-y-1">{cell.events.slice(0, 2).map(item => <div key={item.id} className={`truncate rounded px-1.5 py-1 text-[7px] font-bold sm:text-[8px] ${item.status === 'done' ? 'bg-emerald-400/10 text-emerald-300 line-through' : 'bg-violet-400/10 text-violet-200'}`}>{item.time} {item.title}</div>)}{cell.events.length > 2 && <p className="pl-1 text-[7px] text-slate-500">+{cell.events.length - 2} más</p>}</div></button>})}</div>
      </section>

      <aside className="rounded-3xl border border-white/[0.07] bg-[#0b1017]/95 p-5"><p className="text-[9px] font-black uppercase tracking-widest text-violet-300">Agenda del día</p><h3 className="mt-1 text-base font-black capitalize text-white">{selectedLabel}</h3><div className="mt-5 space-y-3">{selectedEvents.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center"><CalendarDays className="mx-auto h-7 w-7 text-slate-700"/><p className="mt-3 text-xs font-bold text-slate-400">Día disponible</p><p className="mt-1 text-[9px] text-slate-600">Añade una tarea o reunión.</p></div> : selectedEvents.map(item => <article key={item.id} className={`rounded-2xl border p-4 ${item.status === 'done' ? 'border-emerald-400/15 bg-emerald-400/[0.04]' : 'border-white/[0.07] bg-black/20'}`}><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10"><Clock3 className="h-4 w-4 text-violet-300"/></div><div className="min-w-0 flex-1"><p className={`text-xs font-bold text-white ${item.status === 'done' ? 'line-through opacity-60' : ''}`}>{item.title}</p><p className="mt-1 text-[9px] font-bold text-lime-300">{item.time || 'Todo el día'}</p>{(item.notes || item.description) && <p className="mt-2 text-[9px] leading-4 text-slate-500">{item.notes || item.description}</p>}</div></div>{item.meetingUrl && item.status !== 'done' && <a href={item.meetingUrl.startsWith('http') ? item.meetingUrl : `https://${item.meetingUrl}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-[9px] font-bold text-white"><Video className="h-3.5 w-3.5"/>Abrir reunión</a>}{item.id.startsWith('cold_callback_') ? <div className="mt-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.06] px-3 py-2 text-center text-[8px] font-bold text-amber-300">Gestiona este seguimiento desde Cold Calling</div> : <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => onUpdateEvent({ ...item, status: item.status === 'done' ? 'pending' : 'done' })} className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] py-2 text-[8px] font-bold text-emerald-300"><Check className="h-3 w-3"/>{item.status === 'done' ? 'Reabrir' : 'Completar'}</button><button onClick={() => onDeleteEvent(item.id)} className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-400/15 bg-rose-400/[0.05] py-2 text-[8px] font-bold text-rose-300"><Trash2 className="h-3 w-3"/>Eliminar</button></div>}</article>)}</div><button onClick={() => setShowCreate(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-[10px] font-bold text-slate-300 hover:bg-white/5"><Plus className="h-3.5 w-3.5"/>Añadir a este día</button></aside>
    </div>

    {showCreate && <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"><form onSubmit={createEvent} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1017] p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-lime-300">Nueva tarea</p><h3 className="mt-1 text-lg font-black text-white">{selectedLabel}</h3></div><button type="button" onClick={() => setShowCreate(false)} className="text-xs text-slate-500 hover:text-white">Cerrar</button></div><div className="mt-5 space-y-3"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Título de la tarea o reunión" required className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white outline-none focus:border-lime-300/40"/><div className="grid grid-cols-2 gap-3"><input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white outline-none"/><input type="time" value={time} onChange={event => setTime(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white outline-none"/></div><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Notas y objetivo" rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white outline-none"/><input value={meetingUrl} onChange={event => setMeetingUrl(event.target.value)} placeholder="Enlace de videollamada (opcional)" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white outline-none"/></div><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-white/10 py-3 text-xs font-bold text-slate-400">Cancelar</button><button type="submit" className="rounded-xl bg-lime-300 py-3 text-xs font-black text-slate-950">Guardar tarea</button></div></form></div>}
  </div>;
}
