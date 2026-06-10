import React, { useState } from 'react';
import { Note } from '../types';
import { 
  FolderOpen, 
  Tag, 
  Plus, 
  Search, 
  MoreVertical, 
  Bookmark, 
  ArrowLeft, 
  Bold, 
  Italic, 
  List, 
  Code, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Eye, 
  Users, 
  Sparkles,
  X,
  FileText,
  Archive,
  Trash2,
  CheckCircle2,
  Circle
} from 'lucide-react';

interface NotesScreenProps {
  notes: Note[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote?: (id: string) => void;
  currentUser?: { id: string | null; email: string; name: string } | null;
}

function renderNoteDate(updatedAt: string) {
  if (!updatedAt) return '';
  const parsed = Date.parse(updatedAt);
  if (isNaN(parsed)) {
    return updatedAt; // already-formatted string e.g., 'Oct 12, 2023' or 'Yesterday'
  }
  const date = new Date(parsed);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Hace un momento';
  } else if (diffMins < 60) {
    return `Hace ${diffMins} min`;
  } else if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  } else if (diffDays === 1) {
    return 'Ayer';
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

export default function NotesScreen({ notes, onAddNote, onUpdateNote, onDeleteNote, currentUser }: NotesScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Notes');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Archive tracker state linked to localStorage
  const [archivedNoteIds, setArchivedNoteIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('archived_notes_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleArchiveNote = (id: string) => {
    const isCurrentlyArchived = archivedNoteIds.includes(id);
    const updated = isCurrentlyArchived 
      ? archivedNoteIds.filter(item => item !== id)
      : [...archivedNoteIds, id];
    setArchivedNoteIds(updated);
    localStorage.setItem('archived_notes_ids', JSON.stringify(updated));
    
    const toast = document.getElementById('toast-msg');
    if (toast) {
      toast.innerText = isCurrentlyArchived ? "Nota desarchivada exitosamente." : "Nota archivada exitosamente.";
      toast.classList.remove('opacity-0');
      setTimeout(() => toast.classList.add('opacity-0'), 2500);
    }
  };

  // Editor State
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorCategory, setEditorCategory] = useState<Note['category']>('Project Specs');
  const [editorStatus, setEditorStatus] = useState<Note['status']>('pending');

  // Filter notes into active and archived subsets
  const nonArchivedNotes = notes.filter(n => !archivedNoteIds.includes(n.id));
  const archivedNotes = notes.filter(n => archivedNoteIds.includes(n.id));

  // Counts calculate
  const totalNotesCount = nonArchivedNotes.length;
  const projectSpecsCount = nonArchivedNotes.filter(n => n.category === 'Project Specs').length;
  const clientFeedbackCount = nonArchivedNotes.filter(n => n.category === 'Client Feedback').length;
  const devTipsCount = nonArchivedNotes.filter(n => n.category === 'Dev Tips' || n.category === 'Infrastructure').length;
  const archivedNotesCount = archivedNotes.length;

  const handleNoteCardClick = (note: Note) => {
    setEditingNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorCategory(note.category);
    setEditorStatus(note.status || 'pending');
    setIsCreatingNew(false);
  };

  const handleCreateNewClick = () => {
    setEditingNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorCategory('Project Specs');
    setEditorStatus('pending');
    setIsCreatingNew(true);
  };

  const handlePublishNote = () => {
    if (!editorTitle.trim()) {
      const toast = document.getElementById('toast-msg');
      if (toast) {
        toast.innerText = "Por favor ingrese un título para la nota.";
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 2500);
      } else {
        alert("Por favor ingrese un título para la nota.");
      }
      return;
    }

    if (isCreatingNew) {
      const newNote: Note = {
        id: 'n_' + Date.now().toString().slice(-6),
        title: editorTitle,
        content: editorContent || 'Contenido vacío.',
        category: editorCategory,
        status: editorStatus,
        updatedAt: new Date().toISOString(),
        authorName: currentUser?.name || 'Alex Rivera',
        authorAvatar: currentUser?.email 
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3b82f6&color=fff`
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop&crop=face'
      };
      onAddNote(newNote);
      
      const toast = document.getElementById('toast-msg');
      if (toast) {
        toast.innerText = `Nota publicada exitosamente: ID ${newNote.id}`;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 3000);
      }
    } else if (editingNote) {
      const updated: Note = {
        ...editingNote,
        title: editorTitle,
        content: editorContent,
        category: editorCategory,
        status: editorStatus,
        updatedAt: new Date().toISOString()
      };
      onUpdateNote(updated);

      const toast = document.getElementById('toast-msg');
      if (toast) {
        toast.innerText = "Nota actualizada exitosamente.";
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 3000);
      }
    }

    // Reset editor
    setEditingNote(null);
    setIsCreatingNew(false);
  };

  // Filter notes based on category and search query
  const filteredNotes = notes.filter(note => {
    const isArchived = archivedNoteIds.includes(note.id);
    if (selectedCategory === 'Archived Notes') {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
    }

    const matchesCategory = selectedCategory === 'All Notes' || 
      selectedCategory === 'Archived Notes' ||
      (selectedCategory === 'Project Specs' && note.category === 'Project Specs') ||
      (selectedCategory === 'Client Feedback' && note.category === 'Client Feedback') ||
      (selectedCategory === 'Dev Tips' && (note.category === 'Dev Tips' || note.category === 'Infrastructure' || note.category === 'General'));

    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-80px)] bg-transparent text-slate-100 relative">
      
      {/* Tags/Category Left Mini-Sidebar (250px) */}
      <nav className="w-64 border-r border-white/10 p-6 flex flex-col bg-slate-950/25 select-none animate-fade-in">
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-sans font-bold text-sm text-slate-200 tracking-wide uppercase opacity-90">Categories</h3>
          <button 
            onClick={handleCreateNewClick}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-blue-400 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Group */}
        <div className="space-y-1.5">
          <button 
            onClick={() => setSelectedCategory('All Notes')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              selectedCategory === 'All Notes'
                ? 'bg-blue-500/10 text-blue-400 font-semibold border-l-2 border-blue-500'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <span className="text-xs">All Notes</span>
            <span className="ml-auto text-[10px] bg-slate-900 border border-white/5 px-2 py-0.5 rounded text-slate-500 font-mono">
              {totalNotesCount}
            </span>
          </button>

          <button 
            onClick={() => setSelectedCategory('Project Specs')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              selectedCategory === 'Project Specs'
                ? 'bg-emerald-500/10 text-emerald-400 font-semibold border-l-2 border-emerald-500'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4 text-emerald-400" />
            <span className="text-xs">Project Specs</span>
            <span className="ml-auto text-[10px] bg-slate-900 border border-white/5 px-2 py-0.5 rounded text-slate-500 font-mono">
              {projectSpecsCount}
            </span>
          </button>

          <button 
            onClick={() => setSelectedCategory('Client Feedback')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              selectedCategory === 'Client Feedback'
                ? 'bg-purple-500/10 text-purple-400 font-semibold border-l-2 border-purple-500'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4 text-purple-400" />
            <span className="text-xs">Client Feedback</span>
            <span className="ml-auto text-[10px] bg-slate-900 border border-white/5 px-2 py-0.5 rounded text-slate-500 font-mono">
              {clientFeedbackCount}
            </span>
          </button>

          <button 
            onClick={() => setSelectedCategory('Dev Tips')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              selectedCategory === 'Dev Tips'
                ? 'bg-red-500/10 text-red-400 font-semibold border-l-2 border-red-500'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4 text-red-500" />
            <span className="text-xs">Dev Specs & Tips</span>
            <span className="ml-auto text-[10px] bg-slate-900 border border-white/5 px-2 py-0.5 rounded text-slate-500 font-mono">
              {devTipsCount}
            </span>
          </button>

          <button 
            onClick={() => setSelectedCategory('Archived Notes')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              selectedCategory === 'Archived Notes'
                ? 'bg-amber-500/10 text-amber-400 font-semibold border-l-2 border-amber-500'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Archive className="w-4 h-4 text-amber-500" />
            <span className="text-xs">Notas Archivadas</span>
            <span className="ml-auto text-[10px] bg-slate-900 border border-white/5 px-2 py-0.5 rounded text-slate-500 font-mono">
              {archivedNotesCount}
            </span>
          </button>
        </div>

      </nav>

      {/* Main Content Area: Notes Grid or Full Rich Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#060e20]/20">
        
        {/* Editor Is Open View */}
        {(editingNote || isCreatingNew) ? (
          
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-2xl p-8 flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200 overflow-y-auto">
            
            {/* Editor Action Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setEditingNote(null); setIsCreatingNew(false); }}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight" id="editor-title">
                    {isCreatingNew ? 'New Internal Note' : 'Edit Note Content'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Drafting in <span className="text-blue-400 font-semibold">#{editorCategory}</span> • Auto Saving Local Draft
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setEditingNote(null); setIsCreatingNew(false); }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-white/5 font-medium text-xs transition active:scale-95"
                >
                  Save as Draft
                </button>
                <button 
                  onClick={handlePublishNote}
                  className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-blue-500/10 active:scale-95 transition cursor-pointer"
                >
                  Publish Note
                </button>
              </div>
            </div>

            {/* Split Composition Layout */}
            <div className="flex-1 flex gap-8 max-w-6xl mx-auto w-full items-start">
              
              {/* Slate text layout comopsing container */}
              <div className="flex-1 space-y-6 flex flex-col h-full min-w-0">
                
                {/* Simulated Text formatting toolbar specs */}
                <div className="flex items-center gap-1.5 p-2 bg-slate-900 rounded-xl border border-white/5 shadow-inner">
                  <button type="button" className="p-2 rounded hover:text-white text-slate-400 transition" title="Negrita"><Bold className="w-4 h-4" /></button>
                  <button type="button" className="p-2 rounded hover:text-white text-slate-400 transition" title="Cursiva"><Italic className="w-4 h-4" /></button>
                  <button type="button" className="p-2 rounded hover:text-white text-slate-400 transition" title="Lista Viñetas"><List className="w-4 h-4" /></button>
                  <div className="w-[1px] h-6 bg-white/10 mx-1.5" />
                  <button type="button" className="p-2 rounded hover:text-white text-slate-400 transition" title="Código"><Code className="w-4 h-4" /></button>
                  <button type="button" className="p-2 rounded hover:text-white text-slate-400 transition" title="Imagen"><ImageIcon className="w-4 h-4" /></button>
                  <button type="button" className="p-2 rounded hover:text-white text-slate-400 transition" title="Enlace"><LinkIcon className="w-4 h-4" /></button>
                </div>

                {/* Focus Title Input */}
                <input 
                  type="text"
                  placeholder="Note Title"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="bg-transparent border-none text-[36px] font-bold text-white placeholder:opacity-20 focus:ring-0 focus:outline-none p-0 outline-none w-full"
                />

                {/* Content input */}
                <textarea 
                  rows={14}
                  placeholder="Comienza a redactar la documentación técnica del sprint aquí..."
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 rounded-2xl p-6 text-sm text-slate-300 leading-relaxed focus:outline-none focus:border-blue-500/40 focus:ring-0 resize-none flex-1 outline-none"
                />

              </div>

              {/* Sidebar editing configuration elements */}
              <aside className="w-72 space-y-6 flex-shrink-0 hidden md:block">
                
                {/* Properties Selector Panel */}
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
                  <h4 className="font-sans font-bold text-xs text-white uppercase tracking-wider">Properties</h4>
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans">Category</span>
                      <select 
                        value={editorCategory}
                        onChange={(e) => setEditorCategory(e.target.value as any)}
                        className="bg-slate-900 border border-white/10 text-xs rounded-lg py-1 pl-2.5 pr-8 text-slate-200 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Project Specs">Project Specs</option>
                        <option value="Client Feedback">Client Feedback</option>
                        <option value="Dev Tips">Dev Tips</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans">Status</span>
                      <select 
                        value={editorStatus || 'pending'}
                        onChange={(e) => setEditorStatus(e.target.value as any)}
                        className="bg-slate-900 border border-white/10 text-xs rounded-lg py-1 pl-2.5 pr-8 text-slate-200 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="done">✓ Done</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans">Visibility</span>
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Eye className="w-3.5 h-3.5" /> Private Team
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Collaborators list mock */}
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
                  <h4 className="font-sans font-bold text-xs text-white uppercase tracking-wider">Collaborators</h4>
                  
                  <div className="flex -space-x-2 pb-1">
                    <img className="h-8 w-8 rounded-full border-2 border-slate-950 object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face" alt="Avatar User" />
                    <img className="h-8 w-8 rounded-full border-2 border-slate-950 object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" alt="Avatar User" />
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold border-2 border-slate-950 font-sans">
                      +3
                    </div>
                  </div>

                  <button 
                    onClick={() => alert("Asignando nuevos colaboradores al canal.")}
                    className="w-full py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-400 hover:text-white transition duration-200"
                  >
                    Invite Others
                  </button>
                </div>

                {/* Block quotes block info */}
                <div className="p-5 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent rounded-2xl border border-blue-500/20 shadow-md">
                  <p className="text-[11px] text-blue-400/85 leading-relaxed italic">
                    "Documentation is a love letter that you write to your future self." — Damian Conway
                  </p>
                </div>

              </aside>

            </div>

          </div>

        ) : (
          
          <div className="p-8 flex-1 overflow-y-auto">
            
            {/* Top Bar Searching Grid */}
            <div className="flex items-center justify-between mb-8">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Search across all notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans placeholder:text-slate-600 focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Summary Label showing categories state */}
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">
                Sorted by: {selectedCategory}
              </span>
            </div>

            {/* Composing workspace items grid representation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              
              {/* Composing Dashed workspace card block trigger */}
              <button 
                onClick={handleCreateNewClick}
                className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/10 hover:border-blue-400/50 hover:bg-white/[0.02] p-6 text-slate-400 hover:text-blue-400 transition-all cursor-pointer h-56 group"
              >
                <div className="h-11 w-11 rounded-full bg-slate-900 flex items-center justify-center border border-white/5 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-semibold text-xs tracking-wide">Create New Note</span>
              </button>

              {/* Note card blocks templates mapping */}
              {filteredNotes.map((note) => {
                let badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/10";
                if (note.category === "General") badgeColor = "bg-slate-500/10 text-slate-400 border-slate-500/10";
                else if (note.category === "Dev Tips") badgeColor = "bg-red-500/10 text-red-400 border-red-500/10";
                else if (note.category === "Project Specs") badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/10";
                else if (note.category === "Client Feedback") badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/10";
                else if (note.category === "Infrastructure") badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/10";

                return (
                  <div 
                    key={note.id}
                    onClick={() => handleNoteCardClick(note)}
                    className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col justify-between hover:-translate-y-1 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-400/5 cursor-pointer group transition-all duration-200 h-56"
                  >
                    <div>
                      {/* Header block bookmark classification tag */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded border text-[8px] font-mono uppercase tracking-wider ${badgeColor}`}>
                            {note.category}
                          </span>
                          
                          {note.status === 'done' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateNote({ ...note, status: 'pending' });
                              }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer transition select-none"
                              title="Click to mark as pending"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              Done
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateNote({ ...note, status: 'done' });
                              }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono text-slate-400 bg-slate-500/10 border border-white/5 hover:border-blue-400/30 hover:text-blue-400 cursor-pointer transition select-none"
                              title="Click to mark as done"
                            >
                              <Circle className="w-2.5 h-2.5 text-slate-500" />
                              Pending
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 opacity-85 md:opacity-40 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleArchiveNote(note.id);
                            }}
                            className="p-1 bg-slate-900 border border-white/10 hover:border-amber-400/30 text-slate-400 hover:text-amber-400 rounded transition cursor-pointer"
                            title={archivedNoteIds.includes(note.id) ? "Desarchivar Nota" : "Archivar Nota"}
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la nota: "${note.title}"?`)) {
                                if (onDeleteNote) onDeleteNote(note.id);
                              }
                            }}
                            className="p-1 bg-slate-900 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded transition cursor-pointer"
                            title="Eliminar Nota"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(note.id);
                              const toast = document.getElementById('toast-msg');
                              if (toast) {
                                toast.innerText = `ID Copiada: ${note.id}`;
                                toast.classList.remove('opacity-0');
                                setTimeout(() => toast.classList.add('opacity-0'), 2500);
                              }
                            }}
                            className="text-[9px] font-mono hover:text-blue-400 bg-white/10 hover:bg-blue-500/20 px-1.5 py-0.5 rounded text-slate-300 border border-white/5 transition cursor-pointer"
                            title="Copiar ID de Nota"
                          >
                            Copy ID
                          </button>
                          <Bookmark className={`w-4 h-4 ${
                            note.category === 'Client Feedback' ? 'text-purple-400' : note.category === 'Project Specs' ? 'text-emerald-400' : 'text-blue-400'
                          }`} />
                        </div>
                      </div>

                      {/* Title & snippet block */}
                      <h4 className={`font-semibold text-xs text-white leading-snug group-hover:text-blue-400 transition-colors mb-2 line-clamp-1 ${
                        note.status === 'done' ? 'line-through text-slate-500 decoration-emerald-500/50' : ''
                      }`}>
                        {note.title}
                      </h4>
                      <p className={`text-slate-400 text-xs lines-limiting line-clamp-3 ${
                        note.status === 'done' ? 'text-slate-500/80' : ''
                      }`}>
                        {note.content}
                      </p>
                    </div>

                    {/* Footer note details user profile logs */}
                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {note.authorAvatar ? (
                          <img 
                            alt="Avatar" 
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full object-cover"
                            src={note.authorAvatar}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-300">
                            {note.authorName?.charAt(0) || 'A'}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500 font-sans">{note.authorName || 'Alex'}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono tracking-tight">{renderNoteDate(note.updatedAt)}</span>
                    </div>

                  </div>
                );
              })}

            </div>

            {filteredNotes.length === 0 && (
              <div className="text-center p-12 text-slate-500 italic text-xs">
                No se encontraron notas en esta categoría. Pruebe a crear una nueva con el botón de añadir.
              </div>
            )}

          </div>

        )}

      </div>

    </div>
  );
}
