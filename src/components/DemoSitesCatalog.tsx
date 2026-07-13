import { useEffect, useState } from 'react';
import { ExternalLink, Eye, EyeOff, Globe2, Plus, Save, Trash2 } from 'lucide-react';
import { DemoSite } from '../types';
import { db } from '../supabaseClient';
import { optimizeImageFile } from '../utils/imageOptimization';

export const readDemoSites = (): DemoSite[] => [];

export default function DemoSitesCatalog() {
 const [sites, setSites] = useState<DemoSite[]>([]);
 const [editing, setEditing] = useState<DemoSite | null>(null);
 const [showSecrets, setShowSecrets] = useState(false);
 const [loadingRemote, setLoadingRemote] = useState(false);

 useEffect(() => {
 let cancelled = false;
 setLoadingRemote(true);
 db.getDemoSites()
  .then(remoteSites => {
  if (cancelled) return;
  setSites(remoteSites);
  })
  .catch(err => console.error('No se pudo cargar demo_sites desde Supabase:', err))
  .finally(() => {
  if (!cancelled) setLoadingRemote(false);
  });
 return () => { cancelled = true; };
 }, []);

 const empty = (): DemoSite => ({ id: `demo_${Date.now()}`, name: '', businessType: '', publicUrl: '', adminUrl: '' });

 const save = async () => {
 if (!editing?.name.trim() || !editing.publicUrl.trim()) return;
 try {
  await db.upsertDemoSite(editing);
  setSites(prev => [editing, ...prev.filter(s => s.id !== editing.id)]);
  window.dispatchEvent(new Event('althera-demo-sites-updated'));
 } catch (err) {
  console.error('No se pudo guardar la demo en Supabase:', err);
  return;
 }
 setEditing(null);
 };

 const removeSite = async (site: DemoSite) => {
 try {
  await db.deleteDemoSite(site.id);
  setSites(prev => prev.filter(s => s.id !== site.id));
  window.dispatchEvent(new Event('althera-demo-sites-updated'));
 } catch (err) {
  console.error('No se pudo borrar la demo en Supabase:', err);
 }
 };

 return (
 <section className="rounded-3xl border border-cyan-500/15 bg-[#04070b]/80 p-4 sm:p-6 space-y-5">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
  <div>
   <h3 className="font-black text-white flex items-center gap-2">
   <Globe2 className="w-5 h-5 text-cyan-300" />
   Webs demo en Vercel
   </h3>
   <p className="text-xs text-slate-400 mt-1">Catálogo compartido en Supabase para presentar demos a prospectos.</p>
  </div>
  <button onClick={() => setEditing(empty())} className="min-h-11 px-4 rounded-xl bg-cyan-500 text-black text-xs font-black flex items-center justify-center gap-2">
   <Plus className="w-4 h-4" />
   Añadir web demo
  </button>
  </div>

  {sites.length === 0 ? (
  <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">
   {loadingRemote ? 'Cargando webs demo...' : 'Todavía no hay webs demo. Añade la primera URL de Vercel.'}
  </p>
  ) : (
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
   {sites.map(site => (
   <article key={site.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 space-y-3">
    {site.imageUrl ? (
    <div className="aspect-[16/9] rounded-xl overflow-hidden border border-white/10 bg-black/30">
     <img src={site.imageUrl} alt={`Vista previa de ${site.name}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
    </div>
    ) : (
    <div className="aspect-[16/9] rounded-xl border border-dashed border-white/10 bg-black/20 flex items-center justify-center text-[10px] text-slate-600">Sin imagen de portada</div>
    )}
    <div>
    <span className="text-[9px] uppercase text-cyan-400 font-mono">{site.businessType || 'General'}</span>
    <h4 className="font-bold text-white">{site.name}</h4>
    </div>
    <div className="flex gap-2">
    <a href={site.publicUrl} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold flex justify-center gap-2">
     <ExternalLink className="w-4 h-4" />
     Web
    </a>
    {site.adminUrl && <a href={site.adminUrl} target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-xl bg-violet-500/10 border border-violet-400/20 text-violet-300 text-xs font-bold flex justify-center gap-2">Panel</a>}
    </div>
    <div className="flex gap-2">
    <button onClick={() => setEditing(site)} className="flex-1 py-2 text-xs rounded-xl bg-white/5 border border-white/10">Editar</button>
    <button onClick={() => removeSite(site)} className="w-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20"><Trash2 className="w-4 h-4 mx-auto" /></button>
    </div>
   </article>
   ))}
  </div>
  )}

  {editing && (
  <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm p-3 flex items-center justify-center">
   <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl bg-[#080b12] border border-white/10 p-5 sm:p-6 space-y-4">
   <div className="flex justify-between">
    <div>
    <h3 className="font-black text-white">Ficha de web demo</h3>
    <p className="text-[11px] text-amber-300 mt-1">Las credenciales son internas y nunca se muestran al comercial.</p>
    </div>
    <button onClick={() => setShowSecrets(v => !v)} className="w-10 h-10 rounded-xl bg-white/5">
    {showSecrets ? <EyeOff className="w-4 h-4 mx-auto" /> : <Eye className="w-4 h-4 mx-auto" />}
    </button>
   </div>
   <div className="grid sm:grid-cols-2 gap-3">
    {[
    ['Nombre de la demo','name','text'], ['Tipo de negocio','businessType','text'], ['URL pública Vercel','publicUrl','url'], ['URL panel admin','adminUrl','url'], ['URL imagen de portada','imageUrl','url'],
    ['Supabase URL','supabaseUrl','text'], ['Supabase anon key','supabaseAnonKey','secret'], ['Stripe publishable key','stripePublishableKey','secret'], ['Usuario admin','adminUser','text'], ['Contraseña admin','adminPassword','secret']
    ].map(([label, key, type]) => (
    <label key={key} className="space-y-1">
     <span className="text-[9px] uppercase font-bold text-slate-500">{label}</span>
     <input type={type === 'secret' && !showSecrets ? 'password' : 'text'} value={(editing as any)[key] || ''} onChange={e => setEditing({ ...editing, [key]: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400" />
    </label>
    ))}
   </div>
   <label className="block rounded-2xl border border-dashed border-cyan-500/20 bg-cyan-500/[.04] p-4 text-center cursor-pointer hover:bg-cyan-500/[.08]">
    <span className="block text-xs font-bold text-cyan-300">Subir imagen desde el dispositivo</span>
    <span className="block text-[10px] text-slate-500 mt-1">JPG, PNG o WebP. Se optimizará antes de guardarse.</span>
    <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    className="hidden"
    onChange={event => {
     const file = event.target.files?.[0];
     if (!file) return;
     optimizeImageFile(file, { maxWidth: 1200, maxHeight: 675, quality: 0.72 })
      .then(imageUrl => setEditing(current => current ? { ...current, imageUrl } : current))
     .catch(() => alert('No se pudo optimizar la imagen.'));
    }}
    />
   </label>
   {editing.imageUrl && <img src={editing.imageUrl} alt="Vista previa" loading="lazy" decoding="async" className="w-full aspect-[16/7] object-cover rounded-2xl border border-white/10" />}
   <textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Notas internas..." className="w-full min-h-20 bg-black/40 border border-white/10 rounded-xl p-3 text-xs" />
   <div className="flex gap-2">
    <button onClick={() => setEditing(null)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">Cancelar</button>
    <button onClick={save} className="flex-1 py-3 rounded-xl bg-cyan-500 text-black text-xs font-black flex justify-center gap-2"><Save className="w-4 h-4" />Guardar</button>
   </div>
   </div>
  </div>
  )}
 </section>
 );
}
