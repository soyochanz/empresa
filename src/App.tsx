import { useState, useEffect } from 'react';
import { Screen, ClientContact, CalendarEvent, Note, Activity, ComercialAccount, ComercialLead, ColdCallingLead } from './types';
import { 
  initialContacts, 
  initialEvents, 
  initialNotes, 
  initialActivities,
  REGISTERED_USERS,
  PanelUser
} from './mockData';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import LandingScreen from './components/LandingScreen';
import DashboardScreen from './components/DashboardScreen';
import CalendarScreen from './components/CalendarScreen';
import CrmScreen from './components/CrmScreen';
import NotesScreen from './components/NotesScreen';
import ProjectsScreen from './components/ProjectsScreen';
import ContactosScreen from './components/ContactosScreen';
import FinanceScreen from './components/FinanceScreen';
import CitasScreen from './components/CitasScreen';
import ContractsScreen from './components/ContractsScreen';
import ComercialesAccesoScreen from './components/ComercialesAccesoScreen';
import ComercialesPanelScreen from './components/ComercialesPanelScreen';
import ComercialesAdminScreen from './components/ComercialesAdminScreen';
import ColdCallingScreen from './components/ColdCallingScreen';
import { motion, AnimatePresence } from 'motion/react';
import { db, supabase, checkSupabaseConnection, seedSupabaseDatabase, ConnectionStatus } from './supabaseClient';
import SupabaseInfoModal from './components/SupabaseInfoModal';
import { Bell, X, Calendar as CalendarAtom, Check } from 'lucide-react';

export default function App() {
  // Screens state
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    // Session state identifier to distinguish a fresh tab load from a page refresh
    const isSessionActive = sessionStorage.getItem('agency_session_active');
    if (!isSessionActive) {
      sessionStorage.setItem('agency_session_active', 'true');
      localStorage.setItem('agency_current_screen', 'landing');
      return 'landing';
    }
    const saved = localStorage.getItem('agency_current_screen');
    return (saved as Screen) || 'landing';
  });
  const [transitionType, setTransitionType] = useState<'none' | 'push' | 'push_back'>('none');

  // Track the current screen for route-refresh recovery
  useEffect(() => {
    localStorage.setItem('agency_current_screen', currentScreen);
  }, [currentScreen]);

  // Supabase connection and state synchronization status
  const [supabaseStatus, setSupabaseStatus] = useState<ConnectionStatus & { loading: boolean }>({
    connected: false,
    tablesExist: false,
    loading: true,
    error: undefined
  });
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<{ id: string | null; email: string; name: string } | null>(() => {
    const saved = localStorage.getItem('agency_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Persistence Engine Database State (with standard fallback to localStorage/mockData)
  const [contacts, setContacts] = useState<ClientContact[]>(() => {
    const saved = localStorage.getItem('agency_contacts');
    return saved ? JSON.parse(saved) : initialContacts;
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('agency_events');
    const parsed = saved ? JSON.parse(saved) : initialEvents;
    // Auto-migrate old October 2023 static dates to today's current month/year
    return parsed.map((e: any) => {
      if (e.date && e.date.startsWith('201') || e.date && e.date.startsWith('202')) {
        const parts = e.date.split('-');
        if (parts[0] !== String(new Date().getFullYear()) || parts[1] !== String(new Date().getMonth() + 1).padStart(2, '0')) {
          const dayPart = parts[2] || '12';
          const d = new Date();
          const padM = String(d.getMonth() + 1).padStart(2, '0');
          return {
            ...e,
            date: `${d.getFullYear()}-${padM}-${dayPart}`
          };
        }
      }
      return e;
    });
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('agency_notes');
    if (saved) {
      try {
        const parsed: Note[] = JSON.parse(saved);
        return parsed.map(n => {
          if (n.updatedAt === 'Just now' || !n.updatedAt) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - 3);
            return { ...n, updatedAt: daysAgo.toISOString() };
          }
          return n;
        });
      } catch (err) {
        return initialNotes;
      }
    }
    return initialNotes;
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('agency_activities');
    return saved ? JSON.parse(saved) : initialActivities;
  });

  // Dynamic users state
  const [usersList, setUsersList] = useState<PanelUser[]>(REGISTERED_USERS);

  // Comerciales accounts and logged-in state
  const [comercialesList, setComercialesList] = useState<ComercialAccount[]>(() => {
    const saved = localStorage.getItem('agency_comerciales_accounts');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'com_demo', name: 'Alfonso Sales', email: 'vendedor@agency.com', password: 'password123', createdAt: new Date().toISOString(), phone: '+34 622 111 000' }
    ];
  });

  const [leadsList, setLeadsList] = useState<ComercialLead[]>(() => {
    const saved = localStorage.getItem('agency_comerciales_leads');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'l1', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Beatriz Soler', company: 'Soler Soluciones SL', email: 'beatriz@solersol.es', phone: '611222333', status: 'Negociación', value: 8500, notes: 'Interesada en el desarrollo de la web corporativa a medida con Next.js y panel headless CRM.', createdAt: new Date().toISOString() },
      { id: 'l2', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Javier Castillo', company: 'Castillo Logistics', email: 'castillo@logistics.com', phone: '655000444', status: 'Ganado', value: 12400, notes: 'Proyecto cerrado para el sistema ERP de tracking vehicular en tiempo real.', createdAt: new Date().toISOString() },
      { id: 'l3', comercialId: 'com_demo', comercialName: 'Alfonso Sales', name: 'Marta Rivas', company: 'AeroGroup Inc', email: 'marta@aerogroup.org', phone: '677999888', status: 'Pendiente', value: 3500, notes: 'Solicitó presupuesto para auditoría técnica de seguridad en sus servicios AWS.', createdAt: new Date().toISOString() }
    ];
  });

  const [coldLeads, setColdLeads] = useState<ColdCallingLead[]>(() => {
    const saved = localStorage.getItem('agency_cold_calling_leads');
    if (saved) return JSON.parse(saved);
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return [
      {
        id: 'cold_1',
        businessName: 'Clínica Dental DentalDent',
        contactPerson: 'Dr. Alejandro Sanz (Dueño)',
        phone: '+34 611 223 344',
        callDate: todayStr,
        contacted: 'Sí',
        isOwner: 'Sí',
        answered: 'Sí',
        temperature: 'Caliente',
        callbackScheduled: 'Llamar más tarde',
        callbackDate: todayStr,
        callbackTime: '16:30',
        notes: 'Hablé directamente con el dueño Alejandro. Está abriendo su segunda clínica dental en Madrid y le urge un diseño web corporativo y automatización de citas por WhatsApp. Rellamar hoy para cerrar presupuesto.',
        assignedToEmail: 'vendedor@agency.com',
        assignedToName: 'Alfonso Sales',
        archived: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cold_2',
        businessName: 'Restaurante GastroGourmet',
        contactPerson: 'Marta Rivas (Gerente)',
        phone: '+34 655 444 333',
        callDate: todayStr,
        contacted: 'Sí',
        isOwner: 'No',
        answered: 'Sí',
        temperature: 'Templado',
        callbackScheduled: 'Llamar más tarde',
        callbackDate: tomorrowStr,
        callbackTime: '11:00',
        notes: 'Hablé con Marta la gerente de sala. El dueño no estaba. Le interesó la carta digital con código QR interactivo y el pasador de pedidos. Me pidió enviarle un dossier por WhatsApp para verlo mañana con el dueño Alfonso.',
        assignedToEmail: 'vendedor@agency.com',
        assignedToName: 'Alfonso Sales',
        archived: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cold_3',
        businessName: 'Talleres Mecánicos CarsPro',
        contactPerson: 'Sin especificar',
        phone: '+34 699 888 777',
        callDate: todayStr,
        contacted: 'No',
        isOwner: 'No',
        answered: 'No',
        temperature: 'Frío',
        callbackScheduled: 'No',
        notes: 'Llamada no atendida en el primer barrido de frío. Probar de nuevo en diferente horario a ver si descolgan.',
        assignedToEmail: 'unassigned',
        assignedToName: 'Sin asignar',
        archived: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cold_4',
        businessName: 'Gimnasio FitPulse Club',
        contactPerson: 'Carlos Gómez (Dueño)',
        phone: '+34 644 123 456',
        callDate: todayStr,
        contacted: 'Sí',
        isOwner: 'Sí',
        answered: 'Sí',
        temperature: 'Caliente',
        callbackScheduled: 'Sí',
        notes: 'Cargado y contactado hoy mismo. Carlos está entusiasmado con implantar una app móvil de reservas. Agendada reunión presencial para la semana que viene.',
        assignedToEmail: 'vendedor@agency.com',
        assignedToName: 'Alfonso Sales',
        archived: false,
        createdAt: new Date().toISOString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('agency_cold_calling_leads', JSON.stringify(coldLeads));
  }, [coldLeads]);

  const [currentComercial, setCurrentComercial] = useState<ComercialAccount | null>(() => {
    const saved = localStorage.getItem('agency_current_comercial');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('agency_comerciales_accounts', JSON.stringify(comercialesList));
  }, [comercialesList]);

  useEffect(() => {
    localStorage.setItem('agency_comerciales_leads', JSON.stringify(leadsList));
  }, [leadsList]);

  useEffect(() => {
    if (currentComercial) {
      localStorage.setItem('agency_current_comercial', JSON.stringify(currentComercial));
    } else {
      localStorage.removeItem('agency_current_comercial');
    }
  }, [currentComercial]);

  // Notifications states
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('agency_read_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('agency_read_notifications', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  const mergeUsers = (dbProfiles: any[], activeUser: any) => {
    const list: PanelUser[] = [];
    if (activeUser) {
      list.push({
        id: activeUser.id || 'usr_current',
        name: activeUser.name,
        email: activeUser.email
      });
    }

    if (dbProfiles && dbProfiles.length > 0) {
      dbProfiles.forEach(prof => {
        const exists = list.some(u => u.email.toLowerCase() === prof.email.toLowerCase());
        if (!exists) {
          list.push({
            id: prof.id,
            name: prof.name,
            email: prof.email
          });
        }
      });
    }

    REGISTERED_USERS.forEach(staticUser => {
      const exists = list.some(u => u.email.toLowerCase() === staticUser.email.toLowerCase());
      if (!exists) {
        list.push(staticUser);
      }
    });

    return list;
  };

  const fetchAndSetProfiles = async (activeUser?: any) => {
    let localProfiles: any[] = [];
    const saved = localStorage.getItem('agency_profiles');
    if (saved) {
      try { localProfiles = JSON.parse(saved); } catch (err) {}
    }

    try {
      const dbProfiles = await db.getProfiles();
      const combined = [...dbProfiles];
      localProfiles.forEach(lp => {
        if (!combined.some(u => u.email.toLowerCase() === lp.email.toLowerCase())) {
          combined.push(lp);
        }
      });
      const merged = mergeUsers(combined, activeUser || currentUser);
      setUsersList(merged);
    } catch (e) {
      console.warn('Could not fetch profiles from Supabase, using local fallback:', e);
      const merged = mergeUsers(localProfiles, activeUser || currentUser);
      setUsersList(merged);
    }
  };

  const handleUpsertProfile = async (profileData: { name: string; email: string }) => {
    const id = 'usr_' + Date.now().toString();
    try {
      await db.upsertProfile({ id, name: profileData.name, email: profileData.email });
    } catch (e) {
      console.warn('Could not upsert profile to Supabase, saving locally:', e);
    }

    let localProfiles: any[] = [];
    const saved = localStorage.getItem('agency_profiles');
    if (saved) {
      try { localProfiles = JSON.parse(saved); } catch (err) {}
    }
    if (!localProfiles.some(u => u.email.toLowerCase() === profileData.email.toLowerCase())) {
      localProfiles.push({ id, name: profileData.name, email: profileData.email });
      localStorage.setItem('agency_profiles', JSON.stringify(localProfiles));
    }
    
    await fetchAndSetProfiles();
  };

  // Sync users list based on session state changes and register current profile
  useEffect(() => {
    if (currentUser) {
      db.upsertProfile({ id: currentUser.id || 'usr_current', name: currentUser.name, email: currentUser.email }).then(() => {
        fetchAndSetProfiles();
      });
    } else {
      fetchAndSetProfiles();
    }
  }, [currentUser]);

  // Notifications computation
  const userNotifications = events.filter(e => 
    currentUser && e.assignedUserEmail && e.assignedUserEmail.toLowerCase() === currentUser.email.toLowerCase()
  );
  const unreadNotifications = userNotifications.filter(e => !readNotificationIds.includes(e.id));
  const unreadCount = unreadNotifications.length;

  const handleMarkAsRead = (id: string) => {
    if (!readNotificationIds.includes(id)) {
      setReadNotificationIds(prev => [...prev, id]);
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = userNotifications.map(e => e.id);
    setReadNotificationIds(allIds);
  };

  // Verify and hydrate state from Supabase
  const syncWithSupabase = async (userIdToSync?: string) => {
    try {
      setSupabaseStatus(prev => ({ ...prev, loading: true }));
      const status = await checkSupabaseConnection();
      setSupabaseStatus({ ...status, loading: false });

      const activeUid = userIdToSync || currentUser?.id;
      if (status.connected && status.tablesExist && activeUid) {
        const [fetchedContacts, fetchedEvents, fetchedNotes, fetchedActivities] = await Promise.all([
          db.getContacts(),
          db.getEvents(),
          db.getNotes(),
          db.getActivities()
        ]);

        // Always update state blocks to allow deletions leading to zero records to persist correctly
        setContacts(fetchedContacts || []);
        setEvents(fetchedEvents || []);
        setNotes(fetchedNotes || []);
        setActivities(fetchedActivities || []);

        await fetchAndSetProfiles();
      }
    } catch (err: any) {
      console.error('Failed to sync state with Supabase:', err);
      setSupabaseStatus(prev => ({ 
        ...prev, 
        loading: false, 
        error: err?.message || 'Database link error' 
      }));
    }
  };

  // Auth synchronization effect
  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const savedScr = localStorage.getItem('agency_current_screen');
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Agency Member'
        };
        setCurrentUser(u);
        localStorage.setItem('agency_user', JSON.stringify(u));
        // Soft navigate: check localStorage first to preserve screen completely
        setCurrentScreen(prev => {
          if (savedScr && savedScr !== 'landing' && savedScr !== 'acceso') {
            return savedScr as Screen;
          }
          return prev === 'landing' || prev === 'acceso' ? 'dashboard' : prev;
        });
        syncWithSupabase(session.user.id);
      } else {
        const saved = localStorage.getItem('agency_user');
        const savedUser = saved ? JSON.parse(saved) : null;
        if (savedUser && savedUser.id === null) {
          // Preserve demo/local session and restore screen correctly
          setCurrentUser(savedUser);
          setCurrentScreen(prev => {
            if (savedScr && savedScr !== 'landing' && savedScr !== 'acceso') {
              return savedScr as Screen;
            }
            return prev === 'landing' || prev === 'acceso' ? 'dashboard' : prev;
          });
        } else if (savedUser) {
          setCurrentUser(savedUser);
          setCurrentScreen(prev => {
            if (savedScr && savedScr !== 'landing' && savedScr !== 'acceso') {
              return savedScr as Screen;
            }
            return prev === 'landing' || prev === 'acceso' ? 'dashboard' : prev;
          });
          syncWithSupabase(savedUser.id);
        } else {
          setCurrentUser(null);
          localStorage.removeItem('agency_user');
          setCurrentScreen('landing');
        }
      }
    });

    // Listen to real auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const savedScr = localStorage.getItem('agency_current_screen');
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Agency Member'
        };
        setCurrentUser(u);
        localStorage.setItem('agency_user', JSON.stringify(u));
        // Soft navigate on tab-focus or session change, restoring screen accurately
        setCurrentScreen(prev => {
          if (savedScr && savedScr !== 'landing' && savedScr !== 'acceso') {
            return savedScr as Screen;
          }
          return prev === 'landing' || prev === 'acceso' ? 'dashboard' : prev;
        });
        syncWithSupabase(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('agency_user');
        localStorage.removeItem('agency_current_screen');
        setCurrentScreen('landing');
      }
    });

    // Verify general connection health on mount
    checkSupabaseConnection().then(status => {
      setSupabaseStatus({ ...status, loading: false });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle active signIn from login screen
  const handleSignInAndNavigate = (sessionUser?: { id: string | null; email: string; name: string }) => {
    if (sessionUser) {
      setCurrentUser(sessionUser);
      localStorage.setItem('agency_user', JSON.stringify(sessionUser));
      
      // Load user templates if it is first-time demo access
      if (!sessionUser.id) {
        setContacts(initialContacts);
        setEvents(initialEvents);
        setNotes(initialNotes);
        setActivities(initialActivities);
      } else {
        // Query server db
        syncWithSupabase(sessionUser.id);
      }
    }
    navigateTo('dashboard', 'push');
  };

  // Handle logging out from the application
  const handleSignOutUser = async () => {
    try {
      if (currentUser?.id) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('agency_user');
    navigateTo('acceso', 'push_back');
  };

  // Database Seeder handler scored with user id
  const handleSeedDatabase = async () => {
    try {
      await seedSupabaseDatabase({
        contacts: initialContacts,
        events: initialEvents,
        notes: initialNotes,
        activities: initialActivities
      }, currentUser?.id || undefined);
      // Hydrate state after seeding
      await syncWithSupabase();
    } catch (err: any) {
      console.error('Database seeding failed:', err);
      throw err;
    }
  };

  // Sync back to local backup cache (localStorage) for reliability
  useEffect(() => {
    localStorage.setItem('agency_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('agency_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('agency_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('agency_activities', JSON.stringify(activities));
  }, [activities]);

  // Combined dynamic search value for header syncing
  const [globalSearch, setGlobalSearch] = useState('');

  // Main navigation handles with transition controls
  const navigateTo = (target: Screen, transition: 'none' | 'push' | 'push_back') => {
    setTransitionType(transition);
    setCurrentScreen(target);
    setGlobalSearch(''); // reset search on navigation
  };

  // State handles to modify database items dynamically with Optimistic UI updates
  const handleAddContact = async (contact: ClientContact) => {
    // 1. Optimistic UI update
    setContacts(prev => [contact, ...prev]);
    
    // 2. Add activity locally
    const activity: Activity = {
      id: 'a_' + Date.now(),
      type: 'CRM',
      timestamp: 'Just now',
      title: contact.name,
      subtitle: `added to ${contact.company}`,
      accentColor: 'primary'
    };
    setActivities(prev => [activity, ...prev]);

    // 3. Persistent Supabase write
    if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
      try {
        await db.insertContact(contact, currentUser.id);
        await db.insertActivity(activity, currentUser.id);
      } catch (err) {
        console.error('Supabase failed to register contact:', err);
      }
    }
  };

  const handleUpdateContact = async (updated: ClientContact) => {
    // 1. Optimistic UI update
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));

    // 2. Persistent Supabase write
    if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
      try {
        await db.updateContact(updated, currentUser.id);
      } catch (err) {
        console.error('Supabase failed to update contact:', err);
      }
    }
  };

  const handleAddEvent = async (event: CalendarEvent) => {
    // 1. Optimistic UI update
    setEvents(prev => [...prev, event]);

    // 2. Add activity locally
    const activity: Activity = {
      id: 'a_' + Date.now(),
      type: 'Task',
      timestamp: 'Just now',
      title: 'Calendar Created',
      subtitle: `for event: ${event.title}`,
      accentColor: 'secondary'
    };
    setActivities(prev => [activity, ...prev]);

    // 3. Persistent Supabase write
    if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
      try {
        await db.insertEvent(event, currentUser.id);
        await db.insertActivity(activity, currentUser.id);
      } catch (err) {
        console.error('Supabase failed to register event:', err);
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    // 1. Optimistic UI update
    setEvents(prev => prev.filter(ev => ev.id !== id));

    // 2. Persistent Supabase deletion
    if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
      try {
        await db.deleteEvent(id, currentUser.id);
      } catch (err) {
        console.error('Supabase failed to delete event:', err);
      }
    }
  };

  const handleUpdateEvent = async (updated: CalendarEvent) => {
    // 1. Optimistic UI update
    setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev));

    // 2. Persistent Supabase update
    if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
      try {
        await db.updateEvent(updated, currentUser.id);
      } catch (err) {
        console.error('Supabase failed to update event:', err);
      }
    }
  };

  const handleAddNote = async (note: Note) => {
    // 1. Optimistic UI update
    setNotes(prev => [note, ...prev]);

    // 2. Add activity locally
    const activity: Activity = {
      id: 'a_' + Date.now(),
      type: 'Lead',
      timestamp: 'Just now',
      title: 'New Internal Note',
      subtitle: `published: ${note.title}`,
      accentColor: 'tertiary'
    };
    setActivities(prev => [activity, ...prev]);

    // 3. Persistent Supabase write
    if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
      try {
        await db.insertNote(note, currentUser.id);
        await db.insertActivity(activity, currentUser.id);
      } catch (err) {
        console.error('Supabase failed to publish note:', err);
      }
    }
  };

  const handleUpdateNote = async (updated: Note) => {
    // 1. Optimistic UI update
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));

    // 2. Persistent Supabase update
    if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
      try {
        await db.updateNote(updated, currentUser.id);
      } catch (err) {
        console.error('Supabase failed to update note:', err);
      }
    }
  };

  const handleDeleteNote = async (id: string) => {
    // 1. Optimistic UI update
    setNotes(prev => prev.filter(n => n.id !== id));

    // 2. Persistent Supabase delete
    if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
      try {
        await db.deleteNote(id, currentUser.id);
      } catch (err) {
        console.error('Supabase failed to delete note:', err);
      }
    }
  };

  const handleDeleteContact = async (id: string) => {
    // 1. Optimistic UI update
    setContacts(prev => prev.filter(c => c.id !== id));

    // 2. Persistent Supabase delete
    if (currentUser?.id && supabaseStatus.connected && supabaseStatus.tablesExist) {
      try {
        await db.deleteContact(id, currentUser.id);
      } catch (err) {
        console.error('Supabase failed to delete contact:', err);
      }
    }
  };

  // Match corresponding search details
  const filteredSearchEvents = events.filter(ev => 
    ev.title.toLowerCase().includes(globalSearch.toLowerCase()) || 
    ev.description.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredSearchNotes = notes.filter(n =>
    n.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
    n.content.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredSearchContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
    c.company.toLowerCase().includes(globalSearch.toLowerCase())
  );

  // Animation layout variants definition
  const screenVariants = {
    initial: (type: 'none' | 'push' | 'push_back') => {
      if (type === 'push') return { x: '100%', opacity: 0 };
      if (type === 'push_back') return { x: '-100%', opacity: 0 };
      return { opacity: 0 };
    },
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: 'easeInOut' }
    },
    exit: (type: 'none' | 'push' | 'push_back') => {
      if (type === 'push') return { x: '-100%', opacity: 0 };
      if (type === 'push_back') return { x: '100%', opacity: 0 };
      return { opacity: 0 };
    }
  };

  // Helper screen selector matches
  const renderScreen = (screen: Screen) => {
    switch (screen) {
      case 'dashboard':
        return (
          <DashboardScreen 
            events={globalSearch ? filteredSearchEvents : events}
            notes={globalSearch ? filteredSearchNotes : notes}
            activities={activities}
            onNavigate={navigateTo}
            onAddNote={handleAddNote}
            onAddEvent={handleAddEvent}
            currentUser={currentUser}
          />
        );
      case 'calendar':
        return (
          <CalendarScreen 
            events={globalSearch ? filteredSearchEvents : events}
            contacts={contacts}
            notes={globalSearch ? filteredSearchNotes : notes}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
            onUpdateEvent={handleUpdateEvent}
            onNavigate={navigateTo}
            usersList={usersList}
            onAddProfile={handleUpsertProfile}
          />
        );
      case 'crm':
        return (
          <CrmScreen 
            contacts={globalSearch ? filteredSearchContacts : contacts}
            events={events}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
            onNavigate={navigateTo}
            usersList={usersList}
            onAddProfile={handleUpsertProfile}
          />
        );
      case 'notes':
        return (
          <NotesScreen 
            notes={globalSearch ? filteredSearchNotes : notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            currentUser={currentUser}
          />
        );
      case 'projects':
        return (
          <ProjectsScreen 
            contacts={contacts}
            onNavigate={navigateTo}
          />
        );
      case 'finanzas':
        return (
          <FinanceScreen 
            contacts={contacts}
            onNavigate={navigateTo}
          />
        );
      case 'contactos':
        return (
          <ContactosScreen />
        );
      case 'citas':
        return (
          <CitasScreen
            events={events}
            contacts={contacts}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            usersList={usersList}
            onAddProfile={handleUpsertProfile}
          />
        );
      case 'contratos':
        return (
          <ContractsScreen
            contacts={contacts}
            onNavigate={navigateTo}
          />
        );
      case 'comerciales_admin':
        return (
          <ComercialesAdminScreen
            comercialesList={comercialesList}
            leadsList={leadsList}
            onAddComercial={(newC) => setComercialesList(prev => [...prev, newC])}
            onDeleteComercial={(id) => {
              setComercialesList(prev => prev.filter(c => c.id !== id));
              setLeadsList(prev => prev.filter(l => l.comercialId !== id));
            }}
          />
        );
      case 'cold_calling':
        return (
          <ColdCallingScreen
            coldLeads={coldLeads}
            comercialesList={comercialesList}
            onAddColdLead={(newLead) => setColdLeads(prev => [newLead, ...prev])}
            onUpdateColdLead={(updated) => setColdLeads(prev => prev.map(l => l.id === updated.id ? updated : l))}
            onDeleteColdLead={(id) => setColdLeads(prev => prev.filter(l => l.id !== id))}
            currentUser={currentUser}
            currentComercial={null}
            onNavigate={navigateTo}
          />
        );
      default:
        return null;
    }
  };

  // Render Landing and Login screens separately to exclude sidebar and header layout boundaries
  if (currentScreen === 'landing') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="landing-view"
          custom={transitionType}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full h-full min-h-screen"
        >
          <LandingScreen onNavigate={navigateTo} />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (currentScreen === 'acceso') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="login-view"
          custom={transitionType}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full h-full min-h-screen"
        >
          <LoginScreen 
            onSignIn={handleSignInAndNavigate} 
            onBackToLanding={() => navigateTo('landing', 'push_back')}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (currentScreen === 'comerciales_acceso') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="comerciales-login-view"
          custom={transitionType}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full h-full min-h-screen animate-fade-in"
        >
          <ComercialesAccesoScreen
            comercialesList={comercialesList}
            onSignInComercial={(com) => {
              setCurrentComercial(com);
              navigateTo('comerciales_panel', 'push');
            }}
            onBackToLanding={() => navigateTo('landing', 'push_back')}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (currentScreen === 'comerciales_panel') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="comerciales-panel-view"
          custom={transitionType}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full h-full min-h-screen"
        >
          <ComercialesPanelScreen
            comercial={currentComercial || comercialesList[0] || { id: 'com_demo', name: 'Alfonso Sales', email: 'vendedor@agency.com', createdAt: '' }}
            leadsList={leadsList}
            onAddLead={(newLead) => setLeadsList(prev => [newLead, ...prev])}
            onUpdateLead={(updated) => setLeadsList(prev => prev.map(l => l.id === updated.id ? updated : l))}
            onDeleteLead={(id) => setLeadsList(prev => prev.filter(l => l.id !== id))}
            onLogout={() => {
              setCurrentComercial(null);
              navigateTo('landing', 'push_back');
            }}
            
            // Cold calling bindings
            coldLeads={coldLeads}
            comercialesList={comercialesList}
            onAddColdLead={(newLead) => setColdLeads(prev => [newLead, ...prev])}
            onUpdateColdLead={(updated) => setColdLeads(prev => prev.map(l => l.id === updated.id ? updated : l))}
            onDeleteColdLead={(id) => setColdLeads(prev => prev.filter(l => l.id !== id))}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020205] text-slate-100 flex font-sans overflow-hidden">
      
      {/* Animated Mesh Gradient Background (Cosmic Glow Theme matching the image) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-rose-600/8 blur-[160px]" />
        <div className="absolute top-[20%] right-[15%] w-[30%] h-[30%] rounded-full bg-fuchsia-500/8 blur-[110px]" />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar 
        currentScreen={currentScreen} 
        onNavigate={navigateTo} 
        supabaseStatus={supabaseStatus}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleSignOutUser}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      {/* Main Content Pane wrapper */}
      <div className="flex-1 ml-[260px] flex flex-col h-screen overflow-hidden">
        
        {/* Sync Global top header bar info searching placeholder */}
        <Header 
          title={
            currentScreen === 'projects' 
              ? 'PROYECTOS' 
              : currentScreen === 'contactos'
                ? 'CONTACTOS DE LANDING'
                : currentScreen === 'finanzas'
                  ? 'FINANZAS'
                  : currentScreen.toUpperCase()
          } 
          onSearchChange={setGlobalSearch}
          currentUser={currentUser}
          searchPlaceholder={
            currentScreen === 'calendar' 
              ? 'Search events, contacts, tasks...' 
              : currentScreen === 'crm' 
                ? 'Search contacts, deals, or activities...' 
                : currentScreen === 'notes' 
                  ? 'Search across all notes...' 
                  : currentScreen === 'projects'
                    ? 'Search projects, tools or addons...'
                    : currentScreen === 'finanzas'
                      ? 'Buscar facturas, transacciones o suscripciones...'
                      : 'Search commands or files...'
          }
        />

        {/* Dynamic Screen viewport frames with slide/none transitions */}
        <div className="flex-1 relative overflow-hidden font-sans">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentScreen}
              custom={transitionType}
              variants={screenVariants}
              initial={transitionType === 'none' ? false : 'initial'}
              animate="animate"
              exit={transitionType === 'none' ? false : 'exit'}
              className="absolute inset-0 w-full h-full flex flex-col"
            >
              {renderScreen(currentScreen)}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* Supabase Control Center Integration Overlay */}
      <SupabaseInfoModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        status={supabaseStatus}
        onRefresh={() => syncWithSupabase()}
        onSeed={handleSeedDatabase}
      />

      {/* Dynamic Sliding Notifications Drawer Overlay */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            {/* Backdrop blur spacer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotificationsOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 cursor-pointer"
            />
            
            {/* Drawer Sliding Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-slate-900 border-l border-white/10 z-50 shadow-2xl p-6 flex flex-col justify-between"
            >
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell className="text-blue-400 w-5 h-5" />
                    <h3 className="font-bold text-sm text-white">Notificaciones</h3>
                  </div>
                  <button 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub headers action steps */}
                {userNotifications.length > 0 && unreadCount > 0 && (
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-semibold">
                      {unreadCount} pendientes
                    </span>
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer font-bold uppercase tracking-wider"
                    >
                      Marcar todas como leídas
                    </button>
                  </div>
                )}

                {/* Notification Checklist list view wrap */}
                <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                  {userNotifications.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-500">
                        <Bell className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-slate-400 text-xs font-semibold">No tienes asignaciones de calendario.</p>
                      <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto mt-1 leading-relaxed">
                        Cuando un colega te asigne un evento del calendario, se listará aquí al instante.
                      </p>
                    </div>
                  ) : (
                    userNotifications.map(ev => {
                      const isUnread = !readNotificationIds.includes(ev.id);
                      return (
                        <div 
                          key={ev.id} 
                          className={`p-3.5 rounded-2xl border transition-all duration-200 ${
                            isUnread 
                              ? 'bg-blue-500/5 border-blue-500/25 shadow-lg shadow-blue-500/[0.02]' 
                              : 'bg-white/[0.01] border-white/5 opacity-75'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase leading-none ${
                                  ev.type === 'Meeting' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/10' :
                                  ev.type === 'Review' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/10' :
                                  ev.type === 'Deadline' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/10' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {ev.type}
                                </span>
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                )}
                              </div>
                              <h4 className="font-bold text-xs text-white leading-snug truncate mt-1">
                                {ev.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                                {ev.description || 'Sin detalles configurados.'}
                              </p>
                              
                              <div className="flex items-center gap-3 text-[9px] text-slate-500 font-mono pt-1">
                                <span className="flex items-center gap-1">
                                  <CalendarAtom className="w-3.5 h-3.5" />
                                  {ev.date}
                                </span>
                                <span>{ev.time}</span>
                              </div>
                            </div>
                            
                            {isUnread && (
                              <button
                                onClick={() => handleMarkAsRead(ev.id)}
                                title="Marcar como leído"
                                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-white rounded-lg transition-all duration-200 flex-shrink-0 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Technical footnote */}
              <div className="border-t border-white/5 pt-4 text-center flex-shrink-0 mt-4">
                <p className="text-[9px] font-mono text-amber-500/65">Althera v2.0 Central Notificaciones</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
