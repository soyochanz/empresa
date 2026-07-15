import { CalendarEvent, ClientContact, ColdCallingLead, ComercialAccount, FinanceTransaction } from '../types';

export interface SalesRewardRow {
  comercial: ComercialAccount;
  cashCollected: number;
  appointments: number;
  showRate: number;
  professionalism: number;
  calls: number;
  conversations: number;
  effectiveHours: number;
  score: number;
  eligible: boolean;
  cashPrize: number;
}

const isCollectedSale = (tx: any) =>
  tx.type === 'income' && tx.status === 'paid' && tx.isInitialSale === true;

const TEST_COMMERCIAL_EMAILS = new Set(['carlosronco14@gmail.com', 'ochanypunto@gmail.com']);
const TEST_COMMERCIAL_NAMES = new Set(['carlos ronco meneses', 'nacho']);

export const isTestCommercial = (comercial: Pick<ComercialAccount, 'email' | 'name'>): boolean =>
  TEST_COMMERCIAL_EMAILS.has((comercial.email || '').trim().toLowerCase()) ||
  TEST_COMMERCIAL_NAMES.has((comercial.name || '').trim().toLowerCase());

export const getRankableCommercials = (comerciales: ComercialAccount[]): ComercialAccount[] =>
  comerciales.filter(comercial => !isTestCommercial(comercial));

export const getInitialSaleKey = (tx: any): string =>
  String(tx.invoiceId || tx.stripePlanId || tx.clientId || tx.id);

export const countUniqueInitialSales = (transactions: FinanceTransaction[] | any[]): number =>
  new Set(transactions.filter(tx => tx.type === 'income' && tx.isInitialSale === true).map(getInitialSaleKey)).size;

const isSalesAppointmentEvent = (event: CalendarEvent) =>
  event.id?.startsWith('cc_appointment_') ||
  event.id?.startsWith('cc_reschedule_') ||
  event.alias === 'Cita Cold Calling' ||
  event.alias === 'Closing Reagendado' ||
  event.linkedContactId?.startsWith('crm_from_');

export const LEGACY_RANKS = [
  { name: 'Rookie', min: 0, max: 5000, asset: '/assets/ranks/rookie.png', accent: '#e2e8f0' },
  { name: 'Bronce', min: 5000, max: 20000, asset: '/assets/ranks/bronze.png', accent: '#d97706' },
  { name: 'Plata', min: 20000, max: 50000, asset: '/assets/ranks/silver.png', accent: '#bfdbfe' },
  { name: 'Oro', min: 50000, max: 100000, asset: '/assets/ranks/gold.png', accent: '#fbbf24' },
  { name: 'Diamante', min: 100000, max: 250000, asset: '/assets/ranks/diamond.png', accent: '#67e8f9' },
  { name: 'Legend', min: 250000, max: Infinity, asset: '/assets/ranks/legend.png', accent: '#c084fc' },
] as const;

export interface LegacyPointsResult {
 total: number;
 cashPoints: number;
 agendaPoints: number;
 showPoints: number;
 salesPoints: number;
 manualPoints: number;
 cashCollected: number;
 agendas: number;
 shows: number;
 sales: number;
 rank: typeof LEGACY_RANKS[number];
 nextRank?: typeof LEGACY_RANKS[number];
 progress: number;
 pointsToNext: number;
}

export interface LegacyPointEntry {
 id: string;
 date: string;
 category: 'cash' | 'agenda' | 'show' | 'sale' | 'manual';
 label: string;
 detail: string;
 points: number;
 automatic: boolean;
}

export function calculateLegacyPoints(
  comercial: ComercialAccount,
  transactions: FinanceTransaction[] | any[],
  events: CalendarEvent[],
  coldLeads: ColdCallingLead[] = [],
  contacts: ClientContact[] = [],
): LegacyPointsResult {
  const paidSaleTransactions = transactions.filter(tx => isCollectedSale(tx) &&
    (tx.comercialId === comercial.id || tx.comercialEmail?.toLowerCase() === comercial.email.toLowerCase()));
  const sales = Array.from(new Map(paidSaleTransactions.map(tx => [getInitialSaleKey(tx), tx])).values());
  // PA are whole consolidated euros: 1.99 EUR remains 1 PA until it reaches 2.00 EUR.
  const cashCollected = Math.floor(paidSaleTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0));
  const assignedEvents = events.filter(event => isSalesAppointmentEvent(event) &&
    (event.comercialId === comercial.id || event.assignedUserEmail?.toLowerCase() === comercial.email.toLowerCase()));
  const commercialEmail = comercial.email.toLowerCase();
  const scheduledLeadIds = new Set(coldLeads
    .filter(lead => lead.callbackScheduled === 'Sí' && (
      lead.assignedToEmail?.toLowerCase() === commercialEmail ||
      lead.closingOriginComercialEmail?.toLowerCase() === commercialEmail
    ))
    .map(lead => lead.id));
  // A Show exists only when the closer explicitly confirms that the client answered
  // on a genuinely scheduled appointment. Calendar completion alone is not evidence.
  const shows = new Set(contacts
    .filter(contact => contact.closingAnswered === true && !!contact.closingSourceLeadId && scheduledLeadIds.has(contact.closingSourceLeadId))
    .map(contact => contact.closingSourceLeadId)).size;
  const manualPoints = (comercial.legacyBonuses || []).reduce((sum, bonus) => sum + Number(bonus.points || 0), 0);
  const cashPoints = cashCollected;
  const agendaPoints = assignedEvents.length * 50;
  const showPoints = shows * 75;
  const salesPoints = sales.length * 250;
  const total = cashPoints + agendaPoints + showPoints + salesPoints + manualPoints;
  const rankIndex = Math.max(0, LEGACY_RANKS.findIndex(item => total >= item.min && total < item.max));
  const rank = LEGACY_RANKS[rankIndex];
  const nextRank = LEGACY_RANKS[rankIndex + 1];
  const progress = nextRank ? Math.min(100, ((total - rank.min) / (nextRank.min - rank.min)) * 100) : 100;
  return { total, cashPoints, agendaPoints, showPoints, salesPoints, manualPoints, cashCollected, agendas: assignedEvents.length, shows, sales: sales.length, rank, nextRank, progress, pointsToNext: nextRank ? Math.max(0, nextRank.min - total) : 0 };
}

export function buildLegacyPointLedger(
  comercial: ComercialAccount,
  transactions: FinanceTransaction[] | any[],
  events: CalendarEvent[],
  coldLeads: ColdCallingLead[] = [],
  contacts: ClientContact[] = [],
): LegacyPointEntry[] {
  const commercialEmail = comercial.email.toLowerCase();
  const paidSaleTransactions = transactions.filter(tx => isCollectedSale(tx) &&
    (tx.comercialId === comercial.id || tx.comercialEmail?.toLowerCase() === commercialEmail));
  const sales = Array.from(new Map(paidSaleTransactions.map(tx => [getInitialSaleKey(tx), tx])).values());
  const assignedEvents = events.filter(event => isSalesAppointmentEvent(event) &&
    (event.comercialId === comercial.id || event.assignedUserEmail?.toLowerCase() === commercialEmail));
  const scheduledLeadIds = new Set(coldLeads
    .filter(lead => lead.callbackScheduled === 'Sí' && (
      lead.assignedToEmail?.toLowerCase() === commercialEmail ||
      lead.closingOriginComercialEmail?.toLowerCase() === commercialEmail
    ))
    .map(lead => lead.id));
  const showContacts = Array.from(new Map(contacts
    .filter(contact =>
      contact.closingAnswered === true &&
      !!contact.closingSourceLeadId &&
      scheduledLeadIds.has(contact.closingSourceLeadId)
    )
    .map(contact => [contact.closingSourceLeadId as string, contact])).values());
  const cashCollected = Math.floor(paidSaleTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0));
  const latestSaleDate = paidSaleTransactions.map(tx => String(tx.date || '')).sort().at(-1) || '';
  const entries: LegacyPointEntry[] = [];

  if (cashCollected > 0) {
    entries.push({
      id: `cash_${comercial.id}`,
      date: latestSaleDate,
      category: 'cash',
      label: 'Cash Collected consolidado',
      detail: `${paidSaleTransactions.length} cobro${paidSaleTransactions.length === 1 ? '' : 's'} pagado${paidSaleTransactions.length === 1 ? '' : 's'} · ${cashCollected.toLocaleString('es-ES')} € computables`,
      points: cashCollected,
      automatic: true,
    });
  }

  assignedEvents.forEach(event => entries.push({
    id: `agenda_${event.id}`,
    date: event.date,
    category: 'agenda',
    label: 'Agenda conseguida',
    detail: event.linkedContactName || event.title || 'Cita comercial',
    points: 50,
    automatic: true,
  }));
  showContacts.forEach(contact => entries.push({
    id: `show_${contact.closingSourceLeadId}`,
    date: contact.addedDate || '',
    category: 'show',
    label: 'Show confirmado por closer',
    detail: `${contact.company || contact.name} · el cliente contestó`,
    points: 75,
    automatic: true,
  }));
  sales.forEach(tx => entries.push({
    id: `sale_${tx.id}`,
    date: String(tx.date || ''),
    category: 'sale',
    label: 'Venta cerrada y cobrada',
    detail: tx.description || `${Number(tx.amount || 0).toLocaleString('es-ES')} € cobrados`,
    points: 250,
    automatic: true,
  }));
  (comercial.legacyBonuses || []).forEach(bonus => {
    const labels: Record<string, string> = {
      sale_assist: 'Ayudar a cerrar una venta',
      training: 'Completar formación',
      monthly_idea: 'Mejor idea del mes',
    };
    entries.push({
      id: bonus.id,
      date: bonus.date,
      category: 'manual',
      label: labels[bonus.type] || 'Bonificación manual',
      detail: bonus.note || `${bonus.quantity} reconocimiento${bonus.quantity === 1 ? '' : 's'}`,
      points: Number(bonus.points || 0),
      automatic: false,
    });
  });

  return entries.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));
}

export const getMonthKey = (value: unknown): string => {
  if (!value) return '';
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`;
  const spanishMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (spanishMatch) return `${spanishMatch[3]}-${spanishMatch[2].padStart(2, '0')}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
};

const belongsToMonth = (value: string | undefined, month: string) => getMonthKey(value) === month;

export function buildSalesRewards(
  comerciales: ComercialAccount[],
  transactions: FinanceTransaction[] | any[],
  events: CalendarEvent[],
  coldLeads: ColdCallingLead[],
  month: string,
): SalesRewardRow[] {
  const raw = getRankableCommercials(comerciales).map(comercial => {
    const review = comercial.monthlyPerformance?.[month];
    const cashCollected = Math.floor(transactions
      .filter(tx => isCollectedSale(tx) && belongsToMonth(tx.date, month) &&
        (tx.comercialId === comercial.id || tx.comercialEmail?.toLowerCase() === comercial.email.toLowerCase()))
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0));
    const appointments = events.filter(event => isSalesAppointmentEvent(event) && belongsToMonth(event.date, month) &&
      (event.comercialId === comercial.id || event.assignedUserEmail?.toLowerCase() === comercial.email.toLowerCase())).length;
    const monthlyColdLeads = coldLeads.filter(lead => belongsToMonth(lead.callDate || lead.createdAt, month) &&
      lead.assignedToEmail?.toLowerCase() === comercial.email.toLowerCase());
    const calls = monthlyColdLeads.reduce((sum, lead) => sum + Number(lead.callsCount || 0), 0);
    const conversations = monthlyColdLeads.filter(lead => lead.contacted === 'Sí' || lead.answered === 'Sí').length;

    return {
      comercial,
      cashCollected,
      appointments,
      showRate: Number(review?.showRate || 0),
      professionalism: Number(review?.professionalism || 0),
      calls,
      conversations,
      effectiveHours: Number(review?.effectiveHours || 0),
    };
  });

  const maxCash = Math.max(1, ...raw.map(row => row.cashCollected));
  const maxAppointments = Math.max(1, ...raw.map(row => row.appointments));
  const cashOrder = [...raw].sort((a, b) => b.cashCollected - a.cashCollected);

  return raw.map(row => {
    const score = (row.cashCollected / maxCash) * 50 + (row.appointments / maxAppointments) * 20 +
      (row.showRate / 100) * 15 + (row.professionalism / 10) * 15;
    const cashPosition = cashOrder.findIndex(item => item.comercial.id === row.comercial.id);
    return {
      ...row,
      score: Math.round(score * 10) / 10,
      eligible: row.professionalism >= 8,
      cashPrize: row.cashCollected > 0 ? ([200, 100, 50][cashPosition] || 0) : 0,
    };
  }).sort((a, b) => b.score - a.score);
}
