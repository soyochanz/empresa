import { Invoice } from '../types';

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

const money = (value: number): string =>
 `${Number(value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export const buildInvoiceHtml = (invoice: Invoice, options: InvoiceHtmlOptions = {}): string => {
 const isPaid = options.isPaid ?? invoice.status === 'paid';
 const dueDate = options.dueDate || invoice.dueDate;
 const issuer = {
  brand: invoice.issuerBrand || 'Althera Solutions',
  name: invoice.issuerName || 'Carlos Ronco Meneses',
  taxId: invoice.issuerTaxId || '09104663K',
  address: invoice.issuerAddress || 'Carrer dels Tamarells 1, 07800 - Ibiza, España',
  email: invoice.issuerEmail || 'contacto@altherasolutions.com'
 };
 const bank = options.bank || {
  beneficiary: 'Ignacio Martin Gonzalez',
  iban: 'IE84 REVO 9903 6065 8046 06',
  swift: 'REVOIE23',
  nameAddress: 'Revolut Bank UAB'
 };

 return `<!DOCTYPE html>
<html lang="es">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1">
 <title>Factura ${escapeHtml(invoice.id)} - ${escapeHtml(invoice.clientName)}</title>
 <style>
  *{box-sizing:border-box}body{margin:0;padding:40px;background:#f8fafc;color:#334155;font-family:Arial,Helvetica,sans-serif;line-height:1.55}
  .invoice{max-width:850px;margin:auto;padding:50px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 8px 25px rgba(15,23,42,.06)}
  .header{display:flex;justify-content:space-between;gap:30px;padding-bottom:28px;border-bottom:1px solid #e2e8f0}.logo{width:155px;max-height:72px;object-fit:contain;object-position:left center}
  .brand{margin-top:8px;font-size:11px;color:#64748b}.invoice-meta{text-align:right}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.12em;color:#b68a24}.number{font-size:22px;font-weight:900;color:#0f172a}
  .dates{margin-top:8px;font:11px/1.6 monospace;color:#64748b}.status{display:inline-block;margin-top:10px;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800}
  .paid{background:#dcfce7;color:#15803d}.pending{background:#fef3c7;color:#a16207}.parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:30px 0}
  .box{padding:20px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}.box-title{margin-bottom:7px;font-size:9px;font-weight:800;letter-spacing:.1em;color:#64748b}.box-name{font-size:13px;font-weight:800;color:#0f172a}.box-detail{margin-top:4px;font-size:11px;color:#475569}
  table{width:100%;border-collapse:collapse}.items th{padding:11px;background:#f1f5f9;border-bottom:2px solid #e2e8f0;font-size:9px;letter-spacing:.06em;text-align:left;color:#475569}.items td{padding:13px 11px;border-bottom:1px solid #f1f5f9;font-size:12px}.num{text-align:right;font-family:monospace;white-space:nowrap}.qty{text-align:center}
  .totals{width:310px;margin:25px 0 30px auto}.totals td{padding:6px 0;font-size:12px;color:#64748b}.totals .grand td{padding-top:11px;border-top:1px solid #cbd5e1;font-size:15px;font-weight:900;color:#0f172a}
  .bank{margin-top:25px;padding:20px;border:1px dashed #f59e0b;border-radius:13px;background:#fffbeb;color:#78350f}.bank h3{margin:0 0 12px;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#b45309}.bank-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}.bank-label{font-size:10px;font-weight:700;color:#92400e}.bank-value{font:11px monospace}
  .footer{margin-top:34px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b}
  @media(max-width:650px){body{padding:12px}.invoice{padding:25px}.header,.parties{display:block}.invoice-meta{text-align:left;margin-top:25px}.parties .box{margin-top:12px}.bank-grid{grid-template-columns:1fr}}
  @media print{body{padding:0;background:#fff}.invoice{max-width:none;border:0;border-radius:0;box-shadow:none}}
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
    <div class="eyebrow">FACTURA</div><div class="number">${escapeHtml(invoice.id)}</div>
    <div class="dates">Emisión: ${escapeHtml(invoice.date)}<br>Vence: ${escapeHtml(dueDate)}</div>
    <span class="status ${isPaid ? 'paid' : 'pending'}">${isPaid ? 'PAGADA' : 'PENDIENTE'}</span>
   </div>
  </header>
  <section class="parties">
   <div class="box"><div class="box-title">EMISOR</div><div class="box-name">${escapeHtml(issuer.name)}</div><div class="box-detail">CIF/NIF/DNI: ${escapeHtml(issuer.taxId)}<br>${escapeHtml(issuer.address)}<br>${escapeHtml(issuer.email)}</div></div>
   <div class="box"><div class="box-title">CLIENTE</div><div class="box-name">${escapeHtml(invoice.clientName)}</div><div class="box-detail">Email: ${escapeHtml(invoice.clientEmail)}<br>CIF/NIF/DNI: ${escapeHtml(invoice.clientTaxId || 'No indicado')}<br>Dirección fiscal: ${escapeHtml(invoice.clientAddress || 'No indicada')}</div></div>
  </section>
  <table class="items"><thead><tr><th>Concepto / Descripción</th><th class="qty">Cant.</th><th class="num">Precio unit.</th><th class="num">Total</th></tr></thead><tbody>
   ${invoice.items.map(item => `<tr><td>${escapeHtml(cleanConcept(item.description))}</td><td class="qty">${escapeHtml(item.quantity)}</td><td class="num">${money(item.unitPrice)}</td><td class="num">${money(item.total)}</td></tr>`).join('')}
  </tbody></table>
  <table class="totals"><tr><td>Subtotal:</td><td class="num">${money(invoice.subtotal)}</td></tr><tr><td>IVA (${escapeHtml(invoice.taxPercentage)}%):</td><td class="num">${money(invoice.taxAmount)}</td></tr><tr class="grand"><td>Total factura:</td><td class="num">${money(invoice.total)}</td></tr></table>
  ${!isPaid ? `<section class="bank"><h3>Datos de pago de facturación</h3><div class="bank-grid"><div><span class="bank-label">Beneficiario:</span><br><span class="bank-value">${escapeHtml(bank.beneficiary)}</span></div><div><span class="bank-label">IBAN / Cuenta:</span><br><span class="bank-value">${escapeHtml(bank.iban)}</span></div><div><span class="bank-label">Código SWIFT/BIC:</span><br><span class="bank-value">${escapeHtml(bank.swift)}</span></div><div><span class="bank-label">Banco:</span><br><span class="bank-value">${escapeHtml(bank.nameAddress)}</span></div>${bank.correspondentBic ? `<div><span class="bank-label">BIC banco corresponsal:</span><br><span class="bank-value">${escapeHtml(bank.correspondentBic)}</span></div>` : ''}</div></section>` : ''}
  <footer class="footer"><strong>¡Gracias por tu confianza y colaboración!</strong><br>Esta factura se rige bajo los términos acordados. Ante cualquier duda, ponte en contacto con contacto@altherasolutions.com</footer>
 </main>
</body>
</html>`;
};
