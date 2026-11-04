import React,{useState} from 'react';
import type {ClientContact} from '../types';
import {SERVICE_CATALOG,hasService} from '../utils/serviceCatalog';
export default function ServicePlanner({contacts,onPlan}:{contacts:ClientContact[];onPlan:(service:string,ids:string[])=>void}) {
 const [service,setService]=useState('SEO');
 const [search,setSearch]=useState('');
 const clients=contacts.filter(c=>hasService(c,service));
 const shown=clients.filter(c=>`${c.company} ${c.name} ${c.website}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 return <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
  <summary className="cursor-pointer font-bold">Planificar por servicio · SEO, redes y más</summary>
  <div className="mt-4 flex flex-wrap gap-2">{SERVICE_CATALOG.map(s=><button type="button" key={s.value} onClick={()=>setService(s.value)} className={`rounded-xl border px-3 py-2 text-xs ${service===s.value?'border-cyan-400 bg-cyan-400/15':'border-white/10'}`}>{s.label} · {contacts.filter(c=>hasService(c,s.value)).length}</button>)}</div>
  <div className="my-3 flex flex-wrap gap-3"><input aria-label="Buscar negocio por servicio" placeholder="Buscar negocio…" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-transparent p-3"/><button type="button" disabled={!clients.length} onClick={()=>onPlan(service,clients.map(c=>c.id))} className="rounded-xl bg-cyan-600 px-4 py-2 font-bold text-white disabled:opacity-40">Planificar todos ({clients.length})</button></div>
  <div className="max-h-64 overflow-auto">{shown.map(c=>{const raw=c.customWebsiteUrl||c.website;const url=raw&&(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);return <div key={c.id} className="flex items-center justify-between gap-3 border-t border-white/10 py-3"><div className="min-w-0"><strong>{c.company||c.name}</strong><p className="text-xs opacity-65">{c.name}</p>{url&&<a className="block truncate text-xs text-cyan-400" href={url} target="_blank" rel="noreferrer">{raw}</a>}</div><button type="button" className="rounded-xl border border-white/15 px-3 py-2 text-sm" onClick={()=>onPlan(service,[c.id])}>Planificar</button></div>})}</div>
  {!shown.length&&<p className="text-sm opacity-70">No hay clientes con este servicio registrado. Añádelo desde la ficha del cliente.</p>}
 </details>;
}
