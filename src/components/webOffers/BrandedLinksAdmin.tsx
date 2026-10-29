import React, { useEffect, useState } from 'react';
import { Link2, Plus, Copy, ArrowUpRight, Power, Trash2 } from 'lucide-react';
import { authenticatedFetch } from '../../utils/authenticatedFetch';
import { readApiResponse } from '../../utils/readApiResponse';

async function linksApi(path = '', body?: unknown, method = 'GET') {
  return readApiResponse(await authenticatedFetch(`/api/web-offers/admin/links${path}`, {
    method, headers: {'Content-Type':'application/json'}, body:body?JSON.stringify(body):undefined,
  }));
}
export default function BrandedLinksAdmin() {
  const [deleting,setDeleting]=useState<string|null>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [name,setName]=useState(''); const [url,setUrl]=useState('');
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState('');
  async function load(){try{setRows(await linksApi());}catch(e:any){setError(e.message);}}
  useEffect(()=>{load();},[]);
  async function create(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{
    const row=await linksApi('',{name,url},'POST');setRows(old=>[row,...old]);setName('');setUrl('');setNotice('Enlace de Althera creado. Ya puedes copiarlo y compartirlo.');
  }catch(e:any){setError(e.message);}finally{setBusy(false);}}
  async function toggle(row:any){setBusy(true);setError('');try{const updated=await linksApi(`/${row.id}`,{active:!row.active},'PATCH');setRows(old=>old.map(r=>r.id===row.id?updated:r));setNotice(updated.active?'Enlace reactivado.':'Enlace desactivado. Ahora invita a solicitar una nueva web.');}catch(e:any){setError(e.message);}finally{setBusy(false);}}
  async function remove(row:any){setBusy(true);setError('');try{await linksApi(`/${row.id}`,{confirm:true},'DELETE');setRows(old=>old.filter(r=>r.id!==row.id));setDeleting(null);setNotice('Enlace eliminado.');}catch(e:any){setError(e.message);}finally{setBusy(false);}}
  return <section className="wa-branded-links"><div className="wa-branded-heading"><Link2/><div><h3>Enlaces de marca</h3><p>Presenta cualquier web bajo el dominio de Althera. Sin solicitud ni suscripción.</p></div></div>
    <form onSubmit={create} className="wa-link-form"><label>Nombre de la web<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Restaurante La Encina"/></label><label>URL de la web<input required type="url" maxLength={2000} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://mi-demo.com"/></label><button disabled={busy} type="submit"><Plus size={18}/>{busy?'Guardando…':'Crear enlace de Althera'}</button></form>
    {error&&<p className="wa-error" role="alert">{error}</p>}{notice&&<p className="wa-notice" role="status">{notice}</p>}
    <div className="wa-branded-list">{rows.map(row=>{const share=`${location.origin}/business/${row.token.slice(0,20)}`;return <article key={row.id}><div><strong>{row.name}</strong><span className="wa-badge">{row.active?'Activo':'Desactivado'}</span><p>{row.url}</p><code>{share}</code></div><div className="wa-editor-actions"><button onClick={()=>navigator.clipboard.writeText(share).then(()=>setNotice('Enlace copiado.')).catch(()=>setError('No se pudo copiar. Selecciona el enlace manualmente.'))}><Copy size={16}/>Copiar</button>{<a href={share} target="_blank" rel="noreferrer">Ver preview <ArrowUpRight size={16}/></a>}<button disabled={busy} onClick={()=>toggle(row)}><Power size={16}/>{row.active?'Desactivar':'Reactivar'}</button>{!row.active&&<button className="wa-delete" disabled={busy} onClick={()=>setDeleting(row.id)}><Trash2 size={16}/>Eliminar</button>}{deleting===row.id&&<div className="wa-delete-confirm" role="alert"><p>¿Eliminar «{row.name}»? El enlace dejará de mostrar incluso el formulario de nueva solicitud. No se puede deshacer.</p><button disabled={busy} onClick={()=>setDeleting(null)}>Volver</button><button className="wa-delete" disabled={busy} onClick={()=>remove(row)}>Sí, eliminar enlace</button></div>}</div></article>;})}</div>
    <small>La web se muestra a pantalla completa, sin marcas ni cabeceras, con un botón para ver el mockup móvil. Si la web impide mostrarse dentro de otra página, necesitarás habilitar la inserción en su alojamiento.</small>
  </section>;
}
