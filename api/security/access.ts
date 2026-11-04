import type { RequestHandler } from 'express';

type VerifiedUser = {id:string; email?:string; email_confirmed_at?:string};
export function adminAuth(verify:(token:string)=>Promise<VerifiedUser|null>, ids:Set<string>, emails:Set<string>):RequestHandler {
 return async(req,res,next)=>{
  res.setHeader('Cache-Control','private, no-store');
  const match=/^Bearer ([^\s]+)$/.exec(req.get('authorization')||'');
  if(!match) return void res.status(401).json({error:'Sesión administrativa requerida.'});
  try {
   const user=await verify(match[1]);
   if(!user || !(ids.has(user.id) || (user.email_confirmed_at && emails.has((user.email||'').trim().toLowerCase())))) {
    return void res.status(403).json({error:'Acceso administrativo no autorizado.'});
   }
   res.locals.adminUserId=user.id; next();
  } catch { res.status(503).json({error:'No se pudo verificar la sesión. Inténtalo de nuevo.'}); }
 };
}
// Deny by default, including any future Stripe API endpoints.
export function stripeAccess(admin:RequestHandler):RequestHandler {
 return (req,res,next)=>{
  const p=req.path.replace(/\/+$/,'').toLowerCase();
  if((req.method==='POST'&&p==='/webhook') || (req.method==='GET'&&(p==='/config'||p==='/payment-status'))) return next();
  return admin(req,res,next);
 };
}
export const denyServerArtifacts:RequestHandler=(req,res,next)=>{
 let pathname:string;
 try{pathname=decodeURIComponent(req.path).toLowerCase();}catch{return void res.sendStatus(400);}
 if(/\.(?:cjs|map|ts|tsx|sql|log)$/.test(pathname)||pathname.split('/').some(p=>p.startsWith('.'))) return void res.sendStatus(404);
 next();
};
