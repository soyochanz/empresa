export type Screen = 'landing' | 'acceso' | 'dashboard' | 'calendar' | 'crm' | 'notes' | 'projects' | 'contactos' | 'finanzas';

export interface InquiryMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  archived?: boolean;
  created_at?: string;
}

export interface ClientContact {
  id: string;
  name: string;
  email: string;
  company: string;
  status: 'Client' | 'Lead';
  lastContacted: string;
  role?: string;
  priority?: boolean;
  avatarUrl?: string;
  location?: string;
  addedDate?: string;
  website?: string;
  githubRepo?: string;
  hostingCredentials?: string;
  phone?: string;
  linkedin?: string;
  assignedUserId?: string;
  assignedUserEmail?: string;
  initials: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration?: string;
  type: 'Meeting' | 'Review' | 'Deadline' | 'Kickoff' | 'Other';
  description: string;
  linkedContactId?: string;
  linkedContactName?: string;
  linkedContactIds?: string[];
  linkedNoteIds?: string[];
  reminders?: string[];
  meetingUrl?: string;
  assignedUserId?: string;
  assignedUserEmail?: string;
  status?: 'pending' | 'done' | 'postponed';
  parentEventId?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: 'Project Specs' | 'Client Feedback' | 'Dev Tips' | 'Infrastructure' | 'General';
  updatedAt: string;
  authorName?: string;
  authorAvatar?: string;
  status?: 'pending' | 'done';
}

export interface Activity {
  id: string;
  type: 'CRM' | 'Lead' | 'Task' | 'Alert';
  timestamp: string;
  title: string;
  subtitle: string;
  detail?: string;
  accentColor: 'primary' | 'tertiary' | 'secondary' | 'error';
}

export interface FinanceTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  isRecurring?: boolean;
  recurrencePeriod?: 'weekly' | 'monthly' | 'yearly';
  invoiceId?: string; // Optional reference to a generated invoice
  status: 'paid' | 'pending';
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  items: InvoiceItem[];
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  total: number;
  notes?: string;
}

