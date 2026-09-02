import { Invoice } from '../types';
import html2pdf from 'html2pdf.js';

export interface InvoiceHtmlOptions {
 isPaid?: boolean;
 dueDate?: string;
 bank?: {
  beneficiary: string;
  iban: string;
  swift: string;
  correspondentBic?: string;
  nameAddress: string;
 };
}

const escapeHtml = (value: unknown): string =>
 String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const cleanConcept = (description?: string): string =>
 (description || '')
  .replace(/^Cobro Pendiente:\s*/i, '')
  .replace(/^Ingreso Facturado:\s*[^-]+-\s*/i, '')
  .replace(/\s*-\s*Plazo\s+\d+\s+de\s+\d+/i, '')
  .replace(/\s*\((?:Pendiente|Cobrado|Cobro Autom[aá]tico programado|Ingreso Procesado|Cargo Procesado)\)\s*$/i, '')
  .trim();

export const buildInvoiceHtml = (invoice: Invoice, options: InvoiceHtmlOptions = {}): string => {
 const isPaid = options.isPaid ?? invoice.status === 'paid';
 const dueDate = options.dueDate || invoice.dueDate;
 const language = invoice.language || 'es';
 const currency = invoice.currency || 'EUR';
 const money = (value: number) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'es-ES', {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
 }).format(Number(value || 0));
 const t = language === 'en' ? {
  invoice: 'INVOICE', issued: 'Issued', due: 'Due', paid: 'PAID', pending: 'PENDING',
  issuer: 'ISSUER', client: 'CLIENT', taxId: 'Tax ID', fiscalAddress: 'Billing address',
  concept: 'Description', quantity: 'Qty.', unitPrice: 'Unit price', total: 'Total',
  subtotal: 'Subtotal', tax: 'Tax', invoiceTotal: 'Invoice total',
  thanks: 'Thank you for your trust and collaboration!',
  terms: 'This invoice is governed by the agreed terms. If you have any questions, please contact contacto@altherasolutions.com',
  notProvided: 'Not provided'
 } : {
  invoice: 'FACTURA', issued: 'Emisión', due: 'Vence', paid: 'PAGADA', pending: 'PENDIENTE',
  issuer: 'EMISOR', client: 'CLIENTE', taxId: 'CIF/NIF/DNI', fiscalAddress: 'Dirección fiscal',
  concept: 'Concepto / Descripción', quantity: 'Cant.', unitPrice: 'Precio unit.', total: 'Total',
  subtotal: 'Subtotal', tax: 'IVA', invoiceTotal: 'Total factura',
  thanks: '¡Gracias por tu confianza y colaboración!',
  terms: 'Esta factura se rige bajo los términos acordados. Ante cualquier duda, ponte en contacto con contacto@altherasolutions.com',
  notProvided: 'No indicado'
 };
 const issuer = {
  brand: invoice.issuerBrand || 'Althera Solutions',
  name: invoice.issuerName || 'Carlos Ronco Meneses',
  taxId: invoice.issuerTaxId || '09104663K',
  address: invoice.issuerAddress || 'Carrer dels Tamarells 1, 07800 - Ibiza, España',
  email: invoice.issuerEmail || 'contacto@altherasolutions.com'
 };
 return `<!DOCTYPE html>
<html lang="es">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1">
 <title>Factura ${escapeHtml(invoice.id)} - ${escapeHtml(invoice.clientName)}</title>
 <style>
  @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#334155;font-family:Arial,Helvetica,sans-serif;line-height:1.55}
  .invoice{display:flex;flex-direction:column;width:209mm;height:296mm;margin:0 auto;padding:14mm 16mm;background:#fff;overflow:hidden}
  .header{display:flex;justify-content:space-between;gap:30px;padding-bottom:20px;border-bottom:1px solid #e2e8f0}.logo{display:block;width:auto;height:62px;max-width:145px;object-fit:contain;object-position:left center}
  .brand{margin-top:8px;font-size:11px;color:#64748b}.invoice-meta{text-align:right}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.12em;color:#b68a24}.number{font-size:22px;font-weight:900;color:#0f172a}
  .dates{margin-top:8px;font:11px/1.6 monospace;color:#64748b}.status{display:inline-flex;align-items:center;margin-top:10px;padding:5px 11px;border:1px solid transparent;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.08em}
  .paid{border-color:#bbf7d0;background:#f0fdf4;color:#15803d}.pending{border-color:#fde68a;background:#fffbeb;color:#92400e;box-shadow:0 1px 2px rgba(146,64,14,.08)}.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:22px 0}
  .box{padding:16px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}.box-title{margin-bottom:6px;font-size:9px;font-weight:800;letter-spacing:.1em;color:#64748b}.box-name{font-size:12px;font-weight:800;color:#0f172a}.box-detail{margin-top:3px;font-size:10px;color:#475569}
  table{width:100%;border-collapse:collapse}.items th{padding:11px;background:#f1f5f9;border-bottom:2px solid #e2e8f0;font-size:9px;letter-spacing:.06em;text-align:left;color:#475569}.items td{padding:13px 11px;border-bottom:1px solid #f1f5f9;font-size:12px}.num{text-align:right;font-family:monospace;white-space:nowrap}.qty{text-align:center}
  .item-status{display:inline-flex;align-items:center;gap:5px;margin-left:9px;padding:3px 7px;border:1px solid #fde68a;border-radius:999px;background:#fffbeb;color:#92400e;font-size:7px;font-weight:800;line-height:1;letter-spacing:.09em;vertical-align:middle;white-space:nowrap;box-shadow:0 1px 2px rgba(146,64,14,.07)}
  .item-status::before{content:'';width:4px;height:4px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 2px #fef3c7}
  .totals{width:310px;margin:20px 0 22px auto}.totals td{padding:5px 0;font-size:11px;color:#64748b}.totals .grand td{padding-top:9px;border-top:1px solid #cbd5e1;font-size:14px;font-weight:900;color:#0f172a}
  .footer{margin-top:auto;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#64748b}
  .header,.parties,.box,.items tr,.totals,.footer{break-inside:avoid;page-break-inside:avoid}
  @media screen and (max-width:800px){.invoice{width:100%;height:auto;min-height:100vh;padding:25px;overflow:visible}.header,.parties{display:block}.invoice-meta{text-align:left;margin-top:25px}.parties .box{margin-top:12px}}
  @media print{html,body{width:210mm;height:297mm;overflow:hidden}.invoice{width:209mm;height:296mm;padding:14mm 16mm;overflow:hidden}}
 </style>
</head>
<body>
 <main class="invoice">
  <header class="header">
   <div>
    <img class="logo" src="https://czyrolmczcwtexxgxzrg.supabase.co/storage/v1/object/public/webs/althera_logo_transparente.png" alt="Althera Solutions">
    <div class="brand">${escapeHtml(issuer.brand)} · ${escapeHtml(issuer.email)}</div>
   </div>
   <div class="invoice-meta">
    <div class="eyebrow">${t.invoice}</div><div class="number">${escapeHtml(invoice.id)}</div>
    <div class="dates">${t.issued}: ${escapeHtml(invoice.date)}<br>${t.due}: ${escapeHtml(dueDate)}</div>
    <span class="status ${isPaid ? 'paid' : 'pending'}">${isPaid ? t.paid : t.pending}</span>
   </div>
  </header>
  <section class="parties">
   <div class="box"><div class="box-title">${t.issuer}</div><div class="box-name">${escapeHtml(issuer.name)}</div><div class="box-detail">${t.taxId}: ${escapeHtml(issuer.taxId)}<br>${escapeHtml(issuer.address)}<br>${escapeHtml(issuer.email)}</div></div>
   <div class="box"><div class="box-title">${t.client}</div><div class="box-name">${escapeHtml(invoice.clientName)}</div><div class="box-detail">Email: ${escapeHtml(invoice.clientEmail)}<br>${t.taxId}: ${escapeHtml(invoice.clientTaxId || t.notProvided)}<br>${t.fiscalAddress}: ${escapeHtml(invoice.clientAddress || t.notProvided)}</div></div>
  </section>
  <table class="items"><thead><tr><th>${t.concept}</th><th class="qty">${t.quantity}</th><th class="num">${t.unitPrice}</th><th class="num">${t.total}</th></tr></thead><tbody>
   ${invoice.items.map(item => `<tr><td>${escapeHtml(cleanConcept(item.description))}${item.isPending ? `<span class="item-status">${t.pending}</span>` : ''}</td><td class="qty">${escapeHtml(item.quantity)}</td><td class="num">${money(item.unitPrice)}</td><td class="num">${money(item.total)}</td></tr>`).join('')}
  </tbody></table>
  <table class="totals"><tr><td>${t.subtotal}:</td><td class="num">${money(invoice.subtotal)}</td></tr><tr><td>${t.tax} (${escapeHtml(invoice.taxPercentage)}%):</td><td class="num">${money(invoice.taxAmount)}</td></tr><tr class="grand"><td>${t.invoiceTotal}:</td><td class="num">${money(invoice.total)}</td></tr></table>
  <footer class="footer"><strong>${t.thanks}</strong><br>${t.terms}</footer>
 </main>
</body>
</html>`;
};

export const downloadInvoicePdf = async (html: string, filename: string): Promise<void> => {
 const parsed = new DOMParser().parseFromString(html, 'text/html');
 const host = document.createElement('div');
 host.style.position = 'fixed';
 host.style.left = '-10000px';
 host.style.top = '0';
 host.style.width = '210mm';
 host.style.height = '297mm';
 host.style.background = '#ffffff';
 host.style.zIndex = '-1';
 host.innerHTML = `${Array.from(parsed.head.querySelectorAll('style')).map(style => style.outerHTML).join('')}${parsed.body.innerHTML}`;
 document.body.appendChild(host);

 try {
  const images = Array.from(host.querySelectorAll('img'));
  await Promise.all(images.map(image => image.complete
   ? Promise.resolve()
   : new Promise<void>(resolve => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
   })
  ));
  await document.fonts.ready;
  await html2pdf().set({
   margin: 0,
   filename: filename.replace(/\.html?$/i, '.pdf'),
   image: { type: 'jpeg', quality: 0.98 },
   html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
   jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
   pagebreak: { mode: ['css'] }
  }).from(host.querySelector('.invoice') || host).save();
 } finally {
  host.remove();
 }
};
