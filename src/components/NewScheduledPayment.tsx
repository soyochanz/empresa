import React,{useRef,useState} from 'react';
import type {ScheduledPayment} from '../utils/paymentSchedule';
import type {ClientContact} from '../types';
import {db} from '../supabaseClient';
import {authenticatedFetch} from '../utils/authenticatedFetch';
import {prepareScheduledPayment,type PaymentDraft} from '../utils/createScheduledPayment';
import {toFinanceDateKey} from '../utils/financeRecurrence';
export default function NewScheduledPayment({contacts,onSaved,onClose,editing}:{key?:string;editing?:ScheduledPayment;contacts:ClientContact[];onSaved:()=>void;onClose:()=>void}){
 const [draft,setDraft]=useState<PaymentDraft>({clientId:editing?.clientId||'',concept:editing?.description||'',amount:editing?String(editing.amount):'',date:editing?.date||toFinanceDateKey(new Date()),method:editing?.source==='stripe'?'stripe':editing?.paymentMethod==='cash'?'cash':'transfer',period:editing?.period==='yearly'?'yearly':editing?.period==='weekly'?'weekly':'monthly',count:editing?.count?String(editing.count):'',scheduled:!!editing&&editing.date>toFinanceDateKey(new Date())});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false),[copied,setCopied]=useState(false);
 const request=useRef<ReturnType<typeof prepareScheduledPayment>|null>(null),session=useRef<{url:string;sessionId:string}|null>(null),running=useRef(false);
 const [url,setUrl]=useState('');const [confirmed,setConfirmed]=useState(false);
 const update=(key:keyof PaymentDraft,value:any)=>setDraft(d=>({...d,[key]:value,...(key==='method'&&value==='stripe'&&d.period==='weekly'?{period:'monthly' as const}:{})}));
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(running.current)return;running.current=true;setBusy(true);setError('');try{
  if(editing?.currency&&editing.currency!=='EUR')throw Error('Esta edición admite EUR. Gestiona esta moneda desde Stripe para conservar su importe original.');
  if(editing?.source==='stripe'&&!confirmed)throw Error('Confirma la sustitución de la recurrencia Stripe anterior.');
  if(editing?.source==='manual'&&draft.date<toFinanceDateKey(new Date()))throw Error('La edición se aplica desde hoy o una fecha futura para conservar el historial.');
  if(!request.current)request.current=prepareScheduledPayment(draft,contacts,`agenda_${crypto.randomUUID()}`);
  const {transaction,checkout}=request.current;
  const existing=await db.getFinanceTransactions();
  if(editing?.source==='manual'&&!existing.some(t=>t.id===editing.transactionId))throw Error('No se encuentra la recurrencia original.');
  if(!existing.some(t=>t.id===transaction.id))await db.insertFinanceTransaction(transaction);
  if(checkout){
   if(!session.current){const response=await authenticatedFetch('/api/stripe/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(checkout)});const raw=await response.text();let data:any;try{data=JSON.parse(raw);}catch{throw Error('Stripe no respondió correctamente. Puedes reintentar sin crear otro cobro.');}if(!response.ok||!data.url||!data.sessionId)throw Error(data.error||'No se pudo crear el enlace.');session.current=data;}
   await db.updateFinanceTransaction({...transaction,stripeCheckoutUrl:session.current!.url,stripeCheckoutSessionId:session.current!.sessionId});
   if(editing){
    const response=await authenticatedFetch('/api/stripe/replace-agenda-recurrence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:transaction.clientId,newSessionId:session.current!.sessionId,subscriptionId:editing.subscriptionId,sessionId:editing.sessionId})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo retirar la recurrencia anterior.');
    const old=existing.find(t=>t.id===editing.transactionId);
    if(old&&old.status==='pending')await db.updateFinanceTransaction({...old,status:'failed'});
   }
   setUrl(session.current!.url);
  }
  if(editing?.source==='manual'){
   const old=existing.find(t=>t.id===editing.transactionId);if(!old)throw Error('No se encuentra la recurrencia original.');
   const end=new Date(transaction.date+'T12:00:00');end.setDate(end.getDate()-1);
   await db.updateFinanceTransaction({...old,recurrenceEndDate:toFinanceDateKey(end)});
  }
  setDone(true);onSaved();
 }catch(err){setError(err instanceof Error?err.message:'No se pudo guardar el cobro.');}finally{running.current=false;setBusy(false);}};
 if(done)return <section className="pay-create"><h3>{editing?'Recurrencia actualizada':url?'Enlace Stripe listo':'Recurrencia creada'}</h3><p>Vinculado al cliente del CRM. El cobro permanece pendiente.</p>{url&&<><label>Enlace para el cliente<input readOnly value={url}/></label><button onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setError('Selecciona y copia el enlace manualmente.');}}}>{copied?'Copiado':'Copiar enlace'}</button><p>La suscripción se activa cuando el cliente completa Stripe. No se ha realizado ningún cargo.</p></>}{error&&<p role="alert">{error}</p>}<button onClick={onClose}>Volver a la agenda</button></section>;
 return <form className="pay-create" onSubmit={submit}><h3>{editing?"Editar recurrencia":"Nueva recurrencia"}</h3><p>Cliente, fecha y forma de cobro, en un solo lugar.</p><fieldset disabled={busy||!!request.current}>
 <label>Cliente del CRM<select disabled={!!editing?.clientId} required value={draft.clientId} onChange={e=>update('clientId',e.target.value)}><option value="">Seleccionar cliente</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.company||c.name} · {c.email||'Sin email'}</option>)}</select></label>
 <label>Concepto<input required maxLength={180} placeholder="Ej. Posicionamiento SEO" value={draft.concept} onChange={e=>update('concept',e.target.value)}/></label>
 <div className="pay-create-grid"><label>Importe por cobro (EUR)<input required type="number" min="0.01" max="1000000" step="0.01" value={draft.amount} onChange={e=>update('amount',e.target.value)}/></label><label>Método<select disabled={!!editing} value={draft.method} onChange={e=>update('method',e.target.value)}><option value="transfer">Transferencia</option><option value="cash">Efectivo</option><option value="stripe">Stripe · generar enlace</option></select></label><label>Frecuencia<select value={draft.period} onChange={e=>update('period',e.target.value)}>{draft.method!=='stripe'&&<option value="weekly">Semanal</option>}<option value="monthly">Mensual</option><option value="yearly">Anual</option></select></label><label>{editing?"Cuotas de la nueva recurrencia":"Número de cuotas"}<input type="number" min="1" max="120" placeholder="Sin límite" value={draft.count} onChange={e=>update('count',e.target.value)}/></label></div>
 {draft.method==='stripe'&&<label>Primer cargo<select value={draft.scheduled?'scheduled':'now'} onChange={e=>update('scheduled',e.target.value==='scheduled')}><option value="now">Al completar el enlace</option><option value="scheduled">Programar una fecha</option></select></label>}
 {(draft.method!=='stripe'||draft.scheduled)&&<label>Fecha del primer cobro<input required type="date" value={draft.date} onChange={e=>update('date',e.target.value)}/></label>}
 <p>{draft.method==='stripe'?(draft.scheduled?'Primer cargo a las 12:00 UTC del día elegido, con al menos 48 horas de antelación. El cliente debe completar antes el enlace.':'El primer cargo se realiza cuando el cliente completa Stripe; a partir de ahí se calcula la recurrencia.'):'Los cobros manuales quedan pendientes hasta que los registres en Finanzas.'}</p>{editing&&<p>Los cobros y facturas anteriores se conservan. Los cambios se aplican a la nueva recurrencia.</p>}</fieldset>{editing?.source==='stripe'&&<label className="pay-replace-confirm"><input type="checkbox" checked={confirmed} disabled={busy||!!request.current} onChange={e=>setConfirmed(e.target.checked)}/>Confirmo que se anulará ahora la suscripción o enlace anterior. El cliente debe completar el nuevo enlace; hasta entonces no habrá una nueva suscripción activa. No se reembolsan cobros anteriores.</label>}
 {error&&<p className="pay-warning" role="alert">{error}{request.current&&' Los datos quedan bloqueados para reintentar la misma operación.'}</p>}<div className="pay-toolbar"><button className="pay-create-submit" disabled={busy} type="submit">{busy?'Guardando…':request.current?'Reintentar':editing?'Guardar y sustituir':draft.method==='stripe'?'Crear y generar enlace':'Crear recurrencia'}</button><button type="button" disabled={busy} onClick={onClose}>Volver</button></div></form>;
}
