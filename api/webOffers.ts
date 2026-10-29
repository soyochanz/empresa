import express from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getWebOfferPlan, webOfferPlans } from '../src/utils/webOfferPlans';

type Dependencies = { db: SupabaseClient; stripe: () => Stripe; admin: express.RequestHandler; origin: string };
const OFFER_TERMS = 'Cobro mensual en USD. Permanencia de 12 meses desde la activación. Sin cobro hasta aprobar la demo y completar Stripe. No se añaden impuestos en esta oferta. SEO incluido: Essential, básico el primer mes; Business, básico durante toda la suscripción; Professional, avanzado durante toda la suscripción.';
const BUCKET = 'web-offer-assets';
const text = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const fail = (message: string, status = 400) => Object.assign(new Error(message), { status });
export function validDemoUrl(value: unknown): string {
  const url = new URL(text(value, 2000));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) || url.hostname.endsWith('.local') || url.hostname.includes(':')) throw fail('Utiliza una URL pública HTTPS.');
  return url.href;
}
export function decodeImage(asset: any) {
  const value = text(asset?.data, 2_000_000);
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw fail('Solo se admiten imágenes PNG, JPEG y WebP.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 1_200_000 || bytes.length < 12) throw fail('Cada imagen debe ocupar menos de 1,2 MB.');
  const valid = match[1] === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  if (!valid) throw fail('El contenido del archivo no coincide con una imagen válida.');
  return { bytes, mime: `image/${match[1]}`, extension: match[1], name: text(asset.name, 100) };
}
export function registerWebOffers(app: express.Express, { db, stripe, admin, origin }: Dependencies) {
  const router = express.Router();
  router.use(express.json({ limit: '12mb' }));
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
  const run = (fn: (req: express.Request, res: express.Response) => Promise<any>): express.RequestHandler => (req, res) => { fn(req,res).catch(error => { console.error('Web offers:', error.message); res.status(error.status || 500).json({ error: error.status ? error.message : 'No se ha podido completar. Inténtalo de nuevo.' }); }); };
  const checked = async (query: any) => { const {data,error} = await query; if(error) throw error; return data; };
  // Bounded per-instance abuse guard; persistent submission limits also checked below.
  const attempts = new Map<string, { count: number; until: number }>();
  const rate: express.RequestHandler = (req,res,next) => {
    const key = req.ip || 'unknown'; const now = Date.now();
    for (const [k,v] of attempts) if(v.until < now) attempts.delete(k);
    const entry = attempts.get(key) || {count:0,until:now+600_000}; entry.count++; attempts.set(key,entry);
    if(entry.count > 15) return void res.status(429).json({error:'Demasiados intentos. Vuelve en unos minutos.'});
    next();
  };
  const requestByToken = async (token: string) => {
    if(!/^[a-f0-9]{48}$/.test(token)) throw fail('Demo no encontrada.',404);
    const row = await checked(db.from('web_offer_requests').select('*').eq('demo_token',token).maybeSingle());
    if(!row) throw fail('Demo no encontrada.',404); return row;
  };
  // Express middleware must explicitly continue after verification.
  const customerAuth: express.RequestHandler = (req,res,next) => {
    const token = (req.get('authorization') || '').replace(/^Bearer /,'');
    if(!token) return void res.status(401).json({error:'Inicia sesión para acceder a tu área.'});
    db.auth.getUser(token).then(({data:{user},error}) => {
      if(error || !user?.email_confirmed_at || !user.email) return res.status(401).json({error:'Verifica tu email para continuar.'});
      res.locals.customerEmail=user.email.toLowerCase(); next();
    }).catch(() => res.status(401).json({error:'No se pudo verificar tu sesión.'}));
  };
  const owned = async(id:string,email:string) => { const row=await checked(db.from('web_offer_requests').select('*').eq('id',id).eq('email',email).maybeSingle()); if(!row) throw fail('Proyecto no encontrado.',404); return row; };
  router.get('/admin/links',admin,run(async(_req,res)=>res.json(await checked(db.from('branded_web_links').select('*').order('created_at',{ascending:false}).limit(500)))));
  router.post('/admin/links',admin,run(async(req,res)=>{
    const name=text(req.body.name); if(!name)throw fail('Indica el nombre de la web.');
    const url=validDemoUrl(req.body.url);
    const row=await checked(db.from('branded_web_links').insert({id:randomUUID(),token:randomBytes(10).toString('hex'),name,url}).select('*').single());
    res.status(201).json(row);
  }));
  router.patch('/admin/links/:id',admin,run(async(req,res)=>{
    const patch:any={updated_at:new Date().toISOString()};
    if(req.body.active!==undefined){if(typeof req.body.active!=='boolean')throw fail('Estado no válido.');patch.active=req.body.active;}
    if(req.body.url!==undefined)patch.url=validDemoUrl(req.body.url);
    if(req.body.name!==undefined){patch.name=text(req.body.name);if(!patch.name)throw fail('Indica el nombre de la web.');}
    const row=await checked(db.from('branded_web_links').update(patch).eq('id',req.params.id).select('*').maybeSingle());
    if(!row)throw fail('Enlace no encontrado.',404);res.json(row);
  }));
  router.delete('/admin/links/:id',admin,run(async(req,res)=>{
    if(req.body.confirm!==true)throw fail('Confirma la eliminación del enlace.');
    const row=await checked(db.from('branded_web_links').delete().eq('id',req.params.id).eq('active',false).select('id').maybeSingle());
    if(!row)throw fail('Desactiva el enlace antes de eliminarlo, o comprueba que todavía existe.',409);
    res.json({ok:true});
  }));
  router.get('/plans', (_req,res) => res.json({plans:webOfferPlans,currency:'usd',billingEnabled:true,terms:OFFER_TERMS}));
  router.post('/requests',rate,run(async(req,res) => {
    const b=req.body; if(b.websiteTrap) throw fail('Solicitud no válida.');
    const plan=getWebOfferPlan(b.plan); const email=text(b.email,254).toLowerCase();
    if(!plan || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !text(b.name) || !text(b.businessName) || !text(b.businessType) || !/^\+?[\d\s()-]{7,24}$/.test(text(b.phone)) || b.consent !== true) throw fail('Completa los datos de contacto y acepta la política de privacidad.');
    const recent=await checked(db.from('web_offer_requests').select('id').eq('email',email).gte('created_at',new Date(Date.now()-86400000).toISOString()));
    if(recent.length>=3) throw fail('Ya hemos recibido tu solicitud. Te contactaremos pronto.',429);
    const assets=Array.isArray(b.assets)?b.assets:[]; if(assets.length>6) throw fail('Puedes adjuntar un logo y cinco imágenes.');
    const decoded=assets.map(decodeImage); const id=randomUUID(); const uploaded:string[]=[];
    try {
      for(const asset of decoded) { const file=`${id}/${randomUUID()}.${asset.extension}`; const {error}=await db.storage.from(BUCKET).upload(file,asset.bytes,{contentType:asset.mime,upsert:false}); if(error) throw error; uploaded.push(file); }
      await checked(db.from('web_offer_requests').insert({id,demo_token:randomBytes(24).toString('hex'),plan:plan.id,name:text(b.name),email,phone:text(b.phone,30),business_name:text(b.businessName),business_type:text(b.businessType),maps_url:text(b.mapsUrl,2000),brief:text(b.brief,4000),colors:Array.isArray(b.colors)?b.colors.filter((c:any)=>/^#[0-9a-f]{6}$/i.test(c)).slice(0,4):[],assets:uploaded.map((path,i)=>({path,name:decoded[i].name,role:i===0&&b.hasLogo?'logo':'image'})),consent_at:new Date().toISOString(),consent_version:'web-offers-v1'}));
    } catch(error) { if(uploaded.length) await db.storage.from(BUCKET).remove(uploaded); throw error; }
    res.status(201).json({id,message:'Solicitud recibida. No has contratado ni pagado nada.'});
  }));
  router.get('/admin/requests',admin,run(async(_req,res)=>res.json(await checked(db.from('web_offer_requests').select('*').order('created_at',{ascending:false}).limit(500)))));
  router.get('/admin/requests/:id/assets',admin,run(async(req,res)=>{
    const row=await checked(db.from('web_offer_requests').select('assets').eq('id',req.params.id).single());
    const files=await Promise.all(row.assets.map(async(a:any)=>{const {data,error}=await db.storage.from(BUCKET).createSignedUrl(a.path,300);if(error)throw error;return {...a,url:data.signedUrl};}));res.json(files);
  }));
  // These predicates are applied on the mutation itself, so a concurrent checkout wins safely.
  const editableRequest = (query:any) => query.in('status',['requested','designing','review','changes','approved'])
    .is('checkout_session_id',null).is('stripe_subscription_id',null)
    .or(`checkout_lock_until.is.null,checkout_lock_until.lt.${new Date().toISOString()}`);
  router.patch('/admin/requests/:id',admin,run(async(req,res)=>{
    const row=await checked(db.from('web_offer_requests').select('*').eq('id',req.params.id).maybeSingle());
    if(!row)throw fail('Solicitud no encontrada.',404);
    const patch:any={updated_at:new Date().toISOString()};
    if(req.body.demoUrl!==undefined){patch.demo_url=validDemoUrl(req.body.demoUrl);patch.status='review';}
    if(req.body.status!==undefined){
      if(!['requested','designing','review','changes'].includes(req.body.status))throw fail('Los estados de pago los actualiza Stripe. Selecciona un estado de preparación.');
      patch.status=req.body.status;
    }
    if(!patch.status)throw fail('Selecciona un estado o una URL de demo.');
    if(['review','changes'].includes(patch.status)&&!(patch.demo_url||row.demo_url))throw fail('Guarda una URL de demo antes de usar este estado.');
    patch.approved_at=null;patch.approved_terms=null;
    const data=await checked(editableRequest(db.from('web_offer_requests').update(patch).eq('id',req.params.id)).select('*').maybeSingle());
    if(!data)throw fail('Solicitud vinculada a Stripe o con un pago en curso. Su estado de cobro se gestiona desde Stripe.',409);
    res.json(data);
  }));
  router.delete('/admin/requests/:id',admin,run(async(req,res)=>{
    if(req.body.confirm!==true)throw fail('Confirma la eliminación de la solicitud.');
    const row=await checked(db.from('web_offer_requests').select('*').eq('id',req.params.id).maybeSingle());
    if(!row)throw fail('Solicitud no encontrada.',404);
    const tickets=await checked(db.from('web_offer_tickets').select('id').eq('request_id',row.id).limit(1));
    if(tickets.length)throw fail('Esta solicitud tiene tickets de soporte. Se conserva para mantener su historial.',409);
    const deleted=await checked(editableRequest(db.from('web_offer_requests').delete().eq('id',row.id)).select('id,assets').maybeSingle());
    if(!deleted)throw fail('No se puede eliminar una solicitud con checkout, suscripción o pago en curso.',409);
    // The FK also prevents deletion if a support ticket is created concurrently.
    let warning='';
    const paths=(deleted.assets||[]).map((a:any)=>a.path).filter((p:any)=>typeof p==='string'&&p.startsWith(`${row.id}/`));
    if(paths.length){try{const {error}=await db.storage.from(BUCKET).remove(paths);if(error)throw error;}catch{warning='Solicitud eliminada. Queda pendiente limpiar sus archivos adjuntos.';}}
    res.json({ok:true,warning});
  }));
  router.get('/demo/:token',run(async(req,res)=>{
    const token=req.params.token;
    if(!/^(?:[a-f0-9]{20}|[a-f0-9]{48})$/.test(token))throw fail('Demo no encontrada.',404);
    const row=token.length===48?await checked(db.from('web_offer_requests').select('*').eq('demo_token',token).maybeSingle()):null;
    if(row)return res.json({businessName:row.business_name,plan:row.plan,status:row.status,demoUrl:row.demo_url,feedback:row.feedback,billingEnabled:true,terms:OFFER_TERMS});
    // Prefix aliases keep previously shared long links valid without modifying stored tokens.
    const links=await checked(db.from('branded_web_links').select('name,url,active').like('token',token.length===20?`${token}%`:token).limit(2));
    if(links.length!==1)throw fail('Enlace no disponible.',404);
    const link=links[0];
    if(!link.active)return res.json({businessName:link.name,standalone:true,unavailable:true,billingEnabled:false});
    res.json({businessName:link.name,demoUrl:link.url,standalone:true,billingEnabled:false});
  }));
  router.post('/demo/:token/feedback',rate,run(async(req,res)=>{
    const row=await requestByToken(req.params.token);if(!['review','changes'].includes(row.status))throw fail('Esta propuesta no admite cambios ahora.',409);
    const feedback=text(req.body.feedback,4000);if(feedback.length<15)throw fail('Cuéntanos qué cambiarías (al menos 15 caracteres).');
    await checked(db.from('web_offer_requests').update({feedback,status:'changes',updated_at:new Date().toISOString()}).eq('id',row.id).in('status',['review','changes']));res.json({ok:true});
  }));
  router.post('/demo/:token/checkout',rate,run(async(req,res)=>{
    const row=await requestByToken(req.params.token);if(!row.demo_url || !['review','approved'].includes(row.status) || req.body.acceptTerms!==true)throw fail('Revisa la demo y acepta las condiciones antes de continuar.',409);
    const locked=await checked(db.from('web_offer_requests').update({checkout_lock_until:new Date(Date.now()+60000).toISOString()}).eq('id',row.id).eq('demo_url',row.demo_url).in('status',['review','approved']).or(`checkout_lock_until.is.null,checkout_lock_until.lt.${new Date().toISOString()}`).select('*').maybeSingle());
    if(!locked)throw fail('Estamos preparando tu pago. Espera unos segundos.',409);
    try {
      const s=stripe(); let generation=locked.checkout_generation||0;
      if(locked.checkout_session_id){const previous=await s.checkout.sessions.retrieve(locked.checkout_session_id);if(previous.status==='open'&&previous.url)return res.json({url:previous.url});if(previous.status==='complete')throw fail('Ya has completado este checkout. Accede a tu área.',409);generation++;}
      const plan=getWebOfferPlan(row.plan)!;
      const stripeCustomer=locked.stripe_customer_id || (await s.customers.create({email:row.email,name:row.business_name,metadata:{webOfferId:row.id}},{idempotencyKey:`web-offer-customer-${row.id}`})).id;
      await checked(db.from('web_offer_requests').update({stripe_customer_id:stripeCustomer,checkout_generation:generation,status:'approved',approved_at:new Date().toISOString(),approved_terms:OFFER_TERMS}).eq('id',row.id));
      const session=await s.checkout.sessions.create({mode:'subscription',customer:stripeCustomer,client_reference_id:row.id,metadata:{webOfferId:row.id},subscription_data:{metadata:{webOfferId:row.id}},line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:plan.price*100,recurring:{interval:'month'},product_data:{name:`Althera Web · ${plan.name}`,description:plan.pages}}}],success_url:`${origin}/business/${row.demo_token}?checkout=success`,cancel_url:`${origin}/business/${row.demo_token}?checkout=canceled`},{idempotencyKey:`web-offer-checkout-${row.id}-${generation}`});
      await checked(db.from('web_offer_requests').update({checkout_session_id:session.id}).eq('id',row.id));res.json({url:session.url});
    } finally { await db.from('web_offer_requests').update({checkout_lock_until:null}).eq('id',row.id); }
  }));
  router.get('/account',customerAuth,run(async(_req,res)=>{
    const rows=await checked(db.from('web_offer_requests').select('id,business_name,plan,status,demo_url,demo_token,stripe_customer_id,stripe_subscription_id,created_at').eq('email',res.locals.customerEmail).order('created_at',{ascending:false}));
    const projects=await Promise.all(rows.map(async(row:any)=>{
      let invoices:any[]=[];let subscription:any=null;
      if(row.stripe_customer_id){const list=await stripe().invoices.list({customer:row.stripe_customer_id,limit:24});invoices=list.data.map(i=>({id:i.id,number:i.number,amount:i.total,currency:i.currency,status:i.status,date:i.created,pdf:i.invoice_pdf,url:i.hosted_invoice_url}));}
      if(row.stripe_subscription_id){const s=await stripe().subscriptions.retrieve(row.stripe_subscription_id);subscription={status:s.status,cancelAtPeriodEnd:s.cancel_at_period_end};}
      const {stripe_customer_id,stripe_subscription_id,...safe}=row;return {...safe,invoices,subscription};
    }));res.json(projects);
  }));
  router.post('/account/:id/billing',customerAuth,run(async(req,res)=>{const row=await owned(req.params.id,res.locals.customerEmail);if(!row.stripe_customer_id)throw fail('Todavía no tienes pagos para gestionar.');const s=stripe(); let canCancel=false; if(row.stripe_subscription_id){const sub=await s.subscriptions.retrieve(row.stripe_subscription_id);const end=new Date(sub.start_date*1000);end.setUTCFullYear(end.getUTCFullYear()+1);canCancel=Date.now()>=end.getTime();} const config=await s.billingPortal.configurations.create({business_profile:{headline:'Althera · Tu suscripción web'},features:{customer_update:{enabled:true,allowed_updates:['email','address','tax_id']},invoice_history:{enabled:true},payment_method_update:{enabled:true},subscription_cancel:{enabled:canCancel,mode:'at_period_end'}}},{idempotencyKey:`web-portal-config-v1-${canCancel}`});const session=await s.billingPortal.sessions.create({customer:row.stripe_customer_id,configuration:config.id,return_url:`${origin}/business/account`});res.json({url:session.url});}));
  router.get('/account/tickets',customerAuth,run(async(_req,res)=>res.json(await checked(db.from('web_offer_tickets').select('*').eq('email',res.locals.customerEmail).order('created_at',{ascending:false})))));
  router.post('/account/tickets',customerAuth,rate,run(async(req,res)=>{await owned(text(req.body.projectId),res.locals.customerEmail);const subject=text(req.body.subject);const message=text(req.body.message,5000);if(subject.length<3||message.length<15)throw fail('Indica el asunto y describe cómo podemos ayudarte.');await checked(db.from('web_offer_tickets').insert({request_id:req.body.projectId,email:res.locals.customerEmail,subject,message}));res.status(201).json({ok:true});}));
  router.get('/admin/tickets',admin,run(async(_req,res)=>res.json(await checked(db.from('web_offer_tickets').select('*').order('created_at',{ascending:false}).limit(500)))));
  router.patch('/admin/tickets/:id',admin,run(async(req,res)=>{const reply=text(req.body.reply,5000);if(!reply)throw fail('Escribe una respuesta.');res.json(await checked(db.from('web_offer_tickets').update({reply,status:req.body.close?'closed':'answered',updated_at:new Date().toISOString()}).eq('id',req.params.id).select('*').single()));}));
  app.use('/api/web-offers',router);
  return {
    async handleEvent(event: Stripe.Event): Promise<boolean> {
      const object:any=event.data.object; let id=object.metadata?.webOfferId;let subscription:any;
      if(event.type.startsWith('invoice.')){const subId=object.parent?.subscription_details?.subscription || object.subscription;if(subId){subscription=await stripe().subscriptions.retrieve(typeof subId==='string'?subId:subId.id);id=subscription.metadata?.webOfferId;}}
      if(!id)return false;
      if(event.type==='checkout.session.completed' || event.type.startsWith('customer.subscription.') || event.type.startsWith('invoice.')){
        const subId=event.type.startsWith('customer.subscription.')?object.id:object.subscription || object.parent?.subscription_details?.subscription;
        if(!subscription && subId)subscription=await stripe().subscriptions.retrieve(typeof subId==='string'?subId:subId.id);
        if(subscription){const status=subscription.status==='active'||subscription.status==='trialing'?'active':subscription.status==='canceled'?'canceled':'past_due';await checked(db.from('web_offer_requests').update({status,stripe_subscription_id:subscription.id,stripe_customer_id:typeof subscription.customer==='string'?subscription.customer:subscription.customer.id,updated_at:new Date().toISOString()}).eq('id',id));}
      }
      return true;
    }
  };
}
