import assert from 'node:assert/strict';
import {encodeContractPricing,decodeContractPricing,saveContractPricing,contractSaveErrorMessage} from '../src/utils/contractPricing.ts';
for(const price of [0,97,149.95,250]) {
 const source={id:'test',selectedModality:'fin2',seoMonthlyPrice:price,priceSingle:950};
 assert.deepEqual(decodeContractPricing(encodeContractPricing(source)),source);
}
assert.equal(decodeContractPricing({selectedModality:'rrss'}).seoMonthlyPrice,97);
assert.equal(decodeContractPricing(encodeContractPricing({selectedModality:'single [SEO_PRICE:97]',seoMonthlyPrice:250})).selectedModality,'single');
assert.throws(()=>encodeContractPricing({seoMonthlyPrice:-1}));
assert.throws(()=>encodeContractPricing({seoMonthlyPrice:Infinity}));
console.log('Precio SEO: guardado y recuperación de importes personalizados, cero y contratos anteriores verificados.');

const source = {
 id: 'test', selectedModality: 'fin2', seoMonthlyPrice: 149.95,
 priceSingle: 950, fin2Total: 1000, fin2Cuota: 500, fin2Coste: 50,
 selectedContactId: 'contact-test', user_id: null,
};
for (const missingColumn of ['fin2Total', 'fin2Cuota', 'fin2Coste']) {
 for (const code of ['42703', 'PGRST204']) {
  const writes: any[] = [];
  await saveContractPricing(source, async payload => {
   writes.push(payload);
   if (writes.length === 1) throw { code, message: `column contracts_althera.${missingColumn} does not exist` };
  });
  assert.equal(writes.length, 2);
  assert.equal('fin2Total' in writes[1], false);
  assert.equal('fin2Cuota' in writes[1], false);
  assert.equal('fin2Coste' in writes[1], false);
  assert.deepEqual(decodeContractPricing(writes[1]), source);
  // Loading and editing a legacy contract must not accumulate metadata.
  const edited = { ...decodeContractPricing(writes[1]), fin2Coste: 0, fin2Total: 950, fin2Cuota: 475 };
  let attempts = 0;
  await saveContractPricing(edited, async payload => {
   if (++attempts === 1) throw { code, message: `column ${missingColumn} missing` };
   assert.deepEqual(decodeContractPricing(payload), edited);
   assert.equal(payload.selectedModality.match(/\[FIN2:/g).length, 1);
  });
  // After a schema migration, the next save fills the native columns.
  await saveContractPricing(writes[1], async payload => {
   assert.equal(payload.selectedModality.includes('[FIN2:'), false);
   assert.deepEqual(decodeContractPricing(payload), source);
  });
 }
}
let modernWrites = 0;
await saveContractPricing(source, async payload => {
 modernWrites++;
 assert.deepEqual(decodeContractPricing(payload), source);
 assert.equal(payload.selectedModality.includes('[FIN2:'), false);
});
assert.equal(modernWrites, 1);
for (const error of [
 { code: '42501', message: 'permission denied' },
 { code: '23505', message: 'duplicate key' },
 { code: 'PGRST204', message: 'missing clientName column' },
 new Error('Failed to fetch'),
 new Error('Supabase no confirmó la fila.'),
]) {
 let attempts = 0;
 await assert.rejects(saveContractPricing(source, async () => { attempts++; throw error; }), e => e === error);
 assert.equal(attempts, 1);
}
let failedAttempts = 0;
const secondError = { code: '42501', message: 'permission denied' };
await assert.rejects(saveContractPricing(source, async () => {
 if (++failedAttempts === 1) throw { code: 'PGRST204', message: 'missing fin2Coste column' };
 throw secondError;
}), e => e === secondError);
assert.equal(failedAttempts, 2);
assert.match(contractSaveErrorMessage({ code: '42703' }), /estructura/);
assert.match(contractSaveErrorMessage({ code: '42501' }), /permisos/);
assert.match(contractSaveErrorMessage(new Error('Failed to fetch')), /conexión/);
assert.doesNotMatch(contractSaveErrorMessage({ code: '23505' }), /conexión/);
console.log('Contratos: compatibilidad con esquema antiguo, recuperación sin pérdida de importes, migración y errores sin reintentos duplicados verificados.');
