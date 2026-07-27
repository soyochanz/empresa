import { ClientContact, ColdCallingLead, ComercialAccount, ComercialLead } from '../types';
import { countUniqueInitialSales } from './salesRewards';

interface ReportInput {
  commercials: ComercialAccount[];
  coldLeads: ColdCallingLead[];
  crmLeads: ComercialLead[];
  contacts: ClientContact[];
  finTransactions: any[];
  scope: 'general' | 'individual';
}

interface CommercialReportRow {
  commercial: ComercialAccount;
  assigned: number;
  historical: number;
  contacted: number;
  answered: number;
  closer: number;
  won: number;
  lost: number;
  calls: number;
  paidVolume: number;
  commission: number;
  contactRate: number;
  answerRate: number;
  closerRate: number;
  closeRate: number;
}

const normalized = (value?: string) => (value || '').trim().toLowerCase();
const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const money = (value: number) => value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = (value: number) => `${Math.round(value)}%`;
const monthKey = (value?: string) => {
  if (!value) return '';
  const isoMatch = value.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}` : '';
};
const wasAttempted = (lead: ColdCallingLead) =>
  Number(lead.callsCount || 0) > 0 || (lead.callsLog?.length || 0) > 0;
const wasAnswered = (lead: ColdCallingLead) =>
  lead.answered === 'Sí'
  || (lead.callsLog || []).some(log => /Resultado:\s*Responde\b/i.test(log.result || '') && !/No responde/i.test(log.result || ''));
const belongsTo = (lead: ColdCallingLead, commercial: ComercialAccount) => {
  const email = normalized(commercial.email);
  return normalized(lead.assignedToEmail) === email
    || normalized(lead.closingOriginComercialEmail) === email
    || (lead.assignmentHistory || []).some(record => normalized(record.commercialEmail) === email);
};

const calculateRows = ({ commercials, coldLeads, crmLeads, contacts, finTransactions }: ReportInput): CommercialReportRow[] =>
  commercials.map(commercial => {
    const email = normalized(commercial.email);
    const assigned = coldLeads.filter(lead => !lead.archived && normalized(lead.assignedToEmail) === email);
    const historical = coldLeads.filter(lead => belongsTo(lead, commercial));
    const historicalIds = new Set(historical.map(lead => lead.id));
    const contacted = historical.filter(wasAttempted);
    const answered = contacted.filter(wasAnswered);
    const closerIds = new Set([
      ...historical.filter(lead => lead.callbackScheduled === 'Sí').map(lead => lead.id),
      ...contacts
        .filter(contact => contact.closingSourceLeadId && historicalIds.has(contact.closingSourceLeadId))
        .map(contact => contact.closingSourceLeadId as string)
    ]);
    const won = new Set(contacts
      .filter(contact => contact.status === 'Client' && contact.closingSourceLeadId && historicalIds.has(contact.closingSourceLeadId))
      .map(contact => contact.closingSourceLeadId as string)).size;
    const crmCommercialLeads = crmLeads.filter(lead => lead.comercialId === commercial.id);
    const lost = crmCommercialLeads.filter(lead => lead.status === 'Perdido').length;
    const calls = historical.reduce((sum, lead) => sum + Math.max(lead.callsLog?.length || 0, Number(lead.callsCount || 0)), 0);
    const initialTransactions = finTransactions.filter(transaction =>
      transaction.isInitialSale === true
      && (transaction.comercialId === commercial.id || normalized(transaction.comercialEmail) === email)
    );
    const paidVolume = initialTransactions
      .filter(transaction => transaction.status === 'paid')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const paidSales = countUniqueInitialSales(initialTransactions.filter(transaction => transaction.status === 'paid'));
    const commissionPercentage = Number(commercial.commissionPercentage ?? (paidSales >= 18 ? 18 : paidSales >= 17 ? 17 : paidSales >= 15 ? 16 : paidSales >= 13 ? 15 : paidSales >= 10 ? 13.5 : paidSales >= 7 ? 12 : paidSales >= 4 ? 11 : 10));
    const extras = (commercial.extraCommissions || []).reduce((sum, extra) => sum + Number(extra.amount || 0), 0);
    return {
      commercial,
      assigned: assigned.length,
      historical: historical.length,
      contacted: contacted.length,
      answered: answered.length,
      closer: closerIds.size,
      won,
      lost,
      calls,
      paidVolume,
      commission: paidVolume * commissionPercentage / 100 + extras,
      contactRate: historical.length ? contacted.length / historical.length * 100 : 0,
      answerRate: contacted.length ? answered.length / contacted.length * 100 : 0,
      closerRate: answered.length ? closerIds.size / answered.length * 100 : 0,
      closeRate: closerIds.size ? won / closerIds.size * 100 : 0
    };
  });

const calculateEvolution = (commercials: ComercialAccount[], coldLeads: ColdCallingLead[]) => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      label: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      values: commercials.map(commercial => {
        const worked = new Set<string>();
        coldLeads.filter(lead => belongsTo(lead, commercial)).forEach(lead => {
          const hasCall = (lead.callsLog || []).some(log => monthKey(log.date) === key);
          const fallback = monthKey(lead.callDate || lead.createdAt) === key
            && (wasAttempted(lead) || lead.callbackScheduled === 'Sí');
          if (hasCall || fallback) worked.add(lead.id);
        });
        return worked.size;
      })
    };
  });
};

export const buildCommercialAnalyticsReport = (input: ReportInput) => {
  const rows = calculateRows(input);
  const evolution = calculateEvolution(input.commercials, input.coldLeads);
  const generatedAt = new Date();
  const title = input.scope === 'general'
    ? 'Informe general de rendimiento comercial'
    : `Informe individual · ${input.commercials[0]?.name || 'Comercial'}`;
  const totals = rows.reduce((acc, row) => ({
    assigned: acc.assigned + row.assigned,
    historical: acc.historical + row.historical,
    contacted: acc.contacted + row.contacted,
    answered: acc.answered + row.answered,
    closer: acc.closer + row.closer,
    won: acc.won + row.won,
    calls: acc.calls + row.calls,
    paidVolume: acc.paidVolume + row.paidVolume,
    commission: acc.commission + row.commission
  }), { assigned: 0, historical: 0, contacted: 0, answered: 0, closer: 0, won: 0, calls: 0, paidVolume: 0, commission: 0 });
  const totalContactRate = totals.historical ? totals.contacted / totals.historical * 100 : 0;
  const totalCloseRate = totals.closer ? totals.won / totals.closer * 100 : 0;

  const detailSections = rows.map(row => `
    <section class="detail">
      <div class="detail-title">
        <div><span class="eyebrow">ANÁLISIS INDIVIDUAL</span><h2>${escapeHtml(row.commercial.name)}</h2><p>${escapeHtml(row.commercial.email)}</p></div>
        <div class="score"><b>${percent(row.closeRate)}</b><span>cierre desde closer</span></div>
      </div>
      <div class="funnel">
        ${[
          ['Histórico', row.historical, '#334155'],
          ['Contactados', row.contacted, '#0891b2'],
          ['Contestan', row.answered, '#2563eb'],
          ['Al closer', row.closer, '#7c3aed'],
          ['Cerrados', row.won, '#65a30d']
        ].map(([label, value, color]) => {
          const width = row.historical ? Math.max(3, Number(value) / row.historical * 100) : 0;
          return `<div class="funnel-row"><span>${label}</span><div><i style="width:${width}%;background:${color}"></i></div><b>${value}</b></div>`;
        }).join('')}
      </div>
      <div class="mini-grid">
        <div><span>Llamadas registradas</span><b>${row.calls}</b></div>
        <div><span>Tasa de contacto</span><b>${percent(row.contactRate)}</b></div>
        <div><span>Tasa de respuesta</span><b>${percent(row.answerRate)}</b></div>
        <div><span>Paso a closer</span><b>${percent(row.closerRate)}</b></div>
        <div><span>Ventas cobradas</span><b>${money(row.paidVolume)} €</b></div>
        <div><span>Comisión estimada</span><b>${money(row.commission)} €</b></div>
      </div>
    </section>`).join('');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(title)}</title>
<style>
  @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#172033;font-family:Inter,Arial,sans-serif;font-size:11px}.page{max-width:1200px;margin:24px auto;background:#fff;padding:34px 38px;box-shadow:0 10px 35px #17203322}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #d8a800;padding-bottom:22px}.brand{font-weight:900;font-size:22px;letter-spacing:-.5px}.brand em{color:#b78b00;font-style:normal}.eyebrow{display:block;color:#997500;font-weight:800;font-size:8px;letter-spacing:1.6px;margin-bottom:6px}.header h1{font-size:25px;margin:7px 0 5px}.muted,.header p,.detail-title p{margin:0;color:#718096}.meta{text-align:right;line-height:1.7}.cards{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin:22px 0}.card{border:1px solid #e4e8ee;border-radius:10px;padding:12px;background:#fafbfc}.card span,.mini-grid span{display:block;color:#7b8495;text-transform:uppercase;font-size:7px;letter-spacing:.8px;font-weight:700}.card b{display:block;font-size:18px;margin-top:6px}.section-title{margin:24px 0 10px;font-size:14px}table{width:100%;border-collapse:collapse}th{background:#172033;color:#fff;font-size:7px;letter-spacing:.8px;text-transform:uppercase;padding:9px 6px;text-align:center}th:first-child,td:first-child{text-align:left}td{border-bottom:1px solid #e8ebef;padding:9px 6px;text-align:center}td small{display:block;color:#8c95a4;margin-top:3px}.good{color:#4d7c0f;font-weight:800}.money{font-weight:800;color:#9a6700}.detail{margin-top:24px;border:1px solid #e3e7ec;border-radius:14px;padding:18px;break-inside:avoid}.detail-title{display:flex;justify-content:space-between;align-items:center}.detail-title h2{margin:0 0 3px;font-size:18px}.score{text-align:right}.score b{display:block;color:#65a30d;font-size:24px}.score span{color:#7b8495;font-size:8px;text-transform:uppercase}.funnel{margin-top:16px}.funnel-row{display:grid;grid-template-columns:90px 1fr 36px;align-items:center;gap:9px;margin:7px 0}.funnel-row>div{height:8px;border-radius:10px;background:#edf0f3;overflow:hidden}.funnel-row i{display:block;height:100%;border-radius:10px}.funnel-row b{text-align:right}.mini-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:16px}.mini-grid>div{background:#f5f7f9;border-radius:8px;padding:10px}.mini-grid b{display:block;margin-top:5px;font-size:13px}.evolution{overflow-x:auto}.foot{margin-top:25px;padding-top:12px;border-top:1px solid #e4e8ee;color:#7b8495;font-size:8px;line-height:1.6}@media(max-width:850px){.cards,.mini-grid{grid-template-columns:repeat(2,1fr)}.page{margin:0;padding:20px}.header{display:block}.meta{text-align:left;margin-top:12px}}@media print{body{background:#fff}.page{max-width:none;margin:0;padding:0;box-shadow:none}.detail{break-inside:avoid}button{display:none}}
</style></head><body><main class="page">
  <header class="header"><div><div class="brand">ALTHERA <em>SOLUTIONS</em></div><span class="eyebrow">ANALÍTICA COMERCIAL</span><h1>${escapeHtml(title)}</h1><p>Actividad acumulada y cartera vigente según los registros del CRM.</p></div><div class="meta"><b>Fecha de generación</b><br>${generatedAt.toLocaleDateString('es-ES')} · ${generatedAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}<br><span class="muted">${rows.length} comercial${rows.length === 1 ? '' : 'es'} incluido${rows.length === 1 ? '' : 's'}</span></div></header>
  <div class="cards">
    <div class="card"><span>Asignados ahora</span><b>${totals.assigned}</b></div><div class="card"><span>Histórico trabajado</span><b>${totals.historical}</b></div>
    <div class="card"><span>Contactados</span><b>${totals.contacted}</b><small>${percent(totalContactRate)}</small></div><div class="card"><span>Al closer</span><b>${totals.closer}</b></div>
    <div class="card"><span>Cerrados</span><b>${totals.won}</b><small>${percent(totalCloseRate)}</small></div><div class="card"><span>Volumen cobrado</span><b>${money(totals.paidVolume)} €</b></div>
  </div>
  <h2 class="section-title">Resumen de rendimiento</h2>
  <table><thead><tr><th>Comercial</th><th>Actual</th><th>Histórico</th><th>Contactados</th><th>Contestan</th><th>Closer</th><th>Cerrados</th><th>Perdidos</th><th>Llamadas</th><th>Cobrado</th><th>Comisión est.</th></tr></thead>
  <tbody>${rows.map(row => `<tr><td><b>${escapeHtml(row.commercial.name)}</b><small>${escapeHtml(row.commercial.email)}</small></td><td>${row.assigned}</td><td>${row.historical}</td><td>${row.contacted}<small>${percent(row.contactRate)}</small></td><td>${row.answered}<small>${percent(row.answerRate)}</small></td><td>${row.closer}<small>${percent(row.closerRate)}</small></td><td class="good">${row.won}</td><td>${row.lost}</td><td>${row.calls}</td><td class="money">${money(row.paidVolume)} €</td><td class="money">${money(row.commission)} €</td></tr>`).join('')}</tbody></table>
  <h2 class="section-title">Evolución · negocios trabajados por mes</h2>
  <div class="evolution"><table><thead><tr><th>Mes</th>${rows.map(row => `<th>${escapeHtml(row.commercial.name)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${evolution.map(month => `<tr><td><b>${escapeHtml(month.label)}</b></td>${month.values.map(value => `<td>${value}</td>`).join('')}<td><b>${month.values.reduce((sum, value) => sum + value, 0)}</b></td></tr>`).join('')}</tbody></table></div>
  ${detailSections}
  <footer class="foot">Los datos históricos incluyen asignaciones anteriores guardadas, contactos realizados y cierres vinculados al negocio de origen. “Asignados ahora” representa únicamente la cartera vigente. La comisión mostrada es una estimación basada en ventas iniciales cobradas, porcentaje configurado y extras registrados.</footer>
</main></body></html>`;
};

const safeFileName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

export const downloadCommercialAnalyticsReport = (input: ReportInput) => {
  const html = buildCommercialAnalyticsReport(input);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const subject = input.scope === 'general' ? 'equipo-comercial' : input.commercials[0]?.name || 'comercial';
  anchor.href = url;
  anchor.download = `reporte-${safeFileName(subject)}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const printCommercialAnalyticsReport = (input: ReportInput) => {
  const reportWindow = window.open('', '_blank', 'width=1200,height=850');
  if (!reportWindow) {
    throw new Error('El navegador ha bloqueado la ventana del informe.');
  }
  reportWindow.opener = null;
  reportWindow.document.open();
  reportWindow.document.write(buildCommercialAnalyticsReport(input));
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 450);
};
