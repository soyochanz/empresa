import {useEffect,useRef} from 'react';
import {X,FileSignature,Plus,ArrowUpRight} from 'lucide-react';
import type {ClientContact} from '../types';
import './clientInvoices.css';
export default function ClientContractsModal({contact,contracts,onClose,onOpen}:{contact:ClientContact;contracts:any[];onClose:()=>void;onOpen:(id?:string)=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 return <dialog ref={ref} className="client-invoices-dialog" aria-labelledby="contracts-title" onCancel={e=>{e.preventDefault();onClose();}}><header><div><span className="invoice-eyebrow">CONTRATOS</span><h2 id="contracts-title">{contact.company||contact.name}</h2></div><button onClick={onClose} aria-label="Cerrar contratos"><X size={20}/></button></header><nav><button onClick={()=>onOpen()}><Plus size={18}/>Nuevo contrato</button></nav><div className="client-invoices-body">{contracts.length===0?<div className="invoice-empty"><FileSignature size={32}/><h3>Aún no hay contratos</h3></div>:contracts.map(c=><article key={c.id}><div><strong>{c.selectedModality==='rrss'?'Redes sociales y SEO':'Desarrollo web'}</strong><small>{c.signingDay} / {c.signingMonth} / {c.signingYear}</small></div><button onClick={()=>onOpen(c.id)}><ArrowUpRight size={16}/>Ver y descargar</button></article>)}</div></dialog>;
}
