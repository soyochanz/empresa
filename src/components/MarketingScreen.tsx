import React, { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Megaphone, Plus, Target, Trash2, Wand2 } from 'lucide-react';
import { db } from '../supabaseClient';

export default function MarketingScreen() {
 const [campaigns, setCampaigns] = useState<any[]>([]);
 const [loading, setLoading] = useState(false);

 const loadMarketing = async () => {
 setLoading(true);
 try {
  setCampaigns(await db.getMarketingItems());
 } catch (err) {
  console.error('No se pudo cargar Marketing desde Supabase:', err);
  setCampaigns([]);
 } finally {
  setLoading(false);
 }
 };

 useEffect(() => {
 loadMarketing();
 }, []);

 const handleCreate = async () => {
 const item = {
  id: `mkt_${Date.now()}`,
  name: 'Nueva acción de marketing',
  status: 'Planificando',
  channel: 'Instagram / TikTok',
  metric: 'Pendiente',
  notes: ''
 };
 try {
  await db.upsertMarketingItem(item);
  setCampaigns(prev => [item, ...prev]);
 } catch (err) {
  console.error('No se pudo guardar la acción de marketing en Supabase:', err);
 }
 };

 const handleDelete = async (id: string) => {
 try {
  await db.deleteMarketingItem(id);
  setCampaigns(prev => prev.filter(item => item.id !== id));
 } catch (err) {
  console.error('No se pudo borrar la acción de marketing en Supabase:', err);
 }
 };

 return (
 <div className="p-6 sm:p-8 flex-1 overflow-y-auto text-slate-100 space-y-6">
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/10 pb-5">
  <div>
   <p className="text-[10px] uppercase tracking-[0.28em] text-pink-300 font-mono font-black">Departamento</p>
   <h2 className="text-3xl font-black text-white mt-2 flex items-center gap-3">
   <Megaphone className="w-7 h-7 text-pink-300" />
   Marketing
   </h2>
   <p className="text-sm text-slate-400 mt-2 max-w-2xl">
   Planifica campañas, ideas de contenido, audiencias y entregables de crecimiento sincronizados con Supabase para todo el equipo.
   </p>
  </div>
  <button onClick={handleCreate} className="px-4 py-2.5 rounded-xl bg-pink-500 text-black text-xs font-black flex items-center gap-2 w-fit">
   <Plus className="w-4 h-4" />
   Nueva acción
  </button>
  </div>

  <div className="grid md:grid-cols-3 gap-3">
  {[
   ['Campañas activas', String(campaigns.length), Target],
   ['Ideas pendientes', String(campaigns.filter(item => item.status !== 'Activo').length), Wand2],
   ['Calendario editorial', 'Julio', CalendarDays]
  ].map(([label, value, Icon]) => (
   <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
   <Icon className="w-5 h-5 text-pink-300 mb-4" />
   <p className="text-[10px] uppercase font-mono text-slate-500">{label as string}</p>
   <p className="text-2xl font-black text-white mt-1">{value as string}</p>
   </div>
  ))}
  </div>

  <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
  <div className="flex items-center justify-between mb-4">
   <h3 className="text-sm font-black text-white flex items-center gap-2">
   <BarChart3 className="w-4 h-4 text-cyan-300" />
   Pipeline de marketing
   </h3>
  </div>
  <div className="grid lg:grid-cols-3 gap-3">
   {loading && (
   <div className="col-span-full rounded-xl border border-white/10 bg-white/[0.025] p-6 text-center text-xs text-slate-400">
    Cargando marketing desde Supabase...
   </div>
   )}
   {!loading && campaigns.length === 0 && (
   <div className="col-span-full rounded-xl border border-dashed border-white/10 bg-white/[0.015] p-8 text-center text-xs text-slate-500">
    No hay acciones de marketing sincronizadas todavía.
   </div>
   )}
   {campaigns.map(item => (
   <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4 space-y-3">
    <div>
    <p className="text-xs font-black text-white">{item.name}</p>
    <p className="text-[10px] text-slate-500 mt-1">{item.channel}</p>
    </div>
    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
    <span className="px-2 py-1 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/20">{item.status}</span>
    <span className="text-cyan-300">{item.metric}</span>
    <button onClick={() => handleDelete(item.id)} className="text-slate-500 hover:text-rose-300 transition" title="Eliminar acción">
     <Trash2 className="w-3.5 h-3.5" />
    </button>
    </div>
   </article>
   ))}
  </div>
  </section>
 </div>
 );
}
