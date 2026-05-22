import { ClientContact, CalendarEvent, Note, Activity } from './types';

export const initialContacts: ClientContact[] = [
  {
    id: 'c1',
    name: 'Sarah Kendrick',
    email: 'sarah@lumina.io',
    company: 'Lumina Digital',
    status: 'Client',
    lastContacted: '2 hours ago',
    role: 'Managing Director',
    avatarUrl: '',
    location: 'London, UK',
    addedDate: 'Jun 14, 2023',
    website: 'luminadigital.io',
    initials: 'SK'
  },
  {
    id: 'c2',
    name: 'Marcus Chen',
    email: 'm.chen@velocity.com',
    company: 'Velocity Labs',
    status: 'Lead',
    priority: true,
    lastContacted: 'Yesterday',
    role: 'Head of Engineering',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    location: 'San Francisco, CA',
    addedDate: 'Oct 12, 2023',
    website: 'velocitylabs.com/m-chen',
    initials: 'MC'
  },
  {
    id: 'c3',
    name: 'Elena Lopez',
    email: 'e.lopez@stratus.co',
    company: 'Stratus Cloud',
    status: 'Client',
    lastContacted: 'Oct 24, 2023',
    role: 'VP of Product',
    avatarUrl: '',
    location: 'Madrid, ES',
    addedDate: 'Feb 21, 2023',
    website: 'stratus.co',
    initials: 'EL'
  },
  {
    id: 'c4',
    name: 'Jameson Doyle',
    email: 'jd@pixelpulse.art',
    company: 'PixelPulse',
    status: 'Lead',
    lastContacted: 'Oct 22, 2023',
    role: 'Creative Director',
    avatarUrl: '',
    location: 'Dublin, IE',
    addedDate: 'Aug 05, 2023',
    website: 'pixelpulse.art',
    initials: 'JD'
  },
  {
    id: 'c5',
    name: 'Olivia Wright',
    email: 'o.wright@flow.io',
    company: 'Flow Systems',
    status: 'Client',
    lastContacted: 'Oct 20, 2023',
    role: 'Operations Director',
    avatarUrl: '',
    location: 'New York, NY',
    addedDate: 'Sep 10, 2023',
    website: 'flow.io',
    initials: 'OW'
  }
];

const getRelativeDate = (day: number) => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
};

export const initialEvents: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Project Kickoff',
    date: getRelativeDate(2),
    time: '09:00',
    type: 'Kickoff',
    description: 'Initial meeting with stakeholders of Lumina Digital project.',
    linkedContactId: 'c1',
    linkedContactName: 'Sarah Kendrick',
    reminders: ['15 min before']
  },
  {
    id: 'e2',
    title: 'Product Sync',
    date: getRelativeDate(12),
    time: '10:00',
    duration: '1h 30m',
    type: 'Meeting',
    description: 'Weekly check-in with the product and engineering team to review sprint progress, blockages, and the upcoming feature roadmap for v1.2.',
    linkedContactId: 'c2',
    linkedContactName: 'Marcus Chen',
    reminders: ['15 min before', 'At start time']
  },
  {
    id: 'e3',
    title: 'QA Review',
    date: getRelativeDate(12),
    time: '14:00',
    type: 'Review',
    description: 'Comprehensive testing and assurance review with Sarah Miller before the staging release.',
    reminders: ['15 min before']
  },
  {
    id: 'e4',
    title: 'Deadline: MVP',
    date: getRelativeDate(12),
    time: '18:00',
    type: 'Deadline',
    description: 'Target delivery for the minimum viable product of CloudScale v2.',
    reminders: ['1 hour before']
  },
  {
    id: 'e5',
    title: 'Client Lunch',
    date: getRelativeDate(15),
    time: '13:00',
    type: 'Meeting',
    description: 'Informal sync with the Stratus Cloud team to discuss renewal clauses.',
    linkedContactId: 'c3',
    linkedContactName: 'Elena Lopez'
  }
];

export const initialNotes: Note[] = [
  {
    id: 'n1',
    title: 'API Documentation Rewrite',
    content: 'Refactoring the core API endpoints to follow RESTful best practices. Need to update the Swagger docs and check auth headers. Ensure proper JSON structures, rate limiter parameters and comprehensive error handlers are explicitly documented.',
    category: 'Project Specs',
    updatedAt: 'Oct 12, 2023',
    authorName: 'Alex Rivera',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: 'n2',
    title: 'Design System Tokens',
    content: 'Finalizing the Tailwind configuration for the dark mode experience. Primary color remains Electric Blue (#adc6ff). Ensure margins, colors, borders and font metrics match perfectly with our UI kit.',
    category: 'Dev Tips',
    updatedAt: 'Oct 11, 2023',
    authorName: 'Sarah',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: 'n3',
    title: 'Client Feedback - Alpha',
    content: 'The client mentioned that the navigation feels slightly crowded on tablet devices. We need to implement the icon-only collapse. Let us gather feedback on active states, hover colors, and micro-transitions.',
    category: 'Client Feedback',
    updatedAt: 'Oct 10, 2023',
    authorName: 'Sarah',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: 'n4',
    title: 'Tailwind v4 Exploration',
    content: 'Testing out the new CSS-first engine. Speed gains are significant for the CRM dashboard build. Native support for cascades, custom utility flags and improved compilation time.',
    category: 'Dev Tips',
    updatedAt: 'Oct 09, 2023',
    authorName: 'Alex Rivera',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: 'n5',
    title: 'Database Migration Plan',
    content: 'Steps for migrating the production database to the new AWS cluster without downtime. Establish streaming replicas, audit logs and verify latency in multiple regions prior to cut-over.',
    category: 'Infrastructure',
    updatedAt: '2h ago',
    authorName: 'Alex Rivera',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: 'n6',
    title: 'Vortex UI Review',
    content: 'Initial feedback from the Vortex team regarding the new dashboard dark mode components. Highly appreciative of performance, font scales and contrast compliance.',
    category: 'Client Feedback',
    updatedAt: 'Yesterday',
    authorName: 'Sarah',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face'
  }
];

export const initialActivities: Activity[] = [
  {
    id: 'a1',
    type: 'CRM',
    timestamp: '10m ago',
    title: 'Mark J.',
    subtitle: 'upgraded to Enterprise Plan',
    detail: 'Project: CloudScale v2',
    accentColor: 'primary'
  },
  {
    id: 'a2',
    type: 'Lead',
    timestamp: '45m ago',
    title: 'Acme Corp',
    subtitle: 'requested a Portfolio Demo',
    detail: 'Assigned to: Sales Team',
    accentColor: 'tertiary'
  },
  {
    id: 'a3',
    type: 'Task',
    timestamp: '2h ago',
    title: 'Deployment',
    subtitle: 'to Staging Success',
    detail: 'Build #8842 - v1.4.2',
    accentColor: 'secondary'
  },
  {
    id: 'a4',
    type: 'Alert',
    timestamp: '4h ago',
    title: 'Lead Expiring',
    subtitle: 'Global Logistics',
    detail: 'No contact for 72 hours',
    accentColor: 'error'
  }
];

export interface PanelUser {
  id: string;
  name: string;
  email: string;
}

export const REGISTERED_USERS: PanelUser[] = [
  { id: 'usr_sarah', name: 'Sarah Connor', email: 'sarah@agencyflow.io' },
  { id: 'usr_alex', name: 'Alex Rivera', email: 'alex@agencyflow.io' },
  { id: 'usr_dani', name: 'Daniel Coder', email: 'daniel@agencyflow.io' },
  { id: 'usr_emma', name: 'Emma Watson', email: 'emma@agencyflow.io' },
  { id: 'usr_marta', name: 'Marta Sanz', email: 'marta@agencyflow.io' },
  { id: 'usr_luke', name: 'Luke Skywalker', email: 'luke@agencyflow.io' }
];
