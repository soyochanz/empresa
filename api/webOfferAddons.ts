import type Stripe from 'stripe';
import { getWebOfferAddon } from '../src/utils/webOfferAddons';
const fail=(message:string,status=409)=>Object.assign(new Error(message),{status});
export async function addonSubscriptions(stripe:Stripe,customer:string,project:string){
 const list=await stripe.subscriptions.list({customer,status:'all',limit:100});
 if(list.has_more)throw fail('Contacta con nosotros para revisar tus suscripciones.');
 return list.data.filter(s=>s.metadata?.webOfferId===project&&!!getWebOfferAddon(s.metadata.webOfferAddon));
}
export async function addonCheckout(stripe:Stripe,row:any,addonId:string,origin:string){
 const addon=getWebOfferAddon(addonId);if(!addon)throw fail('Extra no válido.',400);
 const base=await stripe.subscriptions.retrieve(row.stripe_subscription_id);
 if(base.status!=='active'||base.cancel_at_period_end)throw fail('Activa tu plan web antes de contratar extras.');
 const customer=row.stripe_customer_id;
 const subs=await addonSubscriptions(stripe,customer,row.id);
 if(subs.some(s=>s.metadata.webOfferAddon===addonId&&!['canceled','incomplete_expired'].includes(s.status)))throw fail('Este extra ya está contratado o tiene un pago pendiente.');
 const sessions=await stripe.checkout.sessions.list({customer,limit:100});
 if(sessions.has_more)throw fail('Contacta con nosotros para revisar tus pagos.');
 const matching=sessions.data.filter(s=>s.metadata?.webOfferId===row.id&&s.metadata?.webOfferAddon===addonId);
 const open=matching.find(s=>s.status==='open');if(open?.url)return {url:open.url};
 // A completed session may precede subscription visibility. Never create another charge in that gap.
 if(matching.some(s=>s.status==='complete'&&!subs.some(sub=>sub.id===(typeof s.subscription==='string'?s.subscription:s.subscription?.id))))throw fail('Estamos confirmando tu pago. Actualiza el panel en unos instantes.');
 const metadata={webOfferId:row.id,webOfferAddon:addon.id};
 const session=await stripe.checkout.sessions.create({mode:'subscription',customer,client_reference_id:row.id,metadata,subscription_data:{metadata},line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:addon.price*100,recurring:{interval:'month'},product_data:{name:`Althera · ${addon.name}`,description:`${row.business_name}. Extra opcional, facturado mensualmente en USD por separado del plan web.`}}}],success_url:`${origin}/business/account?addon=success`,cancel_url:`${origin}/business/account?addon=canceled`},{idempotencyKey:`web-extra-${row.id}-${addon.id}-${matching[0]?.id||'first'}`});
 if(!session.url)throw fail('No se ha podido abrir el pago.');return {url:session.url};
}
