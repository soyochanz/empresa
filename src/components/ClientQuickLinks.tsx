import React from 'react';
import {Globe,Github,ArrowUpRight,Receipt} from 'lucide-react';
import type {ClientContact} from '../types';
export function clientLink(value?:string,github=false){
 const raw=value?.trim();if(!raw)return undefined;
 const candidate=/^https?:\/\//i.test(raw)?raw:github&&!/^github\.com\//i.test(raw)?`https://github.com/${raw}`:`https://${raw}`;
 try{const url=new URL(candidate);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return undefined;if(github&&(url.hostname!=='github.com'||url.pathname.split('/').filter(Boolean).length<2))return undefined;return url.href;}catch{return undefined;}
}
export default function ClientQuickLinks({contact,onInvoices}:{contact:ClientContact;onInvoices?:()=>void}){
 return <div className="flex flex-wrap gap-2 mt-3" onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}>
 {([{label:'Web',Icon:Globe,url:clientLink(contact.website||contact.customWebsiteUrl)},{label:'GitHub',Icon:Github,url:clientLink(contact.githubRepo,true)}]).map(({label,Icon,url})=>url?<a key={label} href={url} target="_blank" rel="noopener noreferrer" draggable={false} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/25 bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-400/20" title={`Abrir ${label} de ${contact.company||contact.name}`}><Icon size={14}/>{label}<ArrowUpRight size={12}/></a>:<span key={label} title={`Añade la URL de ${label} al editar el cliente`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 py-2 text-xs text-slate-400"><Icon size={14}/>{label} · sin enlace</span>)}
 {onInvoices&&<button type="button" onClick={onInvoices} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-400 hover:bg-violet-400/20"><Receipt size={14}/>Facturas</button>}
 </div>;
}
