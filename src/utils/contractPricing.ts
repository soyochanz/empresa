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
 return {
  ...contract,
  selectedModality: modality.replace(/\s*\[SEO_PRICE:[^\]]*\]/g, ''),
  seoMonthlyPrice: match && Number.isFinite(Number(match[1])) ? Number(match[1]) : 97,
 };
}
