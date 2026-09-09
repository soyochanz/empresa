import type { FinanceTransaction } from '../types';
import { isCashAfterOpening } from './cashOpening';

export const exportSources = {
 all: 'Todos los orígenes', cash: 'Cash', card: 'Tarjetas', revolut_pro: 'Revolut Pro',
 stripe: 'Stripe', carlos_personal: 'Carlos · Cuenta personal', nacho_personal: 'Nacho · Cuenta personal'
};
export type ExportSource = keyof typeof exportSources;
export function matchesExportSource(t: FinanceTransaction, source: ExportSource) {
 if (t.isRecurring) return false;
 if (t.paymentMethod === 'cash' && !isCashAfterOpening(t)) return false;
 if (source === 'all') return true;
 if (source === 'card' || source === 'stripe' || source === 'cash') return t.paymentMethod === source;
 if (source === 'revolut_pro') return t.paymentAccount === source || (
  t.type === 'income' && !t.paymentAccount && (t.paymentMethod === 'transfer' || t.paymentMethod === 'card')
 );
 return t.paymentAccount === source;
}
export function exportTotals(rows: FinanceTransaction[]) {
 const sum = (type: string, status: string) => Math.round(rows.filter(t => t.type === type && t.status === status).reduce((n, t) => n + Number(t.amount || 0), 0) * 100) / 100;
 const income = sum('income', 'paid'), expense = sum('expense', 'paid');
 return { income, expense, net: Math.round((income - expense) * 100) / 100,
  pendingIncome: sum('income', 'pending'), pendingExpense: sum('expense', 'pending'),
  failed: rows.filter(t => t.status === 'failed').length };
}

export async function createMovementPdf(title: string, period: string, totals: ReturnType<typeof exportTotals>, rows: string[][]) {
 const { jsPDF } = await import('jspdf');
 const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
 const money = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
 const widths = [24, 122, 24, 30, 37, 36];
 const heads = ['Fecha', 'Concepto / cliente / factura', 'Tipo', 'Estado', 'Método / cuenta', 'Importe'];
 let y = 0;
 const header = (first: boolean) => {
  doc.setFillColor('#10233d'); doc.rect(0, 0, 297, 29, 'F');
  doc.setTextColor('#ffffff'); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('ALTHERA · ' + title, 12, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(period, 12, 22);
  y = 37;
  if (first) {
   const metrics = [['Ingresos cobrados', money(totals.income)], ['Gastos pagados', money(totals.expense)], ['Flujo neto realizado', money(totals.net)]];
   metrics.forEach(([label, value], i) => {
    const x = 12 + i * 92;
    doc.setFillColor('#eff6ff'); doc.roundedRect(x, y, 88, 23, 2, 2, 'F');
    doc.setTextColor('#475569'); doc.setFontSize(9); doc.text(label, x + 5, y + 7);
    doc.setTextColor('#0f766e'); doc.setFontSize(16); doc.text(value, x + 5, y + 17);
   });
   y += 31; doc.setTextColor('#475569'); doc.setFontSize(9);
   doc.text(`Por cobrar: ${money(totals.pendingIncome)}   |   Por pagar: ${money(totals.pendingExpense)}   |   Denegados: ${totals.failed}   |   Movimientos: ${rows.length}`, 12, y);
   y += 7; doc.text('Movimientos registrados en Althera. Pendientes y denegados excluidos del flujo realizado. No representa el saldo bancario.', 12, y);
   y += 8;
  }
  doc.setFillColor('#0f766e'); doc.rect(12, y, 273, 8, 'F'); doc.setTextColor('#ffffff'); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  let x = 12; heads.forEach((h, i) => { doc.text(h, x + 2, y + 5); x += widths[i]; }); y += 8;
 };
 header(true);
 rows.forEach((row, index) => {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  const lines = row.map((s, i) => doc.splitTextToSize(s, widths[i] - 4) as string[]);
  // Split very long descriptions across pages without dropping text.
  let offset = 0; const count = Math.max(...lines.map(l => l.length));
  while (offset < count) {
   if (y + 9 > 192) headerAfterBreak();
   const take = Math.min(count - offset, Math.max(1, Math.floor((192 - y - 4) / 4)));
   const height = take * 4 + 4;
   if (index % 2 === 0) { doc.setFillColor('#f0fdfa'); doc.rect(12, y, 273, height, 'F'); }
   doc.setTextColor('#0f172a'); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
   let x = 12; lines.forEach((l, i) => { doc.text(l.slice(offset, offset + take), i === 5 ? x + widths[i] - 2 : x + 2, y + 5, { align: i === 5 ? 'right' : 'left' }); x += widths[i]; });
   y += height; offset += take;
  }
 });
 function headerAfterBreak() { doc.addPage(); header(false); }
 const pages = doc.getNumberOfPages();
 for (let p = 1; p <= pages; p++) {
  doc.setPage(p); doc.setFontSize(8); doc.setTextColor('#64748b');
  doc.text(`Generado ${new Date().toLocaleString('es-ES')} · Althera`, 12, 202);
  doc.text(`${p} / ${pages}`, 285, 202, { align: 'right' });
 }
 return doc;
}
