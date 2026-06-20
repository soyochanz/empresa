import React, { useState } from 'react';
import { ClientContact, CalendarEvent, Screen } from '../types';
import { REGISTERED_USERS, PanelUser } from '../mockData';
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Calendar, 
  Link as LinkIcon, 
  ChevronRight, 
  Download, 
  Filter, 
  X,
  UserPlus,
  Eye,
  EyeOff,
  Github,
  Globe,
  Key,
  Archive,
  Trash2,
  Upload,
  Edit
} from 'lucide-react';

export const AESTHETIC_COLORS = [
  { val: 'indigo', label: 'Indigo', hex: '#6366f1', activeStyle: 'bg-indigo-500/25 border-indigo-500 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]', badgeStyle: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { val: 'emerald', label: 'Esmeralda Sutil', hex: '#10b981', activeStyle: 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]', badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { val: 'amber', label: 'Ámbar Cálido', hex: '#f59e0b', activeStyle: 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]', badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { val: 'rose', label: 'Rosa Cenizo', hex: '#f43f5e', activeStyle: 'bg-rose-500/25 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]', badgeStyle: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { val: 'violet', label: 'Lavanda Violeta', hex: '#8b5cf6', activeStyle: 'bg-violet-500/25 border-violet-500 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]', badgeStyle: 'bg-violet-500/10 text-violet-400 border-violet-500/20' }
];

export const getContactColor = (color: string | undefined): 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' => {
  if (!color) return 'indigo';
  const c = color.toLowerCase();
  if (c === 'red' || c === 'rose') return 'rose';
  if (c === 'yellow' || c === 'amber') return 'amber';
  if (c === 'green' || c === 'emerald') return 'emerald';
  if (c === 'blue' || c === 'indigo') return 'indigo';
  if (c === 'violet' || c === 'purple') return 'violet';
  return 'indigo';
};

interface CrmScreenProps {
  contacts: ClientContact[];
  events?: CalendarEvent[];
  onAddContact: (contact: ClientContact) => void;
  onUpdateContact?: (contact: ClientContact) => void;
  onDeleteContact?: (id: string) => void;
  onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
  usersList?: PanelUser[];
  onAddProfile?: (profile: { name: string; email: string }) => void;
  onAddEvent?: (event: CalendarEvent) => void;
}

export default function CrmScreen({ 
  contacts, 
  events = [], 
  onAddContact, 
  onUpdateContact, 
  onDeleteContact,
  onNavigate,
  usersList = REGISTERED_USERS,
  onAddProfile,
  onAddEvent
}: CrmScreenProps) {
  const [selectedContactId, setSelectedContactId] = useState<string>('c2'); // default to Marcus Chen
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dedicated modal state for scheduling in-person meetings (Cita Presencial)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('11:05'); // slight difference
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDesc, setScheduleDesc] = useState('');
  const [scheduleAssignee, setScheduleAssignee] = useState('unassigned');

  // Quick collaborator states
  const [showQuickAddCollab, setShowQuickAddCollab] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  
  // Tab/filter for Active vs Archived contacts
  const [crmFilter, setCrmFilter] = useState<'active' | 'archived'>('active');

  // Archive tracker state linked to localStorage
  const [archivedContactIds, setArchivedContactIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('archived_contacts_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleArchiveContact = (id: string) => {
    const isCurrentlyArchived = archivedContactIds.includes(id);
    const updated = isCurrentlyArchived 
      ? archivedContactIds.filter(item => item !== id)
      : [...archivedContactIds, id];
    setArchivedContactIds(updated);
    localStorage.setItem('archived_contacts_ids', JSON.stringify(updated));

    const toast = document.getElementById('toast-msg');
    if (toast) {
      toast.innerText = isCurrentlyArchived ? "Cliente desarchivado con éxito." : "Cliente archivado con éxito.";
      toast.classList.remove('opacity-0');
      setTimeout(() => toast.classList.add('opacity-0'), 2500);
    }
  };

  // Form states and editing tracker
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newStatus, setNewStatus] = useState<'Client' | 'Lead'>('Lead');
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('San Francisco, CA');
  const [newWebsite, setNewWebsite] = useState('');
  const [newGithubRepo, setNewGithubRepo] = useState('');
  const [newHostingCredentials, setNewHostingCredentials] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLinkedin, setNewLinkedin] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newAssignedUserEmail, setNewAssignedUserEmail] = useState('');
  const [newColor, setNewColor] = useState('');

  const resetFormFields = () => {
    setNewName('');
    setNewEmail('');
    setNewCompany('');
    setNewStatus('Lead');
    setNewRole('');
    setNewLocation('San Francisco, CA');
    setNewWebsite('');
    setNewGithubRepo('');
    setNewHostingCredentials('');
    setNewPhone('');
    setNewLinkedin('');
    setNewAvatarUrl('');
    setNewAssignedUserEmail('');
    setNewColor('');
    setEditingContact(null);
  };

  // Eye toggle visibility matching target contact ID
  const [showCredsId, setShowCredsId] = useState<string | null>(null);

  const toggleCredsVisibility = (id: string) => {
    setShowCredsId(prev => prev === id ? null : id);
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId) || contacts[0];

  const handleOpenScheduleMeeting = (contact: ClientContact) => {
    setScheduleDate(new Date().toISOString().split('T')[0]);
    setScheduleTime('11:00');
    setScheduleTitle(`Cita Presencial con ${contact.name}`);
    setScheduleDesc(`Reunión presencial con el cliente en sus oficinas para dar seguimiento al proyecto.`);
    setScheduleAssignee(contact.assignedUserEmail || 'unassigned');
    setShowScheduleModal(true);
  };

  const handleConfirmScheduleMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddEvent || !selectedContact) return;

    const newEvent: CalendarEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      title: scheduleTitle.trim() || `Cita Presencial con ${selectedContact.name}`,
      date: scheduleDate,
      time: scheduleTime,
      type: 'Meeting',
      description: scheduleDesc.trim(),
      linkedContactId: selectedContact.id,
      linkedContactName: selectedContact.name,
      linkedContactIds: [selectedContact.id],
      assignedUserEmail: scheduleAssignee !== 'unassigned' ? scheduleAssignee : undefined,
      color: 'violet',
      status: 'pending'
    };

    onAddEvent(newEvent);
    setShowScheduleModal(false);
    alert(`¡Éxito! Se ha agendado una Cita Presencial para el día ${scheduleDate} a las ${scheduleTime} h.`);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const initials = newName
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const matchedUser = usersList.find(u => u.email === newAssignedUserEmail);

    if (editingContact) {
      const updatedContact: ClientContact = {
        ...editingContact,
        name: newName,
        email: newEmail,
        company: newCompany || 'Independent',
        status: newStatus,
        role: newRole || 'Product Manager',
        location: newLocation,
        website: newWebsite || (newCompany ? `${newCompany.toLowerCase().replace(/\s+/g, '')}.io` : ''),
        githubRepo: newGithubRepo,
        hostingCredentials: newHostingCredentials,
        phone: newPhone || undefined,
        linkedin: newLinkedin || undefined,
        avatarUrl: newAvatarUrl || undefined,
        assignedUserEmail: newAssignedUserEmail || undefined,
        assignedUserId: matchedUser ? matchedUser.id : undefined,
        initials: initials || 'N',
        color: newColor || undefined,
        temperature: newColor === 'red' ? 'Caliente' : newColor === 'yellow' ? 'Templado' : 'Frío'
      };

      if (onUpdateContact) {
        onUpdateContact(updatedContact);
      }
      setSelectedContactId(updatedContact.id);
    } else {
      const generatedContact: ClientContact = {
        id: 'c_' + Date.now().toString().slice(-6),
        name: newName,
        email: newEmail,
        company: newCompany || 'Independent',
        status: newStatus,
        lastContacted: 'Just now',
        role: newRole || 'Product Manager',
        location: newLocation,
        addedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        website: newWebsite || (newCompany ? `${newCompany.toLowerCase().replace(/\s+/g, '')}.io` : ''),
        githubRepo: newGithubRepo,
        hostingCredentials: newHostingCredentials,
        phone: newPhone || undefined,
        linkedin: newLinkedin || undefined,
        avatarUrl: newAvatarUrl || undefined,
        assignedUserEmail: newAssignedUserEmail || undefined,
        assignedUserId: matchedUser ? matchedUser.id : undefined,
        initials: initials || 'N',
        color: newColor || undefined,
        temperature: newColor === 'red' ? 'Caliente' : newColor === 'yellow' ? 'Templado' : 'Frío'
      };

      onAddContact(generatedContact);
      setSelectedContactId(generatedContact.id);
    }

    setShowAddModal(false);
    resetFormFields();

    const toast = document.getElementById('toast-msg');
    if (toast) {
      toast.innerText = editingContact 
        ? `Cliente actualizado exitosamente: ${newName}` 
        : `Cliente registrado exitosamente: ${newName}`;
      toast.classList.remove('opacity-0');
      setTimeout(() => toast.classList.add('opacity-0'), 3000);
    }
  };

  // Filter contacts by search query & archive status
  const filteredContacts = contacts.filter(c => {
    const isArchived = archivedContactIds.includes(c.id);
    if (crmFilter === 'active' && isArchived) return false;
    if (crmFilter === 'archived' && !isArchived) return false;

    const nameMatch = c.name ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const companyMatch = c.company ? c.company.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const emailMatch = c.email ? c.email.toLowerCase().includes(searchQuery.toLowerCase()) : false;

    return nameMatch || companyMatch || emailMatch;
  });

  return (
    <div className="flex-1 p-8 flex gap-8 h-[calc(100vh-80px)] overflow-hidden bg-transparent text-slate-100">
      
      {/* Contact List Column */}
      <section className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* Title and Top Search Bar */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-sans">Relationship Manager</h2>
            <p className="text-slate-400 text-xs mt-1">Managing {contacts.length} active leads and clients across 4 projects.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => alert("Sistemas de Filtro de CRM localmente integrados.")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
            >
              <Filter className="w-4.5 h-4.5" />
              <span>Filter</span>
            </button>
            <button 
              onClick={() => alert("Exportando registros de clientes. Descarga iniciada perfectamente en formato CSV.")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
            >
              <Download className="w-4.5 h-4.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Local Search Input Inside the CRM view with filter tabs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
            <input 
              type="text"
              placeholder="Search contacts, companies, email addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 outline-none placeholder:text-slate-600 text-slate-200"
            />
          </div>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-850 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setCrmFilter('active')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                crmFilter === 'active'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              Activos ({contacts.filter(c => !archivedContactIds.includes(c.id)).length})
            </button>
            <button
              onClick={() => setCrmFilter('archived')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                crmFilter === 'archived'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              Archivados ({contacts.filter(c => archivedContactIds.includes(c.id)).length})
            </button>
          </div>
        </div>

        {/* Table layout container */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden flex-1 flex flex-col border border-white/10 shadow-2xl shadow-black/15">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-mono uppercase text-slate-400 tracking-wider">Name</th>
                  <th className="px-6 py-4 text-[10px] font-mono uppercase text-slate-400 tracking-wider">Company</th>
                  <th className="px-6 py-4 text-[10px] font-mono uppercase text-slate-400 tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-mono uppercase text-slate-400 tracking-wider">Last Contacted</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredContacts.map((contact) => {
                  const isSelected = contact.id === selectedContactId;

                  let bgBgClass = '';
                  let borderColClass = 'border-l-4 border-transparent';

                  const contactColor = getContactColor(contact.color);

                  if (contactColor === 'indigo') {
                    bgBgClass = isSelected 
                      ? 'bg-indigo-500/10 text-white shadow-inner shadow-indigo-900/15' 
                      : 'bg-transparent text-slate-300 hover:bg-indigo-500/5';
                    borderColClass = 'border-l-4 border-indigo-500/80';
                  } else if (contactColor === 'emerald') {
                    bgBgClass = isSelected 
                      ? 'bg-emerald-500/10 text-white shadow-inner shadow-emerald-900/15' 
                      : 'bg-transparent text-slate-300 hover:bg-emerald-500/5';
                    borderColClass = 'border-l-4 border-emerald-500/80';
                  } else if (contactColor === 'amber') {
                    bgBgClass = isSelected 
                      ? 'bg-amber-500/10 text-white shadow-inner shadow-amber-900/15' 
                      : 'bg-transparent text-slate-300 hover:bg-amber-500/5';
                    borderColClass = 'border-l-4 border-amber-500/80';
                  } else if (contactColor === 'rose') {
                    bgBgClass = isSelected 
                      ? 'bg-rose-500/10 text-white shadow-inner shadow-rose-900/15' 
                      : 'bg-transparent text-slate-300 hover:bg-rose-500/5';
                    borderColClass = 'border-l-4 border-rose-500/80';
                  } else if (contactColor === 'violet') {
                    bgBgClass = isSelected 
                      ? 'bg-violet-500/10 text-white shadow-inner shadow-violet-900/15' 
                      : 'bg-transparent text-slate-300 hover:bg-violet-500/5';
                    borderColClass = 'border-l-4 border-violet-500/80';
                  }

                  return (
                    <tr 
                      key={contact.id}
                      onClick={() => setSelectedContactId(contact.id)}
                      className={`cursor-pointer transition-all duration-150 group ${bgBgClass} ${borderColClass}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-450'
                          } overflow-hidden`}>
                            {contact.avatarUrl ? (
                              <img 
                                alt={contact.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                src={contact.avatarUrl}
                              />
                            ) : (
                              contact.initials
                            )}
                          </div>
                          <div>
                            <div>
                              <p className="font-semibold text-xs text-white pb-0.5">{contact.name}</p>
                            </div>
                            <p className="text-[10px] text-slate-505">{contact.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-450">
                        {contact.company}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${
                          contact.status === 'Client'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                        }`}>
                          {contact.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-sans">
                        {contact.lastContacted}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className={`w-4 h-4 transition-all ${
                          isSelected ? 'text-blue-400 translate-x-1' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                        }`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredContacts.length === 0 && (
              <div className="text-center p-12 text-slate-500 italic text-xs">
                No se encontraron contactos que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>

      </section>

      {/* Detailed Side Panel Bio Inspector */}
      <aside className="w-[400px] flex flex-col gap-6 ">
        {selectedContact ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden flex flex-col h-full border border-white/10 shadow-2xl shadow-black/20">
            
            {/* Detail Banner cover */}
            <div className={`relative h-32 border-b border-white/5 transition-all duration-300 ${
              selectedContact.color === 'red' ? 'bg-gradient-to-tr from-red-600/30 via-red-950/20 to-slate-950/20' :
              selectedContact.color === 'green' ? 'bg-gradient-to-tr from-emerald-600/30 via-emerald-950/20 to-slate-950/20' :
              selectedContact.color === 'yellow' ? 'bg-gradient-to-tr from-amber-500/30 via-amber-950/20 to-slate-950/20' :
              selectedContact.color === 'blue' ? 'bg-gradient-to-tr from-blue-600/30 via-blue-950/20 to-slate-950/20' :
              'bg-gradient-to-tr from-blue-500/20 to-purple-500/10'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {/* Archive Button */}
                <button 
                  onClick={() => toggleArchiveContact(selectedContact.id)}
                  className="p-2 bg-slate-950/60 hover:bg-slate-900 hover:text-amber-400 text-slate-300 rounded-xl border border-white/5 transition cursor-pointer"
                  title={archivedContactIds.includes(selectedContact.id) ? "Desarchivar Cliente" : "Archivar Cliente"}
                >
                  <Archive className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button 
                  onClick={() => {
                    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el cliente: "${selectedContact.name}"?`)) {
                      if (onDeleteContact) {
                        onDeleteContact(selectedContact.id);
                        setSelectedContactId('');
                      }
                    }
                  }}
                  className="p-2 bg-slate-950/60 hover:bg-slate-900 hover:text-red-450 text-slate-300 rounded-xl border border-white/5 transition cursor-pointer"
                  title="Eliminar Cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => {
                    setEditingContact(selectedContact);
                    setNewName(selectedContact.name || '');
                    setNewEmail(selectedContact.email || '');
                    setNewCompany(selectedContact.company || '');
                    setNewStatus(selectedContact.status || 'Lead');
                    setNewRole(selectedContact.role || '');
                    setNewLocation(selectedContact.location || 'San Francisco, CA');
                    setNewWebsite(selectedContact.website || '');
                    setNewGithubRepo(selectedContact.githubRepo || '');
                    setNewHostingCredentials(selectedContact.hostingCredentials || '');
                    setNewPhone(selectedContact.phone || '');
                    setNewLinkedin(selectedContact.linkedin || '');
                    setNewAvatarUrl(selectedContact.avatarUrl || '');
                    setNewAssignedUserEmail(selectedContact.assignedUserEmail || '');
                    setNewColor(selectedContact.color || '');
                    setShowAddModal(true);
                  }}
                  className="p-2 bg-slate-950/60 hover:bg-slate-900 border border-white/5 text-slate-300 hover:text-blue-400 rounded-xl transition cursor-pointer"
                  title="Editar Contacto"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Profile Detail Stack */}
            <div className="px-6 -mt-10 relative z-10 flex flex-col gap-5 pb-6 overflow-y-auto flex-1 scrollbar-thin">
              
              {/* Profile Card Center Headshot */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border-4 border-slate-950/80 shadow-xl flex items-center justify-center">
                  {selectedContact.avatarUrl ? (
                    <img 
                      alt="Headshot" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      src={selectedContact.avatarUrl}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-blue-400">{selectedContact.initials}</span>
                  )}
                </div>

                <div className="mt-4 flex flex-col items-center">
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedContact.name}</h3>
                  <p className="text-xs text-slate-400">{selectedContact.role || 'Partner'} @ {selectedContact.company}</p>
                  
                  {/* Copy Client ID Button */}
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedContact.id);
                      const toast = document.getElementById('toast-msg');
                      if (toast) {
                        toast.innerText = `ID de Cliente copiado: ${selectedContact.id}`;
                        toast.classList.remove('opacity-0');
                        setTimeout(() => toast.classList.add('opacity-0'), 2500);
                      }
                    }}
                    className="mt-2 text-[10px] font-mono text-slate-400 hover:text-blue-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer active:scale-95 duration-100"
                    title="Copiar ID de Cliente"
                  >
                    <span>ID: {selectedContact.id}</span>
                    <span className="text-[10px] opacity-70">📋</span>
                  </button>

                  <div className="flex justify-center gap-1.5 mt-4 items-center">
                    <div className="relative">
                      <select 
                        value={selectedContact.status}
                        onChange={(e) => {
                          const val = e.target.value as 'Client' | 'Lead';
                          if (onUpdateContact) {
                            onUpdateContact({
                              ...selectedContact,
                              status: val
                            });
                          }
                        }}
                        className="appearance-none font-bold text-[9px] uppercase tracking-wider bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 pl-2.5 pr-6 py-1 rounded-xl cursor-pointer transition focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
                        title="Cambiar estado del contacto"
                      >
                        <option value="Lead" className="bg-[#0e1628] text-slate-300 font-sans font-medium text-xs">Lead</option>
                        <option value="Client" className="bg-[#0e1628] text-slate-300 font-sans font-medium text-xs">Client</option>
                      </select>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none text-[8px] scale-75">▼</span>
                    </div>
                    {selectedContact.priority && (
                      <span className="px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        High Priority
                      </span>
                    )}
                  </div>

                  {/* Subtle, Aesthetic Client Color Selector */}
                  {(() => {
                    const currentColor = getContactColor(selectedContact.color);
                    return (
                      <div className="mt-4 bg-[#030305] p-3 rounded-2xl border border-white/5 space-y-2.5 text-left w-full">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold text-[#7e7e8e]">Color / Etiqueta:</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                            currentColor === 'indigo' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                            currentColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            currentColor === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            currentColor === 'rose' ? 'bg-rose-500/10 text-rose-455 border-rose-500/20' :
                            'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          }`}>
                            {currentColor}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-1.5">
                          {AESTHETIC_COLORS.map(({ val, label, activeStyle }) => {
                            const isCurrent = currentColor === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  if (onUpdateContact) {
                                    onUpdateContact({
                                      ...selectedContact,
                                      color: val
                                    });
                                  }
                                }}
                                className={`py-1.5 px-0.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                                  isCurrent 
                                    ? activeStyle 
                                    : 'bg-slate-900/40 border-white/5 text-slate-450 hover:text-slate-200'
                                }`}
                                title={label}
                              >
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: val === 'indigo' ? '#6366f1' : val === 'emerald' ? '#10b981' : val === 'amber' ? '#f59e0b' : val === 'rose' ? '#f43f5e' : '#8b5cf6' }} />
                              </button>
                            );
                          })}
                        </div>

                        {/* Agendar Cita Presencial Action Button */}
                        <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenScheduleMeeting(selectedContact)}
                            className="w-full py-2 px-3.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 text-violet-350 hover:text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(139,92,246,0.05)]"
                          >
                            <Calendar className="w-3.5 h-3.5 text-violet-400" />
                            <span>Agendar Cita Presencial</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons Icons Row - REMOVED Chat button as requested */}
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={`mailto:${selectedContact.email}`}
                  className="flex flex-col items-center gap-1 py-3 hover:bg-white/10 rounded-xl bg-white/5 border border-white/5 transition group text-center cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-mono text-slate-500">Email Contact</span>
                </a>
                <a 
                  href={selectedContact.phone ? `tel:${selectedContact.phone}` : '#'}
                  onClick={(e) => {
                    if (!selectedContact.phone) {
                      e.preventDefault();
                      alert("No se ha registrado ningún teléfono para este cliente.");
                    }
                  }}
                  className="flex flex-col items-center gap-1 py-3 hover:bg-white/10 rounded-xl bg-white/5 border border-white/5 transition group text-center cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-mono text-slate-500">{selectedContact.phone ? 'Call Contact' : 'No Phone'}</span>
                </a>
              </div>

              {/* Basic Contact Info Section with detailed dynamic values */}
              <div className="space-y-2 border-b border-white/5 pb-4">
                <h4 className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">Contact Info</h4>
                <div className="bg-slate-950/40 p-4 rounded-xl space-y-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-slate-500 w-4 h-4 flex-shrink-0" />
                    <span className="text-xs text-slate-300">{selectedContact.location || 'Not Specified'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="text-slate-500 w-4 h-4 flex-shrink-0" />
                    <span className="text-xs text-slate-300 truncate select-all">{selectedContact.email}</span>
                  </div>
                  {selectedContact.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="text-slate-500 w-4 h-4 flex-shrink-0" />
                      <span className="text-xs text-slate-300 truncate select-all">{selectedContact.phone}</span>
                    </div>
                  )}
                  {selectedContact.linkedin && (
                    <div className="flex items-center gap-3">
                      <LinkIcon className="text-slate-500 w-4 h-4 flex-shrink-0" />
                      <a 
                        href={selectedContact.linkedin.startsWith('http') ? selectedContact.linkedin : `https://linkedin.com/in/${selectedContact.linkedin}`}
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-blue-400 hover:underline truncate"
                      >
                        LinkedIn: {selectedContact.linkedin.replace('https://', '').replace('www.linkedin.com/in/', '')}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="text-slate-500 w-4 h-4 flex-shrink-0" />
                    <span className="text-xs text-slate-300 font-sans">Added: {selectedContact.addedDate || 'May 21, 2026'}</span>
                  </div>
                </div>
              </div>

              {/* Comercial & Call Notes Section */}
              <div className="space-y-2 border-b border-white/5 pb-4">
                <h4 className="text-[9px] font-mono uppercase tracking-widest text-[#D4AF37] font-bold">Historial de Prospección</h4>
                <div className="bg-[#030306]/40 p-4 rounded-xl space-y-3.5 border border-white/5">
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span className="text-slate-500 font-medium font-sans">Comercial que le contactó:</span>
                    <span className="font-semibold text-white bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded text-[10px]">
                      {selectedContact.contactedByComercialName || selectedContact.contactedByComercialEmail || 'No registrado en llamada previa'}
                    </span>
                  </div>

                  {selectedContact.contactedByComercialEmail && (
                    <div className="flex justify-between items-center text-xs text-slate-350">
                      <span className="text-slate-500 text-[10px] font-mono">Email Comercial:</span>
                      <span className="text-[10px] font-mono select-all text-slate-400">{selectedContact.contactedByComercialEmail}</span>
                    </div>
                  )}

                  {selectedContact.originalLeadNotes && (
                    <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-white/5">
                      <p className="text-[10px] font-mono text-slate-505 uppercase tracking-wider font-semibold">Notas de llamada original:</p>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed italic pr-2">
                        "{selectedContact.originalLeadNotes}"
                      </p>
                    </div>
                  )}

                  {/* General CRM Notes Editable Space */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-left">
                    <label className="text-[10px] font-semibold font-mono text-slate-400 uppercase tracking-widest block">Notas del Cliente (CRM):</label>
                    <textarea
                      value={selectedContact.notes || ''}
                      onChange={(e) => {
                        if (onUpdateContact) {
                          onUpdateContact({
                            ...selectedContact,
                            notes: e.target.value
                          });
                        }
                      }}
                      placeholder="Escribe notas de seguimiento para este cliente, acuerdos, presupuestos..."
                      className="w-full bg-[#030306] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors block leading-relaxed resize-y h-24"
                    />
                  </div>
                </div>
              </div>

              {/* Assigned User Section */}
              <div className="space-y-2 border-b border-white/5 pb-4">
                <h4 className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">Assigned Panel User</h4>
                <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex flex-shrink-0 items-center justify-center font-bold font-mono text-xs border border-blue-500/20">
                      {selectedContact.assignedUserEmail ? selectedContact.assignedUserEmail.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {selectedContact.assignedUserEmail 
                          ? (usersList.find(u => u.email === selectedContact.assignedUserEmail)?.name || selectedContact.assignedUserEmail) 
                          : 'Unassigned'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        {selectedContact.assignedUserEmail || 'No user allocated'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Select allocation dropdown */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button 
                      type="button" 
                      onClick={() => setShowQuickAddCollab(!showQuickAddCollab)}
                      className="text-[9px] text-[#D4AF37] hover:underline self-end"
                    >
                      {showQuickAddCollab ? 'Cancel' : '+ Create User'}
                    </button>
                    {showQuickAddCollab ? (
                      <div className="bg-slate-900 border border-amber-500/10 p-2 rounded-lg space-y-1 text-left w-48">
                        <input 
                          type="text"
                          placeholder="Name"
                          value={quickName}
                          onChange={(e) => setQuickName(e.target.value)}
                          className="w-full bg-slate-950 border border-white/5 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                        />
                        <div className="flex gap-1">
                          <input 
                            type="email"
                            placeholder="Email"
                            value={quickEmail}
                            onChange={(e) => setQuickEmail(e.target.value)}
                            className="flex-1 bg-slate-950 border border-white/5 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!quickName.trim() || !quickEmail.trim()) return;
                              if (onAddProfile) {
                                onAddProfile({ name: quickName.trim(), email: quickEmail.trim() });
                                if (onUpdateContact) {
                                  onUpdateContact({
                                    ...selectedContact,
                                    assignedUserEmail: quickEmail.trim(),
                                  });
                                }
                                setQuickName('');
                                setQuickEmail('');
                                setShowQuickAddCollab(false);
                              }
                            }}
                            className="px-1.5 bg-[#D4AF37] text-black text-[10px] font-bold rounded"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={selectedContact.assignedUserEmail || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = usersList.find(u => u.email === val);
                          if (onUpdateContact) {
                            onUpdateContact({
                              ...selectedContact,
                              assignedUserEmail: val || undefined,
                              assignedUserId: matched ? matched.id : undefined
                            });
                            const toast = document.getElementById('toast-msg');
                            if (toast) {
                              toast.innerText = `Asignación guardada: ${matched ? matched.name : 'Sin asignar'}`;
                              toast.classList.remove('opacity-0');
                              setTimeout(() => toast.classList.add('opacity-0'), 2500);
                            }
                          }
                        }}
                        className="bg-slate-900 border border-white/10 text-[10px] rounded-lg py-1 px-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[140px]"
                      >
                        <option value="">-- Unassigned --</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Assets & Credentials toggles */}
              <div className="space-y-2 border-b border-white/5 pb-4">
                <h4 className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">Client Assets & Hosting</h4>
                <div className="bg-[#080d1a] p-4 rounded-xl space-y-3.5 border border-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="text-slate-500 w-4 h-4 flex-shrink-0" />
                    <span className="text-xs text-slate-400 font-medium">Web:</span>
                    {selectedContact.website ? (
                      <a 
                        href={selectedContact.website.startsWith('http') ? selectedContact.website : `https://${selectedContact.website}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-blue-400 hover:underline truncate"
                      >
                        {selectedContact.website}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 italic font-mono">No asignada</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <Github className="text-slate-500 w-4 h-4 flex-shrink-0" />
                    <span className="text-xs text-slate-400 font-medium font-sans">GitHub:</span>
                    {selectedContact.githubRepo ? (
                      <a 
                        href={selectedContact.githubRepo.startsWith('http') ? selectedContact.githubRepo : `https://github.com/${selectedContact.githubRepo}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-blue-400 hover:underline truncate font-mono"
                      >
                        {selectedContact.githubRepo.replace('https://github.com/', '')}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 italic font-mono">No asignado</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Credenciales Hosting</p>
                        <p className="text-xs font-mono text-emerald-400 truncate mt-1 select-all font-semibold select-text">
                          {showCredsId === selectedContact.id 
                            ? (selectedContact.hostingCredentials || 'DemoSecret123!') 
                            : '••••••••••••'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCredsVisibility(selectedContact.id)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border border-white/5 transition flex items-center justify-center cursor-pointer flex-shrink-0"
                        title={showCredsId === selectedContact.id ? "Ocultar" : "Mostrar credenciales de hosting"}
                      >
                        {showCredsId === selectedContact.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 relative" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked events section with target view link - REAL EVENTS */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">Upcoming Events</h4>

                  {/* TARGETED LINK - View Calendar (navigates via 'push') */}
                  <span 
                    onClick={() => onNavigate('calendar', 'push')}
                    className="text-[10px] text-blue-400 cursor-pointer hover:underline inline-block font-medium font-sans"
                  >
                    View Calendar
                  </span>

                </div>

                <div className="space-y-2">
                  {(() => {
                    const clientEvents = events.filter(e => 
                      (e.linkedContactIds && e.linkedContactIds.includes(selectedContact.id)) || 
                      e.linkedContactId === selectedContact.id
                    );

                    if (clientEvents.length === 0) {
                      return (
                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center text-slate-500 font-sans text-xs italic">
                          No hay eventos reales asignados para este cliente.
                        </div>
                      );
                    }

                    return clientEvents.map(evt => {
                      // format date
                      let day = '28';
                      let monthName = 'Oct';
                      try {
                        const dateParts = evt.date.split('-');
                        if (dateParts.length === 3) {
                          day = dateParts[2];
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          const idx = parseInt(dateParts[1], 10) - 1;
                          if (idx >= 0 && idx < 12) monthName = months[idx];
                        }
                      } catch (e) {}

                      return (
                        <div key={evt.id} className="bg-blue-500/5 border-l-2 border-blue-500 p-3 flex items-center gap-4 rounded-r-xl border border-y-white/5 border-r-white/5">
                          <div className="text-center min-w-[34px]">
                            <p className="font-bold text-blue-400 text-xs leading-none">{day}</p>
                            <p className="text-[8px] uppercase text-slate-550 mt-1">{monthName}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs text-white truncate">{evt.title}</p>
                            <p className="text-[10px] text-slate-550 font-sans">{evt.time} {evt.duration ? `(${evt.duration})` : ''}</p>
                            {evt.meetingUrl && (
                              <a 
                                href={evt.meetingUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[9px] text-blue-400 hover:text-blue-300 block hover:underline truncate mt-1"
                              >
                                Meeting Link ➜
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <p className="text-slate-500 text-xs italic">
              Please select a client contact from the relationship grid to view analytical logs.
            </p>
          </div>
        )}
      </aside>

      {/* Floating Action Button (FAB) at bottom-right */}
      <button 
        id="addContactFab"
        onClick={() => {
          resetFormFields();
          setShowAddModal(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-90 text-white shadow-2xl flex items-center justify-center cursor-pointer transition-all z-40 group border border-blue-400/20"
      >
        <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
        <span className="absolute right-full mr-4 px-3 py-1.5 rounded bg-slate-950 text-slate-200 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10">
          Add New Contact
        </span>
      </button>

      {/* Dynamic Creation Modal for new contacts */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm" onClick={() => { resetFormFields(); setShowAddModal(false); }} />
          <div className="relative bg-[#1e293b]/90 backdrop-blur-3xl border border-white/15 rounded-3xl p-6 shadow-2xl shadow-black/50 max-w-md w-full animate-in zoom-in-95 duration-200 text-slate-300">
            
            <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>{editingContact ? `Editando contacto: ${editingContact.name}` : 'Crear Nuevo Contacto'}</span>
              </h3>
              <button onClick={() => { resetFormFields(); setShowAddModal(false); }} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              {/* Contact Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Liam Foster"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Email Address</label>
                <input 
                  type="text"
                  placeholder="l.foster@lumina.io (Opcional)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Company & Role */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Company</label>
                  <input 
                    type="text"
                    placeholder="e.g. Lumina Digital"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Role</label>
                  <input 
                    type="text"
                    placeholder="e.g. QA Architect"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Status</label>
                  <select 
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Lead">Lead</option>
                    <option value="Client">Client</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Location</label>
                  <input 
                    type="text"
                    placeholder="e.g. London, UK"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Temperature / Color selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-405 uppercase tracking-wider font-extrabold text-violet-400">Temperatura de Venta (Cliente)</label>
                <div className="grid grid-cols-3 gap-2 bg-[#060e20] border border-white/10 p-2 rounded-xl">
                  {[
                    { val: 'blue', label: '❄️ Frío', desc: 'Frío / Captura inicial', activeStyle: 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.15)]' },
                    { val: 'yellow', label: '⚡ Templado', desc: 'Templado / Interés medio', activeStyle: 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]' },
                    { val: 'red', label: '🔥 Caliente', desc: 'Caliente / Compra inminente', activeStyle: 'bg-rose-500/20 border-rose-500 text-rose-450 shadow-[0_0_12px_rgba(244,63,94,0.15)]' }
                  ].map(item => {
                    const isSelected = newColor === item.val || (!newColor && item.val === 'blue');
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setNewColor(item.val)}
                        className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          isSelected 
                            ? item.activeStyle
                            : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-300'
                        }`}
                        title={item.desc}
                      >
                        <span>{item.label}</span>
                        <span className="text-[7.5px] text-slate-500 uppercase font-normal font-mono">
                          {item.val === 'blue' ? 'Frío' : item.val === 'yellow' ? 'Templado' : 'Caliente'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Website / Client Web */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Client Website (Web)</label>
                <input 
                  type="text"
                  placeholder="e.g. store.cl, www.clientweb.com"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Github Repository */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">GitHub Repo (o ruta)</label>
                <input 
                  type="text"
                  placeholder="e.g. github.com/client/repo"
                  value={newGithubRepo}
                  onChange={(e) => setNewGithubRepo(e.target.value)}
                  className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Hosting credentials */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Credenciales Hosting</label>
                <input 
                  type="text"
                  placeholder="e.g. host: cpanel9.hosting.com | u: user | p: pass123"
                  value={newHostingCredentials}
                  onChange={(e) => setNewHostingCredentials(e.target.value)}
                  className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Phone, LinkedIn & Image URL */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Teléfono / Phone</label>
                  <input 
                    type="text"
                    placeholder="e.g. +56 9 1234 5678"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">LinkedIn URL/User</label>
                  <input 
                    type="text"
                    placeholder="e.g. linkedin.com/in/user"
                    value={newLinkedin}
                    onChange={(e) => setNewLinkedin(e.target.value)}
                    className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Imagen / Avatar de Cliente (URL o Archivo)</label>
                <div className="flex items-center gap-3">
                  {newAvatarUrl && (
                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                      <img 
                        src={newAvatarUrl} 
                        alt="Previsualización" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=40px&q=80";
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 flex gap-1.5 min-w-0">
                    <input 
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newAvatarUrl}
                      onChange={(e) => setNewAvatarUrl(e.target.value)}
                      className="flex-1 bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 min-w-0"
                    />
                    <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl px-3 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer select-none font-semibold transition shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert("La imagen es demasiado grande. Por favor selecciona una de menos de 5MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (reader.result && typeof reader.result === 'string') {
                                setNewAvatarUrl(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                {newAvatarUrl && newAvatarUrl.startsWith('data:image/') && (
                  <span className="text-[9px] font-mono text-emerald-400 block mt-0.5">✓ Foto cargada desde tu dispositivo.</span>
                )}
              </div>

              {/* Select assigned user */}
              <div className="space-y-1 animate-fade-in">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Assign Panel User</label>
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
                            setNewAssignedUserEmail(quickEmail.trim());
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
                    value={newAssignedUserEmail}
                    onChange={(e) => setNewAssignedUserEmail(e.target.value)}
                    className="w-full bg-[#060e20] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- No Assignment --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => { resetFormFields(); setShowAddModal(false); }}
                  className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {editingContact ? 'Guardar Cambios' : 'Guardar Contacto'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE MEETING MODAL - ADMIN EXCLUSIVE */}
      {showScheduleModal && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0a0a14] border border-violet-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-violet-950/20 max-h-[90vh] flex flex-col">
            {/* Header banner cover */}
            <div className="bg-gradient-to-tr from-violet-600/20 via-violet-950/20 to-slate-950/10 p-6 border-b border-white/5 relative">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-400" />
                <span>Agendar Cita Presencial</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Crea una cita presencial que se sincronizará automáticamente con el Calendario de la empresa.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                }}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-955/60 border border-white/5 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleConfirmScheduleMeeting} className="p-6 overflow-y-auto space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                  Asunto / Título de la Cita
                </label>
                <input
                  type="text"
                  required
                  value={scheduleTitle}
                  onChange={e => setScheduleTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600"
                  placeholder="Ej. Reunión Semanal de Consultoría"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                    Fecha de la reunión
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                    Hora
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                  Responsable Asignado
                </label>
                <select
                  value={scheduleAssignee}
                  onChange={e => setScheduleAssignee(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all cursor-pointer font-sans"
                >
                  <option value="unassigned">👥 Sin asignar / General</option>
                  {usersList.map(com => (
                    <option key={com.id} value={com.email}>{com.name} ({com.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                  Notas / Dirección o Indicaciones
                </label>
                <textarea
                  rows={3}
                  value={scheduleDesc}
                  onChange={e => setScheduleDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition-all resize-none placeholder:text-slate-600"
                  placeholder="Instrucciones sobre la visita, dirección del local, temas a tratar..."
                  required
                />
              </div>

              {/* Action commands footer */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5.5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition duration-240 cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                >
                  Agendar Cita Presencial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
