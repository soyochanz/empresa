import assert from 'node:assert/strict';
import {encodeContractPricing,decodeContractPricing} from '../src/utils/contractPricing';
for(const price of [0,97,149.95,250]) {
 const source={id:'test',selectedModality:'fin2',seoMonthlyPrice:price,priceSingle:950};
 assert.deepEqual(decodeContractPricing(encodeContractPricing(source)),source);
}
assert.equal(decodeContractPricing({selectedModality:'rrss'}).seoMonthlyPrice,97);
assert.equal(decodeContractPricing(encodeContractPricing({selectedModality:'single [SEO_PRICE:97]',seoMonthlyPrice:250})).selectedModality,'single');
assert.throws(()=>encodeContractPricing({seoMonthlyPrice:-1}));
assert.throws(()=>encodeContractPricing({seoMonthlyPrice:Infinity}));
console.log('Precio SEO: guardado y recuperación de importes personalizados, cero y contratos anteriores verificados.');
