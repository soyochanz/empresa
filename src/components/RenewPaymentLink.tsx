import React, {useRef,useState} from 'react';
import {db} from '../supabaseClient';
import {authenticatedFetch} from '../utils/authenticatedFetch';
import {paymentMoney,type ScheduledPayment} from '../utils/paymentSchedule';
import type {ClientContact,FinanceTransaction} from '../types';
export default function RenewPaymentLink({payment,contacts,onSaved,onClose}:{payment:ScheduledPayment;contacts:ClientContact[];onSaved:()=>void;onClose:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[url,setUrl]=useState(''),[copied,setCopied]=useState(false);
 const inFlight=useRef(false),session=useRef<{url:string;sessionId:string}>(),source=useRef<FinanceTransaction>();
 async function renew(){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');try{
  const all=await db.getFinanceTransactions();
  const tx=all.find(t=>t.id===payment.transactionId);
  if(!tx||tx.status==='paid'||tx.stripeInvoiceId)throw Error('Este cobro ha cambiado. Actualiza la agenda y revisa su estado.');
  const client=contacts.find(c=>c.id===tx.clientId);
  if(!client?.email)throw Error('Añade el email del cliente en el CRM antes de renovar el enlace.');
  if(!session.current){
   if(!tx.stripeCheckoutSessionId||tx.stripeCheckoutSessionId!==payment.sessionId)throw Error('El enlace ya ha cambiado. Actualiza la agenda para usar el último.');
   source.current=tx;
   const response=await authenticatedFetch('/api/stripe/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:client.id,clientName:client.company||client.name,clientEmail:client.email,amount:tx.amount,interval:tx.recurrencePeriod==='yearly'?'year':'month',pendingTxId:tx.id,stripePlanId:tx.stripePlanId,installmentIndex:tx.stripeInstallmentIndex,installments:tx.stripeInstallmentCount,recurrenceCount:tx.recurrenceOccurrenceCount,concept:tx.description.replace(/\s*\((Enlace de pago caducado|Cobro denegado Stripe)\)/gi,''),previousSessionId:tx.stripeCheckoutSessionId,replaceExisting:true})});
   const raw=await response.text();let data:any;try{data=JSON.parse(raw);}catch{throw Error('No se pudo leer la respuesta. Vuelve a intentarlo.');}
   if(!response.ok||!data.url||!data.sessionId)throw Error(data.error||'No se pudo renovar el enlace.');
   session.current=data;
  }
  await db.updateFinanceTransaction({...source.current!,status:'pending',description:source.current!.description.replace(/\s*\((Enlace de pago caducado|Cobro denegado Stripe|Pendiente)\)/gi,'').trim(),stripeCheckoutSessionId:session.current!.sessionId,stripeCheckoutUrl:session.current!.url});
  setUrl(session.current!.url);onSaved();
 }catch(e){setError(e instanceof Error?e.message:'No se pudo renovar el enlace.');}finally{inFlight.current=false;setBusy(false);}}
 return <section className="pay-month-history"><div className="pay-month-title"><h3>Renovar enlace · {payment.customer}</h3><button disabled={busy} onClick={onClose}>Cerrar</button></div><p>{payment.description.replace(/\s*\((Enlace de pago caducado|Cobro denegado Stripe)\)/gi,'')} · {paymentMoney(payment)}</p><p>El nuevo enlace sustituye al anterior y conserva el importe y las condiciones. Si la fecha inicial ya pasó, el primer cobro será al completar el pago.</p>{error&&<p role="alert" className="pay-warning">{error}</p>}{url?<><p role="status">Enlace renovado. El cobro queda pendiente.</p><input aria-label="Nuevo enlace de pago" readOnly value={url} style={{width:'100%'}}/><div className="pay-toolbar"><button onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setError('Selecciona el enlace y cópialo manualmente.');}}}>{copied?'Copiado':'Copiar enlace'}</button><a href={url} target="_blank" rel="noreferrer">Abrir enlace ↗</a></div></>:<button disabled={busy} onClick={()=>void renew()}>{busy?'Renovando…':'Generar nuevo enlace'}</button>}</section>;
}
