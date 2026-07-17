import React, { useState } from 'react';
import { CalendarEvent, ClientContact, Screen, Note } from '../types';
import { REGISTERED_USERS, PanelUser } from '../mockData';
import ProductNeedsSummary from './ProductNeedsSummary';
import {
 Plus, 
 ChevronLeft, 
 ChevronRight, 
 Video, 
 Trash2, 
 User, 
 Bell, 
 Link,
 Users,
 Clock,
 ExternalLink,
 ChevronRight as ChevronRightIcon,
 X,
 Calendar,
 Archive,
 Edit3
} from 'lucide-react';

const getDurationMinutes = (duration?: string) => {
 const raw = (duration || '').trim().toLowerCase();
 if (!raw) return 60;
 if (raw.endsWith('h')) return Math.max(15, Math.round((Number.parseFloat(raw) || 1) * 60));
 return Math.max(15, Number.parseInt(raw, 10) || 60);
};

const getEventTimeInMinutes = (time?: string) => {
 const match = (time || '').match(/^(\d{1,2}):(\d{2})/);
 if (!match) return Number.POSITIVE_INFINITY;
 const hours = Number(match[1]);
 const minutes = Number(match[2]);
 return Number.isFinite(hours) && Number.isFinite(minutes) ? (hours * 60) + minutes : Number.POSITIVE_INFINITY;
};

const compareEventsByTime = (a: CalendarEvent, b: CalendarEvent) =>
 getEventTimeInMinutes(a.time) - getEventTimeInMinutes(b.time) || a.title.localeCompare(b.title, 'es');

interface CalendarScreenProps {
 events: CalendarEvent[];
 contacts: ClientContact[];
 notes: Note[];
 onAddEvent: (event: CalendarEvent) => void | Promise<void>;
 onDeleteEvent: (id: string) => void;
 onUpdateEvent: (event: CalendarEvent) => void | Promise<void>;
 onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
 usersList?: PanelUser[];
 onAddProfile?: (profile: { name: string; email: string }) => void;
 comercialesList?: any[];
}

export default function CalendarScreen({ 
 events, 
 contacts, 
 notes,
 onAddEvent, 
 onDeleteEvent,
 onUpdateEvent,
 onNavigate,
 usersList = REGISTERED_USERS,
 onAddProfile,
 comercialesList
}: CalendarScreenProps) {
 
 // High-fidelity pre-selected event (Product Sync)
 const [selectedEventId, setSelectedEventId] = useState<string>('e2');
 const [isPostponing, setIsPostponing] = useState<boolean>(false);
 const [postponeDate, setPostponeDate] = useState<string>(() => {
 const d = new Date();
 d.setDate(d.getDate() + 1); // default to tomorrow
 const padM = String(d.getMonth() + 1).padStart(2, '0');
 const padD = String(d.getDate()).padStart(2, '0');
 return `${d.getFullYear()}-${padM}-${padD}`;
 });
 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [deleteConfirmEventId, setDeleteConfirmEventId] = useState<string | null>(null);
 const [isCreatingEvent, setIsCreatingEvent] = useState(false);
 const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);

 // Quick collaborator states
 const [showQuickAddCollab, setShowQuickAddCollab] = useState(false);
 const [quickName, setQuickName] = useState('');
 const [quickEmail, setQuickEmail] = useState('');

 // Global toggle to view/hide archived events on the calendar grid
 const [showArchivedEvents, setShowArchivedEvents] = useState<boolean>(false);

 // State linking archived events in sessionStorage
 const [archivedEventIds, setArchivedEventIds] = useState<string[]>(() => {
 const saved = sessionStorage.getItem('archived_events_ids');
 return saved ? JSON.parse(saved) : [];
 });

 const toggleArchiveEvent = (id: string) => {
 const isCurrentlyArchived = archivedEventIds.includes(id);
 const updated = isCurrentlyArchived  ?
  archivedEventIds.filter(item => item !== id)
  : [...archivedEventIds, id];
 setArchivedEventIds(updated);
 sessionStorage.setItem('archived_events_ids', JSON.stringify(updated));

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = isCurrentlyArchived ? "Evento desarchivado con éxito." : "Evento archivado con éxito.";
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 2500);
 }
 };
 
 // Real Dynamic Calendar Month setup: initialized to active date or current month
 const todayDate = new Date();
 const [currentYear, setCurrentYear] = useState(todayDate.getFullYear()); // Dynamically initialized to current year
 const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth()); // Dynamically initialized to current month index
 const [currentDay, setCurrentDay] = useState(todayDate.getDate());
 const [currentView, setCurrentView] = useState<'month' | 'day'>('month');

 const HOURLY_SLOTS = [
 "08:00", "09:00", "10:00", "11:00", "12:00", 
 "13:00", "14:00", "15:00", "16:00", "17:00", 
 "18:00", "19:00", "20:00", "21:00", "22:00"
 ];

 // Add Event Form State
 const [newTitle, setNewTitle] = useState('');
 const [newDate, setNewDate] = useState(() => {
 const d = new Date();
 const padM = String(d.getMonth() + 1).padStart(2, '0');
 const padD = String(d.getDate()).padStart(2, '0');
 return `${d.getFullYear()}-${padM}-${padD}`;
 });
 const [newTime, setNewTime] = useState('11:00');
 const [newDurationMinutes, setNewDurationMinutes] = useState(60);
 const [newType, setNewType] = useState<'Meeting' | 'Review' | 'Deadline' | 'Kickoff' | 'Other'>('Meeting');
 const [newDescription, setNewDescription] = useState('');
 const [newMeetingUrl, setNewMeetingUrl] = useState('');
 const [newAssignedUserEmail, setNewAssignedUserEmail] = useState('');
 const [newAssignedUserEmails, setNewAssignedUserEmails] = useState<string[]>([]);
 const [newRecurrence, setNewRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
 const [newRecurrenceCount, setNewRecurrenceCount] = useState(1);
 
 // Edit Event Form State
 const [editTitle, setEditTitle] = useState('');
 const [editDate, setEditDate] = useState('');
 const [editTime, setEditTime] = useState('');
 const [editDurationMinutes, setEditDurationMinutes] = useState(60);
 const [editType, setEditType] = useState<'Meeting' | 'Review' | 'Deadline' | 'Kickoff' | 'Other'>('Meeting');
 const [editDescription, setEditDescription] = useState('');
 const [editMeetingUrl, setEditMeetingUrl] = useState('');
 const [editContactIds, setEditContactIds] = useState<string[]>([]);
 const [editNoteIds, setEditNoteIds] = useState<string[]>([]);
 const [editAssignedUserEmail, setEditAssignedUserEmail] = useState('');
 const [editStatus, setEditStatus] = useState<'pending' | 'done' | 'postponed'>('pending');
 const [editColor, setEditColor] = useState('#8B5CF6');

 // Array of linked contacts and notes IDs
 const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
 const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

 // Dynamic search/filter keyword states inside Modal
 const [contactSearch, setContactSearch] = useState('');
 const [noteSearch, setNoteSearch] = useState('');

 // Selected event calculation
 const selectedEvent = events.find(ev => ev.id === selectedEventId) || events[0];

 const handleAddEventSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newTitle.trim() || isCreatingEvent) return;
 setIsCreatingEvent(true);

 const selectedAssignees = newAssignedUserEmails.length ? newAssignedUserEmails : (newAssignedUserEmail ? [newAssignedUserEmail] : []);
 const matchedContact = contacts.find(c => c.id === selectedContactIds[0]);
 const matchedUser = usersList.find(u => u.email === selectedAssignees[0]);
 const recurrenceGroupId = newRecurrence !== 'none' ? `rec_${Date.now()}` : undefined;
 const nextDate = (date: string, index: number) => {
  const d = new Date(`${date}T00:00:00`);
  if (newRecurrence === 'daily') d.setDate(d.getDate() + index);
  if (newRecurrence === 'weekly') d.setDate(d.getDate() + (index * 7));
  if (newRecurrence === 'monthly') d.setMonth(d.getMonth() + index);
  // Calendar dates are local civil dates, not UTC instants. Converting midnight
  // in Madrid to ISO/UTC moves it to the previous day during summer time.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
 };

 const generatedEvent: CalendarEvent = {
  id: 'e_' + Date.now().toString().slice(-6),
  title: newTitle,
  date: newDate,
  time: newTime,
  duration: `${Math.max(15, newDurationMinutes)}m`,
  type: newType,
  description: newDescription || 'Sin descripción adicional.',
  meetingUrl: newType === 'Meeting' ? newMeetingUrl || undefined : undefined,
  linkedContactId: selectedContactIds[0] || undefined,
  linkedContactName: matchedContact ? matchedContact.name : undefined,
  linkedContactIds: selectedContactIds,
  linkedNoteIds: selectedNoteIds,
  assignedUserEmail: selectedAssignees[0] || undefined,
  assignedUserEmails: selectedAssignees,
  assignedUserId: matchedUser ? matchedUser.id : undefined,
  isAllComerciales: selectedAssignees.includes('todos-comerciales'),
  recurrence: newRecurrence,
  recurrenceCount: newRecurrenceCount,
  recurrenceGroupId,
  color: newRecurrence === 'daily' ? '#A855F7' : '#3B82F6',
  reminders: ['15 min before']
 };

 const repetitions = newRecurrence === 'none' ? 1 : Math.max(1, Math.min(36, Number(newRecurrenceCount || 1)));
 let saved = false;
 try {
 for (let index = 0; index < repetitions; index += 1) {
  await onAddEvent({
  ...generatedEvent,
  id: index === 0 ? generatedEvent.id : `${generatedEvent.id}_${index}`,
  date: nextDate(newDate, index),
  parentEventId: index === 0 ? undefined : generatedEvent.id
  });
 }
 saved = true;
 } catch (err) {
 console.error('Failed to create calendar event:', err);
 } finally {
 setIsCreatingEvent(false);
 }
 if (!saved) return;
 setSelectedEventId(generatedEvent.id);
 setShowAddModal(false);

 setNewTitle('');
 setNewDescription('');
 setNewMeetingUrl('');
 setNewDurationMinutes(60);
 setSelectedContactIds([]);
 setSelectedNoteIds([]);
 setContactSearch('');
 setNoteSearch('');
 setNewAssignedUserEmail('');
 setNewAssignedUserEmails([]);
 setNewRecurrence('none');
 setNewRecurrenceCount(1);

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = repetitions > 1 ? `Serie creada: ${generatedEvent.title} (${repetitions} eventos)` : `Evento creado: ${generatedEvent.title}`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
 }
 };
 const handleOpenEditModal = () => {
 if (!selectedEvent) return;
 setEditTitle(selectedEvent.title);
 setEditDate(selectedEvent.date);
 setEditTime(selectedEvent.time || '11:00');
 setEditDurationMinutes(getDurationMinutes(selectedEvent.duration));
 setEditType(selectedEvent.type || 'Meeting');
 setEditDescription(selectedEvent.description || '');
 setEditMeetingUrl(selectedEvent.meetingUrl || '');
 setEditContactIds(selectedEvent.linkedContactIds || (selectedEvent.linkedContactId ? [selectedEvent.linkedContactId] : []));
 setEditNoteIds(selectedEvent.linkedNoteIds || []);
 setEditAssignedUserEmail(selectedEvent.assignedUserEmail || '');
 setEditStatus(selectedEvent.status || 'pending');
 setEditColor(selectedEvent.color || '#8B5CF6');
 setContactSearch('');
 setNoteSearch('');
 setShowEditModal(true);
 };

 const handleUpdateEventSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!editTitle.trim() || isUpdatingEvent) return;

 const matchedContact = contacts.find(c => c.id === editContactIds[0]);
 const matchedUser = usersList.find(u => u.email === editAssignedUserEmail);

 const updatedEvent: CalendarEvent = {
  ...selectedEvent,
  title: editTitle,
  date: editDate,
  time: editTime,
  duration: `${Math.max(15, editDurationMinutes)}m`,
  type: editType,
  description: editDescription,
  meetingUrl: editType === 'Meeting' ? editMeetingUrl || undefined : undefined,
  linkedContactId: editContactIds[0] || undefined,
  linkedContactName: matchedContact ? matchedContact.name : undefined,
  linkedContactIds: editContactIds,
  linkedNoteIds: editNoteIds,
  assignedUserEmail: editAssignedUserEmail || undefined,
  assignedUserEmails: editAssignedUserEmail ? [editAssignedUserEmail] : [],
  assignedUserId: matchedUser ? matchedUser.id : undefined,
  status: editStatus,
  color: editColor,
 };

 setIsUpdatingEvent(true);
 try {
  await onUpdateEvent(updatedEvent);
  setShowEditModal(false);
 } catch (error) {
  console.error('Failed to update calendar event:', error);
  return;
 } finally {
  setIsUpdatingEvent(false);
 }

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = `Evento "${updatedEvent.title}" actualizado correctamente`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
 }
 };

 const handleDeleteEventClick = (id: string) => {
 setDeleteConfirmEventId(id);
 };

 const confirmDeleteEvent = (id: string) => {
 onDeleteEvent(id);
 setSelectedEventId(events[0]?.id || '');

 const toast = document.getElementById('toast-msg');
 if (toast) {
  toast.innerText = `Evento eliminado`;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
 }
 };

 const selectedDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
 const rawDayEvents = events.filter(ev => {
 const matchesDate = ev.date === selectedDayStr;
 const isArchived = archivedEventIds.includes(ev.id);
 if (isArchived && !showArchivedEvents) return false;
 return matchesDate;
 }).sort(compareEventsByTime);

 const getEventsForHour = (hourStr: string) => {
 const hr = parseInt(hourStr.split(':')[0], 10);
 return rawDayEvents.filter(ev => {
  if (!ev.time) return false;
  const evHr = parseInt(ev.time.split(':')[0], 10);
  return evHr === hr;
 });
 };

 // Build dynamic monthly grid arrays
 const monthNames = [
 "January", "February", "March", "April", "May", "June", 
 "July", "August", "September", "October", "November", "December"
 ];

 const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
 const startDayOfWeek = firstDayOfMonth.getDay(); // index 0 - Sunday, 1 - Monday
 const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

 const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
 const emptySlots = Array.from({ length: startDayOfWeek }, (_, i) => i);

 const handlePrevCalendar = () => {
 if (currentView === 'month') {
  if (currentMonth === 0) {
  setCurrentMonth(11);
  setCurrentYear(prev => prev - 1);
  } else {
  setCurrentMonth(prev => prev - 1);
  }
 } else {
  // Go to previous day
  const d = new Date(currentYear, currentMonth, currentDay);
  d.setDate(d.getDate() - 1);
  setCurrentYear(d.getFullYear());
  setCurrentMonth(d.getMonth());
  setCurrentDay(d.getDate());
 }
 };

 const handleNextCalendar = () => {
 if (currentView === 'month') {
  if (currentMonth === 11) {
  setCurrentMonth(0);
  setCurrentYear(prev => prev + 1);
  } else {
  setCurrentMonth(prev => prev + 1);
  }
 } else {
  // Go to next day
  const d = new Date(currentYear, currentMonth, currentDay);
  d.setDate(d.getDate() + 1);
  setCurrentYear(d.getFullYear());
  setCurrentMonth(d.getMonth());
  setCurrentDay(d.getDate());
 }
 };

 return (
 <div className="flex-1 p-8 flex gap-8 overflow-hidden h-[calc(100vh-80px)] bg-transparent text-slate-150">
  
  {/* Left Area: Calendar Month View */}
  <div className="flex-1 flex flex-col gap-6 min-w-0">
  
  {/* Calendar Title & Filters Bar */}
  <div className="flex items-center justify-between">
   <div>
   <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
    {currentView === 'month' ? (
    <span className="text-blue-400">{monthNames[currentMonth]} {currentYear}</span>
    ) : (
    <span className="text-blue-400">Día {currentDay}: {monthNames[currentMonth].substring(0,3)}. {currentYear}</span>
    )}
   </h2>
   <p className="text-slate-400 text-xs mt-1">
    {currentView === 'month' ? 'Actividades y reuniones programadas' : 'Agenda detallada del día organizada por horas'}
   </p>
   </div>

   <div className="flex gap-2 items-center">
   {/* View Selector Tabs */}
   <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
    <button
    onClick={() => setCurrentView('month')}
    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
     currentView === 'month'  ?
     'bg-blue-600 text-white font-bold' 
     : 'text-slate-400 hover:text-white'
    }`}
    >
    Mes
    </button>
    <button
    onClick={() => setCurrentView('day')}
    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
     currentView === 'day'  ?
     'bg-blue-600 text-white font-bold' 
     : 'text-slate-400 hover:text-white'
    }`}
    >
    Día
    </button>
   </div>

   <button
    onClick={() => setShowArchivedEvents(!showArchivedEvents)}
    className={`px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
    showArchivedEvents  ?
     'bg-amber-500/20 text-amber-400 border-amber-500/30' 
     : 'bg-white/5 text-slate-400 hover:text-white'
    }`}
    title="Mostrar u ocultar reuniones archivadas en el calendario"
   >
    <Archive className="w-3.5 h-3.5" />
    <span className="hidden sm:inline">{showArchivedEvents ? 'Ocultar Archivados' : 'Mostrar Archivados'}</span>
   </button>

   <button 
    onClick={handlePrevCalendar}
    className="p-1.5 hover:bg-white/5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
    title={currentView === 'month' ? "Mes Anterior" : "Día Anterior"}
   >
    <ChevronLeft className="w-4 h-4" />
   </button>
   <button 
    onClick={handleNextCalendar}
    className="p-1.5 hover:bg-white/5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
    title={currentView === 'month' ? "Mes Siguiente" : "Día Siguiente"}
   >
    <ChevronRight className="w-4 h-4" />
   </button>
   
   <button
    onClick={() => {
    if (currentView === 'day') {
     setNewDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`);
    }
    setShowAddModal(true);
    }}
    className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-semibold shadow-lg shadow-blue-500/10 cursor-pointer active:scale-95 transition-all"
   >
    <Plus className="w-4 h-4" />
    <span className="hidden sm:inline">Add Event</span>
   </button>
   </div>
  </div>

  {currentView === 'month' ? (
   <>
   {/* Days of the Week Headings */}
   <div className="grid grid-cols-7 border-b border-white/5 py-2 text-center text-xs font-mono font-medium uppercase tracking-wider text-slate-500">
    <div>Sun</div>
    <div>Mon</div>
    <div>Tue</div>
    <div>Wed</div>
    <div>Thu</div>
    <div>Fri</div>
    <div>Sat</div>
   </div>

   {/* Calendar Day Grid */}
   <div className="grid grid-cols-7 flex-1 overflow-y-auto min-h-0 border-l border-t border-slate-900/40 divide-x divide-y divide-white/5">
    
    {/* Empty placeholders to align weekday of the 1st of monthly */}
    {emptySlots.map((slot) => (
    <div key={`empty-${slot}`} className="min-h-[105px] p-2 bg-slate-950/5 opacity-25 select-none" />
    ))}

    {daysArray.map((day) => {
    const padM = String(currentMonth + 1).padStart(2, '0');
    const padD = String(day).padStart(2, '0');
    const formattedDayStr = `${currentYear}-${padM}-${padD}`;
    const dayEvents = events.filter(ev => {
     const matchesDate = ev.date === formattedDayStr;
     const isArchived = archivedEventIds.includes(ev.id);
     if (isArchived && !showArchivedEvents) return false;
     return matchesDate;
    }).sort(compareEventsByTime);

    const todayRaw = new Date();
    const isToday = 
     todayRaw.getDate() === day && 
     todayRaw.getMonth() === currentMonth && 
     todayRaw.getFullYear() === currentYear;

    return (
     <div 
     key={day}
     onClick={() => {
      setSelectedEventId(dayEvents[0]?.id || '');
      setCurrentDay(day);
     }}
     onDoubleClick={() => {
      setCurrentDay(day);
      setCurrentView('day');
     }}
     className={`min-h-[105px] p-2 hover:bg-slate-900/30 transition-all cursor-pointer relative group ${
      isToday ? 'bg-blue-600/[0.04] border border-blue-500/20 shadow-inner' : 'bg-slate-950/20'
     }`}
     >
     {/* Day Digit */}
     <div className="flex justify-between items-center mb-1">
      <span className={`text-xs font-semibold ${
      isToday ? 'text-blue-400 font-bold bg-blue-500/10 rounded px-1.5 py-0.5' : 'text-slate-500 group-hover:text-slate-300'
      }`}>
      {day}
      </span>
      {isToday && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />}
     </div>

     {/* Event Chips */}
     <div className="space-y-1 overflow-hidden">
      {dayEvents.map((ev) => {
      let chipColor = "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20";
      if (ev.status === "done") {
       chipColor = "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 line-through decoration-emerald-500/50";
      } else if (ev.status === "postponed") {
       chipColor = "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30";
      } else {
       if (ev.recurrence === 'daily') chipColor = "bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/30 border border-fuchsia-400/30 shadow-sm shadow-fuchsia-500/10";
       else if (ev.type === "Deadline") chipColor = "bg-red-500/10 text-red-400 hover:bg-red-500/20";
       else if (ev.type === "Review") chipColor = "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20";
       else if (ev.type === "Kickoff") chipColor = "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20";
      }

      return (
       <div
       key={ev.id}
       onClick={(e) => {
        e.stopPropagation();
        setSelectedEventId(ev.id);
       }}
       className={`px-1.5 py-0.5 rounded text-[9px] font-sans font-medium tracking-wide truncate transition-colors ${chipColor} ${
        selectedEventId === ev.id ? 'ring-1 ring-blue-500/50 bg-blue-500/20' : ''
       }`}
       title={ev.title}
       >
       {ev.status === "done" ? "✓ " : ev.status === "postponed" ? "➜ " : ""}{ev.time} {ev.title}
       </div>
      );
      })}
     </div>
     </div>
    );
    })}
   </div>
   </>
  ) : (
   /* Detailed High-Fidelity Day View sorted by hours in big sizing */
   <div className="flex-1 flex flex-col min-h-0 bg-[#020617]/40 border border-white/5 rounded-3xl p-6 overflow-hidden">
   {/* Day Header with full Day Name info */}
   <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
    <div className="flex items-center gap-3">
    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex flex-col items-center justify-center font-bold font-sans">
     <span className="text-[10px] uppercase text-slate-400 leading-none">DÍA</span>
     <span className="text-xl font-extrabold leading-none">{currentDay}</span>
    </div>
    <div>
     <h3 className="text-lg font-bold text-white tracking-tight">
     {(() => {
      const dateObj = new Date(currentYear, currentMonth, currentDay);
      return dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
     })()}
     </h3>
     <p className="text-xs text-slate-400">
     {rawDayEvents.length === 0  ?
      "Sin compromisos agendados para este día" 
      : `${rawDayEvents.length} ${rawDayEvents.length === 1 ? 'evento activo' : 'eventos activos'} en la agenda`}
     </p>
    </div>
    </div>
    <button
    onClick={() => {
     setNewDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`);
     setNewTime("10:00");
     setShowAddModal(true);
    }}
    className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
    >
    <Plus className="w-3.5 h-3.5" />
    <span>Bloquear Hora</span>
    </button>
   </div>

   {/* Timetable timeline container wrapper */}
   <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
    {HOURLY_SLOTS.map((hourStr) => {
    const hourEvents = getEventsForHour(hourStr);
    return (
     <div key={hourStr} className="group/hour flex gap-4 border-b border-white/[0.02] last:border-0 pb-4">
     {/* Hour Column label en grande */}
     <div className="w-16 flex-shrink-0 text-right pt-1.5">
      <span className="text-lg font-extrabold font-mono tracking-tight text-slate-300 group-hover/hour:text-blue-400 transition-colors leading-none block">
      {hourStr}
      </span>
      <span className="text-[9px] font-mono text-slate-500 block uppercase pt-0.5">
      {parseInt(hourStr.split(':')[0], 10) < 12 ? 'AM' : 'PM'}
      </span>
     </div>

     {/* Timeline Slot Column */}
     <div className="flex-1">
      {hourEvents.length > 0 ? (
      <div className="space-y-3">
       {hourEvents.map((ev) => {
       const isSelected = selectedEventId === ev.id;
       const isDevIntake = ev.alias === 'Lead Dev desde Cold Calling';
       const linkedContact = isDevIntake ? contacts.find(contact => contact.id === ev.linkedContactId) : undefined;
       const descriptionLines = (ev.description || '').split('\n').map(line => line.trim()).filter(Boolean);
       const getDetail = (label: string) => descriptionLines.find(line => line.startsWith(`${label}:`))?.slice(label.length + 1).trim();
       const productsFromDescription = (getDetail('Productos') || '').split(',').map(product => product.trim()).filter(Boolean);
       const devProducts = linkedContact?.requestedProducts?.length ? linkedContact.requestedProducts : productsFromDescription;
       const devOtherProduct = linkedContact?.requestedProductOther;
       
       // Highly visual customized badge colors and glows based on status and types
       let statusBadgeColor = "text-blue-400 border-blue-500/20 bg-blue-500/5";
       let cardBorderColor = isSelected ? "border-blue-500/55 shadow-lg shadow-blue-500/[0.03]" : "border-white/5 hover:border-white/10";
       let cardBgColor = isSelected ? "bg-slate-900/90" : "bg-[#080d1e]/80 hover:bg-[#0c1328]/80";

       if (ev.status === "done") {
        statusBadgeColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 line-through";
        cardBorderColor = isSelected ? "border-emerald-500/50 shadow-inner" : "border-emerald-500/10 hover:border-emerald-500/20";
        cardBgColor = isSelected ? "bg-emerald-950/15" : "bg-[#060c15]/60 hover:bg-[#091120]/60";
       } else if (ev.status === "postponed") {
        statusBadgeColor = "text-amber-400 border-amber-500/30 bg-amber-500/10";
        cardBorderColor = isSelected ? "border-amber-500/50" : "border-amber-500/10 hover:border-amber-500/20";
        cardBgColor = isSelected ? "bg-[#181109]" : "bg-[#100b05] hover:bg-[#181008]";
       } else if (ev.recurrence === 'daily') {
        statusBadgeColor = "text-fuchsia-200 border-fuchsia-400/30 bg-fuchsia-500/15";
        cardBorderColor = isSelected ? "border-fuchsia-400/55 shadow-lg shadow-fuchsia-500/10" : "border-fuchsia-500/20 hover:border-fuchsia-400/40";
        cardBgColor = isSelected ? "bg-fuchsia-950/25" : "bg-fuchsia-950/10 hover:bg-fuchsia-950/20";
       } else if (isDevIntake) {
        statusBadgeColor = "text-violet-200 border-violet-400/30 bg-violet-500/15";
        cardBorderColor = isSelected ? "border-violet-400/55 shadow-xl shadow-violet-500/10" : "border-violet-400/20 hover:border-violet-400/40";
        cardBgColor = isSelected ? "bg-violet-950/25" : "bg-gradient-to-br from-violet-950/20 to-slate-950/70 hover:from-violet-950/30";
       }

       return (
        <div
        key={ev.id}
        onClick={() => setSelectedEventId(ev.id)}
        className={`p-4 rounded-2xl border ${cardBorderColor} ${cardBgColor} transition-all duration-300 relative group/card flex justify-between gap-4 cursor-pointer ${isDevIntake ? 'flex-col items-stretch' : 'flex-col items-start md:flex-row md:items-center'}`}
        >
        <div className="space-y-2 flex-1 min-w-0">
         {/* Top line metadata row */}
         <div className="flex items-center gap-2 flex-wrap text-[9px] font-mono">
         <span className={`px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border ${statusBadgeColor}`}>
          {isDevIntake ? 'Entrada Dev' : ev.recurrence === 'daily' ? 'Diario' : ev.type}
         </span>
         <span className="text-slate-400">
          {ev.time} · {getDurationMinutes(ev.duration)} min
         </span>
         {ev.meetingUrl && (
          <span className="text-blue-400 flex items-center gap-0.5 font-semibold bg-blue-500/5 border border-blue-500/10 px-1.5 rounded-full lowercase text-[8px]">
          <Video className="w-2.5 h-2.5" /> videollamada
          </span>
         )}
         </div>

         {/* Title & Description */}
         <div className="space-y-2">
         <h4 className={`text-base font-bold text-white transition-colors tracking-tight ${isDevIntake ? 'group-hover/card:text-violet-200' : 'truncate group-hover/card:text-blue-400'}`}>
          {ev.title}
         </h4>
         {isDevIntake ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
           <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2"><span className="block text-[8px] font-black uppercase tracking-wider text-slate-500">Negocio</span><strong className="mt-1 block break-words text-[11px] text-white">{linkedContact?.company || getDetail('Negocio') || ev.linkedContactName || 'Sin especificar'}</strong></div>
           <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2"><span className="block text-[8px] font-black uppercase tracking-wider text-slate-500">Contacto</span><strong className="mt-1 block break-words text-[11px] text-white">{linkedContact?.name || getDetail('Contacto') || 'Sin especificar'}</strong><span className="mt-0.5 block break-words text-[9px] text-slate-400">{linkedContact?.phone || getDetail('Teléfono') || 'Sin teléfono'}</span></div>
           <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2"><span className="block text-[8px] font-black uppercase tracking-wider text-slate-500">Comercial de origen</span><strong className="mt-1 block break-words text-[11px] text-violet-200">{linkedContact?.contactedByComercialName || getDetail('Caller') || 'Sin asignar'}</strong></div>
           <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2"><span className="block text-[8px] font-black uppercase tracking-wider text-slate-500">Cita con closer</span><strong className="mt-1 block break-words text-[11px] text-cyan-200">{getDetail('Cita') || 'Sin fecha'}</strong></div>
          </div>
         ) : (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-light">{ev.description || 'Sin descripción.'}</p>
         )}
         {isDevIntake && <ProductNeedsSummary compact products={devProducts} otherDetail={devOtherProduct} />}
         {isDevIntake && getDetail('Nota') && <p className="break-words rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[10px] leading-4 text-slate-400"><span className="font-bold text-slate-300">Nota: </span>{getDetail('Nota')}</p>}
         </div>

         {/* Details footer block inside event card */}
         <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-500 font-medium">
         {ev.linkedContactName && (
          <div className="flex items-center gap-1 bg-slate-900 border border-white/5 py-0.5 px-2 rounded-lg text-slate-400">
          <User className="w-3 h-3 text-indigo-400" />
          <span>Cliente: {ev.linkedContactName}</span>
          </div>
         )}

         {ev.assignedUserEmail && (
          <div className="flex items-center gap-1 bg-slate-900 border border-white/5 py-0.5 px-2 rounded-lg text-slate-400">
          <Users className="w-3 h-3 text-emerald-400" />
          <span>Asignado: {ev.assignedUserEmail.split('@')[0]}</span>
          </div>
         )}
         </div>
        </div>

        {/* Active Event actions menu right on card hover & click */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
         {ev.meetingUrl && (
         <a
          href={ev.meetingUrl}
          target="_blank"
          rel="noopener referrer"
          className="p-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-90"
          title="Unirse a la videollamada"
          onClick={(e) => e.stopPropagation()}
         >
          <Video className="w-4 h-4" />
         </a>
         )}
         <button
         onClick={(e) => {
          e.stopPropagation();
          onUpdateEvent({ ...ev, status: ev.status === 'done' ? 'pending' : 'done' });
         }}
         className={`p-2 rounded-xl border transition-all cursor-pointer ${
          ev.status === 'done' ?
          'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
          : 'bg-white/5 border-white/5 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10'
         }`}
         title="Marcar completado"
         >
         <span className="text-xs font-bold leading-none px-0.5">✓</span>
         </button>
         <button
         onClick={(e) => {
          e.stopPropagation();
          setSelectedEventId(ev.id);
          setIsPostponing(true);
         }}
         className={`p-2 rounded-xl border transition-all cursor-pointer ${
          ev.status === 'postponed' ?
          'bg-amber-500/20 border-amber-500/30 text-amber-400'
          : 'bg-white/5 border-white/5 hover:border-amber-500/30 hover:text-amber-400 hover:bg-amber-500/10'
         }`}
         title="Posponer reunión"
         >
         <span className="text-xs font-bold leading-none px-0.5">➜</span>
         </button>
        </div>
        </div>
       );
       })}
      </div>
      ) : (
      /* Empty hour slot action placeholder */
      <div 
       onClick={() => {
       setNewDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`);
       setNewTime(hourStr);
       setShowAddModal(true);
       }}
       className="h-11 bg-transparent hover:bg-white/[0.01] border border-dashed border-white/[0.03] hover:border-white/10 hover:shadow-inner rounded-xl flex items-center justify-center text-[10px] text-slate-600 hover:text-slate-400 transition-all cursor-pointer group/btn"
      >
       <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity flex items-center gap-1 font-mono font-medium">
       + Agendar reunión a las {hourStr}
       </span>
      </div>
      )}
     </div>
     </div>
    );
    })}
   </div>
   </div>
  )}

  </div>

  {/* Right Side Panel: Day Details Panel Inspector */}
  <aside 
  id="detailPanel" 
  className="h-full w-[340px] overflow-y-auto bg-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col border border-white/10 transition-all duration-300 shadow-2xl shadow-black/10 scrollbar-thin"
  >
  {selectedEvent ? (
   <div className="flex-1 flex flex-col justify-between">
   <div className="space-y-6">
    
    {/* Badge & Options */}
    <div className="flex justify-between items-start">
    <div className="flex flex-wrap gap-1.5 items-center">
     <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full uppercase tracking-wider border border-blue-500/20 font-semibold inline-block">
     {selectedEvent.type}
     </span>
     {selectedEvent.status === 'done' ? (
     <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30 font-semibold inline-block">
      ✓ Done
     </span>
     ) : selectedEvent.status === 'postponed' ? (
     <span className="text-[10px] font-mono bg-amber-500/15 text-amber-400 px-3 py-1 rounded-full uppercase tracking-wider border border-amber-500/30 font-semibold inline-block">
      ➜ Postponed
     </span>
     ) : (
     <span className="text-[10px] font-mono bg-slate-500/15 text-slate-400 px-3 py-1 rounded-full uppercase tracking-wider border border-zinc-500/20 font-semibold inline-block">
      Pending
     </span>
     )}
    </div>
     <div className="flex items-center gap-1.5">
      <button
      onClick={handleOpenEditModal}
      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/20 bg-blue-500/10 px-2 py-1.5 text-[9px] font-bold text-blue-200 transition hover:bg-blue-500/20"
      title="Editar únicamente esta cita"
      >
      <Edit3 className="h-3.5 w-3.5" />
      <span>Editar</span>
      </button>
      <button
     onClick={() => toggleArchiveEvent(selectedEvent.id)}
     className="p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
     title={archivedEventIds.includes(selectedEvent.id) ? "Desarchivar Evento" : "Archivar Evento"}
     >
     <Archive className={`w-4 h-4 ${archivedEventIds.includes(selectedEvent.id) ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`} />
     </button>
     <button 
     onClick={() => handleDeleteEventClick(selectedEvent.id)}
     className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
     title="Eliminar Reunión"
     >
     <Trash2 className="w-4 h-4" />
     </button>
    </div>
    </div>

    {/* Title & Timing */}
    <div>
    <h3 className="text-xl font-bold text-white tracking-tight leading-snug mb-2 font-sans">
     {selectedEvent.title}
    </h3>
    <div className="flex items-center gap-2 text-xs text-slate-400">
     <Clock className="w-4 h-4 text-blue-400" />
     <span>
     {selectedEvent.date === '2023-10-12' ? 'Today' : selectedEvent.date}, {selectedEvent.time} · {getDurationMinutes(selectedEvent.duration)} min
     </span>
    </div>
    </div>

    {/* Event Status Controls */}
    <div className="border-t border-b border-white/5 py-4 space-y-2">
    <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
     Status & Acciones
    </label>
    <div className="flex gap-2">
     <button
     onClick={() => {
      onUpdateEvent({ ...selectedEvent, status: 'pending' });
      setIsPostponing(false);
     }}
     className={`flex-1 py-1.5 text-[10px] font-semibold rounded-xl border transition cursor-pointer ${
      selectedEvent.status === 'pending' || !selectedEvent.status ?
      'bg-blue-500/10 border-blue-500/30 text-blue-400'
      : 'bg-transparent border-white/10 hover:border-slate-500 text-slate-400'
     }`}
     >
     Pending
     </button>
     <button
     onClick={() => {
      onUpdateEvent({ ...selectedEvent, status: 'done' });
      setIsPostponing(false);
     }}
     className={`flex-1 py-1.5 text-[10px] font-semibold rounded-xl border transition cursor-pointer ${
      selectedEvent.status === 'done' ?
      'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
      : 'bg-transparent border-white/10 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400'
     }`}
     >
     ✓ Done
     </button>
     <button
     onClick={() => {
      setIsPostponing(!isPostponing);
     }}
     className={`flex-1 py-1.5 text-[10px] font-semibold rounded-xl border transition cursor-pointer ${
      selectedEvent.status === 'postponed' || isPostponing ?
      'bg-amber-500/15 border-amber-500/30 text-amber-400 font-bold'
      : 'bg-transparent border-white/10 hover:border-amber-500/40 text-slate-400 hover:text-amber-400'
     }`}
     >
     ➜ Postpone
     </button>
    </div>

    {isPostponing && (
     <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-2 mt-2 animate-fade-in text-left">
     <span className="text-[10px] text-amber-400 font-medium block">
      Select postponement date:
     </span>
     <div className="flex gap-2">
      <input
      type="date"
      value={postponeDate}
      onChange={(e) => setPostponeDate(e.target.value)}
      className="flex-1 bg-slate-900 border border-white/10 rounded-lg text-xs p-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <button
      onClick={() => {
       if (!postponeDate) return;
       
       // 1. Create linked event
       const postfix = 'postponed_' + Date.now().toString().slice(-4);
       const linkedEvent: CalendarEvent = {
       id: 'e_' + postfix,
       title: `[POSPUESTO] ${selectedEvent.title}`,
       date: postponeDate,
       time: selectedEvent.time,
       duration: selectedEvent.duration,
       type: selectedEvent.type,
       description: `Reunión reprogramada vinculada al evento original "${selectedEvent.title}".`,
       linkedContactId: selectedEvent.linkedContactId,
       linkedContactName: selectedEvent.linkedContactName,
       linkedContactIds: selectedEvent.linkedContactIds,
       linkedNoteIds: selectedEvent.linkedNoteIds,
       meetingUrl: selectedEvent.meetingUrl,
       assignedUserId: selectedEvent.assignedUserId,
       assignedUserEmail: selectedEvent.assignedUserEmail,
       status: 'pending',
       parentEventId: selectedEvent.id
       };

       // 2. Add new event
       onAddEvent(linkedEvent);

       // 3. Mark current event as postponed
       onUpdateEvent({ ...selectedEvent, status: 'postponed' });

       // 4. Close form
       setIsPostponing(false);
       setSelectedEventId(linkedEvent.id); // Go to new event!

       const toast = document.getElementById('toast-msg');
       if (toast) {
       toast.innerText = "Evento pospuesto. Se creó un evento vinculado.";
       toast.classList.remove('opacity-0');
       setTimeout(() => toast.classList.add('opacity-0'), 3000);
       }
      }}
      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs flex-shrink-0 active:scale-95 transition cursor-pointer"
      >
      Reprogramar
      </button>
     </div>
     </div>
    )}
    </div>

    {/* Details sections */}
    <div className="space-y-4">
    
    {/* Description Box */}
    <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5">
     <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">
     Description
     </label>
     <p className="text-xs text-slate-300 leading-relaxed">
     {selectedEvent.description}
     </p>
    </div>

    {/* Assigned Panel User Block */}
    <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5 flex items-center justify-between gap-2">
     <div className="flex items-center gap-2.5 min-w-0">
     <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold font-mono text-[10px] flex-shrink-0">
       {selectedEvent.assignedUserEmail ? selectedEvent.assignedUserEmail.charAt(0).toUpperCase() : '?'}
     </div>
     <div className="min-w-0">
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-1">
      Assigned User
      </div>
      <p className="text-xs font-semibold text-white truncate">
      {selectedEvent.assignedUserEmail  ?
       (selectedEvent.assignedUserEmail === 'todos-comerciales' ? 'Todos los comerciales' : usersList.find(u => u.email === selectedEvent.assignedUserEmail)?.name || selectedEvent.assignedUserEmail)
       : 'Unassigned'}
      </p>
     </div>
     </div>
     
     {/* Select assignment dropdown directly inline */}
     <select
     value={selectedEvent.assignedUserEmail || ''}
     onChange={(e) => {
      const val = e.target.value;
      const matched = usersList.find(u => u.email === val);
      onUpdateEvent({
      ...selectedEvent,
      assignedUserEmail: val || undefined,
      assignedUserEmails: val ? [val] : [],
      assignedUserId: matched ? matched.id : undefined,
      isAllComerciales: val === 'todos-comerciales',
      });
      const toast = document.getElementById('toast-msg');
      if (toast) {
      toast.innerText = `Asignación guardada: ${matched ? matched.name : 'Sin asignar'}`;
      toast.classList.remove('opacity-0');
      setTimeout(() => toast.classList.add('opacity-0'), 2500);
      }
     }}
     className="bg-slate-900 border border-white/10 text-[10px] rounded-lg py-1 px-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[120px]"
     >
     <option value="">-- Unassigned --</option>
     <option value="todos-comerciales">Todos los comerciales</option>
     {usersList.map(u => (
      <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
     ))}
     </select>
    </div>

    {/* Linked CRM Contacts */}
    <div>
     <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2 font-bold">
     CRM Clients Associated
     </label>
     
     {(() => {
     const linkedIds = selectedEvent.linkedContactIds || (selectedEvent.linkedContactId ? [selectedEvent.linkedContactId] : []);
     const matchedContacts = contacts.filter(c => linkedIds.includes(c.id));
     
     if (matchedContacts.length > 0) {
      return (
      <div className="space-y-1.5">
       {matchedContacts.map(c => (
       <div 
        key={c.id}
        onClick={() => onNavigate('crm', 'none')}
        className="flex items-center justify-between p-2 bg-slate-900/40 hover:bg-white/5 rounded-xl border border-white/5 transition cursor-pointer group"
       >
        <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs overflow-hidden flex-shrink-0">
         {c.avatarUrl ? (
         <img 
          alt="Avatar"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          src={c.avatarUrl}
         />
         ) : (
         c.initials
         )}
        </div>
        <div className="min-w-0">
         <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
         {c.name}
         </div>
         <div className="text-[10px] text-slate-500 uppercase truncate">
         {c.company || 'Independent'}
         </div>
        </div>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
       </div>
       ))}
      </div>
      );
     } else {
      return (
      <div className="text-slate-600 text-[11px] italic bg-slate-950/20 p-2.5 rounded-lg border border-dashed border-white/5 text-center">
       Ningún cliente enlazado.
      </div>
      );
     }
     })()}
    </div>

    {/* Linked Notes Section */}
    <div>
     <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2 font-bold">
     Linked Notes
     </label>
     
     {(() => {
     const linkedNoteIds = selectedEvent.linkedNoteIds || [];
     const matchedNotes = (notes || []).filter(n => linkedNoteIds.includes(n.id));
     
     if (matchedNotes.length > 0) {
      return (
      <div className="space-y-1.5">
       {matchedNotes.map(n => (
       <div 
        key={n.id}
        onClick={() => onNavigate('notes', 'none')}
        className="flex items-center justify-between p-2 bg-slate-900/40 hover:bg-white/5 rounded-xl border border-white/5 transition cursor-pointer group"
       >
        <div className="min-w-0 flex-1">
        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-bold">
         {n.category}
        </span>
        <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors truncate mt-1">
         {n.title}
        </div>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-1" />
       </div>
       ))}
      </div>
      );
     } else {
      return (
      <div className="text-slate-600 text-[11px] italic bg-slate-950/20 p-2.5 rounded-lg border border-dashed border-white/5 text-center">
       Ninguna nota enlazada.
      </div>
      );
     }
     })()}
    </div>

    {/* Reminders list block */}
    <div>
     <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2">
     Reminders
     </label>
     <div className="flex flex-wrap gap-1.5">
     {selectedEvent.reminders?.map((rem, index) => (
      <span key={index} className="bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-white/5 text-[9px] font-mono">
      {rem}
      </span>
     )) || (
      <span className="text-slate-600 text-[10px] italic">Sin recordatorios activos</span>
     )}
     </div>
    </div>

    </div>

   </div>

   {/* Bottom Actions */}
   <div className="space-y-2 mt-8">
    <button 
    onClick={() => {
     if (selectedEvent.meetingUrl) {
     window.open(selectedEvent.meetingUrl, '_blank');
     } else {
     alert(`Conectándose a la sala de videoconferencia para: "${selectedEvent.title}"`);
     }
    }}
    className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 cursor-pointer"
    >
    <Video className="w-4 h-4" />
    <span>{selectedEvent.meetingUrl ? 'Join Meeting (Link)' : 'Join Video Call'}</span>
    </button>
    <button 
    onClick={handleOpenEditModal}
    className="w-full py-2.5 border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white text-xs rounded-xl transition-all cursor-pointer active:scale-95 duration-100"
    >
    Edit Event
    </button>
   </div>
   </div>
  ) : (
   <div className="flex-1 flex items-center justify-center text-center p-4">
   <p className="text-slate-500 text-xs italic">
    Seleccione un evento en el calendario para inspeccionar sus detalles.
   </p>
   </div>
  )}
  </aside>

  {/* Modern Modal: Crear Evento en Calendario */}
  {showAddModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
   <div className="absolute inset-0 bg-[#020205]/80 backdrop-blur-xl" onClick={() => setShowAddModal(false)} />
   <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#07101f]/95 p-0 text-slate-300 shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200">
   
   <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#07101f]/95 px-6 py-5 backdrop-blur-xl">
    <div className="flex items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-400/10">
     <Calendar className="h-5 w-5 text-blue-300" />
    </div>
    <div>
     <p className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-blue-300">Agenda compartida</p>
     <h3 className="text-xl font-black text-white">Crear evento o cita</h3>
    </div>
    </div>
    <button onClick={() => setShowAddModal(false)} className="rounded-2xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white">
    <X className="w-5 h-5" />
    </button>
   </div>

   <form onSubmit={handleAddEventSubmit} className="grid gap-5 p-6 lg:grid-cols-[1fr_0.9fr]">
    <div className="space-y-4">
    
    {/* Event Title */}
    <div className="space-y-1.5 rounded-2xl border border-white/10 bg-black/20 p-4">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Título del evento</label>
    <input 
     type="text"
     required
     placeholder="Ej. Reunión de equipo / cita con cliente"
     value={newTitle}
     onChange={(e) => setNewTitle(e.target.value)}
     className="w-full rounded-xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-400"
    />
    </div>

    {/* Grid: Date & Time */}
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Fecha</label>
     <input 
     type="date"
     required
     value={newDate}
     onChange={(e) => setNewDate(e.target.value)}
     className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
     />
    </div>
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Hora</label>
     <input 
     type="time"
     required
     value={newTime}
     onChange={(e) => setNewTime(e.target.value)}
     className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
     />
    </div>
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Duración (min)</label>
     <input
     type="number"
     required
     min="15"
     max="720"
     step="15"
     value={newDurationMinutes}
     onChange={(e) => setNewDurationMinutes(Math.max(15, Number(e.target.value) || 15))}
     className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
     />
    </div>
    </div>

    {/* Event Classification */}
    <div className="space-y-1 rounded-2xl border border-white/10 bg-black/20 p-4">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Tipo</label>
    <select 
     value={newType}
     onChange={(e) => setNewType(e.target.value as any)}
     className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
    >
     <option value="Meeting">Meeting</option>
     <option value="Review">Review</option>
     <option value="Kickoff">Kickoff</option>
     <option value="Deadline">Deadline</option>
     <option value="Other">Other</option>
    </select>
    </div>

    {/* Conditional Meeting URL Field */}
    {newType === 'Meeting' && (
    <div className="space-y-1 animate-in slide-in-from-top-2 duration-150">
     <label className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-semibold">Link de reunión (Google Meet / Zoom)</label>
     <input 
     type="url"
     placeholder="https://meet.google.com/abc-defg-hij"
     value={newMeetingUrl}
     onChange={(e) => setNewMeetingUrl(e.target.value)}
     className="w-full bg-[#060e20] border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
     />
    </div>
    )}

    </div>

    <div className="space-y-4">
    {/* Assign Panel User dropdown */}
    <div className="space-y-1 rounded-2xl border border-white/10 bg-black/20 p-4">
    <div className="flex justify-between items-center mb-0.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Asignar usuarios</label>
     <button 
     type="button" 
     onClick={() => setShowQuickAddCollab(!showQuickAddCollab)}
     className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
     >
     {showQuickAddCollab ? 'Cancelar' : '+ Crear usuario'}
     </button>
    </div>
    
    {showQuickAddCollab ? (
     <div className="bg-[#050b18] border border-blue-500/20 p-3 rounded-xl space-y-2 mt-1">
     <input 
      type="text"
      placeholder="Nombre del colaborador"
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
       setNewAssignedUserEmails([quickEmail.trim()]);
       setQuickName('');
       setQuickEmail('');
       setShowQuickAddCollab(false);
       }
      }}
      className="px-3 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition cursor-pointer"
      >
      Crear
      </button>
     </div>
     </div>
    ) : (
     <select 
     value={newAssignedUserEmail}
     onChange={(e) => {
      setNewAssignedUserEmail(e.target.value);
      setNewAssignedUserEmails(e.target.value ? [e.target.value] : []);
     }}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
     >
     <option value="">-- Sin asignar --</option>
     <option value="todos-comerciales">Todos los comerciales</option>
     <option value="todos-admins">Todos los admins</option>
     {usersList.map(u => (
      <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
     ))}
     {(comercialesList || [])
      .filter(com => com.email && !usersList.some(u => u.email?.toLowerCase() === com.email.toLowerCase()))
      .map(com => (
      <option key={`comercial-${com.id || com.email}`} value={com.email}>{com.name} ({com.email}) · Comercial</option>
      ))}
     </select>
    )}
    <div className="mt-2 rounded-xl border border-white/10 bg-[#060e20] p-2 space-y-1 max-h-28 overflow-y-auto">
     <label className="flex items-center gap-2 text-[10px] text-cyan-300 cursor-pointer">
     <input
      type="checkbox"
      checked={newAssignedUserEmails.includes('todos-comerciales')}
      onChange={(e) => {
      const next = e.target.checked ?
       Array.from(new Set([...newAssignedUserEmails, 'todos-comerciales']))
       : newAssignedUserEmails.filter(v => v !== 'todos-comerciales');
      setNewAssignedUserEmails(next);
      setNewAssignedUserEmail(next[0] || '');
      }}
     />
     Todos los comerciales
     </label>
     {usersList.map(u => (
     <label key={u.id} className="flex items-center gap-2 text-[10px] text-slate-300 cursor-pointer">
      <input
      type="checkbox"
      checked={newAssignedUserEmails.includes(u.email)}
      onChange={(e) => {
       const next = e.target.checked ?
        Array.from(new Set([...newAssignedUserEmails, u.email]))
       : newAssignedUserEmails.filter(v => v !== u.email);
       setNewAssignedUserEmails(next);
       setNewAssignedUserEmail(next[0] || '');
      }}
      />
      {u.name} ({u.email})
     </label>
     ))}
     {(comercialesList || [])
     .filter(com => com.email && !usersList.some(u => u.email?.toLowerCase() === com.email.toLowerCase()))
     .map(com => (
      <label key={`comercial-check-${com.id || com.email}`} className="flex items-center gap-2 text-[10px] text-emerald-300 cursor-pointer">
      <input
       type="checkbox"
       checked={newAssignedUserEmails.includes(com.email)}
       onChange={(e) => {
       const next = e.target.checked ?
        Array.from(new Set([...newAssignedUserEmails, com.email]))
        : newAssignedUserEmails.filter(v => v !== com.email);
       setNewAssignedUserEmails(next);
       setNewAssignedUserEmail(next[0] || '');
       }}
      />
      {com.name} ({com.email}) · Comercial
      </label>
     ))}
    </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
    <label className="space-y-1.5">
     <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Recurrencia</span>
     <select
     value={newRecurrence}
     onChange={(e) => setNewRecurrence(e.target.value as typeof newRecurrence)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
     >
     <option value="none">Sin repetir</option>
     <option value="daily">Diaria</option>
     <option value="weekly">Semanal</option>
     <option value="monthly">Mensual</option>
     </select>
    </label>
    <label className="space-y-1.5">
     <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Número de eventos</span>
     <input
     type="number"
     min={1}
     max={36}
     value={newRecurrenceCount}
     disabled={newRecurrence === 'none'}
     onChange={(e) => setNewRecurrenceCount(Number(e.target.value || 1))}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 disabled:opacity-50"
     />
    </label>
    </div>

    {/* Link CRM Contacts Multi-Checklist - SEARCH ONLY */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Associate CRM Clients</label>
    <input 
     type="text"
     placeholder="ID de cliente o nombre para buscar..."
     value={contactSearch}
     onChange={(e) => setContactSearch(e.target.value)}
     className="w-full mb-1.5 bg-[#060e20] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
    />
    <div className="max-h-[105px] overflow-y-auto bg-[#060e20] border border-white/10 rounded-xl p-2.5 space-y-1.5 scrollbar-thin">
     {(() => {
     const searchedContacts = contacts.filter(c => {
      if (!contactSearch.trim()) return false;
      return (
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.id.toLowerCase() === contactSearch.toLowerCase().trim() ||
      c.company.toLowerCase().includes(contactSearch.toLowerCase())
      );
     });

     const displayed = [
      ...contacts.filter(c => selectedContactIds.includes(c.id)),
      ...searchedContacts.filter(c => !selectedContactIds.includes(c.id))
     ];

     if (displayed.length === 0) {
      return (
      <span className="text-[10px] text-slate-600 italic block text-center py-1">
       {contactSearch.trim() === '' ? 'Escribe arriba para buscar clientes...' : 'No se encontraron clientes'}
      </span>
      );
     }

     return displayed.map(c => {
      const isChecked = selectedContactIds.includes(c.id);
      return (
      <div key={c.id} className="flex items-center justify-between gap-2 text-xs text-slate-300 hover:text-white select-none">
       <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
       <input 
        type="checkbox"
        checked={isChecked}
        onChange={() => {
        if (isChecked) {
         setSelectedContactIds(prev => prev.filter(id => id !== c.id));
        } else {
         setSelectedContactIds(prev => [...prev, c.id]);
        }
        }}
        className="rounded border-white/15 bg-slate-950 text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
       />
       <span className="truncate">
        {c.name} <span className="text-[9px] text-slate-500">({c.company})</span>
       </span>
       </label>
       <button
       type="button"
       onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(c.id);
        const toast = document.getElementById('toast-msg');
        if (toast) {
        toast.innerText = `ID Copiado: ${c.id}`;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 2000);
        }
       }}
       className="text-[9px] font-mono text-slate-500 hover:text-blue-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded transition cursor-pointer"
       title="Copiar ID"
       >
       Copy ID 📋
       </button>
      </div>
      );
     });
     })()}
    </div>
    </div>

    {/* Link Notes Multi-Checklist - SEARCH ONLY */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Associate Internal Notes</label>
    <input 
     type="text"
     placeholder="ID de nota o palabras clave para buscar..."
     value={noteSearch}
     onChange={(e) => setNoteSearch(e.target.value)}
     className="w-full mb-1.5 bg-[#060e20] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
    />
    <div className="max-h-[105px] overflow-y-auto bg-[#060e20] border border-white/10 rounded-xl p-2.5 space-y-1.5 scrollbar-thin">
     {(() => {
     const searchedNotes = notes.filter(n => {
      if (!noteSearch.trim()) return false;
      return (
      n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.id.toLowerCase() === noteSearch.toLowerCase().trim() ||
      n.category.toLowerCase().includes(noteSearch.toLowerCase())
      );
     });

     const displayed = [
      ...notes.filter(n => selectedNoteIds.includes(n.id)),
      ...searchedNotes.filter(n => !selectedNoteIds.includes(n.id))
     ];

     if (displayed.length === 0) {
      return (
      <span className="text-[10px] text-slate-600 italic block text-center py-1">
       {noteSearch.trim() === '' ? 'Escribe arriba para buscar notas...' : 'No se encontraron notas'}
      </span>
      );
     }

     return displayed.map(n => {
      const isChecked = selectedNoteIds.includes(n.id);
      return (
      <div key={n.id} className="flex items-center justify-between gap-2 text-xs text-slate-300 hover:text-white select-none">
       <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
       <input 
        type="checkbox"
        checked={isChecked}
        onChange={() => {
        if (isChecked) {
         setSelectedNoteIds(prev => prev.filter(id => id !== n.id));
        } else {
         setSelectedNoteIds(prev => [...prev, n.id]);
        }
        }}
        className="rounded border-white/15 bg-slate-950 text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
       />
       <span className="truncate flex-1">
        <span className="px-1 py-0.2 text-[8px] rounded uppercase bg-slate-900 border border-white/5 text-amber-500 mr-1.5 font-bold font-mono">
        {n.category}
        </span>
        {n.title}
       </span>
       </label>
       <button
       type="button"
       onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(n.id);
        const toast = document.getElementById('toast-msg');
        if (toast) {
        toast.innerText = `ID de Nota copiado: ${n.id}`;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 2000);
        }
       }}
       className="text-[9px] font-mono text-slate-500 hover:text-blue-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded transition cursor-pointer"
       title="Copiar ID de Nota"
       >
       Copy ID 📋
       </button>
      </div>
      );
     });
     })()}
    </div>
    </div>

    {/* Description */}
    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Description</label>
    <textarea 
     rows={2}
     placeholder="Review blockers and key takeaways with the team"
     value={newDescription}
     onChange={(e) => setNewDescription(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
    />
    </div>

    <div className="pt-2 flex gap-4">
    <button 
     type="button" 
     onClick={() => setShowAddModal(false)}
     className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-300 transition-all"
    >
     Cancelar
    </button>
    <button 
     type="submit"
     disabled={isCreatingEvent}
     className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all disabled:cursor-not-allowed disabled:opacity-50"
    >
     {isCreatingEvent ? 'Guardando…' : 'Guardar evento'}
    </button>
    </div>

    </div>
   </form>
   </div>
  </div>
  )}

  {/* Dynamic Edit Modal for modifying already registered meetings */}
  {showEditModal && selectedEvent && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
   <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
    <div className="relative bg-[#111827]/95 backdrop-blur-3xl border border-white/15 rounded-3xl p-6 shadow-2xl shadow-black/50 max-w-lg w-full animate-in zoom-in-95 duration-200 text-slate-300 overflow-y-auto max-h-[90vh] scrollbar-thin">
   
   <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-2">
    <h3 className="text-lg font-bold text-white flex items-center gap-2">
    <Calendar className="w-5 h-5 text-blue-400" />
     <span>Editar cita</span>
    </h3>
    <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5">
    <X className="w-5 h-5" />
    </button>
   </div>

   <form onSubmit={handleUpdateEventSubmit} className="space-y-4">
    {(selectedEvent.alias === 'Lead Dev desde Cold Calling' || selectedEvent.id.startsWith('dev_intake_')) && <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-2.5 text-[10px] leading-4 text-cyan-100"><strong>Edición interna de Dev.</strong> Estos cambios solo afectan a la planificación de Nacho; la cita del closer y la del comercial no se modifican.</div>}
    
    {/* Event Title */}
    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Título</label>
    <input 
     type="text"
     required
     placeholder="e.g. Project Delivery Scoping"
     value={editTitle}
     onChange={(e) => setEditTitle(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
    />
    </div>

    {/* Grid: Date & Time */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Date</label>
     <input 
     type="date"
     required
     value={editDate}
     onChange={(e) => setEditDate(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
     />
    </div>
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Time</label>
     <input 
     type="time"
     required
     value={editTime}
     onChange={(e) => setEditTime(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
     />
    </div>
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Duración (min)</label>
     <input
     type="number"
     required
     min="15"
     max="720"
     step="15"
     value={editDurationMinutes}
     onChange={(e) => setEditDurationMinutes(Math.max(15, Number(e.target.value) || 15))}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
     />
    </div>
    </div>

    {/* Event Classification */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Tipo</label>
    <select 
     value={editType}
     onChange={(e) => setEditType(e.target.value as any)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
    >
     <option value="Meeting">Meeting</option>
     <option value="Review">Review</option>
     <option value="Kickoff">Kickoff</option>
     <option value="Deadline">Deadline</option>
     <option value="Other">Other</option>
    </select>
    </div>
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Estado</label>
     <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'pending' | 'done' | 'postponed')} className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 [color-scheme:dark]">
      <option value="pending">Pendiente</option>
      <option value="done">Completada</option>
      <option value="postponed">Pospuesta</option>
     </select>
    </div>
    <div className="space-y-1">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Color</label>
     <div className="flex h-[38px] items-center gap-2 rounded-xl border border-white/10 bg-[#060e20] px-2.5">
      <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
      <span className="font-mono text-[9px] text-slate-500">{editColor.toUpperCase()}</span>
     </div>
    </div>
    </div>

    {/* Conditional Meeting URL Field */}
    {editType === 'Meeting' && (
    <div className="space-y-1 animate-in slide-in-from-top-2 duration-155">
     <label className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-semibold">Meeting Video Link</label>
     <input 
     type="url"
     placeholder="https://meet.google.com/abc-defg-hij"
     value={editMeetingUrl}
     onChange={(e) => setEditMeetingUrl(e.target.value)}
     className="w-full bg-[#060e20] border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
     />
    </div>
    )}

    {/* Assign Panel User dropdown */}
    <div className="space-y-1">
    <div className="flex justify-between items-center mb-0.5">
     <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Responsable</label>
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
       setEditAssignedUserEmail(quickEmail.trim());
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
     value={editAssignedUserEmail}
     onChange={(e) => setEditAssignedUserEmail(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
     >
     <option value="">-- No Assignee --</option>
     {usersList.map(u => (
      <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
     ))}
     </select>
    )}
    </div>

    {/* Associated Clients */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Associate CRM Clients</label>
    <input 
     type="text"
     placeholder="Buscar clientes por ID o nombre..."
     value={contactSearch}
     onChange={(e) => setContactSearch(e.target.value)}
     className="w-full mb-1.5 bg-[#060e20] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
    />
    <div className="max-h-[105px] overflow-y-auto bg-[#060e20] border border-white/10 rounded-xl p-2.5 space-y-1.5 scrollbar-thin">
     {(() => {
     const searchedContacts = contacts.filter(c => {
      if (!contactSearch.trim()) return false;
      return (
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.id.toLowerCase() === contactSearch.toLowerCase().trim() ||
      c.company.toLowerCase().includes(contactSearch.toLowerCase())
      );
     });

     const displayed = [
      ...contacts.filter(c => editContactIds.includes(c.id)),
      ...searchedContacts.filter(c => !editContactIds.includes(c.id))
     ];

     if (displayed.length === 0) {
      return (
      <span className="text-[10px] text-slate-600 italic block text-center py-1">
       {contactSearch.trim() === '' ? 'Escribe arriba para buscar clientes...' : 'No se encontraron clientes'}
      </span>
      );
     }

     return displayed.map(c => {
      const isChecked = editContactIds.includes(c.id);
      return (
      <div key={c.id} className="flex items-center justify-between gap-2 text-xs text-slate-300 hover:text-white select-none">
       <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
       <input 
        type="checkbox"
        checked={isChecked}
        onChange={() => {
        if (isChecked) {
         setEditContactIds(prev => prev.filter(id => id !== c.id));
        } else {
         setEditContactIds(prev => [...prev, c.id]);
        }
        }}
        className="rounded border-white/15 bg-slate-950 text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
       />
       <span className="truncate">
        {c.name} <span className="text-[9px] text-slate-500">({c.company})</span>
       </span>
       </label>
       <button
       type="button"
       onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(c.id);
        const toast = document.getElementById('toast-msg');
        if (toast) {
        toast.innerText = `ID Copiado: ${c.id}`;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 2000);
        }
       }}
       className="text-[9px] font-mono text-slate-500 hover:text-blue-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded transition cursor-pointer"
       title="Copiar ID de cliente"
       >
       Copy ID 📋
       </button>
      </div>
      );
     });
     })()}
    </div>
    </div>

    {/* Associated Notes */}
    <div className="space-y-1.5">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">Associate Internal Notes</label>
    <input 
     type="text"
     placeholder="Buscar notas por ID o categoría..."
     value={noteSearch}
     onChange={(e) => setNoteSearch(e.target.value)}
     className="w-full mb-1.5 bg-[#060e20] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
    />
    <div className="max-h-[105px] overflow-y-auto bg-[#060e20] border border-white/10 rounded-xl p-2.5 space-y-1.5 scrollbar-thin">
     {(() => {
     const searchedNotes = notes.filter(n => {
      if (!noteSearch.trim()) return false;
      return (
      n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.id.toLowerCase() === noteSearch.toLowerCase().trim() ||
      n.category.toLowerCase().includes(noteSearch.toLowerCase())
      );
     });

     const displayed = [
      ...notes.filter(n => editNoteIds.includes(n.id)),
      ...searchedNotes.filter(n => !editNoteIds.includes(n.id))
     ];

     if (displayed.length === 0) {
      return (
      <span className="text-[10px] text-slate-600 italic block text-center py-1">
       {noteSearch.trim() === '' ? 'Escribe arriba para buscar notas...' : 'No se encontraron notas'}
      </span>
      );
     }

     return displayed.map(n => {
      const isChecked = editNoteIds.includes(n.id);
      return (
      <div key={n.id} className="flex items-center justify-between gap-2 text-xs text-slate-300 hover:text-white select-none">
       <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
       <input 
        type="checkbox"
        checked={isChecked}
        onChange={() => {
        if (isChecked) {
         setEditNoteIds(prev => prev.filter(id => id !== n.id));
        } else {
         setEditNoteIds(prev => [...prev, n.id]);
        }
        }}
        className="rounded border-white/15 bg-slate-950 text-blue-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
       />
       <span className="truncate flex-1 font-sans">
        <span className="px-1.5 py-0.2 text-[8px] rounded uppercase bg-slate-950 border border-white/5 text-amber-500 mr-1 font-bold font-mono">
        {n.category}
        </span>
        {n.title}
       </span>
       </label>
       <button
       type="button"
       onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(n.id);
        const toast = document.getElementById('toast-msg');
        if (toast) {
        toast.innerText = `ID de Nota copiado: ${n.id}`;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 2000);
        }
       }}
       className="text-[9px] font-mono text-slate-500 hover:text-blue-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded transition cursor-pointer"
       title="Copiar ID de Nota"
       >
       Copy ID 📋
       </button>
      </div>
      );
     });
     })()}
    </div>
    </div>

    {/* Description */}
    <div className="space-y-1">
    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Descripción</label>
    <textarea 
     rows={2.5}
     placeholder="Describa el objetivo de la reunión..."
     value={editDescription}
     onChange={(e) => setEditDescription(e.target.value)}
     className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
    />
    </div>

    <div className="pt-2 flex gap-4">
    <button 
     type="button" 
     onClick={() => setShowEditModal(false)}
     className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-300 transition-all cursor-pointer"
    >
     Cancelar
    </button>
    <button 
     type="submit"
     disabled={isUpdatingEvent}
     className="flex-1 py-1 px-1 py-2.5 bg-blue-500 hover:bg-blue-400 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    >
     {isUpdatingEvent ? 'Guardando…' : 'Guardar cambios'}
    </button>
    </div>

   </form>
   </div>
  </div>
  )}

  {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
  {deleteConfirmEventId && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
   <div className="bg-[#0b1329] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
   <div className="flex items-start gap-3">
    <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
    <Trash2 className="w-6 h-6" />
    </div>
    <div className="space-y-1">
    <h4 className="text-sm font-sans font-bold text-white uppercase tracking-wide">
     ¿Eliminar Evento?
    </h4>
    <p className="text-xs text-slate-400 leading-relaxed font-sans">
     ¿Estás seguro de que deseas eliminar este evento del calendario de forma definitiva? Esta acción es irreversible.
    </p>
    </div>
   </div>
   <div className="flex gap-3 justify-end pt-2">
    <button
    type="button"
    onClick={() => setDeleteConfirmEventId(null)}
    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer font-sans"
    >
    Cancelar
    </button>
    <button
    type="button"
    onClick={() => {
     if (deleteConfirmEventId) {
     confirmDeleteEvent(deleteConfirmEventId);
     setDeleteConfirmEventId(null);
     }
    }}
    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition duration-240 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.3)] font-sans"
    >
    Eliminar Evento
    </button>
   </div>
   </div>
  </div>
  )}

 </div>
 );
}
