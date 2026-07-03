import { createClient } from '@supabase/supabase-js';
import { ClientContact, CalendarEvent, Note, Activity, InquiryMessage, FinanceTransaction, Invoice, ColdCallingLead, ComercialLead, ComercialAccount } from './types';

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
DROP POLICY IF EXISTS "Public Read Access" ON contacts;
DROP POLICY IF EXISTS "Public Insert Access" ON contacts;
DROP POLICY IF EXISTS "Public Update Access" ON contacts;
DROP POLICY IF EXISTS "Public Delete Access" ON contacts;
DROP POLICY IF EXISTS "Allows individual updates" ON contacts;
DROP POLICY IF EXISTS "Allow users to update own contacts" ON contacts;
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
DROP POLICY IF EXISTS "Public Read Access" ON events;
DROP POLICY IF EXISTS "Public Insert Access" ON events;
DROP POLICY IF EXISTS "Public Update Access" ON events;
DROP POLICY IF EXISTS "Public Delete Access" ON events;
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
DROP POLICY IF EXISTS "Public Read Access" ON notes;
DROP POLICY IF EXISTS "Public Insert Access" ON notes;
DROP POLICY IF EXISTS "Public Update Access" ON notes;
DROP POLICY IF EXISTS "Public Delete Access" ON notes;
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
DROP POLICY IF EXISTS "Public Read Access" ON activities;
DROP POLICY IF EXISTS "Public Insert Access" ON activities;
DROP POLICY IF EXISTS "Public Update Access" ON activities;
DROP POLICY IF EXISTS "Public Delete Access" ON activities;
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
DROP POLICY IF EXISTS "Public Read Access" ON profiles;
DROP POLICY IF EXISTS "Public Insert Access" ON profiles;
DROP POLICY IF EXISTS "Public Update Access" ON profiles;
DROP POLICY IF EXISTS "Public Delete Access" ON profiles;
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
DROP POLICY IF EXISTS "Public Read Access" ON inquiries;
DROP POLICY IF EXISTS "Public Insert Access" ON inquiries;
DROP POLICY IF EXISTS "Public Update Access" ON inquiries;
DROP POLICY IF EXISTS "Public Delete Access" ON inquiries;
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
DROP POLICY IF EXISTS "Public Read Access" ON finance_transactions;
DROP POLICY IF EXISTS "Public Insert Access" ON finance_transactions;
DROP POLICY IF EXISTS "Public Update Access" ON finance_transactions;
DROP POLICY IF EXISTS "Public Delete Access" ON finance_transactions;
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
  alias TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE finance_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON finance_invoices;
DROP POLICY IF EXISTS "Public Insert Access" ON finance_invoices;
DROP POLICY IF EXISTS "Public Update Access" ON finance_invoices;
DROP POLICY IF EXISTS "Public Delete Access" ON finance_invoices;
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
DROP POLICY IF EXISTS "Public Read Access" ON contracts_althera;
DROP POLICY IF EXISTS "Public Insert Access" ON contracts_althera;
DROP POLICY IF EXISTS "Public Update Access" ON contracts_althera;
DROP POLICY IF EXISTS "Public Delete Access" ON contracts_althera;
CREATE POLICY "Public Read Access" ON contracts_althera FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON contracts_althera FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON contracts_althera FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON contracts_althera FOR DELETE USING (true);


-- 10. Create projects table with user_id support
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  category TEXT,
  "clientName" TEXT,
  "clientContactId" TEXT,
  description TEXT,
  "detailText" TEXT,
  "performanceScore" INTEGER,
  "seoScore" INTEGER,
  image TEXT,
  url TEXT,
  tools TEXT[],
  addons TEXT[],
  status TEXT,
  "showOnLanding" BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON projects;
DROP POLICY IF EXISTS "Public Insert Access" ON projects;
DROP POLICY IF EXISTS "Public Update Access" ON projects;
DROP POLICY IF EXISTS "Public Delete Access" ON projects;
CREATE POLICY "Public Read Access" ON projects FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON projects FOR DELETE USING (true);


-- 11. Create cold_calling_leads table
CREATE TABLE IF NOT EXISTS cold_calling_leads (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  "businessName" TEXT NOT NULL,
  "contactPerson" TEXT,
  phone TEXT NOT NULL,
  "callDate" TEXT,
  contacted TEXT,
  "isOwner" TEXT,
  answered TEXT,
  temperature TEXT,
  "callbackScheduled" TEXT,
  "callbackDate" TEXT,
  "callbackTime" TEXT,
  notes TEXT,
  "assignedToEmail" TEXT,
  "assignedToName" TEXT,
  archived BOOLEAN DEFAULT false,
  "isDone" BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE cold_calling_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON cold_calling_leads;
DROP POLICY IF EXISTS "Public Insert Access" ON cold_calling_leads;
DROP POLICY IF EXISTS "Public Update Access" ON cold_calling_leads;
DROP POLICY IF EXISTS "Public Delete Access" ON cold_calling_leads;
CREATE POLICY "Public Read Access" ON cold_calling_leads FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON cold_calling_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON cold_calling_leads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON cold_calling_leads FOR DELETE USING (true);


-- 12. Create comercial_leads table
CREATE TABLE IF NOT EXISTS comercial_leads (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  "comercialId" TEXT,
  "comercialName" TEXT,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  status TEXT,
  value NUMERIC,
  notes TEXT,
  temperature TEXT,
  "isDone" BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE comercial_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON comercial_leads;
DROP POLICY IF EXISTS "Public Insert Access" ON comercial_leads;
DROP POLICY IF EXISTS "Public Update Access" ON comercial_leads;
DROP POLICY IF EXISTS "Public Delete Access" ON comercial_leads;
CREATE POLICY "Public Read Access" ON comercial_leads FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON comercial_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON comercial_leads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON comercial_leads FOR DELETE USING (true);


-- 13. Create comerciales_accounts table
CREATE TABLE IF NOT EXISTS comerciales_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE comerciales_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON comerciales_accounts;
DROP POLICY IF EXISTS "Public Insert Access" ON comerciales_accounts;
DROP POLICY IF EXISTS "Public Update Access" ON comerciales_accounts;
DROP POLICY IF EXISTS "Public Delete Access" ON comerciales_accounts;
CREATE POLICY "Public Read Access" ON comerciales_accounts FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON comerciales_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON comerciales_accounts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON comerciales_accounts FOR DELETE USING (true);`;

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
    const { error: contactsError } = await supabase.from('contacts').select('id').limit(1);
    
    if (contactsError) {
      // PostgREST code 42P01 means 'relation does not exist' i.e. table is missing
      if (contactsError.code === '42P01') {
        return { connected: true, tablesExist: false, error: 'La tabla "contacts" no existe en Supabase. Por favor, ejecuta el script SQL en el editor de SQL de Supabase.' };
      }
      return { connected: false, tablesExist: false, error: contactsError.message };
    }

    // Try to query cold_calling_leads table
    const { error: coldError } = await supabase.from('cold_calling_leads').select('id').limit(1);
    if (coldError && coldError.code === '42P01') {
      return { connected: true, tablesExist: false, error: 'La tabla "cold_calling_leads" no existe en Supabase. Por favor, vuelve a ejecutar el script SQL actualizado en tu editor de SQL de Supabase.' };
    }

    // Try to query comercial_leads table
    const { error: comercialError } = await supabase.from('comercial_leads').select('id').limit(1);
    if (comercialError && comercialError.code === '42P01') {
      return { connected: true, tablesExist: false, error: 'La tabla "comercial_leads" no existe en Supabase. Por favor, vuelve a ejecutar el script SQL en Supabase.' };
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
    let notes: string | undefined = undefined;
    let contactedByComercialName: string | undefined = undefined;
    let contactedByComercialEmail: string | undefined = undefined;
    let originalLeadNotes: string | undefined = undefined;
    let temperature: 'Frío' | 'Templado' | 'Caliente' | undefined = undefined;
    
    // Dev metadata properties
    let devStatus: 'backlog' | 'design' | 'development' | 'testing' | 'deployed' | 'completed' | undefined = undefined;
    let devAssignedTo: string | undefined = undefined;
    let devDeadline: string | undefined = undefined;
    let devTechStack: string[] | undefined = undefined;
    let devChecklist: string | undefined = undefined;
    let devNotes: string | undefined = undefined;
    
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
          if (key === 'temperature') {
            const v = val.trim();
            if (v === 'Frío' || v === 'Templado' || v === 'Caliente') {
              temperature = v;
            }
          }
          if (key === 'devStatus') {
            const v = val.trim();
            if (['backlog', 'design', 'development', 'testing', 'deployed', 'completed'].includes(v)) {
              devStatus = v as any;
            }
          }
          if (key === 'devAssignedTo') devAssignedTo = val || undefined;
          if (key === 'devDeadline') devDeadline = val || undefined;
          if (key === 'devTechStack') devTechStack = val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined;
          
          try {
            if (key === 'notes') notes = decodeURIComponent(val) || undefined;
            if (key === 'contactedByComercialName') contactedByComercialName = decodeURIComponent(val) || undefined;
            if (key === 'contactedByComercialEmail') contactedByComercialEmail = val || undefined;
            if (key === 'originalLeadNotes') originalLeadNotes = decodeURIComponent(val) || undefined;
            if (key === 'devChecklist') devChecklist = decodeURIComponent(val) || undefined;
            if (key === 'devNotes') devNotes = decodeURIComponent(val) || undefined;
          } catch (e) {
            if (key === 'notes') notes = val || undefined;
            if (key === 'contactedByComercialName') contactedByComercialName = val || undefined;
            if (key === 'contactedByComercialEmail') contactedByComercialEmail = val || undefined;
            if (key === 'originalLeadNotes') originalLeadNotes = val || undefined;
            if (key === 'devChecklist') devChecklist = val || undefined;
            if (key === 'devNotes') devNotes = val || undefined;
          }
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
      notes,
      contactedByComercialName,
      contactedByComercialEmail,
      originalLeadNotes,
      temperature,
      devStatus,
      devAssignedTo,
      devDeadline,
      devTechStack,
      devChecklist,
      devNotes,
      hostingCredentials: cleanCredentials
    };
  },

  serializeContactMetadata(contact: ClientContact): any {
    if (!contact) return contact;
    let metadataStr = '';
    if (
      contact.color || 
      contact.assignedUserId || 
      contact.assignedUserEmail || 
      contact.phone || 
      contact.linkedin ||
      contact.notes ||
      contact.contactedByComercialName ||
      contact.contactedByComercialEmail ||
      contact.originalLeadNotes ||
      contact.temperature ||
      contact.devStatus ||
      contact.devAssignedTo ||
      contact.devDeadline ||
      contact.devTechStack ||
      contact.devChecklist ||
      contact.devNotes
    ) {
      metadataStr = '\n\n---METADATA---';
      if (contact.color) metadataStr += `\ncolor: ${contact.color}`;
      if (contact.assignedUserId) metadataStr += `\nassignedUserId: ${contact.assignedUserId}`;
      if (contact.assignedUserEmail) metadataStr += `\nassignedUserEmail: ${contact.assignedUserEmail}`;
      if (contact.phone) metadataStr += `\nphone: ${contact.phone}`;
      if (contact.linkedin) metadataStr += `\nlinkedin: ${contact.linkedin}`;
      if (contact.notes) metadataStr += `\nnotes: ${encodeURIComponent(contact.notes)}`;
      if (contact.contactedByComercialName) metadataStr += `\ncontactedByComercialName: ${encodeURIComponent(contact.contactedByComercialName)}`;
      if (contact.contactedByComercialEmail) metadataStr += `\ncontactedByComercialEmail: ${contact.contactedByComercialEmail}`;
      if (contact.originalLeadNotes) metadataStr += `\noriginalLeadNotes: ${encodeURIComponent(contact.originalLeadNotes)}`;
      if (contact.temperature) metadataStr += `\ntemperature: ${contact.temperature}`;
      if (contact.devStatus) metadataStr += `\ndevStatus: ${contact.devStatus}`;
      if (contact.devAssignedTo) metadataStr += `\ndevAssignedTo: ${contact.devAssignedTo}`;
      if (contact.devDeadline) metadataStr += `\ndevDeadline: ${contact.devDeadline}`;
      if (contact.devTechStack) metadataStr += `\ndevTechStack: ${contact.devTechStack.join(',')}`;
      if (contact.devChecklist) metadataStr += `\ndevChecklist: ${encodeURIComponent(contact.devChecklist)}`;
      if (contact.devNotes) metadataStr += `\ndevNotes: ${encodeURIComponent(contact.devNotes)}`;
    }
    const cleanCredentials = (contact.hostingCredentials || '').split('\n\n---METADATA---')[0];
    
    // Construct database-safe object strictly conforming to PostgreSQL contacts table schema
    const dbSafeContact: any = {};
    if (contact.id !== undefined) dbSafeContact.id = contact.id;
    if (contact.name !== undefined) dbSafeContact.name = contact.name;
    if (contact.email !== undefined) dbSafeContact.email = contact.email;
    if (contact.company !== undefined) dbSafeContact.company = contact.company;
    if (contact.status !== undefined) dbSafeContact.status = contact.status;
    if (contact.lastContacted !== undefined) dbSafeContact.lastContacted = contact.lastContacted;
    if (contact.role !== undefined) dbSafeContact.role = contact.role;
    if (contact.priority !== undefined) dbSafeContact.priority = contact.priority;
    if (contact.avatarUrl !== undefined) dbSafeContact.avatarUrl = contact.avatarUrl;
    if (contact.location !== undefined) dbSafeContact.location = contact.location;
    if (contact.addedDate !== undefined) dbSafeContact.addedDate = contact.addedDate;
    if (contact.website !== undefined) dbSafeContact.website = contact.website;
    if (contact.githubRepo !== undefined) dbSafeContact.githubRepo = contact.githubRepo;
    if (contact.initials !== undefined) dbSafeContact.initials = contact.initials;
    
    dbSafeContact.hostingCredentials = cleanCredentials + metadataStr;
    
    return dbSafeContact;
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
    // Prevent overwriting the user_id column or immutable primary key id column on update to allow admins to edit other admins' entries.
    const { user_id, id, ...payload } = serialized;
    const { error } = await supabase.from('contacts').update(payload).eq('id', contact.id);
    if (error) throw error;
  },

  async deleteContact(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) throw error;
  },

  // --- FINANCE TRANSACTIONS EXTRA HELPERS ---
  // These helpers serialize/deserialize virtual fields into the description column
  // to avoid column-not-found errors on any Supabase DB setup.
  _encodeDescription(description: string, metadata: {
    paymentMethod?: 'cash' | 'transfer';
    firstAmount?: number;
    nextAmount?: number;
    invoiceId?: string;
  }): string {
    let res = description || '';
    if (metadata.paymentMethod) {
      res += ` [PM:${metadata.paymentMethod}]`;
    }
    if (metadata.firstAmount !== undefined && metadata.firstAmount !== null) {
      res += ` [FA:${metadata.firstAmount}]`;
    }
    if (metadata.nextAmount !== undefined && metadata.nextAmount !== null) {
      res += ` [NA:${metadata.nextAmount}]`;
    }
    if (metadata.invoiceId) {
      res += ` [INV:${metadata.invoiceId}]`;
    }
    return res;
  },

  _decodeDescription(rawDesc: string): {
    description: string;
    paymentMethod?: 'cash' | 'transfer';
    firstAmount?: number;
    nextAmount?: number;
    invoiceId?: string;
  } {
    let cleanDesc = rawDesc || '';
    let paymentMethod: 'cash' | 'transfer' | undefined = undefined;
    let firstAmount: number | undefined = undefined;
    let nextAmount: number | undefined = undefined;
    let invoiceId: string | undefined = undefined;

    const pmRegex = /\s*\[PM:(cash|transfer)\]/g;
    const faRegex = /\s*\[FA:([\d.]+)\]/g;
    const naRegex = /\s*\[NA:([\d.]+)\]/g;
    const invRegex = /\s*\[INV:([^\]]+)\]/g;

    let match;
    while ((match = pmRegex.exec(cleanDesc)) !== null) {
      paymentMethod = match[1] as any;
    }
    cleanDesc = cleanDesc.replace(pmRegex, '');

    while ((match = faRegex.exec(cleanDesc)) !== null) {
      firstAmount = parseFloat(match[1]);
    }
    cleanDesc = cleanDesc.replace(faRegex, '');

    while ((match = naRegex.exec(cleanDesc)) !== null) {
      nextAmount = parseFloat(match[1]);
    }
    cleanDesc = cleanDesc.replace(naRegex, '');

    while ((match = invRegex.exec(cleanDesc)) !== null) {
      invoiceId = match[1];
    }
    cleanDesc = cleanDesc.replace(invRegex, '');

    return {
      description: cleanDesc.trim(),
      paymentMethod,
      firstAmount,
      nextAmount,
      invoiceId
    };
  },

  // --- FINANCE TRANSACTIONS ---
  async getFinanceTransactions(userId?: string): Promise<FinanceTransaction[]> {
    const { data, error } = await supabase.from('finance_transactions').select('*').order('date', { ascending: false });
    if (error) {
       console.error('finance_transactions table read error:', error);
       throw error;
    }
    const list = (data || []) as any[];
    return list.map(tx => {
      const decoded = this._decodeDescription(tx.description || '');
      return {
        id: tx.id,
        type: tx.type,
        category: tx.category,
        amount: Number(tx.amount),
        date: tx.date,
        status: tx.status,
        isRecurring: tx.isRecurring,
        recurrencePeriod: tx.recurrencePeriod,
        description: decoded.description,
        paymentMethod: decoded.paymentMethod,
        firstAmount: decoded.firstAmount,
        nextAmount: decoded.nextAmount,
        invoiceId: decoded.invoiceId
      };
    });
  },

  async insertFinanceTransaction(transaction: FinanceTransaction, userId?: string): Promise<void> {
    const { id, type, category, amount, date, description, isRecurring, recurrencePeriod, status } = transaction;
    const { paymentMethod, firstAmount, nextAmount, invoiceId } = transaction;

    const encodedDesc = this._encodeDescription(description, {
      paymentMethod,
      firstAmount,
      nextAmount,
      invoiceId
    });

    const payload = {
      id,
      type,
      category,
      amount,
      date,
      description: encodedDesc,
      isRecurring: isRecurring ?? false,
      recurrencePeriod: recurrencePeriod || null,
      status,
      user_id: userId || null
    };

    const { error } = await supabase.from('finance_transactions').insert(payload);
    if (error) throw error;
  },

  async updateFinanceTransaction(transaction: FinanceTransaction, userId?: string): Promise<void> {
    const { id, type, category, amount, date, description, isRecurring, recurrencePeriod, status } = transaction;
    const { paymentMethod, firstAmount, nextAmount, invoiceId } = transaction;

    const encodedDesc = this._encodeDescription(description, {
      paymentMethod,
      firstAmount,
      nextAmount,
      invoiceId
    });

    const payload = {
      type,
      category,
      amount,
      date,
      description: encodedDesc,
      isRecurring: isRecurring ?? false,
      recurrencePeriod: recurrencePeriod || null,
      status
    };

    const { error } = await supabase.from('finance_transactions').update(payload).eq('id', id);
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
    const payload = {
      id: invoice.id,
      user_id: userId || null,
      clientId: invoice.clientId || null,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      date: invoice.date,
      dueDate: invoice.dueDate,
      status: invoice.status,
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxPercentage: invoice.taxPercentage,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      notes: invoice.notes || null,
      alias: invoice.alias || null,
      color: invoice.color || null
    };
    const { error } = await supabase.from('finance_invoices').insert(payload);
    if (error) throw error;
  },

  async updateFinanceInvoice(invoice: Invoice, userId?: string): Promise<void> {
    const payload = {
      clientId: invoice.clientId || null,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      date: invoice.date,
      dueDate: invoice.dueDate,
      status: invoice.status,
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxPercentage: invoice.taxPercentage,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      notes: invoice.notes || null,
      alias: invoice.alias || null,
      color: invoice.color || null
    };
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
    // Prevent overwriting the user_id column on update to allow admins to edit other admins' entries.
    const { user_id, ...payload } = contract;
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
    // Prevent overwriting the user_id column on update to allow admins to edit other admins' entries.
    const { status, parentEventId, user_id, id, ...cleanEvent } = serialized;
    const { error } = await supabase.from('events').update(cleanEvent).eq('id', event.id);
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
    
    const notes = (data || []).map((row: any) => {
      let cleanUpdate = row.updatedAt || row.updated_at;
      if (cleanUpdate === 'Just now' || !cleanUpdate) {
        cleanUpdate = row.created_at || new Date().toISOString();
      }
      return {
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        updatedAt: cleanUpdate,
        authorName: row.authorName || row.author_name || 'Alex Rivera',
        authorAvatar: row.authorAvatar || row.author_avatar || ''
      };
    }) as Note[];

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
    const payload = {
      id: activity.id,
      user_id: userId || null,
      type: activity.type,
      timestamp: activity.timestamp,
      title: activity.title,
      subtitle: activity.subtitle,
      detail: activity.detail || null,
      accentColor: activity.accentColor
    };
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
  },

  // --- PROJECTS ---
  async getProjects(userId?: string): Promise<any[]> {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('projects table read error:', error.message);
      throw error;
    }
    return data || [];
  },

  async insertProject(project: any, userId?: string): Promise<void> {
    const payload = {
      id: project.id,
      title: project.title,
      category: project.category,
      clientName: project.clientName,
      clientContactId: project.clientContactId,
      description: project.description,
      detailText: project.detailText,
      performanceScore: project.performanceScore,
      seoScore: project.seoScore,
      image: project.image,
      url: project.url,
      tools: project.tools,
      addons: project.addons,
      status: project.status,
      showOnLanding: project.showOnLanding ?? true,
      user_id: userId || null
    };
    const { error } = await supabase.from('projects').insert(payload);
    if (error) throw error;
  },

  async updateProject(project: any, userId?: string): Promise<void> {
    const { user_id, ...payload } = project;
    const dbPayload = {
      title: payload.title,
      category: payload.category,
      clientName: payload.clientName,
      clientContactId: payload.clientContactId,
      description: payload.description,
      detailText: payload.detailText,
      performanceScore: Number(payload.performanceScore) || 90,
      seoScore: Number(payload.seoScore) || 90,
      image: payload.image,
      url: payload.url,
      tools: payload.tools,
      addons: payload.addons,
      status: payload.status,
      showOnLanding: payload.showOnLanding
    };
    const { error } = await supabase.from('projects').update(dbPayload).eq('id', project.id);
    if (error) throw error;
  },

  async deleteProject(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },

  // --- COLD LEADS ---
  serializeColdLeadMetadata(lead: ColdCallingLead): any {
    if (!lead) return lead;
    const callsCount = lead.callsCount || 0;
    const callsLog = lead.callsLog || [];
    const metadataObj = { callsCount, callsLog };
    const metadataStr = `\n\n---METADATA---\n${JSON.stringify(metadataObj)}`;
    const cleanNotes = (lead.notes || '').split('\n\n---METADATA---')[0];
    return {
      ...lead,
      notes: cleanNotes + metadataStr
    };
  },

  parseColdLeadMetadata(lead: any): ColdCallingLead {
    if (!lead) return lead;
    const notesStr = lead.notes || '';
    const parts = notesStr.split('\n\n---METADATA---\n');
    const cleanNotes = parts[0];
    let callsCount = 0;
    let callsLog: any[] = [];
    if (parts.length > 1) {
      try {
        const metadataObj = JSON.parse(parts[1]);
        callsCount = metadataObj.callsCount || 0;
        callsLog = metadataObj.callsLog || [];
      } catch (e) {
        // Ignore
      }
    }
    return {
      ...lead,
      notes: cleanNotes,
      callsCount,
      callsLog,
      createdAt: lead.created_at || lead.createdAt || new Date().toISOString()
    };
  },

  async getColdLeads(): Promise<ColdCallingLead[]> {
    const { data, error } = await supabase.from('cold_calling_leads').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('cold_calling_leads table read error:', error.message);
      throw error;
    }
    const raw = data || [];
    return raw.map((row: any) => this.parseColdLeadMetadata(row));
  },

  async insertColdLead(lead: ColdCallingLead, userId?: string): Promise<void> {
    const serialized = this.serializeColdLeadMetadata(lead);
    const payload = {
      id: serialized.id,
      user_id: userId || null,
      businessName: serialized.businessName,
      contactPerson: serialized.contactPerson || null,
      phone: serialized.phone,
      callDate: serialized.callDate || null,
      contacted: serialized.contacted || null,
      isOwner: serialized.isOwner || null,
      answered: serialized.answered || null,
      temperature: serialized.temperature || null,
      callbackScheduled: serialized.callbackScheduled || null,
      callbackDate: serialized.callbackDate || null,
      callbackTime: serialized.callbackTime || null,
      notes: serialized.notes || null,
      assignedToEmail: serialized.assignedToEmail || null,
      assignedToName: serialized.assignedToName || null,
      archived: serialized.archived ?? false,
      isDone: serialized.isDone ?? false
    };
    const { error } = await supabase.from('cold_calling_leads').insert(payload);
    if (error) throw error;
  },

  async updateColdLead(lead: ColdCallingLead, userId?: string): Promise<void> {
    const serialized = this.serializeColdLeadMetadata(lead);
    const payload = {
      businessName: serialized.businessName,
      contactPerson: serialized.contactPerson || null,
      phone: serialized.phone,
      callDate: serialized.callDate || null,
      contacted: serialized.contacted || null,
      isOwner: serialized.isOwner || null,
      answered: serialized.answered || null,
      temperature: serialized.temperature || null,
      callbackScheduled: serialized.callbackScheduled || null,
      callbackDate: serialized.callbackDate || null,
      callbackTime: serialized.callbackTime || null,
      notes: serialized.notes || null,
      assignedToEmail: serialized.assignedToEmail || null,
      assignedToName: serialized.assignedToName || null,
      archived: serialized.archived ?? false,
      isDone: serialized.isDone ?? false
    };
    const { error } = await supabase.from('cold_calling_leads').update(payload).eq('id', lead.id);
    if (error) throw error;
  },

  async deleteColdLead(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('cold_calling_leads').delete().eq('id', id);
    if (error) throw error;
  },

  // --- COMERCIAL LEADS ---
  async getComercialLeads(): Promise<ComercialLead[]> {
    const { data, error } = await supabase.from('comercial_leads').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('comercial_leads table read error:', error.message);
      throw error;
    }
    return (data || []).map((row: any) => ({
      ...row,
      createdAt: row.created_at || new Date().toISOString()
    })) as ComercialLead[];
  },

  async insertComercialLead(lead: ComercialLead, userId?: string): Promise<void> {
    const payload = {
      id: lead.id,
      user_id: userId || null,
      comercialId: lead.comercialId || null,
      comercialName: lead.comercialName || null,
      name: lead.name,
      company: lead.company || null,
      email: lead.email || null,
      phone: lead.phone || null,
      status: lead.status || null,
      value: lead.value || null,
      notes: lead.notes || null,
      temperature: lead.temperature || null,
      isDone: lead.isDone ?? false
    };
    const { error } = await supabase.from('comercial_leads').insert(payload);
    if (error) throw error;
  },

  async updateComercialLead(lead: ComercialLead, userId?: string): Promise<void> {
    const payload = {
      comercialId: lead.comercialId || null,
      comercialName: lead.comercialName || null,
      name: lead.name,
      company: lead.company || null,
      email: lead.email || null,
      phone: lead.phone || null,
      status: lead.status || null,
      value: lead.value || null,
      notes: lead.notes || null,
      temperature: lead.temperature || null,
      isDone: lead.isDone ?? false
    };
    const { error } = await supabase.from('comercial_leads').update(payload).eq('id', lead.id);
    if (error) throw error;
  },

  async deleteComercialLead(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('comercial_leads').delete().eq('id', id);
    if (error) throw error;
  },

  // --- COMERCIAL ACCOUNTS ---
  async getComercialesAccounts(): Promise<ComercialAccount[]> {
    const { data, error } = await supabase.from('comerciales_accounts').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('comerciales_accounts table read error:', error.message);
      throw error;
    }
    return (data || []).map((row: any) => ({
      ...row,
      createdAt: row.created_at || new Date().toISOString()
    })) as ComercialAccount[];
  },

  async insertComercialAccount(account: ComercialAccount, userId?: string): Promise<void> {
    const payload = {
      id: account.id,
      user_id: userId || null,
      name: account.name,
      email: account.email,
      password: account.password || null,
      phone: account.phone || null
    };
    const { error } = await supabase.from('comerciales_accounts').insert(payload);
    if (error) throw error;
  },

  async deleteComercialAccount(id: string, _userId?: string): Promise<void> {
    const { error } = await supabase.from('comerciales_accounts').delete().eq('id', id);
    if (error) throw error;
  }
};
