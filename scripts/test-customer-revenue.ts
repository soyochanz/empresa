import assert from 'node:assert/strict';
import {customerRevenue} from '../src/utils/customerRevenue';
import {db} from '../src/supabaseClient';
const paid:any={id:'a',paymentId:'pi_a',clientId:'c',customer:'Business',date:'2024-01-01',amount:10.01,currency:'EUR',state:'paid',direction:'income'};
const rows=[paid,{...paid,id:'duplicate'},{...paid,id:'b',paymentId:'pi_b',amount:20.02},{...paid,paymentId:'pi_us',currency:'USD',amount:5},{...paid,paymentId:'future',state:'pending',amount:500},{...paid,paymentId:'processing',processing:true,amount:80},{...paid,paymentId:'expense',direction:'expense',amount:70}];
assert.deepEqual(customerRevenue(rows).get('c'),[{currency:'EUR',amount:30.03},{currency:'USD',amount:5}]);
const contact:any={id:'test',name:'Test',company:'Business',businessCity:'San José: Centro',countryCode:'CR',hostingCredentials:'existing',notes:'Conservar notas'};
const stored=db.serializeContactMetadata(contact);
assert.equal(stored.businessCity,undefined); // Existing private metadata storage, no new columns.
const decoded=db.parseContactMetadata(stored);
assert.equal(decoded.businessCity,contact.businessCity);assert.equal(decoded.countryCode,'CR');assert.equal(decoded.notes,contact.notes);
const cleared=db.parseContactMetadata(db.serializeContactMetadata({...decoded,businessCity:undefined,countryCode:undefined}));
assert.equal(cleared.businessCity,undefined);assert.equal(cleared.countryCode,undefined);
console.log('Historical revenue: duplicate prevention, pending exclusion, separate currencies; CRM country/city roundtrip and clearing passed.');
