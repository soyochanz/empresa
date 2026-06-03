import { createClient } from '@supabase/supabase-js';
import { ClientContact, CalendarEvent, Note, Activity, InquiryMessage, FinanceTransaction, Invoice } from './types';

// Use environment variables or fallback directly to the provided credentials
const getSupabaseConfig = () => {
  // @ts-ignore
  let url = (import.meta.env?.VITE_SUPABASE_URL || '').trim();
  // Remove wrapping quotes if they exist
  if (url.startsWith('"') && url.endsWith('"')) {
    url = url.slice(1, -1).trim();
  }
  if (url.startsWith("'") && url.endsWith("'")) {
    url = url.slice(1, -1).trim();
  }
  
  // Check if it's a valid http/https URL and doesn't contain placeholders
  if (!url || !url.startsWith('http') || url.includes('placeholder') || url.includes('YOUR_') || url.includes('your-') || url.includes('MY_')) {
    url = 'https://czyrolmczcwtexxgxzrg.supabase.co';
  }

  // @ts-ignore
  let key = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1).trim();
  }
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1).trim();
  }

  if (!key || key.includes('placeholder') || key.includes('YOUR_') || key.includes('your-') || key.length < 20) {
    key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6eXJvbG1jemN3dGV4eGd4enJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTcxMjEsImV4cCI6MjA5NDk3MzEyMX0.OO17A0soth1VcIQQm6p02Po8uWPtP8GggfnmUXzGvp4';
  }

  return { url, key };
};

const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } = getSupabaseConfig();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const SQL_SETUP_SCRIPT = `-- SQL Script to create the required tables in your Supabase SQL Editor.
-- Copy and paste this script directly into the Supabase SQL Editor and run it.

-- 1. Create contacts table with multi-user user_id column
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  status TEXT,
  "lastContacted" TEXT,
  role TEXT,
  priority BOOLEAN DEFAULT false,
  "avatarUrl" TEXT,
  location TEXT,
  "addedDate" TEXT,
  website TEXT,
  "githubRepo" TEXT,
  "hostingCredentials" TEXT,
  initials TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) and allow public/anonymous access for demo/testing
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON contacts FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON contacts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON contacts FOR DELETE USING (true);

-- 2. Create events table with user_id support
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration TEXT,
  type TEXT,
  description TEXT,
  "linkedContactId" TEXT,
  "linkedContactName" TEXT,
  "linkedContactIds" TEXT[],
  "linkedNoteIds" TEXT[],
  reminders TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON events FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON events FOR DELETE USING (true);

-- 3. Create notes table with user_id support
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  "updatedAt" TEXT,
  "authorName" TEXT,
  "authorAvatar" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON notes FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON notes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON notes FOR DELETE USING (true);

-- 4. Create activities table with user_id support
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT,
  timestamp TEXT,
  title TEXT,
  subtitle TEXT,
  detail TEXT,
  "accentColor" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON activities FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON activities FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON activities FOR DELETE USING (true);

-- 5. Create profiles table to track real system users dynamically
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON profiles FOR DELETE USING (true);

-- 6. Create inquiries table for landing page contacts
CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON inquiries FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON inquiries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON inquiries FOR DELETE USING (true);


-- 7. Create finance_transactions table
CREATE TABLE IF NOT EXISTS finance_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  "isRecurring" BOOLEAN DEFAULT false,
  "recurrencePeriod" TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON finance_transactions FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON finance_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON finance_transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON finance_transactions FOR DELETE USING (true);


-- 8. Create finance_invoices table
CREATE TABLE IF NOT EXISTS finance_invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  "clientId" TEXT,
  "clientName" TEXT,
  "clientEmail" TEXT,
  date TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  status TEXT,
  items JSONB,
  subtotal NUMERIC,
  "taxPercentage" NUMERIC,
  "taxAmount" NUMERIC,
  total NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE finance_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON finance_invoices FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON finance_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON finance_invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON finance_invoices FOR DELETE USING (true);


-- 9. Create contracts_althera table
CREATE TABLE IF NOT EXISTS contracts_althera (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  "clientName" TEXT,
  "clientDni" TEXT,
  "clientAddress" TEXT,
  "clientPhone" TEXT,
  "clientEmail" TEXT,
  "prestador1Name" TEXT,
  "prestador1Dni" TEXT,
  "prestador2Name" TEXT,
  "prestador2Dni" TEXT,
  "deliveryDays" TEXT,
  "courtCity" TEXT,
  "signingCity" TEXT,
  "signingDay" TEXT,
  "signingMonth" TEXT,
  "signingYear" TEXT,
  "priceSingle" NUMERIC,
  "fin3Total" NUMERIC,
  "fin3Cuota" NUMERIC,
  "fin3Coste" NUMERIC,
  "fin4Total" NUMERIC,
  "fin4Cuota" NUMERIC,
  "fin4Coste" NUMERIC,
  "selectedModality" TEXT,
  "selectedContactId" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE contracts_althera ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON contracts_althera FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON contracts_althera FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON contracts_althera FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON contracts_althera FOR DELETE USING (true);`;

export interface ConnectionStatus {
  connected: boolean;
  tablesExist: boolean;
  error?: string;
}

/**
 * Checks connection state and table health.
 */
export async function checkSupabaseConnection(): Promise<ConnectionStatus> {
  try {
    // Try to query contacts table
    const { error } = await supabase.from('contacts').select('id').limit(1);
    
    if (error) {
      // PostgREST code 42P01 means 'relation does not exist' i.e. table is missing
      if (error.code === '42P01') {
        return { connected: true, tablesExist: false, error: 'Required tables are missing. Please execute the SQL creation script.' };
      }
      return { connected: false, tablesExist: false, error: error.message };
    }
    
    return { connected: true, tablesExist: true };
  } catch (err: any) {
    return { connected: false, tablesExist: false, error: err?.message || String(err) };
  }
}

/**
 * Seeding helper to pre-populate Supabase tables with initial mock data
 */
export async function seedSupabaseDatabase(
  initialData: {
    contacts: ClientContact[];
    events: CalendarEvent[];
    notes: Note[];
    activities: Activity[];
  }, 
  userId?: string
): Promise<void> {
  // Seeding Contacts
  if (initialData.contacts.length > 0) {
    const contactsWithUser = initialData.contacts.map(c => ({
      ...c,
      user_id: userId || null
    }));
    const { error: err } = await supabase.from('contacts').upsert(contactsWithUser);
    if (err) console.error('Error seeding contacts:', err);
  }

  // Seeding Events
  if (initialData.events.length > 0) {
    const eventsWithUser = initialData.events.map(e => ({
      ...e,
      user_id: userId || null
    }));
    const { error: err } = await supabase.from('events').upsert(eventsWithUser);
    if (err) console.error('Error seeding events:', err);
  }

  // Seeding Notes
  if (initialData.notes.length > 0) {
    const notesWithUser = initialData.notes.map(n => ({
      ...n,
      user_id: userId || null
    }));
    const { error: err } = await supabase.from('notes').upsert(notesWithUser);
    if (err) console.error('Error seeding notes:', err);
  }

  // Seeding Activities
  if (initialData.activities.length > 0) {
    const activitiesWithUser = initialData.activities.map(a => ({
      ...a,
      user_id: userId || null
    }));
    const { error: err } = await supabase.from('activities').upsert(activitiesWithUser);
    if (err) console.error('Error seeding activities:', err);
  }
}

// ==========================================
// DB API Helper functions for each Resource
// ==========================================

export const db = {
  // --- CONTACTS ---
  parseContactMetadata(contact: any): ClientContact {
    if (!contact) return contact;
    const creds = contact.hostingCredentials || '';
    const parts = creds.split('\n\n---METADATA---');
    const cleanCredentials = parts[0];
    
    let color: string | undefined = undefined;
    let assignedUserId: string | undefined = undefined;
    let assignedUserEmail: string | undefined = undefined;
    let phone: string | undefined = undefined;
    let linkedin: string | undefined = undefined;
    
    if (parts.length > 1) {
      const metadataLines = parts[1].split('\n');
      metadataLines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const key = line.substring(0, colonIndex).trim();
          const val = line.substring(colonIndex + 1).trim();
          if (key === 'color') color = val || undefined;
          if (key === 'assignedUserId') assignedUserId = val || undefined;
          if (key === 'assignedUserEmail') assignedUserEmail = val || undefined;
          if (key === 'phone') phone = val || undefined;
          if (key === 'linkedin') linkedin = val || undefined;
        }
      });
    }
    
    return {
      ...contact,
      color,
      assignedUserId,
      assignedUserEmail,
      phone,
      linkedin,
      hostingCredentials: cleanCredentials
    };
  },

  serializeContactMetadata(contact: ClientContact): any {
    if (!contact) return contact;
    let metadataStr = '';
    if (contact.color || contact.assignedUserId || contact.assignedUserEmail || contact.phone || contact.linkedin) {
      metadataStr = '\n\n---METADATA---';
      if (contact.color) metadataStr += `\ncolor: ${contact.color}`;
      if (contact.assignedUserId) metadataStr += `\nassignedUserId: ${contact.assignedUserId}`;
      if (contact.assignedUserEmail) metadataStr += `\nassignedUserEmail: ${contact.assignedUserEmail}`;
      if (contact.phone) metadataStr += `\nphone: ${contact.phone}`;
      if (contact.linkedin) metadataStr += `\nlinkedin: ${contact.linkedin}`;
    }
    const cleanCredentials = (contact.hostingCredentials || '').split('\n\n---METADATA---')[0];
    
    // Create a database-safe copy without custom props that are not database columns
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { color, assignedUserId, assignedUserEmail, phone, linkedin, ...dbSafeContact } = contact;
    return {
      ...dbSafeContact,
      hostingCredentials: cleanCredentials + metadataStr
    };
  },

  async getContacts(userId?: string): Promise<ClientContact[]> {
    let query = supabase.from('contacts').select('*');
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    const raw = data || [];
    return raw.map((c: any) => this.parseContactMetadata(c));
  },

  async insertContact(contact: ClientContact, userId?: string): Promise<void> {
    const serialized = this.serializeContactMetadata(contact);
    const payload = { ...serialized, user_id: userId || null };
    const { error } = await supabase.from('contacts').insert(payload);
    if (error) throw error;
  },

  async updateContact(contact: ClientContact, userId?: string): Promise<void> {
    const serialized = this.serializeContactMetadata(contact);
    const payload = { ...serialized, user_id: userId || null };
    const { error } = await supabase.from('contacts').update(payload).eq('id', contact.id);
    if (error) throw error;
  },

  async deleteContact(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) throw error;
  },

  // --- FINANCE TRANSACTIONS ---
  async getFinanceTransactions(userId?: string): Promise<FinanceTransaction[]> {
    const { data, error } = await supabase.from('finance_transactions').select('*').order('date', { ascending: false });
    if (error) {
       console.error('finance_transactions table read error:', error);
       throw error;
    }
    return (data || []) as FinanceTransaction[];
  },

  async insertFinanceTransaction(transaction: FinanceTransaction, userId?: string): Promise<void> {
    const payload = { ...transaction, user_id: userId || null };
    const { error } = await supabase.from('finance_transactions').insert(payload);
    if (error) throw error;
  },

  async updateFinanceTransaction(transaction: FinanceTransaction, userId?: string): Promise<void> {
    const payload = { ...transaction, user_id: userId || null };
    const { error } = await supabase.from('finance_transactions').update(payload).eq('id', transaction.id);
    if (error) throw error;
  },

  async deleteFinanceTransaction(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
    if (error) throw error;
  },

  // --- FINANCE INVOICES ---
  async getFinanceInvoices(userId?: string): Promise<Invoice[]> {
    const { data, error } = await supabase.from('finance_invoices').select('*').order('date', { ascending: false });
    if (error) {
       console.error('finance_invoices table read error:', error);
       throw error;
    }
    return (data || []) as Invoice[];
  },

  async insertFinanceInvoice(invoice: Invoice, userId?: string): Promise<void> {
    const payload = { ...invoice, user_id: userId || null };
    const { error } = await supabase.from('finance_invoices').insert(payload);
    if (error) throw error;
  },

  async updateFinanceInvoice(invoice: Invoice, userId?: string): Promise<void> {
    const payload = { ...invoice, user_id: userId || null };
    const { error } = await supabase.from('finance_invoices').update(payload).eq('id', invoice.id);
    if (error) throw error;
  },

  async deleteFinanceInvoice(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('finance_invoices').delete().eq('id', id);
    if (error) throw error;
  },

  // --- ALTHERA CONTRACTS ---
  async getContractsAlthera(userId?: string): Promise<any[]> {
    const { data, error } = await supabase.from('contracts_althera').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('contracts_althera table read error:', error.message);
      return [];
    }
    return data || [];
  },

  async insertContractAlthera(contract: any, userId?: string): Promise<void> {
    const payload = { ...contract, user_id: userId || null };
    const { error } = await supabase.from('contracts_althera').insert(payload);
    if (error) throw error;
  },

  async updateContractAlthera(contract: any, userId?: string): Promise<void> {
    const payload = { ...contract, user_id: userId || null };
    const { error } = await supabase.from('contracts_althera').update(payload).eq('id', contract.id);
    if (error) throw error;
  },

  async deleteContractAlthera(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('contracts_althera').delete().eq('id', id);
    if (error) throw error;
  },

  // --- METADATA HELPERS FOR BACKWARD COMPATIBILITY ---
  parseEventMetadata(event: any): CalendarEvent {
    if (!event) return event;
    const description = event.description || '';
    const parts = description.split('\n\n---METADATA---');
    const cleanDescription = parts[0];
    
    let status: 'pending' | 'done' | 'postponed' = 'pending';
    let parentEventId: string | undefined = undefined;
    let alias: string | undefined = undefined;
    let color: string | undefined = undefined;
    let assignedUserId: string | undefined = undefined;
    let assignedUserEmail: string | undefined = undefined;
    let meetingUrl: string | undefined = undefined;
    
    if (parts.length > 1) {
      const metadataLines = parts[1].split('\n');
      metadataLines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const key = line.substring(0, colonIndex).trim();
          const val = line.substring(colonIndex + 1).trim();
          if (key === 'status') status = val as any;
          if (key === 'parentEventId') parentEventId = val || undefined;
          if (key === 'alias') alias = val || undefined;
          if (key === 'color') color = val || undefined;
          if (key === 'assignedUserId') assignedUserId = val || undefined;
          if (key === 'assignedUserEmail') assignedUserEmail = val || undefined;
          if (key === 'meetingUrl') meetingUrl = val || undefined;
        }
      });
    }
    
    return {
      ...event,
      status,
      parentEventId,
      alias,
      color,
      assignedUserId,
      assignedUserEmail,
      meetingUrl,
      description: cleanDescription
    };
  },

  serializeEventMetadata(event: CalendarEvent): any {
    if (!event) return event;
    const status = event.status || 'pending';
    let metadataStr = `\n\n---METADATA---\nstatus: ${status}`;
    if (event.parentEventId) {
      metadataStr += `\nparentEventId: ${event.parentEventId}`;
    }
    if (event.alias) metadataStr += `\nalias: ${event.alias}`;
    if (event.color) metadataStr += `\ncolor: ${event.color}`;
    if (event.assignedUserId) metadataStr += `\nassignedUserId: ${event.assignedUserId}`;
    if (event.assignedUserEmail) metadataStr += `\nassignedUserEmail: ${event.assignedUserEmail}`;
    if (event.meetingUrl) metadataStr += `\nmeetingUrl: ${event.meetingUrl}`;
    
    const cleanDescription = (event.description || '').split('\n\n---METADATA---')[0];
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status: _status, parentEventId: _parent, alias: _alias, color: _color, assignedUserId: _assignedUserId, assignedUserEmail: _assignedUserEmail, meetingUrl: _meetingUrl, ...dbSafeEvent } = event;
    
    return {
      ...dbSafeEvent,
      description: cleanDescription + metadataStr
    };
  },

  parseNoteMetadata(note: any): Note {
    if (!note) return note;
    const content = note.content || '';
    const match = content.match(/---METADATA---\nstatus: (done|pending)/);
    
    let status: 'pending' | 'done' = 'pending';
    let cleanContent = content;
    
    if (match) {
      status = match[1] as any;
      cleanContent = content.split('\n\n---METADATA---')[0];
    }
    
    return {
      ...note,
      status,
      content: cleanContent
    };
  },

  serializeNoteMetadata(note: Note): any {
    if (!note) return note;
    const status = note.status || 'pending';
    const metadataStr = `\n\n---METADATA---\nstatus: ${status}`;
    const cleanContent = (note.content || '').split('\n\n---METADATA---')[0];
    
    return {
      ...note,
      content: cleanContent + metadataStr
    };
  },

  // --- EVENTS ---
  async getEvents(userId?: string): Promise<CalendarEvent[]> {
    let query = supabase.from('events').select('*');
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    const rawEvents = (data || []) as CalendarEvent[];
    return rawEvents.map(e => this.parseEventMetadata(e));
  },

  async insertEvent(event: CalendarEvent, userId?: string): Promise<void> {
    const serialized = this.serializeEventMetadata(event);
    const { status, parentEventId, ...cleanEvent } = serialized;
    const payload = { ...cleanEvent, user_id: userId || null };
    const { error } = await supabase.from('events').insert(payload);
    if (error) throw error;
  },

  async updateEvent(event: CalendarEvent, userId?: string): Promise<void> {
    const serialized = this.serializeEventMetadata(event);
    const { status, parentEventId, ...cleanEvent } = serialized;
    const payload = { ...cleanEvent, user_id: userId || null };
    const { error } = await supabase.from('events').update(payload).eq('id', event.id);
    if (error) throw error;
  },

  async deleteEvent(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
  },

  // --- NOTES ---
  async getNotes(userId?: string): Promise<Note[]> {
    let query = supabase.from('notes').select('*');
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    const notes = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      updatedAt: row.updatedAt || row.updated_at || 'Just now',
      authorName: row.authorName || row.author_name || 'Alex Rivera',
      authorAvatar: row.authorAvatar || row.author_avatar || ''
    })) as Note[];

    return notes.map(n => this.parseNoteMetadata(n));
  },

  async insertNote(note: Note, userId?: string): Promise<void> {
    const serialized = this.serializeNoteMetadata(note);
    const { status, ...cleanNote } = serialized;

    const camelPayload = {
      id: cleanNote.id,
      user_id: userId || null,
      title: cleanNote.title,
      content: cleanNote.content,
      category: cleanNote.category,
      updatedAt: cleanNote.updatedAt,
      authorName: cleanNote.authorName || 'Alex Rivera',
      authorAvatar: cleanNote.authorAvatar || null
    };

    const { error: camelError } = await supabase.from('notes').insert(camelPayload);
    if (!camelError) return;

    // Retry with snake_case if first format is rejected
    const snakePayload = {
      id: cleanNote.id,
      user_id: userId || null,
      title: cleanNote.title,
      content: cleanNote.content,
      category: cleanNote.category,
      updated_at: cleanNote.updatedAt,
      author_name: cleanNote.authorName || 'Alex Rivera',
      author_avatar: cleanNote.authorAvatar || null
    };
    const { error: snakeError } = await supabase.from('notes').insert(snakePayload);
    if (snakeError) throw snakeError;
  },

  async updateNote(note: Note, userId?: string): Promise<void> {
    const serialized = this.serializeNoteMetadata(note);
    const { status, ...cleanNote } = serialized;

    const camelPayload = {
      title: cleanNote.title,
      content: cleanNote.content,
      category: cleanNote.category,
      updatedAt: cleanNote.updatedAt,
      authorName: cleanNote.authorName || 'Alex Rivera',
      authorAvatar: cleanNote.authorAvatar || null
    };

    const { error: camelError } = await supabase.from('notes').update(camelPayload).eq('id', cleanNote.id);
    if (!camelError) return;

    // Retry with snake_case
    const snakePayload = {
      title: cleanNote.title,
      content: cleanNote.content,
      category: cleanNote.category,
      updated_at: cleanNote.updatedAt,
      author_name: cleanNote.authorName || 'Alex Rivera',
      author_avatar: cleanNote.authorAvatar || null
    };
    const { error: snakeError } = await supabase.from('notes').update(snakePayload).eq('id', cleanNote.id);
    if (snakeError) throw snakeError;
  },

  async deleteNote(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
  },

  // --- ACTIVITIES ---
  async getActivities(userId?: string): Promise<Activity[]> {
    let query = supabase.from('activities').select('*');
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data || []) as Activity[];
  },

  async insertActivity(activity: Activity, userId?: string): Promise<void> {
    const payload = { ...activity, user_id: userId || null };
    const { error } = await supabase.from('activities').insert(payload);
    if (error) throw error;
  },

  // --- PROFILES ---
  async getProfiles(): Promise<any[]> {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.warn('Profiles table not yet configured or error loading profiles:', error.message);
      return [];
    }
    return data || [];
  },

  async upsertProfile(profile: { id: string; name: string; email: string }): Promise<void> {
    const payload = {
      id: profile.id,
      name: profile.name,
      email: profile.email
    };
    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) {
      console.warn('Could not register profile in Supabase profiles (expected if table script not run yet):', error.message);
    }
  },

  // --- INQUIRIES (CONTACTOS RECIBIDOS) ---
  async getInquiries(): Promise<InquiryMessage[]> {
    const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
    if (error) {
      // Return memory list fallback or throw
      throw error;
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      message: row.message || '',
      archived: row.archived ?? false,
      created_at: row.created_at || new Date().toISOString()
    })) as InquiryMessage[];
  },

  async insertInquiry(inquiry: InquiryMessage): Promise<void> {
    const payload = {
      id: inquiry.id,
      name: inquiry.name,
      email: inquiry.email,
      message: inquiry.message,
      archived: inquiry.archived ?? false,
      created_at: inquiry.created_at || new Date().toISOString()
    };
    const { error } = await supabase.from('inquiries').insert(payload);
    if (error) throw error;
  },

  async updateInquiry(inquiry: InquiryMessage): Promise<void> {
    const payload = {
      id: inquiry.id,
      name: inquiry.name,
      email: inquiry.email,
      message: inquiry.message,
      archived: inquiry.archived ?? false
    };
    const { error } = await supabase.from('inquiries').update(payload).eq('id', inquiry.id);
    if (error) throw error;
  },

  async deleteInquiry(id: string): Promise<void> {
    const { error } = await supabase.from('inquiries').delete().eq('id', id);
    if (error) throw error;
  }
};
