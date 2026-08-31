import { supabase } from '../supabaseClient';
import { AuditActorType, AuditLog, AuditLogActor, AuditSeverity, AuditSource } from '../types';

const MAX_PENDING_LOGS = 500;
const BATCH_SIZE = 25;
const FLUSH_DELAY_MS = 5_000;
const DUPLICATE_WINDOW_MS = 1_500;

type AuditContext = {
 enabled: boolean;
 actorType: AuditActorType;
 actorId?: string;
 actorName: string;
 actorEmail?: string;
 screen?: string;
};

type AuditInput = {
 actorType?: AuditActorType;
 actorId?: string;
 actorName?: string;
 actorEmail?: string;
 source: AuditSource;
 action: string;
 description: string;
 entityType?: string;
 entityId?: string;
 screen?: string;
 severity?: AuditSeverity;
 metadata?: Record<string, unknown>;
 dedupe?: boolean;
};

export type AuditLogFilters = {
 page: number;
 pageSize: number;
 search?: string;
 actorType?: AuditActorType | 'all';
 actorEmail?: string;
 source?: AuditSource | 'all';
};

let context: AuditContext = {
 enabled: false,
 actorType: 'system',
 actorName: 'Sistema Althera'
};
let flushTimer: number | undefined;
let flushing = false;
let retryAfter = 0;
const recentEvents = new Map<string, number>();
let pendingLogs: AuditLog[] = [];

const createId = () => {
 if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
 return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const safeMetadata = (metadata: Record<string, unknown> = {}) => {
 const clean: Record<string, unknown> = {};
 Object.entries(metadata).slice(0, 16).forEach(([key, value]) => {
  if (/password|secret|token|credential|authorization|cookie/i.test(key)) return;
  if (typeof value === 'string') clean[key] = value.slice(0, 300);
  else if (typeof value === 'number' || typeof value === 'boolean' || value === null) clean[key] = value;
  else if (Array.isArray(value)) clean[key] = value.slice(0, 12).map(item => typeof item === 'string' ? item.slice(0, 100) : item);
 });
 return clean;
};

const readPending = (): AuditLog[] => {
 return pendingLogs;
};

const writePending = (logs: AuditLog[]) => {
 pendingLogs = logs.slice(-MAX_PENDING_LOGS);
};

const toRow = (log: AuditLog) => ({
 id: log.id,
 actor_type: log.actorType,
 actor_id: log.actorId || null,
 actor_name: log.actorName,
 actor_email: log.actorEmail || null,
 source: log.source,
 action: log.action,
 description: log.description,
 entity_type: log.entityType || null,
 entity_id: log.entityId || null,
 screen: log.screen || null,
 severity: log.severity,
 metadata: log.metadata,
 created_at: log.createdAt
});

const fromRow = (row: any): AuditLog => ({
 id: row.id,
 actorType: row.actor_type,
 actorId: row.actor_id || undefined,
 actorName: row.actor_name || 'Sistema Althera',
 actorEmail: row.actor_email || undefined,
 source: row.source,
 action: row.action,
 description: row.description,
 entityType: row.entity_type || undefined,
 entityId: row.entity_id || undefined,
 screen: row.screen || undefined,
 severity: row.severity || 'info',
 metadata: row.metadata || {},
 createdAt: row.created_at
});

const isUnavailableTableError = (error: any) => {
 const message = String(error?.message || '').toLowerCase();
 return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('audit_logs') || message.includes('schema cache');
};

const scheduleFlush = () => {
 if (flushTimer || flushing || typeof window === 'undefined') return;
 const delay = Math.max(FLUSH_DELAY_MS, retryAfter - Date.now());
 flushTimer = window.setTimeout(() => {
  flushTimer = undefined;
  void flushAuditLogs();
 }, delay);
};

export const setAuditContext = (next: Partial<AuditContext>) => {
 context = { ...context, ...next };
};

export const recordAuditEvent = (input: AuditInput) => {
 // The public login screens have no active session context yet. Allow only
 // explicitly identified authentication events so remote login attempts can
 // still be reviewed by an authenticated administrator.
 const isIdentifiedPublicAuthEvent = input.source === 'auth' && Boolean(input.actorEmail?.trim());
 if (!context.enabled && !isIdentifiedPublicAuthEvent) return;

 const actorType = input.actorType || context.actorType;
 const actorName = input.actorName || (actorType === 'system' ? 'Sistema Althera' : context.actorName);
 const dedupeKey = `${actorType}:${input.source}:${input.action}:${input.description}:${input.screen || context.screen || ''}`;
 const now = Date.now();
 if (input.dedupe !== false && now - (recentEvents.get(dedupeKey) || 0) < DUPLICATE_WINDOW_MS) return;
 recentEvents.set(dedupeKey, now);
 if (recentEvents.size > 120) {
  for (const [key, timestamp] of recentEvents) if (now - timestamp > 60_000) recentEvents.delete(key);
 }

 const log: AuditLog = {
  id: createId(),
  actorType,
  actorId: input.actorId ?? (actorType === 'user' ? context.actorId : undefined),
  actorName,
  actorEmail: input.actorEmail ?? (actorType === 'user' ? context.actorEmail : undefined),
  source: input.source,
  action: input.action.slice(0, 80),
  description: input.description.slice(0, 500),
  entityType: input.entityType?.slice(0, 80),
  entityId: input.entityId?.slice(0, 160),
  screen: (input.screen || context.screen)?.slice(0, 80),
  severity: input.severity || 'info',
  metadata: safeMetadata(input.metadata),
  createdAt: new Date().toISOString()
 };

 const nextPending = [...readPending(), log];
 writePending(nextPending);
 if (nextPending.length >= BATCH_SIZE) void flushAuditLogs();
 else scheduleFlush();
};

export const flushAuditLogs = async () => {
 if (flushing) return;
 if (Date.now() < retryAfter) {
  scheduleFlush();
  return;
 }
 const pending = readPending();
 if (!pending.length) return;
 flushing = true;
 try {
  const batch = pending.slice(0, BATCH_SIZE);
  const { error } = await supabase.from('audit_logs').insert(batch.map(toRow));
  if (error) {
   retryAfter = Date.now() + (isUnavailableTableError(error) ? 60_000 : 15_000);
   if (!isUnavailableTableError(error)) console.warn('No se pudo enviar el registro de actividad:', error.message);
   return;
  }
  retryAfter = 0;
  const insertedIds = new Set(batch.map(log => log.id));
  writePending(readPending().filter(log => !insertedIds.has(log.id)));
  if (readPending().length) scheduleFlush();
 } finally {
  flushing = false;
  if (readPending().length) scheduleFlush();
 }
};

const localPage = (filters: AuditLogFilters) => {
 const search = filters.search?.trim().toLowerCase();
 const filtered = readPending().filter(log => {
  if (filters.actorType && filters.actorType !== 'all' && log.actorType !== filters.actorType) return false;
  if (filters.actorEmail && log.actorEmail !== filters.actorEmail) return false;
  if (filters.source && filters.source !== 'all' && log.source !== filters.source) return false;
  if (search && !`${log.action} ${log.description} ${log.actorName} ${log.actorEmail || ''} ${log.screen || ''}`.toLowerCase().includes(search)) return false;
  return true;
 }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
 const from = (filters.page - 1) * filters.pageSize;
 return { logs: filtered.slice(from, from + filters.pageSize), total: filtered.length, localOnly: true };
};

export const getAuditLogs = async (filters: AuditLogFilters): Promise<{ logs: AuditLog[]; total: number; localOnly: boolean }> => {
 let query = supabase.from('audit_logs').select('*', { count: 'estimated' });
 if (filters.search?.trim()) query = query.textSearch('search_document', filters.search.trim(), { type: 'websearch', config: 'simple' });
 if (filters.actorType && filters.actorType !== 'all') query = query.eq('actor_type', filters.actorType);
 if (filters.actorEmail) query = query.eq('actor_email', filters.actorEmail);
 if (filters.source && filters.source !== 'all') query = query.eq('source', filters.source);
 const from = (filters.page - 1) * filters.pageSize;
 const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + filters.pageSize - 1);
 if (error) {
  if (isUnavailableTableError(error) || error.code === '42501') return localPage(filters);
  throw error;
 }
 return { logs: (data || []).map(fromRow), total: count || 0, localOnly: false };
};

export const getAuditActors = async (): Promise<AuditLogActor[]> => {
 const { data, error } = await supabase.from('audit_logs').select('actor_id, actor_name, actor_email, actor_type').eq('actor_type', 'user').order('created_at', { ascending: false }).limit(500);
 const rows = error ? readPending().filter(log => log.actorType === 'user').map(toRow) : (data || []);
 const actors = new Map<string, AuditLogActor>();
 rows.forEach((row: any) => {
  const key = row.actor_email || row.actor_id || row.actor_name;
  if (key && !actors.has(key)) actors.set(key, { id: row.actor_id || undefined, name: row.actor_name || row.actor_email || 'Usuario', email: row.actor_email || undefined, type: 'user' });
 });
 return Array.from(actors.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
};

const getElementLabel = (element: Element) => {
 const aria = element.getAttribute('aria-label') || element.getAttribute('title');
 if (aria) return aria.trim().slice(0, 140);
 const text = element.textContent?.replace(/\s+/g, ' ').trim();
 return text?.slice(0, 140) || element.tagName.toLowerCase();
};

export const installAuditTracking = () => {
 const onClick = (event: Event) => {
  const origin = event.target instanceof Element ? event.target : null;
  const interactive = origin?.closest('button, a, [role="button"], input[type="button"], input[type="submit"]');
  if (!interactive || interactive.closest('[data-audit-ignore]')) return;
  const label = getElementLabel(interactive);
  recordAuditEvent({
   source: 'ui',
   action: 'interaction',
   description: `Acción: ${label}`,
   entityType: interactive.tagName.toLowerCase(),
   metadata: { path: window.location.pathname, label }
  });
 };
 const onSubmit = (event: Event) => {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form || form.closest('[data-audit-ignore]')) return;
  const label = form.getAttribute('aria-label') || form.id || 'Formulario';
  recordAuditEvent({ source: 'ui', action: 'form_submit', description: `Formulario enviado: ${label}`, entityType: 'form', metadata: { path: window.location.pathname } });
 };
 const onError = (event: ErrorEvent) => recordAuditEvent({ actorType: 'system', source: 'system', action: 'client_error', description: event.message || 'Error no identificado en el navegador', severity: 'error', metadata: { file: event.filename, line: event.lineno, path: window.location.pathname }, dedupe: false });
 const onRejection = (event: PromiseRejectionEvent) => {
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason || 'Promesa rechazada');
  recordAuditEvent({ actorType: 'system', source: 'system', action: 'promise_rejection', description: message, severity: 'error', metadata: { path: window.location.pathname }, dedupe: false });
  const toast = document.getElementById('toast-msg');
  if (toast) {
   toast.textContent = `No se guardó el cambio. Supabase no confirmó la operación: ${message}`;
   toast.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
   toast.classList.add('opacity-100');
   window.setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'pointer-events-none');
   }, 5000);
  }
 };
 const onOnline = () => recordAuditEvent({ actorType: 'system', source: 'system', action: 'network_online', description: 'La conexión de red se ha restablecido.' });
 const onOffline = () => recordAuditEvent({ actorType: 'system', source: 'system', action: 'network_offline', description: 'El dispositivo ha perdido la conexión de red.', severity: 'warning' });
 const onVisibility = () => { if (document.visibilityState === 'hidden') void flushAuditLogs(); };

 document.addEventListener('click', onClick, true);
 document.addEventListener('submit', onSubmit, true);
 window.addEventListener('error', onError);
 window.addEventListener('unhandledrejection', onRejection);
 window.addEventListener('online', onOnline);
 window.addEventListener('offline', onOffline);
 document.addEventListener('visibilitychange', onVisibility);
 return () => {
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('submit', onSubmit, true);
  window.removeEventListener('error', onError);
  window.removeEventListener('unhandledrejection', onRejection);
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
  document.removeEventListener('visibilitychange', onVisibility);
  void flushAuditLogs();
 };
};
