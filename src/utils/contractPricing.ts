// Store the optional SEO price alongside the modality, using the existing text
// column so saved contracts work on databases without a schema migration.
export function encodeContractPricing(contract: any) {
 const { seoMonthlyPrice, ...payload } = contract;
 if (seoMonthlyPrice === undefined) return payload;
 const price = Number(seoMonthlyPrice);
 if (!Number.isFinite(price) || price < 0) throw new Error('El precio del SEO debe ser un importe válido.');
 const modality = String(payload.selectedModality || 'single').replace(/\s*\[SEO_PRICE:[^\]]*\]/g, '');
 return { ...payload, selectedModality: `${modality} [SEO_PRICE:${Math.round(price * 100) / 100}]` };
}

export function decodeContractPricing(contract: any) {
 const modality = String(contract.selectedModality || 'single');
 const match = modality.match(/\s*\[SEO_PRICE:([\d.]+)\]/);
 const fin2Match = modality.match(/\s*\[FIN2:([^\]]*)\]/);
 const fin2 = fin2Match?.[1].split(',').map(Number);
 return {
  ...contract,
  ...(fin2?.length === 3 && fin2.every(value => Number.isFinite(value) && value >= 0)
   ? { fin2Total: fin2[0], fin2Cuota: fin2[1], fin2Coste: fin2[2] }
   : {}),
  selectedModality: modality.replace(/\s*\[(?:SEO_PRICE|FIN2):[^\]]*\]/g, ''),
  seoMonthlyPrice: match && Number.isFinite(Number(match[1])) ? Number(match[1]) : 97,
 };
}

// Older databases do not have the two-month financing columns. Retry only a
// rejected schema write, keeping all three amounts in the existing text column.
// Network/permission errors must never trigger a second insert.
export async function saveContractPricing(
 contract: any,
 write: (payload: any) => Promise<void>,
): Promise<void> {
 const decoded = decodeContractPricing(contract);
 const payload = encodeContractPricing({ ...decoded, ...contract, selectedModality: decoded.selectedModality });
 try {
  await write(payload);
 } catch (error) {
  const dbError = error as { code?: string; message?: string };
  if (!['42703', 'PGRST204'].includes(dbError?.code || '') ||
   !/\bfin2(?:Total|Cuota|Coste)\b/.test(dbError?.message || '')) throw error;
  const { fin2Total, fin2Cuota, fin2Coste, ...legacyPayload } = payload;
  const amounts = [fin2Total, fin2Cuota, fin2Coste];
  if (!amounts.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) {
   throw new Error('Los importes de financiación a dos meses deben ser números válidos.');
  }
  await write({ ...legacyPayload, selectedModality: `${legacyPayload.selectedModality} [FIN2:${amounts.join(',')}]` });
 }
}

export function contractSaveErrorMessage(error: unknown): string {
 const { code, message } = (error || {}) as { code?: string; message?: string };
 const prefix = 'No se pudo guardar el contrato. ';
 if (['42703', 'PGRST204', 'PGRST205', '42P01'].includes(code || '')) {
  return prefix + 'La estructura de la base de datos necesita actualizarse. Contacta con administración.';
 }
 if (['42501', 'PGRST301', 'PGRST302', 'PGRST303'].includes(code || '')) {
  return prefix + 'La sesión o los permisos no permiten guardarlo. Vuelve a iniciar sesión; si persiste, contacta con administración.';
 }
 if (code === '23505') return prefix + 'Ya existe un contrato con ese identificador. Recarga el historial antes de volver a guardarlo.';
 if (code === '23503') return prefix + 'El contacto vinculado ya no está disponible. Vuelve a seleccionarlo.';
 if (/failed to fetch|fetch failed|network|load failed|timeout/i.test(message || '')) {
  return prefix + 'No se recibió confirmación del servidor. Revisa la conexión y el historial antes de reintentar.';
 }
 return prefix + (code ? `La base de datos rechazó la operación (código ${code}). Contacta con administración.` :
  'No se recibió confirmación del guardado. Revisa el historial antes de reintentar; si persiste, contacta con administración.');
}
