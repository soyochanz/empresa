import React, { useEffect, useState } from 'react';
import { Link2, Plus, Copy, ArrowUpRight, Power } from 'lucide-react';
import { authenticatedFetch } from '../../utils/authenticatedFetch';
import { readApiResponse } from '../../utils/readApiResponse';

async function linksApi(path = '', body?: unknown, method = 'GET') {
  return readApiResponse(await authenticatedFetch(`/api/web-offers/admin/links${path}`, {
    method, headers: {'Content-Type':'application/json'}, body:body?JSON.stringify(body):undefined,
  }));
}
export default function BrandedLinksAdmin() {
  const [rows,setRows]=useState<any[]>([]);
  const [name,setName]=useState(''); const [url,setUrl]=useState('');
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState('');
  async function load(){try{setRows(await linksApi());}catch(e:any){setError(e.message);}}
  useEffect(()=>{load();},[]);
  async function create(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{
    const row=await linksApi('',{name,url},'POST');setRows(old=>[row,...old]);setName('');setUrl('');setNotice('Enlace de Althera creado. Ya puedes copiarlo y compartirlo.');
  }catch(e:any){setError(e.message);}finally{setBusy(false);}}
  async function toggle(row:any){setBusy(true);setError('');try{const updated=await linksApi(`/${row.id}`,{active:!row.active},'PATCH');setRows(old=>old.map(r=>r.id===row.id?updated:r));setNotice(updated.active?'Enlace reactivado.':'Enlace desactivado. Ya no permite ver la web.');}catch(e:any){setError(e.message);}finally{setBusy(false);}}
  return <section className="wa-branded-links"><div className="wa-branded-heading"><Link2/><div><h3>Enlaces de marca</h3><p>Presenta cualquier web bajo el dominio de Althera. Sin solicitud ni suscripción.</p></div></div>
    <form onSubmit={create} className="wa-link-form"><label>Nombre de la web<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Restaurante La Encina"/></label><label>URL de la web<input required type="url" maxLength={2000} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://mi-demo.com"/></label><button disabled={busy} type="submit"><Plus size={18}/>{busy?'Guardando…':'Crear enlace de Althera'}</button></form>
    {error&&<p className="wa-error" role="alert">{error}</p>}{notice&&<p className="wa-notice" role="status">{notice}</p>}
    <div className="wa-branded-list">{rows.map(row=>{const share=`${location.origin}/business/${row.token}`;return <article key={row.id}><div><strong>{row.name}</strong><span className="wa-badge">{row.active?'Activo':'Desactivado'}</span><p>{row.url}</p><code>{share}</code></div><div className="wa-editor-actions"><button disabled={!row.active} onClick={()=>navigator.clipboard.writeText(share).then(()=>setNotice('Enlace copiado.')).catch(()=>setError('No se pudo copiar. Selecciona el enlace manualmente.'))}><Copy size={16}/>Copiar</button>{row.active&&<a href={share} target="_blank" rel="noreferrer">Ver preview <ArrowUpRight size={16}/></a>}<button disabled={busy} onClick={()=>toggle(row)}><Power size={16}/>{row.active?'Desactivar':'Reactivar'}</button></div></article>;})}</div>
    <small>La preview incluye vista móvil, pantalla completa y marca de Althera. Si la web impide mostrarse dentro de otra página, se podrá abrir en una pestaña nueva.</small>
  </section>;
}
