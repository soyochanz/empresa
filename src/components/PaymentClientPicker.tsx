import React,{useEffect,useRef,useState} from 'react';
import {Search,Plus,Check} from 'lucide-react';
import type {ClientContact} from '../types';
import {db,supabase} from '../supabaseClient';
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export default function PaymentClientPicker({contacts,value,disabled,onSelect,onCreated,onEditingChange}:{contacts:ClientContact[];value:string;disabled:boolean;onSelect:(id:string)=>void;onCreated:(client:ClientContact)=>void;onEditingChange:(editing:boolean)=>void}){
 const [query,setQuery]=useState(''),[expanded,setExpanded]=useState(!value),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [fields,setFields]=useState({company:'',name:'',email:'',phone:''});const pending=useRef<ClientContact|null>(null),saving=useRef(false);
 useEffect(()=>{onEditingChange(creating);},[creating,onEditingChange]);
 const selected=contacts.find(c=>c.id===value);const matches=contacts.filter(c=>!c.archived&&normalize(`${c.company} ${c.name} ${c.email}`).includes(normalize(query))).sort((a,b)=>(a.company||a.name).localeCompare(b.company||b.name,'es'));
 async function save(){if(saving.current)return;setError('');if(!fields.company.trim()||!fields.name.trim()||!/^\S+@\S+\.\S+$/.test(fields.email.trim())){setError('Completa el negocio, el nombre del cliente y un email válido.');return;}saving.current=true;setBusy(true);try{
  const existing=await db.getContacts();
  const duplicate=existing.find(c=>!c.archived&&normalize(c.company)===normalize(fields.company)&&c.email.trim().toLowerCase()===fields.email.trim().toLowerCase());
  if(duplicate){onCreated(duplicate);onSelect(duplicate.id);setCreating(false);setExpanded(false);return;}
  if(!pending.current){const name=fields.name.trim();pending.current={id:crypto.randomUUID(),company:fields.company.trim(),name,email:fields.email.trim().toLowerCase(),phone:fields.phone.trim(),status:'Client',initials:name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(),lastContacted:new Date().toISOString().slice(0,10),addedDate:new Date().toISOString()};}
  const client=existing.find(c=>c.id===pending.current!.id)||pending.current;
  if(!existing.some(c=>c.id===client.id)){const {data}=await supabase.auth.getUser();if(!data.user)throw Error('Vuelve a iniciar sesión para guardar el negocio.');await db.insertContact(client,data.user.id);}
  onCreated(client);onSelect(client.id);setCreating(false);setExpanded(false);setQuery('');pending.current=null;
 }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el negocio.');}finally{saving.current=false;setBusy(false);}}
 return <section className="pay-client-picker"><div className="pay-client-title"><strong>Negocio del CRM</strong>{!disabled&&<button type="button" onClick={()=>{setCreating(v=>!v);setError('');}} disabled={busy}><Plus size={15}/>{creating?'Cancelar':'Nuevo negocio'}</button>}</div>
 {selected&&<div className="pay-selected-client"><span><strong>{selected.company||selected.name}</strong><small>{selected.name} · {selected.email||'Sin email'}</small></span>{!disabled&&<button type="button" disabled={busy} onClick={()=>setExpanded(v=>!v)}>{expanded?'Cerrar búsqueda':'Cambiar'}</button>}</div>}
 {!disabled&&expanded&&!creating&&<><label className="pay-client-search"><Search size={17}/><input aria-label="Buscar negocio, persona o email" placeholder="Busca por negocio, persona o email…" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(matches.length===1){onSelect(matches[0].id);setExpanded(false);}}}} value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="pay-client-results" aria-label="Resultados de clientes">{matches.map(c=><button type="button" key={c.id} aria-pressed={c.id===value} onClick={()=>{onSelect(c.id);setExpanded(false);setQuery('');}}><span><strong>{c.company||c.name}</strong><small>{c.name} · {c.email||'Sin email'}</small></span>{c.id===value&&<Check size={16}/>}</button>)}{!matches.length&&<p>No hay coincidencias. Puedes añadir un nuevo negocio.</p>}</div></>}
 {creating&&<div className="pay-quick-client"><h4>Nuevo negocio</h4><div className="pay-create-grid">{([['company','Nombre del negocio'],['name','Nombre del cliente'],['email','Email'],['phone','Teléfono (opcional)']] as const).map(([key,label])=><label key={key}>{label}<input disabled={busy||!!pending.current} type={key==='email'?'email':key==='phone'?'tel':'text'} maxLength={key==='phone'?40:180} value={fields[key]} onChange={e=>setFields(f=>({...f,[key]:e.target.value}))}/></label>)}</div><p>Se guardará en el CRM y quedará seleccionado para este cobro.</p>{error&&<p role="alert" className="pay-warning">{error}</p>}<button type="button" disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':pending.current?'Reintentar guardado':'Guardar y seleccionar'}</button></div>}
 </section>;
}
