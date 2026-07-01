export type Screen = 'landing' | 'acceso' | 'dashboard' | 'calendar' | 'crm' | 'notes' | 'projects' | 'contactos' | 'finanzas' | 'contratos' | 'citas' | 'comerciales_acceso' | 'comerciales_panel' | 'comerciales_admin' | 'cold_calling' | 'developer_hub';

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
  color?: string;
  temperature?: 'Frío' | 'Templado' | 'Caliente';
  notes?: string;
  contactedByComercialName?: string;
  contactedByComercialEmail?: string;
  originalLeadNotes?: string;
  // Developer Hub Properties
  devStatus?: 'backlog' | 'design' | 'development' | 'testing' | 'deployed' | 'completed';
  devAssignedTo?: string;
  devDeadline?: string;
  devTechStack?: string[];
  devChecklist?: string; // stringified JSON tasks: { id: string; text: string; done: boolean }[]
  devNotes?: string;
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
  color?: string;
  alias?: string;
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
  paymentMethod?: 'cash' | 'transfer'; // New: payment method 'cash' or 'transfer'
  firstAmount?: number; // Cost of the first occurrence
  nextAmount?: number;  // Cost of the subsequent occurrences
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isPending?: boolean;     // New: indicates if this item is currently pending payment (cobro pendiente)
  pendingTxId?: string;    // New: matching pending FinanceTransaction ID
  paymentMethod?: 'cash' | 'transfer'; // New: payment method 'cash' or 'transfer'
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
  alias?: string;
  color?: string;
}

export interface ComercialAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: string;
  phone?: string;
}

export interface ComercialLead {
  id: string;
  comercialId: string;
  comercialName: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'Pendiente' | 'Contactado' | 'Negociación' | 'Ganado' | 'Perdido';
  value: number;
  notes: string;
  createdAt: string;
  temperature?: 'Frío' | 'Templado' | 'Caliente';
  isDone?: boolean;
}

export interface ColdCallingLead {
  id: string;
  businessName: string;            // NOMBRE DE NEGOCIO
  contactPerson: string;           // NOMBRE CON QUIEN HABLÉ / DUEÑO
  phone: string;                   // TELEFONO
  callDate: string;                // FECHA DE LLAMADA (e.g., YYYY-MM-DD or readable)
  
  // Formulario fields
  contacted: 'Sí' | 'No';          // CONTACTADO (si/no)
  isOwner: 'Sí' | 'No';            // ¿ERA EL DUEÑO? (SI/NO)
  answered: 'Sí' | 'No';          // RESPONDE (SI/NO)
  temperature: 'Frío' | 'Templado' | 'Caliente'; // TEMPERATURA (FRIO/TEMPLADO/CALIENTE)
  callbackScheduled: 'Sí' | 'No' | 'Llamar más tarde'; // AGENDADA (SI/NO/LLAMAR MAS TARDE)
  
  // Llamar más tarde fields
  callbackDate?: string;           // FECHA (CALENDARIO) YYYY-MM-DD
  callbackTime?: string;           // HORA (HORA) e.g. "14:30"
  
  notes: string;                   // NOTAS
  
  // Control fields
  assignedToEmail: string;         // Assigned comercial's email, or 'unassigned'
  assignedToName?: string;         // Assigned comercial's name
  archived?: boolean;              // archived flag
  isDone?: boolean;                // Done (tick) flag for comercial organization
  createdAt: string;
}


