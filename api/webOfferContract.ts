import { createHash } from 'node:crypto';
import { getWebOfferPlan } from '../src/utils/webOfferPlans';

export const contractVersion = 'web-studio-2026-11-20';
export function offerTerms(planId: string, months?: number) {
  const p = getWebOfferPlan(planId)!;
  const minimumMonths = months || p.minimumMonths;
  return `${p.name}: ${p.price} USD/mes. Permanencia mínima de ${minimumMonths} meses desde la activación; compromiso mínimo de ${p.price * minimumMonths} USD. Sin cobro hasta aprobar la demo y completar Stripe. SEO básico el primer mes en Essential, básico continuo en Business y avanzado continuo en Professional.`;
}
export function buildOfferContract(row: any) {
  const p = getWebOfferPlan(row.plan)!;
  const minimumMonths = committedMonths(row);
  const content = `CONTRATO DE PRESTACIÓN DE SERVICIOS DE DESARROLLO WEB
Referencia: ${row.id} · Versión: ${contractVersion}

REUNIDOS
Althera Solutions - F.Z.C, licencia 58295, Office - C1 - 1F - SF3035, Ajman Free Zone C1 Building, Ajman, United Arab Emirates. Contacto: contact@altherasolutions.com.
Cliente: ${row.name}, para ${row.business_name}. Email: ${row.email}.

1. OBJETO DEL CONTRATO
Desarrollo web según la demo aprobada y el plan ${p.name}: ${p.pages}. Incluye: ${p.features.join('; ')}.

2. PRECIO Y FORMA DE PAGO
${offerTerms(row.plan, minimumMonths)} Cobro mensual en dólares mediante Stripe con el método elegido por el cliente. No se añaden impuestos en esta oferta. Las facturas se generan en cada periodo de facturación y estarán disponibles en el panel del cliente, indicando su estado de pago.

3. INICIO Y DURACIÓN
La solicitud y la demo no generan un cobro. El servicio se activa al completar el primer pago. Tras el periodo mínimo, continúa mensualmente hasta su cancelación. La cancelación de la renovación podrá solicitarse desde el panel al finalizar la permanencia. Para cualquier incidencia, contacta con Althera.

4. OBLIGACIONES Y ALCANCE
El cliente facilitará los contenidos, imágenes, identidad y accesos necesarios y confirma que dispone de los derechos para utilizarlos. Las funcionalidades y servicios adicionales no incluidos requieren un acuerdo separado. Los trabajos se realizarán con diligencia profesional, sin garantizar un volumen concreto de ventas ni posiciones en buscadores.

5. IMPAGOS Y CONFIDENCIALIDAD
Un retraso superior a siete días hábiles podrá dar lugar a la suspensión temporal del servicio hasta regularizar el pago. Ambas partes mantendrán confidencial la información facilitada para prestar el servicio.

6. CONFIRMACIÓN
El cliente confirma que ha revisado la demo, el alcance, el precio y la permanencia y acepta este contrato mediante la casilla expresa y la continuación a Stripe desde su cuenta verificada. Se conserva una copia de estas condiciones y la fecha de aceptación. Ninguna cláusula limita los derechos obligatorios aplicables al cliente.`;
  return { version: contractVersion, content, minimumMonths, hash: createHash('sha256').update(content).digest('hex') };
}
export function acceptedContract(row: any): any {
  try { const c = JSON.parse(row.approved_terms); return c?.hash && c?.content ? c : null; } catch { return null; }
}
export function committedMonths(row: any) {
  // Existing customers keep the terms accepted before this release.
  return acceptedContract(row)?.minimumMonths || (row.approved_terms ? 12 : getWebOfferPlan(row.plan)!.minimumMonths);
}
