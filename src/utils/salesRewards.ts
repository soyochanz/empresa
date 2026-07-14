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

export function calculateLegacyPoints(
  comercial: ComercialAccount,
  transactions: FinanceTransaction[] | any[],
  events: CalendarEvent[],
  coldLeads: ColdCallingLead[] = [],
  contacts: ClientContact[] = [],
): LegacyPointsResult {
  const sales = transactions.filter(tx => isCollectedSale(tx) &&
    (tx.comercialId === comercial.id || tx.comercialEmail?.toLowerCase() === comercial.email.toLowerCase()));
  // PA are whole consolidated euros: 1.99 EUR remains 1 PA until it reaches 2.00 EUR.
  const cashCollected = Math.floor(sales.reduce((sum, tx) => sum + Number(tx.amount || 0), 0));
  const assignedEvents = events.filter(event => event.comercialId === comercial.id || event.assignedUserEmail?.toLowerCase() === comercial.email.toLowerCase());
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
  const raw = comerciales.map(comercial => {
    const review = comercial.monthlyPerformance?.[month];
    const cashCollected = Math.floor(transactions
      .filter(tx => isCollectedSale(tx) && belongsToMonth(tx.date, month) &&
        (tx.comercialId === comercial.id || tx.comercialEmail?.toLowerCase() === comercial.email.toLowerCase()))
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0));
    const appointments = events.filter(event => belongsToMonth(event.date, month) &&
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
