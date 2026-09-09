import { getFinanceRecurrenceDate, toFinanceDateKey } from './financeRecurrence';

export interface ForecastSubscription {
 id: string; customerName: string; status: string; amount: number; currency: string;
 interval: string; intervalCount: number; nextPaymentAt?: string | null;
 lastPaidAt: string | null; endsAt: string | null; cancelAt?: string | null;
 paymentLimit: number | null; paymentCount: number;
}

export function getStripeForecastOccurrences(plan: ForecastSubscription, monthKey: string, today = new Date()): Date[] {
 if (!['active', 'trialing', 'past_due'].includes(plan.status) || plan.currency.toLowerCase() !== 'eur' || plan.amount <= 0) return [];
 const anchorValue = plan.nextPaymentAt || plan.lastPaidAt;
 if (!anchorValue) return [];
 const anchor = new Date(anchorValue);
 if (!Number.isFinite(anchor.getTime())) return [];
 const step = Math.max(1, plan.intervalCount || 1);
 const startIndex = plan.nextPaymentAt ? 0 : 1;
 const remaining = plan.paymentLimit ? Math.max(0, plan.paymentLimit - plan.paymentCount) : Infinity;
 const dates: Date[] = [];
 for (let index = startIndex; index < startIndex + Math.min(10000, remaining); index++) {
  let date: Date;
  if (plan.interval === 'day' || plan.interval === 'week') {
   date = new Date(anchor);
   date.setDate(anchor.getDate() + index * step * (plan.interval === 'week' ? 7 : 1));
  } else {
   date = getFinanceRecurrenceDate(anchor, plan.interval === 'year' ? 'yearly' : 'monthly', index * step);
  }
  const key = toFinanceDateKey(date);
  if (key.slice(0, 7) > monthKey) break;
  if (plan.endsAt && key > plan.endsAt.slice(0, 10)) break;
  if (plan.cancelAt && date.getTime() >= Date.parse(plan.cancelAt)) break;
  if (key.slice(0, 7) === monthKey && key >= toFinanceDateKey(today)) dates.push(date);
 }
 return dates;
}
