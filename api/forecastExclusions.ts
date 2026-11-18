import type {Express, RequestHandler} from 'express';
import type {SupabaseClient} from '@supabase/supabase-js';
export function registerForecastExclusions(app:Express,db:SupabaseClient,admin:RequestHandler){
 app.get('/api/finance/forecast-exclusions',admin,async(_req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  const {data,error}=await db.from('payment_forecast_exclusions').select('payment_key').eq('excluded',true);
  if(error)return void res.status(503).json({error:'No se pudieron cargar las exclusiones de previsión.'});
  res.json({keys:(data||[]).map(row=>row.payment_key)});
 });
 app.post('/api/finance/forecast-exclusions',admin,async(req,res)=>{
  const {key,excluded}=req.body||{};
  if(typeof key!=='string'||key.length>300||! /^(tx|cycle|invoice|payment):[\w:.-]+$/.test(key)||typeof excluded!=='boolean')return void res.status(400).json({error:'Cobro no válido.'});
  // Only hides a projection. Settled/processing payments always override this
  // preference in the shared master list, including late Stripe confirmations.
  const {error}=await db.from('payment_forecast_exclusions').upsert({payment_key:key,excluded,updated_at:new Date().toISOString(),updated_by:res.locals.adminUserId},{onConflict:'payment_key'});
  if(error)return void res.status(503).json({error:'No se pudo guardar el cambio de previsión.'});
  res.json({ok:true});
 });
}
