import type { ComercialAccount, FinanceTransaction, PayoutTransaction } from '../types';

export const isCommercialCashout = (transaction: FinanceTransaction): boolean =>
 transaction.id.startsWith('tx_commercial_payout_');

// Stripe transfers are already reflected in Stripe's live balance.
export function buildCommercialCashout(account: Pick<ComercialAccount, 'id' | 'name' | 'email'>, payout: PayoutTransaction): FinanceTransaction | null {
 if (payout.status !== 'completed' || payout.paymentMethod === 'stripe' || payout.stripeTransferId?.startsWith('tr_')) return null;
 if (payout.paymentMethod !== 'cash' && payout.paymentMethod !== 'transfer') return null;
 const amount = Math.round(Number(payout.amount) * 100) / 100;
 if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(Date.parse(payout.date))) throw new Error(`Cashout inválido: ${payout.id}`);
 return {
  id: `tx_commercial_payout_${account.id}_${payout.id}`,
  type: 'expense', category: 'Liquidación comercial', amount,
  date: payout.date.slice(0, 10), paidAt: payout.date,
  description: `Cashout comercial · ${account.name}`,
  status: 'paid', isRecurring: false,
  paymentMethod: payout.paymentMethod,
  paymentAccount: payout.paymentMethod === 'transfer' ? 'revolut_pro' : undefined,
  comercialId: account.id, comercialEmail: account.email,
 };
}
