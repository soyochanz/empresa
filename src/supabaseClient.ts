import { createClient } from '@supabase/supabase-js';
import { ClientContact, CalendarEvent, Note, Activity, InquiryMessage, FinanceTransaction, Invoice, ColdCallingLead, ColdCallingProspectGroup, ComercialLead, ComercialAccount, DemoSite, CommercialPresence, CommercialPresenceStatus, CommercialWorkSession, CommercialActivityLog } from './types';

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
 "hasWebsite" BOOLEAN,
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

-- Optional shared demo websites catalog
CREATE TABLE IF NOT EXISTS demo_sites (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 "businessType" TEXT,
 "publicUrl" TEXT NOT NULL,
 "adminUrl" TEXT,
 "imageUrl" TEXT,
 "supabaseUrl" TEXT,
 "supabaseAnonKey" TEXT,
 "stripePublishableKey" TEXT,
 "adminUser" TEXT,
 "adminPassword" TEXT,
 notes TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE demo_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON demo_sites;
DROP POLICY IF EXISTS "Public Insert Access" ON demo_sites;
DROP POLICY IF EXISTS "Public Update Access" ON demo_sites;
DROP POLICY IF EXISTS "Public Delete Access" ON demo_sites;
CREATE POLICY "Public Read Access" ON demo_sites FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON demo_sites FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON demo_sites FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON demo_sites FOR DELETE USING (true);

-- Optional marketing department pipeline
CREATE TABLE IF NOT EXISTS marketing_items (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 status TEXT,
 channel TEXT,
 metric TEXT,
 notes TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE marketing_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON marketing_items;
DROP POLICY IF EXISTS "Public Insert Access" ON marketing_items;
DROP POLICY IF EXISTS "Public Update Access" ON marketing_items;
DROP POLICY IF EXISTS "Public Delete Access" ON marketing_items;
CREATE POLICY "Public Read Access" ON marketing_items FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON marketing_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON marketing_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access" ON marketing_items FOR DELETE USING (true);

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
 "closingOriginComercialEmail" TEXT,
 "closingOriginComercialName" TEXT,
 archived BOOLEAN DEFAULT false,
 "isDone" BOOLEAN DEFAULT false,
 position INTEGER,
 rating DOUBLE PRECISION,
 reviews INTEGER,
 website TEXT,
 "sourceStatus" TEXT,
 info TEXT,
 "mapsUrl" TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE cold_calling_leads
 ADD COLUMN IF NOT EXISTS position INTEGER,
 ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION,
 ADD COLUMN IF NOT EXISTS reviews INTEGER,
 ADD COLUMN IF NOT EXISTS website TEXT,
 ADD COLUMN IF NOT EXISTS "hasWebsite" BOOLEAN,
 ADD COLUMN IF NOT EXISTS "sourceStatus" TEXT,
 ADD COLUMN IF NOT EXISTS info TEXT,
 ADD COLUMN IF NOT EXISTS "mapsUrl" TEXT;

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
 const requiredTables = [
  'contacts',
  'events',
  'notes',
  'activities',
  'profiles',
  'inquiries',
  'projects',
  'finance_transactions',
  'finance_invoices',
  'contracts_althera',
  'cold_calling_leads',
  'comercial_leads',
  'comerciales_accounts',
  'demo_sites',
  'marketing_items'
 ];

 const checks = await Promise.all(requiredTables.map(async table => ({
  table,
  result: await supabase.from(table).select('id').limit(1)
 })));
 for (const { table, result } of checks) {
  const { error } = result;
  if (error) {
  const missingOrHidden = error.code === '42P01' || error.code === 'PGRST205' || error.message?.toLowerCase().includes('could not find the table');
  if (missingOrHidden) {
   return {
   connected: true,
   tablesExist: false,
   error: `La tabla "${table}" no existe o no está expuesta en Supabase. Ejecuta el SQL de configuración actualizado antes de usar la plataforma en equipo.`
   };
  }
  return { connected: false, tablesExist: false, error: error.message };
  }
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
// DB Caching Layer to minimize Supabase Egress
// ==========================================
const CACHE_TTL_MS = 10000; // Keep reads snappy without hiding cross-session changes for long.
const _queryCache: Record<string, { data: any; timestamp: number }> = {};

function getCached<T>(key: string): T | null {
 const cached = _queryCache[key];
 if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
 return cached.data as T;
 }
 return null;
}

function setCached(key: string, data: any): void {
 _queryCache[key] = {
 data,
 timestamp: Date.now()
 };
}

function invalidateCache(keyPrefix: string): void {
 Object.keys(_queryCache).forEach(k => {
 if (k.startsWith(keyPrefix)) {
  delete _queryCache[k];
 }
 });
}

export const invalidateSharedPipelineCache = (): void => {
 ['cold_calling_leads', 'comercial_leads', 'contacts', 'events', 'finance_transactions', 'finance_invoices']
  .forEach(invalidateCache);
};

function clearAllCache(): void {
 Object.keys(_queryCache).forEach(k => {
 delete _queryCache[k];
 });
}

const mapCommercialPresence = (row: any): CommercialPresence => ({
 commercialId: row.commercial_id,
 commercialEmail: row.commercial_email,
 commercialName: row.commercial_name,
 status: row.status,
 sessionId: row.session_id || undefined,
 sessionStartedAt: row.session_started_at || undefined,
 statusChangedAt: row.status_changed_at,
 lastSeenAt: row.last_seen_at
});

const mapCommercialWorkSession = (row: any): CommercialWorkSession => ({
 id: row.id,
 commercialId: row.commercial_id,
 commercialEmail: row.commercial_email,
 commercialName: row.commercial_name,
 startedAt: row.started_at,
 endedAt: row.ended_at || undefined,
 durationSeconds: row.duration_seconds ?? undefined,
 createdAt: row.created_at
});

const mapCommercialActivityLog = (row: any): CommercialActivityLog => ({
 id: row.id,
 commercialId: row.commercial_id,
 commercialEmail: row.commercial_email,
 commercialName: row.commercial_name,
 action: row.action,
 entityType: row.entity_type || undefined,
 entityId: row.entity_id || undefined,
 description: row.description,
 metadata: row.metadata || {},
 createdAt: row.created_at
});

// ==========================================
// DB API Helper functions for each Resource
// ==========================================

export const db = {
 // --- CACHE MANUAL EXPOSURE ---
 clearAllCache() {
 clearAllCache();
 },

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
 let closingSourceLeadId: string | undefined = undefined;
 let closerName: string | undefined = undefined;
 let closerEmail: string | undefined = undefined;
 let closingStatus: ClientContact['closingStatus'] = undefined;
 let closingAnswered: boolean | undefined = undefined;
 let closingNotes: string | undefined = undefined;
 let closingSocials: string | undefined = undefined;
 let googleMapsUrl: string | undefined = undefined;
 let needsWebsite = false;
 let websiteReady = false;
 let webReadyNotifiedAt: string | undefined = undefined;
 
 // Dev metadata properties
 let devStatus: 'backlog' | 'design' | 'development' | 'testing' | 'deployed' | 'completed' | undefined = undefined;
 let devAssignedTo: string | undefined = undefined;
 let devDeadline: string | undefined = undefined;
 let devCompletedAt: string | undefined = undefined;
 let devTechStack: string[] | undefined = undefined;
 let devChecklist: string | undefined = undefined;
 let devNotes: string | undefined = undefined;
 let devWebsiteConfig: string | undefined = undefined;
 let demoWebsiteId: string | undefined = undefined;
 let customWebsiteUrl: string | undefined = undefined;
 let websiteType: string | undefined = undefined;
 let websiteCredentials: string | undefined = undefined;
 let supabaseCredentials: string | undefined = undefined;
 let companyEmailCredentials: string | undefined = undefined;
 let platformCredentials: string | undefined = undefined;
 
 // Stripe metadata properties
 let stripeCustomerId: string | undefined = undefined;
 let stripeSubscriptionId: string | undefined = undefined;
 let stripeSubscriptionStatus: 'active' | 'trialing' | 'canceled' | 'past_due' | 'none' | undefined = undefined;
 let stripeSubscriptionPrice: string | undefined = undefined;
 let stripeSubscriptionInterval: string | undefined = undefined;
 let callsLog: any[] | undefined = undefined;
 
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
   if (key === 'devCompletedAt') devCompletedAt = val || undefined;
   if (key === 'devTechStack') devTechStack = val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined;
   if (key === 'demoWebsiteId') demoWebsiteId = val || undefined;
   if (key === 'closingSourceLeadId') closingSourceLeadId = val || undefined;
   if (key === 'closerEmail') closerEmail = val || undefined;
   if (key === 'closingStatus') {
   const v = val.trim();
   if (['Pendiente', 'Cerrado', 'Perdido'].includes(v)) closingStatus = v as ClientContact['closingStatus'];
   }
   if (key === 'closingAnswered') closingAnswered = val === 'true';
   if (key === 'needsWebsite') needsWebsite = val === 'true';
   if (key === 'websiteReady') websiteReady = val === 'true';
   if (key === 'webReadyNotifiedAt') webReadyNotifiedAt = val || undefined;
   
   if (key === 'stripeCustomerId') stripeCustomerId = val || undefined;
   if (key === 'stripeSubscriptionId') stripeSubscriptionId = val || undefined;
   if (key === 'stripeSubscriptionStatus') {
   const sVal = val.trim().toLowerCase();
   if (['active', 'trialing', 'canceled', 'past_due', 'none'].includes(sVal)) {
    stripeSubscriptionStatus = sVal as any;
   }
   }
   if (key === 'stripeSubscriptionPrice') stripeSubscriptionPrice = val || undefined;
   if (key === 'stripeSubscriptionInterval') stripeSubscriptionInterval = val || undefined;
   if (key === 'callsLog') {
   try {
    callsLog = JSON.parse(decodeURIComponent(val));
   } catch (e) {
    console.error('Error parsing callsLog from metadata', e);
   }
   }
   
   try {
   if (key === 'notes') notes = decodeURIComponent(val) || undefined;
   if (key === 'contactedByComercialName') contactedByComercialName = decodeURIComponent(val) || undefined;
   if (key === 'contactedByComercialEmail') contactedByComercialEmail = val || undefined;
   if (key === 'originalLeadNotes') originalLeadNotes = decodeURIComponent(val) || undefined;
   if (key === 'closerName') closerName = decodeURIComponent(val) || undefined;
   if (key === 'closingNotes') closingNotes = decodeURIComponent(val) || undefined;
   if (key === 'closingSocials') closingSocials = decodeURIComponent(val) || undefined;
   if (key === 'googleMapsUrl') googleMapsUrl = decodeURIComponent(val) || undefined;
   if (key === 'devChecklist') devChecklist = decodeURIComponent(val) || undefined;
   if (key === 'devNotes') devNotes = decodeURIComponent(val) || undefined;
   if (key === 'devWebsiteConfig') devWebsiteConfig = decodeURIComponent(val) || undefined;
   if (key === 'customWebsiteUrl') customWebsiteUrl = decodeURIComponent(val) || undefined;
   if (key === 'websiteType') websiteType = decodeURIComponent(val) || undefined;
   if (key === 'websiteCredentials') websiteCredentials = decodeURIComponent(val) || undefined;
   if (key === 'supabaseCredentials') supabaseCredentials = decodeURIComponent(val) || undefined;
   if (key === 'companyEmailCredentials') companyEmailCredentials = decodeURIComponent(val) || undefined;
   if (key === 'platformCredentials') platformCredentials = decodeURIComponent(val) || undefined;
   } catch (e) {
   if (key === 'notes') notes = val || undefined;
   if (key === 'contactedByComercialName') contactedByComercialName = val || undefined;
   if (key === 'contactedByComercialEmail') contactedByComercialEmail = val || undefined;
   if (key === 'originalLeadNotes') originalLeadNotes = val || undefined;
   if (key === 'closerName') closerName = val || undefined;
   if (key === 'closingNotes') closingNotes = val || undefined;
   if (key === 'closingSocials') closingSocials = val || undefined;
   if (key === 'googleMapsUrl') googleMapsUrl = val || undefined;
   if (key === 'devChecklist') devChecklist = val || undefined;
   if (key === 'devNotes') devNotes = val || undefined;
   if (key === 'devWebsiteConfig') devWebsiteConfig = val || undefined;
   if (key === 'customWebsiteUrl') customWebsiteUrl = val || undefined;
   if (key === 'websiteType') websiteType = val || undefined;
   if (key === 'websiteCredentials') websiteCredentials = val || undefined;
   if (key === 'supabaseCredentials') supabaseCredentials = val || undefined;
   if (key === 'companyEmailCredentials') companyEmailCredentials = val || undefined;
   if (key === 'platformCredentials') platformCredentials = val || undefined;
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
  closingSourceLeadId,
  closerName,
  closerEmail,
  closingStatus,
  closingAnswered,
  closingNotes,
  closingSocials,
  googleMapsUrl,
  needsWebsite,
  websiteReady,
  webReadyNotifiedAt,
  temperature,
  devStatus,
  devAssignedTo,
  devDeadline,
  devCompletedAt,
  devTechStack,
  devChecklist,
  devNotes,
  devWebsiteConfig,
  demoWebsiteId,
  customWebsiteUrl,
  websiteType,
  websiteCredentials,
  supabaseCredentials,
  companyEmailCredentials,
  platformCredentials,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeSubscriptionStatus,
  stripeSubscriptionPrice,
  stripeSubscriptionInterval,
  callsLog,
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
  contact.closingSourceLeadId ||
  contact.closerName ||
  contact.closerEmail ||
  contact.closingStatus ||
  contact.closingAnswered !== undefined ||
  contact.closingNotes ||
  contact.closingSocials ||
  contact.googleMapsUrl ||
  contact.needsWebsite ||
  contact.websiteReady ||
  contact.webReadyNotifiedAt ||
  contact.temperature ||
  contact.devStatus ||
  contact.devAssignedTo ||
  contact.devDeadline ||
  contact.devCompletedAt ||
  contact.devTechStack ||
  contact.devChecklist ||
  contact.devNotes ||
  contact.devWebsiteConfig ||
  contact.demoWebsiteId ||
  contact.customWebsiteUrl ||
  contact.websiteType ||
  contact.websiteCredentials ||
  contact.supabaseCredentials ||
  contact.companyEmailCredentials ||
  contact.platformCredentials ||
  contact.stripeCustomerId ||
  contact.stripeSubscriptionId ||
  contact.stripeSubscriptionStatus ||
  contact.stripeSubscriptionPrice ||
  contact.stripeSubscriptionInterval ||
  contact.callsLog
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
  if (contact.closingSourceLeadId) metadataStr += `\nclosingSourceLeadId: ${contact.closingSourceLeadId}`;
  if (contact.closerName) metadataStr += `\ncloserName: ${encodeURIComponent(contact.closerName)}`;
  if (contact.closerEmail) metadataStr += `\ncloserEmail: ${contact.closerEmail}`;
  if (contact.closingStatus) metadataStr += `\nclosingStatus: ${contact.closingStatus}`;
  if (contact.closingAnswered !== undefined) metadataStr += `\nclosingAnswered: ${contact.closingAnswered}`;
  if (contact.closingNotes) metadataStr += `\nclosingNotes: ${encodeURIComponent(contact.closingNotes)}`;
  if (contact.closingSocials) metadataStr += `\nclosingSocials: ${encodeURIComponent(contact.closingSocials)}`;
  if (contact.googleMapsUrl) metadataStr += `\ngoogleMapsUrl: ${encodeURIComponent(contact.googleMapsUrl)}`;
  if (contact.needsWebsite) metadataStr += `\nneedsWebsite: true`;
  if (contact.websiteReady) metadataStr += `\nwebsiteReady: true`;
  if (contact.webReadyNotifiedAt) metadataStr += `\nwebReadyNotifiedAt: ${contact.webReadyNotifiedAt}`;
  if (contact.temperature) metadataStr += `\ntemperature: ${contact.temperature}`;
  if (contact.devStatus) metadataStr += `\ndevStatus: ${contact.devStatus}`;
  if (contact.devAssignedTo) metadataStr += `\ndevAssignedTo: ${contact.devAssignedTo}`;
  if (contact.devDeadline) metadataStr += `\ndevDeadline: ${contact.devDeadline}`;
  if (contact.devCompletedAt) metadataStr += `\ndevCompletedAt: ${contact.devCompletedAt}`;
  if (contact.devTechStack) metadataStr += `\ndevTechStack: ${contact.devTechStack.join(',')}`;
  if (contact.devChecklist) metadataStr += `\ndevChecklist: ${encodeURIComponent(contact.devChecklist)}`;
  if (contact.devNotes) metadataStr += `\ndevNotes: ${encodeURIComponent(contact.devNotes)}`;
  if (contact.devWebsiteConfig) metadataStr += `\ndevWebsiteConfig: ${encodeURIComponent(contact.devWebsiteConfig)}`;
  if (contact.demoWebsiteId) metadataStr += `\ndemoWebsiteId: ${contact.demoWebsiteId}`;
  if (contact.customWebsiteUrl) metadataStr += `\ncustomWebsiteUrl: ${encodeURIComponent(contact.customWebsiteUrl)}`;
  if (contact.websiteType) metadataStr += `\nwebsiteType: ${encodeURIComponent(contact.websiteType)}`;
  if (contact.websiteCredentials) metadataStr += `\nwebsiteCredentials: ${encodeURIComponent(contact.websiteCredentials)}`;
  if (contact.supabaseCredentials) metadataStr += `\nsupabaseCredentials: ${encodeURIComponent(contact.supabaseCredentials)}`;
  if (contact.companyEmailCredentials) metadataStr += `\ncompanyEmailCredentials: ${encodeURIComponent(contact.companyEmailCredentials)}`;
  if (contact.platformCredentials) metadataStr += `\nplatformCredentials: ${encodeURIComponent(contact.platformCredentials)}`;
  if (contact.stripeCustomerId) metadataStr += `\nstripeCustomerId: ${contact.stripeCustomerId}`;
  if (contact.stripeSubscriptionId) metadataStr += `\nstripeSubscriptionId: ${contact.stripeSubscriptionId}`;
  if (contact.stripeSubscriptionStatus) metadataStr += `\nstripeSubscriptionStatus: ${contact.stripeSubscriptionStatus}`;
  if (contact.stripeSubscriptionPrice) metadataStr += `\nstripeSubscriptionPrice: ${contact.stripeSubscriptionPrice}`;
  if (contact.stripeSubscriptionInterval) metadataStr += `\nstripeSubscriptionInterval: ${contact.stripeSubscriptionInterval}`;
  if (contact.callsLog) metadataStr += `\ncallsLog: ${encodeURIComponent(JSON.stringify(contact.callsLog))}`;
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
 const cacheKey = 'contacts';
 const cached = getCached<ClientContact[]>(cacheKey);
 if (cached) return cached;

 let query = supabase.from('contacts').select('*');
 const { data, error } = await query.order('created_at', { ascending: false });
 if (error) throw error;
 const raw = data || [];
 const result = raw.map((c: any) => this.parseContactMetadata(c));
 setCached(cacheKey, result);
 return result;
 },

 async getDemoSites(): Promise<DemoSite[]> {
 const { data, error } = await supabase.from('demo_sites').select('*').order('created_at', { ascending: false });
 if (error) throw error;
 return (data || []) as DemoSite[];
 },

 async upsertDemoSite(site: DemoSite): Promise<void> {
 const { error } = await supabase.from('demo_sites').upsert(site);
 if (error) throw error;
 invalidateCache('demo_sites');
 },

 async deleteDemoSite(id: string): Promise<void> {
 const { error } = await supabase.from('demo_sites').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('demo_sites');
 },

 async getMarketingItems(): Promise<any[]> {
 const cacheKey = 'marketing_items';
 const cached = getCached<any[]>(cacheKey);
 if (cached) return cached;
 const { data, error } = await supabase.from('marketing_items').select('*').order('created_at', { ascending: false });
 if (error) throw error;
 const result = data || [];
 setCached(cacheKey, result);
 return result;
 },

 async upsertMarketingItem(item: any): Promise<void> {
 const payload = {
  id: item.id,
  name: item.name,
  status: item.status || 'Planificando',
  channel: item.channel || '',
  metric: item.metric || '',
  notes: item.notes || ''
 };
 const { error } = await supabase.from('marketing_items').upsert(payload);
 if (error) throw error;
 invalidateCache('marketing_items');
 },

 async deleteMarketingItem(id: string): Promise<void> {
 const { error } = await supabase.from('marketing_items').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('marketing_items');
 },

 async insertContact(contact: ClientContact, userId?: string): Promise<void> {
 const serialized = this.serializeContactMetadata(contact);
 const payload = { ...serialized, user_id: userId || null };
 const { error } = await supabase.from('contacts').insert(payload);
 if (error) throw error;
 invalidateCache('contacts');
 },

 async updateContact(contact: ClientContact, userId?: string): Promise<void> {
 const serialized = this.serializeContactMetadata(contact);
 // Prevent overwriting the user_id column or immutable primary key id column on update to allow admins to edit other admins' entries.
 const { user_id, id, ...payload } = serialized;
 const { error } = await supabase.from('contacts').update(payload).eq('id', contact.id);
 if (error) throw error;
 invalidateCache('contacts');
 },

 async deleteContact(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('contacts').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('contacts');
 },

 async deleteClientData(contact: ClientContact, userId?: string): Promise<{
  transactions: number;
  invoices: number;
  events: number;
  projects: number;
  contracts: number;
  comercialLeads: number;
  coldLeads: number;
 }> {
  const normalize = (value?: string) => (value || '').trim().toLocaleLowerCase('es-ES');
  const contactEmail = normalize(contact.email);
  const contactName = normalize(contact.name);
  const contactCompany = normalize(contact.company);
  const matchesClientIdentity = (item: any) => {
   const emailMatch = !!contactEmail && normalize(item.email || item.clientEmail) === contactEmail;
   const nameMatch = !!contactName && normalize(item.name || item.clientName) === contactName;
   const companyMatch = !!contactCompany && normalize(item.company || item.clientName) === contactCompany;
   return emailMatch || (nameMatch && (!contactCompany || companyMatch)) || companyMatch;
  };

  const [transactions, invoices, events, comercialLeads, coldLeads, projects, contracts] = await Promise.all([
   this.getFinanceTransactions(userId),
   this.getFinanceInvoices(userId),
   this.getEvents(userId),
   this.getComercialLeads(),
   this.getColdLeads(),
   this.getProjects(userId),
   this.getContractsAlthera(userId),
  ]);

  const relatedInvoices = invoices.filter(invoice => invoice.clientId === contact.id || matchesClientIdentity(invoice));
  const relatedInvoiceIds = new Set(relatedInvoices.map(invoice => invoice.id));
  const relatedTransactions = transactions.filter(transaction =>
   transaction.clientId === contact.id || (!!transaction.invoiceId && relatedInvoiceIds.has(transaction.invoiceId))
  );
  const relatedEvents = events.filter(event =>
   event.linkedContactId === contact.id || (event.linkedContactIds || []).includes(contact.id)
  );
  const relatedProjects = projects.filter(project => project.clientContactId === contact.id);
  const relatedContracts = contracts.filter(contract =>
   contract.clientId === contact.id || matchesClientIdentity(contract)
  );
   const relatedComercialLeads = comercialLeads.filter(lead =>
    lead.notes?.includes(`[SOURCE_CONTACT_ID:${contact.id}]`) ||
    (!!contact.closingSourceLeadId && lead.notes?.includes(`[SOURCE_COLD_LEAD_ID:${contact.closingSourceLeadId}]`)) ||
    matchesClientIdentity(lead)
   );
  const relatedColdLeads = coldLeads.filter(lead => !!contact.closingSourceLeadId && lead.id === contact.closingSourceLeadId);

  const dependencyDeletes = [
   ...relatedTransactions.map(transaction => this.deleteFinanceTransaction(transaction.id, userId)),
   ...relatedInvoices.map(invoice => this.deleteFinanceInvoice(invoice.id, userId)),
   ...relatedEvents.map(event => this.deleteEvent(event.id, userId)),
   ...relatedProjects.map(project => this.deleteProject(project.id, userId)),
   ...relatedContracts.map(contract => this.deleteContractAlthera(contract.id, userId)),
   ...relatedComercialLeads.map(lead => this.deleteComercialLead(lead.id, userId)),
   ...relatedColdLeads.map(lead => this.deleteColdLead(lead.id, userId)),
  ];
  const results = await Promise.allSettled(dependencyDeletes);
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failures.length) {
   throw new AggregateError(failures.map(result => result.reason), `No se pudieron borrar ${failures.length} registros relacionados con el cliente.`);
  }

  // Delete the contact last so a partial dependency failure can be retried safely.
  await this.deleteContact(contact.id, userId);
  return {
   transactions: relatedTransactions.length,
   invoices: relatedInvoices.length,
   events: relatedEvents.length,
   projects: relatedProjects.length,
   contracts: relatedContracts.length,
   comercialLeads: relatedComercialLeads.length,
   coldLeads: relatedColdLeads.length,
  };
 },

 // --- FINANCE TRANSACTIONS EXTRA HELPERS ---
 // These helpers serialize/deserialize virtual fields into the description column
 // to avoid column-not-found errors on any Supabase DB setup.
 _encodeDescription(description: string, metadata: {
 paymentMethod?: 'cash' | 'transfer';
 firstAmount?: number;
 nextAmount?: number;
 clientId?: string;
 stripePlanId?: string;
 stripeCheckoutUrl?: string;
 stripeCheckoutSessionId?: string;
 stripeInvoiceId?: string;
 stripeInstallmentIndex?: number;
 stripeInstallmentCount?: number;
 invoiceId?: string;
 comercialId?: string;
 comercialEmail?: string;
 isInitialSale?: boolean;
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
 if (metadata.clientId) {
  res += ` [CLIENT:${metadata.clientId}]`;
 }
 if (metadata.stripePlanId) {
  res += ` [STRIPEPLAN:${metadata.stripePlanId}]`;
 }
 if (metadata.stripeCheckoutUrl) {
  res += ` [STRIPEURL:${encodeURIComponent(metadata.stripeCheckoutUrl)}]`;
 }
 if (metadata.stripeCheckoutSessionId) {
  res += ` [STRIPESESSION:${metadata.stripeCheckoutSessionId}]`;
 }
 if (metadata.stripeInvoiceId) {
  res += ` [STRIPEINVOICE:${metadata.stripeInvoiceId}]`;
 }
 if (metadata.stripeInstallmentIndex !== undefined && metadata.stripeInstallmentIndex !== null) {
  res += ` [STRIPEIDX:${metadata.stripeInstallmentIndex}]`;
 }
 if (metadata.stripeInstallmentCount !== undefined && metadata.stripeInstallmentCount !== null) {
  res += ` [STRIPECNT:${metadata.stripeInstallmentCount}]`;
 }
 if (metadata.invoiceId) {
  res += ` [INV:${metadata.invoiceId}]`;
 }
 if (metadata.comercialId) {
  res += ` [COMID:${metadata.comercialId}]`;
 }
 if (metadata.comercialEmail) {
  res += ` [COMEMAIL:${metadata.comercialEmail}]`;
 }
 if (metadata.isInitialSale !== undefined) {
  res += ` [ISINITIAL:${metadata.isInitialSale ? 'true' : 'false'}]`;
 }
 return res;
 },

 _decodeDescription(rawDesc: string): {
 description: string;
 paymentMethod?: 'cash' | 'transfer';
 firstAmount?: number;
 nextAmount?: number;
 clientId?: string;
 stripePlanId?: string;
 stripeCheckoutUrl?: string;
 stripeCheckoutSessionId?: string;
 stripeInvoiceId?: string;
 stripeInstallmentIndex?: number;
 stripeInstallmentCount?: number;
 invoiceId?: string;
 comercialId?: string;
 comercialEmail?: string;
 isInitialSale?: boolean;
 } {
 let cleanDesc = rawDesc || '';
 let paymentMethod: 'cash' | 'transfer' | undefined = undefined;
 let firstAmount: number | undefined = undefined;
 let nextAmount: number | undefined = undefined;
 let clientId: string | undefined = undefined;
 let stripePlanId: string | undefined = undefined;
 let stripeCheckoutUrl: string | undefined = undefined;
 let stripeCheckoutSessionId: string | undefined = undefined;
 let stripeInvoiceId: string | undefined = undefined;
 let stripeInstallmentIndex: number | undefined = undefined;
 let stripeInstallmentCount: number | undefined = undefined;
 let invoiceId: string | undefined = undefined;
 let comercialId: string | undefined = undefined;
 let comercialEmail: string | undefined = undefined;
 let isInitialSale: boolean | undefined = undefined;

 const pmRegex = /\s*\[PM:(cash|transfer)\]/g;
 const faRegex = /\s*\[FA:([\d.]+)\]/g;
 const naRegex = /\s*\[NA:([\d.]+)\]/g;
 const clientRegex = /\s*\[CLIENT:([^\]]+)\]/g;
 const stripePlanRegex = /\s*\[STRIPEPLAN:([^\]]+)\]/g;
 const stripeUrlRegex = /\s*\[STRIPEURL:([^\]]+)\]/g;
 const stripeSessionRegex = /\s*\[STRIPESESSION:([^\]]+)\]/g;
 const stripeInvoiceRegex = /\s*\[STRIPEINVOICE:([^\]]+)\]/g;
 const stripeIdxRegex = /\s*\[STRIPEIDX:(\d+)\]/g;
 const stripeCntRegex = /\s*\[STRIPECNT:(\d+)\]/g;
 const invRegex = /\s*\[INV:([^\]]+)\]/g;
 const comidRegex = /\s*\[COMID:([^\]]+)\]/g;
 const comemailRegex = /\s*\[COMEMAIL:([^\]]+)\]/g;
 const isinitRegex = /\s*\[ISINITIAL:(true|false)\]/g;

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

 while ((match = clientRegex.exec(cleanDesc)) !== null) {
  clientId = match[1];
 }
 cleanDesc = cleanDesc.replace(clientRegex, '');

 while ((match = stripePlanRegex.exec(cleanDesc)) !== null) {
  stripePlanId = match[1];
 }
 cleanDesc = cleanDesc.replace(stripePlanRegex, '');

 while ((match = stripeUrlRegex.exec(cleanDesc)) !== null) {
  try {
  stripeCheckoutUrl = decodeURIComponent(match[1]);
  } catch {
  stripeCheckoutUrl = match[1];
  }
 }
 cleanDesc = cleanDesc.replace(stripeUrlRegex, '');

 while ((match = stripeSessionRegex.exec(cleanDesc)) !== null) {
  stripeCheckoutSessionId = match[1];
 }
 cleanDesc = cleanDesc.replace(stripeSessionRegex, '');

 while ((match = stripeInvoiceRegex.exec(cleanDesc)) !== null) {
  stripeInvoiceId = match[1];
 }
 cleanDesc = cleanDesc.replace(stripeInvoiceRegex, '');

 while ((match = stripeIdxRegex.exec(cleanDesc)) !== null) {
  stripeInstallmentIndex = parseInt(match[1], 10);
 }
 cleanDesc = cleanDesc.replace(stripeIdxRegex, '');

 while ((match = stripeCntRegex.exec(cleanDesc)) !== null) {
  stripeInstallmentCount = parseInt(match[1], 10);
 }
 cleanDesc = cleanDesc.replace(stripeCntRegex, '');

 while ((match = invRegex.exec(cleanDesc)) !== null) {
  invoiceId = match[1];
 }
 cleanDesc = cleanDesc.replace(invRegex, '');

 while ((match = comidRegex.exec(cleanDesc)) !== null) {
  comercialId = match[1];
 }
 cleanDesc = cleanDesc.replace(comidRegex, '');

 while ((match = comemailRegex.exec(cleanDesc)) !== null) {
  comercialEmail = match[1];
 }
 cleanDesc = cleanDesc.replace(comemailRegex, '');

 while ((match = isinitRegex.exec(cleanDesc)) !== null) {
  isInitialSale = match[1] === 'true';
 }
 cleanDesc = cleanDesc.replace(isinitRegex, '');

 return {
  description: cleanDesc.trim(),
  paymentMethod,
  firstAmount,
  nextAmount,
  clientId,
  stripePlanId,
  stripeCheckoutUrl,
  stripeCheckoutSessionId,
  stripeInvoiceId,
  stripeInstallmentIndex,
  stripeInstallmentCount,
  invoiceId,
  comercialId,
  comercialEmail,
  isInitialSale
 };
 },

 // --- FINANCE TRANSACTIONS ---
 async getFinanceTransactions(userId?: string): Promise<FinanceTransaction[]> {
 const cacheKey = 'finance_transactions';
 const cached = getCached<FinanceTransaction[]>(cacheKey);
 if (cached) return cached;

 const { data, error } = await supabase.from('finance_transactions').select('*').order('date', { ascending: false });
 if (error) {
  console.error('finance_transactions table read error:', error);
  throw error;
 }
 const list = (data || []) as any[];
 const result = list.map(tx => {
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
  clientId: decoded.clientId,
  stripePlanId: decoded.stripePlanId,
  stripeCheckoutUrl: decoded.stripeCheckoutUrl,
  stripeCheckoutSessionId: decoded.stripeCheckoutSessionId,
  stripeInvoiceId: decoded.stripeInvoiceId,
  stripeInstallmentIndex: decoded.stripeInstallmentIndex,
  stripeInstallmentCount: decoded.stripeInstallmentCount,
  invoiceId: decoded.invoiceId,
  comercialId: decoded.comercialId,
  comercialEmail: decoded.comercialEmail,
  isInitialSale: decoded.isInitialSale
  };
 });
 setCached(cacheKey, result);
 return result;
 },

 async insertFinanceTransaction(transaction: FinanceTransaction, userId?: string): Promise<void> {
 const { id, type, category, amount, date, description, isRecurring, recurrencePeriod, status } = transaction;
 const { paymentMethod, firstAmount, nextAmount, clientId, stripePlanId, stripeCheckoutUrl, stripeCheckoutSessionId, stripeInvoiceId, stripeInstallmentIndex, stripeInstallmentCount, invoiceId, comercialId, comercialEmail, isInitialSale } = transaction;

 const encodedDesc = this._encodeDescription(description, {
  paymentMethod,
  firstAmount,
  nextAmount,
  clientId,
  stripePlanId,
  stripeCheckoutUrl,
  stripeCheckoutSessionId,
  stripeInvoiceId,
  stripeInstallmentIndex,
  stripeInstallmentCount,
  invoiceId,
  comercialId,
  comercialEmail,
  isInitialSale
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
 invalidateCache('finance_transactions');
 },

 async updateFinanceTransaction(transaction: FinanceTransaction, userId?: string): Promise<void> {
 const { id, type, category, amount, date, description, isRecurring, recurrencePeriod, status } = transaction;
 const { paymentMethod, firstAmount, nextAmount, clientId, stripePlanId, stripeCheckoutUrl, stripeCheckoutSessionId, stripeInvoiceId, stripeInstallmentIndex, stripeInstallmentCount, invoiceId, comercialId, comercialEmail, isInitialSale } = transaction;

 const encodedDesc = this._encodeDescription(description, {
  paymentMethod,
  firstAmount,
  nextAmount,
  clientId,
  stripePlanId,
  stripeCheckoutUrl,
  stripeCheckoutSessionId,
  stripeInvoiceId,
  stripeInstallmentIndex,
  stripeInstallmentCount,
  invoiceId,
  comercialId,
  comercialEmail,
  isInitialSale
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
 invalidateCache('finance_transactions');
 },

 async deleteFinanceTransaction(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('finance_transactions');
 },

 // --- FINANCE INVOICES ---
 async getFinanceInvoices(userId?: string): Promise<Invoice[]> {
 const cacheKey = 'finance_invoices';
 const cached = getCached<Invoice[]>(cacheKey);
 if (cached) return cached;

 const { data, error } = await supabase.from('finance_invoices').select('*').order('date', { ascending: false });
 if (error) {
  console.error('finance_invoices table read error:', error);
  throw error;
 }
 const result = (data || []) as Invoice[];
 setCached(cacheKey, result);
 return result;
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
 invalidateCache('finance_invoices');
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
 invalidateCache('finance_invoices');
 },

 async deleteFinanceInvoice(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('finance_invoices').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('finance_invoices');
 },

 // --- ALTHERA CONTRACTS ---
 async getContractsAlthera(userId?: string): Promise<any[]> {
 const cacheKey = 'contracts_althera';
 const cached = getCached<any[]>(cacheKey);
 if (cached) return cached;

 const { data, error } = await supabase.from('contracts_althera').select('*').order('created_at', { ascending: false });
 if (error) {
  console.warn('contracts_althera table read error:', error.message);
  return [];
 }
 const result = data || [];
 setCached(cacheKey, result);
 return result;
 },

 async insertContractAlthera(contract: any, userId?: string): Promise<void> {
 const payload = { ...contract, user_id: userId || null };
 const { error } = await supabase.from('contracts_althera').insert(payload);
 if (error) throw error;
 invalidateCache('contracts_althera');
 },

 async updateContractAlthera(contract: any, userId?: string): Promise<void> {
 // Prevent overwriting the user_id column on update to allow admins to edit other admins' entries.
 const { user_id, ...payload } = contract;
 const { error } = await supabase.from('contracts_althera').update(payload).eq('id', contract.id);
 if (error) throw error;
 invalidateCache('contracts_althera');
 },

 async deleteContractAlthera(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('contracts_althera').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('contracts_althera');
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
 let assignedUserEmails: string[] = [];
 let meetingUrl: string | undefined = undefined;
 let recurrence: CalendarEvent['recurrence'] = undefined;
 let recurrenceCount: number | undefined = undefined;
 let recurrenceGroupId: string | undefined = undefined;
 let comercialId: string | undefined = undefined;
 let isAllComerciales = false;
 let isAdminNotification = false;
 let notes: string | undefined = undefined;
 let isPrivate = false;
 let whatsappUrl: string | undefined = undefined;
 
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
   if (key === 'assignedUserEmails') assignedUserEmails = val ? val.split(',').map(v => decodeURIComponent(v.trim())).filter(Boolean) : [];
   if (key === 'meetingUrl') meetingUrl = val || undefined;
   if (key === 'recurrence') recurrence = val as CalendarEvent['recurrence'];
   if (key === 'recurrenceCount') recurrenceCount = Number(val) || undefined;
   if (key === 'recurrenceGroupId') recurrenceGroupId = val || undefined;
   if (key === 'comercialId') comercialId = val || undefined;
   if (key === 'isAllComerciales') isAllComerciales = val === 'true';
   if (key === 'isAdminNotification') isAdminNotification = val === 'true';
   if (key === 'notes') notes = val ? decodeURIComponent(val) : undefined;
   if (key === 'isPrivate') isPrivate = val === 'true';
   if (key === 'whatsappUrl') whatsappUrl = val ? decodeURIComponent(val) : undefined;
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
  assignedUserEmails,
  meetingUrl,
  recurrence,
  recurrenceCount,
  recurrenceGroupId,
  comercialId,
  isAllComerciales,
  isAdminNotification,
  notes,
  isPrivate,
  whatsappUrl,
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
 if (event.assignedUserEmails?.length) metadataStr += `\nassignedUserEmails: ${event.assignedUserEmails.map(v => encodeURIComponent(v)).join(',')}`;
 if (event.meetingUrl) metadataStr += `\nmeetingUrl: ${event.meetingUrl}`;
 if (event.recurrence) metadataStr += `\nrecurrence: ${event.recurrence}`;
 if (event.recurrenceCount) metadataStr += `\nrecurrenceCount: ${event.recurrenceCount}`;
 if (event.recurrenceGroupId) metadataStr += `\nrecurrenceGroupId: ${event.recurrenceGroupId}`;
 if (event.comercialId) metadataStr += `\ncomercialId: ${event.comercialId}`;
 if (event.isAllComerciales) metadataStr += `\nisAllComerciales: true`;
 if (event.isAdminNotification) metadataStr += `\nisAdminNotification: true`;
 if (event.notes) metadataStr += `\nnotes: ${encodeURIComponent(event.notes)}`;
 if (event.isPrivate) metadataStr += `\nisPrivate: true`;
 if (event.whatsappUrl) metadataStr += `\nwhatsappUrl: ${encodeURIComponent(event.whatsappUrl)}`;
 
 const cleanDescription = (event.description || '').split('\n\n---METADATA---')[0];
 
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 const dbSafeEvent = {
  id: event.id,
  title: event.title,
  date: event.date,
  time: event.time,
  duration: event.duration,
  type: event.type,
  linkedContactId: event.linkedContactId,
  linkedContactName: event.linkedContactName,
  linkedContactIds: event.linkedContactIds,
  linkedNoteIds: event.linkedNoteIds,
  reminders: event.reminders
 };

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
 const cacheKey = 'events';
 const cached = getCached<CalendarEvent[]>(cacheKey);
 if (cached) return cached;

 let query = supabase.from('events').select('*');
 const { data, error } = await query.order('created_at', { ascending: true });
 if (error) throw error;
 const rawEvents = (data || []) as CalendarEvent[];
 const result = rawEvents.map(e => this.parseEventMetadata(e));
 setCached(cacheKey, result);
 return result;
 },

 async insertEvent(event: CalendarEvent, userId?: string): Promise<void> {
 const serialized = this.serializeEventMetadata(event);
 const { status, parentEventId, ...cleanEvent } = serialized;
 const payload = { ...cleanEvent, user_id: userId || null };
 const { error } = await supabase.from('events').insert(payload);
 if (error) throw error;
 invalidateCache('events');
 },

 async updateEvent(event: CalendarEvent, userId?: string): Promise<void> {
 const serialized = this.serializeEventMetadata(event);
 // Prevent overwriting the user_id column on update to allow admins to edit other admins' entries.
 const { status, parentEventId, user_id, id, ...cleanEvent } = serialized;
 const { error } = await supabase.from('events').update(cleanEvent).eq('id', event.id);
 if (error) throw error;
 invalidateCache('events');
 },

 async deleteEvent(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('events').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('events');
 },

 // --- NOTES ---
 async getNotes(userId?: string): Promise<Note[]> {
 const cacheKey = 'notes';
 const cached = getCached<Note[]>(cacheKey);
 if (cached) return cached;

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

 const result = notes.map(n => this.parseNoteMetadata(n));
 setCached(cacheKey, result);
 return result;
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
 if (!camelError) {
  invalidateCache('notes');
  return;
 }

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
 invalidateCache('notes');
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
 if (!camelError) {
  invalidateCache('notes');
  return;
 }

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
 invalidateCache('notes');
 },

 async deleteNote(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('notes').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('notes');
 },

 // --- ACTIVITIES ---
 async getActivities(userId?: string): Promise<Activity[]> {
 const cacheKey = 'activities';
 const cached = getCached<Activity[]>(cacheKey);
 if (cached) return cached;

 let query = supabase.from('activities').select('*');
 const { data, error } = await query
  .order('created_at', { ascending: false })
  .limit(30);
 if (error) throw error;
 const result = (data || []) as Activity[];
 setCached(cacheKey, result);
 return result;
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
 invalidateCache('activities');
 },

 // --- PROFILES ---
 async getProfiles(): Promise<any[]> {
 const cacheKey = 'profiles';
 const cached = getCached<any[]>(cacheKey);
 if (cached) return cached;

 const { data, error } = await supabase.from('profiles').select('*');
 if (error) {
  console.warn('Profiles table not yet configured or error loading profiles:', error.message);
  return [];
 }
 const result = data || [];
 setCached(cacheKey, result);
 return result;
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
 } else {
  invalidateCache('profiles');
 }
 },

 // --- INQUIRIES (CONTACTOS RECIBIDOS) ---
 async getInquiries(): Promise<InquiryMessage[]> {
 const cacheKey = 'inquiries';
 const cached = getCached<InquiryMessage[]>(cacheKey);
 if (cached) return cached;

 const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
 if (error) {
  // Return memory list fallback or throw
  throw error;
 }
 const result = (data || []).map((row: any) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  message: row.message || '',
  archived: row.archived ?? false,
  created_at: row.created_at || new Date().toISOString()
 })) as InquiryMessage[];
 setCached(cacheKey, result);
 return result;
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
 invalidateCache('inquiries');
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
 invalidateCache('inquiries');
 },

 async deleteInquiry(id: string): Promise<void> {
 const { error } = await supabase.from('inquiries').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('inquiries');
 },

 // --- PROJECTS ---
 async getProjects(userId?: string): Promise<any[]> {
 const cacheKey = 'projects';
 const cached = getCached<any[]>(cacheKey);
 if (cached) return cached;

 const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
 if (error) {
  console.warn('projects table read error:', error.message);
  throw error;
 }
 const result = data || [];
 setCached(cacheKey, result);
 return result;
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
 invalidateCache('projects');
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
 invalidateCache('projects');
 },

 async deleteProject(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('projects').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('projects');
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
  prospectGroupId: lead.prospect_group_id || lead.prospectGroupId || undefined,
  createdAt: lead.created_at || lead.createdAt || new Date().toISOString()
 };
 },

 async getColdLeads(): Promise<ColdCallingLead[]> {
 const cacheKey = 'cold_calling_leads';
 const cached = getCached<ColdCallingLead[]>(cacheKey);
 if (cached) return cached;

 const { data, error } = await supabase.from('cold_calling_leads').select('*').order('created_at', { ascending: false });
 if (error) {
  console.warn('cold_calling_leads table read error:', error.message);
  throw error;
 }
 const raw = data || [];
 const result = raw.map((row: any) => this.parseColdLeadMetadata(row));
 setCached(cacheKey, result);
 return result;
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
  closingOriginComercialEmail: serialized.closingOriginComercialEmail || null,
  closingOriginComercialName: serialized.closingOriginComercialName || null,
 archived: serialized.archived ?? false,
  isDone: serialized.isDone ?? false,
  position: serialized.position ?? null,
  rating: serialized.rating ?? null,
  reviews: serialized.reviews ?? null,
  website: serialized.website || null,
  hasWebsite: serialized.hasWebsite ?? null,
  sourceStatus: serialized.sourceStatus || null,
  info: serialized.info || null,
  mapsUrl: serialized.mapsUrl || null,
  prospect_group_id: serialized.prospectGroupId || null
 };
 const { error } = await supabase.from('cold_calling_leads').insert(payload);
 if (error) throw error;
 invalidateCache('cold_calling_leads');
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
  closingOriginComercialEmail: serialized.closingOriginComercialEmail || null,
  closingOriginComercialName: serialized.closingOriginComercialName || null,
 archived: serialized.archived ?? false,
  isDone: serialized.isDone ?? false,
  position: serialized.position ?? null,
  rating: serialized.rating ?? null,
  reviews: serialized.reviews ?? null,
  website: serialized.website || null,
  hasWebsite: serialized.hasWebsite ?? null,
  sourceStatus: serialized.sourceStatus || null,
  info: serialized.info || null,
  mapsUrl: serialized.mapsUrl || null,
  prospect_group_id: serialized.prospectGroupId || null
 };
 const { error } = await supabase.from('cold_calling_leads').update(payload).eq('id', lead.id);
 if (error) throw error;
 invalidateCache('cold_calling_leads');
 },

 async deleteColdLead(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('cold_calling_leads').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('cold_calling_leads');
 },

 async getColdCallingGroups(ownerEmail: string): Promise<ColdCallingProspectGroup[]> {
  const { data, error } = await supabase.from('cold_calling_groups')
   .select('*')
   .eq('owner_email', ownerEmail.toLowerCase())
   .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
   id: row.id,
   ownerCommercialId: row.owner_commercial_id,
   ownerEmail: row.owner_email,
   ownerName: row.owner_name,
   name: row.name,
   color: row.color,
   createdAt: row.created_at
  }));
 },

 async insertColdCallingGroup(group: ColdCallingProspectGroup): Promise<void> {
  const { error } = await supabase.from('cold_calling_groups').insert({
   id: group.id,
   owner_commercial_id: group.ownerCommercialId,
   owner_email: group.ownerEmail.toLowerCase(),
   owner_name: group.ownerName,
   name: group.name.trim(),
   color: group.color,
   created_at: group.createdAt
  });
  if (error) throw error;
 },

 async updateColdCallingGroup(group: ColdCallingProspectGroup): Promise<void> {
  const { error } = await supabase.from('cold_calling_groups')
   .update({ name: group.name.trim(), color: group.color })
   .eq('id', group.id)
   .eq('owner_email', group.ownerEmail.toLowerCase());
  if (error) throw error;
 },

 async deleteColdCallingGroup(groupId: string, ownerEmail: string): Promise<void> {
  const { error } = await supabase.from('cold_calling_groups')
   .delete()
   .eq('id', groupId)
   .eq('owner_email', ownerEmail.toLowerCase());
  if (error) throw error;
 },

 // --- COMERCIAL LEADS ---
 async getComercialLeads(): Promise<ComercialLead[]> {
 const cacheKey = 'comercial_leads';
 const cached = getCached<ComercialLead[]>(cacheKey);
 if (cached) return cached;

 const { data, error } = await supabase.from('comercial_leads').select('*').order('created_at', { ascending: false });
 if (error) {
  console.warn('comercial_leads table read error:', error.message);
  throw error;
 }
 const result = (data || []).map((row: any) => ({
  ...row,
  createdAt: row.created_at || new Date().toISOString()
 })) as ComercialLead[];
 setCached(cacheKey, result);
 return result;
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
 invalidateCache('comercial_leads');
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
 invalidateCache('comercial_leads');
 },

 async deleteComercialLead(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('comercial_leads').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('comercial_leads');
 },

 // --- COMERCIAL ACCOUNTS ---
 async getComercialesAccounts(): Promise<ComercialAccount[]> {
 const cacheKey = 'comerciales_accounts';
 const cached = getCached<ComercialAccount[]>(cacheKey);
 if (cached) return cached;

 const { data, error } = await supabase.from('comerciales_accounts').select('*').order('created_at', { ascending: false });
 if (error) {
  console.warn('comerciales_accounts table read error:', error.message);
  throw error;
 }
 const result = (data || []).map((row: any) => {
  let phone = row.phone || '';
  let commissionPercentage = 10; // Default commission percentage is 10%
  const commRegex = /\s*\[COMM:([\d.]+)\]/g;
  const commMatch = commRegex.exec(phone);
  if (commMatch) {
  commissionPercentage = parseFloat(commMatch[1]);
  }
  phone = phone.replace(commRegex, '').trim();

  let iban = '';
  const ibanRegex = /\s*\[IBAN:([^\]]+)\]/g;
  const ibanMatch = ibanRegex.exec(phone);
  if (ibanMatch) {
  iban = ibanMatch[1];
  }
  phone = phone.replace(ibanRegex, '').trim();

  let bic = '';
  const bicRegex = /\s*\[BIC:([^\]]+)\]/g;
  const bicMatch = bicRegex.exec(phone);
  if (bicMatch) {
  bic = bicMatch[1];
  }
  phone = phone.replace(bicRegex, '').trim();

  let bankName = '';
  const bankRegex = /\s*\[BANK:([^\]]+)\]/g;
  const bankMatch = bankRegex.exec(phone);
  if (bankMatch) {
  bankName = bankMatch[1];
  }
  phone = phone.replace(bankRegex, '').trim();

  let stripeConnectAccountId = '';
  const stripeAcctRegex = /\s*\[STRIPEACCT:([^\]]+)\]/g;
  const stripeAcctMatch = stripeAcctRegex.exec(phone);
  if (stripeAcctMatch) {
  stripeConnectAccountId = stripeAcctMatch[1];
  }
  phone = phone.replace(stripeAcctRegex, '').trim();

  let stripeOnboardingCompleted = false;
  const stripeOnboardingRegex = /\s*\[STRIPEONBOARDING:(true|false)\]/g;
  const stripeOnboardingMatch = stripeOnboardingRegex.exec(phone);
  if (stripeOnboardingMatch) {
  stripeOnboardingCompleted = stripeOnboardingMatch[1] === 'true';
  }
  phone = phone.replace(stripeOnboardingRegex, '').trim();

  let stripePayoutsEnabled = false;
  const stripePayoutsRegex = /\s*\[STRIPEPAYOUTS:(true|false)\]/g;
  const stripePayoutsMatch = stripePayoutsRegex.exec(phone);
  if (stripePayoutsMatch) {
  stripePayoutsEnabled = stripePayoutsMatch[1] === 'true';
  }
  phone = phone.replace(stripePayoutsRegex, '').trim();

  let stripeChargesEnabled = false;
  const stripeChargesRegex = /\s*\[STRIPECHARGES:(true|false)\]/g;
  const stripeChargesMatch = stripeChargesRegex.exec(phone);
  if (stripeChargesMatch) {
  stripeChargesEnabled = stripeChargesMatch[1] === 'true';
  }
  phone = phone.replace(stripeChargesRegex, '').trim();

  let payouts: any[] = [];
  const payoutsRegex = /\s*\[PAYOUTS:([^\]]+)\]/g;
  const payoutsMatch = payoutsRegex.exec(phone);
  if (payoutsMatch) {
  try {
   payouts = JSON.parse(decodeURIComponent(payoutsMatch[1]));
  } catch (e) {
   console.error('Error parsing comercial payouts metadata', e);
   payouts = [];
  }
  }
  phone = phone.replace(payoutsRegex, '').trim();

  let monthlyPerformance: Record<string, any> = {};
  const performanceRegex = /\s*\[PERF:([^\]]+)\]/g;
  const performanceMatch = performanceRegex.exec(phone);
  if (performanceMatch) {
  try {
   monthlyPerformance = JSON.parse(decodeURIComponent(performanceMatch[1]));
  } catch (e) {
   console.error('Error parsing commercial monthly performance metadata', e);
  }
  }
  phone = phone.replace(performanceRegex, '').trim();

  let legacyBonuses: any[] = [];
  const legacyRegex = /\s*\[LEGACY:([^\]]+)\]/g;
  const legacyMatch = legacyRegex.exec(phone);
  if (legacyMatch) {
  try {
   legacyBonuses = JSON.parse(decodeURIComponent(legacyMatch[1]));
  } catch (e) {
   console.error('Error parsing commercial legacy bonuses metadata', e);
  }
  }
  phone = phone.replace(legacyRegex, '').trim();

  let extraCommissions: any[] = [];
  const extrasRegex = /\s*\[EXTRAS:([^\]]+)\]/g;
  const extrasMatch = extrasRegex.exec(phone);
  if (extrasMatch) {
  try {
   extraCommissions = JSON.parse(decodeURIComponent(extrasMatch[1]));
  } catch (e) {
   console.error('Error parsing commercial extra commissions metadata', e);
  }
  }
  phone = phone.replace(extrasRegex, '').trim();

  let avatarUrl = '';
  const avatarRegex = /\s*\[AVATAR:([^\]]+)\]/g;
  const avatarMatch = avatarRegex.exec(phone);
  if (avatarMatch) {
  try {
   const decodedAvatar = decodeURIComponent(avatarMatch[1]);
   if (decodedAvatar.length <= 410_000 && /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(decodedAvatar)) {
    avatarUrl = decodedAvatar;
   }
  } catch (e) {
   console.error('Error parsing commercial avatar metadata', e);
  }
  }
  phone = phone.replace(avatarRegex, '').trim();

  return {
  ...row,
  avatarUrl: avatarUrl || undefined,
  phone: phone || undefined,
  commissionPercentage,
  iban: iban || undefined,
  bic: bic || undefined,
  bankName: bankName || undefined,
  stripeConnectAccountId: stripeConnectAccountId || undefined,
  stripeOnboardingCompleted,
  stripePayoutsEnabled,
  stripeChargesEnabled,
  payouts,
  monthlyPerformance,
  legacyBonuses,
  extraCommissions,
  createdAt: row.created_at || new Date().toISOString()
  };
 }) as ComercialAccount[];
 setCached(cacheKey, result);
 return result;
 },

 async insertComercialAccount(account: ComercialAccount, userId?: string): Promise<void> {
 let phone = account.phone || '';
 if (account.commissionPercentage !== undefined) {
  phone += ` [COMM:${account.commissionPercentage}]`;
 }
 if (account.iban) {
  phone += ` [IBAN:${account.iban}]`;
 }
 if (account.bic) {
  phone += ` [BIC:${account.bic}]`;
 }
 if (account.bankName) {
  phone += ` [BANK:${account.bankName}]`;
 }
 if (account.stripeConnectAccountId) {
  phone += ` [STRIPEACCT:${account.stripeConnectAccountId}]`;
 }
 if (account.stripeOnboardingCompleted !== undefined) {
  phone += ` [STRIPEONBOARDING:${account.stripeOnboardingCompleted ? 'true' : 'false'}]`;
 }
 if (account.stripePayoutsEnabled !== undefined) {
  phone += ` [STRIPEPAYOUTS:${account.stripePayoutsEnabled ? 'true' : 'false'}]`;
 }
 if (account.stripeChargesEnabled !== undefined) {
  phone += ` [STRIPECHARGES:${account.stripeChargesEnabled ? 'true' : 'false'}]`;
 }
 if (account.payouts && account.payouts.length > 0) {
  phone += ` [PAYOUTS:${encodeURIComponent(JSON.stringify(account.payouts))}]`;
 }
 if (account.monthlyPerformance && Object.keys(account.monthlyPerformance).length > 0) {
  phone += ` [PERF:${encodeURIComponent(JSON.stringify(account.monthlyPerformance))}]`;
 }
 if (account.legacyBonuses && account.legacyBonuses.length > 0) {
  phone += ` [LEGACY:${encodeURIComponent(JSON.stringify(account.legacyBonuses))}]`;
 }
 if (account.extraCommissions && account.extraCommissions.length > 0) {
  phone += ` [EXTRAS:${encodeURIComponent(JSON.stringify(account.extraCommissions))}]`;
 }
 if (account.avatarUrl) {
  phone += ` [AVATAR:${encodeURIComponent(account.avatarUrl)}]`;
 }

 const payload = {
  id: account.id,
  user_id: userId || null,
  name: account.name,
  email: account.email,
  password: account.password || null,
  phone: phone || null
 };
 const { error } = await supabase.from('comerciales_accounts').insert(payload);
 if (error) throw error;
 invalidateCache('comerciales_accounts');
 },

 async updateComercialAccount(account: ComercialAccount, userId?: string): Promise<void> {
 let phone = account.phone || '';
 if (account.commissionPercentage !== undefined) {
  phone += ` [COMM:${account.commissionPercentage}]`;
 }
 if (account.iban) {
  phone += ` [IBAN:${account.iban}]`;
 }
 if (account.bic) {
  phone += ` [BIC:${account.bic}]`;
 }
 if (account.bankName) {
  phone += ` [BANK:${account.bankName}]`;
 }
 if (account.stripeConnectAccountId) {
  phone += ` [STRIPEACCT:${account.stripeConnectAccountId}]`;
 }
 if (account.stripeOnboardingCompleted !== undefined) {
  phone += ` [STRIPEONBOARDING:${account.stripeOnboardingCompleted ? 'true' : 'false'}]`;
 }
 if (account.stripePayoutsEnabled !== undefined) {
  phone += ` [STRIPEPAYOUTS:${account.stripePayoutsEnabled ? 'true' : 'false'}]`;
 }
 if (account.stripeChargesEnabled !== undefined) {
  phone += ` [STRIPECHARGES:${account.stripeChargesEnabled ? 'true' : 'false'}]`;
 }
 if (account.payouts && account.payouts.length > 0) {
  phone += ` [PAYOUTS:${encodeURIComponent(JSON.stringify(account.payouts))}]`;
 }
 if (account.monthlyPerformance && Object.keys(account.monthlyPerformance).length > 0) {
  phone += ` [PERF:${encodeURIComponent(JSON.stringify(account.monthlyPerformance))}]`;
 }
 if (account.legacyBonuses && account.legacyBonuses.length > 0) {
  phone += ` [LEGACY:${encodeURIComponent(JSON.stringify(account.legacyBonuses))}]`;
 }
 if (account.extraCommissions && account.extraCommissions.length > 0) {
  phone += ` [EXTRAS:${encodeURIComponent(JSON.stringify(account.extraCommissions))}]`;
 }
 if (account.avatarUrl) {
  phone += ` [AVATAR:${encodeURIComponent(account.avatarUrl)}]`;
 }

 const payload = {
  name: account.name,
  email: account.email,
  password: account.password || null,
  phone: phone || null
 };
 const { error } = await supabase.from('comerciales_accounts').update(payload).eq('id', account.id);
 if (error) throw error;
 invalidateCache('comerciales_accounts');
 },

 async deleteComercialAccount(id: string, _userId?: string): Promise<void> {
 const { error } = await supabase.from('comerciales_accounts').delete().eq('id', id);
 if (error) throw error;
 invalidateCache('comerciales_accounts');
 },

 // --- COMMERCIAL PRESENCE, WORK SESSIONS & AUDIT ---
 async getCommercialPresence(): Promise<CommercialPresence[]> {
  const { data, error } = await supabase.from('commercial_presence').select('*').order('commercial_name');
  if (error) throw error;
  return (data || []).map(mapCommercialPresence);
 },

 async getCommercialPresenceById(commercialId: string): Promise<CommercialPresence | null> {
  const { data, error } = await supabase.from('commercial_presence').select('*').eq('commercial_id', commercialId).maybeSingle();
  if (error) throw error;
  return data ? mapCommercialPresence(data) : null;
 },

 async setCommercialPresence(account: ComercialAccount, status: CommercialPresenceStatus): Promise<CommercialPresence> {
  const { data, error } = await supabase.rpc('set_commercial_presence', {
   p_commercial_id: account.id,
   p_commercial_email: account.email,
   p_commercial_name: account.name,
   p_status: status
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return mapCommercialPresence(row);
 },

 async heartbeatCommercialPresence(commercialId: string): Promise<void> {
  const { error } = await supabase.rpc('heartbeat_commercial_presence', { p_commercial_id: commercialId });
  if (error) throw error;
 },

 async getCommercialWorkSessions(since?: string, commercialId?: string): Promise<CommercialWorkSession[]> {
  let query = supabase.from('commercial_work_sessions').select('*').order('started_at', { ascending: false }).limit(3000);
  if (since) query = query.gte('started_at', since);
  if (commercialId) query = query.eq('commercial_id', commercialId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapCommercialWorkSession);
 },

 async addCommercialActivityLog(input: {
  commercial: ComercialAccount;
  action: string;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
 }): Promise<CommercialActivityLog> {
  const { data, error } = await supabase.rpc('log_commercial_activity', {
   p_commercial_id: input.commercial.id,
   p_commercial_email: input.commercial.email.toLowerCase(),
   p_commercial_name: input.commercial.name,
   p_action: input.action,
   p_description: input.description,
   p_entity_type: input.entityType || null,
   p_entity_id: input.entityId || null,
   p_metadata: input.metadata || {}
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return mapCommercialActivityLog(row);
 },

 async getCommercialActivityLogs(options: { commercialId?: string; limit?: number; entityType?: string } = {}): Promise<CommercialActivityLog[]> {
  let query = supabase.from('commercial_activity_logs').select('*').order('created_at', { ascending: false }).limit(options.limit || 500);
  if (options.commercialId) query = query.eq('commercial_id', options.commercialId);
  if (options.entityType) query = query.eq('entity_type', options.entityType);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapCommercialActivityLog);
 }
};
