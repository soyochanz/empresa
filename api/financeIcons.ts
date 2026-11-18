import type {Express,RequestHandler} from 'express';
import type {SupabaseClient} from '@supabase/supabase-js';
export function registerFinanceIcons(app:Express,db:SupabaseClient,admin:RequestHandler){
 app.get('/api/finance/icons',admin,async(_req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  const {data,error}=await db.from('finance_agenda_icons').select('group_key,icon');
  if(error)return void res.status(503).json({error:'No se pudieron cargar los iconos.'});
  res.json({icons:Object.fromEntries((data||[]).map(r=>[r.group_key,r.icon]))});
 });
 app.post('/api/finance/icons',admin,async(req,res)=>{
  const {key,icon}=req.body||{};
  if(typeof key!=='string'||key.length>250||!key.trim()||typeof icon!=='string'||icon.length>180000||!(icon===''||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(icon)))return void res.status(400).json({error:'Selecciona una imagen PNG, JPEG o WebP de hasta 120 KB.'});
  const {error}=await db.from('finance_agenda_icons').upsert({group_key:key,icon,updated_at:new Date().toISOString()},{onConflict:'group_key'});
  if(error)return void res.status(503).json({error:'No se pudo guardar el icono.'});
  res.json({ok:true});
 });
}
