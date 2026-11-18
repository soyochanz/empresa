import React,{useState,useEffect} from 'react';
import {authenticatedFetch} from '../utils/authenticatedFetch';
export function useAgendaIcons(){
 const [icons,setIcons]=useState<Record<string,string>>({});
 useEffect(()=>{void authenticatedFetch('/api/finance/icons').then(r=>r.ok?r.json():null).then(d=>{if(d)setIcons(d.icons||{});}).catch(()=>{});},[]);
 return {icons,setIcons};
}
export default function AgendaIcon({groupKey,onSaved}:{groupKey:string;onSaved:(key:string,icon:string)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(file?:File){if(!file)return;setError('');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>60000){setError('Usa PNG, JPEG o WebP de hasta 60 KB.');return;}
 setBusy(true);try{const icon=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file);});
 const r=await authenticatedFetch('/api/finance/icons',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:groupKey,icon})});if(!r.ok)throw Error('No se pudo guardar el icono.');onSaved(groupKey,icon);
 }catch(e){setError(e instanceof Error?e.message:'Error al guardar.');}finally{setBusy(false);}}
 return <span className="pay-icon-editor"><label>{busy?'Guardando…':'Cambiar icono'}<input aria-label="Cambiar icono" disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void save(e.target.files?.[0])}/></label>{error&&<small role="alert">{error}</small>}</span>;
}
