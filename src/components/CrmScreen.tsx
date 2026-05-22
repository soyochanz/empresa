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
  Upload
} from 'lucide-react';

interface CrmScreenProps {
  contacts: ClientContact[];
  events?: CalendarEvent[];
  onAddContact: (contact: ClientContact) => void;
  onUpdateContact?: (contact: ClientContact) => void;
  onDeleteContact?: (id: string) => void;
  onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
  usersList?: PanelUser[];
}

export default function CrmScreen({ 
  contacts, 
  events = [], 
  onAddContact, 
  onUpdateContact, 
  onDeleteContact,
  onNavigate,
  usersList = REGISTERED_USERS
}: CrmScreenProps) {
  const [selectedContactId, setSelectedContactId] = useState<string>('c2'); // default to Marcus Chen
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Form states
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

  // Eye toggle visibility matching target contact ID
  const [showCredsId, setShowCredsId] = useState<string | null>(null);

  const toggleCredsVisibility = (id: string) => {
    setShowCredsId(prev => prev === id ? null : id);
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId) || contacts[0];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const initials = newName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const matchedUser = usersList.find(u => u.email === newAssignedUserEmail);

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
      initials: initials || 'N'
    };

    onAddContact(generatedContact);
    setSelectedContactId(generatedContact.id);
    setShowAddModal(false);

    // reset forms
    setNewName('');
    setNewEmail('');
    setNewCompany('');
    setNewRole('');
    setNewWebsite('');
    setNewGithubRepo('');
    setNewHostingCredentials('');
    setNewPhone('');
    setNewLinkedin('');
    setNewAvatarUrl('');
    setNewAssignedUserEmail('');

    const toast = document.getElementById('toast-msg');
    if (toast) {
      toast.innerText = `Cliente registrado exitosamente: ${generatedContact.name}`;
      toast.classList.remove('opacity-0');
      setTimeout(() => toast.classList.add('opacity-0'), 3000);
    }
  };

  // Filter contacts by search query & archive status
  const filteredContacts = contacts.filter(c => {
    const isArchived = archivedContactIds.includes(c.id);
    if (crmFilter === 'active' && isArchived) return false;
    if (crmFilter === 'archived' && !isArchived) return false;

    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
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

                  return (
                    <tr 
                      key={contact.id}
                      onClick={() => setSelectedContactId(contact.id)}
                      className={`hover:bg-white/5 cursor-pointer transition-all duration-150 group ${
                        isSelected ? 'border-l-4 border-blue-500 bg-blue-600/5' : 'border-l-4 border-transparent'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-450'
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
                            <p className="font-semibold text-xs text-white">{contact.name}</p>
                            <p className="text-[10px] text-slate-500">{contact.email}</p>
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
            <div className="relative h-32 bg-gradient-to-tr from-blue-500/20 to-purple-500/10 border-b border-white/5">
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
                  onClick={() => alert(`Editando contacto: ${selectedContact.name}`)}
                  className="p-2 bg-slate-950/60 hover:bg-slate-900 text-white rounded-xl border border-white/5 transition cursor-pointer"
                  title="Edit Contact"
                >
                  <Plus className="w-4 h-4 text-slate-300" />
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

                  <div className="flex justify-center gap-1.5 mt-3">
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {selectedContact.status}
                    </span>
                    {selectedContact.priority && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        High Priority
                      </span>
                    )}
                  </div>
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
                    className="bg-slate-900 border border-white/10 text-[10px] rounded-lg py-1 px-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Unassigned --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                    ))}
                  </select>
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
        onClick={() => setShowAddModal(true)}
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
          <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#1e293b]/90 backdrop-blur-3xl border border-white/15 rounded-3xl p-6 shadow-2xl shadow-black/50 max-w-md w-full animate-in zoom-in-95 duration-200 text-slate-300">
            
            <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>Add New Contact</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5">
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
                  type="email"
                  required
                  placeholder="l.foster@lumina.io"
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
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Assign Panel User</label>
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
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all"
                >
                  Save Contact
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
